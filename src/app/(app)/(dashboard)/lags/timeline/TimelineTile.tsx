"use client";

import Link from "next/link";
import { bustUrl } from "../../../../../lib/images";
import Avatar from "../../../../../components/Avatar";
import {
  timelineCover,
  timelineTitle,
  type TimelineEntry,
} from "../../../../../lib/library/timeline";

type TimelineTileProps = {
  entry: TimelineEntry;
  // Kept as a prop so the parent can still wire the real hide handler
  // (used when Save Changes flushes pending hides). The tile itself no
  // longer invokes it — hide is driven by the edit-mode eye toggle.
  onHide: (storyId: string) => void;
  editMode?: boolean;
  pendingHidden?: boolean;
};

export default function TimelineTile({
  entry,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onHide: _onHide,
  editMode = false,
  pendingHidden = false,
}: TimelineTileProps) {
  const title = timelineTitle(entry);
  const cover = timelineCover(entry);
  const people = entry.people ?? [];
  const avatars = people.slice(0, 4);

  const handleClickCapture = (e: React.MouseEvent) => {
    if (editMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Link
      href={`/thread/${entry.threadId}`}
      onClickCapture={handleClickCapture}
      className={`relative flex items-center gap-[12px] md:gap-[20px] rounded-[16px] p-[10px] md:p-[12px] transition-all ${
        pendingHidden
          ? "bg-[#D2CEBE] opacity-40"
          : editMode
            ? "bg-[#E6E3D9] hover:bg-[#E6E3D9] cursor-default"
            : "bg-[#E6E3D9] hover:bg-[#dcd9cc]"
      }`}
    >
      {/* Polaroid photo — white frame + soft shadow */}
      <div className="shrink-0 bg-white p-[6px] md:p-[7px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.25)]">
        <div className="relative w-[69px] h-[73px] md:w-[81px] md:h-[85px] overflow-hidden bg-primary-blue/10">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bustUrl(cover, undefined)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="font-ivy text-[16px] md:text-[20px] leading-[1.25] text-[#232323] break-words">
          {title}
        </p>
      </div>

      {/* Avatar stack */}
      {avatars.length > 0 && (
        <div className="shrink-0 hidden xs:flex items-center pr-[4px] md:pr-[8px]">
          {avatars.map((p, i) => (
            <div
              key={p._id ?? i}
              style={{ marginLeft: i === 0 ? 0 : -9 }}
              className="rounded-full border-[1.5px] border-white overflow-hidden shrink-0"
            >
              <Avatar
                user={{
                  firstName: p.firstName,
                  profilePicture: p.profilePicture ?? null,
                }}
                size={22}
              />
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
