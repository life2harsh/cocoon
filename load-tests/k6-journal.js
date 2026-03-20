import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";

function authHeaders() {
  return {
    headers: {
      "Content-Type": "application/json",
      Cookie: AUTH_COOKIE,
    },
  };
}

export default function () {
  const listRes = http.get(`${BASE_URL}/app`, authHeaders());
  check(listRes, { "app page ok": (r) => r.status === 200 || r.status === 302 });

  const journalsRes = http.get(`${BASE_URL}/api/journals`, authHeaders());
  check(journalsRes, { "journals ok": (r) => r.status === 200 });

  let journalId = null;
  try {
    const data = journalsRes.json();
    if (Array.isArray(data) && data.length > 0) {
      journalId = data[0].id;
    }
  } catch {}

  if (journalId) {
    const promptRes = http.get(`${BASE_URL}/api/prompts/daily?journal_id=${journalId}`, authHeaders());
    check(promptRes, { "prompt ok": (r) => r.status === 200 });

    const entriesRes = http.get(`${BASE_URL}/api/journals/${journalId}/entries`, authHeaders());
    check(entriesRes, { "entries ok": (r) => r.status === 200 });

    const postRes = http.post(
      `${BASE_URL}/api/journals/${journalId}/entries`,
      JSON.stringify({ body: `load test ${Date.now()}` }),
      authHeaders()
    );
    check(postRes, { "post entry ok": (r) => r.status === 200 });
  }

  sleep(1);
}
