// Maps a moment.type from the BE (e.g. "Birthday", "NewBaby", "FirstHome")
// to the public URL of its icon in /public/icons/moments/. Unknown types
// (including "Loss", which we don't ship an icon for) fall back to other.svg.

const ICONS: Record<string, string> = {
  birthday: "/icons/moments/birthday.svg",
  wedding: "/icons/moments/wedding.svg",
  anniversary: "/icons/moments/anniversary.svg",
  graduation: "/icons/moments/graduation.svg",
  travel: "/icons/moments/travel.svg",
  newbaby: "/icons/moments/newbaby.svg",
  firsthome: "/icons/moments/firsthome.svg",
  retirement: "/icons/moments/retirement.svg",
  other: "/icons/moments/other.svg",
};

export function getMomentIconPath(type: string | null | undefined): string {
  const slug = (type || "").toLowerCase().replace(/[\s_-]+/g, "");
  return ICONS[slug] || ICONS.other;
}
