import { bustUrl } from "../../../../lib/images";
import type { GroupSummary } from "../../../../types/home";

// Two-avatar composition for group tiles: primary top-left, secondary
// bottom-right. If the group has a photoUrl it stands alone (single
// image, no stack). Falls back to typographic disks when photos are
// missing. Priority for primary = the owner if present in members;
// otherwise members[0].
export default function GroupAvatarStack({
  group,
  size = 52,
}: {
  group: GroupSummary;
  size?: number;
}) {
  const inner = Math.round(size * 0.7);

  if (group.groupPhotoUrl) {
    return (
      <div
        className="relative rounded-full overflow-hidden bg-primary-blue/10"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bustUrl(group.groupPhotoUrl, undefined) ?? undefined}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const members = group.members ?? [];
  const owner = members.find((m) => m.isOwner);
  const primary = owner ?? members[0];
  const secondary =
    members.find((m) => m._id !== primary?._id) ?? members[1] ?? null;

  const initialFor = (m?: {
    firstName?: string;
    lastName?: string;
  }) => {
    const first = (m?.firstName ?? "").trim();
    return first.charAt(0).toUpperCase() || "?";
  };

  const AvatarDisk = ({
    person,
    diameter,
  }: {
    person: (typeof members)[number] | null | undefined;
    diameter: number;
  }) => (
    <div
      className="rounded-full overflow-hidden bg-[#C8D1DA] flex items-center justify-center border-[2px] border-white"
      style={{ width: diameter, height: diameter }}
    >
      {person?.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(person.profilePicture, undefined) ?? undefined}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="font-montserrat font-semibold text-white"
          style={{ fontSize: Math.round(diameter * 0.4) }}
        >
          {initialFor(person ?? undefined)}
        </span>
      )}
    </div>
  );

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute top-0 left-0">
        <AvatarDisk person={primary} diameter={inner} />
      </div>
      <div className="absolute bottom-0 right-0">
        <AvatarDisk person={secondary} diameter={inner} />
      </div>
    </div>
  );
}
