"use client";

// Family Tree — 5 genealogical rows + SVG connectors + AlsoInYourFamily list.
// Taps on nodes open the NodeActionCard; the header "+" and scoped edge
// adders open the AddMemberForm. Node visuals cover all four states
// (LINKED, ACCOUNT_PENDING, GHOST_INVITED, GHOST).

import { useEffect, useMemo, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import Avatar from "../../../../components/Avatar";
import type { User } from "../../../../types/user";
import {
  buildTreeRows,
  getFamilyPersonState,
  relationshipLabel,
  type PersonState,
} from "./familyTree";
import {
  fetchFamilyTree,
  type FamilyTreePerson,
} from "../../../../lib/circle/api";
import AddMemberForm from "./AddMemberForm";
import NodeActionCard from "./NodeActionCard";

const NODE_SIZE = 56;

type Props = {
  people: FamilyTreePerson[];
  currentUser: User | null;
};

type AddFormState = {
  open: boolean;
  initial: FamilyTreePerson | null;
  targetName: string | null;
  presetSlug: string | null;
  allowedSlugs?: string[];
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function FamilyTreeView({ people, currentUser }: Props) {
  const isMobile = useIsMobile();
  const [localPeople, setLocalPeople] = useState<FamilyTreePerson[]>(people);
  useEffect(() => {
    setLocalPeople(people);
  }, [people]);

  const me: FamilyTreePerson = {
    _id: currentUser?._id || "me",
    name: currentUser?.firstName || "Me",
    relationshipSlug: null,
    profilePicture: currentUser?.profilePicture ?? null,
    isMe: true,
    isOnApp: true,
    isLinked: true,
  };
  const rows = buildTreeRows(localPeople, me);

  const [cardPerson, setCardPerson] = useState<FamilyTreePerson | null>(null);
  const [addForm, setAddForm] = useState<AddFormState>({
    open: false,
    initial: null,
    targetName: null,
    presetSlug: null,
  });

  const treeUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of localPeople) {
      if (p.userId) ids.add(p.userId);
      if (p.accountUserId) ids.add(p.accountUserId);
      if (p.linkedUserId) ids.add(p.linkedUserId);
    }
    if (currentUser?._id) ids.add(currentUser._id);
    return ids;
  }, [localPeople, currentUser]);

  async function refetchTree() {
    try {
      const list = await fetchFamilyTree();
      setLocalPeople(list);
    } catch {
      /* keep local copy */
    }
  }

  function openAddFromHeader() {
    setAddForm({
      open: true,
      initial: null,
      targetName: null,
      presetSlug: null,
    });
  }

  function openNode(p: FamilyTreePerson) {
    if (p.isMe) return;
    setCardPerson(p);
  }

  const anyTree =
    rows.grandparents.length > 0 ||
    rows.parents.length > 0 ||
    rows.self.length > 1 || // self row always has Me; real content means > 1
    rows.children.length > 0 ||
    rows.grandchildren.length > 0;

  const tree = anyTree ? (
    <div className="flex flex-col items-center">
      <p className="font-montserrat text-[#848484] text-[12px] md:text-[13px] mb-[12px]">
        Click on a person to add a relative
      </p>
      {rows.grandparents.length > 0 && (
        <Bucket>
          <Row people={rows.grandparents} overrideMe={null} onPick={openNode} />
        </Bucket>
      )}
      {rows.parents.length > 0 && (
        <PlainRow>
          <Row people={rows.parents} overrideMe={null} onPick={openNode} />
        </PlainRow>
      )}
      <Bucket>
        <Row people={rows.self} overrideMe={me} onPick={openNode} />
      </Bucket>
      {rows.children.length > 0 && (
        <PlainRow>
          <Row people={rows.children} overrideMe={null} onPick={openNode} />
        </PlainRow>
      )}
      {rows.grandchildren.length > 0 && (
        <Bucket>
          <Row people={rows.grandchildren} overrideMe={null} onPick={openNode} />
        </Bucket>
      )}
    </div>
  ) : (
    <EmptyState onAdd={openAddFromHeader} />
  );

  return (
    <div className="flex flex-col items-center">
      {anyTree && (
        <div className="w-full flex justify-end mb-[12px]">
          <button
            type="button"
            onClick={openAddFromHeader}
            className="inline-flex items-center gap-[6px] rounded-full bg-primary-orange text-white px-[14px] py-[8px] font-montserrat text-[13px] hover:opacity-90"
          >
            <span aria-hidden className="text-[16px] leading-none">+</span>
            Add family member
          </button>
        </div>
      )}
      {isMobile ? (
        // Mobile: wrap the tree in a pinch-zoom + pan container. Desktop
        // doesn't need gestures — rooms are wide enough to show the full tree.
        <div className="w-full h-[60vh] max-h-[500px] min-h-[360px] overflow-hidden rounded-[16px] bg-[#EFEDE5]/40">
          <TransformWrapper
            minScale={0.75}
            maxScale={2}
            initialScale={1}
            centerOnInit
            doubleClick={{ mode: "reset" }}
            wheel={{ step: 0.05 }}
            // `step` here controls how aggressively a pinch gesture changes
            // the scale — lower = less sensitive. Default is ~5 which feels
            // like a zoom lurch on phone.
            pinch={{ step: 1 }}
            panning={{ velocityDisabled: true }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {tree}
            </TransformComponent>
          </TransformWrapper>
        </div>
      ) : (
        tree
      )}

      {rows.unmapped.length > 0 && (
        <AlsoInYourFamily people={rows.unmapped} onPick={openNode} />
      )}

      <NodeActionCard
        open={!!cardPerson}
        person={cardPerson}
        onClose={() => setCardPerson(null)}
        onRemoved={(id) => {
          setLocalPeople((prev) => prev.filter((p) => p._id !== id));
          setCardPerson(null);
        }}
        onEdit={(p) => {
          setCardPerson(null);
          setAddForm({
            open: true,
            initial: p,
            targetName: null,
            presetSlug: null,
          });
        }}
        onAddRelative={(p) => {
          setCardPerson(null);
          setAddForm({
            open: true,
            initial: null,
            targetName: p.name,
            presetSlug: null,
          });
        }}
      />

      <AddMemberForm
        open={addForm.open}
        initial={addForm.initial}
        targetName={addForm.targetName}
        presetSlug={addForm.presetSlug}
        allowedSlugs={addForm.allowedSlugs}
        treeUserIds={treeUserIds}
        onClose={() =>
          setAddForm({
            open: false,
            initial: null,
            targetName: null,
            presetSlug: null,
          })
        }
        onSaved={() => {
          refetchTree();
        }}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-[48px] max-w-[360px]">
      <h3 className="font-ivy text-[#2C2C2C] text-[22px]">
        Start your family tree
      </h3>
      <p className="mt-[8px] font-montserrat text-[#848484] text-[14px]">
        Add your parents, siblings, kids — everyone who makes up your family
        story.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-[20px] inline-flex items-center gap-[6px] rounded-full bg-primary-orange text-white px-[18px] py-[10px] font-montserrat text-[13px] hover:opacity-90"
      >
        <span aria-hidden className="text-[16px] leading-none">+</span>
        Add family member
      </button>
    </div>
  );
}

function Bucket({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] px-[24px] py-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}

function PlainRow({ children }: { children: React.ReactNode }) {
  return <div className="py-[18px]">{children}</div>;
}

function Row({
  people,
  overrideMe,
  onPick,
}: {
  people: FamilyTreePerson[];
  overrideMe: FamilyTreePerson | null;
  onPick: (p: FamilyTreePerson) => void;
}) {
  return (
    <div className="flex items-start justify-center gap-[20px] md:gap-[28px]">
      {people.map((p) => (
        <Node
          key={p._id}
          person={p}
          forceMe={overrideMe?._id === p._id}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function Node({
  person,
  forceMe,
  onPick,
}: {
  person: FamilyTreePerson;
  forceMe: boolean;
  onPick: (p: FamilyTreePerson) => void;
}) {
  const state = forceMe ? ("LINKED" as PersonState) : getFamilyPersonState(person);
  const label = forceMe ? "" : relationshipLabel(person);
  const name = forceMe ? "Me" : person.name;
  const inert = forceMe || person.isMe;

  const content = (
    <>
      <NodeAvatar person={person} state={state} />
      <p className="mt-[6px] font-ivy text-[#2C2C2C] text-[13px] md:text-[14px] text-center leading-tight max-w-[88px] truncate">
        {name}
      </p>
      {label && (
        <p className="font-montserrat text-[#848484] text-[11px] md:text-[12px] text-center leading-tight">
          {label}
        </p>
      )}
    </>
  );

  if (inert) {
    return (
      <div className="flex flex-col items-center min-w-[64px]">{content}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick(person)}
      className="flex flex-col items-center min-w-[64px] cursor-pointer focus:outline-none"
    >
      {content}
    </button>
  );
}

function NodeAvatar({
  person,
  state,
}: {
  person: FamilyTreePerson;
  state: PersonState;
}) {
  // Ring color per state. LINKED: solid gray. ACCOUNT_PENDING: dashed navy.
  // GHOST/GHOST_INVITED: dashed orange. The Avatar component handles the
  // colored-bg + initial fallback for everyone — matches how avatars render
  // elsewhere in the app so the tree feels consistent.
  const ringClass = (() => {
    switch (state) {
      case "LINKED":
        return "ring-[2px] ring-[#A5A5A5]";
      case "ACCOUNT_PENDING":
        return "border-[2px] border-dashed border-[#092E4A]";
      default:
        return "border-[2px] border-dashed border-primary-orange";
    }
  })();

  return (
    <div className="relative">
      <div
        className={`rounded-full overflow-hidden ${ringClass}`}
        style={{ width: NODE_SIZE, height: NODE_SIZE }}
      >
        <Avatar
          user={{
            firstName: person.name,
            profilePicture: person.profilePicture ?? null,
          }}
          size={NODE_SIZE}
          className="!w-full !h-full"
        />
      </div>
      {state === "ACCOUNT_PENDING" && <StatePill text="Pending" color="#092E4A" />}
      {state === "GHOST_INVITED" && (
        <StatePill text="Invited" color="var(--color-primary-orange, #EF9849)" />
      )}
    </div>
  );
}

function StatePill({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 text-white font-montserrat text-[9px] uppercase tracking-[0.04em] rounded-full px-[6px] py-[1px]"
      style={{ backgroundColor: color }}
    >
      {text}
    </span>
  );
}

function AlsoInYourFamily({
  people,
  onPick,
}: {
  people: FamilyTreePerson[];
  onPick: (p: FamilyTreePerson) => void;
}) {
  return (
    <section className="w-full max-w-[560px] mt-[40px]">
      <h3 className="font-ivy text-[#2C2C2C] text-[18px] md:text-[20px]">
        Also in your family
      </h3>
      <ul className="mt-[12px]">
        {people.map((p, i) => (
          <li key={p._id}>
            <button
              type="button"
              onClick={() => onPick(p)}
              className={`w-full flex items-center gap-[12px] py-[12px] text-left hover:bg-black/[0.02] transition-colors ${
                i !== people.length - 1 ? "border-b border-[#C9C9C9]/60" : ""
              }`}
            >
              <div
                className="w-[40px] h-[40px] rounded-full overflow-hidden ring-[1.5px] ring-[#A5A5A5]"
                style={{ width: 40, height: 40 }}
              >
                <Avatar
                  user={{
                    firstName: p.name,
                    profilePicture: p.profilePicture ?? null,
                  }}
                  size={40}
                  className="!w-full !h-full"
                />
              </div>
              <div className="flex-1 min-w-0 leading-tight">
                <p className="font-ivy text-[#2C2C2C] text-[15px] truncate">
                  {p.name}
                </p>
                {p.relationshipSlug && (
                  <p className="font-montserrat text-[#848484] text-[12px] truncate">
                    {p.relationshipSlug}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

