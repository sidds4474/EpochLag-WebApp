"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { updatePhone } from "../../../../../lib/auth/api";
import { ChevronLeftIcon } from "../../icons";
import {
  AccountFillIcon,
  CopyIcon,
  EditPencilIcon,
  EpochIdIcon,
  MailFillIcon,
  PhoneFillIcon,
  PlusCircleIcon,
  TrashIcon,
} from "../icons";
import EditNameModal from "./EditNameModal";
import PhoneEditor from "./PhoneEditor";
import ResetPasswordModal from "./ResetPasswordModal";
import DeleteAccountModal from "./DeleteAccountModal";

export default function AccountPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [editName, setEditName] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removePhoneOpen, setRemovePhoneOpen] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);
  const [removePhoneError, setRemovePhoneError] = useState<string | null>(null);

  if (!user) return null;

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const phone = user.phone?.trim();
  const countryCode = user.countryCode?.trim() || "+1";
  const hasPhone = Boolean(phone);
  const epochId = user.epochlagID ?? "";

  async function handleClearPhone() {
    setRemovePhoneError(null);
    setRemovingPhone(true);
    try {
      const updated = await updatePhone(countryCode, "");
      updateUser(updated);
      setRemovePhoneOpen(false);
    } catch (e) {
      setRemovePhoneError(e instanceof Error ? e.message : "Could not remove phone.");
    } finally {
      setRemovingPhone(false);
    }
  }

  function handleCopyId() {
    if (!epochId) return;
    navigator.clipboard?.writeText(epochId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col">
      {/* Mobile-only back header */}
      <div className="md:hidden flex items-center gap-[12px] mb-[16px]">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
        <h1 className="font-ivy font-bold text-primary-blue text-[24px] leading-tight">
          Account
        </h1>
      </div>

      {/* Mobile-only avatar + name hero */}
      <div className="md:hidden flex flex-col items-center gap-[10px] pb-[24px] bg-[#F5F5F5] rounded-t-[20px] pt-[24px]">
        <div className="w-[92px] h-[92px] rounded-full bg-[#EDEDED] overflow-hidden">
          {user.profilePicture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profilePicture}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <p className="font-montserrat font-bold text-primary-blue text-[18px]">
          {fullName || "—"}
        </p>
      </div>

      {/* Card wrapper: white card on mobile, plain rows on desktop */}
      <div className="md:bg-transparent bg-white md:rounded-none rounded-b-[20px] md:p-0 p-[20px] md:border-0 border-t border-black/5 flex flex-col gap-[24px] md:gap-[28px] md:pt-[8px] md:max-w-[380px]">
        {/* Mobile: EL ID row (desktop hides this) */}
        {epochId && (
          <div className="md:hidden flex items-start gap-[14px]">
            <EpochIdIcon width={22} height={22} className="text-primary-blue mt-[2px]" />
            <div className="flex-1">
              <p className="font-montserrat font-bold text-primary-blue text-[14px]">
                EL ID
              </p>
              <div className="flex items-center gap-[8px] mt-[2px]">
                <p className="font-montserrat text-primary-blue text-[14px]">
                  {epochId}
                </p>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy EL ID"
                  className="cursor-pointer text-primary-blue/70 hover:text-primary-blue transition-colors"
                >
                  <CopyIcon width={14} height={14} />
                </button>
                {copied && (
                  <span className="font-montserrat text-[11px] text-[#EF9849]">
                    Copied
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Name row (desktop only — mobile shows name in hero) */}
        <div className="hidden md:flex items-start gap-[14px]">
          <AccountFillIcon width={22} height={22} className="text-primary-blue mt-[2px]" />
          <div>
            <p className="font-montserrat font-bold text-primary-blue text-[14px]">
              Name
            </p>
            <p className="font-montserrat text-primary-blue text-[14px] mt-[2px]">
              {fullName || "—"}
            </p>
          </div>
          <div className="flex items-center gap-[4px] ml-auto self-center">
            <button
              type="button"
              onClick={() => setEditName(true)}
              aria-label="Edit name"
              className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue/70 hover:text-primary-blue hover:bg-black/5 flex items-center justify-center transition-colors"
            >
              <EditPencilIcon width={16} height={16} />
            </button>
          </div>
        </div>

        {/* Email row */}
        <div className="flex items-start gap-[14px]">
          <MailFillIcon width={22} height={22} className="text-primary-blue mt-[2px]" />
          <div className="min-w-0">
            <p className="font-montserrat font-bold text-primary-blue text-[14px]">
              <span className="md:hidden">Email Address</span>
              <span className="hidden md:inline">Email</span>
            </p>
            <p className="font-montserrat text-primary-blue text-[14px] mt-[2px] break-all">
              {user.email}
            </p>
          </div>
        </div>

        {/* Phone row */}
        {editPhone ? (
          <div className="flex items-start gap-[14px]">
            <PhoneFillIcon width={22} height={22} className="text-primary-blue mt-[2px]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-[8px]">
                <p className="font-montserrat font-bold text-primary-blue text-[14px]">
                  Phone
                </p>
                <button
                  type="button"
                  onClick={() => setEditPhone(false)}
                  aria-label="Cancel"
                  className="cursor-pointer w-[24px] h-[24px] rounded-full text-primary-blue/60 hover:text-primary-blue hover:bg-black/5 flex items-center justify-center transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <PhoneEditor
                initialCountryCode={countryCode}
                initialPhone={phone ?? ""}
                onDone={() => setEditPhone(false)}
                onCancel={() => setEditPhone(false)}
              />
            </div>
          </div>
        ) : hasPhone ? (
          <div className="flex items-start gap-[14px]">
            <PhoneFillIcon width={22} height={22} className="text-primary-blue mt-[2px]" />
            <div>
              <p className="font-montserrat font-bold text-primary-blue text-[14px]">
                <span className="md:hidden">Phone Number</span>
                <span className="hidden md:inline">Phone</span>
              </p>
              <p className="font-montserrat text-primary-blue text-[14px] mt-[2px]">
                {countryCode} {phone}
              </p>
            </div>
            <div className="flex items-center gap-[4px] ml-auto self-center">
              <button
                type="button"
                onClick={() => setEditPhone(true)}
                aria-label="Edit phone"
                className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue/70 hover:text-primary-blue hover:bg-black/5 flex items-center justify-center transition-colors"
              >
                <EditPencilIcon width={16} height={16} />
              </button>
              <button
                type="button"
                onClick={() => setRemovePhoneOpen(true)}
                aria-label="Remove phone"
                className="cursor-pointer w-[32px] h-[32px] rounded-full text-[#D95F3B] hover:bg-[#D95F3B]/10 flex items-center justify-center transition-colors"
              >
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditPhone(true)}
            className="cursor-pointer flex items-center gap-[14px] text-left"
          >
            <PlusCircleIcon width={22} height={22} className="text-primary-blue" />
            <span className="font-montserrat font-bold text-primary-blue text-[14px]">
              Add phone number
            </span>
          </button>
        )}

        {/* Divider + password row (mobile only) */}
        <div className="md:hidden pt-[16px] border-t border-black/10 flex items-center justify-between">
          <div>
            <p className="font-montserrat font-bold text-primary-blue text-[14px]">
              Password
            </p>
            <p className="font-montserrat text-primary-blue text-[14px] mt-[2px]">
              *************
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="cursor-pointer font-montserrat text-[14px] font-semibold text-[#EF9849] hover:opacity-80 transition-opacity"
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Action buttons — desktop shows both, mobile shows only Delete */}
      <div className="mt-[24px] md:mt-[32px] flex flex-col gap-[12px] md:max-w-[380px]">
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="hidden md:block cursor-pointer font-montserrat text-[14px] font-semibold text-primary-blue py-[12px] rounded-full border border-primary-blue hover:bg-primary-blue/5 transition-colors"
        >
          Reset password
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#D95F3B] py-[12px] rounded-full hover:opacity-90 transition-opacity"
        >
          Delete account
        </button>
      </div>

      <EditNameModal open={editName} onClose={() => setEditName(false)} />
      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />

      {removePhoneOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
          onClick={() => !removingPhone && setRemovePhoneOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-[420px] w-full p-[24px] flex flex-col gap-[12px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
              Remove phone number?
            </h3>
            <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
              Your phone number will be removed from your account. You can add
              it back anytime.
            </p>
            {removePhoneError && (
              <p className="font-montserrat text-[12px] text-[#D95F3B]">
                {removePhoneError}
              </p>
            )}
            <div className="mt-[8px] flex gap-[10px] justify-end">
              <button
                type="button"
                onClick={() => setRemovePhoneOpen(false)}
                disabled={removingPhone}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-primary-blue px-[18px] py-[10px] rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearPhone}
                disabled={removingPhone}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#D95F3B] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {removingPhone ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
