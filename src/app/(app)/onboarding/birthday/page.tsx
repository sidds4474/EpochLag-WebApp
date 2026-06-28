"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import FamilyPhoto from "../../../../assets/images/auth/family.jpg";
import FormError from "../../../../components/FormError/FormError";
import { updateDateOfBirth } from "../../../../lib/auth/api";

const NEXT_ONBOARDING_STEP = "/onboarding/phone";

function isValidBirthday(value: string): string | null {
  if (!value) return "Please pick your date of birth.";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "That date doesn't look right.";
  const today = new Date();
  if (date > today) return "Date of birth can't be in the future.";
  const minAge = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate()
  );
  if (date > minAge) return "You must be at least 13 years old to use Epoch Lag.";
  const earliest = new Date(today.getFullYear() - 120, 0, 1);
  if (date < earliest) return "That date doesn't look right.";
  return null;
}

export default function BirthdayPage() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch(NEXT_ONBOARDING_STEP);
  }, [router]);

  const handleNext = () => {
    const err = isValidBirthday(dob);
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError(null);
    // Fire-and-forget — UI navigates immediately so the next step feels instant.
    // Birthday is low-stakes; on failure the user can update it from settings later.
    updateDateOfBirth(dob).catch((e) => {
      console.error("Failed to save date of birth:", e);
    });
    router.replace(NEXT_ONBOARDING_STEP);
  };

  const handleSkip = () => {
    router.replace(NEXT_ONBOARDING_STEP);
  };

  return (
    <main className="min-h-screen w-full flex bg-warm-cream items-stretch">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden md:block sticky top-0 self-start relative md:w-[42%] lg:w-[44%] xl:w-[46%] h-screen overflow-hidden"
      >
        <Image
          src={FamilyPhoto}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 44vw, (min-width: 768px) 42vw, 0vw"
          className="object-cover object-center"
        />
      </motion.div>

      <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex items-center justify-center px-[20px] md:px-[40px] py-[40px] md:py-[64px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-[420px] flex flex-col items-center text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]"
          >
            When is your Birthday?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="mt-[10px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%] max-w-[400px]"
          >
            Your Friends &amp; Family will receive notifications on your birthday.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
            className="mt-[28px] w-full"
          >
            <input
              type="date"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              max={new Date().toISOString().slice(0, 10)}
              className="dob-input w-full bg-primary-white rounded-full px-[20px] py-[12px] font-montserrat font-medium text-primary-blue text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
            />
            {fieldError && <FormError message={fieldError} />}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
            className="mt-[24px] w-full max-w-[226px] flex flex-col items-center gap-[16px]"
          >
            <button
              type="button"
              onClick={handleNext}
              className="cursor-pointer w-full h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="cursor-pointer flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[16px] hover:opacity-80 transition-opacity"
            >
              <span>Skip</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
