import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import ManualPlacement from './components/ManualPlacement';
import Leaderboard from './components/Leaderboard';
import ScoreSubmission from './components/ScoreSubmission';
import MultiplayerLobby from './components/MultiplayerLobby';
import WelcomeScreen from './components/WelcomeScreen';
import type { GameState, Coordinate } from './game/types';
import {
  createPlayer,
  placeShipsRandomly,
  placeShip,
  receiveAttack,
  aiTurn,
  checkWin,
  createAIState,
  smartAiTurn,
  updateAIStateAfterAttack
} from './game/logic';
import { multiplayerAPI } from './lib/multiplayer';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    player: createPlayer('p1', 'Player'),
    opponent: createPlayer('cpu', 'Computer', true),
    currentTurn: 'player',
    status: 'placement',
  }));

  const [allowAdjacent, setAllowAdjacent] = useState(false);
  const [placementMode, setPlacementMode] = useState<'random' | 'manual'>('random');
  const [aiDifficulty, setAIDifficulty] = useState<'random' | 'smart'>('random');
  const [aiState, setAIState] = useState(() => createAIState());
  const [manualPlacementState, setManualPlacementState] = useState({
    currentShipIndex: 0,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
    shipsToPlace: ['destroyer', 'aircraftCarrier', 'frigate', 'submarine', 'patrolBoat'] as const,
  });

  // Game mode state
  const [gameMode, setGameMode] = useState<'vsAI' | 'vsPlayer'>('vsAI');
  const [hasSelectedMode, setHasSelectedMode] = useState(false);

  // Multiplayer Hook
  const {
    showMultiplayerLobby,
    setShowMultiplayerLobby,
    multiplayerRoom,
    playerType,
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
  } = useMultiplayerGame({
    gameState,
    setGameState,
    gameMode,
    onGameStart: () => {
      setGameStartTime(Date.now());
      setIsWaitingForOpponent(false);
    },
    onGameOver: (winner) => {
      setGameState(prev => ({
        ...prev,
        status: 'gameOver',
        winner
      }));
      if (winner === 'Player') {
        setShowScoreSubmission(true);
      }
    }
  });

  // Timer and leaderboard state
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [movesCount, setMovesCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showScoreSubmission, setShowScoreSubmission] = useState(false);

  const initializeGame = useCallback(() => {
    const player = createPlayer('p1', 'Player');
    const opponent = placeShipsRandomly(createPlayer('cpu', 'Computer', true), allowAdjacent);

    // Initialize player based on placement mode
    const playerWithShips = placementMode === 'random'
      ? placeShipsRandomly(player, allowAdjacent)
      : player; // Empty board for manual placement

    setGameState({
      player: playerWithShips,
      opponent,
      currentTurn: 'player',
      status: 'placement',
    });

    // Reset manual placement state
    setManualPlacementState({
      currentShipIndex: 0,
      orientation: 'horizontal',
      shipsToPlace: ['destroyer', 'aircraftCarrier', 'frigate', 'submarine', 'patrolBoat'],
    });
  }, [allowAdjacent, placementMode]);

  // Timer effect
  useEffect(() => {
    let interval: number | undefined;
    if (gameState.status === 'playing' && gameStartTime) {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.status, gameStartTime]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleStartGame = async () => {
    // Don't allow starting if manual placement isn't complete
    if (placementMode === 'manual' && manualPlacementState.currentShipIndex < manualPlacementState.shipsToPlace.length) {
      return;
    }

    if (gameMode === 'vsPlayer' && multiplayerRoom && playerType) {
      await startGame();
    } else {
      // Local game
      setGameState(prev => ({ ...prev, status: 'playing' }));
      setGameStartTime(Date.now());
      setElapsedTime(0);
      setMovesCount(0);
    }
  };

  const handleResetGame = () => {
    initializeGame();
    setGameStartTime(null);
    setElapsedTime(0);
    setMovesCount(0);
    setMovesCount(0);
    setShowScoreSubmission(false);
    setIsWaitingForOpponent(false);
  };

  const handleRandomizeShips = () => {
    const newPlayer = placeShipsRandomly(createPlayer('p1', 'Player'), allowAdjacent);
    setGameState(prev => ({ ...prev, player: newPlayer }));
  };

  const handleRotateShip = () => {
    setManualPlacementState(prev => ({
      ...prev,
      orientation: prev.orientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  };

  const handlePlacementModeChange = (mode: 'random' | 'manual') => {
    setPlacementMode(mode);
  };

  const handleManualPlaceShip = (coordinate: Coordinate) => {
    if (gameState.status !== 'placement' || placementMode !== 'manual') return;
    if (manualPlacementState.currentShipIndex >= manualPlacementState.shipsToPlace.length) return;

    const shipType = manualPlacementState.shipsToPlace[manualPlacementState.currentShipIndex];

    try {
      const newPlayer = placeShip(
        gameState.player,
        shipType,
        coordinate,
        manualPlacementState.orientation,
        allowAdjacent
      );

      setGameState(prev => ({ ...prev, player: newPlayer }));
      setManualPlacementState(prev => ({
        ...prev,
        currentShipIndex: prev.currentShipIndex + 1,
      }));
    } catch (error) {
      console.error('Invalid placement:', error);
    }
  };

  const handlePlayerAttack = async (coordinate: Coordinate) => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'player') return;

    if (gameMode === 'vsPlayer' && multiplayerRoom && playerType) {
      // Prevent hitting same spot
      if (gameState.opponent.board[coordinate.row][coordinate.col].status !== 'empty' &&
        gameState.opponent.board[coordinate.row][coordinate.col].status !== 'ship') {
        return;
      }

      // Just send the move.
      // We need to know the result to send it to the server.
      // So we DO need to calculate it locally, but NOT update state.
      const { result } = receiveAttack(gameState.opponent, coordinate);

      if (result === 'already-attacked') return;

      // Check for win locally to send setWinner to server
      const { player: tempOpponent } = receiveAttack(gameState.opponent, coordinate);
      if (result === 'sunk' && checkWin(tempOpponent)) {
        await multiplayerAPI.setWinner(multiplayerRoom.id, playerType === 'host' ? multiplayerRoom.host_player_name : (multiplayerRoom.guest_player_name || 'Guest'));
        // Do NOT set local state. Wait for room update.
      }



      // Send move to server (background sync)
      try {
        await multiplayerAPI.makeMove(multiplayerRoom.id, playerType, coordinate, result as 'hit' | 'miss' | 'sunk');
        setMovesCount(prev => prev + 1);
      } catch (error) {
        console.error('Failed to sync move:', error);
        // Ideally we would rollback here, but for now we rely on the next sync or user refresh
      }
      return;
    }

    // Local game logic
    const { player: newOpponent, result } = receiveAttack(gameState.opponent, coordinate);

    if (result === 'already-attacked') return;

    // Increment moves count for valid attacks
    setMovesCount(prev => prev + 1);

    const isWin = checkWin(newOpponent);

    if (isWin) {
      setGameState(prev => ({
        ...prev,
        opponent: newOpponent,
        status: 'gameOver',
        winner: 'Player',
      }));
      // Show score submission modal
      setShowScoreSubmission(true);
      return;
    }

    setGameState(prev => ({
      ...prev,
      opponent: newOpponent,
      currentTurn: 'opponent',
    }));
  };

  // AI Turn Effect
  // AI Turn Effect
  useEffect(() => {
    if (gameMode === 'vsAI' && gameState.status === 'playing' && gameState.currentTurn === 'opponent') {
      const timer = setTimeout(() => {
        let attackCoord: Coordinate;
        let newAIState = aiState;

        if (aiDifficulty === 'smart') {
          const result = smartAiTurn(gameState.player, aiState);
          attackCoord = result.coordinate;
          newAIState = result.newAiState;
        } else {
          attackCoord = aiTurn(gameState.player);
        }

        const { player: newPlayer, result } = receiveAttack(gameState.player, attackCoord);

        // Update AI state based on attack result
        if (aiDifficulty === 'smart') {
          newAIState = updateAIStateAfterAttack(newAIState, attackCoord, result, newPlayer);
          setAIState(newAIState);
        }

        const isWin = checkWin(newPlayer);

        if (isWin) {
          setGameState(prev => ({
            ...prev,
            player: newPlayer,
            status: 'gameOver',
            winner: 'Computer',
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            player: newPlayer,
            currentTurn: 'player',
          }));
        }
      }, 1000); // 1 second delay for AI thinking

      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.currentTurn, gameState.player, aiState, aiDifficulty, gameMode]);

  // Handle hover broadcast
  const handleOpponentBoardHover = (coordinate: Coordinate | null) => {
    broadcastHover(coordinate);
  };

  // Multiplayer handlers
  const handleGameModeChange = (mode: 'vsAI' | 'vsPlayer') => {
    setGameMode(mode);
    setHasSelectedMode(true);
    if (mode === 'vsPlayer') {
      setShowMultiplayerLobby(true);
    }
  };

  const handleBackToMenu = () => {
    setHasSelectedMode(false);
    handleResetGame();
    cancelMultiplayer();
  };

  const handleCreateRoom = async (playerName: string) => {
    await createRoom(playerName);
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    await joinRoom(roomCode, playerName);
  };

  const handleCancelMultiplayer = () => {
    cancelMultiplayer();
    setGameMode('vsAI');
  };

  return (
    <div className="min-h-screen bg-main text-text-primary flex flex-col items-center py-8 px-4 font-sans">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-5xl font-extrabold font-orbitron text-primary tracking-tight drop-shadow-sm">
            Battleship
          </h1>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="p-2 bg-yellow-400 hover:bg-yellow-500 rounded-full shadow-lg transition-colors"
            title="View Leaderboard"
          >
            🏆
          </button>
        </div>
        <p className="text-text-secondary font-medium">Command your fleet and destroy the enemy!</p>

        {!hasSelectedMode ? (
          <div className="mt-8">
            <WelcomeScreen onSelectMode={handleGameModeChange} />
          </div>
        ) : (
          <>
            {/* Timer Display */}
            {gameState.status === 'playing' && (
              <div className="mt-4 inline-flex items-center gap-4 bg-surface/60 px-6 py-2 rounded-full shadow-md border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary font-medium">⏱️ Time:</span>
                  <span className="font-mono text-lg font-bold text-primary">
                    {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="w-px h-6 bg-border"></div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary font-medium">🎯 Moves:</span>
                  <span className="font-bold text-secondary">{movesCount}</span>
                </div>
              </div>
            )}
          </>
        )}
      </header>

      {multiplayerError && !showMultiplayerLobby && (
        <div className="w-full max-w-2xl mb-6 animate-fade-in">
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-sm">
            <span className="text-2xl">⚠️</span>
            <p className="font-medium">{multiplayerError}</p>
          </div>
        </div>
      )}

      {hasSelectedMode && (
        <>
          <main className="w-full max-w-5xl flex flex-col gap-8">
            {/* Turn Indicator */}
            <div className="flex justify-center">
              <div className={`px-8 py-3 rounded-full shadow-lg text-lg font-bold transition-all duration-300 transform ${gameState.status === 'playing'
                ? gameState.currentTurn === 'player'
                  ? 'bg-primary text-white scale-105 ring-4 ring-primary/30'
                  : 'bg-red-500 text-white scale-105 ring-4 ring-red-500/30'
                : 'bg-surface text-text-secondary border border-border'
                }`}>
                {gameState.status === 'placement' && "Setup Phase"}
                {gameState.status === 'gameOver' && "Game Over"}
                {gameState.status === 'playing' && (
                  gameState.currentTurn === 'player' ? "Your Turn" : "Enemy Turn"
                )}
              </div>
            </div>

            <GameControls
              status={gameState.status}
              onStart={handleStartGame}
              onReset={handleResetGame}
              onRandomize={handleRandomizeShips}
              winner={gameState.winner}
              allowAdjacent={allowAdjacent}
              onToggleAdjacent={setAllowAdjacent}
              placementMode={placementMode}
              onPlacementModeChange={handlePlacementModeChange}
              canStartGame={placementMode === 'random' || manualPlacementState.currentShipIndex >= manualPlacementState.shipsToPlace.length}
              aiDifficulty={aiDifficulty}
              onAIDifficultyChange={setAIDifficulty}
              gameMode={gameMode}
              roomCode={multiplayerRoom?.room_code}
              isWaitingForOpponent={isWaitingForOpponent}
              onBackToMenu={handleBackToMenu}
            />

            <div className="w-full max-w-7xl mx-auto px-4">
              {placementMode === 'manual' && gameState.status === 'placement' && !isWaitingForOpponent && (
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-sm">
                    <ManualPlacement
                      shipsToPlace={[...manualPlacementState.shipsToPlace]}
                      currentShipIndex={manualPlacementState.currentShipIndex}
                      orientation={manualPlacementState.orientation}
                      onRotate={handleRotateShip}
                    />
                  </div>
                </div>
              )}

              {isWaitingForOpponent && (
                <div className="mb-6 flex justify-center animate-pulse">
                  <div className="bg-surface/80 border border-primary/50 text-primary px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                    <span className="font-medium">Waiting for opponent to be ready...</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="flex flex-col items-center gap-4">
                  <h2 className={`text-xl font-bold font-orbitron tracking-wide ${gameState.currentTurn === 'player' ? 'text-primary' : 'text-text-muted'}`}>Your Fleet</h2>
                  <GameBoard
                    board={gameState.player.board}
                    isPlayer={true}
                    showShips={true}
                    ships={gameState.player.ships}
                    onCellClick={!isWaitingForOpponent && placementMode === 'manual' && gameState.status === 'placement' ? handleManualPlaceShip : undefined}
                    opponentHover={opponentHover}
                  />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <h2 className={`text-xl font-bold font-orbitron tracking-wide ${gameState.currentTurn === 'opponent' ? 'text-red-500' : 'text-text-muted'}`}>Enemy Waters</h2>
                  <GameBoard
                    board={gameState.opponent.board}
                    isPlayer={false}
                    showShips={gameState.status === 'gameOver'}
                    ships={gameState.opponent.ships}
                    onCellClick={gameState.status === 'playing' && gameState.currentTurn === 'player' ? handlePlayerAttack : undefined}
                    onCellHover={handleOpponentBoardHover}
                  />
                </div>
              </div>
            </div>
          </main>

          {/* Leaderboard Modal */}
          {showLeaderboard && (
            <Leaderboard onClose={() => setShowLeaderboard(false)} gameMode={gameMode} />
          )}

          {/* Score Submission Modal */}
          {showScoreSubmission && (
            <ScoreSubmission
              completionTime={elapsedTime}
              movesCount={movesCount}
              aiDifficulty={aiDifficulty}
              gameMode={gameMode}
              onClose={() => setShowScoreSubmission(false)}
              onSuccess={() => {
                setShowScoreSubmission(false);
                setShowLeaderboard(true);
              }}
            />
          )}

          {/* Multiplayer Lobby */}
          {showMultiplayerLobby && (
            <MultiplayerLobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onCancel={handleCancelMultiplayer}
              loading={multiplayerLoading}
              error={multiplayerError}
              roomCode={multiplayerRoom?.room_code}
            />
          )}
          {/* Debug Info */}
          <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs font-mono pointer-events-none z-50">
            <p>Mode: {gameMode}</p>
            <p>Room Status: {multiplayerRoom?.status}</p>
            <p>Host Ready: {multiplayerRoom?.host_ready ? 'Yes' : 'No'}</p>
            <p>Guest Ready: {multiplayerRoom?.guest_ready ? 'Yes' : 'No'}</p>
            <p>Player Type: {playerType}</p>
            <p>Turn: {gameState.currentTurn}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
