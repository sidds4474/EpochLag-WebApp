"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import AppDownloadBanner from "./AppDownloadBanner";
import BottomTabBar from "./BottomTabBar";
import Header from "./Header";
import Sidebar from "./Sidebar";
import TabletDrawer from "./TabletDrawer";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="h-screen w-full bg-white flex overflow-hidden">
        <Sidebar />
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
