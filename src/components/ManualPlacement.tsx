import React from 'react';
import type { ShipType } from '../game/types';
import { SHIP_LENGTHS } from '../game/types';

interface ManualPlacementProps {
    shipsToPlace: ShipType[];
    currentShipIndex: number;
    orientation: 'horizontal' | 'vertical';
    onRotate: () => void;
}

const SHIP_NAMES: Record<ShipType, string> = {
    carrier: 'Carrier',
    battleship: 'Battleship',
    cruiser: 'Cruiser',
    submarine: 'Submarine',
    destroyer: 'Destroyer',
};

const ManualPlacement: React.FC<ManualPlacementProps> = ({
    shipsToPlace,
    currentShipIndex,
    orientation,
    onRotate,
}) => {
    const currentShip = shipsToPlace[currentShipIndex];
    const isComplete = currentShipIndex >= shipsToPlace.length;

    return (
        <div className="flex flex-col gap-4 p-4 bg-white/60 rounded-2xl backdrop-blur-md border border-white/50 shadow-xl">
            {!isComplete ? (
                <>
                    <div className="text-center">
                        <div className="text-lg font-bold text-slate-700">
                            Placing: {SHIP_NAMES[currentShip]}
                        </div>
                        <div className="text-sm text-slate-500">
                            Length: {SHIP_LENGTHS[currentShip]} cells
                        </div>
                    </div>

                    <button
                        onClick={onRotate}
                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-all transform hover:scale-105 font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        <span>Rotate:</span>
                        <span className="font-mono">
                            {orientation === 'horizontal' ? '⟷ Horizontal' : '⬍ Vertical'}
                        </span>
                    </button>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Ships Remaining
                        </div>
                        {shipsToPlace.map((ship, index) => (
                            <div
                                key={ship}
                                className={`flex items-center gap-2 text-sm ${index < currentShipIndex
                                        ? 'text-green-600 line-through'
                                        : index === currentShipIndex
                                            ? 'text-blue-600 font-bold'
                                            : 'text-slate-400'
                                    }`}
                            >
                                <span>
                                    {index < currentShipIndex ? '✓' : index === currentShipIndex ? '▶' : '□'}
                                </span>
                                <span>
                                    {SHIP_NAMES[ship]} ({SHIP_LENGTHS[ship]})
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-slate-500 text-center italic">
                        Click on your board to place the ship
                    </div>
                </>
            ) : (
                <div className="text-center text-lg font-bold text-green-600">
                    All ships placed! Ready to start.
                </div>
            )}
        </div>
    );
};

export default ManualPlacement;
