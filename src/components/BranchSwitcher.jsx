import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ToolbarPicker from './ToolbarPicker';

/**
 * Owner branch filter — "All branches" or a single location.
 */
export default function BranchSwitcher({ branches, selectedBranchId, onChange, className = '' }) {
  const { t } = useTranslation();

  const activeBranches = useMemo(
    () => (branches || []).filter((b) => b.is_active !== false),
    [branches],
  );
  const inactiveBranches = useMemo(
    () => (branches || []).filter((b) => b.is_active === false),
    [branches],
  );

  const options = useMemo(() => {
    const list = [
      { id: 'all', label: t('branch.allBranches') },
      ...activeBranches.map((branch) => ({
        id: String(branch.id),
        label: branch.is_default ? `${branch.name} ${t('branch.defaultSuffix')}` : branch.name,
      })),
      ...inactiveBranches.map((branch) => ({
        id: String(branch.id),
        label: `${branch.name}${t('branch.inactiveSuffix')}`,
        group: 'inactive',
      })),
    ];
    return list;
  }, [activeBranches, inactiveBranches, t]);

  if (!branches?.length) return null;
  if (activeBranches.length <= 1 && inactiveBranches.length === 0) return null;

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <MapPin className="hidden h-4 w-4 shrink-0 text-app-muted sm:block" aria-hidden />
      <ToolbarPicker
        value={selectedBranchId === 'all' ? 'all' : String(selectedBranchId)}
        onChange={(id) => onChange(id === 'all' ? 'all' : parseInt(id, 10))}
        options={options}
        groups={inactiveBranches.length > 0 ? [{ id: 'inactive', labelKey: 'branch.inactiveGroup' }] : []}
        label={t('branch.label')}
        className="w-full min-w-0 sm:max-w-xs"
      />
    </div>
  );
}
