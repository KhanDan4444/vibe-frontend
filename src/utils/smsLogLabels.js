/** i18n labels for SMS log message types. */

const MEMBER_TYPE_KEYS = {
  member_due_soon: 'smsLog.types.dueSoon',
  member_expires_today: 'smsLog.types.expiresToday',
  member_expired: 'smsLog.types.expired',
  member_renewed: 'smsLog.types.renewed',
  member_enrolled: 'smsLog.types.enrolled',
  member_pass_link: 'smsLog.types.passLink',
};

const MEMBER_TYPE_PREVIEW_KEYS = {
  member_due_soon: 'smsLog.previews.dueSoon',
  member_expires_today: 'smsLog.previews.expiresToday',
  member_expired: 'smsLog.previews.expired',
  member_renewed: 'smsLog.previews.renewed',
  member_enrolled: 'smsLog.previews.enrolled',
  member_pass_link: 'smsLog.previews.passLink',
};

const GYM_LICENSE_TYPE_KEYS = {
  gym_license_due_soon: 'smsLog.gymTypes.dueSoon',
  gym_license_due_in_3_days: 'smsLog.gymTypes.dueIn3Days',
  gym_license_expires_today: 'smsLog.gymTypes.expiresToday',
  gym_license_expired: 'smsLog.gymTypes.expired',
  gym_license_renewed: 'smsLog.gymTypes.renewed',
};

const OTP_TYPE_KEYS = {
  otp_forgot_password: 'smsLog.otpTypes.forgotPassword',
  otp_gym_signup: 'smsLog.otpTypes.gymSignup',
};

const ADMIN_SMS_TYPE_KEYS = {
  ...GYM_LICENSE_TYPE_KEYS,
  ...OTP_TYPE_KEYS,
};

export function formatSmsMessageType(t, messageType) {
  const key = MEMBER_TYPE_KEYS[messageType];
  return key ? t(key) : messageType || '—';
}

export function formatSmsMessagePreview(t, messageType) {
  const key = MEMBER_TYPE_PREVIEW_KEYS[messageType];
  return key ? t(key) : '';
}

export function formatGymSmsMessageType(t, messageType) {
  const key = GYM_LICENSE_TYPE_KEYS[messageType];
  return key ? t(key) : messageType || '—';
}

export function formatAdminSmsMessageType(t, messageType) {
  const key = ADMIN_SMS_TYPE_KEYS[messageType];
  return key ? t(key) : messageType || '—';
}

export const SMS_TYPE_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'filters.all' },
  { value: 'member_enrolled', labelKey: 'smsLog.types.enrolled' },
  { value: 'member_due_soon', labelKey: 'smsLog.types.dueSoon' },
  { value: 'member_expires_today', labelKey: 'smsLog.types.expiresToday' },
  { value: 'member_expired', labelKey: 'smsLog.types.expired' },
  { value: 'member_renewed', labelKey: 'smsLog.types.renewed' },
  { value: 'member_pass_link', labelKey: 'smsLog.types.passLink' },
];

export const GYM_SMS_TYPE_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'filters.all' },
  { value: 'gym_license_due_in_3_days', labelKey: 'smsLog.gymTypes.dueIn3Days' },
  { value: 'gym_license_expires_today', labelKey: 'smsLog.gymTypes.expiresToday' },
  { value: 'gym_license_expired', labelKey: 'smsLog.gymTypes.expired' },
  { value: 'gym_license_renewed', labelKey: 'smsLog.gymTypes.renewed' },
];

export const ADMIN_SMS_TYPE_FILTER_OPTIONS = [
  ...GYM_SMS_TYPE_FILTER_OPTIONS,
  { value: 'otp_forgot_password', labelKey: 'smsLog.otpTypes.forgotPassword' },
  { value: 'otp_gym_signup', labelKey: 'smsLog.otpTypes.gymSignup' },
];
