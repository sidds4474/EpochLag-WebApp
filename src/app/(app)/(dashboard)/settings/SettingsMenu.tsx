"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "./settingsNav";
import SignOutRow from "./SignOutRow";

export default function SettingsMenu() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-[6px] flex-1 min-h-0">
      {SETTINGS_NAV.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-[14px] px-[14px] py-[12px] rounded-[10px] font-montserrat text-[14px] transition-colors ${
              active
                ? "bg-[#EDEDED] text-primary-blue font-semibold"
                : "text-primary-blue hover:bg-[#EDEDED]/60 font-medium"
            }`}
          >
            <Icon width={20} height={20} />
            <span>{label}</span>
          </Link>
        );
      })}

      <div className="mt-auto pt-[16px] border-t border-black/10">
        <SignOutRow />
      </div>
    </nav>
  );
}
