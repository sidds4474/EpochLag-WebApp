import type { Metadata } from "next";
import LegalLayout, {
  type LegalSection,
  type LegalTocItem,
} from "../../views/HomePageV2/LegalLayout";

export const metadata: Metadata = {
  title: "Child Safety Policy — Epoch Lag",
  description:
    "Epoch Lag's commitment to protecting minors and combating child sexual abuse and exploitation on our platform.",
  alternates: { canonical: "/child-safety-policy" },
};

const TOC: LegalTocItem[] = [
  { id: "cs-standards", label: "1. Our Standards" },
  { id: "cs-reporting", label: "2. Reporting" },
  { id: "cs-enforcement", label: "3. Enforcement" },
];

const SECTIONS: LegalSection[] = [
  {
    id: "cs-standards",
    title: "1. Our Standards",
    body: (
      <ul>
        <li>We prohibit any content that sexualizes, exploits, or endangers minors</li>
        <li>We prohibit grooming behavior or content that facilitates child exploitation</li>
        <li>We prohibit sharing of inappropriate content involving minors</li>
        <li>We use proactive measures to detect and remove violating content</li>
      </ul>
    ),
  },
  {
    id: "cs-reporting",
    title: "2. Reporting",
    body: (
      <p>
        If you encounter any content that violates these standards, please
        report it immediately to:{" "}
        <a href="mailto:info@epochlag.com">info@epochlag.com</a>.
      </p>
    ),
  },
  {
    id: "cs-enforcement",
    title: "3. Enforcement",
    body: (
      <p>
        Violations will result in immediate account termination and reporting
        to the National Center for Missing &amp; Exploited Children (NCMEC)
        and appropriate law enforcement authorities.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalLayout
      title="Child Safety Policy"
      lastUpdated="February 2026"
      intro={
        <p>
          EpochLag is committed to providing a safe environment for all users,
          including children. We have zero tolerance for child sexual abuse
          and exploitation (CSAE) content.
        </p>
      }
      toc={TOC}
      sections={SECTIONS}
      variant="short"
      tocRows={2}
    />
  );
}
