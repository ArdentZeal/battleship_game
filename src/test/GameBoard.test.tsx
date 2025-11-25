import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from '../components/GameBoard';
import '@testing-library/jest-dom';
import type { Cell } from '../game/types';

describe('GameBoard Component', () => {
    const createEmptyBoard = (size: number): Cell[][] => {
        return Array(size).fill(null).map((_, row) =>
            Array(size).fill(null).map((_, col) => ({
                status: 'empty',
                coordinate: { row, col }
            }))
        );
    };

    const defaultProps = {
        board: createEmptyBoard(10),
        onCellClick: vi.fn(),
        isPlayer: true,
        showShips: true,
    };

    it('should render a 10x10 grid', () => {
        render(<GameBoard {...defaultProps} />);
        // Check for at least one cell
        expect(screen.getByTestId('cell-0-0')).toBeInTheDocument();
        expect(screen.getByTestId('cell-9-9')).toBeInTheDocument();
    });

    it('should render ships when showShips is true', () => {
        const boardWithShip = createEmptyBoard(10);
        boardWithShip[0][0] = { status: 'ship', shipId: 's1', coordinate: { row: 0, col: 0 } };

        render(<GameBoard {...defaultProps} board={boardWithShip} showShips={true} />);

        // Based on implementation: data-testid={cell.status === 'ship' && showShips ? 'ship-cell' : `cell-${rowIndex}-${colIndex}`}
        // But wait, if it's a ship cell, the ID changes to 'ship-cell'.
        // This might be ambiguous if there are multiple ships.
        // Let's check if ANY element has testid 'ship-cell'
        const shipCells = screen.getAllByTestId('ship-cell');
        expect(shipCells.length).toBeGreaterThan(0);
    });

    it('should NOT render ships when showShips is false', () => {
        const boardWithShip = createEmptyBoard(10);
        boardWithShip[0][0] = { status: 'ship', shipId: 's1', coordinate: { row: 0, col: 0 } };

        render(<GameBoard {...defaultProps} board={boardWithShip} showShips={false} />);

        // Should fallback to normal cell ID
        expect(screen.getByTestId('cell-0-0')).toBeInTheDocument();
        expect(screen.queryByTestId('ship-cell')).not.toBeInTheDocument();
    });

    it('should call onCellClick when a cell is clicked', () => {
        render(<GameBoard {...defaultProps} />);
        const cell = screen.getByTestId('cell-0-0');
        fireEvent.click(cell);
        expect(defaultProps.onCellClick).toHaveBeenCalledWith({ row: 0, col: 0 });
    });

    it('should render hit markers', () => {
        const boardWithHit = createEmptyBoard(10);
        boardWithHit[0][0] = { status: 'hit', coordinate: { row: 0, col: 0 } };

        render(<GameBoard {...defaultProps} board={boardWithHit} />);
        const cell = screen.getByTestId('cell-0-0');
        expect(cell).toHaveTextContent('💥');
    });

    it('should render miss markers', () => {
        const boardWithMiss = createEmptyBoard(10);
        boardWithMiss[0][0] = { status: 'miss', coordinate: { row: 0, col: 0 } };

        render(<GameBoard {...defaultProps} board={boardWithMiss} />);
        const cell = screen.getByTestId('cell-0-0');
        expect(cell).toHaveTextContent('🌊');
    });
});
