"use client";

// Ring layout for the Relationship tab. Up to 4 inner-ring slots + 6 outer-ring
// slots = 10 people shown as rings. Any people past 10 drop into the overflow
// row below. Node positions are deterministic — derived from constants in
// `useRingLayout`. People order is BE-authoritative; never re-sort client-side.

import Link from "next/link";
import Avatar from "../../../../components/Avatar";
import { PlusIcon } from "../icons";
import type { CirclePerson } from "../../../../lib/circle/api";

type Props = {
  people: CirclePerson[];
  onAddConnection?: () => void;
};

// Geometry (mirrors mobile CirclesView.js).
const INNER_RADIUS_RATIO = 0.22;
const OUTER_RADIUS_RATIO = 0.42;
const INNER_START_ANGLE_DEG = -60;
const OUTER_START_ANGLE_DEG = -30;
const INNER_SLOTS = 4;
const OUTER_SLOTS = 6;
const INNER_NODE = 68;
const OUTER_NODE = 54;

type Positioned = {
  person: CirclePerson;
  // Pixel offset from container center.
  x: number;
  y: number;
  size: number;
};

function layoutRing(
  people: CirclePerson[],
  containerSize: number,
): { ringed: Positioned[]; overflow: CirclePerson[] } {
  const ringed: Positioned[] = [];
  const cx = containerSize / 2;
  const cy = containerSize / 2;
  const inner = people.slice(0, INNER_SLOTS);
  const outer = people.slice(INNER_SLOTS, INNER_SLOTS + OUTER_SLOTS);
  const rest = people.slice(INNER_SLOTS + OUTER_SLOTS);

  inner.forEach((person, i) => {
    const angle =
      ((INNER_START_ANGLE_DEG + (i * 360) / INNER_SLOTS) * Math.PI) / 180;
    const r = containerSize * INNER_RADIUS_RATIO;
    ringed.push({
      person,
      x: cx + r * Math.cos(angle) - INNER_NODE / 2,
      y: cy + r * Math.sin(angle) - INNER_NODE / 2,
      size: INNER_NODE,
    });
  });

  outer.forEach((person, i) => {
    const angle =
      ((OUTER_START_ANGLE_DEG + (i * 360) / OUTER_SLOTS) * Math.PI) / 180;
    const r = containerSize * OUTER_RADIUS_RATIO;
    ringed.push({
      person,
      x: cx + r * Math.cos(angle) - OUTER_NODE / 2,
      y: cy + r * Math.sin(angle) - OUTER_NODE / 2,
      size: OUTER_NODE,
    });
  });

  return { ringed, overflow: rest };
}

export default function RingView({ people, onAddConnection }: Props) {
  // Square container — width sets the geometry. We let CSS size it fluidly
  // (max 560px) and then compute offsets off that same value at render time
  // via inline style % since the geometry only cares about ratios.
  const containerSize = 560;
  const { ringed, overflow } = layoutRing(people, containerSize);

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="relative mx-auto"
        style={{
          width: `min(100%, ${containerSize}px)`,
          aspectRatio: "1 / 1",
        }}
      >
        {/* Faint guide rings */}
        <div
          className="absolute rounded-full border border-[#2C2C2C]/15"
          style={{
            left: `${50 - INNER_RADIUS_RATIO * 100}%`,
            top: `${50 - INNER_RADIUS_RATIO * 100}%`,
            width: `${INNER_RADIUS_RATIO * 200}%`,
            height: `${INNER_RADIUS_RATIO * 200}%`,
          }}
        />
        <div
          className="absolute rounded-full border border-[#2C2C2C]/15"
          style={{
            left: `${50 - OUTER_RADIUS_RATIO * 100}%`,
            top: `${50 - OUTER_RADIUS_RATIO * 100}%`,
            width: `${OUTER_RADIUS_RATIO * 200}%`,
            height: `${OUTER_RADIUS_RATIO * 200}%`,
          }}
        />

        {/* Center "+" */}
        <button
          type="button"
          onClick={onAddConnection}
          aria-label="Add connection"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[45px] h-[45px] rounded-full bg-primary-orange text-white flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)] hover:opacity-90 transition-opacity"
        >
          <PlusIcon width={18} height={18} strokeWidth={2} />
        </button>

        {/* Ring nodes */}
        {ringed.map(({ person, x, y, size }) => (
          <RingNode
            key={person._id}
            person={person}
            x={x}
            y={y}
            containerSize={containerSize}
            size={size}
          />
        ))}
      </div>

      {/* Overflow row — below the rings, left-aligned */}
      {overflow.length > 0 && (
        <div className="mt-[16px] md:mt-[24px] flex flex-wrap items-start justify-center gap-x-[20px] gap-y-[18px] max-w-[560px]">
          {overflow.map((person) => (
            <OverflowNode key={person._id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}

function RingNode({
  person,
  x,
  y,
  containerSize,
  size,
}: {
  person: CirclePerson;
  x: number;
  y: number;
  containerSize: number;
  size: number;
}) {
  // Position stored as % of container so the layout scales with CSS size.
  const leftPct = (x / containerSize) * 100;
  const topPct = (y / containerSize) * 100;
  const widthPct = (size / containerSize) * 100;

  return (
    <Link
      href={`/circle/person/${person._id}`}
      className="absolute flex flex-col items-center"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, width: `${widthPct}%` }}
    >
      <div
        className="rounded-full overflow-hidden ring-2 ring-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] bg-primary-blue/10"
        style={{ width: "100%", aspectRatio: "1 / 1" }}
      >
        <Avatar
          user={{
            firstName: person.firstName,
            profilePicture: person.profilePicture,
            updatedAt: person.updatedAt,
          }}
          size={size}
          className="!w-full !h-full"
        />
      </div>
      <span
        className="mt-[4px] font-montserrat text-[#2C2C2C] text-[11px] md:text-[12px] whitespace-nowrap"
        style={{ fontSize: size <= 54 ? 11 : 12 }}
      >
        {person.firstName}
      </span>
    </Link>
  );
}

function OverflowNode({ person }: { person: CirclePerson }) {
  return (
    <Link
      href={`/circle/person/${person._id}`}
      className="flex flex-col items-center w-[54px]"
    >
      <Avatar
        user={{
          firstName: person.firstName,
          profilePicture: person.profilePicture,
          updatedAt: person.updatedAt,
        }}
        size={54}
      />
      <span className="mt-[4px] font-montserrat text-[#2C2C2C] text-[11px] whitespace-nowrap">
        {person.firstName}
      </span>
    </Link>
  );
}
