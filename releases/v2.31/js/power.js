'use strict';
/* ===================== v2.10 BIOMASS POWER PLANT (logic + sheet) =====================
   A plant on its own clearing north-east of the R&D campus burns a share of what the Pellet Press and the Charcoal Kiln can make
   and feeds the factory grid: every level gives +5% speed to ALL buildings while it has fuel. The plant takes its fuel before
   auto-sell, so it only runs short when the fuel buildings are off, on fire or starved. Its level is kept through Replant
   (like the fire station and the harbour); the boost needs the fuel buildings, which Replant resets as usual. */
const PW_MAX=10, PW_COST=2.5e5, PW_SCALE=5, PW_BOOST=.05;
const PW_FUELS={mix:{n:'Mix',e:'⚡',src:['pellets','charcoal']},pellets:{n:'Pellets',e:'🟤',src:['pellets']},charcoal:{n:'Charcoal',e:'⚫',src:['charcoal']}};
const PW_SRC={pellets:'pellet',charcoal:'kiln'};   // fuel -> the building that makes it
/* v2.24 log fuel: logs are raw material, so the plant only ever takes SURPLUS logs: what is left after every log user
   (Sawmill, Peeler, Chipper, Kiln) got its full share this tick, and never below a reserve kept in the Log Yard.
   'surplus' = pellets/charcoal first, logs fill the gap · 'first' = surplus logs first, pellets/charcoal for the rest · 'off' = never. */
const PW_LOGMODES={off:{n:'Off',e:'🚫',d:'Never burn logs'},surplus:{n:'Backup',e:'🔋',d:'Pellets/charcoal first, surplus logs fill the gap'},first:{n:'Logs first',e:'🪵',d:'Surplus logs first, pellets/charcoal for the rest'}};
const PW_RESERVES=[30,60,120,300];   // seconds of Phase-I log use always kept in the yard
const PW_LOG_FUEL=.3;                // fuel units per log (10 logs make 3 charcoal in the kiln)
function pwLogMode(){const m=S.power&&S.power.logs;return PW_LOGMODES[m]?m:'surplus';}
function pwReserveSec(){const r=S.power&&S.power.res;return PW_RESERVES.includes(r)?r:60;}
/* logs the plant must leave in the yard: the reserve, capped at 80 % of the yard so a full yard (collectors idling) is always usable */
function pwLogReserve(perSec){const d=perSec!==undefined?perSec:pwLogUse();return Math.min(pwReserveSec()*d,.8*logCap());}
/* Phase-I log demand per second at full speed */
function pwLogUse(){let t=0;for(const b of BUILDINGS){if(!b.inp.logs) continue;const st=S.buildings[b.id];if(!st.lvl||!st.on||onFire(b.id)) continue;t+=b.inp.logs*bSpeed(b.id)*bInMult(b.id);}return t;}
const PW_PERKS=[[1,'Boiler house, turbine hall, chimney and substation'],[3,'Cooling tower'],[5,'Twin fuel silos with a feed conveyor'],[7,'Second chimney'],[10,'Gold trim and the ★ flag']];
function pwState(){if(!S.power||typeof S.power!=='object') S.power={lvl:0,on:true,fuel:'mix',logs:'surplus',res:60,eff:0,burn:{}};return S.power;}
function pwLvl(){return (S.power&&S.power.lvl)||0;}
function pwCost(l){l=l===undefined?pwLvl():l;return PW_COST*Math.pow(PW_SCALE,l);}
function pwUnlocked(){return pwLvl()>0||S.buildings.pellet.lvl>0;}
function pwVisible(){return pwLvl()>0||S.buildings.kiln.lvl>0||S.buildings.pellet.lvl>0;}
function pwShare(l){l=l===undefined?pwLvl():l;return l?.15+.015*l:0;}
function pwMaxBoost(l){return PW_BOOST*(l===undefined?pwLvl():l);}
function pwEff(){const W=S.power;return W&&W.lvl&&W.on!==false?Math.max(0,Math.min(1,W.eff||0)):0;}
function pwBoost(){return pwMaxBoost()*pwEff();}
/* fuel each source building could make right now (units/s): built, switched on and not burning.
   v2.24: with log fuel allowed the plant keeps its size while a fuel building is off or on fire (logs can stand in). */
function pwCapacity(){const W=pwState(),F=PW_FUELS[W.fuel]||PW_FUELS.mix,out={},lg=pwLogMode()!=='off';
  for(const k of F.src){const id=PW_SRC[k],st=S.buildings[id];out[k]=st&&st.lvl&&(lg||(st.on&&!onFire(id)))?BMAP[id].out[k]*bSpeed(id):0;}
  return out;}
function pwNeed(){const c=pwCapacity(),s=pwShare(),o={};let t=0;for(const k in c){o[k]=c[k]*s;t+=o[k];}o.total=t;return o;}
/* called from tick() after production, before auto-sell. Takes fuel from stock, falls back on the other fuel in Mix mode. */
const PW_BURN_KEYS=['pellets','charcoal','logs'];
let pwLastLogs=0;   // logs burned in the last tick (tests / sims)
/* v2.24: surplus logs available to the plant this tick (in logs). Zero unless every log user was fully fed this tick. */
function pwLogsFree(fed,perSec){if(pwLogMode()==='off'||!fed) return 0;return Math.max(0,S.res.logs-pwLogReserve(perSec));}
function powerTick(demand,dt,fl,frac){
  const W=pwState(); if(!W.burn||typeof W.burn!=='object') W.burn={};
  let raw=0;pwLastLogs=0;
  if(W.lvl&&W.on!==false){
    const need=pwNeed(),tot=need.total*dt;
    if(tot>0){let got=0;const took={logs:0};
      // Phase I fed in full this tick? (frac from tick(); demand.logs is this tick's log use)
      // and the collectors bring in at least what Phase I uses (a log deficit is never made worse by the plant)
      const inc=fl&&fl.logs?fl.logs.p+(fl.logs.w||0):Infinity;
      const fed=(!frac||frac.logs===undefined||frac.logs>=1-1e-9)&&(!demand||inc>=(demand.logs||0)-1e-9), use=demand&&demand.logs?demand.logs/dt:pwLogUse();
      const burnLogs=()=>{const free=pwLogsFree(fed,use),a=Math.min(free,(tot-got)/PW_LOG_FUEL);if(a>0){S.res.logs-=a;took.logs+=a;got+=a*PW_LOG_FUEL;pwLastLogs+=a;}};
      if(pwLogMode()==='first') burnLogs();
      const pc=Object.keys(need).filter(k=>k!=='total'),sc=got<tot?(tot-got)/tot:0;
      for(const k of pc){const a=Math.min(S.res[k],need[k]*dt*sc);S.res[k]-=a;took[k]=a;got+=a;}
      if(got<tot-1e-12) for(const k of pc){const a=Math.min(S.res[k],tot-got);if(a>0){S.res[k]-=a;took[k]+=a;got+=a;}}
      if(got<tot-1e-12&&pwLogMode()==='surplus') burnLogs();
      for(const k in took){if(fl&&fl[k]) fl[k].c+=took[k];if(demand) demand[k]=(demand[k]||0)+(k==='logs'?took[k]:need[k]*dt*sc);}   // logs: raw use, never a sale
      raw=Math.min(1,got/tot);
      const a=Math.min(1,dt/1.5);for(const k of PW_BURN_KEYS){const r=(took[k]||0)/dt;W.burn[k]=(W.burn[k]||0)+(r-(W.burn[k]||0))*a;}
    } else for(const k of PW_BURN_KEYS) W.burn[k]=(W.burn[k]||0)*(1-Math.min(1,dt/1.5));
  } else for(const k of PW_BURN_KEYS) W.burn[k]=0;
  const e0=W.eff||0; W.eff=e0+(raw-e0)*Math.min(1,dt/2.5); if(W.eff<1e-4) W.eff=0;
  if(!W.lvl) W.eff=0;
}
function buyPower(){const W=pwState();if(W.lvl>=PW_MAX||!pwUnlocked()) return false;const c=pwCost();if(S.coins+1e-9<c) return false;
  S.coins-=c; W.lvl++; M=computeMods();
  if(typeof pwPoof==='function') pwPoof();
  toast(W.lvl===1?'⚡ <b>Power Plant online!</b> Keep the Pellet Press and Kiln running: the grid now boosts every building.':`⚡ <b>Power Plant Lv ${W.lvl}</b> · up to +${Math.round(pwMaxBoost()*100)}% to all buildings`,3800);
  if(PW_PERKS.some(p=>p[0]===W.lvl&&W.lvl>1)) confettiBurst();
  sfx('unlock'); if(typeof checkAch==='function') checkAch(); return true;}
function setPowerFuel(f){if(!PW_FUELS[f]) return false;pwState().fuel=f;return true;}
function setPowerLogs(m){if(!PW_LOGMODES[m]) return false;pwState().logs=m;return true;}
function setPowerReserve(r){r=+r;if(!PW_RESERVES.includes(r)) return false;pwState().res=r;return true;}
function setPowerOn(on){pwState().on=!!on;M=computeMods();}
function pwStatus(){const W=pwState(),l=W.lvl,e=pwEff();
  if(!l) return {k:'none',t:pwUnlocked()?'Not built yet':'Build a Pellet Press to unlock'};
  if(W.on===false) return {k:'off',t:'Switched off'};
  if(pwNeed().total<=0) return {k:'nofuel',t:'No fuel source running'};
  if(e<.6) return {k:'low',t:'Low on fuel'};
  return {k:'ok',t:'Running'};}

/* ---------- sheet ---------- */
SHEETS.power={title:'Biomass Power Plant',icon:'power'};
UI_ICONS.power=`<svg viewBox="0 0 32 32"><rect x="3" y="15" width="17" height="13" rx="1.5" fill="#c9cfd4" stroke="#4a5058" stroke-width="1.3"/><rect x="5" y="18" width="4" height="3" fill="#8fc3dc"/><rect x="11" y="18" width="4" height="3" fill="#8fc3dc"/><rect x="6" y="6" width="3.6" height="10" fill="#e8e4dc" stroke="#4a5058" stroke-width="1.2"/><rect x="6" y="8.5" width="3.6" height="2" fill="#d8402a"/><path d="M19 28 C20 21 20.5 15 19.5 9 L28.5 9 C27.5 15 28 21 29 28Z" fill="#dfe3e6" stroke="#4a5058" stroke-width="1.3"/><path d="M23.5 13.5 l-3 6 h3 l-1.5 5.5 5-7.5 h-3.2 l1.7-4z" fill="#f5c84c" stroke="#a8781a" stroke-width=".8"/></svg>`;
let pwSig='';
function openPower(){openSheet('power');}
function updatePower(){
  const bb=$('bbPower'); if(bb){const v=pwVisible(); if(bb._v!==v){bb._v=v;bb.classList.toggle('hidden',!v);}}
  const dot=$('powerDot'); if(dot){const want=(pwUnlocked()&&!pwLvl()&&S.coins+1e-9>=pwCost())||(pwLvl()>0&&pwState().on!==false&&pwStatus().k==='nofuel'); dot.classList.toggle('hidden',curSheet==='power'||!want);}
  if(curSheet!=='power') return;
  const W=pwState(),l=W.lvl,st=pwStatus();
  const sig=l+'|'+(W.on!==false)+'|'+W.fuel+'|'+pwUnlocked()+'|'+pwLogMode()+'|'+pwReserveSec();
  if(sig!==pwSig){pwSig=sig;
    let h=`<div class="pw-hero"><div class="ph-ic">${UI_ICONS.power}</div><div style="flex:1"><div class="ph-t">${l?`Power Plant · Lv ${l}${l>=PW_MAX?' ★':''}`:'Biomass Power Plant'}</div>
      <div class="legend" style="margin:2px 0 0" id="pwTx"></div></div></div>`;
    if(l){
      h+=`<div class="pw-meter"><div class="pw-gauge"><i id="pwBi"></i></div><div class="pw-num"><b id="pwPct">0%</b><small>power</small></div><div class="pw-num"><b id="pwBoost">+0%</b><small>all buildings</small></div></div>
        <div class="pw-status" id="pwSt"></div>
        <div class="pw-row"><span class="pw-l">Fuel</span><span class="seg" id="pwFuel">${Object.entries(PW_FUELS).map(([k,f])=>`<button data-f="${k}" class="${W.fuel===k?'on':''}">${f.e} ${f.n}</button>`).join('')}</span>
          <label class="sw" title="Switch the plant on/off"><input type="checkbox" id="pwOn" ${W.on!==false?'checked':''}><span class="tr"></span><span>${W.on!==false?'On':'Off'}</span></label></div>
        <div class="pw-logs" id="pwLogBox"><div class="pw-row"><span class="pw-l">🪵 Log fuel</span><span class="seg" id="pwLogs">${Object.entries(PW_LOGMODES).map(([k,m])=>`<button data-m="${k}" class="${pwLogMode()===k?'on':''}" title="${m.d}">${m.e} ${m.n}</button>`).join('')}</span></div>
          ${pwLogMode()!=='off'?`<div class="pw-row"><span class="pw-l">Keep in yard</span><span class="seg" id="pwRes">${PW_RESERVES.map(r=>`<button data-r="${r}" class="${pwReserveSec()===r?'on':''}">${r<60?r+' s':r/60+' min'}</button>`).join('')}</span></div>`:''}
          <div class="pw-note" id="pwLogNote"></div></div>
        <div class="pw-kv" id="pwKv"></div>`;}
    h+=`<button class="btn gold big" id="pwBuy"></button>`;
    h+=`<h4>Plant upgrades</h4><div class="pw-perks">${PW_PERKS.map(([lv,t])=>`<div class="pw-perk${l>=lv?' on':''}"><b>Lv ${lv}</b><span>${t}</span></div>`).join('')}</div>
      <div class="legend">The plant burns <b>${Math.round(pwShare(Math.max(1,l))*100)}%</b> of what your Pellet Press and Charcoal Kiln can make (rising to ${Math.round(pwShare(PW_MAX)*100)}% at Lv ${PW_MAX}) and takes it before auto-sell. Surplus logs can stand in (${Math.round(1/PW_LOG_FUEL*10)/10} logs per unit of fuel); logs are never sold, only used. With full fuel each level adds <b>+${Math.round(PW_BOOST*100)}%</b> speed to every building, premium and R&amp;D ones included. It stays built when you Replant.</div>`;
    $('powerBody').innerHTML=h;
    $('pwBuy').onclick=()=>{if(buyPower()){pwSig='';render();}};
    const fb=$('pwFuel'); if(fb) fb.querySelectorAll('button').forEach(b=>b.onclick=()=>{setPowerFuel(b.dataset.f);pwSig='';haptic&&haptic(5);render();});
    const lb=$('pwLogs'); if(lb) lb.querySelectorAll('button').forEach(b=>b.onclick=()=>{setPowerLogs(b.dataset.m);pwSig='';haptic&&haptic(5);render();});   // v2.24
    const rb=$('pwRes'); if(rb) rb.querySelectorAll('button').forEach(b=>b.onclick=()=>{setPowerReserve(b.dataset.r);pwSig='';haptic&&haptic(5);render();});
    const on=$('pwOn'); if(on) on.onchange=()=>{setPowerOn(on.checked);pwSig='';render();};
  }
  const b=$('pwBuy'),c=pwCost();
  const bh=l>=PW_MAX?'Power Plant at max level':!pwUnlocked()?'🔒 Build a Pellet Press first':costBtnHtml(l?`⬆ Upgrade to Lv ${l+1} (+${Math.round(pwMaxBoost(l+1)*100)}%)`:'⚡ Build the Power Plant',c);
  if(b._h!==bh){b.innerHTML=bh;b._h=bh;} b.disabled=l>=PW_MAX||!pwUnlocked()||S.coins+1e-9<c;
  const tx=l?`Turns pellets and charcoal${pwLogMode()!=='off'?' (plus spare logs)':''} into electricity for the whole factory. ${st.t}.`:`Burns pellets and charcoal to power the factory. Every level gives <b>+${Math.round(PW_BOOST*100)}%</b> speed to all buildings while it has fuel (up to +${Math.round(pwMaxBoost(PW_MAX)*100)}% at Lv ${PW_MAX}).`;
  const te=$('pwTx'); if(te._t!==tx){te.innerHTML=tx;te._t=tx;}
  if(l){const e=pwEff();$('pwBi').style.width=(e*100).toFixed(1)+'%';$('pwBi').parentNode.className='pw-gauge '+st.k;
    $('pwPct').textContent=Math.round(e*100)+'%';$('pwBoost').textContent='+'+(pwBoost()*100).toFixed(1).replace(/\.0$/,'')+'%';
    const sm={ok:'✅ Running at full power',low:'⚠ Low on fuel: build or upgrade the Pellet Press / Kiln, or check their inputs'+(pwLogMode()==='off'?' (or allow log fuel)':''),nofuel:'⛔ No fuel: the '+(W.fuel==='charcoal'?'Charcoal Kiln is':W.fuel==='pellets'?'Pellet Press is':'Pellet Press and Kiln are')+' not running',off:'⏸ Switched off'};
    const se=$('pwSt'),sh=sm[st.k]||st.t; if(se._t!==sh){se.textContent=sh;se._t=sh;se.className='pw-status '+st.k;}
    const need=pwNeed(),bn=W.burn||{};
    const lm=pwLogMode(),use=pwLogUse(),rsv=pwLogReserve(use);
    const ln=lm==='off'?'Logs are never burned. Turn this on to let spare logs from a full Log Yard keep the plant running.':
      `${PW_LOGMODES[lm].d}. Logs are raw material: the plant only takes logs <b>left over</b> after the Sawmill, Peeler, Chipper and Kiln are fully fed, and always leaves <b>${fr(rsv)}</b> logs (${pwReserveSec()<60?pwReserveSec()+' s':pwReserveSec()/60+' min'} of their use) in the yard.`;
    const le=$('pwLogNote'); if(le&&le._t!==ln){le.innerHTML=ln;le._t=ln;}
    const kv=[['🟤 Pellets burned',`${fr(bn.pellets||0)}/s`],['⚫ Charcoal burned',`${fr(bn.charcoal||0)}/s`],['🪵 Logs burned',lm==='off'?'off':`${fr(bn.logs||0)}/s`],...(lm==='off'?[]:[['Log reserve',`${fr(Math.min(S.res.logs,rsv))} / ${fr(rsv)}`]]),['Fuel share',`${Math.round(pwShare()*100)}% of ${PW_FUELS[W.fuel].src.map(k=>k==='pellets'?'Pellet Press':'Kiln').join(' + ')} output`],['Max boost',`+${Math.round(pwMaxBoost()*100)}% all buildings`]];
    const kh=kv.map(([a,v])=>`<div><span>${a}</span><b>${v}</b></div>`).join(''); const ke=$('pwKv'); if(ke._t!==kh){ke.innerHTML=kh;ke._t=kh;}}
}
