'use strict';
/* ===================== v2.35 REPLANT BLUEPRINTS (item 12) =====================
   Save your factory as a plan (building levels to aim for, collectors, planters, upgrades, wood species, Premium Area, storage,
   workstations, logistics, and the settings: power fuel and log mode, plank sharing, auto-sell, staff posts, Builders' Yard
   picks). After a Replant a planning office works through the plan as coins allow:
   - it spends only real coins at the normal (forest-value) prices, through the same purchase functions as a tap;
   - never more than the budget share of the coins you hold (25 % / 50 % / all), one step every 0.6 s (0.3 s with Master Plans);
   - the next step is always the cheapest one left (× your priority: ⏫ ×¼, ⏬ ×4 the cost), like a careful player;
   - it waits for the same unlocks as you (lot revealed, research, Premium Area, the log-built Sawmill, workstation gates);
   - the queue can be paused at any time, and you can still buy by hand.
   Unlock: research Site Blueprints (Science · Tier I, needs 1 Replant). Master Plans (Tier II): 3 plan slots, faster steps.
   Plans are kept through Replant. Saves before v2.35 load with no plan. */
const BP_SLOTS=3, BP_GAP=[0,.6,.3], BP_BATCH=[0,10,25], BP_BUDGETS=[.25,.5,1], BP_STEP=5, BP_MAXLV=2000;
const BP_PRI={hi:{n:'High',e:'⏫',w:.25},no:{n:'Normal',e:'•',w:1},lo:{n:'Low',e:'⏬',w:4}}, BP_PRI_ORDER=['no','hi','lo'];
const BP_NAMES=['A','B','C'];
function bpFresh(){return {act:0,slots:[null,null,null],run:true,budget:.5,cool:0,stats:{steps:0,spent:0,lv:0,full:0,saved:0},r:{staff:{},set:0,done:0,t0:0}};}
function bpTier(){return hasRes('masterplan')?2:hasRes('blueprint')?1:0;}
function bpUnlocked(){return bpTier()>0;}
function bpSlotsOpen(){return bpTier()>=2?BP_SLOTS:1;}
const _num=(v,lo,hi)=>{v=Math.floor(+v);return isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;};
/* validate a stored plan (old, damaged or hand-edited saves) */
function bpClean(p){
  if(!p||typeof p!=='object'||Array.isArray(p)) return null;
  const o={v:1,at:+p.at||0,run:_num(p.run,0,1e6),b:{},pri:{},c:{},p:{},u:{},tree:_num(p.tree,0,TREES.length-1),prem:_num(p.prem,0,9),sto:{},ws:{},lg:{fk:0,belt:{},drone:0},set:null,inc:p.inc!==false};
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  for(const [k,v] of Object.entries(obj(p.b))) if(BMAP[k]){const n=_num(v,0,BP_MAXLV);if(n>0) o.b[k]=n;}
  for(const [k,v] of Object.entries(obj(p.pri))) if(BMAP[k]&&BP_PRI[v]&&v!=='no') o.pri[k]=v;
  for(const c of COLLECTORS){const n=_num(obj(p.c)[c.id],0,1e5);if(n>0) o.c[c.id]=n;}
  for(const q of PLANTERS){const n=_num(obj(p.p)[q.id],0,1e5);if(n>0) o.p[q.id]=n;}
  for(const u of UPGRADES){const n=_num(obj(p.u)[u.id],0,upMax(u));if(n>0) o.u[u.id]=n;}
  for(const [k,v] of Object.entries(obj(p.sto))) if(BMAP[k]){const n=_num(v,0,20);if(n>0) o.sto[k]=n;}
  for(const [k,v] of Object.entries(obj(p.ws))) if(wsHas(k)&&Array.isArray(v)){const a=[0,1,2].map(i=>_num(v[i],0,WS_MAX));if(a.some(x=>x>0)) o.ws[k]=a;}
  const lg=obj(p.lg);o.lg.fk=_num(lg.fk,0,10);o.lg.drone=_num(lg.drone,0,10);for(const L of BELT_LINKS){const n=_num(obj(lg.belt)[L.src],0,10);if(n>0) o.lg.belt[L.src]=n;}
  const s=obj(p.set);
  if(p.set){o.set={power:null,plank:s.plank==='value'?'value':'fair',autosell:{},staff:{},byOff:{}};
    const w=obj(s.power);if(s.power) o.set.power={on:w.on!==false,fuel:PW_FUELS[w.fuel]?w.fuel:'mix',logs:PW_LOGMODES[w.logs]?w.logs:'surplus',res:PW_RESERVES.includes(+w.res)?+w.res:60};
    for(const [k,v] of Object.entries(obj(s.autosell))) if(RMAP[k]&&canSell(k)) o.set.autosell[k]=!!v;
    for(const [k,v] of Object.entries(obj(s.staff))) if(typeof v==='string'&&BMAP[v]) o.set.staff[k]=v;
    for(const k of Object.keys(obj(s.byOff))) if(BMAP[k]) o.set.byOff[k]=1;}
  return o;
}
function bpState(){let B=S.bp;if(!B||typeof B!=='object'||Array.isArray(B)) B=S.bp=bpFresh();
  if(!Array.isArray(B.slots)) B.slots=[null,null,null];B.slots=[0,1,2].map(i=>B.slots[i]?bpClean(B.slots[i]):null);
  B.act=_num(B.act,0,BP_SLOTS-1);if(typeof B.run!=='boolean') B.run=true;if(!BP_BUDGETS.includes(B.budget)) B.budget=.5;
  if(!isFinite(B.cool)) B.cool=0;
  if(!B.stats||typeof B.stats!=='object') B.stats={};for(const k of ['steps','spent','lv','full','saved']) if(!(+B.stats[k]>=0)) B.stats[k]=0;
  if(!B.r||typeof B.r!=='object') B.r={staff:{},set:0,done:0,t0:0};if(!B.r.staff||typeof B.r.staff!=='object') B.r.staff={};
  Object.defineProperty(B,'_ok',{value:1,enumerable:false,configurable:true});return B;}
function bpB(){const B=S.bp;return B&&B._ok?B:bpState();}
function bpPlan(){const B=bpB();if(B.act>=bpSlotsOpen()) B.act=0;return B.slots[B.act];}
function bpActive(){return bpUnlocked()&&!!bpPlan();}
/* ---------- capture ---------- */
function bpCapture(k){if(!bpUnlocked()) return false;const B=bpB();k=k===undefined?B.act:k;if(k>=bpSlotsOpen()) return false;
  const old=B.slots[k],p={v:1,at:Date.now(),run:S.prestiges||0,b:{},pri:{},c:{},p:{},u:{},tree:S.tree||0,prem:(S.premium&&S.premium.lvl)||0,sto:{},ws:{},lg:{fk:logiLvl(),belt:{},drone:cdLvl()},inc:old?old.inc!==false:true,
    set:{power:{on:S.power?S.power.on!==false:true,fuel:pwState().fuel,logs:pwLogMode(),res:pwReserveSec()},plank:(S.prefs&&S.prefs.plankMode)||'fair',autosell:{},staff:{},byOff:{}}};
  for(const b of BUILDINGS){const l=S.buildings[b.id].lvl;if(l>0) p.b[b.id]=l;}
  if(old) for(const id in old.pri) if(p.b[id]) p.pri[id]=old.pri[id];
  for(const c of COLLECTORS) if(S.collectors[c.id]>0) p.c[c.id]=S.collectors[c.id];
  for(const q of PLANTERS) if((S.planters[q.id]||0)>0) p.p[q.id]=S.planters[q.id];
  for(const u of UPGRADES){const l=upLvl(u.id);if(l>0) p.u[u.id]=l;}
  for(const id in (S.storage||{})){const l=stoLvl(id);if(l>0&&BMAP[id]) p.sto[id]=l;}
  for(const id in (S.ws||{})) if(wsHas(id)){const a=[0,1,2].map(i=>wsLvl(id,i));if(a.some(x=>x>0)) p.ws[id]=a;}
  for(const L of BELT_LINKS){const l=beltLvl(L.src);if(l>0) p.lg.belt[L.src]=l;}
  for(const r of RES) if(canSell(r.id)) p.set.autosell[r.id]=!!S.autosell[r.id];
  for(const w of ((S.staff&&S.staff.team)||[])) if(w.assign&&BMAP[w.assign]) p.set.staff[w.id]=w.assign;
  for(const id in ((S.builders&&S.builders.off)||{})) if(BMAP[id]) p.set.byOff[id]=1;
  B.slots[k]=bpClean(p);B.act=k;B.stats.saved++;B.r.done=0;bluSig='';
  if(typeof checkAch==='function') checkAch();
  return true;}
function bpClear(k){const B=bpB();k=k===undefined?B.act:k;B.slots[k]=null;bluSig='';return true;}
function bpSetTarget(id,lv){const p=bpPlan();if(!p||!BMAP[id]) return false;lv=_num(lv,0,BP_MAXLV);if(lv>0) p.b[id]=lv;else{delete p.b[id];delete p.pri[id];}bpB().r.done=0;bluSig='';return true;}
function bpBump(id,d){const p=bpPlan();if(!p) return false;const t=p.b[id]||0;let n;
  if(d>0) n=t<BP_STEP?BP_STEP:Math.floor(t/BP_STEP)*BP_STEP+BP_STEP;else n=t<=BP_STEP?0:Math.ceil(t/BP_STEP)*BP_STEP-BP_STEP;
  return bpSetTarget(id,n);}
function bpSetPri(id,v){const p=bpPlan();if(!p||!p.b[id]||!BP_PRI[v]) return false;if(v==='no') delete p.pri[id];else p.pri[id]=v;bluSig='';return true;}
function bpCyclePri(id){const p=bpPlan();if(!p) return false;const c=p.pri[id]||'no';return bpSetPri(id,BP_PRI_ORDER[(BP_PRI_ORDER.indexOf(c)+1)%3]);}
function bpSetRun(on){bpB().run=!!on;bluSig='';return true;}
function bpSetBudget(v){v=+v;if(!BP_BUDGETS.includes(v)) return false;bpB().budget=v;bluSig='';return true;}
function bpSetSlot(k){k=_num(k,0,BP_SLOTS-1);if(k>=bpSlotsOpen()) return false;const B=bpB();B.act=k;B.r.done=0;bluSig='';return true;}
function bpSetInc(on){const p=bpPlan();if(!p) return false;p.inc=!!on;bpB().r.done=0;bluSig='';return true;}
/* ---------- steps (what the planning office can do next) ---------- */
function bpAffN(base,scale,owned,cash){if(!(cash>0)) return 0;const n=Math.floor(Math.log(cash*(scale-1)/(base*cs()*Math.pow(scale,owned))+1)/Math.log(scale)+1e-9);return Math.max(0,n);}
function bpW(id){const p=bpPlan();return BP_PRI[(p&&p.pri[id])||'no'].w;}
function bpSteps(){
  const p=bpPlan(),out=[];if(!p) return out;
  const add=(o)=>{if(isFinite(o.cost)&&o.cost>=0) out.push(o);};
  // buildings (+ the workstation a gate needs)
  for(const id in p.b){const b=BMAP[id],st=S.buildings[id],t=p.b[id];if(!b||!st||st.lvl>=t) continue;
    if(!bldUnlocked(id)||(typeof bVisible==='function'&&!bVisible(b))) continue;
    if(onFire(id)) continue;
    const w=bpW(id);
    if(id==='sawmill'&&sawByLogs()){if(sawLogsOk()) add({k:'b',id,n:1,cost:0,key:0,logs:1,ic:b.icon,nm:b.name,to:1});continue;}
    if(st.lvl>0&&wsHas(id)&&wsRoom(id)<1){const nx=wsNext(id);if(nx) add({k:'ws',id,ws:nx.k,n:1,cost:nx.cost,key:nx.cost*w,ic:wsIcon(id,nx.k),nm:wsName(id,nx.k),to:nx.L,gate:1});continue;}
    const c1=bulkCost(b.cost,b.scale,st.lvl,1);add({k:'b',id,n:1,cost:c1,key:c1*w,ic:b.icon,nm:b.name,to:st.lvl+1,need:t-st.lvl});}
  if(p.prem>S.premium.lvl&&S.premium.lvl<PREM_MAX&&premVisible()){const k=premCost();add({k:'pr',id:'premium',n:1,cost:k,key:k*.5,ic:'🏛️',nm:'Premium Area',to:S.premium.lvl+1});}
  if(p.inc===false) return out.sort((a,b)=>a.key-b.key);
  for(const c of COLLECTORS){const t=p.c[c.id]||0,o=S.collectors[c.id];if(o>=t) continue;const k=colCost(c.id,o,1);add({k:'c',id:c.id,n:1,cost:k,key:k,ic:c.icon,nm:c.name,to:o+1,need:t-o});}
  for(const q of PLANTERS){const t=p.p[q.id]||0,o=S.planters[q.id]||0;if(o>=t) continue;const k=plCost(q.id,1);add({k:'p',id:q.id,n:1,cost:k,key:k,ic:q.icon,nm:q.name,to:o+1,need:t-o});}
  for(const u of UPGRADES){const t=p.u[u.id]||0,L=upLvl(u.id)+1;if(L>t||!upReqOk(u,L)) continue;const k=upCost(u,L);add({k:'u',id:u.id,n:1,cost:k,key:k,ic:u.icon,nm:u.name,to:L});}
  {const nx=TREES[S.tree+1];if(nx&&p.tree>S.tree){const k=treeCost(nx);add({k:'t',id:'tree',n:1,cost:k,key:k,ic:nx.icon,nm:nx.name,to:S.tree+1});}}
  for(const id in p.sto){const l=stoLvl(id);if(l>=p.sto[id]||l>=STO_MAX||!S.buildings[id].lvl) continue;const k=stoCost(id);add({k:'st',id,n:1,cost:k,key:k*2,ic:'📦',nm:BMAP[id].name+' storage',to:l+1});}
  for(const id in p.ws){if(!S.buildings[id]||!S.buildings[id].lvl) continue;for(let i=0;i<3;i++){const L=wsLvl(id,i);if(L>=p.ws[id][i]||L>=WS_MAX) continue;const k=wsCost(id,i,L+1);add({k:'ws',id,ws:i,n:1,cost:k,key:k*1.5,ic:wsIcon(id,i),nm:wsName(id,i),to:L+1});}}
  if(p.lg.fk>logiLvl()&&logiUnlocked()){const k=logiCost();add({k:'fk',id:'depot',n:1,cost:k,key:k,ic:'🚜',nm:'Forklift Depot',to:logiLvl()+1});}
  for(const L of BELT_LINKS){const t=p.lg.belt[L.src]||0,l=beltLvl(L.src);if(l>=t||!beltReady(L)) continue;const k=beltCost(L.src);add({k:'belt',id:L.src,n:1,cost:k,key:k,ic:'➰',nm:`Belt ${BELT_SHORT[L.src]} → ${BELT_SHORT[L.dst]}`,to:l+1});}
  if(p.lg.drone>cdLvl()&&cdUnlocked()){const k=cdCost();add({k:'cd',id:'drone',n:1,cost:k,key:k,ic:'🛸',nm:'Drone Port',to:cdLvl()+1});}
  return out.sort((a,b)=>a.key-b.key);
}
function bpBudget(){return Math.max(0,S.coins)*bpB().budget;}
/* do one step: as many levels of it as the budget allows (up to the batch); returns the coins spent or -1 */
function bpDo(s,offline){
  const B=bpB(),bud=bpBudget(),c0=S.coins;let ok=false,n=1;
  if(s.k==='b'){const b=BMAP[s.id],st=S.buildings[s.id];
    if(s.logs) ok=buyBuilding('sawmill',1,{logsOnly:true});
    else{n=Math.min(BP_BATCH[bpTier()]||1,s.need||1,bpAffN(b.cost,b.scale,st.lvl,bud),st.lvl>0&&wsHas(s.id)?wsRoom(s.id):1e9);if(n>=1) ok=buyBuilding(s.id,n);}
    if(ok){B.stats.lv+=n;if(!offline&&typeof bpFx==='function') bpFx(s.id,n);}}
  else if(s.cost>bud+1e-9) return -1;
  else if(s.k==='c'){const c=COLLECTORS.find(x=>x.id===s.id);n=s.cost===0?1:Math.min(BP_BATCH[bpTier()]||1,s.need||1,bpAffN(c.cost,COL_SCALE,S.collectors[s.id],bud));if(n>=1) ok=buyCollector(s.id,n);}
  else if(s.k==='p'){const q=PMAP[s.id];n=Math.min(BP_BATCH[bpTier()]||1,s.need||1,bpAffN(q.cost,PL_SCALE,S.planters[s.id]||0,bud));if(n>=1) ok=buyPlanter(s.id,n);}
  else if(s.k==='u') ok=buyUpgrade(s.id);
  else if(s.k==='t') ok=buyTree();
  else if(s.k==='pr') ok=buyPremium();
  else if(s.k==='st') ok=buyStorage(s.id);
  else if(s.k==='ws') ok=buyWs(s.id,s.ws,true);
  else if(s.k==='fk') ok=logiBuy();
  else if(s.k==='belt') ok=beltBuy(s.id);
  else if(s.k==='cd') ok=cdBuy();
  if(!ok) return -1;
  const spent=Math.max(0,c0-S.coins);B.stats.steps++;B.stats.spent+=spent;M=computeMods();return spent;
}
/* the planned settings: applied once at the start of a run (and with "Apply now"); staff posts as their building opens */
function bpApplySettings(){const p=bpPlan();if(!p||!p.set) return 0;const s=p.set;let n=0;
  if(s.power){const W=pwState();for(const k of ['fuel','logs','res']) if(W[k]!==s.power[k]){W[k]=s.power[k];n++;}if((W.on!==false)!==s.power.on){W.on=s.power.on;n++;}}
  if(S.prefs&&S.prefs.plankMode!==s.plank){S.prefs.plankMode=s.plank;n++;}
  for(const k in s.autosell) if(S.autosell[k]!==s.autosell[k]){S.autosell[k]=s.autosell[k];n++;}
  if(S.builders){const off={};for(const k in s.byOff) off[k]=1;if(JSON.stringify(off)!==JSON.stringify(S.builders.off||{})){S.builders.off=off;n++;}}
  const B=bpB();B.r.staff=Object.assign({},s.staff);B.r.set=1;M=computeMods();bpStaffTick();return n;}
function bpStaffTick(){const B=bpB(),pend=B.r.staff;if(!pend) return;const team=(S.staff&&S.staff.team)||[];
  for(const wid in pend){const w=team.find(x=>String(x.id)===String(wid)),bid=pend[wid];
    if(!w||!BMAP[bid]){delete pend[wid];continue;}
    if(w.assign===bid){delete pend[wid];continue;}
    if(S.buildings[bid].lvl>0&&staffCanAssign(w,bid)){w.assign=bid;delete pend[wid];M=computeMods();if(typeof staffSig!=='undefined') staffSig='';}}}
function bpStartRun(){const B=bpB();B.r={staff:{},set:0,done:0,t0:S.playTime||0};B.cool=1.5;if(bpActive()) bpApplySettings();}
function bpKeep(){const B=bpB();return {act:B.act,slots:B.slots.map(x=>x?JSON.parse(JSON.stringify(x)):null),run:B.run,budget:B.budget,cool:0,stats:Object.assign({},B.stats),r:{staff:{},set:0,done:0,t0:0}};}
/* progress: levels reached / levels planned (buildings) */
function bpProgress(){const p=bpPlan();if(!p) return {got:0,need:0,k:1};let got=0,need=0;
  for(const id in p.b){need+=p.b[id];got+=Math.min(p.b[id],S.buildings[id]?S.buildings[id].lvl:0);}
  return {got,need,k:need?got/need:1};}
function bpLeft(){const p=bpPlan();if(!p) return 0;let n=0;for(const id in p.b) if(S.buildings[id]&&S.buildings[id].lvl<p.b[id]) n++;return n;}
/* status line */
function bpStatus(){
  if(!bpUnlocked()) return {k:'lock',t:'Research Site Blueprints to unlock'};
  const p=bpPlan();if(!p) return {k:'none',t:'No plan saved in this slot yet'};
  const B=bpB();if(!bpLeft()&&!bpSteps().length) return {k:'done',t:'Plan complete'};
  if(!B.run) return {k:'off',t:'Paused'};
  const s=bpSteps()[0];
  if(!s){const sw=p.b.sawmill&&sawByLogs()?`Chop 🪵 ${SAW_LOGS} logs for the Sawmill`:'Waiting for the next lot or unlock';return {k:'wait',t:sw};}
  if(s.cost>bpBudget()+1e-9) return {k:'wait',t:`Saving up for ${s.nm} · 🪙 ${fmt(s.cost)}`,s};
  return {k:'ok',t:`Restoring · next: ${s.nm}`,s};}
/* ---------- tick ---------- */
function bpTick(dt,offline){
  const B=S.bp;if(!B||!bpUnlocked()) return;const Bs=bpB();if(!Bs.slots[Bs.act]) return;
  if(Bs.r.staff&&Object.keys(Bs.r.staff).length&&(!offline||(S.time%2)<dt)) bpStaffTick();
  if(!Bs.run||Bs.r.done) return;
  Bs.cool-=dt;if(Bs.cool>0) return;
  Bs.cool=BP_GAP[bpTier()];
  const L=bpSteps();
  if(!L.length){if(!bpLeft()){Bs.r.done=1;Bs.stats.full++;if(!offline){toast('📐 <b>Blueprint restored!</b> Every building in the plan is back at its target level.',4200,'ms-toast');sfx('unlock');}if(typeof checkAch==='function') checkAch();}return;}
  bpDo(L[0],offline);
}
/* ---------- UI: the 📐 Blueprint tab in the Replant sheet + the HUD chip ---------- */
let bluSig='', bpOpenAll=false;
function bpWhen(t){if(!t) return '';const d=Math.max(0,(Date.now()-t)/1000);return d<90?'just now':d<5400?Math.round(d/60)+' min ago':d<172800?Math.round(d/3600)+' h ago':Math.round(d/86400)+' days ago';}
function bpCostTxt(s){return s.logs?`🪵 ${SAW_LOGS}`:s.cost>0?'🪙 '+fmt(s.cost):'Free';}
function bpRows(p){const ids=BUILDINGS.map(b=>b.id).filter(id=>p.b[id]||S.buildings[id].lvl>0);
  return ids.map(id=>{const b=BMAP[id],t=p.b[id]||0,l=S.buildings[id].lvl,pr=p.pri[id]||'no',k=t?Math.min(1,l/t):1;
    return `<div class="blu-row${t?'':' off'}${t&&l>=t?' ok':''}" data-b="${id}"><span class="blu-bi">${b.icon}</span><div class="blu-bm"><b>${b.name}</b><small>${t?`Lv ${fmt(l)} / ${fmt(t)}`:`Lv ${fmt(l)} · not in plan`}</small><span class="blu-bar"><i style="width:${(k*100).toFixed(0)}%"></i></span></div>
      <button class="blu-pri ${pr}" data-pri="${id}" title="Priority: ${BP_PRI[pr].n}" ${t?'':'disabled'}>${BP_PRI[pr].e}</button><button class="blu-st" data-d="-1" data-id="${id}" title="Aim ${BP_STEP} levels lower" ${t?'':'disabled'}>−</button><button class="blu-st" data-d="1" data-id="${id}" title="Aim ${BP_STEP} levels higher">+</button></div>`;}).join('');}
function bpSummary(p){const n=o=>Object.keys(o).length,sum=o=>Object.values(o).reduce((a,x)=>a+x,0);const s=p.set;
  const parts=[];if(n(p.c)) parts.push(`🧔 ${fmt(sum(p.c))} collectors`);if(n(p.p)) parts.push(`🌱 ${fmt(sum(p.p))} planters`);if(n(p.u)) parts.push(`💡 ${n(p.u)} upgrades`);
  if(p.tree) parts.push(`${TREES[p.tree].icon} ${TREES[p.tree].name}`);if(p.prem) parts.push(`🏛️ Premium Lv ${p.prem}`);if(n(p.ws)) parts.push(`🛠 ${n(p.ws)} workstation sets`);if(n(p.sto)) parts.push(`📦 ${n(p.sto)} stock areas`);
  if(p.lg.fk||n(p.lg.belt)||p.lg.drone) parts.push(`🚜 Depot ${p.lg.fk}${n(p.lg.belt)?` · ➰ ${n(p.lg.belt)} belts`:''}${p.lg.drone?` · 🛸 ${p.lg.drone}`:''}`);
  const st=s?[s.power?`⚡ ${PW_FUELS[s.power.fuel].n} · ${PW_LOGMODES[s.power.logs].n}`:null,`🪵 planks ${s.plank==='value'?'best value':'fair'}`,n(s.staff)?`👷 ${n(s.staff)} staff posts`:null].filter(Boolean):[];
  return {inc:parts.join(' · ')||'—',set:st.join(' · ')||'—'};}
function bpLockedHtml(){const n=RNMAP.blueprint,why=typeof nodeWhy==='function'?nodeWhy(n):'';
  return `<div class="blu-hero lock"><div class="blu-ic">📐</div><div style="flex:1"><div class="ph-t">Replant Blueprints</div><div class="legend" style="margin:2px 0 0">Save your factory as a plan. After each Replant a planning office rebuilds it toward your target levels, paying the normal prices with the coins you earn.</div></div></div>
    <div class="blu-lockmsg">🔒 Research <b>${n.icon} ${n.name}</b> (R&amp;D → Science · Tier I)${(S.prestiges||0)<1?' · needs 1 Replant':''}${why&&!/Replant/.test(why)?`<br><small>${why}</small>`:''}</div>
    <button class="btn big" id="bluGoRes">🔬 Open Research</button>`;}
function updateBlueprint(force){
  const el=$('rpBlue');if(!el) return;
  if(!bpUnlocked()){const h=bpLockedHtml();if(el._h!==h){el.innerHTML=h;el._h=h;const g=$('bluGoRes');if(g) g.onclick=()=>{if(labBuilt()) openResearch();else toast('🔬 Build the Research Lab on the R&D campus first (it needs a Paper Mill).',3200);};}return;}
  const B=bpB(),p=bpPlan(),T=bpTier();
  const sig=[B.act,!!p,p&&JSON.stringify([p.b,p.pri,p.inc,p.at]),B.run,B.budget,T,bpOpenAll,BUILDINGS.map(b=>S.buildings[b.id].lvl>0?1:0).join('')].join('|');
  if(force||sig!==bluSig||el._h===undefined){bluSig=sig;
    let h=`<div class="seg blu-slots" id="bluSlots">${[0,1,2].map(i=>{const op=i<bpSlotsOpen(),has=!!B.slots[i];return `<button data-k="${i}" class="${B.act===i?'on':''}" ${op?'':'disabled'} title="${op?'Blueprint '+BP_NAMES[i]:'Research Master Plans for 3 slots'}">${op?'📐':'🔒'} ${BP_NAMES[i]}${has?' ✓':''}</button>`;}).join('')}</div>`;
    if(!p){h+=`<div class="blu-hero"><div class="blu-ic">📐</div><div style="flex:1"><div class="ph-t">Blueprint ${BP_NAMES[B.act]} is empty</div><div class="legend" style="margin:2px 0 0">Save the factory you have now. After a Replant the planning office rebuilds it, step by step, as coins allow.</div></div></div>
      <button class="btn gold big" id="bluSave">📸 Save current layout as Blueprint ${BP_NAMES[B.act]}</button>`;}
    else{const sm=bpSummary(p),nb=Object.keys(p.b).length,lv=Object.values(p.b).reduce((a,x)=>a+x,0);
      h+=`<div class="blu-hero"><div class="blu-ic">📐</div><div style="flex:1;min-width:0"><div class="ph-t">Blueprint ${BP_NAMES[B.act]} · ${nb} buildings · ${fmt(lv)} levels</div><div class="legend" style="margin:2px 0 0">Saved ${bpWhen(p.at)} in run ${p.run+1}</div></div></div>
        <div class="pw-status" id="bluSt"></div><div class="blu-prog"><span class="pbar"><i id="bluPb"></i></span><b id="bluPct"></b></div>
        <div class="blu-btns"><button class="btn ${B.run?'wood':'gold'}" id="bluRun">${B.run?'⏸ Pause':'▶ Resume'}</button><button class="btn" id="bluSave">📸 Save current</button></div>
        <div class="pw-row"><span class="pw-l">Budget</span><span class="seg" id="bluBud">${BP_BUDGETS.map(v=>`<button data-v="${v}" class="${B.budget===v?'on':''}">${v>=1?'All':Math.round(v*100)+'%'}</button>`).join('')}</span></div>
        <div class="legend" style="margin:-4px 0 8px" id="bluBudTx"></div>
        <h4>Next up</h4><div class="blu-q" id="bluQ"></div>
        <h4>Target levels <small class="blu-h4s">⏫ high · • normal · ⏬ low priority</small></h4>
        <div class="blu-rows" id="bluRows">${bpRows(p)}</div>
        <label class="rep-row"><span>🧔 Also restore crew, upgrades, wood, Premium Area, stations &amp; logistics<small>${sm.inc}</small></span><label class="sw"><input type="checkbox" id="bluInc" ${p.inc!==false?'checked':''}><span class="tr"></span></label></label>
        <div class="rep-row"><span>⚙️ Settings applied after each Replant<small>${sm.set}</small></span><button class="btn small" id="bluApply">Apply now</button></div>
        <button class="btn small blu-clear" id="bluClear">🗑 Clear Blueprint ${BP_NAMES[B.act]}</button>`;}
    h+=`<div class="legend">The planning office pays the <b>normal prices</b> of this run (×${fx2(cs())} forest value) with the coins you hold, never more than the budget share, one step every ${BP_GAP[T]} s (up to ${BP_BATCH[T]} levels). The cheapest step goes first; ⏫ / ⏬ make a building 4× more / less urgent. It waits for the same unlocks you do, and you can still buy anything by hand. Blueprints are kept through Replant.${T<2?' <b>Master Plans</b> (Science · Tier II) adds slots B and C and steps twice as fast.':''}</div>`;
    el.innerHTML=h;el._h=h;
    el.querySelectorAll('#bluSlots button').forEach(b=>b.onclick=()=>{bpSetSlot(+b.dataset.k);haptic&&haptic(5);updateBlueprint(true);});
    const sv=$('bluSave');if(sv) sv.onclick=()=>{const go=()=>{bpCapture();toast(`📐 <b>Blueprint ${BP_NAMES[bpB().act]}</b> saved: ${Object.keys(bpPlan().b).length} buildings, settings and crew`,3000);updateBlueprint(true);};
      if(bpPlan()) confirmModal('📸 Overwrite Blueprint '+BP_NAMES[bpB().act]+'?','<div class="legend">The plan is replaced by the factory you have now (levels, crew, upgrades and settings). Priorities you set stay for buildings still in it.</div>','Save',go);else go();};
    const rn=$('bluRun');if(rn) rn.onclick=()=>{bpSetRun(!bpB().run);haptic&&haptic(5);updateBlueprint(true);};
    const bu=$('bluBud');if(bu) bu.querySelectorAll('button').forEach(b=>b.onclick=()=>{bpSetBudget(b.dataset.v);haptic&&haptic(5);updateBlueprint(true);});
    const rw=$('bluRows');if(rw) rw.addEventListener('click',e=>{const s=e.target.closest('.blu-st'),q=e.target.closest('.blu-pri');
      if(s&&!s.disabled){bpBump(s.dataset.id,+s.dataset.d);haptic&&haptic(4);updateBlueprint(true);}else if(q&&!q.disabled){bpCyclePri(q.dataset.pri);haptic&&haptic(4);updateBlueprint(true);}});
    const ic=$('bluInc');if(ic) ic.onchange=()=>{bpSetInc(ic.checked);updateBlueprint(true);};
    const ap=$('bluApply');if(ap) ap.onclick=()=>{const n=bpApplySettings();toast(n?`⚙️ Blueprint settings applied (${n} changed)`:'⚙️ Settings already match the blueprint',2400);};
    const cl=$('bluClear');if(cl) cl.onclick=()=>confirmModal('🗑 Clear Blueprint '+BP_NAMES[bpB().act]+'?','<div class="legend">The plan is deleted. Nothing in your factory changes.</div>','Clear',()=>{bpClear();updateBlueprint(true);});
  }
  if(!p) return;
  const st=bpStatus(),pg=bpProgress();
  const se=$('bluSt'),sh=({ok:'📐 ',wait:'⏳ ',off:'⏸ ',done:'✅ ',none:'',lock:'🔒 '}[st.k]||'')+st.t,sk={ok:'',wait:'low',off:'off',done:''}[st.k]||'';
  if(se&&se._t!==sh){se.textContent=sh;se._t=sh;se.className='pw-status '+sk;}
  const pb=$('bluPb');if(pb) pb.style.width=(pg.k*100).toFixed(1)+'%';const pc=$('bluPct');if(pc){const t=Math.floor(pg.k*100)+'%';if(pc.textContent!==t) pc.textContent=t;}
  const bt=`Each step may spend up to <b>🪙 ${fmt(bpBudget())}</b> (${B.budget>=1?'all':Math.round(B.budget*100)+'%'} of your coins). Spent so far: 🪙 ${fmt(B.stats.spent)} on ${fmt(B.stats.steps)} steps.`;
  const be=$('bluBudTx');if(be&&be._t!==bt){be.innerHTML=bt;be._t=bt;}
  const L=bpSteps().slice(0,5),bud=bpBudget();
  const qh=L.length?L.map((s,i)=>`<div class="blu-qi${i===0?' first':''}${s.cost>bud+1e-9&&!s.logs?' wait':''}"><span>${s.ic}</span><b>${s.nm}</b><em>${s.k==='b'||s.k==='ws'||s.k==='c'||s.k==='p'||s.k==='u'?'→ Lv '+fmt(s.to):''}</em><i>${bpCostTxt(s)}</i></div>`).join(''):`<div class="legend" style="margin:0">${st.k==='done'?'✅ Everything in the plan is built.':'Nothing to buy right now: '+st.t.toLowerCase()+'.'}</div>`;
  const qe=$('bluQ');if(qe&&qe._t!==qh){qe.innerHTML=qh;qe._t=qh;}
  const rw=$('bluRows');if(rw&&curSheet==='co'&&(S.time*2|0)!==rw._k){rw._k=S.time*2|0;for(const r of rw.querySelectorAll('.blu-row')){const id=r.dataset.b,t=p.b[id]||0,l=S.buildings[id].lvl;const sm=r.querySelector('small'),tx=t?`Lv ${fmt(l)} / ${fmt(t)}`:`Lv ${fmt(l)} · not in plan`;if(sm.textContent!==tx) sm.textContent=tx;
    r.querySelector('.blu-bar i').style.width=((t?Math.min(1,l/t):1)*100).toFixed(0)+'%';r.classList.toggle('ok',!!t&&l>=t);}}
}
/* HUD chip (sub bar): shows while a plan is being restored; tap → the Blueprint tab */
let bpChipSig='';
function updateBpChip(){const c=$('bluChip');if(!c) return;
  const show=bpActive()&&!bpB().r.done&&bpLeft()>0&&(S.prestiges||0)>0;
  const pg=show?bpProgress():null,run=bpB().run,sig=show?Math.floor(pg.k*100)+'|'+run:'';
  if(sig===bpChipSig) return;bpChipSig=sig;
  c.classList.toggle('hidden',!show);if(!show) return;
  c.classList.toggle('paused',!run);
  c.innerHTML=`<span class="fi">📐</span><span class="fbar"><i style="width:${(pg.k*100).toFixed(0)}%"></i></span><b>${Math.floor(pg.k*100)}%</b>${run?'':'<span class="blu-pz">⏸</span>'}`;
  c.title=`Blueprint ${BP_NAMES[bpB().act]}: ${Math.floor(pg.k*100)}% restored${run?'':' (paused)'} · tap to open`;}
function bpOpenTab(){openSheet('co');rpTabOpen('bp');}
function setupBlueprintUI(){const c=$('bluChip');if(c) c.onclick=e=>{e.stopPropagation();bpOpenTab();};}
/* Replant confirm: offer to save this run first */
let bpSaveOnReplant=false;
function bpReplantHtml(){if(!bpUnlocked()) return '';const B=bpB(),p=bpPlan(),nm=BP_NAMES[B.act];bpSaveOnReplant=!p;
  return `<label class="rp-bpsave"><input type="checkbox" id="rpBpSave" ${p?'':'checked'} onchange="bpSaveOnReplant=this.checked"><span>📐 Save this factory as <b>Blueprint ${nm}</b> first${p?' <small>(replaces the saved plan)</small>':''}</span></label>`+
    `<div class="legend rp-bpnote">${p?`📐 Blueprint ${nm} (${Object.keys(p.b).length} buildings) is rebuilt after the Replant as coins allow${B.run?'':' · <b>paused</b>'}.`:`📐 With a saved blueprint the planning office rebuilds this factory after the Replant as coins allow.`}</div>`;}
function bpBeforeReplant(){if(bpUnlocked()&&bpSaveOnReplant) bpCapture();bpSaveOnReplant=false;}
/* ---------- scene: planned lots + "📐 +N Lv" floats ---------- */
function bpLotPlanned(id){if(!bpActive()) return 0;const p=bpPlan(),st=S.buildings[id];return p.b[id]&&st&&!st.lvl?p.b[id]:0;}
function bpFx(id,n){if(typeof scene==='undefined'||!scene.floats) return;const L=LOTS[id];if(!L||!L.top) return;
  if(scene.floats.filter(f=>f.bp).length>=4) return;   // never a cloud of floats
  scene.floats.push({x:L.top[0],y:L.top[1]-6,text:`📐 +${n} Lv`,t:0,dur:1.3,col:'#bfe4ff',bp:1});}
/* a blueprint sheet on an empty planned lot: blue paper, white grid, the building's outline */
function bpDrawLot(ctx,L){const {ci,cj}=L,e=1.55,t=typeof scene!=='undefined'?scene.t:0;
  ctx.save();ctx.globalAlpha=.78;ctx.fillStyle='#2f6fb5';pth(ctx,[P(ci-e,cj-e,.5),P(ci+e,cj-e,.5),P(ci+e,cj+e,.5),P(ci-e,cj+e,.5)]);ctx.fill();
  ctx.globalAlpha=.42;ctx.strokeStyle='#e8f4ff';ctx.lineWidth=1;ctx.beginPath();
  for(let k=-2;k<=2;k++){const d=k*e/2.5;let a=P(ci+d,cj-e,.5),b=P(ci+d,cj+e,.5);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);a=P(ci-e,cj+d,.5);b=P(ci+e,cj+d,.5);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
  ctx.stroke();ctx.globalAlpha=.95;ctx.strokeStyle='#ffffff';ctx.lineWidth=1.6;ctx.setLineDash([5,3]);ctx.lineDashOffset=-t*8;
  const f=1.05;pth(ctx,[P(ci-f,cj-f,.5),P(ci+f,cj-f,.5),P(ci+f,cj+f,.5),P(ci-f,cj+f,.5)]);ctx.stroke();ctx.setLineDash([]);
  const a=P(ci-f,cj-f,.5),b=P(ci+f,cj+f,.5),c=P(ci+f,cj-f,.5),d=P(ci-f,cj+f,.5);ctx.lineWidth=1;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.stroke();
  ctx.restore();}
