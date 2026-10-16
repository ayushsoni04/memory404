import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
