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
  | { kind: "paragraph"; text: string }
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
  | {
      kind: "split";
      image: { src: string; alt: string };
      imageSide: "left" | "right";
      body: string[];
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
    title: "Create a Lag — and cook up a memory",
    teaser:
      "How to create your first Lag, what a Lag actually is, and this week’s cookbook challenge.",
    cover: "/newsletters/issue-04/story.png",
    sections: [
      definition,
      { kind: "paragraph", text: "Slow down. Cook something. Share the story behind it." },
      { kind: "heading", text: "What’s New This Week" },
      { kind: "heading", text: "Create a Lag" },
      {
        kind: "paragraph",
        text: "We just simplified the Create a Lag flow so it takes seconds. A Lag is any moment worth holding onto — a story, a photo, a recipe, a voice note — saved in one place and, if you want, shared with the people it belongs to.",
      },
      {
        kind: "paragraph",
        text: "Open the app, tap the + button, and pick “Create a Lag.” Give it a title, add a photo or a few words, and tag anyone you want to share it with. That’s it — it lives in your Library forever, and everyone tagged gets their own copy too.",
      },
      { kind: "heading", text: "What is a Lag?" },
      {
        kind: "paragraph",
        text: "A Lag is the pause between eras — the intentional beat before you rush into the next thing. In the app, a Lag is a memory you’ve chosen to sit with. Not a post. Not a story that disappears. A quiet, kept thing you can come back to.",
      },
      {
        kind: "paragraph",
        text: "Some Lags are big — a wedding, a move, the last summer at your grandparents’ house. Some are small — the way your kid mispronounced a word, a recipe your mom finally wrote down. All of them count.",
      },
      { kind: "heading", text: "This Week’s Highlight: The Cookbook Challenge" },
      {
        kind: "paragraph",
        text: "This week, we’re inviting the whole community into a Cookbook Challenge. Pick one family recipe — the messier the story, the better — and turn it into a Lag.",
      },
      {
        kind: "paragraph",
        text: "Snap a photo of the dish (or the handwritten card it came from). Write a few sentences about who taught it to you, or when you first remember eating it. Tag a family member so they get a copy too. Over a year, you’ll have a shared cookbook that reads like a family.",
      },
      { kind: "heading", text: "A Prompt Worth Sending This Week" },
      {
        kind: "prompt",
        question: "What’s a dish that always tastes like home?",
        followup: "Send it to a parent, a sibling, or the person who first made it for you. Answer it yourself, and start your cookbook.",
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
];

export function getIssueBySlug(slug: string): Issue | undefined {
  return ARCHIVE.find((i) => i.slug === slug);
}
