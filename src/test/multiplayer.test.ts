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

            // Mock find room
            const mockSelectFind = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                    }),
                }),
            });

            // Mock update room
            const mockSelectUpdate = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedRoom, error: null }),
            });
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    select: mockSelectUpdate,
                }),
            });

            (supabase.from as any).mockReturnValueOnce({ select: mockSelectFind });
            (supabase.from as any).mockReturnValueOnce({ update: mockUpdate });

            const result = await multiplayerAPI.joinRoom('ABCDEF', 'Player2');

            expect(result.error).toBeNull();
            expect(result.room).toEqual(updatedRoom);
        });

        it('should fail if room is full', async () => {
            const mockRoom = { id: '123', room_code: 'ABCDEF', status: 'waiting', guest_player_name: 'ExistingGuest' };

            const mockSelectFind = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
                    }),
                }),
            });

            (supabase.from as any).mockReturnValue({ select: mockSelectFind });

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
