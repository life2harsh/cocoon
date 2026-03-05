import { handleDailyPrompt } from "./handler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let journalId = searchParams.get("journal_id")?.trim() || "";

    if (!journalId) {
      const headerId = request.headers.get("x-journal-id");
      if (headerId) {
        journalId = headerId.trim();
      }
    }

    if (!journalId) {
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const match = refererUrl.pathname.match(/\/app\/journals\/([^/]+)/);
          if (match) {
            journalId = match[1];
          }
        } catch {}
      }
    }

    const debug = searchParams.get("debug") === "1";
    return handleDailyPrompt(journalId, debug);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown_error" },
      { status: 500 }
    );
  }
}
