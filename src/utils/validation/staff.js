import { ok, fail, firstFailure } from './result';
import { validateRequiredName } from './names';
import { validateOptionalEthiopianPhone } from './phone';
import { validateUsername, validateOptionalEmail } from './auth';
import { validatePassword } from './passwords';

/**
 * @param {{
 *   name: string,
 *   username: string,
 *   email?: string,
 *   password: string,
 *   branchId: string|number|null|undefined,
 *   isEdit?: boolean,
 * }} fields
 */
export function validateStaffForm({ name, username, email, password, branchId, isEdit = false }) {
  return firstFailure(
    validateRequiredName(name),
    branchId ? ok() : fail('validation.branchRequired', 'branchId'),
    validateUsername(username),
    validateOptionalEmail(email),
    isEdit ? (password ? validatePassword(password) : ok()) : validatePassword(password)
  );
}
