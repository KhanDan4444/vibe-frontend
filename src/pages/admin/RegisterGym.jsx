import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useFlash } from '../../context/FlashContext';
import RegisterGymModal from '../../components/RegisterGymModal';
import { parseApiResponse } from '../../utils/api';
import { enrollGym } from '../../services/gymAdminService';
import { getSaasPlans } from '../../services/saasPlanService';
import { ADMIN_SECTION_PATH } from '../../utils/adminRoutes';
import { flashFromKey } from '../../i18n/flashToast';
import { mutationErrorState } from '../../utils/validation';

/**
 * Full-page admin register-gym flow — stepped form matching owner member enroll.
 */
export default function RegisterGym() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { apiFetch } = useAuth();
  const { showFlash } = useFlash();

  const [saasPlans, setSaasPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(true);

  const goBack = () => navigate(ADMIN_SECTION_PATH.gyms);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await getSaasPlans(apiFetch);
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load plans');
      setSaasPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (err) {
      setError(err.message);
      setSaasPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        gym_name: data.gymName,
        owner_name: data.ownerName,
        username: data.username,
        password: data.password,
        phone: data.phone,
        saas_plan_id: data.saasPlanId,
        skip_payment: data.skipPayment,
      };
      if (data.email) payload.email = data.email;
      if (!data.skipPayment) {
        payload.amount = data.amount;
        payload.date = data.date;
        payload.method = data.method;
        payload.start_date = data.start_date || data.date;
      } else {
        payload.start_date = data.start_date;
      }

      const res = await enrollGym(apiFetch, payload);
      const resData = await parseApiResponse(res);
      if (!res.ok) throw new Error(resData.error || 'Failed to register gym');

      showFlash(
        flashFromKey(t, data.skipPayment ? 'gymRegistered' : 'gymRegisteredWithPayment', {
          subtitleParams: { name: data.gymName },
        })
      );
    } catch (err) {
      const next = mutationErrorState(err);
      setError(next.error || err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loadingPlans && saasPlans.length === 0 && !error) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 py-8">
        <div className="app-skeleton h-10 w-48 rounded-lg" />
        <div className="app-skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <RegisterGymModal
      variant="page"
      isOpen
      onClose={goBack}
      onSubmit={handleSubmit}
      saasPlans={saasPlans}
      saving={saving}
      error={error}
    />
  );
}
