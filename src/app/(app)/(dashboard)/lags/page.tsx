"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LagsPage() {
  const router = useRouter();
  // Lags is the redesign's name for the existing Library surface. Until we
  // rebuild the Library UI to match Figma, route users to /library so
  // navigation stays functional.
  useEffect(() => {
    router.replace("/library");
  }, [router]);
  return null;
}
