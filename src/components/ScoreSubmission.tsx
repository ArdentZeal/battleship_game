import React, { useState } from 'react';
import { leaderboardAPI } from '../lib/supabase';

interface ScoreSubmissionProps {
    completionTime: number;
    movesCount: number;
    aiDifficulty: 'random' | 'smart';
    onClose: () => void;
    onSuccess: () => void;
}

const ScoreSubmission: React.FC<ScoreSubmissionProps> = ({
    completionTime,
    movesCount,
    aiDifficulty,
    onClose,
    onSuccess,
}) => {
    const [playerName, setPlayerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (playerName.length < 3 || playerName.length > 20) {
            setError('Name must be 3-20 characters');
            return;
        }

        setSubmitting(true);
        setError('');

        const success = await leaderboardAPI.submitScore({
            player_name: playerName.trim(),
            completion_time: completionTime,
            ai_difficulty: aiDifficulty,
            moves_count: movesCount,
        });

        setSubmitting(false);

        if (success) {
            onSuccess();
        } else {
            setError('Failed to submit score. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
                {/* Victory Message */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Victory!</h2>
                    <p className="text-slate-600">You sank all enemy ships!</p>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-slate-600 text-sm mb-1">Time</p>
                            <p className="text-2xl font-bold text-blue-600">{formatTime(completionTime)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-600 text-sm mb-1">Moves</p>
                            <p className="text-2xl font-bold text-indigo-600">{movesCount}</p>
                        </div>
                    </div>
                    <div className="text-center mt-4 pt-4 border-t border-slate-200">
                        <p className="text-slate-600 text-sm mb-1">AI Difficulty</p>
                        <p className="text-lg font-semibold text-slate-800 capitalize">{aiDifficulty}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="playerName" className="block text-sm font-medium text-slate-700 mb-2">
                            Enter your name to save score:
                        </label>
                        <input
                            id="playerName"
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Your name"
                            maxLength={20}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting || playerName.trim().length < 3}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Submitting...' : 'Submit Score'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                        >
                            Skip
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScoreSubmission;
