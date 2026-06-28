"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-warm-cream flex items-center justify-center">
        <p className="font-montserrat text-primary-blue text-[14px] opacity-70">
          Loading…
        </p>
      </main>
    );
  }
  return <>{children}</>;
}
