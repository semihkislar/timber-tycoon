'use strict';
/* ===================== v2.32 CARGO DRONES (logistics tier 3, item 8 part 3) =====================
   A Drone Port on the Shipping dock's roof. Cargo drones fly finished goods from the workshops to the dock, so the workshops
   never wait for an outbound pallet or a forklift.
   - Unlock: Forklift Depot Lv CD_UNLOCK with at least one conveyor belt built and the Premium Area open (tier 1 → 2 → 3).
   - Drone Port Lv 0–10. Every level gives the Phase III workshops +8 % output from the same inputs (×1.8 at Lv 10).
     Range: from Lv CD_RANGE the drones reach the Phase II buildings too, +4 % output per level from there (×1.24 at Lv 10).
     Neither raises any demand, so supply only goes up (checked in a steady-state sim: no line is less fed).
   - Costs: CD_BASE (400M) × 3^level × the run's forest value (cs()). Rebuilt each run, like the depot and the belts.
   - Scene: drones (1 + level, at most CD_NMAX) take off from the pad, climb, cruise at one calm speed (CD_V tiles/s, the same at
     every level: more capacity means more drones, never faster ones), descend over a workshop's roof, hover while a crate is
     hooked on, and fly it back to the pad. Gentle hover bob, rotor blur, a soft ground shadow that fades with height.
     Each drone pose is a cached sprite (64 headings × 3 rotor frames × cargo); the pad is one cached sprite.
   Save: S.logi.drone (level). */
const CD_MAX=10, CD_P3=.08, CD_P2=.04, CD_RANGE=5, CD_UNLOCK=6, CD_BASE=4e8, CD_GROW=3, CD_NMAX=8;
const CD_V=1.25, CD_ACC=.5, CD_CLIMB=2.6, CD_DWELL=2.6, CD_HOVER=2.4, CD_TURN=1.5, CD_CRUISE=104;   // tiles/s, tiles/s², s, s, s, rad/s, px
/* the pad sits on stilts over the Shipping building's roof (ridge 54 px), toward its back end */
const CD_PAD=[DOCK.ci-1.05,DOCK.cj-.575], CD_PADH=.6, CD_PADZ=62;
function cdLvl(){const v=S&&S.logi?S.logi.drone:0;return isFinite(v)?Math.max(0,Math.min(CD_MAX,v|0)):0;}
function cdState(){const l=logiState();l.drone=cdLvl();return l;}
function cdUnlocked(){return logiLvl()>=CD_UNLOCK&&(typeof beltCount==='function'?beltCount()>0:true)&&!!(S.premium&&S.premium.lvl>0);}
function cdP3(l){return 1+CD_P3*l;}
function cdP2(l){return 1+CD_P2*Math.max(0,l-CD_RANGE+1);}
function cdReachesII(l){l=l===undefined?cdLvl():l;return l>=CD_RANGE;}
/* output multiplier (used by bOutMult): Phase III always, Phase II once the drones have the range */
function cdOut(id){const t=typeof BTIER==='object'?BTIER[id]:0,l=cdLvl();if(!l) return 1;return t===3?cdP3(l):t===2?cdP2(l):1;}
function cdCost(l){l=l===undefined?cdLvl():l;return l>=CD_MAX?Infinity:CD_BASE*cs()*Math.pow(CD_GROW,l);}
function cdBuy(){if(!cdUnlocked()) return false;const L=cdState(),c=cdCost(L.drone);if(!isFinite(c)||S.coins+1e-9<c) return false;
  S.coins-=c;L.drone++;scene._fsig='';if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🚁 <b>Drone Port</b> → Lv ${L.drone}: Phase III output ×${cdP3(L.drone).toFixed(2)}${cdReachesII(L.drone)?` · Phase II ×${cdP2(L.drone).toFixed(2)}`:''}${L.drone===1?' · the first cargo drones take off':''}${L.drone===CD_RANGE?' · long-range drones now reach Phase II':''}`);
  if(typeof checkAch==='function') checkAch();return true;}
/* coins per second the next level would add (Phase II–III goods at their sale value) */
function cdGain(){const l=cdLvl();if(l>=CD_MAX) return 0;let v=0;
  for(const b of BUILDINGS){const t=BTIER[b.id];if(t!==2&&t!==3||!S.buildings[b.id].lvl) continue;const bs=bstat[b.id];if(!bs) continue;
    const r=t===3?cdP3(l+1)/cdP3(l):cdP2(l+1)/cdP2(l);if(r<=1) continue;
    for(const k in b.out) v+=b.out[k]*(bs.speed||0)*(bs.f||0)*bOutK(b.id,k)*(r-1)*(typeof saleValue==='function'?saleValue(k):price(k));}
  return v;}
/* the buildings the drones serve right now (built and running in this run) */
function cdBuiltB(id){const st=S.buildings[id];return !!(st&&st.lvl&&LOTS[id]&&(!LOTS[id].prem||S.premium.lvl)&&(id!=='boatyard'||typeof harborOpen!=='function'||harborOpen()));}
function cdServed(l){l=l===undefined?cdLvl():l;if(!l) return [];
  const o=BUILDINGS.filter(b=>(BTIER[b.id]===3||BTIER[b.id]===2&&cdReachesII(l))&&cdBuiltB(b.id)).map(b=>b.id);
  // busiest first (level, then tier III before II) so a small fleet visits the workshops that matter
  return o.sort((a,b)=>(BTIER[b]-BTIER[a])||(S.buildings[b].lvl-S.buildings[a].lvl)||(a<b?-1:1));}
function cdServes(id){const t=BTIER[id],l=cdLvl();return !!l&&(t===3||t===2&&cdReachesII(l));}
/* Bottleneck Advisor: a Phase II maker inside the drones' range gets "upgrade the Drone Port" when that is no dearer than
   upgrading the maker itself (more output from the same inputs, nothing upstream has to keep up) */
function cdFixFor(k,srcId){if(BTIER[srcId]!==2||!cdUnlocked()) return null;const l=cdLvl();if(l>=CD_MAX||!cdReachesII(l+1)) return null;
  const c=cdCost(l),b=BMAP[srcId],up=bulkCost(b.cost,b.scale,S.buildings[srcId].lvl,1);if(!isFinite(c)||S.coins+1e-9<c||c>up) return null;
  return {id:srcId,kind:'drone',k,via:[],label:`🚁 Upgrade the Drone Port (Lv ${l+1}): ${b.name} ×${cdP2(l+1).toFixed(2)}`,btn:'🚁 Drone Port',short:`upgrade the Drone Port (${b.name} output ×${cdP2(l+1).toFixed(2)})`,open:()=>cdOpen()};}
function cdOpen(){logiOpen();setTimeout(()=>{const e=$('lgDrone');if(e){e.classList.add('lg-ping');setTimeout(()=>e.classList.remove('lg-ping'),1600);if(e.scrollIntoView) e.scrollIntoView({block:'center',behavior:'smooth'});}},160);}
/* ---------- Logistics ladder row (Shipping sheet) ---------- */
function cdSig(){return (cdUnlocked()?1:0)+'';}
function cdHtml(){
  if(!cdUnlocked()) return `<div class="card lg-tier lock" id="lgDrone"><div class="ic">🚁</div><div><div class="nm">Cargo drones <span class="lg-tg">Tier 3</span></div><div class="ds">A Drone Port on the dock: drones fly goods from the workshops to the dock. Unlocks at Forklift Depot Lv ${CD_UNLOCK} with a conveyor belt built and the Premium Area open.</div></div></div>`;
  return `<div class="card lg-tier lg-drone on" id="lgDrone"><div class="ic">🚁</div><div><div class="nm"><span class="lg-full">Drone Port</span><span class="lg-short">Drones</span> <span class="cnt" id="lgDL"></span> <span class="lg-tg">Tier 3</span></div>
    <div class="ds" id="lgDD"></div><div class="ds lg-dr" id="lgDR"></div></div><button class="btn buy" id="lgDB"></button></div>`;}
function cdUpdate(){const b=$('lgDB');if(!b) return;const l=cdLvl(),c=cdCost(l),mx=!isFinite(c);
  const bh=mx?'MAX':costBtnHtml(l?'⬆':'🚁',c);if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=mx||S.coins+1e-9<c;
  const L=$('lgDL'),lt=`Lv ${l}/${CD_MAX}`;if(L&&L._t!==lt){L.textContent=lt;L._t=lt;}
  const f=x=>x.toFixed(2),g=mx?0:cdGain();
  const dt=mx?`Phase III output ×${f(cdP3(l))} · Phase II ×${f(cdP2(l))}`:`Phase III output ×${f(cdP3(l))} → ×${f(cdP3(l+1))}${cdReachesII(l+1)?` · Phase II ×${f(cdP2(l))} → ×${f(cdP2(l+1))}`:''}${g>0?` (≈ +${fmt(g)}/s)`:''}`;
  const d=$('lgDD');if(d&&d._t!==dt){d.textContent=dt;d._t=dt;}
  const n=cdServed().length,dn=cdCount(l);
  const rt=!l?`Lv 1: ${cdCount(1)} drones serve the Phase III workshops · Lv ${CD_RANGE}: long range, Phase II too`:`${dn} drone${dn>1?'s':''} · range: Phase III${cdReachesII(l)?' + II':''} (${n} building${n===1?'':'s'})${cdReachesII(l)?'':` · Lv ${CD_RANGE}: Phase II too`}`;
  const r=$('lgDR');if(r&&r._t!==rt){r.textContent=rt;r._t=rt;}}
function cdBind(){const b=$('lgDB');if(b) b.onclick=()=>{if(cdBuy()){if(typeof haptic==='function') haptic(8);cdUpdate();if(typeof render==='function') render();}};}
function cdFlowText(){if(!cdUnlocked()) return '';const l=cdLvl();if(!l) return ' · 🚁 drones ready to build';
  return ` · 🚁 drones Lv <b>${l}</b> (III ×${cdP3(l).toFixed(2)}${cdReachesII(l)?`, II ×${cdP2(l).toFixed(2)}`:''})`;}
/* ---------- scene ---------- */
function cdCount(l){l=l===undefined?cdLvl():l;return l?Math.min(CD_NMAX,1+l):0;}
function cdSpot(s){const o=[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]][s&3];return [CD_PAD[0]+o[0],CD_PAD[1]+o[1]];}
function cdRoofZ(id){const L=LOTS[id];return L?(L.H||(L.prem?38:L.tech?34:48)):0;}
function cdHoverZ(id){return cdRoofZ(id)+18;}   // low over the roof while the crate is hooked on
/* the surface under a drone (its shadow lands there): the pad, the dock roof, a built building's roof, else the ground */
function cdGroundZ(i,j){if(Math.abs(i-CD_PAD[0])<=CD_PADH&&Math.abs(j-CD_PAD[1])<=CD_PADH) return CD_PADZ;
  if(Math.abs(i-DOCK.ci+.27)<1.48&&Math.abs(j-DOCK.cj+.575)<1.18) return 46;
  for(const id in LOTS){const L=LOTS[id];if(!L||!L.H||!cdBuiltB(id)) continue;const B=lotBox(L);if(i>B.i0&&i<B.i1&&j>B.j0&&j<B.j1) return L.H-8;}return 0;}
function cdTarget(id,k){const L=LOTS[id];const a=(k*2.399)%TAU;return [L.ci+Math.cos(a)*.35,L.cj+Math.sin(a)*.35];}
function cdCargo(id){const b=BMAP[id];if(!b) return null;for(const k in b.out) return k;return null;}
function cdFreeSlot(d){const used={};for(const o of scene.cdr||[]) if(o!==d&&o.slot!==undefined&&(o.ph==='pad'||o.home||o.out&&o.ph==='up')) used[o.slot]=1;   // on the pad, coming home, or still climbing off it
  for(let s=0;s<4;s++){const q=(d.k+s)&3;if(!used[q]) return q;}return d.k&3;}
function cdSync(){const want=cdCount(),served=cdServed();scene.cdr=scene.cdr||[];const D=scene.cdr;
  const n=served.length?want:Math.min(want,4);
  // the first two wait on the pad; the rest start out hovering over their workshops and leave one after another, so a big
  // fleet never piles up on the four pad spots
  while(D.length<n){const k=D.length,s=k&3,p=cdSpot(s),d={k,slot:s,ph:'pad',t:-1.6*k,i:p[0],j:p[1],z:CD_PADZ,yaw:Math.PI*.25+k*.7,v:0,trips:1,cargo:null,home:false};
    if(k>=2&&served.length){const id=served[k%served.length],q=cdTarget(id,k);Object.assign(d,{ph:'hover',t:-2.2*(k-2),i:q[0],j:q[1],z:cdHoverZ(id),route:id,slot:undefined});}
    D.push(d);}
  if(D.length>n) D.length=n;}
function cdEase(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
function cdTurn(d,tgt,dt){const df=angDiff(d.yaw,tgt),m=CD_TURN*dt;d.yaw+=Math.max(-m,Math.min(m,df));}
function cdTick(dt){if(!S.logi) return;cdSync();const D=scene.cdr;if(!D.length) return;dt=Math.min(dt,.25);const served=cdServed();
  for(const d of D){d.t+=dt;d.bob=(d.bob||0)+dt;
    if(d.ph==='pad'){d.v=0;if(d.home===false&&d.cargo&&d.t>CD_DWELL*.5) d.cargo=null;
      if(d.t>=CD_DWELL&&served.length){const id=served[(d.k+d.trips*D.length)%served.length];d.route=id;d.trips++;d.cargo=null;
        d.A=[d.i,d.j];d.B=cdTarget(id,d.k);d.za=d.z;d.zb=CD_CRUISE+(d.k%3)*6;d.out=true;d.home=false;d.ph='up';d.t=0;}}
    else if(d.ph==='up'){d.z=d.za+(d.zb-d.za)*cdEase(d.t/CD_CLIMB);cdTurn(d,Math.atan2(d.B[1]-d.j,d.B[0]-d.i),dt);
      if(d.t>=CD_CLIMB){d.ph='go';d.t=0;d.s=0;d.v=0;d.A=[d.i,d.j];d.L=Math.hypot(d.B[0]-d.i,d.B[1]-d.j);}}
    else if(d.ph==='go'){const left=d.L-d.s,brake=d.v*d.v/(2*CD_ACC)+.02;
      const tgt=left<=brake?Math.max(.05,Math.sqrt(2*CD_ACC*Math.max(0,left))):CD_V;
      d.v=d.v<tgt?Math.min(tgt,d.v+CD_ACC*dt):Math.max(tgt,d.v-CD_ACC*1.5*dt);d.s=Math.min(d.L,d.s+d.v*dt);
      const f=d.L>1e-6?d.s/d.L:1;d.i=d.A[0]+(d.B[0]-d.A[0])*f;d.j=d.A[1]+(d.B[1]-d.A[1])*f;
      if(d.L>1e-6) cdTurn(d,Math.atan2(d.B[1]-d.A[1],d.B[0]-d.A[0]),dt);
      if(d.s>=d.L-1e-6){d.v=0;d.ph='down';d.t=0;d.za=d.z;d.zb=d.home?CD_PADZ:cdHoverZ(d.route);}}
    else if(d.ph==='down'){d.z=d.za+(d.zb-d.za)*cdEase(d.t/CD_CLIMB);
      if(d.t>=CD_CLIMB){d.t=0;if(d.home){d.ph='pad';d.home=false;}else d.ph='hover';}}
    else if(d.ph==='hover'){if(d.t>CD_HOVER*.5&&!d.cargo) d.cargo=cdCargo(d.route);
      if(d.t>=CD_HOVER){d.slot=cdFreeSlot(d);d.home=true;d.out=false;d.A=[d.i,d.j];d.B=cdSpot(d.slot);d.za=d.z;d.zb=CD_CRUISE+(d.k%3)*6;d.ph='up';d.t=0;}}
  }}
/* the pad: a steel deck on four legs over the roof ridge, hazard edge, landing ring; cached */
function cdPadRaw(g){const c=CD_PAD,h=CD_PADH,z=CD_PADZ,i0=c[0]-h,i1=c[0]+h,j0=c[1]-h,j1=c[1]+h;
  const roofZ=j=>40+14*Math.max(0,1-Math.abs(j-(DOCK.cj-.575))/1.175);
  for(const [i,j] of [[i0+.12,j0+.12],[i1-.12,j0+.12],[i0+.12,j1-.12],[i1-.12,j1-.12]]){const a=P(i,j,roofZ(j)),b=P(i,j,z-3);
    g.strokeStyle='#3a3f46';g.lineWidth=2.2;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();g.strokeStyle='#8a939c';g.lineWidth=.8;g.beginPath();g.moveTo(a[0]-.6,a[1]);g.lineTo(b[0]-.6,b[1]);g.stroke();}
  fillP(g,[P(i1,j0,z-3),P(i1,j1,z-3),P(i1,j1,z),P(i1,j0,z)],'#4a5058',EDGE);
  fillP(g,[P(i0,j1,z-3),P(i1,j1,z-3),P(i1,j1,z),P(i0,j1,z)],'#5c636c',EDGE);
  fillP(g,[P(i0,j0,z),P(i1,j0,z),P(i1,j1,z),P(i0,j1,z)],'#e2b52c','rgba(30,20,12,.5)',.8);
  // hazard stripes on the rim
  g.save();pth(g,[P(i0,j0,z),P(i1,j0,z),P(i1,j1,z),P(i0,j1,z)]);g.clip();g.strokeStyle='#2a2a2a';g.lineWidth=2.2;g.beginPath();
  for(let s=-2*h;s<=2*h+.01;s+=.16){const a=P(i0+Math.max(0,s),j0+Math.max(0,-s),z),b=P(i0+Math.min(2*h,s+2*h),j0+Math.min(2*h,2*h-s),z);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);}g.stroke();g.restore();
  const e=.12;fillP(g,[P(i0+e,j0+e,z),P(i1-e,j0+e,z),P(i1-e,j1-e,z),P(i0+e,j1-e,z)],'#3b4047');
  // landing ring + cross
  const ring=(r,col,w)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();for(let k=0;k<=28;k++){const a=k/28*TAU,p=P(c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,z);k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);}g.stroke();};
  ring(.34,'#f4f1e8',1.6);
  g.strokeStyle='#f4f1e8';g.lineWidth=1.4;g.beginPath();for(const [a,b] of [[[-.16,0],[.16,0]],[[0,-.16],[0,.16]]]){const p=P(c[0]+a[0],c[1]+a[1],z),q=P(c[0]+b[0],c[1]+b[1],z);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);}g.stroke();}
function cdDraw(ctx,objs,inView){if(!cdLvl()) return;const a=P(CD_PAD[0],CD_PAD[1],0);if(!inView(a[0],a[1]-60,90)) return;
  objs.push({k:DOCK.ci+DOCK.cj+.3,f:()=>{sprite(ctx,'cdpad',a[0],a[1],[-50,-CD_PADZ-30,50,-28],(g,ax,ay)=>{g.save();g.translate(ax-a[0],ay-a[1]);cdPadRaw(g);g.restore();});
    // corner beacons (blink in turn)
    const h=CD_PADH-.05,on=Math.floor(scene.t*1.5)%4;let n=0;for(const [di,dj] of [[-h,-h],[h,-h],[h,h],[-h,h]]){const p=P(CD_PAD[0]+di,CD_PAD[1]+dj,CD_PADZ+1.2);
      ctx.fillStyle=n===on?'#9dff7a':'#2f6a2a';ctx.fillRect(p[0]-1.2,p[1]-1.2,2.4,2.4);n++;}}});}
/* one cargo drone, anchored at its own position (0,0 = the point straight below the body at body height) */
function cdDroneRaw(g,yaw,fr,cargo){const V=VF(0,0,yaw,0),R=.14;
  const arms=[[.2,.2],[.2,-.2],[-.2,.2],[-.2,-.2]].map(([a,c])=>({a,c,d:vdepth(V,a,c)})).sort((x,y)=>x.d-y.d);
  if(cargo){const col=(typeof FLOW_TINT==='object'&&FLOW_TINT[cargo])||'#c89a5a';
    g.strokeStyle='rgba(40,40,40,.7)';g.lineWidth=.7;g.beginPath();for(const [a,c] of [[-.07,-.07],[.07,.07]]){const p=VL(V,a,c,1),q=VL(V,a,c,-4);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);}g.stroke();
    vbox(g,V,-.09,.09,-.09,.09,-11,-4,col,{});const t=VL(V,0,0,-4);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(t[0]-.6,t[1]-1,1.2,2);}
  // skids
  g.strokeStyle='#2b2f35';g.lineWidth=1.1;g.beginPath();for(const c of [-.09,.09]){const p=VL(V,-.13,c,-1),q=VL(V,.13,c,-1),u=VL(V,-.06,c,2),w=VL(V,.06,c,2);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.moveTo(u[0],u[1]);g.lineTo(VL(V,-.08,c,-1)[0],VL(V,-.08,c,-1)[1]);g.moveTo(w[0],w[1]);g.lineTo(VL(V,.08,c,-1)[0],VL(V,.08,c,-1)[1]);}g.stroke();
  const arm=x=>{const p=VL(V,x.a*.35,x.c*.35,5),q=VL(V,x.a,x.c,6);g.lineCap='round';g.strokeStyle='#23272d';g.lineWidth=2.6;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();
    g.strokeStyle='#6d7680';g.lineWidth=1.1;g.beginPath();g.moveTo(p[0],p[1]-.4);g.lineTo(q[0],q[1]-.4);g.stroke();g.lineCap='butt';
    const m=VL(V,x.a,x.c,6);ell(g,m[0],m[1]-1,2.1,1.5,'#23272d');ell(g,m[0],m[1]-1.6,1.4,.9,'#5d6670');};
  const rotor=x=>{const m=VL(V,x.a,x.c,8.2);g.fillStyle='rgba(215,240,255,.38)';g.beginPath();g.ellipse(m[0],m[1],R*45,R*22.6,0,0,TAU);g.fill();
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=.6;g.stroke();
    const th=fr*Math.PI/3+(x.a+x.c)*3,p=VL(V,x.a+Math.cos(th)*R,x.c+Math.sin(th)*R,8.2),q=VL(V,x.a-Math.cos(th)*R,x.c-Math.sin(th)*R,8.2);
    g.strokeStyle='rgba(35,40,48,.75)';g.lineWidth=1.2;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();};
  const back=arms.filter(x=>x.d<0),front=arms.filter(x=>x.d>=0);
  for(const x of back) arm(x);
  // body: white shell, orange top, dark sensor bay at the nose
  vbox(g,V,-.15,.15,-.1,.1,1.5,5.5,'#e8e5dc',{});
  vbox(g,V,-.1,.09,-.075,.075,5.5,7.6,'#2f6fb0',{topc:'#4a8ad0'});
  {const n=VL(V,.155,0,3.4);ell(g,n[0],n[1],1.6,1.2,'#1f2a36');ell(g,n[0]+.4,n[1]-.3,.6,.45,'#8fd4ff');}
  for(const x of front) arm(x);
  for(const x of arms) rotor(x);
  {const f=VL(V,.13,0,6.5),b=VL(V,-.15,0,6);g.fillStyle='#7dfc6a';g.fillRect(f[0]-.8,f[1]-.8,1.6,1.6);g.fillStyle='#ff5a4a';g.fillRect(b[0]-.8,b[1]-.8,1.6,1.6);}
}
const CD_S=1.25;   // drawing scale (a drone reads at a glance next to a forklift)
function cdDrone(ctx,x,y,yaw,fr,cargo){const q=qYaw(yaw);sprite(ctx,'cdr'+q.toFixed(3)+'|'+fr+'|'+(cargo||''),x,y,[-24*CD_S,-20*CD_S,24*CD_S,17*CD_S],(g,ax,ay)=>{g.save();g.translate(ax,ay);g.scale(CD_S,CD_S);cdDroneRaw(g,q,fr,cargo);g.restore();});}
/* drawn after the depth-sorted world (they fly above it): shadows first, then the drones far → near */
function cdDrawAir(ctx,inView){const D=scene.cdr;if(!D||!D.length||!cdLvl()) return;
  for(const d of D){const gz=cdGroundZ(d.i,d.j),h=Math.max(0,d.z-gz),s=P(d.i,d.j,gz);if(!inView(s[0],s[1],60)) continue;const a=Math.max(.07,.24-h*.0016),r=7+h*.035;
    ctx.fillStyle=`rgba(20,30,10,${a.toFixed(3)})`;ctx.beginPath();ctx.ellipse(s[0]+h*.05,s[1],r*1.25,r*.6,0,0,TAU);ctx.fill();}
  const o=D.slice().sort((a,b)=>(a.i+a.j)-(b.i+b.j));
  for(const d of o){const air=d.ph!=='pad',bz=d.z+(air?Math.sin(d.bob*2.1+d.k)*1.4:0),p=P(d.i,d.j,bz);if(!inView(p[0],p[1],50)) continue;
    const fr=Math.floor(scene.t*(air?22:5)+d.k)%3;cdDrone(ctx,p[0],p[1],d.yaw,fr,d.cargo);}}
/* test / debug */
function cdDebug(){return (scene.cdr||[]).map(d=>({k:d.k,ph:d.ph,i:d.i,j:d.j,z:d.z,v:d.v,route:d.route||null,cargo:d.cargo,slot:d.slot,home:d.home,yaw:d.yaw}));}
