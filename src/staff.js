
/* ===================== v2.4 MANAGERS, FIRE & FIREFIGHTING (logic + UI) ===================== */
const RARITY={C:{n:'Common',c:'#8a96a4',cm:1,rm:1},R:{n:'Rare',c:'#2f86d8',cm:1.6,rm:1.3},E:{n:'Epic',c:'#9a4ad8',cm:2.5,rm:1.6},L:{n:'Legendary',c:'#e39a18',cm:4,rm:2}};
const MGR_MAX=10;
const SKILLS={
  speed:{n:'Pace Setter',e:'⚡',d:(l,rm)=>`+${Math.round(mgrSkillV('speed',l,rm)*100)}% production speed`},
  double:{n:'Lucky Batch',e:'🎲',d:(l,rm)=>`${Math.round(mgrSkillV('double',l,rm)*100)}% chance to double each batch`},
  thrift:{n:'Lean Line',e:'♻️',d:(l,rm)=>`−${Math.round(mgrSkillV('thrift',l,rm)*100)}% input use`},
  storage:{n:'Stock Master',e:'📦',d:(l,rm)=>`+${Math.round(mgrSkillV('storage',l,rm)*100)}% storage capacity`},
  orders:{n:'Client Charmer',e:'🤝',d:(l,rm)=>`+${Math.round(mgrSkillV('orders',l,rm)*100)}% reward on every client order`},
  safety:{n:'Fire Marshal',e:'🧯',d:(l,rm)=>`−${Math.round(mgrSkillV('safety',l,rm)*100)}% fire risk here, −${Math.round(l*2*rm)}% everywhere`},
};
function mgrSkillV(k,l,rm){
  if(k==='speed') return (.05+.025*l)*rm;
  if(k==='double') return Math.min(.6,(.04+.016*l)*rm);
  if(k==='thrift') return Math.min(.5,(.04+.016*l)*rm);
  if(k==='storage') return (.3+.15*l)*rm;
  if(k==='orders') return (.1+.04*l)*rm;
  if(k==='safety') return Math.min(.9,(.45+.05*l)*rm);
  return 0;
}
// one unique, hand-made manager per building (no random rolls); look indexes SKINS / HAIRS
const MANAGERS=[
  {id:'emre',bid:'sawmill',name:'Emre Yıldız',from:'İzmir',r:'C',skill:'speed',look:{f:0,skin:2,hair:0,style:'short',beard:1,out:'vest',col:'#e8742a'}},
  {id:'sofia',bid:'chipper',name:'Sofia Rossi',from:'Torino',r:'C',skill:'storage',look:{f:1,skin:0,hair:3,style:'pony',out:'vest',col:'#3aa0d8'}},
  {id:'mert',bid:'kiln',name:'Mert Demir',from:'Bursa',r:'R',skill:'safety',look:{f:0,skin:1,hair:2,style:'crew',beard:2,out:'vest',col:'#d84a3a',hatc:'#d8301e'}},
  {id:'elif',bid:'carpentry',name:'Elif Kaya',from:'Ankara',r:'R',skill:'double',look:{f:1,skin:1,hair:1,style:'long',out:'suit',col:'#6a3a2a',tie:'#e8c43a',glasses:1}},
  {id:'kwame',bid:'pellet',name:'Kwame Mensah',from:'Accra',r:'R',skill:'thrift',look:{f:0,skin:5,hair:6,style:'bald',beard:1,out:'vest',col:'#9a6ad8',glasses:1}},
  {id:'yuki',bid:'paper',name:'Yuki Tanaka',from:'Osaka',r:'E',skill:'speed',look:{f:1,skin:0,hair:6,style:'bun',out:'suit',col:'#2a4a5a',tie:'#4ac0a0'}},
  {id:'defne',bid:'furniture',name:'Defne Aydın',from:'İstanbul',r:'E',skill:'double',look:{f:1,skin:1,hair:7,style:'long',out:'suit',col:'#2e2e3a',tie:'#e85a9a'}},
  {id:'lucas',bid:'atelier',name:'Lucas Moreau',from:'Lyon',r:'E',skill:'thrift',look:{f:0,skin:0,hair:4,style:'short',out:'suit',col:'#1c1c22',tie:'#d8a930'}},
  {id:'zeynep',bid:'parquet',name:'Zeynep Çelik',from:'Trabzon',r:'E',skill:'storage',look:{f:1,skin:2,hair:1,style:'pony',out:'suit',col:'#5a3a22',tie:'#f5c84c',glasses:1}},
  {id:'priya',bid:'stationer',name:'Priya Sharma',from:'Mumbai',r:'L',skill:'orders',look:{f:1,skin:3,hair:0,style:'long',out:'suit',col:'#1f3a5a',tie:'#f5c84c'}},
  {id:'can',bid:'cabinetry',name:'Can Öztürk',from:'Antalya',r:'L',skill:'speed',look:{f:0,skin:1,hair:5,style:'short',beard:1,out:'suit',col:'#3a2418',tie:'#d8a930',glasses:1}},
  {id:'isabella',bid:'showroom',name:'Isabella García',from:'Sevilla',r:'L',skill:'double',look:{f:1,skin:2,hair:0,style:'bun',out:'suit',col:'#6a1f3a',tie:'#f5d36a'}},
];
const MGR_OF={}; MANAGERS.forEach(m=>MGR_OF[m.bid]=m);
const MGR_MAP={}; MANAGERS.forEach(m=>MGR_MAP[m.id]=m);
function mgrLvl(bid){const m=MGR_OF[bid];return (m&&S.mgr&&S.mgr[m.id])||0;}
function mgrRm(bid){return RARITY[MGR_OF[bid].r].rm;}
function mgrSkill(bid,k){const l=mgrLvl(bid);if(!l) return 0;const m=MGR_OF[bid];return m.skill===k?mgrSkillV(k,l,RARITY[m.r].rm):0;}
function mgrSpd(bid){const l=mgrLvl(bid);if(!l) return 1;return (1+.02+.01*l)*(1+mgrSkill(bid,'speed'));}   // every manager: +3..12% base, plus their skill
function mgrIn(bid){return 1-mgrSkill(bid,'thrift');}
function mgrOut(bid){return 1+mgrSkill(bid,'double');}
function mgrSto(bid){return 1+mgrSkill(bid,'storage');}
function mgrOrders(){let b=0;for(const m of MANAGERS) if(m.skill==='orders') b+=mgrSkill(m.bid,'orders');return 1+b;}
function mgrHireCost(m){return BMAP[m.bid].cost*1000*RARITY[m.r].cm;}
function mgrUpCost(m,l){return {coins:mgrHireCost(m)*Math.pow(3.2,l),seeds:l>=5?l-3:0};}
function mgrAvail(m){const b=BMAP[m.bid];return S.buildings[m.bid].lvl>0&&(!b.premium||S.premium.lvl>0);}
function hireMgr(id){const m=MGR_MAP[id];if(!m||mgrLvl(m.bid)||!mgrAvail(m)) return false;const c=mgrHireCost(m);if(S.coins+1e-9<c) return false;
  S.coins-=c;S.mgr[m.id]=1;M=computeMods();sfx('unlock');scene.mgrPoof=m.bid;
  toast(`${RARITY[m.r].n==='Legendary'?'🌟':'🤝'} <b>${m.name}</b> now runs the ${BMAP[m.bid].name}! ${SKILLS[m.skill].e} ${SKILLS[m.skill].n}: ${SKILLS[m.skill].d(1,RARITY[m.r].rm)}`,4200,'ms-toast');
  checkAch&&checkAch();return true;}
function levelMgr(id){const m=MGR_MAP[id];const l=m?mgrLvl(m.bid):0;if(!l||l>=MGR_MAX) return false;const c=mgrUpCost(m,l);if(S.coins+1e-9<c.coins||S.seeds<c.seeds) return false;
  S.coins-=c.coins;S.seeds-=c.seeds;S.mgr[m.id]=l+1;M=computeMods();sfx('buy');scene.mgrPoof=m.bid;
  toast(`⬆ <b>${m.name}</b> → Lv ${l+1}: ${SKILLS[m.skill].d(l+1,RARITY[m.r].rm)}`);return true;}

/* ---------- fire ---------- */
const FIRE_BASE=1/4500, FIRE_HP=12, FIRE_BURN=60, FIRE_COOL=120, FIRE_GRACE=300;
const FIRE_RISK={kiln:3,pellet:2,sawmill:1.2,chipper:1,carpentry:.8,paper:.8,furniture:.8};
const STATION_COST=6e4, STATION_MAX=5;
function stationLvl(){return (S.station&&S.station.lvl)||0;}
function stationCost(){return STATION_COST*Math.pow(6,stationLvl());}
function stationVisible(){return stationLvl()>0||S.buildings.kiln.lvl>0||S.fireStats.n>0;}
function stationDelay(){const l=stationLvl();return Math.max(4,20-3*l);}
function stationSpray(){return 1.5+.5*stationLvl();}
function onFire(bid){return !!(S.fires&&S.fires[bid]);}
function fireRisk(bid){
  if(!FIRE_RISK[bid]) return 0;
  let r=FIRE_BASE*FIRE_RISK[bid]*(1-.1*stationLvl())*(M?M.fire:1);
  r*=1-mgrSkill(bid,'safety');
  for(const m of MANAGERS) if(m.skill==='safety'&&mgrLvl(m.bid)) r*=1-.02*mgrLvl(m.bid)*RARITY[m.r].rm;
  if(S.wx){const w=weatherId();if(w==='rain'||w==='snow') r*=.7;if(seasonIdx()===3) r*=1.2;}
  return r;
}
function startFire(bid){
  if(!S.buildings[bid]||!S.buildings[bid].lvl||onFire(bid)) return false;
  S.fires[bid]={t:0,hp:FIRE_HP,max:FIRE_HP,taps:0,eta:stationLvl()?stationDelay()+7:-1};
  sfx&&sfx('event'); toast(`🔥 <b>Fire at the ${BMAP[bid].name}!</b> ${stationLvl()?'The fire brigade is on its way — tap the flames to help!':'Tap the flames to put it out!'}`,4200);
  return true;
}
function fireTick(dt,offline){
  if(!S.fires) return;
  for(const bid in S.fires){const f=S.fires[bid];f.t+=dt;
    if(f.eta>=0&&f.t>=f.eta){f.hp-=stationSpray()*dt;f.spray=1;}
    if(f.hp<=0){extinguish(bid,f.taps>=f.max*.5?'tap':'truck',offline);continue;}
    if(f.t>=FIRE_BURN){delete S.fires[bid];S.fireCool=S.time+FIRE_COOL;if(!offline) toast(`🧯 The fire at the ${BMAP[bid].name} burnt out. Repairs done, back to work!`);scene.smoulder=scene.smoulder||{};scene.smoulder[bid]=8;}}
  if(offline||S.time<FIRE_GRACE||(S.fireCool||0)>S.time||Object.keys(S.fires).length) return;
  let built=0; for(const b of MAIN_BLD) if(S.buildings[b.id].lvl) built++; if(built<3) return;
  for(const b of MAIN_BLD){const st=S.buildings[b.id];if(!st.lvl||!st.on) continue;if(Math.random()<fireRisk(b.id)*dt){startFire(b.id);break;}}
}
function tapFire(bid){const f=S.fires[bid];if(!f) return false;f.hp-=1;f.taps++;scene.fireTap={bid,t:0};if(f.hp<=0) extinguish(bid,'tap');return true;}
function extinguish(bid,by,offline){
  const f=S.fires[bid];if(!f) return; delete S.fires[bid]; S.fireCool=S.time+FIRE_COOL; S.fireStats.n++; if(by==='tap') S.fireStats.tap++;
  const r=by==='tap'?Math.max(150,coinRate*30):Math.max(50,coinRate*10); earn(r);
  scene.smoulder=scene.smoulder||{}; scene.smoulder[bid]=6; scene.fireOut={bid,t:0,r,by};
  if(!offline){toast(by==='tap'?`🧑‍🚒 <b>Fire out!</b> You saved the ${BMAP[bid].name}: +${fmt(r)} coins hero bonus`:`🚒 <b>The fire brigade put out the fire</b> at the ${BMAP[bid].name}. Insurance paid +${fmt(r)}`,3800,'ms-toast');sfx('unlock');}
  checkAch&&checkAch();
}
function buyStation(){const l=stationLvl();if(l>=STATION_MAX) return false;const c=stationCost();if(S.coins+1e-9<c) return false;
  S.coins-=c;S.station.lvl=l+1;M=computeMods();sfx('unlock');stationPoof();
  toast(l?`🚒 Fire Station → Lv ${l+1}: fire risk −${(l+1)*10}%, the truck rolls out in ${stationDelay()}s and sprays faster`:`🚒 <b>Fire Station built!</b> A fire truck now answers every fire automatically.`,4200,'ms-toast');
  for(const bid in S.fires){const f=S.fires[bid];if(f.eta<0) f.eta=f.t+stationDelay()+7;}
  return true;}

/* ---------- portraits (SVG, drawn in code) ---------- */
function portraitSVG(m,size){
  const L=m.look,sk=SKINS[L.skin],hr=HAIRS[L.hair],R=RARITY[m.r],id='pg'+m.id;size=size||56;
  const suit=L.out==='suit', body=suit?L.col:'#e8e4dc';
  let h=`<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="portrait"><defs><radialGradient id="${id}" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#fff6e0"/><stop offset="1" stop-color="${R.c}"/></radialGradient>
    <clipPath id="${id}c"><circle cx="32" cy="32" r="29"/></clipPath></defs><circle cx="32" cy="32" r="31" fill="${R.c}"/><circle cx="32" cy="32" r="29" fill="url(#${id})"/><g clip-path="url(#${id}c)">`;
  if(L.style==='long') h+=`<path d="M17 30 Q16 52 22 56 L42 56 Q48 52 47 30 Z" fill="${shade(hr,.85)}"/>`;
  // shoulders / outfit
  h+=`<path d="M8 66 Q9 47 24 44 L40 44 Q55 47 56 66 Z" fill="${body}"/>`;
  if(suit){h+=`<path d="M26 44 L32 56 L38 44 Z" fill="#f6f4ee"/><path d="M30.6 46 L33.4 46 L34.4 58 L32 61 L29.6 58 Z" fill="${L.tie||'#c83a2e'}"/><path d="M24 44 L31 58 L26 60 Z M40 44 L33 58 L38 60 Z" fill="${shade(L.col,.75)}"/>`;}
  else {h+=`<path d="M10 66 Q11 49 22 45.5 L28 45 L30 66 Z M54 66 Q53 49 42 45.5 L36 45 L34 66 Z" fill="${L.col}"/><rect x="11" y="56" width="18" height="2.2" fill="#eef2f4" opacity=".9"/><rect x="35" y="56" width="18" height="2.2" fill="#eef2f4" opacity=".9"/>`;}
  h+=`<rect x="28" y="36" width="8" height="9" rx="3" fill="${shade(sk,.88)}"/><ellipse cx="32" cy="27" rx="11" ry="12.5" fill="${sk}"/><ellipse cx="21.3" cy="28" rx="2" ry="3" fill="${shade(sk,.9)}"/><ellipse cx="42.7" cy="28" rx="2" ry="3" fill="${shade(sk,.9)}"/>`;
  // hair
  if(L.style!=='bald'){
    if(L.style==='crew') h+=`<path d="M21.5 24 Q22 14 32 14 Q42 14 42.5 24 Q38 19 32 19 Q26 19 21.5 24 Z" fill="${hr}"/>`;
    else h+=`<path d="M20.5 27 Q19 13 32 13 Q45 13 43.5 27 Q42 19 35 18.5 Q30 22 22 22 Q21 24 20.5 27 Z" fill="${hr}"/>`;
    if(L.style==='bun') h+=`<circle cx="32" cy="11.5" r="5" fill="${hr}"/>`;
    if(L.style==='pony') h+=`<path d="M42 19 Q50 24 46 36 Q44 28 41 24 Z" fill="${hr}"/>`;
  } else h+=`<path d="M22 22 Q24 15 32 15 Q40 15 42 22" fill="none" stroke="${shade(sk,.85)}" stroke-width="1.5" opacity=".6"/>`;
  if(L.beard===2) h+=`<path d="M26.5 31.6 Q32 29.4 37.5 31.6 Q36 33.4 32 32.4 Q28 33.4 26.5 31.6 Z" fill="${hr}"/>`;
  else if(L.beard) h+=`<path d="M21.5 28 Q22 40 32 40.5 Q42 40 42.5 28 Q41 34 37 35 Q32 33 27 35 Q23 34 21.5 28 Z" fill="${hr}" opacity=".95"/>`;
  // face
  h+=`<ellipse cx="27.5" cy="27.5" rx="1.5" ry="1.8" fill="#2a1a12"/><ellipse cx="36.5" cy="27.5" rx="1.5" ry="1.8" fill="#2a1a12"/><circle cx="28" cy="27" r=".5" fill="#fff"/><circle cx="37" cy="27" r=".5" fill="#fff"/>
    <path d="M25 23.5 Q27.5 22.4 30 23.5 M34 23.5 Q36.5 22.4 39 23.5" stroke="${shade(hr,.8)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M28.5 33.2 Q32 35.8 35.5 33.2" stroke="#8a3a2a" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="25" cy="31.5" rx="2" ry="1.1" fill="#e88a7a" opacity=".35"/><ellipse cx="39" cy="31.5" rx="2" ry="1.1" fill="#e88a7a" opacity=".35"/>`;
  if(L.glasses) h+=`<g fill="none" stroke="#2a2a2e" stroke-width="1.2"><circle cx="27.5" cy="27.6" r="3.4"/><circle cx="36.5" cy="27.6" r="3.4"/><path d="M30.9 27.4 L33.1 27.4"/></g>`;
  if(L.out==='vest') h+=`<path d="M19 16.5 Q20 8 32 8 Q44 8 45 16.5 L47 18 Q32 15 17 18 Z" fill="${L.hatc||'#f7f7f2'}" stroke="${L.hatc?shade(L.hatc,.7):'#c8c8c0'}" stroke-width=".6"/>`;
  h+=`</g><circle cx="32" cy="32" r="30" fill="none" stroke="${shade(R.c,1.25)}" stroke-width="1.5" opacity=".8"/></svg>`;
  return h;
}
function mgrHumanLook(m){if(m._look) return m._look;const L=m.look;
  return m._look={female:!!L.f,skin:SKINS[L.skin],hair:HAIRS[L.hair],style:L.style==='crew'?'crew':L.style,beard:L.beard===1?HAIRS[L.hair]:null,mus:L.beard===2?HAIRS[L.hair]:null,
    hat:L.out==='vest'?'hard':null,hatc:L.hatc||'#f7f7f2',shirt:L.out==='suit'?L.col:'#e8e4dc',vest:L.out==='vest'?L.col:null,suit:L.out==='suit',tie:L.tie,glasses:!!L.glasses,
    plaid:null,pants:L.out==='suit'?shade(L.col,.8):'#2e3440',boots:'#1a1a1e'};}

/* ---------- Staff sheet (managers + fire station) ---------- */
let staffSig='';
function mgrBtnHtml(m){const l=mgrLvl(m.bid);if(!mgrAvail(m)&&!l) return {h:`🔒 Build the ${BMAP[m.bid].name}`,dis:true};
  if(!l){const c=mgrHireCost(m);return {h:costBtnHtml('🤝 Hire',c),dis:S.coins+1e-9<c};}
  if(l>=MGR_MAX) return {h:'★ Max level',dis:true};
  const c=mgrUpCost(m,l);return {h:costBtnHtml(`⬆ Lv ${l+1}`+(c.seeds?` · ${c.seeds}🌱`:''),c.coins),dis:S.coins+1e-9<c.coins||S.seeds<c.seeds};}
function mgrCardHtml(m,compact){const R=RARITY[m.r],sk=SKILLS[m.skill],l=mgrLvl(m.bid);
  return `<div class="mgr-card${l?' hired':''}${compact?' compact':''}" data-id="${m.id}" style="--rc:${R.c}"><div class="mg-p">${portraitSVG(m,compact?50:58)}</div>
    <div class="mg-b"><div class="mg-n">${m.name} <span class="mg-r">${R.n}</span></div><div class="mg-s">${compact?'':`${BMAP[m.bid].icon} ${BMAP[m.bid].name} · `}<span class="mg-lv">${l?'Lv '+l:'from '+m.from}</span></div>
    <div class="mg-k">${sk.e} <b>${sk.n}</b>: <span class="mg-kd"></span></div></div><button class="btn buy small mg-btn"></button></div>`;}
function mgrCardUpdate(el){const m=MGR_MAP[el.dataset.id],l=mgrLvl(m.bid),R=RARITY[m.r];
  const kd=`${SKILLS[m.skill].d(Math.max(1,l),R.rm)}${l?` · +${Math.round(((1.04+.02*l)-1)*100)}% speed`:''}`;const ke=el.querySelector('.mg-kd');if(ke._t!==kd){ke.textContent=kd;ke._t=kd;}
  el.classList.toggle('hired',!!l);el.querySelector('.mg-lv').textContent=l?'Lv '+l+(l>=MGR_MAX?' ★':''):'from '+m.from;
  const b=mgrBtnHtml(m),bt=el.querySelector('.mg-btn');if(bt._h!==b.h){bt.innerHTML=b.h;bt._h=b.h;}bt.disabled=b.dis;}
function wireMgrCards(root){root.querySelectorAll('.mgr-card').forEach(el=>{el.querySelector('.mg-btn').onclick=e=>{e.stopPropagation();const m=MGR_MAP[el.dataset.id];
  if(mgrLvl(m.bid)) levelMgr(m.id); else hireMgr(m.id); staffSig='';bpSig='';render();};});}
function updateStaff(){
  const dot=$('staffDot'); if(dot) dot.classList.toggle('hidden',curSheet==='staff'||!(Object.keys(S.fires).length||MANAGERS.some(m=>!mgrLvl(m.bid)&&mgrAvail(m)&&S.coins>=mgrHireCost(m))));
  if(curSheet!=='staff') return;
  const sig=stationLvl()+'|'+stationVisible()+'|'+MANAGERS.map(m=>mgrLvl(m.bid)+(mgrAvail(m)?'a':'')).join(',')+'|'+Object.keys(S.fires).join();
  if(sig!==staffSig){staffSig=sig;const l=stationLvl(),n=MANAGERS.filter(m=>mgrLvl(m.bid)).length;
    const fl=Object.keys(S.fires);
    let h=fl.length?`<div class="fire-note">🔥 <b>Fire at the ${fl.map(b=>BMAP[b].name).join(', ')}!</b> Tap the flames in the scene${l?' — the fire brigade is on its way.':'.'}</div>`:'';
    h+=`<h4>👔 Managers <span class="mg-count">${n}/${MANAGERS.length} hired</span></h4><div class="list">`+MANAGERS.map(m=>mgrCardHtml(m)).join('')+`</div>`;
    h+=`<div class="legend">Every building has one unique manager. They boost speed, add their special skill, keep working offline and stay with you through Replant. Levels 6–10 also cost Seeds.</div>`;
    h+=`<h4>🚒 Fire Safety</h4><div class="stn-hero"><div class="ph-ic">${UI_ICONS.fire}</div><div style="flex:1"><div class="ph-t">${l?`Fire Station · Lv ${l}`:'Fire Station'}</div>
      <div class="legend" style="margin:2px 0 0" id="stnTx"></div><div class="stn-stats">🧯 ${S.fireStats.n} fires put out (${S.fireStats.tap} by hand) · Kiln risk <span id="stnRisk"></span></div></div></div>
      <button class="btn red big" id="stnBuy"></button>`;
    $('staffBody').innerHTML=h; wireMgrCards($('staffBody'));
    $('stnBuy').onclick=()=>{if(buyStation()){staffSig='';render();}};
  }
  const l=stationLvl(),c=stationCost(),b=$('stnBuy');
  const bh=l>=STATION_MAX?'Fire Station at max level':costBtnHtml(l?`⬆ Fire Station Lv ${l+1}`:'🚒 Build the Fire Station',c);
  if(b._h!==bh){b.innerHTML=bh;b._h=bh;} b.disabled=l>=STATION_MAX||S.coins+1e-9<c;
  const tx=l?`A red fire truck races to every fire after <b>${stationDelay()}s</b> and sprays ${stationSpray().toFixed(1)}/s. Fire risk −${l*10}%.`:`Fires break out now and then (kilns most of all). Tap the flames 12× to put one out, or build a fire station to answer every fire automatically. An unattended fire pauses the building for ${FIRE_BURN}s.`;
  const te=$('stnTx'); if(te._t!==tx){te.innerHTML=tx;te._t=tx;}
  const rk=fireRisk('kiln'); $('stnRisk').textContent=S.buildings.kiln.lvl?(rk>0?'≈ 1 per '+fmtTime(1/rk):'none'):'—';
  document.querySelectorAll('#staffBody .mgr-card').forEach(mgrCardUpdate);
}
function updateBldMgr(b){
  const el=$('bpMgr'); if(!el) return; const m=MGR_OF[b.id]; if(!m||!S.buildings[b.id].lvl){el.classList.add('hidden');return;} el.classList.remove('hidden');
  if(el.dataset.id!==m.id){el.dataset.id=m.id;el.innerHTML=`<h4>👔 Manager</h4>`+mgrCardHtml(m,true);wireMgrCards(el);}
  mgrCardUpdate(el.querySelector('.mgr-card'));
  const fb=$('bpFire'); if(fb){const f=S.fires[b.id];fb.classList.toggle('hidden',!f);if(f) fb.innerHTML=`🔥 <b>On fire!</b> Tap the flames in the scene (${Math.ceil(f.hp)} left)${f.eta>=0?(f.t<f.eta?` · 🚒 arriving in ${Math.ceil(f.eta-f.t)}s`:' · 🚒 spraying'):''}`;}
}
function setupStaffUI(){}
UI_ICONS.staff=`<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="6" fill="#f0c8a0" stroke="#6a4020" stroke-width="1.4"/><path d="M10 8 Q11 3 16 3 Q21 3 22 8 Q19 6 16 6 Q13 6 10 8Z" fill="#4a2c18"/><path d="M5 30 Q6 19 16 18 Q26 19 27 30Z" fill="#2e3a5a" stroke="#1a2236" stroke-width="1.4"/><path d="M13 18.5 L16 24 L19 18.5Z" fill="#fff"/><path d="M15.2 19.5 L16.8 19.5 L17.4 25 L16 27 L14.6 25Z" fill="#e8a020"/></svg>`;
UI_ICONS.fire=`<svg viewBox="0 0 32 32"><rect x="2" y="13" width="20" height="11" rx="1.5" fill="#d42a1e" stroke="#7a1410" stroke-width="1.2"/><path d="M22 16 L27 16 L30 20 L30 24 L22 24Z" fill="#d42a1e" stroke="#7a1410" stroke-width="1.2"/><rect x="23.5" y="17.2" width="3.5" height="3" fill="#bfe0f0"/><rect x="3" y="10.5" width="17" height="1.6" fill="#ddd"/><path d="M4 10.5 L4 13 M8 10.5 L8 13 M12 10.5 L12 13 M16 10.5 L16 13" stroke="#999"/><rect x="24" y="11.5" width="3" height="2" fill="#4a8af0"/><circle cx="8" cy="25" r="3" fill="#222"/><circle cx="25" cy="25" r="3" fill="#222"/><rect x="2" y="19" width="20" height="1.5" fill="#fff"/></svg>`;
