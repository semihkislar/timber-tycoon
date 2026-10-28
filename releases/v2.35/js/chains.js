'use strict';
/* ===================== v2.34: ORDER CHAINS (item 11) =====================
   A client project of CH_STEPS client orders for the same customer. Only the first order is on offer; each delivered order
   unlocks the next, larger one (straight into the same slot), and the last one pays a chain bonus on top.
   Built on the v2.25 order rules, never replacing them:
   - every step is sized with ordPlan() (real output, ≥ 20 units, value floor = seconds of this run's income, forest value
     as the floor), with a growing difficulty factor CH_MULT[i] (the same knob daily contracts use) and at least
     CH_GROW × the previous step's goods value;
   - every step pays ordPay(amt, good, dur, 1.5, 2.5, .15) × premium 1.25 × managers × research — exactly a v2.25 client
     order — times a small loyalty step CH_STEP[i] (×1, ×1.1, ×1.2), so rewards stay proportional to the goods;
   - the chain bonus is CH_BONUS (30 %) of the steps' rewards, paid with the last delivery (+1 🌱 for a premium project late
     in a run, like a premium client order).
   A step that runs out of time ends the project (no penalty; earlier steps are paid). Replant clears the project in hand
   and keeps the counters; a new run sizes everything on the new run's output and forest value. */
const CH_STEPS=3, CH_MULT=[1,1.5,2.2], CH_DUR=[180,240,300], CH_STEP=[1,1.1,1.2], CH_GROW=1.4, CH_BONUS=.3, CH_OFFER_SEC=300, CH_MAX_DUR=900;
const CH_RW_GROW=1.25;   // each step pays at least 1.25 × the previous one (still inside the v2.25 band × CH_STEP, see chPlanStep)
// story projects: client + one list of candidate goods per step (first good the factory makes wins; steps never repeat a good)
const CHAINS=[
  {k:'chalet',n:'Mountain Chalet',c:'Alpine Chalet Developers',e:'🏔️',s:[['beams','planks'],['glulam','flooring','furniture'],['houses','decor','cabinets','luxfurn']],
   t:['Frame timber for the chalet','The roof and the floors','Move-in day']},
  {k:'hotel',n:'Hotel Refit',c:'Grand Bosphorus Hotel',e:'🏨',s:[['chairs','planks'],['furniture','flooring'],['luxfurn','cabinets','decor']],
   t:['Chairs for the terrace','Furnishing the rooms','The royal suite']},
  {k:'suites',n:'Suite Interiors',c:'Boutique Hotel Group',e:'🛎️',s:[['veneer','plywood','planks'],['panels','cabinets','chairs'],['decor','luxfurn','furniture']],
   t:['Veneer samples','Wall panelling','Decor for every suite']},
  {k:'library',n:'Embassy Library',c:'Royal Embassy',e:'🏛️',s:[['paper','planks'],['stationery','chairs','furniture'],['cabinets','luxfurn','furniture']],
   t:['Archive paper','Reading-room furniture','Library cabinets']},
  {k:'yacht',n:'Yacht Fit-out',c:'Luxury Yacht Builder',e:'⛵',s:[['planks','veneer'],['plywood','flooring','chairs'],['cabinets','boats','furniture']],
   t:['Deck timber','Hull and decks','The owner\'s cabin']},
  {k:'grill',n:'Grill Season',c:'BBQ Masters Club',e:'🔥',s:[['chips','charcoal'],['pellets','charcoal'],['giftbox','chairs','paper']],
   t:['Smoking chips','Fuel for the season','Gift boxes for members']},
  {k:'district',n:'New District',c:'City Builders Co.',e:'🏗️',s:[['planks','chips'],['beams','chairs','pellets'],['glulam','furniture','paper','houses']],
   t:['Site timber','Framing and fit-out','Handover']},
];
const CHMAP={};CHAINS.forEach(c=>CHMAP[c.k]=c);
function chainsOpen(){const O=S.orders;return ordersOpen()&&((O&&O.done>=2)||S.prestiges>0)&&S.totalEarned>=2e4*cs();}
function chOk(k){return RMAP[k]&&canSell(k)&&prodRate(k)>0.02;}
// size step i of a project on what the factory makes now
//   prevVal / prevRw: goods value and reward of the step before (the step must be ≥ CH_GROW × that value, and pay ≥ CH_RW_GROW ×)
//   keepAmt: the amount shown so far (a step never shrinks when it unlocks), maxVal: keep room for the later steps to grow
function chPlanStep(item,i,prevVal,prevRw,keepAmt,maxVal){
  const pr=Math.max(1e-12,price(item)), r=RMAP[item];
  const pl=ordPlan(item,CH_DUR[i],.3,CH_MULT[i]);
  const d=Math.max(1e-12,pl.d), stock=Math.max(0,S.res[item]||0), capMax=d*CH_MAX_DUR*ORD_FEAS+stock*.8;
  const floorU=Math.max(ORD_MIN_UNITS,pl.need), grow=prevVal>0?prevVal*CH_GROW/pr:0;   // v2.25 floor: ≥ 20 units and ≥ 5 s × difficulty of income
  let amt=Math.max(pl.amt,keepAmt||0);
  amt=Math.min(amt,Math.max(capMax,floorU));   // deliverable within the longest timer
  if(maxVal>0&&isFinite(maxVal)) amt=Math.min(amt,maxVal/pr);
  amt=niceNum(Math.max(amt,floorU,Math.min(grow,Math.max(capMax,floorU))));
  // time: the step's base timer, longer when the amount needs it (≤ 15 min)
  let dur=CH_DUR[i]; const need=Math.max(0,amt-stock*.8)/(d*ORD_FEAS); if(need>dur) dur=Math.min(CH_MAX_DUR,Math.ceil(need/30)*30);
  const m=(r.premium?1.25:1)*mgrOrders()*(M.orderPay||1)*CH_STEP[i];
  let reward=niceNum(ordPay(amt,item,dur,1.5,2.5,.15)*m);
  if(prevRw>0) reward=Math.min(Math.max(reward,niceNum(prevRw*CH_RW_GROW)),niceNum(amt*pr*2.5*m));   // never above the v2.25 band (× loyalty)
  return {item,amt,dur,reward,val:amt*pr,ok:pl.ok,fits:capMax>=Math.max(floorU,grow)*.999,capVal:Math.max(capMax,floorU)*pr};
}
// plan steps from..end (amounts of later steps are an estimate until they unlock); keep: amounts shown so far
function chPlanAll(goods,from,prevVal,prevRw,keep){
  from=from||0; const n=goods.length, cap=goods.map((k,i)=>i<from?0:chPlanStep(k,i,0,0).capVal), U=new Array(n).fill(Infinity);
  for(let i=n-2;i>=from;i--) U[i]=Math.min(U[i+1],cap[i+1])/CH_GROW;   // leave room for every later step to be CH_GROW × bigger
  const out=[];let pv=prevVal||0,pr=prevRw||0;
  for(let i=from;i<n;i++){const p=chPlanStep(goods[i],i,pv,pr,keep?keep[i]:0,U[i]);out.push(p);pv=p.val;pr=p.reward;}
  return out;
}
function chPick(tpl){const used=new Set(),g=[];for(const cand of tpl.s){const k=cand.find(x=>chOk(x)&&!used.has(x));if(!k) return null;used.add(k);g.push(k);}return g;}
function makeChain(forceKey){
  const O=ordNorm(), busy=new Set([...O.offers,...O.acts].map(o=>o.client));
  const L=[];
  for(const tpl of CHAINS){if(forceKey&&tpl.k!==forceKey) continue;const g=chPick(tpl);if(!g) continue;const st=chPlanAll(g);
    if(!forceKey&&!(st[0].ok&&st.every(x=>x.fits))) continue;
    L.push({tpl,g,st,w:st[st.length-1].val*(busy.has(tpl.c)?.3:1)*(O.chLast===tpl.k?.2:1)});}
  if(!L.length) return null;
  L.sort((a,b)=>b.w-a.w); const top=L.slice(0,3); const p=forceKey?top[0]:top[Math.floor(Math.random()*top.length)];
  const steps=p.st.map((x,i)=>({item:x.item,amt:x.amt,dur:x.dur,reward:x.reward,t:p.tpl.t[i]||'',got:0,done:false}));
  const ch={id:Math.floor(Math.random()*1e9),k:p.tpl.k,n:p.tpl.n,client:p.tpl.c,e:p.tpl.e,steps,step:0,state:'offer',expires:S.time+CH_OFFER_SEC,paid:0};
  ch.bonus=chBonus(ch); return ch;
}
function chBonus(ch){return niceNum(CH_BONUS*ch.steps.reduce((a,s)=>a+s.reward,0));}
function chSeed(ch){const last=ch.steps[ch.steps.length-1];return !!(RMAP[last.item]&&RMAP[last.item].premium&&S.totalEarned>=1e7*cs());}
function offerChain(forceKey){const O=ordNorm(); if(O.chain) return false; const ch=makeChain(forceKey); if(!ch) return false; O.chain=ch; chSig='';
  if(typeof toast==='function') toast(`🔗 <b>${ch.client}</b> has a ${ch.steps.length}-step project for you: <b>${ch.n}</b>. Open Orders → Clients.`,4800);
  if(typeof sfx==='function') sfx('event'); return true;}
// the step order that goes on the board (a normal v2.25 client order with ch / chStep / chN)
function chStepOrder(ch,i){const s=ch.steps[i];return {item:s.item,amt:s.amt,dur:s.dur,reward:s.reward,bonus:null,client:ch.client,e:ch.e,premium:!!RMAP[s.item].premium,got:0,
  ends:S.time+s.dur,id:Math.floor(Math.random()*1e9),ch:ch.id,chStep:i,chN:ch.steps.length};}
function acceptChain(){const O=ordNorm(), ch=O.chain; if(!ch||ch.state!=='offer') return false;
  if(O.acts.length>=ordSlots()){if(typeof toast==='function') toast(`🔗 All <b>${ordSlots()}</b> order slots are busy. Finish one to start the project.`,2600);return false;}
  // the first step is re-sized on today's output when you start (the offer may have waited a few minutes)
  const p=chPlanAll(ch.steps.map(s=>s.item)); p.forEach((x,i)=>Object.assign(ch.steps[i],{amt:x.amt,dur:x.dur,reward:x.reward})); ch.bonus=chBonus(ch);
  ch.state='run'; ch.step=0; ch.started=S.time; O.acts.push(chStepOrder(ch,0)); chSig=''; if(typeof sfx==='function') sfx('buy'); if(typeof orderFx==='function') orderFx('accept'); render(); return true;}
function declineChain(){const O=ordNorm(), ch=O.chain; if(!ch||ch.state!=='offer') return false; O.chain=null; O.chLast=ch.k; O.chNext=S.time+150+Math.random()*60; chSig=''; render(); return true;}
function chActOf(ch){const O=S.orders;return ch&&O&&O.acts?O.acts.find(o=>o.ch===ch.id):null;}
// called by completeOrder for a chain step: unlock the next step (re-sized now) or pay the chain bonus
function chainStepDone(o,offline){
  const O=S.orders, ch=O.chain; if(!ch||ch.id!==o.ch) return '';
  const s=ch.steps[o.chStep]; if(s){s.done=true;s.got=s.amt;} ch.paid+=o.reward;
  const nx=o.chStep+1;
  if(nx<ch.steps.length){
    // the next steps are re-sized on today's output (never smaller than shown, still bigger than the step just delivered)
    const prv=ch.steps[nx-1], p=chPlanAll(ch.steps.map(x=>x.item),nx,prv.amt*price(prv.item),prv.reward,ch.steps.map(x=>x.amt));
    p.forEach((x,j)=>Object.assign(ch.steps[nx+j],{amt:x.amt,dur:x.dur,reward:x.reward}));
    ch.bonus=chBonus(ch); ch.step=nx; O.acts.push(chStepOrder(ch,nx)); chSig='';
    return ` · 🔗 Step ${nx+1}/${ch.steps.length} unlocked: <b>${fmt(ch.steps[nx].amt)} × ${resName(ch.steps[nx].item)}</b>`;
  }
  // project complete
  const bonus=ch.bonus; earn(bonus); let extra='';
  if(chSeed(ch)){S.seeds+=1;extra=' +1 🌱 Seed';}
  O.chDone=(O.chDone||0)+1; O.chEarned=(O.chEarned||0)+ch.paid+bonus;
  O.chHist=(O.chHist||[]).concat([{k:ch.k,n:ch.n,e:ch.e,client:ch.client,paid:ch.paid+bonus,ok:true}]).slice(-4);
  O.chain=null; O.chLast=ch.k; O.chNext=S.time+120+Math.random()*60; chSig='';
  if(!offline&&typeof checkAch==='function') checkAch();
  return ` · 🔗 <b>${ch.n}</b> complete! Chain bonus +🪙${fmt(bonus)}${extra}`;
}
// a step ran out of time: the project ends (earlier steps stay paid, no penalty)
function chainStepFail(o,offline){
  const O=S.orders, ch=O.chain; if(!ch||ch.id!==o.ch) return;
  O.chFailed=(O.chFailed||0)+1; O.chHist=(O.chHist||[]).concat([{k:ch.k,n:ch.n,e:ch.e,client:ch.client,paid:ch.paid,ok:false,step:o.chStep+1}]).slice(-4);
  O.chain=null; O.chLast=ch.k; O.chNext=S.time+150+Math.random()*60; chSig='';
  if(!offline&&typeof toast==='function') toast(`🔗 ${ch.e} ${ch.client}: step ${o.chStep+1} of <b>${ch.n}</b> ran out of time, so the project ends. Steps already delivered stay paid.`,5000);
}
function chainTick(dt,offline){
  const O=S.orders; if(!O) return; const ch=O.chain;
  if(ch&&ch.state==='offer'&&S.time>=ch.expires){O.chain=null;O.chLast=ch.k;O.chNext=S.time+90;chSig='';return;}
  if(ch&&ch.state==='run'&&!chActOf(ch)){   // damaged save: the running step went missing → start it again, or end the project
    if(O.acts.length<ordSlots()){const pv=ch.step?ch.steps[ch.step-1]:null,P=chPlanAll(ch.steps.map(x=>x.item),ch.step,pv?pv.amt*price(pv.item):0,pv?pv.reward:0);P.forEach((x,j)=>Object.assign(ch.steps[ch.step+j],{amt:x.amt,dur:x.dur,reward:x.reward}));ch.bonus=chBonus(ch);O.acts.push(chStepOrder(ch,ch.step));}
    else {O.chain=null;O.chNext=S.time+120;} chSig=''; return;}
  if(offline||ch) return;
  if(!(O.chNext>0)){O.chNext=S.time+90;return;}
  if(S.time>=O.chNext&&chainsOpen()){if(!offerChain()) O.chNext=S.time+60;}
}
// v2.33 and older saves: no chain fields; damaged chains are dropped; chain steps without a project become plain orders
function chainNorm(O){
  if(!isFinite(O.chDone)||O.chDone<0) O.chDone=0; if(!isFinite(O.chFailed)||O.chFailed<0) O.chFailed=0; if(!isFinite(O.chEarned)||O.chEarned<0) O.chEarned=0;
  if(!isFinite(O.chNext)) O.chNext=0; if(!Array.isArray(O.chHist)) O.chHist=[];
  const ch=O.chain;
  const good=ch&&typeof ch==='object'&&Array.isArray(ch.steps)&&ch.steps.length>=2&&ch.steps.length<=4&&ch.steps.every(s=>s&&RMAP[s.item]&&isFinite(s.amt)&&s.amt>0&&isFinite(s.reward)&&isFinite(s.dur))
    &&(ch.state==='offer'||ch.state==='run')&&Number.isInteger(ch.step)&&ch.step>=0&&ch.step<ch.steps.length;
  if(!good) O.chain=null;
  else {if(!isFinite(ch.paid)) ch.paid=0;if(!isFinite(ch.bonus)) ch.bonus=chBonus(ch);if(!isFinite(ch.expires)) ch.expires=(S.time||0)+CH_OFFER_SEC;ch.n=ch.n||(CHMAP[ch.k]&&CHMAP[ch.k].n)||'Project';ch.e=ch.e||'🔗';ch.client=ch.client||'Client';}
  for(const o of O.acts) if(o.ch!==undefined&&!(O.chain&&O.chain.id===o.ch)){delete o.ch;delete o.chStep;delete o.chN;}
  return O;
}
/* ---------- UI: the project card on the Clients tab ---------- */
let chSig='';
function chainSigOf(){const ch=S.orders&&S.orders.chain;return ch?ch.id+':'+ch.state+':'+ch.step+':'+ch.steps.map(s=>s.amt+'/'+s.reward).join(','):'-';}
function chainCardHtml(slots,full){
  const ch=S.orders.chain; if(!ch) return '';
  const run=ch.state==='run', n=ch.steps.length;
  const rows=ch.steps.map((s,i)=>{const r=RMAP[s.item];const st=s.done?'done':run&&i===ch.step?'now':'lock';
    const ic=st==='done'?'✔':st==='now'?'▶':(i+1);
    return `<div class="ch-step ${st}" data-chstep="${i}"><span class="ch-n">${ic}</span><span class="oc-ic">${svgIcon(r.svg,20)}</span><div class="ch-tx"><b>${!s.done&&!(run&&i===ch.step)&&i>0?'≈ ':''}${fmt(s.amt)} × ${r.name}</b><small>${s.t||('Step '+(i+1))} · ${fmtTime(s.dur)}</small></div><span class="ch-rw">🪙 ${fmt(s.reward)}</span></div>`;}).join('');
  const seed=chSeed(ch)?' + 1 🌱':'';
  return `<div class="ord-card ord-chain${run?' run':''}" id="chCard" data-chid="${ch.id}">
    <div class="oc-h"><span class="oc-e big">${ch.e}</span><div class="oc-t"><small>🔗 ${run?`Project · step ${ch.step+1} of ${n}`:`New project · ${n} steps`}</small><b>${ch.n}</b><span class="ch-cl">${ch.client}</span></div></div>
    <div class="ch-pips" aria-hidden="true">${ch.steps.map((s,i)=>`<i class="${s.done?'done':run&&i===ch.step?'now':''}"></i>`).join('')}<i class="bonus">🎁</i></div>
    <div class="ch-steps">${rows}<div class="ch-step bonus"><span class="ch-n">🎁</span><div class="ch-tx"><b>Chain bonus</b><small>+${Math.round(CH_BONUS*100)}% of all steps · paid at the end</small></div><span class="ch-rw">🪙 ${fmt(ch.bonus)}${seed}</span></div></div>
    <div class="bstatus"><div class="bar"><i id="chBar"></i></div><span class="chip${run?'':' off'}" id="chChip"></span></div>
    <div class="legend" id="chTx"></div>
    <div class="brow">${run?`<button class="btn wood" data-chdel="1" id="chDel" style="flex:1"></button>`
      :`<button class="btn red" data-chno="1" id="chNo">Decline</button><button class="btn gold" data-chyes="1" id="chYes" style="flex:1" ${full?'disabled':''}>${full?`All ${slots} slots busy`:'🔗 Start project'}</button>`}</div></div>`;
}
function chainBind(){
  const y=$('chYes'),n=$('chNo'),d=$('chDel');
  if(y) y.onclick=()=>acceptChain(); if(n) n.onclick=()=>declineChain();
  if(d) d.onclick=()=>{const o=chActOf(S.orders.chain);if(!o) return;const k=deliverFromStock(o.id);if(k>0){const rc=d.getBoundingClientRect();floatText(rc.left+rc.width/2,rc.top-4,'+'+fmt(k),$('fxLayer'));}};
}
function chainLive(){
  const ch=S.orders.chain, bar=$('chBar'); if(!ch||!bar) return;
  const chip=$('chChip'), tx=$('chTx'), n=ch.steps.length;
  if(ch.state==='offer'){
    bar.style.width=Math.max(0,(ch.expires-S.time)/CH_OFFER_SEC*100)+'%'; chip.textContent='Offer ends in '+fmtTime(Math.max(0,ch.expires-S.time));
    const tot=ch.steps.reduce((a,s)=>a+s.reward,0)+ch.bonus;
    const t=`Each delivered order unlocks the next, bigger one in the same slot. Later amounts follow your output when they unlock. Whole project ≈ <b>🪙${fmt(tot)}</b>.`;
    if(tx._t!==t){tx.innerHTML=t;tx._t=t;} return;}
  const o=chActOf(ch); if(!o) return;
  const f=(ch.step+Math.min(1,o.got/o.amt))/n; bar.style.width=(f*100).toFixed(1)+'%';
  const left=o.ends-S.time; chip.className='chip'+(left<30?' bad':''); chip.textContent=`Step ${ch.step+1}/${n} · ${fmt(o.got)} / ${fmt(o.amt)} · ⏱ ${fmtTime(Math.max(0,left))}`;
  const t=`Collecting ${resName(o.item)} off the line (≈${fr(prodRate(o.item))}/s produced, ≥70% goes to this order). In storage: <b>${fmt(S.res[o.item])}</b>. Paid so far: 🪙${fmt(ch.paid)}.`;
  if(tx._t!==t){tx.innerHTML=t;tx._t=t;}
  const d=$('chDel'); if(d){const k=Math.min(S.res[o.item],o.amt-o.got);const dh=`📦 Deliver from storage (${fmt(k)})`;if(d._h!==dh){d.innerHTML=dh;d._h=dh;}d.disabled=k<1;}
}
