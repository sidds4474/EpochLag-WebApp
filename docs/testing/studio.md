# feature: studio
routes:
  - /studio?tab=received|sent|bookmark|draft
  - /studio/edit                    # Edit Info form
  - /studio/edit-cover              # separate cover edit
  - /profile/[id]                   # friend profile
be endpoints:
  - GET /api/user/profile
  - GET /api/user/cards?tab=…&page=N&limit=10
  - GET /api/user/stories/drafts?page=N&limit=20
  - POST /api/user-card/:promptId/bookmark  (+ DELETE)
  - GET /api/friends/requests?direction=received
  - POST /api/avatar (multipart)
  - POST /api/cover (multipart)
  - PATCH /api/user/profile (form-urlencoded)
  - GET /api/users/:userId
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- Test account with ≥1 received prompt (answered + unanswered), ≥1
  sent prompt, ≥1 bookmarked card, ≥1 draft
- env.TEST_AVATAR_IMAGE
- USER_B account (for /profile/[id] scenarios)

---

## scenario: studio-header-renders
prereqs: signed_in
steps:
  - goto: /studio
  - visible: role=heading name="Studio" (h1)
  - visible: role=heading (h2) showing user's full name
  - visible: role=button name="Settings"           # both mobile + desktop gear
assert:
  - visible: role=button name="Change cover"
  - visible: role=button name="Change photo"
  - # mobile-only pencil
  - viewport mobile: visible: role=button name="Edit profile"
  - # desktop-only text
  - viewport desktop: visible: role=link name*="Edit studio" OR button

## scenario: studio-tab-switch
prereqs: on /studio
steps:
  - click: role=button name="Received"
  - url_matches: /\?tab=received/
  - click: role=button name="Sent"
  - url_matches: /\?tab=sent/
  - click: role=button name="Bookmark"
  - url_matches: /\?tab=bookmark/
  - click: role=button name="Draft"
  - url_matches: /\?tab=draft/
assert:
  - each tab loads within 3s
  - network 200: GET /api/user/cards?tab=<X> (or drafts for Draft)

## scenario: studio-unanswered-card-opens-composer
prereqs: on /studio?tab=received with ≥1 unanswered card
steps:
  - click: role=button (first unanswered CardTile)
assert:
  - url_matches: /^\/new-lag\?promptId=[a-f0-9]{24}/

## scenario: studio-answered-card-opens-thread
prereqs: on /studio?tab=received with ≥1 answered card
steps:
  - click: role=button (first answered CardTile)
assert:
  - url_matches: /^\/thread\/[a-f0-9]{24}$/

## scenario: studio-draft-tile-opens-composer
prereqs: on /studio?tab=draft with ≥1 draft
steps:
  - click: role=button (first DraftTile)
assert:
  - url_matches: /^\/new-lag\?draftId=[a-f0-9]{24}/

## scenario: studio-bookmark-toggle
prereqs: on /studio?tab=received (or any tab with cards)
steps:
  - # aria-label flips: "Bookmark" ↔ "Remove bookmark"
  - click: first CardTile >> role=button name="Bookmark"
  - wait: 800
assert:
  - aria-label flips to "Remove bookmark"
  - network 200: POST /api/user-card/:id/bookmark

## scenario: studio-bookmark-fade-out
prereqs: on /studio?tab=bookmark with ≥1 card
steps:
  - click: first CardTile >> role=button name="Remove bookmark"
  - wait: 500  # fade animation ~400ms
assert:
  - card fades out and splices from Bookmark tab

## scenario: studio-share-card
prereqs: on /studio with ≥1 CardTile
steps:
  - click: first CardTile >> role=button name="Share link"
  - wait: role=dialog name="Send to" visible timeout=2000
  - press: Escape
assert:
  - drawer closes

## scenario: studio-waiting-on-you-desktop
prereqs: viewport: desktop-only, has ≥1 pending request or unanswered prompt
steps:
  - goto: /studio
assert:
  - visible: text*="Waiting on you"
  - visible: ≥1 row (connection request text OR "sent you a prompt")

## scenario: studio-connection-request-inline
prereqs: WaitingOnYou visible with a pending connection request row
steps:
  - visible: role=button name="Decline"
  - visible: role=button name="Confirm"
  - click: role=button name="Confirm"
assert:
  - row updates to "Connection" badge
  - network 200: POST /api/friends/requests/:id/respond?accept=true

---

## scenario: studio-avatar-upload
prereqs: signed_in
steps:
  - goto: /studio
  - click: role=button name="Change photo"
  - wait: role=heading name="Update photo" visible timeout=2000
  - click: role=button name="Choose photo"
  - upload_file: css=input[type="file"] = env.TEST_AVATAR_IMAGE
  - # preview replaces "Pick an image to see the preview"
  - click: role=button name="Save"
  - wait: role=button name="Save" not disabled OR modal closes timeout=8000
assert:
  - network 200: POST /api/avatar
  - avatar updates across the app (studio header + wherever isSelf=true)

## scenario: studio-avatar-close
prereqs: AvatarUploadModal open
steps:
  - click: role=button name="Close"
assert:
  - modal closes

## scenario: studio-cover-picker
prereqs: signed_in
steps:
  - goto: /studio
  - click: role=button name="Change cover"
  - wait: role=heading name="Choose Cover" visible timeout=2000
  - visible: role=button name="Upload" AND ≥1 gradient tile
  - click: first gradient tile
assert:
  - modal closes
  - cover strip updates

---

## scenario: studio-edit-form-loads
prereqs: signed_in
steps:
  - goto: /studio/edit
  - visible: role=heading name="Edit Info" (h1)
  - visible: label="Name" with placeholder="First name"
  - visible: label="Last name" with placeholder="Last name"
  - visible: label="Birthday" (input type=date)
  - visible: label="Location" with placeholder="Add location"
  - visible: label="About" with placeholder="Tell us about yourself"

## scenario: studio-edit-save-disabled-until-changes
prereqs: on /studio/edit, no changes yet
steps:
  - # Save is disabled until firstName+lastName filled AND changes made
  - visible: disabled: role=button name="Save"

## scenario: studio-edit-save
prereqs: on /studio/edit, both name fields filled
steps:
  - # make a change (e.g. About)
  - clear + type: placeholder="Tell us about yourself" = "Updated bio"
  - click: role=button name="Save"
assert:
  - network 200: PATCH /api/user/profile (form-urlencoded)
  - request body includes bio
  - url_matches: /^\/studio/

## scenario: studio-edit-location-picker
prereqs: on /studio/edit
steps:
  - click: placeholder="Add location" (label "Location")
  - wait: role=heading name="Add Location" visible timeout=2000
  - type: placeholder="Search for a place" = "Paris"
  - wait: suggestion rows visible OR "Loading…" then results
  - click: first suggestion row
assert:
  - modal closes
  - Location field shows selected place

## scenario: studio-edit-cover-page
prereqs: signed_in
steps:
  - goto: /studio/edit
  - click: role=button name="Change cover image"
  - wait_url: /\/studio\/edit-cover/
assert:
  - url_matches: /\/studio\/edit-cover/

---

## scenario: profile-friend-view
prereqs: signed_in as USER_A, USER_B is a friend
steps:
  - goto: /profile/<USER_B_id>
  - wait: role=heading name="Studio" (h1 page title) OR user h2 visible timeout=5000
  - visible: role=heading (h2) showing USER_B firstName + lastName
assert:
  - visible: relationship pill (Add Connection / Connection / Pending / Confirm / Decline / Unblock / Request Declined)
  - visible: role=heading name*="Shared with" (h3)
  - visible: story grid OR "No Lags shared"

## scenario: profile-connect-flow
prereqs: not connected to USER_C
steps:
  - goto: /profile/<USER_C_id>
  - click: role=button name="Add Connection"
assert:
  - pill flips optimistically to "Pending"
  - network 200: POST /api/friends/requests

## scenario: profile-menu-block
prereqs: on friend profile
steps:
  - click: role=button name*="menu" OR ellipsis/more options
  - visible: role=menu
  - visible: role=menuitem name="Remove Connection" (if connected)
  - visible: role=menuitem name="Block User"     # destructive red
  - click: role=menuitem name="Block User"
  - # confirmation modal
  - click: role=button name*="Block" OR "Confirm"
assert:
  - network 200: POST /api/users/:id/block

## scenario: profile-send-prompt-cta
prereqs: on /profile/[id], user is connected
steps:
  - visible: role=button name*="Send prompt to"
  - click: role=button name*="Send prompt to"
assert:
  - opens /new-ask with recipient pre-populated OR share flow

## scenario: profile-self-redirects-to-studio
prereqs: signed_in
steps:
  - goto: /profile/<self._id>
assert:
  - url_equals: /studio

---

## known limits (do not file bugs)
- Per-tab cache: switching Sent → Received → Sent re-renders from cache
  instantly; assert network only after cache invalidation.
- Bookmark event fires a CustomEvent (bookmarkEvents) for cross-surface
  sync — reflects on Home + Inspiration + Studio without reload.
- Avatar/cover uploads: multipart to Cloudinary via BE — HTTPS required.
- Profile edits use form-urlencoded to match BE multer parser; JSON
  will silently 500.
- Friend profile menu content varies by relationship state; verify
  observed menuitems match the state.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-3).
