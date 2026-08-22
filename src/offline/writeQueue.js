// src/offline/writeQueue.js
// Persistent queue of gym-portal mutations made while offline, replayed on reconnect.

import { QUEUE_STORE, idbSet, idbDelete, idbGetAll } from './db';

export const MAX_ATTEMPTS = 5;

/**
 * Mutations that are safe to queue offline. Deliberately excludes destructive
 * operations (deletes, payment corrections) and anything carrying a photo.
 */
const QUEUEABLE = [
  { method: 'POST', pattern: /^\/members\/enroll$/, label: 'enrollMember' },
  { method: 'POST', pattern: /^\/members$/, label: 'createMember' },
  { method: 'PUT', pattern: /^\/members\/\d+$/, label: 'updateMember' },
  { method: 'POST', pattern: /^\/members\/\d+\/renew$/, label: 'renewMember' },
  { method: 'POST', pattern: /^\/members\/\d+\/change-plan$/, label: 'changePlan' },
  { method: 'POST', pattern: /^\/members\/\d+\/transfer$/, label: 'transferMember' },
  { method: 'POST', pattern: /^\/payments$/, label: 'collectPayment' },
  { method: 'POST', pattern: /^\/plans$/, label: 'createPlan' },
  { method: 'PUT', pattern: /^\/plans\/\d+$/, label: 'updatePlan' },
  { method: 'POST', pattern: /^\/gym\/branches$/, label: 'createBranch' },
  { method: 'PATCH', pattern: /^\/gym\/branches\/\d+$/, label: 'updateBranch' },
];

/** Strip query string before matching. */
const pathOf = (endpoint) => endpoint.split('?')[0];

export function queueableJob(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') return null;
  if (options.body instanceof FormData) return null;
  const rule = QUEUEABLE.find((r) => r.method === method && r.pattern.test(pathOf(endpoint)));
  return rule || null;
}

/** Photo / certification payloads must not be queued — uploads require a live connection. */
export function bodyHasPhoto(body) {
  if (typeof body !== 'string') return false;
  try {
    const parsed = JSON.parse(body);
    const photo = typeof parsed?.photo === 'string' && parsed.photo.startsWith('data:');
    const cert =
      typeof parsed?.certification === 'string' && parsed.certification.startsWith('data:');
    return Boolean(photo || cert);
  } catch {
    return false;
  }
}

export async function enqueueJob({ userId, endpoint, method, body, label }) {
  const job = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    endpoint,
    method,
    body,
    label,
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending',
    lastError: null,
  };
  await idbSet(QUEUE_STORE, undefined, job);
  notifyQueueChanged();
  return job;
}

export async function listJobs(userId) {
  try {
    const all = await idbGetAll(QUEUE_STORE);
    return all
      .filter((j) => j.userId === userId)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function updateJob(job) {
  await idbSet(QUEUE_STORE, undefined, job);
  notifyQueueChanged();
}

export async function removeJob(id) {
  await idbDelete(QUEUE_STORE, id);
  notifyQueueChanged();
}

// --- change notifications (same-tab) ---

const QUEUE_EVENT = 'vibe-offline-queue-changed';

export function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_EVENT));
  }
}

export function onQueueChanged(handler) {
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}
