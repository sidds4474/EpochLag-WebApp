# feature: settings
routes:
  - /settings                       # mobile menu index
  - /settings/account
  - /settings/subscription
  - /settings/notifications
  - /settings/about
  - /settings/privacy
  - /settings/terms
  - /settings/help
  - /settings/release-notes
be endpoints:
  - GET /api/subscription
  - PUT /api/users/phone
  - GET /api/users/feature-updates-notifications
  - PUT /api/users/feature-updates-notifications
  - DELETE /api/users/me            # delete account
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## setup notes
- Desktop: two-column (menu + panel). Auto-redirect /settings →
  /settings/account.
- Mobile: menu visible ONLY on /settings; sub-panels replace menu.
- Sign out at bottom of menu on both breakpoints.
- All modals: `role="dialog"` with `aria-label` and h3 title.

---

## scenario: settings-desktop-auto-redirect
prereqs: signed_in, viewport: desktop-only
steps:
  - goto: /settings
assert:
  - url_equals: /settings/account

## scenario: settings-mobile-menu
prereqs: signed_in, viewport: mobile-only
steps:
  - goto: /settings
  - visible: role=heading name="Settings" (h1)
assert:
  - visible: role=link name="Account"
  - visible: role=link name="Subscription"
  - visible: role=link name="Notifications"
  - visible: role=link name="About"
  - visible: role=link name="Privacy Policy"
  - visible: role=link name="Terms of Services"
  - visible: role=link name="Help and Support"
  - visible: role=link name="Release Notes"
  - visible: role=button name="Sign out"

## scenario: settings-mobile-back
prereqs: on /settings/account, viewport: mobile-only
steps:
  - visible: role=button name="Back"
  - click: role=button name="Back"
assert:
  - url_equals: /settings

---

## scenario: account-panel-loads
prereqs: signed_in
steps:
  - goto: /settings/account
  - # PanelMobileHeader title: "Account"
  - visible: text*="Name" AND full user name
  - # Mobile: "Email Address"; Desktop: "Email"
  - visible: text*="Email" AND user email
  - # Mobile: "Phone Number"; Desktop: "Phone"
  - visible: text*="Phone"
assert:
  - visible: role=button name="Edit name"
  - # If user has phone: Edit + Remove; else "Add phone number"
  - visible: role=button name="Edit phone" OR text="Add phone number"

## scenario: account-edit-name-modal
prereqs: on /settings/account
steps:
  - click: role=button name="Edit name"
  - wait: role=heading name="Edit name" visible timeout=2000
  - # placeholders TBD — component uses first/last name inputs
  - clear + retype: first name field
  - click: role=button name="Save"
assert:
  - modal closes
  - name updates in Account panel
  - # if error: visible red text (text-[#D95F3B])

## scenario: account-add-phone
prereqs: on /settings/account, no phone
steps:
  - click: role=button name*="Add phone" OR text="Add phone number"
  - # PhoneEditor inline
  - visible: css=select                       # country code
  - visible: placeholder="+1 123 456 7890"
  - # enter country + phone
  - click: role=button name="Send code"
  - # OTP flow (see auth.md verify-otp-* scenarios)
assert:
  - after successful verify: network 200: PUT /api/users/phone
  - Account panel shows new phone

## scenario: account-remove-phone
prereqs: on /settings/account, has phone
steps:
  - click: role=button name="Remove phone"
  - # confirmation modal
  - click: role=button name*="Remove" (in modal)
assert:
  - network 200: PUT /api/users/phone (with removal payload)
  - phone row → "Add phone number"

## scenario: account-reset-password
prereqs: on /settings/account, viewport: desktop-only
steps:
  - # desktop label "Reset password"; mobile label "Change Password"
  - click: role=button name="Reset password"
  - wait: role=heading name="Reset password" visible timeout=2000
  - visible: text containing user.email in <strong>
  - click: role=button name="Send link"
  - wait: role=button name="Sending..." OR "Done"
  - click: role=button name="Done"
assert:
  - modal closes

## scenario: account-delete-modal-cancel
prereqs: on /settings/account
steps:
  - click: role=button name="Delete account"
  - wait: role=heading name="Delete account?" visible timeout=2000
  - visible: text*="permanently delete"
  - click: role=button name="Cancel"
assert:
  - modal closes, account intact

## scenario: account-delete-modal-destructive
description: DANGEROUS — do not run on real accounts
prereqs: on /settings/account with a disposable test account
skip: only run against seed accounts with cleanup plan
steps:
  - click: role=button name="Delete account"
  - click: role=button name="Delete account" (in modal — button text repeats)
assert:
  - network 200: DELETE /api/users/me
  - hard-reload to /onboarding/welcome

---

## scenario: subscription-panel
prereqs: signed_in
steps:
  - goto: /settings/subscription
  - # loading skeleton on h2 (animate-pulse) then plan label
  - wait: role=heading (h2) with plan name visible timeout=5000
assert:
  - h2 text: "Free" OR "Free Trial" OR "Unlimited"
  - visible: badge "Current Plan"
  - if trial: text*="Trial ends"
  - if unlimited: text*="Active until"
  - viewport desktop: visible: role=button name="Upgrade Plan"

## scenario: subscription-upgrade-modal
prereqs: on /settings/subscription, viewport: desktop
steps:
  - click: role=button name="Upgrade Plan"
  - wait: role=heading name="Upgrade coming soon" visible timeout=2000
  - visible: role=button name="Got it"
  - click: role=button name="Got it"
assert:
  - modal closes

---

## scenario: notifications-panel-toggle
prereqs: signed_in
steps:
  - goto: /settings/notifications
  - visible: role=heading name="Notifications" (h2)
  - visible: text="Feature Update"
  - # loading skeleton first
  - wait: role=switch visible timeout=5000
  - capture initial aria-checked value
  - click: role=switch
assert:
  - network 200: PUT /api/users/feature-updates-notifications
  - aria-checked flipped

## scenario: notifications-error-rollback
prereqs: on /settings/notifications, BE mocked to 500 on PUT
steps:
  - capture initial state
  - click: role=switch
  - wait: 2000
assert:
  - aria-checked reverts to captured
  - toast visible (error)

---

## scenario: about-panel-tabs
prereqs: signed_in
steps:
  - goto: /settings/about
  - visible: role=button name="About" (tab pill)
  - visible: role=button name="Why Epoch Lag" (tab pill)
  - # About tab default
  - visible: role=heading name="Stories that Connect" (h2)
  - click: role=button name="Why Epoch Lag"
  - visible: role=heading name="Built for the stories behind the photos" (h2)
  - visible: role=button OR link name="Learn More"

## scenario: privacy-loads
prereqs: signed_in
steps:
  - goto: /settings/privacy
assert:
  - visible: role=heading name*="Privacy Policy" (h1)
  - visible: extensive policy paragraphs

## scenario: terms-loads
prereqs: signed_in
steps:
  - goto: /settings/terms
assert:
  - visible: role=heading name*="Terms" (h1)

## scenario: release-notes-loads
prereqs: signed_in
steps:
  - goto: /settings/release-notes
assert:
  - visible: role=heading name="Release Notes" (h1)
  - visible: ≥1 version heading (h2 "Version X.X")

## scenario: help-panel-tabs
prereqs: signed_in
steps:
  - goto: /settings/help
  - # PanelMobileHeader: "Help and Support"
  - visible: role=button name="FAQ" (tab)
  - visible: role=button name="Contact Us" (tab)
  - # FAQ default
  - visible: FAQ questions (accordion buttons)
  - click: first FAQ question
  - wait: 300
  - visible: answer body

## scenario: help-contact-form-send
prereqs: on /settings/help, Contact Us tab
steps:
  - click: role=button name="Contact Us"
  - visible: placeholder="Email"
  - visible: placeholder="Share your questions with us"
  - type: placeholder="Email" = env.TEST_EMAIL
  - type: placeholder="Share your questions with us" = "This is a test contact message."
  - click: role=button name="Send"
  - wait: 3000
assert:
  - visible: success message (text-primary-blue) OR error message (red)

---

## scenario: signout-row
prereqs: signed_in
steps:
  - # SignOutRow lives at bottom of Settings menu
  - visible: role=button name="Sign out"
  - click: role=button name="Sign out"
  - wait: role=heading name="Sign out" visible timeout=2000
  - visible: text*="Are you sure"
  - visible: role=button name="Cancel"
  - # confirm button is the second "Sign out" (danger bg)
assert:
  - # for the actual sign-out effect see auth.md :: sign-out-hard-reload

---

## known limits (do not file bugs)
- Subscription "Upgrade Plan" opens "Upgrade coming soon" modal — web
  upgrade path not implemented. Correct behavior.
- Reset Password hidden on mobile (desktop-only affordance).
- Feature Update toggle defaults to false on null (loading) with
  animated pulse skeleton.
- /settings auto-redirects to /settings/account on desktop via
  useEffect + matchMedia; brief flash may appear.
- Delete account is irreversible on BE — never run on real accounts.

## last updated
2026-09-09 — full rewrite from verified selector inventory (agent-4).
