/**
 * Login brand — transparent lockup (no black app-icon plate).
 * Blends into the raised card; slogan included under the mark.
 */
export default function LoginBrandPanel() {
  return (
    <div className="mb-5 flex flex-col items-center text-center animate-in fade-in duration-500">
      <img
        src="/brand-lockup.png?v=login-blend"
        alt="ንቁ — Get up, Do It, Be Active"
        className="h-[4.5rem] w-auto max-w-[15.5rem] object-contain object-center sm:h-20 sm:max-w-[17rem]"
      />
    </div>
  );
}
