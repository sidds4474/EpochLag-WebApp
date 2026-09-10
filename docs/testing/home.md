# feature: home
routes: /home
be endpoints:
  - GET /api/home/feed              # docking-station reminders
  - GET /api/stories?limit=10       # recent stories
  - POST /api/bookmarks/:cardId
  - POST /api/user-card/:cardId/share
  - POST /api/referral/code         # prefetched for invite tile
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- env.TEST_USER_FIRSTNAME — for greeting assertion

## setup notes
- Docking tiles are typed by `item.type` (card_of_the_day | challenge |
  hows-life | announcement | moment | birthday) and routed by
  `resolveDockingAction()`. NO `data-*` attribute discriminators —
  identify tiles by visible text + overline text.
- Referral tile identified by `action.kind === "give-a-month-get-a-month"`
  or `"give-a-month-get-month"`. Visible text: "Give a month, get a
  month" (or BE-supplied `item.title`).
- Bookmark button aria-label state-dependent: `"Bookmark"` (unsaved) vs
  `"Remove bookmark"` (saved).
- Notifications bell aria-label state-dependent: `"Notifications"` vs
  `"Notifications, {count} unread"`.

---

## scenario: home-renders-primary-surfaces
prereqs: signed_in
steps:
  - goto: /home
  - wait: role=heading (h1 greeting) visible timeout=5000
assert:
  - # heading text matches greeting pattern
  - text visible matching /Good (Morning|Afternoon|Evening|Night), .+/
  - visible: text*=env.TEST_USER_FIRSTNAME
  - # section headers
  - visible: text="What's new?"        # RemindersRow
  - visible: text="Recent Lags"        # RecentStoriesRow
  - visible: text="About Epoch Lag"    # ResourcesRow

## scenario: home-hero-bell-mobile
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /home
  - # aria-label composes based on unread count
  - wait: css=a[aria-label^="Notifications"] visible timeout=3000
  - click: css=a[aria-label^="Notifications"]
assert:
  - url_equals: /notifications

## scenario: home-hero-bell-unread-count
prereqs: signed_in with ≥1 unread notification, viewport: mobile-only
steps:
  - goto: /home
assert:
  - # aria-label appends ", N unread"
  - visible: css=a[aria-label*=" unread"]

## scenario: home-hero-search-pill
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /home
  - # Link containing "Find memories" text
  - visible: text="Find memories"
  - click: css=a[href="/search"] >> text="Find memories"
assert:
  - url_equals: /search

---

## scenario: reminders-empty-add-moment
prereqs: signed_in, no docking items
steps:
  - goto: /home
assert:
  - visible: text*="Add a Moment"     # AddMomentCTA
  - visible: css=a[href="/new-story?moment=1"]

## scenario: reminders-loading-skeleton
prereqs: signed_in, slow network
steps:
  - clear caches, goto: /home
assert:
  - within 500ms: visible 3 pulse skeleton cards in reminders section
  - eventually: real tiles replace skeletons

## scenario: reminders-prompt-of-day
prereqs: signed_in, feed contains a card_of_the_day item
steps:
  - goto: /home
  - wait: text="Prompt" visible timeout=5000   # overline text on card_of_the_day tile
  - # tile has CircleArrowButton with aria-label="Open"
  - click: css=button:has(text="Prompt")       # click any tile with overline "Prompt"
assert:
  - url_matches: /^\/prompt\/detail\/[a-f0-9]{24}\?mode=curated/

## scenario: reminders-challenge-tile
prereqs: feed contains a challenge or hows-life item
steps:
  - goto: /home
  - visible: text="Challenge"                  # overline for challenge/hows-life/announcement
  - click: button with overline "Challenge"
assert:
  - url_matches: /^\/(prompt\/detail\/.+|invite\?variant=)/

## scenario: reminders-invite-tile-give-a-month
prereqs: feed contains a give-a-month referral item
steps:
  - goto: /home
  - # visible text on invite tile: "Give a month, get a month" or similar
  - visible: text matches /Give a month.*get.*month/i
  - click: button containing that text
assert:
  - url_matches: /^\/invite\?variant=reward/
  - # after prefetch, invite page shows link on first paint
  - visible: text matches /epochlag\.com\/r\// within 200ms

## scenario: reminders-moment-tile
prereqs: feed contains a moment or birthday item
steps:
  - goto: /home
  - # birthday tiles carry sub-label "Today" if source=birthday
  - visible: text="Today" (conditional)
  - click: any moment/birthday tile
assert:
  - url_matches: /^\/new-story\?wishRecipient=/

## scenario: reminders-done-disabled
prereqs: feed contains item with progressStatus="completed"
steps:
  - goto: /home
assert:
  - visible: text="Done" (sub-label on completed tile)
  - # tile button is disabled

---

## scenario: recent-stories-empty
prereqs: signed_in, 0 recent stories
steps:
  - goto: /home
  - wait: text="Recent Lags" visible timeout=5000
assert:
  - visible: text*="No stories yet"
  - visible: role=link name*="Create a story"
  - link href: /new-story

## scenario: recent-stories-tile-tap
prereqs: signed_in with ≥1 recent story
steps:
  - goto: /home
  - wait: text="Recent Lags" visible
  - click: css=a[href^="/thread/"]:first-of-type
assert:
  - url_matches: /^\/thread\/[a-f0-9]{24}$/

## scenario: recent-stories-bookmark-toggle
prereqs: signed_in with ≥1 recent story
steps:
  - goto: /home
  - # capture initial aria-label
  - capture: aria-label of first css=button[aria-label*="Bookmark"]
  - click: first css=button[aria-label*="Bookmark"] scoped to story tile
  - wait: 800
assert:
  - aria-label flips ("Bookmark" ↔ "Remove bookmark")
  - network 200: POST /api/bookmarks/:cardId
  - reload: state persists

## scenario: recent-stories-share
prereqs: signed_in with ≥1 recent story
steps:
  - goto: /home
  - click: first css=button[aria-label="Share"]
  - wait: role=dialog name="Send to" visible timeout=2000
  - press: Escape
assert:
  - drawer closes

## scenario: recent-stories-view-all
prereqs: signed_in
steps:
  - goto: /home
  - # SectionHeader has viewAllHref="/lags"
  - click: role=link name*="View all"  # OR simply css=a[href="/lags"] inside Recent Lags header
assert:
  - url_equals: /lags

---

## scenario: resources-tiles
prereqs: signed_in
steps:
  - goto: /home
  - visible: text="About Epoch Lag"
  - visible: text="START HERE"           # kicker on ResourceTile
  - visible: text="Why Epoch Lag?"
  - visible: text="How to use Epoch Lag"
  - click: role=button (Why Epoch Lag tile)
assert:
  - url_equals: /why-epoch-lag

## scenario: resources-coming-soon-tile
prereqs: signed_in
steps:
  - goto: /home
  - click: "How to use Epoch Lag" tile     # href undefined
assert:
  - toast visible: "Coming soon"
  - no navigation

---

## scenario: on-this-day-card
description: mobile-only card shown when BE returns an anniversary story
prereqs: signed_in, has an on-this-day story, viewport: mobile-only
steps:
  - goto: /home
assert:
  - visible: text matching /On This Day \d+ Years? Ago/
  - visible: role=heading (h3) with story title
  - click: card → url_matches: /^\/thread\//

## scenario: on-this-day-desktop-hidden
prereqs: signed_in, viewport: desktop-only
steps:
  - goto: /home
assert:
  - hidden: text*="On This Day"

---

## scenario: cache-purge-on-signout
description: module caches purge on hard-reload signOut
prereqs: signed_in as USER_A with stories
steps:
  - goto: /home
  - capture: any USER_A story title from Recent Lags
  - signOut
  - sign in as USER_B (different account)
  - goto: /home
assert:
  - text hidden: captured USER_A story title
fail_if:
  - USER_A story flashes briefly (module-cache leak regression)

---

## known limits (do not file bugs)
- Docking feed cache TTL: 5 minutes AND per-day key. Refetch on stale
  or day-rollover.
- Hero bell + search pill are mobile-only (md:hidden); desktop uses
  top-nav header for the same functions.
- Referral code prefetch is fire-and-forget; if network slow, invite
  tile still opens but link may briefly show placeholder.
- OnThisDayCard only renders on mobile AND when BE returns matching
  anniversary — don't assert unconditionally.
- Docking tile type discrimination is by `item.type` and `action.kind`
  fields in the JSON payload, NOT by DOM `data-*` attributes. Tests
  identify tiles by visible overline text ("Prompt" / "Challenge") or
  by tile title text.
- CircleArrowButton on all tiles carries `aria-label="Open"` — not
  unique per tile; scope selectors by parent context.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent).
