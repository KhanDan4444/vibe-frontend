/**
 * Desktop login left panel — quiet gym photo, no copy overlay.
 * Brand mark stays above the form on the right.
 */
export default function LoginBrandAside() {
  return (
    <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0b1220] lg:block lg:w-[48%]">
      <img
        src="/login-gym.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_40%] brightness-[0.85] saturate-[0.7]"
        decoding="async"
      />
      {/* Very light teal tint + edge blend into the form column */}
      <div className="absolute inset-0 bg-teal-950/25" aria-hidden />
      <div
        className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0b1220] to-transparent"
        aria-hidden
      />
    </aside>
  );
}
