import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from '../components/GameBoard';
import { createBoard, placeShip } from '../game/logic';
import type { Player } from '../game/types';

describe('GameBoard', () => {
    const createTestPlayer = () => ({
        id: 'p1',
        name: 'Player 1',
        board: createBoard(),
        ships: [],
        isComputer: false,
    });

    it('renders the board grid', () => {
        const player = createTestPlayer();
        render(
            <GameBoard
                board={player.board}
                isPlayer={true}
                onCellClick={vi.fn()}
            />
        );

        // Board size is 10x10 = 100 cells
        const cells = screen.getAllByTestId(/^cell-/);
        expect(cells).toHaveLength(100);
    });

    it('renders ships for player board', () => {
        const player = createTestPlayer();
        const playerWithShip = placeShip(player, 'patrolBoat', { row: 0, col: 0 }, 'horizontal');

        render(
            <GameBoard
                board={playerWithShip.board}
                isPlayer={true}
                showShips={true}
                onCellClick={vi.fn()}
            />
        );

        const shipCells = screen.getAllByTestId('ship-cell');
        expect(shipCells.length).toBeGreaterThan(0);
    });

    it('hides ships for opponent board', () => {
        const player = createTestPlayer();
        const playerWithShip = placeShip(player, 'patrolBoat', { row: 0, col: 0 }, 'horizontal');

        render(
            <GameBoard
                board={playerWithShip.board}
                isPlayer={false}
                showShips={false}
                onCellClick={vi.fn()}
            />
        );

        const shipCells = screen.queryAllByTestId('ship-cell');
        expect(shipCells).toHaveLength(0);
    });

    it('handles cell clicks', () => {
        const player = createTestPlayer();
        const onCellClick = vi.fn();
        render(
            <GameBoard
                board={player.board}
                isPlayer={false}
                onCellClick={onCellClick}
            />
        );

        const cell = screen.getByTestId('cell-0-0');
        fireEvent.click(cell);

        expect(onCellClick).toHaveBeenCalledWith({ row: 0, col: 0 });
    });

    it('handles cell hover', () => {
        const player = createTestPlayer();
        const onCellHover = vi.fn();
        render(
            <GameBoard
                board={player.board}
                isPlayer={false}
                onCellClick={vi.fn()}
                onCellHover={onCellHover}
            />
        );

        const cell = screen.getByTestId('cell-5-5');
        fireEvent.mouseEnter(cell);

        expect(onCellHover).toHaveBeenCalledWith({ row: 5, col: 5 });
    });

    it('displays opponent hover indicator', () => {
        const player = createTestPlayer();
        render(
            <GameBoard
                board={player.board}
                isPlayer={true}
                onCellClick={vi.fn()}
                opponentHover={{ row: 2, col: 2 }}
            />
        );

        // We check for the crosshair element by looking for the animate-ping class which is part of the overlay
        const crosshair = document.querySelector('.animate-ping');
        expect(crosshair).toBeInTheDocument();
    });
});
