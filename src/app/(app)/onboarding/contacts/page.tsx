"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import FamilyPhoto from "../../../../assets/images/auth/family.jpg";
import AppStoreBadge from "../../../../assets/images/app-store-badge.svg";
import GooglePlayBadge from "../../../../assets/images/google-play-badge.svg";

const NEXT_ONBOARDING_STEP = "/onboarding/done";

type View = "default" | "download" | "qr";

export default function ContactsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("default");

  const qrTarget =
    typeof window !== "undefined"
      ? `${window.location.origin}/download`
      : "https://www.epochlag.com/download";

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
        <AnimatePresence mode="wait">
          {view === "default" && (
            <motion.div
              key="default"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%] max-w-[400px]">
                Epoch Lag is best enjoyed with friends and family
              </h1>
              <p className="mt-[14px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%] max-w-[400px]">
                Download the app to allow Epoch Lag to access your contacts and
                so you can easily invite them.
              </p>
              <div className="mt-[28px] w-full flex flex-wrap items-center justify-center gap-[12px]">
                <button
                  type="button"
                  onClick={() => setView("download")}
                  className="cursor-pointer h-[44px] border-[1.5px] border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] rounded-[30px] px-[20px] hover:bg-primary-blue/5 transition-colors"
                >
                  Download the app
                </button>
                <button
                  type="button"
                  onClick={() => router.replace(NEXT_ONBOARDING_STEP)}
                  className="cursor-pointer h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] px-[36px] hover:opacity-90 transition-opacity"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {view === "download" && (
            <motion.div
              key="download"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]">
                Download the app
              </h1>
              <p className="mt-[14px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%] max-w-[320px]">
                Select whether you&apos;d like to download the app on iOS or
                Android
              </p>

              <div className="mt-[28px] flex items-center justify-center gap-[16px]">
                <button
                  type="button"
                  onClick={() => setView("qr")}
                  className="block cursor-pointer"
                  aria-label="Download on the App Store"
                >
                  <img
                    src={AppStoreBadge.src}
                    alt="Download on the App Store"
                    className="h-[58px] w-auto"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setView("qr")}
                  className="block cursor-pointer"
                  aria-label="Get it on Google Play"
                >
                  <img
                    src={GooglePlayBadge.src}
                    alt="Get it on Google Play"
                    className="h-[58px] w-auto"
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setView("default")}
                className="cursor-pointer mt-[28px] h-[44px] border-[1.5px] border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] rounded-[30px] px-[36px] hover:bg-primary-blue/5 transition-colors"
              >
                Back
              </button>
            </motion.div>
          )}

          {view === "qr" && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[440px] flex flex-col items-center text-center"
            >
              <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]">
                Download the app
              </h1>
              <p className="mt-[14px] font-montserrat text-primary-blue text-[15px] md:text-[16px] leading-[140%] max-w-[320px]">
                Scan the QR code below to download this app on your phone.
              </p>

              <div className="mt-[24px] bg-primary-white p-[14px] rounded-[14px] border border-primary-blue/10">
                <QRCodeSVG
                  value={qrTarget}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#092e4a"
                  bgColor="#ffffff"
                />
              </div>

              <button
                type="button"
                onClick={() => setView("download")}
                className="cursor-pointer mt-[28px] h-[44px] border-[1.5px] border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] rounded-[30px] px-[36px] hover:bg-primary-blue/5 transition-colors"
              >
                Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
