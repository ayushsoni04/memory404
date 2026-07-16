import { ScreenWorkspace } from "@/components/ScreenWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screen editor",
  description: "Configure digital LED screens like the loader",
};

export default function WorkspacePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <ScreenWorkspace />
    </div>
  );
}
