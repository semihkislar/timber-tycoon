'use strict';
/* ===================== v2.37: SEASONAL EXPORT CONTRACTS (maintenance proposal 9) =====================
   Every season of the v2.3 world clock brings one themed export contract from a foreign buyer:
     🌸 spring  Spring Building Season  timber-frame houses, glulam, beams, panels, planks
     🌻 summer  Summer Leisure Export   boats, toys, artisan flooring (decking), grill gift boxes, chairs, bark mulch
     🍂 autumn  Autumn Home Fair        luxury furniture, decor, cabinets, furniture sets, stationery, chairs, paper
     ❄️ winter  Winter Heating Export   pellets, charcoal, wooden toys, gift boxes, wood chips
   The contract asks for the first SC_LINES goods of the season's list that the factory really makes (the list runs from the
   top product down, so a late factory gets houses + glulam in spring and an early one planks). Logs are never asked for.
   Sizing follows the v2.25 rules (output-based amounts, value floors, proportional rewards), per line:
   - window W = min(SC_WIN, 60 % of the season time left); amount = real smoothed output (scRate, ≤ the line's potential)
     × W × SC_FRAC × SC_MULT (= half the output over W), ≥ 20 units, worth ≥ the forest-value floor, and deliverable
     (≤ 60 % of the output over W + stock). The whole contract must be worth ≥ SC_MIN_SEC (1) s of this run's income
     (scGoods), so cheap headline goods such as pellets still make the list next to a valuable one;
   - reward = ordPay(amt, good, seasonLeft, 1.5, 2.5, SC_INC_K) (1.5–2.5 × the goods' value) × SC_PAY seasonal premium
     × 1.25 for premium goods × managers × research. +1 🌱 for a premium line late in a run (like premium client orders).
   Until you accept, the offer follows your output (re-sized every 10 s when it moves ≥ 15 %). The deadline is the end of
   the season. It runs in its own slot (no client order slot) and takes ≥ SC_SHARE of each line's output (before the power
   plant takes its fuel) plus the surplus, or delivers from storage. Missing it costs nothing. Unlock: a Phase II line
   running and SC_UNLOCK × forest value earned this run (so the first minutes of a run play exactly as before). Replant ends the contract in hand; trophies, counters
   and "this season is done" stay. */
const SC_LINES=2, SC_WIN=480, SC_FRAC=.25, SC_MULT=2, SC_INC_K=.1, SC_PAY=1.2, SC_SHARE=.5, SC_UNLOCK=5e4, SC_MIN_LEFT=180, SC_LEAD=8, SC_MIN_SEC=1;
const SC_THEMES={
  spring:{n:'Spring Building Season',c:'Nordic Housing Fair',e:'🏡',g:['houses','glulam','beams','panels','planks'],tr:'Spring Builder',
    d:'Towns rebuild after the thaw: frames, beams and timber for new homes.'},
  summer:{n:'Summer Leisure Export',c:'Riviera Leisure Co.',e:'⛵',g:['boats','toys','flooring','giftbox','chairs','bark'],tr:'Summer Trader',
    d:'Marinas, terraces and garden parties want boats, toys, decking and grill boxes.'},
  autumn:{n:'Autumn Home Fair',c:'Harvest Home Fair',e:'🛋️',g:['luxfurn','decor','cabinets','furniture','stationery','chairs','paper'],tr:'Harvest Fair',
    d:'Furniture season: homes refurnish before winter, and schools restock.'},
  winter:{n:'Winter Heating Export',c:'Nordic Heating Co-op',e:'🔥',g:['pellets','charcoal','toys','giftbox','chips'],tr:'Winter Supplier',
    d:'Heating season up north: pellets and charcoal by the shipload, toys and gift boxes for the holidays.'},
};
const SC_IDS=['spring','summer','autumn','winter'];
function scLen(){return DAY_LEN*SEASON_DAYS;}
function scKey(c){c=c===undefined?wxClock():c;return Math.floor(c/scLen());}
function scLeft(){const L=scLen();return L-(wxClock()%L);}
function scSid(){return season().id;}
function scFresh(){return {key:-1,st:'wait',c:null,won:{spring:0,summer:0,autumn:0,winter:0},total:0,failed:0,earned:0,hist:[],next:0};}
function scState(){let s=S.seas;if(!s||typeof s!=='object'||Array.isArray(s)) s=S.seas=scFresh();return scNorm(s);}
// v2.36 and older saves have no S.seas; damaged fields fall back to the defaults, a damaged contract is dropped
function scNorm(s){
  const f=scFresh();
  if(!s.won||typeof s.won!=='object'||Array.isArray(s.won)) s.won=f.won;
  for(const k of SC_IDS) s.won[k]=Math.max(0,Math.floor(+s.won[k]||0));
  for(const k of ['total','failed','earned']) if(!(isFinite(s[k])&&s[k]>=0)) s[k]=0;
  if(!Number.isFinite(s.key)) s.key=-1; if(!Number.isFinite(s.next)) s.next=0;
  if(!Array.isArray(s.hist)) s.hist=[]; s.hist=s.hist.filter(h=>h&&typeof h==='object').slice(-6);
  if(!['wait','offer','run','done','missed','skip'].includes(s.st)) s.st='wait';
  const c=s.c, good=c&&typeof c==='object'&&SC_THEMES[c.sid]&&Array.isArray(c.lines)&&c.lines.length>=1&&c.lines.length<=3
    &&c.lines.every(l=>l&&RMAP[l.item]&&canSell(l.item)&&isFinite(l.amt)&&l.amt>0&&isFinite(l.got)&&l.got>=0)&&isFinite(c.reward)&&c.reward>0&&Number.isFinite(c.key);
  if(!good) s.c=null;
  if(!s.c&&(s.st==='offer'||s.st==='run')) s.st='wait';
  if(s.c&&s.st!=='offer'&&s.st!=='run') s.c=null;
  return s;
}
function scPhase2(){return BUILDINGS.some(b=>typeof BTIER==='object'&&BTIER[b.id]===2&&S.buildings[b.id]&&S.buildings[b.id].lvl>0);}
function scOpen(){return ordersOpen()&&scPhase2()&&S.totalEarned>=SC_UNLOCK*cs();}
// lines: the season's headline good (first of the list the factory makes) + the most valuable other themed good it makes.
// Each line is ≥ 20 units and worth ≥ the forest-value floor; the contract as a whole must be worth ≥ SC_MIN_SEC s of this
// run's income, otherwise the two most valuable themed goods are used instead (no contract if even they are too small).
function scGoods(sid,T){
  const th=SC_THEMES[sid], C=[];
  for(const k of th.g){if(!RMAP[k]||!canSell(k)) continue;const l=scLine(k,T);if(l.ok) C.push(l);}
  if(!C.length) return [];
  const floor=SC_MIN_SEC*ordInc(), byVal=C.slice(1).sort((a,b)=>b.val-a.val);
  let L=[C[0]].concat(byVal.slice(0,SC_LINES-1));
  if(L.reduce((a,l)=>a+l.val,0)<floor) L=C.slice().sort((a,b)=>b.val-a.val).slice(0,SC_LINES);
  if(L.reduce((a,l)=>a+l.val,0)<floor) return [];
  return L.sort((a,b)=>th.g.indexOf(a.item)-th.g.indexOf(b.item));
}
function scWin(T){return Math.max(60,Math.min(SC_WIN,T*.6));}
// rate = what the line really makes now (smoothed output, never above its potential): a starved workshop is not asked for
function scRate(k){const pot=prodRate(k),sm=(rates[k]&&rates[k].p)||0;return pot>0?Math.min(pot,sm):0;}
function scLine(k,T){const W=scWin(T),d=scRate(k),pr=Math.max(1e-12,price(k)),stock=Math.max(0,S.res[k]||0);
  const cap=d*W*ORD_FEAS+stock*.8, fl=Math.max(ORD_MIN_UNITS,ORD_MIN_SEC*ORD_IDLE_INC*cs()/pr);   // v2.25 feasibility + forest-value floor per line
  const ok=d>0.02&&cap>=fl, amt=niceNum(Math.max(d*W*SC_FRAC*SC_MULT,fl));
  return {item:k,amt,ok,val:amt*pr};}
function scLineReward(l,T){const r=RMAP[l.item];return ordPay(l.amt,l.item,T,1.5,2.5,SC_INC_K)*SC_PAY*(r.premium?1.25:1)*mgrOrders()*(M.orderPay||1);}
function scReward(lines,T){return niceNum(lines.reduce((a,l)=>a+scLineReward(l,T),0));}
function scSeedOk(c){return c.lines.some(l=>RMAP[l.item].premium)&&S.totalEarned>=1e7*cs();}
function scMake(){
  const sid=scSid(), T=scLeft(), L=scGoods(sid,T); if(!L.length) return null; const th=SC_THEMES[sid];
  const c={id:Math.floor(Math.random()*1e9),key:scKey(),sid,n:th.n,client:th.c,e:th.e,lines:L.map(l=>({item:l.item,amt:l.amt,got:0})),reward:0};
  c.reward=scReward(c.lines,T); c.seed=scSeedOk(c); return c;
}
// offers follow the output until accepted (same goods; only when the change is worth showing)
function scResize(){const s=scState(),c=s.c;if(!c||s.st!=='offer') return 0;const T=scLeft();let n=0;
  for(const l of c.lines){const x=scLine(l.item,T);if(!(x.amt>0)) continue;if(Math.abs(x.amt/l.amt-1)>=.15){l.amt=x.amt;n++;}}
  if(n){c.reward=scReward(c.lines,T);c.seed=scSeedOk(c);scSig='';}return n;}
function scOffer(force){const s=scState();if(s.c) return false;const c=scMake();if(!c) return false;s.c=c;s.st='offer';s.key=c.key;scSig='';
  if(typeof toast==='function') toast(`${season().e} <b>${c.n}</b>: ${c.client} wants ${scLinesTxt(c)} before the season ends. Open Orders → Season.`,5200);
  if(typeof sfx==='function') sfx('event'); return true;}
function scLinesTxt(c){return c.lines.map(l=>`<b>${fmt(l.amt)} × ${resName(l.item)}</b>`).join(' + ');}
function scAccept(){const s=scState(),c=s.c;if(!c||s.st!=='offer') return false;
  // re-sized on today's output when you sign
  const T=scLeft();for(const l of c.lines){const x=scLine(l.item,T);if(x.amt>0) l.amt=x.amt;l.got=0;} c.reward=scReward(c.lines,T); c.seed=scSeedOk(c);
  s.st='run'; c.started=S.time; scSig=''; if(typeof sfx==='function') sfx('buy'); if(typeof haptic==='function') haptic(8); render(); return true;}
function scSkip(){const s=scState();if(s.st!=='offer') return false;s.c=null;s.st='skip';scSig='';render();return true;}
function scDeliver(){const s=scState(),c=s.c;if(!c||s.st!=='run') return 0;let n=0;
  for(const l of c.lines){const k=Math.min(S.res[l.item]||0,l.amt-l.got);if(k>0){S.res[l.item]-=k;l.got+=k;n+=k;}}
  if(scDoneAll(c)) scComplete(false); render(); return n;}
function scDoneAll(c){return c.lines.every(l=>l.got>=l.amt-1e-6);}
function scPct(c){return c.lines.reduce((a,l)=>a+Math.min(1,l.got/l.amt),0)/c.lines.length;}
// priority fill, in two steps per tick:
//   'pri' (before the power plant takes its fuel): ≥ SC_SHARE of this tick's output of each line (a signed export contract is
//          loaded before pellets / chips go into the boiler; shared with client orders and dailies via priBudget)
//   'sur' (after the power plant, before auto-sell): whatever surplus is left above the downstream buffer
function scCollect(demand,dt,offline,pend,phase){
  const s=S.seas; if(!s||s.st!=='run'||!s.c) return; const c=s.c;
  for(const l of c.lines){const k=l.item,need=l.amt-l.got; if(need<=1e-9) continue;
    const reserve=(demand[k]/dt)*Math.max(BUFFER_SEC,dt*1.5), sur=Math.max(0,S.res[k]-reserve);
    if(phase==='pri'){const take=Math.min(need,S.res[k],priBudget(k,SC_SHARE*((pend&&pend[k])||0),pend));if(take>1e-9){S.res[k]-=take;l.got+=take;priTook(k,take);}}
    else {const take=Math.min(need,sur);if(take>1e-9){S.res[k]-=take;l.got+=take;}}}
  if(scDoneAll(c)) scComplete(offline);
}
function scComplete(offline){
  const s=S.seas,c=s.c; if(!c) return; earn(c.reward); let extra='';
  if(c.seed){S.seeds+=1;extra=' +1 🌱 Seed';}
  s.won[c.sid]=(s.won[c.sid]||0)+1; s.total++; s.earned+=c.reward;
  s.hist=s.hist.concat([{sid:c.sid,e:c.e,n:c.n,lines:c.lines.map(l=>({item:l.item,amt:l.amt})),reward:c.reward,ok:true}]).slice(-6);
  s.c=null; s.st='done'; scSig=''; M=computeMods();
  if(!offline){toast(`${c.e} <b>${c.n}</b> delivered to ${c.client}! +🪙${fmt(c.reward)}${extra}`,5200,'ms-toast');if(typeof confettiBurst==='function') confettiBurst();sfx('unlock');
    if(typeof spawnCourierVan==='function') try{spawnCourierVan({item:c.lines[0].item,logo:'EXPORT'});}catch(e){}
    if(typeof checkAch==='function') checkAch(); if(typeof renderEvents==='function') renderEvents(true);}
}
function scFail(offline){const s=S.seas,c=s.c;if(!c) return;s.failed++;
  s.hist=s.hist.concat([{sid:c.sid,e:c.e,n:c.n,lines:c.lines.map(l=>({item:l.item,amt:l.amt})),reward:c.reward,ok:false,pct:scPct(c)}]).slice(-6);
  s.c=null; scSig='';
  if(!offline&&typeof toast==='function') toast(`${c.e} The season ended before <b>${c.n}</b> was filled (${Math.round(scPct(c)*100)}%). No penalty: a new season brings a new contract.`,4800);}
function scTick(dt,offline){
  const s=scState(), key=scKey();
  if(s.key!==key){   // a new season: the running contract ends, a new one is drawn shortly
    if(s.st==='run') scFail(offline);
    s.key=key; s.st='wait'; s.c=null; s.next=S.time+SC_LEAD; scSig='';}
  if(s.st==='offer'){if(scLeft()<SC_MIN_LEFT){s.c=null;s.st='missed';scSig='';return;} if((S.time%10)<dt) scResize(); return;}
  if(s.st!=='wait'||offline) return;
  if(S.time<s.next||scLeft()<SC_MIN_LEFT+60||!scOpen()) return;
  if(!scOffer()) s.next=S.time+20;
}
function scKeep(){const s=scState();return {key:s.key,st:s.st==='offer'||s.st==='run'?'wait':s.st,c:null,won:Object.assign({},s.won),total:s.total,failed:s.failed,earned:s.earned,hist:s.hist.slice(-6),next:0};}
function scYear(){const s=S.seas;if(!s||!s.won) return 0;return SC_IDS.filter(k=>s.won[k]>0).length;}
function scWon(k){return (S.seas&&S.seas.won&&S.seas.won[k])||0;}
function scAttn(){const s=S.seas;return !!(s&&s.st==='offer');}
function openSeason(){openSheet('ord');ordTab='season';ordSig='';updateOrders();}

/* ---------- UI: the Season tab of the Orders sheet ---------- */
let scSig='';
function scSigOf(){const s=S.seas;if(!s) return '-';const c=s.c;return s.key+':'+s.st+':'+s.total+':'+scOpen()+':'+(c?c.id+':'+c.lines.map(l=>l.amt).join(',')+':'+c.reward:'');}
function scPaneHtml(){
  const s=scState(), se=season(), th=SC_THEMES[se.id], c=s.c, nx=SEASONS[(seasonIdx()+1)%4], open=scOpen();
  let h=`<div class="sc-hero sc-${se.id}"><div class="dh-ic">${se.e}</div><div style="flex:1;min-width:0"><div class="dh-t">${th.n}</div>
    <div class="legend" style="margin:2px 0 0">${th.d}</div></div></div>
    <div class="bstatus"><div class="bar"><i id="scSeasonBar"></i></div><span class="chip off" id="scLeftChip"></span></div>`;
  if(!open){
    h+=`<div class="hint" id="scLock">🔓 Seasonal export contracts open once a <b>Phase II</b> line is running and you have earned 🪙${fmt(SC_UNLOCK*cs())} this run. One themed contract per season, with a trophy for each season.</div>`;
  } else if(c){
    const run=s.st==='run';
    h+=`<div class="ord-card sc-card${run?' run':''}" id="scCard" data-scid="${c.id}"><div class="oc-h"><span class="oc-e big">${c.e}</span><div class="oc-t"><small>${se.e} ${run?'Seasonal contract · in progress':'Seasonal export contract · offer'}</small><b>${c.client}</b></div></div>
      <div class="sc-lines">${c.lines.map((l,i)=>{const r=RMAP[l.item];return `<div class="sc-line" data-scl="${i}"><span class="oc-ic">${svgIcon(r.svg,22)}</span><div class="sc-tx"><b>${fmt(l.amt)} × ${r.name}</b>${run?`<div class="bar"><i id="scLb${i}"></i></div><small id="scLt${i}"></small>`:`<small id="scLt${i}"></small>`}</div></div>`;}).join('')}</div>
      <div class="sc-rw"><span>Reward</span><b>🪙 ${fmt(c.reward)}${c.seed?' + 1 🌱':''}</b><span class="sc-tr${scWon(c.sid)?' on':''}">🏆 ${SC_THEMES[c.sid].tr}${scWon(c.sid)?' ✔':''}</span></div>
      <div class="legend" id="scTx"></div>
      <div class="brow">${run?`<button class="btn wood" id="scDel" style="flex:1"></button>`:`<button class="btn red" id="scNo">Skip</button><button class="btn gold" id="scYes" style="flex:1">${se.e} Sign the contract</button>`}</div></div>`;
  } else {
    const t=s.st==='done'?`✅ This season's contract is delivered. ${nx.e} <b>${nx.n}</b> brings the next one.`
      :s.st==='skip'?`⏭ Skipped this season. ${nx.e} <b>${nx.n}</b> brings the next contract.`
      :s.st==='missed'?`⌛ This season's offer has passed. ${nx.e} <b>${nx.n}</b> brings the next contract.`
      :`☎️ ${th.c} is drawing up this season's contract for ${th.g.filter(k=>RMAP[k]).slice(0,3).map(resName).join(', ')}…`;
    h+=`<div class="hint" id="scIdle">${t}</div>`;
    if(s.st==='wait'&&!scGoods(se.id,scLeft()).length) h+=`<div class="legend">This season's buyers want ${th.g.map(resName).join(', ')}. Your factory doesn't make enough of any of them yet.</div>`;
  }
  h+=`<h4>🗓️ Seasons</h4><div class="sc-year">${SC_IDS.map((k,i)=>{const w=scWon(k),x=SEASONS[i];return `<div class="${w?'on':''}${k===se.id?' cur':''}"><i>${x.e}</i><small>${SC_THEMES[k].tr}</small><b>${w?'✔ ×'+w:'—'}</b></div>`;}).join('')}</div>`;
  h+=`<div class="kv"><div>Delivered</div><div>${s.total}</div><div>Missed</div><div>${s.failed}</div><div>Earned</div><div>🪙${fmt(s.earned)}</div></div>`;
  if(s.hist.length) h+=`<div class="list" style="margin-top:7px">${s.hist.slice().reverse().map(x=>`<div class="hrow ${x.ok?'ok':'no'}"><span>${x.e}</span><span>${(x.lines||[]).map(l=>fmt(l.amt)+' × '+resName(l.item)).join(' + ')}<small>${x.n}</small></span><b>${x.ok?'+🪙'+fmt(x.reward):'missed'}</b></div>`).join('')}</div>`;
  h+=`<div class="legend">Each season (${fmtTime(scLen())}) a buyer asks for up to ${SC_LINES} of its goods, sized on what your lines make and on your forest value. Rewards are about 1.5–2.5× the goods' value plus a ${Math.round((SC_PAY-1)*100)}% seasonal premium. A signed contract runs in its own slot until the season ends: it takes the surplus plus at least ${Math.round(SC_SHARE*100)}% of each line's output, or delivers from storage. Missing it costs nothing.</div>`;
  return h;
}
function scBind(){const y=$('scYes'),n=$('scNo'),d=$('scDel');
  if(y) y.onclick=()=>scAccept(); if(n) n.onclick=()=>scSkip();
  if(d) d.onclick=()=>{const k=scDeliver();if(k>0){const rc=d.getBoundingClientRect();floatText(rc.left+rc.width/2,rc.top-4,'+'+fmt(k),$('fxLayer'));}};}
function scLive(){
  const s=S.seas; if(!s) return; const L=scLen(), left=scLeft();
  const sb=$('scSeasonBar'); if(sb) sb.style.width=((1-left/L)*100).toFixed(1)+'%';
  const ch=$('scLeftChip'); if(ch){const t=`${SEASONS[(seasonIdx()+1)%4].e} ${SEASONS[(seasonIdx()+1)%4].n} in ${fmtTime(left)}`;if(ch._t!==t){ch.textContent=t;ch._t=t;}}
  const c=s.c; if(!c) return; const run=s.st==='run';
  c.lines.forEach((l,i)=>{const t=$('scLt'+i);if(!t) return;const tx=run?`${fmt(l.got)} / ${fmt(l.amt)} · ≈${fr(prodRate(l.item))}/s made · ${fmt(S.res[l.item])} in storage`:`you make ≈${fr(prodRate(l.item))}/s`;if(t._t!==tx){t.textContent=tx;t._t=tx;}
    const b=$('scLb'+i);if(b) b.style.width=Math.min(100,l.got/l.amt*100).toFixed(1)+'%';});
  const tx=$('scTx'); if(tx){const t=run?`Due by the end of ${season().n} (${fmtTime(left)}). Each line takes its surplus plus ≥${Math.round(SC_SHARE*100)}% of its output.`
      :`Amounts follow your output until you sign. Due by the end of ${season().n}: <b>${fmtTime(left)}</b>. It doesn't use a client order slot.`;if(tx._t!==t){tx.innerHTML=t;tx._t=t;}}
  const d=$('scDel'); if(d){const k=c.lines.reduce((a,l)=>a+Math.max(0,Math.min(S.res[l.item]||0,l.amt-l.got)),0);const dh=`📦 Deliver from storage (${fmt(k)})`;if(d._h!==dh){d.innerHTML=dh;d._h=dh;}d.disabled=k<1;}
}
/* ---------- HUD: a small badge on the season chip (desktop) ---------- */
let scBadgeSig='';
function updateScBadge(){
  const chip=$('wxChip'); if(!chip) return; let b=$('wxSc');
  if(!b){b=document.createElement('span');b.id='wxSc';b.className='wx-sc hidden';b.title='Seasonal export contract (tap to open)';chip.insertBefore(b,$('wxClk'));
    b.addEventListener('click',e=>{e.stopPropagation();openSeason();});}
  const s=S.seas, st=s?s.st:'wait', c=s&&s.c;
  const t=st==='run'&&c?`📦 ${Math.floor(scPct(c)*100)}%`:st==='offer'?'📦 New':'';
  const sig=t+'|'+st; if(sig===scBadgeSig) return; scBadgeSig=sig;
  b.textContent=t; b.classList.toggle('hidden',!t); b.classList.toggle('new',st==='offer');
}
// one line in the season popup (tap the season chip)
function scPopHtml(){const s=S.seas,th=SC_THEMES[season().id];if(!s||!scOpen()) return '';
  const t=s.st==='run'&&s.c?`📦 ${th.n}: <b>${Math.floor(scPct(s.c)*100)}%</b>`:s.st==='offer'?`📦 New: <b>${th.n}</b>`:s.st==='done'?`✅ ${th.n} delivered`:`📦 ${th.n}`;
  return `<div class="wx-sc-row"><span>${t}</span><button class="btn small gold" id="wxScGo">Open</button></div>`;}
