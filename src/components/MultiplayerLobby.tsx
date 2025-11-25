import React, { useState } from 'react';

interface MultiplayerLobbyProps {
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomCode: string, playerName: string) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
    roomCode?: string | null; // If already created, show the code
}

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
    onCreateRoom,
    onJoinRoom,
    onCancel,
    loading = false,
    error = null,
    roomCode = null
}) => {
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
    const [playerName, setPlayerName] = useState('');
    const [inputRoomCode, setInputRoomCode] = useState('');

    const handleCreateRoom = () => {
        if (playerName.trim().length >= 3) {
            onCreateRoom(playerName.trim());
        }
    };

    const handleJoinRoom = () => {
        if (playerName.trim().length >= 3 && inputRoomCode.trim().length === 6) {
            onJoinRoom(inputRoomCode.trim().toUpperCase(), playerName.trim());
        }
    };

    const copyRoomCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
        }
    };

    if (roomCode) {
        // Show room code to share
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">🎮 Room Created!</h2>

                    <div className="bg-surface-hover rounded-xl p-6 mb-6 border border-border">
                        <p className="text-text-secondary text-sm mb-2">Share this code with your friend:</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-main rounded-lg px-4 py-3 border-2 border-primary">
                                <p className="text-3xl font-bold text-primary text-center tracking-wider font-mono">
                                    {roomCode}
                                </p>
                            </div>
                            <button
                                onClick={copyRoomCode}
                                className="p-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                                title="Copy code"
                            >
                                📋
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                        <p className="text-text-secondary">Waiting for opponent...</p>
                    </div>

                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-surface-hover text-text-primary rounded-lg font-semibold hover:bg-border transition-colors border border-border"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border">
                <h2 className="text-2xl font-bold text-text-primary mb-6">🌐 Online Multiplayer</h2>

                {mode === 'select' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setMode('create')}
                            className="w-full p-6 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg hover:from-primary-hover hover:to-secondary-hover transition-all shadow-lg"
                        >
                            🎯 Create Room
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            className="w-full p-6 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-lg"
                        >
                            🚀 Join Room
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-3 bg-surface-hover text-text-primary rounded-lg font-semibold hover:bg-border transition-colors border border-border"
                        >
                            Back
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                maxLength={20}
                                className="w-full px-4 py-3 bg-main border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-text-primary placeholder-text-muted"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-500 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleCreateRoom}
                            disabled={playerName.trim().length < 3 || loading}
                            className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                        <button
                            onClick={() => setMode('select')}
                            className="w-full py-3 bg-surface-hover text-text-primary rounded-lg font-semibold hover:bg-border transition-colors border border-border"
                        >
                            Back
                        </button>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                maxLength={20}
                                className="w-full px-4 py-3 bg-main border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none mb-3 text-text-primary placeholder-text-muted"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Room Code
                            </label>
                            <input
                                type="text"
                                value={inputRoomCode}
                                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-main border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono text-lg text-center tracking-wider text-text-primary placeholder-text-muted"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-500 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleJoinRoom}
                            disabled={playerName.trim().length < 3 || inputRoomCode.trim().length !== 6 || loading}
                            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Joining...' : 'Join Room'}
                        </button>
                        <button
                            onClick={() => setMode('select')}
                            className="w-full py-3 bg-surface-hover text-text-primary rounded-lg font-semibold hover:bg-border transition-colors border border-border"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiplayerLobby;
