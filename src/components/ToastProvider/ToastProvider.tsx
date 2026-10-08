"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      // Push toasts below the iOS status bar / notch. With the default ~16px
      // top offset, a top-center toast renders under the notch on iPhone/iPad
      // Safari and is invisible — so validation messages like "Choose a cover
      // image" looked like "nothing happened" on those devices.
      containerStyle={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
    />
  );
}
