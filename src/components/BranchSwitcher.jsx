import React from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { selectSurface } from '../utils/surfaceClasses';

/**
 * Owner branch filter — "All branches" or a single location.
 */
export default function BranchSwitcher({ branches, selectedBranchId, onChange, className = '' }) {
  const { t } = useTranslation();

  if (!branches?.length) return null;

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const inactiveBranches = branches.filter((b) => b.is_active === false);

  // Single-location gyms: nothing useful to switch — hide the control.
  if (activeBranches.length <= 1 && inactiveBranches.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="hidden h-4 w-4 shrink-0 text-app-muted sm:block" aria-hidden />
      <label className="sr-only" htmlFor="branch-switcher">
        {t('branch.label')}
      </label>
      <select
        id="branch-switcher"
        value={selectedBranchId === 'all' ? 'all' : String(selectedBranchId)}
        onChange={(e) => {
          const value = e.target.value;
          onChange(value === 'all' ? 'all' : parseInt(value, 10));
        }}
        className={`ui-select max-w-full flex-1 truncate sm:max-w-xs ${selectSurface}`}
      >
        <option value="all">{t('branch.allBranches')}</option>
        {activeBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
            {branch.is_default ? ` ${t('branch.defaultSuffix')}` : ''}
          </option>
        ))}
        {inactiveBranches.length > 0 && (
          <optgroup label={t('branch.inactiveGroup')}>
            {inactiveBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}{t('branch.inactiveSuffix')}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
