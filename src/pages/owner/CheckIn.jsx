import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ScanLine, Settings2, UserRound } from 'lucide-react';
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
import ScanMemberQrModal from '../../components/ScanMemberQrModal';
import { flashFromKey } from '../../i18n/flashToast';
import { cardSurface, mutedText, panelTitle, renewActionBtn } from '../../utils/surfaceClasses';
import { formatMemberStatusForDisplay, DISPLAY_STATUS } from '../../utils/memberStatus';
import { formatDisplayDate } from '../../utils/date';

const CAP_OPTIONS = [
  { value: '', labelKey: 'pages.checkIn.capUnlimited' },
  { value: '4', labelKey: 'pages.checkIn.capDays', days: 4 },
  { value: '5', labelKey: 'pages.checkIn.capDays', days: 5 },
  { value: '6', labelKey: 'pages.checkIn.capDays', days: 6 },
];

const TODAY_PAGE_SIZE = 40;

export default function CheckIn() {
  const { t } = useTranslation();
  const { apiFetch, user } = useAuth();
  const { showFlash, readOnly, getBranchQueryParams, refreshSummary, branches, selectedBranchId } =
    useGym();
  const owner = isGymOwner(user?.role);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [today, setToday] = useState({ date: '', total: 0, checkIns: [] });
  const [todayLimit, setTodayLimit] = useState(TODAY_PAGE_SIZE);
  const [todayLoading, setTodayLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [forceTarget, setForceTarget] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  /** @type {Record<number, { code: string, message: string }>} */
  const [cardErrors, setCardErrors] = useState({});
  /** @type {Record<number, boolean>} */
  const [successIds, setSuccessIds] = useState({});

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setCardErrors({});
    setSuccessIds({});
  }, [debounced]);

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
      const res = await listCheckIns(apiFetch, {
        ...getBranchQueryParams(),
        limit: todayLimit,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || t('errors.loadCheckIns'));
      setToday({
        date: data.date,
        total: data.total ?? 0,
        checkIns: data.checkIns || [],
      });
      setSearchError('');
    } catch (err) {
      setToday({ date: '', total: 0, checkIns: [] });
      setSearchError(err.message);
    } finally {
      setTodayLoading(false);
    }
  }, [apiFetch, getBranchQueryParams, t, todayLimit]);

  useEffect(() => {
    setTodayLimit(TODAY_PAGE_SIZE);
  }, [selectedBranchId]);

  useEffect(() => {
    void loadSettings();
    void loadToday();
  }, [loadSettings, loadToday]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setSearching(false);
      setCardErrors({});
      setSuccessIds({});
      return;
    }
    setCardErrors({});
    setSuccessIds({});
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
  }, [apiFetch, debounced, getBranchQueryParams, t, searchNonce]);

  const capChipLabel = useMemo(() => {
    if (!settings) return null;
    if (settings.visits_per_week == null) return t('pages.checkIn.capChipUnlimited');
    return t('pages.checkIn.capChipDays', { count: settings.visits_per_week });
  }, [settings, t]);

  const alreadyTodayIds = useMemo(
    () => new Set((today.checkIns || []).map((row) => row.member_id)),
    [today.checkIns]
  );

  const showBranchOnToday = (branches?.length || 0) > 1;

  const formatCheckInTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cardErrorMessage = (code, fallback) => {
    if (code === 'ALREADY_TODAY') return t('pages.checkIn.alreadyToday');
    if (code === 'WEEKLY_LIMIT') return t('pages.checkIn.weeklyLimitReached');
    return fallback || t('errors.checkInFailed');
  };

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
    const memberId = data.member?.id ?? data.checkIn?.member_id;
    if (memberId != null) {
      setCardErrors((prev) => ({
        ...prev,
        [memberId]: { code: 'ALREADY_TODAY', message: t('pages.checkIn.alreadyToday') },
      }));
      setSuccessIds((prev) => ({ ...prev, [memberId]: true }));
      window.setTimeout(() => {
        setSuccessIds((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }, 900);
      setResults((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                visits_this_week: data.visits_this_week,
                visits_limit: data.visits_limit,
              }
            : m
        )
      );
    }
    void loadToday();
    void refreshSummary?.();
  };

  const runCheckIn = async (member, { force = false } = {}) => {
    if (readOnly) return;
    const status = formatMemberStatusForDisplay(member.status);
    if (status === DISPLAY_STATUS.EXPIRED) return;
    if (alreadyTodayIds.has(member.id) || cardErrors[member.id]?.code === 'ALREADY_TODAY') {
      setCardErrors((prev) => ({
        ...prev,
        [member.id]: { code: 'ALREADY_TODAY', message: t('pages.checkIn.alreadyToday') },
      }));
      return;
    }
    setCheckingId(member.id);
    setSearchError('');
    setCardErrors((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });
    try {
      const res = await createCheckIn(apiFetch, { member_id: member.id, force });
      const data = await parseApiResponse(res);
      if (res.status === 409 && data.code === 'WEEKLY_LIMIT' && data.can_force) {
        setForceTarget({ member, data });
        return;
      }
      if (!res.ok) {
        const code = data.code || 'CHECK_IN_FAILED';
        if (code === 'ALREADY_TODAY' || code === 'WEEKLY_LIMIT') {
          setCardErrors((prev) => ({
            ...prev,
            [member.id]: {
              code,
              message: cardErrorMessage(code, data.error),
            },
          }));
          return;
        }
        throw Object.assign(new Error(data.error || t('errors.checkInFailed')), { code });
      }
      applyCheckInSuccess(data, member.name);
    } catch (err) {
      showFlash({ title: err.message, variant: 'danger' });
    } finally {
      setCheckingId(null);
    }
  };

  const runCheckInFromPass = useCallback(
    async (token, { force = false, forceMember = null } = {}) => {
      if (readOnly || !token) return;
      setScanBusy(true);
      setSearchError('');
      try {
        const res = await createCheckIn(apiFetch, {
          member_pass_token: token,
          force,
        });
        const data = await parseApiResponse(res);
        if (res.status === 409 && data.code === 'WEEKLY_LIMIT' && data.can_force) {
          setForceTarget({
            member: forceMember || {
              id: data.member?.id,
              name: data.member?.name || t('pages.checkIn.scanTitle'),
            },
            data,
            passToken: token,
          });
          return;
        }
        if (!res.ok) {
          throw new Error(data.error || t('errors.checkInFailed'));
        }
        applyCheckInSuccess(data, data.member?.name || t('pages.checkIn.checkInAction'));
        setScanOpen(false);
      } catch (err) {
        showFlash({ title: err.message, variant: 'danger' });
      } finally {
        setScanBusy(false);
      }
    },
    // applyCheckInSuccess closes over latest state helpers — keep deps intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch, readOnly, showFlash, t]
  );

  const saveCap = async (raw) => {
    if (!canManage || savingSettings) return;
    setSavingSettings(true);
    try {
      const visits_per_week = raw === '' ? null : parseInt(raw, 10);
      const res = await updateAttendanceSettings(apiFetch, { visits_per_week });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(formatApiError(data) || data.error);
      setSettings(data.settings);
      setSettingsOpen(false);
      showFlash(flashFromKey(t, 'attendanceSettingsSaved'));
      if (debounced) setSearchNonce((n) => n + 1);
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
          <div className="flex flex-wrap items-center gap-2">
            {!readOnly ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setScanOpen(true)}
              >
                <ScanLine className="h-4 w-4" />
                {t('pages.checkIn.scanAction')}
              </Button>
            ) : null}
            {owner && canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((o) => !o)}
              >
                <Settings2 className="h-4 w-4" />
                {t('pages.checkIn.visitRules')}
              </Button>
            ) : null}
          </div>
        }
      />

      {settingsOpen && owner && canManage ? (
        <Card className="overflow-hidden border-[color:var(--color-brand)]/25">
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={panelTitle}>{t('pages.checkIn.visitRulesTitle')}</h2>
                <p className={`mt-1 text-sm ${mutedText}`}>{t('pages.checkIn.visitRulesBody')}</p>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-app-muted hover:text-app-text"
                onClick={() => setSettingsOpen(false)}
              >
                {t('common.done')}
              </button>
            </div>
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
                    {opt.days ? t(opt.labelKey, { count: opt.days }) : t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Desk hero: stronger teal wash in light only; dark keeps the quieter glow */}
      <div
        className={`relative overflow-hidden ${cardSurface} !bg-transparent`}
        style={{
          background:
            'linear-gradient(155deg, color-mix(in srgb, var(--color-brand) 16%, var(--color-app-raised)) 0%, color-mix(in srgb, var(--color-brand) 5%, var(--color-app-raised)) 42%, var(--color-app-raised) 100%)',
        }}
      >
        {/* Light: richer orbs. Dark: original soft single glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[color:var(--color-brand)] opacity-[0.16] blur-3xl dark:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[color:var(--color-brand)] opacity-[0.07] blur-3xl dark:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-20 hidden h-48 w-48 rounded-full bg-[color:var(--color-brand)] opacity-[0.05] blur-3xl dark:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--color-brand) 8%, var(--color-app-surface)) 0%, var(--color-app-surface) 55%, var(--color-app-surface) 100%)',
          }}
          aria-hidden
        />
        <div className="relative space-y-5 p-5 sm:space-y-6 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex flex-wrap items-center gap-2.5">
              <p className="font-display text-xl font-semibold uppercase tracking-wide text-app-text-strong sm:text-2xl">
                {t('pages.checkIn.deskLabel')}
              </p>
              {capChipLabel ? (
                <button
                  type="button"
                  disabled={!owner || !canManage || readOnly}
                  onClick={() => owner && canManage && setSettingsOpen(true)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
                    owner && canManage
                      ? 'border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand-text)] hover:border-[color:var(--color-brand)]/45'
                      : 'border-app-border-subtle bg-app-raised text-app-muted'
                  }`}
                  title={owner && canManage ? t('pages.checkIn.visitRules') : undefined}
                >
                  {capChipLabel}
                </button>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2.5 self-center tabular-nums">
              <p className="font-display text-6xl font-semibold leading-none tracking-tight text-app-text-strong sm:text-7xl">
                {todayLoading ? '—' : today.total}
              </p>
              <div className="flex flex-col items-center justify-center">
                <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  {todayLoading
                    ? '—'
                    : t('pages.checkIn.todayMembersShort', { count: today.total })}
                </p>
                <p className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  {t('pages.checkIn.todayCount')}
                </p>
              </div>
            </div>
          </div>

          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('pages.checkIn.searchPlaceholder')}
            className="w-full max-w-md sm:max-w-lg"
          />
        </div>
      </div>

      {searchError ? (
        <ErrorRetryBanner message={searchError} onRetry={() => void loadToday()} />
      ) : null}

      {/* Results only when searching — keep idle viewport clean */}
      {debounced ? (
        <div className="space-y-3">
          {searching ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className={`${cardSurface} h-40 animate-pulse`} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <Card className="overflow-hidden">
              <EmptyState
                tone="muted"
                compact
                icon={UserRound}
                title={t('pages.checkIn.noMatchesTitle')}
                body={t('pages.checkIn.noMatchesBody')}
              />
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 check-in-results">
              {results.map((member) => {
                const status = formatMemberStatusForDisplay(member.status);
                const busy = checkingId === member.id;
                const checkInBlocked = status === DISPLAY_STATUS.EXPIRED;
                const cardError = cardErrors[member.id];
                const alreadyToday =
                  alreadyTodayIds.has(member.id) ||
                  Boolean(successIds[member.id]) ||
                  cardError?.code === 'ALREADY_TODAY';
                const showCardError =
                  Boolean(cardError) &&
                  !alreadyToday &&
                  cardError?.code !== 'ALREADY_TODAY';
                const justCheckedIn = Boolean(successIds[member.id]);
                const errorText =
                  cardError?.code === 'ALREADY_TODAY' ? '' : cardError?.message || '';
                return (
                  <div
                    key={member.id}
                    className={`check-in-result-card ${cardSurface} flex items-center gap-4 overflow-visible p-4 transition-[box-shadow,transform,background-color] duration-200 motion-safe:hover:-translate-y-0.5 ${
                      showCardError
                        ? '!border-[color:var(--color-status-expired)]/50 !bg-[color:var(--color-status-expired)]/[0.06] !ring-1 !ring-[color:var(--color-status-expired)]/35'
                        : 'hover:ring-[color:var(--color-brand)]/30'
                    }`}
                  >
                    <div className="relative shrink-0 pb-1.5 pr-1.5">
                      <VisitRing
                        visits={member.visits_this_week ?? 0}
                        limit={member.visits_limit}
                        size={92}
                        stroke={6.5}
                        weekStartsOn={settings?.week_starts_on || 'monday'}
                        celebrate={justCheckedIn}
                      />
                      <div className="absolute bottom-0 right-0 rounded-full bg-[color:var(--color-app-raised)] p-[2px] shadow-sm ring-1 ring-black/5">
                        <MemberPhoto
                          memberId={member.id}
                          apiFetch={apiFetch}
                          name={member.name}
                          hasPhoto={Boolean(member.photo_url)}
                          expandable={false}
                          className="h-7 w-7 rounded-full object-cover"
                          fallbackClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-border text-[11px] font-bold text-app-text"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold tracking-tight text-app-text-strong">
                        {member.name}
                      </p>
                      <p className="truncate text-sm text-app-muted">{member.phone || '—'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={status} />
                        {member.is_unpaid ? <UnpaidBadge /> : null}
                      </div>
                      {showCardError && errorText ? (
                        <p className="mt-1.5 text-xs font-semibold leading-snug text-[color:var(--color-status-expired)]">
                          {errorText}
                        </p>
                      ) : null}
                    </div>
                    <div className="w-[7.5rem] shrink-0 self-center text-right">
                      {checkInBlocked ? (
                        <p className="text-xs font-semibold leading-snug text-[color:var(--color-status-expired)]">
                          {t('pages.checkIn.blockedExpired')}
                        </p>
                      ) : alreadyToday ? (
                        <p className="text-xs font-semibold leading-snug text-[color:var(--color-status-expired)]">
                          {t('pages.checkIn.alreadyTodayShort')}
                        </p>
                      ) : cardError?.code === 'WEEKLY_LIMIT' ? (
                        <p className="text-xs font-semibold leading-snug text-[color:var(--color-status-expired)]">
                          {t('pages.checkIn.weeklyLimitShort')}
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={readOnly || busy || checkingId != null}
                          onClick={() => void runCheckIn(member)}
                          className={`${renewActionBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {busy ? t('common.processing') : t('pages.checkIn.checkInAction')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="admin-panel-header">
          <div className="min-w-0">
            <h2 className={panelTitle}>{t('pages.checkIn.todayTitle')}</h2>
            <p className="mt-0.5 text-xs text-app-muted">
              {today.date ? formatDisplayDate(today.date) : '—'}
            </p>
          </div>
          {!todayLoading && today.total > 0 ? (
            <span className="shrink-0 rounded-full border border-[color:var(--color-brand)]/25 bg-[color:var(--color-brand-soft)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[color:var(--color-brand-text)]">
              {t('pages.checkIn.todayMembers', { count: today.total })}
            </span>
          ) : null}
        </div>
        {todayLoading ? (
          <div className="space-y-2 p-3 sm:p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-app-bg" />
            ))}
          </div>
        ) : today.checkIns.length === 0 ? (
          <EmptyState
            compact
            tone="muted"
            icon={ScanLine}
            title={t('pages.checkIn.todayEmptyTitle')}
            body={t('pages.checkIn.todayEmpty')}
            action={
              !readOnly ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => setScanOpen(true)}>
                  <ScanLine className="h-4 w-4" />
                  {t('pages.checkIn.scanAction')}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <ul className="space-y-1 p-2 sm:p-3">
              {today.checkIns.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-app-bg/60"
                  title={
                    row.checked_in_by_name
                      ? t('pages.checkIn.checkedInBy', { name: row.checked_in_by_name })
                      : undefined
                  }
                >
                  <MemberPhoto
                    memberId={row.member_id}
                    apiFetch={apiFetch}
                    name={row.member_name}
                    hasPhoto={Boolean(row.member_photo_url)}
                    expandable={false}
                    className="h-10 w-10 rounded-full object-cover"
                    fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-border text-sm font-bold text-app-text"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold tracking-tight text-app-text-strong sm:text-base">
                      {row.member_name}
                    </p>
                    {showBranchOnToday && row.branch_name ? (
                      <p className="mt-0.5 truncate text-[11px] text-app-muted">{row.branch_name}</p>
                    ) : null}
                  </div>
                <time className="shrink-0 font-display text-sm font-semibold tabular-nums tracking-tight text-app-text-strong">
                  {formatCheckInTime(row.checked_in_at)}
                </time>
                </li>
              ))}
            </ul>
            {today.total > today.checkIns.length ? (
              <div className="border-t border-app-border px-3 py-3 sm:px-4">
                <p className="mb-2 text-center text-[11px] text-app-muted">
                  {t('pages.checkIn.showingOf', {
                    shown: today.checkIns.length,
                    total: today.total,
                  })}
                </p>
                {today.checkIns.length < 100 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => setTodayLimit((n) => Math.min(100, n + TODAY_PAGE_SIZE))}
                  >
                    {t('pages.checkIn.showMore')}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
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
          const target = forceTarget;
          setForceTarget(null);
          if (target?.passToken) {
            void runCheckInFromPass(target.passToken, {
              force: true,
              forceMember: target.member,
            });
            return;
          }
          if (target?.member) void runCheckIn(target.member, { force: true });
        }}
        onCancel={() => setForceTarget(null)}
      />

      <ScanMemberQrModal
        open={scanOpen}
        busy={scanBusy}
        onClose={() => {
          if (!scanBusy) setScanOpen(false);
        }}
        onScan={(token) => runCheckInFromPass(token)}
      />
    </div>
  );
}
