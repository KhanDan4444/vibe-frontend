// src/components/StatusBadge.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Badge from './ui/Badge';

/**
 * Unified status badge for member and gym subscription statuses.
 *
 * @param {object} props
 * @param {string} props.status - Raw status string (any casing).
 * @param {boolean} [props.showDot=true]
 */

const LABEL_KEYS = {
  former: 'status.former',
  active: 'status.active',
  suspended: 'status.suspended',
  expired: 'status.expired',
  trialing: 'status.trialing',
  'due soon': 'status.dueSoon',
  unpaid: 'status.unpaid',
};

export default function StatusBadge({ status, showDot = true }) {
  const { t } = useTranslation();
  const key = (status || '').toLowerCase();
  const labelKey = LABEL_KEYS[key];
  const label = labelKey
    ? t(labelKey)
    : (status ? status.charAt(0).toUpperCase() + status.slice(1) : t('status.unknown'));

  return (
    <Badge variant={key || 'neutral'} showDot={showDot}>
      {label}
    </Badge>
  );
}
