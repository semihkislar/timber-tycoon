'use strict';

/* ===================== v2.2: STORAGE, PREMIUM AREA, CLIENT ORDERS ===================== */
/* ---------- storage (stock areas) ---------- */
const STO_MAX=8, STO_BASE_SEC=60, STO_SPEED=.05;
function stoLvl(id){return (S.storage&&S.storage[id])||0;}
function stoBonus(id){return 1+STO_SPEED*stoLvl(id);}
function stoSec(l){return STO_BASE_SEC*Math.pow(2,l);}
function stoCost(id){const b=BMAP[id],l=stoLvl(id);return b.cost*cs()*5*Math.pow(5,l);}
// capacity (units) per resource = sum over built producers of (output/s at full speed) x seconds of storage
function stockCaps(){
  const c={}; for(const r of RES) c[r.id]=0; const has={};
  for(const b of BUILDINGS){const st=S.buildings[b.id]; if(!st.lvl) continue; const sp=bSpeed(b.id), sec=stoSec(stoLvl(b.id))*mgrSto(b.id);
    for(const k in b.out){c[k]+=b.out[k]*sp*sec*chainYield(b.id);has[k]=1;}
    if(b.id==='sawmill'&&M.sawdust){c.chips+=2*sp*sec;has.chips=1;}}
  for(const r of RES) c[r.id]=has[r.id]?Math.max(50,c[r.id]):Infinity;
  return c;
}
function bldCap(id){const b=BMAP[id],st=S.buildings[id];if(!st.lvl) return 0;let t=0;const sp=bSpeed(id),sec=stoSec(stoLvl(id))*mgrSto(id);for(const k in b.out) t+=b.out[k]*sp*sec;return Math.max(50,t);}
function buyStorage(id){
  const l=stoLvl(id); if(l>=STO_MAX||!S.buildings[id].lvl) return false; const c=stoCost(id); if(S.coins+1e-9<c) return false;
  S.coins-=c; S.storage[id]=l+1; M=computeMods(); sfx('buy');
  toast(`📦 <b>${BMAP[id].name}</b> storage → Lv ${l+1}: holds ${fmtTime(stoSec(l+1))} of output, +${Math.round(STO_SPEED*100)}% loading speed`);
  if(typeof stoPoof==='function') stoPoof(id); return true;
}
/* ---------- premium area ---------- */
const PREM_UNLOCK=2e6, PREM_LVL_BONUS=0.25, PREM_MAX=5;
function premCost(){const l=S.premium.lvl;return (l?PREM_UNLOCK*Math.pow(12,l):PREM_UNLOCK)*cs();}
function premVisible(){return S.premium.lvl>0||S.totalEarned>=PREM_UNLOCK*0.25;}
function buyPremium(){
  const l=S.premium.lvl; if(l>=PREM_MAX) return false; const c=premCost(); if(S.coins+1e-9<c) return false;
  S.coins-=c; S.premium.lvl=l+1; M=computeMods();
  if(l===0){toast('🏛️ <b>Premium Factory Area</b> open! Build luxury workshops that turn your goods into high-value products.',6000,'ms-toast');confettiBurst();sfx('unlock');if(typeof premPoof==='function') premPoof();}
  else {toast(`🏛️ Showroom Lv ${l+1}: premium goods sell for <b>+${Math.round(PREM_LVL_BONUS*l*100)}%</b>`);sfx('unlock');}
  return true;
}
/* ---------- client orders ---------- */
const CLIENTS=[
  {n:'Grand Bosphorus Hotel',e:'🏨',likes:['luxfurn','furniture','chairs','cabinets','flooring']},
  {n:'Nordic Design Studio',e:'📐',likes:['cabinets','flooring','planks','luxfurn']},
  {n:'Royal Embassy',e:'🏛️',likes:['stationery','paper','luxfurn']},
  {n:'Seaside Restaurant Group',e:'🍽️',likes:['chairs','giftbox','charcoal','furniture']},
  {n:'BBQ Masters Club',e:'🔥',likes:['giftbox','charcoal','pellets']},
  {n:'Boutique Stationer',e:'✒️',likes:['stationery','paper']},
  {n:'Luxury Yacht Builder',e:'⛵',likes:['flooring','cabinets','planks']},
  {n:'City Builders Co.',e:'🏗️',likes:['planks','chips','veneer','pellets','beams','glulam']},
  {n:'Alpine Chalet Developers',e:'🏔️',likes:['houses','glulam','beams','flooring']},   // v2.28
  {n:'Garden Centre Chain',e:'🌿',likes:['chips','pellets','charcoal']},
];
const ORDER_OFFER_SEC=240;   // v2.25: offers wait on the board longer (was 75 s for a single phone call)
function prodRate(k){
  if(k==='logs') return logRate();
  let p=0; for(const b of BUILDINGS){const st=S.buildings[b.id]; if(!st.lvl||!st.on) continue; const f=Math.max(.3,bstat[b.id].f||0);
    if(b.out[k]) p+=b.out[k]*bSpeed(b.id)*f*bOutMult(b.id); if(k==='chips'&&b.id==='sawmill'&&M.sawdust) p+=2*bSpeed(b.id)*f;}
  return p;
}
function niceNum(x){if(!(x>0)) return 0;if(x<10) return Math.max(1,Math.round(x));const e=Math.pow(10,Math.floor(Math.log10(x))-1);return Math.round(x/e)*e;}
function ordersOpen(){return S.totalEarned>=250&&S.buildings.sawmill.lvl>0;}

/* ---------- v2.25: order sizing (client orders, daily contracts, export contracts) ----------
   Before v2.25 an order was sized on the *smoothed actual* output of one good (min(potential, EMA)) × 25–40 % of the timer,
   with a floor of 5 units, and paid max(goods × 1.8, 25 % of income over the timer, 🪙50). Right after a Replant (and
   whenever a line was new, growing fast or starved) that EMA is near 0, so clients asked for 5–20 units, and the income
   floor paid hundreds or thousands of times the goods' value. Daily contracts were drawn 4 s into a new run from a fallback
   list of goods not even made yet (5 units for 🪙40) and kept for the whole day.
   Now:
   - deliverable rate = the line's potential output, at least 35 % of it even while the EMA lags (ordRate);
   - the order must be worth ≥ ORD_MIN_SEC seconds of this run's income (floor: forest value), never below ORD_MIN_UNITS
     units, and stay deliverable (≤ 60 % of the output over the timer + 80 % of stock); goods that can't reach that are skipped;
   - reward = goods value × 1.5 … 2.5 (daily 1.4 … 2.2), never the old "income floor" with a tiny amount.
   - income reference ordInc() = max(income now, ½ the run's best smoothed income, 2 🪙/s × forest value). */
const ORD_MIN_UNITS=20, ORD_MIN_SEC=5, ORD_FEAS=.6, ORD_IDLE_INC=2, ORD_MIN_PAY=50;
function ordInc(){return Math.max(coinRate||0,.5*(typeof staffIncRef==='function'?staffIncRef():0),ORD_IDLE_INC*cs());}
function ordRate(k){const pot=prodRate(k);if(!(pot>0)) return 0;const sm=(rates[k]&&rates[k].p)||0;return Math.min(pot,Math.max(sm,pot*.35));}
// frac: share of dur × rate (random per order), mult: difficulty amount factor, minSec: value floor in seconds of income
function ordPlan(k,dur,frac,mult,minSec){
  mult=mult||1;const d=ordRate(k),pr=Math.max(1e-12,price(k)),stock=Math.max(0,S.res[k]||0);
  const cap=d*dur*ORD_FEAS+stock*.8, base=d*dur*frac*mult;
  const need=Math.max(ORD_MIN_UNITS,(minSec===undefined?ORD_MIN_SEC:minSec)*mult*ordInc()/pr);
  const amt=niceNum(Math.max(base,ORD_MIN_UNITS,Math.min(need,cap)));
  return {amt,ok:d>0&&cap>=need,d,need,cap,val:amt*pr};
}
// reward proportional to the goods' value: value × [lo … hi]; inside that band it follows ~incK of income over the timer
function ordPay(amt,k,dur,lo,hi,incK){const val=amt*price(k);const m=Math.min(hi,Math.max(lo,ordInc()*dur*incK/Math.max(1e-12,val)));return Math.max(val*m,ORD_MIN_PAY*cs());}
function ordSlots(){return 1+(BUILDINGS.some(b=>BTIER[b.id]===2&&S.buildings[b.id].lvl>0)?1:0)+(S.premium&&S.premium.lvl>0?1:0);}   // orders in progress at once
function ordBoardMax(){return Math.min(3,1+ordSlots());}   // clients waiting on the board
function ordGap(){return 45+Math.random()*30;}
function ordValid(o){return !!(o&&typeof o==='object'&&RMAP[o.item]&&isFinite(o.amt)&&o.amt>0&&isFinite(o.reward));}
// S.orders keeps lists (offers / acts); .offer / .active stay as accessors for the first one (old code, saves and tests)
function ordNorm(O){
  O=O||(S&&S.orders); if(!O||typeof O!=='object') return O;
  const d=Object.getOwnPropertyDescriptor(O,'offer');
  if(d&&d.get) return O;
  const of=O.offer, ac=O.active; delete O.offer; delete O.active;
  O.offers=Array.isArray(O.offers)?O.offers.filter(ordValid):[]; O.acts=Array.isArray(O.acts)?O.acts.filter(ordValid):[];
  if(ordValid(of)&&!O.offers.some(x=>x.id===of.id)) O.offers.unshift(of);
  if(ordValid(ac)&&!O.acts.some(x=>x.id===ac.id)){if(!isFinite(ac.ends)) ac.ends=(S.time||0)+(ac.dur||180);if(!isFinite(ac.got)) ac.got=0;O.acts.unshift(ac);}
  for(const o of O.offers) if(!isFinite(o.expires)) o.expires=(S.time||0)+ORDER_OFFER_SEC;
  if(!isFinite(O.next)) O.next=(S.time||0)+60; if(!Array.isArray(O.hist)) O.hist=[]; O.done=O.done||0; O.failed=O.failed||0;
  Object.defineProperty(O,'offer',{get(){return this.offers[0]||null;},set(v){this.offers=ordValid(v)?[v]:[];},enumerable:true,configurable:true});
  Object.defineProperty(O,'active',{get(){return this.acts[0]||null;},set(v){this.acts=ordValid(v)?[v]:[];},enumerable:true,configurable:true});
  return O;
}
function makeOrder(forceItem){
  const O=ordNorm(); const taken=new Set(O?[...O.offers,...O.acts].map(o=>o.item):[]);
  const dur=[180,240,300][Math.floor(Math.random()*3)], frac=.25+Math.random()*.15;
  const pool=[], all=[]; for(const r of RES){if(!canSell(r.id)||!(prodRate(r.id)>0.02)) continue; const pl=ordPlan(r.id,dur,frac); all.push([r,pl]); if(pl.ok&&!taken.has(r.id)) pool.push([r,pl]);}
  let pick;
  if(forceItem) pick=all.find(([r])=>r.id===forceItem)||pool[0]||all[0];
  else { if(!pool.length) return null; const prem=pool.filter(([r])=>r.premium);
    if(prem.length&&Math.random()<.65) pick=prem[Math.floor(Math.random()*prem.length)];
    else {const top=pool.slice().sort((a,b)=>RMAP[b[0].id].price-RMAP[a[0].id].price).slice(0,3);pick=top[Math.floor(Math.random()*top.length)];}}
  if(!pick) return null;
  const [r,pl]=pick, amt=pl.amt;
  const cands=CLIENTS.filter(c=>c.likes.includes(r.id)); const cl=(cands.length?cands:CLIENTS)[Math.floor(Math.random()*(cands.length||CLIENTS.length))];
  const reward=niceNum(ordPay(amt,r.id,dur,1.5,2.5,.15)*(r.premium?1.25:1)*mgrOrders()*(M.orderPay||1));
  let bonus=null; const rr=Math.random();
  if(r.premium&&rr<.2&&S.totalEarned>=1e7*cs()) bonus={type:'seeds',n:1};
  else if(rr<(r.premium?.45:.25)) bonus={type:'boost',id:'viprush'};
  return {item:r.id,amt,dur,reward,bonus,client:cl.n,e:cl.e,premium:!!r.premium,got:0,expires:S.time+ORDER_OFFER_SEC,id:Math.floor(Math.random()*1e9)};
}
function offerOrder(forceItem){const O=ordNorm(); const o=makeOrder(forceItem); if(!o) return false; if(forceItem) O.offers.unshift(o); else O.offers.push(o); orderFx('offer'); return true;}
function ordFind(list,id){return id===undefined||id===null?list[0]:list.find(x=>x.id===id);}
function acceptOrder(id){const O=ordNorm(); const o=ordFind(O.offers,id); if(!o) return false;
  if(O.acts.length>=ordSlots()){if(typeof toast==='function') toast(`📋 All <b>${ordSlots()}</b> order slots are busy. Finish one first.`,2600);return false;}
  O.offers.splice(O.offers.indexOf(o),1); o.ends=S.time+o.dur; o.got=0; O.acts.push(o); sfx('buy'); orderFx('accept'); render(); return true;}
function declineOrder(id){const O=ordNorm(); const o=ordFind(O.offers,id); if(!o) return false; O.offers.splice(O.offers.indexOf(o),1); O.next=Math.max(O.next,S.time+30); orderFx('decline'); render(); return true;}
function deliverFromStock(id){const O=ordNorm(); const o=ordFind(O.acts,id); if(!o) return 0; const n=Math.min(S.res[o.item],o.amt-o.got); if(n<=0) return 0; S.res[o.item]-=n; o.got+=n; if(o.got>=o.amt-1e-6) completeOrder(false,o); render(); return n;}
// active orders take surplus production (beyond the downstream buffer) before auto-sell
// an accepted order is a priority contract: it always gets at least 70% of this tick's output of the item,
// even if downstream buildings then run a little short until it's delivered
function orderCollect(demand,dt,offline,pend){
  const O=ordNorm(); if(!O||!O.acts.length) return;
  for(const o of O.acts.slice()){
    const k=o.item, reserve=(demand[k]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const share=k==='logs'?0:.7*((pend&&pend[k])||0);
    const take=Math.min(o.amt-o.got,S.res[k],Math.max(S.res[k]-reserve,priBudget(k,share,pend))); if(take>1e-9){S.res[k]-=take;o.got+=take;priTook(k,Math.max(0,take-Math.max(0,S.res[k]+take-reserve)));}
    if(o.got>=o.amt-1e-6) completeOrder(offline,o);
  }
}
function completeOrder(offline,o){
  const O=ordNorm(); o=o||O.acts[0]; const ix=O.acts.indexOf(o); if(!o||ix<0) return; O.acts.splice(ix,1); earn(o.reward); O.done++;
  let extra='';
  if(o.bonus&&o.bonus.type==='seeds'){S.seeds+=o.bonus.n;extra=` +${o.bonus.n} 🌱 Seed`;}
  else if(o.bonus&&o.bonus.type==='boost'&&!offline){S.events=S.events.filter(e=>e.id!=='viprush');S.events.push({id:'viprush',ends:S.time+EMAP.viprush.dur});extra=' + 🎩 VIP Rush (all prices 2× for 45s)';}
  O.hist.push({item:o.item,amt:o.amt,reward:o.reward,client:o.client,e:o.e,ok:true}); O.hist=O.hist.slice(-6);
  O.next=Math.min(O.next,S.time+30+Math.random()*20); M=computeMods();
  if(!offline){toast(`${o.e} <b>${o.client}</b> is thrilled! Order delivered: +🪙${fmt(o.reward)}${extra}`,5000,'ms-toast');confettiBurst();sfx('unlock');orderFx('done',o);renderEvents(true);}
}
function orderTick(dt,offline){
  const O=ordNorm(); if(!O) return;
  for(const o of O.offers.slice()) if(S.time>=o.expires){O.offers.splice(O.offers.indexOf(o),1);O.next=Math.min(O.next,S.time+30);if(!offline) orderFx('expire');}
  for(const o of O.acts.slice()) if(S.time>=o.ends){O.acts.splice(O.acts.indexOf(o),1);O.failed++;O.hist.push({item:o.item,amt:o.amt,reward:o.reward,client:o.client,e:o.e,ok:false});O.hist=O.hist.slice(-6);O.next=Math.min(O.next,S.time+45);
    if(!offline){toast(`${o.e} ${o.client}'s order ran out of time (${fmt(o.got)}/${fmt(o.amt)}). No penalty — another client will call soon.`,4500);orderFx('fail',o);}}
  if(offline){if(O.next<S.time) O.next=S.time+30;return;}
  const room=O.offers.length<ordBoardMax()&&!(O.acts.length>=ordSlots()&&O.offers.length>=1);
  if(room&&S.time>=O.next&&ordersOpen()){O.next=S.time+(offerOrder()?ordGap():30);}
}
function orderFx(kind,o){scene.orderEv={kind,t:0,o};if(kind==='offer'){sfx('event');const c=$('orderCard');if(c){c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');}}}

/* ===================== v2.6 DAILY CONTRACTS ===================== */
// Up to 2 concurrent active contracts. Declining frees the day's slot (no replacement).
// Streak = consecutive local days with ≥1 complete; bonuses at 3 / 7 / 14 days.
const DAILY_MAX_ACTIVE=2;
const DAILY_DIFFS=[
  {id:'easy',n:'Easy',amt:.55,time:1.35,pay:.9,e:'🟢'},
  {id:'std',n:'Standard',amt:.85,time:1.0,pay:1.15,e:'🟡'},
  {id:'hard',n:'Hard',amt:1.2,time:.7,pay:1.6,e:'🔴'},
];
let ordTab='daily';   // 'clients' | 'daily'
let dailySig='', dailyChipSig='';
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function freshDaily(){return {day:dayKey(),offers:[],active:[],doneToday:0,streak:0,bestStreak:0,total:0,hist:[],failedToday:0};}
function dailyOpen(){return S.totalEarned>=500&&S.buildings.sawmill.lvl>0;}
function streakMult(){const s=(S.daily&&S.daily.streak)||0;return 1+(s>=14?.25:s>=7?.15:s>=3?.08:0);}
function streakLabel(){const s=(S.daily&&S.daily.streak)||0;if(s>=14) return '+25% contract rewards';if(s>=7) return '+15% contract rewards';if(s>=3) return '+8% contract rewards';return 'Complete ≥1 daily each day to keep the streak';}
function ensureDailyDay(){
  if(!S.daily||typeof S.daily!=='object') S.daily=freshDaily();
  const d=dayKey();
  if(S.daily.day&&S.daily.day!==d){
    // day rolled: streak requires ≥1 complete that day
    if(S.daily.doneToday<1&&S.daily._made) S.daily.streak=0;
    S.daily.day=d; S.daily.offers=[]; S.daily.active=[]; S.daily.doneToday=0; S.daily.failedToday=0; S.daily._made=false;
  }
  if(!S.daily.day) S.daily.day=d;
}
// v2.25: the day's contracts are drawn once a few product lines are running (≥ 3 goods that can carry a real contract, or
// 1+ after the run's first 5 minutes), never from goods you don't make yet. Until accepted, an offer's amount and reward
// follow your output (dailyResize), so contracts drawn early in a run or before a big upgrade don't stay tiny all day.
function dailyGoods(){const g=[];for(const r of RES){if(!canSell(r.id)||!(prodRate(r.id)>0.015)) continue;if(ordPlan(r.id,210,.28,DAILY_DIFFS[1].amt).ok) g.push(r.id);}return g;}
function dailyReady(){const n=dailyGoods().length;const age=(S.playTime||0)-((S.run&&S.run.start)||0);return n>=3||(n>=1&&age>=300)||(n>=1&&!(S.prestiges>0)&&S.totalEarned>=500);}
function makeDailyOffers(force){
  ensureDailyDay();
  if(!dailyOpen()) return false;
  if(!force&&S.daily._made) return false;
  if(!force&&!dailyReady()) return false;
  if(force){S.daily.offers=[];S.daily.active=[];S.daily._made=false;}
  const used=new Set();
  const out=[];
  for(const diff of DAILY_DIFFS){
    const o=makeDailyContract(diff,used);
    if(o){out.push(o);used.add(o.item);}
  }
  while(out.length<3){const o=makeDailyContract(DAILY_DIFFS[out.length%3],used,true); if(!o) break; out.push(o); used.add(o.item);}
  if(!out.length) return false;
  S.daily.offers=out; S.daily._made=true;
  if(!S.orders.offer) ordTab='daily';
  dailySig=''; return true;
}
function dailyPlan(o){const diff=DAILY_DIFFS.find(d=>d.id===o.diff)||DAILY_DIFFS[1];const pl=ordPlan(o.item,o.dur,o.fr||.28,diff.amt);
  const reward=niceNum(ordPay(pl.amt,o.item,o.dur,1.4,2.2,.15)*diff.pay*streakMult()*mgrOrders()*(M.orderPay||1));return {amt:pl.amt,reward,ok:pl.ok};}
function makeDailyContract(diff,used,reuse){
  const pool=[];
  for(const r of RES){
    if(used&&used.has(r.id)&&!reuse) continue;
    if(!canSell(r.id)) continue;   // v2.20.1: no daily contract asks for logs
    const p=prodRate(r.id); if(!(p>0.015)) continue;   // v2.25: never a good you don't make (was a fallback list sized at 0.05/s → 5 units)
    pool.push([r,p]);
  }
  if(!pool.length) return null;
  const baseDur=[150,210,270][Math.floor(Math.random()*3)];
  const dur=Math.round(baseDur*diff.time), fr=.22+Math.random()*.12;
  // v2.25: only goods that can carry a contract worth ≥ ORD_MIN_SEC s of income
  let pickFrom=pool.filter(([r])=>ordPlan(r.id,dur,fr,diff.amt).ok&&!(used&&used.has(r.id)));
  if(!pickFrom.length&&reuse) pickFrom=pool.filter(([r])=>ordPlan(r.id,dur,fr,diff.amt).ok);
  if(!pickFrom.length) return null;
  const premium=pickFrom.filter(([r])=>r.premium||r.tech);
  let pick;
  if(premium.length&&Math.random()<(diff.id==='hard'?.7:.35)) pick=premium[Math.floor(Math.random()*premium.length)];
  else {const commons=pickFrom.filter(([r])=>!r.premium&&!r.tech); const src=commons.length?commons:pickFrom; pick=src[Math.floor(Math.random()*src.length)];}
  const [r]=pick;
  const o={id:Math.floor(Math.random()*1e9),item:r.id,amt:0,dur,fr,reward:0,bonus:null,diff:diff.id,diffN:diff.n,e:diff.e,got:0,status:'offer'};
  const pl=dailyPlan(o); o.amt=pl.amt; o.reward=pl.reward;
  if(diff.id==='hard'){const rr=Math.random(); if(rr<.22&&S.totalEarned>=5e6*cs()) o.bonus={type:'seeds',n:1}; else if(rr<.5) o.bonus={type:'boost',id:'viprush'};}
  else if(diff.id==='std'&&Math.random()<.18) o.bonus={type:'boost',id:'viprush'};
  return o;
}
// offers not yet accepted follow the current output (only when the change is worth showing: ≥ 15 %)
function dailyResize(){const D=S.daily;if(!D||!D.offers||!D.offers.length) return 0;let n=0;
  for(const o of D.offers){if(!RMAP[o.item]) continue;if(!o.fr) o.fr=.28;const pl=dailyPlan(o);if(!(pl.amt>0)) continue;
    if(Math.abs(pl.amt/o.amt-1)>=.15||!(o.amt>=ORD_MIN_UNITS)){o.amt=pl.amt;o.reward=pl.reward;n++;}}
  if(n) dailySig='';return n;}
function acceptDaily(id){
  ensureDailyDay(); makeDailyOffers();
  const D=S.daily; if(D.active.length>=DAILY_MAX_ACTIVE) return false;
  const ix=D.offers.findIndex(o=>o.id===id); if(ix<0) return false;
  const o=D.offers.splice(ix,1)[0]; o.ends=S.time+o.dur; o.got=0; o.status='active'; D.active.push(o);
  sfx('buy'); dailySig=''; render(); return true;
}
function declineDaily(id){
  ensureDailyDay();
  const D=S.daily; const ix=D.offers.findIndex(o=>o.id===id); if(ix<0) return false;
  D.offers.splice(ix,1); // frees the slot for the day — no replacement
  sfx('buy'); dailySig=''; render(); return true;
}
function deliverDaily(id){
  ensureDailyDay();
  const o=S.daily.active.find(x=>x.id===id); if(!o) return 0;
  const n=Math.min(S.res[o.item],o.amt-o.got); if(n<=0) return 0;
  S.res[o.item]-=n; o.got+=n;
  if(o.got>=o.amt-1e-6) completeDaily(o,false);
  render(); return n;
}
function dailyCollect(demand,dt,offline,pend){
  const D=S.daily; if(!D||!D.active||!D.active.length) return;
  // share priority fill across actives (per item)
  const by={}; for(const o of D.active){ (by[o.item]=by[o.item]||[]).push(o); }
  for(const k in by){
    const list=by[k], reserve=(demand[k]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const share=k==='logs'?0:.65*((pend&&pend[k])||0);
    const sur=Math.max(0,S.res[k]-reserve);let pool=Math.max(sur,priBudget(k,share,pend));const pool0=pool;
    for(const o of list){
      const need=o.amt-o.got; if(need<=1e-9||pool<=1e-9) continue;
      const take=Math.min(need,S.res[k],pool/list.length+1e-12,pool); if(take<=1e-9) continue;
      S.res[k]-=take; o.got+=take; pool-=take;
      if(o.got>=o.amt-1e-6) completeDaily(o,offline);
    }
    priTook(k,Math.max(0,(pool0-pool)-sur));
  }
}
function completeDaily(o,offline){
  const D=S.daily; if(!D) return;
  const ix=D.active.findIndex(x=>x.id===o.id); if(ix<0) return;
  D.active.splice(ix,1);
  const reward=o.reward;
  earn(reward);
  const first=D.doneToday===0;
  if(first){D.streak=(D.streak||0)+1; D.bestStreak=Math.max(D.bestStreak||0,D.streak);}
  D.doneToday++; D.total++;
  let extra='';
  if(o.bonus&&o.bonus.type==='seeds'){S.seeds+=o.bonus.n;extra=` +${o.bonus.n} 🌱 Seed`;}
  else if(o.bonus&&o.bonus.type==='boost'&&!offline){S.events=S.events.filter(e=>e.id!=='viprush');S.events.push({id:'viprush',ends:S.time+EMAP.viprush.dur});extra=' + 🎩 VIP Rush';}
  D.hist.push({item:o.item,amt:o.amt,reward,diff:o.diff,e:o.e,ok:true,day:D.day}); D.hist=D.hist.slice(-8);
  M=computeMods();
  if(!offline){toast(`${o.e} <b>Daily ${o.diffN}</b> delivered! +🪙${fmt(reward)}${extra}${first&&D.streak>1?` · 🔥 ${D.streak}-day streak`:''}`,5200,'ms-toast');confettiBurst();sfx('unlock');spawnCourierVan(o);dailySig='';checkAch();renderEvents(true);render();}
}
function failDaily(o,offline){
  const D=S.daily; const ix=D.active.findIndex(x=>x.id===o.id); if(ix<0) return;
  D.active.splice(ix,1); D.failedToday++;
  D.hist.push({item:o.item,amt:o.amt,reward:o.reward,diff:o.diff,e:o.e,ok:false,day:D.day}); D.hist=D.hist.slice(-8);
  // streak does NOT break on a single fail — only if the day ends with zero completes
  if(!offline){toast(`${o.e} Daily ${o.diffN} timed out (${fmt(o.got)}/${fmt(o.amt)}). No coin penalty.`,4200);dailySig='';}
}
function dailyTick(dt,offline){
  ensureDailyDay();
  const D=S.daily; if(!D) return;
  // expire active timers
  for(const o of D.active.slice()){ if(S.time>=o.ends) failDaily(o,offline); }
  if(offline){ if(dailyOpen()&&!D._made) makeDailyOffers(); return; }
  if(dailyOpen()&&!D._made) makeDailyOffers();
  if(D.offers&&D.offers.length&&(S.time%10)<dt) dailyResize();   // v2.25
}
function openDaily(){ordTab='daily';openSheet('ord');}
function dailyAwaiting(){ensureDailyDay();return !!(S.daily&&S.daily.offers&&S.daily.offers.length);}
function dailyActiveN(){return (S.daily&&S.daily.active&&S.daily.active.length)||0;}

function renderDailyChip(){
  let c=$('dailyChip');
  if(!c){c=document.createElement('div');c.id='dailyChip';c.className='hidden';document.body.appendChild(c);}
  const D=S.daily, act=D&&D.active&&D.active[0];
  if(!act){if(c.dataset.on){c.dataset.on='';c.className='hidden';} return;}
  const sig=act.id+'|'+Math.floor(act.got)+'|'+Math.floor(act.ends-S.time);
  if(sig!==dailyChipSig||!c.dataset.on){dailyChipSig=sig;c.dataset.on='1';c.className='daily-chip';
    c.innerHTML=`<span class="dc-e">${act.e}</span><span class="dc-ic">${svgIcon(RMAP[act.item].svg,18)}</span><div class="dc-pr"><div class="dc-l"><b>${fmt(act.got)}/${fmt(act.amt)}</b><span>⏱ ${fmtTime(Math.max(0,act.ends-S.time))}</span></div><div class="dc-bar"><i style="width:${Math.min(100,act.got/act.amt*100).toFixed(1)}%"></i></div></div>`;
    c.onclick=()=>openDaily();}
  else {const bar=c.querySelector('.dc-bar i'),l=c.querySelector('.dc-l');if(bar){bar.style.width=Math.min(100,act.got/act.amt*100).toFixed(1)+'%';l.innerHTML=`<b>${fmt(act.got)}/${fmt(act.amt)}</b><span>⏱ ${fmtTime(Math.max(0,act.ends-S.time))}</span>`;}}
}


/* ---------- UI: order card, Orders pane, Premium pane, storage block ---------- */
UI_ICONS.ord=`<svg viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="24" rx="2.5" fill="#fff6e0" stroke="#8a5a32" stroke-width="1.6"/><rect x="11" y="3" width="10" height="5" rx="1.5" fill="#c99357" stroke="#8a5a32" stroke-width="1.2"/><path d="M10 13h12M10 17h12M10 21h7" stroke="#b09a78" stroke-width="1.8" stroke-linecap="round"/><circle cx="22.5" cy="23.5" r="5" fill="#f5c84c" stroke="#b8860b" stroke-width="1.3"/><path d="M20.3 23.6l1.6 1.6 2.9-3.1" stroke="#7a4a10" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
UI_ICONS.prem=`<svg viewBox="0 0 32 32"><path d="M4 13L16 5l12 8z" fill="#2a1d14" stroke="#f5c84c" stroke-width="1.4"/><rect x="6" y="13" width="20" height="13" fill="#4a2c1c"/><rect x="8.5" y="15" width="4" height="9" fill="#9fd8f0"/><rect x="14" y="15" width="4" height="9" fill="#9fd8f0"/><rect x="19.5" y="15" width="4" height="9" fill="#9fd8f0"/><rect x="4" y="26" width="24" height="3" rx="1" fill="#f5c84c"/></svg>`;
ICONS.giftbox=()=>`<svg viewBox="0 0 32 32"><rect x="5" y="12" width="22" height="16" rx="2" fill="#2a2a30"/><rect x="4" y="9" width="24" height="5" rx="1.5" fill="#3a3a42"/><rect x="14.5" y="9" width="3" height="19" fill="#e0a92a"/><path d="M16 9c-3-5-8-4-6-1 1 1.5 4 1 6 1zm0 0c3-5 8-4 6-1-1 1.5-4 1-6 1z" fill="#f5c84c"/><rect x="7" y="18" width="5" height="3" rx="1" fill="#e8742a"/></svg>`;
ICONS.flooring=()=>`<svg viewBox="0 0 32 32"><path d="M3 20l13-7 13 7-13 7z" fill="#8a5428"/><path d="M3 20l13-7 4 2-13 7zM11 24.4l13-7 2.6 1.4-13 7z" fill="#b8763a"/><path d="M7 22.2l13-7M15 26.6l13-7" stroke="#5a3418" stroke-width=".8"/><path d="M3 20v2.4l13 7V27z" fill="#5a3418"/><path d="M29 20v2.4l-13 7V27z" fill="#6a3e1c"/><circle cx="24" cy="8" r="4" fill="#f5c84c"/><path d="M24 5.5v5M21.5 8h5" stroke="#fff6c8" stroke-width="1.2"/></svg>`;
ICONS.stationery=()=>`<svg viewBox="0 0 32 32"><rect x="5" y="6" width="17" height="22" rx="1.5" fill="#1f3a5a"/><rect x="7" y="8" width="13" height="18" rx="1" fill="#f6f1e4"/><path d="M9 12h9M9 15h9M9 18h6" stroke="#c9b48a" stroke-width="1.2"/><rect x="5" y="6" width="3" height="22" fill="#e0a92a"/><path d="M27 4l-9 15-1.5 4 3.4-2.6 9-15z" fill="#2a2a30"/><path d="M27 4l1.9 1.4-1.2 2-1.9-1.4z" fill="#f5c84c"/></svg>`;
ICONS.cabinets=()=>`<svg viewBox="0 0 32 32"><rect x="5" y="5" width="22" height="23" rx="1.5" fill="#3a2418"/><rect x="7" y="7" width="8.5" height="19" rx="1" fill="#6a4026"/><rect x="16.5" y="7" width="8.5" height="19" rx="1" fill="#6a4026"/><rect x="13" y="14" width="1.6" height="5" rx=".8" fill="#f5c84c"/><rect x="17.4" y="14" width="1.6" height="5" rx=".8" fill="#f5c84c"/><rect x="5" y="27" width="22" height="2" fill="#f5c84c"/></svg>`;
ICONS.luxfurn=()=>`<svg viewBox="0 0 32 32"><path d="M5 17c0-3 2-5 5-5h12c3 0 5 2 5 5v5H5z" fill="#6a1f3a"/><rect x="3" y="18" width="5" height="8" rx="2" fill="#8a2a4a"/><rect x="24" y="18" width="5" height="8" rx="2" fill="#8a2a4a"/><rect x="7" y="20" width="18" height="5" rx="1.5" fill="#a83a5e"/><rect x="5" y="26" width="2" height="3" fill="#f5c84c"/><rect x="25" y="26" width="2" height="3" fill="#f5c84c"/><path d="M11 4l2.5 3 2.5-4 2.5 4 2.5-3-1 6H12z" fill="#f5c84c"/></svg>`;
function resName(k){return RMAP[k]?RMAP[k].name:k;}
function orderLine(o){return `<b>${fmt(o.amt)}</b> × ${resName(o.item)}`;}
function bonusTxt(o){return o.bonus?(o.bonus.type==='seeds'?` + ${o.bonus.n} 🌱`:' + 🎩 VIP Rush'):'';}
let ordCardSig='';
function renderOrderCard(){
  const c=$('orderCard'); if(!c) return; const O=ordNorm(); const o=O.offer||O.active;
  $('ordDot').classList.toggle('hidden',!(O.offers.length||dailyAwaiting()));
  if(!o){if(c.dataset.on){c.dataset.on='';c.className='hidden';} return;}
  const mode=O.offer?'offer':'active', more=O.offers.length+O.acts.length-1, full=O.acts.length>=ordSlots();
  const sig=mode+o.id+'|'+more+'|'+full;
  if(sig!==ordCardSig){ordCardSig=sig;const pop=!c.dataset.on||c.dataset.oid!==String(o.id);c.dataset.on='1';c.dataset.oid=o.id;c.className=(mode==='offer'?'offer'+(pop?' pop':''):'active');
    const mb=more>0?`<span class="oc-more" title="More orders on the board">+${more}</span>`:'';
    c.innerHTML=mode==='offer'
      ?`<div class="oc-h"><span class="oc-e">${o.e}</span><div class="oc-t"><small>${o.premium?'💎 PREMIUM ORDER':'📋 NEW ORDER'}</small><b>${o.client}</b></div>${mb}</div>
        <div class="oc-b"><span class="oc-ic">${svgIcon(RMAP[o.item].svg,26)}</span><div>wants ${orderLine(o)}<br>within <b>${fmtTime(o.dur)}</b></div></div>
        <div class="oc-r">Reward <b>🪙 ${fmt(o.reward)}</b>${bonusTxt(o)}</div>
        <div class="oc-btns"><button class="btn small red" id="ocNo">Decline</button><button class="btn small gold" id="ocYes" ${full?'disabled':''}>${full?'Slots full':'✔ Accept'}</button></div><div class="oc-exp"><i id="ocExp"></i></div>`
      :`<span class="oc-e">${o.e}</span><span class="oc-ic">${svgIcon(RMAP[o.item].svg,20)}</span><div class="oc-pr"><div class="oc-l"><span id="ocGot"></span><span id="ocTm"></span></div><div class="oc-bar"><i id="ocBar"></i></div></div>${mb}`;
    if(mode==='offer'){const id=o.id;$('ocYes').onclick=e=>{e.stopPropagation();acceptOrder(id);};$('ocNo').onclick=e=>{e.stopPropagation();declineOrder(id);};}
    c.onclick=()=>{if(curSheet!=='ord'){ordTab='clients';openSheet('ord');}};
  }
  if(mode==='offer'){const e=$('ocExp');if(e) e.style.width=Math.max(0,(o.expires-S.time)/ORDER_OFFER_SEC*100).toFixed(1)+'%';}
  else {const g=$('ocGot');if(g){g.textContent=`${fmt(o.got)} / ${fmt(o.amt)}`;$('ocTm').textContent='⏱ '+fmtTime(Math.max(0,o.ends-S.time));$('ocBar').style.width=Math.min(100,o.got/o.amt*100).toFixed(1)+'%';
    c.classList.toggle('late',o.ends-S.time<30);}}
}
let ordSig='';
function updateOrders(){
  if(curSheet!=='ord') return;
  ensureDailyDay(); if(dailyOpen()) makeDailyOffers();
  const O=ordNorm(), D=S.daily;
  const sig=ordTab+'|'+O.offers.map(x=>'o'+x.id).join(',')+'/'+O.acts.map(x=>'a'+x.id).join(',')+'|'+ordSlots()+'|'+O.done+'|'+O.failed+'|'+ordersOpen()+'|'+S.premium.lvl+'|'+(D?(D.offers.map(x=>x.id+':'+x.amt).join(',')+'/'+D.active.map(x=>x.id+':'+Math.floor(x.got)).join(',')+'/'+D.doneToday+'/'+D.streak+'/'+D.total):'')+'|'+dailyOpen();
  if(sig!==ordSig){ordSig=sig;
    let h=`<div class="seg" id="ordTabs" style="margin-bottom:8px"><button data-t="daily" class="${ordTab==='daily'?'on':''}">📅 Daily</button><button data-t="clients" class="${ordTab==='clients'?'on':''}">📋 Clients</button></div>`;
    if(ordTab==='daily'){
      const sm=streakMult(); const awaitN=(D.offers||[]).length;
      h+=`<div class="daily-hero"><div class="dh-ic">📅</div><div style="flex:1"><div class="dh-t">Daily Contracts${D.streak?` · 🔥 ${D.streak}-day streak`:''}</div>
        <div class="legend" style="margin:2px 0 0">${dailyOpen()?`Three contracts each local day, sized on what your lines make (until you accept, they follow your output). Accept up to <b>${DAILY_MAX_ACTIVE}</b> at once. Declining frees the slot (no replacement). ${streakLabel()}${sm>1?` · current bonus <b>×${sm.toFixed(2)}</b>`:''}`:'🔓 Unlocks once your <b>Sawmill</b> is running and you have earned ~🪙500.'}</div></div>
        <div class="dh-st"><b>${D.streak||0}</b><small>streak</small></div></div>`;
      if(!dailyOpen()) h+=`<div class="hint">Keep the sawmill humming — daily contracts open around 🪙500 earned.</div>`;
      else {
        for(const c of (D.active||[])){
          const r=RMAP[c.item];
          h+=`<div class="ord-card daily active-d" data-id="${c.id}"><div class="oc-h"><span class="oc-e">${c.e}</span><div class="oc-t"><small>${c.diffN.toUpperCase()} · IN PROGRESS</small><b>${fmt(c.amt)} × ${r.name}</b></div></div>
            <div class="bstatus"><div class="bar"><i style="width:${Math.min(100,c.got/c.amt*100).toFixed(1)}%"></i></div><span class="chip" id="dcChip${c.id}">${fmt(c.got)} / ${fmt(c.amt)} · ⏱ ${fmtTime(Math.max(0,c.ends-S.time))}</span></div>
            <div class="legend">Priority fill (≥65% of ${r.name} output) + Deliver from stock. Reward <b>🪙 ${fmt(c.reward)}</b>${bonusTxt(c)}</div>
            <div class="brow"><button class="btn wood" data-del="${c.id}" style="flex:1"></button></div></div>`;
        }
        for(const c of (D.offers||[])){
          const r=RMAP[c.item]; const full=D.active.length>=DAILY_MAX_ACTIVE;
          h+=`<div class="ord-card daily ${c.diff}" data-id="${c.id}"><div class="oc-h"><span class="oc-e">${c.e}</span><div class="oc-t"><small>${c.diffN.toUpperCase()} CONTRACT</small><b>${fmt(c.amt)} × ${r.name}</b></div></div>
            <div class="io" style="margin:8px 0"><div class="r">${svgIcon(r.svg,22)}<div>${fmt(c.amt)}<small>${r.name}</small></div></div><span class="arr">➜</span><div class="r">${svgIcon('coins',22)}<div>${fmt(c.reward)}<small>in ${fmtTime(c.dur)}${bonusTxt(c)}</small></div></div></div>
            <div class="brow"><button class="btn red" data-no="${c.id}">Decline</button><button class="btn gold" data-yes="${c.id}" style="flex:1" ${full?'disabled':''}>${full?`⏱ ${DAILY_MAX_ACTIVE} active max`:'✔ Accept'}</button></div></div>`;
        }
        if(!(D.offers||[]).length&&!(D.active||[]).length)
          h+=`<div class="hint">${D._made?"📋 No contracts left today — come back tomorrow.":"☎️ Preparing today's contracts: they are drawn up once a few product lines are running, so they match your output."}</div>`;
        h+=`<h4>📈 Today</h4><div class="kv"><div>Completed</div><div>${D.doneToday||0}</div><div>Timed out</div><div>${D.failedToday||0}</div><div>Lifetime</div><div>${D.total||0}</div><div>Best streak</div><div>${D.bestStreak||0}</div></div>`;
        if(D.hist&&D.hist.length) h+=`<div class="list" style="margin-top:7px">${D.hist.slice().reverse().map(x=>`<div class="hrow ${x.ok?'ok':'no'}"><span>${x.e}</span><span>${fmt(x.amt)} × ${resName(x.item)}<small>${x.diff||''}</small></span><b>${x.ok?'+🪙'+fmt(x.reward):'missed'}</b></div>`).join('')}</div>`;
      }
    } else {
      // Clients tab — v2.25: an order board (several clients wait, several orders run at once)
      const slots=ordSlots(), full=O.acts.length>=slots;
      h+=`<div class="ord-board"><span>📋 <b>${O.acts.length}/${slots}</b> in progress</span><span>☎️ <b>${O.offers.length}</b> waiting</span><small>${slots<3?(slots<2?'+1 slot with a Phase II line':'+1 slot with the Premium Area'):'3 of 3 slots unlocked'}</small></div>`;
      O.acts.forEach((o,i)=>{const r=RMAP[o.item];
        h+=`<div class="ord-card act${o.premium?' prem':''}" data-oid="${o.id}"><div class="oc-h"><span class="oc-e big">${o.e}</span><div class="oc-t"><small>${o.premium?'💎 Premium order':'Client order'} · in progress</small><b>${o.client}</b></div></div>
          <div class="io" style="margin:8px 0"><div class="r">${svgIcon(r.svg,22)}<div>${fmt(o.amt)}<small>${r.name}</small></div></div><span class="arr">➜</span><div class="r">${svgIcon('coins',22)}<div>${fmt(o.reward)}<small>reward${bonusTxt(o)}</small></div></div></div>
          <div class="bstatus"><div class="bar"><i id="opBar${o.id}"></i></div><span class="chip" id="opChip${o.id}"></span></div>
          <div class="legend" id="opTx${o.id}"></div>
          <div class="brow"><button class="btn wood" ${i===0?'id="opDel" ':''}data-odel="${o.id}" style="flex:1"></button></div></div>`;});
      O.offers.forEach((o,i)=>{const r=RMAP[o.item];
        h+=`<div class="ord-card offer${o.premium?' prem':''}" data-oid="${o.id}"><div class="oc-h"><span class="oc-e big">${o.e}</span><div class="oc-t"><small>${o.premium?'💎 Premium order':'Client order'} · offer</small><b>${o.client}</b></div></div>
          <div class="io" style="margin:8px 0"><div class="r">${svgIcon(r.svg,22)}<div>${fmt(o.amt)}<small>${r.name}</small></div></div><span class="arr">➜</span><div class="r">${svgIcon('coins',22)}<div>${fmt(o.reward)}<small>in ${fmtTime(o.dur)}${bonusTxt(o)}</small></div></div></div>
          <div class="bstatus"><div class="bar"><i id="opBar${o.id}"></i></div><span class="chip off" id="opChip${o.id}"></span></div>
          <div class="legend" id="opTx${o.id}"></div>
          <div class="brow"><button class="btn red" ${i===0?'id="opNo" ':''}data-ono="${o.id}">Decline</button><button class="btn gold" ${i===0?'id="opYes" ':''}data-oyes="${o.id}" style="flex:1" ${full?'disabled':''}>${full?`All ${slots} slots busy`:'✔ Accept order'}</button></div></div>`;});
      if(!O.offers.length&&!O.acts.length) h+=`<div class="hint" id="opNone"></div>`;
      h+=`<h4>📈 Order book</h4><div class="kv"><div>Completed</div><div>${O.done}</div><div>Missed</div><div>${O.failed}</div></div>`;
      if(O.hist.length) h+=`<div class="list" style="margin-top:7px">${O.hist.slice().reverse().map(x=>`<div class="hrow ${x.ok?'ok':'no'}"><span>${x.e}</span><span>${fmt(x.amt)} × ${resName(x.item)}<small>${x.client}</small></span><b>${x.ok?'+🪙'+fmt(x.reward):'missed'}</b></div>`).join('')}</div>`;
      h+=`<button class="btn wood big" id="opPrem" style="margin-top:10px">🏛️ Premium Factory Area${S.premium.lvl?` · Lv ${S.premium.lvl}`:''}</button>`;
      h+=`<div class="legend">Clients call every minute or so and wait on the board (up to ${ordBoardMax()}). Run up to <b>${slots}</b> order${slots>1?'s':''} at once (more slots with Phase II goods and the Premium Area). Amounts follow what your lines make, and rewards are about 1.5–2.5× the goods' value. Accepted orders are priority contracts: they take the surplus plus at least 70% of the item's output until they're filled, or deliver straight from storage.</div>`;
    }
    $('ordBody').innerHTML=h;
    document.querySelectorAll('#ordTabs button').forEach(b=>b.onclick=()=>{ordTab=b.dataset.t;ordSig='';updateOrders();});
    if(ordTab==='clients'){
      document.querySelectorAll('[data-oyes]').forEach(b=>b.onclick=()=>acceptOrder(+b.dataset.oyes));
      document.querySelectorAll('[data-ono]').forEach(b=>b.onclick=()=>declineOrder(+b.dataset.ono));
      document.querySelectorAll('[data-odel]').forEach(b=>b.onclick=()=>{const n=deliverFromStock(+b.dataset.odel); if(n>0){const rc=b.getBoundingClientRect();floatText(rc.left+rc.width/2,rc.top-4,'+'+fmt(n),$('fxLayer'));}});
      if($('opPrem')) $('opPrem').onclick=()=>openSheet('prem');
    } else {
      document.querySelectorAll('[data-yes]').forEach(b=>b.onclick=()=>acceptDaily(+b.dataset.yes));
      document.querySelectorAll('[data-no]').forEach(b=>b.onclick=()=>declineDaily(+b.dataset.no));
      document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const id=+b.dataset.del;const n=deliverDaily(id); if(n>0){const rc=b.getBoundingClientRect();floatText(rc.left+rc.width/2,rc.top-4,'+'+fmt(n),$('fxLayer'));}});
    }
  }
  // live progress updates
  if(ordTab==='clients'){
    for(const o of O.offers){const bar=$('opBar'+o.id),chip=$('opChip'+o.id),tx=$('opTx'+o.id);if(!bar) continue;
      bar.style.width=Math.max(0,(o.expires-S.time)/ORDER_OFFER_SEC*100)+'%';chip.textContent='Offer ends in '+fmtTime(Math.max(0,o.expires-S.time));
      const t=`You'll have <b>${fmtTime(o.dur)}</b> to deliver. You make about <b>${fr(prodRate(o.item))}/s</b> ${resName(o.item)} right now.`;if(tx._t!==t){tx.innerHTML=t;tx._t=t;}}
    for(const o of O.acts){const bar=$('opBar'+o.id),chip=$('opChip'+o.id),tx=$('opTx'+o.id);if(!bar) continue;
      bar.style.width=Math.min(100,o.got/o.amt*100)+'%';const left=o.ends-S.time;chip.className='chip'+(left<30?' bad':'');chip.textContent=`${fmt(o.got)} / ${fmt(o.amt)} · ⏱ ${fmtTime(Math.max(0,left))}`;
      const t=`Collecting ${resName(o.item)} off the line (≈${fr(prodRate(o.item))}/s produced, ≥70% goes to this order). In storage: <b>${fmt(S.res[o.item])}</b>.`;if(tx._t!==t){tx.innerHTML=t;tx._t=t;}
      const d=document.querySelector(`[data-odel="${o.id}"]`),n=Math.min(S.res[o.item],o.amt-o.got);const dh=`📦 Deliver from storage (${fmt(n)})`;if(d&&d._h!==dh){d.innerHTML=dh;d._h=dh;}if(d) d.disabled=n<1;}
    const e=$('opNone');if(e){const t=ordersOpen()?`☎️ No client on the line. Next call in about <b>${fmtTime(Math.max(0,O.next-S.time))}</b>.`:'📋 Clients start calling once your <b>Sawmill</b> is running.';if(e._t!==t){e.innerHTML=t;e._t=t;}}}
  if(ordTab==='daily'&&D&&D.active){for(const c of D.active){const chip=$('dcChip'+c.id);if(chip) chip.textContent=`${fmt(c.got)} / ${fmt(c.amt)} · ⏱ ${fmtTime(Math.max(0,c.ends-S.time))}`;
      const btn=document.querySelector(`[data-del="${c.id}"]`); if(btn){const n=Math.min(S.res[c.item],c.amt-c.got);const dh=`📦 Deliver from storage (${fmt(n)})`;if(btn._h!==dh){btn.innerHTML=dh;btn._h=dh;}btn.disabled=n<1;}}}
}

let premSig='';
function updatePrem(){
  if(curSheet!=='prem') return; const l=S.premium.lvl;
  const sig=l+'|'+premVisible()+'|'+PREM_BLD.map(b=>S.buildings[b.id].lvl>0?1:0).join('');
  if(sig!==premSig){premSig=sig;
    let h=`<div class="prem-hero"><div class="ph-ic">${UI_ICONS.prem}</div><div style="flex:1"><div class="ph-t">${l?`Premium Area · Showroom Lv ${l}`:'Premium Factory Area'}</div>
      <div class="legend" style="margin:2px 0 0">${l?`Premium goods sell for <b>+${Math.round(PREM_LVL_BONUS*(l-1)*100)}%</b>. Goods arrive from the main factory on the overhead conveyor.`:'A fenced luxury compound next to the factory: walnut workshops with gold trim, a glass showroom and its own loading dock. It turns your main products into luxury goods.'}</div></div></div>
      <button class="btn gold big" id="pmBuy"></button><div class="pbar"><i id="pmPbar"></i></div>`;
    if(l){h+=`<h4>Luxury workshops</h4><div class="list">`+PREM_BLD.map(b=>`<div class="card prem-card" data-id="${b.id}"><div class="ic">${svgIcon(b.svg,32)}</div><div><div class="nm">${b.name}<span class="cnt"></span></div><div class="ds">${recipeStr(b)}</div></div><button class="btn buy small"></button></div>`).join('')+`</div>`;}
    h+=`<div class="legend">${l?'Tap a workshop in the world (or here) to build, level it and upgrade its storage.':'Unlocks mid-game. Premium goods also feature in bigger client orders.'}</div>`;
    $('premBody').innerHTML=h; $('pmBuy').onclick=()=>{if(buyPremium()){premSig='';render();focusPrem();}};
    document.querySelectorAll('.prem-card').forEach(d=>{d.querySelector('button').onclick=()=>openSheet('bld',d.dataset.id);});
  }
  const c=premCost(),b=$('pmBuy');const bh=l>=PREM_MAX?'Showroom at max level':costBtnHtml(l?`⬆ Showroom Lv ${l+1} (+${Math.round(PREM_LVL_BONUS*100)}% premium prices)`:'🏛️ Open the Premium Area',c);
  if(b._h!==bh){b.innerHTML=bh;b._h=bh;} b.disabled=l>=PREM_MAX||S.coins+1e-9<c; $('pmPbar').style.width=Math.min(100,S.coins/c*100).toFixed(0)+'%';
  document.querySelectorAll('.prem-card').forEach(d=>{const id=d.dataset.id,st=S.buildings[id],bb=BMAP[id];d.querySelector('.cnt').textContent=st.lvl?' Lv '+st.lvl:'';const bt=d.querySelector('button');
    const t=st.lvl?'Open':costBtnHtml('🔨 Build',bulkCost(bb.cost,bb.scale,0,1)); if(bt._h!==t){bt.innerHTML=t;bt._h=t;}});
}
function updateStorageBlock(b){
  const el=$('bpStor'); if(!el) return; const st=S.buildings[b.id]; el.classList.toggle('hidden',!st.lvl||!Object.keys(b.out).length); if(!st.lvl||!Object.keys(b.out).length) return;
  const l=stoLvl(b.id), outs=Object.keys(b.out), k=outs[0], caps=stockCaps(), cap=caps[k], have=S.res[k], fr0=cap<Infinity?Math.min(1,have/cap):0, full=!!(bstat[b.id]&&bstat[b.id].full);
  $('bpStLv').textContent='Lv '+l; const ch=$('bpStChip'); ch.className='chip'+(full?' bad':fr0>.8?' off':''); ch.textContent=full?'⛔ FULL — production paused':`${fmt(have)} / ${fmt(cap)} ${RMAP[k].name}`;
  $('bpStBi').style.width=(fr0*100).toFixed(1)+'%'; $('bpStBar').className='bar'+(full?' bad':fr0>.8?' warn':'');
  const as=!!S.autosell[k]; const tx=`Holds <b>${fmtTime(stoSec(l))}</b> of output · +${Math.round(STO_SPEED*100*l)}% loading speed. ${as?`Auto-sell is <b>on</b>, so surplus ships out and the stockpile stays low.`:`Auto-sell is <b>off</b>: stock builds up for orders. When it's full the building pauses.`}`;
  const te=$('bpStTx'); if(te._t!==tx){te.innerHTML=tx;te._t=tx;}
  const kb=$('bpStKeep'); kb.checked=!as; $('bpStKeepL').textContent='Keep stock';
  const sb=$('bpStBuy'); const c=stoCost(b.id); const sh=l>=STO_MAX?'Max storage':costBtnHtml(`📦 Bigger stockpile → Lv ${l+1}`,c); if(sb._h!==sh){sb.innerHTML=sh;sb._h=sh;} sb.disabled=l>=STO_MAX||S.coins+1e-9<c;
}
function setupPremiumUI(){
  $('bpStBuy').onclick=()=>{if(sheetBld){buyStorage(sheetBld);render();}};
  $('bpStKeep').onchange=()=>{if(!sheetBld) return; const b=BMAP[sheetBld]; for(const k in b.out) S.autosell[k]=!$('bpStKeep').checked; mktSig=''; render();};
}
