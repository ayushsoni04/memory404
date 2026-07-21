import type { Metadata } from "next";
import { ScreenWorkspace } from "@/components/ScreenWorkspace";

export const metadata: Metadata = {
  title: "Screen editor",
  description: "Configure digital LED screens like the loader",
};

export default function ScreenWorkspacePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <ScreenWorkspace />
    </div>
  );
}
