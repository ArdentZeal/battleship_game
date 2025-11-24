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
    created_at: string;
}

export const leaderboardAPI = {
    async getTopScores(aiDifficulty: 'random' | 'smart', limit = 10): Promise<LeaderboardEntry[]> {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('ai_difficulty', aiDifficulty)
            .order('completion_time', { ascending: true })
            .limit(limit);

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
