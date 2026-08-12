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
        className={`shrink-0 rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:text-app-muted dark:hover:bg-app-raised/80 dark:hover:text-app-text-strong ${
          compact ? 'flex h-11 w-11 items-center justify-center' : 'p-2'
        }`}
        aria-label={`${tipLabel} (${shortcutHint})`}
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
    </SidebarTooltip>
  );

  return (
    <div
      className={`relative z-[1] transition-all duration-[180ms] ease-out motion-reduce:transition-none ${
        compact ? 'mb-3 flex flex-col items-center gap-1.5 pb-3' : 'mb-5 pr-9 pb-5'
      }`}
    >
      {!compact ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -left-3 -top-4 h-28 w-44 rounded-full bg-teal-400/15 blur-2xl dark:bg-teal-400/10"
        />
      ) : null}
      <BrandLogo
        to={logoTo}
        variant={showLabels ? 'lockup' : 'icon'}
        className={showLabels ? 'relative !max-w-[13.25rem] sm:!max-w-[13.75rem]' : 'relative'}
      />
      {compact ? toggle : <div className="absolute right-0 top-0.5">{toggle}</div>}
      <SidebarShortcutCoach
        open={shortcutCoachOpen}
        onDismiss={dismissShortcutCoach}
        shortcutHint={shortcutHint}
        anchorRef={collapseToggleRef}
        layoutKey={showLabels}
      />
      {/* Collapsed: short solid tick reads better on a narrow rail; expanded: soft full rule */}
      <div
        aria-hidden
        className={
          compact
            ? 'pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-teal-400/45'
            : 'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/35 to-transparent'
        }
      />
    </div>
  );
}
