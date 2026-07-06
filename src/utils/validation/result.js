/**
 * @typedef {{ ok: true }} ValidationOk
 * @typedef {{ ok: false, key: string, field?: string, params?: Record<string, string> }} ValidationFail
 * @typedef {ValidationOk | ValidationFail} ValidationResult
 */

/** @returns {ValidationOk} */
export function ok() {
  return { ok: true };
}

/**
 * @param {string} key i18n key (e.g. validation.phoneInvalid)
 * @param {string} [field]
 * @param {Record<string, string>} [params]
 * @returns {ValidationFail}
 */
export function fail(key, field, params) {
  return { ok: false, key, field, params };
}

/** @param {...ValidationResult} results */
export function firstFailure(...results) {
  for (const result of results) {
    if (!result.ok) return result;
  }
  return ok();
}

/**
 * @param {ValidationResult} result
 * @param {(msg: string) => void} setError
 * @param {(key: string, params?: Record<string, string>) => string} t
 * @param {{ setFieldErrors?: (fn: (prev: Record<string, string>) => Record<string, string>) => void, field?: string }} [options]
 * @returns {boolean} true when valid
 */
export function showValidationError(result, setError, t, options = {}) {
  if (result.ok) return true;
  const message = t(result.key, result.params);
  const field = options.field || result.field;
  if (field && options.setFieldErrors) {
    options.setFieldErrors((prev) => ({ ...prev, [field]: message }));
    setError('');
  } else {
    setError(message);
  }
  return false;
}
