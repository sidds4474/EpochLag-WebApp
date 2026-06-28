"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import FamilyPhoto from "../../assets/images/auth/family.jpg";

type Props = {
  isOpen: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
  onAgree: () => void;
};

export default function LegalModal({
  isOpen,
  title,
  markdown,
  onClose,
  onAgree,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex bg-warm-cream"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
        >
          <div className="hidden md:block sticky top-0 self-start relative md:w-[42%] lg:w-[44%] xl:w-[46%] h-screen overflow-hidden">
            <Image
              src={FamilyPhoto}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 44vw, (min-width: 768px) 42vw, 0vw"
              className="object-cover object-center"
            />
          </div>

          <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex flex-col items-center justify-center px-[20px] md:px-[40px] py-[32px] md:py-[48px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
              className="w-full max-w-[643px] bg-primary-white rounded-[24px] flex flex-col px-[28px] md:px-[40px] py-[28px] md:py-[36px] h-[min(78vh,732px)]"
            >
              <h2
                id="legal-modal-title"
                className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-[110%]"
              >
                {title}
              </h2>

              <div className="legal-scroll mt-[16px] flex-1 overflow-y-auto pr-[12px] font-montserrat text-primary-blue text-[14px] md:text-[16px] leading-[160%]">
                <ReactMarkdown
                  components={{
                    p: (props) => <p className="my-[10px]" {...props} />,
                    h2: (props) => (
                      <h3
                        className="mt-[20px] mb-[8px] font-bold text-[16px] md:text-[18px]"
                        {...props}
                      />
                    ),
                    h3: (props) => (
                      <h4
                        className="mt-[14px] mb-[6px] font-semibold text-[15px] md:text-[16px]"
                        {...props}
                      />
                    ),
                    ul: (props) => (
                      <ul
                        className="my-[10px] pl-[20px] list-disc space-y-[6px]"
                        {...props}
                      />
                    ),
                    li: (props) => <li className="leading-[160%]" {...props} />,
                    em: (props) => (
                      <em className="not-italic opacity-70" {...props} />
                    ),
                    strong: (props) => (
                      <strong className="font-semibold" {...props} />
                    ),
                    a: ({ href, ...rest }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:opacity-80"
                        {...rest}
                      />
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 }}
              className="mt-[20px] md:mt-[28px] w-full max-w-[440px] flex items-center gap-[16px]"
            >
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer flex-1 h-[44px] border border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] rounded-[30px] hover:bg-primary-blue/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onAgree}
                className="cursor-pointer flex-1 h-[44px] bg-primary-orange text-primary-white font-montserrat font-medium text-[16px] rounded-[30px] hover:opacity-90 transition-opacity"
              >
                Agree
              </button>
            </motion.div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
