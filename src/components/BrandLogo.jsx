/**
 * Brand mark — Niku lockup (sidebar / header) or icon-only (compact).
 */
export default function BrandLogo({
  variant = 'lockup',
  className = '',
  imgClassName = '',
}) {
  if (variant === 'icon') {
    return (
      <img
        src="/app-icon.png"
        alt=""
        className={`h-9 w-9 rounded-full object-cover ${imgClassName} ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src="/brand-logo.png"
      alt="ንቁ"
      className={`h-10 w-auto max-w-[11rem] object-contain object-left ${imgClassName} ${className}`}
    />
  );
}
