// lib/sheets.js
// ─────────────────────────────────────────────
// ติดต่อ Google Sheets ผ่าน Apps Script Web App
// ─────────────────────────────────────────────

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

export const IS_CONFIGURED = APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL";

// อ่านข้อมูลทั้ง Sheet
export async function readSheet(sheetName) {
  if (!IS_CONFIGURED) return null;
  const res = await fetch(`${APPS_SCRIPT_URL}?action=read&sheet=${sheetName}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

// อ่านหลาย Sheet พร้อมกัน
export async function readAllSheets(sheetNames) {
  if (!IS_CONFIGURED) return null;
  const results = await Promise.all(sheetNames.map(readSheet));
  return Object.fromEntries(sheetNames.map((name, i) => [name, results[i]]));
}

// สร้างแถวใหม่
export async function createRow(sheetName, data) {
  if (!IS_CONFIGURED) return null;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "create", sheet: sheetName, data }),
  });
  return res.json();
}

// อัพเดทแถว
export async function updateRow(sheetName, id, data) {
  if (!IS_CONFIGURED) return null;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "update", sheet: sheetName, id, data }),
  });
  return res.json();
}

// ลบแถว
export async function deleteRow(sheetName, id) {
  if (!IS_CONFIGURED) return null;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "delete", sheet: sheetName, id }),
  });
  return res.json();
}
