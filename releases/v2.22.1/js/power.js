'use strict';
/* ===================== v2.10 BIOMASS POWER PLANT (logic + sheet) =====================
   A plant on its own clearing north-east of the R&D campus burns a share of what the Pellet Press and the Charcoal Kiln can make
   and feeds the factory grid: every level gives +5% speed to ALL buildings while it has fuel. The plant takes its fuel before
   auto-sell, so it only runs short when the fuel buildings are off, on fire or starved. Its level is kept through Replant
   (like the fire station and the harbour); the boost needs the fuel buildings, which Replant resets as usual. */
const PW_MAX=10, PW_COST=2.5e5, PW_SCALE=5, PW_BOOST=.05;
const PW_FUELS={mix:{n:'Mix',e:'⚡',src:['pellets','charcoal']},pellets:{n:'Pellets',e:'🟤',src:['pellets']},charcoal:{n:'Charcoal',e:'⚫',src:['charcoal']}};
const PW_SRC={pellets:'pellet',charcoal:'kiln'};   // fuel -> the building that makes it
const PW_PERKS=[[1,'Boiler house, turbine hall, chimney and substation'],[3,'Cooling tower'],[5,'Twin fuel silos with a feed conveyor'],[7,'Second chimney'],[10,'Gold trim and the ★ flag']];
function pwState(){if(!S.power||typeof S.power!=='object') S.power={lvl:0,on:true,fuel:'mix',eff:0,burn:{}};return S.power;}
function pwLvl(){return (S.power&&S.power.lvl)||0;}
function pwCost(l){l=l===undefined?pwLvl():l;return PW_COST*Math.pow(PW_SCALE,l);}
function pwUnlocked(){return pwLvl()>0||S.buildings.pellet.lvl>0;}
function pwVisible(){return pwLvl()>0||S.buildings.kiln.lvl>0||S.buildings.pellet.lvl>0;}
function pwShare(l){l=l===undefined?pwLvl():l;return l?.15+.015*l:0;}
function pwMaxBoost(l){return PW_BOOST*(l===undefined?pwLvl():l);}
function pwEff(){const W=S.power;return W&&W.lvl&&W.on!==false?Math.max(0,Math.min(1,W.eff||0)):0;}
function pwBoost(){return pwMaxBoost()*pwEff();}
/* fuel each source building could make right now (units/s): built, switched on and not burning */
function pwCapacity(){const W=pwState(),F=PW_FUELS[W.fuel]||PW_FUELS.mix,out={};
  for(const k of F.src){const id=PW_SRC[k],st=S.buildings[id];out[k]=st&&st.lvl&&st.on&&!onFire(id)?BMAP[id].out[k]*bSpeed(id):0;}
  return out;}
function pwNeed(){const c=pwCapacity(),s=pwShare(),o={};let t=0;for(const k in c){o[k]=c[k]*s;t+=o[k];}o.total=t;return o;}
/* called from tick() after production, before auto-sell. Takes fuel from stock, falls back on the other fuel in Mix mode. */
function powerTick(demand,dt,fl){
  const W=pwState(); if(!W.burn||typeof W.burn!=='object') W.burn={};
  let raw=0;
  if(W.lvl&&W.on!==false){
    const need=pwNeed(),tot=need.total*dt;
    if(tot>0){let got=0;const took={};
      for(const k of Object.keys(need)){if(k==='total') continue;const a=Math.min(S.res[k],need[k]*dt);S.res[k]-=a;took[k]=a;got+=a;}
      if(got<tot-1e-12) for(const k of Object.keys(need)){if(k==='total') continue;const a=Math.min(S.res[k],tot-got);if(a>0){S.res[k]-=a;took[k]+=a;got+=a;}}
      for(const k in took){if(fl&&fl[k]) fl[k].c+=took[k];if(demand) demand[k]=(demand[k]||0)+need[k]*dt;}
      raw=Math.min(1,got/tot);
      const a=Math.min(1,dt/1.5);for(const k of ['pellets','charcoal']){const r=(took[k]||0)/dt;W.burn[k]=(W.burn[k]||0)+(r-(W.burn[k]||0))*a;}
    } else for(const k of ['pellets','charcoal']) W.burn[k]=(W.burn[k]||0)*(1-Math.min(1,dt/1.5));
  } else for(const k of ['pellets','charcoal']) W.burn[k]=0;
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
  const sig=l+'|'+(W.on!==false)+'|'+W.fuel+'|'+pwUnlocked();
  if(sig!==pwSig){pwSig=sig;
    let h=`<div class="pw-hero"><div class="ph-ic">${UI_ICONS.power}</div><div style="flex:1"><div class="ph-t">${l?`Power Plant · Lv ${l}${l>=PW_MAX?' ★':''}`:'Biomass Power Plant'}</div>
      <div class="legend" style="margin:2px 0 0" id="pwTx"></div></div></div>`;
    if(l){
      h+=`<div class="pw-meter"><div class="pw-gauge"><i id="pwBi"></i></div><div class="pw-num"><b id="pwPct">0%</b><small>power</small></div><div class="pw-num"><b id="pwBoost">+0%</b><small>all buildings</small></div></div>
        <div class="pw-status" id="pwSt"></div>
        <div class="pw-row"><span class="pw-l">Fuel</span><span class="seg" id="pwFuel">${Object.entries(PW_FUELS).map(([k,f])=>`<button data-f="${k}" class="${W.fuel===k?'on':''}">${f.e} ${f.n}</button>`).join('')}</span>
          <label class="sw" title="Switch the plant on/off"><input type="checkbox" id="pwOn" ${W.on!==false?'checked':''}><span class="tr"></span><span>${W.on!==false?'On':'Off'}</span></label></div>
        <div class="pw-kv" id="pwKv"></div>`;}
    h+=`<button class="btn gold big" id="pwBuy"></button>`;
    h+=`<h4>Plant upgrades</h4><div class="pw-perks">${PW_PERKS.map(([lv,t])=>`<div class="pw-perk${l>=lv?' on':''}"><b>Lv ${lv}</b><span>${t}</span></div>`).join('')}</div>
      <div class="legend">The plant burns <b>${Math.round(pwShare(Math.max(1,l))*100)}%</b> of what your Pellet Press and Charcoal Kiln can make (rising to ${Math.round(pwShare(PW_MAX)*100)}% at Lv ${PW_MAX}) and takes it before auto-sell. With full fuel each level adds <b>+${Math.round(PW_BOOST*100)}%</b> speed to every building, premium and R&amp;D ones included. It stays built when you Replant.</div>`;
    $('powerBody').innerHTML=h;
    $('pwBuy').onclick=()=>{if(buyPower()){pwSig='';render();}};
    const fb=$('pwFuel'); if(fb) fb.querySelectorAll('button').forEach(b=>b.onclick=()=>{setPowerFuel(b.dataset.f);pwSig='';haptic&&haptic(5);render();});
    const on=$('pwOn'); if(on) on.onchange=()=>{setPowerOn(on.checked);pwSig='';render();};
  }
  const b=$('pwBuy'),c=pwCost();
  const bh=l>=PW_MAX?'Power Plant at max level':!pwUnlocked()?'🔒 Build a Pellet Press first':costBtnHtml(l?`⬆ Upgrade to Lv ${l+1} (+${Math.round(pwMaxBoost(l+1)*100)}%)`:'⚡ Build the Power Plant',c);
  if(b._h!==bh){b.innerHTML=bh;b._h=bh;} b.disabled=l>=PW_MAX||!pwUnlocked()||S.coins+1e-9<c;
  const tx=l?`Turns pellets and charcoal into electricity for the whole factory. ${st.t}.`:`Burns pellets and charcoal to power the factory. Every level gives <b>+${Math.round(PW_BOOST*100)}%</b> speed to all buildings while it has fuel (up to +${Math.round(pwMaxBoost(PW_MAX)*100)}% at Lv ${PW_MAX}).`;
  const te=$('pwTx'); if(te._t!==tx){te.innerHTML=tx;te._t=tx;}
  if(l){const e=pwEff();$('pwBi').style.width=(e*100).toFixed(1)+'%';$('pwBi').parentNode.className='pw-gauge '+st.k;
    $('pwPct').textContent=Math.round(e*100)+'%';$('pwBoost').textContent='+'+(pwBoost()*100).toFixed(1).replace(/\.0$/,'')+'%';
    const sm={ok:'✅ Running at full power',low:'⚠ Low on fuel: build or upgrade the Pellet Press / Kiln, or check their inputs',nofuel:'⛔ No fuel: the '+(W.fuel==='charcoal'?'Charcoal Kiln is':W.fuel==='pellets'?'Pellet Press is':'Pellet Press and Kiln are')+' not running',off:'⏸ Switched off'};
    const se=$('pwSt'),sh=sm[st.k]||st.t; if(se._t!==sh){se.textContent=sh;se._t=sh;se.className='pw-status '+st.k;}
    const need=pwNeed(),bn=W.burn||{};
    const kv=[['🟤 Pellets burned',`${fr(bn.pellets||0)}/s`],['⚫ Charcoal burned',`${fr(bn.charcoal||0)}/s`],['Fuel share',`${Math.round(pwShare()*100)}% of ${PW_FUELS[W.fuel].src.map(k=>k==='pellets'?'Pellet Press':'Kiln').join(' + ')} output`],['Max boost',`+${Math.round(pwMaxBoost()*100)}% all buildings`]];
    const kh=kv.map(([a,v])=>`<div><span>${a}</span><b>${v}</b></div>`).join(''); const ke=$('pwKv'); if(ke._t!==kh){ke.innerHTML=kh;ke._t=kh;}}
}
