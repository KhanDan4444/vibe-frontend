import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGym } from '../../context/GymContext';
import { isGymOwner } from '../../utils/roles';
import { mutationErrorState } from '../../utils/validation';
import MemberModal from '../../components/MemberModal';

/**
 * Full-page enroll flow — stepped form with room to grow.
 * Edit member stays as a modal on the members list / drawer.
 * No-plans guidance lives on the members list, not here.
 */
export default function EnrollMember() {
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const {
    plans,
    enrollMember,
    refreshSummary,
    readOnly,
    branches,
    selectedBranchId,
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
      void refreshSummary();
    } catch (err) {
      const next = mutationErrorState(err, { date: 'paymentDate' });
      setError(next.error || err.message);
      setFieldErrors(next.fieldErrors || {});
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
