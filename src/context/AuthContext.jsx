// src/context/AuthContext.jsx (Live API & FormData Optimized)
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { parseApiResponse, apiErrorFromResponse } from '../utils/api';
import { API_BASE_URL } from '../config/api';
import { decodeToken } from '../utils/jwt';
import { resolveUserFromToken } from '../utils/authSession';
import { isGymOwner } from '../utils/roles';
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../utils/authStorage';
import { cacheRead, getCachedRead, clearReadCacheForUser } from '../offline/readCache';
import { queueableJob, bodyHasPhoto, enqueueJob } from '../offline/writeQueue';

function apiUnreachableMessage() {
  if (import.meta.env.DEV) {
    return `Cannot reach the API at ${API_BASE_URL}. Start the backend: cd vibe && npm start`;
  }
  return 'Cannot reach the server. Please try again later.';
}

const isNetworkError = (error) =>
  error?.message === 'Failed to fetch' || error?.name === 'TypeError';

const jsonResponse = (body, { status = 200, cached = false, queued = false } = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(cached ? { 'X-Vibe-Cache': 'hit' } : {}),
      ...(queued ? { 'X-Vibe-Queued': '1' } : {}),
    },
  });

const AuthContext = createContext(null);

function readInitialSession() {
  const storedToken = getStoredToken();
  const user = resolveUserFromToken(storedToken);
  if (storedToken && !user) {
    clearStoredToken();
    return { token: null, user: null };
  }
  return { token: user ? storedToken : null, user };
}

export const AuthProvider = ({ children }) => {
  const [initialSession] = useState(readInitialSession);
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const [gymSubscription, setGymSubscription] = useState(null);
  // Offline cache/queue keys derive from the token (stable per session),
  // so apiFetch identity doesn't churn when profile details load.
  const tokenUserId = useMemo(() => resolveUserFromToken(token)?.id ?? null, [token]);
  const tokenUserIdRef = useRef(tokenUserId);
  useEffect(() => {
    tokenUserIdRef.current = tokenUserId;
  }, [tokenUserId]);

  const logout = useCallback(() => {
    const userId = tokenUserIdRef.current;
    if (userId) {
      void clearReadCacheForUser(userId);
    }
    clearStoredToken();
    setUser(null);
    setToken(null);
    setGymSubscription(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const resolved = resolveUserFromToken(token);
    if (resolved) {
      setUser(resolved);
      return;
    }

    logout();
  }, [token, logout]);

  useEffect(() => {
    if (!token || !user?.id || user.name) return undefined;
    if (!isGymOwner(user.role)) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/gym/profile`, {
          headers: { Authorization: `Bearer ${token}` },
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
  }, [token, user?.id, user?.name, user?.role]);

  const login = useCallback(async (email, password, rememberMe = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: Boolean(rememberMe) }),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) throw apiErrorFromResponse(data, response.status);

      setStoredToken(data.token, rememberMe);
      setToken(data.token);
      const profile = data.user || decodeToken(data.token);
      if (profile) setUser(profile);
      setGymSubscription(data.subscription || null);
      return profile;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error(apiUnreachableMessage());
      }
      console.error('Login error:', error.message);
      throw error;
    }
  }, []);

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    const method = (options.method || 'GET').toUpperCase();
    const userId = tokenUserId;

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

    // Skip a doomed network round-trip when the browser knows it is offline.
    if (typeof navigator !== 'undefined' && navigator.onLine === false && token) {
      const fallback = await offlineFallback();
      if (fallback) return fallback;
      throw new Error(apiUnreachableMessage());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired');
      }

      if (
        method === 'GET' &&
        response.ok &&
        userId &&
        (response.headers.get('Content-Type') || '').includes('application/json')
      ) {
        // Cache a copy for offline reads; never block or fail the live response.
        response
          .clone()
          .json()
          .then((body) => cacheRead(userId, endpoint, body))
          .catch(() => {});
      }

      return response;
    } catch (error) {
      if (isNetworkError(error)) {
        if (token) {
          const fallback = await offlineFallback();
          if (fallback) return fallback;
        }
        throw new Error(apiUnreachableMessage());
      }
      console.error(`API Request Failed [${endpoint}]:`, error.message);
      throw error;
    }
  }, [token, tokenUserId, logout]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const contextValue = useMemo(() => ({
    user,
    token,
    gymSubscription,
    login,
    logout,
    updateUser,
    apiFetch,
    loading: false,
  }), [user, token, gymSubscription, login, logout, updateUser, apiFetch]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
