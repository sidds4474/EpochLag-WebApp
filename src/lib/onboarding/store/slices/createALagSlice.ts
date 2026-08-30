import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Audio = { mediaId: string; uri: string; duration: number };
export type Video = { mediaId: string; uri: string; posterUri: string | null };
export type ExtraImage = { mediaId: string; uri: string };

export type Participant = {
  id: string;
  name: string;
  relationship: string; // slug: mom | dad | sibling | ...
  userId?: string | null; // set when a suggested friend was tapped
};

export type LagLocation = {
  city: string | null;
  country: string | null;
  formattedAddress: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type CreateALagState = {
  coverUri: string | null;
  coverMediaId: string | null;
  textBody: string;
  audios: Audio[];
  videos: Video[];
  extraImages: ExtraImage[];

  date: string | null; // ISO
  location: LagLocation | null;
  placeUnknown: boolean;

  // Analytics flags — did initial value come from EXIF?
  dateOfStoryFromExif: boolean;
  locationFromExif: boolean;

  participants: Participant[];

  // Authed-path BE draft ids. Only set post-signup or authed home entry.
  storyId: string | null;
  storyPromptId: string | null;
};

const initialState: CreateALagState = {
  coverUri: null,
  coverMediaId: null,
  textBody: "",
  audios: [],
  videos: [],
  extraImages: [],
  date: null,
  location: null,
  placeUnknown: false,
  dateOfStoryFromExif: false,
  locationFromExif: false,
  participants: [],
  storyId: null,
  storyPromptId: null,
};

const createALagSlice = createSlice({
  name: "createALag",
  initialState,
  reducers: {
    setCoverUri: (
      state,
      action: PayloadAction<{ uri: string | null; mediaId?: string | null } | null>
    ) => {
      if (!action.payload) {
        state.coverUri = null;
        state.coverMediaId = null;
        return;
      }
      state.coverUri = action.payload.uri;
      if (action.payload.mediaId !== undefined) {
        state.coverMediaId = action.payload.mediaId;
      }
    },
    setTextBody: (state, action: PayloadAction<string>) => {
      state.textBody = action.payload;
    },

    addAudio: (state, action: PayloadAction<Audio>) => {
      state.audios.push(action.payload);
    },
    removeAudio: (state, action: PayloadAction<string>) => {
      state.audios = state.audios.filter((a) => a.mediaId !== action.payload);
    },

    addVideo: (state, action: PayloadAction<Video>) => {
      state.videos.push(action.payload);
    },
    removeVideoByMediaId: (state, action: PayloadAction<string>) => {
      state.videos = state.videos.filter((v) => v.mediaId !== action.payload);
    },

    addExtraImages: (state, action: PayloadAction<ExtraImage[]>) => {
      state.extraImages.push(...action.payload);
    },
    removeExtraImageByMediaId: (state, action: PayloadAction<string>) => {
      state.extraImages = state.extraImages.filter(
        (i) => i.mediaId !== action.payload
      );
    },

    setDate: (state, action: PayloadAction<string | null>) => {
      state.date = action.payload;
    },
    setLocation: (state, action: PayloadAction<LagLocation | null>) => {
      state.location = action.payload;
    },
    setPlaceUnknown: (state, action: PayloadAction<boolean>) => {
      state.placeUnknown = action.payload;
    },
    setDateOfStoryFromExif: (state, action: PayloadAction<boolean>) => {
      state.dateOfStoryFromExif = action.payload;
    },
    setLocationFromExif: (state, action: PayloadAction<boolean>) => {
      state.locationFromExif = action.payload;
    },

    addParticipant: (state, action: PayloadAction<Participant>) => {
      state.participants.push(action.payload);
    },
    removeParticipant: (state, action: PayloadAction<string>) => {
      state.participants = state.participants.filter((p) => p.id !== action.payload);
    },
    setParticipants: (state, action: PayloadAction<Participant[]>) => {
      state.participants = action.payload;
    },
    updateParticipantName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const p = state.participants.find((x) => x.id === action.payload.id);
      if (p) p.name = action.payload.name;
    },

    setStoryDraftIds: (
      state,
      action: PayloadAction<{ storyId: string | null; storyPromptId: string | null }>
    ) => {
      state.storyId = action.payload.storyId;
      state.storyPromptId = action.payload.storyPromptId;
    },

    // Rebuild state from server draft response (see spec §Screen 4 hydrate).
    hydrateFromServerDraft: (
      state,
      action: PayloadAction<{
        content?: string;
        media?: Array<{
          _id?: string;
          type?: string;
          url?: string;
          thumbnailUrl?: string | null;
          providerPublicId?: string;
        }>;
        dateOfStory?: string | null;
        location?: LagLocation | null;
        taggedPeople?: Array<{ name?: string; relationshipSlug?: string; userId?: string | null }>;
      }>
    ) => {
      const p = action.payload;

      if (typeof p.content === "string") state.textBody = p.content;
      if (p.dateOfStory) state.date = p.dateOfStory;
      if (p.location) state.location = p.location;

      if (Array.isArray(p.taggedPeople)) {
        state.participants = p.taggedPeople
          .filter((t) => t && t.name && t.relationshipSlug)
          .map((t, i) => ({
            id: `srv_${i}_${t.name}`,
            name: t.name as string,
            relationship: t.relationshipSlug as string,
            userId: t.userId ?? null,
          }));
      }

      if (Array.isArray(p.media)) {
        const nextVideos: Video[] = [];
        const nextImages: ExtraImage[] = [];
        const nextAudios: Audio[] = [];
        let coverAssigned = false;

        for (const m of p.media) {
          if (!m.url) continue;
          const providerId = (m.providerPublicId || "")
            .replace(/_/g, "")
            .toLowerCase();
          const isCover = m.type === "image" && providerId.includes("cover");

          if (isCover && !coverAssigned) {
            state.coverUri = m.url;
            state.coverMediaId = m._id || null;
            coverAssigned = true;
            continue;
          }

          if (m.type === "video") {
            nextVideos.push({
              mediaId: m._id || `srv_${nextVideos.length}`,
              uri: m.url,
              posterUri: m.thumbnailUrl || null,
            });
          } else if (m.type === "image") {
            nextImages.push({
              mediaId: m._id || `srv_${nextImages.length}`,
              uri: m.url,
            });
          } else if (m.type === "audio") {
            nextAudios.push({
              mediaId: m._id || `srv_${nextAudios.length}`,
              uri: m.url,
              duration: 0, // BE doesn't return duration; UI recomputes on load
            });
          }
        }

        state.videos = nextVideos;
        state.extraImages = nextImages;
        state.audios = nextAudios;
      }
    },

    resetCreateALag: () => initialState,
  },
});

export const {
  setCoverUri,
  setTextBody,
  addAudio,
  removeAudio,
  addVideo,
  removeVideoByMediaId,
  addExtraImages,
  removeExtraImageByMediaId,
  setDate,
  setLocation,
  setPlaceUnknown,
  setDateOfStoryFromExif,
  setLocationFromExif,
  addParticipant,
  removeParticipant,
  setParticipants,
  updateParticipantName,
  setStoryDraftIds,
  hydrateFromServerDraft,
  resetCreateALag,
} = createALagSlice.actions;

export default createALagSlice.reducer;
