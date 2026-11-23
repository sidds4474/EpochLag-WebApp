import PanelMobileHeader from "../PanelMobileHeader";
import { PRIVACY_SECTIONS } from "../../../../../lib/privacy/content";

// Pull a "Last updated: …" string out of the first section's paragraphs
// so we can render it as a grey subtitle under the Lora heading instead
// of inline with the body copy.
function pickLastUpdated(): { lastUpdated: string | null; sections: typeof PRIVACY_SECTIONS } {
  if (PRIVACY_SECTIONS.length === 0) {
    return { lastUpdated: null, sections: PRIVACY_SECTIONS };
  }
  const [first, ...rest] = PRIVACY_SECTIONS;
  const idx = first.blocks.findIndex(
    (b) => b.type === "para" && /last updated/i.test(b.text)
  );
  if (idx === -1) return { lastUpdated: null, sections: PRIVACY_SECTIONS };
  const raw = (first.blocks[idx] as { type: "para"; text: string }).text;
  const trimmed = first.blocks.filter((_, i) => i !== idx);
  const lastUpdated = raw.replace(/^last\s*updated:?\s*/i, "").trim();
  return {
    lastUpdated,
    sections: [{ ...first, blocks: trimmed }, ...rest],
  };
}

export default function PrivacyPage() {
  const { lastUpdated, sections } = pickLastUpdated();

  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Privacy Policy" />

      <div className="flex flex-col gap-[20px] max-w-[760px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[28px] leading-[1.15]">
            Privacy Policy
          </h1>
          {lastUpdated && (
            <p className="font-montserrat text-[#848484] text-[13px] md:text-[14px]">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-[10px]">
            {section.heading && (
              <h2 className="font-montserrat font-bold text-[#232323] text-[15px] md:text-[16px]">
                {section.heading}
              </h2>
            )}
            {section.blocks.map((block, j) => {
              if (block.type === "para") {
                return (
                  <p
                    key={j}
                    className="font-montserrat text-[#2c2c2c] text-[14px] leading-[160%]"
                  >
                    {block.text}
                  </p>
                );
              }
              if (block.type === "subheading") {
                return (
                  <p
                    key={j}
                    className="font-montserrat font-semibold text-[#232323] text-[14px] mt-[4px]"
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
                      className="font-montserrat text-[#2c2c2c] text-[14px] leading-[160%]"
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
