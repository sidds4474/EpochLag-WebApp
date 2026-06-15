"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import FaqPlus from "../../../assets/images/faq-plus.png";
import FaqMinus from "../../../assets/images/faq-minus.png";
import ContactModal from "./ContactModal";

const faqs = [
  {
    question: "Is Epoch Lag private? Who can see my stories?",
    answer:
      "Epoch Lag is private. There is no public or broader feed. Only people with whom you share stories or prompts with, are able to view those stories or prompts. To ensure that anyone you share a story or prompt with can not re-send the story or prompt, you can select to keep it locked (toggle the privacy settings).",
  },
  {
    question: "How is this different from social media?",
    answer:
      "Epoch Lag is social media in the sense that you can use Epoch Lag for media (storytelling) and to be social (connecting and sharing meaningful memories and stories with Friends and Family). You can upload videos, audio recordings, photos. And you can share with friends and family. The main differences are that Epoch Lag is private, we do not store or harvest your data, we are not advertising driven, and we offer a subscription model to ensure we maintain an emphasis always on the best experience for people using our products.",
  },
  {
    question: "How do I get my family on the platform?",
    answer:
      "Through the Friends & Family tab (the last tab on the right) you can connect with family and friends who are members of Epoch Lag. Through the tab you can connect with them, and you can invite them to join. You can also refer family members and friends, offering them a referral bonus that enables them to try the app.",
  },
  {
    question: "How do I share a story / create an album?",
    answer:
      'You can share a story by clicking on the send icon button at the bottom of a story, then selecting who you would like to share it with. You can always share a story further by clicking on the three dots ("...") in the top right corner of a story. To create an album, you can click the three dots ("...") in the top right of a story and select "Add to album" or "Create an album".',
  },
  {
    question:
      "Can I connect with someone live for a demo of the app to better understand how to use?",
    answer:
      "Absolutely! We love to connect with people who are using Epoch Lag! Please email hello@epochlag.com for a demo or to connect with someone live for a discussion about how to use the app. We would love to hear from you so don't hesitate to reach out and we will set up time.",
  },
  {
    question:
      "Can I use Epoch Lag with older family members who aren't as tech savvy?",
    answer:
      "Epoch Lag is intended to be inter-generational and easy to use. We are always more than happy to connect with you or any one of your family members or friends who would like a walk-through of the product and how to best use. We also welcome feedback and would love to hear suggestions or thoughts for how to make it more intuitive or simpler to use. Please feel free to email hello@epochlag.com to have a call to discuss further, or to share any feedback or suggestions.",
  },
  {
    question:
      "Will I be able to download / export my stories or content from the app?",
    answer:
      "Yes — you will always be able to download or export stories from the app.",
  },
  {
    question: "What happens to my stories if I stop using the app?",
    answer:
      "If you remove or delete your account and stop using the app, your stories will be stored for one year. For your own privacy and security, after one year we remove your stories.",
  },
  {
    question: "What does the name Epoch Lag mean?",
    answer:
      "Pronounced: ˈe-pək' lag; or epic lag. Epoch Lag represents the intentional pause between eras — not rushing into the next epoch, but lingering to absorb lessons, memories, or meaning from the last. It's an acknowledgment that progress doesn't erase the past, and that carrying pieces of an older epoch into the new one brings continuity, depth, and meaning.",
  },
];

const FaqItem = ({ faq, isOpen, onToggle }) => {
  return (
    <div
      className={`rounded-[12px] md:rounded-[14px] px-[20px] md:px-[24px] 2xl:px-[28px] transition-colors ${
        isOpen ? "bg-primary-white shadow-sm" : "bg-primary-white"
      }`}
    >
      <button
        onClick={onToggle}
        className="cursor-pointer w-full flex items-center justify-between py-[14px] md:py-[16px] 2xl:py-[18px] text-left gap-[16px]"
      >
        <span
          className={`font-montserrat text-primary-blue text-[14px] md:text-[15px] 2xl:text-[16px] leading-[150%] ${
            isOpen ? "font-bold" : "font-medium"
          }`}
        >
          {faq.question}
        </span>
        <img
          src={isOpen ? FaqMinus.src : FaqPlus.src}
          alt={isOpen ? "Collapse" : "Expand"}
          className="shrink-0 w-[16px] h-[16px] md:w-[18px] md:h-[18px]"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-[16px] md:pb-[20px] font-montserrat text-primary-blue/70 text-[13px] md:text-[14px] 2xl:text-[15px] font-normal leading-[170%]">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <section
      ref={sectionRef}
      className="w-full bg-warm-cream px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[16px] md:py-[60px] lg:py-[100px] 2xl:py-[120px]"
    >
      <div className="w-full flex flex-col lg:flex-row gap-[40px] lg:gap-[48px] xl:gap-[80px] 2xl:gap-[100px]">
        {/* Left - Title & Contact */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="lg:basis-[28%] shrink-0"
        >
          <h2 className="text-[40px] md:text-[48px] lg:text-[56px] 2xl:text-[64px] leading-[100%] font-ivy text-primary-blue font-bold">
            FAQs
          </h2>
          <p className="mt-[16px] md:mt-[20px] text-[14px] md:text-[15px] 2xl:text-[16px] font-montserrat text-primary-blue font-normal leading-[160%] max-w-[300px]">
            If you have more questions please contact us and we&apos;ll be happy
            to answer them.
          </p>
          <button
            onClick={() => setIsContactOpen(true)}
            className="cursor-pointer mt-[20px] md:mt-[24px] bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] md:text-[15px] px-[28px] md:px-[32px] py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Contact
          </button>
        </motion.div>

        {/* Right - Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="flex-1"
        >
          <div className="flex flex-col gap-[8px] md:gap-[10px]">
            {faqs.map((faq, index) => (
              <FaqItem
                key={index}
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? -1 : index)
                }
              />
            ))}
          </div>
        </motion.div>
      </div>
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </section>
  );
};

export default FaqSection;
