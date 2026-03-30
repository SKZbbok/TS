import { useState, useEffect } from "react";

const FX_RATE = 1516.4;
const VIX_NOW = 31.21;
const CNN_NOW = 10;

const CONDITIONS = [
  { rank:"1순위", emoji:"💹", title:"금리 스탠스",     pct:18, color:"#ff3b3b", role:"비중 조절",     roleDesc:"금리 전환 시 최대 비중 +20% 허용", data:[["기준금리","3.50~3.75%","neg"],["FOMC","매파 동결","neg"],["Core PCE","3.1%","neg"],["점도표","25bp 1회↓","warn"]], signal:"파월 매파 유지. 5월 FOMC + 후임 워쉬 지명이 핵심 변수." },
  { rank:"2순위", emoji:"🛢️", title:"유가 선물커브",   pct:28, color:"#f5c542", role:"매수 속도 조절", roleDesc:"백워데이션 유지 시 매수 간격 2배로 늘림", data:[["WTI 현물","$99.64","neg"],["WTI 12월물","$77.36","warn"],["커브 구조","백워데이션","warn"],["4/6 최후통첩","D-8","neg"]], signal:"강한 백워데이션. 콘탱고 전환 전까지 매수 속도 절반 유지." },
  { rank:"3순위", emoji:"👷", title:"실업률 (후행)",   pct:15, color:"#ff3b3b", role:"참고용만",       roleDesc:"매수 결정에 직접 사용 안 함. 추세만 모니터링.", data:[["2월 실업률","4.4%","neg"],["2월 고용","–92,000명","neg"],["수정치","–69,000명↓","neg"],["추세","재악화","neg"]], signal:"후행지표. 매수 속도 조절 참고용으로만 사용." },
  { rank:"4순위", emoji:"📊", title:"기업 실적",       pct:12, color:"#f5c542", role:"비중 조절",     roleDesc:"EPS 하향 멈추면 최대 비중 제한 해제", data:[["S&P500","6,369","neg"],["VIX","31.05","neg"],["CAPE P/E","39.8x","neg"],["EPS 추세","하향 중","neg"]], signal:"4월 어닝시즌이 첫 리트머스. 하향 지속 시 최대 비중 –10%." },
  { rank:"5순위", emoji:"💳", title:"크레딧 스프레드", pct:20, color:"#4fc3f7", role:"최대 비중 캡",   roleDesc:"HY 700bp+ 시 최대 비중 40%로 강제 제한", data:[["HY 스프레드","487bp","neg"],["IG 스프레드","112bp","warn"],["전월 대비","+89bp↑","neg"],["위험 임계","700bp","warn"]], signal:"현재 경고 구간(487bp). 700bp 돌파 시 최대 비중 자동 캡 적용." },
];

const TOTAL = CONDITIONS.reduce((s,c)=>s+c.pct,0)/100;

function getCnn(v)  { if(v<=25) return {label:"Extreme Fear",strength:100,col:"#ff3b3b",bg:"rgba(255,59,59,0.1)"}; if(v<=45) return {label:"Fear",strength:70,col:"#f5c542",bg:"rgba(245,197,66,0.08)"}; if(v<=55) return {label:"Neutral",strength:40,col:"#aaaacc",bg:"rgba(170,170,200,0.06)"}; if(v<=75) return {label:"Greed",strength:20,col:"#00e676",bg:"rgba(0,230,118,0.07)"}; return {label:"Extreme Greed",strength:5,col:"#4fc3f7",bg:"rgba(79,195,247,0.07)"}; }
function getVix(v)  { if(v>=35) return {label:"패닉 ≥35",boost:"+30%",mult:1.3,col:"#ff3b3b",override:true}; if(v>=25) return {label:"경계 25~35",boost:"+15%",mult:1.15,col:"#f5c542",override:false}; if(v>=20) return {label:"주의 20~25",boost:"±0%",mult:1.0,col:"#aaaacc",override:false}; return {label:"안정 <20",boost:"–10%",mult:0.9,col:"#00e676",override:false}; }
function getMacro(s){ if(s<2) return {label:"공포",speed:"느리게",interval:"4~6주",col:"#ff3b3b",maxBuy:15}; if(s<3) return {label:"중립",speed:"보통",interval:"2~3주",col:"#f5c542",maxBuy:40}; if(s<4) return {label:"안정",speed:"빠르게",interval:"1~2주",col:"#00e676",maxBuy:70}; return {label:"과열",speed:"매우 천천히",interval:"8주+",col:"#4fc3f7",maxBuy:50}; }
function getFx(r)   { if(r<1400) return {label:"LOW",adj:"+10%",mult:1.1,col:"#00e676",cap:100}; if(r<1480) return {label:"NORMAL",adj:"±0%",mult:1.0,col:"#a0d070",cap:80}; if(r<1550) return {label:"HIGH",adj:"–15%",mult:0.85,col:"#f5c542",cap:70}; return {label:"DANGER",adj:"–40%",mult:0.6,col:"#ff3b3b",cap:30}; }

function useAnim(val, delay=400) {
  const [v, setV] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setV(val),delay); return ()=>clearTimeout(t); },[val,delay]);
  return v;
}

function Bar({ pct, color, height=3 }) {
  const w = useAnim(pct);
  return (
    <div style={{height,background:"#12121f",borderRadius:2}}>
      <div style={{height:"100%",width:`${w}%`,background:color,borderRadius:2,transition:"width 1s ease",boxShadow:`0 0 5px ${color}55`}}/>
    </div>
  );
}

function Ring({ score, max, size=96 }) {
  const [a,setA]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setA(true),150);return()=>clearTimeout(t);},[]);
  const r=size/2-7,circ=2*Math.PI*r,offset=circ*(1-(a?score/max:0));
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#12121f" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ff3b3b" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)",filter:"drop-shadow(0 0 7px #ff3b3b)"}}/>
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
  useEffect(()=>{const t=setTimeout(()=>setA(true),500);return()=>clearTimeout(t);},[]);
  const r=17,circ=2*Math.PI*r,offset=circ*(1-(a?pct/100:0));
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#12121f" strokeWidth="5"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1s ease",filter:`drop-shadow(0 0 3px ${color}88)`}}/>
    </svg>
  );
}

function CondCard({ c, i }) {
  const [open,setOpen]=useState(false);
  const vc=t=>t==="neg"?"#ff5555":t==="warn"?"#f5c542":"#00e676";
  return (
    <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:9,marginBottom:7,borderLeft:`3px solid ${c.color}`,overflow:"hidden"}}>
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
        <div style={{display:"inline-block",fontSize:9,fontFamily:"monospace",padding:"2px 7px",borderRadius:3,background:`${c.color}11`,color:c.color,border:`1px solid ${c.color}33`,marginBottom:8}}>역할: {c.role}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:8}}>
          {c.data.map(([k,v,t],j)=>(
            <div key={j} style={{background:"#080812",border:"1px solid #151525",borderRadius:5,padding:"5px 8px"}}>
              <div style={{fontSize:9,color:"#444460",marginBottom:2}}>{k}</div>
              <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:vc(t)}}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setOpen(!open)} style={{background:"none",border:"none",color:"#444460",fontSize:10,fontFamily:"monospace",cursor:"pointer",padding:0,letterSpacing:"0.06em"}}>
          {open?"▲ 접기":"▼ 세부 + 적용 방법"}
        </button>
        {open&&(
          <div style={{marginTop:9}}>
            <div style={{background:"#06060f",borderLeft:`2px solid ${c.color}44`,padding:"7px 10px",borderRadius:"0 5px 5px 0",fontSize:11,color:"#6060a0",lineHeight:1.65,marginBottom:7}}>{c.signal}</div>
            <div style={{fontSize:10,color:"#555575",fontFamily:"monospace"}}>→ {c.roleDesc}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB 1: ALGORITHM ──────────────────────────────────────
function Tab1() {
  const cnn=getCnn(CNN_NOW), vix=getVix(VIX_NOW), macro=getMacro(TOTAL), fx=getFx(FX_RATE);
  const isOverride = vix.override && cnn.label==="Extreme Fear";
  const rawStrength = isOverride ? 100 : Math.min(100, cnn.strength*vix.mult);
  const finalStrength = Math.round(Math.min(100, rawStrength*fx.mult));
  const finalCap = Math.min(macro.maxBuy, fx.cap);

  const steps = [
    { id:"S0", label:"STEP 0", icon:"🎯", title:"가격 도달?", roleCol:"#4fc3f7", role:"트리거",
      currentVal:"가격 트리거 도달 가정", currentCol:"#00e676",
      desc:"가격 미도달 시 즉시 종료. 이후 단계 전부 없음.",
      yesNo:true },
    { id:"S1", label:"STEP 1", icon:"😱", title:"CNN 공포지수", roleCol:"#ff3b3b", role:"기본 매수 강도",
      currentVal:`${CNN_NOW}pt · ${cnn.label}`, currentCol:cnn.col,
      output:`기본 강도 ${cnn.strength}%`, outputCol:cnn.col,
      desc:"공포 클수록 더 많이 산다." },
    { id:"S2", label:"STEP 2", icon:"📈", title:"VIX", roleCol:"#f5c542", role:"강도 보정 + 오버라이드",
      currentVal:`${VIX_NOW} · ${vix.label}`, currentCol:vix.col,
      output: vix.override?"⚡ OVERRIDE 발동":`강도 보정 ${vix.boost}`, outputCol:vix.override?"#ff3b3b":vix.col,
      desc:"패닉(≥35) 시 매크로 무시 → MAX 즉시 실행.",
      isOverride: vix.override },
    { id:"S3", label:"STEP 3", icon:"📊", title:"매크로 점수", roleCol:"#a0a0ff", role:"속도 조절만",
      currentVal:`${TOTAL.toFixed(1)}점 · ${macro.label}`, currentCol:macro.col,
      output:`다음 간격 ${macro.interval}`, outputCol:macro.col,
      desc:"강도는 CNN+VIX가 결정. 매크로는 언제 또 살지만 결정." },
    { id:"S4", label:"STEP 4", icon:"💱", title:"환율", roleCol:"#aaaacc", role:"수량 조정",
      currentVal:`${FX_RATE}원 · ${fx.label}`, currentCol:fx.col,
      output:`수량 조정 ${fx.adj}`, outputCol:fx.col,
      desc:"환율이 비싸면 주수를 줄인다. 가격 트리거 자체는 변경 안 함." },
  ];

  return (
    <div>
      {/* 핵심 원칙 */}
      <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:10,padding:"13px 14px",marginBottom:12}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:10}}>── 핵심 원칙</div>
        {[
          {col:"#00e676",tag:"가격",   desc:"트리거 — 도달하면 무조건 1회 실행"},
          {col:"#ff3b3b",tag:"CNN/VIX",desc:"얼마나 살지 — 공포 클수록 많이"},
          {col:"#a0a0ff",tag:"매크로", desc:"언제 또 살지 — 나쁠수록 간격 늘림"},
          {col:"#f5c542",tag:"환율",   desc:"몇 주 살지 — 비쌀수록 수량 줄임"},
        ].map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<3?7:0}}>
            <div style={{fontFamily:"monospace",fontSize:9,fontWeight:700,color:p.col,background:`${p.col}11`,border:`1px solid ${p.col}33`,padding:"2px 7px",borderRadius:3,flexShrink:0,minWidth:52,textAlign:"center"}}>{p.tag}</div>
            <div style={{fontSize:11,color:"#8080a0"}}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Algorithm Flow */}
      <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:12,padding:"14px 13px",marginBottom:12}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.18em",marginBottom:12}}>── 매수 알고리즘</div>

        {isOverride&&(
          <div style={{background:"rgba(255,59,59,0.12)",border:"1px solid rgba(255,59,59,0.4)",borderRadius:8,padding:"10px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>⚡</span>
            <div>
              <div style={{fontSize:12,fontWeight:900,color:"#ff3b3b"}}>OVERRIDE 발동 중</div>
              <div style={{fontSize:10,color:"#9060a0"}}>VIX≥35 + Extreme Fear → 매크로 무시 → 즉시 MAX 실행</div>
            </div>
          </div>
        )}

        {steps.map((s,i)=>(
          <div key={s.id} style={{position:"relative"}}>
            {i<steps.length-1&&(
              <div style={{position:"absolute",left:19,top:50,bottom:-6,width:1,background:"linear-gradient(180deg,#2a2a50,transparent)",zIndex:0}}/>
            )}
            <div style={{display:"flex",gap:10,marginBottom:i<steps.length-1?6:0,position:"relative",zIndex:1}}>
              <div style={{flexShrink:0}}>
                <div style={{width:38,height:38,borderRadius:8,background:s.isOverride?"rgba(255,59,59,0.15)":"#111122",border:`1px solid ${s.isOverride?"rgba(255,59,59,0.4)":"#2a2a40"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:13,lineHeight:1}}>{s.icon}</div>
                  <div style={{fontFamily:"monospace",fontSize:7,color:"#444460"}}>{s.label}</div>
                </div>
              </div>
              <div style={{flex:1,background:"#0a0a16",border:"1px solid #181828",borderRadius:8,padding:"9px 11px",borderLeft:`2px solid ${s.isOverride?"#ff3b3b":s.roleCol}33`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#d0d0e8"}}>{s.title}</span>
                    <span style={{fontSize:8,fontFamily:"monospace",color:s.roleCol,background:`${s.roleCol}11`,border:`1px solid ${s.roleCol}22`,padding:"1px 5px",borderRadius:2}}>{s.role}</span>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:s.output?3:0}}>
                  <span style={{fontSize:10,color:"#555575"}}>현재</span>
                  <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:s.currentCol}}>{s.currentVal}</span>
                </div>
                {s.output&&(
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:10,color:"#555575"}}>출력</span>
                    <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:s.outputCol,background:`${s.outputCol}11`,padding:"1px 6px",borderRadius:2}}>{s.output}</span>
                  </div>
                )}
                {s.yesNo&&(
                  <div style={{display:"flex",gap:6,marginTop:5,marginBottom:3}}>
                    <div style={{flex:1,padding:"4px 6px",borderRadius:4,textAlign:"center",background:"rgba(255,59,59,0.07)",border:"1px solid rgba(255,59,59,0.2)"}}>
                      <span style={{fontSize:10,color:"#ff3b3b",fontWeight:700}}>NO → 종료</span>
                    </div>
                    <div style={{flex:1,padding:"4px 6px",borderRadius:4,textAlign:"center",background:"rgba(0,230,118,0.07)",border:"1px solid rgba(0,230,118,0.2)"}}>
                      <span style={{fontSize:10,color:"#00e676",fontWeight:700}}>YES → 계속</span>
                    </div>
                  </div>
                )}
                <div style={{fontSize:10,color:"#44445f",lineHeight:1.5,marginTop:3}}>{s.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FINAL OUTPUT */}
      <div style={{background:isOverride?"rgba(255,59,59,0.08)":"rgba(0,230,118,0.05)",border:`1px solid ${isOverride?"rgba(255,59,59,0.25)":"rgba(0,230,118,0.15)"}`,borderRadius:10,padding:"13px 14px",marginBottom:12}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#444460",letterSpacing:"0.15em",marginBottom:10}}>── FINAL OUTPUT </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
          {[
            {label:"실행 여부",  val:isOverride?"즉시 실행":"조건부 실행", col:isOverride?"#ff3b3b":"#00e676"},
            {label:"매수 강도",  val:`${finalStrength}%`,                 col:"#f5c542"},
            {label:"최대 비중",  val:`${finalCap}%`,                      col:"#ff3b3b"},
            {label:"다음 간격",  val:macro.interval,                      col:macro.col},
          ].map((item,i)=>(
            <div key={i} style={{background:"#07070e",border:"1px solid #1a1a2e",borderRadius:7,padding:"9px 10px"}}>
              <div style={{fontSize:9,color:"#444460",marginBottom:3}}>{item.label}</div>
              <div style={{fontFamily:"monospace",fontSize:15,fontWeight:900,color:item.col}}>{item.val}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#07070e",border:"1px solid #1e1e2e",borderRadius:7,padding:"10px 12px",marginBottom:10}}>
          <div style={{fontSize:11,color:"#7070a0",lineHeight:1.8}}>
            <span style={{color:"#ff3b3b",fontWeight:700}}>CNN {CNN_NOW}pt</span> → 기본강도 {cnn.strength}%<br/>
            <span style={{color:vix.col,fontWeight:700}}>VIX {VIX_NOW}</span> → 강도 보정 {vix.boost}<br/>
            <span style={{color:macro.col,fontWeight:700}}>매크로 {TOTAL.toFixed(1)}점</span> → 속도만 ({macro.interval} 간격)<br/>
            <span style={{color:fx.col,fontWeight:700}}>환율 {FX_RATE}원</span> → 수량 {fx.adj}<br/>
            <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #1a1a2e",color:"#e0e0f8",fontWeight:900,fontSize:12}}>
              👉 가격 오면: {finalStrength}% 강도, 최대 {finalCap}% 비중, {macro.interval} 후 재평가
            </div>
          </div>
        </div>

        {/* 중복 필터 */}
        <div style={{background:"rgba(160,160,255,0.06)",border:"1px solid rgba(160,160,255,0.15)",borderRadius:8,padding:"10px 12px"}}>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#6060a0",letterSpacing:"0.12em",marginBottom:6}}>🔧 중복 필터 (자동 적용)</div>
          <div style={{fontSize:11,color:"#6060a0",lineHeight:1.7}}>
            CNN 공포 + VIX 상승 + 매크로 악화 동시 발생 시<br/>
            → <span style={{color:"#a0a0ff"}}>강도는 CNN+VIX만으로 결정</span><br/>
            → <span style={{color:"#a0a0ff"}}>매크로는 속도(간격)만 늘림</span><br/>
            → 세 지표 동시 패널티로 "아무것도 못 사는" 상황 방지
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB 2: MACRO ──────────────────────────────────────────
function Tab2() {
  const macro=getMacro(TOTAL), fx=getFx(FX_RATE);
  const finalCap=Math.min(macro.maxBuy, fx.cap);

  return (
    <div>
      {/* 매크로 점수 */}
      <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:12,padding:16,marginBottom:12,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#ff3b3b,#f5c542,transparent)"}}/>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:12}}>── 매크로 점수 </div>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
          <Ring score={TOTAL} max={5}/>
          <div>
            <div style={{fontSize:9,fontFamily:"monospace",color:"#ff3b3b",background:"rgba(255,59,59,0.08)",border:"1px solid rgba(255,59,59,0.2)",padding:"2px 8px",borderRadius:3,marginBottom:6,display:"inline-block"}}>공포 구간</div>
            <div style={{fontSize:14,fontWeight:900,color:"#e0e0f8",marginBottom:4}}>느린 분할매수 실행</div>
            <div style={{fontSize:11,color:"#6060a0",lineHeight:1.7}}>
              매크로 허용: <span style={{color:"#ff3b3b",fontWeight:700}}>{macro.maxBuy}%</span><br/>
              환율 캡: <span style={{color:fx.col,fontWeight:700}}>{fx.cap}%</span><br/>
              <span style={{color:"#e0e0f8",fontWeight:900,fontSize:13}}>실효 최대 비중: {finalCap}%</span>
            </div>
          </div>
        </div>
        <Bar pct={finalCap} color="#ff3b3b" height={4}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
          <span style={{fontSize:9,color:"#2a2a40",fontFamily:"monospace"}}>0% 전량현금</span>
          <span style={{fontSize:9,color:"#2a2a40",fontFamily:"monospace"}}>100% 풀매수</span>
        </div>

        {/* macro zone table */}
        <div style={{marginTop:12}}>
          {[
            {range:"0 ~ 2점",zone:"공포",action:"느린 분할매수 적극 실행",cap:"최대 15%",col:"#ff3b3b",active:TOTAL<2},
            {range:"2 ~ 3점",zone:"중립",action:"비중 점진적 확대",       cap:"최대 40%",col:"#f5c542",active:TOTAL>=2&&TOTAL<3},
            {range:"3 ~ 4점",zone:"안정",action:"일반 매수 실행",          cap:"최대 70%",col:"#00e676",active:TOTAL>=3&&TOTAL<4},
            {range:"4점 이상",zone:"과열",action:"리밸런싱 검토",          cap:"최대 50%",col:"#4fc3f7",active:TOTAL>=4},
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:i<3?5:0,padding:"7px 9px",borderRadius:6,background:r.active?`${r.col}11`:"transparent",border:r.active?`1px solid ${r.col}33`:"1px solid transparent"}}>
              {r.active&&<div style={{width:3,height:32,background:r.col,borderRadius:2,flexShrink:0}}/>}
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"monospace",fontSize:10,color:r.active?r.col:"#444460",fontWeight:r.active?700:400}}>{r.range}</span>
                  <span style={{fontFamily:"monospace",fontSize:10,color:r.active?r.col:"#333355"}}>{r.cap}</span>
                </div>
                <div style={{fontSize:11,color:r.active?"#b0b0d0":"#444460"}}>
                  <span style={{color:r.active?r.col:"#444460",fontWeight:700}}>{r.zone}</span> — {r.action}
                </div>
              </div>
              {r.active&&<div style={{fontSize:9,fontFamily:"monospace",color:r.col,background:`${r.col}22`,padding:"2px 5px",borderRadius:3,flexShrink:0}}>◀ 현재</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 환율 */}
      <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:10,padding:"12px 13px",marginBottom:12}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:10}}>── 환율 리스크 레벨</div>
        {[
          {range:"< 1,400",    level:"LOW",   action:"풀매수 가능",            cap:100,col:"#00e676"},
          {range:"1,400~1,480",level:"NORMAL",action:"정상 비중 유지",          cap:80, col:"#a0d070"},
          {range:"1,480~1,550",level:"HIGH",  action:"비중 축소 (최대 70%)",   cap:70, col:"#f5c542"},
          {range:"> 1,550",    level:"DANGER",action:"공격 금지 / 선행매수만", cap:30, col:"#ff3b3b"},
        ].map((r,i)=>{
          const active=fx.level===r.level;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:i<3?5:0,padding:"7px 9px",borderRadius:6,background:active?`${r.col}11`:"transparent",border:active?`1px solid ${r.col}33`:"1px solid transparent"}}>
              <div style={{width:4,height:30,background:active?r.col:"#1a1a2e",borderRadius:2,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontFamily:"monospace",fontSize:10,color:active?r.col:"#444460",fontWeight:active?700:400}}>{r.range}</span>
                  <span style={{fontFamily:"monospace",fontSize:10,fontWeight:700,color:active?r.col:"#333355"}}>최대 {r.cap}%</span>
                </div>
                <div style={{fontSize:11,color:active?"#b0b0d0":"#444460",marginTop:1}}>
                  <span style={{color:active?r.col:"#444460",fontWeight:700}}>{r.level}</span> — {r.action}
                </div>
              </div>
              {active&&<div style={{fontSize:9,fontFamily:"monospace",color:r.col,background:`${r.col}22`,padding:"2px 5px",borderRadius:3,flexShrink:0}}>{FX_RATE}원</div>}
            </div>
          );
        })}
        <div style={{marginTop:8,padding:"7px 10px",background:"rgba(245,197,66,0.06)",border:"1px solid rgba(245,197,66,0.15)",borderRadius:6}}>
          <div style={{fontSize:10,color:"#7070a0",lineHeight:1.6}}>
            현재 <span style={{color:"#f5c542",fontWeight:700}}>{FX_RATE}원 (HIGH)</span> — 매크로 {macro.maxBuy}% × 환율 캡 {fx.cap}% = <span style={{color:"#ff3b3b",fontWeight:900}}>실효 {finalCap}%</span>
          </div>
        </div>
      </div>

      {/* 5 conditions */}
      <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.18em",marginBottom:9}}>── 매크로 5가지 조건 상세</div>
      {CONDITIONS.map((c,i)=><CondCard key={i} c={c} i={i}/>)}

      {/* mini score row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:12}}>
        {CONDITIONS.map((c,i)=>(
          <div key={i} style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:7,padding:"8px 4px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{c.emoji}</div>
            <div style={{fontFamily:"monospace",fontSize:15,fontWeight:900,color:c.color}}>{c.pct}%</div>
          </div>
        ))}
      </div>

      {/* next events */}
      <div style={{background:"#0c0c18",border:"1px solid #1a1a2e",borderRadius:10,padding:"12px 13px",marginBottom:12}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.15em",marginBottom:10}}>── 가장 가까운 시그널 이벤트</div>
        {[
          {date:"4월 6일", event:"트럼프 이란 최후통첩", impact:"유가커브 변수",        col:"#ff3b3b"},
          {date:"4월 중순",event:"Q1 어닝시즌 개막",     impact:"실적 조건 리트머스",   col:"#f5c542"},
          {date:"5월 7일", event:"FOMC + 파월 임기 만료",impact:"금리 조건 최대 변수",  col:"#f5c542"},
          {date:"5월 초",  event:"4월 고용 지표",         impact:"실업률 2차 미분 확인", col:"#4fc3f7"},
        ].map((e,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<3?8:0}}>
            <div style={{fontFamily:"monospace",fontSize:9,color:e.col,background:`${e.col}11`,border:`1px solid ${e.col}33`,padding:"2px 6px",borderRadius:3,flexShrink:0,minWidth:55,textAlign:"center"}}>{e.date}</div>
            <div>
              <div style={{fontSize:11,color:"#b0b0d0",fontWeight:600}}>{e.event}</div>
              <div style={{fontSize:10,color:"#555575"}}>{e.impact}</div>
            </div>
          </div>
        ))}
      </div>

      {/* forbidden */}
      <div style={{background:"#0c0c18",border:"1px solid rgba(255,59,59,0.2)",borderRadius:10,padding:"12px 13px"}}>
        <div style={{fontSize:9,fontFamily:"monospace",color:"#ff3b3b",letterSpacing:"0.15em",marginBottom:9}}>── 시스템 위반 (금지)</div>
        {["매크로 개선 기다리며 매수 지연","가격 미도달 상태에서 추격 매수","공포 구간에서 매수 중단 (관망)","이미 매수한 구간 중복 재진입","크레딧 스프레드 700bp+ 시 비중 캡 무시"].map((r,i)=>(
          <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:i<4?5:0,padding:"6px 8px",background:"rgba(255,59,59,0.04)",borderRadius:5}}>
            <span style={{fontSize:12}}>❌</span>
            <span style={{fontSize:11,color:"#8080a0"}}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label:"실행 알고리즘", sub:"원칙 · 매수 순서 · 결과" },
    { label:"매크로 분석",   sub:"점수 · 조건 · 이벤트" },
  ];

  return (
    <div style={{background:"#07070e",minHeight:"100vh",padding:"18px 14px 40px",fontFamily:"system-ui,-apple-system,sans-serif",color:"#d0d0e8"}}>
      <style>{`@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`}</style>
      <div style={{maxWidth:460,margin:"0 auto"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,paddingBottom:12,borderBottom:"1px solid #141428"}}>
          <div>
            <div style={{fontSize:9,fontFamily:"monospace",color:"#333355",letterSpacing:"0.2em",marginBottom:3}}>PRICE-LED · MACRO-SIZED v4</div>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.02em",color:"#e0e0f8"}}>바닥 투자 시스템</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#f5c542",background:"rgba(245,197,66,0.07)",border:"1px solid rgba(245,197,66,0.2)",padding:"3px 8px",borderRadius:3,marginBottom:3}}>260329</div>
            <div style={{fontFamily:"monospace",fontSize:9,color:"#333355"}}>환율 {FX_RATE.toLocaleString()}원</div>
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:16}}>
          {tabs.map((t,i)=>(
            <button key={i} onClick={()=>setTab(i)}
              style={{background:tab===i?"#161628":"#0c0c18",border:tab===i?"1px solid #3a3a60":"1px solid #1a1a2e",borderRadius:8,padding:"10px 12px",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
              <div style={{fontSize:12,fontWeight:700,color:tab===i?"#c0c0f8":"#6060a0",marginBottom:2}}>{t.label}</div>
              <div style={{fontSize:9,fontFamily:"monospace",color:tab===i?"#666688":"#333355",letterSpacing:"0.05em"}}>{t.sub}</div>
              {tab===i&&<div style={{height:2,background:"linear-gradient(90deg,#4fc3f7,transparent)",marginTop:6,borderRadius:1}}/>}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div key={tab} style={{animation:"fi 0.25s ease both"}}>
          {tab===0 ? <Tab1/> : <Tab2/>}
        </div>

        <div style={{textAlign:"center",marginTop:20,fontFamily:"monospace",fontSize:9,color:"#222235",letterSpacing:"0.1em"}}>
          DATA AS OF 2026.03.29 · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}
