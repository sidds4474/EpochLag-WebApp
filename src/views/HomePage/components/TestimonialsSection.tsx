"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

type Testimonial = {
  quote: string;
  name: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Epoch Lag is a great app for helping you share specific memories with friends and loved ones without having to navigate through the noise of a busy social media feed on Instagram, TikTok, Facebook. It cuts straight to the point of connection and remembering important moments, which is what social media always should have been from the get-go.",
    name: "Patrick",
  },
  {
    quote:
      "Unlike most social apps that feel noisy and overwhelming, this one feels calm and intentional. The private nature of the app makes me more comfortable sharing real moments instead of polished content.",
    name: "Aliyu",
  },
  {
    quote:
      "What I value most is how personal and private it feels. I like that I can choose exactly who sees my stories instead of posting for everyone. The ability to combine photos, short videos, and voice notes in one story is also something I appreciate. It lets me capture a moment more fully than just sending a single picture or text.",
    name: "Jordan",
  },
];

function QuoteGlyph() {
  return (
    <svg
      width="38"
      height="30"
      viewBox="0 0 53 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 25.4381C0 19.0155 1.94694 13.6031 5.84082 9.20103C9.95102 4.65464 14.7823 1.58763 20.3347 0L22.2816 4.87113C18.4599 6.09793 15.3592 8.26289 12.9796 11.366C10.6 14.4691 9.4102 17.9691 9.4102 21.866C9.4102 22.6598 9.44626 23.165 9.51837 23.3814C10.9605 22.299 12.7272 21.7577 14.8184 21.7577C17.4143 21.7577 19.5415 22.6959 21.2 24.5722C22.9306 26.3763 23.7959 28.6495 23.7959 31.3918C23.7959 34.3505 22.8224 36.8763 20.8755 38.9691C19.0007 40.9897 16.4769 42 13.3041 42C9.4102 42 6.20136 40.4485 3.67755 37.3454C1.22585 34.1701 0 30.201 0 25.4381ZM29.2041 25.4381C29.2041 19.0155 31.151 13.6031 35.0449 9.20103C39.1551 4.65464 43.9864 1.58763 49.5388 0L51.4857 4.87113C47.6639 6.09793 44.5633 8.26289 42.1837 11.366C39.8041 14.4691 38.6143 17.9691 38.6143 21.866C38.6143 22.6598 38.6503 23.165 38.7224 23.3814C40.1646 22.299 41.9313 21.7577 44.0224 21.7577C46.6184 21.7577 48.7456 22.6959 50.4041 24.5722C52.1347 26.3763 53 28.6495 53 31.3918C53 34.3505 52.0265 36.8763 50.0796 38.9691C48.2048 40.9897 45.6809 42 42.5082 42C38.6143 42 35.4054 40.4485 32.8816 37.3454C30.4299 34.1701 29.2041 30.201 29.2041 25.4381Z"
        fill="#EF9849"
      />
    </svg>
  );
}

const TestimonialsSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      className="w-full bg-[#FDE6C9] px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] pt-[20px] md:pt-[28px] lg:pt-[36px] pb-[40px] md:pb-[56px] lg:pb-[72px]"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-[820px] mx-auto"
      >
        <p className="font-montserrat font-medium text-[#092E4A] text-[16px] tracking-[0.06em] uppercase">
          Testimonials
        </p>
        <h2 className="mt-[12px] font-ivy font-bold text-primary-blue text-[32px] md:text-[40px] lg:text-[46px] leading-[110%]">
          What people say
        </h2>
      </motion.div>

      <div className="mt-[40px] md:mt-[56px] grid grid-cols-1 md:grid-cols-3 gap-[20px] md:gap-[24px] lg:gap-[28px]">
        {TESTIMONIALS.map((t, i) => (
          <motion.article
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.55, delay: 0.08 * i, ease: "easeOut" }}
            className="bg-white rounded-[16px] md:rounded-[20px] p-[18px] md:p-[20px] lg:p-[24px] flex flex-col gap-[14px]"
          >
            <QuoteGlyph />
            <p className="flex-1 font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
              {t.quote}
            </p>
            <p className="font-montserrat font-semibold text-primary-blue text-[14px] md:text-[15px]">
              {t.name}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
