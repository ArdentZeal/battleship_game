import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { multiplayerAPI } from '../lib/multiplayer';
import { createPlayer } from '../game/logic';

// Mock the multiplayer API
vi.mock('../lib/multiplayer', () => ({
    multiplayerAPI: {
        createRoom: vi.fn(),
        joinRoom: vi.fn(),
        setPlayerBoard: vi.fn(),
        checkAndStartGame: vi.fn().mockResolvedValue({ started: false, error: null }),
        subscribeToRoom: vi.fn(() => () => { }),
        subscribeToMoves: vi.fn(() => () => { }),
        subscribeToHover: vi.fn(() => () => { }),
        broadcastHover: vi.fn(),
        getRoom: vi.fn(),
    }
}));

describe('useMultiplayerGame Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update opponent board when receiving a self-move', () => {
        // Setup initial state
        const initialGameState = {
            player: createPlayer('p1', 'Player'),
            opponent: createPlayer('cpu', 'Computer', true), // Opponent board has ships
            currentTurn: 'player' as const,
            status: 'playing' as const,
        };

        // Place a ship on opponent board for testing hit
        initialGameState.opponent.board[0][0].status = 'ship';
        initialGameState.opponent.board[0][0].shipId = 'test-ship';
        initialGameState.opponent.ships = [{
            id: 'test-ship',
            type: 'destroyer',
            length: 2,
            hits: 0,
            sunk: false,
            orientation: 'horizontal',
            position: [{ row: 0, col: 0 }, { row: 0, col: 1 }]
        }];

        const setGameState = vi.fn();
        const mockRoom = { id: 'room-1', status: 'playing' } as any;

        // Capture subscribeToMoves callback
        let movesCallback: any;
        (multiplayerAPI.subscribeToMoves as any).mockImplementation((roomId: string, cb: any) => {
            movesCallback = cb;
            return () => { };
        });

        // Render hook
        const { result } = renderHook(() => useMultiplayerGame({
            gameState: initialGameState,
            setGameState,
            gameMode: 'vsPlayer',
        }));

        // Set room and player type to enable subscription
        act(() => {
            result.current.setMultiplayerRoom(mockRoom);
            result.current.setPlayerType('host');
        });

        // Verify subscription
        expect(multiplayerAPI.subscribeToMoves).toHaveBeenCalledWith('room-1', expect.any(Function));

        // Simulate Self Move (Host attacks [0,0])
        const move = {
            player_type: 'host',
            coordinate: { row: 0, col: 0 },
            result: 'hit'
        };

        act(() => {
            movesCallback(move);
        });

        // Verify setGameState called with updated opponent board
        expect(setGameState).toHaveBeenCalled();

        // Check the update function passed to setGameState
        const updateFn = setGameState.mock.calls[0][0];
        const newState = updateFn(initialGameState);

        expect(newState.opponent.board[0][0].status).toBe('hit');
        expect(newState.currentTurn).toBe('opponent');
    });

    it('should update player board when receiving an opponent move', () => {
        // Setup initial state
        const initialGameState = {
            player: createPlayer('p1', 'Player'),
            opponent: createPlayer('cpu', 'Computer', true),
            currentTurn: 'opponent' as const,
            status: 'playing' as const,
        };

        // Place a ship on player board
        initialGameState.player.board[0][0].status = 'ship';
        initialGameState.player.board[0][0].shipId = 'test-ship';
        initialGameState.player.ships = [{
            id: 'test-ship',
            type: 'destroyer',
            length: 2,
            hits: 0,
            sunk: false,
            orientation: 'horizontal',
            position: [{ row: 0, col: 0 }, { row: 0, col: 1 }]
        }];

        const setGameState = vi.fn();
        const mockRoom = { id: 'room-1', status: 'playing' } as any;

        // Capture subscribeToMoves callback
        let movesCallback: any;
        (multiplayerAPI.subscribeToMoves as any).mockImplementation((roomId: string, cb: any) => {
            movesCallback = cb;
            return () => { };
        });

        // Render hook
        const { result } = renderHook(() => useMultiplayerGame({
            gameState: initialGameState,
            setGameState,
            gameMode: 'vsPlayer',
        }));

        // Set room and player type
        act(() => {
            result.current.setMultiplayerRoom(mockRoom);
            result.current.setPlayerType('host');
        });

        // Simulate Opponent Move (Guest attacks [0,0])
        const move = {
            player_type: 'guest',
            coordinate: { row: 0, col: 0 },
            result: 'hit'
        };

        act(() => {
            movesCallback(move);
        });

        // Verify setGameState called with updated player board
        expect(setGameState).toHaveBeenCalled();

        const updateFn = setGameState.mock.calls[0][0];
        const newState = updateFn(initialGameState);

        expect(newState.player.board[0][0].status).toBe('hit');
        expect(newState.currentTurn).toBe('player');
    });
});
