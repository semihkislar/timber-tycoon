'use strict';

/* ===================== UI ICONS (bottom bar) ===================== */
const UI_ICONS={
  crew:`<svg viewBox="0 0 32 32"><circle cx="16" cy="10" r="6" fill="#f2c9a0"/><path d="M9 9a7 7 0 0 1 14 0v1H9z" fill="#f5b52e"/><rect x="8" y="9" width="16" height="2.4" rx="1" fill="#d8901a"/><path d="M6 30c0-6 4.5-10 10-10s10 4 10 10z" fill="#d9582f"/><path d="M13 20h6l-1 10h-4z" fill="#3b6fb0"/><rect x="24" y="12" width="2.6" height="14" rx="1" fill="#7a4a22" transform="rotate(18 25 19)"/><path d="M24 10l6 2-2 5-5-2z" fill="#b8c4cf"/></svg>`,
  market:`<svg viewBox="0 0 32 32"><path d="M4 13h24l-2 15H6z" fill="#c9773a"/><path d="M4 13h24l-1 3H5z" fill="#a35a26"/><path d="M3 6h26l1 7H2z" fill="#e85a4a"/><path d="M8 6h4l-1 7H7zM16 6h4l1 7h-4zM24 6h3l2 7h-3z" fill="#fff3e0"/><circle cx="16" cy="21" r="4.5" fill="#f5c84c" stroke="#c08a20" stroke-width="1.4"/><text x="16" y="23.6" text-anchor="middle" font-size="6.5" font-weight="900" fill="#8a6210">$</text></svg>`,
  upg:`<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#5fb441"/><circle cx="16" cy="16" r="13" fill="none" stroke="#3b7f27" stroke-width="2"/><path d="M16 7l8 9h-5v8h-6v-8H8z" fill="#fff"/></svg>`,
  ach:`<svg viewBox="0 0 32 32"><path d="M9 4h14v7a7 7 0 0 1-14 0z" fill="#f5c84c"/><path d="M9 6H4c0 5 2 8 6 8M23 6h5c0 5-2 8-6 8" fill="none" stroke="#e0a020" stroke-width="2.4"/><rect x="14" y="17" width="4" height="6" fill="#e0a020"/><rect x="9" y="23" width="14" height="5" rx="1.5" fill="#8a5a32"/><path d="M12 6h3v7h-1a3 3 0 0 1-2-3z" fill="#fff6c8" opacity=".7"/></svg>`,
  co:`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="27" rx="10" ry="3" fill="#8a5a32"/><path d="M16 27V14" stroke="#4a8a2a" stroke-width="2.6"/><path d="M16 16C9 16 6 11 6 6c6 0 10 3 10 10z" fill="#7cc04f"/><path d="M16 14c0-6 4-10 10-10 0 6-4 10-10 10z" fill="#5a9a37"/></svg>`,
  set:`<svg viewBox="0 0 32 32"><path d="M16 3l2.6 3.4 4.2-.9.9 4.2L27 12l-1.8 4 1.8 4-3.3 1.3-.9 4.2-4.2-.9L16 29l-2.6-3.4-4.2.9-.9-4.2L5 20l1.8-4L5 12l3.3-1.3.9-4.2 4.2.9z" fill="#8f9aa6"/><circle cx="16" cy="16" r="5.5" fill="#f7e3c0" stroke="#5f6a76" stroke-width="2"/></svg>`,
  logyard:`<svg viewBox="0 0 32 32"><g fill="#a86a38"><rect x="3" y="17" width="26" height="6" rx="3"/><rect x="6" y="11" width="20" height="6" rx="3"/><rect x="10" y="5" width="12" height="6" rx="3"/></g><g fill="#e8c08a" stroke="#8a5a2b" stroke-width="1"><circle cx="5.5" cy="20" r="2.6"/><circle cx="8.5" cy="14" r="2.6"/><circle cx="12.5" cy="8" r="2.6"/></g></svg>`,
  dock:`<svg viewBox="0 0 32 32"><rect x="2" y="14" width="18" height="10" rx="1.5" fill="#3e86c8"/><path d="M20 16h6l4 4v4H20z" fill="#e85a4a"/><rect x="22" y="17" width="4" height="3" fill="#cfe8ff"/><circle cx="8" cy="25" r="3" fill="#333"/><circle cx="25" cy="25" r="3" fill="#333"/><rect x="4" y="9" width="6" height="5" fill="#c99357"/><rect x="11" y="10" width="6" height="4" fill="#e8c08a"/></svg>`,
};

/* ===================== SHEETS ===================== */
let curSheet=null, sheetBld=null;
const SHEETS={
  bld:{title:'Building'},
  crew:{title:'Crew & Forest',icon:'crew'},
  market:{title:'Market & Shipping',icon:'market'},
  upg:{title:'Upgrades',icon:'upg'},
  ach:{title:'Trophies',icon:'ach'},
  co:{title:'Replant & Stats',icon:'co'},
  set:{title:'Settings',icon:'set'},
  ord:{title:'Orders',icon:'ord'},
  prem:{title:'Premium Factory Area',icon:'prem'},
  staff:{title:'Team, Hires & Fire',icon:'staff'},
  rnd:{title:'Research & Trade',icon:'rnd'},
};
function openSheet(name,arg){
  const prev=curSheet;
  if(prev==='ach'&&name!=='ach') achFresh={};
  curSheet=name; sheetBld=name==='bld'?arg:null;
  if(name==='ord'&&dailyAwaiting()&&!S.orders.offer&&!S.orders.active) ordTab='daily';
  Object.keys(SHEETS).forEach(k=>$('pane-'+k).classList.toggle('hidden',k!==name));
  const sh=$('sheet'); sh.dataset.s=name; sh.classList.add('open'); document.body.classList.add('sheet-on'); sh.setAttribute('aria-hidden','false');
  if(name==='bld'){ const b=BMAP[arg]; $('shTitle').textContent=b.name; $('shIc').innerHTML=svgIcon(b.svg,30); }
  else { $('shTitle').textContent=SHEETS[name].title; $('shIc').innerHTML=UI_ICONS[SHEETS[name].icon]||''; }
  document.querySelectorAll('#bottombar .bb').forEach(x=>x.classList.toggle('on',x.dataset.s===name));
  if(prev!==name||name==='bld') $('shBody').scrollTop=0;
  achSig=''; mktSig=''; upgSig=''; treeSig=''; cSig=''; bpSig=''; ordSig=''; dailySig=''; premSig=''; staffSig=''; resSig=''; tradeSig=''; pwSig=''; bySig=''; shSig='';
  render();
  if(name==='bld') requestAnimationFrame(()=>focusLot(arg));
  if(name==='prem'&&S.premium.lvl>0) requestAnimationFrame(()=>focusPrem());
}
function closeSheet(){
  if(curSheet==='ach') achFresh={};
  curSheet=null; sheetBld=null;
  const sh=$('sheet'); sh.classList.remove('open'); document.body.classList.remove('sheet-on'); sh.setAttribute('aria-hidden','true');
  document.querySelectorAll('#bottombar .bb').forEach(x=>x.classList.remove('on'));
}
function sheetTop(){const sh=$('sheet'); if(!sh.classList.contains('open')) return window.innerHeight; const b=parseFloat(getComputedStyle(sh).bottom)||0; return window.innerHeight-b-sh.offsetHeight;}
function sheetPop(id){
  if(curSheet==='bld'&&sheetBld===id){const p=$('pane-bld'); p.classList.remove('ms-pop'); void p.offsetWidth; p.classList.add('ms-pop');}
}
function setMult(m){
  buyMult=m==='max'?'max':+m;
  document.querySelectorAll('.seg.mult button').forEach(x=>x.classList.toggle('on',x.dataset.m===String(m)));
  render();
}

/* ===================== RENDER: COLLECTORS ===================== */
const colEls={};
let cSig='';
function colVisible(c,i){return S.collectors[c.id]>0||S.totalEarned>=c.cost*cs()*0.3||i===0;}
function buildCollectors(){
  const L=$('colList'); L.innerHTML=''; let teaser=false;
  COLLECTORS.forEach((c,i)=>{
    const vis=colVisible(c,i);
    if(!vis){ if(teaser) return; teaser=true;
      const d=document.createElement('div');d.className='card locked';
      d.innerHTML=`<div class="ic">❔</div><div><div class="nm">???</div><div class="ds">Earn 🪙 ${fmt(c.cost*cs()*0.3)} total to reveal</div></div><div></div>`;
      L.appendChild(d); return; }
    const d=document.createElement('div');d.className='card';d.dataset.id=c.id;
    d.innerHTML=`<div class="ic">${svgIcon(c.svg,32)}</div><div><div class="nm">${c.name}<span class="cnt"></span></div><div class="ds"></div><div class="pbar"><i></i></div></div><button class="btn buy"></button>`;
    const btn=d.querySelector('button'); btn.onclick=()=>{buyCollector(c.id);render();};
    colEls[c.id]={d,cnt:d.querySelector('.cnt'),ds:d.querySelector('.ds'),btn,pbar:d.querySelector('.pbar>i')};
    L.appendChild(d);
  });
}
function colSig(){return COLLECTORS.map((c,i)=>colVisible(c,i)?1:0).join('');}
function updateCollectors(){
  if(curSheet!=='crew') return;
  const s1=colSig(); if(s1!==cSig){cSig=s1;buildCollectors();}
  for(const c of COLLECTORS){const e=colEls[c.id]; if(!e||!e.d.isConnected) continue;
    const own=S.collectors[c.id]; const n=qty(c.cost,COL_SCALE,own); const cost=colCost(c.id,own,n);   // v2.20.1: the first Lumberjack of a run is free
    e.cnt.textContent=own?'×'+own:''; const r=colRate(c.id);
    e.ds.textContent=`+${fr(r)} 🪵/s each`+(own?` · ${fr(r*own)}/s total`:` · ${c.desc}`);
    e.btn.innerHTML=costBtnHtml(`Hire${n>1?' ×'+n:''}`,cost);
    e.btn.disabled=S.coins+1e-9<cost; e.d.classList.toggle('afford',!e.btn.disabled);
    if(e.pbar) e.pbar.style.width=(cost>0?Math.min(100,S.coins/cost*100):100).toFixed(0)+'%';
  }
}

/* ===================== RENDER: BUILDING SHEET ===================== */
function bVisible(b,i){if(b.premium) return S.premium.lvl>0; if(b.tech) return bldUnlocked(b.id)||S.buildings[b.id].lvl>0; if(i===undefined) i=BUILDINGS.indexOf(b); return S.buildings[b.id].lvl>0||S.totalEarned>=b.cost*cs()*0.25||i===0;}
function statusOf(b){
  const st=S.buildings[b.id],bs=bstat[b.id];
  if(!st.lvl) return {cls:'off',txt:'Not built',f:0};
  if(!st.on) return {cls:'off',txt:'⏸ Off',f:0};
  if(onFire(b.id)) return {cls:'bad',txt:'🔥 On fire! Tap the flames',f:0};
  if(bs.full&&bs.f<0.985) return {cls:'bad',txt:`⛔ Storage FULL: ${RMAP[bs.full].name}`,f:bs.f};
  const fs=isFinite(bs.fs)?bs.fs:bs.f, nm=RMAP[bs.lim]?RMAP[bs.lim].name:'input';   // v2.15.1: smoothed, so a one-tick dip doesn't flash a warning
  if(bs.lim&&fs<0.9) return {cls:'bad',txt:`⚠ Short on ${nm}`,f:bs.f};
  if(bs.lim&&bs.f<0.985) return {cls:'',txt:`Slightly short on ${nm}`,f:bs.f};
  return {cls:'',txt:'✔ Running',f:bs.f};
}
let bpSig='';
function updateBuildingSheet(){
  if(curSheet!=='bld'||!sheetBld) return;
  const b=BMAP[sheetBld], st=S.buildings[b.id], vis=bVisible(b);
  const sig=b.id+'|'+vis+'|'+(st.lvl>0)+'|'+(M.sawdust?1:0);
  if(sig!==bpSig){bpSig=sig;
    $('bpIc').innerHTML=svgIcon(b.svg,40); $('bpName').textContent=vis?b.name:'Unknown building';
    {const tb=$('bpTier'),T=vis&&typeof tierBadge==='function'&&BTIER[b.id];tb.innerHTML=T?` ${tierBadge(b.id)}`:'';tb.title=T?TIER_N[BTIER[b.id]]:'';}
    $('bpDesc').innerHTML=vis?`${b.desc} <b>${recipeStr(b)}</b>`:'';
    $('bpLocked').classList.toggle('hidden',vis); $('bpMain').classList.toggle('hidden',!vis);
    $('shTitle').textContent=vis?b.name:'Empty lot';
  }
  if(!vis){$('bpLocked').innerHTML=`🔒 This lot is still covered in brambles.<br>Earn <b>🪙 ${fmt(b.cost*cs()*0.25)}</b> in total to reveal what can be built here (now ${fmt(S.totalEarned)}).`;$('bpLv').textContent='';return;}
  {const mg=$('bpMargin');if(mg){mg.classList.toggle('hidden',!(typeof BTIER==='object'&&BTIER[b.id]));}if(mg&&typeof bMargin==='function'&&BTIER[b.id]){const v=st.lvl?bMargin(b.id):0,u=unitMargin(b.id);const ph=`<b class="tier-line t${BTIER[b.id]}">${TIER_N[BTIER[b.id]]}</b> · `;const tx=ph+(BTIER[b.id]===1?(st.lvl?`📈 Earns <b>🪙${fmt(v)}/s</b> from logs, which can't be sold`:`📈 Turns logs (not for sale) into goods worth 🪙${fmt(u,1)} per unit`):st.lvl?`📈 Processing adds <b>${v>=0?'+':''}🪙${fmt(v)}/s</b> over selling its inputs raw (${u>=0?'+':''}${fmt(u,1)} per unit)`:`📈 +${fmt(u,1)} per unit over the value of its inputs`);if(mg._t!==tx){mg.innerHTML=tx;mg._t=tx;}}}
  const room=st.lvl&&wsHas(b.id)?wsRoom(b.id):1e9, n=Math.max(1,Math.min(qty(b.cost,b.scale,st.lvl),room)); const cost=bulkCost(b.cost,b.scale,st.lvl,n);   // v2.22: clipped at the workstation gate
  $('bpLv').textContent=st.lvl?' Lv '+st.lvl:'';
  const mc=msCount(st.lvl),nx=nextMs(st.lvl),prev=mc?MILESTONES[mc-1]:0;
  const sh=Math.min(MILESTONES.length,Math.max(3,mc+1));
  let h='';for(let i=0;i<sh;i++) h+=`<span class="${i<mc?'on':'no'}">★</span>`;
  const se=$('bpStars'); if(se._h!==h){se.innerHTML=h;se._h=h;}
  $('bpMbar').style.width=(nx?Math.min(100,(st.lvl-prev)/(nx-prev)*100):100).toFixed(0)+'%';
  const t=nx?`<b>×${MS_MULT}</b> speed at Lv ${nx}`+(mc?` · now <b>×${Math.pow(MS_MULT,mc)}</b>`:''):`Max milestones · <b>×${Math.pow(MS_MULT,mc)}</b>`;
  const wg=st.lvl?wsGate(b.id):null, t2=wg&&st.lvl>=wg.lv?`🔒 <b>Capped at Lv ${wg.lv}</b> · needs ${wsIcon(b.id,wg.k)} ${wsName(b.id,wg.k)} Lv ${wg.n}`:t+(wg&&st.lvl>=wg.lv-10?` · 🔒 Lv ${wg.lv}`:'');   // v2.22
  const mt=$('bpMtx'); if(mt._t!==t2){mt.innerHTML=t2;mt._t=t2;}
  const s=statusOf(b);
  $('bpStatus').classList.toggle('hidden',!st.lvl);
  $('bpBi').style.width=(s.f*100).toFixed(0)+'%';
  $('bpBar').className='bar'+(s.cls==='bad'?(s.f<0.5?' bad':' warn'):'');
  const chip=$('bpChip'); chip.className='chip '+s.cls; chip.textContent=st.lvl&&st.on?`${(s.f*100).toFixed(0)}% · ${s.txt}`:s.txt;
  // input -> output flow
  const sp=st.lvl?bSpeed(b.id):0, f=st.lvl&&st.on?bstat[b.id].f:0;
  const ins=Object.entries(b.inp).map(([k,v])=>`<div class="r${st.lvl&&st.on&&bstat[b.id].lim===k?' short':''}">${svgIcon(RMAP[k].svg,22)}<div>${st.lvl?fr(v*sp*f*bInMult(b.id))+' / '+fr(v*sp*bInMult(b.id)):v}<small>${RMAP[k].name}/s</small></div></div>`).join('<span class="arr">+</span>');
  let outsArr=Object.entries(b.out).map(([k,v])=>[k,b.id==='sawmill'?v*sawYield():v]); if(b.id==='sawmill'&&M.sawdust) outsArr.push(['chips',2]); if(b.id==='kiln'&&M.tar) outsArr.push(['glue',b.out.charcoal*.5]);
  const outs=b.rp?`<div class="r"><span style="font-size:20px">🔬</span><div>${st.lvl?'+'+fr(labRP()):fr(RP_PER)}<small>Research Pts/s</small></div></div>`:outsArr.map(([k,v])=>`<div class="r">${svgIcon(RMAP[k].svg,22)}<div>${st.lvl?'+'+fr(v*sp*f):v}<small>${RMAP[k].name}/s</small></div></div>`).join('<span class="arr">+</span>');
  const yl=b.id==='sawmill'&&st.lvl>=40?`<div class="bp-yield">🪚 Saw yield <b>×${sawYield().toFixed(2)}</b> planks per log${st.lvl<50?' · grows from Lv 50':` · Lv ${st.lvl+1}: ×${sawYieldAt(st.lvl+1).toFixed(2)}`}</div>`:'';
  const io=ins+'<span class="arr">➜</span>'+outs+yl; const ie=$('bpIo'); if(ie._h!==io){ie.innerHTML=io;ie._h=io;}
  { // v2.15.1: actionable shortage hint: who makes the input, how much is wanted, jump to the producer
    let sh=$('bpShort'); if(!sh){sh=document.createElement('div');sh.id='bpShort';sh.className='bp-short';$('bpBuy').parentElement.after(sh);}   // below the buy row: never shifts the buttons under a finger
    const bs=bstat[b.id], k=st.lvl&&st.on&&bs&&bs.lim&&(isFinite(bs.fs)?bs.fs:bs.f)<.95?bs.lim:null, si=k?shortInfo(k):null;
    let h='';
    if(si){h=`<div>${svgIcon(RMAP[k].svg,18)} <b>${RMAP[k].name}</b>: ${si.src?BMAP[si.src].name+' makes':'you make'} <b>${fr(si.prod)}/s</b>, buildings want <b>${fr(si.want)}/s</b>${si.users.length>1?` (${si.users.map(u=>BMAP[u].name).join(', ')})`:''}.</div>`;
      if(si.src) h+=`<button class="bp-short-go" data-go="${si.src}">⬆ Upgrade ${BMAP[si.src].name} →</button>`;
      if(k==='planks') h+=`<button class="bp-short-mode" data-mode="1">${S.prefs.plankMode==='value'?'Planks: best value first':'Planks: shared fairly'} ⇄</button>`;}
    if(sh._h!==h){sh.innerHTML=h;sh._h=h;sh.classList.toggle('hidden',!h);
      const g=sh.querySelector('[data-go]');if(g) g.onclick=()=>{openSheet('bld',g.dataset.go);if(typeof focusLot==='function') focusLot(g.dataset.go,true);};
      const md=sh.querySelector('[data-mode]');if(md) md.onclick=()=>{togglePlankMode();bpSig='';sh._h='';};}
  }
  const on=$('bpOn'); on.checked=st.on; on.disabled=!st.lvl; $('bpOnL').textContent=st.on?'On':'Off';
  on.parentElement.classList.toggle('hidden',!st.lvl);
  const bb=$('bpBuy'); const bh=costBtnHtml(st.lvl?`⬆ Upgrade${n>1?' +'+n:''}`:'🔨 Build',cost); if(bb._h!==bh){bb.innerHTML=bh;bb._h=bh;}
  const unl=bldUnlocked(b.id); if(!unl){const lt=b.id==='lab'?'🔒 Needs a Paper Mill':b.id==='boatyard'&&hasRes('boats')?'🔒 Needs the Harbour':'🔒 Research '+RNMAP[TECH_UNLOCK[b.id]].name;if(bb._h!==lt){bb.innerHTML=lt;bb._h=lt;}}
  bb.disabled=!unl||S.coins+1e-9<cost;
  bb.classList.toggle('ws-lock',!!(unl&&room<1));
  if(unl&&room<1){const g=wsGate(b.id),lt=`🔒 Upgrade ${wsName(b.id,g.k)} to Lv ${g.n}<small>capped at Lv ${g.lv} · tap for 🛠 Workstations</small>`;if(bb._h!==lt){bb.innerHTML=lt;bb._h=lt;}bb.disabled=false;}   // v2.22: milestone gate
  $('bpPbar').style.width=Math.min(100,S.coins/cost*100).toFixed(0)+'%';
  if(b.id==='sawmill'&&sawByLogs()){   // v2.20.1: the first Sawmill is built with logs, with a progress bar
    const have=Math.min(S.res.logs,SAW_LOGS),lh=`🔨 Build<small>🪵 ${fmt(Math.floor(have))} / ${SAW_LOGS} logs</small>`;if(bb._h!==lh){bb.innerHTML=lh;bb._h=lh;}
    bb.disabled=!sawLogsOk();$('bpPbar').style.width=(have/SAW_LOGS*100).toFixed(0)+'%';}
  updateStorageBlock(b); if(typeof updateBldSpec==='function') updateBldSpec(b); updateBldMgr(b); if(typeof updateBldBy==='function') updateBldBy(b); updateBldWs(b);
}
function cycleBuilding(d){
  if(!sheetBld) return; let i=BUILDINGS.findIndex(b=>b.id===sheetBld);
  for(let k=0;k<BUILDINGS.length;k++){ i=(i+d+BUILDINGS.length)%BUILDINGS.length; if(bVisible(BUILDINGS[i])) break; }
  openSheet('bld',BUILDINGS[i].id);
}

/* ===================== RENDER: MARKET ===================== */
let mktSig='', mktEls={};
function resVisible(r){
  if(r.id==='logs') return true; if(S.res[r.id]>0.01) return true;
  if(r.id==='glue'&&M.tar&&S.buildings.kiln.lvl>0) return true;
  return BUILDINGS.some(b=>S.buildings[b.id].lvl>0&&(b.out[r.id]||(r.id==='chips'&&b.id==='sawmill'&&S.upgrades.sawdust)));
}
function buildMarket(){
  const T=$('mktBody'); T.innerHTML=''; mktEls={};
  const order=typeof resTier==='function'?RES.slice().sort((a,b)=>resTier(a.id)-resTier(b.id)):RES; let lastT=-1;   // v2.20: grouped by tier
  for(const r of order){ if(!resVisible(r)) continue;
    if(typeof resTier==='function'){const t=resTier(r.id);if(t!==lastT){lastT=t;const h=document.createElement('tr');h.className='mkt-tier t'+t;h.innerHTML=`<td colspan="7"><b>${TIER_N[t]}</b> <span>${TIER_D[t]}</span></td>`;T.appendChild(h);}}
    const tr=document.createElement('tr'); tr.dataset.id=r.id;
    tr.innerHTML=`<td class="nm"><span class="ric">${svgIcon(r.svg,20)}</span> ${r.name}</td><td class="st"></td><td class="hm pr pos"></td><td class="hm us"></td><td class="price"></td>
      <td><label class="sw" title="Auto-sell surplus"><input type="checkbox"><span class="tr"></span></label></td><td><button class="btn wood small">Sell</button></td>`;
    if(!canSell(r.id)){   // v2.20.1: logs are raw material: no price, no auto-sell, no Sell button; the row shows the Log Yard instead
      tr.classList.add('raw');tr.children[4].remove();tr.children[4].remove();tr.children[4].colSpan=3;tr.children[4].className='rawcell';
      tr.children[4].innerHTML='<span class="rawtag">Raw · not for sale</span><span class="yardbar"><i></i></span><span class="yardtx"></span>';
      mktEls[r.id]={st:tr.querySelector('.st'),pr:tr.querySelector('.pr'),us:tr.querySelector('.us'),raw:tr.children[4]};T.appendChild(tr);continue;}
    const cb=tr.querySelector('input'); cb.onchange=()=>{S.autosell[r.id]=cb.checked;};
    const btn=tr.querySelector('button'); btn.onclick=()=>{const v=sellAll(r.id); if(v>0){const rc=btn.getBoundingClientRect();floatText(rc.left+rc.width/2,rc.top-4,'+🪙'+fmt(v),$('fxLayer')); dockSale(v);} render();};
    mktEls[r.id]={st:tr.querySelector('.st'),pr:tr.querySelector('.pr'),us:tr.querySelector('.us'),price:tr.querySelector('.price'),cb,btn};
    T.appendChild(tr);
  }
}
function updateMarket(){
  if(curSheet!=='market') return;
  const sig=RES.map(r=>resVisible(r)?1:0).join(''); if(sig!==mktSig){mktSig=sig;buildMarket();}
  for(const id in mktEls){const e=mktEls[id],R=rates[id];
    e.st.textContent=fmt(S.res[id],S.res[id]<10?1:0);
    e.pr.textContent='+'+fr(R.p);
    const used=R.c;
    e.us.innerHTML=used>0.005?`<span>${fr(used)}</span>`+(R.d>R.p*1.02+0.01&&R.d>0?` <span class="neg" title="Buildings want more than is produced">(need ${fr(R.d)})</span>`:''):'<span class="muted">—</span>';
    if(e.raw){const cap=logCap(),f=Math.min(1,S.res[id]/cap);e.raw.querySelector('i').style.width=(f*100).toFixed(1)+'%';e.raw.classList.toggle('full',yardFull());
      const t=yardFull()?`Log Yard full (${fmt(cap)}) · collectors idle`:`Log Yard ${Math.round(f*100)}% of ${fmt(cap)}`;const tx=e.raw.querySelector('.yardtx');if(tx.textContent!==t) tx.textContent=t;continue;}
    const p=price(id); e.price.textContent='🪙'+fmt(p,p<10?2:0);
    e.price.classList.toggle('boost',M.price[id]*M.priceAll>TREES[S.tree].mult*baseUpgPrice(id)+1e-9);
    e.cb.checked=!!S.autosell[id]; e.btn.disabled=S.res[id]<1;
  }
}
function baseUpgPrice(id){
  const m={chop:1,chopPct:0,col:{},colAll:1,bld:{},bldAll:1,price:{},priceAll:1,grow:1,yield:1,plantT:{planter:1,team:1,nursery:1,sdrone:1}};
  RES.forEach(r=>m.price[r.id]=1); COLLECTORS.forEach(c=>m.col[c.id]=1); BUILDINGS.forEach(b=>m.bld[b.id]=1);
  for(const u of UPGRADES){const L=upLvl(u.id);if(L) upApply(u,m,L);}
  return m.price[id]*m.priceAll;
}

/* ===================== RENDER: UPGRADES / TREES / COMPANY / TROPHIES ===================== */
let upgSig='';
// v2.22: every upgrade is a line with levels Lv 1..N; the panel lists the next level of each line
function availUpgrades(){return UPGRADES.filter(u=>upLvl(u.id)<upMax(u)&&upReqOk(u)).sort((a,b)=>upCost(a)-upCost(b)).slice(0,12);}
function nextLockedUpg(){return UPGRADES.filter(u=>{const L=upLvl(u.id);return L>=1&&L<upMax(u)&&!upReqOk(u);}).sort((a,b)=>upCost(a)-upCost(b)).slice(0,4);}
function upPips(u,L){return `<div class="upips">${Array.from({length:upMax(u)},(_,i)=>`<i class="${i<L?'on':''}"></i>`).join('')}</div>`;}
function updateUpgrades(){
  const av=availUpgrades();
  let any=av.some(u=>S.coins>=upCost(u));
  $('upgDot').classList.toggle('hidden',!any||curSheet==='upg');
  if(curSheet!=='upg') return;
  const lk=nextLockedUpg();
  const sig=av.map(u=>u.id+upLvl(u.id)).join(',')+'|'+lk.map(u=>u.id+upLvl(u.id)).join(',');
  if(sig!==upgSig){upgSig=sig; const L=$('upgList'); L.innerHTML='';
    if(!av.length) L.innerHTML='<div class="hint">No upgrades available right now. Keep growing: upgrades and their higher levels unlock as you expand.</div>';
    for(const u of av){const lv=upLvl(u.id),N=upMax(u),d=document.createElement('div');d.className='card upg-card';d.dataset.id=u.id;
      const ds=lv?`<b>${upDesc(u,lv)}</b> <span class="nx">→ Lv ${lv+1}: ${upDesc(u,lv+1)}</span>`:upDesc(u,1);
      d.innerHTML=`<div class="ic">${u.icon}</div><div><div class="nm">${u.name} <span class="ulv">Lv ${lv}/${N}</span></div><div class="ds">${ds}</div>${N>1?upPips(u,lv):''}<div class="pbar"><i></i></div></div><button class="btn buy">${costBtnHtml(lv?'⬆ Lv '+(lv+1):'Buy',upCost(u))}</button>`;
      d.querySelector('button').onclick=()=>{buyUpgrade(u.id);render();};L.appendChild(d);}
    if(lk.length){const h=document.createElement('div');h.className='upg-sub';h.textContent='Next levels unlock with progress';L.appendChild(h);
      for(const u of lk){const lv=upLvl(u.id),d=document.createElement('div');d.className='card upg-card lockd';
        d.innerHTML=`<div class="ic">${u.icon}</div><div><div class="nm">${u.name} <span class="ulv">Lv ${lv}/${upMax(u)}</span></div><div class="ds">Lv ${lv+1}: ${upDesc(u,lv+1)}</div>${upPips(u,lv)}</div><button class="btn buy" disabled>🔒<small>${upReqTxt(u,lv+1)}</small></button>`;L.appendChild(d);}}
    const owned=UPGRADES.filter(u=>upLvl(u.id)),lvls=owned.reduce((a,u)=>a+upLvl(u.id),0),tot=UPGRADES.reduce((a,u)=>a+upMax(u),0);
    $('upgOwned').textContent=owned.length?`Levels ${lvls}/${tot} · `+owned.map(u=>`${u.icon} ${u.name} ${upLvl(u.id)}/${upMax(u)}`).join(', '):'';
  }
  $('upgList').querySelectorAll('.card[data-id]').forEach(d=>{const u=UPGRADES.find(x=>x.id===d.dataset.id);const b=d.querySelector('button');b.disabled=S.coins<upCost(u);d.classList.toggle('afford',!b.disabled);
    const pb=d.querySelector('.pbar>i'); if(pb) pb.style.width=Math.min(100,S.coins/upCost(u)*100).toFixed(0)+'%';});
}
let treeSig='';
function updateTrees(){
  const nx=TREES[S.tree+1];
  $('crewDot').classList.toggle('hidden',!((nx&&S.coins>=treeCost(nx))||forestNeedsCrew())||curSheet==='crew');
  if(curSheet!=='crew') return;
  const sig=S.tree+'|'+TREES.map(t=>S.totalEarned>=treeCost(t)*0.2?1:0).join('');
  if(sig!==treeSig){treeSig=sig;const L=$('treeList');L.innerHTML='';
    TREES.forEach((t,i)=>{const d=document.createElement('div');
      const owned=i<=S.tree, next=i===S.tree+1, vis=owned||S.totalEarned>=treeCost(t)*0.2||next;
      d.className='card'+(i===S.tree?' cur':'')+(!vis?' locked':'');
      d.innerHTML=`<div class="ic"><span style="filter:${t.flt}">${vis?t.icon:'❔'}</span></div><div><div class="nm">${vis?t.name:'???'} ${i===S.tree?'<span class="cnt">· current</span>':''}</div><div class="ds">All prices ×${t.mult}</div></div>`+
        (owned?`<span class="chip">${i===S.tree?'Harvesting':'Done'}</span>`:next?`<button class="btn buy">${costBtnHtml('Unlock',treeCost(t))}</button>`:`<span class="chip off">Locked</span>`);
      const b=d.querySelector('button'); if(b) b.onclick=()=>{buyTree();render();};
      L.appendChild(d);});
  }
  const b=$('treeList').querySelector('button');
  if(b&&nx) b.disabled=S.coins<treeCost(nx);
}
/* v2.18: updateCompany (Replant sheet) lives in js/replant.js */
let achSig='';
function updateAch(){
  const n=achCount();
  const anyFresh=Object.keys(achFresh).length>0;
  $('achDot').classList.toggle('hidden',!anyFresh||curSheet==='ach');
  if(curSheet!=='ach') return;
  const sig=ACH.map(a=>S.ach[a.id]?1:0).join('')+Object.keys(achFresh).join();
  if(sig!==achSig){achSig=sig;
    $('achHeadMedal').innerHTML=medalSvg(n>=ACH.length?'gold':n>=ACH.length/2?'silver':'bronze','🏆');
    $('achCount').textContent=`${n} / ${ACH.length}`;
    $('achBonus').innerHTML=`Trophy bonus: <b style="color:var(--green-d)">+${Math.round(n*ACH_BONUS*100)}%</b> to all production (+2% each, kept forever)`;
    $('achBar').style.width=(n/ACH.length*100).toFixed(0)+'%';
    $('achGrid').innerHTML=ACH.map(a=>{const got=!!S.ach[a.id];
      return `<div class="ach t-${a.t} ${got?'got':'lock'}${achFresh[a.id]?' fresh':''}" data-id="${a.id}" title="${a.n}: ${a.d}">${medalSvg(a.t,a.e)}<div class="an">${a.n}</div><div class="ad">${a.d}</div>${got?'':'<div class="mini"><i></i></div>'}</div>`;}).join('');
  }
  $('achGrid').querySelectorAll('.ach.lock').forEach(el=>{const a=ACH.find(x=>x.id===el.dataset.id);const [c,t]=a.p();
    const i=el.querySelector('.mini>i'); if(i) i.style.width=Math.max(0,Math.min(100,c/t*100)).toFixed(0)+'%';});
}
let evSig='';
function renderEvents(force){
  const E=$('events'); const sig=S.events.map(e=>e.id).join();
  if(force||sig!==evSig){evSig=sig;E.innerHTML=S.events.map(e=>{const d=EMAP[e.id];
    return `<div class="event${d.bad?' bad':''}" data-id="${e.id}" title="${d.desc}"><span class="ev-ill">${eventIll(e.id)}</span><span>${d.name.replace(/^\S+\s/,'')} <span class="ed">${d.desc}</span></span><span class="tm"></span></div>`;}).join('');}
  E.querySelectorAll('.event').forEach(x=>{const e=S.events.find(y=>y.id===x.dataset.id);if(e)x.querySelector('.tm').textContent=Math.ceil(e.ends-S.time)+'s';});
}
function eventIll(id){
  const map={hotel:'🪑',storm:'⛈️',termites:'🐜',boom:'📈',acorn:'🌰',print:'🗞️',cold:'❄️',frenzy:'⚡',goldrush:'💛'};
  return map[id]||'⭐';
}

/* v2.15.1 shortage helpers */
function shortInfo(k){const src=(BUILDINGS.find(b=>b.out[k]&&S.buildings[b.id].lvl)||BUILDINGS.find(b=>b.out[k])||{}).id||null;
  const users=BUILDINGS.filter(b=>b.inp[k]&&S.buildings[b.id].lvl&&S.buildings[b.id].on).map(b=>b.id);
  return {src,users,prod:(rates[k]&&rates[k].p)||0,want:(rates[k]&&rates[k].d)||0};}
function togglePlankMode(){S.prefs.plankMode=S.prefs.plankMode==='value'?'fair':'value';toast(S.prefs.plankMode==='value'?'🟫 Planks now go to the building that earns most per plank first':'🟫 Planks are now shared fairly between buildings');}
