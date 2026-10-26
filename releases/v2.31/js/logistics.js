'use strict';
/* ===================== v2.30 LOGISTICS (item 8, part 1: forklifts) =====================
   Goods move between the phases by forklift: Phase 1 racks → Phase 2 workshops across the lane, Phase 2 → Phase 3 through the
   gates, and finished goods down to the Shipping dock.
   - Calm motion (all three fleets): one readable cruising speed (FK_V tiles/s, the same at every upgrade level), smooth
     acceleration and braking, slower through rounded corners, a short stop to load and unload, and a turn rate limit.
     More capacity shows up as more forklifts and bigger loads, never as faster driving.
   - Forklift Depot (logistics tier 1): Lv 0–10, unlocked with the first Phase 2 building. Every level gives Phase 2 and Phase 3
     buildings +5 % output from the same inputs (fuller pallets, less handling loss). It raises supply and never demand, so no
     line can starve because of it. Costs scale with the run's forest value (cs()); the depot is rebuilt after a Replant.
     Lv 4 adds a forklift per cross-lane link, Lv 7 doubles the loads.
   - Conveyor belts (tier 2) and cargo drones (tier 3) follow in later releases; the ladder is shown in the Shipping sheet.
   Save: S.logi = {fk}. */
const FK_V=1.05, FK_A=.9, FK_DWELL=1.5, FK_TURN=2.6;   // tiles/s, tiles/s², s, rad/s
const LOGI_MAX=10, LOGI_STEP=.05, LOGI_MORE=4, LOGI_BIG=7;
function logiState(){let l=S.logi;if(!l||typeof l!=='object') l=S.logi={fk:0};
  if(typeof l.fk!=='number'||!isFinite(l.fk)) l.fk=0; l.fk=Math.max(0,Math.min(LOGI_MAX,l.fk|0)); return l;}
function logiLvl(){return S&&S.logi&&isFinite(S.logi.fk)?Math.max(0,Math.min(LOGI_MAX,S.logi.fk|0)):0;}
function logiUnlocked(){return MAIN_BLD.some(b=>BTIER[b.id]===2&&S.buildings[b.id].lvl>0)||logiLvl()>0;}
function logiMultAt(l){return 1+LOGI_STEP*l;}
/* output multiplier for one building: Phase 2 and Phase 3 only (their inputs arrive by forklift) */
function logiOut(id){const t=typeof BTIER==='object'?BTIER[id]:0;return t>=2?logiMultAt(logiLvl()):1;}
function logiCost(l){l=l===undefined?logiLvl():l;return l>=LOGI_MAX?Infinity:2e4*cs()*Math.pow(5,l);}
function logiBuy(){const L=logiState();if(!logiUnlocked()) return false;const c=logiCost(L.fk);if(!isFinite(c)||S.coins+1e-9<c) return false;
  S.coins-=c;L.fk++;scene._tsig='';scene._pfsig='';scene._fsig='';if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🚜 <b>Forklift Depot</b> → Lv ${L.fk}: Phase II–III output ×${logiMultAt(L.fk).toFixed(2)}${L.fk===LOGI_MORE?' · an extra forklift on every link':''}${L.fk===LOGI_BIG?' · double loads':''}`);
  if(typeof checkAch==='function') checkAch();return true;}
/* extra coins per second the next level would bring (Phase II–III goods only), for the cost-vs-benefit line */
function logiGain(){let v=0;for(const b of BUILDINGS){if(!(BTIER[b.id]>=2)||!S.buildings[b.id].lvl) continue;const bs=bstat[b.id];if(!bs) continue;
  for(const k in b.out) v+=b.out[k]*(bs.speed||0)*(bs.f||0)*bOutK(b.id,k)*(typeof saleValue==='function'?saleValue(k):price(k));}
  const l=logiLvl();return v*(logiMultAt(l+1)/logiMultAt(l)-1);}
function logiBig(){return logiLvl()>=LOGI_BIG;}
/* ---------- calm forklift motion ---------- */
/* round the corners of a forklift route (fillet radius r) so the heading turns gradually */
function fkRound(pts,r){r=r||.38;if(pts.length<3) return pts.slice();const out=[pts[0]];
  for(let k=1;k<pts.length-1;k++){const a=pts[k-1],c=pts[k],b=pts[k+1];const la=Math.hypot(c[0]-a[0],c[1]-a[1]),lb=Math.hypot(b[0]-c[0],b[1]-c[1]);
    const ra=Math.min(r,la*.45),rb=Math.min(r,lb*.45);if(ra<1e-3||rb<1e-3){out.push(c);continue;}
    const p0=[c[0]+(a[0]-c[0])*ra/la,c[1]+(a[1]-c[1])*ra/la],p1=[c[0]+(b[0]-c[0])*rb/lb,c[1]+(b[1]-c[1])*rb/lb];
    for(let s=0;s<=6;s++){const t=s/6,u=1-t;out.push([u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]]);}}
  out.push(pts[pts.length-1]);return out;}
function fkPath(pts){return mkPath(fkRound(pts));}
function fkInit(fl){const pa=fl.path,p=isFinite(fl.p)?((fl.p%2)+2)%2:0;fl.dir=p<1?1:-1;fl.s=(p<1?p:2-p)*pa.tot;fl.v=0;fl.wait=0;fl.at='';fl._pt=pa;}
function fkDirAt(pa,s){const q=pathAt(pa,Math.max(0,Math.min(1,s/pa.tot)));return Math.atan2(q[3],q[2]);}
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
/* one step: vmax is the cruising speed (FK_V, or less when the line is idle) */
function fkStep(fl,dt,vmax){
  if(fl._pt!==fl.path||fl.s===undefined) fkInit(fl);
  const pa=fl.path,tot=pa.tot;dt=Math.min(dt,.25);
  if(fl.wait>0){fl.wait-=dt;fl.v=0;}
  else{
    const left=fl.dir>0?tot-fl.s:fl.s;
    // ease off through corners: compare the heading here with the heading ~0.7 tiles ahead
    const h0=fkDirAt(pa,fl.s),h1=fkDirAt(pa,fl.s+fl.dir*.7),turn=Math.abs(angDiff(h0,h1));
    const vc=vmax*(1-.55*Math.min(1,turn/(Math.PI/2)));
    const brake=fl.v*fl.v/(2*FK_A)+.04;
    const tgt=left<=brake?Math.max(.04,Math.sqrt(Math.max(0,2*FK_A*left))):vc;
    fl.v=fl.v<tgt?Math.min(tgt,fl.v+FK_A*dt):Math.max(tgt,fl.v-FK_A*1.6*dt);
    fl.s+=fl.dir*fl.v*dt;
    if(fl.dir>0&&fl.s>=tot){fl.s=tot;fl.dir=-1;fl.v=0;fl.wait=FK_DWELL;fl.at='end';}
    else if(fl.dir<0&&fl.s<=0){fl.s=0;fl.dir=1;fl.v=0;fl.wait=FK_DWELL;fl.at='start';}
    else if(fl.wait<=0) fl.at='';
  }
  const q=pathAt(pa,fl.s/tot);fl.i=q[0];fl.j=q[1];
  if(fl.wait<=0||fl.yaw===undefined){if(Math.abs(q[2])+Math.abs(q[3])>1e-6){const y=Math.atan2(q[3]*fl.dir,q[2]*fl.dir);
    if(fl.yaw===undefined) fl.yaw=y;else{const d=angDiff(fl.yaw,y),m=FK_TURN*dt*(fl.v>.02?1:.35);fl.yaw+=Math.max(-m,Math.min(m,d));}}}
  fl.p=fl.dir>0?fl.s/tot:2-fl.s/tot;fl.ph=(fl.ph||0)+dt*6*Math.min(1,fl.v/FK_V);
}
/* loaded: outbound, or half-way through loading at the start; unloads half-way through the stop at the end */
function fkLoaded(fl){if(fl.s===undefined) return fl.p<1;const h=FK_DWELL/2;
  if(fl.wait>0&&fl.at==='end') return fl.wait>h;if(fl.wait>0&&fl.at==='start') return fl.wait<=h;return fl.dir>0;}
function fkCargo(fl){return fkLoaded(fl)?fl.res:null;}
function fkBounce(fl){return fl.v>.05?Math.sin((fl.ph||0)*3)*.25*Math.min(1,fl.v/FK_V):0;}
/* ---------- Shipping sheet: the logistics ladder ---------- */
let lgSig='';
function logiHtml(){const l=logiLvl(),u=logiUnlocked(),mx=l>=LOGI_MAX;
  return `<div class="lg-box" id="lgBox">
    <div class="card lg-tier on"><div class="ic">🚜</div><div><div class="nm">Forklift Depot <span class="cnt" id="lgL">Lv ${l}/${LOGI_MAX}</span> <span class="lg-tg">Tier 1</span></div>
      <div class="ds" id="lgD"></div></div><button class="btn buy" id="lgBuy"></button></div>
    ${typeof beltHtml==='function'?beltHtml():''}
    <div class="card lg-tier lock"><div class="ic">🚁</div><div><div class="nm">Cargo drones <span class="lg-tg">Tier 3</span></div><div class="ds">Drones between the buildings and the dock. Coming later.</div></div></div>
    <div class="legend">${u?'Forklifts carry goods from Phase I to II and from II to III. Every depot level adds 5 % output to every Phase II and III building. They drive at the same calm speed at every level: more capacity means more forklifts and bigger loads. Depot Lv '+BELT_UNLOCK+' unlocks conveyor belts: a belt replaces the forklifts on its link.':'Unlocks with your first Phase II building (the Carpentry Workshop).'} Rebuilt after a Replant at that run's prices.</div></div>`;}
function logiUpdate(){const b=$('lgBuy');if(!b) return;const l=logiLvl(),c=logiCost(l),mx=!isFinite(c),u=logiUnlocked();
  const bh=mx?'MAX':!u?'🔒':costBtnHtml('⬆',c);if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=mx||!u||S.coins+1e-9<c;
  const L=$('lgL'),lt=`Lv ${l}/${LOGI_MAX}`;if(L&&L._t!==lt){L.textContent=lt;L._t=lt;}
  const d=$('lgD'),g=logiGain();
  const dt=!u?'Needs a Phase II building':mx?`Phase II–III output ×${logiMultAt(l).toFixed(2)} · double loads`:`Phase II–III output ×${logiMultAt(l).toFixed(2)} → ×${logiMultAt(l+1).toFixed(2)}${g>0?` (≈ +${fmt(g)}/s)`:''}${l+1===LOGI_MORE?' · +1 forklift per link':''}${l+1===LOGI_BIG?' · double loads':''}`;
  if(d&&d._t!==dt){d.textContent=dt;d._t=dt;}
  if(typeof beltUpdate==='function') beltUpdate();}   // v2.31
function logiBind(){const b=$('lgBuy');if(b) b.onclick=()=>{if(logiBuy()){if(typeof haptic==='function') haptic(8);logiUpdate();if(typeof render==='function') render();}};if(typeof beltBind==='function') beltBind();}
/* Supply Flow legend line */
function logiFlowLine(){if(!logiUnlocked()) return '';const l=logiLvl();
  return `<div class="lg-flow">🚜 <b>Forklifts</b> Lv ${l} · Phase II–III output <b>×${logiMultAt(l).toFixed(2)}</b>${typeof beltFlowText==='function'?beltFlowText():''} <button class="btn small lg-go" id="lgFlowGo">Logistics</button></div>`;}
function logiOpen(){if(typeof openSheet==='function') openSheet('ship');if(typeof focusLot==='function') focusLot('dock');
  setTimeout(()=>{const e=$('lgBox');if(e&&e.scrollIntoView) e.scrollIntoView({block:'start',behavior:'smooth'});},60);}
