import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { GroupToolbarLab } from "@/components/workspace/group-toolbar/GroupToolbarLab";

export const metadata: Metadata = {
  title: "Group toolbar lab",
  description:
    "Sandbox VaultGroupToolbar across breakpoints with editable values and a copyable change prompt",
};

export default function GroupToolbarLabPage() {
  const lab = getLab("group-toolbar")!;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome lab={lab}>
        <GroupToolbarLab />
      </WorkspaceChrome>
    </div>
  );
}
