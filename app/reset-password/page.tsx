import { Suspense } from "react";
import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
