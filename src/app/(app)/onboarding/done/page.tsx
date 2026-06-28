"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import FamilyPhoto from "../../../../assets/images/auth/family.jpg";

export default function DonePage() {
  const router = useRouter();

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
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.2,
            }}
            aria-hidden="true"
          >
            <svg
              width="57"
              height="57"
              viewBox="0 0 57 57"
              fill="none"
              stroke="#092E4A"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="28.5" cy="28.5" r="23.7" />
              <path d="M19.5 28.5 L26.5 35.5 L38 22.5" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
            className="mt-[20px] font-montserrat font-bold text-primary-blue text-[28px] md:text-[32px] leading-[110%]"
          >
            You&rsquo;re all set!
          </motion.h1>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.55 }}
            onClick={() => router.replace("/home")}
            className="cursor-pointer mt-[24px] h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] px-[28px] hover:opacity-90 transition-opacity"
          >
            Start creating memories
          </motion.button>
        </motion.div>
      </section>
    </main>
  );
}
