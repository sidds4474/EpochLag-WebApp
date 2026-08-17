import { useSyncExternalStore } from "react";
import type {
  Moment,
  MomentFilter,
  MomentOptions,
} from "../../types/moment";
import {
  createMomentJson,
  createMomentMultipart,
  deleteMoment as apiDeleteMoment,
  fetchCountdown,
  fetchMomentOptions,
  fetchMoments,
  inviteToMoment,
  leaveMoment as apiLeaveMoment,
  patchMomentJson,
  patchMomentMultipart,
  pinCountdown,
  removeParticipant as apiRemoveParticipant,
  respondToInvite,
  unpinCountdown,
  type CreateMomentJsonBody,
} from "./api";

// ---- state shape ---------------------------------------------------------

type FilterMap<T> = Record<MomentFilter, T>;

type State = {
  byFilter: FilterMap<Moment[] | null>;
  loadingByFilter: FilterMap<boolean>;
  countdown: Moment[] | null;
  countdownLoading: boolean;
  options: MomentOptions | null;
  loadedAt: number;
};

let state: State = {
  byFilter: { upcoming: null, past: null, all: null },
  loadingByFilter: { upcoming: false, past: false, all: false },
  countdown: null,
  countdownLoading: false,
  options: null,
  loadedAt: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): State {
  return state;
}

export function useMomentsState(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---- helpers -------------------------------------------------------------

function idOf(m: Moment): string {
  return m._id || m.id || "";
}

function replaceInList(list: Moment[] | null, updated: Moment): Moment[] | null {
  if (!list) return list;
  const id = idOf(updated);
  const idx = list.findIndex((m) => idOf(m) === id);
  if (idx === -1) return list;
  const next = list.slice();
  // OVERLAY — preserve fields the PATCH response omits (e.g. `role`).
  next[idx] = { ...list[idx], ...updated };
  return next;
}

function removeFromList(list: Moment[] | null, id: string): Moment[] | null {
  if (!list) return list;
  return list.filter((m) => idOf(m) !== id);
}

function prependToList(list: Moment[] | null, m: Moment): Moment[] | null {
  if (!list) return [m];
  if (list.some((x) => idOf(x) === idOf(m))) return list;
  return [m, ...list];
}

function applyToAllCaches(fn: (list: Moment[] | null) => Moment[] | null) {
  const byFilter = {
    upcoming: fn(state.byFilter.upcoming),
    past: fn(state.byFilter.past),
    all: fn(state.byFilter.all),
  };
  const countdown = state.countdown ? fn(state.countdown) : state.countdown;
  setState({ byFilter, countdown });
}

// ---- lifecycle -----------------------------------------------------------

const FRESHNESS_MS = 5 * 60_000;
let hydrationPromise: Promise<void> | null = null;

export function hydrate(force = false): Promise<void> {
  if (hydrationPromise && !force) return hydrationPromise;
  const stale = force || Date.now() - state.loadedAt > FRESHNESS_MS;
  if (!stale && state.byFilter.upcoming && state.byFilter.past && state.countdown) {
    return Promise.resolve();
  }

  setState({
    loadingByFilter: { upcoming: true, past: true, all: state.loadingByFilter.all },
    countdownLoading: true,
  });

  hydrationPromise = Promise.allSettled([
    fetchMoments("upcoming"),
    fetchMoments("past"),
    fetchCountdown(),
    state.options ? Promise.resolve(state.options) : fetchMomentOptions(),
  ])
    .then(([upcomingRes, pastRes, countdownRes, optionsRes]) => {
      setState({
        byFilter: {
          upcoming:
            upcomingRes.status === "fulfilled"
              ? upcomingRes.value
              : state.byFilter.upcoming ?? [],
          past:
            pastRes.status === "fulfilled"
              ? pastRes.value
              : state.byFilter.past ?? [],
          all: state.byFilter.all,
        },
        loadingByFilter: { upcoming: false, past: false, all: false },
        countdown:
          countdownRes.status === "fulfilled"
            ? countdownRes.value
            : state.countdown ?? [],
        countdownLoading: false,
        options:
          optionsRes.status === "fulfilled" ? optionsRes.value : state.options,
        loadedAt: Date.now(),
      });
    })
    .finally(() => {
      hydrationPromise = null;
    });

  return hydrationPromise;
}

export async function refreshCountdown(): Promise<void> {
  setState({ countdownLoading: true });
  try {
    const list = await fetchCountdown();
    setState({ countdown: list, countdownLoading: false });
  } catch {
    setState({ countdownLoading: false });
  }
}

// ---- optimistic mutations ------------------------------------------------

export function addMomentLocal(m: Moment) {
  // BE sometimes returns id without _id; normalize so the React key that
  // reads m._id is always populated.
  const normalized: Moment = m._id ? m : { ...m, _id: idOf(m) };
  setState({
    byFilter: {
      upcoming: prependToList(state.byFilter.upcoming, normalized),
      past: state.byFilter.past,
      all: prependToList(state.byFilter.all, normalized),
    },
  });
}

export function updateMomentLocal(updated: Moment) {
  applyToAllCaches((list) => replaceInList(list, updated));
}

export function removeMomentLocal(id: string) {
  applyToAllCaches((list) => removeFromList(list, id));
}

// ---- write ops -----------------------------------------------------------

export async function createMoment(args: {
  json?: CreateMomentJsonBody;
  form?: FormData;
  taggedUserIds?: string[];
  sendInvites?: boolean;
  pinToCountdown?: boolean;
}): Promise<Moment> {
  const moment = args.form
    ? await createMomentMultipart(args.form)
    : await createMomentJson(args.json!);

  addMomentLocal(moment);

  if (args.pinToCountdown) {
    try {
      await pinCountdown(idOf(moment));
      await refreshCountdown();
    } catch {
      // swallow — user can retry from detail view
    }
  }

  if (args.sendInvites && args.taggedUserIds && args.taggedUserIds.length > 0) {
    await Promise.allSettled(
      args.taggedUserIds.map((id) => inviteToMoment(idOf(moment), id))
    );
  }

  return moment;
}

export async function updateMoment(args: {
  id: string;
  original: Moment;
  json?: Partial<CreateMomentJsonBody>;
  form?: FormData;
  newInviteeIds?: string[];
}): Promise<Moment> {
  const updated = args.form
    ? await patchMomentMultipart(args.id, args.form)
    : await patchMomentJson(args.id, args.json ?? {});

  // Overlay onto original to preserve computed fields (role).
  const merged: Moment = { ...args.original, ...updated };
  updateMomentLocal(merged);

  if (args.newInviteeIds && args.newInviteeIds.length > 0) {
    await Promise.allSettled(
      args.newInviteeIds.map((id) => inviteToMoment(args.id, id))
    );
  }

  return merged;
}

export async function deleteMomentAction(id: string): Promise<void> {
  await apiDeleteMoment(id);
  removeMomentLocal(id);
}

export async function leaveMomentAction(id: string): Promise<void> {
  await apiLeaveMoment(id);
  removeMomentLocal(id);
}

export async function togglePin(m: Moment, pin: boolean): Promise<void> {
  const id = idOf(m);
  // optimistic
  if (pin) {
    setState({
      countdown: state.countdown ? prependToList(state.countdown, m) : [m],
    });
  } else {
    setState({
      countdown: state.countdown ? removeFromList(state.countdown, id) : null,
    });
  }
  try {
    if (pin) await pinCountdown(id);
    else await unpinCountdown(id);
    await refreshCountdown();
  } catch (e) {
    // rollback
    if (pin) {
      setState({
        countdown: state.countdown ? removeFromList(state.countdown, id) : null,
      });
    } else {
      setState({
        countdown: state.countdown ? prependToList(state.countdown, m) : [m],
      });
    }
    throw e;
  }
}

export async function respondToInviteAction(
  id: string,
  response: "accepted" | "declined"
): Promise<Moment | null> {
  const m = await respondToInvite(id, response);
  if (response === "accepted" && m) {
    addMomentLocal(m);
  }
  return m;
}

export async function removeParticipantAction(
  momentId: string,
  userId: string,
  original: Moment
): Promise<void> {
  const nextParticipants = await apiRemoveParticipant(momentId, userId);
  updateMomentLocal({ ...original, participants: nextParticipants });
}

export function isPinned(id: string): boolean {
  if (!state.countdown) return false;
  return state.countdown.some((m) => idOf(m) === id);
}
