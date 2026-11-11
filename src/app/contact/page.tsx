import type { Metadata } from "next";
import ContactView from "./ContactView";

export const metadata: Metadata = {
  title: "Contact Us — Epoch Lag",
  description:
    "Have a question or need help? Contact Epoch Lag anytime — we’re here for you.",
};

export default function Page() {
  return <ContactView />;
}
