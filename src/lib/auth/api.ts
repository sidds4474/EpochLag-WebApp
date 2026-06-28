import { api } from "../api/client";
import type { User } from "../../types/user";

type LoginEnvelope = {
  success: boolean;
  token: string;
  data: User;
  message?: string;
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

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone?: string;
};

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await api.post<LoginEnvelope>(
    "/api/auth/login",
    { email: email.trim().toLowerCase(), password, platformId: 3 },
    { auth: false }
  );
  return { token: res.token, user: res.data };
}

export async function loginWithGoogle(
  payload: GoogleSignInPayload
): Promise<{ token: string; user: User }> {
  const body: Record<string, string | number> = {
    idToken: payload.idToken,
    platformId: 3,
  };
  if (payload.email) body.email = payload.email.trim().toLowerCase();
  if (payload.firstName) body.firstName = payload.firstName;
  if (payload.lastName) body.lastName = payload.lastName;
  const res = await api.post<LoginEnvelope>("/api/auth/google/callback", body, {
    auth: false,
  });
  return { token: res.token, user: res.data };
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<ProfileEnvelope>("/api/users/profile/me");
  return res.data;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const body: Record<string, string | number> = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    countryCode: payload.countryCode || "+1",
    platformId: 3,
  };
  if (payload.phone && payload.phone.trim()) {
    body.phone = payload.phone.replace(/\D/g, "");
  }
  await api.post<RegisterEnvelope>("/api/auth/register", body, { auth: false });
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

type GenericEnvelope = {
  success: boolean;
  message?: string;
};

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
