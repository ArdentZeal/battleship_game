import React from 'react';
import type { Board, Cell, Coordinate } from '../game/types';

interface GameBoardProps {
    board: Board;
    isPlayer: boolean;
    onCellClick?: (coordinate: Coordinate) => void;
    showShips?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ board, isPlayer, onCellClick, showShips = false }) => {
    return (
        <div className="w-full max-w-md mx-auto">
            <div
                className="grid gap-0.5 bg-white/40 p-2 sm:p-3 rounded-xl shadow-inner border border-white/60 backdrop-blur-md"
                style={{
                    gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                    aspectRatio: '1/1'
                }}
            >
                {board.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {row.map((cell, colIndex) => (
                            <CellComponent
                                key={`${rowIndex}-${colIndex}`}
                                cell={cell}
                                isPlayer={isPlayer}
                                showShip={showShips}
                                onClick={() => onCellClick && onCellClick({ row: rowIndex, col: colIndex })}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

interface CellProps {
    cell: Cell;
    isPlayer: boolean;
    showShip: boolean;
    onClick: () => void;
}

const CellComponent: React.FC<CellProps> = ({ cell, isPlayer, showShip, onClick }) => {
    // Base water color - lighter blue
    let bgColor = 'bg-blue-100/80 hover:bg-blue-200';
    let cursor = isPlayer ? 'cursor-default' : 'cursor-crosshair hover:scale-105 hover:shadow-md hover:z-10';
    let borderColor = 'border-blue-200';

    if (cell.status === 'hit') {
        bgColor = 'bg-red-500 shadow-red-500/50 shadow-lg scale-95';
        cursor = 'cursor-default';
        borderColor = 'border-red-600';
    } else if (cell.status === 'miss') {
        bgColor = 'bg-slate-300 scale-90 rounded-full';
        cursor = 'cursor-default';
        borderColor = 'border-slate-400';
    } else if (cell.status === 'ship' && showShip) {
        // Dark slate for ships to contrast with light water
        bgColor = 'bg-slate-700 shadow-lg';
        borderColor = 'border-slate-800';
    }

    return (
        <div
            onClick={onClick}
            className={`w-full h-full aspect-square rounded-sm border transition-all duration-300 ease-out ${borderColor} ${bgColor} ${cursor}`}
        />
    );
};

export default GameBoard;
