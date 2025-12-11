import { NextResponse } from "next/server";

export async function GET() {
  // No external API calls here – just a stub response
  return NextResponse.json(
    {
      games: [],
      message: "Live scores feature is coming soon. No live data yet.",
    },
    { status: 200 }
  );
}
