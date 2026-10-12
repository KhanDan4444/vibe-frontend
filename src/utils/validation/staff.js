import { ok, fail, firstFailure } from './result';
import { validateRequiredName } from './names';
import { validateUsername, validateOptionalEmail } from './auth';
import { validatePassword, validatePasswordMatch } from './passwords';
import { validateRequiredEthiopianPhone } from './phone';

/**
 * @param {{
 *   name: string,
 *   username: string,
 *   email?: string,
 *   phone: string,
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
  phone,
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
    validateRequiredEthiopianPhone(phone),
    passwordCheck
  );
}
