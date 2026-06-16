// lib/auth.js
// ตรวจสอบ session และสิทธิ์การเข้าใช้

// ROLES
export const ROLES = {
  ADMIN:    "admin",      // ดูและจัดการได้ทุกอย่าง + จัดการสิทธิ์
  MANAGER:  "manager",   // ดูได้ทุกโปรเจกต์ แก้ไขไม่ได้
  FOREMAN:  "foreman",   // เข้าได้เฉพาะโปรเจกต์ที่รับผิดชอบ
  VIEWER:   "viewer",    // ดูอย่างเดียว
};

// อ่าน user จาก cookie (client-side)
export function getUserFromCookie() {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").reduce((acc, c) => {
    const [k, v] = c.trim().split("=");
    acc[k] = v;
    return acc;
  }, {});
  if (!cookies.builderp_user) return null;
  try {
    return JSON.parse(atob(cookies.builderp_user));
  } catch {
    return null;
  }
}

// ดึงสิทธิ์ผู้ใช้จาก Google Sheets
export async function getUserRole(lineUserId) {
  try {
    const res  = await fetch(`/api/sheets?action=read&sheet=users`);
    const json = await res.json();
    if (json.error || !json.data) return null;
    const user = json.data.find(u => u.lineUserId === lineUserId);
    return user || null;
  } catch {
    return null;
  }
}

// สร้าง LINE Login URL
export function getLineLoginUrl() {
  const channelId  = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL;
  const state      = Math.random().toString(36).substring(7);
  const callback   = `${appUrl}/api/auth/callback`;
  return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(callback)}&state=${state}&scope=profile%20openid`;
}
