"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import CtaBgCircle from "../../../assets/images/cta-bg-circle.svg";
import { subscribeToNewsletter } from "../../../lib/newsletter/api";

// Loose "looks like email" check only — server accepts unusual TLDs
// (.marketing, .photography) that stricter regexes reject, so an
// over-eager client-side pattern silently blocks signups the backend
// would have happily taken.
function looksLikeEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}

type Status = "idle" | "submitting" | "success" | "error";

const NewsletterSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    const result = await subscribeToNewsletter({
      email: trimmed,
      source: "landing_newsletter_form",
    });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.message);
    }
  }

  return (
    <section
      id="newsletter"
      ref={sectionRef}
      className="relative w-full overflow-visible bg-[#FDE6C9] px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[36px] md:py-[48px] lg:py-[64px]"
    >
      {/* Decorative circle bleeding into the FAQ above */}
      <img
        src={CtaBgCircle.src}
        alt=""
        aria-hidden="true"
        className="hidden lg:block pointer-events-none absolute left-0 -translate-x-[5%] top-0 -translate-y-[50%] w-[280px] 2xl:w-[325px] h-auto z-[1]"
      />
      {status === "success" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-[2] max-w-[720px] mx-auto text-center flex flex-col items-center gap-[16px]"
        >
          <span className="w-[56px] h-[56px] rounded-full bg-primary-orange flex items-center justify-center">
            <svg
              width="25"
              height="18"
              viewBox="0 0 25 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M1.5 8L9 15.5L23 1.5"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="font-ivy font-bold text-primary-blue text-[32px] md:text-[40px] lg:text-[46px] leading-[110%]">
            You&rsquo;re on the list
          </h2>
          <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
            We&rsquo;ll send updates to your email now and then. Check your
            inbox to confirm.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-[2] max-w-[820px] mx-auto text-center"
        >
          <h2 className="font-ivy font-bold text-primary-blue text-[32px] md:text-[40px] lg:text-[46px] leading-[110%]">
            Stay in the loop
          </h2>
          <p className="mt-[12px] font-montserrat text-primary-blue/80 text-[14px] md:text-[15px] leading-[160%]">
            Get our latest updates and ideas delivered now and then — no spam,
            unsubscribe anytime.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-[28px] md:mt-[32px] max-w-[700px] mx-auto"
          >
            <div className="bg-white rounded-full h-[56px] md:h-[60px] pl-[20px] pr-[6px] flex items-center gap-[8px] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
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
                className="flex-1 min-w-0 bg-transparent outline-none font-montserrat text-[14px] md:text-[15px] text-primary-blue placeholder:text-primary-blue/40 disabled:opacity-50"
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="cursor-pointer bg-primary-orange text-white rounded-full h-[44px] md:h-[48px] px-[24px] md:px-[32px] font-montserrat font-semibold text-[14px] md:text-[15px] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              >
                {status === "submitting" ? "…" : "Subscribe"}
              </button>
            </div>
            {status === "error" && errorMessage && (
              <p
                role="alert"
                className="mt-[12px] font-montserrat text-[13px] text-[#D95F3B]"
              >
                {errorMessage}
              </p>
            )}
          </form>

          {/* TODO: enable "View our newsletters" link once the archive page exists.
          <a
            href="/newsletters"
            className="mt-[16px] inline-flex items-center gap-[6px] font-montserrat text-primary-blue text-[14px] hover:opacity-80 transition-opacity"
          >
            View our newsletters
            <span aria-hidden="true">→</span>
          </a>
          */}
        </motion.div>
      )}
    </section>
  );
};

export default NewsletterSection;
