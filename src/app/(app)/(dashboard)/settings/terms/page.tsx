import Gradient3 from "../../../../../assets/images/gradients/3.jpg";
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
        text: "Welcome to Epoch Lag! By downloading, accessing, or using our app, you agree to these Terms of Service (“Terms”). Please read them carefully. If you do not agree, do not use the app.",
      },
    ],
  },
  {
    heading: "1. Eligibility",
    blocks: [
      {
        type: "para",
        text: "You must be at least 13 years old to use this app. By using the app, you represent that you meet this requirement.",
      },
    ],
  },
  {
    heading: "2. Use of the App",
    blocks: [
      {
        type: "list",
        items: [
          "You may use the app only for lawful purposes.",
          "You agree not to misuse, disrupt, or interfere with the app.",
          "We may suspend or terminate your access if you violate these Terms.",
        ],
      },
    ],
  },
  {
    heading: "3. Accounts",
    blocks: [
      { type: "para", text: "If registration is required:" },
      {
        type: "list",
        items: [
          "You are responsible for maintaining the confidentiality of your account and password.",
          "You agree to provide accurate and up-to-date information.",
        ],
      },
    ],
  },
  {
    heading: "4. Intellectual Property",
    blocks: [
      {
        type: "para",
        text: "All content, features, and functionality in the app (including text, graphics, logos, and code) are owned by Epoch Lag, LLC and are protected by intellectual property laws. You may not copy, modify, or distribute them without permission.",
      },
    ],
  },
  {
    heading: "5. User Content",
    blocks: [
      { type: "para", text: "By using Epoch Lag, you agree to the following:" },
      { type: "subheading", text: "ZERO TOLERANCE POLICY" },
      {
        type: "list",
        items: [
          "Epoch Lag maintains zero tolerance for objectionable content.",
          "The following are strictly prohibited:",
          "Hate speech, harassment, or bullying",
          "Sexually explicit or pornographic content",
          "Violence, threats, or content promoting harm",
          "Illegal activity or content infringing on others’ rights",
          "Spam, misinformation, or impersonation",
          "Content depicting or exploiting minors inappropriately",
        ],
      },
    ],
  },
  {
    heading: "6. USER RESPONSIBILITY",
    blocks: [
      {
        type: "para",
        text: "You are solely responsible for all content you create, upload, or share through Epoch Lag. You must ensure your content complies with these guidelines and all applicable laws.",
      },
    ],
  },
  {
    heading: "7. ENFORCEMENT AND CONSEQUENCES",
    blocks: [
      { type: "para", text: "Violations will result in immediate action:" },
      {
        type: "list",
        items: [
          "Content will be reviewed within 24 hours of discovery or report",
          "Content subject to dispute between parties thereafter",
          "First violation: Warning and content removal",
          "Second violation: Final warning",
          "Third violation: Permanent account suspension",
          "Severe violations: Immediate permanent ban without warning",
          "We will cooperate with law enforcement when required",
          "On notification of suspension the user will have 30 days to request human review before all data is permanently removed",
        ],
      },
    ],
  },
  {
    heading: "8. REPORTING AND MODERATION",
    blocks: [
      {
        type: "list",
        items: [
          "Users can report inappropriate content using the in-app reporting feature",
          "Users can block other users who violate community standards",
          "All reports are reviewed within 24 hours, and action is taken on valid violations",
          "We respond to content reports promptly and remove violating content",
        ],
      },
    ],
  },
  {
    heading: "9. CONTENT LICENSE",
    blocks: [
      {
        type: "para",
        text: "You retain ownership of your content. By sharing content on Epoch Lag, you grant us a non-exclusive, worldwide, royalty-free license to store, display, and transmit your content solely for the purpose of operating the app and providing services to you and users you’ve chosen to share with.",
      },
    ],
  },
  {
    heading: "10. SMS NOTIFICATIONS",
    blocks: [
      {
        type: "para",
        text: "By providing your mobile phone number and checking the SMS consent box during registration, you agree to receive text messages from Epoch Lag, including:",
      },
      {
        type: "list",
        items: [
          "Invitations from other users",
          "Notifications when content is shared with you",
          "Service updates and promotional messages",
          "Message Frequency: Varies based on your account activity",
          "Message and Data Rates: Standard carrier rates may apply",
          "Opt-Out: Text STOP to unsubscribe at any time",
          "Help: Text HELP for assistance",
        ],
      },
      {
        type: "para",
        text: "You represent that you are the account holder or have permission to receive messages at the number provided.",
      },
    ],
  },
  {
    heading: "11. OUR CHILD SAFETY STANDARDS",
    blocks: [
      {
        type: "para",
        text: "Epoch Lag is committed to providing a safe environment for all users, including children. We have zero tolerance for child sexual abuse and exploitation (CSAE) content.",
      },
      { type: "subheading", text: "Our Standards:" },
      {
        type: "list",
        items: [
          "We prohibit any content that sexualizes, exploits, or endangers minors",
          "We prohibit grooming behavior or content that facilitates child exploitation",
          "We prohibit sharing of inappropriate content involving minors",
          "We use proactive measures to detect and remove violating content",
        ],
      },
      { type: "subheading", text: "Reporting:" },
      {
        type: "para",
        text: "If you encounter any content that violates these standards, please report it immediately to: hello@epochlag.com.",
      },
      { type: "subheading", text: "Enforcement:" },
      {
        type: "para",
        text: "Violations will result in immediate account termination and reporting to the National Center for Missing & Exploited Children (NCMEC) and appropriate law enforcement authorities.",
      },
    ],
  },
  {
    heading: "12. YOUR AGREEMENT",
    blocks: [
      {
        type: "para",
        text: "By clicking “I Agree” below, you confirm that you have read, understood, and agree to abide by these Community Guidelines. You acknowledge that violations may result in immediate account termination.",
      },
    ],
  },
  {
    heading: "13. Payments & Subscriptions",
    blocks: [
      { type: "para", text: "If and when the app offers paid features:" },
      {
        type: "list",
        items: [
          "Fees will be clearly disclosed before you purchase.",
          "Subscriptions will automatically renew unless you cancel before the billing period ends.",
        ],
      },
    ],
  },
  {
    heading: "14. Privacy",
    blocks: [
      {
        type: "para",
        text: "Your use of the app is also governed by our Privacy Policy (linked on our site), which explains how we collect, use, and share your information.",
      },
    ],
  },
  {
    heading: "15. Disclaimers",
    blocks: [
      {
        type: "para",
        text: "The app is provided on an “as is” and “as available” basis. We make no warranties or guarantees of any kind. Use of the app is at your own risk.",
      },
    ],
  },
  {
    heading: "16. Limitation of Liability",
    blocks: [
      {
        type: "para",
        text: "To the maximum extent permitted by law, Epoch Lag is not liable for any damages arising from your use of the app.",
      },
    ],
  },
  {
    heading: "17. Termination",
    blocks: [
      {
        type: "para",
        text: "We may suspend or terminate your access at any time for violation of these Terms or other reasons.",
      },
    ],
  },
  {
    heading: "18. Governing Law",
    blocks: [
      {
        type: "para",
        text: "These Terms are governed by the laws of New York. Any disputes will be resolved in the courts of New York.",
      },
    ],
  },
  {
    heading: "19. Changes",
    blocks: [
      {
        type: "para",
        text: "We may update these Terms from time to time. If we make material changes, we will notify you by app notification or email. Continued use after changes means you accept the new Terms.",
      },
    ],
  },
  {
    heading: "20. Contact Us",
    blocks: [
      {
        type: "para",
        text: "If you have any questions, contact us at: info@epochlag.com",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Terms of Services" />
      <HeroBanner src={Gradient3.src} />

      <div className="flex flex-col gap-[20px] max-w-[760px]">
        <h1 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Terms of Services
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
