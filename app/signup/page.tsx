import { Suspense } from "react";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { SignupForm } from "./_components/SignupForm";

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
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
