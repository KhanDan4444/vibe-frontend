// src/context/AuthContext.jsx (Live API & FormData Optimized)
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { parseApiResponse, apiErrorFromResponse } from '../utils/api';
import { API_BASE_URL, API_FETCH_CREDENTIALS } from '../config/api';
import { isGymOwner } from '../utils/roles';
import { clearAccessToken, getAccessToken, setAccessToken, setRememberMePreference } from '../utils/authStorage';
import { cacheRead, getCachedRead, clearReadCacheForUser } from '../offline/readCache';
import { queueableJob, bodyHasPhoto, enqueueJob } from '../offline/writeQueue';
import { clearMemberPhotoCache } from '../utils/memberPhotoCache';
import {
  fetchWithTimeout,
  isTimeoutError,
  REQUEST_TIMEOUT_MESSAGE,
} from '../utils/fetchWithTimeout';

function apiUnreachableMessage() {
  if (import.meta.env.DEV) {
    return `Cannot reach the API at ${API_BASE_URL || '/api (proxy)'}. Start the backend: cd vibe && npm start`;
  }
  return 'Cannot reach the server. Please try again later.';
}

function unreachableOrTimeoutMessage(error) {
  if (isTimeoutError(error)) return REQUEST_TIMEOUT_MESSAGE;
  return apiUnreachableMessage();
}

const isNetworkError = (error) =>
  isTimeoutError(error) ||
  error?.message === 'Failed to fetch' ||
  error?.name === 'TypeError';

const jsonResponse = (body, { status = 200, cached = false, queued = false } = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(cached ? { 'X-Vibe-Cache': 'hit' } : {}),
      ...(queued ? { 'X-Vibe-Queued': '1' } : {}),
    },
  });

function withAuthHeaders(headers = {}) {
  const token = getAccessToken();
  if (!token) return { ...headers };
  return { ...headers, Authorization: `Bearer ${token}` };
}
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [gymSubscription, setGymSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const logout = useCallback(async () => {
    const userId = userIdRef.current;
    if (userId) {
      void clearReadCacheForUser(userId);
    }
    clearMemberPhotoCache();
    clearAccessToken();

    try {
      await fetchWithTimeout(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: API_FETCH_CREDENTIALS,
      });
    } catch {
      /* cookie clear is best-effort when offline */
    }

    setUser(null);
    setGymSubscription(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/session`, {
          credentials: API_FETCH_CREDENTIALS,
          headers: withAuthHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401) clearAccessToken();
          return;
        }
        const data = await parseApiResponse(response);
        if (!cancelled && data.user) {
          setUser(data.user);
          setGymSubscription(data.subscription || null);
        }
      } catch {
        /* not signed in or session timed out */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!user?.id || user.name) return undefined;
    if (!isGymOwner(user.role)) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/gym/profile`, {
          credentials: API_FETCH_CREDENTIALS,
          headers: withAuthHeaders(),
        });
        const data = await parseApiResponse(response);
        if (cancelled || !response.ok) return;
        setUser((prev) => {
          if (!prev || prev.id !== user.id) return prev;
          return {
            ...prev,
            name: data.user?.name || data.gym?.owner_name || prev.name,
            email: data.user?.email ?? prev.email,
            username: data.user?.username ?? prev.username,
          };
        });
      } catch {
        // Non-fatal — header falls back to username
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const login = useCallback(async (email, password, rememberMe = true) => {
    try {
      setRememberMePreference(rememberMe);
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: API_FETCH_CREDENTIALS,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: Boolean(rememberMe) }),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) throw apiErrorFromResponse(data, response.status);

      if (data.token) {
        setAccessToken(data.token, Boolean(rememberMe));
      } else {
        clearAccessToken();
      }
      const profile = data.user;
      if (profile) setUser(profile);
      setGymSubscription(data.subscription || null);
      return profile;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new Error(unreachableOrTimeoutMessage(error));
      }
      console.error('Login error:', error.message);
      throw error;
    }
  }, []);

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const headers = withAuthHeaders({ ...options.headers });
    const method = (options.method || 'GET').toUpperCase();
    const userId = userIdRef.current;

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    /** Offline fallback: serve cached GETs, queue allowlisted writes. */
    const offlineFallback = async () => {
      if (method === 'GET') {
        const cached = await getCachedRead(userId, endpoint);
        if (cached) {
          return jsonResponse(cached.body, { cached: true });
        }
        return null;
      }

      const rule = queueableJob(endpoint, options);
      if (!rule) return null;
      if (bodyHasPhoto(options.body)) {
        throw new Error('Photos need an internet connection. Retry without a photo, or when back online.');
      }
      await enqueueJob({
        userId,
        endpoint,
        method,
        body: options.body,
        label: rule.label,
      });
      return jsonResponse({ queued: true, message: 'Saved offline. It will sync when you are back online.' }, {
        status: 202,
        queued: true,
      });
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false && userId) {
      const fallback = await offlineFallback();
      if (fallback) return fallback;
      throw new Error(apiUnreachableMessage());
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api${endpoint}`, {
        ...options,
        headers,
        credentials: API_FETCH_CREDENTIALS,
      });

      if (response.status === 401) {
        await logout();
        throw new Error('Session expired');
      }

      if (
        method === 'GET' &&
        response.ok &&
        userId &&
        (response.headers.get('Content-Type') || '').includes('application/json')
      ) {
        response
          .clone()
          .json()
          .then((body) => cacheRead(userId, endpoint, body))
          .catch(() => {});
      }

      return response;
    } catch (error) {
      if (isNetworkError(error)) {
        if (userId) {
          const fallback = await offlineFallback();
          if (fallback) return fallback;
        }
        throw new Error(unreachableOrTimeoutMessage(error));
      }
      console.error(`API Request Failed [${endpoint}]:`, error.message);
      throw error;
    }
  }, [logout]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const contextValue = useMemo(() => ({
    user,
    gymSubscription,
    login,
    logout,
    updateUser,
    apiFetch,
    loading,
    isAuthenticated: Boolean(user),
  }), [user, gymSubscription, login, logout, updateUser, apiFetch, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
