# feature: auth
routes: /login, /signup, /verify-otp, /forgot-password
be endpoints:
  - POST /api/auth/login
  - POST /api/auth/register
  - POST /api/auth/phone/start
  - POST /api/auth/phone/verify
  - POST /api/auth/email/verify
  - POST /api/auth/google/callback
  - POST /api/auth/social/finalize
  - POST /api/auth/request-password-reset
  - POST /api/auth/reset-password
  - POST /api/referral/redeem
  - POST /api/onboarding/anon/merge
env: tunnel

## global prereqs
- viewport: [mobile, tablet, desktop]
- HTTPS origin (GSI + safe-area behaviors require it)

## fixtures required
- env.TEST_PHONE — existing registered account, format: digits only
  after country code (no leading `+`, no country code — the picker sets
  it separately)
- env.TEST_PHONE_NEW — fresh, not yet registered
- env.TEST_EMAIL / env.TEST_PASSWORD — existing email account
- env.TEST_GOOGLE_ACCOUNT — Google account that consents in OAuth popup
- env.TEST_OTP_STATIC — 6-digit string; requires BE OTP bypass. If not
  available, runner falls back to human-in-the-loop paste.

## setup notes
- OTP entry uses the paste path — the `OtpInput` component's
  `handlePaste` accepts a full N-digit string pasted into any single
  input and auto-fills all cells. Spec steps use `paste_into` to leverage
  this instead of typing digit-by-digit.
- Sign-out has a confirmation modal (verified in code) with same button
  text `Sign out` — scope selectors by container.
- Country picker trigger is a `<button>` whose visible text is only the
  dial code (e.g. `+1`) — no aria-label. Use text match scoped to the
  phone-input row.

---

## scenario: login-phone-existing-user
prereqs:
  - signed_out
steps:
  - goto: /login
  - visible: role=heading name="Log in to your account"
  - click: role=button name="Phone"
  - # country picker: trigger button has visible text = current dial code
  - click: role=button name="+1"  # (or whatever initial code shows)
  - visible: placeholder="Search country or code"
  - type: placeholder="Search country or code" = "United States"
  - click: role=button name*="United States"  # matches "🇺🇸 United States +1"
  - type: placeholder="Phone number" = env.TEST_PHONE
  - click: role=button name="Submit"
  - wait_url: /\/verify-otp\?mode=phone/ timeout=8000
  - paste_into: css=input[maxLength="1"]:first-of-type = env.TEST_OTP_STATIC
  - # onComplete fires auto-submit if length matches; if not, click Submit
  - click: role=button name="Submit"
assert:
  - url_equals: /home
  - storage[epoch_auth_token]: not_empty
  - storage[epoch_user]: not_empty
fail_if:
  - text visible: "Incorrect or expired"
  - time_on_page(/verify-otp) > 6000 after paste

## scenario: login-phone-new-user
prereqs:
  - signed_out
  - env.TEST_PHONE_NEW is fresh
steps:
  - goto: /login
  - click: role=button name="Phone"
  - type: placeholder="Phone number" = env.TEST_PHONE_NEW
  - click: role=button name="Submit"
  - wait_url: /\/verify-otp\?mode=phone/
  - paste_into: css=input[maxLength="1"]:first-of-type = env.TEST_OTP_STATIC
  - click: role=button name="Submit"
assert:
  - url_matches: /^\/onboarding\/create-account\?mode=phone/
  - url_matches: /phoneVerifyToken=[^&]+/

## scenario: login-email-existing-user
prereqs:
  - signed_out
steps:
  - goto: /login
  - click: role=button name="Email"
  - type: placeholder="Email address" = env.TEST_EMAIL
  - click: role=button name="Submit"
  - wait: placeholder="Password" visible timeout=5000
  - type: placeholder="Password" = env.TEST_PASSWORD
  - click: role=button name="Submit"
assert:
  - url_equals: /home
  - storage[epoch_auth_token]: not_empty

## scenario: login-email-unknown-account
prereqs:
  - signed_out
steps:
  - goto: /login
  - click: role=button name="Email"
  - type: placeholder="Email address" = "definitely-not-a-user@example.com"
  - click: role=button name="Submit"
  - wait: placeholder="Password" visible
  - type: placeholder="Password" = "anything123"
  - click: role=button name="Submit"
assert:
  - text visible: "We couldn't find an account with that email."
  - visible: css=a[href="/signup"]
  - text visible: "Sign up instead"

## scenario: login-google-existing-user
description: full Google OAuth loop; existing account → /home
prereqs:
  - signed_out
  - GOOGLE_CLIENT_ID env var present in the dev server
steps:
  - goto: /login
  - # container has aria-label; GSI renders the real button inside
  - wait: css=[aria-label="Sign in with Google"] visible timeout=8000
  - # opacity flips from 0.5 once googleReady=true; use enabled instead of just visible
  - wait: css=[aria-label="Sign in with Google"]:not(.pointer-events-none) timeout=8000
  - click: css=[aria-label="Sign in with Google"] iframe  # GSI renders inside an iframe
  - handle_popup: select env.TEST_GOOGLE_ACCOUNT
assert:
  - url_equals: /home
  - storage[epoch_auth_token]: not_empty
fail_if:
  - console_error matches: /GSI init failed|popup blocked/
  - time_on_page(/login) > 8000 after popup close

## scenario: login-google-button-visible-all-breakpoints
description: regression — GSI renders into both mobile + desktop refs (not just one)
prereqs:
  - signed_out
steps:
  - goto: /login (viewport 1440x900)
  - wait: css=[aria-label="Sign in with Google"] visible timeout=8000
  - screenshot: desktop
  - goto: /login (viewport 800x1024)
  - wait: css=[aria-label="Sign in with Google"] visible timeout=8000
  - screenshot: tablet
  - goto: /login (viewport 390x844)
  - wait: css=[aria-label="Sign in with Google"] visible timeout=8000
  - screenshot: mobile
fail_if:
  - any breakpoint: element css=[aria-label="Sign in with Google"] not visible OR container has 0 children (GSI didn't render)

---

## scenario: signup-phone-happy-path
prereqs:
  - signed_out
  - env.TEST_PHONE_NEW is fresh (not yet registered)
steps:
  - goto: /signup
  - type: placeholder="Phone number" = env.TEST_PHONE_NEW
  - click: role=button name="Submit"
  - wait_url: /\/verify-otp\?mode=phone/
  - paste_into: css=input[maxLength="1"]:first-of-type = env.TEST_OTP_STATIC
  - click: role=button name="Submit"
assert:
  - url_matches: /^\/onboarding\/create-account\?mode=phone/
  - url_matches: /phoneVerifyToken=[^&]+/

## scenario: signup-phone-already-registered
prereqs:
  - signed_out
  - env.TEST_PHONE is currently registered
steps:
  - goto: /signup
  - type: placeholder="Phone number" = env.TEST_PHONE
  - click: role=button name="Submit"
  - wait_url: /\/verify-otp\?mode=phone/
  - paste_into: css=input[maxLength="1"]:first-of-type = env.TEST_OTP_STATIC
  - click: role=button name="Submit"
assert:
  - text visible*: "already"
  - visible: role=button name="Log in instead"
  - visible: role=button name="Use a different number"
fail_if:
  - url_equals: /home   # would mean silent sign-in as the existing account

## scenario: signup-google-continue
description: Google button on /signup uses aria-label="Continue with Google" (not "Sign in")
prereqs:
  - signed_out
steps:
  - goto: /signup
  - wait: css=[aria-label="Continue with Google"] visible timeout=8000
assert:
  - visible: css=[aria-label="Continue with Google"]
fail_if:
  - the container is empty (no GSI iframe inside)

---

## scenario: verify-otp-resend
prereqs:
  - just submitted phone at /signup and now on /verify-otp
steps:
  - # Resend button text starts with "Send a new code" and appends "(m:ss)" while counting down
  - wait: role=button name*="Send a new code" enabled timeout=65000
  - click: role=button name*="Send a new code"
assert:
  - disabled: role=button name*="Send a new code"
  - text visible: /\(\d:\d\d\)/   # timer restarts at (1:00)

## scenario: verify-otp-wrong-code
prereqs:
  - on /verify-otp with fresh submission
steps:
  - paste_into: css=input[maxLength="1"]:first-of-type = "111111"
  - click: role=button name="Submit"
assert:
  - text visible: "Incorrect or expired"
  - url_matches: /\/verify-otp/

---

## scenario: forgot-password-full-flow
description: 3-step reset — email → OTP → new password. Uses a different OTP component (has aria-labels).
prereqs:
  - signed_out
  - env.TEST_EMAIL is a reset-eligible account
steps:
  - goto: /forgot-password
  - type: placeholder="Email" = env.TEST_EMAIL
  - click: role=button name="Send Verification Code"
  - wait: css=input[aria-label="Digit 1"] visible timeout=15000
  - # 5-digit OTP for email reset (not 6)
  - paste_into: css=input[aria-label="Digit 1"] = env.TEST_OTP_STATIC[:5]
  - click: role=button name="Submit"
  - wait: placeholder="New Password" visible
  - type: placeholder="New Password" = "TempReset!123"
  - type: placeholder="Confirm Password" = "TempReset!123"
  - click: role=button name="Reset Password"
  - wait: role=button name="Log in" visible timeout=8000
  - click: role=button name="Log in"
assert:
  - url_equals: /login

## scenario: forgot-password-mismatch
prereqs:
  - on password step of /forgot-password after OTP verified
steps:
  - type: placeholder="New Password" = "Password123!"
  - type: placeholder="Confirm Password" = "Different456!"
  - click: role=button name="Reset Password"
assert:
  - text visible*: "match"   # actual copy comes from validateConfirmPassword; verify at run time
  - url_matches: /\/forgot-password/
  - network fails: POST /api/auth/reset-password

## scenario: forgot-password-eye-toggle
description: password reveal toggle — DESKTOP ONLY
prereqs:
  - on password step
  - viewport: desktop-only
steps:
  - # Eye toggle has aria-label that switches between "Show password" and "Hide password"
  - visible: role=button name="Show password"
  - click: role=button name="Show password"
  - visible: role=button name="Hide password"
  - # confirm the password input's type changed
  - css=input[placeholder="New Password"][type="text"]  # was "password" before click

---

## scenario: sign-out-hard-reload
description: signOut must full-reload the tab to purge module-scoped caches
prereqs:
  - signed_in as any account
steps:
  - goto: /settings/account
  - # Row button has text "Sign out" (red, #E90606). Scope by not-in-modal.
  - click: css=button:not([class*="bg-\\[\\#D95F3B\\]"]) >> role=button name="Sign out"
  - # confirmation modal appears — modal has heading "Sign out" and body "Are you sure…"
  - visible: role=heading name="Sign out"
  - visible: text="Are you sure you want to sign out?"
  - # Confirm button in modal (bg #D95F3B)
  - click: css=button.bg-\\[\\#D95F3B\\] >> role=button name="Sign out"
assert:
  - url_equals: /onboarding/welcome
  - storage[epoch_auth_token]: empty
  - storage[epoch_user]: empty
fail_if:
  - navigation was SPA-only (no full reload) — check window.performance.getEntriesByType('navigation')[0].type !== 'reload'

## scenario: sign-out-cancel
prereqs:
  - signed_in
steps:
  - goto: /settings/account
  - click: role=button name="Sign out"  # opens modal
  - visible: role=heading name="Sign out"
  - click: role=button name="Cancel"
assert:
  - hidden: role=heading name="Sign out"
  - storage[epoch_auth_token]: not_empty  # still signed in

## scenario: session-bleed-does-not-leak-previous-user
description: regression — module caches must not leak between account switches
prereqs:
  - two accounts: USER_A and USER_B
steps:
  - # sign in as USER_A via login-phone-existing-user helper
  - runScenario: login-phone-existing-user with phone=env.USER_A_PHONE
  - goto: /home
  - wait: role=heading name*="Good" visible  # HeroGreeting
  - goto: /lags
  - wait: text visible*="All"
  - goto: /notifications
  - wait: text visible*="Notifications"
  - signOut
  - runScenario: login-phone-existing-user with phone=env.USER_B_PHONE
  - goto: /home
assert:
  - text visible: env.USER_B_FIRSTNAME
  - text hidden: env.USER_A_FIRSTNAME
  - goto: /lags
  - text hidden: env.USER_A_ANY_STORY_TITLE   # pre-captured
  - goto: /notifications
  - text hidden: env.USER_A_ANY_NOTIFICATION_MESSAGE

---

## scenario: cold-start-trial-gate
description: authed user with plan=free + hasUsedTrial=false redirected to /onboarding/free-trial
skip: BE dev seed endpoint not implemented — cannot create a user in the required state
prereqs:
  - test account seeded with plan=free, hasUsedTrial=false, onboardingCompletedAt set
steps:
  - runScenario: login-phone-existing-user with phone=env.SEEDED_TRIAL_PHONE
  - goto: /home
assert:
  - wait_url: /\/onboarding\/free-trial/ timeout=3000
fail_if:
  - stays on /home for >5000ms
  - misroutes users with plan=free_trial or plan=unlimited to /onboarding/free-trial

---

## scenario: viewport-fit-safe-areas
description: iOS Safari — bottom tab bar clears URL pill, banner clears status bar
manual-only: browser-chrome measurement can't be verified by Playwright
prereqs:
  - signed_in
  - device: iPhone (real device or Safari simulator), HTTPS
  - viewport: mobile-only
steps:
  - goto: /home
  - screenshot: home-initial
  - scroll down 400px
  - scroll up 400px
  - screenshot: home-after-scroll
assert (manual):
  - bottom tab bar visible above Safari URL pill zone on both screenshots
  - download banner top edge respects the notch inset (44px)
  - no white bands in safe-area zones

---

## scenario: input-no-zoom-on-focus
description: iOS auto-zoom regression — every input must be ≥16px effective on mobile
manual-only: iOS native zoom behavior not observable from Playwright JS
prereqs:
  - viewport: mobile-only
  - device: real iOS Safari or Chrome-with-iOS-simulation
steps (manual):
  - goto: /login → tap "Email" tab → tap email input
  - observe: no auto-zoom, viewport scale stays at 1
  - goto: /signup → tap phone input
  - open country picker → tap search input
  - goto: /settings/account → open Edit Name modal → tap name input
assert (manual):
  - no scale change on any focus event
programmatic check:
  - runner CAN verify globals.css contains the `@media (max-width: 767px)` rule
    that forces `font-size: 16px !important` on `input`, `textarea`,
    `select`, `[contenteditable]`. If that rule is missing, mark scenario failed.

---

## known limits (do not file bugs)
- Google sign-in requires HTTPS — HTTP LAN test fails silently.
- Mic-permission sheet appears on mic-denied instead of a re-prompt.
  iOS Safari policy; user must re-enable in Settings.
- Password reveal (eye toggle) is desktop-only for now.
- Sign-out hard-reload adds a brief white flash between /settings and
  /onboarding/welcome — accepted trade-off for module-cache purge.
- OTP resend cooldown: 60s (phone verify), 30s (email reset).
- Referral redeem is best-effort — silent failure does not block signup.
- BE OTP bypass not enabled — runner falls back to human paste at
  `wait_otp:` steps if `env.TEST_OTP_STATIC` isn't a working bypass value.
- BE dev seed endpoint not available — scenarios marked `skip:` for now.
- `input-no-zoom-on-focus` and `viewport-fit-safe-areas` are
  `manual-only:` — browser chrome and iOS native behaviors can't be
  verified programmatically; runner still snapshots + prompts human.

## last updated
2026-09-09 — code-verified selectors from a static walkthrough of login/signup/verify-otp/forgot-password/CountryPicker/OtpInput/SignOutRow. Every selector now matches actual JSX; paste-based OTP entry replaces per-digit typing; two OTP components (verify-otp: no aria-labels, forgot-password: has aria-labels); Google button aria-labels differ per page ("Sign in" vs "Continue"). Sign-out confirmation modal confirmed to exist. Cold-start trial gate and safe-area scenarios marked as skip/manual respectively.
