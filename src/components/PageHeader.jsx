import React from 'react';
import { pageTitle, mutedText } from '../utils/surfaceClasses';

/** Consistent owner page header: title + muted subtitle + optional actions. */
export default function PageHeader({ title, subtitle, actions = null, className = '' }) {
  return (
    <div className={`mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className={pageTitle}>{title}</h1>
        {subtitle ? (
          <p className={`mt-1.5 max-w-2xl text-sm ${mutedText}`}>{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
