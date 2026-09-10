# feature: share
component: SendToDrawer (src/components/share/SendToDrawer.tsx)
used by:
  - Home / RecentStoriesRow
  - Home / RemindersRow (invite tile)
  - Inspiration (prompt share)
  - Ask composer (post-create)
  - Story composer (post-publish celebration)
  - Prompt detail
  - Lags story cards (share button)
  - Studio card tiles
be endpoints:
  - GET /api/homescreen/people/
  - POST /api/user-card/:promptId/share
  - POST /api/stories/:storyId/share
  - POST /api/stories/thread/:id/public-link (story)
  - POST /api/user-card/:id/public-link (prompt)
  - POST /api/moments/:id/public-link (moment)
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]
- ≥3 contacts and ≥1 group

## setup notes
- Bottom sheet on mobile, right drawer on desktop.
- Contacts lazy-loaded on open.
- Public link minted lazily on external chip tap.
- Search input has id="send-search-input" (unique).
- Note textarea has id="send-note" (unique).

---

## scenario: share-drawer-opens
prereqs: signed_in, on /home with ≥1 story
steps:
  - click: css=a[href^="/thread/"]:first-of-type >> role=button name="Share link"
  - wait: role=dialog name="Send to" visible timeout=2000
  - visible: role=heading name="Send to" (h2)
  - visible: css=#send-search-input (placeholder="Search")
assert:
  - drawer is aria-modal="true"
  - network 200: GET /api/homescreen/people/

## scenario: share-drawer-close-methods
prereqs: drawer open
steps:
  - # Method 1: X button
  - click: role=button name="Close"
  - drawer closes
  - # reopen
  - # Method 2: backdrop click (mobile has grab handle too)
  - reopen drawer
  - click: outside drawer (backdrop)
  - drawer closes
  - # Method 3: Escape
  - reopen
  - press: Escape
  - drawer closes

## scenario: share-drawer-search
prereqs: drawer open with contacts loaded
steps:
  - type: css=#send-search-input = "Al"
assert:
  - contact list filters (first+last name, case-insensitive)
  - clear input
  - list restores

## scenario: share-drawer-sections
prereqs: drawer open with contacts loaded
steps:
  - # sections visible
assert:
  - visible: text*="Share on Epoch Lag" OR "Suggested"
  - if callback has showGroups: visible: text="Groups"

## scenario: share-drawer-mobile-contact-chip
prereqs: drawer open, viewport: mobile-only
steps:
  - # MobileContactChip: horizontal scroll, w-[56px] avatars
  - click: first contact chip
assert:
  - checkmark overlay (bg-primary-orange w-[20px]) appears

## scenario: share-drawer-desktop-contact-row
prereqs: drawer open, viewport: desktop-only
steps:
  - # DesktopContactRow: vertical list w-[40px] avatars + radio
  - click: first contact row
assert:
  - radio filled

## scenario: share-drawer-send-single-story
prereqs: drawer open with story shareTarget
steps:
  - click: first contact
  - click: role=button name="Send"
  - # button text flips to "Sending…"
  - wait: SuccessCelebration visible timeout=5000
  - visible: role=button name="Done"
  - click: role=button name="Done"
assert:
  - drawer closes
  - network 200: POST /api/user-card/:promptId/share OR POST /api/stories/:id/share

## scenario: share-drawer-note-input
prereqs: drawer open with showMessageInput=true
steps:
  - visible: css=#send-note (textarea, maxlength=150, rows=3)
  - type: css=#send-note = "Loved this one, made me think of you"
assert:
  - input accepts up to 150 chars

## scenario: share-drawer-preview-card-prompt
prereqs: drawer open with shareTarget of kind=prompt
steps:
  - visible: PromptPreviewCard
assert:
  - visible: text*="{firstName} asks" OR "Someone asks"
  - visible: prompt content (line-clamp-3)
  - visible: cover image (aspect-[16/7])

---

## scenario: share-drawer-copy-link
prereqs: drawer open with shareTarget
steps:
  - click: role=button name*="Copy Link"           # ChannelChip label
  - wait: 2000
assert:
  - clipboard contains: /https:\/\/epochlag\.com\/(story|prompt|moment)\/\w+/
  - network 200: POST /api/(stories\/thread|user-card|moments)/.+\/public-link
  - toast visible*: "Link copied"

## scenario: share-drawer-whatsapp
prereqs: drawer open
steps:
  - click: role=button name*="Whatsapp"
assert:
  - new tab opens with URL: /^https:\/\/wa\.me\/\?text=/
  - text contains: epochlag.com short URL

## scenario: share-drawer-messenger
prereqs: drawer open
steps:
  - click: role=button name*="Messenger"
assert:
  - opens `fb-messenger://` (silent no-op on desktop without app)

## scenario: share-drawer-facebook
prereqs: drawer open
steps:
  - click: role=button name*="Facebook"
assert:
  - new tab opens with Facebook Sharer URL

---

## scenario: share-from-home-story
prereqs: signed_in, ≥1 recent story on /home
steps:
  - goto: /home
  - click: css=a[href^="/thread/"]:first-of-type >> role=button name="Share link"
  - wait: role=dialog name="Send to" visible
  - click: first contact
  - click: role=button name="Send"
  - wait: role=button name="Done" visible timeout=5000
  - click: role=button name="Done"
assert:
  - network 200: POST /api/user-card/:promptId/share

## scenario: share-from-lags-story-card
prereqs: signed_in, ≥1 story on /lags
steps:
  - goto: /lags
  - click: css=a[href^="/thread/"]:first-of-type >> role=button name="Share link"
  - wait: role=dialog name="Send to" visible timeout=2000
assert:
  - drawer opened via SendToDrawer (regression: not legacy ShareModal)

## scenario: share-post-publish-story
prereqs: on /new-lag with content ready
steps:
  - click: role=button name="Create Story"
  - wait: 3200                           # SuccessCelebration
assert:
  - visible: SendToDrawer OR "Story Sent" celebration

## scenario: share-post-create-prompt-ask
prereqs: on /new-ask step-2 with cover set
steps:
  - click: role=button name="Send"
  - wait: role=dialog name="Send to" visible timeout=5000
assert:
  - drawer opens via SendToDrawer

---

## scenario: share-selected-names-pill
prereqs: drawer open with ≥1 contact selected
steps:
  - # once selections > 0, a rounded pill (bg-[#EDEDED]) shows truncated names
  - visible: css=[class*="EDEDED"] with truncated names
  - visible: role=button name="Send" inline in pill
assert:
  - Send button embedded in the pill (h-[36px])

## scenario: share-drawer-send-multi-mobile
prereqs: drawer open, viewport: mobile-only
steps:
  - click: chip 1
  - click: chip 2
  - click: chip 3
  - visible: selection pill with 3 names truncated OR count
  - click: role=button name="Send"
  - wait: role=button name="Done" visible timeout=5000
assert:
  - shareWith array contains 3 user IDs in the request

---

## known limits (do not file bugs)
- Clipboard fails on insecure origins (HTTP LAN); falls back to
  execCommand.
- Messenger deeplink is silent no-op on desktop without app.
- Groups section shown only when showGroups=true prop set — currently
  off in most callers.
- Note textarea 150-char capped; longer text truncates silently.
- SentState blocks further drawer interaction until Done tap.
- Public URL format: /story/{code}, /prompt/{code}, /moment/{code}.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-4).
