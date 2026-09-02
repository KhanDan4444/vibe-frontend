import { API_BASE_URL } from '../config/api';
import {
  clearStationDeviceToken,
  getStationDeviceToken,
  setStationDeviceToken,
} from '../utils/stationDeviceStorage';

const STATION_DEVICE_HEADER = 'X-Station-Device-Token';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CREDENTIALS = { credentials: 'include' };

function stationHeaders() {
  const deviceToken = getStationDeviceToken();
  return deviceToken ? { [STATION_DEVICE_HEADER]: deviceToken } : {};
}

function persistDeviceToken(data) {
  if (data?.device_token) {
    setStationDeviceToken(data.device_token);
  }
}

async function parseJson(res) {
  return res.json().catch(() => ({}));
}

export async function fetchStationSession(stationToken) {
  const qs = new URLSearchParams({ station: stationToken });
  const res = await fetch(`${API_BASE_URL}/api/public/station-check-in/session?${qs}`, {
    headers: { ...JSON_HEADERS, ...stationHeaders() },
    ...CREDENTIALS,
  });
  const data = await parseJson(res);
  return { res, data };
}

export async function requestStationOtp(stationToken, phone) {
  const res = await fetch(`${API_BASE_URL}/api/public/station-check-in/request-otp`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...stationHeaders() },
    body: JSON.stringify({ station: stationToken, phone }),
    ...CREDENTIALS,
  });
  const data = await parseJson(res);
  return { res, data };
}

export async function verifyStationOtp(stationToken, payload) {
  const res = await fetch(`${API_BASE_URL}/api/public/station-check-in/verify-otp`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...stationHeaders() },
    body: JSON.stringify({
      station: stationToken,
      phone: payload.phone,
      session_id: payload.sessionId,
      otp: payload.otp,
    }),
    ...CREDENTIALS,
  });
  const data = await parseJson(res);
  if (res.ok) {
    persistDeviceToken(data);
  }
  return { res, data };
}

export async function trustedStationCheckIn(stationToken) {
  const res = await fetch(`${API_BASE_URL}/api/public/station-check-in/check-in`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...stationHeaders() },
    body: JSON.stringify({ station: stationToken }),
    ...CREDENTIALS,
  });
  const data = await parseJson(res);
  if (!res.ok && data.code === 'DEVICE_NOT_TRUSTED') {
    clearStationDeviceToken();
  }
  return { res, data };
}
