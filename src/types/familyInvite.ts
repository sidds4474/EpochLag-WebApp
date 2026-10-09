// Shapes returned by GET /api/public/family-invite/:token. The endpoint is
// deliberately spare — no last names, no ids, no emails/phones — because an
// invite link can be forwarded and the preview must be safe to show to
// whoever ends up opening the URL.

export type PublicFamilyInviteInviter = {
  firstName: string;
  profilePicture: string | null;
};

// The invitee's name + relationship are what the inviter typed when adding
// this ghost — not fields on an existing account. `relationship` is what the
// invitee IS to the inviter (e.g. "brother" = Rohan is Sofia's brother).
export type PublicFamilyInviteInvitee = {
  firstName: string;
  relationship: string;
};

// Only relatives who have signed up and are linked to the inviter's tree.
// BE deliberately excludes ghost (unjoined) entries so forwarded links can't
// enumerate the inviter's private tree notes.
export type PublicFamilyInviteMember = {
  firstName: string;
  relationship: string;
  profilePicture: string | null;
};

export type PublicFamilyInvitePreview = {
  inviter: PublicFamilyInviteInviter;
  invitee: PublicFamilyInviteInvitee;
  // ≤ 5 entries (BE-capped). Empty array when none of the inviter's family
  // has joined yet — FE renders a two-avatar "you + inviter" layout in that
  // case.
  familyTree: PublicFamilyInviteMember[];
  // Count of other joined relatives beyond the 5 shown. 0 when ≤ 5.
  familyTreeOverflow: number;
};
