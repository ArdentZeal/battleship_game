import React from 'react';
import type { ShipType } from '../game/types';
import { SHIP_LENGTHS } from '../game/types';

import aircraftCarrierImg from '../assets/boats/aircraft_carrier.png';
import destroyerImg from '../assets/boats/destroyer.png';
import frigateImg from '../assets/boats/frigate.png';
import submarineImg from '../assets/boats/submarine.png';
import patrolBoatImg from '../assets/boats/patrol_boat.png';

interface ManualPlacementProps {
    shipsToPlace: ShipType[];
    currentShipIndex: number;
    orientation: 'horizontal' | 'vertical';
    onRotate: () => void;
}

const SHIP_NAMES: Record<ShipType, string> = {
    destroyer: 'Destroyer',
    aircraftCarrier: 'Aircraft Carrier',
    frigate: 'Frigate',
    submarine: 'Submarine',
    patrolBoat: 'Patrol Boat',
};

const SHIP_IMAGES: Record<ShipType, string> = {
    destroyer: destroyerImg,
    aircraftCarrier: aircraftCarrierImg,
    frigate: frigateImg,
    submarine: submarineImg,
    patrolBoat: patrolBoatImg,
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
        <div className="flex flex-col gap-4 p-4 bg-surface/60 rounded-2xl backdrop-blur-md border border-border shadow-xl">
            {!isComplete ? (
                <>
                    <div className="text-center">
                        <div className="text-lg font-bold text-text-primary">
                            Placing: {SHIP_NAMES[currentShip]}
                        </div>
                        <div className="text-sm text-text-secondary mb-4">
                            Length: {SHIP_LENGTHS[currentShip]} cells
                        </div>

                        {/* Ship Image Preview */}
                        <div className="flex justify-center items-center h-32 bg-main/30 rounded-lg mb-4 overflow-hidden relative">
                            <div
                                className="transition-all duration-300 ease-in-out"
                                style={{
                                    transform: orientation === 'vertical' ? 'rotate(90deg)' : 'rotate(0deg)',
                                    width: `${SHIP_LENGTHS[currentShip] * 30}px`, // Approximate scale
                                    maxWidth: '100%',
                                }}
                            >
                                <img
                                    src={SHIP_IMAGES[currentShip]}
                                    alt={SHIP_NAMES[currentShip]}
                                    className="w-full h-auto drop-shadow-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onRotate}
                        className="px-6 py-2.5 bg-secondary hover:bg-secondary-hover text-white rounded-full transition-all transform hover:scale-105 font-semibold shadow-lg shadow-secondary/30 flex items-center justify-center gap-2"
                    >
                        <span>Rotate:</span>
                        <span className="font-mono">
                            {orientation === 'horizontal' ? '⟷ Horizontal' : '⬍ Vertical'}
                        </span>
                    </button>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                            Ships Remaining
                        </div>
                        {shipsToPlace.map((ship, index) => (
                            <div
                                key={ship}
                                className={`flex items-center gap-2 text-sm ${index < currentShipIndex
                                    ? 'text-text-muted line-through'
                                    : index === currentShipIndex
                                        ? 'text-primary font-bold'
                                        : 'text-text-secondary'
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

                    <div className="text-xs text-text-muted text-center italic">
                        Click on your board to place the ship
                    </div>
                </>
            ) : (
                <div className="text-center text-lg font-bold text-primary">
                    All ships placed! Ready to start.
                </div>
            )}
        </div>
    );
};

export default ManualPlacement;
