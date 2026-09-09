import { describe, expect, it } from 'vitest';
import {
  validateAdminGymRegister,
  validateRequiredCity,
  validateOptionalGymAddress,
} from '../validation/gym';

const base = {
  gymName: 'Niku Fit',
  city: 'Addis Ababa',
  address: 'Bole',
  ownerName: 'Daniel',
  username: 'niku_owner',
  email: '',
  password: 'password12',
  confirm: 'password12',
  phone: '0912345678',
  saasPlanId: 1,
  skipPayment: true,
};

describe('admin gym register validation', () => {
  it('requires city like owner signup', () => {
    expect(validateRequiredCity('').ok).toBe(false);
    expect(validateRequiredCity('Addis Ababa').ok).toBe(true);
    expect(validateAdminGymRegister({ ...base, city: '' }).ok).toBe(false);
  });

  it('allows optional address within length', () => {
    expect(validateOptionalGymAddress('').ok).toBe(true);
    expect(validateOptionalGymAddress('x'.repeat(501)).ok).toBe(false);
    expect(validateAdminGymRegister({ ...base, address: '' }).ok).toBe(true);
  });

  it('requires matching passwords', () => {
    expect(validateAdminGymRegister({ ...base, confirm: 'nope' }).ok).toBe(false);
    expect(validateAdminGymRegister(base).ok).toBe(true);
  });
});
