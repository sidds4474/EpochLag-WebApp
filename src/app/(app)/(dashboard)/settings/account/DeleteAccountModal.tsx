"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccount } from "../../../../../lib/profile/api";
import { useAuth } from "../../../../../lib/auth/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function DeleteAccountModal({ open, onClose }: Props) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await deleteMyAccount();
      signOut();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
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
          Delete account?
        </h3>
        <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
          This will permanently delete your account and all of your stories,
          albums, and memories. This action cannot be undone.
        </p>
        {error && (
          <p className="font-montserrat text-[12px] text-[#D95F3B]">{error}</p>
        )}
        <div className="mt-[8px] flex gap-[10px] justify-end">
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
            onClick={handleDelete}
            disabled={loading}
            className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#D95F3B] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
