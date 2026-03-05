import { handleDailyPrompt } from "../handler";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get("debug") === "1";
  return handleDailyPrompt(id, debug);
}
