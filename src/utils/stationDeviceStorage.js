const STORAGE_KEY = 'vibe_station_device_token';

export function getStationDeviceToken() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && value.length >= 32 ? value : null;
  } catch {
    return null;
  }
}

export function setStationDeviceToken(token) {
  try {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStationDeviceToken() {
  setStationDeviceToken(null);
}
