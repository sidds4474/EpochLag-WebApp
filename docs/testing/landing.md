# feature: landing
routes:
  - /                               # marketing home page
be endpoints:
  - POST /api/newsletter/subscribe  # NewsletterSection form
  - AuthProvider.useAuth (affects Sign in link destination)
env: tunnel (or prod for read-only smoke)

## global prereqs
- viewport: [mobile, tablet, desktop]

## setup notes
- All content is static. No BE dependency for load.
- NavBar reads AuthProvider — Sign in link routes based on auth state.
- Mobile hamburger toggles full-screen drawer.

---

## scenario: landing-loads-all-sections
prereqs: signed_out
steps:
  - goto: /
  - wait: role=heading name="Stories weren't meant to disappear in a feed" visible timeout=5000
assert:
  - visible: NavBar (logo, "Newsletter", "Sign in", "Contact Us")
  - visible: hero section
  - visible: role=heading name="Built for the stories behind the photos" (StoriesSection)
  - visible: text*="HOW IT WORKS" (HowItWorks label)
  - visible: text="ABOUT" AND role=heading name*="Epoch Lag: Stories that connect"
  - visible: text*="Testimonials" AND role=heading name*="What people say"
  - visible: role=heading name="FAQs"
  - visible: role=heading name="Stay in the loop" (NewsletterSection)
  - visible: role=heading name*="Get the app" (CtaBanner)
  - visible: HomeFooter with © 2026 Epoch Lag

---

## scenario: navbar-signin-signed-out
prereqs: signed_out
steps:
  - goto: /
  - click: role=link name="Sign in"
assert:
  - url_equals: /onboarding/welcome

## scenario: navbar-signin-signed-in
prereqs: signed_in
steps:
  - goto: /
  - click: role=link name="Sign in"
assert:
  - url_equals: /home

## scenario: navbar-newsletter-link
prereqs: any
steps:
  - goto: /
  - click: role=link name="Newsletter"
assert:
  - url_equals: /newsletters

## scenario: navbar-contact-modal
prereqs: on /
steps:
  - click: role=button name="Contact Us"
  - wait: role=dialog visible timeout=2000
assert:
  - form visible
  - press: Escape → dialog closes

## scenario: navbar-mobile-hamburger
prereqs: viewport: mobile-only
steps:
  - goto: /
  - visible: role=button name="Open menu"
  - click: role=button name="Open menu"
  - # aria-expanded flips to true
  - visible: role=button name="Close menu"
  - visible: role=link name="Newsletter" (in mobile menu)
  - click: role=link name="Newsletter"
assert:
  - menu closes
  - url_equals: /newsletters

---

## scenario: hero-app-store-badges
prereqs: on /
steps:
  - # download badges have alt text "Download on the App Store" and "Get it on Google Play"
  - visible: css=img[alt="Download on the App Store"]
  - visible: css=img[alt="Get it on Google Play"]

## scenario: stories-section-features
prereqs: on /
steps:
  - scroll to StoriesSection
assert:
  - visible: text*="Share stories with important friends and family"
  - visible: text*="Pass stories down to future generations"
  - # story cards show day + month + question text

## scenario: how-it-works-carousel-nav
prereqs: on /
steps:
  - scroll to HowItWorks
  - # Previous/Next arrow buttons; capture initial slide
  - click: role=button name="Next" OR aria-label*="Next"
assert:
  - carousel advances
  - # Previous disabled on first slide
  - navigate back to first
  - visible: disabled: role=button name*="Previous"

## scenario: about-section-text
prereqs: on /
steps:
  - scroll to AboutSection
assert:
  - visible: text*="e-pək" (pronunciation)
  - visible: css=img[alt*="Kids sitting"]

## scenario: testimonials-rail
prereqs: on /
steps:
  - scroll to TestimonialsSection
assert:
  - visible: ≥2 quote cards
  - # attribution names include Patrick, Aliyu, Jordan (or whatever ships)
  - visible: text="Patrick" OR text="Aliyu" OR text="Jordan"

## scenario: faq-accordion
prereqs: on /
steps:
  - scroll to FAQ
  - visible: text*="Is Epoch Lag private?"
  - click: first FAQ question
  - # image src changes from FaqPlus to FaqMinus (alt "Expand" / "Collapse")
assert:
  - answer visible
  - click again → collapses

## scenario: faq-contact-cta
prereqs: on FAQ section
steps:
  - click: role=button name="Contact"
assert:
  - opens same ContactModal as NavBar

## scenario: newsletter-section-subscribe
prereqs: on /
steps:
  - scroll to NewsletterSection (id="newsletter")
  - visible: role=heading name="Stay in the loop"
  - type: css=input[aria-label="Email address"] = env.TEST_NEWSLETTER_EMAIL
  - click: role=button name="Subscribe"
  - wait: 3000
assert:
  - visible: role=heading name="You're on the list"
  - network 200: POST /api/newsletter/subscribe

## scenario: newsletter-section-view-newsletters-link
prereqs: on NewsletterSection
steps:
  - click: role=link name="View our newsletters" OR button
assert:
  - url_equals: /newsletters

## scenario: cta-banner-app-badges
prereqs: on /
steps:
  - scroll to CtaBanner
assert:
  - visible: text*="Get the app"
  - visible: css=img[alt="Download on the App Store"]
  - visible: css=img[alt="Get it on Google Play"]
  - # QR code on desktop
  - viewport desktop: visible: css=img[alt*="QR code"]

---

## scenario: no-horizontal-scroll-mobile
description: regression — Testimonials rail must not cause page h-scroll
prereqs: viewport: mobile-only
steps:
  - goto: /
  - measure: document.documentElement.scrollWidth vs innerWidth
assert:
  - scrollWidth <= innerWidth (no page-level h-scroll)

---

## scenario: footer-links
prereqs: on /
steps:
  - scroll to HomeFooter
assert:
  - visible: text="© 2026 Epoch Lag. All rights reserved."
  - visible: role=link name*="Privacy Policy"
  - visible: role=link name*="Child Safety Policy"
  - visible: role=link name*="Account Deletion"
  - visible: role=link name*="Terms of Service"

---

## known limits (do not file bugs)
- Landing is fully public — auth-state affects only the Sign in
  destination.
- Contact form endpoint TBD.
- HowItWorks slide content is dynamic via slideContent array; the
  exact number of slides may change.
- Hero + Testimonials content is static; no CMS.
- QR code image is desktop-only in CtaBanner.

## last updated
2026-09-09 — full rewrite from verified inventory (agent-5).
