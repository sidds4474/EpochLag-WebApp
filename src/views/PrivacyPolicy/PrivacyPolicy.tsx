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

const PrivacyPolicy = () => {
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
            Privacy Policy
          </h1>
          <p className="bg-primary-blue rounded-[22px] text-primary-white px-[12px] py-[8px] md:px-[16px] md:py-[10px] text-[14px] md:text-[16px] font-montserrat">
            <span className="font-bold">Last Updated: </span>
            February 2026
          </p>
        </div>
      </div>

      <div className="w-full h-full px-[16px] md:px-[24px] lg:px-[16px] py-[30px] md:py-[45px] flex flex-col gap-[40px] md:gap-[60px] lg:gap-[85px]">
        <div className="max-w-[930px] mx-auto flex flex-col gap-[16px] md:gap-[24px] justify-center bg-light-gray rounded-[20px] md:rounded-[27px] px-[20px] py-[30px] md:px-[40px] md:py-[40px] lg:px-[66px] lg:py-[55px] text-primary-black text-[14px] md:text-[16px] font-montserrat font-medium">
          <p>
            Epoch Lag ("we," "our," or "us") is committed to protecting your
            privacy and keeping your personal data secure. This Privacy Policy
            explains how we collect, use, store, and protect your information
            when you use our social media platform, mobile applications, and
            related services ("Services").
          </p>
          <p>
            We take your privacy seriously. We will never sell your personal
            data to third parties.
          </p>
        </div>

        <div className="w-full lg:w-[90%] mx-auto h-full flex flex-col gap-[32px] md:gap-[40px] lg:gap-[48px]">
          <Section title="1. Information We Collect">
            <p>
              We collect only the information necessary to provide and improve
              our Services:
            </p>
            <p>
              <span className="font-semibold">Account Information:</span> Name,
              username, email, phone number, and password.
            </p>
            <p>
              <span className="font-semibold">Profile Content:</span> Information
              you choose to share in your profile (e.g., bio, photo, interests).
            </p>
            <p>
              <span className="font-semibold">User Content:</span> Posts,
              comments, direct messages, media uploads.
            </p>
            <p>
              <span className="font-semibold">Device & Usage Data:</span> IP
              address, device type, operating system, browser, app activity
              logs.
            </p>
            <p>
              <span className="font-semibold">Optional Data:</span> Location,
              contacts, or permissions you explicitly grant.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information for:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Delivering, maintaining, and improving our Services.</li>
              <li>Enabling safe and meaningful social interactions.</li>
              <li>Personalizing your experience.</li>
              <li>
                Detecting, preventing, and addressing security or fraud issues.
              </li>
              <li>Complying with legal obligations.</li>
            </ul>
            <p>We do not sell, rent, or trade your personal information.</p>
          </Section>

          <Section title="3. How We Share Information">
            <p>We only share information in limited cases:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>
                We do not sell or "share" data for advertising purposes under
                CCPA definitions.
              </li>
              <li>
                <span className="font-semibold">With your consent:</span> For
                example, when you choose to share content publicly or with other
                users.
              </li>
              <li>
                <span className="font-semibold">With service providers:</span>{" "}
                Trusted vendors who help operate our Services (e.g., cloud
                hosting, analytics, moderation tools). They are bound by strict
                confidentiality and data protection obligations.
              </li>
              <li>
                <span className="font-semibold">For legal compliance:</span> If
                required by law, or to protect rights, safety, or security.
              </li>
            </ul>
          </Section>

          <Section title="4. Your Rights Under GDPR & CCPA">
            <p>Under GDPR (EU/EEA users), you have the right to:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Access your data.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Request deletion ("Right to be Forgotten").</li>
              <li>Restrict or object to processing.</li>
              <li>Request data portability.</li>
              <li>Withdraw consent at any time.</li>
            </ul>
            <p>Under CCPA/CPRA (California users), you have the right to:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>
                Know what personal information we collect and how it is used.
              </li>
              <li>Request access to your data.</li>
              <li>Request deletion of your data.</li>
              <li>Correct inaccurate information.</li>
              <li>
                Opt out of "sale" or "sharing" of personal data (note: we do not
                sell or share data).
              </li>
              <li>Exercise non-discrimination for exercising your rights.</li>
            </ul>
            <p>
              To exercise your rights, contact us at:{" "}
              <a className="underline" href="mailto:info@epochlag.com">
                info@epochlag.com
              </a>
              .
            </p>
          </Section>

          <Section title="5. Data Security">
            <p>We protect your data:</p>
            <p>
              We do not not share data with 3rd parties - with the exception of
              storing data on private and secure cloud storage services.
            </p>
            <p>
              While no system is 100% secure, we continually improve our
              security measures to keep your information safe.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your personal data only as long as necessary to:
            </p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Provide the Services.</li>
              <li>Meet legal, regulatory, and security obligations.</li>
              <li>Resolve disputes and enforce agreements.</li>
            </ul>
            <p>
              You may request deletion of your account and data at any time.
            </p>
          </Section>

          <Section title="7. International Data Transfers">
            <p>
              If you access our Services outside your country, your data may be
              processed in regions with different data protection laws. We use
              safeguards such as Standard Contractual Clauses (SCCs) to
              protect your data when transferred internationally.
            </p>
          </Section>

          <div className="w-full flex flex-col lg:flex-row gap-[12px] lg:gap-[24px] lg:justify-between">
            <p className="w-full lg:w-[25%] text-[18px] md:text-[20px] lg:text-[24px] font-bold text-primary-blue font-montserrat">
              8. SMS Messaging and Notifications
            </p>
            <div className="w-full lg:w-[60%] flex flex-col gap-[16px] md:gap-[24px] text-[14px] md:text-[16px] text-primary-black font-montserrat font-medium">
              <p>
                When you create an account, you may choose to provide your
                mobile phone number and consent to receive SMS notifications. We
                use Twilio, a third-party service provider, to send these
                messages.
              </p>
              <p className="font-semibold text-primary-blue">
                Information We Collect:
              </p>
              <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
                <li>Mobile phone number</li>
                <li>Consent records and timestamps</li>
                <li>Message delivery status</li>
                <li>Opt-in/opt-out preferences</li>
              </ul>
              <p className="font-semibold text-primary-blue">
                How We Use This Information:
              </p>
              <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
                <li>
                  Send account notifications when other users invite you or share
                  content
                </li>
                <li>
                  Send promotional messages about our service (if consented)
                </li>
                <li>Verify your phone number</li>
              </ul>
              <p className="font-semibold text-primary-blue">Your Rights:</p>
              <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
                <li>You can opt out at any time by texting STOP</li>
                <li>Standard message and data rates may apply</li>
                <li>Message frequency varies based on your account activity</li>
              </ul>
              <p>We retain SMS consent records for compliance purposes.</p>
            </div>
          </div>

          <hr className="border-primary-blue/30 w-full" />

          <Section title="9. Changes to this Policy">
            <p>
              We may update this Privacy Policy from time to time. Significant
              updates will be communicated through the app or by email before
              taking effect.
            </p>
          </Section>

          <div className="w-full flex flex-col lg:flex-row gap-[12px] lg:gap-[24px] lg:justify-between">
            <p className="w-full lg:w-[25%] text-[18px] md:text-[20px] lg:text-[24px] font-bold text-primary-blue font-montserrat">
              10. Contact Us
            </p>
            <div className="w-full lg:w-[60%] flex flex-col gap-[16px] md:gap-[24px] text-[14px] md:text-[16px] text-primary-black font-montserrat font-medium">
              <p>
                If you have questions, concerns, or requests regarding this
                Privacy Policy or your rights, please contact us at:{" "}
                <a className="underline" href="mailto:info@epochlag.com">
                  info@epochlag.com
                </a>
              </p>
              <p>
                If you are in California, you may also contact the California
                Privacy Protection Agency (CPPA).
              </p>
              <p>
                <span className="font-semibold">Commitment to Privacy:</span> Your
                trust is central to our mission. We do not sell your personal
                data and will always prioritize your security and privacy in
                everything we build.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
