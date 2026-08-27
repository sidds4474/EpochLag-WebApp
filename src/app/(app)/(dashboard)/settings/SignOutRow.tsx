"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { SignOutIcon } from "./icons";

export default function SignOutRow() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    signOut();
    router.replace("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="cursor-pointer w-full flex items-center gap-[12px] px-[12px] py-[10px] rounded-[10px] text-[#E90606] hover:bg-[#E90606]/5 transition-colors"
      >
        <SignOutIcon width={20} height={20} />
        <span className="font-montserrat font-medium text-[14px]">Sign out</span>
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-[400px] w-full p-[24px] flex flex-col gap-[12px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
              Sign out
            </h3>
            <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
              Are you sure you want to sign out?
            </p>
            <div className="mt-[8px] flex gap-[10px] justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-primary-blue px-[18px] py-[10px] rounded-full hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#D95F3B] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
