"use client";

import { useState } from "react";
import { updateMyProfile } from "../../../../../lib/profile/api";
import { useAuth } from "../../../../../lib/auth/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function EditNameModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      updateUser(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[420px] w-full p-[24px] flex flex-col gap-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
          Edit name
        </h3>
        <div className="flex flex-col gap-[10px]">
          <label className="font-montserrat text-[12px] text-primary-blue/70">
            First name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-[4px] w-full rounded-[10px] bg-[#F5F5F5] px-[14px] py-[12px] font-montserrat text-[14px] text-primary-blue outline-none focus:ring-2 focus:ring-[#EF9849]"
            />
          </label>
          <label className="font-montserrat text-[12px] text-primary-blue/70">
            Last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-[4px] w-full rounded-[10px] bg-[#F5F5F5] px-[14px] py-[12px] font-montserrat text-[14px] text-primary-blue outline-none focus:ring-2 focus:ring-[#EF9849]"
            />
          </label>
        </div>
        {error && (
          <p className="font-montserrat text-[12px] text-[#D95F3B]">{error}</p>
        )}
        <div className="mt-[4px] flex gap-[10px] justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer font-montserrat text-[14px] font-semibold text-primary-blue px-[18px] py-[10px] rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#EF9849] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
