import Link from "next/link";
import InstagramIcon from "../../../assets/svg/instagram-icon";

const NewPageFooter = () => {
  return (
    <footer className="w-full bg-primary-white border-t border-primary-blue/10 px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[20px] md:py-[24px]">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-[16px]">
        {/* Copyright */}
        <p className="order-last md:order-first shrink-0 font-myriadpro text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal">
          © 2026 Epoch Lag. All rights reserved.
        </p>

        {/* Social Icon */}
        <a
          href="https://www.instagram.com/epoch_lag"
          target="_blank"
          rel="noopener noreferrer"
          className="order-first md:order-none"
        >
          <InstagramIcon className="w-5 h-5 md:w-6 md:h-6 text-primary-blue" />
        </a>

        {/* Policy Links */}
        <div className="flex items-center gap-[16px] md:gap-[24px]">
          <Link
            href="/privacy-policy"
            className="font-myriadpro text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="font-myriadpro text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/child-safety-policy"
            className="font-myriadpro text-primary-blue text-[12px] md:text-[13px] 2xl:text-[14px] font-normal underline"
          >
            Child Safety Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default NewPageFooter;
