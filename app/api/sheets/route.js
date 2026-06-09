// app/api/sheets/route.js
// ─────────────────────────────────────────────
// Proxy ระหว่าง Next.js app กับ Google Apps Script
// ─────────────────────────────────────────────

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sheet = searchParams.get("sheet");

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
    return Response.json({ error: "Apps Script URL not configured", demo: true });
  }

  const url = `${APPS_SCRIPT_URL}?action=${action}&sheet=${sheet}`;
  const res = await fetch(url);
  const data = await res.json();
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
    return Response.json({ error: "Apps Script URL not configured", demo: true });
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data);
}
