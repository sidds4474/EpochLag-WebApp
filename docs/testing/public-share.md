# feature: public-share
routes:
  - /moment/[publicCode]            # public moment
  - /prompt/[publicCode]            # public prompt (with or without story)
be endpoints:
  - GET /api/public/moment/:publicCode
  - GET /api/public/prompt/:publicCode
env: tunnel (or prod)

## global prereqs
- signed_out (both pages must render for unauthed users)
- viewport: [mobile, tablet, desktop]

## fixtures required
- env.TEST_PUBLIC_MOMENT_CODE
- env.TEST_PUBLIC_PROMPT_CODE_WITH_STORY
- env.TEST_PUBLIC_PROMPT_CODE_EMPTY

## setup notes
- SSR pages. `cache: "no-store"` — always fresh.
- Metadata generation per page (OG image, title, description).
- `detectPlatform(user-agent)` affects rendered view.
- Both routes have `not-found.tsx` (Next.js 404).

---

## scenario: public-moment-loads
prereqs: signed_out
steps:
  - goto: /moment/{env.TEST_PUBLIC_MOMENT_CODE}
  - wait: content visible timeout=5000
assert:
  - visible: moment title
  - visible: date (formatted with ordinal — "January 15th, 2024")
  - # countdown label: "Today", "Tomorrow", "in N days", "Yesterday", "N days ago"
  - visible: text matching one of those patterns
  - visible: author byline
  - visible: cover image (if set)
  - # participant count visible if > 0

## scenario: public-moment-not-found
prereqs: signed_out
steps:
  - goto: /moment/BAD_CODE_XYZ
assert:
  - Next.js 404 page rendered (from moment/[publicCode]/not-found.tsx)

## scenario: public-moment-og-metadata
prereqs: signed_out
steps:
  - goto: /moment/{env.TEST_PUBLIC_MOMENT_CODE}
  - inspect: <head>
assert:
  - meta[property="og:title"] present with moment title
  - meta[property="og:image"] present, resolves
  - meta[property="og:description"] present
  - link[rel="canonical"] present

## scenario: public-moment-recurring-utc
description: recurring moments render UTC-anchored dates (no timezone drift)
prereqs: signed_out, moment is recurring
steps:
  - # emulate LA timezone
  - emulate timezoneId="America/Los_Angeles"
  - goto: /moment/{env.TEST_PUBLIC_MOMENT_CODE}
  - capture date text
  - emulate timezoneId="Asia/Tokyo"
  - reload
  - capture date text
assert:
  - date text identical across both timezones

---

## scenario: public-prompt-with-story
prereqs: signed_out
steps:
  - goto: /prompt/{env.TEST_PUBLIC_PROMPT_CODE_WITH_STORY}
  - wait: content visible timeout=5000
assert:
  - # StoryPage view renders: prompt.content or firstStory.title as headline
  - visible: prompt content / title text
  - visible: author name
  - visible: story cover + body

## scenario: public-prompt-empty-view
prereqs: signed_out
steps:
  - goto: /prompt/{env.TEST_PUBLIC_PROMPT_CODE_EMPTY}
  - # PromptEmpty view renders
assert:
  - visible: text="{authorFirstName} asked"
  - visible: prompt.content (dynamic)
  - visible: role=button OR link name*="Answer prompts like this in Epoch Lag"
  - visible: text*="Ask the people who matter"

## scenario: public-prompt-not-found
prereqs: signed_out
steps:
  - goto: /prompt/BAD_CODE_XYZ
assert:
  - Next.js 404 page

## scenario: public-story-error-view
description: StoryError renders when fetch fails
prereqs: signed_out, prompt endpoint mocked to 500
steps:
  - goto: /prompt/{any-code}
assert:
  - visible: role=heading name="We couldn't load this story"
  - visible: text*="refreshing in a moment"
  - visible: role=button OR link name="Go to Epoch Lag"

---

## scenario: public-no-auth-required
description: unauthed users can view without redirect
prereqs: signed_out, cleared cookies + storage
steps:
  - goto: /moment/{env.TEST_PUBLIC_MOMENT_CODE}
assert:
  - url stays on /moment/…
  - NO redirect to /login or /onboarding/welcome
  - content renders

---

## known limits (do not file bugs)
- SSR with cache: "no-store". Every request hits BE.
- Platform detection routes MomentPage/StoryPage/PromptEmpty into
  mobile-optimized vs desktop layouts.
- Moment type-specific glyphs (PersonGlyph, RepeatGlyph) rendered
  aria-hidden.
- excerptO(text, 150) truncates for OG description.
- toOgImage(url) transforms cover URL for landscape crop (Cloudinary
  or wrapper).

## last updated
2026-09-09 — full rewrite from verified inventory (agent-5).
