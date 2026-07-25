import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "./_components/SignupForm";

export const metadata: Metadata = {
  title: "Sign up — memory404",
  description: "Create a memory404 account to start archiving links.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
