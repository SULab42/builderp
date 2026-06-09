# 🏗️ BuildERP — ระบบจัดการงานก่อสร้าง

AI-Powered Construction ERP · Next.js + Google Sheets + Claude AI

---

## ✅ ฟีเจอร์ทั้งหมด

- 📊 Dashboard ภาพรวม
- 🏗️ จัดการโปรเจกต์
- ✅ ตารางงาน (Task Management)
- 📦 คลังวัสดุ (Inventory)
- 🧾 ใบแจ้งหนี้ / ใบเสนอราคา
- 🤖 AI Assistant (วิเคราะห์งบ, พยากรณ์เสี่ยง, อ่าน PDF)
- 🔔 ระบบแจ้งเตือนอัตโนมัติ
- 📱 Responsive (มือถือ + คอมพิวเตอร์)

---

## 🚀 วิธีติดตั้งและ Deploy

### ขั้นที่ 1 — ตั้งค่า Google Sheets Backend

1. เปิด [sheets.google.com](https://sheets.google.com) → สร้าง Spreadsheet ใหม่ ตั้งชื่อ **"BuildERP Database"**

2. ใน Spreadsheet → เมนู **Extensions → Apps Script**

3. วางโค้ดจากไฟล์ `Code.gs` ลงไป (**ลบโค้ดเดิมออกก่อน**)

4. กด **Run → `setupSheets`** (ครั้งแรกเพื่อสร้าง Sheets อัตโนมัติ)
   - อนุญาต Permission เมื่อ Google ถาม

5. **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - คัดลอก **Web App URL** ที่ได้

---

### ขั้นที่ 2 — ตั้งค่า API Keys

คัดลอกไฟล์ `.env.local.example` เป็น `.env.local`:

```bash
cp .env.local.example .env.local
```

แก้ไขค่าใน `.env.local`:

```env
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/ABC.../exec
ANTHROPIC_API_KEY=sk-ant-...
```

- **Apps Script URL**: ได้จากขั้นที่ 1
- **Anthropic API Key**: สมัครที่ [console.anthropic.com](https://console.anthropic.com/keys)

---

### ขั้นที่ 3 — รันแบบ Local

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

### ขั้นที่ 4 — Deploy บน Vercel (ฟรี)

#### วิธีที่ 1: ผ่าน Vercel CLI

```bash
npm install -g vercel
vercel
```

ตอบคำถาม:
- Set up and deploy? **Y**
- Link to existing project? **N**
- Project name? **builderp** (หรือชื่ออื่น)
- Directory? **./**

#### วิธีที่ 2: ผ่าน GitHub (แนะนำ)

1. สร้าง repo บน [github.com](https://github.com)
2. Push โค้ดขึ้น GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial BuildERP"
   git remote add origin https://github.com/YOUR_USERNAME/builderp.git
   git push -u origin main
   ```
3. ไป [vercel.com](https://vercel.com) → **New Project** → Import จาก GitHub
4. ใส่ Environment Variables:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
   - `NEXT_PUBLIC_APPS_SCRIPT_URL` = `https://script.google.com/...`
5. กด **Deploy** 🎉

---

## 📁 โครงสร้างไฟล์

```
builderp/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # หน้าหลัก
│   └── api/
│       ├── ai/route.js    # Proxy Claude API (ซ่อน API Key)
│       └── sheets/route.js # Proxy Google Sheets
├── components/
│   └── BuildERP.jsx       # แอพหลักทั้งหมด
├── lib/
│   └── sheets.js          # Google Sheets helper
├── Code.gs                # Google Apps Script backend
├── .env.local.example     # Template สำหรับ env vars
├── .env.local             # ← สร้างเอง (ไม่ commit ขึ้น Git)
├── .gitignore
├── next.config.js
└── package.json
```

---

## 🗂️ Google Sheets Structure

| Sheet | คอลัมน์ |
|-------|---------|
| `projects` | id, name, client, budget, spent, status, progress, startDate, endDate, manager |
| `tasks` | id, projectId, title, assignee, status, priority, due, category |
| `employees` | id, name, role, phone, email, status |
| `expenses` | id, projectId, description, amount, date, category, by |
| `materials` | id, name, unit, qty, minStock, price, supplier, location |
| `invoices` | id, projectId, client, status, issueDate, dueDate, note |

---

## 💡 Tips

- **Demo Mode**: ถ้าไม่ตั้ง `NEXT_PUBLIC_APPS_SCRIPT_URL` แอพจะใช้ Mock Data ทำงานได้ปกติ
- **AI ไม่ทำงาน**: ตรวจสอบ `ANTHROPIC_API_KEY` ใน Vercel Environment Variables
- **Sheets ไม่ sync**: ตรวจสอบ Apps Script URL และ Deploy settings (Anyone access)

---

## 📞 โมดูลที่สามารถเพิ่มได้ในอนาคต

- 📸 อัพโหลดรูปหน้างาน
- 📍 แผนที่ตำแหน่งโปรเจกต์
- 👤 ระบบ Login / สิทธิ์ผู้ใช้
- 📊 Chart & Graph อัตโนมัติ
- 📧 ส่ง Email แจ้งเตือน
