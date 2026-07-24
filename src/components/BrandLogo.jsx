/**
 * Brand mark for web chrome — icon + ንቁ + slogan.
 * No heavy frame — transparent lockup blends with the sidebar.
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
    <img
      src="/brand-lockup.png?v=slogan"
      alt="ንቁ — Get up, Do It, Be Active"
      className={`h-14 w-auto max-w-[15rem] object-contain object-left sm:h-[3.75rem] sm:max-w-[16rem] ${className}`}
    />
  );
}
