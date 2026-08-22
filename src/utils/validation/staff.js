import { ok, fail, firstFailure } from './result';
import { validateRequiredName } from './names';
import { validateUsername, validateOptionalEmail } from './auth';
import { validatePassword, validatePasswordMatch } from './passwords';

/**
 * @param {{
 *   name: string,
 *   username: string,
 *   email?: string,
 *   password: string,
 *   confirmPassword?: string,
 *   branchId: string|number|null|undefined,
 *   isEdit?: boolean,
 * }} fields
 */
export function validateStaffForm({
  name,
  username,
  email,
  password,
  confirmPassword = '',
  branchId,
  isEdit = false,
}) {
  const passwordCheck = isEdit
    ? password
      ? firstFailure(validatePassword(password), validatePasswordMatch(password, confirmPassword))
      : ok()
    : firstFailure(validatePassword(password), validatePasswordMatch(password, confirmPassword));

  return firstFailure(
    validateRequiredName(name),
    branchId ? ok() : fail('validation.branchRequired', 'branchId'),
    validateUsername(username),
    validateOptionalEmail(email),
    passwordCheck
  );
}
