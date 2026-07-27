import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
