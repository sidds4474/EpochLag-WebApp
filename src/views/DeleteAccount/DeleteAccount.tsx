import Link from "next/link";
import LogoDark from "../../assets/images/logo-dark.webp";
import Footer from "../../components/Footer/Footer";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <>
    <div className="w-full flex flex-col lg:flex-row gap-[12px] lg:gap-[24px] lg:justify-between">
      <p className="w-full lg:w-[25%] text-[18px] md:text-[20px] lg:text-[24px] font-bold text-primary-blue font-montserrat">
        {title}
      </p>
      <div className="w-full lg:w-[60%] flex flex-col gap-[16px] md:gap-[24px] text-[14px] md:text-[16px] text-primary-black font-montserrat font-medium">
        {children}
      </div>
    </div>
    <hr className="border-primary-blue/30 w-full" />
  </>
);

const DeleteAccount = () => {
  return (
    <div className="w-full h-full">
      <div className="w-full h-full bg-primary-cream pl-[16px] pr-[16px] pt-[36px] md:pl-[24px] md:pr-[24px] lg:pl-[45px] 2xl:pl-[95px] lg:pr-[16px] lg:pt-[45px] 2xl:pt-[95px] 6xl:pl-[145px] 6xl:pr-[32px]">
        <Link
          href="/"
          className="block cursor-pointer mx-auto md:mx-0 w-[155px] h-[24px] md:w-[200px] md:h-[28px] 2xl:w-[255px] 2xl:h-[38px] 6xl:w-[300px] 6xl:h-[48px]"
        >
          <img src={LogoDark.src} alt="Logo" />
        </Link>
        <div className="w-full h-full flex flex-col gap-[24px] md:gap-[36px] items-center justify-center py-[40px] md:py-[60px] lg:py-[100px]">
          <h1 className="text-center text-[28px] xs:text-[36px] md:text-[48px] lg:text-[60px] xl:text-[80px] 3xl:text-[100px] leading-[93%] font-projekt text-primary-blue font-normal">
            Account Deletion – EpochLag
          </h1>
          <p className="bg-primary-blue rounded-[22px] text-primary-white px-[12px] py-[8px] md:px-[16px] md:py-[10px] text-[14px] md:text-[16px] font-montserrat">
            <span className="font-bold">Last updated: </span>
            February 2026
          </p>
        </div>
      </div>

      <div className="w-full h-full px-[16px] md:px-[24px] lg:px-[16px] py-[30px] md:py-[45px] flex flex-col gap-[40px] md:gap-[60px] lg:gap-[85px]">
        <div className="max-w-[930px] mx-auto flex flex-col gap-[16px] md:gap-[24px] justify-center bg-light-gray rounded-[20px] md:rounded-[27px] px-[20px] py-[30px] md:px-[40px] md:py-[40px] lg:px-[66px] lg:py-[55px] text-primary-black text-[14px] md:text-[16px] font-montserrat font-medium">
          <Section title="How users can delete their account">
            <p>
              If you want to delete your EpochLag account and all associated
              data, please email us at:
            </p>
            <p className="font-semibold text-primary-blue">
              <a className="underline" href="mailto:support@epochlag.com">
                support@epochlag.com
              </a>
            </p>
            <p>Include your registered email address.</p>
          </Section>

          <Section title="What data will be deleted">
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Your account profile information and identifiers (such as your email and username).</li>
              <li>Content you created and associated records (such as posts, comments, media uploads, and other account content).</li>
              <li>Messages and direct-message history, if applicable.</li>
              <li>Account settings and preferences associated with your account.</li>
              <li>Other data linked to your account, including device and usage data collected for service operation.</li>
            </ul>
          </Section>

          <Section title="If any data is retained temporarily">
            <p>Your account and all associated data will be permanently deleted within 30 days.</p>
            <p>
              During the deletion process, we may retain your data for a short
              period in secure systems and backups so we can complete request
              verification and safely remove your information. We may also
              retain limited information to comply with legal obligations or to
              resolve disputes, but this data will not be used to operate your
              account.
            </p>
          </Section>

          <div className="w-full flex flex-col gap-[16px] md:gap-[24px]">
            <p>
              If you have questions about account deletion, email{" "}
              <a className="underline" href="mailto:support@epochlag.com">
                support@epochlag.com
              </a>
              .
            </p>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default DeleteAccount;

