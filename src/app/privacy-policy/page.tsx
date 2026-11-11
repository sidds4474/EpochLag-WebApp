import type { Metadata } from "next";
import LegalLayout, {
  type LegalSection,
  type LegalTocItem,
} from "../../views/HomePageV2/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Epoch Lag",
  description:
    "How Epoch Lag collects, uses, stores, and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

const TOC: LegalTocItem[] = [
  { id: "pp-collect", label: "1. Information We Collect" },
  { id: "pp-use", label: "2. How We Use Your Information" },
  { id: "pp-share", label: "3. How We Share Information" },
  { id: "pp-rights", label: "4. Your Rights Under GDPR & CCPA" },
  { id: "pp-security", label: "5. Data Security" },
  { id: "pp-retention", label: "6. Data Retention" },
  { id: "pp-transfers", label: "7. International Data Transfers" },
  { id: "pp-sms", label: "8. SMS Messaging and Notifications" },
  { id: "pp-changes", label: "9. Changes to this Policy" },
  { id: "pp-contact", label: "10. Contact Us" },
];

const SECTIONS: LegalSection[] = [
  {
    id: "pp-collect",
    title: "1. Information We Collect",
    body: (
      <>
        <p>We collect only the information necessary to provide and improve our Services:</p>
        <p className="legal-defs">
          <strong>Account Information:</strong> Name, username, email, phone number, and password.<br />
          <strong>Profile Content:</strong> Information you choose to share in your profile (e.g., bio, photo, interests).<br />
          <strong>User Content:</strong> Posts, comments, direct messages, media uploads.<br />
          <strong>Device &amp; Usage Data:</strong> IP address, device type, operating system, browser, app activity logs.<br />
          <strong>Optional Data:</strong> Location, contacts, or permissions you explicitly grant.
        </p>
      </>
    ),
  },
  {
    id: "pp-use",
    title: "2. How We Use Your Information",
    body: (
      <>
        <p>We use your information for:</p>
        <ul>
          <li>Delivering, maintaining, and improving our Services.</li>
          <li>Enabling safe and meaningful social interactions.</li>
          <li>Personalizing your experience.</li>
          <li>Detecting, preventing, and addressing security or fraud issues.</li>
          <li>Complying with legal obligations.</li>
        </ul>
        <p>We do not sell, rent, or trade your personal information.</p>
      </>
    ),
  },
  {
    id: "pp-share",
    title: "3. How We Share Information",
    body: (
      <>
        <p>We only share information in limited cases:</p>
        <ul>
          <li>We do not sell or “share” data for advertising purposes under CCPA definitions.</li>
          <li>With your consent: For example, when you choose to share content publicly or with other users.</li>
          <li>With service providers: Trusted vendors who help operate our Services (e.g., cloud hosting, analytics, moderation tools). They are bound by strict confidentiality and data protection obligations.</li>
          <li>For legal compliance: If required by law, or to protect rights, safety, or security.</li>
        </ul>
      </>
    ),
  },
  {
    id: "pp-rights",
    title: "4. Your Rights Under GDPR & CCPA",
    body: (
      <>
        <p>Under GDPR (EU/EEA users), you have the right to:</p>
        <ul>
          <li>Access your data.</li>
          <li>Correct inaccurate or incomplete data.</li>
          <li>Request deletion (“Right to be Forgotten”).</li>
          <li>Restrict or object to processing.</li>
          <li>Request data portability.</li>
          <li>Withdraw consent at any time.</li>
        </ul>
        <p>Under CCPA/CPRA (California users), you have the right to:</p>
        <ul>
          <li>Know what personal information we collect and how it is used.</li>
          <li>Request access to your data.</li>
          <li>Request deletion of your data.</li>
          <li>Correct inaccurate information.</li>
          <li>Opt out of “sale” or “sharing” of personal data (note: we do not sell or share data).</li>
          <li>Exercise non-discrimination for exercising your rights.</li>
        </ul>
        <p>
          To exercise your rights, contact us at:{" "}
          <a href="mailto:info@epochlag.com">info@epochlag.com</a>.
        </p>
      </>
    ),
  },
  {
    id: "pp-security",
    title: "5. Data Security",
    body: (
      <>
        <p>We protect your data:</p>
        <p>
          We do not share data with 3rd parties – with the exception of storing
          data on private and secure cloud storage services.
        </p>
        <p>
          While no system is 100% secure, we continually improve our security
          measures to keep your information safe.
        </p>
      </>
    ),
  },
  {
    id: "pp-retention",
    title: "6. Data Retention",
    body: (
      <>
        <p>We retain your personal data only as long as necessary to:</p>
        <ul>
          <li>Provide the Services.</li>
          <li>Meet legal, regulatory, and security obligations.</li>
          <li>Resolve disputes and enforce agreements.</li>
        </ul>
        <p>You may request deletion of your account and data at any time.</p>
      </>
    ),
  },
  {
    id: "pp-transfers",
    title: "7. International Data Transfers",
    body: (
      <p>
        If you access our Services outside your country, your data may be
        processed in regions with different data protection laws. We use
        safeguards such as Standard Contractual Clauses (SCCs) to protect your
        data when transferred internationally.
      </p>
    ),
  },
  {
    id: "pp-sms",
    title: "8. SMS Messaging and Notifications",
    body: (
      <>
        <p>
          When you create an account, you may choose to provide your mobile
          phone number and consent to receive SMS notifications. We use Twilio,
          a third-party service provider, to send these messages.
        </p>
        <p className="legal-sub">Information We Collect:</p>
        <ul className="legal-tight">
          <li>Mobile phone number</li>
          <li>Consent records and timestamps</li>
          <li>Message delivery status</li>
          <li>Opt-in/opt-out preferences</li>
        </ul>
        <p className="legal-sub">How We Use This Information:</p>
        <ul className="legal-tight">
          <li>Send account notifications when other users invite you or share content</li>
          <li>Send promotional messages about our service (if consented)</li>
          <li>Verify your phone number</li>
        </ul>
        <p className="legal-sub">Your Rights:</p>
        <ul className="legal-tight">
          <li>You can opt out at any time by texting STOP</li>
          <li>Standard message and data rates may apply</li>
          <li>Message frequency varies based on your account activity</li>
        </ul>
        <p>We retain SMS consent records for compliance purposes.</p>
      </>
    ),
  },
  {
    id: "pp-changes",
    title: "9. Changes to this Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. Significant
        updates will be communicated through the app or by email before taking
        effect.
      </p>
    ),
  },
  {
    id: "pp-contact",
    title: "10. Contact Us",
    body: (
      <>
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or your rights, please contact us at:{" "}
          <a href="mailto:info@epochlag.com">info@epochlag.com</a>
        </p>
        <p>
          If you are in California, you may also contact the California
          Privacy Protection Agency (CPPA).
          <br />
          Commitment to Privacy: Your trust is central to our mission. We do
          not sell your personal data and will always prioritize your security
          and privacy in everything we build.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="February 2026"
      intro={
        <>
          <p>
            Epoch Lag (“we,” “our,” or “us”) is committed to protecting your
            privacy and keeping your personal data secure. This Privacy Policy
            explains how we collect, use, store, and protect your information
            when you use our social media platform, mobile applications, and
            related services (“Services”).
          </p>
          <p>
            We take your privacy seriously. We will never sell your personal
            data to third parties.
          </p>
        </>
      }
      toc={TOC}
      sections={SECTIONS}
      tocRows={5}
    />
  );
}
