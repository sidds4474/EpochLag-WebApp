import { NextResponse } from "next/server";

// Placeholder AASA file for hosting/spike verification.
// Mobile team will replace `appIDs` with the real Team ID + bundle ID before launch.
const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: ["TEAMID.com.epochlag.app"],
        paths: ["/family-invite", "/family-invite/*"],
      },
    ],
  },
};

export function GET() {
  return new NextResponse(JSON.stringify(aasa), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
