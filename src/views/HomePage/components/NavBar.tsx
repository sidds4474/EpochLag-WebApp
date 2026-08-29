"use client";

import { useState } from "react";
import Link from "next/link";
import LogoDark from "../../../assets/images/logo-dark.webp";
import ContactModal from "./ContactModal";
import { useAuth } from "../../../lib/auth/AuthProvider";

const NavBar = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { status } = useAuth();
  const signInHref = status === "authenticated" ? "/home" : "/login";

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
        <div className="flex items-center gap-[12px] md:gap-[16px] lg:gap-[24px]">
          <Link
            href="/newsletters"
            className="hidden md:inline-flex cursor-pointer font-montserrat font-semibold text-primary-blue text-[13px] md:text-[14px] 2xl:text-[16px] hover:opacity-70 transition-opacity"
          >
            Newsletter
          </Link>
          <Link
            href={signInHref}
            className="hidden sm:inline-flex cursor-pointer bg-primary-blue text-primary-white font-montserrat font-semibold text-[13px] md:text-[14px] 2xl:text-[16px] px-[20px] md:px-[28px] py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
          <button
            onClick={() => setIsContactOpen(true)}
            className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[13px] md:text-[14px] 2xl:text-[16px] px-[16px] sm:px-[20px] md:px-[28px] py-[9px] sm:py-[10px] md:py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Contact Us
          </button>
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            className="md:hidden cursor-pointer w-[40px] h-[40px] rounded-full border border-primary-blue/20 flex items-center justify-center hover:bg-primary-blue/5 transition-colors"
          >
            {isMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary-blue" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary-blue" />
              </svg>
            )}
          </button>
        </div>
      </nav>
      {isMenuOpen && (
        <div className="md:hidden border-t border-primary-blue/10 bg-warm-cream px-[16px] py-[16px] flex flex-col gap-[10px]">
          <Link
            href="/newsletters"
            onClick={() => setIsMenuOpen(false)}
            className="w-full text-center cursor-pointer font-montserrat font-semibold text-primary-blue text-[15px] py-[12px] rounded-full border border-primary-blue/20 hover:bg-primary-blue/5 transition-colors"
          >
            Newsletter
          </Link>
          <Link
            href={signInHref}
            onClick={() => setIsMenuOpen(false)}
            className="w-full text-center cursor-pointer bg-primary-blue text-primary-white font-montserrat font-semibold text-[15px] py-[12px] rounded-full hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      )}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
};

export default NavBar;
