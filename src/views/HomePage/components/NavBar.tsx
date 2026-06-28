"use client";

import { useState } from "react";
import Link from "next/link";
import LogoDark from "../../../assets/images/logo-dark.webp";
import ContactModal from "./ContactModal";

const NavBar = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <>
      <nav className="w-full bg-warm-cream flex items-center justify-between px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[20px] lg:py-[32px] 2xl:py-[40px]">
        <Link href="/" className="block cursor-pointer">
          <img
            src={LogoDark.src}
            alt="Epoch Lag Logo"
            className="w-[130px] md:w-[170px] 2xl:w-[200px] h-auto object-contain"
            fetchPriority="high"
            decoding="async"
          />
        </Link>
        <div className="flex items-center gap-[12px] md:gap-[16px]">
          <Link
            href="/login"
            className="hidden sm:inline-flex cursor-pointer bg-primary-blue text-primary-white font-montserrat font-semibold text-[13px] md:text-[14px] 2xl:text-[16px] px-[20px] md:px-[28px] py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
          <button
            onClick={() => setIsContactOpen(true)}
            className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[13px] md:text-[14px] 2xl:text-[16px] px-[20px] md:px-[28px] py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Contact Us
          </button>
        </div>
      </nav>
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
};

export default NavBar;
