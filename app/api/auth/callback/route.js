// app/api/auth/callback/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code   = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builderp.vercel.app";

  if (!code) return NextResponse.redirect(new URL("/login?error=no_code", appUrl));

  try {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  `${appUrl}/api/auth/callback`,
        client_id:     process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("No access token: " + JSON.stringify(tokenData));

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const userData = JSON.stringify({
      userId:      profile.userId,
      displayName: profile.displayName,
      pictureUrl:  profile.pictureUrl || "",
    });
    const encoded = Buffer.from(userData).toString("base64");

    // ใช้ HTML page redirect แทน เพื่อ set localStorage
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  try {
    localStorage.setItem('builderp_user', '${encoded}');
    window.location.href = '/';
  } catch(e) {
    window.location.href = '/login?error=storage_failed';
  }
</script>
<p>กำลังเข้าสู่ระบบ...</p>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (err) {
    console.error("LINE auth error:", err.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", appUrl));
  }
}
