/** Default wait before aborting an API request (mutations + reads). */
export const REQUEST_TIMEOUT_MS = 20_000;

export const REQUEST_TIMEOUT_MESSAGE =
  'The request timed out. Check your connection and try again.';

/**
 * fetch() with an AbortController timeout.
 * If `options.signal` is already set, either abort aborts the request.
 * Timed-out errors have `name === 'TimeoutError'` and `code === 'TIMEOUT'`.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const { signal: outerSignal, ...rest } = options;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onOuterAbort = () => {
    controller.abort();
  };

  if (outerSignal) {
    if (outerSignal.aborted) {
      clearTimeout(timeoutId);
      const err = new Error(REQUEST_TIMEOUT_MESSAGE);
      err.name = 'AbortError';
      throw outerSignal.reason ?? err;
    }
    outerSignal.addEventListener('abort', onOuterAbort, { once: true });
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      const err = new Error(REQUEST_TIMEOUT_MESSAGE);
      err.name = 'TimeoutError';
      err.code = 'TIMEOUT';
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (outerSignal) {
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  }
}

export function isTimeoutError(error) {
  return error?.name === 'TimeoutError' || error?.code === 'TIMEOUT';
}
