import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle2, Settings2, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { parseApiResponse, formatApiError } from '../../utils/api';
import {
  searchCheckInMembers,
  listCheckIns,
  createCheckIn,
  getAttendanceSettings,
  updateAttendanceSettings,
} from '../../services/checkInService';
import VisitRing from '../../components/VisitRing';
import MemberPhoto from '../../components/MemberPhoto';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import SearchField from '../../components/SearchField';
import ErrorRetryBanner from '../../components/ErrorRetryBanner';
import StatusBadge from '../../components/StatusBadge';
import UnpaidBadge from '../../components/UnpaidBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { flashFromKey } from '../../i18n/flashToast';
import { cardSurface, mutedText, panelTitle, renewActionBtn } from '../../utils/surfaceClasses';
import { formatMemberStatusForDisplay } from '../../utils/memberStatus';
import { formatDisplayDate } from '../../utils/date';

const CAP_OPTIONS = [
  { value: '', labelKey: 'pages.checkIn.capUnlimited' },
  { value: '4', labelKey: 'pages.checkIn.capDays', days: 4 },
  { value: '5', labelKey: 'pages.checkIn.capDays', days: 5 },
  { value: '6', labelKey: 'pages.checkIn.capDays', days: 6 },
];

export default function CheckIn() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { showFlash, readOnly, getBranchQueryParams, refreshSummary } = useGym();
  const owner = isGymOwner(user?.role);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [today, setToday] = useState({ date: '', total: 0, checkIns: [] });
  const [todayLoading, setTodayLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await getAttendanceSettings(apiFetch);
      const data = await parseApiResponse(res);
      if (res.ok) {
        setSettings(data.settings);
        setCanManage(Boolean(data.canManage));
      }
    } catch {
      /* non-blocking */
    }
  }, [apiFetch]);

  const loadToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await listCheckIns(apiFetch, { ...getBranchQueryParams(), limit: 40 });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadCheckIns'));
      setToday({
        date: data.date,
        total: data.total ?? 0,
        checkIns: data.checkIns || [],
      });
    } catch (err) {
      setToday({ date: '', total: 0, checkIns: [] });
      setSearchError(err.message);
    } finally {
      setTodayLoading(false);
    }
  }, [apiFetch, getBranchQueryParams, t]);

  useEffect(() => {
    void loadSettings();
    void loadToday();
  }, [loadSettings, loadToday]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      setSearchError('');
      try {
        const res = await searchCheckInMembers(apiFetch, {
          q: debounced,
          ...getBranchQueryParams(),
        });
        const data = await parseApiResponse(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || t('errors.searchMembers'));
        setResults(data.members || []);
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(err.message);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, debounced, getBranchQueryParams, t]);

  const applyCheckInSuccess = (data, memberName) => {
    showFlash(
      flashFromKey(t, 'checkedIn', {
        subtitleParams: {
          name: memberName,
          progress:
            data.visits_limit != null
              ? `${data.visits_this_week}/${data.visits_limit}`
              : String(data.visits_this_week),
        },
      })
    );
    setResults((prev) =>
      prev.map((m) =>
        m.id === data.member?.id || m.id === data.checkIn?.member_id
          ? {
              ...m,
              visits_this_week: data.visits_this_week,
              visits_limit: data.visits_limit,
            }
          : m
      )
    );
    void loadToday();
    void refreshSummary?.();
  };

  const runCheckIn = async (member, { force = false } = {}) => {
    if (readOnly) return;
    setCheckingId(member.id);
    setSearchError('');
    try {
      const res = await createCheckIn(apiFetch, { member_id: member.id, force });
      const data = await parseApiResponse(res);
      if (res.status === 409 && data.code === 'WEEKLY_LIMIT' && data.can_force) {
        setForceTarget({ member, data });
        return;
      }
      if (!res.ok) {
        throw Object.assign(new Error(data.error || t('errors.checkInFailed')), {
          code: data.code,
        });
      }
      applyCheckInSuccess(data, member.name);
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
    } finally {
      setCheckingId(null);
    }
  };

  const saveCap = async (raw) => {
    if (!canManage || savingSettings) return;
    setSavingSettings(true);
    try {
      const visits_per_week = raw === '' ? null : parseInt(raw, 10);
      const res = await updateAttendanceSettings(apiFetch, { visits_per_week });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error);
      setSettings(data.settings);
      showFlash(flashFromKey(t, 'attendanceSettingsSaved'));
      if (debounced) {
        setDebounced((q) => q);
        setQuery((q) => `${q}`);
      }
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
    } finally {
      setSavingSettings(false);
    }
  };

  const capValue =
    settings?.visits_per_week == null ? '' : String(settings.visits_per_week);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={t('pages.checkIn.title')}
        subtitle={t('pages.checkIn.subtitle')}
        actions={
          owner && canManage ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <Settings2 className="h-4 w-4" />
              {t('pages.checkIn.visitRules')}
            </Button>
          ) : null
        }
      />

      {settingsOpen && owner ? (
        <Card className="overflow-hidden">
          <div className="space-y-3 p-4 sm:p-5">
            <h2 className={panelTitle}>{t('pages.checkIn.visitRulesTitle')}</h2>
            <p className={`text-sm ${mutedText}`}>{t('pages.checkIn.visitRulesBody')}</p>
            <div className="flex flex-wrap gap-2">
              {CAP_OPTIONS.map((opt) => {
                const active = capValue === opt.value;
                return (
                  <button
                    key={opt.value || 'unlimited'}
                    type="button"
                    disabled={savingSettings || readOnly}
                    onClick={() => void saveCap(opt.value)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'border-transparent bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)]'
                        : 'border-app-border-subtle bg-app-raised text-app-muted hover:text-app-text'
                    }`}
                  >
                    {opt.days
                      ? t(opt.labelKey, { count: opt.days })
                      : t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      <div
        className={`relative overflow-hidden ${cardSurface}`}
        style={{
          background:
            'linear-gradient(165deg, color-mix(in srgb, var(--color-brand) 8%, var(--color-app-surface)) 0%, var(--color-app-surface) 42%, var(--color-app-surface) 100%)',
        }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[color:var(--color-brand)] opacity-[0.07] blur-3xl" />
        <div className="relative space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-text)]">
                {t('pages.checkIn.deskLabel')}
              </p>
              <p className="mt-1 max-w-md text-sm text-app-muted">
                {settings?.visits_per_week
                  ? t('pages.checkIn.capHint', { count: settings.visits_per_week })
                  : t('pages.checkIn.capHintUnlimited')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-app-text-strong">
                {todayLoading ? '—' : today.total}
              </p>
              <p className="text-xs text-app-muted">{t('pages.checkIn.todayCount')}</p>
            </div>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('pages.checkIn.searchPlaceholder')}
            className="max-w-xl"
          />
        </div>
      </div>

      {searchError ? (
        <ErrorRetryBanner message={searchError} onRetry={() => void loadToday()} />
      ) : null}

      <div className="space-y-3">
        {!debounced ? (
          <Card className="overflow-hidden">
            <EmptyState
              icon={Search}
              title={t('pages.checkIn.searchEmptyTitle')}
              body={t('pages.checkIn.searchEmptyBody')}
            />
          </Card>
        ) : searching ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${cardSurface} h-36 animate-pulse`} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyState
              icon={UserRound}
              title={t('pages.checkIn.noMatchesTitle')}
              body={t('pages.checkIn.noMatchesBody')}
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((member) => {
              const status = formatMemberStatusForDisplay(member.status);
              const busy = checkingId === member.id;
              return (
                <div
                  key={member.id}
                  className={`${cardSurface} flex items-center gap-4 p-4 transition-colors hover:border-[color:var(--color-brand)]/30`}
                >
                  <VisitRing
                    visits={member.visits_this_week ?? 0}
                    limit={member.visits_limit}
                    size={84}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <MemberPhoto
                        memberId={member.id}
                        apiFetch={apiFetch}
                        name={member.name}
                        hasPhoto={Boolean(member.photo_url)}
                        className="h-10 w-10 rounded-xl object-cover"
                        fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white dark:bg-teal-600"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-app-text-strong">{member.name}</p>
                        <p className="truncate text-xs text-app-muted">{member.phone || '—'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={status} />
                          {member.is_unpaid ? <UnpaidBadge /> : null}
                        </div>
                        {member.trainer_name ? (
                          <p className="mt-1 truncate text-[11px] text-app-muted">
                            {t('table.trainer')}: {member.trainer_name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={readOnly || busy}
                      onClick={() => void runCheckIn(member)}
                      className={`${renewActionBtn} mt-3 w-full justify-center sm:w-auto`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {busy ? t('common.processing') : t('pages.checkIn.checkInAction')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="admin-panel-header">
          <h2 className={panelTitle}>{t('pages.checkIn.todayTitle')}</h2>
          <p className="text-xs text-app-muted">
            {today.date ? formatDisplayDate(today.date) : '—'}
          </p>
        </div>
        {todayLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-app-bg" />
            ))}
          </div>
        ) : today.checkIns.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-app-muted">
            {t('pages.checkIn.todayEmpty')}
          </div>
        ) : (
          <ul className="divide-y divide-app-border-subtle">
            {today.checkIns.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <MemberPhoto
                  memberId={row.member_id}
                  apiFetch={apiFetch}
                  name={row.member_name}
                  hasPhoto={Boolean(row.member_photo_url)}
                  className="h-10 w-10 rounded-xl object-cover"
                  fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white dark:bg-teal-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-app-text-strong">{row.member_name}</p>
                  <p className="truncate text-xs text-app-muted">
                    {row.branch_name || '—'}
                    {row.checked_in_by_name ? ` · ${row.checked_in_by_name}` : ''}
                  </p>
                </div>
                <time className="shrink-0 text-xs tabular-nums text-app-muted">
                  {row.checked_in_at
                    ? new Date(row.checked_in_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!forceTarget}
        title={t('pages.checkIn.forceTitle')}
        message={t('pages.checkIn.forceMessage', {
          name: forceTarget?.member?.name,
          count: forceTarget?.data?.visits_this_week,
          limit: forceTarget?.data?.visits_limit,
        })}
        confirmText={t('pages.checkIn.forceConfirm')}
        type="danger"
        onConfirm={() => {
          const target = forceTarget?.member;
          setForceTarget(null);
          if (target) void runCheckIn(target, { force: true });
        }}
        onCancel={() => setForceTarget(null)}
      />
    </div>
  );
}
