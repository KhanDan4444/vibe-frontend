import { describe, expect, it } from 'vitest';
import {
  validatePaymentDate,
  validateRenewPaymentDate,
  boundsForPaymentOnTerm,
  boundsForRenewPaymentOnTerm,
  boundsForTermStartWithPayment,
  clampIsoDate,
  clampPaymentToTerm,
  todayIso,
} from '../paymentDateRules';
import {
  validateMemberEnrollPayment,
  validatePaymentDateNotFuture,
  validatePaymentDateOnOrAfterStart,
} from '../validation/payment';

describe('paymentDateRules', () => {
  it('rejects future payment dates', () => {
    const r = validatePaymentDate('2099-01-01', '2020-01-01', '2026-07-17');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/future/i);
  });

  it('rejects payment before term start', () => {
    const r = validatePaymentDate('2026-01-01', '2026-02-01', '2026-07-17');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/term start/i);
  });

  it('accepts prepaid renew payment before a future start', () => {
    expect(validateRenewPaymentDate('2026-08-26', '2026-08-27', '2026-08-26').ok).toBe(true);
    expect(boundsForRenewPaymentOnTerm('2026-08-27', '2026-08-26')).toEqual({
      max: '2026-08-26',
    });
  });

  it('accepts payment on term start through today', () => {
    expect(validatePaymentDate('2026-02-01', '2026-02-01', '2026-07-17').ok).toBe(true);
    expect(validatePaymentDate('2026-07-17', '2026-02-01', '2026-07-17').ok).toBe(true);
  });

  it('bounds payment to term start..today', () => {
    expect(boundsForPaymentOnTerm('2026-03-01', '2026-07-17')).toEqual({
      min: '2026-03-01',
      max: '2026-07-17',
    });
  });

  it('caps custom term start at today', () => {
    expect(boundsForTermStartWithPayment('2026-07-17')).toEqual({ max: '2026-07-17' });
  });

  it('clamps payment into term window', () => {
    expect(clampPaymentToTerm('2026-03-01', '2025-01-01', '2026-07-17')).toBe('2026-03-01');
    expect(clampPaymentToTerm('2026-03-01', '2099-01-01', '2026-07-17')).toBe('2026-07-17');
    expect(clampIsoDate('2026-05-01', '2026-03-01', '2026-07-17')).toBe('2026-05-01');
  });

  it('todayIso is YYYY-MM-DD', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('validation/payment', () => {
  it('validatePaymentDateNotFuture', () => {
    expect(validatePaymentDateNotFuture('2026-07-17', '2026-07-17').ok).toBe(true);
    expect(validatePaymentDateNotFuture('2026-07-18', '2026-07-17').ok).toBe(false);
  });

  it('validatePaymentDateOnOrAfterStart', () => {
    expect(
      validatePaymentDateOnOrAfterStart({
        paymentDate: '2026-03-01',
        startDate: '2026-03-01',
      }).ok
    ).toBe(true);
    expect(
      validatePaymentDateOnOrAfterStart({
        paymentDate: '2026-02-28',
        startDate: '2026-03-01',
      }).ok
    ).toBe(false);
  });

  it('validateMemberEnrollPayment combines amount and date rules', () => {
    expect(
      validateMemberEnrollPayment({
        amount: 50,
        paymentDate: '2026-03-05',
        startDate: '2026-03-01',
        skipPayment: false,
      }).ok
    ).toBe(true);
    expect(
      validateMemberEnrollPayment({
        amount: 50,
        paymentDate: '2026-02-01',
        startDate: '2026-03-01',
        skipPayment: false,
      }).ok
    ).toBe(false);
    expect(
      validateMemberEnrollPayment({
        amount: '',
        paymentDate: '',
        startDate: '2026-03-01',
        skipPayment: true,
      }).ok
    ).toBe(true);
  });
});
