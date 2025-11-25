import type { GameRoom, GameMove } from '../../lib/multiplayer';
import type { Board } from '../../game/types';

export class MockMultiplayerServer {
    private rooms: Map<string, GameRoom> = new Map();
    private roomSubscribers: Map<string, ((room: GameRoom) => void)[]> = new Map();
    private moveSubscribers: Map<string, ((move: GameMove) => void)[]> = new Map();

    createRoom(playerName: string): { room: GameRoom; error: string | null } {
        const roomId = `room-${Date.now()}`;
        const room: GameRoom = {
            id: roomId,
            room_code: 'TEST',
            host_player_name: playerName,
            guest_player_name: null,
            host_board: null,
            guest_board: null,
            current_turn: null,
            status: 'waiting',
            winner: null,
            host_ready: false,
            guest_ready: false,
            game_start_time: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        this.rooms.set(roomId, room);
        return { room, error: null };
    }

    joinRoom(roomCode: string, playerName: string): { room: GameRoom; error: string | null } {
        // Find room by code (simplified: just take the first one for testing if code matches or just iterate)
        const room = Array.from(this.rooms.values()).find(r => r.room_code === roomCode);

        if (!room) return { room: null as any, error: 'Room not found' };

        const updatedRoom = {
            ...room,
            guest_player_name: playerName,
            status: 'placing' as const,
            updated_at: new Date().toISOString(),
        };

        this.rooms.set(room.id, updatedRoom);
        this.notifyRoomSubscribers(updatedRoom);
        return { room: updatedRoom, error: null };
    }

    setPlayerBoard(roomId: string, playerType: 'host' | 'guest', board: Board): { success: boolean; error: string | null } {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Room not found' };

        const updatedRoom = {
            ...room,
            [playerType === 'host' ? 'host_board' : 'guest_board']: board,
            [playerType === 'host' ? 'host_ready' : 'guest_ready']: true,
            updated_at: new Date().toISOString(),
        };

        this.rooms.set(roomId, updatedRoom);
        this.notifyRoomSubscribers(updatedRoom);
        return { success: true, error: null };
    }

    checkAndStartGame(roomId: string): { started: boolean; error: string | null } {
        const room = this.rooms.get(roomId);
        if (!room) return { started: false, error: 'Room not found' };

        if (room.host_ready && room.guest_ready && room.status === 'placing') {
            const updatedRoom = {
                ...room,
                status: 'playing' as const,
                current_turn: 'host' as const, // Force host start for deterministic testing
                game_start_time: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            this.rooms.set(roomId, updatedRoom);
            this.notifyRoomSubscribers(updatedRoom);
            return { started: true, error: null };
        }
        return { started: false, error: null };
    }

    makeMove(roomId: string, playerType: 'host' | 'guest', coordinate: { row: number; col: number }, result: 'hit' | 'miss' | 'sunk'): { success: boolean; error: string | null } {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Room not found' };

        const move: GameMove = {
            id: `move-${Date.now()}`,
            room_id: roomId,
            player_type: playerType,
            coordinate,
            result,
            created_at: new Date().toISOString(),
        };

        // Notify move subscribers
        const subscribers = this.moveSubscribers.get(roomId) || [];
        subscribers.forEach(cb => cb(move));

        // Switch turn
        const nextTurn = playerType === 'host' ? 'guest' : 'host';
        const updatedRoom = {
            ...room,
            current_turn: nextTurn,
            updated_at: new Date().toISOString(),
        };
        this.rooms.set(roomId, updatedRoom);
        this.notifyRoomSubscribers(updatedRoom);

        return { success: true, error: null };
    }

    setWinner(roomId: string, winner: string): { success: boolean; error: string | null } {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, error: 'Room not found' };

        const updatedRoom = {
            ...room,
            status: 'finished' as const,
            winner,
            updated_at: new Date().toISOString(),
        };

        this.rooms.set(roomId, updatedRoom);
        this.notifyRoomSubscribers(updatedRoom);
        return { success: true, error: null };
    }

    subscribeToRoom(roomId: string, callback: (room: GameRoom) => void) {
        if (!this.roomSubscribers.has(roomId)) {
            this.roomSubscribers.set(roomId, []);
        }
        this.roomSubscribers.get(roomId)?.push(callback);
        return () => {
            const subs = this.roomSubscribers.get(roomId) || [];
            this.roomSubscribers.set(roomId, subs.filter(cb => cb !== callback));
        };
    }

    subscribeToMoves(roomId: string, callback: (move: GameMove) => void) {
        if (!this.moveSubscribers.has(roomId)) {
            this.moveSubscribers.set(roomId, []);
        }
        this.moveSubscribers.get(roomId)?.push(callback);
        return () => {
            const subs = this.moveSubscribers.get(roomId) || [];
            this.moveSubscribers.set(roomId, subs.filter(cb => cb !== callback));
        };
    }

    private notifyRoomSubscribers(room: GameRoom) {
        const subscribers = this.roomSubscribers.get(room.id) || [];
        subscribers.forEach(cb => cb(room));
    }

    // Helper to get room state directly
    getRoom(roomId: string) {
        return this.rooms.get(roomId);
    }
}
