import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BrandLogo from './BrandLogo';
import SidebarTooltip from './SidebarTooltip';
import SidebarShortcutCoach from './SidebarShortcutCoach';
import { sidebarIconButton } from '../utils/surfaceClasses';

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
        className={`${sidebarIconButton} ${
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
      className={`relative transition-all duration-[180ms] ease-out motion-reduce:transition-none ${
        compact ? 'mb-3 flex flex-col items-center gap-1.5 pb-3' : 'mb-4 pr-9 pb-4'
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
      {/* Collapsed: short solid tick reads better on a narrow rail; expanded: soft full rule */}
      <div
        aria-hidden
        className={
          compact
            ? 'pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-white/35'
            : 'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent'
        }
      />
    </div>
  );
}
