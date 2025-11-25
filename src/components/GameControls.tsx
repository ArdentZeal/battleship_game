import React from 'react';
import type { GameStatus } from '../game/types';

interface GameControlsProps {
    status: GameStatus;
    onStart: () => void;
    onReset: () => void;
    onRandomize: () => void;
    winner?: string;
    allowAdjacent: boolean;
    onToggleAdjacent: (allow: boolean) => void;
    placementMode: 'random' | 'manual';
    onPlacementModeChange: (mode: 'random' | 'manual') => void;
    canStartGame: boolean;
    aiDifficulty: 'random' | 'smart';
    onAIDifficultyChange: (difficulty: 'random' | 'smart') => void;
    gameMode: 'vsAI' | 'vsPlayer';
    roomCode?: string | null;
    isWaitingForOpponent?: boolean;
    onBackToMenu: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
    status,
    onStart,
    onReset,
    onRandomize,
    winner,
    allowAdjacent,
    onToggleAdjacent,
    placementMode,
    onPlacementModeChange,
    canStartGame,
    aiDifficulty,
    onAIDifficultyChange,
    gameMode,
    roomCode,
    isWaitingForOpponent = false,
    onBackToMenu,
}) => {
    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-surface/60 rounded-2xl backdrop-blur-md border border-border shadow-xl">
            <div className="text-2xl font-bold font-orbitron text-text-primary tracking-tight">
                {status === 'placement' && 'Deploy Your Fleet'}
                {status === 'playing' && 'Engage the Enemy!'}
                {status === 'gameOver' && (
                    <span className={winner === 'Player' ? 'text-primary' : 'text-red-500'}>
                        {winner === 'Player' ? 'Victory! Enemy Fleet Destroyed' : 'Defeat! Your Fleet is Sunk'}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4 items-center">
                {status === 'placement' && (
                    <>
                        <div className="flex items-center gap-4 text-text-primary bg-surface px-4 py-2 rounded-full border border-border">
                            <span className="font-medium text-sm">Mode:</span>
                            <span className="font-bold text-primary">
                                {gameMode === 'vsAI' ? '🤖 vs AI' : '🌐 vs Player'}
                            </span>
                            <button
                                onClick={onBackToMenu}
                                className="ml-2 text-xs bg-surface-hover hover:bg-border px-2 py-1 rounded text-text-secondary transition-colors"
                            >
                                Change
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-text-primary bg-surface px-4 py-2 rounded-full border border-border">
                            <span className="font-medium text-sm">Placement:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="placementMode"
                                    value="random"
                                    checked={placementMode === 'random'}
                                    onChange={() => onPlacementModeChange('random')}
                                    className="w-4 h-4"
                                />
                                <span>Random</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="placementMode"
                                    value="manual"
                                    checked={placementMode === 'manual'}
                                    onChange={() => onPlacementModeChange('manual')}
                                    className="w-4 h-4"
                                />
                                <span>Manual</span>
                            </label>
                        </div>

                        {gameMode === 'vsAI' && (
                            <div className="flex items-center gap-4 text-text-primary bg-surface px-4 py-2 rounded-full border border-border">
                                <span className="font-medium text-sm">AI Difficulty:</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="aiDifficulty"
                                        value="random"
                                        checked={aiDifficulty === 'random'}
                                        onChange={() => onAIDifficultyChange('random')}
                                        className="w-4 h-4"
                                    />
                                    <span>Random</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="aiDifficulty"
                                        value="smart"
                                        checked={aiDifficulty === 'smart'}
                                        onChange={() => onAIDifficultyChange('smart')}
                                        className="w-4 h-4"
                                    />
                                    <span>Smart</span>
                                </label>
                            </div>
                        )}

                        {roomCode && (
                            <div className="bg-surface px-4 py-2 rounded-full border border-primary/30">
                                <span className="text-sm text-text-secondary">Room:</span>
                                <span className="ml-2 font-mono font-bold text-primary">{roomCode}</span>
                            </div>
                        )}
                    </>
                )}

                <div className="flex gap-4">
                    {status === 'placement' && (
                        <>
                            {placementMode === 'random' && (
                                <button
                                    onClick={onRandomize}
                                    className="px-6 py-2.5 bg-secondary hover:bg-secondary-hover text-white rounded-full transition-all transform hover:scale-105 font-semibold shadow-lg shadow-secondary/30"
                                >
                                    Randomize Ships
                                </button>
                            )}
                            <button
                                onClick={onStart}
                                disabled={!canStartGame || isWaitingForOpponent}
                                className={`px-6 py-2.5 ${canStartGame && !isWaitingForOpponent
                                    ? 'bg-primary hover:bg-primary-hover cursor-pointer'
                                    : 'bg-surface-hover text-text-muted cursor-not-allowed'
                                    } text-white rounded-full transition-all transform ${canStartGame && !isWaitingForOpponent ? 'hover:scale-105' : ''} font-semibold shadow-lg shadow-primary/30`}
                            >
                                {isWaitingForOpponent ? 'Waiting for Opponent...' : 'Start Game'}
                            </button>
                        </>
                    )}

                    <button
                        onClick={gameMode === 'vsPlayer' ? onBackToMenu : onReset}
                        className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 font-semibold shadow-md border border-border ${gameMode === 'vsPlayer'
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30'
                                : 'bg-surface hover:bg-surface-hover text-text-primary'
                            }`}
                    >
                        {status === 'placement'
                            ? (gameMode === 'vsPlayer' ? 'Leave Room' : 'Reset Board')
                            : (gameMode === 'vsPlayer' ? 'Leave Game' : 'New Game')
                        }
                    </button>
                </div>

                {status === 'placement' && (
                    <div className="flex items-center gap-2 text-text-primary bg-surface px-4 py-2 rounded-full border border-border">
                        <input
                            type="checkbox"
                            id="allowAdjacent"
                            checked={allowAdjacent}
                            onChange={(e) => onToggleAdjacent(e.target.checked)}
                            className="w-5 h-5 text-primary rounded focus:ring-primary border-border"
                        />
                        <label htmlFor="allowAdjacent" className="font-medium cursor-pointer select-none">
                            Allow ships to touch
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameControls;
