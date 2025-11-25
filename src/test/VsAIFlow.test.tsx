import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { createPlayer, receiveAttack, aiTurn, checkWin } from '../game/logic';
import type { GameState, Coordinate } from '../game/types';

// Simplified hook to mimic App.tsx vsAI logic for testing
const useVsAIGame = () => {
    const [gameState, setGameState] = useState<GameState>({
        player: createPlayer('p1', 'Player'),
        opponent: createPlayer('cpu', 'Computer', true),
        currentTurn: 'player',
        status: 'playing', // Start in playing state for simplicity
    });

    // Place a ship for testing
    useEffect(() => {
        // Player ship
        gameState.player.board[0][0].status = 'ship';
        gameState.player.board[0][0].shipId = 's1';
        gameState.player.ships = [{ id: 's1', type: 'destroyer', length: 1, hits: 0, sunk: false, position: [{ row: 0, col: 0 }], orientation: 'horizontal' }];

        // AI ship
        gameState.opponent.board[0][0].status = 'ship';
        gameState.opponent.board[0][0].shipId = 's2';
        gameState.opponent.ships = [{ id: 's2', type: 'destroyer', length: 1, hits: 0, sunk: false, position: [{ row: 0, col: 0 }], orientation: 'horizontal' }];
    }, []);

    // AI Turn Effect
    useEffect(() => {
        if (gameState.status === 'playing' && gameState.currentTurn === 'opponent') {
            const timer = setTimeout(() => {
                const attackCoord = aiTurn(gameState.player);
                const { player: newPlayer } = receiveAttack(gameState.player, attackCoord);

                if (checkWin(newPlayer)) {
                    setGameState(prev => ({ ...prev, player: newPlayer, status: 'gameOver', winner: 'Computer' }));
                } else {
                    setGameState(prev => ({ ...prev, player: newPlayer, currentTurn: 'player' }));
                }
            }, 50); // Short delay for test
            return () => clearTimeout(timer);
        }
    }, [gameState.status, gameState.currentTurn, gameState.player]);

    const handlePlayerAttack = (coordinate: Coordinate) => {
        if (gameState.status !== 'playing' || gameState.currentTurn !== 'player') return;

        const { player: newOpponent, result } = receiveAttack(gameState.opponent, coordinate);

        if (checkWin(newOpponent)) {
            setGameState(prev => ({ ...prev, opponent: newOpponent, status: 'gameOver', winner: 'Player' }));
        } else {
            setGameState(prev => ({ ...prev, opponent: newOpponent, currentTurn: 'opponent' }));
        }
    };

    return { gameState, handlePlayerAttack };
};

describe('VsAI Flow Integration', () => {
    it('should play a full game loop: Player move -> AI response', async () => {
        const { result } = renderHook(() => useVsAIGame());

        // 1. Player Attack (Miss)
        await act(async () => {
            result.current.handlePlayerAttack({ row: 0, col: 1 });
        });

        // Verify Player Turn Ends
        expect(result.current.gameState.currentTurn).toBe('opponent');
        expect(result.current.gameState.opponent.board[0][1].status).toBe('miss');

        // 2. Wait for AI Response
        await waitFor(() => {
            expect(result.current.gameState.currentTurn).toBe('player');
        });

        // Verify AI made a move (board has a hit or miss)
        const aiMove = result.current.gameState.player.board.flat().find(c => c.status === 'hit' || c.status === 'miss');
        expect(aiMove).toBeDefined();
    });

    it('should detect Game Over when player wins', async () => {
        const { result } = renderHook(() => useVsAIGame());

        // 1. Player Attack (Hit & Sink)
        await act(async () => {
            result.current.handlePlayerAttack({ row: 0, col: 0 }); // Hit the ship at [0,0]
        });

        // Verify Game Over
        expect(result.current.gameState.status).toBe('gameOver');
        expect(result.current.gameState.winner).toBe('Player');
    });
});
