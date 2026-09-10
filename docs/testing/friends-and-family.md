# feature: friends-and-family
routes:
  - /friends-and-family                        # Connections/Requests/Pending
be endpoints:
  - GET /api/friends
  - GET /api/friends/requests?direction=received|sent
  - POST /api/friends/requests/:id/respond?accept=…
  - DELETE /api/friends/requests/:id
  - POST /api/groups
  - POST /api/groups/:id/members
  - DELETE /api/groups/:id/members/:userId
  - DELETE /api/groups/:id
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## fixtures required
- ≥3 connections and ≥1 group
- USER_B — pending friend request received from
- USER_C — pending friend request sent to

## setup notes
- CreateGroupDrawer + AddMembersDrawer + GroupDrawer all use
  `role="dialog"` with distinct `aria-label` values.
- MemberPicker is reused inside both drawers — same search/selection UX.
- ConnectionsTab groups people alphabetically on mobile (letter headers).

---

## scenario: fnf-header-renders
prereqs: signed_in
steps:
  - goto: /friends-and-family
  - visible: role=heading name="Friends and family" (h1)
  - visible: placeholder="Search"
assert:
  - # 3 tabs (segmented control)
  - visible: role=button name="Connections"
  - visible: role=button name="Requests"
  - visible: role=button name="Pending"
  - # desktop actions
  - viewport desktop: visible: role=button name="Create group"
  - viewport desktop: visible: role=button name="Invite"
  - # mobile aria-label
  - viewport mobile: visible: role=button name="Create group"

## scenario: fnf-tab-switch
prereqs: on /friends-and-family
steps:
  - click: role=button name="Requests"
  - visible: request rows OR "No requests found"
  - network 200: GET /api/friends/requests?direction=received
  - click: role=button name="Pending"
  - visible: pending rows OR "No pending requests found"
  - network 200: GET /api/friends/requests?direction=sent

---

## scenario: fnf-connections-empty
prereqs: signed_in, no connections
steps:
  - goto: /friends-and-family
assert:
  - text visible: "No connections yet"
  - text visible*: "Sync contacts or invite" (empty-state copy)
  - visible: role=button name="Invite friends"

## scenario: fnf-connections-filtered-empty
prereqs: on Connections with ≥1 friend
steps:
  - type: placeholder="Search" = "xxxxxx"
assert:
  - text visible: "No matches"

## scenario: fnf-connections-mobile-alphabetical
prereqs: viewport: mobile-only, ≥1 friend
steps:
  - goto: /friends-and-family
assert:
  - visible: letter section headers (A, B, C…)

## scenario: fnf-connection-row-navigates
prereqs: on Connections with ≥1 friend
steps:
  - click: first ConnectionRow button
assert:
  - url_matches: /^\/profile\/[a-f0-9]{24}$/

---

## scenario: fnf-groups-section-desktop
prereqs: viewport: desktop-only, on Connections
steps:
  - visible: role=heading name="Groups" (h2)
  - visible: role=heading name="All connections" (h2)
  - visible: ≥1 GroupTile OR "Create Group" tile

## scenario: fnf-group-tile-opens-drawer
prereqs: on Connections with ≥1 group
steps:
  - click: first GroupTile (group name + member count)
  - wait: role=dialog name="Group details" visible timeout=2000
  - visible: role=heading (h2) with group name
  - visible: role=button name="Close"
  - visible: role=button name="Add Someone"
  - visible: role=link name="Leave Group"   # destructive red
assert:
  - drawer renders member list buttons

## scenario: fnf-group-drawer-close
prereqs: GroupDrawer open
steps:
  - click: role=button name="Close"
assert:
  - drawer closes

---

## scenario: fnf-create-group
prereqs: on /friends-and-family
steps:
  - click: role=button name="Create group"
  - wait: role=dialog name="Create group" visible timeout=2000
  - visible: label="Group Name"
  - type: placeholder="name" = "Test Group " + <random>
  - visible: label="Add connections"
  - visible: placeholder="Search"
  - # MemberPicker: click first suggested/result checkbox
  - click: first member row checkbox
  - click: second member row checkbox
  - # summary bar text updates from "Select connections"
  - click: role=button name="Create Group"
assert:
  - dialog closes
  - network 200: POST /api/groups
  - group visible on Connections tab

## scenario: fnf-create-group-close-disabled-during-submit
prereqs: on Create group drawer with valid data
steps:
  - click: role=button name="Create Group"
  - # briefly disabled during submit
assert:
  - during submit: role=button name="Close" is disabled

## scenario: fnf-add-members
prereqs: GroupDrawer open (owner)
steps:
  - click: role=button name="Add Someone"
  - wait: role=dialog name="Add members" visible timeout=2000
  - visible: role=heading name="Add Members" (h2)
  - type: placeholder="Search" = "friend name"
  - click: first result row checkbox
  - click: role=button name="Add"
assert:
  - dialog closes
  - network 200: POST /api/groups/:id/members

## scenario: fnf-search-empty-state
prereqs: MemberPicker open (Create or Add drawer)
steps:
  - type: placeholder="Search" = "xxxxxx"
assert:
  - text visible: "No matches"

---

## scenario: fnf-accept-request
prereqs: on Requests tab, has request from USER_B
steps:
  - click: first row >> role=button name="Confirm"
  - # optimistic: spinner then Connection badge
  - wait: 1200
assert:
  - row updates: badge "Connection" visible
  - network 200: POST /api/friends/requests/:id/respond?accept=true

## scenario: fnf-decline-request
prereqs: on Requests tab
steps:
  - click: first row >> role=button name="Decline"
assert:
  - row updates: text "Request Declined"
  - network 200: POST /api/friends/requests/:id/respond?accept=false

## scenario: fnf-cancel-pending
prereqs: on Pending tab, has sent request to USER_C
steps:
  - click: first row >> role=button name*="Cancel" OR "Invitation Sent" state action
assert:
  - row disappears OR flips state
  - network 200: DELETE /api/friends/requests/:id

---

## scenario: fnf-invite-button
prereqs: signed_in
steps:
  - goto: /friends-and-family
  - click: role=button name="Invite"          # desktop only
assert:
  - opens invite drawer OR navigates to /invite?variant=… OR similar

---

## known limits (do not file bugs)
- Search normalizes for diacritics + case-insensitive.
- No `data-testid` — every selector is role/text/aria-label based.
- Create group button visibility on Connections tab varies with design;
  may be more prominent on Requests/Pending.
- Row action state ("Connection" / "Request Declined" / "Invitation
  Sent") is a status badge, not a live-updating pill — reloads may
  reset to initial state depending on BE.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-3).
