import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free MediBook account to book verified doctors across Pakistan.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-xl" />}>
      <RegisterForm />
    </Suspense>
  );
}
