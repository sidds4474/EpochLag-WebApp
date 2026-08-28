import Link from "next/link";
import LogoLight from "../../assets/images/logo-light.webp";
import InstagramIcon from "../../assets/svg/instagram-icon";
import FacebookIcon from "../../assets/svg/facebook-icon";

// Full-width blue signature footer echoing the MailerLite email footer.
// Used as the actual page footer on newsletter routes (replaces the
// site's cream HomeFooter here) so the archive reads like a continuous
// piece with the emails themselves.

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className ?? "w-6 h-6"}
    aria-hidden="true"
  >
    <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M8.339 18.338H5.667v-8.59h2.672zM7.004 8.574a1.548 1.548 0 1 1 0-3.096 1.548 1.548 0 0 1 0 3.096m11.335 9.764H15.67v-4.177c0-.996-.017-2.278-1.387-2.278-1.389 0-1.601 1.086-1.601 2.207v4.248h-2.667v-8.59h2.56v1.174h.037c.355-.675 1.227-1.387 2.524-1.387 2.704 0 3.203 1.778 3.203 4.092z" />
  </svg>
);

const NewsletterMailFooter = () => {
  return (
    <footer className="w-full bg-primary-blue">
      <div className="px-[16px] md:px-[24px] lg:px-[64px] 2xl:px-[95px] 6xl:px-[145px] py-[32px] md:py-[44px] flex flex-col md:flex-row items-center md:items-center justify-between gap-[20px] md:gap-[16px]">
        <Link href="/" aria-label="Epoch Lag" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LogoLight.src}
            alt="Epoch Lag"
            className="w-[150px] md:w-[180px] h-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-[12px] text-white">
          <a
            href="https://www.instagram.com/epoch_lag"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-[40px] h-[40px] rounded-[8px] border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <InstagramIcon className="w-[18px] h-[18px]" />
          </a>
          <a
            href="https://www.linkedin.com/company/epoch-lag/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-[40px] h-[40px] rounded-[8px] border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <LinkedInIcon className="w-[18px] h-[18px]" />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61580265058728"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-[40px] h-[40px] rounded-[8px] border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <FacebookIcon className="w-[18px] h-[18px]" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default NewsletterMailFooter;
