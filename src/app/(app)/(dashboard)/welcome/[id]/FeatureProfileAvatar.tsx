"use client";

import { useAuth } from "../../../../../lib/auth/AuthProvider";
import Avatar from "../../../../../components/Avatar";

export default function FeatureProfileAvatar() {
  const { user } = useAuth();
  return (
    <div className="shrink-0 rounded-full border-[2px] border-white overflow-hidden">
      <Avatar user={user} size={36} isSelf />
    </div>
  );
}
