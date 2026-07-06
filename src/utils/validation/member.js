import { ok, fail } from './result';
import { validateRequiredName } from './names';
import { validateRequiredEthiopianPhone } from './phone';

/**
 * @param {{ name: string, phone: string }} fields
 */
export function validateMemberForm({ name, phone }) {
  const nameResult = validateRequiredName(name);
  if (!nameResult.ok) return nameResult;
  return validateRequiredEthiopianPhone(phone);
}
