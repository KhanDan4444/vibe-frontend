import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { isGymOwner, isGymStaff, isPlatformAdmin } from '../utils/roles';
import { ProfilePanel, PasswordPanel } from './account/AccountPanels';
import { useFlash } from '../context/FlashContext';
import { menuItem, menuSurface } from '../utils/surfaceClasses';
import { User, KeyRound, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';

function roleSubtitle(role, t) {
  if (isPlatformAdmin(role)) return t('profile.platformAdmin');
  if (isGymOwner(role)) return t('profile.gymOwner');
  if (isGymStaff(role)) return role === 'Gym Staff' ? t('profile.helpDesk') : role;
  return t('profile.account');
}

function themeIcon(theme) {
  return theme === 'dark' ? Moon : Sun;
}

function themeLabel(theme, t) {
  return theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight');
}

function initialsFrom(name, email, username) {
  const source = (name || email || username || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.charAt(0).toUpperCase();
}

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
  const ThemeIcon = themeIcon(theme);

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
            className={`absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 ${menuSurface}`}
          >
            <div className="border-b px-4 py-3 border-app-border-subtle">
              <p className="truncate text-sm font-semibold text-app-text-strong">{displayName}</p>
              <p className="truncate text-xs text-app-muted">{user?.email}</p>
            </div>

            <div className="border-b py-1.5 border-app-border-subtle">
              <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-wider text-app-muted">
                {t('profile.appearance')}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={cycleTheme}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm ${menuItem}`}
              >
                <ThemeIcon className="h-4 w-4 text-app-muted" aria-hidden />
                {themeLabel(theme, t)}
              </button>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={openProfile}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm ${menuItem}`}
            >
              <User className="h-4 w-4 text-app-muted" aria-hidden />
              {profileLabel}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={openPassword}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm ${menuItem}`}
            >
              <KeyRound className="h-4 w-4 text-app-muted" aria-hidden />
              {t('profile.changePassword')}
            </button>

            <div className="my-1 border-t border-app-border-subtle" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t('profile.logout')}
            </button>
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
