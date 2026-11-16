import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { NixieLab } from "@/components/workspace/nixie/NixieLab";

export const metadata: Metadata = {
  title: "Nixie counter lab",
  description: "Your link count on three.js nixie tubes, and how the digits change",
};

export default function NixieLabPage() {
  const lab = getLab("nixie")!;
  return (
    <div className="art-clear flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome lab={lab}>
        <NixieLab />
      </WorkspaceChrome>
    </div>
  );
}
