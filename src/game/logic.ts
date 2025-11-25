import type { Board, Cell, Coordinate, Ship, ShipType, Player } from './types';
import { SHIP_LENGTHS, BOARD_SIZE } from './types';

// ... (rest of file)

export const createBoard = (): Board => {
    const board: Board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        const currentRow: Cell[] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            currentRow.push({
                coordinate: { row, col },
                status: 'empty',
            });
        }
        board.push(currentRow);
    }
    return board;
};

export const isValidPlacement = (
    board: Board,
    start: Coordinate,
    length: number,
    orientation: 'horizontal' | 'vertical',
    allowAdjacent: boolean = false
): boolean => {
    const { row, col } = start;

    if (orientation === 'horizontal') {
        if (col + length > BOARD_SIZE) return false;
        for (let i = 0; i < length; i++) {
            if (board[row][col + i].status !== 'empty') return false;

            if (!allowAdjacent) {
                // Check neighbors
                for (let r = row - 1; r <= row + 1; r++) {
                    for (let c = col + i - 1; c <= col + i + 1; c++) {
                        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                            if (board[r][c].status !== 'empty') return false;
                        }
                    }
                }
            }
        }
    } else {
        if (row + length > BOARD_SIZE) return false;
        for (let i = 0; i < length; i++) {
            if (board[row + i][col].status !== 'empty') return false;

            if (!allowAdjacent) {
                // Check neighbors
                for (let r = row + i - 1; r <= row + i + 1; r++) {
                    for (let c = col - 1; c <= col + 1; c++) {
                        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                            if (board[r][c].status !== 'empty') return false;
                        }
                    }
                }
            }
        }
    }
    return true;
};

export const placeShip = (
    player: Player,
    shipType: ShipType,
    start: Coordinate,
    orientation: 'horizontal' | 'vertical',
    allowAdjacent: boolean = false
): Player => {
    const length = SHIP_LENGTHS[shipType];
    const newBoard = [...player.board.map(row => [...row])];
    const newShips = [...player.ships];
    const shipCoordinates: Coordinate[] = [];

    if (!isValidPlacement(newBoard, start, length, orientation, allowAdjacent)) {
        throw new Error('Invalid placement');
    }

    const shipId = `${shipType}-${Date.now()}`;

    if (orientation === 'horizontal') {
        for (let i = 0; i < length; i++) {
            newBoard[start.row][start.col + i].status = 'ship';
            newBoard[start.row][start.col + i].shipId = shipId;
            shipCoordinates.push({ row: start.row, col: start.col + i });
        }
    } else {
        for (let i = 0; i < length; i++) {
            newBoard[start.row + i][start.col].status = 'ship';
            newBoard[start.row + i][start.col].shipId = shipId;
            shipCoordinates.push({ row: start.row + i, col: start.col });
        }
    }

    const newShip: Ship = {
        id: shipId,
        type: shipType,
        length,
        hits: 0,
        sunk: false,
        position: shipCoordinates,
        orientation,
    };

    newShips.push(newShip);

    return {
        ...player,
        board: newBoard,
        ships: newShips,
    };
};

export const createPlayer = (id: string, name: string, isComputer: boolean = false): Player => {
    return {
        id,
        name,
        board: createBoard(),
        ships: [],
        isComputer,
    };
};

export const getRandomCoordinate = (): Coordinate => {
    return {
        row: Math.floor(Math.random() * BOARD_SIZE),
        col: Math.floor(Math.random() * BOARD_SIZE),
    };
};

export const getRandomOrientation = (): 'horizontal' | 'vertical' => {
    return Math.random() < 0.5 ? 'horizontal' : 'vertical';
};

export function placeShipsRandomly(player: Player, allowAdjacent: boolean): Player {
    const shipTypes: (keyof typeof SHIP_LENGTHS)[] = ['destroyer', 'aircraftCarrier', 'frigate', 'submarine', 'patrolBoat'];
    let updatedPlayer: Player = { ...player, board: createBoard(), ships: [] as Ship[] };

    for (const shipType of shipTypes) {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 100;

        while (!placed && attempts < maxAttempts) {
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            const orientation: 'horizontal' | 'vertical' = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const start: Coordinate = { row, col };
            const length = SHIP_LENGTHS[shipType];

            if (isValidPlacement(updatedPlayer.board, start, length, orientation, allowAdjacent)) {
                updatedPlayer = placeShip(updatedPlayer, shipType, start, orientation, allowAdjacent);
                placed = true;
            }

            attempts++;
        }

        if (!placed) {
            throw new Error(`Could not place ship ${shipType} after ${maxAttempts} attempts`);
        }
    }

    return updatedPlayer;
};

export const receiveAttack = (player: Player, coordinate: Coordinate): { player: Player; result: 'hit' | 'miss' | 'sunk' | 'already-attacked' } => {
    const { row, col } = coordinate;
    const cell = player.board[row][col];

    if (cell.status === 'hit' || cell.status === 'miss') {
        return { player, result: 'already-attacked' };
    }

    const newBoard = [...player.board.map(r => [...r])];
    const newShips = [...player.ships];
    let result: 'hit' | 'miss' | 'sunk' = 'miss';

    if (cell.status === 'ship') {
        newBoard[row][col] = { ...newBoard[row][col], status: 'hit' };
        result = 'hit';

        const shipIndex = newShips.findIndex(s => s.id === cell.shipId);
        if (shipIndex !== -1) {
            newShips[shipIndex] = { ...newShips[shipIndex], hits: newShips[shipIndex].hits + 1 };
            if (newShips[shipIndex].hits >= newShips[shipIndex].length) {
                newShips[shipIndex].sunk = true;
                result = 'sunk';
            }
        }
    } else {
        newBoard[row][col] = { ...newBoard[row][col], status: 'miss' };
    }

    return {
        player: {
            ...player,
            board: newBoard,
            ships: newShips,
        },
        result,
    };
};

export const aiTurn = (opponent: Player): Coordinate => {
    // Simple AI: Random valid move
    // Improvement: Hunt and target mode (can be added later)
    let validMove = false;
    let coordinate: Coordinate = { row: 0, col: 0 };

    while (!validMove) {
        coordinate = getRandomCoordinate();
        const cell = opponent.board[coordinate.row][coordinate.col];
        if (cell.status !== 'hit' && cell.status !== 'miss') {
            validMove = true;
        }
    }
    return coordinate;
};

export interface AIState {
    mode: 'hunt' | 'target';
    targetQueue: Coordinate[];
    lastHit: Coordinate | null;
    hits: Coordinate[];
}

export const createAIState = (): AIState => ({
    mode: 'hunt',
    targetQueue: [],
    lastHit: null,
    hits: [],
});

const getAdjacentCoordinates = (coord: Coordinate, board: Board): Coordinate[] => {
    const adjacent: Coordinate[] = [];
    const directions = [
        { row: -1, col: 0 }, // up
        { row: 1, col: 0 },  // down
        { row: 0, col: -1 }, // left
        { row: 0, col: 1 },  // right
    ];

    for (const dir of directions) {
        const newRow = coord.row + dir.row;
        const newCol = coord.col + dir.col;

        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            const cell = board[newRow][newCol];
            if (cell.status !== 'hit' && cell.status !== 'miss') {
                adjacent.push({ row: newRow, col: newCol });
            }
        }
    }

    return adjacent;
};

export const smartAiTurn = (opponent: Player, aiState: AIState): { coordinate: Coordinate; newAiState: AIState } => {
    let coordinate: Coordinate;
    let newAiState = { ...aiState };

    if (newAiState.mode === 'target' && newAiState.targetQueue.length > 0) {
        // Target mode: try coordinates from queue
        coordinate = newAiState.targetQueue.shift()!;
        newAiState = { ...newAiState, targetQueue: [...newAiState.targetQueue] };
    } else {
        // Hunt mode: random untried cell
        newAiState.mode = 'hunt';
        newAiState.targetQueue = [];

        let validMove = false;
        coordinate = { row: 0, col: 0 };

        while (!validMove) {
            coordinate = getRandomCoordinate();
            const cell = opponent.board[coordinate.row][coordinate.col];
            if (cell.status !== 'hit' && cell.status !== 'miss') {
                validMove = true;
            }
        }
    }

    return { coordinate, newAiState };
};

export const updateAIStateAfterAttack = (
    aiState: AIState,
    attackCoord: Coordinate,
    result: 'hit' | 'miss' | 'sunk' | 'already-attacked',
    opponent: Player
): AIState => {
    let newAiState = { ...aiState };

    if (result === 'hit') {
        // Add to hits list
        newAiState.hits = [...newAiState.hits, attackCoord];
        newAiState.lastHit = attackCoord;
        newAiState.mode = 'target';

        // Add adjacent cells to target queue
        const adjacent = getAdjacentCoordinates(attackCoord, opponent.board);

        // If we have multiple hits, try to determine direction
        if (newAiState.hits.length >= 2) {
            const lastTwo = newAiState.hits.slice(-2);
            const isHorizontal = lastTwo[0].row === lastTwo[1].row;
            const isVertical = lastTwo[0].col === lastTwo[1].col;

            if (isHorizontal) {
                // Filter to only left/right
                newAiState.targetQueue = adjacent.filter(c => c.row === attackCoord.row);
            } else if (isVertical) {
                // Filter to only up/down
                newAiState.targetQueue = adjacent.filter(c => c.col === attackCoord.col);
            } else {
                newAiState.targetQueue = [...newAiState.targetQueue, ...adjacent];
            }
        } else {
            newAiState.targetQueue = [...new Set([...newAiState.targetQueue, ...adjacent])];
        }
    } else if (result === 'sunk') {
        // Ship sunk, return to hunt mode
        newAiState.mode = 'hunt';
        newAiState.targetQueue = [];
        newAiState.hits = [];
        newAiState.lastHit = null;
    }

    return newAiState;
};

export const checkWin = (player: Player): boolean => {
    return player.ships.every(ship => ship.sunk);
};

export const extractShipsFromBoard = (board: Board): Ship[] => {
    const shipsMap = new Map<string, {
        id: string;
        type: ShipType;
        position: Coordinate[];
        hits: number;
    }>();

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            if (cell.shipId) {
                if (!shipsMap.has(cell.shipId)) {
                    // Parse type from ID (format: type-timestamp)
                    const type = cell.shipId.split('-')[0] as ShipType;
                    shipsMap.set(cell.shipId, {
                        id: cell.shipId,
                        type,
                        position: [],
                        hits: 0
                    });
                }
                const ship = shipsMap.get(cell.shipId)!;
                ship.position.push({ row, col });
                if (cell.status === 'hit') {
                    ship.hits++;
                }
            }
        }
    }

    return Array.from(shipsMap.values()).map(s => {
        // Determine orientation
        let orientation: 'horizontal' | 'vertical' = 'horizontal';
        if (s.position.length > 1) {
            orientation = s.position[0].row === s.position[1].row ? 'horizontal' : 'vertical';
        }

        return {
            id: s.id,
            type: s.type,
            length: s.position.length,
            hits: s.hits,
            sunk: s.hits >= s.position.length,
            position: s.position,
            orientation
        };
    });
};
