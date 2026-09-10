# Epoch Lag — Web QA Test Plans

Local-only test specs, structured for AI-driven execution (Claude Code +
Playwright MCP planned). Not committed to git. Each feature area lives
in its own file under this directory; results from test runs go under
`results/`.

## How to run a spec

Once Playwright MCP is wired, tell Claude Code:

> Run docs/testing/<feature>.md against <env-url> and write results to docs/testing/results/YYYY-MM-DD/

Claude reads the spec, executes each scenario via the browser, verifies
assertions, writes a dated results file, and summarizes failures in
chat.

## Environments

- **local-dev**: `http://localhost:3000` — HTTP; mic + uploads + OAuth
  broken (see individual specs for known dev-env limits).
- **tunnel**: `https://<random>.loca.lt` via `npx localtunnel --port 3000`
  — full functionality, ephemeral URL.
- **staging**: `https://staging.epochlag.com` (if/when provisioned) —
  stable HTTPS, real BE.
- **prod**: `https://epochlag.com` — never automated against; manual
  smoke only.

Every spec file declares which env it expects at the top (`env:`
metadata). If not declared, assume `tunnel`.

## Test data + fixtures

Populate a **local `.env.test`** (gitignored) with:

```
TEST_PHONE=+15555550100
TEST_PHONE_NEW=+15555550199        # for "new user" scenarios; not yet registered
TEST_EMAIL=qa@epochlag.com
TEST_PASSWORD=<known-password>
TEST_GOOGLE_ACCOUNT=qa@gmail.com
TEST_OTP_STATIC=123456              # only valid if BE enables OTP bypass
TEST_OTP_INBOX_URL=<if-any>         # where to poll OTPs on non-bypass envs
```

Specs reference these as `env.TEST_PHONE`, `env.TEST_OTP_STATIC`, etc.

**OTP handling** (no BE bypass yet):
- If `TEST_OTP_STATIC` is set and env is dev/staging with BE bypass on,
  use it directly.
- Otherwise, ask the human tester at run-start: "waiting on OTP for
  <phone/email>" and let them paste it. Timeout the ask at 60s.

**BE fixture endpoints** (TBD — not yet implemented):
- `POST /api/dev/seed-user` — create a user in a specific state
  (plan, hasUsedTrial, onboardingCompleted, etc.)
- `POST /api/dev/reset-user/:id` — wipe user back to fresh state
- Until these exist, prereqs like "user with plan=free" require
  manual setup or fresh signup.

## Selector vocabulary

Locked list — the AI executor translates these to Playwright/Puppeteer
selectors. Do not invent new ones without updating this doc.

| Vocabulary                          | Playwright translation                                    | Notes                                              |
| ----------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `role=<role> name="<text>"`         | `page.getByRole(role, { name: <text> })`                  | Preferred — most stable.                           |
| `text="<exact>"`                    | `page.getByText(<text>, { exact: true })`                 | Use for unique visible strings.                    |
| `text*="<substr>"`                  | `page.getByText(<substr>)`                                | Substring match.                                   |
| `label="<text>"`                    | `page.getByLabel(<text>)`                                 | For form fields.                                   |
| `placeholder="<text>"`              | `page.getByPlaceholder(<text>)`                           | For unlabeled inputs.                              |
| `testid="<id>"`                     | `page.getByTestId(<id>)`                                  | When we add `data-testid` attrs.                   |
| `css="<selector>"`                  | `page.locator(<selector>)`                                | Escape hatch — avoid.                              |
| `url_equals: <path>`                | `expect(page).toHaveURL(<path>)`                          | Exact match.                                       |
| `url_matches: <regex>`              | `expect(page).toHaveURL(<regex>)`                         | Regex match.                                       |
| `visible: <selector>`               | `expect(<locator>).toBeVisible()`                         | —                                                  |
| `hidden: <selector>`                | `expect(<locator>).toBeHidden()`                          | —                                                  |
| `enabled: <selector>`               | `expect(<locator>).toBeEnabled()`                         | —                                                  |
| `disabled: <selector>`              | `expect(<locator>).toBeDisabled()`                        | —                                                  |
| `text visible: "<substr>"`          | `expect(page.getByText(<substr>)).toBeVisible()`          | Convenience.                                       |
| `text hidden: "<substr>"`           | `expect(page.getByText(<substr>)).toBeHidden()`           | —                                                  |
| `storage[<key>]: not_empty`         | `expect(await page.evaluate(...localStorage.getItem)).toBeTruthy()` | —                                        |
| `storage[<key>]: empty`             | `.toBeFalsy()`                                            | —                                                  |
| `storage[<key>] equals: "<val>"`    | `.toBe(<val>)`                                            | —                                                  |
| `time_on_page(<path>) < <ms>`       | measure timestamp delta                                   | Perf check.                                        |
| `console_error matches: <regex>`    | capture `page.on('console', ...)`                         | Fails scenario if match seen at any point.         |
| `network 200: <method> <path>`      | route intercept + status check                            | —                                                  |
| `network fails: <path>`             | route intercept — assert no successful request            | —                                                  |
| `screenshot: <label>`               | `page.screenshot({ path: results/<scenario>-<label>.png })` | Manual snapshot.                                 |

## Action vocabulary

| Vocabulary                                | Playwright translation                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `goto: <path>`                            | `page.goto(env.BASE + <path>)`                                 |
| `click: <selector>`                       | `<locator>.click()` — implicit `waitFor` enabled + visible     |
| `type: <selector> = "<text>"`             | `<locator>.fill(<text>)`                                       |
| `type_sequence: <selector> = "<text>"`    | `<locator>.type(<text>, { delay: 30 })` — per-key events       |
| `select: <selector> = "<option>"`         | `<locator>.selectOption(<option>)`                             |
| `press: "<key>"`                          | `page.keyboard.press(<key>)`                                   |
| `wait: <selector> visible` / `enabled`    | `<locator>.waitFor({ state: ... })`                            |
| `wait: <ms>`                              | `page.waitForTimeout(<ms>)` — use sparingly, prefer conditions |
| `wait_url: <regex>`                       | `page.waitForURL(<regex>)`                                     |
| `wait_network: <method> <path>`           | `page.waitForResponse(...)`                                    |
| `handle_popup: select "<value>"`          | pop-up context helper (Google OAuth etc.)                      |
| `signOut`                                 | run shared teardown — clear storage + navigate to /            |

## Default timing budgets

Applied unless a step overrides:

- **Element wait**: 5000ms for visible/enabled
- **Navigation wait**: 10000ms for `wait_url` / `goto`
- **Network wait**: 15000ms for `wait_network`
- **OTP wait**: 60000ms for human paste
- **Animation gates** (SuccessCelebration finish, sheet slide-in, etc.):
  3000ms specific holds — always call these out explicitly, don't rely
  on defaults.

Override syntax: `wait: <thing> timeout=<ms>`.

## Standing conventions (assumed on every scenario)

1. **Element implicit waits**: every `click` / `type` / `select` waits
   up to 5000ms for the target to be visible + enabled. No need to
   `wait` before every action — only call out non-obvious waits
   (async validation, third-party iframe load, animation gates).
2. **Cleanup**: teardown after each scenario clears localStorage and
   sessionStorage, then navigates to about:blank. If a scenario needs
   a specific prior state, declare it in `prereqs`.
3. **Screenshots on failure**: on any `fail_if` trigger, the runner
   automatically captures `results/<date>/<scenario>-failure.png` and
   the DOM snapshot as `<scenario>-failure.html`. No need to spec.
4. **Console errors**: any console `error` message during a scenario is
   captured. Scenarios can opt in to hard-fail via
   `console_error matches: <regex>` in `fail_if`.
5. **Env baseline**: unless declared otherwise, scenarios run against
   `tunnel` (HTTPS). Local-dev breaks OAuth + uploads + mic.
6. **Ambiguous selectors**: if two matches, the AI fails the scenario
   with "ambiguous selector" — spec must be tightened.
7. **Popups**: OAuth popup detection is automatic based on URL pattern
   (`accounts.google.com/*` etc.). `handle_popup` handles pick + close.

## Spec file format

```
# feature: <name>
routes: /path, /path/[id]
be endpoints:
  - <method> <path>
  - ...
env: tunnel | staging | local-dev   (default tunnel)

## global prereqs
- viewport: [mobile, tablet, desktop] | mobile-only | desktop-only
- signed_out | signed_in
- other fixture requirements

## scenario: <kebab-name>
description: <one line, optional>
prereqs:
  - <overrides or additions to global>
steps:
  - <action verb from vocabulary>
  - ...
assert:
  - <assertion from vocabulary>
  - ...
fail_if:
  - <condition — hard failure regardless of asserts>
  - ...

## known limits (do not file bugs)
- <bulleted list>

## last updated
<YYYY-MM-DD> — <one-line change note>
```

## Coverage matrix

Status: `stub` · `partial` · `full` · `stale` (>30 days since surface
last changed).

| Surface              | File                 | Status  | Last updated |
| -------------------- | -------------------- | ------- | ------------ |
| Auth                 | auth.md              | full    | 2026-09-09   |
| Onboarding           | onboarding.md        | full    | 2026-09-09   |
| Home                 | home.md              | full    | 2026-09-09   |
| Composers            | composers.md         | full    | 2026-09-09   |
| Lags                 | lags.md              | full    | 2026-09-09   |
| Moments              | moments.md           | full    | 2026-09-09   |
| Studio               | studio.md            | full    | 2026-09-09   |
| Friends & Family     | friends-and-family.md| full    | 2026-09-09   |
| Settings             | settings.md          | full    | 2026-09-09   |
| Share / SendToDrawer | share.md             | full    | 2026-09-09   |
| Notifications        | notifications.md     | full    | 2026-09-09   |
| Newsletter           | newsletter.md        | full    | 2026-09-09   |
| Landing              | landing.md           | full    | 2026-09-09   |
| Public share         | public-share.md      | full    | 2026-09-09   |
| Referral / Invite    | referral.md          | full    | 2026-09-09   |

Update this table whenever a spec file changes.

## Release checklist template

Copy into `results/<date>/release-check-<version>.md` and tick as you go.

```
# release check — <version> — <date>

## critical path (must pass)
- [ ] auth.md :: login-phone-existing-user
- [ ] auth.md :: login-google-existing-user
- [ ] auth.md :: sign-out-hard-reload
- [ ] onboarding.md :: full-new-user-flow-to-home
- [ ] composers.md :: publish-text-only-story
- [ ] composers.md :: publish-photo-story
- [ ] home.md :: hero-reminders-recent-stories-render
- [ ] share.md :: share-prompt-via-sendtodrawer

## regression sweep (should pass)
- [ ] lags.md :: all-three-tabs
- [ ] moments.md :: create-a-moment
- [ ] studio.md :: edit-profile
- [ ] settings.md :: every-panel-loads
- [ ] notifications.md :: bell-popover-and-list-page

## mobile smoke (iOS Safari over HTTPS tunnel)
- [ ] auth.md :: viewport-fit-safe-areas
- [ ] no auto-zoom on any input
- [ ] no white bands top/bottom of dark screens

## known regressions from prior release
- (link to any deferred failures)
```

## Animation gate reference

Timings the tester must wait on before asserting post-animation state:

- **SuccessCelebration**: 2800ms full sequence (rings + confetti + title
  + button fade-up). Assert final state after `wait: 3000`.
- **FlipCard flip**: ~500ms. Wait 600ms after `click` on flip trigger.
- **Bottom sheet slide-in**: 240ms. Wait 300ms.
- **Modal fade-in**: 200ms.
- **Country picker sheet on mobile**: h-[70svh] fixed — no size flap;
  wait 300ms for slide-in only.

## Adding a new spec

1. Create `docs/testing/<feature>.md` using the format above.
2. Add row to Coverage matrix.
3. On the same commit that adds new user-visible behavior, update the
   relevant spec file and bump `last updated`.
