import { useCallback } from 'react';

/**
 * Builds API query params for revenue period filters (preset or custom range).
 * @param {string} periodPreset
 * @param {string} customStart
 * @param {string} customEnd
 */
export function useRevenuePeriodParams(periodPreset, customStart, customEnd) {
  return useCallback(() => {
    const params = {};
    if (periodPreset === 'custom') {
      if (customStart) params.from = customStart;
      if (customEnd) params.to = customEnd;
    } else {
      params.preset = periodPreset;
    }
    return params;
  }, [periodPreset, customStart, customEnd]);
}
