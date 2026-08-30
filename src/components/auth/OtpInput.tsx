"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

export type OtpInputProps = {
  length: number;
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function OtpInput({
  length,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setCharAt = (idx: number, ch: string) => {
    const chars = value.split("");
    while (chars.length < length) chars.push("");
    chars[idx] = ch;
    const next = chars.slice(0, length).join("");
    onChange(next);
    if (next.length === length && next.replace(/\s/g, "").length === length) {
      onComplete?.(next);
    }
  };

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setCharAt(idx, "");
      return;
    }
    setCharAt(idx, digit);
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1)
      refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.slice(0, length).padEnd(length, "").slice(0, length);
    onChange(next);
    const lastFilledIdx = Math.min(pasted.length, length) - 1;
    refs.current[Math.max(0, lastFilledIdx)]?.focus();
    if (pasted.length >= length) onComplete?.(next);
  };

  return (
    <div className="flex items-center justify-center gap-[10px]">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-[56px] w-[48px] bg-primary-white rounded-[16px] text-center font-montserrat font-semibold text-[20px] text-primary-blue outline-none focus:ring-2 focus:ring-primary-blue/30 shadow-[0_4px_14px_rgba(9,46,74,0.05)] disabled:opacity-50"
        />
      ))}
    </div>
  );
}
