import { Suspense } from "react";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your memory404 workspace.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
