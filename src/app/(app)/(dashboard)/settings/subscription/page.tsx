"use client";

import { useEffect, useState } from "react";
import PanelMobileHeader from "../PanelMobileHeader";
import { fetchSubscription, type Subscription } from "../../../../../lib/subscription/api";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

function planLabel(plan: string): string {
  if (plan === "unlimited") return "Unlimited";
  if (plan === "free_trial") return "Free Trial";
  return "Free";
}

export default function SubscriptionPage() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSubscription()
      .then((s) => {
        if (!cancelled) setSub(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load subscription.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = sub ? planLabel(sub.plan) : "Free";
  let dateRow: string | null = null;
  if (sub?.plan === "free_trial" && sub.trialEndsAt) {
    dateRow = `Trial ends ${formatDate(sub.trialEndsAt)}`;
  } else if (sub?.plan === "unlimited" && sub.currentPeriodEnd) {
    dateRow = `Active until ${formatDate(sub.currentPeriodEnd)}`;
  }

  return (
    <div className="flex flex-col">
      <PanelMobileHeader title="Subscription" />

      <div className="max-w-[760px] pt-[14px]">
        <div className="relative bg-[#FEF5EA] rounded-[16px] md:rounded-[20px] px-[20px] md:px-[28px] pt-[28px] md:pt-[32px] pb-[24px] md:pb-[32px] flex flex-col md:flex-row md:items-center md:justify-between gap-[16px]">
          <span className="absolute -top-[14px] left-[20px] md:left-[28px] bg-primary-blue text-white font-montserrat text-[13px] font-semibold px-[16px] py-[6px] rounded-full">
            Current Plan
          </span>
          <div className="flex flex-col gap-[6px]">
            <h2 className="font-montserrat font-bold text-primary-blue text-[32px] md:text-[38px] leading-none">
              {loading ? "…" : label}
            </h2>
            {dateRow && (
              <p className="font-montserrat text-primary-blue/70 text-[13px] md:text-[14px]">
                {dateRow}
              </p>
            )}
            {error && (
              <p className="font-montserrat text-[12px] text-[#D95F3B]">{error}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="cursor-pointer self-start md:self-center font-montserrat text-[14px] font-medium text-white bg-[#EF9849] px-[18px] py-[9px] rounded-full hover:opacity-90 transition-opacity"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
          onClick={() => setShowUpgrade(false)}
        >
          <div
            className="bg-white rounded-[16px] max-w-[420px] w-full p-[24px] flex flex-col gap-[12px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
              Upgrade coming soon
            </h3>
            <p className="font-montserrat text-primary-blue/70 text-[14px] leading-[150%]">
              Paid plans aren&apos;t live on the web just yet. Upgrade from the
              Epoch Lag mobile app, or come back here soon.
            </p>
            <div className="mt-[8px] flex justify-end">
              <button
                type="button"
                onClick={() => setShowUpgrade(false)}
                className="cursor-pointer font-montserrat text-[14px] font-semibold text-white bg-[#EF9849] px-[20px] py-[10px] rounded-full hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
