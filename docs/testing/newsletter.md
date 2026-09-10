# feature: newsletter
routes:
  - /newsletters                        # archive index
  - /newsletters/[slug]                 # issue detail
  - /unsubscribe                        # opt-out
be endpoints:
  - POST /api/newsletter/subscribe
  - POST /api/newsletter/unsubscribe
env: tunnel (or prod for read-only smoke)

## global prereqs
- signed_out (public pages)
- viewport: [mobile, tablet, desktop]

## fixtures required
- env.TEST_NEWSLETTER_EMAIL
- env.TEST_UNSUBSCRIBE_TOKEN — BE-issued signed token

## setup notes
- Archive is static (`generateStaticParams`). Adding an issue = adding
  to `ARCHIVE` const + creating a `.tsx` issue module.
- NavBar + NewsletterMailFooter reused across both pages.
- Subscribe forms exist in two places: `ArchiveSubscribeCTA` (bottom
  of archive) and landing `NewsletterSection`.

---

## scenario: archive-index-loads
prereqs: signed_out
steps:
  - goto: /newsletters
  - wait: role=heading name="The Newsletter" visible timeout=5000
assert:
  - visible: role=heading name*="Past issues" (h2)
  - visible: NavBar with logo + role=button name="Contact Us" + role=link name="Newsletter" + role=link name="Sign in"
  - visible: ≥1 role=link name="Read issue"

## scenario: archive-issue-card-nav
prereqs: on /newsletters
steps:
  - click: role=link name="Read issue" (first card)
assert:
  - url_matches: /^\/newsletters\/[a-z0-9-]+$/

## scenario: issue-detail-loads
prereqs: signed_out
steps:
  - goto: /newsletters/{a-known-slug}
  - wait: role=heading (issue title) visible timeout=5000
assert:
  - visible: rendered issue content
  - visible: NavBar + NewsletterMailFooter

## scenario: issue-detail-404
prereqs: signed_out
steps:
  - goto: /newsletters/does-not-exist
assert:
  - Next.js 404 page

## scenario: issue-detail-prev-next
prereqs: on a middle issue
steps:
  - visible: role=link name="Older"
  - click: role=link name="Older"
assert:
  - url changes to adjacent issue
  - # from second-newest: role=link name="Newer" also visible

## scenario: issue-detail-all-issues-link
prereqs: on any issue detail
steps:
  - click: role=link name="All issues"
assert:
  - url_equals: /newsletters

## scenario: issue-detail-nav-role
prereqs: on issue detail
steps:
  - # More issues nav has aria-label="More issues"
  - visible: role=navigation name="More issues"

## scenario: issue-social-icons
prereqs: on issue detail
steps:
  - # aria-labels: Instagram, Facebook, LinkedIn
  - visible: role=link name="Instagram"
  - visible: role=link name="Facebook"
  - visible: role=link name="LinkedIn"
assert:
  - each opens target="_blank"

---

## scenario: subscribe-happy-path
prereqs: on /newsletters (ArchiveSubscribeCTA at bottom)
steps:
  - scroll to bottom
  - visible: role=heading name="Get the next issue"
  - visible: placeholder="your@email.com"
  - type: css=input[aria-label="Email address"] = env.TEST_NEWSLETTER_EMAIL
  - click: role=button name="Subscribe"
  - wait: 3000
assert:
  - visible: role=heading name="You're on the list"
  - # or checkmark icon + success copy
  - network 200: POST /api/newsletter/subscribe

## scenario: subscribe-invalid-email
prereqs: on subscribe CTA
steps:
  - type: css=input[aria-label="Email address"] = "not-an-email"
  - click: role=button name="Subscribe"
assert:
  - visible: role=alert (red error text)
  - network NOT called

## scenario: subscribe-error-toast
prereqs: BE mocked to 500
steps:
  - type: email
  - click: Subscribe
assert:
  - role=alert visible with backend error OR fallback

## scenario: subscribe-submitting-state
prereqs: on subscribe CTA
steps:
  - type: valid email
  - click: role=button name="Subscribe"
  - # button text flips to "…"
assert:
  - visible: role=button name="…" briefly

---

## scenario: unsubscribe-loading
prereqs: signed_out
steps:
  - goto: /unsubscribe?email={env.TEST_NEWSLETTER_EMAIL}&token={env.TEST_UNSUBSCRIBE_TOKEN}
assert:
  - visible: text*="One moment while we take you off the list" (loading state)
  - OR immediate "You've been unsubscribed" if fast

## scenario: unsubscribe-success
prereqs: valid token
steps:
  - goto: /unsubscribe?email=…&token=<valid>
  - wait: role=heading name="You've been unsubscribed" visible timeout=8000
assert:
  - visible: text*="Sorry to see you go"
  - visible: role=button OR link name="Back to Epoch Lag"
  - network 200: POST /api/newsletter/unsubscribe

## scenario: unsubscribe-invalid-token
prereqs: bad token
steps:
  - goto: /unsubscribe?email=…&token=BAD
assert:
  - error state visible OR silent no-op
  - network 4xx: POST /api/newsletter/unsubscribe

---

## scenario: navbar-hamburger-mobile
prereqs: viewport: mobile-only, on /newsletters
steps:
  - click: role=button name="Open menu"
  - # aria-expanded flips to true
  - visible: mobile menu with links
  - click: role=button name="Close menu"
assert:
  - menu closes

## scenario: navbar-signin-auth-aware
prereqs: signed_out
steps:
  - goto: /newsletters
  - click: role=link name="Sign in"
assert:
  - url_equals: /onboarding/welcome
  # sign in via auth.md, revisit
  - goto: /newsletters
  - click: role=link name="Sign in"
  - url_equals: /home

## scenario: navbar-contact-modal
prereqs: on /newsletters
steps:
  - click: role=button name="Contact Us"
  - wait: role=dialog visible timeout=2000
assert:
  - contact form visible
  - press: Escape → dialog closes

---

## known limits (do not file bugs)
- Archive is fully static. Adding an issue requires code + rebuild.
- Contact form endpoint TBD.
- Newsletter subscribe is idempotent — re-subscribing same email is
  a no-op success.
- Social icon URLs hardcoded in NewsletterMailFooter and HomeFooter.

## last updated
2026-09-09 — full rewrite from verified inventory (agent-5).
