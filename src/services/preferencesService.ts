import { supabase } from '../lib/supabase/client';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  units_preference: 'kg' | 'lb';
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const preferencesService = {
  /**
   * Gets user preferences
   * @param userId The user ID
   * @returns User preferences or null if not found
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await (supabase
        .from('user_preferences') as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - preferences might not be created yet
          return null;
        }
        console.error('Error fetching preferences:', error);
        return null;
      }

      return data as UserPreferences;
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null;
    }
  },

  /**
   * Updates user preferences
   * @param userId The user ID
   * @param updates Partial preferences to update
   * @returns Updated preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserPreferences> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await (supabase
        .from('user_preferences') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      return data as UserPreferences;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      throw error;
    }
  },

  /**
   * Creates default preferences for a user
   * @param userId The user ID
   * @returns Created preferences
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await (supabase
        .from('user_preferences') as any)
        .insert({
          user_id: userId,
          theme: 'dark',
          language: 'es',
          units_preference: 'kg',
          notifications_enabled: true,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating preferences:', error);
        throw new Error(`Failed to create preferences: ${error.message}`);
      }

      return data as UserPreferences;
    } catch (error) {
      console.error('Error in createDefaultPreferences:', error);
      throw error;
    }
  },
};
