/**
 * Inline validation message shown below a form field.
 */
export default function FieldError({ message, id, className = '' }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className={`mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
