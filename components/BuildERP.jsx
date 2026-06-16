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

  return { data, syncing, loaded, add, remove, reload: load };
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
      {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
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
            <div style={{color:"#334155",fontSize:11,marginTop:3}}>{p.progress}% · 📅 {p.endDate}</div>
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
                    <div style={{color:"#475569",fontSize:11}}>📅 ออก {inv.issueDate} · ครบ {inv.dueDate}</div>
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
function Projects({data,onAdd,onRemove}) {
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({name:"",client:"",budget:"",manager:"",startDate:"",endDate:""});
  const f=k=>v=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.name||!form.budget)return;
    onAdd({...form,budget:Number(form.budget),spent:0,status:"เริ่มใหม่",progress:0,tasksTotal:0,tasksDone:0,id:uid("P")});
    setForm({name:"",client:"",budget:"",manager:"",startDate:"",endDate:""});
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
            <Inp label="ชื่อโปรเจกต์ *" value={form.name} onChange={f("name")}/>
            <Inp label="ลูกค้า" value={form.client} onChange={f("client")}/>
            <Inp label="งบประมาณ (บาท) *" value={form.budget} onChange={f("budget")} type="number"/>
            <Inp label="ผู้จัดการ" value={form.manager} onChange={f("manager")}/>
            <Inp label="วันเริ่ม" value={form.startDate} onChange={f("startDate")} type="date"/>
            <Inp label="วันสิ้นสุด" value={form.endDate} onChange={f("endDate")} type="date"/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={submit} color="#10b981">บันทึก ✓</Btn>
            <Btn onClick={()=>setShowForm(false)} color="#334155">ยกเลิก</Btn>
          </div>
        </Card>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {data.projects.map(p=>(
          <Card key={p.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{color:"#475569",fontSize:10,marginBottom:3}}>{p.id}</div>
                <div style={{color:"#e2e8f0",fontSize:14,fontWeight:700,lineHeight:1.3}}>{p.name}</div>
                <div style={{color:"#64748b",fontSize:12,marginTop:3}}>👤 {p.client}</div>
              </div>
              <Badge text={p.status} color={sc(p.status)}/>
            </div>
            <Prog v={Number(p.progress)} color={Number(p.progress)===100?"#10b981":"#f59e0b"}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:12}}>
              <span style={{color:"#64748b"}}>งาน {p.tasksDone}/{p.tasksTotal}</span>
              <span style={{color:"#f59e0b",fontWeight:700}}>{p.progress}%</span>
            </div>
            <div style={{borderTop:"1px solid #1e293b",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:12,alignItems:"center"}}> 
              <span style={{color:"#64748b"}}>งบ <span style={{color:"#a78bfa"}}>฿{fmt(p.budget)}</span></span>
              <span style={{color:"#64748b"}}>ใช้ <span style={{color:Number(p.spent)>Number(p.budget)?"#ef4444":"#10b981"}}>฿{fmt(p.spent)}</span></span>
            </div>
            <button onClick={e=>{e.stopPropagation();if(window.confirm(`ลบโปรเจกต์ "${p.name}" ใช่มั้ย?`))onRemove(p.id);}}
              style={{marginTop:10,width:"100%",background:"#ef444411",border:"1px solid #ef444433",borderRadius:8,padding:"6px",color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"'Sarabun',sans-serif"}}>
              🗑️ ลบโปรเจกต์
            </button>
          </Card>
        ))}
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

  useEffect(() => {
    const u = getUserFromCookie();
    if (!u) { window.location.href = "/login"; return; }
    setUser(u);
    getUserRole(u.userId).then(r => {
      if (!r) { window.location.href = "/login?error=no_access"; return; }
      setRole(r);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070f1c", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"'Sarabun',sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #1e293b", borderTopColor:"#f59e0b", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
      <div style={{ color:"#475569", fontSize:14 }}>กำลังตรวจสอบสิทธิ์...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

  const [notifications, setNotifications] = useState([]);
  const [tab,setTab] = useState("dashboard");
  const [sidebarOpen,setSidebarOpen] = useState(false);

  // รวมข้อมูลเป็น data object เดียว
  const data = {
    projects:  projectsSheet.data,
    tasks:     tasksSheet.data,
    expenses:  expensesSheet.data,
    materials: materialsSheet.data,
    invoices:  invoicesSheet.data,
    employees: INIT.employees,
    notifications,
  };

  // สร้าง notification เมื่อข้อมูลเปลี่ยน
  useEffect(() => { setNotifications(genNotifications(data)); }, [
    projectsSheet.data, materialsSheet.data, invoicesSheet.data
  ]);

  const syncing = projectsSheet.syncing || tasksSheet.syncing || materialsSheet.syncing || invoicesSheet.syncing;
  const unreadCount = notifications.filter(n=>!n.read).length;

  const navItems = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"projects", icon:"🏗️", label:"โปรเจกต์"},
    {id:"tasks",    icon:"✅", label:"ตารางงาน"},
    {id:"materials",icon:"📦", label:"คลังวัสดุ"},
    {id:"invoices", icon:"🧾", label:"ใบแจ้งหนี้"},
    {id:"ai",       icon:"🤖", label:"AI Assistant"},
    {id:"notif",    icon:"🔔", label:"แจ้งเตือน", badge:unreadCount},
  ];

  const SideNav = () => (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"22px 18px 18px",borderBottom:"1px solid #1e293b"}}>
        <div style={{color:"#f59e0b",fontSize:19,fontWeight:900,letterSpacing:"-0.5px"}}>🏗️ BUILD<span style={{color:"#e2e8f0"}}>ERP</span></div>
        <div style={{color:"#334155",fontSize:10,marginTop:3}}>AI-Powered Construction ERP</div>
      </div>
      <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>{setTab(item.id);setSidebarOpen(false);}}
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
            <a href="/api/auth/logout" style={{background:"#ef444422",border:"1px solid #ef444433",borderRadius:20,padding:"3px 10px",color:"#ef4444",fontSize:11,textDecoration:"none"}}>ออก</a>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:18,paddingBottom:80}}>
          {tab==="dashboard" && <Dashboard data={data}/>}
          {tab==="projects"  && <Projects data={data} onAdd={item=>projectsSheet.add(item)} onRemove={id=>projectsSheet.remove(id)}/>}
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
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mbn" style={{position:"fixed",bottom:0,left:0,right:0,background:"#0a1120",borderTop:"1px solid #1e293b",zIndex:50,justifyContent:"space-around",padding:"6px 0 10px"}}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>setTab(item.id)}
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
