export type RoutineRepositoryErrorCode =
  | 'SUPABASE_AUTH'
  | 'SUPABASE_NETWORK'
  | 'SUPABASE_QUERY'
  | 'SUPABASE_UNKNOWN';

export class RoutineRepositoryError extends Error {
  code: RoutineRepositoryErrorCode;

  constructor(code: RoutineRepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RoutineRepositoryError';
    this.code = code;
  }
}

const networkMessagePattern = /(failed to fetch|network|timeout|offline|fetch)/i;

export const mapSupabaseErrorCode = (message?: string): RoutineRepositoryErrorCode => {
  if (!message) {
    return 'SUPABASE_UNKNOWN';
  }

  if (networkMessagePattern.test(message)) {
    return 'SUPABASE_NETWORK';
  }

  return 'SUPABASE_QUERY';
};
