# feature: composers
routes:
  - /new-lag                              # Tell a Story (StoryComposer)
  - /new-ask                              # Ask a Question (AskComposer)
  - /new-lag?draftId=X                    # resume draft
  - /new-lag?promptId=X                   # answer-a-prompt mode
  - /new-lag?albumId=X                    # album attach on publish
be endpoints:
  - POST /api/user-card                   # create prompt / cover mint
  - PUT  /api/user-card/:id               # attach cover
  - POST /api/stories                     # create story draft
  - POST /api/stories/:id/getUploadToken
  - POST https://api.cloudinary.com/v1_1/<cloud>/auto/upload
  - PUT  /api/stories/:id                 # finalize
  - PUT  /api/stories/:id/publish
  - PUT  /api/stories/thread/:tid/privacy
  - POST /api/user-card/:cardId/share
  - DELETE /api/stories/:id/media/:mediaId
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- env.TEST_IMAGE_SMALL, env.TEST_VIDEO_SHORT, env.TEST_AUDIO_FILE

## setup notes
- StoryComposer uses dnd-kit for block reordering. Drag handle
  aria-label="Drag to reorder", title matches.
- Block picker (bottom pill) uses aria-label="{type} block" per pill:
  "Text block", "Audio block", "Image block", "Video block". Tooltips
  vary ("Add Text", "Recording…", etc.).
- EmptyStateGrid tiles: aria-label="Add voice|photo|video|text" +
  visible text "Voice"|"Photo"|"Video"|"Text".
- Metadata chips have two variants: rail (desktop, "Add {X}" labels) vs
  compact (mobile, shorter "{X}" labels).
- ChooseCoverModal and UploadMediaModal share `aria-label="Close"` for
  their close buttons.

---

## scenario: story-empty-state-grid
prereqs: signed_in
steps:
  - goto: /new-lag
  - visible: placeholder="Title your story"
  - # EmptyStateGrid tiles visible before any block added
  - visible: role=button name="Add voice"     # aria-label
  - visible: role=button name="Add photo"
  - visible: role=button name="Add video"
  - visible: role=button name="Add text"
  - # visible labels on tiles
  - visible: text="Voice"
  - visible: text="Photo"
  - visible: text="Video"
  - visible: text="Text"

## scenario: story-publish-text-only
prereqs: signed_in
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "Test Story " + <random>
  - click: role=button name="Add text"        # EmptyStateGrid
  - # first text block: placeholder="Text"
  - wait: placeholder="Text" visible
  - type: placeholder="Text" = "Test body content"
  - click: role=button name="Create Story"
  - wait: 3200                                 # SuccessCelebration + StoryCreated overlay
  - visible: text="Story Created!"
  - click: role=button name="Done"
assert:
  - url_matches: /^\/thread\/[a-f0-9]{24}$/

## scenario: story-publish-with-cover
prereqs: signed_in, env.TEST_IMAGE_SMALL
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "Photo story"
  - # cover picker — desktop label "Add Cover image", mobile "Add a Cover image"
  - click: text*="Add Cover image" OR css=[data-cover-slot]
  - # ChooseCoverModal opens with "Choose Cover" heading
  - visible: role=heading name="Choose Cover"
  - click: role=button name="Upload"
  - upload_file: css=input[type="file"] = env.TEST_IMAGE_SMALL
  - # modal close via aria-label="Close" (desktop) or "Back" (mobile lg:hidden)
  - click: role=button name="Close"
  - # add text and publish
  - click: role=button name="Add text"
  - type: placeholder="Text" = "body"
  - click: role=button name="Create Story"
  - wait: 3500
  - click: role=button name="Done"
assert:
  - url_matches: /^\/thread\/[a-f0-9]{24}$/
  - network 200: POST /api/user-card       # cover mint
  - network 200: POST https://api.cloudinary.com/v1_1/*/auto/upload

## scenario: story-block-picker-pill
description: bottom block picker adds new blocks
prereqs: signed_in, on /new-lag with title + one text block
steps:
  - # block picker pills at bottom
  - visible: role=button name="Text block"
  - visible: role=button name="Audio block"
  - visible: role=button name="Image block"
  - visible: role=button name="Video block"
  - click: role=button name="Text block"
  - # subsequent text block: placeholder="Tell your story"
  - visible: placeholder="Tell your story"

## scenario: story-image-upload-via-picker
prereqs: signed_in, env.TEST_IMAGE_SMALL
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "Image body"
  - click: role=button name="Add photo"      # EmptyStateGrid tile
  - # UploadMediaModal opens, heading "Add images"
  - visible: role=heading name="Add images"
  - visible: role=button name="Upload"
  - upload_file: css=input[type="file"][accept="image/*"] = env.TEST_IMAGE_SMALL
  - wait: 3000
assert:
  - image block appears in editor
  - no toast: "Upload failed"

## scenario: story-video-upload
prereqs: signed_in, env.TEST_VIDEO_SHORT
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "Video body"
  - click: role=button name="Add video"
  - visible: role=heading name="Add videos"
  - visible: role=button name="Upload"
  - upload_file: css=input[type="file"][accept="video/*"] = env.TEST_VIDEO_SHORT
  - wait: 3500                                # poster generator 2.5s timeout guard
assert:
  - video block appears (with or without poster)
fail_if:
  - time_on_page > 15000 after upload (poster stall)

## scenario: story-audio-recording
manual-only: Playwright needs launch args --use-fake-ui-for-media-stream to auto-grant mic
prereqs: signed_in, mic permission GRANTED
steps:
  - goto: /new-lag
  - click: role=button name="Add voice"
  - # AudioRecorder shows idle state
  - visible: text="Tap to record"
  - visible: role=button name="Start recording"
  - click: role=button name="Start recording"
  - # button flips to Stop recording
  - visible: role=button name="Stop recording"
  - # timer displays mm:ss
  - visible: text matches /^\d{2}:\d{2}$/
  - wait: 2000
  - click: role=button name="Stop recording"
assert:
  - audio block appears with player row
  - visible: role=button name="Play" (audio player)

## scenario: story-audio-mic-denied
prereqs: signed_in, mic permission DENIED
steps:
  - goto: /new-lag
  - click: role=button name="Add voice"
assert:
  - MicPermissionSheet opens (see composers side)
  - visible: role=heading name*="Microphone access"
  - visible: role=button name="Try again"

---

## scenario: story-block-editor-drag-handle
prereqs: signed_in, 2+ blocks present
steps:
  - # drag handle on each block
  - visible: role=button name="Drag to reorder"
  - # reorder attempt (Playwright drag helper)
  - # verify order changed by inspecting DOM order of blocks
assert:
  - blocks reorder correctly

## scenario: story-block-remove
prereqs: 2+ blocks present
steps:
  - click: role=button name="Remove block" (first block)
assert:
  - block removed from DOM

## scenario: story-recording-pause-discard
prereqs: recording in progress (inline recorder on an audio block)
steps:
  - # inline recording controls
  - visible: role=button name="Stop recording"
  - visible: role=button name="Discard recording"
  - click: role=button name="Discard recording"
assert:
  - block removed / recording aborted

## scenario: story-audio-player-controls
prereqs: audio block present with recorded audio
steps:
  - # controls: Play/Pause + Remove audio
  - click: role=button name="Play"
  - visible: role=button name="Pause"
  - click: role=button name="Pause"
  - click: role=button name="Remove audio"
assert:
  - audio block removed

---

## scenario: story-title-input
prereqs: on /new-lag
steps:
  - visible: placeholder="Title your story"

## scenario: story-header-controls
prereqs: on /new-lag
steps:
  - visible: role=button name="Back"
  - visible: role=button name="Help"
  - visible: role=button name="Preview"
  - visible: role=button name="Create Story"      # or "Save" / "Finish" depending on flow

## scenario: story-help-tooltip
prereqs: on /new-lag
steps:
  - click: role=button name="Help"
  - # popover opens
  - visible: text="Write (or voice to text)"
  - visible: text="Record Voice Messages"
  - visible: text="Film or photograph a moment"
  - visible: text="Add images or videos from your camera roll"
  - click: role=button name="Close"
assert:
  - popover closes

## scenario: story-preview-overlay
prereqs: on /new-lag with title + one block
steps:
  - click: role=button name="Preview"
  - wait: role=dialog visible timeout=2000
  - visible: rendered title + block content
  - press: Escape
assert:
  - dialog closes

---

## scenario: story-meta-chips-desktop-rail
prereqs: on /new-lag, viewport: desktop
steps:
  - visible: role=button (rail chip) with text "Add Date"
  - visible: role=button with text "Add Location"
  - visible: role=button with text "Add Music"
  - visible: role=button with text*="Tag People"

## scenario: story-meta-chips-mobile-compact
prereqs: on /new-lag, viewport: mobile
steps:
  - # compact variant: shorter labels
  - visible: text="Date"
  - visible: text="Location"
  - visible: text="Music"
  - visible: text="Tag People"

## scenario: story-date-chip-picker
prereqs: on /new-lag
steps:
  - click: role=button (Date chip)
  - wait: role=heading name="Add Date" visible timeout=2000
  - visible: role=button name="Previous month"
  - visible: role=button name="Next month"
  - visible: role=button name="Today"
  - # click a day
  - click: role=button (any day cell)
  - visible: role=button name="Select" enabled
  - click: role=button name="Select"
assert:
  - modal closes
  - chip label updates to formatted date (e.g., "Jan 1, 2026")

## scenario: story-location-chip-picker
prereqs: on /new-lag
steps:
  - click: role=button (Location chip)
  - wait: role=heading name="Add Location" visible timeout=2000
  - visible: placeholder="Search for a place"
  - # empty state
  - visible: text="Search for a city, address, or landmark"
  - type: placeholder="Search for a place" = "Paris"
  - wait: results visible OR "Loading…" then results
  - click: first result row
assert:
  - modal closes
  - chip label reflects selected location

## scenario: story-music-chip-picker
prereqs: on /new-lag
steps:
  - click: role=button (Music chip)
  - wait: role=heading name="Add Music" visible timeout=2000
  - visible: placeholder="Search songs, artists"
  - type: placeholder="Search songs, artists" = "test"
  - wait: results OR skeleton (4 bars animate-pulse)
  - # first track has Play preview
  - visible: role=button name="Play preview"
  - click: first track row
assert:
  - modal closes
  - chip shows "Track Name — Artist" pattern

## scenario: story-tag-people-sheet
prereqs: on /new-lag with ≥1 friend
steps:
  - click: role=button name*="Tag People"
  - wait: role=heading name="Tag People" visible timeout=2000
  - visible: placeholder="Search friends"
  - # search or default state
  - visible: text*="Search for a friend to tag" OR friend list
  - type: placeholder="Search friends" = "friend name"
  - click: first friend row
  - visible: divider + Selected section
  - visible: role=button name="Remove {friend name}"
  - click: role=button name="Done"
assert:
  - sheet closes
  - chip updates: "{firstName}" (1 selected) OR "Name + N more"

---

## scenario: story-allow-share-toggle
prereqs: on /new-lag
steps:
  - visible: role=switch name="Allow others to share"
  - click: role=switch name="Allow others to share"
  - # aria-checked flips
assert:
  - # after publish, PUT /api/stories/thread/:tid/privacy called if changed

## scenario: story-secure-and-private-info
prereqs: on /new-lag
steps:
  - visible: text="Secure and Private"
  - visible: text="Only you can add people to this thread"

---

## scenario: story-draft-mode-hydrate
prereqs: signed_in, existing draft
steps:
  - goto: /new-lag?draftId=<known>
  - wait: placeholder="Title your story" visible
assert:
  - title input value matches saved title
  - blocks visible with saved content

## scenario: story-back-in-draft-mode
prereqs: on /new-lag?draftId=X
steps:
  - click: role=button name="Back"
assert:
  - url_matches: /^\/studio\?tab=draft/

## scenario: story-back-in-reply-mode
prereqs: on /new-lag?promptId=X
steps:
  - click: role=button name="Back"
assert:
  - url_equals: /inspiration

## scenario: story-back-in-album-mode
prereqs: on /new-lag?albumId=X
steps:
  - click: role=button name="Back"
assert:
  - url_matches: /^\/albums\/[a-f0-9]{24}/

---

## scenario: story-created-overlay-done
prereqs: just published a story, StoryCreatedOverlay visible
steps:
  - visible: text="Story Created!"
  - visible: role=button name="Done"
  - visible: role=button name="Send"
  - # tapping Send opens integrated SendToDrawer (celebrates "Prompt Sent")
  - click: role=button name="Send"
  - wait: role=dialog name="Send to" visible timeout=2000
  - # skip; close
  - press: Escape

## scenario: story-created-share-via-integrated-drawer
prereqs: StoryCreatedOverlay visible
steps:
  - click: role=button name="Send"
  - wait: role=dialog visible
  - click: first contact
  - click: role=button name="Send" (in drawer)
  - wait: role=button name="Done" visible timeout=5000
assert:
  - drawer closes on Done
  - network 200: POST /api/user-card/:cardId/share

---

## scenario: ask-happy-path
prereqs: signed_in
steps:
  - goto: /new-ask
  - visible: role=heading name*="Ask a Question"
  - visible: placeholder="What's your favorite memory?"
  - visible: text="Or try one of these"
  - type: placeholder="What's your favorite memory?" = "What is your favorite memory of Grandpa?"
  - # desktop: Send button in header
  - # mobile: Next in bottom bar
  - click: role=button name="Send"  # desktop OR "Next" mobile
  - # step 2 (mobile) — cover picker
  - # visible: text*="Add Cover image"
  - visible: role=button name="Upload"
  - upload_file: css=input[type="file"] = env.TEST_IMAGE_SMALL
  - wait: 2000
  - # gradient tile grid available too
  - click: role=button name="Send"   # or "Next"
  - # button flips to "Preparing…"
  - wait: role=dialog visible timeout=5000
assert:
  - SendToDrawer opens for share step
  - network 200: POST /api/user-card

## scenario: ask-suggestion-strip
prereqs: on /new-ask
steps:
  - visible: text="Or try one of these"
  - # 4 hardcoded suggestion buttons — click any
  - click: first suggestion button
assert:
  - question input populated with suggestion text

## scenario: ask-back-from-cover-preserves
prereqs: on /new-ask step 2 (cover), question already typed
steps:
  - click: role=button name="Back"
assert:
  - back to step 1
  - question input value preserved

## scenario: ask-mobile-step-dots
prereqs: on /new-ask, viewport: mobile-only
steps:
  - # 2 dots visible (aria-hidden)
  - # step 0: dot 0 active (orange pill w-[24px])
  - # step 1: dot 1 active
  - visible: css=[class*="pill"]:has([class*="orange"])
  - # advance to step 2, verify dot flip

---

## scenario: story-mobile-chip-row-clip-fix
description: regression — chip row must not clip
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "any"
  - # MobileMetaChipRow with compact chips
  - wait: text="Location" visible timeout=3000
assert:
  - bounding-box of chip row: height >= 44

---

## scenario: publish-error-toasts
prereqs: signed_in, BE mocked to 500 on publish
steps:
  - goto: /new-lag
  - type: placeholder="Title your story" = "Will fail"
  - click: role=button name="Add text"
  - type: placeholder="Text" = "body"
  - click: role=button name="Create Story"
assert:
  - toast visible*: BE error message OR "Something went wrong"
  - stays on /new-lag
  - button re-enabled

---

## known limits (do not file bugs)
- Cloudinary uploads fail on HTTP LAN test — HTTPS required.
- Mic permission needs browser launch args to auto-grant in Playwright;
  otherwise treat as manual-only.
- Video poster generator has 2.5s hard timeout — large videos publish
  with a null poster.
- Edit-mode preserve-untouched: null chip state means "don't overwrite BE".
- Album attach on publish is best-effort; failure only logs.
- CircleArrowButton and drag handle aria-labels are generic across the
  app — scope selectors by parent context.

## last updated
2026-09-09 — full rewrite from verified inventory (agent). Every
aria-label, placeholder, and button text traced back to actual source.
