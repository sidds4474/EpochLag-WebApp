"use client";

import { useAuth } from "../../../../../lib/auth/AuthProvider";

export default function FeatureProfileAvatar() {
  const { user } = useAuth();
  const initial = (user?.firstName || "?").charAt(0).toUpperCase();

  return (
    <div className="shrink-0 w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white flex items-center justify-center">
      {user?.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profilePicture}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-montserrat font-semibold text-primary-blue text-[13px]">
          {initial}
        </span>
      )}
    </div>
  );
}
