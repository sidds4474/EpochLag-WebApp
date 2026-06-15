import Link from "next/link";
import InstagramIcon from "../../../assets/svg/instagram-icon";
import PinterestIcon from "../../../assets/svg/pinterest-icon";
import LogoLight from "../../../assets/images/logo-light.webp";

const HomeFooter = () => {
  return (
    <footer className="w-full bg-primary-blue lg:bg-warm-cream px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[20px] md:py-[24px]">
      {/* Logo - mobile/tablet only */}
      <div className="flex justify-center md:justify-start mb-[12px] md:mb-[16px] lg:hidden">
        <img
          src={LogoLight.src}
          alt="Epoch Lag Logo"
          className="w-[120px] md:w-[150px] h-auto object-contain"
        />
      </div>

      {/* Social icons - mobile/tablet only (below logo) */}
      <div className="flex justify-center md:justify-end gap-[12px] mb-[12px] md:mb-[16px] lg:hidden">
        <a
          href="https://www.instagram.com/epoch_lag"
          target="_blank"
          rel="noopener noreferrer"
        >
          <InstagramIcon className="w-5 h-5 md:w-6 md:h-6 text-primary-white/80" />
        </a>
        <a
          href="https://www.linkedin.com/company/epoch-lag/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] text-primary-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S.02 4.881.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.982 0H8.014v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0V24H24V13.869c0-7.88-8.922-7.593-11.018-3.714V8z"/>
          </svg>
        </a>
        <a
          href="https://in.pinterest.com/Epoch_Lag/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PinterestIcon className="w-5 h-5 md:w-6 md:h-6 text-primary-white/80" />
        </a>
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-primary-white/20 lg:bg-primary-blue/20 mb-[16px] md:mb-[20px]" />

      {/* Bottom Row */}
      <div className="w-full flex flex-col md:flex-row items-center gap-[12px] md:gap-0">
        {/* Copyright */}
        <p className="order-last md:order-first shrink-0 font-myriadpro text-primary-white/60 lg:text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal">
          © 2026 Epoch Lag. All rights reserved.
        </p>

        <div className="flex items-center gap-[16px] md:gap-[24px] md:ml-auto">
          {/* Social icons - desktop only (inline with links) */}
          <a
            href="https://www.instagram.com/epoch_lag"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:block"
          >
            <InstagramIcon className="w-5 h-5 text-primary-blue" />
          </a>
          <a
            href="https://www.linkedin.com/company/epoch-lag/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:block"
          >
            <svg className="w-4 h-4 text-primary-blue" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a
            href="https://in.pinterest.com/Epoch_Lag/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:block"
          >
            <PinterestIcon className="w-5 h-5 text-primary-blue" />
          </a>
          <Link
            href="/privacy-policy"
            className="font-myriadpro text-primary-white/80 lg:text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/child-safety-policy"
            className="font-myriadpro text-primary-white/80 lg:text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Child Safety Policy
          </Link>
          <Link
            href="/delete-account"
            className="hidden md:inline font-myriadpro text-primary-white/80 lg:text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Account Deletion
          </Link>
          <Link
            href="/terms-of-service"
            className="font-myriadpro text-primary-white/80 lg:text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
