# feature: moments
routes:
  - /moments                        # list + calendar (desktop right panel)
  - /moments/new                    # 4-step wizard
  - /moments/[id]                   # mobile detail
  - /moments/[id]/edit
  - /moments/[id]/people
  - /moments/invite/[id]            # accept/decline
be endpoints:
  - GET  /api/moments?filter=upcoming|past|all
  - GET  /api/moments?countdown=true
  - POST /api/moments
  - PATCH /api/moments/:id (JSON or multipart)
  - DELETE /api/moments/:id
  - POST /api/moments/:id/invite?userId=…
  - DELETE /api/moments/:id/participants/:userId
  - POST /api/moments/:id/respond?status=accept|decline
  - POST /api/moments/:id/countdown/pin
  - DELETE /api/moments/:id/countdown/pin
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- ≥2 upcoming moments (for countdown carousel)
- ≥1 past moment
- ≥1 moment where the user is INVITEE (accept/decline)

## setup notes
- Wizard draft persisted to sessionStorage['momentsWizardDraft'];
  cover File not persisted.
- Desktop: right panel swaps calendar → detail card → people. Mobile:
  List/Calendar toggle + row tap navigates.
- Delete modal uses role="dialog" + aria-labelledby="delete-moment-title".
- Countdown toggle uses role="switch" + aria-checked.

---

## scenario: moments-list-loads
prereqs: signed_in
steps:
  - goto: /moments
  - wait: role=heading name="Moments" visible timeout=5000
assert:
  - visible: role=button name="Upcoming"
  - visible: role=button name="Past"
  - visible: role=link name="Add Moment" OR role=button name="Add Moment" (mobile aria-label)
  - visible: countdown carousel OR ≥1 moment row OR "No upcoming moments yet"

## scenario: moments-filter-past
prereqs: on /moments
steps:
  - click: role=button name="Past"
assert:
  - list filters
  - if empty: text visible="No past moments yet."

## scenario: moments-countdown-carousel-nav
prereqs: on /moments with ≥3 upcoming pinned moments, viewport: desktop
steps:
  - click: role=button name="Next"
  - visible: role=button name="Go to slide 2"       # dot indicator
  - click: role=button name="Previous"
assert:
  - carousel scrolls between slides

## scenario: moments-mobile-view-toggle
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /moments
  - click: role=button name="Calendar view"        # aria-pressed toggle
  - visible: calendar grid
  - click: role=button name="List view"
assert:
  - view toggles correctly

---

## scenario: moments-detail-desktop-panel
prereqs: viewport: desktop-only, ≥1 moment
steps:
  - goto: /moments
  - click: any MomentRow button
assert:
  - right panel shows detail card
  - url query: ?selected=<id>

## scenario: moments-detail-mobile
prereqs: viewport: mobile-only, ≥1 moment
steps:
  - goto: /moments
  - click: any MomentRow
  - wait_url: /^\/moments\/[a-f0-9]{24}$/
assert:
  - role=heading (h1) shows moment title
  - visible: role=button name="Back"
  - visible: role=button name="More options"

## scenario: moments-menu-actions
prereqs: on moment detail (mobile or desktop panel), signed_in as AUTHOR
steps:
  - click: role=button name="More options"
  - visible: role=menu
  - visible: role=menuitem name="Edit" OR role=link
  - visible: role=menuitem name="Delete"
assert:
  - author sees Edit + Delete (not Leave)

## scenario: moments-menu-participant-view
prereqs: signed_in as participant (not author) on moment detail
steps:
  - click: role=button name="More options"
assert:
  - visible: role=menuitem name="Leave"
  - hidden: role=menuitem name="Delete"
  - hidden: role=menuitem name="Edit"

## scenario: moments-pin-toggle
prereqs: on detail (mobile or desktop)
steps:
  - click: role=switch name*="Add to countdown"
assert:
  - network 200: POST /api/moments/:id/countdown/pin
  - aria-checked flips to true
  - # unpin
  - click: same switch
  - network 200: DELETE /api/moments/:id/countdown/pin

## scenario: moments-people-tagged-link
prereqs: on detail with participantCount > 0
steps:
  - click: css=[aria-label*="people tagged"]
assert:
  - url_matches: /^\/moments\/[a-f0-9]{24}\/people$/

---

## scenario: moments-delete-author
prereqs: on detail as author
steps:
  - click: role=button name="More options"
  - click: role=menuitem name="Delete"
  - wait: role=dialog visible timeout=2000
  - visible: role=heading name="Delete Moment"
  - visible: text*="permanently"
  - click: role=button name="Delete"
assert:
  - network 200: DELETE /api/moments/:id
  - url_equals: /moments
  - moment no longer in list

## scenario: moments-leave-participant
prereqs: on detail as participant
steps:
  - click: role=button name="More options"
  - click: role=menuitem name="Leave"
  - visible: role=heading name="Leave Moment"
  - click: role=button name="Leave"
assert:
  - network 200: POST /api/moments/:id/respond?status=decline  # or leave endpoint
  - moment removed from list

## scenario: moments-delete-cancel
prereqs: delete modal open
steps:
  - click: role=button name="Cancel"
assert:
  - modal closes, moment intact

---

## scenario: moments-create-full-wizard
prereqs: signed_in
steps:
  - goto: /moments/new
  - # Step 1: Event Type
  - wait: role=heading name*="What type of event" visible timeout=5000
  - # click any event type button (Birthday, Anniversary, etc.)
  - click: any event type option
  - # Step 2: Details
  - wait: role=heading name*="Add a title" OR name*="Title your Moment" visible timeout=3000
  - type: placeholder="Give it a title" = "Test Moment " + <random>
  - # cover picker
  - click: text*="Tap to add image" OR text*="Tap to change image"
  - click: any cover option
  - # date picker (mobile substep)
  - wait: role=heading name*="When is the Moment" visible timeout=3000
  - # WizardCalendar: click a valid day
  - click: role=button name="15" (any valid day text)
  - click: role=button name="Next"
  - # Step 3: People (skip)
  - wait: role=heading name*="Add people" visible timeout=3000
  - click: role=button name="Create Moment"   # mobile OR "Next" desktop
  - # Step 4: Celebration
  - wait: role=heading name="Moment added to your calendar!" visible timeout=5000
  - visible: role=button name="Add another Moment"
  - visible: role=button name="Return to moments"
assert:
  - network 200: POST /api/moments

## scenario: moments-create-with-recurring
prereqs: on wizard Step 2
steps:
  - # recurring checkbox
  - click: role=checkbox name*="recurring"
  - # frequency options
  - visible: role=button name="Yearly"
  - visible: role=button name="Monthly"
  - visible: role=button name="Weekly"
  - visible: role=button name="Daily"
  - click: role=button name="Yearly"
assert:
  - selected state on Yearly

## scenario: moments-create-with-people
prereqs: on Step 3 with ≥1 friend
steps:
  - type: placeholder="@ Search" = "friend name"
  - wait: 400  # debounced search
  - visible: search results OR "Searching…" then results
  - click: first result
  - visible: chip with friend's name + role=button name*="Remove"
  - # invite toggle
  - visible: role=checkbox name*="invite"
  - click: role=button name="Create Moment"
assert:
  - network 200: POST /api/moments/:id/invite?userId=… (for each new)

## scenario: moments-create-return
prereqs: on Celebration step
steps:
  - click: role=button name="Return to moments"
assert:
  - url_equals: /moments

---

## scenario: moments-edit-diff-patch
prereqs: signed_in as AUTHOR
steps:
  - goto: /moments/<id>/edit
  - wait: role=heading name="Edit Moment" visible OR form fields populated
  - # only change title (verify diff-only payload)
  - clear + retype: input for "Event Name"
  - click: role=button name="Done"
assert:
  - network 200: PATCH /api/moments/:id
  - request body contains { title: <new> } and no unrelated fields
  - url_matches: /^\/moments\?selected=|^\/moments\/[a-f0-9]{24}/

## scenario: moments-edit-not-author-redirect
prereqs: signed_in as participant (not author)
steps:
  - goto: /moments/<id>/edit
assert:
  - toast visible: "Only the author can edit this Moment"
  - url_matches: /^\/moments\/[a-f0-9]{24}$/

## scenario: moments-edit-add-participants
prereqs: on /moments/<id>/edit as author
steps:
  - type: placeholder="@ Add people" = "friend name"
  - click: first result
  - # chip added
  - visible: chip with friend name
  - click: role=button name="Done"
assert:
  - network 200: POST /api/moments/:id/invite?userId=…

## scenario: moments-edit-remove-participant
prereqs: on /moments/<id>/edit as author, ≥1 existing participant
steps:
  - click: role=button name="Remove" (scoped to an existing participant chip)
  - click: role=button name="Done"
assert:
  - network 200: DELETE /api/moments/:id/participants/:userId

---

## scenario: moments-people-tagged-page
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /moments/<id>/people
  - visible: role=button name="Back"
assert:
  - list of participants OR text="No one tagged yet"
  - each row shows "pending" if applicable

## scenario: moments-people-tagged-add
prereqs: on /moments/<id>/people as author
steps:
  - visible: role=link name="Add people"
assert:
  - link routes to edit page or add-people flow

---

## scenario: moments-invite-accept
prereqs: signed_in as invitee (not yet accepted)
steps:
  - goto: /moments/invite/<id>
  - wait: role=heading name*="wants you to remember" visible timeout=5000
  - visible: role=button name="Add to my calendar"
  - visible: role=button name="Not now"
  - click: role=button name="Add to my calendar"
assert:
  - url_matches: /^\/moments\/[a-f0-9]{24}$/ OR /^\/moments\?selected=/
  - network 200: POST /api/moments/:id/respond?status=accept

## scenario: moments-invite-decline
prereqs: signed_in as invitee
steps:
  - goto: /moments/invite/<id>
  - click: role=button name="Not now"
assert:
  - url_equals: /moments
  - network 200: POST /api/moments/:id/respond?status=decline

## scenario: moments-invite-invalid
prereqs: signed_in, invite id no longer valid
steps:
  - goto: /moments/invite/BAD_ID
assert:
  - text visible: "This invite is no longer available."
  - visible: role=button name="Back to Moments"

## scenario: moments-invite-already-accepted-short-circuit
prereqs: signed_in as accepted participant, moment in cache
steps:
  - goto: /moments/invite/<id>
assert:
  - immediate redirect to /moments/<id> (no CTAs render)

---

## known limits (do not file bugs)
- Cover picker curated gallery loads over Cloudinary; HTTPS required.
- Wizard draft in sessionStorage cleared on hard refresh (intentional).
- Recurring "Yearly" is the default when isRecurring=true; other
  frequencies (Monthly / Weekly / Daily) exist and are exclusive.
- Invite fan-out is Promise.allSettled — one failed invite doesn't
  fail the moment save.
- WizardCalendar uses aria-haspopup="listbox" for year picker with
  role="option" items.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-2).
