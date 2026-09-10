# feature: lags
routes:
  - /lags                      # All tab (default)
  - /lags/timeline
  - /lags/places
  - /lags/people
  - /lags/people/[userId]
be endpoints:
  - GET /api/stories?mode=latest|loved|deleted&page=N&limit=10&tags=…
  - GET /api/media-gallery?bucket=audio|image|video
  - POST /api/stories/:id/bookmark, DELETE /api/stories/:id/bookmark
  - DELETE /api/stories/:id (soft), DELETE /api/stories/:id/permanent
  - GET /api/stories/timeline
  - GET /api/stories/places
  - GET /api/stories/filters
  - POST /api/geocode?address=…
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- Test account with ≥6 published stories across ≥2 places, ≥2 people,
  ≥2 years
- One story bookmarked, one loved, one soft-deleted

## setup notes
- Module-scoped caches per tab (`cachedBuckets`, `cachedLocations`,
  `peopleCache`). Sign-out hard-reload purges them.
- Timeline dedupes by threadId (a story shared multiple times shows once).
- Timeline uses `data-timeline-year-anchor` + `data-year={n}` on section
  elements — real selectors, not guessed.

---

## scenario: lags-all-tab-renders
prereqs: signed_in with ≥1 story
steps:
  - goto: /lags
  - wait: role=heading name="Lags" visible timeout=5000
assert:
  - visible: role=link name="All"
  - visible: role=link name="Timeline"
  - visible: role=link name="Places"
  - visible: role=link name="People"
  - visible: role=button name="Filters"
  - visible: role=button name="Select"
  - visible: ≥1 story card (css=a[href^="/thread/"])

## scenario: lags-tabs-switch
prereqs: signed_in
steps:
  - goto: /lags
  - click: role=link name="Timeline"
  - wait_url: /\/lags\/timeline/
  - visible: text*="Search stories and people" OR role=button name="Search"
  - click: role=link name="Places"
  - wait_url: /\/lags\/places/
  - # map loading text
  - visible: text*="Mapping" OR text*="Finding" OR text*="Dropping" OR text*="Almost there" OR Google map visible
  - click: role=link name="People"
  - wait_url: /\/lags\/people/
  - visible: role=heading name="Groups" OR role=heading name="People"
assert:
  - each nav completes within 3s

## scenario: lags-filters-popover
prereqs: on /lags
steps:
  - click: role=button name="Filters"
  - wait: role=dialog name="Filters" visible timeout=2000
  - # Mode row: Recent / Loved / Deleted
  - click: role=button name="Loved"
  - # Categories (tag chips)
  - click: role=button name*="Travel"
  - click: role=button name="Apply"
assert:
  - popover closes
  - filter badge visible with aria-label*="active filters"
  - story list refetched

## scenario: lags-select-and-delete
prereqs: signed_in with ≥3 stories on /lags
steps:
  - click: role=button name="Select"
  - # cards become tap-selectable; header exposes "Delete selected" + "Exit selection mode"
  - click: css=a[href^="/thread/"]:nth-of-type(1)
  - click: css=a[href^="/thread/"]:nth-of-type(2)
  - click: role=button name="Delete selected"
  - # ConfirmationModal (destructive)
  - visible: role=heading name*="Move to Deleted" OR role=heading name*="Delete permanently"
  - click: role=button name="Delete"
assert:
  - selected cards disappear
  - toast visible: "Moved to Deleted" OR "Deleted permanently"

## scenario: lags-exit-selection-mode
prereqs: in selection mode on /lags
steps:
  - click: role=button name="Exit selection mode"
assert:
  - Select/Filters row restored
  - cards no longer tap-selectable

## scenario: lags-story-card-share
prereqs: signed_in with ≥1 story on /lags
steps:
  - click: css=a[href^="/thread/"]:first-of-type >> role=button name="Share link"
  - wait: role=dialog name="Send to" visible timeout=2000
  - press: Escape
assert:
  - drawer closes

## scenario: lags-story-card-bookmark
prereqs: signed_in with ≥1 story
steps:
  - goto: /lags
  - # aria-label flips: "Bookmark" ↔ "Remove bookmark"
  - click: css=a[href^="/thread/"]:first-of-type >> role=button name="Bookmark"
  - wait: 800
assert:
  - network 200: POST /api/stories/:id/bookmark
  - reload: bookmark state persists

---

## scenario: timeline-year-rail-scrolls
prereqs: signed_in with stories in ≥2 different years
steps:
  - goto: /lags/timeline
  - wait: css=[data-timeline-year-anchor] visible timeout=5000
  - # rail shows year numbers as clickable elements
  - click: text="2024" (or oldest year present)
  - wait: 700  # smooth-scroll settle
assert:
  - css=[data-year="2024"] element enters viewport

## scenario: timeline-search-morphs
prereqs: on /lags/timeline
steps:
  - click: role=button name="Search"
  - visible: placeholder="Search stories and people"
  - type: placeholder="Search stories and people" = "keyword"
assert:
  - list filters
  - close: click role=button name="Close search" OR "Clear search"
  - list restores

## scenario: timeline-hide-story
prereqs: on /lags/timeline with ≥1 tile
steps:
  - click: role=button name="Story options"
  - click: text="Hide from timeline"
  - wait: 500
  - reload
assert:
  - hidden tile stays hidden
  - localStorage['timelineHiddenIds:<userId>'] contains the storyId

## scenario: timeline-empty-search-message
prereqs: on /lags/timeline, search active with no matches
steps:
  - type: placeholder="Search stories and people" = "nothing-matches-xyz"
assert:
  - text visible: /No stories match/

---

## scenario: places-loading-message
prereqs: on /lags/places, slow network
steps:
  - clear caches
  - goto: /lags/places
assert:
  - visible: text matches /Mapping|Finding|Dropping|Almost there/
  - eventually: Google map visible

## scenario: places-pin-opens-panel
prereqs: signed_in with ≥2 places
steps:
  - goto: /lags/places
  - wait: Google map + pins visible timeout=8000
  - click: any pin marker
  - wait: role=region name="Stories at place" visible (desktop) OR role=dialog name="Stories at place" (mobile) timeout=2000
  - visible: role=heading (city/country h2)
assert:
  - panel populated with story rows

## scenario: places-story-tap
prereqs: places panel open
steps:
  - click: first story row in panel
assert:
  - url_matches: /^\/thread\//

## scenario: places-empty
prereqs: on /lags/places, account has 0 places
steps:
  - goto: /lags/places
assert:
  - text visible*="No places yet"

---

## scenario: people-empty-invite-cta
prereqs: on /lags/people, account has 0 friends
steps:
  - goto: /lags/people
assert:
  - text visible*="Invite friends"
  - visible: role=button name*="Invite friends"

## scenario: people-search
prereqs: on /lags/people, ≥2 friends
steps:
  - click: role=button name="Search"
  - type: placeholder="Search groups and people" = "Al"
assert:
  - list shrinks to matches

## scenario: people-tap-opens-detail
prereqs: on /lags/people with ≥1 person
steps:
  - click: first person tile
assert:
  - url_matches: /^\/lags\/people\/[a-f0-9]{24}$/

## scenario: person-back-link
prereqs: on /lags/people/[userId]
steps:
  - click: role=link name="Back to People" OR aria-label="Back to People"
assert:
  - url_equals: /lags/people

---

## known limits (do not file bugs)
- Places map requires Google Maps API key at build/env time. Without
  it /lags/places shows broken map.
- Timeline dedupes by threadId. A story shared to two groups shows
  once, not twice.
- Batch "Add to album" is intentionally commented out server-side —
  don't expect that action.
- Module caches: switching tabs re-renders synchronously from cache
  before background refresh (60s TTL).
- FiltersPopover uses `role="dialog"` + `aria-label="Filters"`; not
  every filter action has an aria-label — some rely on text content.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-1
walkthrough).
