export function toOgImage(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace(
    /\/upload\/(?!.*[wh]_\d+)/,
    "/upload/w_1200,h_630,c_fill,q_auto,f_auto/"
  );
}

export function toResponsiveImage(url, width) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace(
    /\/upload\/(?!.*[wh]_\d+)/,
    `/upload/w_${width},q_auto,f_auto/`
  );
}
