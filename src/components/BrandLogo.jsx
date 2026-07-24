/**
 * Brand mark for web chrome.
 * - lockup: icon + ንቁ (sidebar / header) — transparent PNG, sits on a dark chip so it works in light & dark
 * - icon: rounded app icon only (tight spaces)
 */
export default function BrandLogo({
  variant = 'lockup',
  className = '',
}) {
  if (variant === 'icon') {
    return (
      <img
        src="/brand-mark.png?v=blend"
        alt="ንቁ"
        className={`h-9 w-9 object-contain ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex max-w-full items-center rounded-xl bg-[#070f14] px-2.5 py-1.5 ring-1 ring-white/5 ${className}`}
    >
      <img
        src="/brand-lockup-nav.png?v=nav"
        alt="ንቁ"
        className="h-8 w-auto max-w-[10.5rem] object-contain object-left sm:h-9 sm:max-w-[11.5rem]"
      />
    </div>
  );
}
