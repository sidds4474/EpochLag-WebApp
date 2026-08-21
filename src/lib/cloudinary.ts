export function toOgImage(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("res.cloudinary.com")) {
    return url.replace(
      /\/upload\/(?!.*[wh]_\d+)/,
      "/upload/w_1200,h_630,c_fill,q_auto,f_auto/"
    );
  }
  // For non-Cloudinary URLs (e.g. our S3 bucket) route through the
  // weserv.nl public image proxy so social platforms get a landscape
  // 1200x630 crop instead of the raw portrait source.
  const stripped = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=1200&h=630&fit=cover&output=jpg`;
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
