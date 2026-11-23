// Family Tree row builder. Matches mobile's strict slug grouping. Any person
// whose relationshipSlug doesn't match a known row (user's "Nani", "Bhaiya",
// or BE's "friend"/"other") drops into the `unmapped` bucket for the
// AlsoInYourFamily list below the tree.

import type { FamilyTreePerson } from "../../../../lib/circle/api";

export type TreeRows = {
  grandparents: FamilyTreePerson[];
  parents: FamilyTreePerson[];
  self: FamilyTreePerson[];
  children: FamilyTreePerson[];
  grandchildren: FamilyTreePerson[];
  unmapped: FamilyTreePerson[];
};

const ROW_0 = new Set(["grandmother", "grandfather"]);
const ROW_1 = new Set(["mother", "father", "aunt", "uncle"]);
const ROW_2 = new Set(["brother", "sister", "spouse", "partner", "cousin"]);
const ROW_3 = new Set(["son", "daughter", "niece", "nephew"]);
const ROW_4 = new Set(["grandson", "granddaughter"]);

function slugOf(p: FamilyTreePerson): string {
  return (p.relationshipSlug || "").toLowerCase().trim();
}

// Row 2 ordering: cousins outermost → siblings → Me (anchor) → spouse/partner
// far right. Returns a sort key — lower comes first in the row.
function row2Order(slug: string, isMe: boolean): number {
  if (isMe) return 100;
  if (slug === "cousin") return 0;
  if (slug === "brother" || slug === "sister") return 50;
  if (slug === "spouse" || slug === "partner") return 200;
  return 75;
}

export function buildTreeRows(
  people: FamilyTreePerson[],
  me: FamilyTreePerson,
): TreeRows {
  const rows: TreeRows = {
    grandparents: [],
    parents: [],
    self: [],
    children: [],
    grandchildren: [],
    unmapped: [],
  };

  for (const p of people) {
    if (p.isMe) continue; // Me is synthesized below.
    const s = slugOf(p);
    if (!s) {
      rows.unmapped.push(p);
      continue;
    }
    if (ROW_0.has(s)) rows.grandparents.push(p);
    else if (ROW_1.has(s)) rows.parents.push(p);
    else if (ROW_2.has(s)) rows.self.push(p);
    else if (ROW_3.has(s)) rows.children.push(p);
    else if (ROW_4.has(s)) rows.grandchildren.push(p);
    else rows.unmapped.push(p);
  }

  rows.self.push(me);
  rows.self.sort((a, b) => row2Order(slugOf(a), !!a.isMe) - row2Order(slugOf(b), !!b.isMe));

  return rows;
}

// Four node states, resolved via a pure function matching mobile's
// getFamilyPersonState(). Centralizing here keeps the visuals consistent.
export type PersonState = "LINKED" | "ACCOUNT_PENDING" | "GHOST_INVITED" | "GHOST";

export function getFamilyPersonState(p: FamilyTreePerson): PersonState {
  if (p.isMe || (p.isOnApp && p.isLinked)) return "LINKED";
  if (!p.isLinked && p.hasPendingInvite) return "ACCOUNT_PENDING";
  if (!p.isLinked && p.wasInvitedByMe) return "GHOST_INVITED";
  return "GHOST";
}

export function relationshipLabel(p: FamilyTreePerson): string {
  const s = slugOf(p);
  if (!s) return "";
  // Title-case the slug ("mother" → "Mother").
  return s.charAt(0).toUpperCase() + s.slice(1);
}
