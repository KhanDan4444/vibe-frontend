import { useEffect, useState } from 'react';
import { fetchSupportContact } from '../services/supportService';

/**
 * @returns {{ phone: string|null, phoneDisplay: string|null, telegram: string|null, telegramUrl: string|null, configured: boolean }}
 */
export function useSupportContact() {
  const [contact, setContact] = useState({
    phone: null,
    phoneDisplay: null,
    telegram: null,
    telegramUrl: null,
    configured: false,
  });

  useEffect(() => {
    let cancelled = false;
    void fetchSupportContact().then((data) => {
      if (cancelled) return;
      setContact({
        phone: data.phone,
        phoneDisplay: data.phone_display,
        telegram: data.telegram,
        telegramUrl: data.telegram_url,
        configured: data.configured,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return contact;
}
