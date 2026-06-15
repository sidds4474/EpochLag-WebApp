import TermsOfService from "../../views/TermsOfService/TermsOfService";

export const metadata = {
  title: "Terms of Service",
  description:
    "Read the terms that govern your use of Epoch Lag's services, applications, and platform.",
  alternates: { canonical: "/terms-of-service" },
};

export default function Page() {
  return <TermsOfService />;
}
