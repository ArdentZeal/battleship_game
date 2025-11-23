import { describe, it, expect } from 'vitest';
import { createPlayer, placeShip, isValidPlacement } from '../game/logic';
import { createBoard } from '../game/logic';

describe('Ship Adjacency Rules Tests', () => {
    describe('With adjacency allowed (allowAdjacent = true)', () => {
        it('should allow ships to be placed next to each other horizontally', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);

            // Place another ship directly below
            const isValid = isValidPlacement(player.board, { row: 1, col: 0 }, 2, 'horizontal', true);
            expect(isValid).toBe(true);
        });

        it('should allow ships to be placed next to each other vertically', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'vertical', true);

            // Place another ship directly to the right
            const isValid = isValidPlacement(player.board, { row: 0, col: 1 }, 2, 'vertical', true);
            expect(isValid).toBe(true);
        });

        it('should allow ships to be placed diagonally adjacent', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);

            // Place another ship diagonally (below and to the right)
            const isValid = isValidPlacement(player.board, { row: 1, col: 1 }, 2, 'horizontal', true);
            expect(isValid).toBe(true);
        });
    });

    describe('With adjacency NOT allowed (allowAdjacent = false)', () => {
        it('should reject ships placed horizontally adjacent', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', false);

            // Try to place ship directly below
            const isValid = isValidPlacement(player.board, { row: 1, col: 0 }, 2, 'horizontal', false);
            expect(isValid).toBe(false);
        });

        it('should reject ships placed vertically adjacent', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'vertical', false);

            // Try to place ship directly to the right
            const isValid = isValidPlacement(player.board, { row: 0, col: 1 }, 2, 'vertical', false);
            expect(isValid).toBe(false);
        });

        it('should reject ships placed diagonally adjacent', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', false);

            // Try to place ship diagonally
            const isValid = isValidPlacement(player.board, { row: 1, col: 1 }, 2, 'horizontal', false);
            expect(isValid).toBe(false);
        });

        it('should allow ships with 1 cell spacing', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', false);

            // Place ship 2 rows below (1 cell spacing)
            const isValid = isValidPlacement(player.board, { row: 2, col: 0 }, 2, 'horizontal', false);
            expect(isValid).toBe(true);
        });

        it('should reject when ship body would touch existing ship', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'carrier', { row: 5, col: 5 }, 'horizontal', false);
            // Carrier occupies cells (5,5) to (5,9)

            // Try to place a vertical ship that would touch the carrier
            const isValid = isValidPlacement(player.board, { row: 4, col: 6 }, 3, 'vertical', false);
            expect(isValid).toBe(false);
        });

        it('should handle edge cases at board boundaries', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 8 }, 'horizontal', false);
            // Ship at top-right corner

            // Should be able to place ship with spacing
            const isValid = isValidPlacement(player.board, { row: 2, col: 8 }, 2, 'horizontal', false);
            expect(isValid).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should not check adjacency on empty board', () => {
            const board = createBoard();
            const isValid = isValidPlacement(board, { row: 0, col: 0 }, 5, 'horizontal', false);
            expect(isValid).toBe(true);
        });

        it('should correctly handle corner placements with no adjacency', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', false);

            // Try placing in opposite corner
            const isValid = isValidPlacement(player.board, { row: 9, col: 8 }, 2, 'horizontal', false);
            expect(isValid).toBe(true);
        });
    });
});
