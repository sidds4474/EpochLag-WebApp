"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { usePrefetchRoutes } from "../../../lib/nav/usePrefetchRoutes";
import AppDownloadBanner from "./AppDownloadBanner";
import BottomTabBar from "./BottomTabBar";
import Header from "./Header";
import Sidebar from "./Sidebar";
import TabletDrawer from "./TabletDrawer";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Static routes reachable from any dashboard screen via programmatic
// router.push (not <Link>). Warmed once at layout mount so the first
// tap doesn't stall on a cold bundle download. Sidebar / bottom-tab
// nav already prefetches via <Link>.
const COMMON_ROUTES = [
  "/new-story",
  "/new-lag",
  "/new-ask",
  "/settings",
  "/notifications",
  "/friends-and-family",
  "/friends",
  "/inspiration",
  "/why-epoch-lag",
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Immersive routes hide the bottom tab bar, so don't reserve room for it.
  const isImmersive =
    pathname.startsWith("/thread/") || pathname.startsWith("/group/new");
  // Circle person / group detail hides the mobile header so the hero cover
  // can stretch to the top of the viewport. Desktop still shows the header.
  const hideMobileHeader =
    /^\/circle\/person\/[^/]+$/.test(pathname) ||
    /^\/circle\/group\/[^/]+$/.test(pathname);

  usePrefetchRoutes(COMMON_ROUTES);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="h-svh w-full bg-white flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <AppDownloadBanner />
          <div className={hideMobileHeader ? "hidden md:block" : ""}>
            <Header
              user={user}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          </div>
          <main className={`flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden ${pathname.startsWith("/lags/places") ? "" : pathname.startsWith("/lags") || pathname.startsWith("/settings") ? "bg-[#f3f1eb]" : ""} ${isImmersive ? "" : "pb-[80px] md:pb-0"}`}>
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
