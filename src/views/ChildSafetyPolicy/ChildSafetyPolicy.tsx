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

const ChildSafetyPolicy = () => {
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
            Child Safety Policy
          </h1>
          <p className="bg-primary-blue rounded-[22px] text-primary-white px-[12px] py-[8px] md:px-[16px] md:py-[10px] text-[14px] md:text-[16px] font-montserrat">
            <span className="font-bold">Last updated: </span>
            February 2026
          </p>
        </div>
      </div>

      <div className="w-full h-full px-[16px] md:px-[24px] lg:px-[16px] py-[30px] md:py-[45px] flex flex-col gap-[40px] md:gap-[60px] lg:gap-[85px]">
        <div className="max-w-[930px] mx-auto flex flex-col gap-[16px] md:gap-[24px] justify-center bg-light-gray rounded-[20px] md:rounded-[27px] px-[20px] py-[30px] md:px-[40px] md:py-[40px] lg:px-[66px] lg:py-[55px] text-primary-black text-[14px] md:text-[16px] font-montserrat font-medium">
          <p>
            EpochLag is committed to providing a safe environment for all users,
            including children. We have zero tolerance for child sexual abuse and
            exploitation (CSAE) content.
          </p>
        </div>

        <div className="w-full lg:w-[90%] mx-auto h-full flex flex-col gap-[32px] md:gap-[40px] lg:gap-[48px]">
          <Section title="Our Standards">
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>
                We prohibit any content that sexualizes, exploits, or endangers
                minors
              </li>
              <li>
                We prohibit grooming behavior or content that facilitates child
                exploitation
              </li>
              <li>
                We prohibit sharing of inappropriate content involving minors
              </li>
              <li>
                We use proactive measures to detect and remove violating
                content
              </li>
            </ul>
          </Section>

          <Section title="Reporting">
            <p>
              If you encounter any content that violates these standards, please
              report it immediately to:{" "}
              <a className="underline" href="mailto:info@epochlag.com">
                info@epochlag.com
              </a>
              .
            </p>
          </Section>

          <div className="w-full flex flex-col lg:flex-row gap-[12px] lg:gap-[24px] lg:justify-between">
            <p className="w-full lg:w-[25%] text-[18px] md:text-[20px] lg:text-[24px] font-bold text-primary-blue font-montserrat">
              Enforcement
            </p>
            <div className="w-full lg:w-[60%] flex flex-col gap-[16px] md:gap-[24px] text-[14px] md:text-[16px] text-primary-black font-montserrat font-medium">
              <p>
                Violations will result in immediate account termination and
                reporting to the National Center for Missing & Exploited
                Children (NCMEC) and appropriate law enforcement authorities.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ChildSafetyPolicy;
