import { Suspense } from "react";
import { googleOAuthConfigured } from "@/lib/google-oauth";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { SignupForm } from "./_components/SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a memory404 account to start archiving links.",
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignupForm googleEnabled={googleOAuthConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
