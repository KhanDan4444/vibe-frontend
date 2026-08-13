// src/offline/OfflineContext.jsx
// Tracks connectivity + the offline write queue; replays queued mutations on reconnect.

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, API_FETCH_CREDENTIALS } from '../config/api';
import { authHeaderFromStorage } from '../utils/authStorage';
import { listJobs, updateJob, removeJob, onQueueChanged, MAX_ATTEMPTS } from './writeQueue';
import { SYNCED_EVENT } from './events';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const OfflineContext = createContext(null);

const SYNC_INTERVAL_MS = 60 * 1000;

export const OfflineProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [jobs, setJobs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshJobs = useCallback(async () => {
    const next = await (userId ? listJobs(userId) : Promise.resolve([]));
    setJobs(next);
  }, [userId]);

  useEffect(() => {
    queueMicrotask(refreshJobs);
    return onQueueChanged(refreshJobs);
  }, [refreshJobs]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !userId || !user) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const run = async () => {
      syncingRef.current = true;
      setSyncing(true);
      let anySynced = false;
      try {
        const pending = (await listJobs(userId)).filter((j) => j.status === 'pending');
        for (const job of pending) {
          let res;
          try {
            res = await fetchWithTimeout(`${API_BASE_URL}/api${job.endpoint}`, {
              method: job.method,
              credentials: API_FETCH_CREDENTIALS,
              headers: {
                'Content-Type': 'application/json',
                ...authHeaderFromStorage(),
              },
              body: job.body,
            });
          } catch {
            break;
          }

          if (res.ok) {
            await removeJob(job.id);
            anySynced = true;
            continue;
          }
          if (res.status === 401) {
            break;
          }
          if (res.status >= 500) {
            const attempts = (job.attempts || 0) + 1;
            if (attempts >= MAX_ATTEMPTS) {
              await updateJob({ ...job, attempts, status: 'failed', lastError: `Server error (${res.status})` });
            } else {
              await updateJob({ ...job, attempts });
            }
            continue;
          }
          let message = `Request failed (${res.status})`;
          try {
            const data = await res.json();
            if (data?.error) message = data.error;
          } catch {
            /* keep default message */
          }
          await updateJob({ ...job, attempts: (job.attempts || 0) + 1, status: 'failed', lastError: message });
        }
      } finally {
        syncingRef.current = false;
        setSyncing(false);
        await refreshJobs();
        if (anySynced) {
          window.dispatchEvent(new Event(SYNCED_EVENT));
        }
      }
    };

    if (navigator.locks?.request) {
      await navigator.locks.request('vibe-offline-sync', { ifAvailable: true }, async (lock) => {
        if (lock) await run();
      });
    } else {
      await run();
    }
  }, [userId, user, refreshJobs]);

  const pendingCount = jobs.filter((j) => j.status === 'pending').length;

  useEffect(() => {
    if (online && pendingCount > 0) {
      syncNow();
    }
  }, [online, pendingCount, syncNow]);

  useEffect(() => {
    if (!online || pendingCount === 0) return undefined;
    const timer = setInterval(syncNow, SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [online, pendingCount, syncNow]);

  const discardJob = useCallback(async (id) => {
    await removeJob(id);
  }, []);

  const discardFailed = useCallback(async () => {
    const failed = jobs.filter((j) => j.status === 'failed');
    await Promise.all(failed.map((j) => removeJob(j.id)));
  }, [jobs]);

  const value = useMemo(
    () => ({
      online,
      jobs,
      pendingCount,
      failedJobs: jobs.filter((j) => j.status === 'failed'),
      syncing,
      syncNow,
      discardJob,
      discardFailed,
    }),
    [online, jobs, pendingCount, syncing, syncNow, discardJob, discardFailed]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = () => useContext(OfflineContext);
