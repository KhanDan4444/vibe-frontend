/** Tailwind classes applied when a field has a validation error. */
export const FIELD_INPUT_ERROR_CLASS =
  '!border-rose-400 !shadow-[0_0_0_2px_rgb(244_63_94/0.25)] focus:!border-rose-400 focus:!shadow-[inset_0_1px_2px_rgb(15_23_42/0.04),0_0_0_2px_rgb(244_63_94/0.25)] dark:focus:!shadow-[inset_0_1px_2px_rgb(0_0_0/0.28),0_0_0_2px_rgb(244_63_94/0.25)]';

/** Default text/select styling for modals and app forms (not auth glass). */
export const FORM_INPUT_CLASS = 'mt-1 app-field';

/** Select-friendly variant — same chrome, pointer cursor. */
export const FORM_SELECT_CLASS = 'mt-1 app-field cursor-pointer';

/** @param {string} base @param {Record<string, string>} fieldErrors @param {string} field */
export function inputClass(base, fieldErrors, field) {
  return fieldErrors[field] ? `${base} ${FIELD_INPUT_ERROR_CLASS}` : base;
}

/** @param {Record<string, string>} fieldErrors @param {string} field */
export function fieldErrorMessage(fieldErrors, field) {
  return fieldErrors[field] || '';
}

/** @param {React.Dispatch<React.SetStateAction<Record<string, string>>>} setFieldErrors @param {string} field */
export function clearFieldError(setFieldErrors, field) {
  setFieldErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });
}

/** @param {React.Dispatch<React.SetStateAction<Record<string, string>>>} setFieldErrors */
export function clearAllFieldErrors(setFieldErrors) {
  setFieldErrors({});
}

/** Map API / snake_case field names to form state keys. */
const API_FIELD_ALIASES = {
  gym_name: 'gymName',
  owner_name: 'ownerName',
  plan_id: 'planId',
  saas_plan_id: 'saasPlanId',
  branch_id: 'branchId',
  member_id: 'memberId',
  start_date: 'startDate',
  confirmPassword: 'confirm',
  newPassword: 'newPassword',
  currentPassword: 'currentPassword',
  email: 'email',
  username: 'username',
  password: 'password',
  phone: 'phone',
  name: 'name',
  amount: 'amount',
  date: 'date',
};

/** @param {string|null|undefined} field */
export function normalizeApiField(field) {
  if (!field) return null;
  return API_FIELD_ALIASES[field] || field;
}

/**
 * Split a mutation/API error into banner vs field-level state.
 * @param {Error & { field?: string }} err
 * @param {Record<string, string>} [fieldMap]
 */
export function mutationErrorState(err, fieldMap = {}) {
  const apiField = normalizeApiField(err?.field);
  const key = apiField ? fieldMap[apiField] || apiField : null;
  if (key) {
    return { error: '', fieldErrors: { [key]: err?.message || 'Something went wrong.' } };
  }
  return { error: err?.message || 'Something went wrong.', fieldErrors: {} };
}

/**
 * @param {import('./result').ValidationFail} result
 * @param {{
 *   setFieldErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>,
 *   setBannerError?: (msg: string) => void,
 *   t: (key: string, params?: Record<string, string>) => string,
 *   field?: string,
 * }} options
 */
export function applyValidationResult(result, { setFieldErrors, setBannerError, t, field }) {
  if (result.ok) return true;
  const message = t(result.key, result.params);
  const targetField = field || result.field;
  if (targetField && setFieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [targetField]: message }));
    setBannerError?.('');
  } else {
    setBannerError?.(message);
  }
  return false;
}
