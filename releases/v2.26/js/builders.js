'use strict';
/* ===================== v2.12 BUILDERS' YARD: construction crews that upgrade buildings on their own (logic + sheet) =====================
   A yard at the bottom of the lane sends crews in yellow trucks out to the factory. Each crew picks a building by the yard's plan
   (next ×2 milestone / cheapest level / lowest level), puts up scaffolding, works for a few seconds and then pays for the levels at
   the normal price, never more than the budget share of your coins at that moment. Jobs only reserve a building; nothing is paid
   until the job is done, so prices, Buy ×10/Max and the cost of the next level are exactly the same as buying by hand.
   The yard and its settings are kept through Replant (like the fire station and the power plant). Replant still resets every
   building level and so every upgrade and hire cost, exactly as before; running jobs are dropped. Crews also work while offline. */
const BY_MAX=6, BY_COST=2.5e4, BY_SCALE=12, BY_WAIT=30;
const BY_LV=[null,{crews:1,batch:3,dur:18},{crews:2,batch:5,dur:16},{crews:2,batch:10,dur:14},{crews:3,batch:25,dur:13},{crews:3,batch:50,dur:12},{crews:4,batch:100,dur:11}];
const BY_PLANS={ms:{n:'Milestones',e:'⭐',d:'Rush the building that is cheapest to bring to its next ×2 milestone'},
  cheap:{n:'Cheapest',e:'🪙',d:'Always buy the cheapest next level in the factory'},
  low:{n:'Lowest level',e:'⚖️',d:'Lift the lowest-level building first to keep the chain balanced'}};
const BY_BUDGETS=[.1,.25,.5,1];
const BY_PERKS=[[1,'Site office, material yard and one crew truck · up to 3 levels per job'],[2,'Tower crane · a second crew · 5 levels per job'],
  [3,'Two-storey site office · 10 levels per job'],[4,'Floodlight mast · a third crew · 25 levels per job'],[5,'Cement silo · 50 levels per job'],[6,'Gold trim and the ★ flag · a fourth crew · 100 levels per job']];
function byFresh(){return {lvl:0,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0};}
function byState(){let B=S.builders;if(!B||typeof B!=='object') B=S.builders=byFresh();
  if(!Array.isArray(B.jobs)) B.jobs=[]; if(!B.off||typeof B.off!=='object') B.off={}; if(!B.stats||typeof B.stats!=='object') B.stats={lv:0,spent:0,jobs:0};
  if(!BY_PLANS[B.plan]) B.plan='ms'; if(!BY_BUDGETS.includes(B.budget)) B.budget=.25; B.lvl=Math.max(0,Math.min(BY_MAX,B.lvl|0));
  return B;}
function byLvl(){return (S.builders&&S.builders.lvl)||0;}
function byCost(l){l=l===undefined?byLvl():l;return BY_COST*Math.pow(BY_SCALE,l);}
function byBuiltCount(){let n=0;for(const b of BUILDINGS) if(!b.premium&&!b.tech&&S.buildings[b.id]&&S.buildings[b.id].lvl>0) n++;return n;}
function byUnlocked(){return byLvl()>0||byBuiltCount()>=3;}
function byVisible(){return byLvl()>0||byBuiltCount()>=2;}
function byCrews(l){l=l===undefined?byLvl():l;return l?BY_LV[l].crews:0;}
function byBatch(l){l=l===undefined?byLvl():l;return l?BY_LV[l].batch:0;}
function byDur(l){l=l===undefined?byLvl():l;return l?BY_LV[l].dur:0;}
function byBudget(){const B=S.builders;return Math.max(0,S.coins)*(B?B.budget:.25);}
/* levels of b (owned `lvl`) that fit in `cash` */
function byAfford(b,lvl,cash){if(!(cash>0)) return 0;const n=Math.floor(Math.log(cash*(b.scale-1)/(b.cost*cs()*Math.pow(b.scale,lvl))+1)/Math.log(b.scale)+1e-9);
  return Math.max(0,n);}
function byAllowed(id){const B=S.builders;return !(B&&B.off&&B.off[id]);}
function byEligible(b){const st=S.buildings[b.id];if(!st||!st.lvl) return false;if(b.premium&&!(S.premium&&S.premium.lvl>0)) return false;
  return !onFire(b.id)&&bldUnlocked(b.id);}
function byJobOf(id){const B=S.builders;if(!B||!B.jobs) return null;for(const j of B.jobs) if(j.bid===id) return j;return null;}
/* which building would the next free crew take, and how many levels */
function byPick(){
  const B=byState(),cap=byBatch(),bud=byBudget(),busy={};for(const j of B.jobs) busy[j.bid]=1;
  let best=null,bk=Infinity;
  for(const b of BUILDINGS){if(busy[b.id]||!byAllowed(b.id)||!byEligible(b)) continue;
    const l=S.buildings[b.id].lvl,room=wsHas(b.id)?wsRoom(b.id):1e9;
    if(room<1){const nx=wsNext(b.id);if(nx&&nx.cost<=bud&&nx.cost<bk){bk=nx.cost;best={bid:b.id,n:0,ws:nx.k};}continue;}   // v2.22: crew fits the workstation the gate needs
    const a=Math.min(cap,byAfford(b,l,bud),room);if(a<1) continue;
    let key,n=a;
    if(B.plan==='ms'){const nx=nextMs(l),need=nx?nx-l:cap;key=bulkCost(b.cost,b.scale,l,Math.min(need,cap));n=Math.min(a,need);}
    else if(B.plan==='low') key=l+Math.min(.999,Math.log10(1+bulkCost(b.cost,b.scale,l,1))/400);
    else key=bulkCost(b.cost,b.scale,l,1);
    if(key<bk){bk=key;best={bid:b.id,n};}}
  return best;}
/* the cheapest thing any crew could do (for the 'waiting for coins' hint) */
function byNextNeed(){let best=Infinity;for(const b of BUILDINGS){if(!byAllowed(b.id)||!byEligible(b)||byJobOf(b.id)) continue;const c=bulkCost(b.cost,b.scale,S.buildings[b.id].lvl,1);if(c<best) best=c;}return best;}
function byApply(j,n,c,offline){
  const B=S.builders,b=BMAP[j.bid],st=S.buildings[j.bid],ms0=msCount(st.lvl);
  S.coins-=c; st.lvl+=n; M=computeMods();
  B.stats.lv+=n; B.stats.spent+=c; B.stats.jobs++;
  if(offline){if(offlineAcc) offlineAcc.built=(offlineAcc.built||0)+n;return;}
  const ms1=msCount(st.lvl); if(ms1>ms0) milestoneHit(b,ms0,ms1);
  if(typeof byDoneFx==='function') byDoneFx(j,n);
}
/* called from tick() after earning */
function byTick(dt,offline){
  const B=S.builders; if(!B||!B.lvl) return; if(!Array.isArray(B.jobs)) B.jobs=[];
  for(let k=B.jobs.length-1;k>=0;k--){const j=B.jobs[k],st=S.buildings[j.bid],b=BMAP[j.bid];
    if(!b||!st||!st.lvl||!byAllowed(j.bid)||(b.premium&&!(S.premium&&S.premium.lvl>0))){B.jobs.splice(k,1);if(!offline&&typeof byDoneFx==='function') byDoneFx(j,0);continue;}
    j.t+=dt; if(j.t<j.dur) continue;
    if(j.ws!==undefined){if(wsLvl(j.bid,j.ws)>=WS_MAX||!wsBlocked(j.bid)){B.jobs.splice(k,1);if(!offline&&typeof byDoneFx==='function') byDoneFx(j,0);continue;}
      const c=wsCost(j.bid,j.ws);if(c<=byBudget()&&buyWs(j.bid,j.ws,true)){B.jobs.splice(k,1);B.stats.spent+=c;B.stats.jobs++;if(!offline&&typeof byDoneFx==='function') byDoneFx(j,0);continue;}
      j.st='wait';if(j.t>=j.dur+BY_WAIT){B.jobs.splice(k,1);if(!offline&&typeof byDoneFx==='function') byDoneFx(j,0);}continue;}
    if(!onFire(j.bid)){const n=Math.min(j.n,byAfford(b,st.lvl,byBudget()),wsHas(j.bid)?wsRoom(j.bid):1e9);
      if(n>=1){const c=bulkCost(b.cost,b.scale,st.lvl,n);B.jobs.splice(k,1);byApply(j,n,c,offline);continue;}}
    j.st='wait';
    if(j.t>=j.dur+BY_WAIT){B.jobs.splice(k,1);if(!offline&&typeof byDoneFx==='function') byDoneFx(j,0);}
  }
  if(B.on===false) return;
  B.cool=(B.cool||0)-dt; if(B.cool>0||B.jobs.length>=byCrews()) return;
  const p=byPick(); if(!p){B.cool=offline?0:1.2;return;}
  B.cool=offline?0:.6;
  B.seq=(B.seq||0)+1; B.jobs.push(Object.assign({id:B.seq,bid:p.bid,n:p.n,t:0,dur:byDur(),st:'go'},p.ws!==undefined?{ws:p.ws}:{}));
}
function buyBuilders(){const B=byState();if(B.lvl>=BY_MAX||!byUnlocked()) return false;const c=byCost();if(S.coins+1e-9<c) return false;
  S.coins-=c; B.lvl++;
  if(typeof byPoof==='function') byPoof();
  toast(B.lvl===1?'🏗️ <b>Builders\' Yard open!</b> A crew now upgrades your buildings on its own. Set the plan and budget in the yard.':`🏗️ <b>Builders' Yard Lv ${B.lvl}</b> · ${byCrews()} crew${byCrews()>1?'s':''}, up to ${byBatch()} levels per job`,3800);
  if(BY_PERKS.some(p=>p[0]===B.lvl&&B.lvl>1)) confettiBurst();
  sfx('unlock'); if(typeof checkAch==='function') checkAch(); return true;}
function setBuildersOn(on){byState().on=!!on;}
function setBuildersPlan(p){if(!BY_PLANS[p]) return false;byState().plan=p;return true;}
function setBuildersBudget(v){v=+v;if(!BY_BUDGETS.includes(v)) return false;byState().budget=v;return true;}
function setBuildersAllow(id,on){const B=byState();if(!BMAP[id]) return false;if(on) delete B.off[id];else{B.off[id]=1;}return true;}
function byStatus(){const B=byState();
  if(!B.lvl) return {k:'none',t:byUnlocked()?'Not built yet':'Build three factory buildings to unlock'};
  if(B.on===false) return {k:'off',t:B.jobs.length?'Switched off · finishing the current jobs':'Switched off'};
  const w=B.jobs.filter(j=>j.st==='wait').length;
  if(B.jobs.length&&w===B.jobs.length) return {k:'wait',t:'Waiting for coins to pay for the work'};
  if(B.jobs.length) return {k:'ok',t:`${B.jobs.length}/${byCrews()} crew${byCrews()>1?'s':''} on site`};
  if(!BUILDINGS.some(b=>byAllowed(b.id)&&byEligible(b))) return {k:'idle',t:'No buildings allowed: tick some below'};
  return {k:'wait',t:'Waiting for coins: the budget can\'t pay for a level yet'};}

/* ---------- sheet ---------- */
SHEETS.build={title:'Builders\' Yard',icon:'build'};
UI_ICONS.build=`<svg viewBox="0 0 32 32"><path d="M7 29 V5" stroke="#c88a10" stroke-width="2.6"/><path d="M7 5 L7 29 M4.6 9 L9.4 13 M9.4 9 L4.6 13 M4.6 15 L9.4 19 M9.4 15 L4.6 19 M4.6 21 L9.4 25" stroke="#7a5208" stroke-width=".8"/><path d="M3 6 H29 L27 8.4 H3Z" fill="#f2b81a" stroke="#7a5208" stroke-width="1.1"/><rect x="1.5" y="8.4" width="4.5" height="3.5" fill="#6a7480" stroke="#3a4048" stroke-width=".8"/><path d="M24 8.4 V16" stroke="#3a3a40" stroke-width="1"/><rect x="21" y="16" width="6" height="4" rx=".6" fill="#c0563a" stroke="#6a2a18" stroke-width=".9"/><path d="M11 29 C11 23.5 14 21 18.5 21 C23 21 26 23.5 26 29Z" fill="#f2b81a" stroke="#7a5208" stroke-width="1.3"/><path d="M9.5 29 H27.5" stroke="#7a5208" stroke-width="2.2" stroke-linecap="round"/><path d="M18.5 21 V26.5" stroke="#c88a10" stroke-width="1.6"/></svg>`;
let bySig='';
function byChipsHtml(){return BUILDINGS.filter(b=>S.buildings[b.id]&&S.buildings[b.id].lvl>0&&(!b.premium||(S.premium&&S.premium.lvl>0))).map(b=>
  `<button class="by-chip${byAllowed(b.id)?' on':''}" data-b="${b.id}" title="${byAllowed(b.id)?'Crews may upgrade':'Crews keep away from'} ${b.name}">${b.icon} <span>${b.name}</span></button>`).join('');}
function updateBuilders(){
  const bb=$('bbBuild'); if(bb){const v=byVisible(); if(bb._v!==v){bb._v=v;bb.classList.toggle('hidden',!v);}}
  const dot=$('buildDot'); if(dot){const want=byUnlocked()&&!byLvl()&&S.coins+1e-9>=byCost(); dot.classList.toggle('hidden',curSheet==='build'||!want);}
  if(curSheet!=='build') return;
  const B=byState(),l=B.lvl,st=byStatus();
  const built=BUILDINGS.filter(b=>S.buildings[b.id]&&S.buildings[b.id].lvl>0&&(!b.premium||(S.premium&&S.premium.lvl>0))).map(b=>b.id+(byAllowed(b.id)?1:0)).join(',');
  const sig=l+'|'+(B.on!==false)+'|'+B.plan+'|'+B.budget+'|'+byUnlocked()+'|'+built;
  if(sig!==bySig){bySig=sig;
    let h=`<div class="pw-hero by-hero"><div class="ph-ic">${UI_ICONS.build}</div><div style="flex:1"><div class="ph-t">${l?`Builders' Yard · Lv ${l}${l>=BY_MAX?' ★':''}`:'Builders\' Yard'}</div>
      <div class="legend" style="margin:2px 0 0" id="byTx"></div></div></div>`;
    if(l){
      h+=`<div class="pw-status" id="bySt"></div><div class="by-crews" id="byCrews"></div>
        <div class="pw-row"><span class="pw-l">Plan</span><span class="seg" id="byPlan">${Object.entries(BY_PLANS).map(([k,p])=>`<button data-p="${k}" class="${B.plan===k?'on':''}" title="${p.d}">${p.e} ${p.n}</button>`).join('')}</span>
          <label class="sw" title="Send crews out / keep them at the yard"><input type="checkbox" id="byOn" ${B.on!==false?'checked':''}><span class="tr"></span><span>${B.on!==false?'On':'Off'}</span></label></div>
        <div class="legend" style="margin:-4px 0 8px">${BY_PLANS[B.plan].d}.</div>
        <div class="pw-row"><span class="pw-l">Budget</span><span class="seg" id="byBud">${BY_BUDGETS.map(v=>`<button data-v="${v}" class="${B.budget===v?'on':''}">${v>=1?'All':Math.round(v*100)+'%'}</button>`).join('')}</span></div>
        <div class="legend" style="margin:-4px 0 8px" id="byBudTx"></div>
        <div class="pw-l" style="margin-bottom:5px">Buildings the crews may upgrade</div><div class="by-chips" id="byChips">${byChipsHtml()}</div>
        <div class="pw-kv" id="byKv"></div>`;}
    h+=`<button class="btn gold big" id="byBuy"></button>`;
    h+=`<h4>Yard upgrades</h4><div class="pw-perks">${BY_PERKS.map(([lv,t])=>`<div class="pw-perk${l>=lv?' on':''}"><b>Lv ${lv}</b><span>${t}</span></div>`).join('')}</div>
      <div class="legend">Crews pay the normal price for the levels when a job is done and never spend more than the budget share of your coins, so you can still buy by hand at any time. Milestones they reach double the speed and hire yard workers as usual. The yard stays built when you Replant; building levels and their costs reset as before.</div>`;
    $('buildBody').innerHTML=h;
    $('byBuy').onclick=()=>{if(buyBuilders()){bySig='';render();}};
    const pb=$('byPlan'); if(pb) pb.querySelectorAll('button').forEach(b=>b.onclick=()=>{setBuildersPlan(b.dataset.p);bySig='';haptic&&haptic(5);render();});
    const bu=$('byBud'); if(bu) bu.querySelectorAll('button').forEach(b=>b.onclick=()=>{setBuildersBudget(b.dataset.v);bySig='';haptic&&haptic(5);render();});
    const on=$('byOn'); if(on) on.onchange=()=>{setBuildersOn(on.checked);bySig='';render();};
    const ch=$('byChips'); if(ch) ch.querySelectorAll('.by-chip').forEach(b=>b.onclick=()=>{setBuildersAllow(b.dataset.b,!byAllowed(b.dataset.b));bySig='';haptic&&haptic(5);render();});
  }
  const b=$('byBuy'),c=byCost();
  const bh=l>=BY_MAX?'Builders\' Yard at max level':!byUnlocked()?'🔒 Build three factory buildings first':costBtnHtml(l?`⬆ Upgrade to Lv ${l+1} (${byCrews(l+1)} crew${byCrews(l+1)>1?'s':''} · ${byBatch(l+1)} Lv/job)`:'🏗️ Build the Builders\' Yard',c);
  if(b._h!==bh){b.innerHTML=bh;b._h=bh;} b.disabled=l>=BY_MAX||!byUnlocked()||S.coins+1e-9<c;
  const tx=l?`${byCrews()} crew${byCrews()>1?'s':''} · up to ${byBatch()} levels per job · ${byDur()}s on site.`:`Construction crews that upgrade your buildings on their own while you play and while you're away. Pick a plan and how much of your coins they may spend.`;
  const te=$('byTx'); if(te._t!==tx){te.innerHTML=tx;te._t=tx;}
  if(l){
    const se=$('bySt'),sh=(st.k==='ok'?'🏗️ ':st.k==='wait'?'⏳ ':st.k==='off'?'⏸ ':'⚠ ')+st.t; const sk={ok:'',wait:'low',off:'off',idle:'nofuel'}[st.k]||'';
    if(se._t!==sh){se.textContent=sh;se._t=sh;se.className='pw-status '+sk;}
    let ch='';for(let k=0;k<byCrews();k++){const j=B.jobs[k];
      if(!j){ch+=`<div class="by-crew idle"><span class="bc-ic">🦺</span><div class="bc-m"><b>Crew ${k+1}</b><small>${B.on===false?'At the yard (off)':'Free · looking for work'}</small></div></div>`;continue;}
      const bd=BMAP[j.bid],p=Math.min(1,j.t/j.dur);
      ch+=`<div class="by-crew${j.st==='wait'?' wait':''}" data-b="${j.bid}"><span class="bc-ic">${bd.icon}</span><div class="bc-m"><b>${bd.name} <em>+${j.n} Lv</em></b><small>${j.st==='wait'?'Waiting for coins to pay':'Lv '+S.buildings[j.bid].lvl+' → '+(S.buildings[j.bid].lvl+j.n)+' · '+Math.max(0,Math.ceil(j.dur-j.t))+'s'}</small><span class="bc-bar"><i style="width:${(p*100).toFixed(0)}%"></i></span></div></div>`;}
    const ce=$('byCrews'); if(ce._t!==ch){ce.innerHTML=ch;ce._t=ch;ce.querySelectorAll('.by-crew[data-b]').forEach(e=>e.onclick=()=>{if(typeof focusLot==='function') focusLot(e.dataset.b,true);});}
    const bt=`A crew may spend up to <b>🪙 ${fmt(byBudget())}</b> per job (${B.budget>=1?'all':Math.round(B.budget*100)+'%'} of your coins).`;
    const be=$('byBudTx'); if(be._t!==bt){be.innerHTML=bt;be._t=bt;}
    const kv=[['Levels built',fmt(B.stats.lv)],['Coins spent',`🪙 ${fmt(B.stats.spent)}`],['Jobs done',fmt(B.stats.jobs)],['Per job',`up to ${byBatch()} levels · ${byDur()}s`]];
    const kh=kv.map(([a,v])=>`<div><span>${a}</span><b>${v}</b></div>`).join(''); const ke=$('byKv'); if(ke._t!==kh){ke.innerHTML=kh;ke._t=kh;}}
}
/* building sheet: auto-build switch + what the crew is doing here */
function updateBldBy(b){
  const el=$('bpBy'); if(!el) return; const st=S.buildings[b.id];
  if(!byLvl()||!st||!st.lvl){el.classList.add('hidden');return;} el.classList.remove('hidden');
  if(el.dataset.id!==b.id){el.dataset.id=b.id;el.innerHTML=`<span class="bby-t" id="bpByT"></span><label class="sw" title="Let the Builders' Yard crews upgrade this building"><input type="checkbox" id="bpByOn"><span class="tr"></span><span>Auto-build</span></label>`;
    const cb=$('bpByOn'); cb.onchange=()=>{setBuildersAllow(b.id,cb.checked);bySig='';render();};}
  const cb=$('bpByOn'); if(cb.checked!==byAllowed(b.id)) cb.checked=byAllowed(b.id);
  const j=byJobOf(b.id),B=S.builders;
  const t=j?(j.st==='wait'?`🏗️ Crew on site · waiting for coins (+${j.n} Lv)`:`🏗️ Crew on site · +${j.n} Lv · ${Math.round(Math.min(1,j.t/j.dur)*100)}%`):!byAllowed(b.id)?'🏗️ Builders keep away':B.on===false?'🏗️ Builders\' Yard is off':'🏗️ Builders may upgrade this';
  const te=$('bpByT'); if(te._t!==t){te.textContent=t;te._t=t;}
}
