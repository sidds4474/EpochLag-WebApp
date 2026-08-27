"use client";

import { useState } from "react";
import { requestPasswordReset } from "../../../../../lib/auth/api";
import { useAuth } from "../../../../../lib/auth/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ResetPasswordModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSend() {
    if (!user?.email) return;
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(user.email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[420px] w-full p-[24px] flex flex-col gap-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
          Reset password
        </h3>
        {sent ? (
          <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
            We&apos;ve sent a reset link to <strong>{user?.email}</strong>. Follow
            the instructions in the email to set a new password.
          </p>
        ) : (
          <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
            We&apos;ll send a password reset link to{" "}
            <strong>{user?.email}</strong>.
          </p>
        )}
        {error && (
          <p className="font-montserrat text-[12px] text-[#D95F3B]">{error}</p>
        )}
        <div className="mt-[8px] flex gap-[10px] justify-end">
          {sent ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#EF9849] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-primary-blue px-[18px] py-[10px] rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#EF9849] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send link"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
