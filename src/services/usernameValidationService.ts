import { supabase } from '../lib/supabase/client';

export type UsernameValidationResult = {
  available: boolean;
  message: string;
  isValid: boolean;
};

export const usernameValidationService = {
  /**
   * Validates username format and checks availability
   * @param username The username to validate
   * @param excludeUserId Optional user ID to exclude from duplicate check (for profile updates)
   * @returns Validation result with availability status
   */
  async validate(username: string, excludeUserId?: string): Promise<UsernameValidationResult> {
    // Check format
    const trimmed = username.trim();

    if (!trimmed) {
      return {
        available: false,
        message: 'El usuario no puede estar vacío',
        isValid: false,
      };
    }

    if (trimmed.length < 3) {
      return {
        available: false,
        message: 'El usuario debe tener al menos 3 caracteres',
        isValid: false,
      };
    }

    if (trimmed.length > 30) {
      return {
        available: false,
        message: 'El usuario no puede exceder 30 caracteres',
        isValid: false,
      };
    }

    // Check if only alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return {
        available: false,
        message: 'Solo se permiten letras, números y guiones bajos',
        isValid: false,
      };
    }

    // Check availability in database
    if (!supabase) {
      return {
        available: true,
        message: '',
        isValid: true,
      };
    }

    try {
      let query = supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('username', trimmed);

      // If excluding a user, add that filter
      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error checking username availability:', error);
        return {
          available: true,
          message: '',
          isValid: true,
        };
      }

      if (count && count > 0) {
        return {
          available: false,
          message: 'Este usuario ya está en uso',
          isValid: true,
        };
      }

      return {
        available: true,
        message: 'Usuario disponible',
        isValid: true,
      };
    } catch (error) {
      console.error('Error validating username:', error);
      return {
        available: true,
        message: '',
        isValid: true,
      };
    }
  },
};
