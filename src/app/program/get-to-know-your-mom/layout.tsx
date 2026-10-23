import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get to know your Mom, one question at a time",
  description:
    "Epoch Lag helps you get to know your mom, one question at a time. You send the questions, she answers with a voice message, photo, video or a few typed words, and her stories gather into a digital archive you'll keep forever. Join the waitlist.",
  openGraph: {
    type: "website",
    siteName: "Epoch Lag",
    title: "Epoch Lag — Get to know your Mom, one question at a time",
    description:
      "You send the questions. She answers them. Her stories gather into a digital archive you'll keep forever.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Epoch Lag — Get to know your Mom, one question at a time",
    description:
      "You send the questions. She answers them. Her stories gather into a digital archive you'll keep forever.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
