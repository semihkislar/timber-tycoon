'use strict';
/* ===================== v2.13 SHIPPING YARD: loading docks, forklift fleet, departures, export contracts =====================
   Everything you auto-sell leaves through the shipping dock. The dock now has levels and loading bays; every bay loads a truck
   up to its capacity (worth a few seconds of your sales) and the truck departs when it is full or its timer runs out.
   - Dock level      : +2% export premium on every sale per level above 1, more bays (1 / 2 at Lv 4 / 3 at Lv 8), bigger trucks.
   - Forklift fleet  : 2..6 forklifts in the scene; each one speeds up loading and contract progress.
   - Forklift speed  : 0..5; forklifts drive visibly faster (base speed is now ~2x v2.12) and load faster.
   - Gantry crane    : 0..3; a big step in loading speed and contract rewards.
   - Export contracts: a city from the trade map asks for a quantity of one of your products within a time limit. Units you sell
     of that product count towards it, multiplied by your loading speed. Finish it for a bonus worth ~1.5-2.5x the goods' value
     (+25% if your harbour already has a route to that city). Skipping or failing costs nothing but a short wait.
   Kept through Replant like the harbour (levels + stats); the running contract and bay loads are dropped. */
const SH_DOCK_MAX=10, SH_FORK_MIN=2, SH_FORK_MAX=6, SH_SPD_MAX=5, SH_CRANE_MAX=3;
const SH_UP={
  dock:{n:'Loading Dock',e:'🏭',cost:l=>6e4*Math.pow(9,l-1),max:SH_DOCK_MAX,cur:()=>S.ship.dock},
  fork:{n:'Forklift Fleet',e:'🚜',cost:n=>2.5e4*Math.pow(8,n-SH_FORK_MIN),max:SH_FORK_MAX,cur:()=>S.ship.fork},
  fspd:{n:'Forklift Speed',e:'⚡',cost:l=>3e4*Math.pow(7,l),max:SH_SPD_MAX,cur:()=>S.ship.fspd},
  crane:{n:'Gantry Crane',e:'🏗️',cost:l=>2e6*Math.pow(18,l),max:SH_CRANE_MAX,cur:()=>S.ship.crane}};
function shFresh(){return {dock:1,fork:2,fspd:0,crane:0,bays:[],contract:null,offer:null,nextOffer:40,stats:{trucks:0,contracts:0,bonus:0,failed:0}};}
function shState(){let s=S.ship;if(!s||typeof s!=='object') s=S.ship=shFresh();
  const f=shFresh();for(const k of ['dock','fork','fspd','crane']) if(typeof s[k]!=='number'||!isFinite(s[k])) s[k]=f[k];
  s.dock=Math.max(1,Math.min(SH_DOCK_MAX,s.dock|0));s.fork=Math.max(SH_FORK_MIN,Math.min(SH_FORK_MAX,s.fork|0));s.fspd=Math.max(0,Math.min(SH_SPD_MAX,s.fspd|0));s.crane=Math.max(0,Math.min(SH_CRANE_MAX,s.crane|0));
  if(!Array.isArray(s.bays)) s.bays=[]; if(!s.stats||typeof s.stats!=='object') s.stats=f.stats; if(typeof s.nextOffer!=='number') s.nextOffer=40;
  return s;}
function shBays(d){d=d===undefined?S.ship.dock:d;return 1+(d>=4?1:0)+(d>=8?1:0);}
function shPremium(d){d=d===undefined?(S.ship?S.ship.dock:1):d;return .02*(d-1);}
/* loading factor: 1.0 with the starting 2 forklifts; the contract progress multiplier and the forklift/crane speed */
function shLoadF(s){s=s||S.ship;const base=(s.fork/2)*(1+.3*s.fspd)*(1+.6*s.crane);return typeof staffApplyLoadF==='function'?staffApplyLoadF(base):base;}
function shForkSpeed(){const s=S.ship||shFresh();return 3.4*(1+.25*s.fspd)*(1+.15*s.crane);}   // v2.12 was a fixed 1.7
function shCapSec(){return 18+4*(S.ship.dock-1);}            // a truck holds ~this many seconds of your sales
function shTimer(){return Math.max(20,45-2*S.ship.dock);}     // ...and leaves after this long even if it is not full
function shCost(k){const s=S.ship,u=SH_UP[k];if(k==='dock') return s.dock>=u.max?Infinity:u.cost(s.dock);if(k==='fork') return s.fork>=u.max?Infinity:u.cost(s.fork);return s[k]>=u.max?Infinity:u.cost(s[k]);}
function shBuy(k){const s=shState(),u=SH_UP[k];if(!u) return false;const c=shCost(k);if(!isFinite(c)||S.coins+1e-9<c) return false;
  S.coins-=c;s[k]++;if(k==='dock'){M=computeMods();while(s.bays.length<shBays()) s.bays.push({v:0,t:0});}
  sfx('unlock');scene._fsig='';toast(`${u.e} <b>${u.n}</b> → ${k==='fork'?s.fork+' forklifts':'Lv '+s[k]}: ${shUpText(k)}`);checkAch&&checkAch();return true;}
function shUpText(k){const s=S.ship;
  if(k==='dock') return `+${Math.round(shPremium()*100)}% export premium on all sales · ${shBays()} bay${shBays()>1?'s':''} · trucks hold ${shCapSec()}s of sales`;
  if(k==='fork') return `${s.fork} forklifts · loading ×${shLoadF().toFixed(2)}`;
  if(k==='fspd') return `forklifts ${Math.round(shForkSpeed()/1.7*100)}% of the old speed · loading ×${shLoadF().toFixed(2)}`;
  return `${s.crane?'crane Lv '+s.crane:'no crane'} · loading ×${shLoadF().toFixed(2)} · contract rewards +${s.crane*20}%`;}
/* what the next step of an upgrade gives, for the cost-vs-benefit line */
function shNextGain(k){const s=S.ship,o=Object.assign({},s);
  if(k==='dock'){return `+2% on every sale (≈ +${fmt(coinRate*.02/(1+shPremium()))}/s)${[3,7].includes(s.dock)?' · +1 bay':''}`;}
  o[k]++;const a=shLoadF(s),b=shLoadF(o);return `loading ×${a.toFixed(2)} → ×${b.toFixed(2)}${k==='crane'?' · +20% contract rewards':''}${k==='fspd'?' · faster forklifts':''}`;}
/* ---------- contracts ---------- */
function shProducts(){return RES.filter(r=>canSell(r.id)).filter(r=>rates[r.id]&&rates[r.id].s>1e-6);}
function shMakeOffer(){const P0=shProducts();if(!P0.length) return null;
  const r=P0[Math.floor(Math.random()*Math.min(P0.length,6))+Math.max(0,P0.length-6)]||P0[P0.length-1];
  const c=CITIES[Math.floor(Math.random()*CITIES.length)];
  const t=Math.round((150+Math.random()*150)/30)*30, rate=rates[r.id].s, qty=Math.max(1,rate*t*.55);
  const mult=1.5+.6*Math.random()+(c.likes&&c.likes[r.id]?.3:0);
  return {id:Date.now()%1e6,city:c.id,res:r.id,qty,t,mult,cr:coinRate};}
function shReward(o){const s=S.ship,c=CITIES.find(x=>x.id===o.city);const route=S.trade&&S.trade.routes&&S.trade.routes[o.city]?1.25:1;
  // goods value x mult, but never less than ~10% of what you earn over the contract window (single products can be cheap)
  return Math.max(o.qty*price(o.res)*o.mult,(o.cr||0)*o.t*.06*o.mult)*(1+.2*s.crane)*route;}
function shAccept(){const s=shState();if(!s.offer||s.contract) return false;s.contract=Object.assign({},s.offer,{got:0,left:s.offer.t,reward:shReward(s.offer)});delete s.contract.age;s.offer=null;sfx('buy');return true;}
function shSkip(){const s=shState();if(!s.offer) return false;s.offer=null;s.nextOffer=30;return true;}
function shAbandon(){const s=shState();if(!s.contract) return false;s.contract=null;s.nextOffer=60;return true;}
/* called from tick() with the units auto-sold this step (per resource) and the coins they earned */
function shipTick(dt,sold,earned,offline){
  const s=shState();while(s.bays.length<shBays()) s.bays.push({v:0,t:0});s.bays.length=shBays();
  // bays: fill with sales (split across bays, faster with a better loading factor), depart when full or on the timer
  const cap=Math.max(1,coinRate*shCapSec()*(typeof staffApplyCap==='function'?staffApplyCap(1):1)),lf=Math.min(1,.55+.45*shLoadF()/2);
  for(const b of s.bays){b.v+=earned/s.bays.length*lf;b.t+=dt;
    if(b.v>=cap||(b.t>=shTimer()&&b.v>0)){s.stats.trucks++;b.v=0;b.t=0;if(!offline) scene.shipDeparted=(scene.shipDeparted||0)+1;}}
  // contracts
  if(s.contract){const c=s.contract;c.left-=dt;const u=sold[c.res]||0;if(u>0) c.got=Math.min(c.qty,c.got+u*Math.min(2.5,shLoadF()));
    if(c.got>=c.qty-1e-9){earn(c.reward);s.stats.contracts++;s.stats.bonus+=c.reward;s.contract=null;s.nextOffer=25;
      if(!offline){const ci=CITIES.find(x=>x.id===c.city);toast(`🚢 <b>Contract delivered to ${ci.flag} ${ci.name}!</b> +🪙 ${fmt(c.reward)}`,3600);sfx('unlock');const p=P(DOCKB[0],DOCKB[1],60);scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(c.reward),coin:true,t:0,dur:2,big:true});}}
    else if(c.left<=0){s.stats.failed++;s.contract=null;s.nextOffer=45;if(!offline) toast('⌛ The export contract ran out of time.',2600);}}
  else if(!s.offer&&!offline){s.nextOffer-=dt;if(s.nextOffer<=0){s.offer=shMakeOffer();s.nextOffer=s.offer?1e9:20;}}
  else if(s.offer){s.offer.age=(s.offer.age||0)+dt;if(s.offer.age>240){s.offer=null;s.nextOffer=30;}}
}
function shKeep(){const s=S.ship||shFresh();return {dock:s.dock,fork:s.fork,fspd:s.fspd,crane:s.crane,bays:[],contract:null,offer:null,nextOffer:40,stats:Object.assign({},s.stats)};}
function shMigrate(o){if(!o.ship||typeof o.ship!=='object') o.ship=shFresh();}

/* ---------- sheet ---------- */
SHEETS.ship={title:'Shipping Yard',icon:'ship'};
UI_ICONS.ship=`<svg viewBox="0 0 32 32"><rect x="3" y="12" width="17" height="11" rx="1.5" fill="#f3f0e8" stroke="#5a4a3a" stroke-width="1.3"/><rect x="3" y="16" width="17" height="2.4" fill="#2f6f9a"/><path d="M20 15 H26 L29.5 19 V23 H20Z" fill="#2f6fb0" stroke="#1a3a5a" stroke-width="1.3"/><rect x="22" y="16.4" width="3.6" height="2.6" fill="#bfe0f0"/><circle cx="8" cy="24.5" r="2.6" fill="#2a2a2e"/><circle cx="24.5" cy="24.5" r="2.6" fill="#2a2a2e"/><path d="M5 9 L5 4 L16 4 L16 9" stroke="#e8a020" stroke-width="1.6" fill="none"/><path d="M10.5 4 V9" stroke="#e8a020" stroke-width="1.6"/></svg>`;
let shSig='';
function cityOf(id){return CITIES.find(c=>c.id===id)||CITIES[0];}
function updateShip(){
  const dot=$('shipDot'); if(dot) dot.classList.toggle('hidden',curSheet==='ship'||!(S.ship&&S.ship.offer));
  if(curSheet!=='ship') return; const s=shState();
  const sig=[s.dock,s.fork,s.fspd,s.crane,shBays(),s.offer?s.offer.id:'-',s.contract?s.contract.id:'-'].join('|');
  if(sig!==shSig){shSig=sig;
    let h=`<div class="pw-hero sh-hero"><div class="ph-ic">${UI_ICONS.ship}</div><div style="flex:1"><div class="ph-t">Shipping Yard · Dock Lv ${s.dock}${s.dock>=SH_DOCK_MAX?' ★':''}</div>
      <div class="legend" style="margin:2px 0 0">${shBays()} loading bay${shBays()>1?'s':''} · ${s.fork} forklifts · export premium <b>+${Math.round(shPremium()*100)}%</b> on all sales</div></div></div>`;
    h+=`<h4>🚚 Departures</h4><div class="sh-board" id="shBoard">${s.bays.map((b,k)=>`<div class="sh-bay"><span class="sh-bn">Bay ${k+1}</span><span class="pbar"><i id="shB${k}"></i></span><span class="sh-bt" id="shT${k}"></span></div>`).join('')}
      <div class="sh-kv"><span>Trucks dispatched</span><b id="shTrucks"></b></div></div>`;
    h+=`<h4>📜 Export contract</h4><div id="shCon"></div>`;
    h+=`<h4>⬆ Yard upgrades</h4><div class="list sh-ups">${Object.keys(SH_UP).map(k=>`<div class="card sh-up" data-k="${k}"><div class="ic">${SH_UP[k].e}</div><div><div class="nm">${SH_UP[k].n} <span class="cnt" id="shL_${k}"></span></div><div class="ds" id="shD_${k}"></div></div><button class="btn buy" id="shU_${k}"></button></div>`).join('')}</div>`;
    h+=`<div class="legend">Your sales leave through the dock. Better docks pay an export premium on every sale; more and faster forklifts and a gantry crane load trucks quicker and complete export contracts faster. Kept through Replant.</div>
      <button class="btn small" id="shMarket">🪙 Open the Market</button>`;
    $('shipBody').innerHTML=h;
    for(const k of Object.keys(SH_UP)) $('shU_'+k).onclick=()=>{if(shBuy(k)){shSig='';haptic&&haptic(8);render();}};
    $('shMarket').onclick=()=>openSheet('market');
    const cn=$('shCon');
    if(s.contract){const c=s.contract,ci=cityOf(c.city),R=RMAP[c.res];
      cn.innerHTML=`<div class="sh-con on"><div class="sh-ct">${ci.flag} <b>${ci.name}</b> wants ${R.icon} <b>${fmt(c.qty)}</b> ${R.name}</div><div class="pbar big"><i id="shCp"></i></div>
        <div class="sh-cr"><span id="shCx"></span><span>Reward <b>🪙 ${fmt(c.reward)}</b></span></div><button class="btn small" id="shAb">Abandon</button></div>`;
      $('shAb').onclick=()=>{shAbandon();shSig='';render();};}
    else if(s.offer){const o=s.offer,ci=cityOf(o.city),R=RMAP[o.res],route=S.trade&&S.trade.routes&&S.trade.routes[o.city];
      cn.innerHTML=`<div class="sh-con"><div class="sh-ct">${ci.flag} <b>${ci.name}</b> offers a contract: ${R.icon} <b>${fmt(o.qty)}</b> ${R.name} within <b>${fmtTime(o.t)}</b></div>
        <div class="sh-cr"><span>Reward <b>🪙 ${fmt(shReward(o))}</b> (×${(o.mult*(1+.2*s.crane)*(route?1.25:1)).toFixed(2)} goods value${route?' · harbour route +25%':''})</span></div>
        <div class="sh-btns"><button class="btn gold" id="shAc">✅ Accept</button><button class="btn small" id="shSk">Skip</button></div></div>`;
      $('shAc').onclick=()=>{if(shAccept()){shSig='';haptic&&haptic(8);render();}};$('shSk').onclick=()=>{shSkip();shSig='';render();};}
    else cn.innerHTML=`<div class="sh-con idle">No contract on offer right now — a new one arrives soon. Contracts need products you are selling.</div>`;
  }
  const cap=Math.max(1,coinRate*shCapSec());
  s.bays.forEach((b,k)=>{const e=$('shB'+k);if(e) e.style.width=Math.min(100,b.v/cap*100).toFixed(1)+'%';const t=$('shT'+k);if(t) t.textContent=b.v>=cap*.999?'departing':`${Math.round(Math.min(1,b.v/cap)*100)}% · ${fmtTime(Math.max(0,shTimer()-b.t))}`;});
  const tr=$('shTrucks');if(tr) tr.textContent=fmt(s.stats.trucks);
  if(s.contract){const c=s.contract,p=$('shCp');if(p) p.style.width=(c.got/c.qty*100).toFixed(1)+'%';const x=$('shCx');if(x) x.textContent=`${fmt(c.got)} / ${fmt(c.qty)} · ⏱ ${fmtTime(Math.max(0,c.left))}`;}
  for(const k of Object.keys(SH_UP)){const u=SH_UP[k],c=shCost(k),b=$('shU_'+k);if(!b) continue;const mx=!isFinite(c);
    const bh=mx?'MAX':costBtnHtml(k==='fork'?'+1':'⬆',c);if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=mx||S.coins+1e-9<c;
    const l=$('shL_'+k),lt=k==='fork'?`${s.fork}/${SH_FORK_MAX}`:`Lv ${s[k]}/${u.max}`;if(l._t!==lt){l.textContent=lt;l._t=lt;}
    const d=$('shD_'+k),dt=mx?shUpText(k):`Next: ${shNextGain(k)}`;if(d._t!==dt){d.textContent=dt;d._t=dt;}}
}
/* ---------- scene: load bar + timer over the docked truck, crane gantry, extra bays ---------- */
function shipOverlay(ctx,showTags){if(!S.ship) return;const s=S.ship;const tk=scene.dockTrucks.find(v=>v.li===3);if(!tk||!s.bays.length) return;
  const cap=Math.max(1,coinRate*shCapSec()),b=s.bays[0],k=Math.min(1,b.v/cap);const p=P(DOCKB[0],DOCKB[1],62),[sx,sy]=w2s(p[0],p[1]);
  const w=58,h=7;ctx.fillStyle='rgba(43,27,14,.78)';rr(ctx,sx-w/2-4,sy-h/2-4,w+8,h+8,6);ctx.fill();ctx.fillStyle='#4a3a2a';rr(ctx,sx-w/2,sy-h/2,w,h,3);ctx.fill();
  ctx.fillStyle=k>.95?'#7ad04a':'#f5c84c';rr(ctx,sx-w/2,sy-h/2,Math.max(3,w*k),h,3);ctx.fill();
  if(showTags){ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff6e0';ctx.fillText(`${shBays()>1?shBays()+' bays · ':''}${fmtTime(Math.max(0,shTimer()-b.t))}`,sx,sy-13);}
}
function shipCrane(ctx,objs){const s=S.ship;if(!s||!s.crane) return;const i0=DOCKB[0]-.9,j0=DOCKB[1]-1.6,i1=DOCKB[0]-.9,j1=DOCKB[1]+1.6,H=58+s.crane*6;
  objs.push({k:i0+j0+.2,f:()=>{const legs=[[i0,j0],[i1,j1]];for(const [i,j] of legs){box(ctx,i-.12,j-.12,i+.12,j+.12,0,H,'#e8a020',{});}
    const a=P(i0,j0,H),c=P(i1,j1,H);ctx.strokeStyle='#c8801a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();
    ctx.strokeStyle='#f5b52a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a[0],a[1]-2);ctx.lineTo(c[0],c[1]-2);ctx.stroke();
    const t=(Math.sin(scene.t*.6)+1)/2,tr=[lerp(a[0],c[0],t),lerp(a[1],c[1],t)];box(ctx,i0-.15,lerp(j0,j1,t)-.15,i0+.15,lerp(j0,j1,t)+.15,H-6,H+2,'#3a3a40',{});
    const hk=18+Math.sin(scene.t*1.1)*8;ctx.strokeStyle='#2a2a2e';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(tr[0],tr[1]);ctx.lineTo(tr[0],tr[1]+H-6-hk);ctx.stroke();
    ctx.fillStyle='#c98a4a';ctx.fillRect(tr[0]-6,tr[1]+H-6-hk,12,7);ctx.strokeStyle='rgba(60,30,10,.6)';ctx.strokeRect(tr[0]-6,tr[1]+H-6-hk,12,7);}});}
