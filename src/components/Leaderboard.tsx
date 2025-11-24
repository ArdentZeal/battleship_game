import React, { useState, useEffect } from 'react';
import { leaderboardAPI, type LeaderboardEntry } from '../lib/supabase';

interface LeaderboardProps {
    onClose: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
    const [difficulty, setDifficulty] = useState<'random' | 'smart'>('random');
    const [scores, setScores] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScores();
    }, [difficulty]);

    const fetchScores = async () => {
        setLoading(true);
        const data = await leaderboardAPI.getTopScores(difficulty);
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
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">🏆 Leaderboard</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
                        >
                            ×
                        </button>
                    </div>

                    {/* Difficulty Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setDifficulty('random')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${difficulty === 'random'
                                    ? 'bg-white text-blue-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Random AI
                        </button>
                        <button
                            onClick={() => setDifficulty('smart')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${difficulty === 'smart'
                                    ? 'bg-white text-blue-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Smart AI
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                            <p className="mt-4 text-slate-600">Loading scores...</p>
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-600 text-lg">No scores yet!</p>
                            <p className="text-slate-400 mt-2">Be the first to complete a game!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                                        <th className="text-left p-3 font-semibold text-slate-700">Player</th>
                                        <th className="text-left p-3 font-semibold text-slate-700">Time</th>
                                        <th className="text-left p-3 font-semibold text-slate-700">Moves</th>
                                        <th className="text-left p-3 font-semibold text-slate-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scores.map((score, index) => (
                                        <tr
                                            key={score.id}
                                            className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''
                                                }`}
                                        >
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {index === 0 && <span className="text -2xl">🥇</span>}
                                                    {index === 1 && <span className="text-2xl">🥈</span>}
                                                    {index === 2 && <span className="text-2xl">🥉</span>}
                                                    {index > 2 && <span className="font-medium text-slate-600">#{index + 1}</span>}
                                                </div>
                                            </td>
                                            <td className="p-3 font-medium text-slate-800">{score.player_name}</td>
                                            <td className="p-3 font-mono font-semibold text-blue-600">{formatTime(score.completion_time)}</td>
                                            <td className="p-3 text-slate-600">{score.moves_count}</td>
                                            <td className="p-3 text-slate-500 text-sm">{formatDate(score.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
                    <button
                        onClick={fetchScores}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                    >
                        🔄 Refresh
                    </button>
                    <p className="text-slate-500 text-sm">Top 10 fastest times</p>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
