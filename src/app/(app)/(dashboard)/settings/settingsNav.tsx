import type { ComponentType } from "react";
import {
  ChatSupportIcon,
  InfoCircleIcon,
  LightbulbIcon,
  QuestionBadgeIcon,
  ShieldCheckIcon,
} from "./icons";

type IconProps = { width?: number; height?: number; className?: string };

export type SettingsNavItem = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

// Account + Notifications moved to Studio-owned screens (/studio/accounts,
// /studio/notifications), so Settings only owns the informational panels.
export const SETTINGS_NAV: SettingsNavItem[] = [
  { href: "/settings/about", label: "About", Icon: InfoCircleIcon },
  { href: "/settings/privacy", label: "Privacy Policy", Icon: ShieldCheckIcon },
  { href: "/settings/terms", label: "Terms of Services", Icon: QuestionBadgeIcon },
  { href: "/settings/help", label: "Help and support", Icon: ChatSupportIcon },
  { href: "/settings/release-notes", label: "Release notes", Icon: LightbulbIcon },
];
