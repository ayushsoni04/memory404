import { AlertTriangle } from "lucide-react";
import { AppLoader } from "@/components/AppLoader";

type DeactivateModalProps = {
  open: boolean;
  onClose: () => void;
  deactivateInput: string;
  setDeactivateInput: (value: string) => void;
  isDeactivating: boolean;
  deactivatedSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function DeactivateModal({
  open,
  onClose,
  deactivateInput,
  setDeactivateInput,
  isDeactivating,
  deactivatedSuccess,
  onSubmit,
}: DeactivateModalProps) {
  if (!open) return null;

  return (
    <div className="mind-modal-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="mind-modal-panel-in w-full max-w-[420px] rounded-xl border border-danger/35 bg-surface p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 text-danger">
          <AlertTriangle className="size-5" />
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider">Confirm Deactivation</h3>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          This action is <strong className="text-foreground">permanent</strong>. Your database links will be wiped and your configuration cleared from this browser session.
        </p>

        {deactivatedSuccess ? (
          <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-xs font-semibold text-center animate-pulse">
            Workspace wiped. Redirecting...
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-medium text-subtle font-mono uppercase">
                Type <code className="text-danger select-none">deactivate</code> to confirm
              </span>
              <input
                type="text"
                value={deactivateInput}
                onChange={(e) => setDeactivateInput(e.target.value)}
                placeholder="deactivate"
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground outline-none font-mono focus:border-danger/50"
                required
                disabled={isDeactivating}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeactivating}
                className="flex-1 h-8 text-xs font-medium border border-border rounded-lg text-muted hover:bg-pill transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deactivateInput !== "deactivate" || isDeactivating}
                className="flex-1 h-8 text-xs font-semibold bg-danger text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
              >
                {isDeactivating ? <AppLoader compact progressive label="deactivating" /> : "Wipe everything"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
