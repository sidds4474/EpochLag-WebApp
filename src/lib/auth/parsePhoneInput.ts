import { parsePhoneNumberFromString } from "libphonenumber-js";

export type ParsedPhone = { countryCode: string; phone: string };

export function parsePhoneInput(raw: string): ParsedPhone | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("+")) return null;
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return null;
  return {
    countryCode: `+${parsed.countryCallingCode}`,
    phone: parsed.nationalNumber,
  };
}
