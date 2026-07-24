/**
 * Brand mark — 1024 Niku app icon.
 */
export default function BrandLogo({ className = '', imgClassName = '' }) {
  return (
    <img
      src="/app-icon.png?v=1024"
      alt="ንቁ"
      className={`h-10 w-10 rounded-[22%] object-cover ${imgClassName} ${className}`}
    />
  );
}
