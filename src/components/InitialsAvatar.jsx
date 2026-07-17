import React from 'react';

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

const SIZE_STYLES = {
  sm: 'h-8 w-8 text-xs rounded-full',
  md: 'h-10 w-10 text-sm rounded-full',
  lg: 'h-14 w-14 text-xl rounded-2xl',
};

/**
 * Circular (or rounded-square for lg) avatar with name initials — used for gyms and other entities without photos.
 */
export default function InitialsAvatar({ name, size = 'md', className = '' }) {
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-teal-100 font-bold text-teal-700 dark:bg-teal-600/20 dark:text-teal-300 ${sizeClass} ${className}`}
      aria-hidden={Boolean(name)}
    >
      {getInitials(name)}
    </div>
  );
}
