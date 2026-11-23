"use client";

import { useEffect, useState } from "react";
import PanelMobileHeader from "../PanelMobileHeader";
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

function UnderlinedField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: "text" | "email";
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="font-montserrat text-[#2c2c2c] text-[14px]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full bg-transparent border-b border-[#2c2c2c]/35 px-[2px] py-[8px] font-montserrat text-[15px] text-[#232323] outline-none focus:border-primary-orange"
      />
    </div>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("faq");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    if (fullName) setName(fullName);
  }, [user?.email, user?.firstName, user?.lastName]);

  async function handleSend() {
    setError(null);
    setSuccess(null);
    // Split the single "Name" field back into first / last for the BE —
    // first token is first name, everything after is the last name, so
    // typing "Jane" alone falls through to a last-name validation error.
    const trimmedName = name.trim();
    const spaceIdx = trimmedName.indexOf(" ");
    const firstName =
      spaceIdx === -1 ? trimmedName : trimmedName.slice(0, spaceIdx);
    const lastName = spaceIdx === -1 ? "" : trimmedName.slice(spaceIdx + 1).trim();
    if (!firstName || !lastName) {
      setError("Enter your full name.");
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
        firstName,
        lastName,
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

      <div className="flex flex-col max-w-[760px]">
        <h1 className="hidden md:block font-ivy font-normal text-[#232323] text-[24px] md:text-[28px] leading-[1.15]">
          Help and Support
        </h1>
        <div className="hidden md:block mt-[16px] mb-[20px] border-t border-black/10" />

        {/* Toggle pills */}
        <div className="flex items-center gap-[8px] mb-[20px]">
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={`cursor-pointer px-[20px] py-[9px] rounded-full font-montserrat font-medium text-[14px] transition-colors ${
              tab === "faq"
                ? "bg-primary-orange text-white"
                : "bg-[#E8E6DF] text-[#232323] hover:bg-[#dcd8ca]"
            }`}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => setTab("contact")}
            className={`cursor-pointer px-[20px] py-[9px] rounded-full font-montserrat font-medium text-[14px] transition-colors ${
              tab === "contact"
                ? "bg-primary-orange text-white"
                : "bg-[#E8E6DF] text-[#232323] hover:bg-[#dcd8ca]"
            }`}
          >
            Contact Us
          </button>
        </div>

        {tab === "faq" ? (
          <div className="flex flex-col">
            {FAQS.map((item, i) => {
              const open = openIdx === i;
              return (
                <div
                  key={i}
                  className="border-b border-black/10 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="cursor-pointer w-full flex items-start justify-between gap-[16px] py-[16px] text-left"
                  >
                    <span className="font-montserrat text-[#232323] text-[14px] md:text-[15px] leading-[150%] flex-1 min-w-0">
                      {item.q}
                    </span>
                    <span
                      className={`shrink-0 text-[#848484] transition-transform ${
                        open ? "rotate-45" : ""
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 3v12M3 9h12"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="pb-[16px] font-montserrat text-[#2c2c2c] text-[13px] md:text-[14px] leading-[160%]">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-[22px] max-w-[600px]">
            <UnderlinedField
              label="Name"
              value={name}
              onChange={setName}
              type="text"
              autoComplete="name"
            />
            <UnderlinedField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
            <div className="flex flex-col gap-[6px]">
              <label className="font-montserrat text-[#2c2c2c] text-[14px]">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-[10px] bg-transparent border border-[#2c2c2c]/35 px-[14px] py-[12px] font-montserrat text-[14px] text-[#232323] outline-none focus:border-primary-orange focus:ring-0 resize-none"
              />
            </div>
            {error && (
              <p className="font-montserrat text-[12px] text-[#D95F3B]">
                {error}
              </p>
            )}
            {success && (
              <p className="font-montserrat text-[13px] text-[#232323]">
                {success}
              </p>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full cursor-pointer font-montserrat font-semibold text-white bg-primary-orange rounded-full py-[14px] text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
