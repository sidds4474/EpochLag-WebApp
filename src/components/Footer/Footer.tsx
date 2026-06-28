import Link from "next/link";
import PinterestIcon from "../../assets/svg/pinterest-icon";
import InstagramIcon from "../../assets/svg/instagram-icon";
import LogoLight from "../../assets/images/logo-light.webp";

const Footer = () => {
  return (
    <div className="flex flex-col items-center lg:items-start gap-[48px] lg:gap-0 bg-primary-blue w-full px-[16px] pt-[32px] pb-[24px] lg:px-[64px] lg:pt-[78px] lg:pb-[32px]">
      <Link href="/" className="block cursor-pointer lg:hidden">
        <img
          src={LogoLight.src}
          alt="Logo"
          className="shrink-0 w-[170px] h-auto object-contain"
        />
      </Link>
      <hr className="border-primary-white w-full hidden lg:block" />

      <div className="w-full flex flex-col gap-[24px] lg:gap-0 lg:flex-row items-center lg:justify-between lg:pt-[32px]">
        <p className="shrink-0 order-last lg:order-first font-myriadpro text-primary-white text-[12px] xxs:text-[14px] font-normal">
          © 2026 Epoch Lag. All rights reserved.
        </p>

        <div className="flex flex-col gap-[24px] order-first lg:order-last lg:flex-row items-center lg:justify-between lg:gap-[40px]">
          <div className="flex items-center gap-[12px]">
            <a
              href="https://in.pinterest.com/Epoch_Lag/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PinterestIcon className="w-6 h-6 text-primary-white" />
            </a>
            <a
              href="https://www.instagram.com/epoch_lag"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon className="w-6 h-6 text-primary-white" />
            </a>
            <a
              href="https://www.linkedin.com/company/epoch-lag/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-[22px] h-[22px] text-primary-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S.02 4.881.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.982 0H8.014v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0V24H24V13.869c0-7.88-8.922-7.593-11.018-3.714V8z"/>
              </svg>
            </a>
          </div>

          <hr className="border-primary-white w-full block lg:hidden" />

          <div className="flex items-center gap-[16px] xxs:gap-[24px]">
            <Link
              href="/privacy-policy"
              className="cursor-pointer shrink-0 font-myriadpro text-primary-white text-[12px] xxs:text-[14px] font-normal underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/child-safety-policy"
              className="cursor-pointer shrink-0 font-myriadpro text-primary-white text-[12px] xxs:text-[14px] font-normal underline"
            >
              Child Safety Policy
            </Link>
            <Link
              href="/delete-account"
              className="cursor-pointer shrink-0 font-myriadpro text-primary-white text-[12px] xxs:text-[14px] font-normal underline"
            >
              Account Deletion
            </Link>
            <Link
              href="/terms-of-service"
              className="cursor-pointer shrink-0 font-myriadpro text-primary-white text-[12px] xxs:text-[14px] font-normal underline"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
