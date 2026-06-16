// app/api/auth/callback/route.js
// รับ callback จาก LINE แล้วแลก code เป็น token

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return Response.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    // แลก code เป็น access token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        client_id:     process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("No access token");

    // ดึงข้อมูล Profile จาก LINE
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    // เข้ารหัส user data เป็น base64 แล้วเก็บใน cookie
    const userData = {
      userId:      profile.userId,
      displayName: profile.displayName,
      pictureUrl:  profile.pictureUrl,
    };
    const encoded = Buffer.from(JSON.stringify(userData)).toString("base64");

    // Redirect กลับไปหน้าแอพพร้อม cookie
    const response = Response.redirect(new URL("/", request.url));
    response.headers.set(
      "Set-Cookie",
      `builderp_user=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );
    return response;

  } catch (err) {
    console.error("LINE auth error:", err);
    return Response.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
