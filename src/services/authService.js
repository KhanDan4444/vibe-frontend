/**
 * @file authService.js
 * @description Auth API — password reset (OTP + email), gym signup, SaaS plans.
 */

import { API_BASE_URL } from '../config/api';
import { parseApiResponse, apiErrorFromResponse } from '../utils/api';

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw apiErrorFromResponse(data, res.status);
  return data;
}

/** @deprecated Email reset — prefer OTP flow for gym owners */
export async function forgotPassword(email) {
  return postJson('/auth/forgot-password', { email: email.trim().toLowerCase() });
}

export async function requestForgotPasswordOtp(username) {
  return postJson('/auth/forgot-password/request-otp', { username: username.trim().toLowerCase() });
}

export async function resetPasswordWithOtp({ sessionId, code, password }) {
  return postJson('/auth/forgot-password/reset-otp', { sessionId, code: code.trim(), password });
}

export async function resetPassword(token, password) {
  return postJson('/auth/reset-password', { token, password });
}

export async function getPublicSaasPlans() {
  const res = await fetch(`${API_BASE_URL}/api/auth/saas-plans`);
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || 'Could not load plans');
  return data.plans || [];
}

export async function requestGymSignupOtp(phone) {
  return postJson('/auth/gym-signup/request-otp', { phone: phone.trim() });
}

export async function completeGymSignup(payload) {
  return postJson('/auth/gym-signup/complete', payload);
}

export async function changePassword(apiFetch, currentPassword, newPassword) {
  const res = await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok) throw new Error(data.error || 'Could not change password');
  return data;
}
