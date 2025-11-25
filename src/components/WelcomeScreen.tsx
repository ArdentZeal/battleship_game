import React from 'react';

interface WelcomeScreenProps {
    onSelectMode: (mode: 'vsAI' | 'vsPlayer') => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectMode }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12 animate-fade-in">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold font-orbitron text-text-primary">Choose Your Battle</h2>
                <p className="text-text-secondary text-lg">Select a game mode to begin your campaign</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                {/* Vs AI Card */}
                <button
                    onClick={() => onSelectMode('vsAI')}
                    className="group relative flex flex-col items-center p-8 bg-surface/60 hover:bg-surface/80 rounded-3xl border-2 border-border hover:border-primary shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                        🤖
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mb-3">Vs AI</h3>
                    <p className="text-text-secondary text-center">
                        Practice your strategy against our intelligent computer opponent.
                    </p>
                    <div className="mt-6 px-6 py-2 bg-primary/20 text-primary rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        Start Solo Campaign
                    </div>
                </button>

                {/* Vs Player Card */}
                <button
                    onClick={() => onSelectMode('vsPlayer')}
                    className="group relative flex flex-col items-center p-8 bg-surface/60 hover:bg-surface/80 rounded-3xl border-2 border-border hover:border-green-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                        🌐
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mb-3">Online PvP</h3>
                    <p className="text-text-secondary text-center">
                        Challenge a friend to a real-time naval battle across the internet.
                    </p>
                    <div className="mt-6 px-6 py-2 bg-green-500/20 text-green-500 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        Enter Multiplayer Lobby
                    </div>
                </button>
            </div>
        </div>
    );
};

export default WelcomeScreen;
