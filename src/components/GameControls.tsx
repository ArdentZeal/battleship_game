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
}) => {
    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white/60 rounded-2xl backdrop-blur-md border border-white/50 shadow-xl">
            <div className="text-2xl font-bold text-slate-700 tracking-tight">
                {status === 'placement' && 'Deploy Your Fleet'}
                {status === 'playing' && 'Engage the Enemy!'}
                {status === 'gameOver' && (
                    <span className={winner === 'Player' ? 'text-blue-600' : 'text-red-500'}>
                        {winner === 'Player' ? 'Victory! Enemy Fleet Destroyed' : 'Defeat! Your Fleet is Sunk'}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4 items-center">
                {status === 'placement' && (
                    <>
                        <div className="flex items-center gap-4 text-slate-700 bg-white/50 px-4 py-2 rounded-full border border-white/60">
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

                        <div className="flex items-center gap-4 text-slate-700 bg-white/50 px-4 py-2 rounded-full border border-white/60">
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
                    </>
                )}

                <div className="flex gap-4">
                    {status === 'placement' && (
                        <>
                            {placementMode === 'random' && (
                                <button
                                    onClick={onRandomize}
                                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-all transform hover:scale-105 font-semibold shadow-lg shadow-indigo-200"
                                >
                                    Randomize Ships
                                </button>
                            )}
                            <button
                                onClick={onStart}
                                disabled={!canStartGame}
                                className={`px-6 py-2.5 ${canStartGame
                                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    } text-white rounded-full transition-all transform ${canStartGame ? 'hover:scale-105' : ''} font-semibold shadow-lg shadow-blue-200`}
                            >
                                Start Game
                            </button>
                        </>
                    )}

                    <button
                        onClick={onReset}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition-all transform hover:scale-105 font-semibold shadow-md"
                    >
                        {status === 'placement' ? 'Reset Board' : 'New Game'}
                    </button>
                </div>

                {status === 'placement' && (
                    <div className="flex items-center gap-2 text-slate-700 bg-white/50 px-4 py-2 rounded-full border border-white/60">
                        <input
                            type="checkbox"
                            id="allowAdjacent"
                            checked={allowAdjacent}
                            onChange={(e) => onToggleAdjacent(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
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
