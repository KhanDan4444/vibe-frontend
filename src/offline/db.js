// src/offline/db.js
// Minimal promise wrapper around IndexedDB — two object stores:
// `reads` (cached GET responses) and `queue` (pending offline writes).

const DB_NAME = 'vibe-offline';
const DB_VERSION = 1;
export const READS_STORE = 'reads';
export const QUEUE_STORE = 'queue';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(READS_STORE)) {
        db.createObjectStore(READS_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const result = fn(store);
        transaction.oncomplete = () => resolve(result?.result ?? result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      })
  );
}

export const idbGet = (store, key) => tx(store, 'readonly', (s) => s.get(key));
export const idbSet = (store, key, value) =>
  tx(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
export const idbDelete = (store, key) => tx(store, 'readwrite', (s) => s.delete(key));
export const idbClear = (store) => tx(store, 'readwrite', (s) => s.clear());
export const idbGetAll = (store) => tx(store, 'readonly', (s) => s.getAll());
export const idbGetAllKeys = (store) => tx(store, 'readonly', (s) => s.getAllKeys());
