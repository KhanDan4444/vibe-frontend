import { ok, fail } from './result';
import { validateRequiredName } from './names';
import { validateOptionalEthiopianPhone } from './phone';

export const MAX_BRANCH_ADDRESS_LENGTH = 500;

/**
 * @param {{ name: string, phone?: string, address?: string }} fields
 */
export function validateBranchForm({ name, phone, address }) {
  const nameResult = validateRequiredName(name, { field: 'name' });
  if (!nameResult.ok) return nameResult;

  if (phone?.trim()) {
    const phoneResult = validateOptionalEthiopianPhone(phone);
    if (!phoneResult.ok) return phoneResult;
  }

  if (address && address.trim().length > MAX_BRANCH_ADDRESS_LENGTH) {
    return fail('validation.addressTooLong', 'address');
  }

  return ok();
}
