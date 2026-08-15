"use client";

import { useRouter } from "next/navigation";
import AskComposer from "./AskComposer";

export default function NewAskPage() {
  const router = useRouter();
  return <AskComposer onBack={() => router.push("/new-story")} />;
}
