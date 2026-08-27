/**
 * Exclusive live filter chip for a member (matches Members filter chips).
 * Former is handled separately via deletedAt.
 */
export function liveMemberFilterKey(member) {
  const status = String(member.status || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
  const unpaid = Boolean(member.isUnpaid ?? member.is_unpaid);
  if (status === 'expired') return 'expired';
  if (status === 'due soon') return 'dueSoon';
  if (unpaid) return 'unpaid';
  if (status === 'active') return 'active';
  return null;
}

/**
 * Instant chip counts while a delete (→ Former) or restore (→ live) is pending.
 */
export function adjustMemberFilterCounts(base, { pendingDeletes = [], pendingRestores = [] } = {}) {
  const next = {
    all: base.all ?? 0,
    active: base.active ?? 0,
    unpaid: base.unpaid ?? 0,
    dueSoon: base.dueSoon ?? 0,
    expired: base.expired ?? 0,
    // Not exclusive with status chips — keep dashboard month count as-is.
    new: base.new ?? 0,
    former: base.former ?? 0,
  };

  const bumpLive = (member, dir) => {
    next.all += dir;
    const key = liveMemberFilterKey(member);
    if (key) next[key] += dir;
  };

  for (const member of pendingDeletes) {
    bumpLive(member, -1);
    next.former += 1;
  }
  for (const member of pendingRestores) {
    bumpLive(member, 1);
    next.former -= 1;
  }

  for (const key of Object.keys(next)) {
    next[key] = Math.max(0, next[key]);
  }
  return next;
}
