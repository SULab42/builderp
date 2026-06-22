"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getUserFromCookie, getUserRole, ROLES } from "../lib/auth";

/* ─────────────────────────────────────────────
   SHEETS HOOK — อ่าน/เขียน/ลบ Google Sheets
───────────────────────────────────────────── */
function useSheetData(sheetName, mockData) {
  const [data, setData]       = useState(mockData);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/sheets?action=read&sheet=${sheetName}`, { cache:"no-store" });
      const json = await res.json();
      if (json.demo || json.error) return;
      if (Array.isArray(json.data)) {
        setData(json.data);
        setLoaded(true);
      }
    } catch (e) {
      console.error("load error:", sheetName, e);
    }
  }, [sheetName]);

  // โหลดตอนเริ่มต้น
  useEffect(() => { load(); }, [load]);

  // โหลดซ้ำทุก 30 วินาที
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const add = async (item) => {
    setSyncing(true);
    try {
      const res  = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"create", sheet:sheetName, data:item }),
      });
      const json = await res.json();
      if (json.demo || json.error) {
        // Demo mode — เพิ่มใน local state
        setData(prev => [...prev, { ...item, id: sheetName[0].toUpperCase() + Date.now() }]);
      } else {
        // โหลดข้อมูลใหม่จาก Sheets
        await load();
      }
    } catch {
      setData(prev => [...prev, { ...item, id: sheetName[0].toUpperCase() + Date.now() }]);
    }
    setSyncing(false);
  };

  const remove = async (id) => {
    setSyncing(true);
    // ลบใน local state ก่อนให้รู้สึกเร็ว
    setData(prev => prev.filter(r => r.id !== id));
    try {
      const res  = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"delete", sheet:sheetName, id }),
      });
      const json = await res.json();
      if (!json.demo && !json.error) {
        // โหลดข้อมูลใหม่จาก Sheets เพื่อยืนยัน
        await load();
      }
    } catch (e) {
      console.error("delete error:", e);
    }
    setSyncing(false);
  };

  const update = async (id, patch) => {
    setSyncing(true);
    // อัพเดท local state ก่อนให้รู้สึกเร็ว
    setData(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    try {
      const res  = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action:"update", sheet:sheetName, id, data:patch }),
      });
      const json = await res.json();
      if (!json.demo && !json.error) {
        await load();
      }
    } catch (e) {
      console.error("update error:", e);
    }
    setSyncing(false);
  };

  return { data, syncing, loaded, add, remove, update, reload: load };
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const INIT = {
  projects: [],
  tasks: [],
  expenses: [],
  materials: [],
  invoices: [],
  employees: [],
};

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
const fmt = n => new Intl.NumberFormat("th-TH").format(Number(n)||0);
const fmtDate = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d; // เผื่อเป็น string แปลกๆ ที่แปลงไม่ได้ ให้แสดงดิบไปก่อน
    const dd = String(dt.getDate()).padStart(2,"0");
    const mm = String(dt.getMonth()+1).padStart(2,"0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return d; }
};
const sc = s => ({"กำลังดำเนินการ":"#f59e0b","เสร็จสิ้น":"#10b981","เริ่มใหม่":"#3b82f6","กำลังทำ":"#f59e0b","เสร็จแล้ว":"#10b981","รอดำเนินการ":"#64748b","ทำงาน":"#10b981","ลาพัก":"#f59e0b","ชำระแล้ว":"#10b981","รอชำระ":"#f59e0b","ร่าง":"#64748b","ต่ำ":"#10b981","กลาง":"#f59e0b","สูง":"#ef4444"}[s]||"#64748b");
const uid = p => p+(Date.now()%100000);

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
const Badge = ({text,color})=>(
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,whiteSpace:"nowrap",fontWeight:600}}>{text}</span>
);
const Prog = ({v,color="#f59e0b"})=>(
  <div style={{background:"#1e293b",borderRadius:99,height:7,overflow:"hidden"}}>
    <div style={{width:`${Math.min(v,100)}%`,background:`linear-gradient(90deg,${color},${color}99)`,height:"100%",borderRadius:99,transition:"width .8s ease"}}/>
  </div>
);
const Card = ({children,style={}})=>(
  <div style={{background:"#0d1929",border:"1px solid #1e293b",borderRadius:16,padding:20,...style}}>{children}</div>
);
const Btn = ({children,onClick,color="#f59e0b",disabled,style={}})=>(
  <button onClick={onClick} disabled={disabled} style={{background:disabled?"#1e293b":`linear-gradient(135deg,${color},${color}cc)`,color:disabled?"#475569":"#fff",border:"none",borderRadius:10,padding:"9px 20px",fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6,...style}}>
    {children}
  </button>
);
const Inp = ({label,value,onChange,type="text",placeholder=""})=>(
  <div>
    {label&&<label style={{color:"#64748b",fontSize:11,display:"block",marginBottom:4}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",background:"#070f1c",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
  </div>
);
const Sel = ({label,value,onChange,options})=>(
  <div>
    {label&&<label style={{color:"#64748b",fontSize:11,display:"block",marginBottom:4}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",background:"#070f1c",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px",color:"#e2e8f0",fontSize:13}}>
      {options.map(o=>{
        const isObj = o && typeof o === "object";
        const val = isObj ? (o.value ?? o.v ?? "") : o;
        const lbl = isObj ? (o.label ?? o.l ?? "") : o;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  </div>
);
const Spinner = ()=>(
  <span style={{width:14,height:14,border:"2px solid #1e293b",borderTopColor:"#f59e0b",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>
);

/* ─────────────────────────────────────────────
   NOTIFICATION SYSTEM
───────────────────────────────────────────── */
function genNotifications(data) {
  const notes = [];
  const today = new Date("2026-06-06");
  data.projects.forEach(p => {
    const exp = data.expenses.filter(e=>e.projectId===p.id).reduce((a,e)=>a+Number(e.amount),0);
    const ratio = exp/p.budget;
    if(ratio>0.85 && p.status!=="เสร็จสิ้น") notes.push({id:"N"+p.id+"b",type:"danger",icon:"🚨",title:`งบใกล้หมด: ${p.name}`,body:`ใช้ไปแล้ว ${Math.round(ratio*100)}% ของงบทั้งหมด`,time:"ตอนนี้",read:false});
    const end = new Date(p.endDate);
    const days = Math.ceil((end-today)/86400000);
    if(days<=30&&days>0&&p.status!=="เสร็จสิ้น"&&p.progress<80) notes.push({id:"N"+p.id+"d",type:"warning",icon:"⏰",title:`กำหนดส่งใกล้: ${p.name}`,body:`เหลืออีก ${days} วัน แต่งานเสร็จแค่ ${p.progress}%`,time:`${days} วันก่อนส่งมอบ`,read:false});
  });
  data.materials.forEach(m => {
    if(m.qty<=m.minStock) notes.push({id:"N"+m.id,type:"warning",icon:"📦",title:`วัสดุใกล้หมด: ${m.name}`,body:`คงเหลือ ${m.qty} ${m.unit} (ขั้นต่ำ ${m.minStock})`,time:"วันนี้",read:false});
  });
  data.invoices.forEach(inv => {
    if(inv.status==="รอชำระ") {
      const due = new Date(inv.dueDate);
      const d = Math.ceil((due-today)/86400000);
      if(d<=7) notes.push({id:"N"+inv.id,type:"info",icon:"💳",title:`ใบแจ้งหนี้ครบกำหนด: ${inv.id}`,body:`${inv.client} · ฿${fmt(inv.items.reduce((a,i)=>a+i.price*i.qty,0))} · เหลือ ${d} วัน`,time:`${d} วัน`,read:false});
    }
  });
  return notes;
}

function NotifPanel({notifs,onRead,onReadAll}) {
  const unread = notifs.filter(n=>!n.read).length;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{color:"#e2e8f0",margin:0,fontSize:18,fontWeight:800}}>🔔 การแจ้งเตือน</h2>
          <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>{unread} รายการยังไม่ได้อ่าน</p>
        </div>
        {unread>0&&<Btn onClick={onReadAll} color="#3b82f6">✓ อ่านทั้งหมด</Btn>}
      </div>
      {notifs.length===0&&(
        <Card style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{color:"#475569",fontSize:15}}>ไม่มีการแจ้งเตือน</div>
        </Card>
      )}
      {notifs.map(n=>(
        <Card key={n.id} style={{borderColor:n.read?"#1e293b":n.type==="danger"?"#ef444433":n.type==="warning"?"#f59e0b33":"#3b82f633",cursor:"pointer"}} >
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}} onClick={()=>onRead(n.id)}>
            <div style={{width:40,height:40,borderRadius:10,background:n.type==="danger"?"#ef444422":n.type==="warning"?"#f59e0b22":"#3b82f622",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{n.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                <span style={{color:n.read?"#64748b":"#e2e8f0",fontSize:14,fontWeight:n.read?400:700}}>{n.title}</span>
                {!n.read&&<span style={{width:8,height:8,borderRadius:"50%",background:"#f59e0b",flexShrink:0,marginTop:4}}/>}
              </div>
              <p style={{color:"#64748b",fontSize:12,margin:"4px 0 0"}}>{n.body}</p>
              <span style={{color:"#334155",fontSize:11}}>{n.time}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN PANEL — จัดการสิทธิ์ผู้ใช้
───────────────────────────────────────────── */
const ROLE_LABELS = {
  admin:   { label:"Admin",      desc:"จัดการได้ทุกอย่าง + จัดการสิทธิ์", color:"#a78bfa" },
  manager: { label:"ผู้บริหาร",  desc:"ดูได้ทุกโปรเจกต์ แก้ไขไม่ได้",     color:"#3b82f6" },
  foreman: { label:"โฟร์แมน",    desc:"เข้าได้เฉพาะโปรเจกต์ที่รับผิดชอบ", color:"#f59e0b" },
  viewer:  { label:"ผู้ดูอย่างเดียว", desc:"ดูอย่างเดียว ไม่แก้ไข",        color:"#64748b" },
};

function ConnectLineButton({ user, allUsers, onConnect }) {
  const [open, setOpen] = useState(false);
  const candidates = allUsers.filter(u => u.status === "awaiting_approval");

  if (!open) return (
    <button onClick={()=>setOpen(true)}
      style={{ background:"#3b82f622", border:"1px solid #3b82f644", borderRadius:7, padding:"6px 14px", color:"#3b82f6", fontSize:12, cursor:"pointer", fontWeight:700 }}>
      🔗 เชื่อมต่อ LINE
    </button>
  );

  return (
    <div style={{ background:"#070f1c", border:"1px solid #3b82f644", borderRadius:8, padding:10, width:"100%", marginTop:6 }}>
      <div style={{ color:"#94a3b8", fontSize:11, marginBottom:6 }}>
        เลือกคนที่ Login เข้ามาแล้ว (รออนุมัติ) เพื่อจับคู่กับ "{user.displayName}"
      </div>
      {candidates.length === 0 ? (
        <div style={{ color:"#475569", fontSize:11 }}>ยังไม่มีใคร Login รอจับคู่ — ให้คนนั้น Login ด้วย LINE ก่อน</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {candidates.map(c => (
            <button key={c.id} onClick={()=>{ onConnect(c.lineUserId); setOpen(false); }}
              style={{ background:"#10b98122", border:"1px solid #10b98144", borderRadius:6, padding:"6px 10px", color:"#10b981", fontSize:12, cursor:"pointer", textAlign:"left" }}>
              ✅ {c.displayName} ({c.lineUserId?.slice(0,16)}...)
            </button>
          ))}
        </div>
      )}
      <button onClick={()=>setOpen(false)} style={{ background:"none", border:"none", color:"#475569", fontSize:11, cursor:"pointer", marginTop:6 }}>ยกเลิก</button>
    </div>
  );
}

function AdminPanel({ currentUser, projects }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ lineUserId:"", displayName:"", role:"foreman", projectIds:"" });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/sheets?action=read&sheet=users`);
      const json = await res.json();
      if (!json.error && json.data) setUsers(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const addUser = async () => {
    if (!form.displayName) return; // ไม่บังคับ lineUserId แล้ว — เพิ่มล่วงหน้าได้
    await fetch("/api/sheets", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"create", sheet:"users", data:{
        ...form,
        lineUserId: form.lineUserId || "",
        status: form.lineUserId ? "active" : "pending", // pending = รอคนนี้ login ครั้งแรก
      } }),
    });
    setForm({ lineUserId:"", displayName:"", role:"foreman", projectIds:"" });
    setShowAdd(false);
    await loadUsers();
  };

  const updateRole = async (id, patch) => {
    await fetch("/api/sheets", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"update", sheet:"users", id, data: patch }),
    });
    setEditing(null);
    await loadUsers();
  };

  const removeUser = async (id, name) => {
    if (!window.confirm(`ลบสิทธิ์ของ "${name}" ใช่มั้ย?`)) return;
    await fetch("/api/sheets", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"delete", sheet:"users", id }),
    });
    await loadUsers();
  };

  const toggleStatus = async (u) => {
    await updateRole(u.id, { status: u.status === "active" ? "suspended" : "active" });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ color:"#e2e8f0", margin:0, fontSize:18, fontWeight:800 }}>👑 จัดการสิทธิ์ผู้ใช้</h2>
          <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>ทั้งหมด {users.length} คน</p>
        </div>
        <Btn onClick={()=>setShowAdd(!showAdd)} color="#a78bfa">+ เพิ่มผู้ใช้</Btn>
      </div>

      {showAdd && (
        <Card style={{ borderColor:"#a78bfa44" }}>
          <h3 style={{ color:"#a78bfa", margin:"0 0 14px", fontSize:14 }}>📝 เพิ่มพนักงาน/ผู้ใช้ใหม่</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
            <Inp label="ชื่อที่แสดง *" value={form.displayName} onChange={v=>setForm(f=>({...f,displayName:v}))} placeholder="เช่น สมชาย ใจดี" />
            <Sel label="สิทธิ์ (Role)" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))}
              options={Object.entries(ROLE_LABELS).map(([k,v])=>({ value:k, label:v.label }))} />
            <Inp label="โปรเจกต์ (P001,P002 หรือ ALL)" value={form.projectIds} onChange={v=>setForm(f=>({...f,projectIds:v}))} placeholder="ALL" />
            <Inp label="LINE User ID (ใส่ทีหลังได้)" value={form.lineUserId} onChange={v=>setForm(f=>({...f,lineUserId:v}))} placeholder="เว้นว่างไว้ก่อนก็ได้" />
          </div>
          <div style={{ color:"#475569", fontSize:11, marginTop:10, lineHeight:1.6 }}>
            💡 ไม่ต้องรอให้คนนั้น Login ก่อนก็เพิ่มได้เลย — ถ้าเว้น LINE User ID ว่างไว้ ระบบจะตั้งสถานะเป็น "รอเชื่อมต่อ"<br/>
            พอคนนั้น Login ด้วย LINE ครั้งแรก กดปุ่ม "🔗 เชื่อมต่อ" ที่รายชื่อนี้เพื่อจับคู่กับบัญชี LINE ของเขา
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn onClick={addUser} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowAdd(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <Card style={{ textAlign:"center", padding:"40px 20px" }}>
          <Spinner/>
        </Card>
      ) : users.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>👤</div>
          <div style={{ color:"#475569", fontSize:14 }}>ยังไม่มีผู้ใช้ในระบบ</div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {users.map(u => {
            const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.viewer;
            const isEditing = editing === u.id;
            const isSelf = u.lineUserId === currentUser?.userId;
            return (
              <Card key={u.id} style={{ borderColor: u.status==="suspended" ? "#ef444433" : "#1e293b" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background:roleInfo.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {u.displayName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <div style={{ color:"#e2e8f0", fontSize:14, fontWeight:700 }}>
                        {u.displayName} {isSelf && <span style={{ color:"#475569", fontSize:11 }}>(คุณ)</span>}
                      </div>
                      <div style={{ color:"#475569", fontSize:11 }}>{u.lineUserId?.slice(0,20)}...</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <Badge text={roleInfo.label} color={roleInfo.color} />
                    <Badge text={u.projectIds==="ALL"?"ทุกโปรเจกต์":(u.projectIds||"-")} color="#64748b" />
                    <Badge
                      text={u.status==="active"?"ใช้งานได้":u.status==="awaiting_approval"?"⏳ รออนุมัติ":u.status==="pending"?"รอเชื่อมต่อ LINE":"ระงับสิทธิ์"}
                      color={u.status==="active"?"#10b981":u.status==="awaiting_approval"?"#f59e0b":u.status==="pending"?"#3b82f6":"#ef4444"}
                    />
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ borderTop:"1px solid #1e293b", marginTop:12, paddingTop:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
                      <Sel label="เปลี่ยนสิทธิ์" value={u.role||"foreman"} onChange={v=>setUsers(prev=>prev.map(x=>x.id===u.id?{...x,role:v}:x))}
                        options={Object.entries(ROLE_LABELS).map(([k,v])=>({ value:k, label:v.label }))} />
                      <Inp label="โปรเจกต์" value={u.projectIds||""} onChange={v=>setUsers(prev=>prev.map(x=>x.id===u.id?{...x,projectIds:v}:x))} />
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <Btn onClick={()=>updateRole(u.id,{ role:u.role||"foreman", projectIds:u.projectIds||"", status:"active" })} color="#10b981">
                        {u.status==="awaiting_approval" ? "✅ อนุมัติและบันทึก" : "บันทึก ✓"}
                      </Btn>
                      <Btn onClick={()=>setEditing(null)} color="#334155">ปิด</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                    {u.status === "awaiting_approval" && (
                      <button onClick={()=>setEditing(u.id)}
                        style={{ background:"#10b98122", border:"1px solid #10b98144", borderRadius:7, padding:"6px 14px", color:"#10b981", fontSize:12, cursor:"pointer", fontWeight:700 }}>
                        ✅ อนุมัติเข้าใช้งาน (ตั้งสิทธิ์)
                      </button>
                    )}
                    {u.status === "pending" && (
                      <ConnectLineButton user={u} allUsers={users} onConnect={(lineId)=>updateRole(u.id,{lineUserId:lineId, status:"active"})} />
                    )}
                    <button onClick={()=>setEditing(u.id)}
                      style={{ background:"#3b82f622", border:"1px solid #3b82f644", borderRadius:7, padding:"6px 14px", color:"#3b82f6", fontSize:12, cursor:"pointer" }}>
                      ✏️ แก้ไขสิทธิ์
                    </button>
                    {!isSelf && (
                      <>
                        {u.status === "active" || u.status === "suspended" ? (
                          <button onClick={()=>toggleStatus(u)}
                            style={{ background: u.status==="active" ? "#f59e0b22" : "#10b98122", border:`1px solid ${u.status==="active"?"#f59e0b44":"#10b98144"}`, borderRadius:7, padding:"6px 14px", color: u.status==="active"?"#f59e0b":"#10b981", fontSize:12, cursor:"pointer" }}>
                            {u.status==="active" ? "⏸ ระงับสิทธิ์" : "▶ เปิดใช้งาน"}
                          </button>
                        ) : null}
                        <button onClick={()=>removeUser(u.id, u.displayName)}
                          style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:7, padding:"6px 14px", color:"#ef4444", fontSize:12, cursor:"pointer" }}>
                          🗑️ ลบ
                        </button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ background:"#0a112022" }}>
        <h3 style={{ color:"#e2e8f0", margin:"0 0 10px", fontSize:13, fontWeight:700 }}>📋 ระดับสิทธิ์ในระบบ</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 }}>
          {Object.entries(ROLE_LABELS).map(([k,v])=>(
            <div key={k} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <Badge text={v.label} color={v.color} />
              <span style={{ color:"#64748b", fontSize:11, lineHeight:1.5 }}>{v.desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DAILY REPORT
───────────────────────────────────────────── */
function DailyReport({ data, user, role, onAdd, onRemove, onUpdateWeekly, hideProjectFilter }) {
  const [showForm, setShowForm] = useState(false);
  const [filterProj, setFilterProj] = useState("ทั้งหมด");
  const myProjects = role?.projectIds === "ALL" || !role?.projectIds
    ? data.projects
    : data.projects.filter(p => role.projectIds.split(",").includes(p.id));

  const todayStr = new Date().toISOString().slice(0,10);
  const [reportProjectId, setReportProjectId] = useState(hideProjectFilter ? (data.projects[0]?.id || "") : "");
  const [date, setDate] = useState(todayStr);
  const [weather, setWeather] = useState("ปกติ");
  const [workerPlan, setWorkerPlan] = useState("");
  const [workerActual, setWorkerActual] = useState("");
  const [equipment, setEquipment] = useState("");
  const [issues, setIssues] = useState("");
  const [photoNote, setPhotoNote] = useState("");

  // ── เลือกงานจาก 3-Weeks (multi-select) ──
  const [selectedTasks, setSelectedTasks] = useState({}); // { weeklyPlanId: { qty, unit } }
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergName, setEmergName] = useState("");
  const [emergReason, setEmergReason] = useState("เหตุฉุกเฉิน/อุบัติเหตุ");
  const [emergQty, setEmergQty] = useState("");
  const [emergUnit, setEmergUnit] = useState("");

  const activeWeeklyPlans = (data.weekly || []).filter(w =>
    (hideProjectFilter || w.projectId === reportProjectId) && w.status !== "เสร็จแล้ว"
  );

  const toggleTask = (wp) => {
    setSelectedTasks(prev => {
      const next = { ...prev };
      if (next[wp.id]) {
        delete next[wp.id];
      } else {
        next[wp.id] = { qty: "", unit: wp.unit || "%" };
      }
      return next;
    });
  };

  const updateTaskQty = (id, qty) => setSelectedTasks(prev => ({ ...prev, [id]: { ...prev[id], qty } }));
  const updateTaskUnit = (id, unit) => setSelectedTasks(prev => ({ ...prev, [id]: { ...prev[id], unit } }));

  const resetForm = () => {
    setDate(todayStr); setWeather("ปกติ"); setWorkerPlan(""); setWorkerActual("");
    setEquipment(""); setIssues(""); setPhotoNote(""); setSelectedTasks({});
    setShowEmergency(false); setEmergName(""); setEmergQty(""); setEmergUnit("");
  };

  const submit = async () => {
    const projId = hideProjectFilter ? reportProjectId : reportProjectId;
    if (!projId) return;

    const selectedIds = Object.keys(selectedTasks);
    if (selectedIds.length === 0 && !emergName) return; // ต้องมีอย่างน้อย 1 งาน หรือ 1 งานฉุกเฉิน

    // สร้างสรุปข้อความ planWork/actualWork จากงานที่เลือก (เพื่อแสดงผลย้อนหลังให้อ่านง่าย)
    const taskSummaries = selectedIds.map(id => {
      const wp = activeWeeklyPlans.find(w => w.id === id);
      const t = selectedTasks[id];
      return wp ? `${wp.activity}: +${t.qty || 0} ${t.unit}` : null;
    }).filter(Boolean);

    const actualWorkText = taskSummaries.join(" · ") + (emergName ? (taskSummaries.length ? " · " : "") + `⚠️ ${emergName}` : "");

    // ขั้น 1: บันทึก Daily Report
    await onAdd({
      projectId: projId, date, weather,
      planWork: taskSummaries.map(s=>s.split(":")[0]).join(", "),
      actualWork: actualWorkText || "-",
      workerPlan, workerActual, equipment, issues, photoNote,
      linkedWeeklyIds: selectedIds.join(","),
      emergencyWork: emergName ? `${emergName} (${emergReason}) ${emergQty}${emergUnit}` : "",
      reporter: user?.displayName || "ไม่ทราบชื่อ",
      createdAt: new Date().toISOString(),
    });

    // ขั้น 2: บวกสะสมเข้า actualQty ของแต่ละงานใน 3-Weeks ที่เลือกไว้ — งานฉุกเฉินไม่นับรวมตรงนี้
    for (const id of selectedIds) {
      const wp = activeWeeklyPlans.find(w => w.id === id);
      const t = selectedTasks[id];
      if (!wp || !t.qty) continue;
      const newActual = Number(wp.actualQty || 0) + Number(t.qty || 0);
      const newStatus = newActual >= Number(wp.planQty || 0) ? "เสร็จแล้ว" : "กำลังทำ";
      await onUpdateWeekly(wp.id, { actualQty: newActual, status: newStatus });
    }

    resetForm();
    setShowForm(false);
  };

  const reports = (data.daily||[])
    .filter(r => hideProjectFilter || filterProj==="ทั้งหมด" || r.projectId===filterProj)
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const selectedCount = Object.keys(selectedTasks).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ color:"#e2e8f0", margin:0, fontSize:18, fontWeight:800 }}>📝 Daily Report</h2>
          <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>รายงานหน้างานประจำวัน · ผูกกับ 3-Weeks · {reports.length} รายการ</p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)} color="#3b82f6">+ เขียนรายงานวันนี้</Btn>
      </div>

      {!hideProjectFilter && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={()=>setFilterProj("ทั้งหมด")}
            style={{ background:filterProj==="ทั้งหมด"?"#3b82f622":"#0d1929", color:filterProj==="ทั้งหมด"?"#3b82f6":"#64748b", border:`1px solid ${filterProj==="ทั้งหมด"?"#3b82f6":"#1e293b"}`, borderRadius:20, padding:"5px 14px", fontSize:12, cursor:"pointer" }}>
            ทั้งหมด
          </button>
          {myProjects.map(p=>(
            <button key={p.id} onClick={()=>setFilterProj(p.id)}
              style={{ background:filterProj===p.id?"#3b82f622":"#0d1929", color:filterProj===p.id?"#3b82f6":"#64748b", border:`1px solid ${filterProj===p.id?"#3b82f6":"#1e293b"}`, borderRadius:20, padding:"5px 14px", fontSize:12, cursor:"pointer" }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <>
          <Card style={{ borderColor:"#3b82f644" }}>
            <h3 style={{ color:"#3b82f6", margin:"0 0 14px", fontSize:14 }}>📝 รายงานประจำวัน · {date}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:14 }}>
              {!hideProjectFilter && (
                <Sel label="โปรเจกต์ *" value={reportProjectId} onChange={setReportProjectId}
                  options={[{value:"",label:"-- เลือก --"},...myProjects.map(p=>({value:p.id,label:p.name}))]} />
              )}
              <Inp label="วันที่" value={date} onChange={setDate} type="date" />
              <Sel label="สภาพอากาศ" value={weather} onChange={setWeather} options={["ปกติ","ฝนตก","แดดจัด","ลมแรง"]} />
            </div>

            {/* STEP 1: เลือกงานจาก 3-Weeks แบบ multi-select */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <label style={{ color:"#64748b", fontSize:11 }}>✅ เลือกงานที่ทำวันนี้ (จาก 3-Weeks)</label>
                {selectedCount > 0 && <Badge text={`เลือกแล้ว ${selectedCount}`} color="#f59e0b" />}
              </div>
              {activeWeeklyPlans.length === 0 ? (
                <div style={{ color:"#475569", fontSize:12, background:"#070f1c", borderRadius:8, padding:"14px", textAlign:"center" }}>
                  ยังไม่มีแผนงานใน 3-Weeks สำหรับโปรเจกต์นี้ — เพิ่มแผนงานก่อน หรือใช้ "งานฉุกเฉิน" ด้านล่าง
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {activeWeeklyPlans.map(wp => {
                    const isSel = !!selectedTasks[wp.id];
                    const pct = Number(wp.planQty) ? Math.round(Number(wp.actualQty||0)/Number(wp.planQty)*100) : 0;
                    return (
                      <div key={wp.id} onClick={()=>toggleTask(wp)}
                        style={{ background:"#070f1c", border:`1px solid ${isSel?"#f59e0b":"#1e293b"}`, borderRadius:10, padding:"12px 14px", cursor:"pointer" }}>
                        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <div style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${isSel?"#f59e0b":"#334155"}`, background:isSel?"#f59e0b":"transparent", color:"#0d1929", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, marginTop:1 }}>
                            {isSel && "✓"}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{wp.activity}</div>
                            <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>แผน {wp.planQty||0} {wp.unit} · ทำแล้ว {wp.actualQty||0} {wp.unit}</div>
                            <Prog v={pct} color={pct>=100?"#10b981":"#3b82f6"} />
                            {isSel && (
                              <div onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, paddingTop:10, borderTop:"1px solid #1e293b" }}>
                                <span style={{ color:"#64748b", fontSize:11 }}>ทำได้วันนี้:</span>
                                <input type="number" value={selectedTasks[wp.id]?.qty||""} onChange={e=>updateTaskQty(wp.id, e.target.value)}
                                  style={{ width:64, background:"#0d1929", border:"1px solid #f59e0b44", borderRadius:8, padding:"6px 8px", color:"#e2e8f0", fontSize:13 }} />
                                <select value={selectedTasks[wp.id]?.unit||wp.unit||"%"} onChange={e=>updateTaskUnit(wp.id, e.target.value)}
                                  style={{ background:"#0d1929", border:"1px solid #334155", borderRadius:8, padding:"6px 8px", color:"#94a3b8", fontSize:12 }}>
                                  {["%","ตร.ม.","คิว","ม้วน","ท่อน","ชิ้น"].map(u=><option key={u} value={u}>{u}</option>)}
                                </select>
                                <span style={{ marginLeft:"auto", color:"#475569", fontSize:11 }}>
                                  → สะสม <b style={{ color:"#f59e0b" }}>{Number(wp.actualQty||0)+Number(selectedTasks[wp.id]?.qty||0)}</b> {selectedTasks[wp.id]?.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ปุ่มงานฉุกเฉิน */}
            <button onClick={()=>setShowEmergency(!showEmergency)}
              style={{ width:"100%", background:"#ef444411", border:"1px dashed #ef444466", borderRadius:10, padding:10, color:"#ef4444", fontSize:12, cursor:"pointer", marginBottom: showEmergency ? 10 : 14, fontFamily:"'Sarabun',sans-serif" }}>
              ⚠️ {showEmergency ? "ปิด" : "เพิ่ม"}งานฉุกเฉิน / งานที่ไม่ได้อยู่ในแผน 3-Weeks
            </button>

            {showEmergency && (
              <div style={{ background:"#070f1c", border:"1px solid #ef444444", borderRadius:10, padding:14, marginBottom:14 }}>
                <Inp label="ชื่องาน *" value={emergName} onChange={setEmergName} placeholder="เช่น ซ่อมท่อแตกฉุกเฉิน" />
                <div style={{ height:8 }} />
                <Sel label="สาเหตุที่ไม่ได้อยู่ในแผน" value={emergReason} onChange={setEmergReason}
                  options={["เหตุฉุกเฉิน/อุบัติเหตุ","ลูกค้าขอเพิ่มงาน","แก้ไขงานที่ทำผิด (Rework)","อื่นๆ"]} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                  <Inp label="จำนวน" value={emergQty} onChange={setEmergQty} type="number" />
                  <Inp label="หน่วย" value={emergUnit} onChange={setEmergUnit} placeholder="เช่น จุด, ชม." />
                </div>
                <div style={{ background:"#ef444411", border:"1px solid #ef444444", borderRadius:8, padding:"8px 12px", color:"#ef4444", fontSize:11, marginTop:10, lineHeight:1.6 }}>
                  ℹ️ งานนี้จะ<b>ไม่ถูกรวม</b>เข้า % ความคืบหน้าของ 3-Weeks/S-Curve เพราะไม่ได้อยู่ในแผน — แต่จะถูกบันทึกไว้เป็นหลักฐาน
                </div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:14 }}>
              <Inp label="👷 คนงาน (แผน)" value={workerPlan} onChange={setWorkerPlan} type="number" placeholder="คน" />
              <Inp label="👷 คนงาน (จริง)" value={workerActual} onChange={setWorkerActual} type="number" placeholder="คน" />
              <Inp label="🚜 เครื่องจักรที่ใช้" value={equipment} onChange={setEquipment} placeholder="เครน, รถตัก" />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#64748b", fontSize:11, display:"block", marginBottom:4 }}>⚠️ ปัญหา/อุปสรรค</label>
              <textarea value={issues} onChange={e=>setIssues(e.target.value)} rows={2}
                style={{ width:"100%", background:"#070f1c", border:"1px solid #ef444433", borderRadius:8, padding:"8px 12px", color:"#e2e8f0", fontSize:13, fontFamily:"'Sarabun',sans-serif", boxSizing:"border-box" }} />
            </div>

            <Inp label="📷 บันทึกรูปภาพ (คำอธิบาย)" value={photoNote} onChange={setPhotoNote} placeholder="เช่น ภาพงานเทพื้นชั้น 3" />

            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <Btn onClick={submit} color="#10b981">บันทึก ✓ ({selectedCount} งานในแผน{emergName?" + 1 งานฉุกเฉิน":""})</Btn>
              <Btn onClick={()=>{setShowForm(false);resetForm();}} color="#334155">ยกเลิก</Btn>
            </div>
          </Card>
        </>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {reports.length === 0 && (
          <Card style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📝</div>
            <div style={{ color:"#475569", fontSize:14 }}>ยังไม่มีรายงาน</div>
          </Card>
        )}
        {reports.map(r => {
          const proj = data.projects.find(p=>p.id===r.projectId);
          const workerDiff = Number(r.workerActual||0) - Number(r.workerPlan||0);
          return (
            <Card key={r.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:10 }}>
                <div>
                  <div style={{ color:"#e2e8f0", fontSize:14, fontWeight:700 }}>{proj?.name || r.projectId}</div>
                  <div style={{ color:"#475569", fontSize:11 }}>📅 {fmtDate(r.date)} · 👤 {r.reporter} · ☀️ {r.weather}</div>
                </div>
                <button onClick={()=>{if(window.confirm("ลบรายงานนี้ใช่มั้ย? (ตัวเลขที่บวกเข้า 3-Weeks ไปแล้วจะไม่ถูกย้อนกลับอัตโนมัติ)"))onRemove(r.id);}}
                  style={{ background:"#ef444411", border:"1px solid #ef444433", borderRadius:6, padding:"4px 10px", color:"#ef4444", fontSize:11, cursor:"pointer" }}>🗑️</button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div style={{ background:"#3b82f611", border:"1px solid #3b82f622", borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ color:"#3b82f6", fontSize:11, fontWeight:700, marginBottom:3 }}>📘 งานในแผน</div>
                  <div style={{ color:"#94a3b8", fontSize:12 }}>{r.planWork || "-"}</div>
                </div>
                <div style={{ background:"#f59e0b11", border:"1px solid #f59e0b22", borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ color:"#f59e0b", fontSize:11, fontWeight:700, marginBottom:3 }}>📙 ทำจริง</div>
                  <div style={{ color:"#94a3b8", fontSize:12 }}>{r.actualWork || "-"}</div>
                </div>
              </div>

              {r.emergencyWork && (
                <div style={{ background:"#ef444411", border:"1px solid #ef444433", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                  <div style={{ color:"#ef4444", fontSize:11, fontWeight:700, marginBottom:3 }}>⚠️ งานฉุกเฉิน (ไม่รวมใน % คืบหน้า)</div>
                  <div style={{ color:"#94a3b8", fontSize:12 }}>{r.emergencyWork}</div>
                </div>
              )}

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", fontSize:12 }}>
                <Badge text={`คนงาน ${r.workerActual||0}/${r.workerPlan||0} (${workerDiff>=0?"+":""}${workerDiff})`} color={workerDiff<0?"#ef4444":"#10b981"} />
                {r.equipment && <Badge text={`🚜 ${r.equipment}`} color="#64748b" />}
                {r.issues && <Badge text="⚠️ มีปัญหา" color="#ef4444" />}
              </div>
              {r.issues && (
                <div style={{ marginTop:8, color:"#ef4444", fontSize:12, background:"#ef444411", borderRadius:6, padding:"6px 10px" }}>
                  ⚠️ {r.issues}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   3-WEEKS LOOK AHEAD
───────────────────────────────────────────── */
function WeeklyPlan({ data, user, role, onAdd, onRemove, hideProjectFilter }) {
  const [showForm, setShowForm] = useState(false);
  const myProjects = role?.projectIds === "ALL" || !role?.projectIds
    ? data.projects
    : data.projects.filter(p => role.projectIds.split(",").includes(p.id));

  const getWeekStart = (offset=0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset*7 - d.getDay() + 1);
    return d.toISOString().slice(0,10);
  };

  const WORK_TYPES = {
    AR: { label:"AR · สถาปัตยกรรม", color:"#3b82f6" },
    AC: { label:"AC · งานระบบ ACMV", color:"#10b981" },
    FP: { label:"FP · ป้องกันอัคคีภัย", color:"#ef4444" },
    EE: { label:"EE · ไฟฟ้า", color:"#f59e0b" },
    SN: { label:"SN · สุขาภิบาล", color:"#a78bfa" },
    OT: { label:"อื่นๆ", color:"#64748b" },
  };

  const [form, setForm] = useState({
    projectId: hideProjectFilter ? (data.projects[0]?.id || "") : "", weekStart: getWeekStart(0), activity:"",
    workType:"AR", planQty:"", actualQty:"", unit:"%", status:"กำลังทำ", note:"",
  });
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const submit = () => {
    if (!form.projectId || !form.activity) return;
    onAdd({ ...form, createdAt: new Date().toISOString() });
    setForm({ projectId: hideProjectFilter ? form.projectId : "", weekStart: getWeekStart(0), activity:"", workType:"AR", planQty:"", actualQty:"", unit:"%", status:"กำลังทำ", note:"" });
    setShowForm(false);
  };

  const weeks = [0,1,2].map(i => ({ offset:i, start: getWeekStart(i), label: i===0?"สัปดาห์นี้":i===1?"สัปดาห์หน้า":"อีก 2 สัปดาห์" }));
  const plans = data.weekly || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ color:"#e2e8f0", margin:0, fontSize:18, fontWeight:800 }}>📅 3-Weeks Look Ahead</h2>
          <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>วางแผนงานล่วงหน้า 3 สัปดาห์ · Plan vs Actual</p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)} color="#a78bfa">+ เพิ่มแผนงาน</Btn>
      </div>

      {showForm && (
        <Card style={{ borderColor:"#a78bfa44" }}>
          <h3 style={{ color:"#a78bfa", margin:"0 0 14px", fontSize:14 }}>📝 เพิ่มแผนงานสัปดาห์</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
            {!hideProjectFilter && (
              <Sel label="โปรเจกต์ *" value={form.projectId} onChange={f("projectId")}
                options={[{value:"",label:"-- เลือก --"},...myProjects.map(p=>({value:p.id,label:p.name}))]} />
            )}
            <Sel label="สัปดาห์" value={form.weekStart} onChange={f("weekStart")}
              options={weeks.map(w=>({value:w.start,label:`${w.label} (${w.start})`}))} />
            <Sel label="ประเภทงาน" value={form.workType} onChange={f("workType")}
              options={Object.entries(WORK_TYPES).map(([k,v])=>({value:k,label:v.label}))} />
            <Inp label="กิจกรรม *" value={form.activity} onChange={f("activity")} placeholder="เทพื้นชั้น 4" />
            <Inp label="แผน (Plan)" value={form.planQty} onChange={f("planQty")} type="number" placeholder="100" />
            <Inp label="ทำจริง (Actual)" value={form.actualQty} onChange={f("actualQty")} type="number" placeholder="0" />
            <Inp label="หน่วย" value={form.unit} onChange={f("unit")} placeholder="% หรือ ตร.ม." />
            <Sel label="สถานะ" value={form.status} onChange={f("status")} options={["รอดำเนินการ","กำลังทำ","เสร็จแล้ว","ล่าช้า"]} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}

      {weeks.map(w => {
        const weekPlans = plans.filter(p => p.weekStart === w.start);
        return (
          <Card key={w.start}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ color:"#e2e8f0", fontSize:14, fontWeight:700 }}>
                {w.offset===0 ? "🔵" : w.offset===1 ? "🟡" : "⚪"} {w.label}
              </div>
              <span style={{ color:"#475569", fontSize:11 }}>{fmtDate(w.start)}</span>
            </div>
            {weekPlans.length === 0 ? (
              <div style={{ color:"#334155", fontSize:12, textAlign:"center", padding:"16px 0" }}>ยังไม่มีแผนงาน</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {weekPlans.map(p => {
                  const proj = data.projects.find(x=>x.id===p.projectId);
                  const pct = Number(p.planQty) ? Math.round(Number(p.actualQty||0)/Number(p.planQty)*100) : 0;
                  const wt = WORK_TYPES[p.workType] || WORK_TYPES.OT;
                  return (
                    <div key={p.id} style={{ background:"#070f1c", borderRadius:8, padding:"10px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          {p.workType && <Badge text={p.workType} color={wt.color} />}
                          <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{p.activity}</span>
                          <span style={{ color:"#475569", fontSize:11 }}>{proj?.name}</span>
                        </div>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <Badge text={p.status} color={sc(p.status)} />
                          <button onClick={()=>{if(window.confirm("ลบแผนงานนี้ใช่มั้ย?"))onRemove(p.id);}}
                            style={{ background:"none", border:"none", color:"#ef4444", fontSize:11, cursor:"pointer" }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Prog v={pct} color={pct>=100?"#10b981":pct>=60?"#f59e0b":"#ef4444"} />
                        <span style={{ color:"#64748b", fontSize:11, whiteSpace:"nowrap" }}>{p.actualQty||0}/{p.planQty||0} {p.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   S-CURVE DASHBOARD
───────────────────────────────────────────── */
function SCurve({ data, hideProjectPicker, fixedProjectId }) {
  const [selectedProj, setSelectedProj] = useState(fixedProjectId || data.projects[0]?.id || "");
  const proj = data.projects.find(p => p.id === (fixedProjectId || selectedProj));
  const activeProjId = fixedProjectId || selectedProj;

  // คำนวณ Plan/Actual % จาก weekly_plans (3-Weeks) จัดกลุ่มตามเดือน
  const weeklyForProj = (data.weekly || []).filter(w => w.projectId === activeProjId);
  const monthMap = {}; // { "2026-06": { planSum, actualSum, count } }
  weeklyForProj.forEach(w => {
    if (!w.weekStart) return;
    const month = w.weekStart.slice(0,7); // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { planSum:0, actualSum:0, count:0 };
    monthMap[month].planSum   += Number(w.planQty||0);
    monthMap[month].actualSum += Number(w.actualQty||0);
    monthMap[month].count++;
  });

  const sortedMonths = Object.keys(monthMap).sort();
  const monthLabel = (m) => {
    const [y,mo] = m.split("-");
    const thMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return thMonths[Number(mo)-1] || m;
  };

  // คำนวณ % สะสม (cumulative) จาก weekly_plans จริง
  let cumPlan = 0, cumActual = 0;
  const months = [];
  const planValues = [];
  const actualValues = [];

  if (sortedMonths.length > 0) {
    sortedMonths.forEach(m => {
      const d = monthMap[m];
      const planPct   = d.planSum   ? Math.min((d.planSum   / (d.count*100)) * 100, 100) : 0;
      const actualPct = d.planSum   ? Math.min((d.actualSum / d.planSum) * 100, 100) : 0;
      months.push(monthLabel(m));
      planValues.push(Math.round(planPct));
      actualValues.push(Math.round(actualPct));
    });
  }

  // ถ้ายังไม่มีข้อมูล 3-Weeks เลย ให้ใช้ progress ของโปรเจกต์เป็น fallback เดียว
  const hasRealData = sortedMonths.length > 0;
  const finalMonths = hasRealData ? months : ["ยังไม่มีข้อมูล"];
  const finalPlan   = hasRealData ? planValues  : [0];
  const finalActual = hasRealData ? actualValues: [proj?.progress||0];

  const maxW = 580, maxH = 220, padL = 40, padB = 30;
  const stepX = finalMonths.length > 1 ? (maxW - padL) / (finalMonths.length - 1) : 0;
  const toY = (v) => maxH - padB - (v/100)*(maxH-padB-10);
  const toX = (i) => padL + i*stepX;

  const planPath = finalPlan.map((v,i) => `${i===0?"M":"L"} ${toX(i)} ${toY(v)}`).join(" ");
  const actualPath = finalActual.filter(v=>v!==null).map((v,i) => `${i===0?"M":"L"} ${toX(i)} ${toY(v)}`).join(" ");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <h2 style={{ color:"#e2e8f0", margin:0, fontSize:18, fontWeight:800 }}>📈 S-Curve Dashboard</h2>
        {!hideProjectPicker && (
          <Sel value={selectedProj} onChange={setSelectedProj}
            options={data.projects.map(p=>({value:p.id,label:p.name}))} />
        )}
      </div>

      {!proj ? (
        <Card style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ color:"#475569", fontSize:14 }}>เลือกโปรเจกต์เพื่อดู S-Curve</div>
        </Card>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
            <StatCardSmall label="แผนปัจจุบัน" value={`${finalPlan[finalPlan.length-1]||0}%`} color="#3b82f6" />
            <StatCardSmall label="ทำจริงปัจจุบัน (จาก 3-Weeks)" value={`${finalActual[finalActual.length-1]||0}%`} color="#f59e0b" />
            <StatCardSmall label="ส่วนต่าง" value={`${(finalActual[finalActual.length-1]||0)-(finalPlan[finalPlan.length-1]||0)}%`} color={(finalActual[finalActual.length-1]||0)>=(finalPlan[finalPlan.length-1]||0)?"#10b981":"#ef4444"} />
          </div>

          {/* S-Curve Chart */}
          <Card>
            <h3 style={{ color:"#e2e8f0", margin:"0 0 14px", fontSize:14, fontWeight:700 }}>เส้นโค้ง S-Curve · {proj.name}</h3>
            <svg viewBox={`0 0 ${maxW+20} ${maxH+20}`} style={{ width:"100%", height:"auto" }}>
              {/* Grid lines */}
              {[0,25,50,75,100].map(v=>(
                <g key={v}>
                  <line x1={padL} y1={toY(v)} x2={maxW} y2={toY(v)} stroke="#1e293b" strokeWidth="0.5"/>
                  <text x={padL-8} y={toY(v)} fill="#475569" fontSize="10" textAnchor="end" dominantBaseline="central">{v}%</text>
                </g>
              ))}
              {/* X labels */}
              {finalMonths.map((m,i)=>(
                <text key={i} x={toX(i)} y={maxH-padB+18} fill="#475569" fontSize="10" textAnchor="middle">{m}</text>
              ))}
              {/* Plan line */}
              <path d={planPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 3"/>
              {/* Actual line */}
              <path d={actualPath} fill="none" stroke="#f59e0b" strokeWidth="2.5"/>
              {/* Dots */}
              {finalPlan.map((v,i)=><circle key={"p"+i} cx={toX(i)} cy={toY(v)} r="3" fill="#3b82f6"/>)}
              {finalActual.map((v,i)=> v!==null && <circle key={"a"+i} cx={toX(i)} cy={toY(v)} r="3" fill="#f59e0b"/>)}
            </svg>
            <div style={{ display:"flex", gap:16, marginTop:10, justifyContent:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:14, height:2, background:"#3b82f6", display:"inline-block" }}/>
                <span style={{ color:"#64748b", fontSize:11 }}>แผน (Plan)</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:14, height:2, background:"#f59e0b", display:"inline-block" }}/>
                <span style={{ color:"#64748b", fontSize:11 }}>ทำจริง (Actual)</span>
              </div>
            </div>
            {!hasRealData && (
              <div style={{ color:"#475569", fontSize:11, textAlign:"center", marginTop:10 }}>
                💡 ยังไม่มีข้อมูลจาก "3-Weeks" — เพิ่มแผนงานในแท็บ 3-Weeks ก่อน เพื่อให้ S-Curve คำนวณอัตโนมัติ
              </div>
            )}
          </Card>


          {/* Bar Chart รายเดือน */}
          <Card>
            <h3 style={{ color:"#e2e8f0", margin:"0 0 14px", fontSize:14, fontWeight:700 }}>เปรียบเทียบรายเดือน (Bar Chart)</h3>
            <div style={{ display:"flex", gap:16, alignItems:"flex-end", height:160, paddingBottom:20, overflowX:"auto" }}>
              {finalMonths.map((m,i) => (
                <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:50 }}>
                  <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:120 }}>
                    <div style={{ width:16, background:"#3b82f6", borderRadius:"3px 3px 0 0", height:`${(finalPlan[i]||0)/100*120}px` }} title={`Plan: ${finalPlan[i]}%`}/>
                    <div style={{ width:16, background:"#f59e0b", borderRadius:"3px 3px 0 0", height:`${(finalActual[i]||0)/100*120}px` }} title={`Actual: ${finalActual[i]}%`}/>
                  </div>
                  <span style={{ color:"#64748b", fontSize:10 }}>{m}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCardSmall({ label, value, color }) {
  return (
    <Card>
      <div style={{ color:"#64748b", fontSize:11, marginBottom:6 }}>{label}</div>
      <div style={{ color, fontSize:22, fontWeight:800 }}>{value}</div>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   GANTT / แผนงานโครงการ
───────────────────────────────────────────── */
function GanttPlan({ data, onAdd, onRemove, hideProjectPicker }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedProj, setSelectedProj] = useState(data.projects[0]?.id || "");

  const [form, setForm] = useState({
    projectId: hideProjectPicker ? (data.projects[0]?.id || "") : "", name:"", planStart:"", planEnd:"", actualStart:"", actualEnd:"", progress:"0", critical:"no",
  });
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const submit = () => {
    if (!form.projectId || !form.name || !form.planStart || !form.planEnd) return;
    onAdd({ ...form, createdAt: new Date().toISOString() });
    setForm({ projectId: hideProjectPicker ? form.projectId : "", name:"", planStart:"", planEnd:"", actualStart:"", actualEnd:"", progress:"0", critical:"no" });
    setShowForm(false);
  };

  const activities = (data.activities||[])
    .filter(a => hideProjectPicker || a.projectId === selectedProj)
    .sort((a,b) => new Date(a.planStart) - new Date(b.planStart));

  // หาช่วงเวลารวมเพื่อ scale timeline
  const allDates = activities.flatMap(a => [a.planStart, a.planEnd].filter(Boolean));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d=>new Date(d)))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d=>new Date(d)))) : new Date();
  const totalDays = Math.max((maxDate - minDate) / 86400000, 1);

  const dayOffset = (dateStr) => dateStr ? (new Date(dateStr) - minDate) / 86400000 : 0;
  const dayDuration = (s,e) => s && e ? Math.max((new Date(e) - new Date(s)) / 86400000, 1) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ color:"#e2e8f0", margin:0, fontSize:18, fontWeight:800 }}>📋 แผนงานโครงการ (Gantt)</h2>
          <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>{activities.length} กิจกรรม</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {!hideProjectPicker && (
            <Sel value={selectedProj} onChange={setSelectedProj} options={data.projects.map(p=>({value:p.id,label:p.name}))} />
          )}
          <Btn onClick={()=>setShowForm(!showForm)} color="#10b981">+ เพิ่มกิจกรรม</Btn>
        </div>
      </div>

      {showForm && (
        <Card style={{ borderColor:"#10b98144" }}>
          <h3 style={{ color:"#10b981", margin:"0 0 14px", fontSize:14 }}>📝 เพิ่มกิจกรรมในแผนงาน</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
            {!hideProjectPicker && (
              <Sel label="โปรเจกต์ *" value={form.projectId} onChange={f("projectId")}
                options={[{value:"",label:"-- เลือก --"},...data.projects.map(p=>({value:p.id,label:p.name}))]} />
            )}
            <Inp label="ชื่อกิจกรรม *" value={form.name} onChange={f("name")} placeholder="งานฐานราก" />
            <Inp label="แผนเริ่ม *" value={form.planStart} onChange={f("planStart")} type="date" />
            <Inp label="แผนจบ *" value={form.planEnd} onChange={f("planEnd")} type="date" />
            <Inp label="เริ่มจริง" value={form.actualStart} onChange={f("actualStart")} type="date" />
            <Inp label="จบจริง" value={form.actualEnd} onChange={f("actualEnd")} type="date" />
            <Inp label="ความคืบหน้า (%)" value={form.progress} onChange={f("progress")} type="number" />
            <Sel label="Critical Path?" value={form.critical} onChange={f("critical")} options={[{value:"no",label:"ไม่ใช่"},{value:"yes",label:"ใช่"}]} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}

      {activities.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
          <div style={{ color:"#475569", fontSize:14 }}>ยังไม่มีกิจกรรมในแผนงาน</div>
        </Card>
      ) : (
        <Card style={{ overflowX:"auto" }}>
          <div style={{ minWidth:600 }}>
            {activities.map(a => {
              const planLeft = (dayOffset(a.planStart)/totalDays)*100;
              const planWidth = (dayDuration(a.planStart,a.planEnd)/totalDays)*100;
              const actualLeft = a.actualStart ? (dayOffset(a.actualStart)/totalDays)*100 : null;
              const actualWidth = a.actualStart && a.actualEnd ? (dayDuration(a.actualStart,a.actualEnd)/totalDays)*100 : 0;
              return (
                <div key={a.id} style={{ marginBottom:16, paddingBottom:12, borderBottom:"1px solid #0d1929" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:6 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{a.name}</span>
                      {a.critical==="yes" && <Badge text="Critical" color="#ef4444" />}
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ color:"#64748b", fontSize:11 }}>{a.progress||0}%</span>
                      <button onClick={()=>{if(window.confirm("ลบกิจกรรมนี้ใช่มั้ย?"))onRemove(a.id);}}
                        style={{ background:"none", border:"none", color:"#ef4444", fontSize:11, cursor:"pointer" }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ position:"relative", height:32, background:"#070f1c", borderRadius:6 }}>
                    {/* Plan bar */}
                    <div style={{ position:"absolute", left:`${planLeft}%`, width:`${planWidth}%`, top:2, height:12, background:"#3b82f644", border:"1px solid #3b82f6", borderRadius:4 }} title={`Plan: ${fmtDate(a.planStart)} - ${fmtDate(a.planEnd)}`}/>
                    {/* Actual bar */}
                    {actualLeft !== null && (
                      <div style={{ position:"absolute", left:`${actualLeft}%`, width:`${actualWidth}%`, top:18, height:12, background:"#f59e0b88", border:"1px solid #f59e0b", borderRadius:4 }} title={`Actual: ${fmtDate(a.actualStart)} - ${fmtDate(a.actualEnd)}`}/>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:12, marginTop:4, fontSize:10, color:"#475569" }}>
                    <span>📘 Plan: {fmtDate(a.planStart)} → {fmtDate(a.planEnd)}</span>
                    {a.actualStart && <span>📙 Actual: {fmtDate(a.actualStart)} → {a.actualEnd?fmtDate(a.actualEnd):"กำลังทำ"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROJECT DETAIL — รวม Daily/Weekly/S-Curve/Gantt ของโปรเจกต์เดียว
───────────────────────────────────────────── */
function ProjectDetail({ projectId, data, user, role, hooks, onBack }) {
  const [subTab, setSubTab] = useState("overview");
  const proj = data.projects.find(p => p.id === projectId);

  if (!proj) {
    return (
      <Card style={{ textAlign:"center", padding:"40px 20px" }}>
        <div style={{ color:"#475569", fontSize:14, marginBottom:14 }}>ไม่พบโปรเจกต์นี้</div>
        <Btn onClick={onBack} color="#3b82f6">← กลับหน้าโปรเจกต์</Btn>
      </Card>
    );
  }

  // กรองข้อมูลเฉพาะโปรเจกต์นี้
  const scopedData = {
    ...data,
    projects:   [proj],
    tasks:      data.tasks.filter(t => t.projectId === projectId),
    daily:      (data.daily || []).filter(d => d.projectId === projectId),
    weekly:     (data.weekly || []).filter(w => w.projectId === projectId),
    progress:   (data.progress || []).filter(p => p.projectId === projectId),
    activities: (data.activities || []).filter(a => a.projectId === projectId),
  };

  const subTabs = [
    { id:"overview", icon:"📊", label:"ภาพรวม" },
    { id:"daily",    icon:"📝", label:"Daily Report" },
    { id:"weekly",   icon:"📅", label:"3-Weeks" },
    { id:"scurve",   icon:"📈", label:"S-Curve" },
    { id:"gantt",    icon:"📋", label:"แผนงาน" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div>
        <button onClick={onBack}
          style={{ background:"none", border:"none", color:"#64748b", fontSize:13, cursor:"pointer", marginBottom:10, padding:0 }}>
          ← กลับหน้าโปรเจกต์ทั้งหมด
        </button>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
          <div>
            <h2 style={{ color:"#e2e8f0", margin:0, fontSize:20, fontWeight:800 }}>🏗️ {proj.name}</h2>
            <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>👤 {proj.client} · 👷 {proj.manager}</p>
          </div>
          <Badge text={proj.status} color={sc(proj.status)} />
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", borderBottom:"1px solid #1e293b", paddingBottom:10 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={()=>setSubTab(t.id)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9, border:`1px solid ${subTab===t.id?"#f59e0b":"#1e293b"}`, background:subTab===t.id?"#f59e0b1a":"#0d1929", color:subTab===t.id?"#f59e0b":"#64748b", fontSize:13, fontWeight:subTab===t.id?700:400, cursor:"pointer" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Sub Tab Content */}
      {subTab === "overview" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
            <StatCardSmall label="ความคืบหน้า" value={`${proj.progress||0}%`} color="#f59e0b" />
            <StatCardSmall label="งบประมาณ" value={`฿${fmt(proj.budget)}`} color="#a78bfa" />
            <StatCardSmall label="ใช้ไปแล้ว" value={`฿${fmt(proj.spent)}`} color={Number(proj.spent)>Number(proj.budget)?"#ef4444":"#10b981"} />
            <StatCardSmall label="งาน" value={`${scopedData.tasks.filter(t=>t.status==="เสร็จแล้ว").length}/${scopedData.tasks.length}`} color="#3b82f6" />
          </div>
          <Card>
            <h3 style={{ color:"#e2e8f0", margin:"0 0 10px", fontSize:14, fontWeight:700 }}>📋 รายละเอียดโปรเจกต์</h3>
            <div style={{ display:"grid", gridTemplateColumns:"110px 1fr", gap:"4px 8px", fontSize:13 }}>
              <span style={{ color:"#64748b" }}>🔖 รหัสโครงการ</span><span style={{ color:"#e2e8f0" }}>{proj.code || "-"}</span>
              <span style={{ color:"#64748b" }}>📅 วันเริ่ม</span><span style={{ color:"#e2e8f0" }}>{fmtDate(proj.startDate)}</span>
              <span style={{ color:"#64748b" }}>🏁 วันสิ้นสุด</span><span style={{ color:"#e2e8f0" }}>{fmtDate(proj.endDate)}</span>
              <span style={{ color:"#64748b" }}>🚜 วันเครื่องเข้า</span><span style={{ color:"#e2e8f0" }}>{fmtDate(proj.mobilizeDate)}</span>
              <span style={{ color:"#64748b" }}>👷 ผู้จัดการ</span><span style={{ color:"#e2e8f0" }}>{proj.manager || "-"}</span>
              <span style={{ color:"#64748b" }}>👨‍🔧 โฟร์แมน</span><span style={{ color:"#e2e8f0" }}>{proj.foreman || "-"}</span>
              <span style={{ color:"#64748b" }}>👤 ลูกค้า</span><span style={{ color:"#e2e8f0" }}>{proj.client || "-"}</span>
            </div>
          </Card>
          <Card>
            <h3 style={{ color:"#e2e8f0", margin:"0 0 12px", fontSize:14, fontWeight:700 }}>🕓 กิจกรรมล่าสุด</h3>
            {scopedData.daily.length === 0 ? (
              <div style={{ color:"#334155", fontSize:12, textAlign:"center", padding:"12px 0" }}>ยังไม่มี Daily Report</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {scopedData.daily.slice(0,3).map(r => (
                  <div key={r.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, background:"#070f1c", padding:"8px 12px", borderRadius:6 }}>
                    <span style={{ color:"#94a3b8" }}>{r.actualWork?.slice(0,40)}...</span>
                    <span style={{ color:"#475569" }}>{fmtDate(r.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {subTab === "daily"  && <DailyReport data={scopedData} user={user} role={role} onAdd={item=>hooks.daily.add({...item, projectId})} onRemove={id=>hooks.daily.remove(id)} onUpdateWeekly={(id,patch)=>hooks.weekly.update(id,patch)} hideProjectFilter />}
      {subTab === "weekly" && <WeeklyPlan data={scopedData} user={user} role={role} onAdd={item=>hooks.weekly.add({...item, projectId})} onRemove={id=>hooks.weekly.remove(id)} />}
      {subTab === "scurve" && <SCurve data={scopedData} hideProjectPicker fixedProjectId={projectId} />}
      {subTab === "gantt"  && <GanttPlan data={scopedData} onAdd={item=>hooks.activities.add({...item, projectId})} onRemove={id=>hooks.activities.remove(id)} hideProjectPicker />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
function Dashboard({data}) {
  const totalBudget = data.projects.reduce((a,p)=>a+Number(p.budget),0);
  const totalExp = data.expenses.reduce((a,e)=>a+Number(e.amount),0);
  const stats = [
    {icon:"🏗️",label:"โปรเจกต์",value:data.projects.length,sub:`${data.projects.filter(p=>p.status==="กำลังดำเนินการ").length} กำลังดำเนินการ`,color:"#f59e0b"},
    {icon:"✅",label:"งาน",value:`${data.tasks.filter(t=>t.status==="เสร็จแล้ว").length}/${data.tasks.length}`,sub:"งานเสร็จแล้ว",color:"#10b981"},
    {icon:"📦",label:"วัสดุต่ำ",value:data.materials.filter(m=>m.qty<=m.minStock).length,sub:"รายการต้องเติม",color:"#ef4444"},
    {icon:"💰",label:"งบรวม",value:`฿${fmt(totalBudget)}`,sub:`ใช้ไป ${Math.round(totalExp/totalBudget*100)}%`,color:"#a78bfa"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12}}>
        {stats.map((s,i)=>(
          <Card key={i}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
              <span style={{color:"#64748b",fontSize:12}}>{s.label}</span>
            </div>
            <div style={{color:"#e2e8f0",fontSize:24,fontWeight:800,lineHeight:1}}>{s.value}</div>
            <div style={{color:s.color,fontSize:11,marginTop:5}}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 style={{color:"#e2e8f0",margin:"0 0 16px",fontSize:15,fontWeight:700}}>📋 สถานะโปรเจกต์</h3>
        {data.projects.map(p=>(
          <div key={p.id} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,flexWrap:"wrap",gap:6}}>
              <span style={{color:"#e2e8f0",fontWeight:600,fontSize:13}}>{p.name}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{color:"#64748b",fontSize:11}}>฿{fmt(p.spent)}/฿{fmt(p.budget)}</span>
                <Badge text={p.status} color={sc(p.status)}/>
              </div>
            </div>
            <Prog v={Number(p.progress)} color={Number(p.progress)===100?"#10b981":"#f59e0b"}/>
            <div style={{color:"#334155",fontSize:11,marginTop:3}}>{p.progress}% · 📅 {fmtDate(p.endDate)}</div>
          </div>
        ))}
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        <Card>
          <h3 style={{color:"#e2e8f0",margin:"0 0 14px",fontSize:15,fontWeight:700}}>📦 วัสดุต้องเติม</h3>
          {data.materials.filter(m=>m.qty<=m.minStock).map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#ef444411",borderRadius:8,marginBottom:6,border:"1px solid #ef444422"}}>
              <div>
                <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{m.name}</div>
                <div style={{color:"#64748b",fontSize:11}}>{m.location}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#ef4444",fontWeight:700,fontSize:13}}>{m.qty} {m.unit}</div>
                <div style={{color:"#64748b",fontSize:10}}>ขั้นต่ำ {m.minStock}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{color:"#e2e8f0",margin:"0 0 14px",fontSize:15,fontWeight:700}}>💳 ใบแจ้งหนี้ล่าสุด</h3>
          {data.invoices.slice(0,3).map(inv=>{
            const total = inv.items.reduce((a,i)=>a+i.price*i.qty,0);
            return (
              <div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#0a1525",borderRadius:8,marginBottom:6,border:"1px solid #1e293b"}}>
                <div>
                  <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{inv.id}</div>
                  <div style={{color:"#64748b",fontSize:11}}>{inv.client}</div>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                  <span style={{color:"#a78bfa",fontSize:13,fontWeight:700}}>฿{fmt(total)}</span>
                  <Badge text={inv.status} color={sc(inv.status)}/>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MATERIALS
───────────────────────────────────────────── */
function Materials({data,onAdd,onRemove}) {
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({name:"",unit:"",qty:"",minStock:"",price:"",supplier:"",location:""});
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const submit = () => {
    if(!form.name||!form.qty) return;
    onAdd({...form,qty:Number(form.qty),minStock:Number(form.minStock),price:Number(form.price),id:uid("M")});
    setForm({name:"",unit:"",qty:"",minStock:"",price:"",supplier:"",location:""});
    setShowForm(false);
  };
  const totalValue = data.materials.reduce((a,m)=>a+m.qty*m.price,0);
  const lowStock = data.materials.filter(m=>m.qty<=m.minStock).length;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{color:"#e2e8f0",margin:0,fontSize:18,fontWeight:800}}>📦 คลังวัสดุ</h2>
          <p style={{color:"#475569",fontSize:12,margin:"4px 0 0"}}>มูลค่าคงคลัง ฿{fmt(totalValue)} · ต่ำกว่าขั้นต่ำ {lowStock} รายการ</p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)}>+ เพิ่มวัสดุ</Btn>
      </div>
      {showForm&&(
        <Card style={{borderColor:"#f59e0b44"}}>
          <h3 style={{color:"#f59e0b",margin:"0 0 14px",fontSize:14}}>📝 เพิ่มวัสดุใหม่</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <Inp label="ชื่อวัสดุ *" value={form.name} onChange={f("name")}/>
            <Inp label="หน่วย" value={form.unit} onChange={f("unit")} placeholder="ถุง / เส้น / ม้วน"/>
            <Inp label="จำนวนคงเหลือ *" value={form.qty} onChange={f("qty")} type="number"/>
            <Inp label="ขั้นต่ำแจ้งเตือน" value={form.minStock} onChange={f("minStock")} type="number"/>
            <Inp label="ราคา/หน่วย (บาท)" value={form.price} onChange={f("price")} type="number"/>
            <Inp label="ผู้จัดจำหน่าย" value={form.supplier} onChange={f("supplier")}/>
            <Inp label="สถานที่เก็บ" value={form.location} onChange={f("location")} placeholder="โกดัง A"/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {data.materials.map(m=>{
          const low = m.qty<=m.minStock;
          const pct = Math.min(m.qty/Math.max(m.minStock*2,1)*100,100);
          return (
            <Card key={m.id} style={{borderColor:low?"#ef444433":"#1e293b"}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{width:42,height:42,borderRadius:10,background:low?"#ef444422":"#f59e0b22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📦</div>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{color:"#e2e8f0",fontSize:14,fontWeight:700}}>{m.name}</div>
                  <div style={{color:"#64748b",fontSize:12}}>🏭 {m.supplier} · 📍 {m.location}</div>
                  <div style={{marginTop:6}}>
                    <Prog v={pct} color={low?"#ef4444":"#10b981"}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:11}}>
                      <span style={{color:low?"#ef4444":"#64748b",fontWeight:low?700:400}}>คงเหลือ {m.qty} {m.unit}</span>
                      <span style={{color:"#334155"}}>ขั้นต่ำ {m.minStock}</span>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{color:"#a78bfa",fontSize:14,fontWeight:700}}>฿{fmt(m.price)}/{m.unit}</div>
                  <div style={{color:"#64748b",fontSize:11,marginTop:2}}>รวม ฿{fmt(m.qty*m.price)}</div>
                  {low&&<Badge text="สต็อกต่ำ" color="#ef4444"/>}
                  <button onClick={()=>{if(window.confirm(`ลบวัสดุ "${m.name}" ใช่มั้ย?`))onRemove(m.id);}}
                    style={{marginTop:6,background:"#ef444411",border:"1px solid #ef444433",borderRadius:6,padding:"4px 10px",color:"#ef4444",fontSize:11,cursor:"pointer",display:"block",width:"100%"}}>
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INVOICES
───────────────────────────────────────────── */
function Invoices({data,onAdd,onRemove}) {
  const [showForm,setShowForm] = useState(false);
  const [selected,setSelected] = useState(null);
  const [form,setForm] = useState({projectId:"",client:"",note:"",dueDate:"",items:[{desc:"",qty:1,unit:"งวด",price:""}]});
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const addItem = () => setForm(p=>({...p,items:[...p.items,{desc:"",qty:1,unit:"งวด",price:""}]}));
  const editItem = (i,k,v) => setForm(p=>({...p,items:p.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
  const submit = () => {
    if(!form.projectId||!form.client) return;
    const proj = data.projects.find(p=>p.id===form.projectId);
    onAdd({...form,id:uid("INV"),status:"ร่าง",issueDate:new Date().toISOString().slice(0,10),items:form.items.map(i=>({...i,price:Number(i.price),qty:Number(i.qty)}))});
    setForm({projectId:"",client:"",note:"",dueDate:"",items:[{desc:"",qty:1,unit:"งวด",price:""}]});
    setShowForm(false);
  };
  const totalAll = data.invoices.reduce((a,inv)=>a+inv.items.reduce((b,i)=>b+i.price*i.qty,0),0);
  const paid = data.invoices.filter(i=>i.status==="ชำระแล้ว").reduce((a,inv)=>a+inv.items.reduce((b,i)=>b+i.price*i.qty,0),0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{color:"#e2e8f0",margin:0,fontSize:18,fontWeight:800}}>🧾 ใบแจ้งหนี้ & ใบเสนอราคา</h2>
          <p style={{color:"#475569",fontSize:12,margin:"4px 0 0"}}>รวม ฿{fmt(totalAll)} · ชำระแล้ว ฿{fmt(paid)}</p>
        </div>
        <Btn onClick={()=>setShowForm(!showForm)}>+ สร้างใบแจ้งหนี้</Btn>
      </div>
      {showForm&&(
        <Card style={{borderColor:"#a78bfa44"}}>
          <h3 style={{color:"#a78bfa",margin:"0 0 14px",fontSize:14}}>🧾 สร้างใบแจ้งหนี้ใหม่</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
            <Sel label="โปรเจกต์ *" value={form.projectId} onChange={f("projectId")} options={[{v:"",l:"-- เลือก --"},...data.projects.map(p=>({v:p.id,l:p.name}))]}/>
            <Inp label="ชื่อลูกค้า *" value={form.client} onChange={f("client")}/>
            <Inp label="วันครบกำหนด" value={form.dueDate} onChange={f("dueDate")} type="date"/>
            <Inp label="หมายเหตุ" value={form.note} onChange={f("note")} placeholder="งวดที่ 1"/>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>รายการ</div>
            {form.items.map((it,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 120px",gap:6,marginBottom:6}}>
                <input value={it.desc} onChange={e=>editItem(i,"desc",e.target.value)} placeholder="รายละเอียด"
                  style={{background:"#070f1c",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
                <input value={it.qty} onChange={e=>editItem(i,"qty",e.target.value)} type="number" placeholder="จำนวน"
                  style={{background:"#070f1c",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
                <input value={it.unit} onChange={e=>editItem(i,"unit",e.target.value)} placeholder="หน่วย"
                  style={{background:"#070f1c",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
                <input value={it.price} onChange={e=>editItem(i,"price",e.target.value)} type="number" placeholder="ราคา (บาท)"
                  style={{background:"#070f1c",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
              </div>
            ))}
            <button onClick={addItem} style={{background:"transparent",border:"1px dashed #334155",borderRadius:7,padding:"6px 14px",color:"#64748b",fontSize:12,cursor:"pointer"}}>+ เพิ่มรายการ</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {data.invoices.map(inv=>{
          const total = inv.items.reduce((a,i)=>a+i.price*i.qty,0);
          const proj = data.projects.find(p=>p.id===inv.projectId);
          const open = selected===inv.id;
          return (
            <Card key={inv.id} style={{borderColor:open?"#a78bfa":"#1e293b",cursor:"pointer"}} >
              <div onClick={()=>setSelected(open?null:inv.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"#a78bfa22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🧾</div>
                  <div>
                    <div style={{color:"#e2e8f0",fontSize:14,fontWeight:700}}>{inv.id} <span style={{color:"#64748b",fontWeight:400,fontSize:12}}>· {inv.note}</span></div>
                    <div style={{color:"#64748b",fontSize:12}}>👤 {inv.client} · 🏗️ {proj?.name||"-"}</div>
                    <div style={{color:"#475569",fontSize:11}}>📅 ออก {fmtDate(inv.issueDate)} · ครบ {fmtDate(inv.dueDate)}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <span style={{color:"#a78bfa",fontSize:16,fontWeight:800}}>฿{fmt(total)}</span>
                  <Badge text={inv.status} color={sc(inv.status)}/>
                </div>
              </div>
              {open&&(
                <div style={{borderTop:"1px solid #1e293b",marginTop:12,paddingTop:12}}>
                  <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>รายการ</div>
                  {inv.items.map((it,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #0d1929",fontSize:13}}>
                      <span style={{color:"#94a3b8"}}>{it.desc}</span>
                      <span style={{color:"#e2e8f0"}}>{it.qty} {it.unit} × ฿{fmt(it.price)} = <strong style={{color:"#a78bfa"}}>฿{fmt(it.qty*it.price)}</strong></span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                    <button onClick={e=>{e.stopPropagation();if(window.confirm(`ลบใบแจ้งหนี้ ${inv.id} ใช่มั้ย?`))onRemove(inv.id);}}
                      style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:6,padding:"5px 12px",color:"#ef4444",fontSize:12,cursor:"pointer"}}>
                      🗑️ ลบใบแจ้งหนี้
                    </button>
                    <div style={{fontSize:15,fontWeight:800,color:"#a78bfa"}}>รวมทั้งสิ้น ฿{fmt(total)}</div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI MODULE (แชท + วิเคราะห์ + PDF)
───────────────────────────────────────────── */
async function streamClaude(messages,onChunk,pdfBase64=null) {
  const lastMsg = messages[messages.length-1];
  const content = pdfBase64
    ? [{type:"document",source:{type:"base64",media_type:"application/pdf",data:pdfBase64}},{type:"text",text:lastMsg.content}]
    : lastMsg.content;
  const msgs = [...messages.slice(0,-1),{role:"user",content}];
  // ใช้ /api/ai เพื่อซ่อน API Key ไว้ใน server
  const res = await fetch("/api/ai",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({messages:msgs,stream:true}),
  });
  if(!res.ok) throw new Error(`API ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf="";
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split("\n"); buf=lines.pop();
    for(const line of lines){
      if(line.startsWith("data: ")){
        const d=line.slice(6).trim();
        if(d==="[DONE]")return;
        try{const j=JSON.parse(d);if(j.delta?.text)onChunk(j.delta.text);}catch{}
      }
    }
  }
}

function MdText({text}) {
  return (
    <div style={{lineHeight:1.8}}>
      {text.split("\n").map((line,i)=>{
        if(line.startsWith("### "))return <div key={i} style={{color:"#f59e0b",fontWeight:700,fontSize:14,marginTop:12,marginBottom:3}}>{line.slice(4)}</div>;
        if(line.startsWith("## "))return <div key={i} style={{color:"#e2e8f0",fontWeight:800,fontSize:15,marginTop:14,marginBottom:5,borderBottom:"1px solid #1e293b",paddingBottom:4}}>{line.slice(3)}</div>;
        if(line.match(/^\d+\. /))return <div key={i} style={{color:"#cbd5e1",fontSize:13,marginLeft:10,marginBottom:3}}>{line}</div>;
        if(line.startsWith("- ")||line.startsWith("• "))return <div key={i} style={{color:"#cbd5e1",fontSize:13,marginLeft:10,marginBottom:2,display:"flex",gap:6}}><span style={{color:"#f59e0b",flexShrink:0}}>›</span><span>{line.slice(2)}</span></div>;
        if(line==="")return <div key={i} style={{height:6}}/>;
        const parts=line.split(/\*\*(.*?)\*\*/g);
        return <div key={i} style={{color:"#94a3b8",fontSize:13,marginBottom:2}}>{parts.map((p,j)=>j%2===1?<strong key={j} style={{color:"#e2e8f0"}}>{p}</strong>:p)}</div>;
      })}
    </div>
  );
}

function AIModule({data}) {
  const [mode,setMode]=useState("chat");
  const [chat,setChat]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [analyses,setAnalyses]=useState({});
  const [analysisLoading,setAnalysisLoading]=useState({});
  const [pdfFile,setPdfFile]=useState(null);
  const [pdfName,setPdfName]=useState("");
  const [pdfBase64,setPdfBase64]=useState(null);
  const chatRef=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[chat]);

  const systemCtx = `คุณคือ AI ผู้ช่วย ERP งานก่อสร้าง ตอบภาษาไทย กระชับ ใช้ emoji
ข้อมูลปัจจุบัน:
- โปรเจกต์ ${data.projects.length} โครงการ งบรวม ฿${fmt(data.projects.reduce((a,p)=>a+p.budget,0))}
- รายจ่ายรวม ฿${fmt(data.expenses.reduce((a,e)=>a+e.amount,0))}
- วัสดุสต็อกต่ำ ${data.materials.filter(m=>m.qty<=m.minStock).length} รายการ
- ใบแจ้งหนี้รอชำระ ${data.invoices.filter(i=>i.status==="รอชำระ").length} ใบ
${data.projects.map(p=>`• ${p.name}: ${p.progress}% งบ฿${fmt(p.budget)} สถานะ:${p.status} งาน:${p.tasksDone}/${p.tasksTotal}`).join("\n")}`;

  const sendChat = async () => {
    if((!input.trim()&&!pdfBase64)||loading)return;
    const msg = input.trim()||(pdfBase64?`วิเคราะห์ PDF นี้ให้ด้วย: ${pdfName}`:"");
    setInput("");
    const hist=[...chat,{role:"user",content:msg}];
    setChat([...hist,{role:"assistant",content:""}]);
    setLoading(true);
    const msgs=[{role:"user",content:systemCtx+"\n\n"+hist[0].content},...hist.slice(1)];
    try {
      let reply="";
      await streamClaude(msgs,chunk=>{
        reply+=chunk;
        setChat(prev=>{const u=[...prev];u[u.length-1]={role:"assistant",content:reply};return u;});
      },pdfBase64);
    } catch(e) {
      setChat(prev=>{const u=[...prev];u[u.length-1]={role:"assistant",content:`❌ ${e.message}`};return u;});
    }
    setLoading(false);
    setPdfBase64(null);setPdfName("");
  };

  const runAnalysis = async (type) => {
    if(analysisLoading[type])return;
    setAnalysisLoading(l=>({...l,[type]:true}));
    setAnalyses(a=>({...a,[type]:""}));
    const prompts = {
      budget:`${systemCtx}\n\nวิเคราะห์งบประมาณทุกโปรเจกต์:\n1. โปรเจกต์ไหนเสี่ยงงบบาน\n2. ประเภทรายจ่ายสูงสุด\n3. คำแนะนำประหยัดงบ`,
      risk:`${systemCtx}\n\nพยากรณ์ความเสี่ยงและล่าช้า:\n1. ระดับความเสี่ยงแต่ละโปรเจกต์ (สูง/กลาง/ต่ำ) พร้อมเหตุผล\n2. โปรเจกต์ที่น่าเป็นห่วงที่สุด\n3. มาตรการแก้ไขเร่งด่วน`,
      summary:`${systemCtx}\n\nสรุปรายงานภาพรวม ERP งานก่อสร้าง:\n1. ไฮไลต์ความสำเร็จ\n2. ปัญหาและความเสี่ยง\n3. To-do สัปดาห์หน้า\n4. สถานะการเงินโดยรวม`,
    };
    try {
      await streamClaude([{role:"user",content:prompts[type]}],chunk=>{
        setAnalyses(a=>({...a,[type]:(a[type]||"")+chunk}));
      });
    } catch(e) {
      setAnalyses(a=>({...a,[type]:`❌ ${e.message}`}));
    }
    setAnalysisLoading(l=>({...l,[type]:false}));
  };

  const handlePdf = e => {
    const file = e.target.files[0];
    if(!file)return;
    setPdfName(file.name);
    const reader = new FileReader();
    reader.onload=()=>{setPdfBase64(reader.result.split(",")[1]);};
    reader.readAsDataURL(file);
  };

  const modes = [{id:"chat",icon:"💬",label:"ถามตอบ"},{id:"analyze",icon:"📊",label:"วิเคราะห์"},{id:"pdf",icon:"📄",label:"อ่าน PDF"}];
  const analyzeCards = [
    {id:"budget",icon:"💰",label:"วิเคราะห์งบ",desc:"ตรวจสอบงบประมาณและค่าใช้จ่าย"},
    {id:"risk",icon:"⚠️",label:"พยากรณ์เสี่ยง",desc:"คาดการณ์ความล่าช้าและความเสี่ยง"},
    {id:"summary",icon:"📋",label:"สรุปรายงาน",desc:"ภาพรวมโปรเจกต์ทั้งหมด"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{background:"linear-gradient(135deg,#0d1929,#0a1020)",borderColor:"#f59e0b33"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:12,background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🤖</div>
          <div>
            <div style={{color:"#e2e8f0",fontSize:16,fontWeight:800}}>BuildERP AI Assistant</div>
            <div style={{color:"#64748b",fontSize:12}}>Claude Sonnet 4 · วิเคราะห์ข้อมูลแบบ Real-time</div>
          </div>
          <span style={{marginLeft:"auto",background:"#10b98122",color:"#10b981",border:"1px solid #10b98133",borderRadius:20,padding:"3px 10px",fontSize:11}}>🟢 พร้อมใช้งาน</span>
        </div>
      </Card>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {modes.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:10,border:`1px solid ${mode===m.id?"#f59e0b":"#1e293b"}`,background:mode===m.id?"#f59e0b22":"#0d1929",color:mode===m.id?"#f59e0b":"#64748b",fontSize:13,fontWeight:mode===m.id?700:400,cursor:"pointer"}}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* CHAT */}
      {mode==="chat"&&(
        <Card style={{display:"flex",flexDirection:"column",minHeight:460,padding:0,overflow:"hidden"}}>
          <div ref={chatRef} style={{flex:1,overflow:"auto",padding:16,display:"flex",flexDirection:"column",gap:10,minHeight:360}}>
            {chat.length===0&&(
              <div style={{textAlign:"center",padding:"40px 16px"}}>
                <div style={{fontSize:40,marginBottom:12}}>💬</div>
                <div style={{color:"#475569",fontSize:14,fontWeight:600,marginBottom:14}}>ถามอะไรเกี่ยวกับโปรเจกต์ได้เลย</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                  {["โปรเจกต์ไหนน่าเป็นห่วง?","วัสดุไหนต้องสั่งเพิ่ม?","สรุปสถานะงานสัปดาห์นี้","งบรวมเหลือเท่าไหร่?"].map(q=>(
                    <button key={q} onClick={()=>setInput(q)}
                      style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:8,justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,marginTop:3}}>🤖</div>}
                <div style={{maxWidth:"82%",background:m.role==="user"?"linear-gradient(135deg,#1d4ed8,#1e40af)":"#1e293b",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 14px",border:m.role==="user"?"none":"1px solid #334155"}}>
                  {m.role==="user"
                    ?<div style={{color:"#e2e8f0",fontSize:13}}>{m.content}</div>
                    :<>{m.content?<MdText text={m.content}/>:<div style={{display:"flex",gap:6,alignItems:"center",color:"#64748b",fontSize:12}}><Spinner/>กำลังคิด...</div>}</>
                  }
                </div>
              </div>
            ))}
          </div>
          {pdfBase64&&(
            <div style={{padding:"8px 16px",background:"#10b98111",borderTop:"1px solid #10b98133",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>📄</span>
              <span style={{color:"#10b981",fontSize:12,flex:1}}>{pdfName}</span>
              <button onClick={()=>{setPdfBase64(null);setPdfName("");}} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          )}
          <div style={{padding:"10px 14px",borderTop:"1px solid #1e293b",display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
              placeholder="ถามเกี่ยวกับโปรเจกต์ งบ วัสดุ..."
              style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:9,padding:"9px 13px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            <button onClick={sendChat} disabled={loading||(!input.trim()&&!pdfBase64)}
              style={{background:loading||(!input.trim()&&!pdfBase64)?"#1e293b":"linear-gradient(135deg,#f59e0b,#d97706)",color:loading||(!input.trim()&&!pdfBase64)?"#334155":"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:18,cursor:"pointer"}}>➤</button>
          </div>
        </Card>
      )}

      {/* ANALYZE */}
      {mode==="analyze"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {analyzeCards.map(ac=>(
            <Card key={ac.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:24}}>{ac.icon}</span>
                  <div>
                    <div style={{color:"#e2e8f0",fontSize:14,fontWeight:700}}>{ac.label}</div>
                    <div style={{color:"#64748b",fontSize:12}}>{ac.desc}</div>
                  </div>
                </div>
                <Btn onClick={()=>runAnalysis(ac.id)} disabled={analysisLoading[ac.id]}>
                  {analysisLoading[ac.id]?<><Spinner/>กำลังวิเคราะห์...</>:"▶ วิเคราะห์"}
                </Btn>
              </div>
              {(analyses[ac.id]||analysisLoading[ac.id])&&(
                <div style={{background:"#070f1c",border:"1px solid #1e293b",borderRadius:10,padding:16,minHeight:80}}>
                  {analyses[ac.id]?<MdText text={analyses[ac.id]}/>:<div style={{display:"flex",gap:8,alignItems:"center",color:"#475569",fontSize:13}}><Spinner/>Claude กำลังวิเคราะห์ข้อมูล...</div>}
                  {analysisLoading[ac.id]&&analyses[ac.id]&&<span style={{display:"inline-block",width:7,height:15,background:"#f59e0b",borderRadius:2,animation:"blink 1s infinite",marginLeft:2,verticalAlign:"text-bottom"}}/>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* PDF */}
      {mode==="pdf"&&(
        <Card>
          <h3 style={{color:"#e2e8f0",margin:"0 0 6px",fontSize:15,fontWeight:700}}>📄 อ่าน PDF ใบเสนอราคา / เอกสาร</h3>
          <p style={{color:"#64748b",fontSize:13,margin:"0 0 16px"}}>อัพโหลด PDF แล้ว Claude จะสรุปและวิเคราะห์ให้อัตโนมัติ</p>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handlePdf} style={{display:"none"}}/>
          {!pdfBase64?(
            <div onClick={()=>fileRef.current?.click()}
              style={{border:"2px dashed #334155",borderRadius:12,padding:"40px 20px",textAlign:"center",cursor:"pointer",transition:"border-color .2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#f59e0b"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}>
              <div style={{fontSize:40,marginBottom:10}}>📄</div>
              <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600,marginBottom:4}}>คลิกเพื่ออัพโหลด PDF</div>
              <div style={{color:"#475569",fontSize:12}}>รองรับ ใบเสนอราคา, สัญญา, BOQ, รายงาน</div>
            </div>
          ):(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"#10b98111",border:"1px solid #10b98133",borderRadius:10,marginBottom:14}}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1}}>
                  <div style={{color:"#10b981",fontSize:14,fontWeight:700}}>{pdfName}</div>
                  <div style={{color:"#475569",fontSize:12}}>พร้อมวิเคราะห์</div>
                </div>
                <button onClick={()=>{setPdfBase64(null);setPdfName("");}} style={{background:"#ef444422",border:"1px solid #ef444444",borderRadius:8,padding:"6px 12px",color:"#ef4444",fontSize:12,cursor:"pointer"}}>✕ ลบ</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:14}}>
                {[
                  {label:"สรุปใบเสนอราคา",prompt:"สรุปใบเสนอราคานี้: รายการ ราคา เงื่อนไข และข้อควรระวัง"},
                  {label:"เปรียบเทียบกับโปรเจกต์",prompt:`เปรียบเทียบใบเสนอราคานี้กับงบโปรเจกต์ของเรา: ${data.projects.map(p=>p.name).join(", ")}`},
                  {label:"ตรวจสอบความสมเหตุสมผล",prompt:"ราคาในเอกสารนี้สมเหตุสมผลสำหรับงานก่อสร้างหรือไม่ วิเคราะห์ให้ด้วย"},
                ].map(q=>(
                  <button key={q.label} onClick={()=>{setInput(q.prompt);setMode("chat");}}
                    style={{background:"#1e293b",border:"1px solid #334155",borderRadius:9,padding:"10px 14px",color:"#94a3b8",fontSize:12,cursor:"pointer",textAlign:"left",lineHeight:1.4}}>
                    💬 {q.label}
                  </button>
                ))}
              </div>
              <Btn onClick={()=>setMode("chat")} color="#3b82f6">ไปที่แชทเพื่อถามเพิ่มเติม →</Btn>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROJECTS / TASKS (compact)
───────────────────────────────────────────── */
function Projects({data,onAdd,onRemove,onOpen}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({code:"",name:"",client:"",budget:"",manager:"",foreman:"",startDate:"",endDate:"",mobilizeDate:""});
  const f=k=>v=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.name||!form.budget)return;
    onAdd({...form,budget:Number(form.budget),spent:0,status:"เริ่มใหม่",progress:0,id:uid("P")});
    setForm({code:"",name:"",client:"",budget:"",manager:"",foreman:"",startDate:"",endDate:"",mobilizeDate:""});
    setShowForm(false);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <h2 style={{color:"#e2e8f0",margin:0,fontSize:18,fontWeight:800}}>🏗️ โปรเจกต์</h2>
        <Btn onClick={()=>setShowForm(!showForm)}>+ เพิ่มโปรเจกต์</Btn>
      </div>
      {showForm&&(
        <Card style={{borderColor:"#f59e0b44"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
            <Inp label="รหัสโครงการ" value={form.code} onChange={f("code")} placeholder="เช่น P69015"/>
            <Inp label="ชื่อโปรเจกต์ *" value={form.name} onChange={f("name")}/>
            <Inp label="ลูกค้า" value={form.client} onChange={f("client")}/>
            <Inp label="งบประมาณ (บาท) *" value={form.budget} onChange={f("budget")} type="number"/>
            <Inp label="ผู้จัดการ" value={form.manager} onChange={f("manager")}/>
            <Inp label="โฟร์แมนผู้ดูแล" value={form.foreman} onChange={f("foreman")}/>
            <Inp label="วันเริ่ม" value={form.startDate} onChange={f("startDate")} type="date"/>
            <Inp label="วันสิ้นสุด" value={form.endDate} onChange={f("endDate")} type="date"/>
            <Inp label="วันเครื่องเข้า" value={form.mobilizeDate} onChange={f("mobilizeDate")} type="date"/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {data.projects.map(p=>{
          const projTasks = data.tasks.filter(t=>t.projectId===p.id);
          const doneTasks = projTasks.filter(t=>t.status==="เสร็จแล้ว").length;
          return (
          <Card key={p.id} style={{ cursor:"pointer", transition:"border-color .2s" }}>
            <div onClick={()=>onOpen(p.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{color:"#475569",fontSize:10,marginBottom:3}}>{p.code || p.id}</div>
                  <div style={{color:"#e2e8f0",fontSize:14,fontWeight:700,lineHeight:1.3}}>{p.name}</div>
                  <div style={{color:"#64748b",fontSize:12,marginTop:3}}>👤 {p.client || "-"}{p.foreman ? ` · 👨‍🔧 ${p.foreman}` : ""}</div>
                </div>
                <Badge text={p.status} color={sc(p.status)}/>
              </div>
              <Prog v={Number(p.progress)||0} color={Number(p.progress)===100?"#10b981":"#f59e0b"}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:12}}>
                <span style={{color:"#64748b"}}>งาน {doneTasks}/{projTasks.length}</span>
                <span style={{color:"#f59e0b",fontWeight:700}}>{p.progress||0}%</span>
              </div>
              <div style={{borderTop:"1px solid #1e293b",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:12,alignItems:"center"}}>
                <span style={{color:"#64748b"}}>งบ <span style={{color:"#a78bfa"}}>฿{fmt(p.budget)}</span></span>
                <span style={{color:"#64748b"}}>ใช้ <span style={{color:Number(p.spent)>Number(p.budget)?"#ef4444":"#10b981"}}>฿{fmt(p.spent)}</span></span>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={()=>onOpen(p.id)}
                style={{flex:1,background:"#3b82f622",border:"1px solid #3b82f644",borderRadius:8,padding:"6px",color:"#3b82f6",fontSize:12,cursor:"pointer",fontFamily:"'Sarabun',sans-serif"}}>
                📂 เปิดดูรายละเอียด
              </button>
              <button onClick={e=>{e.stopPropagation();if(window.confirm(`ลบโปรเจกต์ "${p.name}" ใช่มั้ย?`))onRemove(p.id);}}
                style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:8,padding:"6px 14px",color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"'Sarabun',sans-serif"}}>
                🗑️
              </button>
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}

function Tasks({data,onAdd,onRemove}) {
  const [filter,setFilter]=useState("ทั้งหมด");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({title:"",projectId:"",assignee:"",priority:"กลาง",due:"",category:""});
  const f=k=>v=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.title||!form.projectId)return;
    onAdd({...form,status:"รอดำเนินการ",id:uid("T")});
    setForm({title:"",projectId:"",assignee:"",priority:"กลาง",due:"",category:""});
    setShowForm(false);
  };
  const statuses=["ทั้งหมด","กำลังทำ","รอดำเนินการ","เสร็จแล้ว"];
  const filtered=filter==="ทั้งหมด"?data.tasks:data.tasks.filter(t=>t.status===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <h2 style={{color:"#e2e8f0",margin:0,fontSize:18,fontWeight:800}}>✅ ตารางงาน</h2>
        <Btn onClick={()=>setShowForm(!showForm)} color="#3b82f6">+ มอบหมายงาน</Btn>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {statuses.map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{background:filter===s?"#f59e0b22":"#0d1929",color:filter===s?"#f59e0b":"#64748b",border:`1px solid ${filter===s?"#f59e0b":"#1e293b"}`,borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer"}}>
            {s}{s!=="ทั้งหมด"&&` (${data.tasks.filter(t=>t.status===s).length})`}
          </button>
        ))}
      </div>
      {showForm&&(
        <Card style={{borderColor:"#3b82f644"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <Inp label="ชื่องาน *" value={form.title} onChange={f("title")}/>
            <Inp label="ผู้รับผิดชอบ" value={form.assignee} onChange={f("assignee")}/>
            <Inp label="ประเภท" value={form.category} onChange={f("category")}/>
            <Inp label="กำหนดส่ง" value={form.due} onChange={f("due")} type="date"/>
            <Sel label="โปรเจกต์ *" value={form.projectId} onChange={f("projectId")} options={[{v:"",l:"-- เลือก --"},...data.projects.map(p=>({v:p.id,l:p.name}))]}/>
            <Sel label="ความสำคัญ" value={form.priority} onChange={f("priority")} options={["สูง","กลาง","ต่ำ"]}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(t=>{
          const proj=data.projects.find(p=>p.id===t.projectId);
          return (
            <Card key={t.id} style={{padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{width:9,height:9,borderRadius:"50%",background:sc(t.status),flexShrink:0}}/>
                <div style={{flex:1,minWidth:140}}>
                  <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{t.title}</div>
                  <div style={{color:"#64748b",fontSize:11,marginTop:2}}>🏗️ {proj?.name||"-"} · 👤 {t.assignee} · 📅 {t.due}</div>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Badge text={t.category||"-"} color="#475569"/>
                  <Badge text={t.priority} color={sc(t.priority)}/>
                  <Badge text={t.status} color={sc(t.status)}/>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
// ─── Auth Wrapper ───────────────────────────────
function LoginRequired({ children }) {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied]   = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("builderp_user");
    if (!raw) { window.location.href = "/login"; return; }
    try {
      const u = JSON.parse(atob(raw));
      setUser(u);
      fetch(`/api/sheets?action=read&sheet=users`)
        .then(r => r.json())
        .then(async (json) => {
          const list = (!json.error && json.data) ? json.data : [];
          const userRow = list.find(x => x.lineUserId === u.userId);

          if (userRow && userRow.status === "active") {
            setRole(userRow);
            setLoading(false);
            return;
          }

          // ไม่มีสิทธิ์ — บันทึก LINE ID ไว้ให้ Admin เห็น (เฉพาะครั้งแรกที่ login ด้วย ID นี้)
          const alreadyLogged = list.some(x => x.lineUserId === u.userId);
          if (!alreadyLogged) {
            try {
              await fetch("/api/sheets", {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ action:"create", sheet:"users", data:{
                  lineUserId: u.userId, displayName: u.displayName,
                  role:"", projectIds:"", status:"awaiting_approval",
                } }),
              });
            } catch {}
          }
          setDenied(true);
          setLoading(false);
        })
        .catch(() => { setDenied(true); setLoading(false); });
    } catch {
      window.location.href = "/login";
    }
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070f1c", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"'Sarabun',sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #1e293b", borderTopColor:"#f59e0b", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
      <div style={{ color:"#475569", fontSize:14 }}>กำลังตรวจสอบสิทธิ์...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (denied) return (
    <div style={{ minHeight:"100vh", background:"#070f1c", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sarabun',sans-serif", padding:20 }}>
      <div style={{ background:"#0d1929", border:"1px solid #1e293b", borderRadius:20, padding:"40px 32px", maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:16 }}>⏳</div>
        <div style={{ color:"#e2e8f0", fontSize:16, fontWeight:700, marginBottom:8 }}>รอ Admin อนุมัติสิทธิ์</div>
        <div style={{ color:"#64748b", fontSize:13, lineHeight:1.7, marginBottom:20 }}>
          บัญชี LINE ของคุณ ({user?.displayName}) ยังไม่ได้รับสิทธิ์เข้าใช้งาน<br/>
          กรุณาติดต่อ Admin เพื่อขอสิทธิ์เข้าใช้งาน
        </div>
        <button onClick={()=>{ localStorage.removeItem("builderp_user"); window.location.href="/login"; }}
          style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:10, padding:"10px 20px", color:"#ef4444", fontSize:13, cursor:"pointer", fontFamily:"'Sarabun',sans-serif" }}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return children(user, role);
}

export default function BuildERPComplete() {
  return (
    <LoginRequired>
      {(user, role) => <BuildERPApp user={user} role={role} />}
    </LoginRequired>
  );
}

function BuildERPApp({ user, role }) {
  // ── Sheets hooks (ถ้าตั้งค่า APPS_SCRIPT_URL แล้วจะดึงจาก Sheets จริง) ──
  const projectsSheet  = useSheetData("projects",  INIT.projects);
  const tasksSheet     = useSheetData("tasks",      INIT.tasks);
  const expensesSheet  = useSheetData("expenses",   INIT.expenses);
  const materialsSheet = useSheetData("materials",  INIT.materials);
  const invoicesSheet  = useSheetData("invoices",   INIT.invoices);
  const usersSheet     = useSheetData("users",      []);
  const dailySheet     = useSheetData("daily_reports", []);
  const weeklySheet    = useSheetData("weekly_plans",  []);
  const progressSheet  = useSheetData("progress",      []);
  const activitiesSheet= useSheetData("activities",    []);

  const [notifications, setNotifications] = useState([]);
  const [tab,setTab] = useState("dashboard");
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);

  // รวมข้อมูลเป็น data object เดียว
  const data = {
    projects:   projectsSheet.data,
    tasks:      tasksSheet.data,
    expenses:   expensesSheet.data,
    materials:  materialsSheet.data,
    invoices:   invoicesSheet.data,
    employees:  INIT.employees,
    users:      usersSheet.data,
    daily:      dailySheet.data,
    weekly:     weeklySheet.data,
    progress:   progressSheet.data,
    activities: activitiesSheet.data,
    notifications,
  };

  // สร้าง notification เมื่อข้อมูลเปลี่ยน
  useEffect(() => { setNotifications(genNotifications(data)); }, [
    projectsSheet.data, materialsSheet.data, invoicesSheet.data
  ]);

  const syncing = projectsSheet.syncing || tasksSheet.syncing || materialsSheet.syncing || invoicesSheet.syncing;
  const unreadCount = notifications.filter(n=>!n.read).length;

  const isAdmin = role?.role === "admin";
  const navItems = [
    {id:"dashboard",  icon:"📊", label:"Dashboard"},
    {id:"projects",   icon:"🏗️",  label:"โปรเจกต์"},
    {id:"tasks",      icon:"✅", label:"ตารางงาน"},
    {id:"materials",  icon:"📦", label:"คลังวัสดุ"},
    {id:"invoices",   icon:"🧾", label:"ใบแจ้งหนี้"},
    {id:"ai",         icon:"🤖", label:"AI Assistant"},
    {id:"notif",      icon:"🔔", label:"แจ้งเตือน", badge:unreadCount},
    ...(isAdmin ? [{id:"admin", icon:"👑", label:"จัดการสิทธิ์"}] : []),
  ];

  const SideNav = () => (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"22px 18px 18px",borderBottom:"1px solid #1e293b"}}>
        <div style={{color:"#f59e0b",fontSize:19,fontWeight:900,letterSpacing:"-0.5px"}}>🏗️ BUILD<span style={{color:"#e2e8f0"}}>ERP</span></div>
        <div style={{color:"#334155",fontSize:10,marginTop:3}}>AI-Powered Construction ERP</div>
      </div>
      <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>{setTab(item.id);setSidebarOpen(false);setOpenProjectId(null);}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:"10px 12px",borderRadius:9,border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",background:tab===item.id?"#f59e0b1a":"transparent",color:tab===item.id?"#f59e0b":"#64748b",position:"relative"}}>
            <span style={{fontSize:17}}>{item.icon}</span>
            <span style={{fontSize:13,fontWeight:tab===item.id?700:400}}>{item.label}</span>
            {item.badge>0&&<span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:700}}>{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px 16px",borderTop:"1px solid #1e293b"}}>
        <div style={{background:"#f59e0b0d",border:"1px solid #f59e0b22",borderRadius:8,padding:"9px 11px",fontSize:11,color:"#f59e0b",lineHeight:1.6}}>
          {syncing ? "🔄 กำลังซิงค์..." : "🟢 ซิงค์แล้ว"}<br/>
          <span style={{color:"#475569"}}>Claude Sonnet 4 · Google Sheets</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:"#070f1c",fontFamily:"'Sarabun',sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#070f1c;}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px;}
        input,select,textarea{outline:none;font-family:'Sarabun',sans-serif;}
        input:focus,select:focus{border-color:#f59e0b!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @media(min-width:641px){.dsb{display:flex!important}.mbn{display:none!important}}
        @media(max-width:640px){.dsb{display:none!important}.mbn{display:flex!important}}
      `}</style>

      {/* Desktop Sidebar */}
      <div className="dsb" style={{width:210,background:"#0a1120",borderRight:"1px solid #1e293b",flexShrink:0,flexDirection:"column"}}>
        <SideNav/>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:100}}>
          <div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"#000000aa"}}/>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:230,background:"#0a1120",borderRight:"1px solid #1e293b"}}>
            <SideNav/>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{background:"#0a1120",borderBottom:"1px solid #1e293b",padding:"0 18px",height:54,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:"#475569",fontSize:21,cursor:"pointer",padding:4,lineHeight:1}}>☰</button>
          <span style={{color:"#e2e8f0",fontSize:14,fontWeight:700}}>
            {navItems.find(n=>n.id===tab)?.icon} {navItems.find(n=>n.id===tab)?.label}
          </span>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            {unreadCount>0&&(
              <button onClick={()=>setTab("notif")} style={{background:"#ef444422",border:"1px solid #ef444433",borderRadius:20,padding:"3px 10px",color:"#ef4444",fontSize:11,cursor:"pointer",fontWeight:700}}>
                🔔 {unreadCount}
              </button>
            )}
            <span style={{background:"#10b98122",color:"#10b981",border:"1px solid #10b98133",borderRadius:20,padding:"3px 10px",fontSize:11}}>🟢 Sheets</span>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#1e293b",borderRadius:20,padding:"3px 12px 3px 4px"}}>
              {user?.pictureUrl && <img src={user.pictureUrl} style={{width:24,height:24,borderRadius:"50%"}} alt=""/>}
              <span style={{color:"#e2e8f0",fontSize:12,fontWeight:600}}>{user?.displayName}</span>
              <span style={{color:"#475569",fontSize:10}}>·</span>
              <span style={{color:"#f59e0b",fontSize:11}}>{role?.role||"user"}</span>
            </div>
            <a href="#" onClick={e=>{e.preventDefault();localStorage.removeItem("builderp_user");window.location.href="/login";}} style={{background:"#ef444422",border:"1px solid #ef444433",borderRadius:20,padding:"3px 10px",color:"#ef4444",fontSize:11,textDecoration:"none"}}>ออก</a>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:18,paddingBottom:80}}>
          {tab==="dashboard" && <Dashboard data={data}/>}
          {tab==="projects"  && !openProjectId && <Projects data={data} onAdd={item=>projectsSheet.add(item)} onRemove={id=>projectsSheet.remove(id)} onOpen={id=>setOpenProjectId(id)}/>}
          {tab==="projects"  && openProjectId && (
            <ProjectDetail
              projectId={openProjectId}
              data={data}
              user={user}
              role={role}
              hooks={{ daily: dailySheet, weekly: weeklySheet, activities: activitiesSheet, progress: progressSheet }}
              onBack={()=>setOpenProjectId(null)}
            />
          )}
          {tab==="tasks"     && <Tasks data={data} onAdd={item=>tasksSheet.add(item)} onRemove={id=>tasksSheet.remove(id)}/>}

          {tab==="materials" && <Materials data={data} onAdd={item=>materialsSheet.add(item)} onRemove={id=>materialsSheet.remove(id)}/>}
          {tab==="invoices"  && <Invoices data={data} onAdd={item=>invoicesSheet.add(item)} onRemove={id=>invoicesSheet.remove(id)}/>}
          {tab==="ai"        && <AIModule data={data}/>}
          {tab==="notif"     && (
            <NotifPanel
              notifs={notifications}
              onRead={id=>setNotifications(n=>n.map(x=>x.id===id?{...x,read:true}:x))}
              onReadAll={()=>setNotifications(n=>n.map(x=>({...x,read:true})))}
            />
          )}
          {tab==="admin"     && isAdmin && <AdminPanel currentUser={user} projects={data.projects}/>}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mbn" style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a1120",borderTop:"1px solid #1e293b",zIndex:50,justifyContent:"space-around",padding:"6px 0 10px"}}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>{setTab(item.id);setOpenProjectId(null);}}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,background:"none",border:"none",cursor:"pointer",padding:"3px 0",color:tab===item.id?"#f59e0b":"#475569",position:"relative"}}>
            <span style={{fontSize:19}}>{item.icon}</span>
            <span style={{fontSize:9}}>{item.label}</span>
            {item.badge>0&&<span style={{position:"absolute",top:0,right:"18%",background:"#ef4444",color:"#fff",borderRadius:99,padding:"0px 5px",fontSize:9,fontWeight:700}}>{item.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
