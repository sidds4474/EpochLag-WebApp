"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { fetchHomePeople, fetchNotifications } from "../../../lib/home/api";
import type { HomePeople } from "../../../types/home";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [people, setPeople] = useState<HomePeople | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    Promise.allSettled([fetchHomePeople(), fetchNotifications()]).then(
      ([peopleRes, notifRes]) => {
        if (cancelled) return;
        if (peopleRes.status === "fulfilled") setPeople(peopleRes.value);
        else setPeople({ users: [], groups: [] });
        if (notifRes.status === "fulfilled")
          setUnreadCount(notifRes.value.unreadCount);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="min-h-screen w-full bg-white flex">
      <Sidebar people={people} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} unreadCount={unreadCount} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
