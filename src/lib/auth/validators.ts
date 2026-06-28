const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_RE = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/;
const PHONE_RE = /^\d{10,15}$/;

export function validateEmail(value: string): string | null {
  if (!value.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "Enter a valid email.";
  return null;
}

export function validateFirstName(value: string): string | null {
  if (!value.trim()) return "You must enter a valid first name";
  return null;
}

export function validateLastName(value: string): string | null {
  if (!value.trim()) return "You must enter a valid last name";
  return null;
}

export function validatePassword(value: string): string | null {
  if (
    value.length < 8 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !PASSWORD_SPECIAL_RE.test(value)
  ) {
    return "Your password must include at least 8 characters, upper and lower case letters and at least one special character.";
  }
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (!PHONE_RE.test(digits)) return "Enter a valid phone number.";
  return null;
}
