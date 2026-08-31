"use client";

import { useEffect, useState } from "react";

export type TrialPricing = {
  monthly: string;
  annual: string;
  loading: boolean;
};

// TODO(revenuecat): replace stubbed values with a fetch against
// RevenueCat's REST API (or their web SDK's getOfferings). Needs:
//   - NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY
//   - offering identifier (e.g. "default")
// Once wired, resolve the `unlimited_monthly` and `unlimited_annual`
// packages and read localizedPriceString.
const STUB: TrialPricing = {
  monthly: "$9.99",
  annual: "$79.99",
  loading: false,
};

export function useTrialPricing(): TrialPricing {
  const [pricing] = useState<TrialPricing>(STUB);

  useEffect(() => {
    // no-op until RevenueCat is wired.
  }, []);

  return pricing;
}
