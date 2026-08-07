import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { mutationErrorState } from '../../utils/validation';
import { flashFromKey } from '../../i18n/flashToast';
import MemberModal from '../../components/MemberModal';

/**
 * Full-page enroll flow — long form (identity, photo, plan, payment) fits a page better than a modal.
 * Edit member stays as a modal on the members list / drawer.
 */
export default function EnrollMember() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const {
    plans,
    enrollMember,
    showFlash,
    refreshSummary,
    readOnly,
    branches,
    selectedBranchId,
    loading: gymLoading,
  } = useGym();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const showBranchPicker = isGymOwner(user?.role) && branches.filter((b) => b.is_active !== false).length > 0;
  const defaultBranchId =
    selectedBranchId !== 'all'
      ? selectedBranchId
      : branches.find((b) => b.is_default)?.id || branches[0]?.id;

  if (readOnly) {
    return <Navigate to="/dashboard/members" replace />;
  }

  const goBack = () => navigate('/dashboard/members');

  const handleSubmit = async (data) => {
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await enrollMember(data);
      showFlash(
        flashFromKey(t, data.skipPayment ? 'enrolledSkip' : 'enrolledPaid', {
          subtitleParams: { name: data.name },
        })
      );
      void refreshSummary();
      navigate('/dashboard/members');
    } catch (err) {
      const next = mutationErrorState(err, { date: 'paymentDate' });
      setError(next.error || err.message);
      setFieldErrors(next.fieldErrors || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {!gymLoading && plans.length === 0 && (
        <div className="admin-alert-amber mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="admin-alert-amber-icon mt-0.5 h-5 w-5 shrink-0" />
            <p className="admin-alert-amber-title text-sm">{t('pages.members.noPlansWarning')}</p>
          </div>
          <Link
            to="/dashboard/plans"
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            {t('actions.goToPlans')}
          </Link>
        </div>
      )}

      <MemberModal
        variant="page"
        isOpen
        onClose={goBack}
        onSubmit={handleSubmit}
        plans={plans}
        member={null}
        branches={branches}
        defaultBranchId={defaultBranchId}
        showBranchPicker={showBranchPicker}
        showPhotoUpload
        apiFetch={apiFetch}
        saving={saving}
        error={error}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
