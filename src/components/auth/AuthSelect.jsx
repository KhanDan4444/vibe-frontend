import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Auth-themed single select — native <option> colors can't follow dark glass UI.
 */
export default function AuthSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  error = false,
  'aria-invalid': ariaInvalid,
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={ariaInvalid ?? error}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={[
          'auth-field flex w-full cursor-pointer items-center justify-between gap-2 text-left !mt-0',
          open ? '!border-[#0f766e]/70 !bg-white/[0.14] ring-2 ring-[#0f766e]/35' : '',
          error ? '!border-rose-400 ring-1 ring-rose-400/40' : '',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={selected ? 'truncate text-white' : 'truncate text-white/40'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180 text-[#5eead4]' : 'text-white/45'}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby={fieldId}
          className="absolute left-0 right-0 z-40 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/15 bg-[#0f172a] py-1.5 shadow-2xl ring-1 ring-white/10"
        >
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={[
                    'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-[#0f766e]/30 font-medium text-[#5eead4]'
                      : 'text-white hover:bg-white/10',
                  ].join(' ')}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-[#5eead4]" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
