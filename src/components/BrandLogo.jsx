/**
 * Brand mark — Niku app icon (V + ንቁ).
 * Pass className to size (e.g. h-12 w-12 rounded-2xl).
 */
export default function BrandLogo({ className = '', imgClassName = '' }) {
  return (
    <img
      src="/app-icon.png"
      alt="ንቁ"
      className={`h-10 w-10 rounded-xl object-cover ${imgClassName} ${className}`}
    />
  );
}
