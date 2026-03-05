import { handleDailyPrompt } from "../handler";
import type { NextRequest } from "next/server";

type Params = { id: string };

export async function GET(request: NextRequest, context: { params: Params }) {
  const { id } = context.params;
  const debug = request.nextUrl.searchParams.get("debug") === "1";
  return handleDailyPrompt(id, debug);
}
