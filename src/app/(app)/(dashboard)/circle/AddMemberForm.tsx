"use client";

// Add/Edit a family tree member — right-side drawer on desktop, bottom sheet
// on mobile. Used by:
//   - Scoped "+" adder buttons on the Family Tree (with pre-filtered chips)
//   - The node action card ("Add a Relative" button) — uses targetName in header
//   - The node action card (pencil icon) — edit mode, seeded from the person
//
// No avatar picker here: BE's family-tree schema rejects `avatarUrl`. Linked
// users render from their EpochLag profilePicture; ghosts render as initials
// elsewhere in the tree.

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  createFamilyPerson,
  fetchRelationshipOptions,
  sendFamilyInvite,
  updateFamilyPerson,
  type FamilyPersonPayload,
  type FamilyTreePerson,
  type RelationshipOption,
} from "../../../../lib/circle/api";
import { searchFriends } from "../../../../lib/moments/api";
import type { FriendSearchResult } from "../../../../types/moment";
import Avatar from "../../../../components/Avatar";
import { CloseIcon } from "../icons";
import { CountryPicker } from "../../../../components/auth/CountryPicker";

type PickedContact = {
  matchedUserId: string;
  firstName: string;
  lastName?: string;
  epochlagID?: string;
  profilePicture?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  // Edit mode seed. When present, the drawer renders in edit mode.
  initial?: FamilyTreePerson | null;
  // Create-mode header text: "Add a Relative to {targetName}". Null →
  // generic header "Add family member".
  targetName?: string | null;
  // Pre-select a chip by slug (scoped + adders).
  presetSlug?: string | null;
  // Filter the chip list to these slugs. When empty/undefined, all shown.
  allowedSlugs?: string[];
  // Set of user ids already present in the tree — filters the search dropdown
  // so the user can't add the same linked account twice.
  treeUserIds?: Set<string>;
};

export default function AddMemberForm({
  open,
  onClose,
  onSaved,
  initial = null,
  targetName = null,
  presetSlug = null,
  allowedSlugs,
  treeUserIds,
}: Props) {
  const isEdit = !!initial;

  const [options, setOptions] = useState<RelationshipOption[]>([]);
  const [relationship, setRelationship] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<PickedContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const initialSnapshot = useRef<{
    hadPhone: boolean;
    hadEmail: boolean;
  }>({ hadPhone: false, hadEmail: false });

  // Seed state each time the drawer opens so re-opens don't leak fields.
  useEffect(() => {
    if (!open) return;
    if (isEdit && initial) {
      setName(initial.name || "");
      setRelationship(initial.relationshipSlug || "");
      setCountryCode(initial.countryCode || "+1");
      setPhone(initial.phone || "");
      setEmail(initial.email || "");
      setPicked(null);
      initialSnapshot.current = {
        hadPhone: !!initial.phone,
        hadEmail: !!initial.email,
      };
    } else {
      setName("");
      setRelationship(presetSlug || "");
      setCountryCode("+1");
      setPhone("");
      setEmail("");
      setPicked(null);
      initialSnapshot.current = { hadPhone: false, hadEmail: false };
    }
    setSearchResults([]);
  }, [open, isEdit, initial, presetSlug]);

  // Relationship options — cached in the API layer so this is cheap.
  useEffect(() => {
    if (!open) return;
    fetchRelationshipOptions()
      .then((list) => setOptions(list))
      .catch(() => setOptions([]));
  }, [open]);

  // Scroll lock + Escape close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saving]);

  const visibleOptions = useMemo(() => {
    if (!allowedSlugs || allowedSlugs.length === 0) return options;
    const allow = new Set(allowedSlugs.map((s) => s.toLowerCase()));
    return options.filter((o) => allow.has(o.slug.toLowerCase()));
  }, [options, allowedSlugs]);

  // Debounced server-side friend search when user types a name without a
  // picked account. Skip when editing — editing the existing person's name
  // shouldn't suggest swapping identity.
  useEffect(() => {
    if (!open || isEdit || picked) {
      setSearchResults([]);
      return;
    }
    const q = name.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchFriends(q, 1, 10)
        .then((list) => {
          if (cancelled) return;
          const existing = treeUserIds ?? new Set<string>();
          setSearchResults(list.filter((u) => !existing.has(u._id)));
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, open, isEdit, picked, treeUserIds]);

  function pickRelationship(displayName: string) {
    // Toggle off if already selected — matches the chip tap behavior in mobile.
    const same = relationship.trim().toLowerCase() === displayName.toLowerCase();
    setRelationship(same ? "" : displayName);
  }

  function isChipSelected(opt: RelationshipOption): boolean {
    const normalized = relationship.trim().toLowerCase();
    return (
      normalized === opt.displayName.trim().toLowerCase() ||
      normalized === opt.slug.toLowerCase()
    );
  }

  function pickFriend(f: FriendSearchResult) {
    setPicked({
      matchedUserId: f._id,
      firstName: f.firstName,
      lastName: f.lastName,
      epochlagID: f.epochlagID,
      profilePicture: f.profilePicture,
    });
    const display = [f.firstName, f.lastName].filter(Boolean).join(" ").trim();
    setName(display || f.firstName);
    setSearchResults([]);
  }

  function clearPicked() {
    setPicked(null);
  }

  const canSubmit = (() => {
    if (saving) return false;
    if (name.trim().length === 0) return false;
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed.length > 0 && countryCode.trim().length === 0) {
      return false;
    }
    return true;
  })();

  async function handleSubmit() {
    if (!canSubmit) return;
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    // CREATE: omit blanks. EDIT: previously-set field now blank → null to clear.
    const phoneField =
      isEdit && initialSnapshot.current.hadPhone && trimmedPhone.length === 0
        ? null
        : trimmedPhone || undefined;
    const emailField =
      isEdit && initialSnapshot.current.hadEmail && trimmedEmail.length === 0
        ? null
        : trimmedEmail || undefined;

    if (!isEdit && trimmedPhone.length > 0 && countryCode.trim().length === 0) {
      toast.error("Add a country code before the phone number, or clear it.");
      return;
    }

    const hidePhoneAndEmail = !!picked;
    const payload: FamilyPersonPayload = {
      name: name.trim(),
      relationshipSlug: relationship.trim() || undefined,
      phone: hidePhoneAndEmail ? undefined : (phoneField as string | undefined),
      countryCode:
        hidePhoneAndEmail || !trimmedPhone
          ? undefined
          : countryCode.trim() || undefined,
      email: hidePhoneAndEmail ? undefined : (emailField as string | undefined),
      linkedUserId: picked?.matchedUserId,
    };

    setSaving(true);
    try {
      if (isEdit && initial) {
        // Build a patch of only the fields that actually changed.
        const patch: Partial<FamilyPersonPayload> = {};
        if (payload.name !== initial.name) patch.name = payload.name;
        if (
          (payload.relationshipSlug || null) !==
          (initial.relationshipSlug || null)
        ) {
          patch.relationshipSlug = payload.relationshipSlug;
        }
        if (phoneField !== undefined && phoneField !== (initial.phone || null)) {
          patch.phone = phoneField;
          if (phoneField) patch.countryCode = countryCode.trim();
        }
        if (emailField !== undefined && emailField !== (initial.email || null)) {
          patch.email = emailField;
        }
        if (Object.keys(patch).length === 0) {
          onSaved();
          onClose();
          return;
        }
        await updateFamilyPerson(initial._id, patch);
        toast.success("Changes saved");
        onSaved();
        onClose();
        return;
      }

      // Create + auto-invite follow-up.
      const res = await createFamilyPerson(payload);
      if (!res.created) {
        toast("Already in your tree");
        onSaved();
        onClose();
        return;
      }
      const newId = res.person._id;
      const invitePayload: Record<string, string> = {};
      if (picked?.matchedUserId) {
        invitePayload.userId = picked.matchedUserId;
      } else {
        if (trimmedPhone) {
          invitePayload.phone = trimmedPhone;
          invitePayload.countryCode = countryCode.trim();
        }
        if (trimmedEmail) invitePayload.email = trimmedEmail;
      }
      toast.success("Added to family tree");
      onSaved();
      onClose();

      if (Object.keys(invitePayload).length > 0) {
        try {
          const inv = await sendFamilyInvite(newId, invitePayload);
          if (inv.invitedExistingUser) {
            toast.success("Invitation sent");
          } else if (inv.inviteToken) {
            await shareInviteToken(inv.inviteToken);
          }
        } catch {
          // Invite failure is non-fatal — the person is in the tree; user can
          // retry from the node card.
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const headerText = isEdit
    ? "Edit family member"
    : targetName
      ? `Add a Relative to ${targetName}`
      : "Add family member";

  const contactHidden = !!picked && !isEdit;
  const submitLabel = isEdit ? "Save changes" : "Add to family tree";

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[420px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-start justify-between px-[24px] pt-[24px] pb-[12px]">
          <h2 className="font-ivy text-[#2C2C2C] text-[20px] md:text-[22px] leading-tight pr-[8px]">
            {headerText}
          </h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Close"
            className="w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors shrink-0"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px] pt-[8px]">
          {/* Relationship chips — horizontal scroll on narrow drawers. */}
          {visibleOptions.length > 0 && (
            <div className="-mx-[4px] overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-[8px] px-[4px] pb-[4px]">
                {visibleOptions.map((opt) => {
                  const selected = isChipSelected(opt);
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => pickRelationship(opt.displayName)}
                      className={`shrink-0 px-[16px] py-[8px] rounded-full font-montserrat text-[13px] transition-colors ${
                        selected
                          ? "bg-[#2C2C2C] text-white"
                          : "bg-[#EDEDED] text-[#2C2C2C] hover:bg-[#E3E3E3]"
                      }`}
                    >
                      {opt.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name input + picked-contact clear */}
          <div className="mt-[16px] relative">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (picked) setPicked(null);
              }}
              placeholder="Name"
              className="w-full bg-white border border-black/10 rounded-full px-[16px] pr-[36px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            />
            {picked && (
              <button
                type="button"
                onClick={clearPicked}
                aria-label="Unlink picked person"
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-[#EDEDED] text-[#848484] flex items-center justify-center hover:bg-[#E3E3E3]"
              >
                <CloseIcon width={10} height={10} />
              </button>
            )}

            {/* Friend search dropdown */}
            {!picked && searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-[6px] z-10 bg-white rounded-[14px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] max-h-[220px] overflow-y-auto">
                {searchResults.map((f) => (
                  <li key={f._id}>
                    <button
                      type="button"
                      onClick={() => pickFriend(f)}
                      className="w-full flex items-center gap-[10px] px-[12px] py-[10px] text-left hover:bg-black/[0.03]"
                    >
                      <Avatar
                        user={{
                          firstName: f.firstName,
                          profilePicture: f.profilePicture ?? null,
                        }}
                        size={36}
                      />
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="font-ivy text-[#2C2C2C] text-[14px] truncate">
                          {[f.firstName, f.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim() || f.firstName}
                        </p>
                        {f.epochlagID && (
                          <p className="font-montserrat text-[#848484] text-[11px] truncate">
                            {f.epochlagID}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!picked && searching && searchResults.length === 0 && name.trim().length >= 2 && (
              <p className="absolute left-[16px] top-full mt-[6px] font-montserrat text-[#848484] text-[11px]">
                Searching…
              </p>
            )}
          </div>

          {!contactHidden && (
            <>
              <p className="mt-[20px] font-montserrat text-[#2C2C2C] text-[13px]">
                Contact (Optional)
              </p>
              <div className="mt-[8px] flex items-center gap-[8px]">
                <div className="shrink-0 border border-black/10 rounded-full px-[4px] py-[2px] flex items-center">
                  <CountryPicker
                    value={countryCode}
                    onChange={(dial) => setCountryCode(dial)}
                  />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="flex-1 bg-white border border-black/10 rounded-full px-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="mt-[10px] w-full bg-white border border-black/10 rounded-full px-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
              />
            </>
          )}
        </div>

        <div className="border-t border-black/5 px-[24px] py-[16px]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-primary-orange text-white rounded-full py-[12px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function handleError(err: unknown) {
  if (err instanceof ApiError) {
    const code = err.code || "";
    if (code === "DUPLICATE_PERSON") {
      toast.error("That name and relationship already exist in your tree.");
      return;
    }
    if (code === "NOT_PERSON_OWNER") {
      toast.error("That person isn't in your tree anymore.");
      return;
    }
    if (code === "ALREADY_CLAIMED") {
      toast.error("They're already on Epoch Lag.");
      return;
    }
    if (code === "CANNOT_INVITE_SELF") {
      toast.error("You can't invite yourself.");
      return;
    }
    if (code === "USER_ALREADY_IN_TREE") {
      toast.error(
        err.message || "Someone in your tree is already linked to that account.",
      );
      return;
    }
    toast.error(err.message || "Something went wrong. Please try again.");
    return;
  }
  toast.error("Something went wrong. Please try again.");
}

async function shareInviteToken(token: string) {
  // Token is a SECRET — only surfaces here, in the share sheet message.
  // Never log it, never send it to analytics or crash reports.
  const url = `https://epochlag.com/family-invite/${token}`;
  const text = `Join me on Epoch Lag so I can add you to my Family Tree. ${url}`;
  const navAny = typeof navigator !== "undefined" ? navigator : null;
  if (navAny && typeof navAny.share === "function") {
    try {
      await navAny.share({ text });
      return;
    } catch {
      /* fall through to clipboard */
    }
  }
  if (navAny?.clipboard?.writeText) {
    try {
      await navAny.clipboard.writeText(url);
      toast.success("Invite link copied");
      return;
    } catch {
      /* no-op */
    }
  }
  toast.success("Invite created");
}
