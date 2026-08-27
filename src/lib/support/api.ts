import { api } from "../api/client";

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  isAppUser: boolean;
};

type ContactEnvelope = {
  success: boolean;
  message?: string;
};

export async function sendContactMessage(
  input: Omit<ContactPayload, "isAppUser">
): Promise<string | undefined> {
  const res = await api.post<ContactEnvelope>("/api/contact-us", {
    ...input,
    isAppUser: true,
  });
  return res.message;
}
