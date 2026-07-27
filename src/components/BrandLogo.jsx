import { Link } from 'react-router-dom';

/**
 * Brand mark for web chrome — icon + ንቁ + slogan.
 * No heavy frame — transparent lockup blends with the sidebar.
 */
export default function BrandLogo({
  variant = 'lockup',
  to,
  onClick,
  className = '',
}) {
  const img =
    variant === 'icon' ? (
      <img
        src="/brand-mark.png?v=restore"
        alt="ንቁ"
        className={`h-9 w-9 object-contain ${className}`}
      />
    ) : (
      <img
        src="/brand-lockup.png?v=slogan"
        alt="ንቁ — Get up, Do It, Be Active"
        className={`h-[3.85rem] w-auto max-w-[16.5rem] object-contain object-left sm:h-[4.15rem] sm:max-w-[17.5rem] ${className}`}
      />
    );

  if (!to) return img;

  return (
    <Link
      to={to}
      onClick={onClick}
      className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="ንቁ — Dashboard"
    >
      {img}
    </Link>
  );
}
