"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CloseIcon, ChevronRightIcon } from "../icons";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import AddMembersDrawer from "./AddMembersDrawer";
import { addUsersToGroup, leaveGroup } from "../../../../lib/connections/api";
import { bustUrl } from "../../../../lib/images";
import type { GroupSummary, PersonSummary } from "../../../../types/home";

type PickerUser = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
  updatedAt?: string;
  epochlagID?: string;
};

type DrawerMember = GroupSummary["members"][number];

type Props = {
  open: boolean;
  group: GroupSummary | null;
  suggested: PersonSummary[];
  onClose: () => void;
  onLeft: (groupId: string) => void;
  onMembersAdded: (groupId: string, added: DrawerMember[]) => void;
};

export default function GroupDrawer({
  open,
  group,
  suggested,
  onClose,
  onLeft,
  onMembersAdded,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setAddOpen(false);
      setLeaveOpen(false);
    }
  }, [open]);

  const excludeIds = useMemo(
    () => (group?.members ?? []).map((m) => m._id),
    [group]
  );

  async function handleAdd(list: PickerUser[]) {
    if (!group || list.length === 0 || adding) return;
    setAdding(true);
    const added: DrawerMember[] = list.map((p) => ({
      _id: p._id,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      profilePicture: p.profilePicture ?? null,
      epochlagID: p.epochlagID,
      isOwner: false,
      joinedAt: new Date().toISOString(),
    }));
    const ids = list
      .map((p) => p.epochlagID || p._id)
      .filter((v): v is string => !!v);
    if (ids.length === 0) {
      setAdding(false);
      toast.error("Selected users are missing identifiers");
      return;
    }
    try {
      await addUsersToGroup(group._id, ids);
      onMembersAdded(group._id, added);
      toast.success("Members added");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add members";
      toast.error(msg);
      throw e;
    } finally {
      setAdding(false);
    }
  }

  async function handleLeave() {
    if (!group || leaving) return;
    setLeaving(true);
    try {
      await leaveGroup(group._id);
      toast.success("Left group");
      onLeft(group._id);
      setLeaveOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to leave";
      toast.error(msg);
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] md:w-[460px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Group details"
      >
        <div className="flex items-start justify-between px-[24px] pt-[24px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[22px] leading-tight">
            {group?.name ?? "Group"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:brightness-95 transition"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[24px] pt-[16px] pb-[16px]">
          <div className="flex flex-col">
            {(group?.members ?? []).map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/profile/${m._id}`);
                }}
                className="cursor-pointer flex items-center gap-[12px] py-[10px] hover:bg-black/[0.03] rounded-[10px] transition text-left"
              >
                <MemberAvatar member={m} />
                <span className="flex-1 font-montserrat font-semibold text-primary-blue text-[15px]">
                  {m.firstName}
                </span>
                <ChevronRightIcon
                  width={16}
                  height={16}
                  className="text-primary-blue/50"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="px-[24px] pb-[24px] pt-[8px] flex flex-col items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="cursor-pointer w-full bg-primary-orange text-white rounded-full h-[48px] font-montserrat font-semibold text-[15px] hover:opacity-90 transition"
          >
            Add Someone
          </button>
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="cursor-pointer inline-flex items-center gap-[6px] text-[#D95F3B] font-montserrat font-semibold text-[14px] hover:opacity-80 transition"
          >
            <LeaveIcon width={20} height={20} />
            Leave Group
          </button>
        </div>
      </aside>

      <AddMembersDrawer
        open={addOpen && !!group}
        onClose={() => setAddOpen(false)}
        suggested={suggested}
        excludeIds={excludeIds}
        busy={adding}
        onAdd={handleAdd}
      />

      <ConfirmationModal
        open={leaveOpen}
        title={`Do you want to leave ${group?.name ?? "this"} group?`}
        confirmLabel="Leave Group"
        destructive
        onConfirm={handleLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}

function MemberAvatar({ member }: { member: DrawerMember }) {
  const url = bustUrl(member.profilePicture, undefined);
  return (
    <div className="w-[40px] h-[40px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[14px] shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        (member.firstName?.[0] ?? "?").toUpperCase()
      )}
    </div>
  );
}

function LeaveIcon({
  width = 20,
  height = 20,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.75 11.001C12.75 10.5868 12.4142 10.251 12 10.251C11.5858 10.251 11.25 10.5868 11.25 11.001V13.001C11.25 13.4152 11.5858 13.751 12 13.751C12.4142 13.751 12.75 13.4152 12.75 13.001V11.001Z" fill="#D95F3B" />
      <path fillRule="evenodd" clipRule="evenodd" d="M13.7247 2.02807L16.1585 2.4337C17.3143 2.62631 18.2506 2.78235 18.9831 3.00041C19.7459 3.22751 20.3761 3.54565 20.8613 4.11844C21.3465 4.69122 21.5568 5.36519 21.6554 6.15495C21.75 6.91328 21.75 7.86253 21.75 9.03423V14.9677C21.75 16.1394 21.75 17.0886 21.6554 17.847C21.5568 18.6367 21.3465 19.3107 20.8613 19.8835C20.3761 20.4563 19.7459 20.7744 18.9831 21.0015C18.2506 21.2196 17.3143 21.3756 16.1586 21.5682L13.7247 21.9739C12.6915 22.1461 11.8373 22.2885 11.155 22.305C10.4394 22.3223 9.77599 22.2072 9.22247 21.7383C8.75523 21.3425 8.52385 20.828 8.40256 20.251H7.94632C6.8135 20.251 5.88774 20.251 5.15689 20.1528C4.39294 20.05 3.7306 19.8278 3.20191 19.2991C2.67321 18.7704 2.45093 18.108 2.34822 17.3441C2.24996 16.6132 2.24998 15.6875 2.25 14.5547V9.44728C2.24998 8.31446 2.24996 7.38871 2.34822 6.65785C2.45093 5.8939 2.67321 5.23157 3.20191 4.70287C3.7306 4.17418 4.39294 3.9519 5.15689 3.84919C5.88775 3.75092 6.81348 3.75094 7.94631 3.75097L8.40256 3.75097C8.52384 3.17392 8.75523 2.65939 9.22247 2.26358C9.77599 1.79468 10.4394 1.67966 11.155 1.69695C11.8373 1.71343 12.6916 1.85584 13.7247 2.02807ZM8.25 17.336C8.24999 17.8521 8.24997 18.3241 8.26143 18.751H8C6.80029 18.751 5.97595 18.7494 5.35676 18.6661C4.75914 18.5858 4.46611 18.4419 4.26257 18.2384C4.05903 18.0349 3.91519 17.7418 3.83484 17.1442C3.7516 16.525 3.75 15.7007 3.75 14.501V9.50097C3.75 8.30126 3.7516 7.47692 3.83484 6.85773C3.91519 6.26011 4.05903 5.96707 4.26257 5.76353C4.46611 5.55999 4.75914 5.41616 5.35676 5.33581C5.97595 5.25256 6.80029 5.25097 8 5.25097H8.26143C8.24997 5.67787 8.24999 6.14987 8.25 6.66587V17.336ZM11.1188 3.19651C10.5765 3.18341 10.3458 3.27787 10.192 3.40811C10.0383 3.53834 9.90719 3.75037 9.83097 4.28743C9.75179 4.84525 9.75 5.60394 9.75 6.7228V17.2791C9.75 18.398 9.75179 19.1567 9.83097 19.7145C9.90719 20.2515 10.0383 20.4636 10.192 20.5938C10.3458 20.724 10.5765 20.8185 11.1188 20.8054C11.682 20.7918 12.4307 20.6688 13.5343 20.4849L15.8631 20.0968C17.0793 19.8941 17.9228 19.7521 18.5551 19.5639C19.1672 19.3816 19.4911 19.1804 19.7168 18.9139C19.9425 18.6475 20.0878 18.2949 20.1669 17.6611C20.2486 17.0066 20.25 16.1512 20.25 14.9182V9.08372C20.25 7.85071 20.2486 6.99537 20.1669 6.34078C20.0878 5.70698 19.9425 5.35445 19.7168 5.088C19.4911 4.82155 19.1672 4.6203 18.5551 4.43805C17.9228 4.24982 17.0793 4.10786 15.8631 3.90515L13.5343 3.51702C12.4307 3.33308 11.682 3.21012 11.1188 3.19651Z" fill="#D95F3B" />
    </svg>
  );
}
