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

const TermsOfService = () => {
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
            Terms Of Service
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
            Welcome to Epoch Lag! By downloading, accessing, or using our app,
            you agree to these Terms of Service ("Terms"). Please read them
            carefully. If you do not agree, do not use the app.
          </p>
        </div>

        <div className="w-full lg:w-[90%] mx-auto h-full flex flex-col gap-[32px] md:gap-[40px] lg:gap-[48px]">
          <Section title="1. Eligibility">
            <p>
              You must be at least 13 years old to use this app. By using the
              app, you represent that you meet this requirement.
            </p>
          </Section>

          <Section title="2. Use of the App">
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>You may use the app only for lawful purposes.</li>
              <li>
                You agree not to misuse, disrupt, or interfere with the app.
              </li>
              <li>
                We may suspend or terminate your access if you violate these
                Terms.
              </li>
            </ul>
          </Section>

          <Section title="3. Accounts">
            <p>If registration is required:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>
                You are responsible for maintaining the confidentiality of your
                account and password.
              </li>
              <li>You agree to provide accurate and up-to-date information.</li>
            </ul>
          </Section>

          <Section title="4. Intellectual Property">
            <p>
              All content, features, and functionality in the app (including
              text, graphics, logos, and code) are owned by Epoch Lag, LLC and
              are protected by intellectual property laws. You may not copy,
              modify, or distribute them without permission.
            </p>
          </Section>

          <Section title="5. User Content">
            <p>By using Epoch Lag, you agree to the following:</p>
            <p className="font-bold text-primary-blue mt-4">ZERO TOLERANCE POLICY</p>
            <p>Epoch Lag maintains zero tolerance for objectionable content.</p>
            <p>The following are strictly prohibited:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Hate speech, harassment, or bullying</li>
              <li>Sexually explicit or pornographic content</li>
              <li>Violence, threats, or content promoting harm</li>
              <li>Illegal activity or content infringing on others' rights</li>
              <li>Spam, misinformation, or impersonation</li>
              <li>Content depicting or exploiting minors inappropriately</li>
            </ul>
          </Section>

          <Section title="6. User Responsibility">
            <p>
              You are solely responsible for all content you create, upload,
              or share through Epoch Lag. You must ensure your content
              complies with these guidelines and all applicable laws.
            </p>
          </Section>

          <Section title="7. Enforcement and Consequences">
            <p>Violations will result in immediate action:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Content will be reviewed within 24 hours of discovery or report</li>
              <li>Content subject to dispute between parties thereafter</li>
              <li>First violation: Warning and content removal</li>
              <li>Second violation: Final warning</li>
              <li>Third violation: Permanent account suspension</li>
              <li>Severe violations: Immediate permanent ban without warning</li>
              <li>We will cooperate with law enforcement when required</li>
              <li>
                On notification of suspension the user will have 30 days to
                request human review before all data is permanently removed
              </li>
            </ul>
          </Section>

          <Section title="8. Reporting and Moderation">
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Users can report inappropriate content using the in-app reporting feature</li>
              <li>Users can block other users who violate community standards</li>
              <li>All reports are reviewed within 24 hours, and action is taken on valid violations</li>
              <li>We respond to content reports promptly and remove violating content</li>
            </ul>
          </Section>

          <Section title="9. Content License">
            <p>
              You retain ownership of your content. By sharing content on
              Epoch Lag, you grant us a non-exclusive, worldwide,
              royalty-free license to store, display, and transmit your
              content solely for the purpose of operating the app and
              providing services to you and users you've chosen to share with.
            </p>
          </Section>

          <Section title="10. SMS Notifications">
            <p>
              By providing your mobile phone number and checking the SMS
              consent box during registration, you agree to receive text
              messages from Epoch Lag, including:
            </p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Invitations from other users</li>
              <li>Notifications when content is shared with you</li>
              <li>Service updates and promotional messages</li>
            </ul>
            <p>Message Frequency: Varies based on your account activity</p>
            <p>Message and Data Rates: Standard carrier rates may apply</p>
            <p>Opt-Out: Text STOP to unsubscribe at any time</p>
            <p>Help: Text HELP for assistance</p>
            <p>
              You represent that you are the account holder or have permission
              to receive messages at the number provided.
            </p>
          </Section>

          <Section title="11. Our Child Safety Standards">
            <p>
              EpochLag is committed to providing a safe environment for all
              users, including children. We have zero tolerance for child
              sexual abuse and exploitation (CSAE) content.
            </p>
            <p className="font-semibold">Our Standards:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>We prohibit any content that sexualizes, exploits, or endangers minors</li>
              <li>We prohibit grooming behavior or content that facilitates child exploitation</li>
              <li>We prohibit sharing of inappropriate content involving minors</li>
              <li>We use proactive measures to detect and remove violating content</li>
            </ul>
            <p className="font-semibold">Reporting:</p>
            <p>
              If you encounter any content that violates these standards,
              please report it immediately to:{" "}
              <a className="underline" href="mailto:hello@epochlag.com">
                hello@epochlag.com
              </a>
              .
            </p>
            <p className="font-semibold">Enforcement:</p>
            <p>
              Violations will result in immediate account termination and
              reporting to the National Center for Missing & Exploited
              Children (NCMEC) and appropriate law enforcement authorities.
            </p>
            <p className="font-semibold mt-4">Last updated: February 2026</p>
          </Section>

          <Section title="12. Your Agreement">
            <p>
              By clicking "I Agree" below, you confirm that you have read,
              understood, and agree to abide by these Community Guidelines.
              You acknowledge that violations may result in immediate account
              termination.
            </p>
          </Section>

          <Section title="13. Payments & Subscriptions">
            <p>If and when the app offers paid features:</p>
            <ul className="flex flex-col gap-[8px] list-disc list-outside pl-[20px] lg:pl-0">
              <li>Fees will be clearly disclosed before you purchase.</li>
              <li>
                Subscriptions will automatically renew unless you cancel before
                the billing period ends.
              </li>
            </ul>
          </Section>

          <Section title="14. Privacy">
            <p>
              Your use of the app is also governed by our Privacy Policy (linked
              on our site), which explains how we collect, use, and share your
              information.
            </p>
          </Section>

          <Section title="15. Disclaimers">
            <p>
              The app is provided on an "as is" and "as available" basis. We
              make no warranties or guarantees of any kind. Use of the app is at
              your own risk.
            </p>
          </Section>

          <Section title="16. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Epoch Lag is not liable
              for any damages arising from your use of the app.
            </p>
          </Section>

          <Section title="17. Termination">
            <p>
              We may suspend or terminate your access at any time for violation
              of these Terms or other reasons.
            </p>
          </Section>

          <Section title="18. Governing Law">
            <p>
              These Terms are governed by the laws of New York. Any disputes
              will be resolved in the courts of New York.
            </p>
          </Section>

          <Section title="19. Changes">
            <p>
              We may update these Terms from time to time. If we make material
              changes, we will notify you by app notification/etc. Continued
              use after changes means you accept the new Terms.
            </p>
          </Section>

          <div className="w-full flex flex-col lg:flex-row gap-[12px] lg:gap-[24px] lg:justify-between">
            <p className="w-full lg:w-[25%] text-[18px] md:text-[20px] lg:text-[24px] font-bold text-primary-blue font-montserrat">
              20. Contact Us
            </p>
            <div className="w-full lg:w-[60%] flex flex-col gap-[16px] md:gap-[24px] text-[14px] md:text-[16px] text-primary-black font-montserrat font-medium">
              <p>
                If you have any questions, contact us at:{" "}
                <a className="underline" href="mailto:info@epochlag.com">
                  info@epochlag.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
