import { useState, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────
const FX_RATE = 1488;
const VIX_NOW = 31.05;
const CNN_NOW = 18; // 18 = Extreme Fear (0~100)

const CONDITIONS = [
  { rank:"1순위", emoji:"💹", title:"금리 스탠스",     pct:18, color:"#ff3b3b", role:"비중 조절",       roleDesc:"금리 전환 시 최대 비중 +20% 허용", data:[["기준금리","3.50~3.75%","neg"],["FOMC","매파 동결","neg"],["Core PCE","3.1%","neg"],["점도표","25bp 1회↓","warn"]], signal:"파월 매파 유지. 5월 FOMC + 후임 워쉬 지명이 핵심 변수." },
  { rank:"2순위", emoji:"🛢️", title:"유가 선물커브",   pct:28, color:"#f5c542", role:"매수 속도 조절",   roleDesc:"백워데이션 유지 시 매수 간격 2배로 늘림", data:[["WTI 현물","$99.64","neg"],["WTI 12월물","$77.36","warn"],["커브 구조","백워데이션","warn"],["4/6 최후통첩","D-8","neg"]], signal:"강한 백워데이션. 콘탱고 전환 전까지 매수 속도 절반 유지." },
  { rank:"3순위", emoji:"👷", title:"실업률 (후행)",   pct:15, color:"#ff3b3b", role:"참고용만",         roleDesc:"매수 결정에 직접 사용 안 함. 추세만 모니터링.", data:[["2월 실업률","4.4%","neg"],["2월 고용","–92,000명","neg"],["수정치","–69,000명↓","neg"],["추세","재악화","neg"]], signal:"후행지표. 매수 속도 조절 참고용으로만 사용." },
  { rank:"4순위", emoji:"📊", title:"기업 실적",       pct:12, color:"#f5c542", role:"비중 조절",       roleDesc:"EPS 하향 멈추면 최대 비중 제한 해제", data:[["S&P500","6,369","neg"],["VIX","31.05","neg"],["CAPE P/E","39.8x","neg"],["EPS 추세","하향 중","neg"]], signal:"4월 어닝시즌이 첫 리트머스. 하향 지속 시 최대 비중 –10%." },
  { rank:"5순위", emoji:"💳", title:"크레딧 스프레드", pct:20, color:"#4fc3f7", role:"최대 비중 캡",     roleDesc:"HY 700bp+ 시 최대 비중 40%로 강제 제한", data:[["HY 스프레드","487bp","neg"],["IG 스프레드","112bp","warn"],["전월 대비","+89bp↑","neg"],["위험 임계","700bp","warn"]], signal:"현재 경고 구간(487bp). 700bp 돌파 시 최대 비중 자동 캡 적용." },
];

const TOTAL = CONDITIONS.reduce((s,c)=>s+c.pct,0)/100;

function getMacroSpeed(score) {
  if (score<2) return { label:"공포", speed:"느리게", interval:"4~6주", col:"#ff3b3b" };
  if (score<3) return { label:"중립", speed:"보통",   interval:"2~3주", col:"#f5c542" };
  if (score<4) return { label:"안정", speed:"빠르게", interval:"1~2주", col:"#00e676" };
  return              { label:"과열", speed:"매우 천천히", interval:"8주+", col:"#4fc3f7" };
}

function getCnnStrength(cnn) {
  if (cnn<=25)  return { label:"Extreme Fear", strength:100, buy:"최대", col:"#ff3b3b", bg:"rgba(255,59,59,0.1)" };
  if (cnn<=45)  return { label:"Fear",         strength:70,  buy:"많이", col:"#f5c542", bg:"rgba(245,197,66,0.08)" };
  if (cnn<=55)  return { label:"Neutral",      strength:40,  buy:"보통", col:"#aaaacc", bg:"rgba(170,170,200,0.06)" };
  if (cnn<=75)  return { label:"Greed",        strength:20,  buy:"적게", col:"#00e676", bg:"rgba(0,230,118,0.07)" };
  return               { label:"Extreme Greed",strength:5,   buy:"최소", col:"#4fc3f7", bg:"rgba(79,195,247,0.07)" };
}

function getVixBoost(vix) {
  if (vix>=35) return { label:"패닉 (≥35)", boost:"+30%", mult:1.3, col:"#ff3b3b", override:true };
  if (vix>=25) return { label:"경계 (25~35)", boost:"+15%", mult:1.15, col:"#f5c542", override:false };
  if (vix>=20) return { label:"주의 (20~25)", boost:"±0%",  mult:1.0,  col:"#aaaacc", override:false };
  return              { label:"안정 (<20)",  boost:"–10%", mult:0.9,  col:"#00e676", override:false };
}

function getFxAdj(rate) {
  if (rate<1400) return { label:"LOW",    adj:"+10%", mult:1.1,  col:"#00e676", cap:100 };
  if (rate<1480) return { label:"NORMAL", adj:"±0%",  mult:1.0,  col:"#a0d070", cap:80  };
  if (rate<1550) return { label:"HIGH",   adj:"–15%", mult:0.85, col:"#f5c542", cap:70  };
  return                { label:"DANGER", adj:"–40%", mult:0.6,  col:"#ff3b3b", cap:30  };
}

// ── ALGORITHM OUTPUT ──────────────────────────────────────
function calcResult() {
  const cnn  = getCnnStrength(CNN_NOW);
  const vix  = getVixBoost(VIX_NOW);
  const macro= getMacroSpeed(TOTAL);
  const fx   = getFxAdj(FX_RATE);

  // Override: VIX≥35 AND Extreme Fear → MAX
  const isOverride = vix.override && cnn.label === "Extreme Fear";

  // Base strength from CNN, boosted by VIX
  // But if all three (CNN fear + VIX high + macro bad) are bad together,
  // avoid triple-penalty: treat macro as speed-only, not strength multiplier
  const rawStrength = isOverride ? 100 : Math.min(100, cnn.strength * vix.mult);
  const finalStrength = Math.min(100, rawStrength * fx.mult);
  const finalCap = Math.min(fx.cap, 15); // macro cap in fear zone

  return { cnn, vix, macro, fx, isOverride, rawStrength, finalStrength, finalCap };
}

// ── SMALL COMPONENTS ──────────────────────────────────────
function Bar({ pct, color, height=3 }) {
  const [w, setW] = useState(0);
  useEffect(()=>{ setTimeout(()=>setW(pct),400); },[pct]);
  return (
    <div style={{height, background:"#12121f", borderRadius:2}}>
      <div style={{height:"100%", width:`${w}%`, background:color, borderRadius:2,
        transition:"width 1s ease", boxShadow:`0 0 5px ${color}55`}}/>
    </div>
  );
}

function Ring({ score, max, size=96 }) {
  const [a,setA]=useState(false);
  useEffect(()=>{setTimeout(()=>setA(true),150);},[]);
  const r=size/2-7, circ=2*Math.PI*r;
  const offset=circ*(1-(a?score/max:0));
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#12121f" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ff3b3b" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{transition:"stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)",filter:"drop-shadow(0 0 7px #ff3b3b)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontFamily:"monospace",fontSize:24,fontWeight:900,color:"#ff3b3b",lineHeight:1}}>{score.toFixed(1)}</div>
        <div style={{fontFamily:"monospace",fontSize:9,color:"#444460",marginTop:2}}>/ {max}.0</div>
      </div>
    </div>
  );
}

function MiniArc({ pct, color, size=44 }) {
  const [a,setA]=useState(false);
  useEffect(()=>{setTimeout(()=>setA(true),500);},[]);
  const r=17, circ=2*Math.PI*r;
  const offset=circ*(1-(a?pct/100:0));
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#12121f" strokeWidth="5"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{transition:"stroke-dashoffset 1s ease",filter:`drop-shadow(0 0 3px ${color}88)`}}/>
    </svg>
  );
}

function CondCard({ c, i }) {
  const [open,setOpen]=useState(false);
  const vc=t=>t==="neg"?"#ff5555":t==="warn"?"#f5c542":"#00e676";
  return (
    <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:9,
      marginBottom:7,borderLeft:`3px solid ${c.color}`,overflow:"hidden",
      animation:`fi 0.4s ease ${i*0.06}s both`}}>
      <div style={{padding:"12px 13px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <MiniArc pct={c.pct} color={c.color}/>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.12em",marginBottom:2}}>{c.rank}</div>
                <div style={{fontSize:13,fontWeight:700,color:"#d0d0e8"}}>{c.emoji} {c.title}</div>
              </div>
              <div style={{fontFamily:"monospace",fontSize:19,fontWeight:900,color:c.color,lineHeight:1}}>{c.pct}%</div>
            </div>
            <div style={{marginTop:5}}><Bar pct={c.pct} color={c.color}/></div>
          </div>
        </div>
        <div style={{display:"inline-block",fontSize:9,fontFamily:"monospace",
          padding:"2px 7px",borderRadius:3,background:`${c.color}11`,
          color:c.color,border:`1px solid ${c.color}33`,marginBottom:8}}>
          역할: {c.role}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
          {c.data.map(([k,v,t],j)=>(
            <div key={j} style={{background:"#080812",border:"1px solid #151525",borderRadius:5,padding:"5px 8px"}}>
              <div style={{fontSize:9,color:"#444460",marginBottom:2}}>{k}</div>
              <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:vc(t)}}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setOpen(!open)}
          style={{background:"none",border:"none",color:"#444460",fontSize:10,
            fontFamily:"monospace",cursor:"pointer",padding:0,letterSpacing:"0.06em"}}>
          {open?"▲ 접기":"▼ 세부 + 적용 방법"}
        </button>
        {open&&(
          <div style={{marginTop:9}}>
            <div style={{background:"#06060f",borderLeft:`2px solid ${c.color}44`,
              padding:"7px 10px",borderRadius:"0 5px 5px 0",fontSize:11,
              color:"#6060a0",lineHeight:1.65,marginBottom:7}}>{c.signal}</div>
            <div style={{fontSize:10,color:"#555575",fontFamily:"monospace"}}>→ {c.roleDesc}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ALGORITHM FLOW COMPONENT ──────────────────────────────
function AlgoFlow() {
  const result = calcResult();
  const { cnn, vix, macro, fx, isOverride, finalStrength, finalCap } = result;

  const steps = [
    {
      id:"S0", label:"STEP 0", icon:"🎯", title:"가격 도달?",
      role:"트리거", roleCol:"#4fc3f7",
      desc:"가격 미도달 시 즉시 종료. 이후 단계 없음.",
      left:{ label:"NO → 종료", col:"#ff3b3b" },
      right:{ label:"YES → 다음 단계", col:"#00e676" },
      current: "YES", // assume price hit for demo
      currentVal: "가격 트리거 도달 가정",
      currentCol: "#00e676",
    },
    {
      id:"S1", label:"STEP 1", icon:"😱", title:"CNN 공포지수",
      role:"기본 매수 강도", roleCol:"#ff3b3b",
      desc:"공포 클수록 더 많이 산다.",
      currentVal: `${CNN_NOW}pt · ${cnn.label}`,
      currentCol: cnn.col,
      output: `기본 강도 ${cnn.strength}%`,
      outputCol: cnn.col,
      bg: cnn.bg,
    },
    {
      id:"S2", label:"STEP 2", icon:"📈", title:"VIX",
      role:"강도 보정 + 오버라이드 판단", roleCol:"#f5c542",
      desc:"패닉(≥35) 시 매크로 무시 → MAX 즉시 실행.",
      currentVal: `${VIX_NOW} · ${vix.label}`,
      currentCol: vix.col,
      output: vix.override ? "⚡ OVERRIDE 발동" : `강도 보정 ${vix.boost}`,
      outputCol: vix.override ? "#ff3b3b" : vix.col,
      override: vix.override,
    },
    {
      id:"S3", label:"STEP 3", icon:"📊", title:"매크로 점수",
      role:"속도 조절 (강도 아님)", roleCol:"#a0a0ff",
      desc:"중복 패널티 방지: 강도는 CNN+VIX가 결정. 매크로는 '언제 또 살지'만 결정.",
      currentVal: `${TOTAL.toFixed(1)}점 · ${macro.label}`,
      currentCol: macro.col,
      output: `다음 매수 간격 ${macro.interval}`,
      outputCol: macro.col,
    },
    {
      id:"S4", label:"STEP 4", icon:"💱", title:"환율",
      role:"수량(주수) 조정", roleCol:"#aaaacc",
      desc:"환율이 비싸면 주수를 줄인다. 가격 트리거 자체는 변경 안 함.",
      currentVal: `${FX_RATE}원 · ${fx.label}`,
      currentCol: fx.col,
      output: `수량 조정 ${fx.adj}`,
      outputCol: fx.col,
    },
  ];

  return (
    <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:12,
      padding:"14px 13px",marginBottom:14,animation:"fi 0.3s ease 0.02s both"}}>
      <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.18em",marginBottom:14}}>
        ── 매수 알고리즘 (실행 순서)
      </div>

      {/* OVERRIDE BANNER */}
      {isOverride && (
        <div style={{background:"rgba(255,59,59,0.12)",border:"1px solid rgba(255,59,59,0.4)",
          borderRadius:8,padding:"10px 12px",marginBottom:12,
          display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>⚡</span>
          <div>
            <div style={{fontSize:12,fontWeight:900,color:"#ff3b3b"}}>OVERRIDE 발동 중</div>
            <div style={{fontSize:10,color:"#9060a0"}}>VIX≥35 + Extreme Fear → 매크로 무시 → 즉시 MAX 실행</div>
          </div>
        </div>
      )}

      {/* STEPS */}
      {steps.map((s,i)=>(
        <div key={s.id} style={{position:"relative"}}>
          {/* connector line */}
          {i < steps.length-1 && (
            <div style={{position:"absolute",left:19,top:52,bottom:-8,width:1,
              background:"linear-gradient(180deg,#2a2a50,transparent)",zIndex:0}}/>
          )}

          <div style={{display:"flex",gap:11,marginBottom:i<steps.length-1?8:0,position:"relative",zIndex:1}}>
            {/* step badge */}
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:38,height:38,borderRadius:8,
                background: s.override?"rgba(255,59,59,0.15)":"#111122",
                border:`1px solid ${s.override?"rgba(255,59,59,0.4)":"#2a2a40"}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:14,lineHeight:1}}>{s.icon}</div>
                <div style={{fontFamily:"monospace",fontSize:7,color:"#444460",letterSpacing:"0.05em"}}>{s.label}</div>
              </div>
            </div>

            {/* content */}
            <div style={{flex:1,background:"#0a0a16",border:"1px solid #181828",
              borderRadius:8,padding:"9px 11px",
              borderLeft: s.override?"2px solid #ff3b3b":`2px solid ${s.roleCol}33`}}>
              {/* title row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:"#d0d0e8"}}>{s.title}</span>
                  <span style={{fontSize:9,fontFamily:"monospace",color:s.roleCol,
                    background:`${s.roleCol}11`,border:`1px solid ${s.roleCol}22`,
                    padding:"1px 6px",borderRadius:2,marginLeft:7}}>{s.role}</span>
                </div>
              </div>

              {/* current value */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:10,color:"#555575"}}>현재값</span>
                <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:s.currentCol}}>{s.currentVal}</span>
              </div>

              {/* output */}
              {s.output && (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:10,color:"#555575"}}>출력</span>
                  <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:s.outputCol,
                    background:`${s.outputCol}11`,padding:"1px 6px",borderRadius:2}}>{s.output}</span>
                </div>
              )}

              {/* NO/YES for step 0 */}
              {s.left && (
                <div style={{display:"flex",gap:6,marginTop:4}}>
                  <div style={{flex:1,padding:"4px 6px",borderRadius:4,textAlign:"center",
                    background:"rgba(255,59,59,0.07)",border:"1px solid rgba(255,59,59,0.2)"}}>
                    <span style={{fontSize:10,color:"#ff3b3b",fontWeight:700}}>{s.left.label}</span>
                  </div>
                  <div style={{flex:1,padding:"4px 6px",borderRadius:4,textAlign:"center",
                    background:"rgba(0,230,118,0.07)",border:"1px solid rgba(0,230,118,0.2)"}}>
                    <span style={{fontSize:10,color:"#00e676",fontWeight:700}}>{s.right.label}</span>
                  </div>
                </div>
              )}

              {/* desc */}
              <div style={{fontSize:10,color:"#44445f",marginTop:4,lineHeight:1.5}}>{s.desc}</div>
            </div>
          </div>
        </div>
      ))}

      {/* FINAL RESULT */}
      <div style={{marginTop:10,background: isOverride?"rgba(255,59,59,0.1)":"rgba(0,230,118,0.07)",
        border:`1px solid ${isOverride?"rgba(255,59,59,0.3)":"rgba(0,230,118,0.2)"}`,
        borderRadius:10,padding:"13px 14px"}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#444460",letterSpacing:"0.15em",marginBottom:10}}>
          ── FINAL OUTPUT (260329 기준)
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[
            { label:"실행 여부",    val: isOverride?"즉시 실행":"조건부 실행", col: isOverride?"#ff3b3b":"#00e676" },
            { label:"매수 강도",    val:`${Math.round(finalStrength)}%`,       col:"#f5c542" },
            { label:"최대 비중",    val:`${finalCap}%`,                        col:"#ff3b3b" },
            { label:"다음 간격",    val:macro.interval,                        col:macro.col },
          ].map((item,i)=>(
            <div key={i} style={{background:"#07070e",border:"1px solid #1a1a2e",borderRadius:7,padding:"9px 10px"}}>
              <div style={{fontSize:9,color:"#444460",marginBottom:3}}>{item.label}</div>
              <div style={{fontFamily:"monospace",fontSize:14,fontWeight:900,color:item.col}}>{item.val}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#07070e",border:"1px solid #252535",borderRadius:7,padding:"10px 12px"}}>
          <div style={{fontSize:11,color:"#7070a0",lineHeight:1.75}}>
            <span style={{color:"#ff3b3b",fontWeight:700}}>CNN 공포 {CNN_NOW}pt</span> → 기본강도 {cnn.strength}%<br/>
            <span style={{color:vix.col,fontWeight:700}}>VIX {VIX_NOW}</span> → 강도 보정 {vix.boost}<br/>
            <span style={{color:macro.col,fontWeight:700}}>매크로 {TOTAL.toFixed(1)}점</span> → 속도만 조절 ({macro.interval} 간격)<br/>
            <span style={{color:fx.col,fontWeight:700}}>환율 {FX_RATE}원</span> → 수량 조정 {fx.adj}<br/>
            <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #1a1a2e"}}>
              👉 <span style={{color:"#e0e0f8",fontWeight:900}}>지금 가격 오면: {Math.round(finalStrength)}% 강도로 진입, 비중 최대 {finalCap}%, {macro.interval} 후 재평가</span>
            </div>
          </div>
        </div>
      </div>

      {/* DUPLICATE FILTER NOTE */}
      <div style={{marginTop:10,background:"rgba(160,160,255,0.06)",
        border:"1px solid rgba(160,160,255,0.15)",borderRadius:8,padding:"10px 12px"}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#6060a0",letterSpacing:"0.12em",marginBottom:6}}>
          🔧 중복 필터 (자동 적용)
        </div>
        <div style={{fontSize:11,color:"#6060a0",lineHeight:1.65}}>
          CNN 공포 + VIX 상승 + 매크로 악화가 동시 발생 시<br/>
          → <span style={{color:"#a0a0ff"}}>강도는 CNN+VIX만으로 결정</span><br/>
          → <span style={{color:"#a0a0ff"}}>매크로는 속도(간격)만 늘림</span><br/>
          → 세 지표 동시 패널티로 "아무것도 못 사는" 상황 방지
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function App() {
  const macro = getMacroSpeed(TOTAL);
  const fx    = getFxAdj(FX_RATE);
  const finalCap = Math.min(fx.cap, 15);

  return (
    <div style={{background:"#07070e",minHeight:"100vh",padding:"18px 14px 36px",
      fontFamily:"system-ui,-apple-system,sans-serif",color:"#d0d0e8"}}>
      <style>{`@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`}</style>
      <div style={{maxWidth:460,margin:"0 auto"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",
          marginBottom:18,paddingBottom:12,borderBottom:"1px solid #141428"}}>
          <div>
            <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.2em",marginBottom:3}}>PRICE-LED · MACRO-SIZED v4</div>
            <div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.02em",color:"#e0e0f8"}}>바닥 투자 시스템</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#f5c542",
              background:"rgba(245,197,66,0.07)",border:"1px solid rgba(245,197,66,0.2)",
              padding:"3px 8px",borderRadius:3,marginBottom:4}}>260329</div>
            <div style={{fontFamily:"monospace",fontSize:9,color:"#333355"}}>환율 {FX_RATE.toLocaleString()}원</div>
          </div>
        </div>

        {/* ONE-LINE RULES */}
        <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:10,
          padding:"11px 13px",marginBottom:14,animation:"fi 0.3s ease both"}}>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:8}}>── 핵심 원칙 (4줄)</div>
          {[
            { col:"#00e676", tag:"가격", desc:"트리거 — 도달하면 무조건 1회 실행" },
            { col:"#ff3b3b", tag:"CNN/VIX", desc:"얼마나 살지 — 공포 클수록 많이" },
            { col:"#a0a0ff", tag:"매크로", desc:"언제 또 살지 — 나쁠수록 간격 늘림" },
            { col:"#f5c542", tag:"환율", desc:"몇 주 살지 — 비쌀수록 수량 줄임" },
          ].map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<3?6:0}}>
              <div style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:p.col,
                background:`${p.col}11`,border:`1px solid ${p.col}33`,
                padding:"2px 7px",borderRadius:3,flexShrink:0,minWidth:52,textAlign:"center"}}>{p.tag}</div>
              <div style={{fontSize:11,color:"#8080a0"}}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* MACRO SCORE HEADER */}
        <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:12,
          padding:16,marginBottom:14,position:"relative",overflow:"hidden",animation:"fi 0.35s ease 0.05s both"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,
            background:"linear-gradient(90deg,#ff3b3b,#f5c542,transparent)"}}/>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:12}}>── 매크로 점수 (260329)</div>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
            <Ring score={TOTAL} max={5}/>
            <div>
              <div style={{fontSize:9,fontFamily:"monospace",color:"#ff3b3b",
                background:"rgba(255,59,59,0.08)",border:"1px solid rgba(255,59,59,0.2)",
                padding:"2px 8px",borderRadius:3,marginBottom:6,display:"inline-block"}}>공포 구간</div>
              <div style={{fontSize:14,fontWeight:900,color:"#e0e0f8",marginBottom:4}}>느린 분할매수 실행</div>
              <div style={{fontSize:11,color:"#6060a0",lineHeight:1.7}}>
                매크로 간격: <span style={{color:"#ff3b3b",fontWeight:700}}>{macro.interval}</span><br/>
                환율 캡: <span style={{color:"#f5c542",fontWeight:700}}>{fx.cap}%</span><br/>
                <span style={{color:"#e0e0f8",fontWeight:900,fontSize:13}}>실효 최대 비중: {finalCap}%</span>
              </div>
            </div>
          </div>
          <Bar pct={finalCap} color="#ff3b3b" height={4}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <span style={{fontSize:9,color:"#2a2a40",fontFamily:"monospace"}}>0% 전량현금</span>
            <span style={{fontSize:9,color:"#2a2a40",fontFamily:"monospace"}}>100% 풀매수</span>
          </div>
        </div>

        {/* ── ALGORITHM FLOW ── */}
        <AlgoFlow/>

        {/* 5 CONDITIONS */}
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.18em",marginBottom:9}}>── 매크로 5가지 조건 상세</div>
        {CONDITIONS.map((c,i)=><CondCard key={i} c={c} i={i}/>)}

        {/* SCORE MINI */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:14}}>
          {CONDITIONS.map((c,i)=>(
            <div key={i} style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:7,
              padding:"8px 4px",textAlign:"center"}}>
              <div style={{fontSize:14,marginBottom:2}}>{c.emoji}</div>
              <div style={{fontFamily:"monospace",fontSize:15,fontWeight:900,color:c.color}}>{c.pct}%</div>
            </div>
          ))}
        </div>

        {/* NEXT EVENTS */}
        <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:10,
          padding:"12px 13px",marginBottom:14,animation:"fi 0.4s ease 0.15s both"}}>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:10}}>── 가장 가까운 시그널 이벤트</div>
          {[
            {date:"4월 6일", event:"트럼프 이란 최후통첩", impact:"유가커브 변수", col:"#ff3b3b"},
            {date:"4월 중순",event:"Q1 어닝시즌 개막",     impact:"실적 조건 리트머스", col:"#f5c542"},
            {date:"5월 7일", event:"FOMC + 파월 임기 만료",impact:"금리 조건 최대 변수", col:"#f5c542"},
            {date:"5월 초",  event:"4월 고용 지표",         impact:"실업률 2차 미분 확인",col:"#4fc3f7"},
          ].map((e,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<3?8:0}}>
              <div style={{fontFamily:"monospace",fontSize:9,color:e.col,
                background:`${e.col}11`,border:`1px solid ${e.col}33`,
                padding:"2px 6px",borderRadius:3,flexShrink:0,minWidth:55,textAlign:"center"}}>{e.date}</div>
              <div>
                <div style={{fontSize:11,color:"#b0b0d0",fontWeight:600}}>{e.event}</div>
                <div style={{fontSize:10,color:"#555575"}}>{e.impact}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FORBIDDEN */}
        <div style={{background:"#0c0c18",border:"1px solid rgba(255,59,59,0.2)",borderRadius:10,
          padding:"12px 13px",marginBottom:14}}>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#ff3b3b",letterSpacing:"0.15em",marginBottom:9}}>── 시스템 위반 (금지)</div>
          {[
            "매크로 개선 기다리며 매수 지연",
            "가격 미도달 상태에서 추격 매수",
            "공포 구간에서 매수 중단 (관망)",
            "이미 매수한 구간 중복 재진입",
            "크레딧 스프레드 700bp+ 시 비중 캡 무시",
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",
              marginBottom:i<4?5:0,padding:"6px 8px",
              background:"rgba(255,59,59,0.04)",borderRadius:5}}>
              <span style={{fontSize:12}}>❌</span>
              <span style={{fontSize:11,color:"#8080a0"}}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{textAlign:"center",fontFamily:"monospace",fontSize:9,color:"#222235",letterSpacing:"0.1em"}}>
          DATA AS OF 2026.03.29 · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}
