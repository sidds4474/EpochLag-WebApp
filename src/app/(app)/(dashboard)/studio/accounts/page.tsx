"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { updatePhone } from "../../../../../lib/auth/api";
import { ChevronLeftIcon } from "../../icons";
import {
  AccountFillIcon,
  EditPencilIcon,
  MailFillIcon,
  PhoneFillIcon,
  PlusCircleIcon,
  TrashIcon,
} from "../../settings/icons";
import EditNameModal from "../../settings/account/EditNameModal";
import PhoneEditor from "../../settings/account/PhoneEditor";
import ResetPasswordModal from "../../settings/account/ResetPasswordModal";
import DeleteAccountModal from "../../settings/account/DeleteAccountModal";

// Studio-owned Account screen. Reuses the same modals, icons, and
// `updatePhone` hook the /settings/account route uses — so edits made
// here show up in Settings and vice versa. The chrome matches the
// other Studio hub pages (cream bg, white back circle, Lora title,
// sand card wrapping the rows).
export default function StudioAccountsPage() {
  const { user, updateUser } = useAuth();
  const [editName, setEditName] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removePhoneOpen, setRemovePhoneOpen] = useState(false);
  const [removingPhone, setRemovingPhone] = useState(false);
  const [removePhoneError, setRemovePhoneError] = useState<string | null>(null);

  if (!user) return null;

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const phone = user.phone?.trim();
  const countryCode = user.countryCode?.trim() || "+1";
  const hasPhone = Boolean(phone);

  async function handleClearPhone() {
    setRemovePhoneError(null);
    setRemovingPhone(true);
    try {
      const updated = await updatePhone(countryCode, "");
      updateUser(updated);
      setRemovePhoneOpen(false);
    } catch (e) {
      setRemovePhoneError(
        e instanceof Error ? e.message : "Could not remove phone."
      );
    } finally {
      setRemovingPhone(false);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[32px] pt-[16px] pb-[40px] max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0 overflow-y-auto scrollbar-hide">
        {/* Header: back + Account title */}
        <div className="flex items-center gap-[12px] mb-[16px] md:mb-[20px]">
          <Link
            href="/studio"
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
          <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
            Account
          </h1>
        </div>

        <div className="max-w-[560px] w-full mx-auto">
          {/* Rows card */}
          <div className="bg-[#E8E6DF] rounded-[14px] px-[18px] py-[6px] flex flex-col">
            <AccountRow
              icon={<AccountFillIcon width={20} height={20} />}
              label="Name"
              value={
                <span className="font-montserrat text-[#232323] text-[14px]">
                  {fullName || "—"}
                </span>
              }
              action={
                <button
                  type="button"
                  onClick={() => setEditName(true)}
                  aria-label="Edit name"
                  className="cursor-pointer w-[32px] h-[32px] rounded-full text-[#232323]/70 hover:text-[#232323] hover:bg-black/5 flex items-center justify-center transition-colors"
                >
                  <EditPencilIcon width={16} height={16} />
                </button>
              }
            />

            <AccountRow
              icon={<MailFillIcon width={20} height={20} />}
              label="Email"
              value={
                <span className="font-montserrat text-[#232323] text-[14px] break-all">
                  {user.email}
                </span>
              }
            />

            {editPhone ? (
              <div className="flex items-start gap-[14px] py-[14px] border-t border-black/10 first:border-t-0">
                <PhoneFillIcon
                  width={20}
                  height={20}
                  className="text-[#232323] mt-[2px] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-[8px]">
                    <p className="font-montserrat font-bold text-[#232323] text-[13px]">
                      Phone
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditPhone(false)}
                      aria-label="Cancel"
                      className="cursor-pointer w-[24px] h-[24px] rounded-full text-[#232323]/60 hover:text-[#232323] hover:bg-black/5 flex items-center justify-center transition-colors"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 2L10 10M10 2L2 10"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
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
              <AccountRow
                icon={<PhoneFillIcon width={20} height={20} />}
                label="Phone"
                value={
                  <span className="font-montserrat text-[#232323] text-[14px]">
                    {countryCode} {phone}
                  </span>
                }
                action={
                  <div className="flex items-center gap-[2px]">
                    <button
                      type="button"
                      onClick={() => setEditPhone(true)}
                      aria-label="Edit phone"
                      className="cursor-pointer w-[32px] h-[32px] rounded-full text-[#232323]/70 hover:text-[#232323] hover:bg-black/5 flex items-center justify-center transition-colors"
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
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditPhone(true)}
                className="cursor-pointer flex items-center gap-[14px] py-[14px] border-t border-black/10 first:border-t-0 text-left"
              >
                <PlusCircleIcon
                  width={20}
                  height={20}
                  className="text-[#232323] shrink-0"
                />
                <span className="font-montserrat font-bold text-[#232323] text-[14px]">
                  Add phone number
                </span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-[24px] md:mt-[28px] flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="cursor-pointer font-montserrat text-[14px] font-semibold text-[#232323] py-[12px] rounded-full border border-[#232323]/60 hover:bg-black/[0.03] transition-colors"
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
        </div>
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
            <h3 className="font-montserrat font-bold text-[#232323] text-[18px]">
              Remove phone number?
            </h3>
            <p className="font-montserrat text-[#232323]/70 text-[14px] leading-[150%]">
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
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-[#232323] px-[18px] py-[10px] rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
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

function AccountRow({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-[14px] py-[14px] border-t border-black/10 first:border-t-0">
      <span className="text-[#232323] mt-[2px] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-bold text-[#232323] text-[13px]">
          {label}
        </p>
        <div className="mt-[2px]">{value}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
