import type { Board, Coordinate, Ship } from '../game/types';
import aircraftCarrierImg from '../assets/boats/aircraft_carrier.png';
import destroyerImg from '../assets/boats/destroyer.png';
import frigateImg from '../assets/boats/frigate.png';
import submarineImg from '../assets/boats/submarine.png';
import patrolBoatImg from '../assets/boats/patrol_boat.png';

const shipImages: Record<Ship['type'], string> = {
    destroyer: destroyerImg, // 5 squares
    aircraftCarrier: aircraftCarrierImg, // 4 squares
    frigate: frigateImg, // 3 squares
    submarine: submarineImg, // 3 squares
    patrolBoat: patrolBoatImg, // 2 squares
};

interface GameBoardProps {
    board: Board;
    isPlayer: boolean;
    showShips?: boolean;
    ships?: Ship[];
    onCellClick?: (coordinate: Coordinate) => void;
    onCellHover?: (coordinate: Coordinate | null) => void;
    opponentHover?: Coordinate | null;
}

const GameBoard: React.FC<GameBoardProps> = ({
    board,
    isPlayer,
    showShips = false,
    ships,
    onCellClick,
    onCellHover,
    opponentHover
}) => {
    return (
        <div
            className="relative grid grid-cols-10 gap-0 bg-surface p-0 rounded-lg shadow-2xl border-4 border-border w-full max-w-[400px] aspect-square overflow-hidden ring-1 ring-primary/30"
            onMouseLeave={() => onCellHover?.(null)}
        >
            {/* Grid Cells */}
            {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                    const isOpponentHovering = opponentHover?.row === rowIndex && opponentHover?.col === colIndex;

                    return (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            data-testid={cell.status === 'ship' && showShips ? 'ship-cell' : `cell-${rowIndex}-${colIndex}`}
                            onClick={() => onCellClick?.({ row: rowIndex, col: colIndex })}
                            onMouseEnter={() => onCellHover?.({ row: rowIndex, col: colIndex })}
                            className={`
                aspect-square w-full relative transition-all duration-200
                flex items-center justify-center text-xl
                border border-grid-line
                ${isOpponentHovering ? 'z-10 bg-surface-hover ring-2 ring-red-500' : ''}
                ${cell.status === 'empty' ? 'bg-main/50 hover:bg-primary/10' : ''}
                ${cell.status === 'ship' ? (showShips ? 'bg-surface-hover/60' : 'bg-main/50 hover:bg-primary/10') : ''}
                ${cell.status === 'hit' ? 'bg-red-500/90 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : ''}
                ${cell.status === 'miss' ? 'bg-primary/20' : ''}
                ${!isPlayer && onCellClick && cell.status !== 'hit' && cell.status !== 'miss' ? 'cursor-crosshair hover:bg-red-500/20' : 'cursor-default'}
              `}
                        >
                            {cell.status === 'hit' && '💥'}
                            {cell.status === 'miss' && '🌊'}
                            {isOpponentHovering && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                    <div className="w-full h-full border-2 border-red-500 rounded-sm animate-ping absolute opacity-75"></div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Re-implementing Ship Overlays correctly */}
            {ships && ships.map((ship) => {
                // Only show ship if showShips is true OR the ship is sunk
                if (!showShips && !ship.sunk) return null;

                const isVertical = ship.orientation === 'vertical';
                const { row, col } = ship.position[0];

                // Calculate position based on grid cells + gap
                // The grid has 10 columns and 10 rows with gap-1 (4px) and p-2 (8px) padding
                // It's better to use percentage based on the grid structure including gaps

                return (
                    <div
                        key={ship.id}
                        className="absolute pointer-events-none transition-all duration-300 flex items-center justify-center"
                        style={{
                            top: `${row * 10}%`,
                            left: `${col * 10}%`,
                            width: `${ship.length * 10}%`,
                            height: '10%',
                            transformOrigin: `${(50 / ship.length)}% 50%`,
                            transform: isVertical ? 'rotate(90deg)' : 'none',
                            zIndex: 5, // Above cells, below tooltips
                            padding: '2px' // Small padding to keep inside cell borders
                        }}
                    >
                        <img
                            src={shipImages[ship.type]}
                            alt={ship.type}
                            className="w-full h-full object-contain drop-shadow-lg"
                            onError={(e) => {
                                // Fallback if image fails (e.g. not generated yet)
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default GameBoard;
