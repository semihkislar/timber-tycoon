'use strict';
/* ===================== v2.5 RESEARCH TREE + TRADE MAP ===================== */
// Research Lab turns paper into Research Points (RP). Nodes are kept through Replant (RP too).
const RP_PER=0.015;     // RP per unit of lab speed per second
const RNODES=[
  {id:'science', name:'Wood Science',    icon:'🔬',col:0,row:2,rp:5,   req:[],                  d:'Research Lab +25 % RP',fx:m=>{m.lab*=1.25;}},
  {id:'blades',  name:'Carbide Blades',  icon:'🪚',col:1,row:0,rp:30,  req:['science'],         d:'Sawmill & Wood Chipper +15 %',fx:m=>{m.bld.sawmill*=1.15;m.bld.chipper*=1.15;}},
  {id:'tar',     name:'Pine Tar Glue',   icon:'🍯',col:1,row:2,rp:40,  req:['science'],         d:'Charcoal Kilns also distil glue (½ per charcoal)',fx:m=>{m.tar=true;}},
  {id:'pulp',    name:'Pulp Chemistry',  icon:'🧪',col:1,row:4,rp:30,  req:['science'],         d:'Paper Mill +15 %',fx:m=>{m.bld.paper*=1.15;}},
  {id:'bending', name:'Steam Bending',   icon:'🪑',col:2,row:0,rp:150, req:['blades'],          d:'Carpentry & Furniture Factory +15 %',fx:m=>{m.bld.carpentry*=1.15;m.bld.furniture*=1.15;}},
  {id:'plywood', name:'Plywood Mill',    icon:'🟧',col:2,row:2,rp:120, req:['tar'],             d:'Unlocks the Plywood Mill (planks + glue → plywood)',unlock:'plymill'},
  {id:'market',  name:'Market Research', icon:'📊',col:2,row:4,rp:150, req:['pulp'],            d:'All sell prices +5 %',fx:m=>{m.priceAll*=1.05;}},
  {id:'toys',    name:'Toy Workshop',    icon:'🧸',col:3,row:1,rp:600, req:['plywood'],         d:'Unlocks the Toy Workshop (plywood + paper → wooden toys)',unlock:'toyshop'},
  {id:'drying',  name:'Kiln Science',    icon:'🌡️',col:3,row:3,rp:500, req:['plywood'],         d:'Kiln & Pellet Press +15 %, fire risk −30 %',fx:m=>{m.bld.kiln*=1.15;m.bld.pellet*=1.15;m.fire*=.7;}},
  {id:'logistics',name:'Trade Logistics',icon:'⚓',col:3,row:5,rp:450, req:['market'],        d:'Trade payouts +20 %, trips 20 % faster',fx:m=>{m.trade*=1.2;m.tripSpd*=.8;}},
  {id:'automation',name:'Automation',    icon:'🤖',col:4,row:0,rp:4000,seeds:5,req:['bending','toys'],d:'Every building +10 %',fx:m=>{m.bldAll*=1.1;}},
  {id:'boats',   name:'Boat Yard',       icon:'⛵',col:4,row:2,rp:3000,req:['toys'],            d:'Unlocks the Boat Yard at the harbour (plywood + planks + glue → boats)',unlock:'boatyard'},
  {id:'labx',    name:'Lab Robotics',    icon:'🦾',col:4,row:4,rp:2500,req:['logistics','drying'],d:'Research Lab +50 % RP',fx:m=>{m.lab*=1.5;}},
  {id:'master',  name:'Masterworks',     icon:'🏆',col:5,row:2,rp:12000,seeds:10,req:['automation','boats'],d:'Plywood, toys, boats & luxury goods sell +25 %',fx:m=>{for(const k of ['plywood','toys','boats','luxfurn','cabinets']) m.price[k]*=1.25;}},
  {id:'genetics',name:'Tree Genetics',  icon:'🧬',col:5,row:4,rp:3500,req:['labx'],          d:'Saplings grow 30 % faster and every grown tree yields +20 % logs',fx:m=>{m.grow*=1.3;m.yield*=1.2;}},
];
const RNMAP={}; RNODES.forEach(n=>RNMAP[n.id]=n);
const TECH_UNLOCK={}; RNODES.forEach(n=>{if(n.unlock) TECH_UNLOCK[n.unlock]=n.id;});
function hasRes(id){return !!(S.research&&S.research[id]);}
function nodeAvail(n){return !hasRes(n.id)&&n.req.every(hasRes)&&labBuilt();}
function labBuilt(){return S.buildings.lab&&S.buildings.lab.lvl>0;}
function labAvail(){return S.buildings.paper.lvl>0;}
function bldUnlocked(id){const b=BMAP[id];if(!b) return false;if(b.premium) return S.premium&&S.premium.lvl>0;
  if(id==='lab') return labAvail(); if(TECH_UNLOCK[id]) return hasRes(TECH_UNLOCK[id])&&(id!=='boatyard'||harborLvl()>0); return true;}
function canResearch(id){const n=RNMAP[id];return n&&nodeAvail(n)&&S.rp+1e-9>=n.rp&&S.seeds>=(n.seeds||0);}
function doResearch(id){if(!canResearch(id)) return false;const n=RNMAP[id];S.rp-=n.rp;S.seeds-=(n.seeds||0);S.research[id]=1;M=computeMods();
  sfx('unlock');toast(`🔬 <b>${n.name}</b> researched! ${n.d}`,4200,'ms-toast');resSig='';checkAch&&checkAch();return true;}
function applyResearch(m){m.lab=1;m.trade=1;m.tripSpd=1;m.tar=false;for(const n of RNODES) if(hasRes(n.id)&&n.fx) n.fx(m);}
function labRP(){return labBuilt()&&S.buildings.lab.on?bstat.lab.speed*(bstat.lab.f||0)*RP_PER*M.lab:0;}
function labRPmax(){return labBuilt()?bSpeed('lab')*RP_PER*M.lab:0;}
function researchTick(dt){if(labBuilt()&&bstat.lab) S.rp+=bstat.lab.speed*(bstat.lab.f||0)*RP_PER*M.lab*dt;}

/* ---------- trade ---------- */
const HARBOR_COST=2.5e7, HARBOR_MAX=5, SPIKE_MULT=2;
const CITIES=[
  {id:'ist',name:'Istanbul', flag:'🇹🇷',mode:'train',trip:70, cost:2e7, base:1.11,x:.6,y:.39,likes:{furniture:1.38,toys:1.34,chairs:1.26,flooring:1.22,giftbox:1.22}},
  {id:'ham',name:'Hamburg',  flag:'🇩🇪',mode:'train',trip:150,cost:8e7,base:1.15, x:.52,y:.17,likes:{plywood:1.45,flooring:1.38,pellets:1.34,cabinets:1.30,boats:1.22}},
  {id:'rot',name:'Rotterdam',flag:'🇳🇱',mode:'ship', trip:190,cost:3e8, base:1.16,x:.42,y:.24,likes:{pellets:1.52,charcoal:1.41,plywood:1.34,boats:1.30,paper:1.22}},
  {id:'dxb',name:'Dubai',    flag:'🇦🇪',mode:'ship', trip:250,cost:1e9, base:1.19,x:.74,y:.6,likes:{luxfurn:1.68,furniture:1.49,cabinets:1.45,giftbox:1.38,boats:1.45}},
  {id:'nyc',name:'New York', flag:'🇺🇸',mode:'ship', trip:330,cost:4e9, base:1.22, x:.27,y:.31,likes:{stationery:1.60,toys:1.56,boats:1.52,luxfurn:1.38,flooring:1.34}},
  {id:'tyo',name:'Tokyo',    flag:'🇯🇵',mode:'ship', trip:420,cost:1.5e10,base:1.26,x:.92,y:.36,likes:{paper:1.68,toys:1.64,stationery:1.49,boats:1.60,plywood:1.38}},
];
const HOME={name:'Bartın',x:.67,y:.355};   // our mill: Black Sea timber coast
const CMAP={}; CITIES.forEach(c=>CMAP[c.id]=c);
function harborLvl(){return (S.trade&&S.trade.lvl)||0;}
function harborCost(){return HARBOR_COST*Math.pow(4,harborLvl());}
function harborAvail(){return S.buildings.furniture.lvl>0||harborLvl()>0;}
function slots(mode){const l=harborLvl();if(!l) return 0;return mode==='ship'?Math.ceil(l/2):1+(l>=3?1:0);}
function busy(mode){return S.trade.fleet.filter(v=>v.mode===mode).length;}
function freeSlot(mode){return busy(mode)<slots(mode);}
function routeOpen(cid){return !!S.trade.routes[cid];}
function tradeGoods(){return RES.filter(r=>r.id!=='logs'&&prodRate(r.id)>0.01);}
function demOf(cid,k){const d=S.trade.dem[cid];return (d&&d[k])||1;}
function spikeOn(cid,k){const s=S.trade.spike;return !!(s&&s.city===cid&&s.good===k&&s.ends>S.time);}
function tradeMult(cid,k){const c=CMAP[cid];return (c.likes[k]||c.base)*demOf(cid,k)*(spikeOn(cid,k)?SPIKE_MULT:1)*M.trade;}
function capSec(mode){return (mode==='ship'?80:45)*(1+.15*Math.max(0,harborLvl()-1));}
function vesselCap(k,mode){return Math.max(20,prodRate(k)*capSec(mode));}
function tripTime(cid){return CMAP[cid].trip*M.tripSpd;}
function buyHarbor(){const l=harborLvl();if(l>=HARBOR_MAX||!harborAvail()) return false;const c=harborCost();if(S.coins+1e-9<c) return false;
  S.coins-=c;S.trade.lvl=l+1;sfx('unlock');if(typeof harborPoof==='function') harborPoof();
  toast(l?`⚓ Harbour → Lv ${l+1}: ${slots('ship')} ship${slots('ship')>1?'s':''} · ${slots('train')} train${slots('train')>1?'s':''}, bigger cargo holds`:`⚓ <b>Harbour & Rail Station built!</b> Open trade routes on the world map.`,4200,'ms-toast');
  tradeSig='';checkAch&&checkAch();return true;}
function openRoute(cid){const c=CMAP[cid];if(!c||routeOpen(cid)||!harborLvl()||S.coins+1e-9<c.cost) return false;S.coins-=c.cost;S.trade.routes[cid]=1;sfx('unlock');
  toast(`${c.flag} <b>Route to ${c.name} opened!</b> ${c.mode==='ship'?'🚢 by sea':'🚂 by rail'} · ${fmtTime(tripTime(cid))} round trip`,4000,'ms-toast');tradeSig='';checkAch&&checkAch();return true;}
function dispatch(cid,k,quiet){const c=CMAP[cid];if(!c||!routeOpen(cid)||!freeSlot(c.mode)||!RMAP[k]||k==='logs') return false;
  const v={id:(S.trade.seq=(S.trade.seq||0)+1),mode:c.mode,city:cid,good:k,cap:vesselCap(k,c.mode),got:0,state:'load',t:0,trip:tripTime(cid)};
  S.trade.fleet.push(v);if(!quiet) sfx('click');tradeSig='';return v;}
function depart(v,offline){if(v.state!=='load') return;if(v.got<1e-6){S.trade.fleet=S.trade.fleet.filter(x=>x!==v);tradeSig='';return;}
  v.mult=tradeMult(v.city,v.good);v.pay=v.got*price(v.good)*v.mult;v.state='out';v.t=0;tradeSig='';
  if(!offline) toast(`${v.mode==='ship'?'🚢':'🚂'} Departed for <b>${CMAP[v.city].name}</b>: ${fmt(v.got)} ${RMAP[v.good].name} · expected +🪙${fmt(v.pay)} (×${v.mult.toFixed(2)})`,3200);}
function departNow(id){const v=S.trade.fleet.find(x=>x.id===id);if(!v) return false;depart(v);return true;}
function tradeCollect(demand,dt,pend){
  if(!S.trade) return;
  for(const v of S.trade.fleet){if(v.state!=='load') continue;const k=v.good,reserve=(demand[k]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const share=.8*((pend&&pend[k])||0);const take=Math.min(v.cap-v.got,S.res[k],Math.max(S.res[k]-reserve,priBudget(k,share,pend)));if(take>1e-9){S.res[k]-=take;v.got+=take;priTook(k,Math.max(0,take-Math.max(0,S.res[k]+take-reserve)));}}
}
function tradeTick(dt,offline){
  const T=S.trade; if(!T) return;
  for(const v of T.fleet.slice()){v.t+=dt;
    if(v.state==='load'){if(v.got>=v.cap-1e-6||(v.t>capSec(v.mode)*2.2&&v.got>0)) depart(v,offline);continue;}
    if(v.state==='out'&&v.t>=v.trip/2){v.state='back';earn(v.pay);T.stats.trips++;T.stats.earned+=v.pay;tradeSig='';
      if(!offline){toast(`${CMAP[v.city].flag} <b>${CMAP[v.city].name}</b> paid +🪙${fmt(v.pay)} for ${fmt(v.got)} ${RMAP[v.good].name}${v.mult>2?' — demand spike bonus!':''}`,3800,'ms-toast');sfx('coin');}
      checkAch&&checkAch();}
    if(v.state==='back'&&v.t>=v.trip){T.fleet=T.fleet.filter(x=>x!==v);tradeSig='';
      // auto-repeat: the returning vessel reloads the same cargo for the same city (idle-friendly; toggle in the Trade tab)
      if(T.repeat!==false&&routeOpen(v.city)&&prodRate(v.good)>0.01&&freeSlot(v.mode)) dispatch(v.city,v.good,true);}}
  // demand drifts every 45 s (mean-reverting random walk), and now and then a city has a demand spike
  if(S.time>=(T.nextDrift||0)){T.nextDrift=S.time+45;for(const c of CITIES){const d=T.dem[c.id]=T.dem[c.id]||{};
      for(const r of RES){if(r.id==='logs') continue;const x=d[r.id]||1;d[r.id]=Math.max(.8,Math.min(1.25,1+(x-1)*.85+(Math.random()-.5)*.14));}}tradeSig='';}
  if(harborLvl()&&S.time>=(T.nextSpike||0)){const open=CITIES.filter(c=>routeOpen(c.id)),goods=tradeGoods();T.nextSpike=S.time+160+Math.random()*120;
    if(open.length&&goods.length){const c=open[Math.floor(Math.random()*open.length)];const liked=goods.filter(r=>c.likes[r.id]);const pool=liked.length&&Math.random()<.7?liked:goods;
      const g=pool[Math.floor(Math.random()*pool.length)];T.spike={city:c.id,good:g.id,ends:S.time+150};tradeSig='';
      if(!offline){toast(`📈 <b>Demand spike!</b> ${c.flag} ${c.name} pays <b>×${SPIKE_MULT}</b> for ${g.icon} ${g.name} for 2½ min`,4500);sfx('event');}}}
}

/* ---------- R&D sheet (research graph + trade map) ---------- */
let resSig='', tradeSig='', rndTab='res', resSel=null;
const NODE_W=84, NODE_H=42, LEVEL_H=54;   // tree flows top → bottom; 'row' is the lane (0..5), 'col' the depth
function nodeState(n){return hasRes(n.id)?'done':nodeAvail(n)?(S.rp>=n.rp&&S.seeds>=(n.seeds||0)?'ready':'avail'):'lock';}
function rndShown(){return labAvail()||harborAvail()||harborLvl()>0||Object.keys(S.research||{}).length>0;}
function updateRnd(){
  const bb=$('bbRnd'); if(bb){const sh=rndShown(); if(bb._sh!==sh){bb._sh=sh;bb.classList.toggle('hidden',!sh);$('bottombar').classList.toggle('many',sh);}}
  const dot=$('rndDot'); if(dot) dot.classList.toggle('hidden',curSheet==='rnd'||!(RNODES.some(n=>canResearch(n.id))||(S.trade&&S.trade.spike&&S.trade.spike.ends>S.time&&routeOpen(S.trade.spike.city)&&freeSlot(CMAP[S.trade.spike.city].mode))));
  if(curSheet!=='rnd') return;
  document.querySelectorAll('#rndTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===rndTab));
  $('rndRes').classList.toggle('hidden',rndTab!=='res'); $('rndTrade').classList.toggle('hidden',rndTab!=='trade');
  if(rndTab==='res') updateResearchUI(); else updateTradeUI();
}
function updateResearchUI(){
  const sig=RNODES.map(nodeState).join(',')+'|'+labBuilt()+labAvail()+'|'+resSel;
  if(sig!==resSig){resSig=sig;
    const avail=Math.max(300,Math.min(520,($('rndRes').clientWidth||380)-6)), LANE=(avail-8-NODE_W)/5, W=avail, H=5*LEVEL_H+NODE_H+8; let edges='';
    const nx=n=>4+n.row*LANE, ny=n=>4+n.col*LEVEL_H;
    for(const n of RNODES) for(const r of n.req){const a=RNMAP[r];const x1=nx(a)+NODE_W/2,y1=ny(a)+NODE_H,x2=nx(n)+NODE_W/2,y2=ny(n),my=(y1+y2)/2;
      const st=hasRes(n.id)?'done':hasRes(r)?'avail':'lock';edges+=`<path class="re ${st}" d="M${x1.toFixed(1)} ${y1} C${x1.toFixed(1)} ${my} ${x2.toFixed(1)} ${my} ${x2.toFixed(1)} ${y2}"/>`;}
    let nodes=RNODES.map(n=>{const s=nodeState(n);return `<button class="rn ${s}${resSel===n.id?' sel':''}" data-id="${n.id}" style="left:${nx(n).toFixed(1)}px;top:${ny(n)}px"><span class="ri">${n.icon}</span><span class="rt">${n.name}</span><span class="rc">${s==='done'?'✓ Done':'🔬 '+fmt(n.rp)+(n.seeds?' · 🌱'+n.seeds:'')}</span></button>`;}).join('');
    $('rndRes').innerHTML=`<div class="lab-hero" id="labHero"></div><div class="rtree-wrap"><div class="rtree" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}">${edges}</svg>${nodes}</div></div><div id="resDetail" class="res-detail"></div>
      <div class="legend">Research is kept through Replant (and so are unspent Research Points). The lab burns paper: build more Paper Mills to research faster.</div>`;
    $('rndRes').querySelectorAll('.rn').forEach(el=>el.onclick=()=>{resSel=el.dataset.id;resSig='';updateResearchUI();});
    if(!resSel){const f=RNODES.find(n=>nodeAvail(n))||RNODES[0];resSel=f.id;resSig='';return updateResearchUI();}
  }
  // live parts
  const lh=$('labHero'),l=S.buildings.lab.lvl;
  const h=`<div class="lab-ic">${svgIcon('paper',34)}</div><div style="flex:1"><div class="ph-t">${l?`Research Lab · Lv ${l}`:'Research Lab'}</div><div class="legend" style="margin:2px 0 0">${l?`<b>+${fr(labRP())} RP/s</b> · burns ${fr(bstat.lab.speed*BMAP.lab.inp.paper*(bstat.lab.f||0))} paper/s${bstat.lab.f<.95?' <span style="color:#c4463d">(short on paper)</span>':''}`:labAvail()?'Build the lab on the R&D campus (top right of the yard) to start researching.':'🔒 Needs a Paper Mill first — the lab turns paper into research.'}</div></div>
    <div class="rp-big">🔬 ${fmt(S.rp)}<small>Research Points</small></div>`;
  if(lh._h!==h){lh.innerHTML=h;lh._h=h;}
  if(!$('labBtn')){} 
  const n=RNMAP[resSel],de=$('resDetail'); if(!n) return; const s=nodeState(n);
  const btn=s==='done'?'<button class="btn small" disabled>✓ Researched</button>':`<button class="btn ${s==='ready'?'gold':''}" id="resBuy" ${s==='ready'?'':'disabled'}>🔬 Research · ${fmt(n.rp)} RP${n.seeds?' + 🌱 '+n.seeds:''}</button>`;
  const why=s==='lock'?(!labBuilt()?'Build the Research Lab first.':'Needs: '+n.req.filter(r=>!hasRes(r)).map(r=>RNMAP[r].name).join(', ')):s==='avail'?(S.rp<n.rp?`Need ${fmt(n.rp-S.rp)} more RP (≈ ${labRP()>0?fmtTime((n.rp-S.rp)/labRP()):'∞'})`:`Needs 🌱 ${n.seeds} Seeds`):'';
  const dh=`<div class="rd-ic">${n.icon}</div><div style="flex:1"><b>${n.name}</b><div class="legend" style="margin:2px 0">${n.d}</div>${why?`<div class="rd-why">${why}</div>`:''}</div>${btn}`;
  if(de._h!==dh){de.innerHTML=dh;de._h=dh;const b=$('resBuy');if(b) b.onclick=()=>{if(doResearch(n.id)){const nx=RNODES.find(x=>nodeAvail(x));if(nx) resSel=nx.id;resSig='';render();}};}
}
function updateTradeUI(){
  const T=S.trade,l=harborLvl();
  const sig=l+'|'+harborAvail()+'|'+Object.keys(T.routes).join()+'|'+T.fleet.map(v=>v.id+v.state).join()+'|'+(T.spike?T.spike.city+T.spike.good+(T.spike.ends>S.time):'')+'|'+tradeGoods().map(r=>r.id).join()+'|'+Math.floor(S.time/45);
  if(sig!==tradeSig){tradeSig=sig;
    let h=`<div class="stn-hero"><div class="ph-ic">${UI_ICONS.trade}</div><div style="flex:1"><div class="ph-t" style="color:#1f4a7a">${l?`Harbour & Rail Station · Lv ${l}`:'Harbour & Rail Station'}</div>
      <div class="legend" style="margin:2px 0 0">${l?`🚢 ${slots('ship')} ship${slots('ship')>1?'s':''} · 🚂 ${slots('train')} train${slots('train')>1?'s':''} · holds ${Math.round(capSec('train'))}s / ${Math.round(capSec('ship'))}s of production`:harborAvail()?'Build the harbour on the coast across the highway to ship goods abroad for better prices.':'🔒 Build a Furniture Factory first.'}</div></div></div>
      <button class="btn big sea" id="hbBuy"></button>`;
    if(T.fleet.length){h+=`<h4>⛴️ Fleet <span class="mg-count">${T.fleet.length} active</span></h4><div class="list">`+T.fleet.map(v=>{const c=CMAP[v.city],r=RMAP[v.good];
      return `<div class="vsl" data-id="${v.id}"><div class="vi">${v.mode==='ship'?'🚢':'🚂'}</div><div style="flex:1;min-width:0"><b>${c.flag} ${c.name}</b> · ${r.icon} ${r.name}<div class="bar"><i class="vb"></i></div><div class="vt legend" style="margin:1px 0 0"></div></div>${v.state==='load'?'<button class="btn small gold vgo">Depart ▸</button>':''}</div>`;}).join('')+`</div>`;}
    h+=`<h4>🌍 Routes <span class="mg-count">${Object.keys(T.routes).length}/${CITIES.length} open</span></h4><div class="list">`;
    const goods=tradeGoods();
    for(const c of CITIES){const open=routeOpen(c.id),sp=T.spike&&T.spike.city===c.id&&T.spike.ends>S.time?T.spike:null;
      const top=goods.map(r=>[r,tradeMult(c.id,r.id)]).sort((a,b)=>b[1]-a[1]).slice(0,open?5:3);
      h+=`<div class="city${open?' open':''}${sp?' spike':''}"><div class="cy-h"><span class="cy-f">${c.flag}</span><b>${c.name}</b><span class="chip">${c.mode==='ship'?'🚢 Sea':'🚂 Rail'} · ${fmtTime(tripTime(c.id))}</span>${sp?`<span class="chip spk">📈 ${RMAP[sp.good].icon} ×${SPIKE_MULT}</span>`:''}
        ${open?'':`<button class="btn small cy-open" data-c="${c.id}" ${l?'':'disabled'}>🔓 ${fmt(c.cost)}</button>`}</div>
        <div class="cy-g">${top.map(([r,m])=>`<button class="gch${m>=2?' hot':m>=1.5?' good':''}" data-c="${c.id}" data-g="${r.id}" ${open?'':'disabled'}>${r.icon}<span>×${m.toFixed(2)}</span></button>`).join('')||'<span class="legend">Produce goods to trade</span>'}</div></div>`;}
    h+=`</div><label class="rep-row"><span>🔁 Returning vessels reload the same cargo</span><label class="sw"><input type="checkbox" id="tradeRep" ${T.repeat!==false?'checked':''}><span class="tr"></span></label></label>`;
    h+=`<div class="legend">Tap a good to load the next free ${'ship or train'}: it collects goods from production until full, sails, and the city pays the shown multiplier on today's price. Demand drifts every 45 s; spikes pay ×${SPIKE_MULT}. Routes and the harbour are kept through Replant.</div>`;
    $('tradeBody').innerHTML=h;
    $('tradeRep').onchange=e=>{T.repeat=e.target.checked;};
    $('hbBuy').onclick=()=>{if(buyHarbor()){tradeSig='';render();}};
    $('tradeBody').querySelectorAll('.cy-open').forEach(b=>b.onclick=()=>{if(openRoute(b.dataset.c)) render();});
    $('tradeBody').querySelectorAll('.gch').forEach(b=>b.onclick=()=>{if(dispatch(b.dataset.c,b.dataset.g)){render();} else {const c=CMAP[b.dataset.c];toast(`No free ${c.mode==='ship'?'ship':'train'} — wait for one to return${harborLvl()<HARBOR_MAX?' or upgrade the harbour':''}.`,2400);}});
    $('tradeBody').querySelectorAll('.vgo').forEach(b=>b.onclick=()=>{departNow(+b.closest('.vsl').dataset.id);render();});
  }
  const hb=$('hbBuy'); if(hb){const c=harborCost();const t=l>=HARBOR_MAX?'Harbour at max level':costBtnHtml(l?`⬆ Harbour Lv ${l+1}`:'⚓ Build the Harbour',c);if(hb._h!==t){hb.innerHTML=t;hb._h=t;}hb.disabled=l>=HARBOR_MAX||!harborAvail()||S.coins+1e-9<c;}
  document.querySelectorAll('#tradeBody .vsl').forEach(el=>{const v=T.fleet.find(x=>x.id==+el.dataset.id);if(!v) return;
    const f=v.state==='load'?v.got/v.cap:v.t/v.trip; el.querySelector('.vb').style.width=(Math.min(1,f)*100).toFixed(1)+'%';
    el.querySelector('.vt').textContent=v.state==='load'?`Loading ${fmt(v.got)} / ${fmt(v.cap)}`:v.state==='out'?`Sailing · arrives in ${fmtTime(v.trip/2-v.t)} · +🪙${fmt(v.pay)}`:`Returning · back in ${fmtTime(v.trip-v.t)}`;});
  document.querySelectorAll('#tradeBody .cy-open').forEach(b=>{b.disabled=!harborLvl()||S.coins+1e-9<CMAP[b.dataset.c].cost;});
  document.querySelectorAll('#tradeBody .gch').forEach(b=>{const c=CMAP[b.dataset.c];b.classList.toggle('nofree',routeOpen(c.id)&&!freeSlot(c.mode));});
  const cv=$('tradeMap'); if(cv&&typeof drawTradeMap==='function') drawTradeMap(cv);
}
function setupRndUI(){document.querySelectorAll('#rndTabs button').forEach(b=>b.onclick=()=>{rndTab=b.dataset.t;resSig='';tradeSig='';updateRnd();});}
function openTrade(){rndTab='trade';openSheet('rnd');}
function openResearch(){rndTab='res';openSheet('rnd');}
UI_ICONS.rnd=`<svg viewBox="0 0 32 32"><path d="M12 3h8v2h-1.5v7.5l7.2 12.3c1 1.8-.3 4.2-2.4 4.2H8.7c-2.1 0-3.4-2.4-2.4-4.2l7.2-12.3V5H12z" fill="#e8f4fb" stroke="#2f5a7a" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.2 22h13.6l2.3 3.9c.5.9-.1 2.1-1.2 2.1H8.1c-1.1 0-1.7-1.2-1.2-2.1z" fill="#5ac08a"/><circle cx="14" cy="24.5" r="1.3" fill="#fff"/><circle cx="18.5" cy="23.6" r=".9" fill="#fff"/><circle cx="23" cy="8" r="3.2" fill="#ffd34a" stroke="#b08010"/><path d="M23 6.4v3.2M21.4 8h3.2" stroke="#b08010" stroke-width="1"/></svg>`;
UI_ICONS.trade=`<svg viewBox="0 0 32 32"><path d="M3 21h26l-3.5 6H6.5z" fill="#2f6fb0" stroke="#1a3e66" stroke-width="1.2"/><rect x="7" y="15" width="5" height="6" fill="#e8742a"/><rect x="12.5" y="15" width="5" height="6" fill="#3aa0d8"/><rect x="18" y="15" width="5" height="6" fill="#e8c43a"/><rect x="9.5" y="10" width="5" height="5" fill="#5ac08a"/><rect x="23.5" y="11" width="3.5" height="10" fill="#f4f1ea" stroke="#999" stroke-width=".6"/><path d="M2 29q3.5-2 7 0t7 0 7 0 7 0" fill="none" stroke="#5aa6e8" stroke-width="1.6"/></svg>`;
