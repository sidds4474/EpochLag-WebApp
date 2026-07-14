# Epoch Lag — Web App

The Epoch Lag web experience: a story-sharing app for preserving and
sharing family memories. This repository hosts both the marketing site
and the authenticated dashboard, deployed as a single Next.js app.

- Marketing / public: [epochlag.com](https://epochlag.com)
- Production auth: served alongside marketing (Amplify)
- Previews: Vercel personal deployments

## Stack

- **Next.js 15** (App Router, RSC where safe, otherwise client components)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4**
- **Google OAuth** (rendered button flow) + **Apple Sign-in** (Services ID pending)
- **Google Maps Places API (New)** via `@vis.gl/react-google-maps` for the Location chip
- **iTunes Search API** for the Music chip
- **Cloudinary** for media uploads (2-hop signed upload)

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in the values (see below)
npm run dev            # localhost:3000
npm run build          # production build
```

### Environment variables

`.env.local` (not committed):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_UPSTREAM` | Backend origin (defaults to `https://dev.epochlag.com`). Proxied via `/api/*` rewrite in `next.config.mjs`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Enables the Location chip's autocomplete. **Must be enabled on Vercel + Amplify env** — `NEXT_PUBLIC_` vars are inlined at build time. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID. |

Google Cloud Console requirements: **Places API (New)** + **Maps JavaScript
API** enabled, HTTP referrer restrictions listing localhost + your Vercel
`*.vercel.app` + `epochlag.com`.

## Structure

```
src/
  app/
    (marketing)/            # public / logged-out surfaces (landing, story links)
    (auth)/                 # sign-in flow
    (app)/(dashboard)/
      layout.tsx            # sidebar + header chrome + Google Maps APIProvider
      home/                 # For You + Inspiration rails
      interactions/         # received/sent cards + inline reply editor
      new-story/            # Tell / Ask / Inspire composer flows
      reply/[promptId]/     # full-screen reply composer (?thread=... appends)
      edit/[storyId]/       # hydrated composer for existing stories
      thread/[threadId]/    # standalone story viewer route
      profile/              # profile view + edit modal
      welcome/[id]/         # onboarding empty-state cards
      bookmarks/, drafts/, library/, notifications/, search/
  components/
    ConfirmationModal/      # destructive-confirm dialog
    OptionsMenu/            # click-outside-close popover
    CommentsModal/          # story comments sheet
    ...
  lib/
    api/client.ts           # fetch wrapper — auth, form-encoded + JSON + multipart
    auth/                   # AuthProvider (session, sign-in)
    create/                 # createUserCard, createStory, updateStory,
                            #   publishStory, uploadToCloudinaryWithProgress,
                            #   shareStory, shareUserCard, deleteStory, preview builder
    home/                   # inspiration + received + user-card fetch
    comments/               # list/post/edit/delete/toggle-like
    interactions/           # thread fetch, story like
    profile/                # profile read + update
    audioSingleton.ts       # cross-component playback claim/release
    images.ts               # bustUrl + compressImage helpers
    formatters.ts           # relative time, header dates, etc.
    parseStoryContent.ts    # <text>/<image>/<audio>/<video> tag parser
  views/
    Thread/                 # ThreadViewer (menu, pager, swipe), MusicPill,
                            #   PreviewOverlay
    StoryPage/              # public story render + Marketing story surfaces
  types/                    # home, user, story, google-maps, moment
```

## Feature areas

### Auth
Google button (rendered flow, not `prompt()`), Apple placeholder. Sessions
stored client-side; API calls forward `Authorization: Bearer <token>` via
`lib/api/client.ts`.

### Home
- **For You** rail — user cards + welcome empty-state cards. Cards without
  a `storyThread` deep-link into `/reply/[promptId]` (i.e. "compose a
  response to this prompt").
- **Inspiration** rail — deep-links into `/reply/[promptId]`. Share button
  opens `ShareModal` in prompt mode.

### Interactions
Master-detail. Left column: received / sent tabs with paginated card lists.
Right panel: `ThreadViewer` when a story-attached card is tapped, or
`ReplyEditor` when a card without a thread is opened. `?promptId=xxx` deep
link jumps straight into the reply editor.

### Composers
Three entry points, shared building blocks:

- **`/new-story`** — Tell a Story / Ask a Question / Find Inspiration mode
  picker. Handles cover upload, prompt-card creation, and the story
  publish chain.
- **`/reply/[promptId]`** — full-screen composer wired for either fresh
  replies or `?thread=xxx` appends to an existing thread.
- **`/edit/[storyId]?thread=xxx`** — hydrates the composer from a saved
  story and saves via `PUT /api/stories/:id`.

All composers share `new-story/{shared, AudioRecorder, pickers, ShareModal,
StoryCreated}` for media chips, audio recording, location/music/date
pickers, and the success overlay.

**Publish chain**:
1. `POST /api/user-card` (only when creating a fresh prompt; append flows skip this)
2. `POST /api/stories` with `promptId` + optional `threadId`
3. `POST /api/stories/:id/getUploadToken` → direct XHR to Cloudinary
4. `PUT /api/stories/:id` (title, content, media, location, music)
5. `PUT /api/stories/:id/publish`
6. Optional `PUT /api/stories/thread/:id/privacy` when "Allow sharing" is on

**Live preview**: the Eye button in each composer builds a synthetic
`ThreadResponse` from local state (via `lib/create/preview.ts`) and renders
it through the real `ThreadViewer` in a full-screen overlay
(`PreviewOverlay`) — no BE side effects.

### Story viewer (`ThreadViewer`)
- Multi-story pager: prev/next chevrons, progress bars, horizontal swipe
  gestures, active bar fill for all `i ≤ activeIndex`
- **Add Story** chip → `/reply/${promptId}?thread=${threadId}` (BE appends
  the new story to the same thread)
- **3-dot menu**: Edit (isSent) / Share (isSent || !isPrivate) / Delete
  (isSent) / Delete for Me (isReceived)
- **Delete-slide** flow: single-story or recipient-removes-self → navigate
  back; multi-story author delete → hand off to parent for local removal
  + reindex
- **Music pill**: `MusicPill` component in the header row, autoplays once
  per `previewUrl`, respects user-pause, uses `audioSingleton` so only one
  player runs at a time, loops the 30s clip, marquee text scrolls when it
  overflows
- **Comments**: footer chat icon opens `CommentsModal`; counter self-heals
  from `pagination.totalItems` and hides when 0
- **Preview mode**: `preview` prop hides Add Story + 3-dot menu and no-ops
  writes

### Share modal
Mirrors the mobile mobile-first spec. Sections top-to-bottom:
drag handle + "Send to" title, search, "Currently on this share",
horizontal friend rail (checkmark on selected), horizontal group rail
(GroupAvatarStack, new-story dot, member count), optional note (with
re-send guard when the prompt already has a note), Send + Send Separately
+ external Web-Share fallback. State machine: idle → sending → sent
(auto-closes after 1.4s).

Two backends:
- `POST /api/stories/:id/share` with `{ userIds, groupIds, sendSeparately }`
- `POST /api/user-card/:id/share` with `{ shareWith, groupIds, sendSeparately, note }`

### Comments modal
Center-anchored sheet, paginated infinite scroll via `IntersectionObserver`,
form-URL-encoded PUT/POST bodies (BE quirk). Optimistic like (synthetic
`{_id, firstName, user}` entry with current user id in both slots so
"Liked by you and X" recomputes without a refetch), optimistic delete (no
confirmation — matches mobile), inline edit UI, always-visible ⋯ menu on
own comments.

## Deployment

- **Vercel** (personal) — every push previews. Env vars set per project.
- **Amplify** — production at `epochlag.com`. Env vars set in the app's
  Environment variables tab. Rebuilds required after env changes.

`NEXT_PUBLIC_*` vars are inlined at build time — both platforms need them
before their next deploy for the value to reach the browser bundle.

## Conventions

- **Commits**: short imperative subject line, no attribution footers.
  Group related changes but split by feature area — see `git log --oneline`
  for the pattern.
- **Tailwind arbitrary values** are used liberally (`px-[14px]`, `bg-[#ededed]`)
  to match design specs exactly rather than approximate with default scale.
- **Client components** are marked with `"use client"`. Server components
  are used only where they're a clear win (marketing SEO surfaces).
- **API responses**: BE wraps most in `{ success, message, data }`; the
  `api` client returns the outer envelope and callers pluck `data`.
- **File uploads**: never send files on `POST /api/stories` — that endpoint
  is text-only. Covers live on the user-card; media goes through the
  `getUploadToken` → Cloudinary chain.

## Deferred / known gaps

- Public link toggle (mint/revoke via `POST/DELETE /api/stories/thread/:id/public-link`)
- Story export (PDF + media save + external share tiles)
- Add to Album feature + modal
- Report flow (Report menu item hidden until the report screen exists)
- Subscription / paywall gate (all "free-user gate" hooks skipped)
- Music pause hook from Edit / Add More flows (no global player yet)
- Invite to Epoch Lag screen (`ShareModal` empty state is a toast stub)
