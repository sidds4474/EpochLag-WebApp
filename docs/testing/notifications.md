# feature: notifications
routes:
  - /notifications                       # full page
  - (bell popover: NotificationsBell in top header)
be endpoints:
  - GET /api/notifications
  - PUT /api/notifications/:id/mark-seen
  - DELETE /api/notifications/clear-all
  - GET /api/docking-station/cards/:cardId       # enrichment for docking notifs
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- ≥3 notifications spanning ≥2 sections, including at least one
  friend_request row and one moment_invite row

## setup notes
- Module-scoped cache shared between bell popover and full page. 60s
  freshness window.
- Mark-seen optimistic; ignores 404.
- Clear-all optimistic with rollback on error.
- Docking-card enrichment fires with 4s timeout race.

---

## scenario: notifications-page-loads
prereqs: signed_in
steps:
  - goto: /notifications
  - visible: role=heading name="Notifications" (h1) OR h2 in NotificationsList
  - wait: ≥1 row OR "You're all caught up." visible timeout=5000
assert:
  - viewport mobile: visible: role=button name="Back"
  - if items > 0: visible: role=button name="Clear all"

## scenario: notifications-empty
prereqs: signed_in, no notifications
steps:
  - goto: /notifications
assert:
  - text visible: "You're all caught up."

## scenario: notifications-loading
prereqs: signed_in, slow network + cleared cache
steps:
  - goto: /notifications
assert:
  - text visible: "Loading…" within 300ms
  - eventually replaced by real content OR empty state

---

## scenario: notifications-tap-friend-request-row
prereqs: has friend_request notification with inline Decline/Confirm
steps:
  - goto: /notifications
  - # row action: Decline (border-primary-blue) / Confirm (bg-[#ef9849] white)
  - click: role=button name="Confirm"
assert:
  - row updates: gray "Accepted" text OR removed
  - network 200: PUT /api/notifications/:id/mark-seen
  - network 200: POST /api/friends/requests/:id/respond?accept=true

## scenario: notifications-tap-scheduled-prompt
prereqs: has scheduled_prompt notification
steps:
  - click: role=button name="View Request"
assert:
  - navigation happens (likely /prompt/detail/... or /new-lag?promptId=…)
  - network 200: PUT /api/notifications/:id/mark-seen

## scenario: notifications-tap-moment-invite
prereqs: has moment_invite notification
steps:
  - click: row (moment_invite)
assert:
  - url_matches: /^\/moments\/invite\/[a-f0-9]{24}/
  - network 200: PUT /api/notifications/:id/mark-seen

## scenario: notifications-clear-all
prereqs: has ≥1 notification
steps:
  - goto: /notifications
  - click: role=button name="Clear all"
assert:
  - list wipes optimistically
  - text visible: "You're all caught up."
  - network 200: DELETE /api/notifications/clear-all

## scenario: notifications-clear-all-rollback
prereqs: has ≥1 notification, BE mocked to 500
steps:
  - goto: /notifications
  - click: role=button name="Clear all"
  - wait: 2000
assert:
  - list restored
  - toast visible: "Could not clear notifications. Please try again."

## scenario: notifications-back-mobile
prereqs: on /notifications, viewport: mobile-only
steps:
  - click: role=button name="Back"
assert:
  - router.back() executes

---

## scenario: bell-popover-desktop
prereqs: signed_in, viewport: desktop-only
steps:
  - goto: /home
  - click: css=[aria-label^="Notifications"]              # bell aria-label in header
  - wait: popover visible timeout=2000
  - visible: role=heading (h2) name="Notifications"
  - visible: rows OR "You're all caught up."

## scenario: bell-popover-mark-seen-inline
prereqs: bell popover open, has unread rows
steps:
  - click: first NotificationRow
assert:
  - network 200: PUT /api/notifications/:id/mark-seen

## scenario: bell-mobile-hero
prereqs: viewport: mobile-only
steps:
  - goto: /home
  - click: css=[aria-label^="Notifications"]
assert:
  - url_equals: /notifications
  # mobile behavior: navigate to page, not popover

## scenario: mobile-bell-no-tap-through
description: regression — bell tap must not fall through to underlying element
prereqs: viewport: mobile-only
steps:
  - goto: /home
  - click: css=[aria-label^="Notifications"]
assert:
  - only ONE navigation happens (to /notifications)

---

## scenario: unread-dot
prereqs: has ≥1 unread notification
steps:
  - goto: /notifications
assert:
  - visible: css=[class*="d95f3b"] w-[9px] h-[9px] dot on each unread row's top-right

## scenario: docking-notification-enrichment
description: docking_station_card notifs enrich async
prereqs: has ≥1 docking notification
steps:
  - goto: /notifications
  - # row initially shows generic label
  - wait: 5000                          # up to 4s enrichment race
assert:
  - eventually: row shows title/message/imagePath from card enrichment
  - network: GET /api/docking-station/cards/:cardId called

---

## known limits (do not file bugs)
- Cache TTL 60s; refresh forces even if fresh. Bell + page share
  snapshot within window.
- Docking enrichment: 4s hard timeout. Rows show generic labels
  briefly until resolved.
- Mark-seen swallows 404s.
- Sections come from BE in preserved order via groupBySection.
- No `data-testid` — selectors rely on aria-label + text.

## last updated
2026-09-09 — full rewrite from verified inventory (agent-4).
