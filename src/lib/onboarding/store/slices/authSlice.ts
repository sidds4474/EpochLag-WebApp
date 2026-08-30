import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Two-flavor auth (Part 1, critical): `token` and `isAuthenticated` are
// tracked separately. During signup we have a token but must not swap into
// the main app until `setAuthenticated(true)` fires from OnboardingComplete
// (or postLoginSync for returning users).

export type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  signupInProgress: boolean;
};

const initialState: AuthState = {
  token: null,
  isAuthenticated: false,
  signupInProgress: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Temp-authed: token set, but auth stack stays up.
    saveTokenOnly: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = false;
    },
    // Full auth: returning-user login or OnboardingComplete tap.
    saveToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setSignupInProgress: (state, action: PayloadAction<boolean>) => {
      state.signupInProgress = action.payload;
    },
    resetAuth: () => initialState,
  },
});

export const {
  saveTokenOnly,
  saveToken,
  setAuthenticated,
  setSignupInProgress,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;
