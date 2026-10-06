import { notFound } from "next/navigation";
import RouterTestClient from "./RouterTestClient";

// Dev-only harness for verifying pickInitialRoute across all 5 branches.
// Build-time gated: notFound() is called at request time in prod.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RouterTestClient />;
}
