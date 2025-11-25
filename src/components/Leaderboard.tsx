import React, { useState, useEffect } from 'react';
import { leaderboardAPI, type LeaderboardEntry } from '../lib/supabase';

interface LeaderboardProps {
    onClose: () => void;
    gameMode: 'vsAI' | 'vsPlayer';
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose, gameMode }) => {
    const [difficulty, setDifficulty] = useState<'random' | 'smart'>('random');
    const [scores, setScores] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScores();
    }, [difficulty, gameMode]);

    const fetchScores = async () => {
        setLoading(true);
        const data = await leaderboardAPI.getTopScores(difficulty, gameMode);
        setScores(data);
        setLoading(false);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">
                            {gameMode === 'vsAI' ? '🏆 vs AI Leaderboard' : '🏆 vs Player Leaderboard'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                        >
                            ×
                        </button>
                    </div>

                    {/* Difficulty Tabs (only for vsAI) */}
                    {gameMode === 'vsAI' && (
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setDifficulty('random')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${difficulty === 'random'
                                    ? 'bg-white text-primary'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                Random AI
                            </button>
                            <button
                                onClick={() => setDifficulty('smart')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${difficulty === 'smart'
                                    ? 'bg-white text-primary'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                Smart AI
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                            <p className="mt-4 text-text-secondary">Loading scores...</p>
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-text-secondary text-lg">No scores yet!</p>
                            <p className="text-text-muted mt-2">Be the first to complete a game!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-3 font-semibold text-text-primary">Rank</th>
                                        <th className="text-left p-3 font-semibold text-text-primary">Player</th>
                                        <th className="text-left p-3 font-semibold text-text-primary">Time</th>
                                        <th className="text-left p-3 font-semibold text-text-primary">Moves</th>
                                        <th className="text-left p-3 font-semibold text-text-primary">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scores.map((score, index) => (
                                        <tr
                                            key={score.id}
                                            className={`border-b border-border hover:bg-surface-hover transition-colors ${index < 3 ? 'bg-primary/10' : ''
                                                }`}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {index === 0 && <span className="text -2xl">🥇</span>}
                                                    {index === 1 && <span className="text-2xl">🥈</span>}
                                                    {index === 2 && <span className="text-2xl">🥉</span>}
                                                    {index > 2 && <span className="font-medium text-text-secondary">#{index + 1}</span>}
                                                </div>
                                            </td>
                                            <td className="p-3 font-medium text-text-primary">{score.player_name}</td>
                                            <td className="p-3 font-mono font-semibold text-primary">{formatTime(score.completion_time)}</td>
                                            <td className="p-3 text-text-secondary">{score.moves_count}</td>
                                            <td className="p-3 text-text-muted text-sm">{formatDate(score.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 bg-surface flex justify-between items-center">
                    <button
                        onClick={fetchScores}
                        className="text-primary hover:text-primary-hover font-medium flex items-center gap-2"
                    >
                        🔄 Refresh
                    </button>
                    <p className="text-text-muted text-sm">Top 10 fastest times</p>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
