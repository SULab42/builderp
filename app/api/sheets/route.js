// app/api/sheets/route.js
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

const IS_CONFIGURED = APPS_SCRIPT_URL && 
  APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL" && 
  APPS_SCRIPT_URL !== "https://api.example.com";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sheet  = searchParams.get("sheet");

  if (!IS_CONFIGURED) {
    return Response.json({ error: "not_configured", demo: true });
  }

  try {
    const url = `${APPS_SCRIPT_URL}?action=${action}&sheet=${sheet}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message });
  }
}

export async function POST(request) {
  if (!IS_CONFIGURED) {
    return Response.json({ error: "not_configured", demo: true });
  }

  try {
    const body = await request.json();
    const res  = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message });
  }
}
