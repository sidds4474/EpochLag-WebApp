import { api, ApiError } from "../api/client";
import type { User } from "../../types/user";

const WEB_PLATFORM_ID = 3;

type LoginEnvelope = {
  success: boolean;
  token: string;
  data: User;
  message?: string;
  newRegistration?: boolean;
};

type ProfileEnvelope = {
  success: boolean;
  data: User;
  message?: string;
};

type RegisterEnvelope = {
  success: boolean;
  message?: string;
};

type GoogleSignInPayload = {
  idToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type AppleSignInPayload = {
  identityToken: string;
  authorizationCode?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
  countryCode?: string;
  phone?: string;
  phoneVerifyToken?: string;
  dateOfBirth?: string;
  anonId?: string;
};

export type SocialAuthResult = {
  token: string;
  user: User;
  newRegistration: boolean;
};

type GenericEnvelope = {
  success: boolean;
  message?: string;
};

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await api.post<LoginEnvelope>(
    "/api/auth/login",
    { email: email.trim().toLowerCase(), password, platformId: WEB_PLATFORM_ID },
    { auth: false }
  );
  return { token: res.token, user: res.data };
}

export async function loginWithGoogle(
  payload: GoogleSignInPayload
): Promise<SocialAuthResult> {
  // Always send firstName/lastName as strings (never omit) — BE was formerly
  // required, and omitting caused "John undefined" render bugs downstream.
  const body: Record<string, string | number> = {
    idToken: payload.idToken,
    platformId: WEB_PLATFORM_ID,
    firstName: payload.firstName || "",
    lastName: payload.lastName || "",
  };
  if (payload.email) body.email = payload.email.trim().toLowerCase();
  const res = await api.post<LoginEnvelope>("/api/auth/google/callback", body, {
    auth: false,
  });
  return {
    token: res.token,
    user: res.data,
    newRegistration: !!res.newRegistration,
  };
}

export async function loginWithApple(
  payload: AppleSignInPayload
): Promise<SocialAuthResult> {
  const body: Record<string, string | number> = {
    identityToken: payload.identityToken,
    platformId: WEB_PLATFORM_ID,
    firstName: payload.firstName || "",
    lastName: payload.lastName || "",
  };
  if (payload.authorizationCode) body.authorizationCode = payload.authorizationCode;
  if (payload.email) body.email = payload.email.trim().toLowerCase();
  const res = await api.post<LoginEnvelope>("/api/auth/apple/callback", body, {
    auth: false,
  });
  return {
    token: res.token,
    user: res.data,
    newRegistration: !!res.newRegistration,
  };
}

// ---- Phone auth ------------------------------------------------------------

export async function phoneStart(
  countryCode: string,
  phone: string
): Promise<void> {
  await api.post<GenericEnvelope>(
    "/api/auth/phone/start",
    { countryCode, phone },
    { auth: false }
  );
}

export type PhoneVerifyResult =
  | { kind: "existing"; token: string; user: User }
  | { kind: "new"; phoneVerifyToken: string }
  | { kind: "archived" };

type PhoneVerifyEnvelope = {
  success?: boolean;
  token?: string;
  data?: User;
  phoneVerified?: boolean;
  phoneVerifyToken?: string;
  code?: string;
  message?: string;
};

export async function phoneVerify(
  countryCode: string,
  phone: string,
  otp: string
): Promise<PhoneVerifyResult> {
  try {
    const res = await api.post<PhoneVerifyEnvelope>(
      "/api/auth/phone/verify",
      { countryCode, phone, otp: String(otp) },
      { auth: false }
    );
    if (res.token && res.data) {
      return { kind: "existing", token: res.token, user: res.data };
    }
    if (res.phoneVerified && res.phoneVerifyToken) {
      return { kind: "new", phoneVerifyToken: res.phoneVerifyToken };
    }
    throw new Error(res.message || "Unexpected verify response");
  } catch (e) {
    if (e instanceof ApiError) {
      const body = e.data as { code?: string } | null;
      if (e.status === 400 && body?.code === "ACCOUNT_ARCHIVED") {
        return { kind: "archived" };
      }
    }
    throw e;
  }
}

// ---- Social finalize -------------------------------------------------------

export type SocialFinalizePayload = {
  countryCode: string;
  phone: string;
  dateOfBirth: string;
  phoneVerifyToken: string;
  anonId?: string;
  referralCode?: string;
};

type SocialFinalizeEnvelope = {
  success: boolean;
  data: { data: User } | User;
  message?: string;
};

export async function socialFinalize(
  payload: SocialFinalizePayload
): Promise<User> {
  const body: Record<string, string | number> = {
    countryCode: payload.countryCode,
    phone: payload.phone,
    dateOfBirth: payload.dateOfBirth,
    phoneVerifyToken: payload.phoneVerifyToken,
  };
  if (payload.anonId) body.anonId = payload.anonId;
  if (payload.referralCode) body.referralCode = payload.referralCode;
  const res = await api.post<SocialFinalizeEnvelope>(
    "/api/auth/social/finalize",
    body
  );
  // BE returns { data: { data: profile } } — some paths wrap twice, some once.
  const raw = res.data as { data?: User } & Partial<User>;
  return (raw.data as User) || (raw as User);
}

// ---- Referral -------------------------------------------------------------

export type ReferralResolveResult = {
  valid: boolean;
  code?: string;
  referrerFirstName?: string;
  bonusDays?: number;
  trialDays?: number;
  message?: string;
};

type ReferralResolveEnvelope = {
  data?: ReferralResolveResult;
} & ReferralResolveResult;

export async function resolveReferralCode(
  code: string
): Promise<ReferralResolveResult> {
  const clean = code.trim().toUpperCase();
  try {
    const res = await api.get<ReferralResolveEnvelope>(
      `/api/referral/resolve/${encodeURIComponent(clean)}`,
      { auth: false }
    );
    return res.data || (res as ReferralResolveResult);
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      const body = e.data as { message?: string } | null;
      return { valid: false, message: body?.message || "Invalid code" };
    }
    throw e;
  }
}

export async function redeemReferralCode(code: string): Promise<void> {
  await api.post<GenericEnvelope>("/api/referral/redeem", { code });
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<ProfileEnvelope>("/api/users/profile/me");
  return res.data;
}

type RegisterAuthedEnvelope = RegisterEnvelope & {
  token?: string;
  data?: User;
};

export type RegisterResult = { token?: string; user?: User };

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResult> {
  const body: Record<string, string | number> = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    platformId: WEB_PLATFORM_ID,
  };
  if (payload.email) body.email = payload.email.trim().toLowerCase();
  if (payload.password) body.password = payload.password;
  if (payload.countryCode) body.countryCode = payload.countryCode;
  if (payload.phone && payload.phone.trim()) {
    body.phone = payload.phone.replace(/\D/g, "");
  }
  if (payload.phoneVerifyToken) body.phoneVerifyToken = payload.phoneVerifyToken;
  if (payload.dateOfBirth) body.dateOfBirth = payload.dateOfBirth;
  // draftToken INTENTIONALLY OMITTED — merge is deferred via /api/onboarding/merge.
  if (payload.anonId) body.anonId = payload.anonId;
  const res = await api.post<RegisterAuthedEnvelope>(
    "/api/auth/register",
    body,
    { auth: false }
  );
  return { token: res.token, user: res.data };
}

export async function verifyOtp(
  email: string,
  otp: string,
  isPasswordReset = false
): Promise<{ token: string; user: User }> {
  const res = await api.post<LoginEnvelope>(
    "/api/auth/verify-otp",
    {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      isPasswordReset,
    },
    { auth: false }
  );
  return { token: res.token, user: res.data };
}

export async function updateDateOfBirth(dateOfBirth: string): Promise<User> {
  const params = new URLSearchParams();
  params.append("dateOfBirth", dateOfBirth);
  const res = await api.put<ProfileEnvelope>(
    "/api/users/profile/me",
    params
  );
  return res.data;
}

export async function updatePhone(
  countryCode: string,
  phone: string
): Promise<User> {
  const res = await api.put<ProfileEnvelope>("/api/users/profile/me", {
    phone: phone.replace(/\D/g, ""),
    countryCode,
  });
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post<GenericEnvelope>(
    "/api/auth/forgot-password",
    { email: email.trim().toLowerCase() },
    { auth: false }
  );
}

export async function resetPassword(
  email: string,
  newPassword: string
): Promise<void> {
  await api.post<GenericEnvelope>(
    "/api/auth/reset-password",
    { email: email.trim().toLowerCase(), newPassword },
    { auth: false }
  );
}

export async function resendOtp(email: string): Promise<void> {
  await api.post<GenericEnvelope>(
    "/api/auth/send-otp",
    { email: email.trim().toLowerCase() },
    { auth: false }
  );
}
