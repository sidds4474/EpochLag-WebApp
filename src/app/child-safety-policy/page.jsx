import ChildSafetyPolicy from "../../views/ChildSafetyPolicy/ChildSafetyPolicy";

export const metadata = {
  title: "Child Safety Policy",
  description:
    "Epoch Lag's commitment to protecting minors and combating child sexual abuse and exploitation on our platform.",
  alternates: { canonical: "/child-safety-policy" },
};

export default function Page() {
  return <ChildSafetyPolicy />;
}
