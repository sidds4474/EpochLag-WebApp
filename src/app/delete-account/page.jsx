import DeleteAccount from "../../views/DeleteAccount/DeleteAccount";

export const metadata = {
  title: "Delete Your Account",
  description:
    "How to delete your Epoch Lag account and permanently remove your personal data from our services.",
  alternates: { canonical: "/delete-account" },
};

export default function Page() {
  return <DeleteAccount />;
}
