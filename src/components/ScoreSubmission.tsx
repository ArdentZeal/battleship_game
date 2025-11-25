import React, { useState } from 'react';
import { leaderboardAPI } from '../lib/supabase';

interface ScoreSubmissionProps {
    completionTime: number;
    movesCount: number;
    aiDifficulty: 'random' | 'smart';
    gameMode: 'vsAI' | 'vsPlayer';
    onClose: () => void;
    onSuccess: () => void;
}

const ScoreSubmission: React.FC<ScoreSubmissionProps> = ({
    completionTime,
    movesCount,
    aiDifficulty,
    gameMode,
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
            game_mode: gameMode,
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
            <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border" onClick={(e) => e.stopPropagation()}>
                {/* Victory Message */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-text-primary mb-2">Victory!</h2>
                    <p className="text-text-secondary">You sank all enemy ships!</p>
                </div>

                {/* Stats */}
                <div className="bg-surface-hover rounded-xl p-6 mb-6 border border-border">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-text-secondary text-sm mb-1">Time</p>
                            <p className="text-2xl font-bold text-primary">{formatTime(completionTime)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-text-secondary text-sm mb-1">Moves</p>
                            <p className="text-2xl font-bold text-secondary">{movesCount}</p>
                        </div>
                    </div>
                    <div className="text-center mt-4 pt-4 border-t border-border">
                        <p className="text-text-secondary text-sm mb-1">AI Difficulty</p>
                        <p className="text-lg font-semibold text-text-primary capitalize">{aiDifficulty}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="playerName" className="block text-sm font-medium text-text-primary mb-2">
                            Enter your name to save score:
                        </label>
                        <input
                            id="playerName"
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Your name"
                            maxLength={20}
                            className="w-full px-4 py-3 bg-main border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-primary placeholder-text-muted"
                        />
                        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting || playerName.trim().length < 3}
                            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? 'Submitting...' : 'Submit Score'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-surface-hover text-text-primary py-3 rounded-lg font-semibold hover:bg-border transition-colors border border-border"
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
