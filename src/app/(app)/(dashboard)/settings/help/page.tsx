"use client";

import { useEffect, useState } from "react";
import Gradient5 from "../../../../../assets/images/gradients/5.jpg";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";
import { MailFillIcon } from "../icons";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { sendContactMessage } from "../../../../../lib/support/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Tab = "faq" | "contact";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Epoch Lag private? Who can see my stories?",
    a: "Yes — Epoch Lag is private by default. Only the people you explicitly share a story or album with can see it. Nothing is public unless you make it so.",
  },
  {
    q: "How is this different from social media?",
    a: "Social feeds move fast and get noisy. Epoch Lag is designed for slower, more meaningful sharing with the people who matter most, so your stories, voices, and memories stay close.",
  },
  {
    q: "How do I get my family on the platform?",
    a: "Invite them from any story or album, or send them a link from your profile. They just need to install the app and sign up to join your circle.",
  },
  {
    q: "How do I share a story / create an album?",
    a: "Tap the plus button on Home to start a new story or album. You can add photos, voice notes, or written entries, then share with individuals or groups.",
  },
  {
    q: "Can I connect with someone live for a demo of the app to better understand how to use?",
    a: "Yes — reach out via Contact Us and we&apos;ll set up a short walkthrough. We&apos;re happy to help anyone in your family get started.",
  },
  {
    q: "Can I use Epoch Lag with older family members who aren't as tech savvy?",
    a: "Absolutely — we designed the flows to be simple and forgiving. Voice notes, big buttons, and gentle prompts make it approachable for every generation.",
  },
  {
    q: "Will I be able to download / export my stories or content from the app?",
    a: "Yes. You can export your stories and media at any time from your account. Your memories are yours.",
  },
  {
    q: "What happens to my stories if I stop using the app?",
    a: "Your content stays safe on your account. You can pause, come back later, or export everything before deleting your account.",
  },
  {
    q: "What does the name Epoch Lag mean?",
    a: "The intentional pause between eras — not rushing into the next epoch, but lingering to absorb lessons, memories, and meaning from the last.",
  },
];

export default function HelpPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("faq");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  async function handleSend() {
    setError(null);
    setSuccess(null);
    if (!user?.lastName?.trim()) {
      setError("Add a last name to your profile before contacting support.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email.");
      return;
    }
    if (!message.trim()) {
      setError("Add a message.");
      return;
    }
    setSending(true);
    try {
      const msg = await sendContactMessage({
        firstName: user.firstName ?? "",
        lastName: user.lastName,
        email: email.trim(),
        message: message.trim(),
      });
      setSuccess(msg || "Message sent successfully!");
      setMessage("");
    } catch (e) {
      const apiMsg =
        typeof e === "object" && e && "message" in e
          ? (e as { message?: string }).message
          : undefined;
      setError(apiMsg || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Help and Support" />
      <HeroBanner src={Gradient5.src} />

      <div className="flex flex-col gap-[16px]">
        <h2 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Help and support
        </h2>

        <div className="inline-flex self-start bg-[#EDEDED] rounded-full p-[2px]">
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={`cursor-pointer px-[14px] py-[6px] rounded-full font-montserrat text-[13px] md:text-[14px] font-medium transition-colors ${
              tab === "faq"
                ? "bg-primary-blue text-white"
                : "text-primary-blue/70"
            }`}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => setTab("contact")}
            className={`cursor-pointer px-[14px] py-[6px] rounded-full font-montserrat text-[13px] md:text-[14px] font-medium transition-colors ${
              tab === "contact"
                ? "bg-primary-blue text-white"
                : "text-primary-blue/70"
            }`}
          >
            Contact Us
          </button>
        </div>

        {tab === "faq" ? (
          <div className="flex flex-col gap-[10px] max-w-[760px]">
            {FAQS.map((item, i) => {
              const open = openIdx === i;
              return (
                <div
                  key={i}
                  className="bg-[#F5F5F5] rounded-[14px] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="cursor-pointer w-full flex items-center justify-between gap-[12px] px-[16px] py-[14px] text-left"
                  >
                    <span className="font-montserrat text-primary-blue text-[13px] md:text-[14px]">
                      {item.q}
                    </span>
                    <span
                      className={`shrink-0 text-[#EF9849] transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="px-[16px] pb-[14px] font-montserrat text-primary-blue/80 text-[13px] leading-[160%]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-[12px] max-w-[600px]">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-full bg-[#F5F5F5] pl-[18px] pr-[48px] py-[14px] font-montserrat text-[14px] text-primary-blue outline-none focus:ring-2 focus:ring-[#EF9849]"
              />
              <MailFillIcon
                width={20}
                height={20}
                className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#092E4A] pointer-events-none"
              />
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your questions with us"
              rows={6}
              className="w-full rounded-[18px] bg-[#F5F5F5] px-[18px] py-[14px] font-montserrat text-[14px] text-primary-blue outline-none focus:ring-2 focus:ring-[#EF9849] resize-none"
            />
            {error && (
              <p className="font-montserrat text-[12px] text-[#D95F3B]">
                {error}
              </p>
            )}
            {success && (
              <p className="font-montserrat text-[13px] text-primary-blue">
                {success}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#EF9849] px-[28px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
