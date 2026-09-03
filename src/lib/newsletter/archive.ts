// Newsletter archive content. Each issue is a hand-authored TS object
// with a section list — richer than markdown but still trivial to add
// new issues without a CMS. Images live in /public/newsletters/issue-XX/.
//
// Adding a new issue: append to ARCHIVE, drop images under
// /public/newsletters/issue-XX/, and both the index and the [slug]
// route pick it up automatically.

export type Section =
  | { kind: "definition"; pronunciation: string; body: string[] }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string; align?: "left" | "center" }
  | {
      kind: "linkParagraph";
      prefix: string;
      linkText: string;
      linkHref: string;
      suffix?: string;
    }
  | { kind: "divider" }
  | { kind: "socials" }
  | {
      kind: "hero";
      image: { src: string; alt: string };
      headline: string;
      checklist: string[];
      showAppBadges?: boolean;
    }
  | {
      kind: "duo";
      left: { title: string; body: string[] };
      right: { title: string; body: string[] };
    }
  | {
      kind: "prompt";
      question: string;
      followup?: string;
      image?: { src: string; alt: string };
    }
  | {
      kind: "story";
      body: string[];
      attribution: string;
      image?: { src: string; alt: string };
    }
  | { kind: "image"; src: string; alt: string }
  | { kind: "gallery"; images: { src: string; alt: string }[] }
  | { kind: "steps"; items: string[] }
  | {
      kind: "split";
      image: { src: string; alt: string };
      imageSide: "left" | "right";
      body: string[];
      imageWidth?: "sm" | "md";
    }
  | {
      kind: "opportunitiesHero";
      image: { src: string; alt: string };
      title: string;
      items: { blurb: string; label: string; href: string }[];
    }
  | { kind: "opportunities"; items: { label: string; href: string; blurb: string }[] };

export type Issue = {
  slug: string;
  number: number;
  date: string;
  dateISO: string;
  title: string;
  teaser: string;
  cover: string;
  sections: Section[];
};

const FEEDBACK_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSchmjcxstt5a9PP8LYnhJi9ta3InShjJ2bivtldOGyTz7w7Kg/viewform";
const FOCUS_GROUP_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSctqG7XLnLGri7RE2IXtHl_HV-bHCnpG0GTycwlh1BVxLhiJQ/viewform?usp=header";
const VIRTUAL_DEMO_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLScv8Tc97lebW5_u_mKjd27BSB23xmpdBTx2bDx4KtNXcFqSQg/viewform?usp=dialog";

const opportunities = (): Section => ({
  kind: "opportunities",
  items: [
    {
      label: "Feedback",
      href: FEEDBACK_FORM,
      blurb: "To provide feedback for the Epoch Lag app, click below!",
    },
    {
      label: "Focus Group",
      href: FOCUS_GROUP_FORM,
      blurb: "To participate in a focus group for Epoch Lag, click below!",
    },
    {
      label: "Virtual Demo",
      href: VIRTUAL_DEMO_FORM,
      blurb: "For a virtual demo of how to use Epoch Lag, click below!",
    },
  ],
});

const definition: Section = {
  kind: "definition",
  pronunciation: "ˈe-pək’ lag; or epic lag",
  body: [
    "The intentional pause between eras, not rushing into the next epoch, but lingering to absorb lessons, memories, or meaning from the last.",
    "It’s an acknowledgment that progress doesn’t erase the past, and that carrying pieces of an older epoch into the new one brings continuity, depth, and meaning.",
  ],
};

export const ARCHIVE: Issue[] = [
  {
    slug: "issue-05",
    number: 5,
    date: "September 2, 2026",
    dateISO: "2026-09-02",
    title: "Give every memory a time, place, and story",
    teaser:
      "What a Lag is, how to make your first one, and Alexis on capturing the moments that make her family’s memories.",
    cover: "/newsletters/issue-05/alexis.png",
    sections: [
      definition,
      {
        kind: "paragraph",
        text: "Give every memory a time, place, and story.",
      },
      { kind: "heading", text: "What’s a Lag?" },
      { kind: "paragraph", text: "Let us show you how to preserve your memory." },
      {
        kind: "split",
        imageSide: "right",
        image: { src: "/newsletters/issue-05/hero.png", alt: "Creating a Lag in Epoch Lag" },
        body: [
          "A Lag is more than just a story. It’s a moment, memory, or experience captured in time and place.",
          "Each Lag can include the people, location, and date connected to the story, creating a richer snapshot of the moments that matter.",
          "Whether it’s a spontaneous adventure, a family tradition, or an unforgettable experience, Lags help preserve the story behind the memory and the people who shared it.",
        ],
      },
      { kind: "image", src: "/newsletters/issue-05/howto-1.png", alt: "Tell your story and pick a location and date" },
      {
        kind: "paragraph",
        text: "Once you select the create button at the bottom of your screen, start crafting your Lag! Begin by telling your story and selecting the location and date.",
      },
      { kind: "image", src: "/newsletters/issue-05/howto-2.png", alt: "Add people to your Lag and share it" },
      {
        kind: "paragraph",
        text: "After you’ve ironed out the details, add those who were a part of your story. Congratulations, you just created a Lag!",
      },
      { kind: "paragraph", text: "Last but not least, share your Lag with friends and family!" },
      { kind: "heading", text: "A Prompt Worth Sending This Week" },
      {
        kind: "prompt",
        question: "What role did your grandparents play in your life?",
        followup:
          "Or — since school is about to start: What’s a first-day-of-school memory you’ll never forget?",
        image: { src: "/newsletters/issue-05/prompt.png", alt: "Prompt card" },
      },
      { kind: "heading", text: "Hear Alexis’s Story" },
      {
        kind: "split",
        image: { src: "/newsletters/issue-05/alexis.png", alt: "Alexis’s video thumbnail" },
        imageSide: "right",
        body: [
          "Meet Alexis. As a mother, she knows how quickly life’s special moments can pass.",
          "Hear her share how Epoch Lag helps her capture the people, places, and stories that make her family’s memories worth holding onto.",
          "Click on the video to learn more.",
        ],
      },
      {
        kind: "paragraph",
        text: "Big thank you to Alexis for sharing! Please reach out to share your stories as well!",
      },
      { kind: "heading", text: "Prompts at your fingertips!" },
      {
        kind: "split",
        image: {
          src: "/newsletters/issue-05/prompts-feature.png",
          alt: "Prompts illustration",
        },
        imageSide: "left",
        imageWidth: "sm",
        body: [
          "Every story starts with a spark. Use prompts crafted to help you kickstart your next Lag, whether you’re jumping into a forgotten era, reconnecting with family, or rediscovering a lost recipe.",
          "Send a prompt to a loved one, see where it takes you, and let the Lag do its thing.",
          "Found a prompt that took your story somewhere unexpected? Share it with us, and it might land in our upcoming issue.",
        ],
      },
      { kind: "heading", text: "Other Opportunities" },
      opportunities(),
    ],
  },
  {
    slug: "issue-04",
    number: 4,
    date: "August 19, 2026",
    dateISO: "2026-08-19",
    title: "A simple step to bring you closer",
    teaser: "Too many of our users have zero connections. Here’s how to fix that — plus Eileen’s story.",
    cover: "/newsletters/issue-04/eileen-video.png",
    sections: [
      definition,
      { kind: "paragraph", text: "Connect before it’s too late." },
      { kind: "heading", text: "We have a problem." },
      { kind: "paragraph", text: "Too many of our users have 0 connections." },
      { kind: "paragraph", text: "Let us show you how to fix that." },
      { kind: "image", src: "/newsletters/issue-04/connections-1.png", alt: "Profile screen showing the connections list" },
      {
        kind: "paragraph",
        text: "In your profile section, click on your connections. Once you see the list of your connections, click the plus button in the top right of your screen.",
      },
      { kind: "image", src: "/newsletters/issue-04/connections-2.png", alt: "Contact list with invite buttons" },
      {
        kind: "paragraph",
        text: "Once you can see the list of your contacts, click “invite” to send them a link to download Epoch Lag!",
      },
      { kind: "paragraph", text: "That way, you can share all of your moments together easily." },
      { kind: "heading", text: "A Prompt Worth Sending This Week" },
      {
        kind: "prompt",
        question: "What’s a moment that reminded you you’re not alone?",
        followup: "Send it to that special person that makes you feel more connected, or keep the moment for yourself.",
        image: { src: "/newsletters/issue-04/prompt.png", alt: "Prompt card" },
      },
      { kind: "heading", text: "Hear Eileen’s Story" },
      {
        kind: "split",
        image: { src: "/newsletters/issue-04/eileen-video.png", alt: "Eileen’s video thumbnail" },
        imageSide: "right",
        body: [
          "Meet Eileen.",
          "An artist, dancer, and most importantly, a great aunt.",
          "This is how she captured her memories.",
          "Click on the video to learn more.",
        ],
      },
      { kind: "heading", text: "A Story We Heard This Week" },
      {
        kind: "story",
        body: [
          "“Under the prompt ‘Sharing food memories,’ I recently shared my story of my Grandmother cooking me Jollof Rice when she used to come visit us. It brought back a lot of memories of the old times.”",
        ],
        attribution: "From Paul",
        image: { src: "/newsletters/issue-04/story.png", alt: "Story illustration" },
      },
      {
        kind: "paragraph",
        text: "Shared, interactive family cookbooks is a great use of Epoch Lag. You can also include images or videos of the making!",
      },
      { kind: "heading", text: "Other Opportunities" },
      opportunities(),
    ],
  },
  {
    slug: "issue-03",
    number: 3,
    date: "August 7, 2026",
    dateISO: "2026-08-07",
    title: "Your moments, together",
    teaser: "Introducing the Moments tab — countdowns for the milestones you don’t want to miss.",
    cover: "/newsletters/issue-03/moments-1.png",
    sections: [
      definition,
      { kind: "paragraph", text: "Your moment. Our time together." },
      { kind: "heading", text: "What’s New This Week" },
      { kind: "heading", text: "Introducing Moments: never miss what matters" },
      {
        kind: "paragraph",
        text: "We just added a new tab to help you stay on top of the milestones in your life and the lives of people you care about. Moments lets you create a countdown for any occasion. Then tag friends or family so they get invited too.",
      },
      { kind: "image", src: "/newsletters/issue-03/moments-1.png", alt: "Moments tab" },
      {
        kind: "paragraph",
        text: "Adding a moment takes seconds: pick an event type, give it a title and photo, choose a date, and tag whoever’s involved. We’ll remind you as the date approaches so nothing slips through the cracks.",
      },
      { kind: "image", src: "/newsletters/issue-03/moments-2.png", alt: "Creating a moment" },
      { kind: "paragraph", text: "Check out the new Moments tab and add your first one today!" },
      { kind: "heading", text: "A Prompt Worth Sending This Week" },
      {
        kind: "prompt",
        question: "What does ‘growing together’ in a relationship mean?",
        followup: "Send it to your loved one. Send it to an old friend. Answer it yourself, and share your story with friends and family.",
        image: { src: "/newsletters/issue-03/prompt.png", alt: "Prompt card" },
      },
      { kind: "heading", text: "This Week’s How-To" },
      {
        kind: "split",
        image: { src: "/newsletters/issue-03/howto.png", alt: "Invite screen" },
        imageSide: "right",
        body: [
          "Have someone you want to share your life with? Invite them to Epoch Lag!",
          "When they join, you both get 30 extra days free. No catch, just more time to relive the good memories together.",
          "The invite button lives at the top right of your homescreen under “Challenge”. Click it to get started today.",
        ],
      },
      { kind: "heading", text: "A Story We Heard This Week" },
      {
        kind: "story",
        body: [
          "“My great auntie means the world to me. She is an amazing artist, passionate dancer, and my best friend. She recently came to visit me while I was recovering at home. While spending time together on the couch, chatting and sketching one another, Mr. Finneas decided it was time to check on how the portrait was coming along!”",
        ],
        attribution: "From Sadie",
        image: { src: "/newsletters/issue-03/story.png", alt: "Story illustration" },
      },
      { kind: "heading", text: "Other Opportunities" },
      opportunities(),
    ],
  },
  {
    slug: "issue-02",
    number: 2,
    date: "July 22, 2026",
    dateISO: "2026-07-22",
    title: "Share a cherished memory this week",
    teaser: "The traditions we hope never change — and a story from Isabel about a day at the beach with her grandmother.",
    cover: "/newsletters/issue-02/story.png",
    sections: [
      definition,
      { kind: "heading", text: "This Week’s How-To" },
      {
        kind: "paragraph",
        text: "One of the most important parts about Epoch Lag is sharing your memories with your loved ones. Shoot them a text to join the app and share a prompt or story with a person you cherish!",
      },
      { kind: "image", src: "/newsletters/issue-02/howto.png", alt: "How-to screen" },
      { kind: "heading", text: "A Prompt Worth Sending This Week" },
      {
        kind: "prompt",
        question: "What’s a tradition in your family that you hope never changes? How did this tradition begin?",
        followup: "Send it to a grandparent. Send it to an old friend. Answer it yourself, and share your story with friends and family.",
        image: { src: "/newsletters/issue-02/prompt.png", alt: "Prompt card" },
      },
      { kind: "heading", text: "Coming Soon" },
      {
        kind: "split",
        image: { src: "/newsletters/issue-02/coming-soon.png", alt: "On this day preview" },
        imageSide: "right",
        body: [
          "Look out for our new update in the next coming week! You’ll be able to relive your stories from this exact date in past years, all in one place. Swipe through your memory timeline and turn a favorite photo into a story with just a tap.",
        ],
      },
      { kind: "heading", text: "A Story We Heard This Week" },
      {
        kind: "story",
        body: [
          "This week, a user shared a story about keeping a family tradition alive: annual trips to the beach with her grandmother, a ritual she’s been part of since birth.",
          "As the years passed, the rest of the family drifted away from the tradition — but she didn’t let it fade. Instead, she made it her own, taking her grandmother for a day at the beach, just the two of them.",
          "It’s a reminder that reflecting on memories matters just as much as making new ones.",
        ],
        attribution: "From Isabel",
        image: { src: "/newsletters/issue-02/story.png", alt: "Beach story illustration" },
      },
      { kind: "heading", text: "Other Opportunities" },
      opportunities(),
    ],
  },
  {
    slug: "issue-01",
    number: 1,
    date: "July 10, 2026",
    dateISO: "2026-07-10",
    title: "Your family’s whole story, in one private place",
    teaser:
      "Three new prompt categories, how to send your first story in about 60 seconds, and a family’s story about an old oak tree.",
    cover: "/newsletters/issue-01/opportunities-cropped.jpg",
    sections: [
      {
        kind: "hero",
        image: { src: "/newsletters/issue-01/Inspiration.png", alt: "Epoch Lag Inspiration tab" },
        headline: "Your family’s whole story, in one private place.",
        checklist: [
          "Private and secure by default",
          "Gentle prompts that inspire storytelling",
          "Photos, videos, voice, and text capabilities",
          "Memories to share with your family",
        ],
        showAppBadges: true,
      },
      { kind: "divider" },
      {
        kind: "prompt",
        question: "When was the last time you asked someone you love to tell you a story?",
        followup:
          "Not “how was your day” or “how are the kids.” A real story. One with a beginning, with an end, and containing a truth.",
      },
      {
        kind: "paragraph",
        text: "Most of us can’t remember. And that’s exactly why we’re here.",
      },
      { kind: "heading", text: "What’s New This Month" },
      {
        kind: "split",
        imageSide: "right",
        image: {
          src: "/newsletters/issue-01/image2.png",
          alt: "Kindness prompt on the Epoch Lag Inspiration tab",
        },
        body: [
          "We just launched our three newest prompt categories: Milestones, Loss, and Gratitude. Twenty-one new questions designed to open conversations that actually go somewhere.",
          "A few of our favorites from the batch:",
          "“Tell me about someone you wish you could have one more conversation with.”",
          "“What is a kindness someone showed you that you have never forgotten?”",
          "“What is something you finished that you once thought you never could?”",
          "They live in the Inspiration tab now. Browse by category or let the app surface one for you.",
        ],
      },
      { kind: "heading", text: "This Week’s How-To" },
      {
        kind: "paragraph",
        text: "If you haven’t sent a story yet, here’s how it works in about 60 seconds.",
      },
      {
        kind: "gallery",
        images: [
          { src: "/newsletters/issue-01/Homescreen.png", alt: "Home screen with the + button expanded" },
          { src: "/newsletters/issue-01/New story.png", alt: "New Story — title and cover picker" },
          { src: "/newsletters/issue-01/New story content.png", alt: "New Story — content editor" },
        ],
      },
      {
        kind: "steps",
        items: [
          "Tap the + button on your home screen.",
          "Choose “Tell a Story.”",
          "Write the title of your story and choose a cover image.",
        ],
      },
      {
        kind: "gallery",
        images: [
          {
            src: "/newsletters/issue-01/New story full content.png",
            alt: "Story editor with photos, audio, and text",
          },
          { src: "/newsletters/issue-01/Success Screen.png", alt: "Story Created success screen" },
          { src: "/newsletters/issue-01/multiple selections.png", alt: "Send story to contacts" },
        ],
      },
      {
        kind: "steps",
        items: [
          "Tell the story you’ve been waiting to tell, forgot about, or would like to share with family and friends.",
          "Choose someone to send it to, add a personal note if you want.",
        ],
      },
      {
        kind: "paragraph",
        text: "That’s it. When they respond, their story saves automatically to your shared Library. No chasing, no losing it in a thread somewhere.",
      },
      {
        kind: "linkParagraph",
        prefix: "Get started on our ",
        linkText: "website",
        linkHref: "https://epochlag.com",
        suffix: ".",
      },
      {
        kind: "opportunitiesHero",
        image: {
          src: "/newsletters/issue-01/opportunities-cropped.jpg",
          alt: "A field of daisies",
        },
        title: "Other Opportunities:",
        items: [
          {
            blurb: "If you would like to provide feedback for the Epoch Lag app, please click below:",
            label: "Feedback Survey",
            href: FEEDBACK_FORM,
          },
          {
            blurb: "If you would be willing to participate in a focus group for Epoch Lag, please click below:",
            label: "Focus Group Survey",
            href: FOCUS_GROUP_FORM,
          },
        ],
      },
      { kind: "socials" },
      {
        kind: "duo",
        left: {
          title: "Prompt worth sending this week",
          body: [
            "“What is something about where you grew up that you are grateful for today?”",
            "Send it to a parent. Send it to an old friend. Answer it yourself, and share your story with friends and family.",
          ],
        },
        right: {
          title: "A story we heard this week",
          body: [
            "One of our users sent their family a story on a beautiful old oak tree using text, pictures, and audio. A way to memorialize the old family oak tree before it has to be taken down. A story the family is cherishing and will for a long time to come.",
            "That’s the whole point.",
          ],
        },
      },
      { kind: "divider" },
      {
        kind: "paragraph",
        align: "center",
        text: "Thank you for reading and for your support of what we are building at Epoch Lag. Your support and feedback are invaluable as we continue to build and improve the experience we offer.",
      },
      { kind: "divider" },
    ],
  },
];

export function getIssueBySlug(slug: string): Issue | undefined {
  return ARCHIVE.find((i) => i.slug === slug);
}
