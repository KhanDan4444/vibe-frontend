/** Visual marker for mandatory fields. Keep HTML `required` on the control. */
export default function RequiredMark({ className = '' }) {
  return (
    <span
      className={`ml-0.5 font-bold text-rose-600 dark:text-rose-400 ${className}`.trim()}
      aria-hidden="true"
    >
      *
    </span>
  );
}
