import Gradient2 from "../../../../../assets/images/gradients/2.jpg";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";

type Block =
  | { type: "para"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; text: string };

type Section = {
  heading?: string;
  blocks: Block[];
};

const SECTIONS: Section[] = [
  {
    blocks: [
      { type: "para", text: "Last Updated: February 2026" },
      {
        type: "para",
        text: "Epoch Lag (“we,” “our,” or “us”) is committed to protecting your privacy and keeping your personal data secure. This Privacy Policy explains how we collect, use, store, and protect your information when you use our social media platform, mobile applications, and related services (“Services”).",
      },
      {
        type: "para",
        text: "We take your privacy seriously. We will never sell your personal data to third parties.",
      },
    ],
  },
  {
    heading: "1. Information We Collect",
    blocks: [
      { type: "para", text: "We collect only the information necessary to provide and improve our Services:" },
      {
        type: "list",
        items: [
          "Account Information: Name, username, email, phone number, and password.",
          "Profile Content: Information you choose to share in your profile (e.g., bio, photo, interests).",
          "User Content: Posts, comments, direct messages, media uploads.",
          "Device & Usage Data: IP address, device type, operating system, browser, app activity logs.",
          "Optional Data: Location, contacts, or permissions you explicitly grant.",
        ],
      },
    ],
  },
  {
    heading: "2. How We Use Your Information",
    blocks: [
      { type: "para", text: "We use your information for:" },
      {
        type: "list",
        items: [
          "Delivering, maintaining, and improving our Services.",
          "Enabling safe and meaningful social interactions.",
          "Personalizing your experience.",
          "Detecting, preventing, and addressing security or fraud issues.",
          "Complying with legal obligations.",
        ],
      },
      { type: "para", text: "We do not sell, rent, or trade your personal information." },
    ],
  },
  {
    heading: "3. How We Share Information",
    blocks: [
      { type: "para", text: "We only share information in limited cases:" },
      {
        type: "list",
        items: [
          "We do not sell or “share” data for advertising purposes under CCPA definitions.",
          "With your consent: For example, when you choose to share content publicly or with other users.",
          "With service providers: Trusted vendors who help operate our Services (e.g., cloud hosting, analytics, moderation tools). They are bound by strict confidentiality and data protection obligations.",
          "For legal compliance: If required by law, or to protect rights, safety, or security.",
        ],
      },
    ],
  },
  {
    heading: "4. Your Rights Under GDPR & CCPA",
    blocks: [
      { type: "para", text: "Under GDPR (EU/EEA users), you have the right to:" },
      {
        type: "list",
        items: [
          "Access your data.",
          "Correct inaccurate or incomplete data.",
          "Request deletion (“Right to be Forgotten”).",
          "Restrict or object to processing.",
          "Request data portability.",
          "Withdraw consent at any time.",
        ],
      },
      { type: "para", text: "Under CCPA/CPRA (California users), you have the right to:" },
      {
        type: "list",
        items: [
          "Know what personal information we collect and how it is used.",
          "Request access to your data.",
          "Request deletion of your data.",
          "Correct inaccurate information.",
          "Opt out of “sale” or “sharing” of personal data (note: we do not sell or share data).",
          "Exercise non-discrimination for exercising your rights.",
        ],
      },
      { type: "para", text: "To exercise your rights, contact us at: info@epochlag.com" },
    ],
  },
  {
    heading: "5. Data Security",
    blocks: [
      {
        type: "para",
        text: "We do not share data with 3rd parties — with the exception of storing data on private and secure cloud storage services.",
      },
      {
        type: "para",
        text: "While no system is 100% secure, we continually improve our security measures to keep your information safe.",
      },
    ],
  },
  {
    heading: "6. Data Retention",
    blocks: [
      { type: "para", text: "We retain your personal data only as long as necessary to:" },
      {
        type: "list",
        items: [
          "Provide the Services.",
          "Meet legal, regulatory, and security obligations.",
          "Resolve disputes and enforce agreements.",
        ],
      },
      { type: "para", text: "You may request deletion of your account and data at any time." },
    ],
  },
  {
    heading: "7. International Data Transfers",
    blocks: [
      {
        type: "para",
        text: "If you access our Services outside your country, your data may be processed in regions with different data protection laws. We use safeguards such as Standard Contractual Clauses (SCCs) to protect your data when transferred internationally.",
      },
    ],
  },
  {
    heading: "8. SMS Messaging and Notifications",
    blocks: [
      {
        type: "para",
        text: "When you create an account, you may choose to provide your mobile phone number and consent to receive SMS notifications. We use Twilio, a third-party service provider, to send these messages.",
      },
      { type: "subheading", text: "Information We Collect:" },
      {
        type: "list",
        items: [
          "Mobile phone number",
          "Consent records and timestamps",
          "Message delivery status",
          "Opt-in/opt-out preferences",
        ],
      },
      { type: "subheading", text: "How We Use This Information:" },
      {
        type: "list",
        items: [
          "Send account notifications when other users invite you or share content",
          "Send promotional messages about our service (if consented)",
          "Verify your phone number",
        ],
      },
      { type: "subheading", text: "Your Rights:" },
      {
        type: "list",
        items: [
          "You can opt out at any time by texting STOP",
          "Standard message and data rates may apply",
          "Message frequency varies based on your account activity",
        ],
      },
      { type: "para", text: "We retain SMS consent records for compliance purposes." },
    ],
  },
  {
    heading: "9. Changes to this Policy",
    blocks: [
      {
        type: "para",
        text: "We may update this Privacy Policy from time to time. Significant updates will be communicated through the app or by email before taking effect.",
      },
    ],
  },
  {
    heading: "10. Contact Us",
    blocks: [
      {
        type: "para",
        text: "If you have questions, concerns, or requests regarding this Privacy Policy or your rights, please contact us at: info@epochlag.com",
      },
      {
        type: "para",
        text: "If you are in California, you may also contact the California Privacy Protection Agency (CPPA).",
      },
      {
        type: "para",
        text: "Your trust is central to our mission. We do not sell your personal data and will always prioritize your security and privacy in everything we build.",
      },
      {
        type: "para",
        text: "© 2026 Epoch Lag. All rights reserved.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Privacy Policy" />
      <HeroBanner src={Gradient2.src} />

      <div className="flex flex-col gap-[20px] max-w-[760px]">
        <h1 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Privacy Policy
        </h1>

        {SECTIONS.map((section, i) => (
          <section key={i} className="flex flex-col gap-[10px]">
            {section.heading && (
              <h2 className="font-montserrat font-bold text-primary-blue text-[15px] md:text-[16px]">
                {section.heading}
              </h2>
            )}
            {section.blocks.map((block, j) => {
              if (block.type === "para") {
                return (
                  <p
                    key={j}
                    className="font-montserrat text-primary-blue text-[14px] leading-[160%]"
                  >
                    {block.text}
                  </p>
                );
              }
              if (block.type === "subheading") {
                return (
                  <p
                    key={j}
                    className="font-montserrat font-semibold text-primary-blue text-[14px] mt-[4px]"
                  >
                    {block.text}
                  </p>
                );
              }
              return (
                <ul
                  key={j}
                  className="list-disc pl-[20px] flex flex-col gap-[6px]"
                >
                  {block.items.map((item, k) => (
                    <li
                      key={k}
                      className="font-montserrat text-primary-blue text-[14px] leading-[160%]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
