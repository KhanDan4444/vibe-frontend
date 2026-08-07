import { fail } from './result';
import { MAX_NAME_LENGTH } from './names';
import { validateRequiredEthiopianPhone } from './phone';

/**
 * @param {{ name: string, phone: string }} fields
 */
export function validateMemberForm({ name, phone }) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return fail('validation.fullNameRequired', 'name');
  if (trimmed.length > MAX_NAME_LENGTH) return fail('validation.nameTooLong', 'name');
  return validateRequiredEthiopianPhone(phone);
}
