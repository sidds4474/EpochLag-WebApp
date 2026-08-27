import Gradient6 from "../../../../../assets/images/gradients/6.jpg";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";

type Release = {
  version: string;
  date: string;
  items: string[];
};

const RELEASES: Release[] = [
  {
    version: "Version 4.0",
    date: "August 10, 2026",
    items: [
      "Pending friend requests badge on the Studio connections pill — see at a glance if anyone’s waiting on you.",
      "Redesigned friend profile — tapping into someone’s profile now shows their cover card, connection status, stories you’ve shared with them, and a Send Prompt CTA.",
      "Fresh Studio look — white app header, cover card, cleaner connections pill.",
      "Empty state polish — better spacing on the Studio empty-state placeholder, cleaner tab-bar avatar.",
      "Interactive walkthrough — tap “How to use Epoch Lag” on Home and get a guided tour spotlighting the key parts of every tab, one at a time. Skip anytime.",
      "Placeholder cards during the tour for brand-new accounts — you see the shape of Moments, cards, and library rows even before you’ve added anything yourself.",
      "Renamed from “Stories” to “Lags” across the bottom nav and header.",
      "New People sub-tab — jump straight to everyone you’ve shared with; tap a name to see every moment with that person.",
      "New Places tab — your stories mapped by location. Zoom out to see everywhere you’ve been, tap a pin to open the stories captured there.",
      "AI-powered photo picks — On This Day now uses on-device analysis to surface the best photos from the day, filtering out screenshots, blurry frames, and duplicates.",
      "Tag People chip — tag friends who were part of a memory right from the composer.",
      "Story / Prompt toggle on Tell a Story — publish an open-ended prompt for others to answer, or write a full story yourself.",
      "Country holidays on the calendar — green dots for local holidays based on your country. Toggle the subscribe banner to see them.",
      "Recurring moments — set a moment to repeat monthly, yearly, or on a custom cadence; the calendar expands every occurrence automatically.",
      "Calendar sync improvements — blue dots for imported contacts + Google/Apple birthdays and life-milestone events; tap any to promote to a real Moment.",
      "Reliable Create Moment — spinner always unblocks, even if the network stalls, so you never get stuck on a frozen sheet.",
      "UTC-safe date rendering — birthdays and moment dates no longer drift by a day across timezones.",
      "Faster app-wide navigation — perf work on the notification poll (skipped when backgrounded) and profile refresh (throttled on rapid tab hops).",
      "Countless small polish + bug fixes — thumbnail rendering, header consistency, tap responsiveness on iOS + Android.",
      "Meet Moments — a brand new tab for the events that matter. Birthdays, anniversaries, weddings, graduations, travel, first homes, retirement. Pin the ones you care about to a countdown at the top so you always know what’s coming up next.",
      "Sync birthdays from your Contacts and your Google or Apple calendar — imported dates show as blue dots on the calendar view, and one tap turns any of them into a real Moment you can invite people to.",
      "Invite friends and family to a Moment. They get a notification, can accept or decline, and everyone shows up on the day.",
      "On This Day — Home now surfaces up to 10 photos from this same day (or nearby dates) across the last few years. Tap one to start a story around the memory; the photo becomes the cover automatically.",
      "Redesigned Home — Prompt of the Day picks a fresh question every 24 hours. A new docking station carousel highlights challenges, referral rewards, and stories worth returning to. Recent Stories now paginates so scrolling feels smooth.",
      "Brand-new story composer — a block-native editor. Type, add photos, videos, and audio, and long-press the drag handle to reorder any block. What you compose is exactly the order your reader sees.",
      "Set the date, location, and music of a memory right from the compose screen — three chips right above the text area.",
      "Faster sign-up + sign-in — phone-only signup with Google and Apple options. Email login is preserved for existing users. Optional referral code at signup credits both you and the person who invited you with a free month.",
      "Invite your first 3 friends and unlock a free month. Give a month, get a month — every friend who joins with your invite gets you another. Share via SMS, WhatsApp, Messenger, or anywhere else, with your link and message pre-filled.",
      "Story order preserved end-to-end — reorder blocks in the composer and the reader sees them in that exact order in OpenStory, whether they’re browsing the closed card preview or the full open sheet.",
      "Faster covers on slow networks — photos you pick as a Moment cover are now compressed before upload, so submitting from cellular finishes in seconds instead of stalling out.",
      "Tap the like count on a story to see who liked it.",
      "Draft auto-save so nothing gets lost mid-compose.",
      "Countless smaller improvements: smoother animations, more reliable sign-in, better handling of edited stories with media removal, sharper OpenStory transitions, faster tab switches, and fixes for the little papercuts you’d only notice if they were there.",
    ],
  },
  {
    version: "Version 3.3",
    date: "July 2, 2026",
    items: [
      "New 90-day free trial — sign up and get full access for three months, no card required. We’ll remind you 30 days before it ends.",
      "Monthly and Yearly subscriptions are here — subscribe from Settings → Subscription and unlock unlimited access. Cancel anytime; you keep access until the period ends.",
      "Cleaner cancel flow — tap Cancel, tell us why (optional), confirm in Apple’s sheet, and we’ll show you a Processing state until it’s confirmed. If you back out without confirming, the Cancel button comes right back.",
      "Restore Purchases — got a new phone or reinstalled the app? Tap Settings → Restore Purchases to re-attach an existing subscription without paying again.",
      "Refined free experience — Inspiration shows a preview card, and any write action (create, share, delete, comment) points you toward starting a trial or subscribing. All restrictions lift the moment you’re on a plan.",
      "Share your story with anyone, even off the app — toggle “Enable public link” from the Share or Export sheet to get a URL that opens in any browser. Turn it off and the link stops working the same second.",
      "The Copy Link tile has been replaced with “Open in Browser” so you can preview the public page yourself before sharing it.",
      "Public URLs now go along for the ride when you share to WhatsApp, Messenger, or iMessage — recipients get a working link instead of an empty message.",
      "Face ID / Touch ID sign-in — enable it once and skip the password every time you open the app.",
      "Watch videos full-screen in landscape — tap the rotate button in the top corner while playing.",
      "Video stories now play clean — the play button fades out once a video starts, and tapping anywhere on the video pauses it.",
      "Story export — save any story as a clean PDF with cover, prompt, and your photos, videos, and voice notes laid out inline. Or share the PDF straight from the Export sheet.",
      "“Add Story” is now “Add to this Story” so it’s clearer you’re contributing to an existing thread rather than starting a new one.",
      "Stories in a thread now show in the order they were written — the creator’s original always sits first, no matter how many people add later.",
      "Deleting a story from a multi-story thread now keeps you right where you are — the deleted one disappears from the pager and you can keep reading the rest.",
      "Story progress tracker now visible in both the collapsed preview and the expanded view — you always know how many stories are in the thread.",
      "Titles never come up blank across Timeline, Interactions, and other lists — friendly fallbacks fill in when a story doesn’t have one yet.",
      "Brand new onboarding — relationship setup drives the whole flow, prompts and sample stories match who you’re starting with.",
      "Edit a story after publishing — fix typos, swap a photo, or refine your wording without losing your work.",
      "Profile got a refresh — new cover cropper, cleaner stats, and a redesigned layout end-to-end.",
      "Library filter pills got a design refresh — new outline color, sharper look.",
      "Cleaner story view — refined headers, a note pill in OpenStory, smoother back buttons, and consistent typography across stories, albums, and prompt cards.",
      "Sharing is instant — when you send to friends or groups, the picker updates right away so you never see who you just shared with again.",
      "Sharper polish — camera works reliably after permission grants, photo cropping captures exactly what you selected, faster tabs and modals, contact selection stays put in the Share modal, album picking selects on first tap.",
      "Lots of smaller improvements you’ll feel without us pointing them out.",
    ],
  },
  {
    version: "Version 3.2",
    date: "May 9, 2026",
    items: [
      "Welcome to Epoch Lag 3.0 — the biggest update we’ve ever shipped. Every screen has been rebuilt from the ground up.",
      "Floating tab switcher on Home and Interactions so you can swap modes with a single tap.",
      "Brand new onboarding — relationship setup, sample stories, and a smoother first run.",
      "Edit a story after publishing — fix typos, swap a photo, or refine your wording without losing your work.",
      "Inspo cards flip with a little celebration when you answer them.",
      "Faster uploads, smoother animations, a cleaner timeline, and a 9:16 cover cropper that locks to the shape your story will use.",
    ],
  },
];

export default function ReleaseNotesPage() {
  return (
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Release Notes" />
      <HeroBanner src={Gradient6.src} />

      <div className="flex flex-col gap-[28px] max-w-[760px]">
        <h1 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Release Notes
        </h1>

        {RELEASES.map((r, i) => (
          <section key={i} className="flex flex-col gap-[10px]">
            <div>
              <h2 className="font-montserrat font-bold text-primary-blue text-[16px] md:text-[17px]">
                {r.version}
              </h2>
              <p className="font-montserrat text-primary-blue/60 text-[12px] mt-[2px]">
                {r.date}
              </p>
            </div>
            <ul className="list-disc pl-[20px] flex flex-col gap-[8px]">
              {r.items.map((item, j) => (
                <li
                  key={j}
                  className="font-montserrat text-primary-blue text-[14px] leading-[160%]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
