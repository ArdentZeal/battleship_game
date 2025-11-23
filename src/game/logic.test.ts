import { describe, it, expect } from 'vitest';
import {
    createBoard,
    createPlayer,
    isValidPlacement,
    placeShip,
    placeShipsRandomly,
    receiveAttack,
    checkWin,
} from '../game/logic';
import { BOARD_SIZE } from '../game/types';

describe('Game Logic Tests', () => {
    describe('createBoard', () => {
        it('should create a 10x10 board', () => {
            const board = createBoard();
            expect(board).toHaveLength(BOARD_SIZE);
            expect(board[0]).toHaveLength(BOARD_SIZE);
        });

        it('should initialize all cells with empty status', () => {
            const board = createBoard();
            board.forEach(row => {
                row.forEach(cell => {
                    expect(cell.status).toBe('empty');
                    expect(cell.shipId).toBeUndefined();
                });
            });
        });
    });

    describe('createPlayer', () => {
        it('should create a player with correct properties', () => {
            const player = createPlayer('p1', 'Test Player');
            expect(player.id).toBe('p1');
            expect(player.name).toBe('Test Player');
            expect(player.isComputer).toBe(false);
            expect(player.ships).toHaveLength(0);
            expect(player.board).toHaveLength(BOARD_SIZE);
        });

        it('should create a computer player', () => {
            const player = createPlayer('cpu', 'Computer', true);
            expect(player.isComputer).toBe(true);
        });
    });

    describe('isValidPlacement', () => {
        it('should validate horizontal placement', () => {
            const board = createBoard();
            const result = isValidPlacement(board, { row: 0, col: 0 }, 5, 'horizontal', true);
            expect(result).toBe(true);
        });

        it('should validate vertical placement', () => {
            const board = createBoard();
            const result = isValidPlacement(board, { row: 0, col: 0 }, 5, 'vertical', true);
            expect(result).toBe(true);
        });

        it('should reject placement that goes out of bounds horizontally', () => {
            const board = createBoard();
            const result = isValidPlacement(board, { row: 0, col: 8 }, 5, 'horizontal', true);
            expect(result).toBe(false);
        });

        it('should reject placement that goes out of bounds vertically', () => {
            const board = createBoard();
            const result = isValidPlacement(board, { row: 8, col: 0 }, 5, 'vertical', true);
            expect(result).toBe(false);
        });

        it('should reject placement on occupied cells', () => {
            const player = createPlayer('p1', 'Player');
            const playerWithShip = placeShip(player, 'carrier', { row: 0, col: 0 }, 'horizontal', true);
            const result = isValidPlacement(playerWithShip.board, { row: 0, col: 0 }, 3, 'horizontal', true);
            expect(result).toBe(false);
        });
    });

    describe('placeShip', () => {
        it('should place a ship horizontally', () => {
            const player = createPlayer('p1', 'Player');
            const newPlayer = placeShip(player, 'carrier', { row: 0, col: 0 }, 'horizontal', true);

            expect(newPlayer.ships).toHaveLength(1);
            expect(newPlayer.ships[0].type).toBe('carrier');
            expect(newPlayer.ships[0].length).toBe(5);
            expect(newPlayer.ships[0].orientation).toBe('horizontal');

            // Check board cells
            for (let col = 0; col < 5; col++) {
                expect(newPlayer.board[0][col].shipId).toBe(newPlayer.ships[0].id);
            }
        });

        it('should place a ship vertically', () => {
            const player = createPlayer('p1', 'Player');
            const newPlayer = placeShip(player, 'battleship', { row: 0, col: 0 }, 'vertical', true);

            expect(newPlayer.ships).toHaveLength(1);
            expect(newPlayer.ships[0].orientation).toBe('vertical');

            // Check board cells
            for (let row = 0; row < 4; row++) {
                expect(newPlayer.board[row][0].shipId).toBe(newPlayer.ships[0].id);
            }
        });

        it('should throw error for invalid placement', () => {
            const player = createPlayer('p1', 'Player');
            expect(() => {
                placeShip(player, 'carrier', { row: 0, col: 8 }, 'horizontal', true);
            }).toThrow('Invalid placement');
        });
    });

    describe('placeShipsRandomly', () => {
        it('should place all 5 ships', () => {
            const player = createPlayer('p1', 'Player');
            const newPlayer = placeShipsRandomly(player, true);
            expect(newPlayer.ships).toHaveLength(5);
        });

        it('should place ships without overlap', () => {
            const player = createPlayer('p1', 'Player');
            const newPlayer = placeShipsRandomly(player, true);

            // Count occupied cells
            let occupiedCells = 0;
            newPlayer.board.forEach(row => {
                row.forEach(cell => {
                    if (cell.shipId) {
                        occupiedCells++;
                    }
                });
            });

            // Total ship length: 5+4+3+3+2 = 17
            expect(occupiedCells).toBe(17);
        });
    });

    describe('receiveAttack', () => {
        it('should mark a miss on empty cell', () => {
            const player = createPlayer('p1', 'Player');
            const { player: newPlayer, result } = receiveAttack(player, { row: 0, col: 0 });

            expect(result).toBe('miss');
            expect(newPlayer.board[0][0].status).toBe('miss');
        });

        it('should mark a hit on ship cell', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);

            const { player: newPlayer, result } = receiveAttack(player, { row: 0, col: 0 });

            expect(result).toBe('hit');
            expect(newPlayer.board[0][0].status).toBe('hit');
            expect(newPlayer.ships[0].hits).toBe(1);
        });

        it('should mark ship as sunk when all cells hit', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);

            // Hit first cell
            let result1 = receiveAttack(player, { row: 0, col: 0 });
            player = result1.player;
            expect(result1.result).toBe('hit');
            expect(player.ships[0].sunk).toBe(false);

            // Hit second cell - should sink the destroyer (length 2)
            let result2 = receiveAttack(player, { row: 0, col: 1 });
            player = result2.player;
            expect(result2.result).toBe('sunk');
            expect(player.ships[0].sunk).toBe(true);
        });

        it('should return already-attacked for repeated attack', () => {
            let player = createPlayer('p1', 'Player');
            const { player: newPlayer } = receiveAttack(player, { row: 0, col: 0 });
            const { result } = receiveAttack(newPlayer, { row: 0, col: 0 });

            expect(result).toBe('already-attacked');
        });
    });

    describe('checkWin', () => {
        it('should return false when no ships are sunk', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShipsRandomly(player, true);
            expect(checkWin(player)).toBe(false);
        });

        it('should return false when some ships are sunk', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);
            player = placeShip(player, 'cruiser', { row: 2, col: 0 }, 'horizontal', true);

            // Sink destroyer
            player = receiveAttack(player, { row: 0, col: 0 }).player;
            player = receiveAttack(player, { row: 0, col: 1 }).player;

            expect(checkWin(player)).toBe(false);
        });

        it('should return true when all ships are sunk', () => {
            let player = createPlayer('p1', 'Player');
            player = placeShip(player, 'destroyer', { row: 0, col: 0 }, 'horizontal', true);

            // Sink destroyer
            player = receiveAttack(player, { row: 0, col: 0 }).player;
            player = receiveAttack(player, { row: 0, col: 1 }).player;

            expect(checkWin(player)).toBe(true);
        });
    });
});
