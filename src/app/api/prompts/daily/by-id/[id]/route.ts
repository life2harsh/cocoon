import { handleDailyPrompt } from "../../handler";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const match = request.nextUrl.pathname.match(/\/api\/prompts\/daily\/by-id\/([^/]+)/);
  const id = match?.[1] ?? "";
  return handleDailyPrompt(id, debug);
}
