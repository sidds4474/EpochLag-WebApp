"use client";

import { useState } from "react";
import { updatePhone } from "../../../../../lib/auth/api";
import { useAuth } from "../../../../../lib/auth/AuthProvider";

type Props = {
  initialCountryCode: string;
  initialPhone: string;
  onDone: () => void;
  onCancel: () => void;
};

const COUNTRY_CODES = [
  "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36",
  "+39", "+40", "+41", "+43", "+44", "+45", "+46", "+47", "+48", "+49",
  "+51", "+52", "+53", "+54", "+55", "+56", "+57", "+58", "+60", "+61",
  "+62", "+63", "+64", "+65", "+66", "+81", "+82", "+84", "+86", "+90",
  "+91", "+92", "+93", "+94", "+95", "+98", "+211", "+212", "+213", "+216",
  "+218", "+220", "+221", "+222", "+223", "+224", "+225", "+226", "+227", "+228",
  "+229", "+230", "+231", "+232", "+233", "+234", "+235", "+236", "+237", "+238",
  "+239", "+240", "+241", "+242", "+243", "+244", "+245", "+248", "+249", "+250",
  "+251", "+252", "+253", "+254", "+255", "+256", "+257", "+258", "+260", "+261",
  "+262", "+263", "+264", "+265", "+266", "+267", "+268", "+269", "+290", "+291",
  "+297", "+298", "+299", "+350", "+351", "+352", "+353", "+354", "+355", "+356",
  "+357", "+358", "+359", "+370", "+371", "+372", "+373", "+374", "+375", "+376",
  "+377", "+378", "+380", "+381", "+382", "+383", "+385", "+386", "+387", "+389",
  "+420", "+421", "+423", "+500", "+501", "+502", "+503", "+504", "+505", "+506",
  "+507", "+508", "+509", "+590", "+591", "+592", "+593", "+594", "+595", "+596",
  "+597", "+598", "+599", "+670", "+672", "+673", "+674", "+675", "+676", "+677",
  "+678", "+679", "+680", "+681", "+682", "+683", "+685", "+686", "+687", "+688",
  "+689", "+690", "+691", "+692", "+850", "+852", "+853", "+855", "+856", "+880",
  "+886", "+960", "+961", "+962", "+963", "+964", "+965", "+966", "+967", "+968",
  "+970", "+971", "+972", "+973", "+974", "+975", "+976", "+977", "+992", "+993",
  "+994", "+995", "+996", "+998",
];

export default function PhoneEditor({
  initialCountryCode,
  initialPhone,
  onDone,
  onCancel,
}: Props) {
  const { updateUser } = useAuth();
  const [countryCode, setCountryCode] = useState(initialCountryCode || "+1");
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setError("Enter a valid phone number.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePhone(countryCode, digits);
      updateUser(updated);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save phone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[8px]">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="cursor-pointer rounded-full bg-[#EDEDED] px-[14px] py-[10px] font-montserrat text-[13px] text-primary-blue outline-none appearance-none text-center"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 123 456 7890"
          className="flex-1 min-w-0 rounded-full bg-[#EDEDED] px-[16px] py-[10px] font-montserrat text-[13px] text-primary-blue outline-none focus:ring-2 focus:ring-[#EF9849]"
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="cursor-pointer shrink-0 font-montserrat text-[13px] font-semibold text-white bg-[#EF9849] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "..." : "Send code"}
        </button>
      </div>
      {error && (
        <p className="font-montserrat text-[12px] text-[#D95F3B]">{error}</p>
      )}
    </div>
  );
}
