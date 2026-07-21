import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { TextSwapLab } from "@/components/workspace/text-swap/TextSwapLab";

export const metadata: Metadata = {
  title: "Text swap lab",
  description: "Sandbox and case runner for vault TextSwap enter animations",
};

export default function TextSwapLabPage() {
  const lab = getLab("text-swap")!;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome lab={lab}>
        <TextSwapLab />
      </WorkspaceChrome>
    </div>
  );
}
