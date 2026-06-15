"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "motion/react";
import ForYou from "../../../assets/images/For you.png";
import ChooseCover from "../../../assets/images/Choose cover.png";
import NewStory from "../../../assets/images/New story3rd.png";
import Timeline from "../../../assets/images/timeline 4th.png";
import CreateGroup from "../../../assets/images/Create Group 5th.png";
import Grid from "../../../assets/images/grid 6th.png";
import Received from "../../../assets/images/Received 7th.png";

const slides = [ForYou, ChooseCover, NewStory, Timeline, CreateGroup, Grid, Received];

const slideContent = [
  {
    subtitle: "HOW IT WORKS",
    heading: "Not sure where to start? We've got you.",
    body: "Browse dozens of story prompts across every chapter of life - childhood, family, travel, milestones, and more. Send one to someone you love or answer it yourself. Sometimes the right question is all you need.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Make every story worth opening.",
    body: "Pick a question or write a title, then pair it with an image from your library or ours. Every story card is yours to shape because the way a story looks matters almost as much as what it says.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Tell your stories, your way.",
    body: "Write, record a voice message, add photos, videos, and dates \u2014 all in one place. Whether you\u2019re sharing a memory or answering a question someone sent you, Epoch Lag makes it simple to tell the story the way it actually happened.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Watch your life take shape.",
    body: "Every story you tell lands on a timeline, organized chronologically across the years. Scroll back through the moments that made you who you are and see the full picture of a life well lived.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Bring the people who matter into the story.",
    body: "Invite family and friends to share, contribute, and respond. Create groups so everyone can add their own version of a memory. Because the best stories are rarely just one person\u2019s to tell.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Give every chapter its own home.",
    body: "Organize your stories into shared albums: family trips, childhood memories, a grandparent\u2019s voice. Share them with the people who belong in them, and build something everyone can add to over time.",
  },
  {
    subtitle: "HOW IT WORKS",
    heading: "Easily keep track of your stories.",
    body: "See every story you\u2019ve received, sent, and saved in one place. Never lose a memory someone trusted you with and always know when someone has shared something worth keeping.",
  },
];

const HowItWorks = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload all slide images and track completion
  useEffect(() => {
    let loaded = 0;
    slides.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === slides.length) setImagesLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === slides.length) setImagesLoaded(true);
      };
      img.src = src.src;
    });
  }, []);

  const goBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goForward = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  // Drag/swipe handling
  const dragStartX = useRef(null);
  const handleDragStart = (e) => {
    dragStartX.current = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
  };
  const handleDragEnd = (e) => {
    if (dragStartX.current === null) return;
    const endX = e.type === "touchend" ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX.current - endX;
    if (diff > 50) goForward();
    else if (diff < -50) goBack();
    dragStartX.current = null;
  };

  return (
    <section
      ref={sectionRef}
      className="w-full bg-primary-cream-dkr overflow-x-clip overflow-y-visible"
    >
      <div className="w-full flex flex-col md:flex-row px-[16px] md:px-[24px] lg:pl-[64px] 2xl:pl-[95px] 6xl:pl-[145px] md:pr-0 pt-[32px] pb-[10px] md:pt-[40px] md:pb-0 lg:py-0">
        {/* Left - Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex-1 md:basis-[50%] shrink-0 flex flex-col justify-center md:py-[40px] lg:py-[48px] md:pr-[16px] lg:pr-[32px] z-40"
        >
          <div className="min-h-[160px] md:min-h-[350px] lg:min-h-[360px] flex flex-col justify-start">
            <span className="font-montserrat text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-semibold tracking-[0.1em] uppercase">
              {slideContent[currentSlide].subtitle}
            </span>

            <h2 className="mt-[12px] md:mt-[20px] text-[32px] md:text-[40px] lg:text-[44px] 2xl:text-[50px] 6xl:text-[56px] leading-[105%] font-ivy text-primary-blue font-bold">
              {slideContent[currentSlide].heading}
            </h2>

            <p className="hidden md:block mt-[16px] md:mt-[24px] text-[14px] md:text-[15px] 2xl:text-[17px] font-montserrat text-primary-blue font-normal leading-[170%] max-w-[480px]">
              {slideContent[currentSlide].body}
            </p>
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-[12px] mt-[0px] md:mt-[36px]">
            <button
              onClick={goBack}
              disabled={currentSlide === 0}
              className="cursor-pointer w-[44px] h-[44px] md:w-[48px] md:h-[48px] rounded-full bg-primary-blue flex items-center justify-center transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goForward}
              disabled={currentSlide === slides.length - 1}
              className="cursor-pointer w-[44px] h-[44px] md:w-[48px] md:h-[48px] rounded-full bg-primary-blue flex items-center justify-center transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Right - 3D Stacked Cards Mapped into Perfect Layout */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex-1 md:basis-[60%] relative md:pt-[20px] mt-[10px] md:mt-0 aspect-[3/4.25] sm:aspect-[3/4.7] md:aspect-auto md:h-[420px] lg:h-[600px] flex items-center justify-center lg:justify-start overflow-visible"
        >
          {/* Sizing wrapper customized with layout offsets */}
          <div
            className="relative w-[302px] sm:w-[346px] md:w-[280px] lg:w-[307px] 2xl:w-[346px] h-full md:ml-[10%] lg:ml-[20%] 2xl:ml-[25%] cursor-grab active:cursor-grabbing select-none touch-pan-y md:translate-y-0"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
          >
            {slides.map((src, index) => {
              const diff = index - currentSlide;

              // Calculate explicit animation states to handle z-index and 3D overlap
              let animateProps = { x: "100%", scale: 0.7, opacity: 0, zIndex: 0 };

              if (diff === 0) {
                // Active Card: Center, full size, top layer
                animateProps = { x: "0%", y: "0%", scale: 1, opacity: 1, zIndex: 30 };
              } else if (diff === 1) {
                // Next Card: Adjacent to the right, no overlap
                animateProps = { x: "90%", y: "0%", scale: 1, opacity: 0.6, zIndex: 20 };
              } else if (diff === 2) {
                // Third Card: Peeking from further right on larger screens
                animateProps = { x: "180%", y: "0%", scale: 1, opacity: 0.3, zIndex: 10 };
              } else if (diff > 2) {
                // Hidden: off-screen right
                animateProps = { x: "270%", y: "0%", scale: 1, opacity: 0, zIndex: 0 };
              } else if (diff === -1) {
                // Previous Card: stacked behind, same position, hidden
                animateProps = { x: "0%", y: "0%", scale: 0.95, opacity: 0, zIndex: 10 };
              } else if (diff < -1) {
                // Older Cards: stacked further behind
                animateProps = { x: "0%", y: "0%", scale: 0.9, opacity: 0, zIndex: 0 };
              }

              return (
                <motion.div
                  key={index}
                  className="absolute left-0 w-full h-full flex items-start md:items-center justify-center mt-[10px] md:mt-[80px] lg:mt-[80px]"
                  initial={false}
                  animate={animateProps}
                  transition={{ type: "spring", stiffness: 80, damping: 20, mass: 1 }}
                >
                  <img
                    src={src.src}
                    alt={`App screen ${index + 1}`}
                    decoding="sync"
                    className="w-full h-auto object-contain drop-shadow-xl pointer-events-none"
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;