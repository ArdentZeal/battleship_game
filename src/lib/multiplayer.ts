import { supabase } from './supabase';
import type { Board } from '../game/types';

export interface GameRoom {
    id: string;
    room_code: string;
    host_player_name: string;
    guest_player_name: string | null;
    host_board: Board | null;
    guest_board: Board | null;
    current_turn: 'host' | 'guest' | null;
    status: 'waiting' | 'placing' | 'playing' | 'finished';
    winner: string | null;
    host_ready: boolean;
    guest_ready: boolean;
    game_start_time: string | null;
    created_at: string;
    updated_at: string;
}

export interface GameMove {
    id: string;
    room_id: string;
    player_type: 'host' | 'guest';
    coordinate: { row: number; col: number };
    result: 'hit' | 'miss' | 'sunk';
    created_at: string;
}

// Generate a unique room code
async function generateUniqueRoomCode(): Promise<string> {
    const { data, error } = await supabase.rpc('generate_room_code');

    if (error || !data) {
        // Fallback to client-side generation if function fails
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    return data;
}

export const multiplayerAPI = {
    // Create a new game room
    async createRoom(playerName: string): Promise<{ room: GameRoom; error: string | null }> {
        try {
            const roomCode = await generateUniqueRoomCode();

            const { data, error } = await supabase
                .from('game_rooms')
                .insert([{
                    room_code: roomCode,
                    host_player_name: playerName,
                    status: 'waiting'
                }])
                .select()
                .single();

            if (error) {
                return { room: null as any, error: error.message };
            }

            return { room: data, error: null };
        } catch (err) {
            return { room: null as any, error: String(err) };
        }
    },

    // Join an existing room
    async joinRoom(roomCode: string, playerName: string): Promise<{ room: GameRoom; error: string | null }> {
        try {
            // First, find the room
            const { data: room, error: fetchError } = await supabase
                .from('game_rooms')
                .select()
                .eq('room_code', roomCode.toUpperCase())
                .single();

            if (fetchError || !room) {
                return { room: null as any, error: 'Room not found' };
            }

            // Check if we can rejoin as Host
            if (room.host_player_name === playerName) {
                return { room: room, error: null };
            }

            // Check if we can rejoin as Guest
            if (room.guest_player_name === playerName) {
                return { room: room, error: null };
            }

            // If room is waiting, join as new guest
            if (room.status === 'waiting') {
                if (room.guest_player_name) {
                    return { room: null as any, error: 'Room is full' };
                }

                // Update room with guest player
                const { data: updatedRoom, error: updateError } = await supabase
                    .from('game_rooms')
                    .update({
                        guest_player_name: playerName,
                        status: 'placing',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', room.id)
                    .select()
                    .single();

                if (updateError) {
                    return { room: null as any, error: updateError.message };
                }

                return { room: updatedRoom, error: null };
            }

            // Otherwise, room is full/started and name doesn't match
            return { room: null as any, error: 'Room is full or already started' };
        } catch (err) {
            return { room: null as any, error: String(err) };
        }
    },


    // Update player's board when ready
    async setPlayerBoard(
        roomId: string,
        playerType: 'host' | 'guest',
        board: Board
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            const fieldName = playerType === 'host' ? 'host_board' : 'guest_board';
            const readyField = playerType === 'host' ? 'host_ready' : 'guest_ready';

            const { error } = await supabase
                .from('game_rooms')
                .update({
                    [fieldName]: board,
                    [readyField]: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', roomId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    },

    // Check if both players are ready and start game
    async checkAndStartGame(roomId: string): Promise<{ started: boolean; error: string | null }> {
        try {
            const { data: room, error: fetchError } = await supabase
                .from('game_rooms')
                .select()
                .eq('id', roomId)
                .single();

            if (fetchError || !room) {
                return { started: false, error: 'Room not found' };
            }

            if (room.host_ready && room.guest_ready && room.status === 'placing') {
                // Both players ready, start game
                const firstPlayer = Math.random() < 0.5 ? 'host' : 'guest';

                const { error: updateError } = await supabase
                    .from('game_rooms')
                    .update({
                        status: 'playing',
                        current_turn: firstPlayer,
                        game_start_time: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', roomId);

                if (updateError) {
                    return { started: false, error: updateError.message };
                }

                return { started: true, error: null };
            }

            return { started: false, error: null };
        } catch (err) {
            return { started: false, error: String(err) };
        }
    },

    // Record a move
    async makeMove(
        roomId: string,
        playerType: 'host' | 'guest',
        coordinate: { row: number; col: number },
        result: 'hit' | 'miss' | 'sunk'
    ): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('game_moves')
                .insert([{
                    room_id: roomId,
                    player_type: playerType,
                    coordinate,
                    result
                }]);

            if (error) {
                return { success: false, error: error.message };
            }

            // Switch turn
            const nextTurn = playerType === 'host' ? 'guest' : 'host';
            const { error: updateError } = await supabase
                .from('game_rooms')
                .update({
                    current_turn: nextTurn,
                    updated_at: new Date().toISOString()
                })
                .eq('id', roomId);

            if (updateError) {
                return { success: false, error: updateError.message };
            }

            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    },

    // Set game winner
    async setWinner(roomId: string, winner: string): Promise<{ success: boolean; error: string | null }> {
        try {
            const { error } = await supabase
                .from('game_rooms')
                .update({
                    status: 'finished',
                    winner,
                    updated_at: new Date().toISOString()
                })
                .eq('id', roomId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, error: null };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    },

    // Get room details
    async getRoom(roomId: string): Promise<{ room: GameRoom | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('game_rooms')
                .select()
                .eq('id', roomId)
                .single();

            if (error) {
                return { room: null, error: error.message };
            }

            return { room: data, error: null };
        } catch (err) {
            return { room: null, error: String(err) };
        }
    },

    // Subscribe to room updates
    subscribeToRoom(roomId: string, callback: (room: GameRoom) => void) {
        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `id=eq.${roomId}`
                },
                (payload) => {
                    callback(payload.new as GameRoom);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // Subscribe to moves in a room
    subscribeToMoves(roomId: string, callback: (move: GameMove) => void) {
        const channel = supabase
            .channel(`moves:${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_moves',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    callback(payload.new as GameMove);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    // Get all moves for a room
    async getMoves(roomId: string): Promise<{ moves: GameMove[]; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('game_moves')
                .select()
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) {
                return { moves: [], error: error.message };
            }

            return { moves: data as GameMove[], error: null };
        } catch (err) {
            return { moves: [], error: String(err) };
        }
    },

    // Broadcast hover state (ephemeral, no DB persistence)
    broadcastHover(roomId: string, coordinate: { row: number; col: number } | null) {
        const channel = supabase.channel(`room:${roomId}`);
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'hover',
                    payload: { coordinate }
                });
            }
        });
    },

    // Subscribe to hover events
    subscribeToHover(roomId: string, callback: (coordinate: { row: number; col: number } | null) => void) {
        const channel = supabase.channel(`room:${roomId}`)
            .on(
                'broadcast',
                { event: 'hover' },
                (payload) => {
                    callback(payload.payload.coordinate);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};
