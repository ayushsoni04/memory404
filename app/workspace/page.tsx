import { ScreenWorkspace } from "@/components/ScreenWorkspace";

export const metadata = {
  title: "Screen studio — memory404",
  description: "Configure digital LED screens like the loader",
};

export default function WorkspacePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <ScreenWorkspace />
    </div>
  );
}
