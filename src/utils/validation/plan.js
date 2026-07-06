import { ok, fail } from './result';
import { validateRequiredName } from './names';
import { parseMoneyAmount } from './money';

/**
 * @param {{ name: string, duration: string|number, price: string|number }} fields
 */
export function validatePlanForm({ name, duration, price }) {
  const nameResult = validateRequiredName(name);
  if (!nameResult.ok) return nameResult;

  const dur = parseInt(String(duration), 10);
  if (!duration || Number.isNaN(dur) || dur < 1) {
    return fail('validation.planDurationMin', 'duration');
  }

  const parsedPrice = parseMoneyAmount(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return fail('validation.planPriceInvalid', 'price');
  }

  return ok();
}
