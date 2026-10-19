'use strict';
/* ===================== v2.7 FOREST STOCK & PLANTING CREW =====================
   The forest is a stock of plots: grown trees (m) → felled into stumps (st) → planted as saplings (s) → young trees (y) → grown (m).
   Collectors fell grown trees (felling demand depends on HOW MANY collectors of each tier you own, not on log multipliers);
   when the grown stock runs short, log output falls with it. Planters plant saplings onto stumps; growth follows the seasons. */
const PLANTERS=[
  {id:'planter',name:'Planter',svg:'planter',icon:'🧑‍🌾',rate:.1,cost:60,desc:'Spade, sapling bag and a watering can.'},
  {id:'team',name:'Planting Team',svg:'pteam',icon:'👩‍🌾',rate:.8,cost:15000,desc:'A crew of four with a tool trailer.'},
  {id:'nursery',name:'Tree Nursery',svg:'nursery',icon:'🏡',rate:6,cost:1.5e6,desc:'A glass greenhouse that raises saplings by the thousand.'},
  {id:'sdrone',name:'Seed Drone',svg:'sdrone',icon:'🛸',rate:45,cost:1.2e8,desc:'Fires seed pods into bare ground from the air.'},
];
const PMAP={}; PLANTERS.forEach(p=>PMAP[p.id]=p);
const PL_SCALE=1.15;
const FELL={lumberjack:.015,chainsaw:.03,truck:.07,harvester:.1,drone:.15,heli:.25};   // grown trees felled per second, per collector
const FOREST_BASE=1200, LAND_PER=90;   // plots: base forest + land each sapling/s of planting capacity tends
const GROW_SAP=30, GROW_YOUNG=40;      // mean seconds sapling → young → grown (before season / upgrade multipliers)
const SEASON_GROW=[1.5,1.1,.85,.6];    // spring, summer, autumn, winter
const BUF_SEC=10, NATURAL=.00015, CHOP_TREES=.01;

function plRate(id){return PMAP[id].rate*((M&&M.plantT&&M.plantT[id])||1);}
function plantCap(){let t=0;for(const p of PLANTERS) t+=((S.planters&&S.planters[p.id])||0)*plRate(p.id);return t;}
function plantCapBase(){let t=0;for(const p of PLANTERS) t+=((S.planters&&S.planters[p.id])||0)*p.rate;return t;}
function forestPlots(){return FOREST_BASE+LAND_PER*plantCapBase();}
function fellDemand(){let t=0;for(const c of COLLECTORS) t+=S.collectors[c.id]*FELL[c.id];return t/((M&&M.yield)||1)*(typeof yardRun==='function'?yardRun():1);}   // v2.20.1: idle collectors (full Log Yard) don't fell
function growMult(){return ((M&&M.grow)||1)*SEASON_GROW[S.wx?seasonIdx():0];}
function forestEff(){const F=S.forest;return F&&isFinite(F.eff)?F.eff:1;}
function chopForest(){const F=S.forest;if(!F) return 1;const e=.25+.75*forestEff(),c=Math.min(F.m,CHOP_TREES);F.m-=c;F.st+=c;return e;}
function forestTick(dt,offline){
  const F=S.forest; if(!F) return;
  const P=forestPlots(), tot=F.m+F.y+F.s+F.st; if(tot<P) F.s+=P-tot;   // new land (from more planters) arrives freshly planted with saplings
  // growth: sapling → young → grown (exponential stage times, scaled by season + upgrades)
  const g=growMult(), ks=F.s*(1-Math.exp(-dt*g/GROW_SAP)), ky=F.y*(1-Math.exp(-dt*g/GROW_YOUNG));
  F.s-=ks; F.y+=ks-ky; F.m+=ky;
  // planting onto stumps: the crew plus a very slow natural regrowth
  const cap=plantCap()*dt, nat=NATURAL*F.st*dt, pl=Math.min(F.st,cap+nat), crew=Math.min(pl,cap);
  F.st-=pl; F.s+=pl; if(S.forestLife) S.forestLife.planted+=crew; F.pr=(F.pr||0)+(crew/dt-(F.pr||0))*Math.min(1,dt/2);
  if(offline&&offlineAcc) offlineAcc.planted=(offlineAcc.planted||0)+crew;
  // felling: full output while ≥ BUF_SEC of grown trees stand; below that, output falls with the stock (at 0 only what matures gets cut)
  const D=fellDemand(); const eff=D>1e-9?Math.min(1,F.m/(D*BUF_SEC)):1; const cut=Math.min(F.m,D*eff*dt);
  F.m-=cut; F.st+=cut; F.eff=eff; F.D=D;
  if(!offline){
    if(eff<.5&&!F.warn&&D>0){F.warn=1;toast(`<span style="font-size:22px">🌲</span><span><b>Forest depleted, hire planters!</b><br>Loggers can only fell grown trees. Log output is down to ${Math.round(eff*100)}%.</span>`,6500,'forest-toast');sfx('event');}
    else if(eff>.9&&F.warn) F.warn=0;
  }
}
function plCost(id,n){return bulkCost(PMAP[id].cost,PL_SCALE,S.planters[id]||0,n);}
function buyPlanter(id,n){
  const p=PMAP[id];n=n||qty(p.cost,PL_SCALE,S.planters[id]||0);const cost=plCost(id,n);
  if(S.coins+1e-9<cost) return false; S.coins-=cost; const first=!(S.planters[id]>0); S.planters[id]=(S.planters[id]||0)+n; M=computeMods();
  if(first&&id!=='planter'){toast(`${p.icon} <b>${p.name}</b> hired! +${fr(p.rate)} saplings/s and +${fmt(LAND_PER*p.rate)} plots of forest land.`);sfx('unlock');} else sfx('buy');
  return true;
}
// v2.6 → v2.7: a full forest and a free crew that covers today's loggers (so old saves do not crash into a depleted forest)
function migrateForest(o){
  let D=0;for(const c of COLLECTORS) D+=((o.collectors&&o.collectors[c.id])||0)*FELL[c.id];
  const pl={planter:1,team:0,nursery:0,sdrone:0};let rem=D*1.1-.1;
  for(const id of ['sdrone','nursery','team']){const r=PMAP[id].rate;const n=Math.floor(rem/r);if(n>0){pl[id]=n;rem-=n*r;}}
  if(rem>0) pl.planter+=Math.ceil(rem/PMAP.planter.rate);
  o.planters=pl;let cap=0;for(const p of PLANTERS) cap+=pl[p.id]*p.rate;
  o.forest={m:FOREST_BASE+LAND_PER*cap,y:0,s:0,st:0,eff:1,warn:0,D:0};
}
function forestState(){const F=S.forest,e=forestEff(),D=F.D||fellDemand(),cap=plantCap();
  if(e<.5) return {cls:'bad',txt:'⛔ Forest depleted, hire planters!'};
  if(e<.99) return {cls:'thin',txt:`⚠ Thinning: log output ${Math.round(e*100)}%`};
  if(D>cap*1.02&&D>0){const left=(F.m-D*BUF_SEC)/Math.max(1e-9,D-cap-NATURAL*F.st);return {cls:'warn',txt:`⚠ Felling outpaces planting${left>0&&left<36000?` · ~${fmtTime(left)} of trees left`:''}`};}
  return {cls:'ok',txt:'✔ Healthy'};}

/* ---------- Crew sheet: forest card + planting crew list ---------- */
const plEls={}; let plSig='';
function plVisible(p,i){return (S.planters[p.id]||0)>0||S.totalEarned>=p.cost*0.3||i===0;}
function buildPlanters(){
  const L=$('plList'); if(!L) return; L.innerHTML=''; let teaser=false;
  PLANTERS.forEach((p,i)=>{
    if(!plVisible(p,i)){ if(teaser) return; teaser=true;const d=document.createElement('div');d.className='card locked';
      d.innerHTML=`<div class="ic">❔</div><div><div class="nm">???</div><div class="ds">Earn 🪙 ${fmt(p.cost*0.3)} total to reveal</div></div><div></div>`;L.appendChild(d);return;}
    const d=document.createElement('div');d.className='card pl';d.dataset.id=p.id;
    d.innerHTML=`<div class="ic">${svgIcon(p.svg,32)}</div><div><div class="nm">${p.name}<span class="cnt"></span></div><div class="ds"></div><div class="pbar"><i></i></div></div><button class="btn buy"></button>`;
    const btn=d.querySelector('button'); btn.onclick=()=>{buyPlanter(p.id);render();};
    plEls[p.id]={d,cnt:d.querySelector('.cnt'),ds:d.querySelector('.ds'),btn,pbar:d.querySelector('.pbar>i')};L.appendChild(d);});
}
function updateForestUI(){
  // HUD chip (always)
  const F=S.forest; if(!F) return; const P=forestPlots(), e=forestEff(), st=forestState();
  const chip=$('forestChip'); if(chip){const pct=Math.max(0,Math.min(100,(1-F.st/Math.max(1,P))*100));$('fBarI').style.width=pct.toFixed(1)+'%';const t=fmt(Math.floor(F.m));if($('fPct').textContent!==t) $('fPct').textContent=t;
    chip.className='fchip '+st.cls; chip.title=`Grown trees ${fmt(F.m)} / ${fmt(P)} plots · log output ${Math.round(e*100)}% (tap for Crew & Forest)`;}
  if(curSheet!=='crew') return;
  const c=$('forestCard'); if(c){const D=F.D||0,cap=plantCap(),nat=NATURAL*F.st,g=growMult();
    const w=k=>(Math.max(0,F[k])/P*100).toFixed(2)+'%';
    c.className='forest-card '+st.cls;
    const html=`<div class="fc-h"><b>🌲 ${TREES[S.tree].name} Forest</b><span class="fc-st">${st.txt}</span></div>
      <div class="fc-bar"><i class="m" style="width:${w('m')}"></i><i class="y" style="width:${w('y')}"></i><i class="s" style="width:${w('s')}"></i></div>
      <div class="fc-leg"><span><i class="m"></i>${fmt(F.m)} grown</span><span><i class="y"></i>${fmt(F.y)} young</span><span><i class="s"></i>${fmt(F.s)} saplings</span><span><i class="st"></i>${fmt(F.st)} stumps</span><span class="mut">${fmt(P)} plots</span></div>
      <div class="fc-rates"><span>🪓 Felling <b>${fr(D*e)}</b>${e<.99?` / ${fr(D)}`:''} trees/s</span><span>🌱 Planting <b>${fr(cap)}</b>/s${nat>.005?` <small>+${fr(nat)} natural</small>`:''}</span><span>⏱ Growth ×${g.toFixed(2)} <small>(${SEASONS[S.wx?seasonIdx():0].n})</small></span><span>🪵 Log output <b>${Math.round(e*100)}%</b></span></div>`; if(c._h!==html){c._h=html;c.innerHTML=html;}}
  const s1=PLANTERS.map((p,i)=>plVisible(p,i)?1:0).join(''); if(s1!==plSig||!$('plList').children.length){plSig=s1;buildPlanters();}
  for(const p of PLANTERS){const el=plEls[p.id]; if(!el||!el.d.isConnected) continue;
    const own=S.planters[p.id]||0, n=qty(p.cost,PL_SCALE,own), cost=plCost(p.id,n), r=plRate(p.id);
    el.cnt.textContent=own?'×'+own:''; el.ds.textContent=`+${fr(r)} 🌱/s each · +${fmt(LAND_PER*p.rate)} plots`+(own?` · ${fr(r*own)}/s total`:` · ${p.desc}`);
    el.btn.innerHTML=costBtnHtml(`Hire${n>1?' ×'+n:''}`,cost); el.btn.disabled=S.coins+1e-9<cost; el.d.classList.toggle('afford',!el.btn.disabled);
    if(el.pbar) el.pbar.style.width=Math.min(100,S.coins/cost*100).toFixed(0)+'%';}
}
function forestNeedsCrew(){const e=forestEff();if(e>=.8) return false;let c=1e99;for(const p of PLANTERS) c=Math.min(c,plCost(p.id,1));return S.coins>=c;}
Object.assign(ICONS,{
  planter:()=>`<svg viewBox="0 0 32 32"><circle cx="13" cy="8" r="4.5" fill="#e8c4a0"/><path d="M8.5 7.5a4.6 4.6 0 0 1 9 0z" fill="#c8a050"/><rect x="8.5" y="12" width="9" height="10" rx="2" fill="#6a8a4a"/><rect x="9.5" y="22" width="3" height="8" fill="#4a4030"/><rect x="13.5" y="22" width="3" height="8" fill="#4a4030"/><rect x="5" y="14" width="4.5" height="6" rx="1" fill="#b89a6a"/><path d="M6 14l-1-4M7.5 14l.6-4.6M9 14l1.4-3.6" stroke="#5aa03a" stroke-width="1.6" stroke-linecap="round"/><rect x="21" y="6" width="2" height="18" fill="#7a4a22" transform="rotate(14 22 15)"/><path d="M22.5 24h5l-1 5h-4z" fill="#9aa4ae" transform="rotate(14 24 26)"/></svg>`,
  pteam:()=>`<svg viewBox="0 0 32 32"><circle cx="9" cy="9" r="3.6" fill="#efbf98"/><rect x="5.5" y="12.5" width="7" height="8" rx="1.6" fill="#e8742a"/><circle cx="21" cy="8" r="3.8" fill="#c08453"/><rect x="17" y="12" width="8" height="9" rx="1.8" fill="#6a8a4a"/><rect x="3" y="22" width="26" height="5" rx="1" fill="#8a5a2c"/><circle cx="8" cy="28" r="2.4" fill="#333"/><circle cx="24" cy="28" r="2.4" fill="#333"/><path d="M8 22v-4M13 22v-5M18 22v-4M23 22v-5" stroke="#5aa03a" stroke-width="2" stroke-linecap="round"/></svg>`,
  nursery:()=>`<svg viewBox="0 0 32 32"><path d="M3 15L16 5l13 10v12H3z" fill="#cfeaf2" stroke="#6a8a9a" stroke-width="1.3"/><path d="M16 5v22M9.5 10v17M22.5 10v17M3 20h26" stroke="#8aaab8" stroke-width="1"/><rect x="3" y="24" width="26" height="4" fill="#8a6a4a"/><path d="M7 24v-3M12 24v-4M20 24v-3M25 24v-4" stroke="#4f9a3a" stroke-width="2" stroke-linecap="round"/></svg>`,
  sdrone:()=>`<svg viewBox="0 0 32 32"><rect x="11" y="12" width="10" height="6" rx="1.5" fill="#3a5a3a"/><rect x="13" y="18" width="6" height="4" rx="1" fill="#7cc04f"/><path d="M5 10l6 4M27 10l-6 4" stroke="#999" stroke-width="1.5"/><ellipse cx="5" cy="10" rx="4" ry="1.4" fill="#cde" opacity=".9"/><ellipse cx="27" cy="10" rx="4" ry="1.4" fill="#cde" opacity=".9"/><circle cx="12" cy="27" r="1.6" fill="#8a5a2c"/><circle cx="17" cy="29" r="1.4" fill="#8a5a2c"/><circle cx="21" cy="26" r="1.5" fill="#8a5a2c"/></svg>`,
});
