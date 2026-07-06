import { useRef } from 'react';

/** Ignore out-of-order async responses when filters or pages change quickly. */
export function createLatestRequestGuard() {
  let latest = 0;
  return {
    start() {
      latest += 1;
      return latest;
    },
    isLatest(id) {
      return id === latest;
    },
  };
}

export function useLatestRequestGuard() {
  const guardRef = useRef(null);
  if (!guardRef.current) {
    guardRef.current = createLatestRequestGuard();
  }
  return guardRef.current;
}
