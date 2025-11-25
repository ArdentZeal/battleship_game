import { describe, it, expect } from 'vitest';
import { extractShipsFromBoard, createBoard, placeShip, createPlayer } from '../game/logic';
import type { Board } from '../game/types';

describe('Logic Helpers', () => {
    describe('extractShipsFromBoard', () => {
        it('should extract ships correctly from a board', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal'); // 5 cells
            player = placeShip(player, 'patrolBoat', { row: 2, col: 0 }, 'vertical'); // 2 cells

            // Simulate some hits
            player.board[0][0].status = 'hit';
            player.board[0][1].status = 'hit';

            const extractedShips = extractShipsFromBoard(player.board);

            expect(extractedShips).toHaveLength(2);

            const destroyer = extractedShips.find(s => s.type === 'destroyer');
            expect(destroyer).toBeDefined();
            expect(destroyer?.length).toBe(5);
            expect(destroyer?.hits).toBe(2);
            expect(destroyer?.sunk).toBe(false);
            expect(destroyer?.orientation).toBe('horizontal');

            const patrolBoat = extractedShips.find(s => s.type === 'patrolBoat');
            expect(patrolBoat).toBeDefined();
            expect(patrolBoat?.length).toBe(2);
            expect(patrolBoat?.hits).toBe(0);
            expect(patrolBoat?.sunk).toBe(false);
            expect(patrolBoat?.orientation).toBe('vertical');
        });

        it('should correctly identify sunk ships', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'patrolBoat', { row: 0, col: 0 }, 'horizontal');

            // Hit all parts
            player.board[0][0].status = 'hit';
            player.board[0][1].status = 'hit';

            const extractedShips = extractShipsFromBoard(player.board);
            const patrolBoat = extractedShips.find(s => s.type === 'patrolBoat');

            expect(patrolBoat?.hits).toBe(2);
            expect(patrolBoat?.sunk).toBe(true);
        });
    });
});
