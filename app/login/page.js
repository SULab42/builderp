// app/login/page.js
"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LINE_CHANNEL_ID  = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL;

function LoginContent() {
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    const state       = Math.random().toString(36).substring(7);
    const callbackUrl = `${APP_URL}/api/auth/callback`;
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code` +
      `&client_id=${LINE_CHANNEL_ID}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${state}` +
      `&scope=profile%20openid`;
    window.location.href = lineAuthUrl;
  };

  return (
    <div style={{ minHeight:"100vh", background:"#070f1c", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sarabun', sans-serif", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;900&display=swap');`}</style>
      <div style={{ background:"#0d1929", border:"1px solid #1e293b", borderRadius:24, padding:"48px 40px", width:"100%", maxWidth:400, textAlign:"center" }}>
        {/* Logo */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏗️</div>
          <div style={{ color:"#f59e0b", fontSize:28, fontWeight:900, letterSpacing:"-1px" }}>
            BUILD<span style={{ color:"#e2e8f0" }}>ERP</span>
          </div>
          <div style={{ color:"#475569", fontSize:14, marginTop:6 }}>ระบบจัดการงานก่อสร้าง</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:10, padding:"10px 16px", color:"#ef4444", fontSize:13, marginBottom:24 }}>
            {error === "no_code"     && "❌ ไม่ได้รับ Authorization Code"}
            {error === "auth_failed" && "❌ Login ไม่สำเร็จ กรุณาลองใหม่"}
            {error === "no_access"   && "❌ คุณไม่มีสิทธิ์เข้าใช้งานระบบนี้"}
          </div>
        )}

        {/* Login Button */}
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", background:loading?"#1e293b":"linear-gradient(135deg,#06c755,#05a847)", color:"#fff", border:"none", borderRadius:14, padding:"16px 24px", fontSize:16, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, fontFamily:"'Sarabun', sans-serif", transition:"all 0.2s" }}>
          {loading ? (
            <>
              <span style={{ width:20, height:20, border:"2px solid #ffffff44", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
              กำลังเชื่อมต่อ...
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 5.92 2 10.8c0 3.17 1.83 5.97 4.6 7.67-.2.73-.75 2.67-.86 3.08-.13.53.19.52.4.38.17-.11 2.66-1.76 3.74-2.48.36.05.73.08 1.12.08 5.52 0 10-3.92 10-8.73C22 5.92 17.52 2 12 2z"/>
              </svg>
              เข้าสู่ระบบด้วย LINE
            </>
          )}
        </button>

        <div style={{ color:"#334155", fontSize:12, marginTop:20, lineHeight:1.6 }}>
          เฉพาะผู้ที่ได้รับสิทธิ์เข้าใช้งานเท่านั้น<br/>
          ติดต่อ Admin เพื่อขอสิทธิ์
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
