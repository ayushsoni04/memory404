import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { CounterLab } from "@/components/workspace/counter/CounterLab";

export const metadata: Metadata = {
  title: "Counter lab",
  description: "Alternatives to the library's link-count odometer",
};

export default function CounterLabPage() {
  const lab = getLab("counter")!;
  return (
    <div className="art-clear flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome lab={lab}>
        <CounterLab />
      </WorkspaceChrome>
    </div>
  );
}
