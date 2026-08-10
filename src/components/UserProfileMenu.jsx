import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { isGymOwner, isGymStaff, isPlatformAdmin } from '../utils/roles';
import { ProfilePanel, PasswordPanel } from './account/AccountPanels';
import { useFlash } from '../context/FlashContext';
import { menuSurface } from '../utils/surfaceClasses';
import { User, KeyRound, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';

function roleSubtitle(role, t) {
  if (isPlatformAdmin(role)) return t('profile.platformAdmin');
  if (isGymOwner(role)) return t('profile.gymOwner');
  if (isGymStaff(role)) return t('profile.frontDesk');
  return t('profile.account');
}

function initialsFrom(name, email, username) {
  const source = (name || email || username || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.charAt(0).toUpperCase();
}

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-app-text-strong transition-colors hover:bg-app-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40';

const iconChip =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-surface dark:bg-app-bg';

/**
 * Top-right profile menu: profile, change password, logout.
 * @param {{ compact?: boolean }} props - compact shows avatar only (mobile)
 */
export default function UserProfileMenu({ compact = false }) {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = usePreferences();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { showFlash } = useFlash();

  const displayName = user?.name || user?.email || user?.username || 'User';
  const subtitle = roleSubtitle(user?.role, t);
  const isDark = theme === 'dark';
  const ThemeIcon = isDark ? Sun : Moon;
  const themeActionLabel = isDark ? t('profile.switchToLight') : t('profile.switchToDark');

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen, closeMenu]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login');
  };

  const openProfile = () => {
    closeMenu();
    setProfileOpen(true);
  };

  const openPassword = () => {
    closeMenu();
    setPasswordOpen(true);
  };

  const profileLabel = isGymOwner(user?.role) ? t('profile.gymProfile') : t('profile.account');

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex items-center gap-2 rounded-full transition-colors hover:bg-app-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:hover:bg-app-raised ${
            compact ? 'p-1' : 'py-1 pl-1 pr-2'
          }`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
            {initialsFrom(user?.name, user?.email, user?.username)}
          </div>
          {!compact && (
            <>
              <div className="hidden text-left sm:block">
                <div className="max-w-[140px] truncate text-sm font-semibold leading-tight text-app-text-strong">
                  {displayName}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-app-muted">
                  {subtitle}
                </div>
              </div>
              <ChevronDown
                className={`hidden h-4 w-4 text-app-muted transition-transform sm:block ${
                  menuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden
              />
            </>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={`absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl py-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 ${menuSurface}`}
          >
            <div className="border-b border-app-border-subtle px-4 pb-3 pt-2.5">
              <p className="truncate text-sm font-semibold text-app-text-strong">{displayName}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-app-muted">
                {subtitle}
              </p>
              {user?.username ? (
                <p className="mt-1 truncate text-xs font-medium text-app-text" title={user.username}>
                  @{user.username}
                </p>
              ) : null}
            </div>

            <div className="px-2 py-2">
              <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-app-muted">
                {t('profile.appearance')}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={cycleTheme}
                className={itemClass}
              >
                <span className={`${iconChip} text-teal-700 dark:text-teal-300`}>
                  <ThemeIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{themeActionLabel}</span>
                <span className="shrink-0 rounded-md bg-app-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted dark:bg-app-bg">
                  {isDark ? t('profile.themeDark') : t('profile.themeLight')}
                </span>
              </button>
            </div>

            <div className="mx-3 border-t border-app-border-subtle" />

            <div className="px-2 py-2">
              <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-app-muted">
                {t('profile.account')}
              </p>
              <button type="button" role="menuitem" onClick={openProfile} className={itemClass}>
                <span className={`${iconChip} text-teal-700 dark:text-teal-300`}>
                  <User className="h-4 w-4" aria-hidden />
                </span>
                {profileLabel}
              </button>
              <button type="button" role="menuitem" onClick={openPassword} className={itemClass}>
                <span className={`${iconChip} text-teal-700 dark:text-teal-300`}>
                  <KeyRound className="h-4 w-4" aria-hidden />
                </span>
                {t('profile.changePassword')}
              </button>
            </div>

            <div className="mx-3 border-t border-app-border-subtle" />

            <div className="px-2 pb-1 pt-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <span className={`${iconChip} text-rose-600 dark:text-rose-400`}>
                  <LogOut className="h-4 w-4" aria-hidden />
                </span>
                {t('profile.logout')}
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSuccess={showFlash}
      />
      <PasswordPanel
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSuccess={showFlash}
      />
    </>
  );
}
