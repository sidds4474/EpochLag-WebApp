import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Stashed on SelectFriendsScreen. Flushed after trial start
// (see FreeTrialOnboarding spec §Phase D).

export type PendingFriendRequestsState = {
  userIds: string[];
};

const initialState: PendingFriendRequestsState = {
  userIds: [],
};

const pendingFriendRequestsSlice = createSlice({
  name: "pendingFriendRequests",
  initialState,
  reducers: {
    setPendingFriendRequests: (state, action: PayloadAction<string[]>) => {
      state.userIds = Array.from(new Set(action.payload));
    },
    clearPendingFriendRequests: () => initialState,
  },
});

export const { setPendingFriendRequests, clearPendingFriendRequests } =
  pendingFriendRequestsSlice.actions;

export default pendingFriendRequestsSlice.reducer;
