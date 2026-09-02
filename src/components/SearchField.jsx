import { Search } from 'lucide-react';
import { placeholderDim, dimText } from '../utils/surfaceClasses';

/** Shared search control — same chrome as .app-field, leading icon. */
export default function SearchField({
  value,
  onChange,
  placeholder,
  id,
  label,
  className = '',
}) {
  return (
    <div className={`relative w-full ${className || 'sm:max-w-md'}`}>
      <span className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 ${dimText}`}>
        <Search className="h-5 w-5" aria-hidden />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className={`app-field block w-full pl-10 pr-4 ${placeholderDim}`}
      />
    </div>
  );
}
