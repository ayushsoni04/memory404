import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { ExtensionAuthBridge } from "./_components/ExtensionAuthBridge";

export const metadata: Metadata = {
  title: "Extension sign-in",
  description: "Finish signing in to the memory404 Chrome extension.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ code?: string }>;
};

export default async function ExtensionAuthPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";

  return (
    <AuthShell>
      <ExtensionAuthBridge code={code} />
    </AuthShell>
  );
}
