// app/api/auth/callback/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://builderp.vercel.app";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", appUrl));
  }

  try {
    // แลก code เป็น access token
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
    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      throw new Error("No access token");
    }

    // ดึงข้อมูล Profile จาก LINE
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    // เข้ารหัส user data
    const userData = {
      userId:      profile.userId,
      displayName: profile.displayName,
      pictureUrl:  profile.pictureUrl || "",
    };
    const encoded = Buffer.from(JSON.stringify(userData)).toString("base64");

    // Redirect พร้อม set cookie ด้วย NextResponse
    const response = NextResponse.redirect(new URL("/", appUrl));
    response.cookies.set("builderp_user", encoded, {
      httpOnly: true,
      sameSite: "lax",
      maxAge:   86400,
      path:     "/",
    });
    return response;

  } catch (err) {
    console.error("LINE auth error:", err.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", appUrl));
  }
}