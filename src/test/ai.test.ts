import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    aiTurn,
    smartAiTurn,
    createAIState,
    updateAIStateAfterAttack,
    createBoard,
    placeShip,
    createPlayer,
    receiveAttack,
} from '../game/logic';
import type { AIState } from '../game/logic';
import type { Player, Coordinate } from '../game/types';

describe('AI Strategy Tests', () => {
    describe('Random AI (aiTurn)', () => {
        it('should return a valid coordinate', () => {
            const player = createPlayer('p1', 'Player');
            const coordinate = aiTurn(player);

            expect(coordinate.row).toBeGreaterThanOrEqual(0);
            expect(coordinate.row).toBeLessThan(10);
            expect(coordinate.col).toBeGreaterThanOrEqual(0);
            expect(coordinate.col).toBeLessThan(10);
        });

        it('should not attack already attacked cells', () => {
            let player = createPlayer('p1', 'Player');

            // Attack all cells except one
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 10; col++) {
                    if (row !== 5 || col !== 5) {
                        player = receiveAttack(player, { row, col }).player;
                    }
                }
            }

            // AI should attack the only remaining cell
            const coordinate = aiTurn(player);
            expect(coordinate).toEqual({ row: 5, col: 5 });
        });
    });

    describe('Smart AI', () => {
        describe('createAIState', () => {
            it('should create initial AI state in hunt mode', () => {
                const aiState = createAIState();
                expect(aiState.mode).toBe('hunt');
                expect(aiState.targetQueue).toEqual([]);
                expect(aiState.lastHit).toBeNull();
                expect(aiState.hits).toEqual([]);
            });
        });

        describe('smartAiTurn', () => {
            it('should use hunt mode when no targets', () => {
                const player = createPlayer('p1', 'Player');
                const aiState = createAIState();

                const { coordinate, newAiState } = smartAiTurn(player, aiState);

                expect(coordinate.row).toBeGreaterThanOrEqual(0);
                expect(coordinate.row).toBeLessThan(10);
                expect(coordinate.col).toBeGreaterThanOrEqual(0);
                expect(coordinate.col).toBeLessThan(10);
                expect(newAiState.mode).toBe('hunt');
            });

            it('should use target mode when targets exist', () => {
                const player = createPlayer('p1', 'Player');
                const aiState = {
                    mode: 'target' as const,
                    targetQueue: [{ row: 3, col: 3 }],
                    lastHit: { row: 2, col: 3 },
                    hits: [{ row: 2, col: 3 }],
                };

                const { coordinate, newAiState } = smartAiTurn(player, aiState);

                expect(coordinate).toEqual({ row: 3, col: 3 });
                expect(newAiState.targetQueue).toEqual([]);
            });
        });

        describe('updateAIStateAfterAttack', () => {
            it('should switch to target mode after a hit', () => {
                let player = createPlayer('p1', 'Player');
                player = placeShip(player, 'destroyer', { row: 5, col: 5 }, 'horizontal', true);

                const aiState = createAIState();
                const attackCoord = { row: 5, col: 5 };

                const newAiState = updateAIStateAfterAttack(aiState, attackCoord, 'hit', player);

                expect(newAiState.mode).toBe('target');
                expect(newAiState.hits).toContainEqual(attackCoord);
                expect(newAiState.lastHit).toEqual(attackCoord);
                expect(newAiState.targetQueue.length).toBeGreaterThan(0);
            });

            it('should add adjacent cells to target queue after hit', () => {
                let player = createPlayer('p1', 'Player');
                player = placeShip(player, 'destroyer', { row: 5, col: 5 }, 'horizontal', true);

                const aiState = createAIState();
                const attackCoord = { row: 5, col: 5 };

                const newAiState = updateAIStateAfterAttack(aiState, attackCoord, 'hit', player);

                // Should have up to 4 adjacent cells (up, down, left, right)
                expect(newAiState.targetQueue.length).toBeLessThanOrEqual(4);
                expect(newAiState.targetQueue.length).toBeGreaterThan(0);
            });

            it('should detect horizontal direction after 2 hits', () => {
                let player = createPlayer('p1', 'Player');
                player = placeShip(player, 'destroyer', { row: 5, col: 5 }, 'horizontal', true);

                let aiState = createAIState();

                // First hit
                aiState = updateAIStateAfterAttack(aiState, { row: 5, col: 5 }, 'hit', player);

                // Second hit (same row, next column)
                aiState = updateAIStateAfterAttack(aiState, { row: 5, col: 6 }, 'hit', player);

                // Target queue should only contain horizontal cells
                aiState.targetQueue.forEach(coord => {
                    expect(coord.row).toBe(5);
                });
            });

            it('should detect vertical direction after 2 hits', () => {
                let player = createPlayer('p1', 'Player');
                player = placeShip(player, 'destroyer', { row: 5, col: 5 }, 'vertical', true);

                let aiState = createAIState();

                // First hit
                aiState = updateAIStateAfterAttack(aiState, { row: 5, col: 5 }, 'hit', player);

                // Second hit (same column, next row)
                aiState = updateAIStateAfterAttack(aiState, { row: 6, col: 5 }, 'hit', player);

                // Target queue should only contain vertical cells
                aiState.targetQueue.forEach(coord => {
                    expect(coord.col).toBe(5);
                });
            });

            it('should return to hunt mode after sinking a ship', () => {
                const player = createPlayer('p1', 'Player');
                const aiState = {
                    mode: 'target' as const,
                    targetQueue: [{ row: 3, col: 3 }],
                    lastHit: { row: 2, col: 3 },
                    hits: [{ row: 2, col: 3 }],
                };

                const newAiState = updateAIStateAfterAttack(aiState, { row: 3, col: 3 }, 'sunk', player);

                expect(newAiState.mode).toBe('hunt');
                expect(newAiState.targetQueue).toEqual([]);
                expect(newAiState.hits).toEqual([]);
                expect(newAiState.lastHit).toBeNull();
            });

            it('should not change state on miss', () => {
                const player = createPlayer('p1', 'Player');
                const aiState = createAIState();

                const newAiState = updateAIStateAfterAttack(aiState, { row: 0, col: 0 }, 'miss', player);

                expect(newAiState).toEqual(aiState);
            });
        });
    });
});
