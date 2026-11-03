// Program-page signup helper. Preserved per the backend spec
// "Program signups — Frontend guide" (Oct 27, 2026) for whenever a
// future program page needs an email signup form again. The current
// "Get to know your Mom" page points to the App Store / Play Store
// instead, so there is no live caller — commented out to avoid
// shipping dead code while the spec itself stays authoritative.
//
// To re-enable: uncomment the file and import `subscribeToProgram`
// from this module in the new program page's submit handler. Pass the
// kebab-case `source` for that program.
//
// import { api, ApiError } from "../api/client";
//
// export type SubscribeProgramInput = {
//   email: string;
//   source: string;
//   firstName?: string;
// };
//
// export type SubscribeProgramResult =
//   | { ok: true; message: string }
//   | { ok: false; message: string };
//
// type ServerBody = { success?: boolean; message?: string };
//
// export async function subscribeToProgram(
//   input: SubscribeProgramInput
// ): Promise<SubscribeProgramResult> {
//   const trimmedName = input.firstName?.trim();
//   const body: Record<string, string> = {
//     email: input.email.trim(),
//     source: input.source,
//   };
//   if (trimmedName) body.firstName = trimmedName;
//
//   try {
//     const res = await api.post<ServerBody>("/api/programs/subscribe", body, {
//       auth: false,
//     });
//     // Spec: only a 2xx with success:true counts as success. Any 2xx body
//     // without success:true (shouldn't happen) falls through to the generic
//     // failure path.
//     if (res?.success === true) {
//       return {
//         ok: true,
//         message: res.message || "You’re signed up — thanks for joining!",
//       };
//     }
//     return { ok: false, message: "Something went wrong, please try again." };
//   } catch (e) {
//     if (!(e instanceof ApiError)) {
//       return { ok: false, message: "Something went wrong, please try again." };
//     }
//     if (e.status === 429) {
//       return {
//         ok: false,
//         message: "Too many attempts, please try again in a few minutes.",
//       };
//     }
//     if (e.status === 422) {
//       const msg = (e.data as ServerBody | null)?.message || e.message || "";
//       if (/email/i.test(msg)) {
//         return { ok: false, message: "Please enter a valid email." };
//       }
//       return { ok: false, message: "Something went wrong, please try again." };
//     }
//     return { ok: false, message: "Something went wrong, please try again." };
//   }
// }

export {};
