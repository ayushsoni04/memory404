import type { Metadata } from "next";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { WorkspaceIndex } from "@/components/workspace/WorkspaceIndex";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Manual labs for motion and UI experiments",
};

export default function WorkspacePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <WorkspaceChrome>
        <WorkspaceIndex />
      </WorkspaceChrome>
    </div>
  );
}
