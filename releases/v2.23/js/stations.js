'use strict';
/* ===================== v2.22 WORKSTATIONS (design: docs/stations-v2.22.md) =====================
   Every production building has three internal workstations, each with its own level (0..10) and one effect
   (speed / yield / input / quality). Milestone gates: a building can't pass Lv 25/50/100/200/400 until a given
   workstation reaches a given level. Levels reset on Replant (they live in S.ws, not in the keep list). */
const WS_KIND={spd:{e:'⚙️',n:'Speed',per:.05},yld:{e:'📦',n:'Yield',per:.04},inp:{e:'🌲',n:'Input',per:.03},prc:{e:'💎',n:'Quality',per:.05}};
const WS_MAX=10, WS_K=1;
const WS_LV=[0,10,25,50,100,150,200,300,400,500,600];          // building level whose cost a station level is priced at
const WS_GATES=[[25,1,2],[50,0,3],[100,2,4],[200,1,6],[400,0,8]];  // [pass Lv, station index, station Lv needed]
// [id, name, icon, kind]; station index 1 is always the speed station (the first gate)
const WS_DEF={
  peeler:[['cond','Log Conditioner','♨️','inp'],['lathe','Rotary Lathe','🌀','spd'],['dryer','Veneer Dryer','🌬️','prc']],
  sawmill:[['debark','Debarker','🪵','inp'],['bandsaw','Bandsaw','🪚','spd'],['edger','Edger & Planer','📏','yld']],
  chipper:[['infeed','Infeed Conveyor','🛤️','inp'],['disc','Disc Chipper','💿','spd'],['screen','Chip Screen','🧺','yld']],
  kiln:[['bay','Charging Bay','🧱','inp'],['retort','Retort Chamber','🔥','spd'],['grade','Grading Table','⚖️','prc']],
  carpentry:[['cut','Cutting Bench','🪚','inp'],['join','Joinery Bench','🔨','spd'],['finish','Finishing Bench','🖌️','prc']],
  pellet:[['hammer','Hammer Mill','🔨','inp'],['press','Pellet Press','🗜️','spd'],['bag','Cooler & Bagger','🛍️','yld']],
  paper:[['pulp','Pulper','🫧','inp'],['machine','Paper Machine','🧻','spd'],['cal','Calender Rolls','🎞️','prc']],
  furniture:[['cnc','CNC Router','🛠️','inp'],['assembly','Assembly Line','🏭','spd'],['spray','Spray Booth','🎨','prc']],
  plymill:[['glue','Glue Spreader','🍯','inp'],['hotpress','Hot Press','♨️','spd'],['sander','Panel Sander','🧽','yld']],
  toyshop:[['scroll','Scroll Saw','🪚','inp'],['tlathe','Toy Lathe','🌀','spd'],['paint','Paint Shop','🎨','prc']],
  boatyard:[['steam','Steam Bender','♨️','inp'],['slip','Slipway Crew','⚓','spd'],['varnish','Varnish Shed','🖌️','prc']],
  atelier:[['fold','Box Folder','📦','inp'],['print','Print Press','🖨️','spd'],['ribbon','Ribbon Table','🎀','prc']],
  parquet:[['core','Core Press','🗜️','inp'],['tng','Tongue & Groove','🧩','spd'],['hand','Hand Finish','✋','prc']],
  stationer:[['cutter','Paper Cutter','✂️','inp'],['bind','Bindery','📚','spd'],['gild','Gilding Desk','✨','prc']],
  cabinetry:[['csaw','Cabinet Saw','🪚','inp'],['cjoin','Joinery','🔩','spd'],['lacq','Lacquer Room','🎨','prc']],
  showroom:[['resto','Restoration','🧰','inp'],['uphol','Upholstery','🛋️','spd'],['hall','Display Hall','👑','prc']],
};
function wsHas(id){return !!WS_DEF[id];}
function wsSt(id){if(!S.ws||typeof S.ws!=='object') S.ws={};return S.ws[id]||(S.ws[id]=[0,0,0]);}
function wsLvl(id,k){const w=S.ws&&S.ws[id];return w?(w[k]|0):0;}
function wsName(id,k){return WS_DEF[id][k][1];}
function wsIcon(id,k){return WS_DEF[id][k][2];}
function wsKind(id,k){return WS_DEF[id][k][3];}
/* first gate this building has not cleared: {lv,k,n} or null */
// gates below the current level count as passed (a level set directly, e.g. by an old save or a test, is never lost)
function wsGate(id){if(!wsHas(id)) return null;const l=S.buildings[id]?S.buildings[id].lvl:0;for(const [lv,k,n] of WS_GATES) if(l<=lv&&wsLvl(id,k)<n) return {lv,k,n};return null;}
function wsCap(id){const g=wsGate(id);return g?g.lv:Infinity;}
function wsRoom(id){return Math.max(0,wsCap(id)-S.buildings[id].lvl);}
function wsBlocked(id){return wsHas(id)&&S.buildings[id].lvl>0&&wsRoom(id)===0;}
function wsCost(id,k,L){L=L||wsLvl(id,k)+1;const b=BMAP[id];return WS_K*b.cost*cs()*Math.pow(b.scale,WS_LV[Math.min(WS_MAX,L)]);}
function wsEffAt(kind,L){const p=WS_KIND[kind].per;return kind==='inp'?Math.max(.5,1-p*L):1+p*L;}
function wsMult(id,kind){if(!wsHas(id)||!S.ws||!S.ws[id]) return 1;let m=1;const D=WS_DEF[id];for(let k=0;k<3;k++) if(D[k][3]===kind) m*=wsEffAt(kind,wsLvl(id,k));return m;}
function wsSpd(id){return wsMult(id,'spd');}
function wsOut(id){return wsMult(id,'yld');}
function wsIn(id){return wsMult(id,'inp');}
function wsApplyPrice(m){if(!S.ws) return;for(const id in S.ws){const b=BMAP[id];if(!b||!wsHas(id)) continue;const q=wsMult(id,'prc');if(q!==1) for(const k in b.out) if(m.price[k]!==undefined) m.price[k]*=q;}}
function wsEffTxt(kind,L){const v=wsEffAt(kind,L);return kind==='inp'?`−${Math.round((1-v)*100)}% input`:kind==='spd'?`×${v.toFixed(2)} speed`:kind==='yld'?`×${v.toFixed(2)} output`:`×${v.toFixed(2)} price`;}
/* station levels needed to reach building level `to` (missing levels only): [[k,L],...] and their total cost */
function wsNeedFor(id,to){const out=[];if(!wsHas(id)) return {list:out,cost:0};const cur=[0,1,2].map(k=>wsLvl(id,k));let c=0;
  const l=S.buildings[id].lvl;for(const [lv,k,n] of WS_GATES){if(to<=lv) break;if(l>lv) continue;while(cur[k]<n){cur[k]++;out.push([k,cur[k]]);c+=wsCost(id,k,cur[k]);}}
  return {list:out,cost:c};}
function buyWs(id,k,quiet){
  if(!wsHas(id)||!S.buildings[id].lvl) return false;const L=wsLvl(id,k)+1;if(L>WS_MAX) return false;const c=wsCost(id,k,L);
  if(S.coins+1e-9<c) return false;S.coins-=c;wsSt(id)[k]=L;M=computeMods();
  if(!quiet){const D=WS_DEF[id][k],gp=WS_GATES.find(x=>x[1]===k&&x[2]===L),opened=gp&&S.buildings[id].lvl>=gp[0]&&wsCap(id)>gp[0];
    toast(`${D[2]} <b>${D[1]}</b> Lv ${L} · ${wsEffTxt(D[3],L)}${opened?` · 🔓 <b>${BMAP[id].name}</b> can pass Lv ${gp[0]}`:''}`,3200);
    sfx('buy');if(typeof wsFx==='function') wsFx(id,k);}
  return true;}
/* old saves (and anything that sets levels directly): grant the minimum station levels a building's current level needs */
function wsGrandfather(o){o=o||S;if(!o.ws||typeof o.ws!=='object') o.ws={};let n=0;
  for(const id in WS_DEF){const st=o.buildings&&o.buildings[id];if(!st||!st.lvl) continue;const w=o.ws[id]||(o.ws[id]=[0,0,0]);
    for(const [lv,k,need] of WS_GATES) if(st.lvl>lv&&(w[k]|0)<need){w[k]=need;n++;}}
  return n;}
/* the next thing to buy for a gated building: {k,L,cost} */
function wsNext(id){const g=wsGate(id);if(!g) return null;const L=wsLvl(id,g.k)+1;return {k:g.k,L,cost:wsCost(id,g.k,L),gate:g};}
function wsGateTxt(id){const g=wsGate(id);if(!g) return '';return `${wsIcon(id,g.k)} ${wsName(id,g.k)} Lv ${g.n}`;}

/* cost of the next building level including any workstation levels its gate needs (bots, sims, builders) */
function bldNextCost(id){const st=S.buildings[id],b=BMAP[id];return bulkCost(b.cost,b.scale,st.lvl,1)+(st.lvl?wsNeedFor(id,st.lvl+1).cost:0);}

/* ---------- UI: building sheet tabs (Overview | 🛠 Workstations) ---------- */
let bpTabSel='ov', wsSig='';
function bpTab(t){bpTabSel=t==='ws'?'ws':'ov';wsSig='';const m=$('bpMain');if(m) m.classList.toggle('ws-mode',bpTabSel==='ws');
  document.querySelectorAll('#bpTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===bpTabSel));
  if(typeof haptic==='function') haptic(6);if(typeof render==='function') render();}
function wsTabsInit(){const T=$('bpTabs');if(!T||T._i) return;T._i=1;T.querySelectorAll('button').forEach(b=>b.onclick=()=>bpTab(b.dataset.t));const g=$('bpWsGo');if(g) g.onclick=()=>bpTab('ws');}
const WS_COL={spd:'#e8742a',yld:'#4fa633',inp:'#3e86c8',prc:'#c9a227'};
/* tiny isometric interior: a floor slab and the three workstations; height and colour follow their level */
function wsDrawInterior(cv,id){
  const dpr=Math.min(2,window.devicePixelRatio||1),W=cv.clientWidth||320,H=150;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const hh=Math.min((W*.86)*.42,H-56),hw=hh/.42,cx=W/2,cy=H-8-hh/2;   // floor diamond fills the canvas (walls + benches above it)
  const P=(i,j,z)=>[cx+(i-j)*hw/2,cy+(i+j-1)*hh/2-(z||0)];   // i,j in 0..1 floor coords
  const quad=(pts,c)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1)) g.lineTo(p[0],p[1]);g.closePath();g.fillStyle=c;g.fill();};
  // floor + back walls
  quad([P(0,0),P(1,0),P(1,1),P(0,1)],'#d9c6a2');
  g.strokeStyle='rgba(120,90,50,.25)';g.lineWidth=1;for(let k=1;k<6;k++){const a=P(k/6,0),b=P(k/6,1),c=P(0,k/6),d=P(1,k/6);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.moveTo(c[0],c[1]);g.lineTo(d[0],d[1]);g.stroke();}
  quad([P(0,0),P(1,0),P(1,0,34),P(0,0,34)],'#b89a6e');quad([P(0,0),P(0,1),P(0,1,34),P(0,0,34)],'#a3865c');
  const gate=wsGate(id),D=WS_DEF[id];
  for(let k=0;k<3;k++){const L=wsLvl(id,k),kind=D[k][3],col=WS_COL[kind],ci=.28+k*.22,cj=.72-k*.22,s=.085,h=8+L*3.2;   // a row across the room, left → right
    const i0=ci-s,i1=ci+s,j0=cj-s,j1=cj+s;
    const top=[P(i0,j0,h),P(i1,j0,h),P(i1,j1,h),P(i0,j1,h)];
    quad([P(i1,j0),P(i1,j1),P(i1,j1,h),P(i1,j0,h)],shade(col,.72));quad([P(i0,j1),P(i1,j1),P(i1,j1,h),P(i0,j1,h)],shade(col,.86));quad(top,shade(col,1.12));
    if(gate&&gate.k===k){g.strokeStyle='#ff5a3a';g.lineWidth=2;g.setLineDash([4,3]);g.beginPath();g.moveTo(top[0][0],top[0][1]);for(const p of top.slice(1)) g.lineTo(p[0],p[1]);g.closePath();g.stroke();g.setLineDash([]);}
    const c=P(ci,cj,h);g.font='18px system-ui';g.textAlign='center';g.textBaseline='bottom';g.fillText(D[k][2],c[0],c[1]-4);
    g.font='800 11px system-ui';g.fillStyle=gate&&gate.k===k?'#d2452a':'#3a2410';g.textBaseline='top';const lp=P(i1,j1,0);g.fillText('Lv '+L,lp[0],lp[1]+3);}
}
function updateBldWs(b){
  const T=$('bpTabs'),W=$('bpWs');if(!T||!W) return;wsTabsInit();
  const st=S.buildings[b.id],has=wsHas(b.id)&&st.lvl>0;T.classList.toggle('hidden',!has);
  if(!has&&bpTabSel==='ws') bpTab('ov');
  const blk=has&&wsBlocked(b.id),t=blk?'🔒':'';for(const id of ['bpWsN','bpWsGoN']){const c=$(id);if(c&&c.textContent!==t) c.textContent=t;}
  const go=$('bpWsGo');if(go){go.classList.toggle('hidden',!has);go.classList.toggle('alert',blk);}
  if(!has||bpTabSel!=='ws'){W.classList.add('hidden');return;}
  W.classList.remove('hidden');
  const D=WS_DEF[b.id],g=wsGate(b.id),lv=[0,1,2].map(k=>wsLvl(b.id,k));
  const sig=b.id+'|'+lv.join(',')+'|'+st.lvl+'|'+(g?g.lv:0);
  if(sig!==wsSig){wsSig=sig;
    let gh;if(!g) gh=`<div class="ws-gate ok">✅ Every milestone gate cleared</div>`;
    else{const at=st.lvl>=g.lv;gh=`<div class="ws-gate${at?' now':''}">${at?'🔒 <b>Capped at Lv '+g.lv+'</b>':'Next gate: <b>Lv '+g.lv+'</b>'} · needs ${D[g.k][2]} <b>${D[g.k][1]} Lv ${g.n}</b> <span>(now Lv ${lv[g.k]})</span></div>`;}
    let h=`<canvas class="ws-cv" id="bpWsCv"></canvas>${gh}<div class="list ws-list">`;
    for(let k=0;k<3;k++){const [,nm,ic,kind]=D[k],L=lv[k],K=WS_KIND[kind],mx=L>=WS_MAX,gk=g&&g.k===k;
      const pips=Array.from({length:WS_MAX},(_,i)=>`<i class="${i<L?'on':''}${g&&g.k===k&&i<g.n&&i>=L?' need':''}"></i>`).join('');
      h+=`<div class="card ws-card${gk?' gate':''}" data-k="${k}"><div class="ic" style="background:${WS_COL[kind]}22">${ic}</div><div><div class="nm">${nm} <span class="ulv">Lv ${L}/${WS_MAX}</span></div>
        <div class="ds">${K.e} ${K.n}: ${L?'<b>'+wsEffTxt(kind,L)+'</b>':'none yet'}${mx?'':' → '+wsEffTxt(kind,L+1)}${gk?` · <b class="gtag">🔓 Lv ${g.n} lets ${BMAP[b.id].name} pass Lv ${g.lv}</b>`:''}</div>
        <div class="upips">${pips}</div></div><button class="btn buy" data-k="${k}">${mx?'Max':costBtnHtml('⬆ Lv '+(L+1),wsCost(b.id,k))}</button></div>`;}
    h+=`</div><div class="legend">Each building has three workstations. They add their bonus on top of levels, research, specialisations and staff, and reset on Replant like the building. Gates: Lv 25 · 50 · 100 · 200 · 400.</div>`;
    W.innerHTML=h;W.querySelectorAll('button[data-k]').forEach(x=>x.onclick=()=>{if(buyWs(b.id,+x.dataset.k)){wsSig='';render();}});
    requestAnimationFrame(()=>{const cv=$('bpWsCv');if(cv) wsDrawInterior(cv,b.id);});}
  W.querySelectorAll('button[data-k]').forEach(x=>{const k=+x.dataset.k,L=wsLvl(b.id,k);const dis=L>=WS_MAX||S.coins+1e-9<wsCost(b.id,k);if(x.disabled!==dis) x.disabled=dis;x.parentElement.classList.toggle('afford',!dis);});
}
