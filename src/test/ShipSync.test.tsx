
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { createPlayer, receiveAttack, extractShipsFromBoard } from '../game/logic';
import { multiplayerAPI } from '../lib/multiplayer';
import type { GameState } from '../game/types';
import type { GameRoom, GameMove } from '../lib/multiplayer';

// Mock multiplayerAPI
vi.mock('../lib/multiplayer', () => ({
    multiplayerAPI: {
        createRoom: vi.fn(),
        joinRoom: vi.fn(),
        setPlayerBoard: vi.fn(),
        checkAndStartGame: vi.fn(),
        subscribeToRoom: vi.fn(() => () => { }),
        subscribeToMoves: vi.fn(() => () => { }),
        subscribeToHover: vi.fn(() => () => { }),
        broadcastHover: vi.fn(),
        makeMove: vi.fn(),
        setWinner: vi.fn(),
        getMoves: vi.fn()
    }
}));

describe('Ship Synchronization Logic', () => {
    const mockSetGameState = vi.fn();
    const initialGameState: GameState = {
        player: createPlayer('p1', 'Player'),
        opponent: createPlayer('op', 'Opponent'),
        currentTurn: 'player',
        status: 'placement',
        winner: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (multiplayerAPI.getMoves as any).mockResolvedValue({ moves: [], error: null });
    });

    it('should correctly identify sunk ships on opponent board during gameplay', async () => {
        const { result } = renderHook(() => useMultiplayerGame({
            gameState: initialGameState,
            setGameState: mockSetGameState,
            gameMode: 'vsPlayer'
        }));

        // 1. Simulate game start with opponent board
        const opponentBoard = createPlayer('opponent', 'Opponent').board;
        // Place a destroyer (size 2)
        opponentBoard[0][0] = { status: 'ship', shipId: 'destroyer-123', coordinate: { row: 0, col: 0 } };
        opponentBoard[0][1] = { status: 'ship', shipId: 'destroyer-123', coordinate: { row: 0, col: 1 } };

        const mockRoom: GameRoom = {
            id: 'room-1',
            room_code: 'ABCD',
            host_player_name: 'Host',
            guest_player_name: 'Guest',
            host_board: null,
            guest_board: opponentBoard,
            current_turn: 'host',
            status: 'playing',
            winner: null,
            host_ready: true,
            guest_ready: true,
            game_start_time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Trigger game start effect
        await act(async () => {
            // @ts-ignore - Accessing internal state for test setup
            result.current.setMultiplayerRoom(mockRoom);
            result.current.setPlayerType('host');
        });

        // Verify ships extracted
        expect(mockSetGameState).toHaveBeenCalled();
        const stateUpdate = mockSetGameState.mock.calls[0][0] as any;
        const newState = typeof stateUpdate === 'function' ? stateUpdate(initialGameState) : stateUpdate;
        const ships = newState.opponent.ships;
        expect(ships).toHaveLength(1);
        expect(ships[0].sunk).toBe(false);

        // Define moves for replay
        const move1: GameMove = {
            id: 'move-1',
            room_id: 'room-1',
            player_type: 'host', // Assuming 'host' is the one making moves against 'guest' (opponent)
            coordinate: { row: 0, col: 0 },
            result: 'hit',
            created_at: new Date().toISOString()
        };

        // Mock getMoves to return the 2 moves (hit and sink)
        (multiplayerAPI.getMoves as any).mockResolvedValue({
            moves: [move1, { ...move1, id: 'move-2', coordinate: { row: 0, col: 1 }, result: 'sunk' }],
            error: null
        });

        // Trigger game start effect again (simulate refresh/re-mount)
        await act(async () => {
            // @ts-ignore
            result.current.setMultiplayerRoom({ ...mockRoom });
        });

        // Verify ships extracted and moves replayed
        expect(multiplayerAPI.getMoves).toHaveBeenCalledWith('room-1');

        // Wait for state update
        await act(async () => { });

        const lastCall = mockSetGameState.mock.calls[mockSetGameState.mock.calls.length - 1];
        const finalState = typeof lastCall[0] === 'function' ? lastCall[0](initialGameState) : lastCall[0];

        expect(finalState.opponent.ships[0].hits).toBe(2);
        expect(finalState.opponent.ships[0].sunk).toBe(true);
    });
    it('should handle race condition where move arrives during replay', async () => {
        const { result } = renderHook(() => useMultiplayerGame({
            gameState: initialGameState,
            setGameState: mockSetGameState,
            gameMode: 'vsPlayer'
        }));

        const opponentBoard = createPlayer('opponent', 'Opponent').board;
        // Place a destroyer (size 2)
        opponentBoard[0][0] = { status: 'ship', shipId: 'destroyer-123', coordinate: { row: 0, col: 0 } };
        opponentBoard[0][1] = { status: 'ship', shipId: 'destroyer-123', coordinate: { row: 0, col: 1 } };

        const mockRoom: GameRoom = {
            id: 'room-1',
            room_code: 'ABCD',
            host_player_name: 'Host',
            guest_player_name: 'Guest',
            host_board: null,
            guest_board: opponentBoard,
            current_turn: 'host',
            status: 'playing',
            winner: null,
            host_ready: true,
            guest_ready: true,
            game_start_time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Define moves
        const move1: GameMove = {
            id: 'move-1',
            room_id: 'room-1',
            player_type: 'host',
            coordinate: { row: 0, col: 0 },
            result: 'hit',
            created_at: new Date().toISOString()
        };
        const move2: GameMove = {
            id: 'move-2',
            room_id: 'room-1',
            player_type: 'host',
            coordinate: { row: 0, col: 1 },
            result: 'sunk',
            created_at: new Date().toISOString()
        };

        // Mock getMoves to return BOTH moves, but delay it to simulate network latency
        (multiplayerAPI.getMoves as any).mockImplementation(() => new Promise(resolve => {
            setTimeout(() => {
                resolve({ moves: [move1, move2], error: null });
            }, 100);
        }));

        // 1. Start game (triggers effect)
        await act(async () => {
            // @ts-ignore
            result.current.setMultiplayerRoom(mockRoom);
            result.current.setPlayerType('host');
        });

        // 2. Simulate Move 2 arriving via subscription BEFORE getMoves resolves
        // This move should be buffered because status is not yet 'playing' (it's 'placement' until replay finishes)
        // Or if status IS 'playing' (because we mocked it in room), wait.
        // In useMultiplayerGame, we check `currentGameState.status`. initialGameState has 'placement'.
        // So it should buffer.

        // We need to manually trigger the subscription callback
        const subscribeCallback = (multiplayerAPI.subscribeToMoves as any).mock.calls[0][1];

        await act(async () => {
            subscribeCallback(move2);
        });

        // 3. Wait for getMoves to resolve (replay finishes)
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        // 4. Verify state
        // Move 1 should be applied from replay.
        // Move 2 should be applied from replay OR buffer.
        // Crucially, Move 2 should NOT be applied twice (though applying twice is idempotent for hits, it's bad for logic).
        // And Move 2 should definitely be present.

        const lastCall = mockSetGameState.mock.calls[mockSetGameState.mock.calls.length - 1];
        const finalState = typeof lastCall[0] === 'function' ? lastCall[0](initialGameState) : lastCall[0];
        expect(finalState.opponent.ships[0].hits).toBe(2);
        expect(finalState.opponent.ships[0].sunk).toBe(true);
    });

    it('should persist shipId through serialization and correctly update ship status', () => {
        // 1. Create a player and place a ship
        const originalPlayer = createPlayer('p1', 'Player');
        const boardWithShip = originalPlayer.board;
        // Place a destroyer manually to ensure we control the ID
        const shipId = 'destroyer-test-123';
        boardWithShip[0][0] = { status: 'ship', shipId: shipId, coordinate: { row: 0, col: 0 } };
        boardWithShip[0][1] = { status: 'ship', shipId: shipId, coordinate: { row: 0, col: 1 } };

        // 2. Simulate Serialization (JSON.stringify -> JSON.parse)
        // This mimics what happens when saving/loading from Supabase
        const serializedBoard = JSON.stringify(boardWithShip);
        const deserializedBoard = JSON.parse(serializedBoard);

        // 3. Verify shipId persistence
        expect(deserializedBoard[0][0].shipId).toBe(shipId);
        expect(deserializedBoard[0][1].shipId).toBe(shipId);

        // 4. Reconstruct player from deserialized board
        const reconstructedPlayer = {
            ...originalPlayer,
            board: deserializedBoard,
            ships: extractShipsFromBoard(deserializedBoard)
        };

        // 5. Verify extracted ships
        expect(reconstructedPlayer.ships).toHaveLength(1);
        expect(reconstructedPlayer.ships[0].id).toBe(shipId);
        expect(reconstructedPlayer.ships[0].sunk).toBe(false);

        // 6. Simulate Attack
        // Hit first part
        const result1 = receiveAttack(reconstructedPlayer, { row: 0, col: 0 });
        expect(result1.result).toBe('hit');
        expect(result1.player.ships[0].hits).toBe(1);

        // Hit second part (sink it)
        const result2 = receiveAttack(result1.player, { row: 0, col: 1 });
        expect(result2.result).toBe('sunk');
        expect(result2.player.ships[0].hits).toBe(2);
        expect(result2.player.ships[0].sunk).toBe(true);
    });
});
