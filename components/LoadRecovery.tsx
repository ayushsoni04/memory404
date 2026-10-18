import {
  isSessionExpiredMessage,
  sessionSignInHref,
} from "@/lib/session-recovery";

const recoveryClass =
  "inline-flex h-8 items-center justify-center rounded-full bg-pill-active px-3 text-[13px] font-medium text-pill-active-fg transition-[transform,opacity] duration-[var(--duration-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]";

type LinkProps = {
  message: string | null | undefined;
  returnPath: string;
  className?: string;
};

/** A sign-in link when retrying cannot bring the session back. */
export function SessionSignInLink({ message, returnPath, className }: LinkProps) {
  if (!isSessionExpiredMessage(message)) return null;
  return (
    <a href={sessionSignInHref(returnPath)} className={className ?? recoveryClass}>
      Sign in
    </a>
  );
}

type Props = LinkProps & {
  onRetry: () => void;
};

/**
 * Retry a failed load, or sign in when the session is the reason it failed.
 */
export default function LoadRecovery({
  message,
  returnPath,
  onRetry,
  className,
}: Props) {
  if (isSessionExpiredMessage(message)) {
    return (
      <SessionSignInLink
        message={message}
        returnPath={returnPath}
        className={className}
      />
    );
  }
  return (
    <button type="button" onClick={onRetry} className={className ?? recoveryClass}>
      Retry
    </button>
  );
}
