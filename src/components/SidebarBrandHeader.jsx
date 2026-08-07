import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BrandLogo from './BrandLogo';
import SidebarTooltip from './SidebarTooltip';
import SidebarShortcutCoach from './SidebarShortcutCoach';

/**
 * Desktop sidebar chrome: brand + collapse control in the header.
 * Toggle sits top-right (expanded) or under the mark (collapsed rail).
 */
export default function SidebarBrandHeader({
  logoTo,
  showLabels,
  compact,
  collapsed,
  toggleCollapsed,
  shortcutHint,
  shortcutCoachOpen,
  dismissShortcutCoach,
  collapseToggleRef,
}) {
  const { t } = useTranslation();
  const tipLabel = collapsed ? t('common.expandSidebar') : t('common.collapseSidebar');

  const toggle = (
    <SidebarTooltip label={tipLabel} hint={shortcutHint} enabled>
      <button
        ref={collapseToggleRef}
        type="button"
        onClick={toggleCollapsed}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:text-app-muted dark:hover:bg-app-raised/80 dark:hover:text-app-text-strong"
        aria-label={`${tipLabel} (${shortcutHint})`}
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
    </SidebarTooltip>
  );

  return (
    <div
      className={`relative transition-all duration-[180ms] ease-out motion-reduce:transition-none ${
        compact ? 'mb-4 flex flex-col items-center gap-2 pb-4' : 'mb-4 pr-9 pb-4'
      }`}
    >
      <BrandLogo
        to={logoTo}
        variant={showLabels ? 'lockup' : 'icon'}
        className={showLabels ? '!max-w-[13.25rem] sm:!max-w-[13.75rem]' : undefined}
      />
      {compact ? toggle : <div className="absolute right-0 top-0.5">{toggle}</div>}
      <SidebarShortcutCoach
        open={shortcutCoachOpen}
        onDismiss={dismissShortcutCoach}
        shortcutHint={shortcutHint}
        anchorRef={collapseToggleRef}
        layoutKey={showLabels}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent ${
          compact ? 'left-1 right-1' : '-left-1 -right-1'
        }`}
      />
    </div>
  );
}
