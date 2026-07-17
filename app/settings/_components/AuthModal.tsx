import { CheckCircle2, ChevronRight, Eye, EyeOff } from "lucide-react";
import { BANNER_GRADIENTS } from "./constants";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  authStep: number;
  setAuthStep: (step: number) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  authRole: string;
  setAuthRole: (value: string) => void;
  authTheme: string;
  setAuthTheme: (value: string) => void;
  authSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function AuthModal({
  open,
  onClose,
  authStep,
  setAuthStep,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  showPassword,
  setShowPassword,
  authRole,
  setAuthRole,
  authTheme,
  setAuthTheme,
  authSuccess,
  onSubmit,
}: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="mind-modal-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <div className="mind-modal-panel-in w-full max-w-[460px] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col relative">

        {/* Modal Progress Indicator */}
        <div className="h-1 w-full bg-pill flex">
          <div
            style={{ transform: `scaleX(${authStep / 3})` }}
            className="h-full w-full origin-left bg-foreground transition-transform duration-[250ms] ease-[var(--ease-in-out)]"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-subtle hover:text-foreground text-xs font-mono border border-border rounded px-2 py-0.5 bg-neutral-900 hover:bg-pill transition cursor-pointer"
        >
          ESC
        </button>

        <div className="p-8 space-y-6">

          {/* Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-subtle uppercase">
              Step {authStep} of 3
            </span>
            <h3 className="text-lg font-bold font-mono uppercase text-foreground">
              {authStep === 1 && "Create Your Account"}
              {authStep === 2 && "Select Workspace Role"}
              {authStep === 3 && "Personalize Accent Theme"}
            </h3>
            <p className="text-xs text-subtle">
              {authStep === 1 && "Start archiving web layouts and screenshots in high-fidelity."}
              {authStep === 2 && "Help personalize your categories and feed recommendation system."}
              {authStep === 3 && "Select a brand profile banner to matching your custom dashboard."}
            </p>
          </div>

          {authSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="size-10 text-success animate-bounce" />
              <p className="text-sm font-semibold font-mono uppercase text-success">Workspace Synced!</p>
              <p className="text-[11px] text-subtle text-center">Your profile settings have been successfully updated.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">

              {/* Step 1: Login Credentials */}
              {authStep === 1 && (
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium text-muted">Work Email Address</span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. designer@agency.com"
                      className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                      required
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium text-muted">Password</span>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 pr-10 text-sm text-foreground outline-none focus:border-foreground/30 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-subtle hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </label>

                  {/* Mock Social SSO Auth (Savee/Vimeo styled) */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-mono"><span className="bg-surface px-2 text-subtle">Or continue with</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthEmail("github@auth.dev");
                        setAuthPassword("githubpass123");
                        setAuthStep(2);
                      }}
                      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/60 text-xs text-muted hover:bg-pill hover:text-foreground transition cursor-pointer"
                    >
                      <GithubIcon className="size-4" />
                      GitHub
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthEmail("google@auth.dev");
                        setAuthPassword("googlepass123");
                        setAuthStep(2);
                      }}
                      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-neutral-900/60 text-xs text-muted hover:bg-pill hover:text-foreground transition cursor-pointer"
                    >
                      <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Role Selection (Zeplin styled Cards) */}
              {authStep === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "designer", label: "Designer", desc: "Ui/ux layouts references" },
                    { id: "developer", label: "Developer", desc: "Front-end components" },
                    { id: "creator", label: "Creator", desc: "Content & design assets" },
                    { id: "manager", label: "Product Manager", desc: "Competitor benchmarks" }
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setAuthRole(role.id)}
                      className={`relative text-left p-3.5 rounded-lg border transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] ${
                        authRole === role.id ? "border-foreground bg-surface-elevated scale-[1.02] shadow-md" : "border-border bg-neutral-900/40 hover:border-neutral-700"
                      } cursor-pointer`}
                    >
                      <p className="text-xs font-semibold text-foreground font-mono uppercase">{role.label}</p>
                      <p className="text-[9px] text-subtle mt-1 leading-normal">{role.desc}</p>
                      {authRole === role.id && (
                        <span className="absolute top-2 right-2 size-2 rounded-full bg-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Accent Theme Selector */}
              {authStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {BANNER_GRADIENTS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setAuthTheme(b.id)}
                        className={`relative text-left p-2.5 rounded-lg border transition-[transform,background-color,border-color] duration-[160ms] ease-[var(--ease-out)] ${
                          authTheme === b.id ? "border-foreground bg-surface-elevated scale-[1.02]" : "border-border bg-neutral-900/40 hover:border-neutral-700"
                        } cursor-pointer`}
                      >
                        <div className={`h-8 w-full rounded-md ${b.class}`} />
                        <span className="text-[10px] font-mono uppercase font-semibold text-muted truncate block mt-2">{b.label}</span>
                        {authTheme === b.id && (
                          <span className="absolute top-2 right-2 size-2 rounded-full bg-foreground" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Live accent simulation preview box */}
                  <div className="p-3 border border-border bg-neutral-900/80 rounded-lg flex items-center justify-between text-[11px] font-mono">
                    <span className="text-subtle">Accent Simulation:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`size-3 rounded-full ${
                        authTheme === "aurora" ? "bg-teal-500" :
                        authTheme === "twilight" ? "bg-rose-500" :
                        authTheme === "ocean" ? "bg-blue-500" : "bg-neutral-100"
                      } animate-pulse`} />
                      <span className="text-foreground uppercase">{authTheme} active</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Nav Actions */}
              <div className="flex gap-2 pt-2">
                {authStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setAuthStep(authStep - 1)}
                    className="flex-1 h-9 border border-border text-xs font-semibold rounded-lg text-muted hover:bg-pill transition cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-[2] h-9 bg-pill-active text-pill-active-fg text-xs font-bold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  {authStep === 3 ? "Complete Sync" : "Continue"}
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
