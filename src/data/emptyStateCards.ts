// src/data/emptyStateCards.ts
//
// Static "empty-state" cards rendered at the rightmost end of the For You rail.
// Shown to every user. Filtered out per-user via a local "dismissed" list in
// localStorage. No backend.

export type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "video"; src: string }
  | { type: "image"; src: string }
  | { type: "imageRow"; srcs: string[] }
  | {
      type: "feature";
      icon: string;
      label: string;
      text: string;
      bullets?: string[];
    }
  | {
      type: "actionButtons";
      buttons: Array<{
        label: string;
        variant: "primary" | "secondary";
        route: string;
      }>;
    };

export type EmptyStateCard = {
  id: string;
  title: string;
  teaser?: string;
  coverImage: string;
  location: string;
  body: BodyBlock[];
};

export const EMPTY_STATE_CARDS: EmptyStateCard[] = [
  {
    id: "empty_card_1",
    title: "The Story behind Epoch Lag",
    teaser:
      "Ever wondered about the stories of your grandparents? Ever wished you had more of the stories that help create the foundation and fabric of your family and relationships with friends?",
    coverImage: "/empty-state-cards/card1/coverimage-card1.png",
    location: "New York, USA • 2026",
    body: [
      {
        type: "paragraph",
        text:
          "Ever wondered about the stories of your grandparents? Ever wished you had more of the stories that help create the foundation and fabric of your family and relationships with friends?",
      },
      {
        type: "paragraph",
        text:
          "We created Epoch Lag to make it easier to share stories, to ask questions you've always wanted to ask, and to have a place to cherish those memories and stories for the long term.",
      },
      {
        type: "paragraph",
        text:
          "Yes the digital world offers us feeds upon feeds and content upon content to browse through. Epoch Lag is a place to connect - human to human, stories that matter, enriching connections for the long term.",
      },
      {
        type: "video",
        src: "/empty-state-cards/card1/Epoch_Lag_Hero.mp4",
      },
      { type: "heading", text: "Why “epoch lag”?" },
      {
        type: "paragraph",
        text: "[Pronounced: ‘e-pək’ lag; or epic lag]",
      },
      {
        type: "paragraph",
        text:
          "Epoch Lag is the intentional pause between eras, not rushing into the next epoch, but lingering to absorb lessons, memories, or meaning from the last.",
      },
      {
        type: "paragraph",
        text:
          "Epoch Lag is your digital haven to create, connect, and cherish. Whether it's sharing everyday moments or preserving unforgettable memories, we make it easy to stay close to the people who matter most.",
      },
      {
        type: "paragraph",
        text:
          "We are and will always be: private, secure. And our mission is simple: to inspire meaningful storytelling and effortless connection, helping you turn life's moments into lasting memories.",
      },
      {
        type: "paragraph",
        text:
          "Welcome to Epoch Lag. We are so grateful for your joining us. We welcome your feedback. We hope you get as much value from this as we do. We hope this space becomes a wonderful space, offering magical moments and the comfort of knowing - the important stories are safe, here to cherish, and here to stay. Enjoy.",
      },
      {
        type: "image",
        src: "/empty-state-cards/card1/kids-car.png",
      },
      {
        type: "imageRow",
        srcs: [
          "/empty-state-cards/card1/kid-cake.jpg",
          "/empty-state-cards/card1/girl.jpg",
        ],
      },
    ],
  },
  {
    id: "empty_card_2",
    title: "How to use Epoch Lag",
    coverImage: "/empty-state-cards/card2/coverimage-card2.png",
    location: "New York, USA • 2026",
    body: [
      {
        type: "paragraph",
        text:
          "Welcome to Epoch Lag - a place to connect, share stories, turn life's moments into lasting memories.",
      },
      { type: "heading", text: "A bit about how to use:" },
      {
        type: "feature",
        icon: "home",
        label: "For You:",
        text: "Recent stories and prompts you've received.",
      },
      {
        type: "feature",
        icon: "home",
        label: "Inspiration:",
        text:
          "A weekly feed of inspirational prompts that we serve up to you. These are intended to spark inspiration or be shared with family and friends.",
      },
      {
        type: "feature",
        icon: "interactions",
        label: "Interactions:",
        text:
          "An ongoing dashboard of sent and received stories and prompts, making it easy to search and find.",
      },
      {
        type: "feature",
        icon: "circles",
        label: "Circles / +:",
        text:
          "Easiest way to customize a question you'd like to ask someone, or tell a story you'd like to share.",
        bullets: [
          "For Questions - add a cover image to create a card, think of it as a postcard awaiting a response.",
          "For Stories - add a cover image, also think of it as a postcard, and then add images, videos, audio recording, or text. Feel free to voice to text or record / open camera live as well.",
        ],
      },
      {
        type: "feature",
        icon: "stories",
        label: "Library:",
        text:
          "Your personal library of stories - easily navigated across albums and timeline, as well as filtered by categories.",
      },
      {
        type: "feature",
        icon: "profile",
        label: "Profile:",
        text:
          "A place to easily find your family and friends, your draft stories, stories you haven't shared, as well as account information.",
      },
      {
        type: "paragraph",
        text:
          "Overall the app is not intended to replace any other platform. It's to be considered when there is that nagging question you have always wanted to ask; when there is that family moment or story you've always wanted to document; when you want a personal, private story to be captured and cherished forever.",
      },
      {
        type: "paragraph",
        text:
          "We are just starting, and we so value your feedback and support. Please let us know how we can help your experience and we are committed to improving and refining as we go!",
      },
      {
        type: "actionButtons",
        buttons: [
          {
            label: "Ask a Question",
            variant: "primary",
            route: "/new-story?mode=question",
          },
          {
            label: "Tell a Story",
            variant: "secondary",
            route: "/new-story?mode=new",
          },
        ],
      },
    ],
  },
];

export const findEmptyStateCard = (id: string): EmptyStateCard | null =>
  EMPTY_STATE_CARDS.find((c) => c.id === id) ?? null;

// ---- per-user dismissal (client-only, no backend) ----

function dismissedKey(userId: string): string {
  return `emptyStateBookmarks:${userId}`;
}

export function loadEmptyStateDismissed(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(dismissedKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function toggleEmptyStateDismissed(
  userId: string,
  cardId: string
): string[] {
  if (typeof window === "undefined" || !userId) return [];
  const current = loadEmptyStateDismissed(userId);
  const next = current.includes(cardId)
    ? current.filter((id) => id !== cardId)
    : [...current, cardId];
  try {
    window.localStorage.setItem(dismissedKey(userId), JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return next;
}
