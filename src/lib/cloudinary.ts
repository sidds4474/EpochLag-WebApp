export function toOgImage(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace(
    /\/upload\/(?!.*[wh]_\d+)/,
    "/upload/w_1200,h_630,c_fill,q_auto,f_auto/"
  );
}

export function toResponsiveImage(
  url: string | null | undefined,
  width: number
): string | null | undefined {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace(
    /\/upload\/(?!.*[wh]_\d+)/,
    `/upload/w_${width},q_auto,f_auto/`
  );
}
