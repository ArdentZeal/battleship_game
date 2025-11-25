import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { multiplayerAPI } from '../lib/multiplayer';
import { createPlayer } from '../game/logic';
import { MockMultiplayerServer } from './utils/MockMultiplayerServer';

// Mock the real API
vi.mock('../lib/multiplayer', () => ({
    multiplayerAPI: {
        createRoom: vi.fn(),
        joinRoom: vi.fn(),
        setPlayerBoard: vi.fn(),
        checkAndStartGame: vi.fn(),
        subscribeToRoom: vi.fn(),
        subscribeToMoves: vi.fn(),
        subscribeToHover: vi.fn(() => () => { }),
        broadcastHover: vi.fn(),
        getRoom: vi.fn(),
        getMoves: vi.fn().mockResolvedValue({ moves: [], error: null }),
        makeMove: vi.fn(),
        setWinner: vi.fn(),
    }
}));

describe('Multiplayer Flow Integration', () => {
    let mockServer: MockMultiplayerServer;

    beforeEach(() => {
        mockServer = new MockMultiplayerServer();

        // Wire up the mock API to the mock server
        (multiplayerAPI.createRoom as any).mockImplementation((name: string) => Promise.resolve(mockServer.createRoom(name)));
        (multiplayerAPI.joinRoom as any).mockImplementation((code: string, name: string) => Promise.resolve(mockServer.joinRoom(code, name)));
        (multiplayerAPI.setPlayerBoard as any).mockImplementation((id: string, type: any, board: any) => Promise.resolve(mockServer.setPlayerBoard(id, type, board)));
        (multiplayerAPI.checkAndStartGame as any).mockImplementation((id: string) => Promise.resolve(mockServer.checkAndStartGame(id)));
        (multiplayerAPI.subscribeToRoom as any).mockImplementation((id: string, cb: any) => mockServer.subscribeToRoom(id, cb));
        (multiplayerAPI.subscribeToMoves as any).mockImplementation((id: string, cb: any) => mockServer.subscribeToMoves(id, cb));
        (multiplayerAPI.makeMove as any).mockImplementation((id: string, type: any, coord: any, res: any) => Promise.resolve(mockServer.makeMove(id, type, coord, res)));
        (multiplayerAPI.setWinner as any).mockImplementation((id: string, winner: string) => Promise.resolve(mockServer.setWinner(id, winner)));
    });

    it('should switch turns correctly between Host and Guest', async () => {
        // --- Setup Host ---
        const hostGameState = {
            player: createPlayer('host', 'Host'),
            opponent: createPlayer('guest-shadow', 'Guest', true),
            currentTurn: 'player' as const,
            status: 'placement' as const,
        };
        const setHostGameState = vi.fn();

        const hostHook = renderHook(() => useMultiplayerGame({
            gameState: hostGameState,
            setGameState: setHostGameState,
            gameMode: 'vsPlayer',
        }));

        // --- Setup Guest ---
        const guestGameState = {
            player: createPlayer('guest', 'Guest'),
            opponent: createPlayer('host-shadow', 'Host', true),
            currentTurn: 'player' as const,
            status: 'placement' as const,
        };
        const setGuestGameState = vi.fn();

        const guestHook = renderHook(() => useMultiplayerGame({
            gameState: guestGameState,
            setGameState: setGuestGameState,
            gameMode: 'vsPlayer',
        }));

        // 1. Host Creates Room
        await act(async () => {
            await hostHook.result.current.createRoom('HostPlayer');
        });
        const roomCode = hostHook.result.current.multiplayerRoom!.room_code;

        // 2. Guest Joins Room
        await act(async () => {
            await guestHook.result.current.joinRoom(roomCode, 'GuestPlayer');
        });

        // 3. Both Start Game (Set Boards)
        await act(async () => {
            await hostHook.result.current.startGame();
            await guestHook.result.current.startGame();
        });

        // Wait for game start (status -> playing)
        // In the hook, this happens via useEffect when room status changes to 'playing'
        // We need to manually simulate the state update that the hook would do internally
        // The hook calls setGameState when it detects game start.

        // Let's simulate the state updates that would happen in the components
        // Host:
        const hostStartUpdate = setHostGameState.mock.calls.find(call => call[0].status === 'playing');
        // Guest:
        const guestStartUpdate = setGuestGameState.mock.calls.find(call => call[0].status === 'playing');

        // We expect them to be called eventually.
        // Since we are mocking setGameState, the hook's internal state 'gameState' won't actually update unless we update the prop.
        // But for this test, we can just verify the hook *tried* to update the state.

        // Actually, to test turn switching, we need the hook to have the correct 'currentTurn' in its ref.
        // The hook uses a ref to 'gameState' passed in props.
        // So we need to update the 'gameState' prop passed to the hook.

        // Let's re-render with updated state? Or just mutate the object for this test (simplest for refs).
        // Host starts first (mock server forces host start)
        (hostGameState as any).status = 'playing';
        hostGameState.currentTurn = 'player';

        (guestGameState as any).status = 'playing';
        (guestGameState as any).currentTurn = 'opponent';

        hostHook.rerender();
        guestHook.rerender();

        // 4. Host Makes a Move
        // Host attacks Guest at [0,0]
        // In the real app, this calls makeMove via API and updates local state optimistically.
        // The hook listens to moves.

        // Simulate Host UI calling API
        await act(async () => {
            await multiplayerAPI.makeMove(hostHook.result.current.multiplayerRoom!.id, 'host', { row: 0, col: 0 }, 'miss');
        });

        // 5. Verify Turn Switch
        // Host receives their own move -> should update opponent board and switch turn to 'opponent'
        // Guest receives opponent move -> should update player board and switch turn to 'player'

        // Check Host State Update
        // We expect setHostGameState to be called with new state where currentTurn is 'opponent'
        await waitFor(() => {
            const lastCall = setHostGameState.mock.calls[setHostGameState.mock.calls.length - 1];
            const newStateFn = lastCall[0];
            const newState = typeof newStateFn === 'function' ? newStateFn(hostGameState) : newStateFn;
            expect(newState.currentTurn).toBe('opponent');
        });

        // Check Guest State Update
        // We expect setGuestGameState to be called with new state where currentTurn is 'player'
        await waitFor(() => {
            const lastCall = setGuestGameState.mock.calls[setGuestGameState.mock.calls.length - 1];
            const newStateFn = lastCall[0];
            const newState = typeof newStateFn === 'function' ? newStateFn(guestGameState) : newStateFn;
            expect(newState.currentTurn).toBe('player');
        });

        // Update our local tracking state for the next step
        (hostGameState as any).currentTurn = 'opponent';
        (guestGameState as any).currentTurn = 'player';
        hostHook.rerender();
        guestHook.rerender();

        // 6. Guest Makes a Move
        await act(async () => {
            await multiplayerAPI.makeMove(guestHook.result.current.multiplayerRoom!.id, 'guest', { row: 0, col: 0 }, 'miss');
        });

        // 7. Verify Turn Switch Back
        // Host -> 'player'
        await waitFor(() => {
            const lastCall = setHostGameState.mock.calls[setHostGameState.mock.calls.length - 1];
            const newStateFn = lastCall[0];
            const newState = typeof newStateFn === 'function' ? newStateFn(hostGameState) : newStateFn;
            expect(newState.currentTurn).toBe('player');
        });
    });

    it('should declare winner and sync game over state', async () => {
        // --- Setup Host ---
        const hostGameState = {
            player: createPlayer('host', 'Host'),
            opponent: createPlayer('guest-shadow', 'Guest', true),
            currentTurn: 'player' as const,
            status: 'playing' as const,
        };
        // Setup 1-cell ship for easy win
        hostGameState.opponent.board[0][0].status = 'ship';
        hostGameState.opponent.board[0][0].shipId = 's1';
        hostGameState.opponent.ships = [{ id: 's1', type: 'destroyer', length: 1, hits: 0, sunk: false, position: [{ row: 0, col: 0 }], orientation: 'horizontal' }];

        const setHostGameState = vi.fn();
        const { result: hostHook } = renderHook(() => useMultiplayerGame({
            gameState: hostGameState,
            setGameState: setHostGameState,
            gameMode: 'vsPlayer',
            onGameOver: vi.fn(),
        }));

        // --- Setup Guest ---
        const guestGameState = {
            player: createPlayer('guest', 'Guest'),
            opponent: createPlayer('host-shadow', 'Host', true),
            currentTurn: 'opponent' as const,
            status: 'playing' as const,
        };
        // Setup 1-cell ship for easy win (Host's target)
        guestGameState.player.board[0][0].status = 'ship';
        guestGameState.player.board[0][0].shipId = 's1';
        guestGameState.player.ships = [{ id: 's1', type: 'destroyer', length: 1, hits: 0, sunk: false, position: [{ row: 0, col: 0 }], orientation: 'horizontal' }];

        const setGuestGameState = vi.fn();
        const { result: guestHook } = renderHook(() => useMultiplayerGame({
            gameState: guestGameState,
            setGameState: setGuestGameState,
            gameMode: 'vsPlayer',
            onGameOver: vi.fn(),
        }));

        // 1. Create & Join Room
        await act(async () => {
            await hostHook.current.createRoom('HostPlayer');
        });
        const roomCode = hostHook.current.multiplayerRoom!.room_code;
        await act(async () => {
            await guestHook.current.joinRoom(roomCode, 'GuestPlayer');
        });

        // 2. Host Attacks & Sinks Ship
        // Mock makeMove to also trigger setWinner if sunk (simulating App.tsx logic)
        // In App.tsx, if sunk & win, we call setWinner.
        // We need to simulate that call.

        await act(async () => {
            await multiplayerAPI.makeMove(hostHook.current.multiplayerRoom!.id, 'host', { row: 0, col: 0 }, 'sunk');
            await multiplayerAPI.setWinner(hostHook.current.multiplayerRoom!.id, 'HostPlayer');
        });

        // 3. Verify Game Over Sync
        // Host should receive room update with winner
        // Guest should receive room update with winner

        // Wait for Host to see winner
        await waitFor(() => {
            expect(hostHook.current.multiplayerRoom?.status).toBe('finished');
            expect(hostHook.current.multiplayerRoom?.winner).toBe('HostPlayer');
        });

        // Wait for Guest to see winner
        await waitFor(() => {
            expect(guestHook.current.multiplayerRoom?.status).toBe('finished');
            expect(guestHook.current.multiplayerRoom?.winner).toBe('HostPlayer');
        });
    });

    it('should recover from desynchronized turn state via room update', async () => {
        // Setup Host
        const hostGameState = {
            player: createPlayer('host', 'Host'),
            opponent: createPlayer('guest-shadow', 'Guest', true),
            currentTurn: 'opponent' as const, // Stuck in opponent turn
            status: 'playing' as const,
        };
        const setHostGameState = vi.fn();
        const { result: hostHook } = renderHook(() => useMultiplayerGame({
            gameState: hostGameState,
            setGameState: setHostGameState,
            gameMode: 'vsPlayer',
        }));

        // 1. Create Room
        await act(async () => {
            await hostHook.current.createRoom('HostPlayer');
        });

        // 2. Simulate Room Update saying it's Host's turn
        // The mock server's makeMove automatically switches turn and notifies room subscribers.
        // We can manually trigger a room update with 'host' turn.

        // First, ensure we are in 'playing' state in the hook
        // We need to fake the join/start flow or just force the room state in the mock
        const roomId = hostHook.current.multiplayerRoom!.id;

        // Manually update mock server state to be playing and host turn
        // We need access to mockServer instance? It's inside the mock factory.
        // But we can use the mocked methods to trigger behavior.
        // Actually, we can just use `makeMove` to switch turn on server, 
        // but if we are not joined, it might fail.

        // Let's do a proper setup
        await act(async () => {
            // Join as guest to make it a valid game
            await multiplayerAPI.joinRoom(hostHook.current.multiplayerRoom!.room_code, 'Guest');

            // Set boards to make players ready
            await multiplayerAPI.setPlayerBoard(roomId, 'host', hostGameState.player.board);
            await multiplayerAPI.setPlayerBoard(roomId, 'guest', createPlayer('guest', 'Guest').board);

            // Start game
            await multiplayerAPI.checkAndStartGame(roomId);
        });

        // Now game is playing. Turn is 'host' (default start).
        // But our local state `hostGameState.currentTurn` is 'opponent' (set in setup).

        // The `checkAndStartGame` triggers a room update.
        // This update should have `current_turn: 'host'`.
        // The hook should see mismatch and call setGameState.

        await waitFor(() => {
            // Check if setGameState was called to switch to 'player'
            const calls = setHostGameState.mock.calls;
            const fixCall = calls.find(c => {
                const state = typeof c[0] === 'function' ? c[0](hostGameState) : c[0];
                return state.currentTurn === 'player';
            });
            expect(fixCall).toBeDefined();
        });
    });
});
