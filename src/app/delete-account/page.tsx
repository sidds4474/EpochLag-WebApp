import type { Metadata } from "next";
import DeletionLayout from "../../views/HomePageV2/DeletionLayout";

export const metadata: Metadata = {
  title: "Account Deletion — Epoch Lag",
  description:
    "How to delete your Epoch Lag account and permanently remove your personal data from our services.",
  alternates: { canonical: "/delete-account" },
};

const ROWS = [
  {
    title: "How users can delete their account",
    body: (
      <p>
        If you want to delete your EpochLag account and all associated data,
        please email us at:{" "}
        <a href="mailto:support@epochlag.com">support@epochlag.com</a>
        <br />
        Include your registered email address.
      </p>
    ),
  },
  {
    title: "What data will be deleted",
    body: (
      <ul>
        <li>Your account profile information and identifiers (such as your email and username).</li>
        <li>Content you created and associated records (such as posts, comments, media uploads, and other account content).</li>
        <li>Messages and direct-message history, if applicable.</li>
        <li>Account settings and preferences associated with your account.</li>
        <li>Other data linked to your account, including device and usage data collected for service operation.</li>
      </ul>
    ),
  },
  {
    title: "If any data is retained temporarily",
    body: (
      <>
        <p>Your account and all associated data will be permanently deleted within 30 days.</p>
        <p>
          During the deletion process, we may retain your data for a short
          period in secure systems and backups so we can complete request
          verification and safely remove your information. We may also retain
          limited information to comply with legal obligations or to resolve
          disputes, but this data will not be used to operate your account.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <DeletionLayout
      title="Account Deletion"
      lastUpdated="February 2026"
      rows={ROWS}
      note={
        <>
          If you have questions about account deletion, email{" "}
          <a href="mailto:support@epochlag.com">support@epochlag.com</a>.
        </>
      }
    />
  );
}
