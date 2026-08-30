import Gradient2 from "../../../../../assets/images/gradients/2.jpg";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";
import { PRIVACY_SECTIONS } from "../../../../../lib/privacy/content";


export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Privacy Policy" />
      <HeroBanner src={Gradient2.src} />

      <div className="flex flex-col gap-[20px] max-w-[760px]">
        <h1 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Privacy Policy
        </h1>

        {PRIVACY_SECTIONS.map((section, i) => (
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
