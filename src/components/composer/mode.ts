// Composer mode derivation + per-mode chrome config.
//
// StoryComposer handles six+ entry flows via props. Rather than scattering
// per-mode branches through its 3,000-line JSX, we collapse them into a
// single `ComposerMode` enum computed once from props, and surface mode-
// specific copy / toggles / layout hints via a config object. The shell
// reads from the config; mode branches in handlers (publish, back nav,
// hydration) key off the enum.

export type ComposerMode =
  | "create"           // default — fresh Lag from the "+" button
  | "daily"            // "Lag your day" from YourDays / Home tile
  | "promptAnswer"     // answering an inspo prompt
  | "threadAnswer"     // replying to an existing thread
  | "askQuestion"      // "Ask a question" — title-input layout, user-card publish
  | "editLag"          // editing a published story
  | "draftResume";     // resuming a server-side draft

export type DeriveModeInput = {
  albumId?: string | null;
  promptId?: string | null;
  draftId?: string | null;
  dailySource?: boolean;
  replyThreadId?: string | null;
  mode?: "new" | "edit";
  existingStoryId?: string | null;
  /** When the caller is the Ask-a-Question composer (AskComposer). */
  isAsk?: boolean;
};

export function deriveComposerMode(input: DeriveModeInput): ComposerMode {
  if (input.isAsk) return "askQuestion";
  if (input.mode === "edit" && input.existingStoryId) return "editLag";
  if (input.draftId) return "draftResume";
  if (input.replyThreadId) return "threadAnswer";
  if (input.dailySource) return "daily";
  if (input.promptId) return "promptAnswer";
  // albumId falls through to create — album is a scope, not a separate mode
  return "create";
}

export type ComposerPhase =
  | "empty"
  | "recording"
  | "paused"
  | "compose"
  | "preview";

/** Per-mode chrome settings read by the shell. Keep this pure data — no
 *  callbacks — so it can be memo'd by mode alone. */
export type ComposerChrome = {
  /** Hero caption shown in the empty phase, under the ring (mobile) or
   *  under the title input (desktop). */
  heroCaption: string;
  /** Whether the Lag / Prompt toggle at the top of the screen is shown.
   *  Only Create mode allows switching into a question. */
  showModeToggle: boolean;
  /** Whether the right-rail cover picker is shown. Reply inherits the
   *  thread's cover; edit uses existing; ask uses user-card cover flow. */
  showCoverPicker: boolean;
  /** Whether the "Allow others to share" toggle appears in the right rail. */
  showShareToggle: boolean;
  /** Whether the "Secure and Private" info box appears in the right rail. */
  showSecureBox: boolean;
  /** Initial phase on mount. Edit/Draft land directly in compose. */
  initialPhase: ComposerPhase;
  /** Dashboard escape link shown below the pill row (Daily only). */
  showDailyEscape: boolean;
  /** Prompt text banner above the ring (PromptAnswer / ThreadAnswer). */
  showPromptBanner: boolean;
  /** Primary CTA label in the header. */
  primaryCtaLabel: string;
  /** Preview overlay CTA label when the user taps Share from preview. */
  previewShareLabel: string;
  /** Header title text. */
  headerTitle: string;
  /** Large question shown ABOVE the ring in the empty phase (Daily
   *  uses "How was your day?"). Falsy for modes that don't need it. */
  heroQuestion?: string;
  /** Sub-caption rendered under `heroQuestion` (same gated placement). */
  heroSubCaption?: string;
  /** Whether the bottom pill row (video/image/text/music) is shown.
   *  Voice-only modes (Inspiration prompt) hide it. */
  showPillRow: boolean;
  /** Whether the right-rail metadata chips (Location, Date, People)
   *  are shown. Minimal modes (Inspiration prompt) only show Cover +
   *  Share + Secure. */
  showMetaChips: boolean;
};

export function getComposerChrome(mode: ComposerMode): ComposerChrome {
  switch (mode) {
    case "daily":
      return {
        // Daily lifts a question + subtitle ABOVE the ring; the below-
        // ring caption stays generic.
        heroCaption: "Click to start recording your Lag",
        heroQuestion: "How was your day?",
        heroSubCaption:
          "Daily journaling helps you reflect, grow, and preserve memories.",
        // Figma shows the Lag/Prompt toggle in daily mode — keep it
        // visible so the user can still bail to Prompt without going
        // back to Home.
        showModeToggle: true,
        showCoverPicker: true,
        showShareToggle: true,
        showSecureBox: true,
        initialPhase: "empty",
        showDailyEscape: true,
        showPromptBanner: false,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Create Lag",
        previewShareLabel: "Create Lag",
        headerTitle: "My Day",
      };
    case "promptAnswer":
      // Inspiration-sourced Lag flow — user answers the prompt with
      // a Lag (full composer tools), so pill row + metadata chips stay
      // on. Only the surface chrome swaps per the Inspiration Figma:
      // header reads "Inspiration", caption swaps to "Click to start
      // recording your Lag", and the prompt renders as plain centered
      // prose above the ring (no card).
      return {
        heroCaption: "Click to start recording your Lag",
        showModeToggle: false,
        showCoverPicker: true,
        showShareToggle: true,
        showSecureBox: true,
        initialPhase: "empty",
        showDailyEscape: false,
        showPromptBanner: true,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Create Story",
        previewShareLabel: "Share Lag",
        headerTitle: "Inspiration",
      };
    case "threadAnswer":
      return {
        heroCaption: "Add to the thread",
        showModeToggle: false,
        showCoverPicker: false,
        showShareToggle: false,
        showSecureBox: false,
        initialPhase: "empty",
        showDailyEscape: false,
        showPromptBanner: true,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Add to thread",
        previewShareLabel: "Add to thread",
        headerTitle: "Add your Lag",
      };
    case "askQuestion":
      return {
        heroCaption: "Type your question…",
        showModeToggle: false,
        showCoverPicker: true,
        showShareToggle: false,
        showSecureBox: false,
        initialPhase: "compose",
        showDailyEscape: false,
        showPromptBanner: false,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Send",
        previewShareLabel: "Send Question",
        headerTitle: "Ask a Question",
      };
    case "editLag":
      return {
        heroCaption: "",
        showModeToggle: false,
        showCoverPicker: true,
        showShareToggle: true,
        showSecureBox: true,
        initialPhase: "compose",
        showDailyEscape: false,
        showPromptBanner: false,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Save changes",
        previewShareLabel: "Save changes",
        headerTitle: "Edit Lag",
      };
    case "draftResume":
      return {
        heroCaption: "",
        showModeToggle: false,
        showCoverPicker: true,
        showShareToggle: true,
        showSecureBox: true,
        initialPhase: "compose",
        showDailyEscape: false,
        showPromptBanner: false,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Create Story",
        previewShareLabel: "Share Lag",
        headerTitle: "Resume draft",
      };
    case "create":
    default:
      return {
        heroCaption: "Click to start recording your Lag",
        showModeToggle: true,
        showCoverPicker: true,
        showShareToggle: true,
        showSecureBox: true,
        initialPhase: "empty",
        showDailyEscape: false,
        showPromptBanner: false,
        showPillRow: true,
        showMetaChips: true,
        primaryCtaLabel: "Create Story",
        previewShareLabel: "Share Lag",
        headerTitle: "Create",
      };
  }
}
