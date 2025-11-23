import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import ManualPlacement from './components/ManualPlacement';
import type { GameState, Player, Coordinate } from './game/types';
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

const App: React.FC = () => {
  console.log('App rendering');
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const initialState: GameState = {
        player: createPlayer('p1', 'Player'),
        opponent: createPlayer('cpu', 'Computer', true),
        currentTurn: 'player',
        status: 'placement',
      };
      console.log('GameState initialized:', initialState);
      return initialState;
    } catch (e) {
      console.error('Error initializing state:', e);
      // Fallback state to prevent crash
      return {
        player: { id: 'error', name: 'Error', board: [], ships: [], isComputer: false } as any,
        opponent: { id: 'error', name: 'Error', board: [], ships: [], isComputer: true } as any,
        currentTurn: 'player',
        status: 'placement',
      };
    }
  });
  console.log('GameState:', gameState);

  const [allowAdjacent, setAllowAdjacent] = useState(false);
  const [placementMode, setPlacementMode] = useState<'random' | 'manual'>('random');
  const [aiDifficulty, setAIDifficulty] = useState<'random' | 'smart'>('random');
  const [aiState, setAIState] = useState(() => createAIState());
  const [manualPlacementState, setManualPlacementState] = useState({
    currentShipIndex: 0,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
    shipsToPlace: ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'] as const,
  });

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
      shipsToPlace: ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'],
    });
  }, [allowAdjacent, placementMode]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleStartGame = () => {
    // Don't allow starting if manual placement isn't complete
    if (placementMode === 'manual' && manualPlacementState.currentShipIndex < manualPlacementState.shipsToPlace.length) {
      return;
    }
    setGameState(prev => ({ ...prev, status: 'playing' }));
  };

  const handleResetGame = () => {
    initializeGame();
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

  const handleToggleAdjacent = (allow: boolean) => {
    setAllowAdjacent(allow);
    // Optionally re-randomize immediately when toggled, or let user click randomize
    // Let's re-randomize to show effect immediately
    // But we need to update state first, so useEffect might be better or just call it here
    // Actually, since state update is async, better to trigger effect or just rely on user.
    // Let's just update state and let user re-randomize or reset.
    // Wait, user expects "option... to change before game started".
    // If I toggle, I should probably reset the board to reflect new rules?
    // Let's just set state. The initializeGame dependency on allowAdjacent will trigger re-init.
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
      // Could show error message to user
    }
  };

  const handlePlayerAttack = (coordinate: Coordinate) => {
    if (gameState.status !== 'playing' || gameState.currentTurn !== 'player') return;

    const { player: newOpponent, result } = receiveAttack(gameState.opponent, coordinate);

    if (result === 'already-attacked') return;

    const isWin = checkWin(newOpponent);

    if (isWin) {
      setGameState(prev => ({
        ...prev,
        opponent: newOpponent,
        status: 'gameOver',
        winner: 'Player',
      }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      opponent: newOpponent,
      currentTurn: 'opponent',
    }));
  };

  // AI Turn Effect
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.currentTurn === 'opponent') {
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
  }, [gameState.status, gameState.currentTurn, gameState.player, aiState, aiDifficulty]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-indigo-100 text-slate-800 flex flex-col items-center py-8 px-4 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 tracking-tight drop-shadow-sm">
          Battleship
        </h1>
        <p className="text-slate-500 font-medium">Command your fleet and destroy the enemy!</p>
      </header>

      <main className="w-full max-w-5xl flex flex-col gap-8">
        {/* Turn Indicator */}
        <div className="flex justify-center">
          <div className={`px-8 py-3 rounded-full shadow-lg text-lg font-bold transition-all duration-300 transform ${gameState.status === 'playing'
            ? gameState.currentTurn === 'player'
              ? 'bg-blue-500 text-white scale-105 ring-4 ring-blue-200'
              : 'bg-red-500 text-white scale-105 ring-4 ring-red-200'
            : 'bg-slate-200 text-slate-600'
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
        />

        <div className="w-full max-w-7xl mx-auto px-4">
          {placementMode === 'manual' && gameState.status === 'placement' && (
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="flex flex-col items-center gap-4">
              <h2 className={`text-xl font-bold tracking-wide ${gameState.currentTurn === 'player' ? 'text-blue-600' : 'text-slate-400'}`}>Your Fleet</h2>
              <GameBoard
                board={gameState.player.board}
                isPlayer={true}
                showShips={true}
                onCellClick={placementMode === 'manual' && gameState.status === 'placement' ? handleManualPlaceShip : undefined}
              />
            </div>

            <div className="flex flex-col items-center gap-4">
              <h2 className={`text-xl font-bold tracking-wide ${gameState.currentTurn === 'opponent' ? 'text-red-600' : 'text-slate-400'}`}>Enemy Waters</h2>
              <GameBoard
                board={gameState.opponent.board}
                isPlayer={false}
                showShips={gameState.status === 'gameOver'}
                onCellClick={gameState.status === 'playing' && gameState.currentTurn === 'player' ? handlePlayerAttack : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
