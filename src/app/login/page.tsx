import { Suspense } from "react";
import { AuthCard } from "@/components/dashboard/AuthCard";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthCard mode="login" />
    </Suspense>
  );
}