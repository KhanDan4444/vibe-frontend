/**
 * Brand mark — Niku square app icon (V + ንቁ).
 */
export default function BrandLogo({ className = '', imgClassName = '' }) {
  return (
    <img
      src="/app-icon.png?v=android-icon"
      alt="ንቁ"
      className={`h-10 w-10 rounded-[22%] object-cover ${imgClassName} ${className}`}
    />
  );
}
