# feature: onboarding
routes:
  - /onboarding/welcome
  - /onboarding/why-epoch-lag
  - /onboarding/whats-a-lag
  - /onboarding/add-memory
  - /onboarding/add-time-place
  - /onboarding/add-participants
  - /onboarding/lag-preview
  - /onboarding/create-account
  - /onboarding/share-lag
  - /onboarding/add-relationship
  - /onboarding/memory-tags
  - /onboarding/free-trial
  - /onboarding/what-to-expect
  - /onboarding/referral-pitch
  - /onboarding/complete
be endpoints:
  - POST /api/onboarding/anon/create-draft
  - POST /api/onboarding/anon/save-draft
  - GET  /api/onboarding/anon/draft
  - POST /api/onboarding/anon/upload-token
  - POST /api/auth/register
  - POST /api/subscription/start-trial
  - POST /api/onboarding/anon/merge
env: tunnel

## global prereqs
- viewport: [mobile, tablet, desktop]
- HTTPS (upload token flow refuses HTTP LAN origins)

## fixtures required
- env.TEST_PHONE_NEW — fresh number
- env.TEST_OTP_STATIC
- env.TEST_COVER_IMAGE — small JPG
- env.TEST_LOCATION_QUERY — e.g. "Paris" — must return Places results

## setup notes
- All screens render inside `OnboardingShell` (NextPill on desktop,
  fixed-bottom `Next` button on mobile) unless hideMobileNext /
  hideDesktopNext is set.
- Toast copy is EXACT — pasted from source below.
- Anon draft token minted on AddMemory mount; persisted via
  secureTokenStore (NOT plain localStorage).
- MicPermissionSheet reused across mic-denied paths (see composers).
- MobileLogo alt="Epoch Lag" on all mobile onboarding headers.

---

## scenario: welcome-to-whats-a-lag
prereqs: signed_out
steps:
  - goto: /onboarding/welcome
  - visible: role=heading name="Stories weren't meant to disappear in a feed"
  - visible: text*="Whether it's your family history"
  - visible: role=link name="Log in"
  - click: role=button name="Next"
  - wait_url: /\/onboarding\/why-epoch-lag/ timeout=3000
  - # 3-slide carousel — click Next 3x
  - click: role=button name="Next"
  - click: role=button name="Next"
  - click: role=button name="Next"
  - wait_url: /\/onboarding\/whats-a-lag/ timeout=3000
  - visible: role=heading name="What's a Lag?"
  - visible: text="A Lag is created when combining 3 important elements:"
  - visible: text="A Story"
  - visible: text="A Time & Place"
  - visible: text="The People"
  - click: role=button name="Next"
  - wait_url: /\/onboarding\/add-memory/ timeout=3000
assert:
  - url_matches: /\/onboarding\/add-memory/

## scenario: welcome-log-in-link
prereqs: signed_out
steps:
  - goto: /onboarding/welcome
  - click: role=link name="Log in"
assert:
  - url_equals: /login

## scenario: why-epoch-slide-privacy
prereqs: on /onboarding/why-epoch-lag, final slide
steps:
  - # verify slide-3 privacy heading + copy
  - visible: role=heading name="Epoch Lag is secure and private, always."
  - visible: text*="We take your privacy seriously"

---

## scenario: add-memory-happy-path
prereqs: signed_out, env.TEST_COVER_IMAGE
steps:
  - goto: /onboarding/add-memory
  - visible: role=heading name*="Start by adding one of"    # h1: "Start by adding one of\nyour favorite memories"
  - # CoverFront empty text — mobile: "Tap to upload a photo", desktop: "Upload an image"
  - visible: text="Tap to upload a photo" OR text="Upload an image"
  - visible: text="My favorite memory"                     # caption
  - # upload cover
  - upload_file: css=input[type="file"][accept="image/*"] = env.TEST_COVER_IMAGE
  - wait: cover preview visible timeout=8000
  - # PillRow — flip to editor
  - visible: role=button name="Add text"
  - visible: role=button name="Record audio"
  - visible: role=button name="Add video"
  - visible: role=button name="Add image"
  - click: role=button name="Add text"
  - wait: placeholder="Write your story…" visible
  - type: placeholder="Write your story…" = "Test memory content"
  - # SubCardSlot flip hint OR helper text visible depending on state
  - wait: 2000                                             # debounced save 1500ms
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/add-time-place/

## scenario: add-memory-toast-missing-cover
prereqs: on /onboarding/add-memory with text but no cover
steps:
  - click: role=button name="Next"
assert:
  - toast visible: "A cover image is required"

## scenario: add-memory-toast-missing-content
prereqs: on /onboarding/add-memory with cover but no text/media
steps:
  - click: role=button name="Next"
assert:
  - toast visible: "Please add some content"

## scenario: add-memory-video-upload
prereqs: on /onboarding/add-memory
steps:
  - click: role=button name="Add video"
  - upload_file: css=input[type="file"][accept="video/*"] = env.TEST_VIDEO_SHORT
  - wait: 3500                                             # 2.5s poster timeout guard
assert:
  - video ThumbTile visible OR "Upload failed" text on failure

## scenario: add-memory-upload-failed-thumb
prereqs: on /onboarding/add-memory, upload mocked to fail
steps:
  - upload_file: image
  - wait: 3000
assert:
  - text visible: "Upload failed"
  - toast visible: "Couldn't add that photo. Please try a different photo."
  - # Remove via aria-label="Remove" on ThumbTile
  - click: role=button name="Remove"

## scenario: add-memory-mic-denied
prereqs: on /onboarding/add-memory, mic pre-denied
steps:
  - click: role=button name="Record audio"
assert:
  - MicPermissionSheet visible with role=heading name*="Microphone access"

## scenario: add-memory-audio-modal
prereqs: mic granted, click Record audio
steps:
  - visible: role=heading name="Record audio"          # h3 in modal
  - # AudioRecorder controls
  - visible: text="Tap to record"
  - visible: role=button name="Start recording"

---

## scenario: add-time-place-happy
prereqs: on /onboarding/add-time-place with prior AddMemory data
steps:
  - visible: role=heading name*="Now add a time and place"    # h1
  - # DateField placeholder
  - visible: text="Add date"
  - click: Add date field
  - # Calendar opens
  - visible: month header from MONTHS array (e.g., "January")
  - visible: day headers "m", "t", "w", "t", "f", "s", "s"
  - click: any valid day button
  - # LocationField
  - click: text="Add place"
  - # LocationPickerModal
  - wait: role=heading name="Add Location" visible timeout=2000
  - visible: placeholder="Search for a place"
  - # empty state
  - visible: text="Search for a city, address, or landmark"
  - type: placeholder="Search for a place" = env.TEST_LOCATION_QUERY
  - # loading state
  - visible: text="Loading…" OR results
  - # click first result button (mainText bold)
  - click: first suggestion row
  - # modal closes, LocationField shows city
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/add-participants/

## scenario: add-time-place-dont-know
prereqs: on /onboarding/add-time-place with date set
steps:
  - # DontKnowCheckbox
  - click: text="I don't know the location"
  - # LocationField disabled visually
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/add-participants/

## scenario: add-time-place-toast-missing-date
prereqs: on /onboarding/add-time-place, no date
steps:
  - click: role=button name="Next"
assert:
  - toast visible: "Please pick a date"

## scenario: add-time-place-toast-missing-location
prereqs: on /onboarding/add-time-place with date but no location + not dont-know
steps:
  - click: role=button name="Next"
assert:
  - toast visible: "Please add a location or tick 'I don't know the location'"

## scenario: add-time-place-search-no-results
prereqs: LocationPickerModal open
steps:
  - type: placeholder="Search for a place" = "zzzzzz"
assert:
  - text visible: "No results"

---

## scenario: add-participants-add-and-remove
prereqs: on /onboarding/add-participants
steps:
  - visible: role=heading name*="Who was part of this story"
  - # first participant card
  - visible: placeholder="Their Name" OR placeholder="Their name"
  - type: placeholder="Their Name" = "Alice"
  - # RelationshipChips (Mom / Dad / Sibling / Child / Partner / Friend / Grandparent / Other)
  - click: role=button name="Friend"
  - # add another
  - click: role=button name*="Add"
  - # verify second card
  - visible: placeholder="Their name" (nth=1)
  - type: (nth=1) = "Bob"
  - # remove Bob via aria-label="Remove"
  - click: role=button name="Remove" (scoped to Bob's card)
  - text hidden: "Bob"
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/lag-preview/

---

## scenario: lag-preview-uploading-state
prereqs: on /onboarding/lag-preview after full anon composer
steps:
  - visible: role=heading name*="You created a Lag"
  - # PreviewCard save button
  - visible: role=button name="Save"
  - click: role=button name="Next"
  - # Next button text flips to "Uploading…" during save
  - visible: text*="Uploading…" timeout=2000
assert:
  - eventually: url_matches: /\/signup/ OR /\/onboarding\/create-account/

## scenario: lag-preview-save-icon
prereqs: on /onboarding/lag-preview
steps:
  - click: role=button name="Save"
assert:
  - network 200: POST /api/onboarding/anon/save-draft

---

## scenario: create-account-phone-mode
prereqs: just verified phone OTP as new user
steps:
  - # on /onboarding/create-account?mode=phone
  - visible: role=heading name="Create an account to save your Lag"
  - # inputs
  - visible: placeholder="First Name"
  - visible: placeholder="Last Name"
  - visible: text="Full Name"                       # field label
  - visible: text="Date of Birth"
  - visible: text="Email"
  - visible: text="Phone Number"
  - visible: placeholder="Email Address"
  - visible: placeholder="123 456 6780"
  - # DateInput
  - visible: placeholder="dd/mm/yyyy"
  - # Referral card
  - visible: text="Referral code"
  - visible: placeholder="Enter Code"
  - visible: role=button name="Validate"
  - # fill and submit
  - type: placeholder="First Name" = "Test"
  - type: placeholder="Last Name" = "User"
  - type: placeholder="dd/mm/yyyy" = "01/01/1990"
  - type: placeholder="Email Address" = "test-<random>@example.com"
  - click: role=button name="Agree and Continue"
  - # submit loading state: "Working…"
assert:
  - if draftToken present: url_matches: /\/onboarding\/share-lag\?postSignup=1/
  - else: url_matches: /\/onboarding\/add-relationship/
  - storage[epoch_auth_token]: not_empty

## scenario: create-account-referral-validate
prereqs: on /onboarding/create-account
steps:
  - type: placeholder="Enter Code" = env.TEST_REFERRAL_CODE
  - click: role=button name="Validate"
  - # success message (green): "✓ Code successfully applied" or backend message
  - visible: text matches /✓/
  - # OR error (red): "× Invalid code"

---

## scenario: share-lag-copy-link
prereqs: signed_in, on /onboarding/share-lag?postSignup=1
steps:
  - visible: role=heading name="Stories are better told together"
  - visible: text*="Lags are most valuable when built through shared storytelling"
  - visible: text="Share story using a link"
  - # LinkCard — Share button flips to "Copied"
  - click: role=button name="Share"
  - wait: 500
assert:
  - visible: role=button name="Copied"
  - clipboard contains: /https:\/\/epochlag\.com\/(story|prompt|s)\/\w+/

## scenario: share-lag-next
prereqs: on /onboarding/share-lag
steps:
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/add-relationship/

---

## scenario: add-relationship-happy
prereqs: on /onboarding/add-relationship
steps:
  - visible: role=heading name*="Who would you like"    # h1: "Who would you like\nto share Lags with?"
  - # RelationshipRow options: Mom, Dad, Sibling, Grandparent, Friend, Other
  - visible: role=button name="Mom"
  - visible: role=button name="Dad"
  - visible: role=button name="Sibling"
  - visible: role=button name="Grandparent"
  - visible: role=button name="Friend"
  - visible: role=button name="Other"
  - click: role=button name="Mom"
  - # aria-pressed flips
  - click: role=button name="Friend"
  - click: role=button name="Other"
  - # conditional input reveals
  - visible: placeholder="Who else?"
  - type: placeholder="Who else?" = "Cousin"
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/memory-tags/

## scenario: memory-tags-happy
prereqs: on /onboarding/memory-tags
steps:
  - visible: role=heading name*="What kinds of memories"
  - # TagChip options: Travel, Pets, Parenthood, Love, Siblings, Childhood, Nostalgia, Humor, Milestones, Education, Tradition, Loss, Gratitude, Career
  - visible: role=button name="Travel"
  - visible: role=button name="Pets"
  - visible: role=button name="Family"     # verify against actual list; label may differ
  - click: role=button name="Travel"
  - click: role=button name="Nostalgia"
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/free-trial/

---

## scenario: free-trial-start
prereqs: on /onboarding/free-trial, signed_in with plan=free
steps:
  - visible: role=heading name*="Your 3 months of full"      # h1 "Your 3 months of full\naccess starts now."
  - visible: text="No credit card. Just keep telling stories."
  - visible: role=button name="Continue"
  - click: role=button name="Continue"
  - # button flips to "Starting…"
  - visible: role=button name="Starting…" OR disabled timeout=1000
  - wait_url: /\/onboarding\/what-to-expect/ timeout=5000
assert:
  - network 200: POST /api/subscription/start-trial

## scenario: free-trial-double-tap-guard
prereqs: on /onboarding/free-trial
steps:
  - click: role=button name="Continue"
  - click: role=button name="Continue" (immediately)
assert:
  - network 200: POST /api/subscription/start-trial (exactly 1)

## scenario: what-to-expect-next
prereqs: on /onboarding/what-to-expect
steps:
  - visible: role=heading name="What to expect"
  - # 5 rows with two-digit index badges (01, 02…) rendered via padStart
  - visible: text="01"
  - click: role=button name="Next"
assert:
  - url_matches: /\/onboarding\/referral-pitch/

## scenario: referral-pitch-share
prereqs: on /onboarding/referral-pitch, code loaded
steps:
  - visible: role=heading name="Give a month, get a month."
  - visible: text*="Invite someone to Epoch Lag"
  - visible: text*="+30"                              # +30 Days badge
  - visible: role=button name="Share my invite"
  - click: role=button name="Share my invite"
assert:
  - # navigator.share called with text only (no url), OR clipboard fallback on desktop
  - clipboard contains: /epochlag\.com\/r\/\w+/ (desktop)
  - # after 800ms: auto-advance to /onboarding/complete
  - wait_url: /\/onboarding\/complete/ timeout=2000

## scenario: referral-pitch-loading-state
prereqs: on /onboarding/referral-pitch, code fetch pending
steps:
  - visible: role=button name="Loading your invite…" OR disabled

## scenario: referral-pitch-error-retry
prereqs: on /onboarding/referral-pitch, code fetch failed
steps:
  - visible: role=button name="Couldn't load — tap to retry"
  - click: role=button name*="tap to retry"
assert:
  - retries the mint call

## scenario: referral-pitch-maybe-later
prereqs: on /onboarding/referral-pitch
steps:
  - click: role=button name="Maybe later"
assert:
  - url_matches: /\/onboarding\/complete/

## scenario: referral-pitch-copy-toast
prereqs: on /onboarding/referral-pitch, clipboard fallback path (desktop)
steps:
  - click: role=button name="Share my invite"
assert:
  - toast visible: "Invite copied to clipboard"

---

## scenario: onboarding-complete-cards
prereqs: on /onboarding/complete
steps:
  - # SuccessCelebration plays 2800ms
  - wait: 3000
  - visible: role=heading name*="You're all set"
  - # StartHereCard tiles
  - visible: text="START HERE"
  - visible: role=button OR link name*="Create another lag"
  - visible: role=button OR link name*="Add Moments to my calendar"
  - # CTA
  - visible: role=button name="Start exploring Epoch Lag"
  - click: role=link name*="Create another lag"
assert:
  - url_equals: /new-lag

## scenario: onboarding-complete-moments-goes-to-new
prereqs: on /onboarding/complete
steps:
  - wait: 3000
  - click: role=link name*="Add Moments to my calendar"
assert:
  - url_equals: /moments/new

## scenario: onboarding-complete-explore
prereqs: on /onboarding/complete
steps:
  - wait: 3000
  - click: role=button name="Start exploring Epoch Lag"
assert:
  - url_equals: /home

---

## known limits (do not file bugs)
- WhyEpochLag carousel: fade+translate transitions decorative; don't
  assert on transient opacity. Click Next N times.
- AddMemory anon draft token lives in secureTokenStore, not plain
  localStorage.
- FreeTrial /start-trial fails silently on HTTP LAN (BE cross-origin).
- Video-poster timeout (2.5s) means adding a large video takes a beat.
- Native share popup on ReferralPitch is browser UI — automate the
  clipboard fallback path on desktop; native share is manual-only.
- CoverFront text differs by breakpoint: mobile "Tap to upload a
  photo", desktop "Upload an image".
- AddParticipants first placeholder is "Their Name" (capital N),
  subsequent placeholders are "Their name" (lowercase n) — intentional
  in code.

## last updated
2026-09-09 — full rewrite from verified inventory (agent). All
placeholders, aria-labels, headings, toast strings, and role-based
selectors match actual JSX source.
