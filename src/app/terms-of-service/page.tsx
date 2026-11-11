import type { Metadata } from "next";
import LegalLayout, {
  type LegalSection,
  type LegalTocItem,
} from "../../views/HomePageV2/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Epoch Lag",
  description:
    "Read the terms that govern your use of Epoch Lag's services, applications, and platform.",
  alternates: { canonical: "/terms-of-service" },
};

const TOC: LegalTocItem[] = [
  { id: "tos-1", label: "1. Eligibility" },
  { id: "tos-2", label: "2. Use of the App" },
  { id: "tos-3", label: "3. Accounts" },
  { id: "tos-4", label: "4. Intellectual Property" },
  { id: "tos-5", label: "5. User Content" },
  { id: "tos-6", label: "6. User Responsibility" },
  { id: "tos-7", label: "7. Enforcement and Consequences" },
  { id: "tos-8", label: "8. Reporting and Moderation" },
  { id: "tos-9", label: "9. Content License" },
  { id: "tos-10", label: "10. SMS Notifications" },
  { id: "tos-11", label: "11. Our Child Safety Standards" },
  { id: "tos-12", label: "12. Your Agreement" },
  { id: "tos-13", label: "13. Payments & Subscriptions" },
  { id: "tos-14", label: "14. Privacy" },
  { id: "tos-15", label: "15. Disclaimers" },
  { id: "tos-16", label: "16. Limitation of Liability" },
  { id: "tos-17", label: "17. Termination" },
  { id: "tos-18", label: "18. Governing Law" },
  { id: "tos-19", label: "19. Changes" },
  { id: "tos-20", label: "20. Contact Us" },
];

const SECTIONS: LegalSection[] = [
  {
    id: "tos-1",
    title: "1. Eligibility",
    body: (
      <p>
        You must be at least 13 years old to use this app. By using the app,
        you represent that you meet this requirement.
      </p>
    ),
  },
  {
    id: "tos-2",
    title: "2. Use of the App",
    body: (
      <ul>
        <li>You may use the app only for lawful purposes.</li>
        <li>You agree not to misuse, disrupt, or interfere with the app.</li>
        <li>We may suspend or terminate your access if you violate these Terms.</li>
      </ul>
    ),
  },
  {
    id: "tos-3",
    title: "3. Accounts",
    body: (
      <>
        <p>If registration is required:</p>
        <ul>
          <li>You are responsible for maintaining the confidentiality of your account and password.</li>
          <li>You agree to provide accurate and up-to-date information.</li>
        </ul>
      </>
    ),
  },
  {
    id: "tos-4",
    title: "4. Intellectual Property",
    body: (
      <p>
        All content, features, and functionality in the app (including text,
        graphics, logos, and code) are owned by Epoch Lag, LLC and are
        protected by intellectual property laws. You may not copy, modify, or
        distribute them without permission.
      </p>
    ),
  },
  {
    id: "tos-5",
    title: "5. User Content",
    body: (
      <>
        <p>By using Epoch Lag, you agree to the following:</p>
        <p className="legal-sub">
          <strong>ZERO TOLERANCE POLICY</strong>
        </p>
        <p>
          Epoch Lag maintains zero tolerance for objectionable content.
          <br />
          The following are strictly prohibited:
        </p>
        <ul>
          <li>Hate speech, harassment, or bullying</li>
          <li>Sexually explicit or pornographic content</li>
          <li>Violence, threats, or content promoting harm</li>
          <li>Illegal activity or content infringing on others’ rights</li>
          <li>Spam, misinformation, or impersonation</li>
          <li>Content depicting or exploiting minors inappropriately</li>
        </ul>
      </>
    ),
  },
  {
    id: "tos-6",
    title: "6. User Responsibility",
    body: (
      <p>
        You are solely responsible for all content you create, upload, or
        share through Epoch Lag. You must ensure your content complies with
        these guidelines and all applicable laws.
      </p>
    ),
  },
  {
    id: "tos-7",
    title: "7. Enforcement and Consequences",
    body: (
      <>
        <p>Violations will result in immediate action:</p>
        <ul>
          <li>Content will be reviewed within 24 hours of discovery or report</li>
          <li>Content subject to dispute between parties thereafter</li>
          <li>First violation: Warning and content removal</li>
          <li>Second violation: Final warning</li>
          <li>Third violation: Permanent account suspension</li>
          <li>Severe violations: Immediate permanent ban without warning</li>
          <li>We will cooperate with law enforcement when required</li>
          <li>
            On notification of suspension the user will have 30 days to request
            human review before all data is permanently removed
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "tos-8",
    title: "8. Reporting and Moderation",
    body: (
      <ul>
        <li>Users can report inappropriate content using the in-app reporting feature</li>
        <li>Users can block other users who violate community standards</li>
        <li>All reports are reviewed within 24 hours, and action is taken on valid violations</li>
        <li>We respond to content reports promptly and remove violating content</li>
      </ul>
    ),
  },
  {
    id: "tos-9",
    title: "9. Content License",
    body: (
      <p>
        You retain ownership of your content. By sharing content on Epoch Lag,
        you grant us a non-exclusive, worldwide, royalty-free license to
        store, display, and transmit your content solely for the purpose of
        operating the app and providing services to you and users you’ve
        chosen to share with.
      </p>
    ),
  },
  {
    id: "tos-10",
    title: "10. SMS Notifications",
    body: (
      <>
        <p>
          By providing your mobile phone number and checking the SMS consent
          box during registration, you agree to receive text messages from
          Epoch Lag, including:
        </p>
        <ul>
          <li>Invitations from other users</li>
          <li>Notifications when content is shared with you</li>
          <li>Service updates and promotional messages</li>
        </ul>
        <p>
          <strong>Message Frequency:</strong> Varies based on your account activity
        </p>
        <p>
          <strong>Message and Data Rates:</strong> Standard carrier rates may apply
        </p>
        <p>
          <strong>Opt-Out:</strong> Text STOP to unsubscribe at any time
        </p>
        <p>
          <strong>Help:</strong> Text HELP for assistance
        </p>
        <p>
          You represent that you are the account holder or have permission to
          receive messages at the number provided.
        </p>
      </>
    ),
  },
  {
    id: "tos-11",
    title: "11. Our Child Safety Standards",
    body: (
      <>
        <p>
          EpochLag is committed to providing a safe environment for all users,
          including children. We have zero tolerance for child sexual abuse
          and exploitation (CSAE) content.
        </p>
        <p className="legal-sub">
          <strong>Our Standards:</strong>
        </p>
        <ul>
          <li>We prohibit any content that sexualizes, exploits, or endangers minors</li>
          <li>We prohibit grooming behavior or content that facilitates child exploitation</li>
          <li>We prohibit sharing of inappropriate content involving minors</li>
          <li>We use proactive measures to detect and remove violating content</li>
        </ul>
        <p className="legal-sub">
          <strong>Reporting:</strong>
        </p>
        <p>
          If you encounter any content that violates these standards, please
          report it immediately to:{" "}
          <a href="mailto:hello@epochlag.com">hello@epochlag.com</a>.
        </p>
        <p className="legal-sub">
          <strong>Enforcement:</strong>
        </p>
        <p>
          Violations will result in immediate account termination and reporting
          to the National Center for Missing &amp; Exploited Children (NCMEC)
          and appropriate law enforcement authorities.
        </p>
        <p>
          <strong>Last updated: February 2026</strong>
        </p>
      </>
    ),
  },
  {
    id: "tos-12",
    title: "12. Your Agreement",
    body: (
      <p>
        By clicking “I Agree” below, you confirm that you have read,
        understood, and agree to abide by these Community Guidelines. You
        acknowledge that violations may result in immediate account
        termination.
      </p>
    ),
  },
  {
    id: "tos-13",
    title: "13. Payments & Subscriptions",
    body: (
      <>
        <p>If and when the app offers paid features:</p>
        <ul>
          <li>Fees will be clearly disclosed before you purchase.</li>
          <li>Subscriptions will automatically renew unless you cancel before the billing period ends.</li>
        </ul>
      </>
    ),
  },
  {
    id: "tos-14",
    title: "14. Privacy",
    body: (
      <p>
        Your use of the app is also governed by our{" "}
        <a href="/privacy-policy">Privacy Policy</a> (linked on our site),
        which explains how we collect, use, and share your information.
      </p>
    ),
  },
  {
    id: "tos-15",
    title: "15. Disclaimers",
    body: (
      <p>
        The app is provided on an “as is” and “as available” basis. We make no
        warranties or guarantees of any kind. Use of the app is at your own
        risk.
      </p>
    ),
  },
  {
    id: "tos-16",
    title: "16. Limitation of Liability",
    body: (
      <p>
        To the maximum extent permitted by law, Epoch Lag is not liable for
        any damages arising from your use of the app.
      </p>
    ),
  },
  {
    id: "tos-17",
    title: "17. Termination",
    body: (
      <p>
        We may suspend or terminate your access at any time for violation of
        these Terms or other reasons.
      </p>
    ),
  },
  {
    id: "tos-18",
    title: "18. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of New York. Any disputes will
        be resolved in the courts of New York.
      </p>
    ),
  },
  {
    id: "tos-19",
    title: "19. Changes",
    body: (
      <p>
        We may update these Terms from time to time. If we make material
        changes, we will notify you by app notification/etc. Continued use
        after changes means you accept the new Terms.
      </p>
    ),
  },
  {
    id: "tos-20",
    title: "20. Contact Us",
    body: (
      <p>
        If you have any questions, contact us at:{" "}
        <a href="mailto:info@epochlag.com">info@epochlag.com</a>
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="February 2026"
      intro={
        <p>
          Welcome to Epoch Lag! By downloading, accessing, or using our app,
          you agree to these Terms of Service (“Terms”).
          <br />
          Please read them carefully. If you do not agree, do not use the app.
        </p>
      }
      toc={TOC}
      sections={SECTIONS}
      variant="compact"
      tocRows={10}
      wideIntro
    />
  );
}
