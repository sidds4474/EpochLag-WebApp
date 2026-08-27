import type { ComponentType } from "react";
import {
  AccountIcon,
  BellOutlineIcon,
  ChatSupportIcon,
  DollarCircleIcon,
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

export const SETTINGS_NAV: SettingsNavItem[] = [
  { href: "/settings/account", label: "Account", Icon: AccountIcon },
  { href: "/settings/subscription", label: "Subscription", Icon: DollarCircleIcon },
  { href: "/settings/about", label: "About", Icon: InfoCircleIcon },
  { href: "/settings/privacy", label: "Privacy Policy", Icon: ShieldCheckIcon },
  { href: "/settings/terms", label: "Terms of Services", Icon: QuestionBadgeIcon },
  { href: "/settings/help", label: "Help and support", Icon: ChatSupportIcon },
  { href: "/settings/notifications", label: "Notifications", Icon: BellOutlineIcon },
  { href: "/settings/release-notes", label: "Release notes", Icon: LightbulbIcon },
];
