'use strict';
/* ===================== v2.26 BAD-LUCK EVENTS ("setbacks") =====================
   Now and then something goes wrong: a storm wrecks stock, the Log Yard floods, thieves raid a store, a machine breaks down,
   lightning starts a fire, the tax office audits you or the market crashes. Rules that keep it fair:
   - online play only (never while away), never in the first 15 min of a game or the first 5 min of a run;
   - one roll every 8–15 min of play, at most one breakdown at a time;
   - every loss is capped by a small share of the stock / coins AND by a few seconds of this run's income;
   - counter-play: Insurance (kept through Replant), the Fire Station, workstations + engineers (breakdowns), Repair now. */
const MISH_GAP=[480,900], MISH_GRACE_GAME=900, MISH_GRACE_RUN=300, MISH_LOG_MAX=20;
const INS_MAX=3, INS_COST=1.5e5, INS_SCALE=10, INS_CUT=.25;
const MISH_DEF={
  gale:{n:'Storm damage',e:'⛈️',w:1,cap:'one building runs at half speed for 1–1.5 min and loses up to 8 % of its stored goods (at most 1 min of income)',vs:'Repair now; insurance; the Fire Station cuts the odds'},
  flood:{n:'Log Yard flood',e:'🌊',w:.8,cap:'up to 10 % of the yard\'s logs (always leaves 30 s of mill use) + muddy roads for 40 s',vs:'Insurance; the Fire Station cuts the odds'},
  theft:{n:'Night theft',e:'🦝',w:.8,cap:'up to 6 % of the yard\'s logs (always leaves 30 s of mill use) and 5 % of one stored good (at most 45 s of income)',vs:'Insurance; a night guard from Insurance Lv 2'},
  breakdown:{n:'Machine breakdown',e:'⚙️',w:1.2,cap:'one building pauses for 1–1.7 min',vs:'Repair now; workstations and engineers cut odds and repair time'},
  lightning:{n:'Lightning strike',e:'⚡',w:.5,cap:'starts a fire (summer or rain only)',vs:'Tap the flames / the Fire Station; it also cuts the odds'},
  audit:{n:'Tax audit',e:'🧾',w:.6,cap:'up to 2 % of your coins, at most 90 s of income',vs:'Insurance'},
  crash:{n:'Market crash',e:'📉',w:.6,cap:'sale prices −30 % for 60 s',vs:'Insurance softens the drop'},
};
function mishFresh(){return {next:0,ins:0,broke:{},log:[],stats:{n:0,dodged:0,lost:0,repairs:0}};}
function mishState(){if(!S.mish||typeof S.mish!=='object') S.mish=mishFresh();const m=S.mish;
  if(!m.broke||typeof m.broke!=='object') m.broke={}; if(!Array.isArray(m.log)) m.log=[]; if(!m.stats||typeof m.stats!=='object') m.stats={n:0,dodged:0,lost:0,repairs:0};
  if(!(m.ins>=0)) m.ins=0; m.ins=Math.min(INS_MAX,Math.floor(m.ins)); if(!isFinite(m.next)) m.next=0; return m;}
function insLvl(){return (S.mish&&S.mish.ins)||0;}
function insCost(l){l=l===undefined?insLvl():l;return INS_COST*Math.pow(INS_SCALE,l);}
function insCut(){return INS_CUT*insLvl();}                         // share of every loss the insurer pays back
function mishInc(){const r=typeof staffIncRef==='function'?staffIncRef():0;return Math.max(coinRate||0,r*.5,2*cs());}   // income reference (coins/s)
function mishGrace(){return Math.max(0,MISH_GRACE_GAME-(S.playTime||0),MISH_GRACE_RUN-(S.time||0));}
function mishBuilt(){let n=0;for(const b of MAIN_BLD) if(S.buildings[b.id].lvl) n++;return n;}
function mishActive(){return mishBuilt()>=3;}
function mishBroken(bid){return !!(S.mish&&S.mish.broke&&S.mish.broke[bid]);}
function mishPaused(bid){const b=S.mish&&S.mish.broke&&S.mish.broke[bid];return !!(b&&!b.slow);}            // breakdown: no output
function mishSpd(bid){const b=S.mish&&S.mish.broke&&S.mish.broke[bid];return b&&b.slow?b.slow:1;}          // storm-damaged roof: half speed
function mishStationDodge(){return Math.min(.5,.1*stationLvl());}
/* breakdown modifiers for one building: workstations (−3 %/level, down to ×0.4) × assigned engineers (same cut as fire) */
function mishBldMult(bid){let ws=0;if(typeof wsHas==='function'&&wsHas(bid)) for(let k=0;k<3;k++) ws+=wsLvl(bid,k);
  let f=Math.max(.4,1-.03*ws);if(typeof staffEngFire==='function') f*=staffEngFire(bid);return f;}
function mishRepairCost(bid){const b=mishState().broke[bid];if(!b) return 0;return Math.max(25*cs(),20*mishInc()*Math.max(.15,b.left/b.dur)*(b.slow?.5:1));}
function mishGoods(){return RES.filter(r=>r.id!=='logs'&&canSell(r.id)&&S.res[r.id]>1&&price(r.id)>0).map(r=>[r.id,S.res[r.id]*price(r.id)]);}
/* weight of each setback right now: season / weather / night shift the odds */
function mishWeights(){
  const w={},sid=S.wx?season().id:'spring',wx=S.wx?weatherId():'clear',night=S.wx?isNight():false;
  const busy=Object.keys(mishState().broke).length>0;   // one damaged building at a time
  w.gale=MISH_DEF.gale.w*((wx==='wind'||wx==='rain'||wx==='snow')?2.5:1)*((sid==='autumn'||sid==='winter')?1.5:1)*(!busy&&mishBdCands().length>=2?1:0);
  w.flood=MISH_DEF.flood.w*(wx==='rain'?3:wx==='snow'?.5:1)*(sid==='spring'?1.6:1)*(S.res.logs>200?1:0);
  w.theft=MISH_DEF.theft.w*(night?2.5:.4)*(mishGoods().length||S.res.logs>200?1:0);
  const can=mishBdCands();w.breakdown=MISH_DEF.breakdown.w*(sid==='winter'?1.3:1)*(can.length>=2&&!busy?1:0);
  w.lightning=MISH_DEF.lightning.w*((sid==='summer'||wx==='rain')?1:0)*(Object.keys(S.fires||{}).length||(S.fireCool||0)>S.time?0:1)*(MAIN_BLD.some(b=>FIRE_RISK[b.id]&&S.buildings[b.id].lvl)?1:0);
  w.audit=MISH_DEF.audit.w*(S.coins>10*mishInc()?1:0);
  w.crash=MISH_DEF.crash.w*(S.events.some(e=>e.id==='crash')?0:1);
  return w;}
function mishBdCands(){return BUILDINGS.filter(b=>{const st=S.buildings[b.id];return st.lvl&&st.on&&!onFire(b.id)&&bldUnlocked(b.id)&&(!b.premium||S.premium.lvl);});}
function mishPick(w){let t=0;for(const k in w) t+=w[k];if(t<=0) return null;let r=Math.random()*t;for(const k in w){if(r<w[k]) return k;r-=w[k];}return null;}
function mishDodge(id){if(id==='gale'||id==='flood'||id==='lightning') return [mishStationDodge(),'🚒 Fire Station crews'];
  if(id==='theft'&&insLvl()>=2) return [.5,'🔦 The night guard'];return [0,''];}
function mishLog(id,txt,v,dodged){const m=mishState();m.log.unshift({at:Date.now(),run:S.prestiges||0,id,txt,v:v||0,d:!!dodged});if(m.log.length>MISH_LOG_MAX) m.log.length=MISH_LOG_MAX;
  if(dodged) m.stats.dodged++; else {m.stats.n++;m.stats.lost+=v||0;}}
/* take a share of one good: pct of the stock, at most capV coins of value (0 = no value cap); insurance pays part back */
function mishTake(k,pct,capV){const have=S.res[k];if(!(have>0)) return {n:0,v:0,back:0};let n=have*pct;const p=canSell(k)?price(k):0;
  if(capV>0&&p>0) n=Math.min(n,capV/p);n=Math.max(0,Math.min(n,have));S.res[k]-=n;const v=n*p,back=v*insCut();if(back>0) earn(back);return {n,v:v-back,back};}
const R_=(a,b)=>a+Math.random()*(b-a);
function mishApply(id){
  const d=MISH_DEF[id],inc=mishInc();let txt='',v=0,at=null;
  if(id==='gale'){const b=mishPickBld();const dur=Math.round(R_(60,90)*Math.max(.5,mishBldMult(b.id)));mishState().broke[b.id]={left:dur,dur,slow:.5};at=b.id;
    const ks=Object.keys(b.out).filter(k=>canSell(k)&&S.res[k]>1);let lost='';for(const k of ks){const r=mishTake(k,R_(.04,.08),60*inc/ks.length);v+=r.v;if(r.n>=1) lost+=` ${fmt(r.n)} ${RMAP[k].icon}`;}
    txt=`Wind ripped the roof of the ${b.name}: half speed for ${fmtTime(dur)}${lost?`, and the rain spoiled${lost}`:''}${insLvl()&&v>0?' (insurance paid part)':''}.`;}
  else if(id==='flood'){const use=typeof pwLogUse==='function'?pwLogUse():0,keep=30*use;let n=Math.min(S.res.logs*R_(.05,.1),Math.max(0,S.res.logs-keep));n*=1-insCut();S.res.logs-=n;at='yard';
    S.events=S.events.filter(e=>e.id!=='mud');S.events.push({id:'mud',ends:S.time+40});
    txt=n>=1?`Water swept ${fmt(n)} 🪵 logs out of the Log Yard and the roads are muddy (collectors −20 % for 40 s).${insLvl()?' Insurance covered part of it.':''}`
      :'The Log Yard flooded. The stacks your mills need were saved, but the roads are muddy (collectors −20 % for 40 s).';}
  else if(id==='theft'){const use=typeof pwLogUse==='function'?pwLogUse():0;let nl=Math.min(S.res.logs*R_(.03,.06),Math.max(0,S.res.logs-30*use))*(1-insCut());S.res.logs-=Math.max(0,nl);at='yard';
    const G=mishGoods();let gq='';if(G.length){let t=0;for(const g of G) t+=g[1];let r=Math.random()*t,k=G[0][0];for(const g of G){if(r<g[1]){k=g[0];break;}r-=g[1];}
      const q=mishTake(k,R_(.03,.05),45*inc);v=q.v;if(q.n>=1) gq=`${fmt(q.n)} ${RMAP[k].icon}`;}
    txt=`Thieves raided the yard${isNight()?' overnight':''}: ${[nl>=1?fmt(nl)+' 🪵':'',gq].filter(x=>x).join(' and ')||'they were spotted and ran off with almost nothing'} gone${insLvl()?' (insurance paid part)':''}.`;}
  else if(id==='breakdown'){const b=mishPickBld();
    const dur=Math.round(R_(60,100)*Math.max(.5,mishBldMult(b.id)));mishState().broke[b.id]={left:dur,dur};at=b.id;
    txt=`The ${b.name} broke down: repairs take ${fmtTime(dur)}. Pay to repair it now, or wait.`;}
  else if(id==='lightning'){const C=MAIN_BLD.filter(b=>FIRE_RISK[b.id]&&S.buildings[b.id].lvl&&!onFire(b.id));const b=C[Math.floor(Math.random()*C.length)];
    if(!b||!startFire(b.id)) return false;at=b.id;txt=`Lightning hit the ${b.name} and set it on fire! Tap the flames${stationLvl()?' (the fire brigade is coming)':''}.`;}
  else if(id==='audit'){let n=Math.min(S.coins*.02,90*inc);const back=n*insCut();n-=back;S.coins-=n;v=n;at='coins';
    txt=`The tax office found a missing receipt: fine 🪙${fmt(n)}${back>0?` (insurance covered 🪙${fmt(back)})`:''}.`;}
  else if(id==='crash'){S.events.push({id:'crash',ends:S.time+60});at='dock';txt=`Buyers panicked: sale prices −${Math.round((1-mishCrashMult())*100)} % for 60 s.`;}
  M=computeMods();
  mishLog(id,txt,v,false);
  mishFx(id,at,v);
  if(typeof toast==='function') toast(`${d.e} <b>${d.n}!</b> ${txt}`,6000,'bad-toast');
  return true;}
function mishPickBld(){const C=mishBdCands();let t=0;const W=C.map(b=>{const x=Math.sqrt(S.buildings[b.id].lvl)*mishBldMult(b.id);t+=x;return x;});let r=Math.random()*t;
  for(let i=0;i<C.length;i++){if(r<W[i]) return C[i];r-=W[i];}return C[C.length-1];}
function mishSrcOf(k){const b=BUILDINGS.find(x=>x.out[k]&&S.buildings[x.id].lvl);return b?b.id:'dock';}
function mishCrashMult(){return 1-.3*(1-insCut());}
/* online roll; offline play skips setbacks entirely */
function mishTick(dt,offline){
  const m=mishState();
  for(const bid in m.broke){const b=m.broke[bid];b.left-=dt;if(b.left<=0||!S.buildings[bid]||!S.buildings[bid].lvl){delete m.broke[bid];
    if(!offline&&typeof toast==='function'&&S.buildings[bid]) toast(`🔧 The ${BMAP[bid].name} is repaired and running at full speed again.`,3200);if(offline&&offlineAcc) offlineAcc.fixed=(offlineAcc.fixed||0)+1;}}
  if(offline){if(m.next>0&&m.next<S.time+120) m.next=S.time+R_(120,MISH_GAP[0]);return;}   // never right on your return
  if(!mishActive()||mishGrace()>0) return;
  if(!(m.next>0)){m.next=S.time+R_(MISH_GAP[0],MISH_GAP[1]);return;}
  if(S.time<m.next) return;
  m.next=S.time+R_(MISH_GAP[0],MISH_GAP[1]);
  mishRoll();}
function mishRoll(force){
  const id=force||mishPick(mishWeights());if(!id) return null;
  const [dp,who]=force?[0,'']:mishDodge(id);
  if(dp>0&&Math.random()<dp){mishLog(id,`${who} stopped a ${MISH_DEF[id].n.toLowerCase()}.`,0,true);
    if(typeof toast==='function') toast(`🛡️ <b>${MISH_DEF[id].n} avoided!</b> ${who} stopped it.`,3600);return id+':dodged';}
  return mishApply(id)?id:null;}
function mishRepair(bid){const m=mishState();if(!m.broke[bid]) return false;const c=mishRepairCost(bid);if(S.coins+1e-9<c) return false;
  S.coins-=c;delete m.broke[bid];m.stats.repairs++;M=computeMods();if(typeof sfx==='function') sfx('buy');
  if(typeof toast==='function') toast(`🔧 <b>${BMAP[bid].name} repaired</b> for 🪙${fmt(c)}. Back to work!`,3200);
  if(typeof scene!=='undefined'&&scene.ctx&&typeof buildPoof==='function') buildPoof(bid);mishSig='';return true;}
function buyInsurance(){const m=mishState();if(m.ins>=INS_MAX) return false;const c=insCost();if(S.coins+1e-9<c) return false;
  S.coins-=c;m.ins++;M=computeMods();if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🛡️ <b>Insurance Lv ${m.ins}</b>: losses −${Math.round(insCut()*100)} %${m.ins>=2?' · night guard on duty':''}`,3800,'ms-toast');mishSig='';return true;}
function mishKeep(){const m=mishState();return {next:0,ins:m.ins,broke:{},log:m.log.slice(0,MISH_LOG_MAX),stats:Object.assign({},m.stats)};}
// timed effects ride on the existing event bar (never rolled by the random good-event pool)
EVENTS.push({id:'crash',name:'📉 Market crash',desc:'Sale prices down',dur:60,bad:true,req:()=>false,apply:m=>{m.priceAll*=mishCrashMult();}});
EVENTS.push({id:'mud',name:'🌊 Muddy roads',desc:'Collectors −20%',dur:40,bad:true,req:()=>false,apply:m=>{m.colAll*=.8;}});
for(const e of EVENTS) EMAP[e.id]=e;

/* ---------- scene: floating loss tags, breakdown smoke + repair tag ---------- */
function mishAnchor(at){if(typeof scene==='undefined') return null;const L=at==='yard'?YARD:at==='dock'?DOCK:LOTS[at];return L&&L.top?L.top:null;}
function mishFx(id,at,v){
  if(typeof scene==='undefined'||!scene.ctx) return;
  (scene.mishFx=scene.mishFx||[]).push({id,at,v,t:0});
  document.body.classList.remove('mish-hit');void document.body.offsetWidth;document.body.classList.add('mish-hit');setTimeout(()=>document.body.classList.remove('mish-hit'),900);
  const a=mishAnchor(at);if(a){for(let k=0;k<18;k++) emitP(a[0]+(Math.random()-.5)*70,a[1]+20+(Math.random()-.5)*30,id==='flood'?'poof':id==='breakdown'?'spark':'chip');}
  if(at==='coins'&&typeof floatText==='function'){const c=$('hCoins');if(c){const r=c.getBoundingClientRect();floatText(r.left+r.width/2,r.bottom+8,'−🪙'+fmt(v),$('fxLayer'));}}}
function mishOverlays(ctx){
  const m=S.mish;if(!m) return;scene.mishFx=(scene.mishFx||[]).filter(f=>(f.t+=scene.dtF||.016)<3.2);
  for(const f of scene.mishFx){const a=mishAnchor(f.at);if(!a) continue;const [sx,sy]=w2s(a[0],a[1]-24);const k=f.t/3.2;ctx.globalAlpha=Math.max(0,1-k*k);
    pill(ctx,sx,sy-k*36,`${MISH_DEF[f.id].e} ${MISH_DEF[f.id].n}${f.v>0?' −🪙'+fmt(f.v):''}`,{bg:'#b3261e',fg:'#fff',fs:12.5,stroke:'#ffd0c0',padX:12,padY:7});ctx.globalAlpha=1;}
  for(const bid in m.broke){const L=LOTS[bid];if(!L||!L.top||(L.prem&&!S.premium.lvl)) continue;const b=m.broke[bid];
    if(Math.random()<(scene.dtF||.016)*4){const p=P(L.ci,L.cj,30);emitSmoke(p[0],p[1],'grey');}
    const [sx,sy]=w2s(L.top[0],L.top[1]-26);if(sx<-60||sx>scene.w+60||sy<-40||sy>scene.h+40) continue;const bob=Math.sin(scene.t*5)*2;
    pill(ctx,sx,sy+bob,`${b.slow?'⛈️ Damaged':'🔧 Broken'} · ${Math.ceil(b.left)}s`,{bg:'#5a4a3a',fg:'#fff',fs:12,stroke:'#f5c84c',padX:11,padY:7});
    pill(ctx,sx,sy+bob+22,'Tap to repair',{fs:10,bg:'rgba(43,27,14,.75)'});}}
function mishTapAt(sx,sy){const m=S.mish;if(!m) return false;
  for(const bid in m.broke){const L=LOTS[bid];if(!L||!L.top) continue;const [tx,ty]=w2s(L.top[0],L.top[1]-26);
    if(Math.abs(sx-tx)<70&&sy>ty-22&&sy<ty+34){openSheet('bld',bid);if(typeof haptic==='function') haptic(6);return true;}}
  return false;}

/* ---------- building sheet: repair panel ---------- */
function mishBldPanel(b){let el=$('bpRepair');if(!el){el=document.createElement('div');el.id='bpRepair';el.className='bp-repair hidden';$('bpBuy').parentElement.after(el);}   // below the buy row: never shifts the buttons under a finger
  const br=S.mish&&S.mish.broke[b.id];let h='';
  if(br){const cut=mishBldMult(b.id)<1?` (workstations/engineers: −${Math.round((1-Math.max(.5,mishBldMult(b.id)))*100)} % repair time)`:'';
    h=`<div>${br.slow?'⛈️ <b>Storm damage</b>: half speed':'🔧 <b>Broken down</b>'} · ${br.slow?'fixed':'back'} on its own in <b class="rp-left"></b>${cut}</div><button class="btn gold" id="bpRepairGo"></button>`;}
  if(el._h!==h){el.innerHTML=h;el._h=h;el.classList.toggle('hidden',!h);const g=$('bpRepairGo');if(g) g.onclick=()=>{if(mishRepair(b.id)){bpSig='';render();}};}
  if(br){const c=mishRepairCost(b.id),g=$('bpRepairGo'),bh=costBtnHtml('🔧 Repair now',c);if(g._h!==bh){g.innerHTML=bh;g._h=bh;}g.disabled=S.coins+1e-9<c;
    const lt=el.querySelector('.rp-left');if(lt) lt.textContent=Math.ceil(br.left)+'s';}}

/* ---------- Safety sheet ---------- */
SHEETS.risk={title:'Safety & Insurance',icon:'risk'};
UI_ICONS.risk=`<svg viewBox="0 0 32 32"><path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#5f9fd8" stroke="#24507a" stroke-width="1.5"/><path d="M16 6 L24 9 V15 C24 20.5 20.5 24.4 16 26 Z" fill="#8cc0ea"/><path d="M11 16 l3.5 3.5 L21.5 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let mishSig='';
function mishVisible(){return mishActive()||insLvl()>0||(S.mish&&S.mish.log&&S.mish.log.length>0);}
function mishAgo(at){const s=Math.max(0,(Date.now()-at)/1000);return s<60?'just now':fmtTime(s)+' ago';}
function updateRisk(){
  const bb=$('bbRisk');if(bb){const v=mishVisible();if(bb._v!==v){bb._v=v;bb.classList.toggle('hidden',!v);}}
  const dot=$('riskDot');if(dot) dot.classList.toggle('hidden',curSheet==='risk'||!Object.keys((S.mish&&S.mish.broke)||{}).length);
  if(curSheet!=='risk') return;
  const m=mishState(),l=m.ins,gr=mishGrace();
  const sig=l+'|'+Object.keys(m.broke).join()+'|'+m.log.length+'|'+(m.log[0]&&m.log[0].at)+'|'+(gr>0)+'|'+(S.wx?season().id+weatherId()+isNight():'')+'|'+stationLvl()+'|'+mishActive();
  if(sig!==mishSig){mishSig=sig;
    const w=mishWeights();let wt=0;for(const k in w) wt+=w[k];
    let h=`<div class="pw-hero risk-hero"><div class="ph-ic">${UI_ICONS.risk}</div><div style="flex:1"><div class="ph-t">Bad luck happens</div>
      <div class="legend" style="margin:2px 0 0">About one setback every <b>8–15 min</b> of play. Never while you're away, never in the first 15 min of a game or the first 5 min after a Replant. Every loss is capped small.</div></div></div>`;
    h+=`<div class="risk-now">${!mishActive()?'🌱 Calm: setbacks start once you run 3 buildings.':gr>0?`🍀 <b>Grace period</b>: no setbacks for another ${fmtTime(gr)}.`:`🎲 Next setback possible in about <b>${fmtTime(Math.max(0,(m.next||S.time)-S.time))}</b>.`}</div>`;
    const bl=Object.keys(m.broke);
    if(bl.length) h+=`<h4>🔧 Repairs</h4><div class="risk-list">${bl.map(bid=>`<div class="risk-row bad"><span>${m.broke[bid].slow?'⛈️':'⚙️'} <b>${BMAP[bid].name}</b> ${m.broke[bid].slow?'storm-damaged (half speed)':'broken down'} · <span data-left="${bid}"></span></span><button class="btn gold small" data-repair="${bid}"></button></div>`).join('')}</div>`;
    h+=`<h4>🛡️ Insurance</h4><div class="risk-ins"><div><b>${l?`Insurance · Lv ${l}${l>=INS_MAX?' ★':''}`:'No insurance yet'}</b><div class="legend" style="margin:2px 0 0">${l?`Pays back <b>${Math.round(insCut()*100)} %</b> of storm, flood, theft and tax losses, crashes hit ${Math.round((1-mishCrashMult())*100)} % instead of 30 %${l>=2?' · 🔦 night guard stops half of all thefts':''}.`:'Each level pays back 25 % of storm, flood, theft and tax losses and softens market crashes. Lv 2 adds a night guard. Kept through Replant.'}</div></div>
      <button class="btn gold big" id="insBuy"></button></div>`;
    h+=`<h4>🎲 What can happen</h4><div class="risk-list">${Object.entries(MISH_DEF).map(([k,d])=>{const p=wt>0?w[k]/wt:0;return `<div class="risk-row"><span class="rk-e">${d.e}</span><span class="rk-b"><b>${d.n}</b> <small class="rk-p">${p>0?Math.round(p*100)+' % of setbacks now':'not now'}</small><br><small>Loss: ${d.cap}.</small><br><small class="rk-vs">🛡️ ${d.vs}</small></span></div>`;}).join('')}</div>`;
    const mods=[];if(S.wx){const sid=season().id,wx=weatherId();if(wx==='rain') mods.push('🌧️ Rain: floods ×3, storms ×2.5, lightning possible');if(wx==='wind') mods.push('💨 Wind: storms ×2.5');if(wx==='snow') mods.push('🌨️ Snow: storms ×2.5');
      if(sid==='spring') mods.push('🌸 Spring melt: floods ×1.6');if(sid==='summer') mods.push('🌻 Summer: thunderstorms, lightning possible');if(sid==='autumn'||sid==='winter') mods.push((sid==='autumn'?'🍂':'❄️')+' '+season().n+': storms ×1.5');if(sid==='winter') mods.push('❄️ Cold machines: breakdowns ×1.3');
      mods.push(isNight()?'🌙 Night: thefts ×2.5':'☀️ Daytime: thefts rare');}
    if(stationLvl()) mods.push(`🚒 Fire Station Lv ${stationLvl()}: stops ${Math.round(mishStationDodge()*100)} % of storms, floods and lightning`);
    h+=`<div class="legend risk-mods">${mods.join(' · ')}</div>`;
    h+=`<h4>📜 What happened <small>(${m.stats.n} setbacks · ${m.stats.dodged} stopped · ${m.stats.repairs} quick repairs · 🪙${fmt(m.stats.lost)} lost)</small></h4>`;
    h+=m.log.length?`<div class="risk-log">${m.log.map(x=>`<div class="${x.d?'ok':''}"><span>${(MISH_DEF[x.id]||{e:'•'}).e}</span><span>${x.d?'🛡️ ':''}${x.txt}</span><small>${mishAgo(x.at)}${x.run!==(S.prestiges||0)?' · earlier run':''}</small></div>`).join('')}</div>`:`<div class="legend">Nothing has gone wrong yet. Touch wood!</div>`;
    $('riskBody').innerHTML=h;
    $('insBuy').onclick=()=>{if(buyInsurance()){mishSig='';render();}};
    $('riskBody').querySelectorAll('[data-repair]').forEach(b=>b.onclick=()=>{if(mishRepair(b.dataset.repair)){mishSig='';render();}});
  }
  const b=$('insBuy'),c=insCost();if(b){const bh=l>=INS_MAX?'Insurance at max level':costBtnHtml(l?`⬆ Insurance Lv ${l+1} (−${Math.round(INS_CUT*(l+1)*100)} % losses)`:'🛡️ Take out insurance (−25 % losses)',c);
    if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=l>=INS_MAX||S.coins+1e-9<c;}
  $('riskBody').querySelectorAll('[data-repair]').forEach(x=>{const id=x.dataset.repair,c2=mishRepairCost(id),hh=costBtnHtml('🔧 Repair now',c2);if(x._h!==hh){x.innerHTML=hh;x._h=hh;}x.disabled=S.coins+1e-9<c2;});
  $('riskBody').querySelectorAll('[data-left]').forEach(x=>{const br=m.broke[x.dataset.left];x.textContent=br?`back in ${Math.ceil(br.left)}s`:'repaired';});
}
