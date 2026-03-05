import { handleDailyPrompt } from "../../handler";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  return handleDailyPrompt(context.params.id, debug);
}
