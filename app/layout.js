// app/layout.js
export const metadata = {
  title: "BuildERP — ระบบจัดการงานก่อสร้าง",
  description: "ERP สำหรับงานก่อสร้าง พร้อม AI วิเคราะห์ข้อมูล",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#070f1c" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#070f1c" }}>
        {children}
      </body>
    </html>
  );
}
