/** Fire-and-forget refresh work so success toasts are not blocked on refetch. */
export function runInBackground(promise) {
  void Promise.resolve(promise).catch(() => {});
}
