import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LeaderboardEntry {
    id: string;
    player_name: string;
    completion_time: number; // in seconds
    ai_difficulty: 'random' | 'smart';
    moves_count: number;
    game_mode: 'vsAI' | 'vsPlayer';
    created_at: string;
}

export const leaderboardAPI = {
    async getTopScores(
        aiDifficulty: 'random' | 'smart',
        gameMode: 'vsAI' | 'vsPlayer' = 'vsAI',
        limit = 10
    ): Promise<LeaderboardEntry[]> {
        let query = supabase
            .from('leaderboard')
            .select('*')
            .eq('game_mode', gameMode)
            .order('completion_time', { ascending: true })
            .limit(limit);

        // Only filter by AI difficulty for vsAI games
        if (gameMode === 'vsAI') {
            query = query.eq('ai_difficulty', aiDifficulty);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }

        return data || [];
    },

    async submitScore(entry: Omit<LeaderboardEntry, 'id' | 'created_at'>): Promise<boolean> {
        const { error } = await supabase
            .from('leaderboard')
            .insert([entry]);

        if (error) {
            console.error('Error submitting score:', error);
            return false;
        }

        return true;
    },
};
