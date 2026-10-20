'use strict';
/* ===================== v2.16 SUPPLY FLOW VIEW =====================
   An isometric overlay that shows the whole production chain at a glance: animated arcs run from every producer
   (or the Log Yard for logs) to each building that uses its goods, and from the factory to the Shipping dock for what is sold.
   Arc width follows the flow rate (log scale), dashes move in the direction of travel, and colour shows health:
   resource tint = fed, amber = slightly short, red = short (uses the smoothed bstat.fs from v2.15.1).
   Toggle with the 🔀 button (or F on a keyboard). Purely visual: nothing in the save changes; the on/off choice lives in
   localStorage 'tt_flow'. Drawn in screen space after the building tags, only while the view is on. */
const FLOW_TINT={logs:'#b07a42',planks:'#d9a35a',veneer:'#e8cf98',bark:'#7a5030',chips:'#c9a24a',charcoal:'#5a5a62',chairs:'#a8743c',pellets:'#9a6a3a',paper:'#e8e2cf',
  furniture:'#c0603a',glue:'#d8a930',plywood:'#e08a3a',toys:'#e2577a',boats:'#3f86c8',flooring:'#a0703c',cabinets:'#8a5a3a',
  giftbox:'#d14b4b',stationery:'#5a6fd0',luxfurn:'#d8a930'};
let flowOn=false; try{flowOn=localStorage.getItem('tt_flow')==='1';}catch(_){}
function flowLotOf(id){return id==='yard'?YARD:id==='dock'?DOCK:id==='pdock'?PDOCK:LOTS[id];}
function flowAnchor(id){const L=flowLotOf(id);if(!L) return null;const z=id==='yard'||id==='dock'||id==='pdock'?18:Math.min(56,(L.H||44)*.62);const p=P(L.ci,L.cj,z);return w2s(p[0],p[1]);}
function flowBuilt(id){const st=S.buildings[id];return !!(st&&st.lvl&&LOTS[id]&&(!LOTS[id].prem||S.premium.lvl)&&(id!=='boatyard'||typeof harborOpen!=='function'||harborOpen()));}
/* edges: {from,to,k,rate,state:'ok'|'warn'|'bad'} */
function flowEdges(){
  const E=[];
  for(const b of BUILDINGS){if(!flowBuilt(b.id)) continue;const st=S.buildings[b.id],bs=bstat[b.id];if(!st.on||!bs) continue;
    const fs=isFinite(bs.fs)?bs.fs:bs.f;
    for(const k in b.inp){
      const rate=b.inp[k]*(bs.speed||0)*bs.f*bInMult(b.id), state=bs.lim===k?(fs<.6?'bad':fs<.95?'warn':'ok'):'ok';
      const srcs=k==='logs'?['yard']:BUILDINGS.filter(p=>p.out[k]&&flowBuilt(p.id)).map(p=>p.id);
      if(!srcs.length) continue;
      for(const s of srcs) E.push({from:s,to:b.id,k,rate:rate/srcs.length,state});
    }}
  // what gets sold leaves through the dock (one arc per selling producer, top 6 by value so the view stays readable)
  const sold=[];for(const r of RES){const R=rates[r.id];if(!R||!(R.s>1e-6)||!canSell(r.id)) continue;   // v2.20.1: logs never go to the dock
const p=r.id==='logs'?'yard':(BUILDINGS.find(b=>b.out[r.id]&&flowBuilt(b.id))||{}).id;if(p) sold.push({from:p,to:LOTS[p]&&LOTS[p].prem?'pdock':'dock',k:r.id,rate:R.s,state:'sell',val:R.s*price(r.id)});}
  sold.sort((a,b)=>b.val-a.val);return E.concat(sold.slice(0,6));
}
function flowStats(){const E=flowEdges();return {n:E.length,bad:E.filter(e=>e.state==='bad').length,warn:E.filter(e=>e.state==='warn').length,sell:E.filter(e=>e.state==='sell').length};}
function toggleFlow(on){flowOn=on===undefined?!flowOn:!!on;try{localStorage.setItem('tt_flow',flowOn?'1':'0');}catch(_){}
  document.body.classList.toggle('flow-on',flowOn);const b=$('flowBtn');if(b) b.setAttribute('aria-pressed',flowOn?'true':'false');
  if(typeof haptic==='function') haptic(6);return flowOn;}
function flowOverlay(ctx){
  if(!flowOn) return;
  const E=flowEdges(), t=scene.t, z=Math.max(.6,Math.min(1.6,scene.cam.z));
  ctx.save();ctx.fillStyle='rgba(18,24,34,.30)';ctx.fillRect(0,0,scene.w,scene.h);   // veil so the arcs read over the art
  ctx.lineCap='round';
  const labels=[];
  // draw healthy first, problems last (on top)
  const ord={sell:0,ok:1,warn:2,bad:3};E.sort((a,b)=>ord[a.state]-ord[b.state]);
  for(const e of E){const a=flowAnchor(e.from),b=flowAnchor(e.to);if(!a||!b) continue;
    const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);if(d<8) continue;
    if(Math.max(a[0],b[0])<-80||Math.min(a[0],b[0])>scene.w+80||Math.max(a[1],b[1])<-120||Math.min(a[1],b[1])>scene.h+80) continue;
    const lift=Math.min(140,d*.28)+10, cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2-lift;   // arcs rise above the roofs
    const w=Math.max(2,Math.min(8,1.4+Math.log10(1+e.rate)*1.15))*z;
    const col=e.state==='bad'?'#ff5a4a':e.state==='warn'?'#ffbf3a':e.state==='sell'?'#7ad04a':(FLOW_TINT[e.k]||'#e8d2a0');
    ctx.setLineDash([]);ctx.strokeStyle='rgba(20,12,4,.55)';ctx.lineWidth=w+3;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo(cx,cy,b[0],b[1]);ctx.stroke();
    ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke();
    ctx.setLineDash([w*1.6,w*2.4]);ctx.lineDashOffset=-(t*(e.state==='bad'?14:34))%1000;ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=Math.max(1,w*.45);ctx.stroke();
    // arrow head at 85% along the curve
    const q=.86,ix=(1-q)*(1-q)*a[0]+2*(1-q)*q*cx+q*q*b[0],iy=(1-q)*(1-q)*a[1]+2*(1-q)*q*cy+q*q*b[1];
    const tx=2*(1-q)*(cx-a[0])+2*q*(b[0]-cx),ty=2*(1-q)*(cy-a[1])+2*q*(b[1]-cy),tl=Math.hypot(tx,ty)||1,ux=tx/tl,uy=ty/tl,hs=5+w;
    ctx.setLineDash([]);ctx.fillStyle=col;ctx.strokeStyle='rgba(20,12,4,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ix+ux*hs,iy+uy*hs);ctx.lineTo(ix-ux*hs*.6-uy*hs*.7,iy-uy*hs*.6+ux*hs*.7);ctx.lineTo(ix-ux*hs*.6+uy*hs*.7,iy-uy*hs*.6-ux*hs*.7);ctx.closePath();ctx.fill();ctx.stroke();
    const m=.5,mx=(1-m)*(1-m)*a[0]+2*(1-m)*m*cx+m*m*b[0],my=(1-m)*(1-m)*a[1]+2*(1-m)*m*cy+m*m*b[1];
    labels.push({x:mx,y:my,e,col});
  }
  // rate labels (plain text, no cached pills: the numbers change every frame), declutter overlaps
  ctx.font=`800 ${Math.round(10.5*Math.min(1.15,z))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const placed=[];
  for(let k=labels.length-1;k>=0;k--){const L=labels[k],txt=`${RMAP[L.e.k]?RMAP[L.e.k].icon:''} ${fr(L.e.rate)}/s`,tw=ctx.measureText(txt).width+14;
    if(placed.some(p=>Math.abs(p.x-L.x)<(p.w+tw)/2&&Math.abs(p.y-L.y)<18)) continue;placed.push({x:L.x,y:L.y,w:tw});
    ctx.fillStyle=L.e.state==='bad'?'rgba(150,30,22,.92)':L.e.state==='warn'?'rgba(140,90,10,.92)':'rgba(43,27,14,.85)';rr(ctx,L.x-tw/2,L.y-9,tw,18,9);ctx.fill();
    ctx.strokeStyle=L.col;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff6e0';ctx.fillText(txt,L.x,L.y+.5);}
  // v2.20 tier badges (I / II / III) on every built building
  if(typeof BTIER==='object'){ctx.font=`900 ${Math.round(10*Math.min(1.2,z))}px system-ui,sans-serif`;
    for(const b of BUILDINGS){const t=BTIER[b.id];if(!t||!flowBuilt(b.id)) continue;const a=flowAnchor(b.id);if(!a) continue;const r=9*Math.min(1.2,z),y=a[1]-16*z;
      ctx.fillStyle=TIER_C[t];ctx.strokeStyle='rgba(20,12,4,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(a[0],y,r,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(TIER_S[t],a[0],y+.5);}}
  ctx.restore();
}
function updateFlowLegend(){
  const el=$('flowLegend');if(!el) return;el.classList.toggle('hidden',!flowOn);if(!flowOn) return;
  const s=flowStats(),h=`<b>🔀 Supply flow</b> <span class="fl-k ok"></span>fed <span class="fl-k warn"></span>low <span class="fl-k bad"></span>short <span class="fl-k sell"></span>sold${typeof TIER_S==='object'?' · <span class="tier-b t1">I</span>→<span class="tier-b t2">II</span>→<span class="tier-b t3">III</span>':''}${s.bad?` · <b class="fl-bad">${s.bad} short</b>`:''}`;
  if(el._h!==h){el.innerHTML=h;el._h=h;}
}
(function initFlow(){
  const go=()=>{const b=$('flowBtn');if(b){b.onclick=()=>toggleFlow();b.setAttribute('aria-pressed',flowOn?'true':'false');}document.body.classList.toggle('flow-on',flowOn);
    window.addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;if((e.key==='f'||e.key==='F')&&!e.ctrlKey&&!e.metaKey&&!e.altKey) toggleFlow();});};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go);else go();
})();
