export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { label: string; maxRetries?: number; baseDelayMs?: number },
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const { label, maxRetries = 3, baseDelayMs = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.error(JSON.stringify({
          event: `retry.${label}`,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
          attempt,
          maxRetries,
          delayMs: delay,
        }));
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(JSON.stringify({
          event: `retry.${label}.exhausted`,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
          attempt,
          maxRetries,
        }));
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  return { success: false, error: "Unreachable" };
}
