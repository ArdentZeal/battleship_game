import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { multiplayerAPI } from '../lib/multiplayer';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(),
        removeChannel: vi.fn(),
        rpc: vi.fn(),
    },
}));

describe('multiplayerAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create a room successfully', async () => {
            const mockRoomCode = 'ABCDEF';
            const mockRoom = { id: '123', room_code: mockRoomCode, status: 'waiting' };

            // Mock generate_room_code RPC
            (supabase.rpc as any).mockResolvedValue({ data: mockRoomCode, error: null });

            // Mock insert
            const mockSelect = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
            });
            (supabase.from as any).mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: mockSelect,
                }),
            });

            const result = await multiplayerAPI.createRoom('Player1');

            expect(result.error).toBeNull();
            expect(result.room).toEqual(mockRoom);
            expect(supabase.from).toHaveBeenCalledWith('game_rooms');
        });

        it('should handle creation errors', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: 'ABCDEF', error: null });

            const mockSelect = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
            });
            (supabase.from as any).mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: mockSelect,
                }),
            });

            const result = await multiplayerAPI.createRoom('Player1');

            expect(result.room).toBeNull();
            expect(result.error).toBe('DB Error');
        });
    });

    describe('joinRoom', () => {
        it('should join a room successfully', async () => {
            const mockRoom = { id: '123', room_code: 'ABCDEF', status: 'waiting', guest_player_name: null };
            const updatedRoom = { ...mockRoom, guest_player_name: 'Player2', status: 'placing' };

            // Mock find room (first call to .from)
            const mockSelectFind = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });

            // Mock update room (second call to .from)
            const mockSelectUpdate = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedRoom, error: null }),
            });
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    select: mockSelectUpdate,
                }),
            });

            // Reset mocks to ensure clean state
            vi.mocked(supabase.from).mockReset();

            // Setup sequence
            vi.mocked(supabase.from)
                .mockReturnValueOnce({ select: mockSelectFind } as any)
                .mockReturnValueOnce({ update: mockUpdate } as any);

            const result = await multiplayerAPI.joinRoom('ABCDEF', 'Player2');

            expect(result.error).toBeNull();
            expect(result.room).toEqual(updatedRoom);
        });

        it('should fail if room is full', async () => {
            const mockRoom = { id: '123', room_code: 'ABCDEF', status: 'waiting', guest_player_name: 'ExistingGuest' };

            const mockSelectFind = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });

            // Reset mocks
            vi.mocked(supabase.from).mockReset();

            vi.mocked(supabase.from).mockReturnValue({ select: mockSelectFind } as any);

            const result = await multiplayerAPI.joinRoom('ABCDEF', 'Player2');

            expect(result.error).toBe('Room is full');
        });
    });

    describe('makeMove', () => {
        it('should record a move and switch turn', async () => {
            // Mock insert move
            (supabase.from as any).mockReturnValueOnce({
                insert: vi.fn().mockResolvedValue({ error: null }),
            });

            // Mock update turn
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as any).mockReturnValueOnce({
                update: mockUpdate,
            });

            const result = await multiplayerAPI.makeMove('123', 'host', { row: 0, col: 0 }, 'hit');

            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            // Verify turn switch logic
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ current_turn: 'guest' }));
        });

        it('should handle insert error', async () => {
            (supabase.from as any).mockReturnValueOnce({
                insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
            });

            const result = await multiplayerAPI.makeMove('123', 'host', { row: 0, col: 0 }, 'hit');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insert failed');
        });
    });

    describe('setPlayerBoard', () => {
        it('should update player board and ready status', async () => {
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as any).mockReturnValue({
                update: mockUpdate,
            });

            const mockBoard = [[{ status: 'empty' }]] as any;
            const result = await multiplayerAPI.setPlayerBoard('123', 'host', mockBoard);

            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                host_board: mockBoard,
                host_ready: true
            }));
        });

        it('should handle update errors', async () => {
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
            });
            (supabase.from as any).mockReturnValue({
                update: mockUpdate,
            });

            const result = await multiplayerAPI.setPlayerBoard('123', 'host', [] as any);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Update failed');
        });
    });

    describe('checkAndStartGame', () => {
        it('should start game if both players are ready', async () => {
            const mockRoom = {
                id: '123',
                host_ready: true,
                guest_ready: true,
                status: 'placing'
            };

            // Mock get room
            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });

            // Mock update room
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            vi.mocked(supabase.from).mockReset();
            vi.mocked(supabase.from)
                .mockReturnValueOnce({ select: mockSelect } as any)
                .mockReturnValueOnce({ update: mockUpdate } as any);

            const result = await multiplayerAPI.checkAndStartGame('123');

            expect(result.started).toBe(true);
            expect(result.error).toBeNull();
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'playing',
            }));
        });

        it('should not start game if players are not ready', async () => {
            const mockRoom = {
                id: '123',
                host_ready: true,
                guest_ready: false, // Guest not ready
                status: 'placing'
            };

            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });

            vi.mocked(supabase.from).mockReset();
            vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

            const result = await multiplayerAPI.checkAndStartGame('123');

            expect(result.started).toBe(false);
            expect(result.error).toBeNull();
            // Should not call update
            expect(supabase.from).toHaveBeenCalledTimes(1);
        });

        it('should handle update error when starting game', async () => {
            const mockRoom = {
                id: '123',
                host_ready: true,
                guest_ready: true,
                status: 'placing'
            };

            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: { message: 'Start failed' } }),
            });

            vi.mocked(supabase.from).mockReset();
            vi.mocked(supabase.from)
                .mockReturnValueOnce({ select: mockSelect } as any)
                .mockReturnValueOnce({ update: mockUpdate } as any);

            const result = await multiplayerAPI.checkAndStartGame('123');

            expect(result.started).toBe(false);
            expect(result.error).toBe('Start failed');
        });
    });

    describe('setWinner', () => {
        it('should set the winner and finish the game', async () => {
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as any).mockReturnValue({
                update: mockUpdate,
            });

            const result = await multiplayerAPI.setWinner('123', 'Player1');

            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'finished',
                winner: 'Player1'
            }));
        });
    });

    describe('getRoom', () => {
        it('should return room details', async () => {
            const mockRoom = { id: '123', room_code: 'ABCDEF' };
            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                }),
            });
            (supabase.from as any).mockReturnValue({
                select: mockSelect,
            });

            const result = await multiplayerAPI.getRoom('123');

            expect(result.room).toEqual(mockRoom);
            expect(result.error).toBeNull();
        });
    });

    describe('getMoves', () => {
        it('should return list of moves', async () => {
            const mockMoves = [{ id: 'm1' }, { id: 'm2' }];
            const mockSelect = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: mockMoves, error: null }),
                }),
            });
            (supabase.from as any).mockReturnValue({
                select: mockSelect,
            });

            const result = await multiplayerAPI.getMoves('123');

            expect(result.moves).toEqual(mockMoves);
            expect(result.error).toBeNull();
        });
    });

    describe('subscribeToRoom', () => {
        it('should subscribe to room updates', () => {
            const mockCallback = vi.fn();
            const mockChannel = {
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn().mockReturnThis(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            const unsubscribe = multiplayerAPI.subscribeToRoom('123', mockCallback);

            expect(supabase.channel).toHaveBeenCalledWith('room:123');
            expect(mockChannel.on).toHaveBeenCalledWith(
                'postgres_changes',
                expect.objectContaining({
                    event: 'UPDATE',
                    table: 'game_rooms',
                    filter: 'id=eq.123'
                }),
                expect.any(Function)
            );

            // Simulate event
            const onCallback = mockChannel.on.mock.calls[0][2];
            const mockPayload = { new: { id: '123', status: 'playing' } };
            onCallback(mockPayload);
            expect(mockCallback).toHaveBeenCalledWith(mockPayload.new);

            unsubscribe();
            expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });
    });

    describe('subscribeToMoves', () => {
        it('should subscribe to new moves', () => {
            const mockCallback = vi.fn();
            const mockChannel = {
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn().mockReturnThis(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            const unsubscribe = multiplayerAPI.subscribeToMoves('123', mockCallback);

            expect(supabase.channel).toHaveBeenCalledWith('moves:123');
            expect(mockChannel.on).toHaveBeenCalledWith(
                'postgres_changes',
                expect.objectContaining({
                    event: 'INSERT',
                    table: 'game_moves',
                    filter: 'room_id=eq.123'
                }),
                expect.any(Function)
            );

            // Simulate event
            const onCallback = mockChannel.on.mock.calls[0][2];
            const mockPayload = { new: { id: 'm1', result: 'hit' } };
            onCallback(mockPayload);
            expect(mockCallback).toHaveBeenCalledWith(mockPayload.new);

            unsubscribe();
            expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });
    });

    describe('broadcastHover', () => {
        it('should send a broadcast message', () => {
            const mockChannel = {
                subscribe: vi.fn((callback) => callback('SUBSCRIBED')),
                send: vi.fn(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            const coordinate = { row: 1, col: 1 };
            multiplayerAPI.broadcastHover('123', coordinate);

            expect(mockChannel.send).toHaveBeenCalledWith({
                type: 'broadcast',
                event: 'hover',
                payload: { coordinate },
            });
        });
    });

    describe('subscribeToHover', () => {
        it('should subscribe to hover events', () => {
            const mockCallback = vi.fn();
            const mockChannel = {
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn().mockReturnThis(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            const unsubscribe = multiplayerAPI.subscribeToHover('123', mockCallback);

            expect(supabase.channel).toHaveBeenCalledWith('room:123');
            expect(mockChannel.on).toHaveBeenCalledWith(
                'broadcast',
                { event: 'hover' },
                expect.any(Function)
            );

            // Simulate event
            const onCallback = mockChannel.on.mock.calls[0][2];
            onCallback({ payload: { coordinate: { row: 5, col: 5 } } });
            expect(mockCallback).toHaveBeenCalledWith({ row: 5, col: 5 });

            // Test unsubscribe
            unsubscribe();
            // The implementation calls supabase.removeChannel(channel)
            // In our mock, channel is the object returned by supabase.channel()
            expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });
    });
});
