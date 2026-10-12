/** True when the error is a MySQL error with one of the given codes. */
export function hasMysqlCode(error: unknown, ...codes: string[]): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && codes.includes(code);
}

/**
 * Runs a single-statement write again if InnoDB picked it as a deadlock
 * victim. InnoDB resolves a deadlock by rolling one statement back and asking
 * the client to retry; nothing was written, so retrying is safe.
 */
export async function retryOnDeadlock<T>(
  operation: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!hasMysqlCode(error, 'ER_LOCK_DEADLOCK') || attempt >= maxAttempts) {
        throw error;
      }
    }
  }
}
