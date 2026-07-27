/**
 * Build a title + subtitle toast from i18n flash keys.
 * @param {import('i18next').TFunction} t
 * @param {string} key - e.g. "enrolledPaid" → flash.enrolledPaid.title / .subtitle
 * @param {{ titleParams?: object, subtitleParams?: object, variant?: 'success' | 'danger' | 'warning' | 'offline' }} [options]
 */
export function flashFromKey(t, key, options = {}) {
  const { titleParams, subtitleParams, variant = 'success' } = options;
  const base = `flash.${key}`;
  return {
    title: t(`${base}.title`, titleParams),
    subtitle: t(`${base}.subtitle`, subtitleParams),
    variant,
  };
}
