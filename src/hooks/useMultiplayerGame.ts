import { useState, useEffect, useRef } from 'react';
import { multiplayerAPI, type GameRoom, type GameMove } from '../lib/multiplayer';
import type { GameState, Coordinate } from '../game/types';
import { receiveAttack, extractShipsFromBoard } from '../game/logic';

interface UseMultiplayerGameProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    gameMode: 'vsAI' | 'vsPlayer';
    onGameStart?: () => void;
    onGameOver?: (winner: 'Player' | 'Opponent') => void;
}

export const useMultiplayerGame = ({
    gameState,
    setGameState,
    gameMode,
    onGameStart,
    onGameOver
}: UseMultiplayerGameProps) => {
    const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false);
    const [multiplayerRoom, setMultiplayerRoom] = useState<GameRoom | null>(null);
    const [playerType, setPlayerType] = useState<'host' | 'guest' | null>(null);
    const [multiplayerLoading, setMultiplayerLoading] = useState(false);
    const [multiplayerError, setMultiplayerError] = useState<string | null>(null);
    const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
    const [opponentHover, setOpponentHover] = useState<Coordinate | null>(null);

    // Refs for accessing latest state in subscriptions
    const gameStateRef = useRef(gameState);
    const playerTypeRef = useRef(playerType);
    const onGameStartRef = useRef(onGameStart);
    const onGameOverRef = useRef(onGameOver);

    // Refs for move synchronization
    const pendingMovesRef = useRef<GameMove[]>([]);
    const processedMoveIdsRef = useRef(new Set<string>());

    useEffect(() => {
        gameStateRef.current = gameState;
        playerTypeRef.current = playerType;
        onGameStartRef.current = onGameStart;
        onGameOverRef.current = onGameOver;
    }, [gameState, playerType, onGameStart, onGameOver]);

    // Clear synchronization refs when room changes
    useEffect(() => {
        pendingMovesRef.current = [];
        processedMoveIdsRef.current.clear();
    }, [multiplayerRoom?.id]);

    // Create Room
    const createRoom = async (playerName: string) => {
        setMultiplayerLoading(true);
        setMultiplayerError(null);

        const { room, error } = await multiplayerAPI.createRoom(playerName);

        if (error || !room) {
            setMultiplayerError(error || 'Failed to create room');
            setMultiplayerLoading(false);
            return;
        }

        setMultiplayerRoom(room);
        setPlayerType('host');
        setMultiplayerLoading(false);
    };

    // Join Room
    const joinRoom = async (roomCode: string, playerName: string) => {
        setMultiplayerLoading(true);
        setMultiplayerError(null);
        const { room, error } = await multiplayerAPI.joinRoom(roomCode, playerName);
        setMultiplayerLoading(false);

        if (error) {
            setMultiplayerError(error);
            return;
        }

        if (room) {
            setMultiplayerRoom(room);
            // Determine player type based on name match
            if (room.host_player_name === playerName) {
                setPlayerType('host');
            } else if (room.guest_player_name === playerName) {
                setPlayerType('guest');
            } else {
                // Fallback (shouldn't happen with new logic but safe to have)
                setPlayerType('guest');
            }
            setShowMultiplayerLobby(false);

            // If rejoining an active game, set status to playing immediately
            if (room.status === 'playing') {
                setGameState(prev => ({
                    ...prev,
                    status: 'playing',
                    currentTurn: room.current_turn === 'host' ? (room.host_player_name === playerName ? 'player' : 'opponent') : (room.guest_player_name === playerName ? 'player' : 'opponent')
                }));
            }
        }
    };

    // Cancel Multiplayer
    const cancelMultiplayer = () => {
        setShowMultiplayerLobby(false);
        setMultiplayerRoom(null);
        setPlayerType(null);
        setIsWaitingForOpponent(false);
    };

    // Start Game (Set Board & Ready)
    const startGame = async () => {
        if (!multiplayerRoom || !playerType) return;

        // Lock UI immediately
        setIsWaitingForOpponent(true);

        try {
            const { error } = await multiplayerAPI.setPlayerBoard(
                multiplayerRoom.id,
                playerType,
                gameState.player.board
            );

            if (error) {
                console.error('Failed to set board:', error);
                setIsWaitingForOpponent(false);
                return;
            }

            await multiplayerAPI.checkAndStartGame(multiplayerRoom.id);
        } catch (err) {
            console.error('Error starting game:', err);
            setIsWaitingForOpponent(false);
        }
    };

    // Broadcast Hover
    const broadcastHover = (coordinate: Coordinate | null) => {
        if (gameMode === 'vsPlayer' && multiplayerRoom && gameState.status === 'playing') {
            multiplayerAPI.broadcastHover(multiplayerRoom.id, coordinate);
        }
    };

    // Subscriptions
    useEffect(() => {
        if (!multiplayerRoom || gameMode !== 'vsPlayer') return;

        // console.log('Subscribing to room updates:', multiplayerRoom.id);

        // Room Updates
        const unsubscribeRoom = multiplayerAPI.subscribeToRoom(multiplayerRoom.id, (updatedRoom) => {
            setMultiplayerRoom(updatedRoom);
            const currentPlayerType = playerTypeRef.current;


            // Handle Game Over
            if (updatedRoom.status === 'finished' && updatedRoom.winner) {
                const isWinner = (currentPlayerType === 'host' && updatedRoom.winner === updatedRoom.host_player_name) ||
                    (currentPlayerType === 'guest' && updatedRoom.winner === updatedRoom.guest_player_name);

                if (onGameOverRef.current) {
                    onGameOverRef.current(isWinner ? 'Player' : 'Opponent');
                }
            }

            // Sync turn from server (Single Point of Truth)
            if (updatedRoom.status === 'playing') {
                const serverTurn = updatedRoom.current_turn === currentPlayerType ? 'player' : 'opponent';
                setGameState(prev => ({
                    ...prev,
                    currentTurn: serverTurn
                }));
            }
        });

        // Moves
        const unsubscribeMoves = multiplayerAPI.subscribeToMoves(multiplayerRoom.id, (move) => {
            try {
                const currentPlayerType = playerTypeRef.current;
                const currentGameState = gameStateRef.current;

                // If game is not yet playing (e.g. during replay/initialization), buffer the move
                if (currentGameState.status !== 'playing') {
                    pendingMovesRef.current.push(move);
                    return;
                }

                if (processedMoveIdsRef.current.has(move.id)) {
                    return;
                }

                processedMoveIdsRef.current.add(move.id);

                // Handle our own move (update opponent board)
                if (move.player_type === currentPlayerType) {
                    const { player: newOpponent } = receiveAttack(currentGameState.opponent, move.coordinate);

                    setGameState(prev => ({
                        ...prev,
                        opponent: newOpponent
                        // currentTurn is updated via room subscription
                    }));
                } else {
                    const { player: newPlayer } = receiveAttack(currentGameState.player, move.coordinate);
                    setGameState(prev => ({
                        ...prev,
                        player: newPlayer
                    }));
                }
            } catch (err) {
                console.error('Error processing move:', err);
            }
        });


        // Hover
        const unsubscribeHover = multiplayerAPI.subscribeToHover(multiplayerRoom.id, (coordinate) => {
            setOpponentHover(coordinate);
        });

        return () => {
            unsubscribeRoom();
            unsubscribeMoves();
            unsubscribeHover();
        };
    }, [multiplayerRoom?.id, gameMode, setGameState]);

    // Handle Game Start Detection (via room status change)
    useEffect(() => {
        // console.log('Game Start Effect Check:', { 
        //     roomStatus: multiplayerRoom?.status, 
        //     gameStatus: gameState.status, 
        //     playerType 
        // });

        if (multiplayerRoom?.status === 'playing' && gameState.status === 'placement' && playerType) {
            console.log('Game Start Effect Triggered!');
            const opponentBoard = playerType === 'host' ? multiplayerRoom.guest_board : multiplayerRoom.host_board;
            if (opponentBoard) {
                // DATA INTEGRITY CHECK
                let shipCellsCount = 0;
                let shipIdsCount = 0;
                opponentBoard.forEach(row => row.forEach(cell => {
                    if (cell.status === 'ship' || cell.status === 'hit') {
                        shipCellsCount++;
                        if (cell.shipId) shipIdsCount++;
                    }
                }));
                console.error(`[INTEGRITY] Found ${shipCellsCount} ship cells, ${shipIdsCount} have shipId.`);

                // Initial state with opponent board
                let currentOpponent = {
                    ...gameState.opponent,
                    board: opponentBoard,
                    ships: extractShipsFromBoard(opponentBoard)
                };
                console.error(`[INTEGRITY] Extracted ${currentOpponent.ships.length} ships.`);

                let currentPlayer = gameState.player;

                // Fetch and replay all moves to ensure state is up to date (e.g. sunk ships)
                multiplayerAPI.getMoves(multiplayerRoom.id).then(({ moves, error }) => {
                    if (error) {
                        console.error('[REPLAY] Error fetching moves:', error);
                    }
                    console.error(`[REPLAY] Fetched ${moves?.length || 0} moves.`);

                    // 1. Apply historical moves
                    if (moves && moves.length > 0) {
                        moves.forEach(move => {
                            processedMoveIdsRef.current.add(move.id);
                            if (move.player_type === playerType) {
                                // We attacked opponent
                                console.error(`[REPLAY] Processing attack on opponent at ${move.coordinate.row},${move.coordinate.col}`);

                                const { player: newOpponent, result } = receiveAttack(currentOpponent, move.coordinate);
                                console.error(`[REPLAY] Result: ${result}`);
                                if (result === 'sunk') {
                                    console.error('[REPLAY] Ship sunk!');
                                }
                                currentOpponent = newOpponent;
                            } else {
                                // Opponent attacked us
                                const { player: newPlayer } = receiveAttack(currentPlayer, move.coordinate);
                                currentPlayer = newPlayer;
                            }
                        });
                    }

                    console.error(`[REPLAY] Final Opponent Ships State:`, currentOpponent.ships.map(s => ({ id: s.id, hits: s.hits, sunk: s.sunk, len: s.length })));

                    // 2. Apply buffered moves (if any arrived during fetch)
                    if (pendingMovesRef.current.length > 0) {
                        pendingMovesRef.current.forEach(move => {
                            // Skip if already processed (overlap between fetch and subscription)
                            if (processedMoveIdsRef.current.has(move.id)) return;

                            processedMoveIdsRef.current.add(move.id);
                            if (move.player_type === playerType) {
                                const { player: newOpponent } = receiveAttack(currentOpponent, move.coordinate);
                                currentOpponent = newOpponent;
                            } else {
                                const { player: newPlayer } = receiveAttack(currentPlayer, move.coordinate);
                                currentPlayer = newPlayer;
                            }
                        });
                        pendingMovesRef.current = [];
                    }

                    setGameState(prev => ({
                        ...prev,
                        player: currentPlayer,
                        opponent: currentOpponent,
                        status: 'playing',
                        currentTurn: multiplayerRoom.current_turn === playerType ? 'player' : 'opponent'
                    }));
                    setIsWaitingForOpponent(false);
                    if (onGameStartRef.current) onGameStartRef.current();
                });
            }
        }
    }, [multiplayerRoom, gameState.status, playerType, setGameState]);

    // Polling Fallback
    useEffect(() => {
        if (gameMode === 'vsPlayer' && multiplayerRoom && (multiplayerRoom.status === 'waiting' || multiplayerRoom.status === 'placing')) {
            const interval = setInterval(async () => {
                const { room, error } = await multiplayerAPI.getRoom(multiplayerRoom.id);
                if (room && !error) {
                    if (room.status !== multiplayerRoom.status ||
                        (room.guest_player_name && !multiplayerRoom.guest_player_name) ||
                        (room.host_ready !== multiplayerRoom.host_ready) ||
                        (room.guest_ready !== multiplayerRoom.guest_ready)) {
                        setMultiplayerRoom(room);
                    }

                    if (playerType === 'host' && room.status === 'placing' && room.host_ready && room.guest_ready) {
                        await multiplayerAPI.checkAndStartGame(multiplayerRoom.id);
                    }
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [gameMode, multiplayerRoom, playerType]);

    // Close lobby when guest joins
    useEffect(() => {
        if (gameMode === 'vsPlayer' && playerType === 'host' && multiplayerRoom?.guest_player_name && showMultiplayerLobby) {
            setShowMultiplayerLobby(false);
        }
    }, [multiplayerRoom, playerType, gameMode, showMultiplayerLobby]);

    return {
        showMultiplayerLobby,
        setShowMultiplayerLobby,
        multiplayerRoom,
        setMultiplayerRoom,
        playerType,
        setPlayerType,
        multiplayerLoading,
        multiplayerError,
        isWaitingForOpponent,
        setIsWaitingForOpponent,
        opponentHover,
        createRoom,
        joinRoom,
        cancelMultiplayer,
        startGame,
        broadcastHover
    };
};
