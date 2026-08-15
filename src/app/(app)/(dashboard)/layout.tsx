"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { fetchHomePeople } from "../../../lib/home/api";
import type { HomePeople } from "../../../types/home";
import AppDownloadBanner from "./AppDownloadBanner";
import BottomTabBar from "./BottomTabBar";
import Header from "./Header";
import Sidebar from "./Sidebar";
import TabletDrawer from "./TabletDrawer";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [people, setPeople] = useState<HomePeople | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    fetchHomePeople()
      .then((res) => {
        if (!cancelled) setPeople(res);
      })
      .catch(() => {
        if (!cancelled) setPeople({ users: [], groups: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="h-screen w-full bg-white flex overflow-hidden">
        <Sidebar people={people} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <AppDownloadBanner />
          <Header
            user={user}
            onOpenDrawer={() => setDrawerOpen(true)}
          />
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden pb-[80px] md:pb-0">
            {children}
          </main>
        </div>
        <BottomTabBar user={user} />
        <TabletDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          user={user}
        />
      </div>
    </APIProvider>
  );
}
