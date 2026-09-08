export type DomainErrorCode =
  | 'offline'
  | 'invalid_invite'
  | 'home_full'
  | 'session_expired'
  | 'rate_limited'
  | 'permission_denied'
  | 'invalid_otp'
  | 'email_in_use'
  | 'pairing_blocked'
  | 'unknown';

export type DomainOperation =
  | 'start'
  | 'create_home'
  | 'join_home'
  | 'save_name'
  | 'refresh_home'
  | 'sign_out'
  | 'leave_home'
  | 'link_recovery'
  | 'verify_recovery'
  | 'recover_account'
  | 'privacy_center'
  | 'export_account'
  | 'delete_account'
  | 'block_partner'
  | 'unblock_partner'
  | 'moment_sync'
  | 'moment_action'
  | 'drawing_load'
  | 'drawing_save'
  | 'drawing_delete'
  | 'general';

const COPY: Record<DomainErrorCode, string> = {
  offline: 'Hearth can’t reach home right now. Check your connection and try again.',
  invalid_invite: 'That code doesn’t open a home. Check all six letters and numbers, then try again.',
  home_full: 'That home already has two people. Ask your partner for their newest code.',
  session_expired: 'This visit has ended. Try again to reconnect securely.',
  rate_limited: 'Too many tries at once. Give it a moment, then try again.',
  permission_denied: 'Hearth couldn’t complete that safely. Try again or start over.',
  invalid_otp: 'That six-digit code did not work. Check the newest email and try again.',
  email_in_use: 'That email already belongs to a Hearth account. Use account recovery instead.',
  pairing_blocked: 'This pairing is unavailable. Your privacy choice is still in place.',
  unknown: 'Something interrupted the journey home. Your progress is safe—please try again.',
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly operation: DomainOperation;
  readonly retryable: boolean;
  readonly diagnostic: unknown;

  constructor(
    code: DomainErrorCode,
    operation: DomainOperation,
    diagnostic: unknown,
    retryable = true,
  ) {
    super(COPY[code]);
    this.name = 'DomainError';
    this.code = code;
    this.operation = operation;
    this.retryable = retryable;
    this.diagnostic = diagnostic;
  }
}

function diagnosticText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '').toLowerCase();
  }
  return String(error ?? '').toLowerCase();
}

export function mapDomainError(
  error: unknown,
  operation: DomainOperation = 'general',
): DomainError {
  if (error instanceof DomainError) return error;

  const text = diagnosticText(error);
  const status = error && typeof error === 'object' && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';

  if (
    text.includes('failed to fetch') ||
    text.includes('network request failed') ||
    text.includes('networkerror') ||
    text.includes('offline')
  ) {
    return new DomainError('offline', operation, error);
  }
  if (text.includes('no home found') || text.includes('invalid invite')) {
    return new DomainError('invalid_invite', operation, error);
  }
  if (text.includes('already full')) {
    return new DomainError('home_full', operation, error, false);
  }
  if (text.includes('pairing is unavailable')) {
    return new DomainError('pairing_blocked', operation, error, false);
  }
  if (status === 401 || text.includes('jwt') || text.includes('session')) {
    return new DomainError('session_expired', operation, error);
  }
  if (status === 429 || code === '429' || text.includes('rate limit')) {
    return new DomainError('rate_limited', operation, error);
  }
  if (text.includes('token') && (text.includes('invalid') || text.includes('expired'))) {
    return new DomainError('invalid_otp', operation, error);
  }
  if (text.includes('email') && (text.includes('already') || text.includes('registered'))) {
    return new DomainError('email_in_use', operation, error, false);
  }
  if (status === 403 || code === '42501' || text.includes('permission denied')) {
    return new DomainError('permission_denied', operation, error);
  }
  return new DomainError('unknown', operation, error);
}

export function reportDomainError(error: DomainError): void {
  if (__DEV__) {
    console.warn(`[hearth:${error.operation}:${error.code}]`, error.diagnostic);
  }
}
