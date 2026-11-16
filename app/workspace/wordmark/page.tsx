import type { Metadata } from "next";
import { Kaushan_Script } from "next/font/google";
import { WorkspaceChrome } from "@/components/workspace/WorkspaceChrome";
import { getLab } from "@/components/workspace/labs";
import { WordmarkLab } from "@/components/workspace/wordmark/WordmarkLab";

/** Connected brush script for the sprayed word. */
const spray = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-spray",
});

export const metadata: Metadata = {
  title: "Wordmark lab",
  description: "memory 404 spray-painted over a serif paragraph",
};

export default function WordmarkLabPage() {
  const lab = getLab("wordmark")!;
  return (
    <div className={`art-clear flex min-h-full flex-1 flex-col bg-background ${spray.variable}`}>
      <WorkspaceChrome lab={lab}>
        <WordmarkLab />
      </WorkspaceChrome>
    </div>
  );
}
