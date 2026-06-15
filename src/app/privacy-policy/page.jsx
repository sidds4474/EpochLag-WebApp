import PrivacyPolicy from "../../views/PrivacyPolicy/PrivacyPolicy";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Epoch Lag collects, uses, stores, and protects your personal data. We never sell your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function Page() {
  return <PrivacyPolicy />;
}
