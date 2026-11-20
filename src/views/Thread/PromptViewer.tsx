"use client";

// PromptViewer — prompt-centric hub. Renders:
//   - back arrow
//   - author row + "Read note" pill (inert for v1)
//   - serif prompt title
//   - polaroid cover (left on desktop, top on mobile)
//   - responders list (right on desktop, below polaroid on mobile)
//   - "+ Answer this question" CTA
//
// Rows route INTO the lag viewer at /thread/:tid/story/:sid. Multi-story
// expansion, 3-dot menu, read-note popover, meta chips, inspo variant and
// prompt-voice-pill are deferred to follow-up passes.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Avatar from "../../components/Avatar";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../../app/(app)/(dashboard)/icons";
import type {
  Story,
  StoryAuthor,
  ThreadParticipant,
  ThreadPromptAuthor,
  ThreadResponse,
} from "../../types/home";

type Props = {
  data: ThreadResponse;
};

type Responder = {
  key: string;
  author: StoryAuthor;
  stories: Story[];
  latest: Story | null;
};

export default function PromptViewer({ data }: Props) {
  const router = useRouter();
  const { thread, stories } = data;
  const prompt = thread.prompt;

  const promptAuthor =
    prompt?.author ??
    (thread.participants ?? []).find((p) => p.role === "author") ??
    null;
  console.log("[PromptViewer] prompt.author:", prompt?.author, "participants:", thread.participants);
  const promptAuthorName = fullName(promptAuthor);
  const promptTitle = (prompt?.content || prompt?.title || "").trim();
  const promptCover = prompt?.imageUrl || null;
  const hasNote = Boolean(prompt?.note && prompt.note.trim());

  const responders = useMemo(() => groupResponders(stories), [stories]);
  const unanswered = useMemo(
    () =>
      unansweredParticipants(
        thread.participants ?? [],
        responders.map((r) => r.key),
        promptAuthor?._id,
      ),
    [thread.participants, responders, promptAuthor?._id],
  );
  const answerHref = useMemo(() => {
    const promptId = prompt?._id || "";
    return promptId ? `/reply/${promptId}` : "/new-story";
  }, [prompt?._id]);

  return (
    <div className="mx-auto max-w-[1100px] px-[16px] sm:px-[24px] md:px-[40px] pt-[16px] md:pt-[20px] pb-[48px] md:pb-[64px]">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.03] transition-colors"
      >
        <ChevronLeftIcon width={18} height={18} />
      </button>

      {/* Author row */}
      <div className="mt-[24px] md:mt-[32px] flex items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[12px] min-w-0">
          <Avatar user={promptAuthor ?? undefined} size={44} />
          <div className="leading-tight min-w-0">
            <p className="font-montserrat font-semibold text-[#2C2C2C] text-[15px] md:text-[16px] truncate">
              {promptAuthorName || "Someone"}
            </p>
            <p className="font-montserrat text-[#848484] text-[12px] md:text-[13px]">
              Sent the prompt
            </p>
          </div>
        </div>
        {hasNote && (
          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-[6px] rounded-full border border-[#092E4A]/30 text-[#2C2C2C] px-[16px] py-[8px] font-montserrat text-[13px] md:text-[14px] hover:bg-black/[0.03] transition-colors"
          >
            Read note
          </button>
        )}
      </div>

      <div className="mt-[20px] border-t border-[#C9C9C9]/70" />

      {/* Serif title */}
      {promptTitle && (
        <h1 className="mt-[24px] md:mt-[28px] font-ivy font-normal text-[#2C2C2C] text-[28px] sm:text-[32px] md:text-[36px] leading-[1.15] max-w-[640px]">
          {promptTitle}
        </h1>
      )}

      {/* Two-column grid at md+: polaroid left, responders right */}
      <div className="mt-[24px] md:mt-[32px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[32px] md:gap-[48px] items-start">
        {/* Polaroid cover */}
        <div className="flex justify-center md:justify-start">
          <Polaroid src={promptCover} />
        </div>

        {/* Responders column */}
        <div className="min-w-0">
          <ul>
            {responders.map((r, i) => (
              <ResponderRow
                key={r.key}
                responder={r}
                threadId={thread._id}
                isLast={
                  i === responders.length - 1 && unanswered.length === 0
                }
              />
            ))}
            {unanswered.map((p, i) => (
              <UnansweredRow
                key={p._id}
                person={p}
                isLast={i === unanswered.length - 1}
              />
            ))}
          </ul>

          {responders.length === 0 && unanswered.length === 0 && (
            <p className="font-montserrat text-[#848484] text-[14px] py-[16px]">
              No responses yet.
            </p>
          )}

          <div className="mt-[20px]">
            <Link
              href={answerHref}
              className="w-full inline-flex items-center justify-center gap-[8px] bg-primary-orange text-white rounded-full px-[20px] py-[14px] font-montserrat text-[15px] md:text-[16px] hover:opacity-90 transition-opacity"
            >
              <span className="text-[18px] leading-none">+</span>
              Answer this question
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponderRow({
  responder,
  threadId,
  isLast,
}: {
  responder: Responder;
  threadId: string;
  isLast: boolean;
}) {
  const { author, latest } = responder;
  const name = fullName(author) || "Someone";
  const date = formatDate(latest?.createdAt);
  const isVoice = latest ? isVoiceStory(latest) : false;
  const cta = isVoice ? "Listen Now" : "Read Story";

  const content = (
    <div
      className={`flex items-center gap-[12px] py-[14px] ${!isLast ? "border-b border-[#C9C9C9]/60" : ""}`}
    >
      <Avatar user={author} size={36} />
      <div className="flex-1 min-w-0 leading-tight">
        <p className="font-ivy text-[#2C2C2C] text-[15px] md:text-[16px] truncate">
          {name}
        </p>
        {date && (
          <p className="font-montserrat text-[#848484] text-[12px]">{date}</p>
        )}
      </div>
      {latest && (
        <span className="shrink-0 inline-flex items-center gap-[4px] font-montserrat text-[#2C2C2C] text-[13px]">
          {cta}
          <ChevronRightIcon width={16} height={16} />
        </span>
      )}
    </div>
  );

  if (!latest) {
    return <li>{content}</li>;
  }
  return (
    <li>
      <Link
        href={`/thread/${threadId}/story/${latest._id}`}
        className="block hover:bg-black/[0.02] transition-colors rounded-[4px]"
      >
        {content}
      </Link>
    </li>
  );
}

function UnansweredRow({
  person,
  isLast,
}: {
  person: ThreadParticipant;
  isLast: boolean;
}) {
  const name = fullName(person) || "Someone";
  return (
    <li>
      <div
        className={`flex items-center gap-[12px] py-[14px] ${!isLast ? "border-b border-[#C9C9C9]/60" : ""}`}
      >
        <Avatar user={person} size={36} />
        <div className="flex-1 min-w-0 leading-tight">
          <p className="font-ivy text-[#2C2C2C] text-[15px] md:text-[16px] truncate">
            {name}
          </p>
        </div>
      </div>
    </li>
  );
}

function Polaroid({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div className="bg-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] p-[12px] pb-[18px] md:p-[14px] md:pb-[22px] w-full max-w-[380px] md:max-w-[440px] rotate-[-1.2deg]">
        <div className="aspect-square bg-black/5" />
      </div>
    );
  }
  return (
    <div className="bg-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] p-[12px] pb-[18px] md:p-[14px] md:pb-[22px] w-full max-w-[380px] md:max-w-[440px] rotate-[-1.2deg]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full aspect-square object-cover block"
      />
    </div>
  );
}

function fullName(
  a: StoryAuthor | ThreadPromptAuthor | null | undefined,
): string {
  if (!a) return "";
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
}

function groupResponders(stories: Story[]): Responder[] {
  const map = new Map<string, Responder>();
  for (const s of stories) {
    const a = s.author;
    if (!a?._id) continue;
    const existing = map.get(a._id);
    if (existing) {
      existing.stories.push(s);
    } else {
      map.set(a._id, {
        key: a._id,
        author: a,
        stories: [s],
        latest: null,
      });
    }
  }
  for (const r of map.values()) {
    r.stories.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );
    r.latest = r.stories[0] ?? null;
  }
  return Array.from(map.values()).sort((a, b) => {
    const at = new Date(a.latest?.createdAt || 0).getTime();
    const bt = new Date(b.latest?.createdAt || 0).getTime();
    return bt - at;
  });
}

function unansweredParticipants(
  participants: ThreadParticipant[],
  respondedIds: string[],
  promptAuthorId: string | undefined,
): ThreadParticipant[] {
  const responded = new Set(respondedIds);
  return participants.filter(
    (p) => p._id && !responded.has(p._id) && p._id !== promptAuthorId,
  );
}

function isVoiceStory(s: Story): boolean {
  const content = s.content || "";
  if (/<audio\b/i.test(content) && !/<text\b|<image\b|<video\b/i.test(content)) {
    return true;
  }
  const media = s.media || [];
  if (media.length > 0 && media.every((m) => m.type === "audio")) {
    return true;
  }
  return false;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
