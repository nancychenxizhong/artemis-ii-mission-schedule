import { NextResponse } from "next/server";
import { buildSchedule } from "@/lib/artemis-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await buildSchedule();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
