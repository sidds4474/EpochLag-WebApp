"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Gradient4 from "../../../../../assets/images/gradients/4.jpg";
import HeroBanner from "../HeroBanner";
import PanelMobileHeader from "../PanelMobileHeader";
import {
  fetchFeatureUpdatesSettings,
  updateFeatureUpdatesSettings,
} from "../../../../../lib/notifications/api";

const KEY = "featureUpdatesNotifications";

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeatureUpdatesSettings()
      .then((s) => {
        const v = s[KEY];
        setEnabled(typeof v === "boolean" ? v : false);
      })
      .catch(() => {
        // Silent per mobile parity — keep null until we have a cached value.
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
    <div className="flex flex-col gap-[20px] md:gap-[24px]">
      <PanelMobileHeader title="Notifications" />
      <HeroBanner src={Gradient4.src} />

      <div className="flex flex-col gap-[16px] max-w-[520px]">
        <h2 className="font-montserrat font-normal text-primary-blue text-[20px] md:text-[22px]">
          Notifications
        </h2>

        <div className="flex items-center justify-between py-[8px]">
          <span className="font-montserrat text-primary-blue text-[14px] md:text-[15px]">
            Feature Update
          </span>
          {enabled === null ? (
            <span className="w-[44px] h-[26px] rounded-full bg-[#EDEDED] animate-pulse" />
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              disabled={saving}
              role="switch"
              aria-checked={enabled}
              className={`cursor-pointer relative w-[44px] h-[26px] rounded-full transition-colors ${
                enabled ? "bg-[#EF9849]" : "bg-[#EDEDED]"
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
  );
}
