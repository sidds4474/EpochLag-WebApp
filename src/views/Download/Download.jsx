"use client";

import { useEffect } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../utils/storeLinks";

const Download = () => {
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) {
      window.location.href = PLAY_STORE_URL;
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      window.location.href = APP_STORE_URL;
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-warm-cream">
      <p className="text-primary-blue font-montserrat text-[16px]">
        Redirecting to the store...
      </p>
    </div>
  );
};

export default Download;
