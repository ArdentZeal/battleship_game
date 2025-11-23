export type Coordinate = {
    row: number;
    col: number;
};

export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface Ship {
    id: string;
    type: ShipType;
    length: number;
    hits: number;
    sunk: boolean;
    position: Coordinate[]; // Array of coordinates occupied by the ship
    orientation: 'horizontal' | 'vertical';
}

export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss';

export interface Cell {
    coordinate: Coordinate;
    status: CellStatus;
    shipId?: string; // ID of the ship occupying this cell, if any
}

export type Board = Cell[][];

export interface Player {
    id: string;
    name: string;
    board: Board;
    ships: Ship[];
    isComputer: boolean;
}

export type GameStatus = 'placement' | 'playing' | 'gameOver';

export interface GameState {
    player: Player;
    opponent: Player;
    currentTurn: 'player' | 'opponent';
    status: GameStatus;
    winner?: string;
}

export const BOARD_SIZE = 10;

export const SHIP_LENGTHS: Record<ShipType, number> = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
};
