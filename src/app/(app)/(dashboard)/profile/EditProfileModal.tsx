"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import {
  updateMyProfile,
  type ProfileUpdateFields,
} from "../../../../lib/profile/api";
import type { User } from "../../../../types/user";
import { CloseIcon } from "../icons";

type Props = {
  user: User;
  onClose: () => void;
  onSuccess: (next: User) => void;
};

export default function EditProfileModal({ user, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [state, setState] = useState(user.state ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    toDateInputValue(user.dateOfBirth)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, saving]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    const fields: ProfileUpdateFields = {};
    if (firstName.trim() !== (user.firstName ?? "")) fields.firstName = firstName.trim();
    if (lastName.trim() !== (user.lastName ?? "")) fields.lastName = lastName.trim();
    if (bio.trim() !== (user.bio ?? "")) fields.bio = bio.trim();
    if (city.trim() !== (user.city ?? "")) fields.city = city.trim();
    if (state.trim() !== (user.state ?? "")) fields.state = state.trim();
    if (country.trim() !== (user.country ?? "")) fields.country = country.trim();
    const dobIso = dateOfBirth ? new Date(dateOfBirth).toISOString() : "";
    if (dobIso !== (user.dateOfBirth ?? "")) fields.dateOfBirth = dobIso;

    if (Object.keys(fields).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const next = await updateMyProfile(fields);
      onSuccess(next);
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Couldn't save changes";
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[560px] bg-white rounded-t-[24px] md:rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between px-[24px] pt-[20px] pb-[16px] border-b border-black/[0.06]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[18px]">
            Edit profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center text-primary-blue hover:bg-black/[0.04] transition-colors disabled:opacity-50"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[16px]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
            <Field label="First name">
              <TextInput
                value={firstName}
                onChange={setFirstName}
                autoFocus
                required
              />
            </Field>
            <Field label="Last name">
              <TextInput value={lastName} onChange={setLastName} />
            </Field>
          </div>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Tell people a little about yourself"
              className="w-full bg-[#f7f7f7] rounded-[14px] px-[14px] py-[12px] font-montserrat text-primary-blue text-[14px] leading-[20px] placeholder:text-primary-blue/40 focus:outline-none focus:ring-2 focus:ring-primary-blue/15 resize-none"
            />
            <div className="mt-[4px] text-right font-montserrat text-primary-blue/40 text-[11px]">
              {bio.length}/280
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
            <Field label="City">
              <TextInput value={city} onChange={setCity} />
            </Field>
            <Field label="State">
              <TextInput value={state} onChange={setState} />
            </Field>
            <Field label="Country">
              <TextInput value={country} onChange={setCountry} />
            </Field>
          </div>

          <Field label="Date of birth">
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="dob-input w-full bg-[#f7f7f7] rounded-full px-[16px] py-[12px] font-montserrat text-primary-blue text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
            />
          </Field>

          <footer className="flex items-center justify-end gap-[10px] pt-[8px]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer font-montserrat font-semibold text-primary-blue/70 text-[14px] px-[18px] py-[10px] rounded-full hover:bg-black/[0.04] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer inline-flex items-center gap-[8px] bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full px-[22px] py-[10px] hover:brightness-105 transition disabled:opacity-60"
            >
              {saving && (
                <span className="w-[14px] h-[14px] border-[2px] border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-montserrat font-semibold text-primary-blue/70 text-[12px] uppercase tracking-[0.04em] mb-[6px]">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  autoFocus,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      required={required}
      className="w-full bg-[#f7f7f7] rounded-full px-[16px] py-[12px] font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40 focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
    />
  );
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
