import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { listTrainerMembers } from '../services/trainerService';
import { apiErrorFromResponse, parseApiResponse } from '../utils/api';
import ResponsiveModal from './ResponsiveModal';
import SearchField from './SearchField';
import EmptyState from './EmptyState';
import ErrorRetryBanner from './ErrorRetryBanner';
import InitialsAvatar from './InitialsAvatar';
import StatusBadge from './StatusBadge';
import { modalBody, modalHeader } from '../utils/modalLayout';
import { modalTitle } from '../utils/surfaceClasses';
import { formatMoneyShort } from '../utils/formatMoney';

export default function TrainerMembersModal({ trainer, showBranch, onClose }) {
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(trainer?.id));
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [trainer?.id]);

  const needle = search.trim().toLowerCase();
  const visibleMembers = useMemo(() => {
    if (!needle) return members;
    return members.filter((member) =>
      [member.name, member.phone, member.plan_name, member.branch_name].some((value) =>
        String(value || '').toLowerCase().includes(needle)
      )
    );
  }, [members, needle]);

  useEffect(() => {
    if (!trainer?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setMembers([]);
    listTrainerMembers(apiFetch, trainer.id)
      .then(async (res) => {
        const data = await parseApiResponse(res);
        if (!res.ok) throw apiErrorFromResponse(data, res.status);
        if (!cancelled) setMembers(data.members || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trainer?.id, apiFetch, reloadKey, t]);

  const openMember = useCallback(
    (memberId) => {
      onClose();
      navigate('/dashboard/members', { state: { memberId } });
    },
    [navigate, onClose]
  );

  return (
    <ResponsiveModal open={Boolean(trainer)} onClose={onClose} size="2xl" labelledBy="trainer-members-title">
      <div className={`${modalHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <h2 id="trainer-members-title" className={modalTitle}>
            {trainer?.name}
          </h2>
          {!loading && !error ? (
            <p className="mt-1 text-sm text-app-muted">
              {t('pages.team.assignedMembers', { count: members.length })}
              {showBranch && trainer?.branch_name ? ` · ${trainer.branch_name}` : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-app-muted hover:bg-app-surface"
          aria-label={t('aria.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className={modalBody}>
        {loading ? (
          <p className="text-sm text-app-muted">{t('common.loading')}</p>
        ) : error ? (
          <ErrorRetryBanner message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={t('pages.team.trainerMembersEmptyTitle')}
            body={t('pages.team.trainerMembersEmptyBody')}
          />
        ) : (
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('pages.members.searchPlaceholder')}
              className="mb-3 sm:max-w-none"
            />
            {visibleMembers.length > 0 ? (
              <div className="flex justify-end px-1 pb-1">
                <span className="min-w-[6.75rem] text-right text-xs font-medium text-app-muted">
                  {t('pages.team.trainerPaid')}
                </span>
              </div>
            ) : null}
            {visibleMembers.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title={t('pages.team.emptySearchTitle')}
                body={t('pages.team.emptySearchBody')}
              />
            ) : (
              <ul className="divide-y divide-app-border-subtle">
                  {visibleMembers.map((member) => {
                    const paid = Number(member.trainer_paid) > 0;
                    return (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => openMember(member.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-app-surface"
                        >
                          <InitialsAvatar name={member.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-app-text-strong">{member.name}</p>
                            <p className="truncate text-sm text-app-muted">
                              {member.phone || '—'}
                              {member.plan_name ? ` · ${member.plan_name}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <StatusBadge status={member.status} />
                            {member.is_unpaid ? (
                              <span className="text-xs font-medium text-app-muted">{t('status.unpaid')}</span>
                            ) : null}
                          </div>
                          <span
                            className={`min-w-[6.75rem] shrink-0 whitespace-nowrap text-right text-sm tabular-nums ${
                              paid
                                ? 'font-semibold text-app-text-strong'
                                : 'font-medium text-app-muted'
                            }`}
                          >
                            {formatMoneyShort(member.trainer_paid)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </>
        )}
      </div>
    </ResponsiveModal>
  );
}
