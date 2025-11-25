import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaderboardAPI } from '../lib/supabase';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(),
    })),
}));

describe('leaderboardAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getTopScores', () => {
        it('should fetch top scores with correct filters', async () => {
            const mockData = [
                { id: '1', player_name: 'Player1', completion_time: 100, ai_difficulty: 'random', moves_count: 20, game_mode: 'vsAI', created_at: '2023-01-01' },
            ];

            const mockLimit = vi.fn().mockResolvedValue({ data: mockData, error: null });
            const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
            const mockEqDifficulty = vi.fn().mockReturnValue({ order: mockOrder });
            const mockEqGameMode = vi.fn().mockReturnValue({ eq: mockEqDifficulty }); // Chaining for vsAI
            const mockSelect = vi.fn().mockReturnValue({ eq: mockEqGameMode });

            (supabase.from as any).mockReturnValue({ select: mockSelect });

            // For vsAI, it chains: .eq('game_mode', ...).order(...).limit(...) AND THEN .eq('ai_difficulty', ...) is applied to the query object
            // Wait, the implementation does:
            // let query = supabase.from().select().eq('game_mode', ...).order().limit()
            // if (vsAI) query = query.eq('ai_difficulty', ...)

            // So the mock chain needs to support this.
            // The query object returned by limit() needs to have an eq() method if we want to support the conditional chaining?
            // Actually, supabase query builder is immutable-ish but returns new instances or modifies.
            // In the implementation:
            // let query = ...limit(limit);
            // if (...) query = query.eq(...)

            // So mockLimit needs to return an object that has .eq() and also is awaitable (thenable).

            const mockQueryObj = {
                then: (resolve: any) => resolve({ data: mockData, error: null }),
                eq: vi.fn().mockImplementation(() => mockQueryObj) // Allow chaining eq
            };

            const mockLimitFn = vi.fn().mockReturnValue(mockQueryObj);
            const mockOrderFn = vi.fn().mockReturnValue({ limit: mockLimitFn });
            const mockEqGameModeFn = vi.fn().mockReturnValue({ order: mockOrderFn });
            const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqGameModeFn });

            (supabase.from as any).mockReturnValue({ select: mockSelectFn });

            const result = await leaderboardAPI.getTopScores('random', 'vsAI');

            expect(result).toEqual(mockData);
            expect(supabase.from).toHaveBeenCalledWith('leaderboard');
            expect(mockEqGameModeFn).toHaveBeenCalledWith('game_mode', 'vsAI');
            expect(mockQueryObj.eq).toHaveBeenCalledWith('ai_difficulty', 'random');
        });

        it('should handle errors gracefully', async () => {
            const mockQueryObj = {
                then: (resolve: any) => resolve({ data: null, error: { message: 'DB Error' } }),
                eq: vi.fn().mockImplementation(() => mockQueryObj)
            };

            const mockLimitFn = vi.fn().mockReturnValue(mockQueryObj);
            const mockOrderFn = vi.fn().mockReturnValue({ limit: mockLimitFn });
            const mockEqGameModeFn = vi.fn().mockReturnValue({ order: mockOrderFn });
            const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqGameModeFn });

            (supabase.from as any).mockReturnValue({ select: mockSelectFn });

            const result = await leaderboardAPI.getTopScores('random', 'vsAI');

            expect(result).toEqual([]);
        });
    });

    describe('submitScore', () => {
        it('should submit score successfully', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as any).mockReturnValue({ insert: mockInsert });

            const entry = {
                player_name: 'Player1',
                completion_time: 100,
                ai_difficulty: 'random' as const,
                moves_count: 20,
                game_mode: 'vsAI' as const,
            };

            const result = await leaderboardAPI.submitScore(entry);

            expect(result).toBe(true);
            expect(supabase.from).toHaveBeenCalledWith('leaderboard');
            expect(mockInsert).toHaveBeenCalledWith([entry]);
        });

        it('should handle submission errors', async () => {
            const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'DB Error' } });
            (supabase.from as any).mockReturnValue({ insert: mockInsert });

            const entry = {
                player_name: 'Player1',
                completion_time: 100,
                ai_difficulty: 'random' as const,
                moves_count: 20,
                game_mode: 'vsAI' as const,
            };

            const result = await leaderboardAPI.submitScore(entry);

            expect(result).toBe(false);
        });
    });
});
