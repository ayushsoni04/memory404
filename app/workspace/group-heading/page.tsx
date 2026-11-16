import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { GroupHeadingLab } from "@/components/workspace/group-heading/GroupHeadingLab";

export const metadata: Metadata = {
  title: "Group heading lab",
  description: "Four ways to show the open group's name at the top of the library",
};

export default function GroupHeadingLabPage() {
  const lab = getLab("group-heading")!;
  return (
    <div className="art-clear flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome lab={lab}>
        <GroupHeadingLab />
      </WorkspaceChrome>
    </div>
  );
}
