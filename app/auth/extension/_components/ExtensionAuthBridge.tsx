"use client";

import { useEffect } from "react";

type Props = {
  code: string;
};

/**
 * Landing page after Google OAuth for the Chrome extension.
 * The extension reads `code` from the URL and exchanges it for a Bearer token.
 */
export function ExtensionAuthBridge({ code }: Props) {
  const status = code.trim() ? "ready" : "missing";

  useEffect(() => {
    if (!code.trim()) return;
    // Mark the document for the extension content-script / executeScript probe.
    document.documentElement.dataset.m404ExtensionAuth = "ready";
    document.documentElement.dataset.m404ExtensionCode = code;
  }, [code]);

  return (
    <div className="w-full space-y-4 text-center">
      <h1 className="text-lg font-bold font-mono uppercase text-foreground">
        {status === "ready" ? "Signed in" : "Sign-in incomplete"}
      </h1>
      <p className="text-xs text-subtle">
        {status === "ready"
          ? "Return to the memory404 extension — this tab can close itself once the extension finishes."
          : "Open the extension and choose Continue with Google again."}
      </p>
    </div>
  );
}
