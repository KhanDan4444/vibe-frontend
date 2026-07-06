/**
 * Inline validation message shown below a form field.
 */
export default function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" role="alert">
      {message}
    </p>
  );
}
