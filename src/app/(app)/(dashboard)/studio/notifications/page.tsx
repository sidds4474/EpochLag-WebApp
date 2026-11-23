"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fetchFeatureUpdatesSettings,
  updateFeatureUpdatesSettings,
} from "../../../../../lib/notifications/api";
import { ChevronLeftIcon } from "../../icons";

const KEY = "featureUpdatesNotifications";

// Studio-owned notification preferences screen. Same data wiring as
// /settings/notifications — toggles here and toggles there mirror each
// other because both call the same fetch / update helpers.
export default function StudioNotificationsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeatureUpdatesSettings()
      .then((s) => {
        const v = s[KEY];
        setEnabled(typeof v === "boolean" ? v : false);
      })
      .catch(() => {
        setEnabled(false);
      });
  }, []);

  async function handleToggle() {
    if (enabled === null) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const res = await updateFeatureUpdatesSettings({ [KEY]: next });
      const confirmed = res[KEY];
      if (typeof confirmed === "boolean" && confirmed !== next) {
        setEnabled(confirmed);
      }
    } catch (err) {
      setEnabled(!next);
      const msg =
        (err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : undefined) || "Couldn't update preference. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[32px] pt-[16px] max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0">
        {/* Header: back + Notifications title */}
        <div className="flex items-center gap-[12px] mb-[16px] md:mb-[20px]">
          <Link
            href="/studio"
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
          <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
            Notifications
          </h1>
        </div>

        {/* Toggle card */}
        <div className="max-w-[560px]">
          <div className="bg-[#E8E6DF] rounded-[14px] px-[16px] py-[2px]">
            <div className="flex items-center gap-[14px] py-[14px]">
              <span className="flex-1 min-w-0 font-montserrat text-[#232323] text-[14px] md:text-[15px]">
                Feature Update
              </span>
              {enabled === null ? (
                <span className="w-[44px] h-[26px] rounded-full bg-black/10 animate-pulse" />
              ) : (
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={saving}
                  role="switch"
                  aria-checked={enabled}
                  className={`cursor-pointer relative w-[44px] h-[26px] rounded-full transition-colors ${
                    enabled ? "bg-primary-orange" : "bg-black/15"
                  } disabled:opacity-70`}
                >
                  <span
                    className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-all ${
                      enabled ? "left-[21px]" : "left-[3px]"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
