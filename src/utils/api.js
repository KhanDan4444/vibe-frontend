/**
 * Parse fetch response body as JSON; surface clear errors for HTML/text/empty bodies.
 * @param {Response} res
 * @returns {Promise<unknown>}
 */
export async function parseApiResponse(res) {
  const text = await res.text();

  if (!text) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status} ${res.statusText})`);
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 80).replace(/\s+/g, ' ');
    if (!res.ok) {
      throw new Error(
        `Server returned a non-JSON error (${res.status}). ` +
          'Ensure the backend is running: cd vibe && npm start. ' +
          (preview ? `Response: ${preview}` : '')
      );
    }
    throw new Error(`Invalid JSON from server. ${preview ? `Response: ${preview}` : ''}`);
  }
}

/** Build a throwable Error from a failed API JSON body. */
export function apiErrorFromResponse(data, status) {
  const err = new Error(data?.error || `Request failed (${status})`);
  if (data?.code) err.code = data.code;
  if (data?.field) err.field = data.field;
  if (data?.member_name) err.member_name = data.member_name;
  return err;
}

/** User-facing message for caught API/mutation errors. */
export function formatApiError(err) {
  return err?.message || 'Something went wrong.';
}
