import { NextResponse } from "next/server";

// Placeholder Android assetlinks for hosting/spike verification.
// Mobile team will replace package_name + sha256_cert_fingerprints before launch.
// Served at /.well-known/assetlinks.json via a rewrite in next.config.mjs
// (Next.js's App Router won't route through folders that start with a dot).
const assetlinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.epochlag.app",
      sha256_cert_fingerprints: [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
      ],
    },
  },
];

export function GET() {
  return new NextResponse(JSON.stringify(assetlinks), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
