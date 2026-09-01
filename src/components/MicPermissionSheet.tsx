"use client";

// Shared micrphone-blocked sheet. iOS Safari won't re-prompt once a user
// taps Deny — the only escape hatch is Settings → Safari → Camera &
// Microphone. On desktop it's the site-info icon in the URL bar. We show
// both paths so the user isn't left staring at a bland toast.

export type MicErrorKind =
  | "denied"
  | "no-device"
  | "insecure"
  | "unsupported"
  | "other";

export function classifyMicError(err: unknown): MicErrorKind {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "insecure";
  }
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return "unsupported";
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "denied";
    }
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      return "no-device";
    }
  }
  return "other";
}

type Copy = {
  title: string;
  body: string;
  showInstructions: boolean;
  showRetry: boolean;
};

function copyFor(kind: MicErrorKind): Copy {
  switch (kind) {
    case "denied":
      return {
        title: "Microphone access is off",
        body: "Turn it on to record voice notes.",
        showInstructions: true,
        showRetry: true,
      };
    case "no-device":
      return {
        title: "No microphone found",
        body: "Connect a microphone and try again.",
        showInstructions: false,
        showRetry: true,
      };
    case "insecure":
      return {
        title: "Voice needs a secure connection",
        body: "Voice recording only works on the live site (https://epochlag.com).",
        showInstructions: false,
        showRetry: false,
      };
    case "unsupported":
      return {
        title: "Voice isn't supported here",
        body: "Try the latest version of Safari or Chrome.",
        showInstructions: false,
        showRetry: false,
      };
    case "other":
    default:
      return {
        title: "Couldn't start the microphone",
        body: "Something went wrong. Please try again.",
        showInstructions: false,
        showRetry: true,
      };
  }
}

export default function MicPermissionSheet({
  open,
  kind,
  onClose,
  onRetry,
}: {
  open: boolean;
  kind: MicErrorKind;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (!open) return null;
  const copy = copyFor(kind);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-[420px] bg-white rounded-t-[20px] md:rounded-[20px] p-[24px] pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col gap-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
          {copy.title}
        </h3>
        <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
          {copy.body}
        </p>
        {copy.showInstructions && (
          <div className="mt-[4px] bg-warm-cream rounded-[12px] p-[14px] flex flex-col gap-[10px]">
            <div>
              <p className="font-montserrat font-semibold text-primary-blue text-[13px]">
                On iPhone
              </p>
              <p className="mt-[2px] font-montserrat text-primary-blue/75 text-[13px] leading-[150%]">
                Settings → Safari → Camera & Microphone → set Microphone to
                Allow or Ask.
              </p>
            </div>
            <div>
              <p className="font-montserrat font-semibold text-primary-blue text-[13px]">
                On desktop
              </p>
              <p className="mt-[2px] font-montserrat text-primary-blue/75 text-[13px] leading-[150%]">
                Click the site-info icon in the address bar → Microphone →
                Allow.
              </p>
            </div>
          </div>
        )}
        <div className="mt-[8px] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer font-montserrat font-medium text-[14px] text-primary-blue/70 px-[16px] py-[10px] rounded-full hover:bg-black/[0.04] transition-colors"
          >
            Not now
          </button>
          {copy.showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer font-montserrat font-semibold text-[14px] text-white bg-primary-orange px-[20px] py-[10px] rounded-full hover:brightness-95 transition-[filter]"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
