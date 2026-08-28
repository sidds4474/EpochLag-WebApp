"use client";

import { useState } from "react";
import { subscribeToNewsletter } from "../../lib/newsletter/api";

// Compact subscribe CTA for the bottom of the archive index and each
// issue page. Same rules as the landing form: loose email check, only
// documented fields on the wire, uniform success copy (no branching on
// alreadySubscribed), disable while in flight, no auto-retry.

function looksLikeEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}

type Status = "idle" | "submitting" | "success" | "error";

type Props = { source?: string };

const ArchiveSubscribeCTA = ({ source = "archive_footer" }: Props) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    const trimmed = email.trim();
    if (!looksLikeEmail(trimmed)) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    const result = await subscribeToNewsletter({ email: trimmed, source });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.message);
    }
  }

  return (
    <section className="bg-[#FDE6C9] rounded-[24px] px-[20px] md:px-[40px] py-[36px] md:py-[48px] max-w-[880px] mx-auto text-center">
      {status === "success" ? (
        <div className="flex flex-col items-center gap-[12px]">
          <span className="w-[48px] h-[48px] rounded-full bg-primary-orange flex items-center justify-center">
            <svg width="20" height="16" viewBox="0 0 25 18" fill="none" aria-hidden="true">
              <path d="M1.5 8L9 15.5L23 1.5" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="font-ivy font-bold text-primary-blue text-[28px] md:text-[32px] leading-[110%]">
            You&rsquo;re on the list
          </h2>
          <p className="font-montserrat text-primary-blue text-[14px] leading-[160%] max-w-[420px]">
            See you in your inbox soon.
          </p>
        </div>
      ) : (
        <>
          <h2 className="font-ivy font-bold text-primary-blue text-[28px] md:text-[36px] leading-[110%]">
            Get the next issue
          </h2>
          <p className="mt-[10px] font-montserrat text-primary-blue/80 text-[14px] md:text-[15px] leading-[160%] max-w-[520px] mx-auto">
            Prompts, stories, and updates delivered now and then — no spam,
            unsubscribe anytime.
          </p>
          <form onSubmit={handleSubmit} className="mt-[24px] max-w-[560px] mx-auto">
            <div className="bg-white rounded-full h-[54px] pl-[20px] pr-[6px] flex items-center gap-[8px] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMessage("");
                  }
                }}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={status === "submitting"}
                aria-label="Email address"
                className="flex-1 min-w-0 bg-transparent outline-none font-montserrat text-[14px] md:text-[15px] text-primary-blue placeholder:text-primary-blue/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="cursor-pointer bg-primary-orange text-white rounded-full h-[42px] px-[22px] md:px-[28px] font-montserrat font-semibold text-[14px] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              >
                {status === "submitting" ? "…" : "Subscribe"}
              </button>
            </div>
            {status === "error" && errorMessage && (
              <p role="alert" className="mt-[10px] font-montserrat text-[13px] text-[#D95F3B]">
                {errorMessage}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
};

export default ArchiveSubscribeCTA;
