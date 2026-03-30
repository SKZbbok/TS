import React, { useState, useEffect } from "react";

// [설정 값]
const FX_RATE = 1488;
const VIX_NOW = 31.05;
const CNN_NOW = 18;

const CONDITIONS = [
  { rank:"1순위", emoji:"💹", title:"금리 스탠스", pct:18, color:"#ff3b3b", role:"비중 조절", roleDesc:"금리 전환 시 최대 비중 +20% 허용", data:[["기준금리","3.50~3.75%","neg"],["FOMC","매파 동결","neg"],["Core PCE","3.1%","neg"],["점도표","25bp 1회↓","warn"]], signal:"파월 매파 유지. 5월 FOMC + 후임 워쉬 지명이 핵심 변수." },
  { rank:"2순위", emoji:"🛢️", title:"유가 선물커브", pct:28, color:"#f5c542", role:"매수 속도 조절", roleDesc:"백워데이션 유지 시 매수 간격 2배로 늘림", data:[["WTI 현물","$99.64","neg"],["WTI 12월물","$77.36","warn"],["커브 구조","백워데이션","warn"],["4/6 최후통첩","D-8","neg"]], signal:"강한 백워데이션. 콘탱고 전환 전까지 매수 속도 절반 유지." },
  { rank:"3순위", emoji:"👷", title:"실업률 (후행)", pct:15, color:"#ff3b3b", role:"참고용만", roleDesc:"매수 결정에 직접 사용 안 함. 추세만 모니터링.", data:[["2월 실업률","4.4%","neg"],["2월 고용","–92,000명","neg"],["수정치","–69,000명↓","neg"],["추세","재악화","neg"]], signal:"후행지표. 매수 속도 조절 참고용으로만 사용." },
  { rank:"4순위", emoji:"📊", title:"기업 실적", pct:12, color:"#f5c542", role:"비중 조절", roleDesc:"EPS 하향 멈추면 최대 비중 제한 해제", data:[["S&P500","6,369","neg"],["VIX","31.05","neg"],["CAPE P/E","39.8x","neg"],["EPS 추세","하향 중","neg"]], signal:"4월 어닝시즌이 첫 리트머스. 하향 지속 시 최대 비중 –10%." },
  { rank:"5순위", emoji:"💳", title:"크레딧 스프레드", pct:20, color:"#4fc3f7", role:"최대 비중 캡", roleDesc:"HY 700bp+ 시 최대 비중 40%로 강제 제한", data:[["HY 스프레드","487bp","neg"],["IG 스프레드","112bp","warn"],["전월 대비","+89bp↑","neg"],["위험 임계","700bp","warn"]], signal:"현재 경고 구간(487bp). 700bp 돌파 시 최대 비중 자동 캡 적용." },
];

const TOTAL = CONDITIONS.reduce((s,c)=>s+c.pct,0)/100;

function getMacroSpeed(score) {
  if (score<2) return { label:"공포", speed:"느리게", interval:"4~6주", col:"#ff3b3b" };
  if (score<3) return { label:"중립", speed:"보통", interval:"2~3주", col:"#f5c542" };
  if (score<4) return { label:"안정", speed:"빠르게", interval:"1~2주", col:"#00e676" };
  return { label:"과열", speed:"매우 천천히", interval:"8주+", col:"#4fc3f7" };
}

function Ring({ score, max, size=96 }) {
  const [a,setA]=useState(false);
  useEffect(()=>{setTimeout(()=>setA(true),150);},[]);
  const r=size/2-7, circ=2*Math.PI*r;
  const offset=circ*(1-(a?score/max:0));
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#12121f" strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ff3b3b" strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1.5s"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900}}>{score.toFixed(1)}</div>
    </div>
  );
}

export default function App() {
  const macro = getMacroSpeed(TOTAL);
  return (
    <div style={{background:"#07070e",minHeight:"100vh",padding:"20px",color:"#d0d0e8",fontFamily:"sans-serif"}}>
      <div style={{maxWidth:460,margin:"0 auto"}}>
        <h2 style={{margin:0}}>바닥 투자 시스템 v4</h2>
        <p style={{fontSize:12,color:"#444460"}}>2026.03.30 UPDATED</p>
        <div style={{background:"#0c0c18",padding:20,borderRadius:12,display:"flex",alignItems:"center",gap:20,margin:"20px 0"}}>
          <Ring score={TOTAL} max={5}/>
          <div>
            <div style={{fontWeight:900}}>매크로 점수: {TOTAL.toFixed(1)}</div>
            <div style={{fontSize:12,color:macro.col}}>권장 속도: {macro.interval}</div>
          </div>
        </div>
        {CONDITIONS.map((c,i)=>(
          <div key={i} style={{background:"#0c0c18",padding:15,borderRadius:10,marginBottom:10,borderLeft:`4px solid ${c.color}`}}>
             <div style={{display:"flex",justifyContent:"space-between",fontWeight:700}}>
               <span>{c.emoji} {c.title}</span>
               <span>{c.pct}%</span>
             </div>
             <p style={{fontSize:11,color:"#6060a0",margin:"5px 0 0"}}>{c.signal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
