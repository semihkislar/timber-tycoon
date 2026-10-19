'use strict';

/* ===================== v2.2 SCENE: premium area, stockpiles, premium trucks, client van ===================== */
const GOLD='#d8a930', GOLD_L='#f5d36a', WALNUT='#4a2c1c', SLATE='#3a3430';
/* ---------- ground (inside cached chunks) ---------- */
// v2.21.1: Phase 3 is its own row beyond Phase 2. The row is a band in lane coordinates (u along the lane, v across it),
// so on screen it is an upright strip parallel to rows I and II. Paving is laid in u/v pavers (screen-square stone setts),
// visibly different from the diamond yard tiles of the factory.
function PUV(u,v,z){return [v*HW,u*HH-(z||0)];}
function uvRect(ctx,u0,v0,u1,v1,c,st){fillP(ctx,[PUV(u0,v0),PUV(u0,v1),PUV(u1,v1),PUV(u1,v0)],c,st);}
function drawPremGround(ctx,x0,y0,x1,y1){
  const R=PROW, bx0=R.v0*HW-60, bx1=Math.max(R.v1,-8)*HW+60, by0=R.u0*HH-60, by1=(PROAD_J+31)*HH+60;
  if(bx1<x0||bx0>x1||by1<y0||by0>y1) return;
  const open=S.premium&&S.premium.lvl>0;
  // Phase 2 → 3 forklift lanes across the verge (always visible once the row is open, so the hand-off reads)
  uvRect(ctx,PROW.u0,-12.62,PROW.u1,-11.2,open?'#b9b2a6':'#c7bba3');
  if(open){ctx.strokeStyle='rgba(245,200,76,.9)';ctx.lineWidth=2;ctx.beginPath();for(const v of [-11.28]){const a=PUV(PROW.u0+.2,v),b=PUV(PROW.u1-.2,v);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();}
  for(const id in PGATES){const u=PGATES[id];
    uvRect(ctx,u-.85,-12.65,u+.85,-10.9,open?'#a29a8d':'#c7bba3');
    if(open){ctx.fillStyle='rgba(245,200,76,.85)';for(let v=-12.4;v<-11;v+=.55){const a=PUV(u-.55,v),b=PUV(u+.55,v+.22);ctx.fillRect(a[0],a[1],b[0]-a[0]+3,3);}}}
  // raised plinth lip on the front (south) edge
  fillP(ctx,[PUV(R.u1,R.v0),PUV(R.u1,R.v1),PUV(R.u1,R.v1,-5),PUV(R.u1,R.v0,-5)],open?'#2a2420':'#9a8e78');
  // pavers: running-bond setts, one per u unit × half v unit
  for(let u=Math.floor(R.u0);u<R.u1;u++){const off=(u&1)?.25:0;
    for(let v=R.v0-off;v<R.v1;v+=.5){const va=Math.max(R.v0,v),vb=Math.min(R.v1,v+.5),ua=Math.max(R.u0,u),ub=Math.min(R.u1,u+1);if(vb<=va||ub<=ua) continue;
      const h=hash2(u*3+7,Math.round(v*2)+90);let c;
      if(open){const aisle=Math.abs((va+vb)/2-R.va)<.7;c=aisle?(h>.5?'#c2ab84':'#b9a27c'):(h>.66?'#6e5b4c':h>.33?'#665446':'#5e4d41');}
      else c=h>.5?'#bdb19a':'#b5a891';
      uvRect(ctx,ua,va,ub,vb,c);}}
  ctx.strokeStyle=open?'rgba(0,0,0,.28)':'rgba(110,95,70,.18)';ctx.lineWidth=1;ctx.beginPath();
  for(let u=Math.ceil(R.u0);u<R.u1;u++){const a=PUV(u,R.v0),b=PUV(u,R.v1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  if(open){
    // gold inlay borders + aisle edge lines
    ctx.strokeStyle='rgba(245,211,106,.6)';ctx.lineWidth=1.5;ctx.beginPath();
    for(const v of [R.va-.72,R.va+.72]){const a=PUV(R.u0+.3,v),b=PUV(R.u1-.3,v);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.stroke();ctx.strokeStyle=GOLD;ctx.lineWidth=1;pth(ctx,[PUV(R.u0+.15,R.v0+.15),PUV(R.u0+.15,R.v1-.15),PUV(R.u1-.15,R.v1-.15),PUV(R.u1-.15,R.v0+.15)]);ctx.stroke();
    // marble pads with gold inlay under each workshop
    for(const b of PREM_BLD){const L=LOTS[b.id],e=(L.bs0+.42)/2+.18;const pts=[P(L.ci-e,L.cj-e),P(L.ci+e,L.cj-e),P(L.ci+e,L.cj+e),P(L.ci-e,L.cj+e)];
      fillP(ctx,pts.map(p=>[p[0],p[1]+3]),'#1e1a17');fillP(ctx,pts,'#2f2a26');ctx.strokeStyle=GOLD;ctx.lineWidth=1.4;pth(ctx,pts);ctx.stroke();}
  }
  // ground lettering at the head of the row (painted on the setts, foreshortened like the ground plane)
  {const p=PUV(R.u1-2.5,(R.v0+R.v1)/2);ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,.5);ctx.font='900 30px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=open?'rgba(245,211,106,.82)':'rgba(120,100,70,.45)';ctx.fillText('III · PREMIUM',0,0);ctx.restore();}
  // dock apron, spur and access road to the highway
  uvRect(ctx,R.u1,-21.8,64.2,-12.6,open?'#5c5f66':'#b5a891');
  {const a=PDOCK.ci-1,b=PDOCK.ci+4.2;fillP(ctx,[P(a,PDOCK.cj-2),P(b,PDOCK.cj-2),P(b,PROAD_J),P(a,PROAD_J)],'#5c5f66');}
  fillP(ctx,[P(PDOCK.ci-1,PROAD_J-.75),P(30,PROAD_J-.75),P(30,PROAD_J+.75),P(PDOCK.ci-1,PROAD_J+.75)],'#55585f');
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.6;ctx.beginPath();for(let i=PDOCK.ci+.4;i<29.6;i+=1){const a=P(i,PROAD_J),b=P(i+.5,PROAD_J);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2.4;ctx.beginPath();for(let j=PDOCK.cj-1;j<PDOCK.cj+1.1;j+=.5){const a=P(PDOCK.ci+1.7,j),b=P(PDOCK.ci+3.0,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
}
/* ---------- sync / update ---------- */
function premOpen(){return S.premium&&S.premium.lvl>0;}
// v2.21.1: phase-2 sources feeding the row; their pallets travel by forklift through the gates into Phase 3
const PSRC={chairs:'carpentry',pellets:'pellet',paper:'paper',furniture:'furniture'};
function premLinks(){const out=[];
  for(const b of PREM_BLD){if(!S.buildings[b.id].lvl) continue;
    for(const k in b.inp){const src=PSRC[k];if(!src||!S.buildings[src]||!S.buildings[src].lvl||!PGATES[src]) continue;out.push({src,dst:b.id,k});}}
  return out.slice(0,6);}   // ≤ 6 lifts keeps the forklift sprite cache warm
function doorUV(L){const d=doorOf(L);return [d[0]+d[1],d[0]-d[1],d];}
function premLiftPath(src,dst,k){const gu=PGATES[src],L=LOTS[dst],[du,dv,d]=doorUV(L),off=(k%3-1)*.28;
  return mkPath([uvIJ(gu,-10.55),uvIJ(gu,PROW.va+off),uvIJ(du,PROW.va+off),uvIJ(du,dv+.1),d]);}
function premSync(){
  const open=premOpen();
  if(scene._premOpen!==open){scene._premOpen=open;scene.chunks.clear();if(!open){for(const b of PREM_BLD){LOTS[b.id].hit=null;LOTS[b.id].top=null;}scene.premTrucks=[];scene.plifts=[];scene.pworkers=[];}}
  if(!open) return;
  const built=PREM_BLD.filter(b=>S.buildings[b.id].lvl>0);
  const links=premLinks(),sig=built.map(b=>b.id).join(',')+'|'+links.map(l=>l.src+'>'+l.dst).join(',');
  if(scene._pfsig!==sig){scene._pfsig=sig;const old=scene.plifts||[];
    scene.plifts=links.map((l,n)=>{const pr=old.find(o=>o.src===l.src&&o.dst===l.dst);return {src:l.src,dst:l.dst,res:l.k,p:pr?pr.p:(n*.37)%2,ph:0,path:premLiftPath(l.src,l.dst,n)};});
    scene.pworkers=built.length?[0,1].map(k=>({k,p:k*.5,ph:k*2,look:mkLook(8100+k*7,{role:'worker',vest:'#2a2a30',female:k===1}),route:null,tgt:built[(k+1)%built.length].id})):[];}
  if(!scene.premTrucks) scene.premTrucks=[];
  if(built.length&&!scene.premTrucks.length&&!(scene._ptDelay>0)) scene.premTrucks.push(mkPremTruck(scene._ptFirst?false:true)),scene._ptFirst=true;
}
const PDOCKB=[PDOCK.ci+2.37,PDOCK.cj], PD_R=.83;
function premTruckLegs(){
  const X=PDOCKB[0]+PD_R, A=[X,PDOCKB[1]-PD_R], J=PROAD_J;
  return [
    // in from the south on the northbound lane (never queues behind the Shipping dock trucks), left onto the access road
    {pa:crPath([[30.35,74],[30.35,J+1.5],[30.1,J+.6],[29.3,J+.38],[X+1.4,J+.38],[X+.2,J-.2],[X,J-1.2],[A[0],A[1]]],8),vmax:3.6},
    {pa:densePath(arcPts(t=>{const th=t*Math.PI/2;return [A[0]-(A[0]-PDOCKB[0])*(1-Math.cos(th)),A[1]+PD_R*Math.sin(th)];},12)),rev:true,vmax:1.0},
    {pa:densePath([[PDOCKB[0],PDOCKB[1]],[PDOCKB[0]+.001,PDOCKB[1]]]),vmax:.5,hold:(v,dt)=>{v.doors=Math.min(1,(v.doors||0)+dt*1.6);return v.load<1||v.doors<1;}},
    {pa:crPath([[PDOCKB[0],PDOCKB[1]],[X+.3,PDOCKB[1]+.1],[X+.75,PDOCKB[1]+.7],[X+.8,J-.7],[X+1.6,J-.36],[29.4,J-.36],[30.35,J-1.2],[30.35,J-3],[30.35,-26]],8),vmax:3.6}
  ];
}
function mkPremTruck(atDock){const v={kind:'prem',legs:premTruckLegs(),li:0,s:0,v:0,load:0,doors:0};if(atDock){v.li=2;v.load=.25;v.doors=1;}return v;}
// road vehicles in the +j approach lane keep their distance from anything ahead in that lane
function laneLimit(v){
  const L=v.legs[v.li]; if(!L||!L.lane||v.i===undefined) return undefined;
  let lim=1e9; const all=[...scene.dockTrucks,...(scene.premTrucks||[]),...(scene.client&&scene.client.veh?[scene.client.veh]:[])];
  for(const o of all){if(o===v||o.i===undefined||o.done) continue; if(Math.abs(o.i-31.45)<.62&&o.j>v.j+.05) lim=Math.min(lim,o.j-v.j-3.3);}
  return lim<1e8?Math.max(0,lim):undefined;
}
// workers walk the aisle: from the gate of the workshop's first phase-2 source (or the head of the row) to its door
function premRoute(from,id){const L=LOTS[id],[du,dv,d]=doorUV(L),fu=from[0]+from[1];return mkPath([from,uvIJ(fu,PROW.va-.45),uvIJ(du,PROW.va-.45),uvIJ(du,dv+.1),d]);}
function premFrom(id){const b=BMAP[id];for(const k in b.inp){const s=PSRC[k];if(s&&PGATES[s]&&S.buildings[s].lvl) return uvIJ(PGATES[s],-12.9);}return uvIJ(PROW.u0+.8,PROW.va);}
function premUpdate(dt){
  const ev=scene.orderEv; if(ev){ev.t+=dt; if(ev.t>4) scene.orderEv=null;}
  clientUpdate(dt);
  if(!premOpen()) return;
  const built=PREM_BLD.filter(b=>S.buildings[b.id].lvl>0); if(!built.length) return;
  const running=built.some(b=>S.buildings[b.id].on&&bstat[b.id].f>.01);
  // Phase 2 → 3 forklifts: rack → gate → aisle → workshop door, and back empty
  const fv=(typeof shForkSpeed==='function'?shForkSpeed():1.7)*(running?.8:.3);
  for(const f of scene.plifts||[]){f.p=(f.p+dt*fv/f.path.tot)%2;const q=f.p<1?f.p:2-f.p;const [i,j,di,dj]=pathAt(f.path,q);const sg=f.p<1?1:-1;f.i=i;f.j=j;
    if(Math.abs(di)+Math.abs(dj)>1e-6){const y=Math.atan2(dj*sg,di*sg);f.yaw=Math.round(y/(Math.PI/8))*(Math.PI/8);}f.ph+=dt*6;}
  for(const w of scene.pworkers||[]){if(!w.route){const b=BMAP[w.tgt]||built[0];w.route=premRoute(premFrom(b.id),b.id);}
    w.p+=dt*.11*(4/Math.max(4,w.route.tot))*2.2; if(w.p>=2){w.p=0;w.k++;w.tgt=built[w.k%built.length].id;w.route=null;} w.ph+=dt*7;}
  // premium dock trucks
  const psell=PREM_BLD.some(b=>S.buildings[b.id].lvl>0&&S.buildings[b.id].on&&bstat[b.id].f>.01);
  if(scene._ptDelay>0) scene._ptDelay-=dt;
  for(const tk of scene.premTrucks){const wasLi=tk.li;if(tk.li===2) tk.load=Math.min(1,tk.load+dt*(psell?.16:.05));if(tk.li===3) tk.doors=Math.max(0,tk.doors-dt*2);
    stepVeh(tk,dt,laneLimit(tk));
    if(wasLi===2&&tk.li===3){const p=P(PDOCKB[0],PDOCKB[1],46);const v=PREM_BLD.reduce((a,b)=>a+(rates[OUT_OF[b.id]]?rates[OUT_OF[b.id]].s*price(OUT_OF[b.id]):0),0)*25;if(v>0) scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(v),coin:true,t:0,dur:1.6,big:true,col:'#ffd760'});}}
  if(scene.premTrucks.some(t=>t.done)){scene.premTrucks=scene.premTrucks.filter(t=>!t.done);scene._ptDelay=1.5;}
  for(const tk of scene.premTrucks) if(tk.li===3&&tk.s<.2&&!tk._ex){tk._ex=1;}
}
/* ---------- client van + client (order notification in the world) ---------- */
// v2.21.1: the client parks on the premium access road, by the Phase 3 dock
const CLIENT_PARK=[27.9,PROAD_J-.36], CLIENT_FIG=[27.55,PROAD_J-1.35];
function clientLegsIn(){const J=PROAD_J;return [{pa:crPath([[30.35,74],[30.35,J+1.5],[30.1,J+.6],[29.3,J+.38],[28.4,J+.38],[27.1,J+.3],[26.5,J-.1],[26.9,J-.36],[CLIENT_PARK[0],CLIENT_PARK[1]]],8),vmax:3.2}];}
function clientLegsOut(){const J=PROAD_J;return [{pa:crPath([[CLIENT_PARK[0],CLIENT_PARK[1]],[29.4,J-.36],[30.35,J-1.2],[30.35,J-3],[30.35,-26]],8),vmax:3.0}];}
function clientUpdate(dt){
  const O=S.orders, want=!!(O&&(O.offer||O.active));
  if(want&&!scene.client){const o=O.offer||O.active;scene.client={st:'in',veh:{kind:'van',legs:clientLegsIn(),li:0,s:0,v:0},look:mkLook(9000+(o.id%97),{role:'casual',female:o.id%2===0}),fig:0,ph:0,id:o.id};}
  const c=scene.client; if(!c) return;
  if(!want&&c.st!=='out'){c.st='out';c.veh.legs=clientLegsOut();c.veh.li=0;c.veh.s=0;c.veh.v=0;c.done=scene.orderEv&&scene.orderEv.kind==='done';}
  if(c.st==='out'){c.fig=Math.max(0,c.fig-dt*2.2);if(c.fig>0) return;}
  stepVeh(c.veh,dt,laneLimit(c.veh)); c.ph+=dt;
  if(c.st==='in'&&c.veh.li>=c.veh.legs.length){c.st='park';}
  if(c.st==='park'){c.fig=Math.min(1,c.fig+dt*1.5);}
  if(c.veh.done&&c.st==='out'){scene.client=null;}
}
/* luxury client van: black body, gold pinstripe, tinted glass */
function limoRaw(ctx,i,j,yaw,o){
  o=o||{}; const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-1.05,1.05,.42);
  const sv=(V.si+V.sj)>0?1:-1;
  for(const a of [.68,-.66]) vwheel(ctx,V0,a,-sv*.43,5.2,false);
  vbox(ctx,V,-1.05,1.08,-.4,.4,3.5,14,'#18181d',{deco:(f,b,z0)=>{
    if(f==='R'||f==='L'){vquad(ctx,V,f,b,-1.0,1.03,10.2,11.2,GOLD);vquad(ctx,V,f,b,-.05,.0,4.5,13.5,'rgba(0,0,0,.35)');const hd=vface(V,f,b,.05,.18,9,9.8);fillP(ctx,hd,'#c9ccd2');}
    if(f==='F'){vquad(ctx,V,'F',b,-.26,.26,5,9.5,'#c9ccd2','rgba(0,0,0,.3)');for(let k=0;k<4;k++){const c0=-.22+k*.12;vquad(ctx,V,'F',b,c0,c0+.06,5.6,9,'#5a5f66');}
      vquad(ctx,V,'F',b,-.38,-.28,8,10,'#fffbe0');vquad(ctx,V,'F',b,.28,.38,8,10,'#fffbe0');}
    if(f==='B'){vquad(ctx,V,'B',b,-.38,-.28,8,10.5,o.brake?'#ff4a3a':'#a8241c');vquad(ctx,V,'B',b,.28,.38,8,10.5,o.brake?'#ff4a3a':'#a8241c');vquad(ctx,V,'B',b,-.2,.2,6,7,'#c9ccd2');}}});
  vbox(ctx,V,-.98,.45,-.37,.37,14,22.5,'#1d1d23',{deco:(f,b)=>{
    if(f==='R'||f==='L'){vquad(ctx,V,f,b,-.9,-.3,15.5,21,'#2c3a48');vquad(ctx,V,f,b,-.22,.36,15.5,21,'#2c3a48');vquad(ctx,V,f,b,-.85,-.55,19,20.5,'rgba(255,255,255,.22)');}
    if(f==='F'){vquad(ctx,V,'F',b,-.32,.32,15,21.5,'#3a5468');vquad(ctx,V,'F',b,-.3,-.05,18,21,'rgba(255,255,255,.25)');}
    if(f==='B') vquad(ctx,V,'B',b,-.3,.3,15.5,21,'#2c3a48');},topc:'#2a2a32'});
  if(sv) for(const a of [.68,-.66]) vwheel(ctx,V0,a,sv*.43,5.2,true);
  // hood ornament + roof gold trim
  const r0=VL(V,-.98,0,22.5+V.dz),r1=VL(V,.45,0,22.5+V.dz);ctx.strokeStyle=GOLD;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();
}
/* ---------- premium buildings ---------- */
function glassFace(ctx,face,K,a0,a1,z0,z1,interior){
  fillP(ctx,fq(face,K,a0,a1,z0,z1),'#1d2a33');
  const D=scene.dn, lit=D&&D.night>.35; const g=lit?'#ffe2a0':(interior||'#7fb8d0'); fillP(ctx,fq(face,K,a0+.02,a1-.02,z0+1,z1-1),g);
  if(D&&D.lights>.03) scene.lq.push(fq(face,K,a0+.02,a1-.02,z0+1,z1-1));
  // reflection streaks
  const w=a1-a0; fillP(ctx,[...fq(face,K,a0+w*.12,a0+w*.3,z0+1,z1-1)].map((p,k)=>k===2||k===3?[p[0]+4,p[1]]:p),'rgba(255,255,255,.22)');
  fillP(ctx,fq(face,K,a0+w*.36,a0+w*.42,z0+1,z1-1),'rgba(255,255,255,.14)');
}
function mullions(ctx,face,K,a0,a1,z0,z1,n){ctx.strokeStyle=GOLD;ctx.lineWidth=1.2;ctx.beginPath();for(let k=0;k<=n;k++){const a=a0+(a1-a0)*k/n;const p=fq(face,K,a,a,z0,z1);ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[3][0],p[3][1]);}
  const t=fq(face,K,a0,a1,z1,z1);ctx.moveTo(t[0][0],t[0][1]);ctx.lineTo(t[1][0],t[1][1]);ctx.stroke();}
function interiorItems(ctx,kind,B,z0,run,t){ // silhouettes behind the glass (+i face)
  const K=B.i1-.02, n=kind==='showroom'?3:4, span=B.j1-B.j0;
  for(let k=0;k<n;k++){const a=B.j0+span*(.16+k*(.68/(n-1||1)));const p=P(K,a,z0+1);
    ctx.save();ctx.translate(p[0],p[1]);ctx.transform(1,-.5,0,1,0,0);
    if(kind==='atelier'){ctx.fillStyle='#22222a';ctx.fillRect(-4,-9,8,8);ctx.fillStyle=GOLD;ctx.fillRect(-.6,-9,1.2,8);ctx.fillRect(-4,-6,8,1);}
    else if(kind==='parquet'){ctx.fillStyle='#8a5428';ctx.fillRect(-5,-4,10,3);ctx.fillStyle='#b8763a';ctx.fillRect(-5,-7,10,3);ctx.fillStyle='#6a3e1c';ctx.fillRect(-5,-10,10,3);}
    else if(kind==='stationer'){ctx.fillStyle=['#1f3a5a','#6a1f3a','#2f5a3a','#3a2418'][k%4];ctx.fillRect(-3,-12,3,11);ctx.fillRect(1,-10,3,9);ctx.fillStyle=GOLD;ctx.fillRect(-3,-10,3,1);}
    else if(kind==='cabinetry'){ctx.fillStyle='#3a2418';ctx.fillRect(-4,-14,8,13);ctx.fillStyle='#6a4026';ctx.fillRect(-3.3,-13,3,11);ctx.fillRect(.3,-13,3,11);ctx.fillStyle=GOLD;ctx.fillRect(-1,-8,.8,3);ctx.fillRect(.6,-8,.8,3);}
    else {ctx.fillStyle='#6a1f3a';ctx.fillRect(-7,-6,14,5);ctx.fillRect(-8,-9,3,8);ctx.fillRect(5,-9,3,8);ctx.fillStyle='#a83a5e';ctx.fillRect(-5,-5,10,2);
      if(k===1){ctx.fillStyle='#2a2a30';ctx.fillRect(-.5,-22,1,20);ctx.fillStyle='#fff0c0';ctx.beginPath();ctx.moveTo(-4,-22);ctx.lineTo(4,-22);ctx.lineTo(2.5,-27);ctx.lineTo(-2.5,-27);ctx.closePath();ctx.fill();}}
    ctx.restore();}
  if(run){const g=P(K,(B.j0+B.j1)/2,z0+8);ctx.fillStyle='rgba(255,220,140,.12)';ctx.beginPath();ctx.ellipse(g[0],g[1],span*20,9,0,0,TAU);ctx.fill();}
}
function premBuilding(kind){
  const LABEL={atelier:'ATELIER',parquet:'PARQUET',stationer:'PAPETERIE',cabinetry:'CABINETS',showroom:'SHOWROOM'};
  return function(ctx,L,B,run,t){
    const ms=B.ms, big=kind==='showroom', h=(big?34:24)+ms*2.6, bs=B.bs;
    box(ctx,B.i0-.07,B.j0-.07,B.i1+.07,B.j1+.07,0,3,'#24201d',{hl:false});
    box(ctx,B.i0,B.j0,B.i1,B.j1,3,h,WALNUT,{left:'#5a3622',right:'#3e2416',top:'#231b16'});
    // walnut slats on the lit (+j) face
    ctx.strokeStyle='rgba(20,10,4,.28)';ctx.lineWidth=1;ctx.beginPath();for(let a=B.i0+.12;a<B.i1;a+=.16){const p=fq('J',B.j1,a,a,4,h-5);ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[3][0],p[3][1]);}ctx.stroke();
    // glass storefront on +i (plaza) face
    const g0=B.j0+bs*.1,g1=B.j1-bs*.1;
    glassFace(ctx,'I',B.i1,g0,g1,5,h-7,run?'#8cc6da':'#6f9fb4');
    interiorItems(ctx,kind,B,5,run,t);
    mullions(ctx,'I',B.i1,g0,g1,5,h-7,big?4:3);
    // entrance door (dark glass, gold handle) centred in the storefront
    const dm=(B.j0+B.j1)/2; fillP(ctx,fq('I',B.i1+.005,dm-.14,dm+.14,3,15),'#1a2228');const hd=P(B.i1+.01,dm+.05,9);ctx.fillStyle=GOLD;ctx.fillRect(hd[0]-.6,hd[1]-2.5,1.2,5);
    if(big){glassFace(ctx,'J',B.j1,B.i0+bs*.1,B.i1-bs*.1,5,h-7,run?'#8cc6da':'#6f9fb4');mullions(ctx,'J',B.j1,B.i0+bs*.1,B.i1-bs*.1,5,h-7,4);}
    else {for(let k=0;k<3;k++){const a=B.i0+bs*(.14+k*.27);win(ctx,'J',B.j1,a,bs*.17,h-15,8,run,'#2a1a10');}}
    // gold cornice
    fillP(ctx,fq('I',B.i1,B.j0,B.j1,h-5,h-2),GOLD);fillP(ctx,fq('J',B.j1,B.i0,B.i1,h-5,h-2),GOLD_L);
    fillP(ctx,fq('I',B.i1,B.j0,B.j1,3,4.5),'#8a6a20');fillP(ctx,fq('J',B.j1,B.i0,B.i1,3,4.5),'#a8842a');
    let top=h;
    // roof features
    if(kind==='cabinetry') top=sawtooth(ctx,B.i0+.1,B.j0+.1,B.i1-.1,B.j1-.1,h,8,3,'j','#2a201a',WALNUT);
    else {ctx.strokeStyle=GOLD;ctx.lineWidth=1.3;pth(ctx,[P(B.i0,B.j0,h),P(B.i1,B.j0,h),P(B.i1,B.j1,h),P(B.i0,B.j1,h)]);ctx.stroke();}
    if(kind==='atelier'){const ci=B.i0+.45,cj=B.j0+.45;const cp=stack(ctx,ci,cj,{r:.16,top:h+17,base:[h,h,h],style:'darkbrick'});if(run){ell(ctx,cp[0],cp[1]+1,3.2,1.4,'rgba(255,150,60,.55)');chimneySmoke(cp[0],cp[1],'grey',1.1);}}
    if(kind==='parquet'){for(let k=0;k<3;k++){const a=B.i0+.25+k*.1;box(ctx,a,B.j0+.3+k*.08,a+.9,B.j0+.48+k*.08,h+k*2.5,h+2.5+k*2.5,['#b8763a','#8a5428','#a06830'][k],{hl:false});}}
    if(kind==='stationer'){const p=P((B.i0+B.i1)/2,(B.j0+B.j1)/2,h);ctx.save();ctx.translate(p[0],p[1]-6);ctx.rotate(-.5);ctx.fillStyle='#1a1a1e';rr(ctx,-3,-20,6,24,2);ctx.fill();ctx.fillStyle=GOLD;ctx.fillRect(-3,-12,6,2);ctx.beginPath();ctx.moveTo(-3,4);ctx.lineTo(3,4);ctx.lineTo(0,11);ctx.closePath();ctx.fill();ctx.restore();}
    if(big){const p=P((B.i0+B.i1)/2,(B.j0+B.j1)/2,h+2);ctx.fillStyle=GOLD;ctx.beginPath();ctx.moveTo(p[0]-9,p[1]);ctx.lineTo(p[0]-9,p[1]-7);ctx.lineTo(p[0]-4.5,p[1]-3);ctx.lineTo(p[0],p[1]-10);ctx.lineTo(p[0]+4.5,p[1]-3);ctx.lineTo(p[0]+9,p[1]-7);ctx.lineTo(p[0]+9,p[1]);ctx.closePath();ctx.fill();ctx.strokeStyle='#8a6a10';ctx.lineWidth=1;ctx.stroke();
      if(run){for(const s of [-1,1]){const q=P(B.i1-.2,(B.j0+B.j1)/2+s*.6,h);ctx.fillStyle='rgba(255,240,190,.10)';ctx.beginPath();ctx.moveTo(q[0]-2,q[1]);ctx.lineTo(q[0]+2,q[1]);ctx.lineTo(q[0]+s*22+10,q[1]-90);ctx.lineTo(q[0]+s*22-10,q[1]-90);ctx.closePath();ctx.fill();}}}
    // rooftop name board along the +j edge
    const nb0=B.i0+bs*.18,nb1=B.i1-bs*.18;fillP(ctx,fq('J',B.j1-.06,nb0,nb1,top+1,top+10),'#1a1410',GOLD);
    ctx.save();fxf(ctx,'J',B.j1-.06,nb0,top+5.5);ctx.fillStyle=GOLD_L;ctx.font=`900 ${big?7.5:6.5}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(LABEL[kind],(nb1-nb0)*16,0);ctx.restore();
    if(ms>=4) flag(ctx,...P(B.i1,B.j0,top),'#d8a930');
    if(ms>=6) goldTrim(ctx,B,h);
    return top+12;
  };
}
for(const k of ['atelier','parquet','stationer','cabinetry','showroom']) BDRAW[k]=premBuilding(k);
function premConstruction(ctx,L,can){
  const e=(L.bs0+.42)/2+.1,{ci,cj}=L;
  ctx.save();ctx.setLineDash([5,4]);ctx.lineDashOffset=-scene.t*10*(can?1:0);ctx.strokeStyle=can?'#f5c84c':'rgba(216,169,48,.55)';ctx.lineWidth=2;
  pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.stroke();ctx.restore();
  if(can){ctx.fillStyle=`rgba(245,200,76,${.1+.07*Math.sin(scene.t*4)})`;pth(ctx,[P(ci-e,cj-e),P(ci+e,cj-e),P(ci+e,cj+e),P(ci-e,cj+e)]);ctx.fill();}
  box(ctx,ci-.5,cj-.3,ci+.2,cj+.1,0,4,'#6a4026',{hl:false});box(ctx,ci+.1,cj+.2,ci+.5,cj+.5,0,7,'#2a2420',{hl:false});
  const sp=P(ci-.2,cj-.5,0);ctx.fillStyle='#2a2420';ctx.fillRect(sp[0]-1.2,sp[1]-20,2.4,20);fillP(ctx,fq('J',cj-.45,ci-.6,ci+.2,13,22),'#1a1410',GOLD);
  ctx.save();fxf(ctx,'J',cj-.45,ci-.6,17.5);ctx.font='8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔨',12.8,0);ctx.restore();
  L.hit=[P(ci-e,cj-e,26),P(ci+e,cj-e,26),P(ci+e,cj-e,0),P(ci+e,cj+e,0),P(ci-e,cj+e,0),P(ci-e,cj+e,26)];L.top=P(ci,cj,28);
}
function drawPremDock(ctx){
  const ci=PDOCK.ci,cj=PDOCK.cj;
  box(ctx,ci-.75,cj-1.2,ci+.75,cj+1.2,0,7,'#3a3532',{hl:false});
  for(let k=0;k<3;k++){const p=P(ci+.75,cj-.9+k*.9,4);ctx.fillStyle='#111';ctx.fillRect(p[0]-1,p[1]-3,3,6);}
  const B={i0:ci-.7,i1:ci+.45,j0:cj-1.1,j1:cj+1.1,bs:1.15};
  box(ctx,B.i0,B.j0,B.i1,B.j1,7,34,WALNUT,{left:'#5a3622',right:'#3e2416',top:'#231b16'});
  // bay door (open when a truck is loading)
  const ld=(scene.premTrucks||[]).some(t=>t.li===2);
  fillP(ctx,fq('I',B.i1,cj-.42,cj+.42,7,26),'#16120f');
  if(!ld){fillP(ctx,fq('I',B.i1+.002,cj-.4,cj+.4,7,25),'#3a3836');ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();for(let z=9;z<25;z+=2.6){const p=fq('I',B.i1+.003,cj-.4,cj+.4,z,z);ctx.moveTo(p[0][0],p[0][1]);ctx.lineTo(p[1][0],p[1][1]);}ctx.stroke();}
  else {box(ctx,B.i1-.35,cj-.3,B.i1-.05,cj,7,13,RCOL.luxfurn,{hl:false});box(ctx,B.i1-.35,cj+.02,B.i1-.05,cj+.3,7,12,RCOL.giftbox,{hl:false});}
  fillP(ctx,fq('I',B.i1,B.j0,B.j1,29,31.5),GOLD);fillP(ctx,fq('J',B.j1,B.i0,B.i1,29,31.5),GOLD_L);
  fillP(ctx,fq('J',B.j1,B.i0+.1,B.i1-.1,15,24),'#1a1410',GOLD);
  ctx.save();fxf(ctx,'J',B.j1,B.i0+.1,19.5);ctx.fillStyle=GOLD_L;ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('RESERVE',(B.i1-B.i0-.2)*16,0);ctx.restore();
  ctx.strokeStyle=GOLD;ctx.lineWidth=1.2;pth(ctx,[P(B.i0,B.j0,34),P(B.i1,B.j0,34),P(B.i1,B.j1,34),P(B.i0,B.j1,34)]);ctx.stroke();
  // waiting crates on the dock apron
  const pal=[RCOL.giftbox,RCOL.flooring,RCOL.stationery,RCOL.cabinets,RCOL.luxfurn];
  for(let k=0;k<3;k++){const a=ci+.5,b=cj-1.05+k*.36;box(ctx,a-.12,b,a+.16,b+.28,7,12,pal[(k+Math.floor(scene.t/6))%5],{hl:false});}
  PDOCK.hit=[P(ci-.8,cj-1.2,40),P(ci+.8,cj-1.2,40),P(ci+.8,cj-1.2,0),P(ci+.8,cj+1.2,0),P(ci-.8,cj+1.2,0),P(ci-.8,cj+1.2,40)];PDOCK.top=P(ci,cj,44);
}
/* fence: dark iron railings with gold finials round the Phase 3 row; forklift gates face Phase 2, the arch faces the dock */
const PARCH=[-19.7,-16.5];   // v span of the south arch (towards the premium dock)
function fenceSeg(ctx,a,b,open){
  const pa=P(a[0],a[1]),pb=P(b[0],b[1]);
  if(!open){ // construction hoarding
    fillP(ctx,[pa,pb,[pb[0],pb[1]-11],[pa[0],pa[1]-11]],'#e8e0cc','rgba(90,70,40,.5)');
    ctx.strokeStyle='rgba(216,140,40,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pa[0],pa[1]-8);ctx.lineTo(pb[0],pb[1]-8);ctx.stroke();return;}
  ctx.strokeStyle='#221d1a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(pa[0],pa[1]-3);ctx.lineTo(pb[0],pb[1]-3);ctx.moveTo(pa[0],pa[1]-10);ctx.lineTo(pb[0],pb[1]-10);ctx.stroke();
  ctx.lineWidth=.9;ctx.beginPath();for(let k=1;k<5;k++){const x=pa[0]+(pb[0]-pa[0])*k/5,y=pa[1]+(pb[1]-pa[1])*k/5;ctx.moveTo(x,y);ctx.lineTo(x,y-11);}ctx.stroke();
  for(const p of [pa]){ctx.fillStyle='#221d1a';ctx.fillRect(p[0]-1.4,p[1]-13,2.8,13);ell(ctx,p[0],p[1]-14,1.9,1.9,GOLD);}
}
function fenceObjs(objs,inView){
  const open=premOpen(), R=PROW, segs=[];
  const gateGap=u=>{if(!open) return false;for(const id in PGATES) if(Math.abs(u-PGATES[id])<.95) return true;return false;};
  // long sides (along u): east side faces Phase 2 and has the forklift gates
  for(let u=R.u0;u<R.u1-1e-6;u+=.75){const u2=Math.min(R.u1,u+.75);
    segs.push([uvIJ(u,R.v0),uvIJ(u2,R.v0)]);
    if(!gateGap((u+u2)/2)) segs.push([uvIJ(u,R.v1),uvIJ(u2,R.v1)]);}
  // short ends (along v): the south end opens onto the dock through the arch
  for(let v=R.v0;v<R.v1-1e-6;v+=1.5){const v2=Math.min(R.v1,v+1.5);segs.push([uvIJ(R.u0,v),uvIJ(R.u0,v2)]);
    if(open&&v2>PARCH[0]+.01&&v<PARCH[1]-.01) continue; segs.push([uvIJ(R.u1,v),uvIJ(R.u1,v2)]);}
  for(const [a,b] of segs){const m=P((a[0]+b[0])/2,(a[1]+b[1])/2);if(!inView(m[0],m[1],40)) continue;
    objs.push({k:(a[0]+b[0])/2+(a[1]+b[1])/2+.02,f:()=>fenceSeg(ctx0(),a,b,open)});}
  if(!open) return;
  const pillar=(u,v,h,lamp)=>{const [i,j]=uvIJ(u,v);const p0=P(i,j);if(!inView(p0[0],p0[1],60)) return;
    objs.push({k:u+.03,f:()=>{const c=ctx0();box(c,i-.14,j-.14,i+.14,j+.14,0,h,SLATE,{});const p=P(i,j,h);ell(c,p[0],p[1]-3,3.2,3.2,GOLD_L);
      if(lamp){c.fillStyle='rgba(255,230,150,.25)';c.beginPath();c.arc(p[0],p[1]-3,7,0,TAU);c.fill();}}});};
  // forklift gates: two short pillars + a gold "II → III" plate on each
  for(const id in PGATES){const u=PGATES[id];pillar(u-.95,R.v1,16,false);pillar(u+.95,R.v1,16,false);
    const [i,j]=uvIJ(u+.95,R.v1);const pp=P(i,j);if(inView(pp[0],pp[1],60)) objs.push({k:u+.96,f:()=>{const c=ctx0();const a=PUV(u-.95,R.v1,16),b=PUV(u+.95,R.v1,16);
      c.fillStyle='#1a1410';c.fillRect(a[0]-9,a[1]-2,18,b[1]-a[1]+4);c.strokeStyle=GOLD;c.lineWidth=1;c.strokeRect(a[0]-9,a[1]-2,18,b[1]-a[1]+4);
      c.save();c.translate(a[0],(a[1]+b[1])/2);c.fillStyle=GOLD_L;c.font='900 6px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('II',0,-6);c.fillText('▼',0,0);c.fillText('III',0,6);c.restore();}});}
  // south arch towards the premium dock
  pillar(R.u1,PARCH[0],24,true);pillar(R.u1,PARCH[1],24,true);
  {const pa=PUV(R.u1,PARCH[0],24);if(inView(pa[0],pa[1],120)) objs.push({k:R.u1+.06,f:()=>{const c=ctx0();const a=PUV(R.u1,PARCH[0],24),b=PUV(R.u1,PARCH[1],24);
    fillP(c,[[a[0],a[1]],[b[0],b[1]],[b[0],b[1]-10],[a[0],a[1]-10]],'#1a1410',GOLD);c.fillStyle=GOLD_L;c.font='900 7px system-ui';c.textAlign='center';c.textBaseline='middle';
    c.fillText('TIMBER CO. RESERVE',(a[0]+b[0])/2,a[1]-5);}});}
}
let _ctx7=null; function ctx0(){return _ctx7;}
/* ---------- stockpiles (stock areas) ---------- */
function palletStack(ctx,i0,j0,sz,res,frac,lvl,full,isInput){
  // v2.11: fancy rack + real goods; frac is already a stockStep (0..4) when called from stockObj
  const step=typeof frac==='number'&&frac<=4&&Number.isInteger(frac)?frac:stockStep(frac);
  palletStackFancy(ctx,i0,j0,sz,res,step,lvl,full);
}
function stockGeom(L){
  if(L.prem){const B=lotBox(L),sz=.42;return {inp:[B.i1+.1,L.cj-.47,sz],out:[B.i1+.1,L.cj+.05,sz]};}
  if(L.side==='L') return {inp:[L.ci-1.6,L.cj+2.22,.95],out:[L.ci-.5,L.cj+2.22,.95]};
  return {inp:[L.ci+2.22,L.cj-1.6,.95],out:[L.ci+2.22,L.cj-.5,.95]};
}
function stockVals(id){
  const b=BMAP[id],st=S.buildings[id],bs=bstat[id],ok=st.on&&bs.f>.01; const out=Object.keys(b.out)[0], inp=Object.keys(b.inp)[0];
  const caps=scene._caps||{}; const cap=caps[out]||Infinity; const stock=cap<Infinity?S.res[out]/cap:0;
  // v2.11: no per-frame wobble — fill is quantised into stockStep so liveSprites stay cached
  const of=bs.full?1:Math.min(1,stock+(ok?.2:0));
  const inf=!st.on?.25:bs.lim===inp?Math.max(.05,bs.f*.5):Math.min(1,.45+.4*bs.f);
  return {out,inp,of,inf,full:!!(bs.full&&st.on),lvl:stoLvl(id)};
}
function L_HASH(id){let h=0;for(const c of id) h=h*31+c.charCodeAt(0);return (h%100)/10;}
function stockObj(ctx,L){
  const st=S.buildings[L.id]; if(!st.lvl) return null;
  const G=stockGeom(L); const m=P(G.out[0],G.out[1]); const [sx,sy]=w2s(m[0],m[1]); if(sx<-80||sx>scene.w+80||sy<-80||sy>scene.h+120) return null;
  return {k:G.inp[0]+G.inp[1]+G.inp[2],f:()=>{
    const v=stockVals(L.id); const is=stockStep(v.inf), os=stockStep(v.of);
    const sz=G.inp[2];
    // one live sprite covering both racks; rebuild only when either step / lvl / season / FULL changes
    const i0=Math.min(G.inp[0],G.out[0])-.1, j0=Math.min(G.inp[1],G.out[1])-.1;
    const i1=Math.max(G.inp[0],G.out[0])+sz+.1, j1=Math.max(G.inp[1],G.out[1])+sz+.1;
    const box=[Math.floor((i0-j1)*32-24),Math.floor((i0+j0)*16-55),Math.ceil((i1-j0)*32+24),Math.ceil((i1+j1)*16+18)];
    const sig=v.inp+'|'+v.out+'|'+is+'|'+os+'|'+v.lvl+'|'+SEAS+'|'+(v.full?1:0);
    liveSprite(ctx,'sto:'+L.id,box,sig,.1,g=>{
      palletStackFancy(g,G.inp[0],G.inp[1],sz,v.inp,is,v.lvl,false);
      palletStackFancy(g,G.out[0],G.out[1],sz,v.out,os,v.lvl,v.full);
    });
    const fl=scene.stoFlash&&scene.stoFlash.id===L.id?scene.stoFlash:null; if(fl){const p=P(G.out[0]+.5,G.out[1]+.5,30);ctx.globalAlpha=Math.max(0,1-fl.t/1.4);pill(ctx,p[0],p[1]-fl.t*20,'📦 Lv '+v.lvl,{bg:'#2f6fb0',fs:10});ctx.globalAlpha=1;}
  }};
}
/* ---------- draw everything premium ---------- */
function premDraw(ctx,objs,inView){
  _ctx7=ctx; scene._caps=stockCaps();
  if(scene.stoFlash){scene.stoFlash.t+=scene.dtF;if(scene.stoFlash.t>1.4) scene.stoFlash=null;}
  const vis=[PROW.u0,(PROW.u0+PROW.u1)/2,PROW.u1+4].some(u=>{const q=PUV(u,PROW.vl);return inView(q[0],q[1],300);});
  // client van + figure (always: it parks at the premium gate even before the area opens)
  const cl=scene.client; if(cl&&cl.veh.i!==undefined){const v=cl.veh;const [x,y]=P(v.i,v.j);if(inView(x,y,80)) objs.push({k:v.i+v.j,f:()=>limo(ctx,v.i,v.j,v.yaw||0,{bounce:vehBounce(v),brake:v.brake})});
    if(cl.fig>0){const fi=CLIENT_FIG[0],fj=CLIENT_FIG[1];const [hx,hy]=P(fi,fj);objs.push({k:fi+fj+.02,f:()=>{ctx.globalAlpha=cl.fig;human(ctx,hx,hy,{look:cl.look,fx:-1,pose:S.orders.offer?'point':'clip',ph:cl.ph*3});ctx.globalAlpha=1;}});}}
  for(const tk of scene.premTrucks||[]){if(tk.i===undefined) continue;const [x,y]=P(tk.i,tk.j);if(!inView(x,y,110)) continue;
    objs.push({k:tk.i+tk.j,f:()=>{const st=boxTruck(ctx,tk.i,tk.j,tk.yaw,{col:'#1c1c22',box:'#2a2a31',stripe:GOLD,load:tk.load,doors:tk.doors,brake:tk.brake,bounce:vehBounce(tk),logo:'TIMBER CO. RESERVE'});exhaust(st,tk);}});}
  if(!vis) return;
  fenceObjs(objs,inView);
  const open=premOpen();
  if(!open){ // locked plot: survey stakes + site board
    objs.push({k:PREM.ci+PREM.cj,f:()=>{const b=P(PREM.ci,PREM.cj,0);ctx.fillStyle='#5a3a22';ctx.fillRect(b[0]-14,b[1]-26,2.4,26);ctx.fillRect(b[0]+12,b[1]-26,2.4,26);
      ctx.fillStyle='#1a1410';rr(ctx,b[0]-20,b[1]-44,40,22,3);ctx.fill();ctx.strokeStyle=GOLD;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=GOLD_L;ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PREMIUM',b[0],b[1]-37);ctx.fillText('COMING SOON',b[0],b[1]-28);
      for(const [a,bq] of PREM.corners.map(([i,j])=>[i+(i<PREM.ci?.6:-.6),j+(j<PREM.cj?.6:-.6)])){const s=P(a,bq);ctx.fillStyle='#d86a2a';ctx.fillRect(s[0]-1,s[1]-8,2,8);}}});
    return;
  }
  for(const b of PREM_BLD){const L=LOTS[b.id],st=S.buildings[b.id];const [x,y]=P(L.ci,L.cj);if(!inView(x,y,100)) continue;
    if(!st.lvl){const can=S.coins+1e-9>=bulkCost(b.cost,b.scale,0,1);objs.push({k:L.ci+L.cj,f:()=>premConstruction(ctx,L,can)});}
    else {objs.push({k:L.ci+L.cj,f:()=>drawLot(ctx,L)});const so=stockObj(ctx,L);if(so) objs.push(so);}}
  objs.push({k:PDOCK.ci+PDOCK.cj,f:()=>drawPremDock(ctx)});
  // gold lamp posts + topiary planters
  for(const [i,j] of [23.75,30.65,37.55,44.6,PROW.u1-.6].map(u=>uvIJ(u,PROW.v1-.38))){objs.push({k:i+j,f:()=>{const [x,y]=P(i,j);ell(ctx,x+2,y+1,4,2,'rgba(0,0,0,.2)');ctx.fillStyle='#1a1410';ctx.fillRect(x-1,y-26,2,26);ell(ctx,x,y-27,3,3,'#fff3c0');ctx.strokeStyle=GOLD;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-27,3.4,0,TAU);ctx.stroke();}});}
  for(const [i,j] of [23.75,30.65,37.55,44.6].map(u=>uvIJ(u,PROW.v0+.45))){objs.push({k:i+j,f:()=>{box(ctx,i-.16,j-.16,i+.16,j+.16,0,5,'#2a2420',{hl:false});const [x,y]=P(i,j,5);ell(ctx,x,y-5,6,6,'#3f7a32');ell(ctx,x-1.5,y-7,3,2.4,'#5aa843');}});}
  for(const f of scene.plifts||[]){if(f.i===undefined) continue;const [x,y]=P(f.i,f.j);if(!inView(x,y,40)) continue;objs.push({k:f.i+f.j,f:()=>forklift(ctx,f.i,f.j,f.yaw||0,f.p<1?f.res:null,0)});}
  for(const w of scene.pworkers||[]){if(!w.route) continue;const q=w.p<1?w.p:2-w.p;const [i,j,di,dj]=pathAt(w.route,q);const sg=w.p<1?1:-1;const [x,y]=P(i,j);if(!inView(x,y,30)) continue;
    objs.push({k:i+j,f:()=>human(ctx,x,y,{look:w.look,fx:(di-dj)*sg>=0?1:-1,back:(di+dj)*sg<0,pose:w.p<1?'box':'walk',ph:w.ph,cargo:w.p<1?Object.keys(BMAP[w.tgt].inp)[0]:null})});}
}
function premOverlays(ctx,showTags){
  const t=scene.t, c=P(PREM.ci,PREM.cj,40); const [sx,sy]=w2s(c[0],c[1]);
  if(sx>-120&&sx<scene.w+120&&sy>-60&&sy<scene.h+80){
    if(!premOpen()){if(premVisible()){const cost=premCost(),can=S.coins+1e-9>=cost,bob=can?Math.sin(t*4)*3:0;
        pill(ctx,sx,sy-14+bob,'🏛️ Premium Area',{bg:can?'#d8a930':'#2a1d14',fg:can?'#2a1d14':'#f5d36a',fs:12,stroke:'#f5d36a'});
        pill(ctx,sx,sy+8+bob,fmt(cost),{icon:'coin',bg:'#fff6e0',fg:can?'#3b7f27':'#8a6a40',fs:11,stroke:can?'#4fa633':'#d9b98a'});}
      else pill(ctx,sx,sy,'🔒 Premium Area · earn '+fmt(PREM_UNLOCK*.25),{fs:10,bg:'rgba(43,27,14,.6)'});}
    else if(showTags){const p=PUV(PROW.u0-.5,PROW.vl,22);const [px,py]=w2s(p[0],p[1]);pill(ctx,px,py,'🏛️ Phase 3 · Premium · Lv '+S.premium.lvl,{bg:'#2a1d14',fg:'#f5d36a',fs:10.5,stroke:GOLD,padX:12,padY:7});}
  }
  // client bubble: who is at the gate and what they want
  const cl=scene.client, O=S.orders; if(cl&&cl.fig>.5&&(O.offer||O.active)){const o=O.offer||O.active;const p=P(CLIENT_FIG[0],CLIENT_FIG[1],44);const [bx,by]=w2s(p[0],p[1]);
    if(bx>-60&&bx<scene.w+60&&by>-40&&by<scene.h+40){const bob=Math.sin(t*3)*2;const txt=O.offer?`${o.e} New order!`:`${o.e} ${fmt(o.got)}/${fmt(o.amt)}`;
      const r=pill(ctx,bx,by+bob,txt,{bg:O.offer?'#f5c84c':'#fff6e0',fg:'#4a2e06',fs:O.offer?12:10.5,stroke:O.offer?'#fff6c8':'#e8b13a',padX:12,padY:8});
      ctx.fillStyle=O.offer?'#f5c84c':'#fff6e0';ctx.beginPath();ctx.moveTo(bx-5,by+bob+r[3]/2-1);ctx.lineTo(bx+5,by+bob+r[3]/2-1);ctx.lineTo(bx,by+bob+r[3]/2+6);ctx.closePath();ctx.fill();
      if(O.offer){const k=(t*1.3)%1;ctx.strokeStyle=`rgba(245,200,76,${1-k})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx,by+bob,r[2]/2+k*18,0,TAU);ctx.stroke();}}}
  // delivery celebration over the client
  const ev=scene.orderEv; if(ev&&ev.kind==='done'&&ev.o){const p=P(CLIENT_PARK[0],CLIENT_PARK[1],40);const [ex,ey]=w2s(p[0],p[1]);const k=ev.t/4;ctx.globalAlpha=Math.max(0,1-k);
    pill(ctx,ex,ey-k*50,'🎉 Delivered! +'+fmt(ev.o.reward),{bg:'#4fa633',fg:'#fff',fs:14,stroke:'#c9f59e',padX:16,padY:10});
    for(let q=0;q<14;q++){const a=q/14*TAU+ev.t*2,r=20+ev.t*40;ctx.fillStyle=['#f5c84c','#e85a4a','#4fa633','#3e86c8'][q%4];ctx.fillRect(ex+Math.cos(a)*r,ey-20+Math.sin(a)*r*.6+ev.t*20,4,6);}ctx.globalAlpha=1;}
}
function focusPrem(){const c=scene.cam;const [tb]=barH();const bot=sheetTop()-16;const p=P(PREM.ci,PREM.cj,20);const z=Math.max(c.z,Math.min(c.maxZ,c.fitZ*1.25));c.tz=z;c.tx=p[0];c.ty=p[1]+((bot-tb)/2+tb-scene.h/2)/-z;}
function premPoof(){const p=P(PREM.ci,PREM.cj,10);for(let k=0;k<48;k++) emitP(p[0]+(Math.random()-.5)*240,p[1]+(Math.random()-.5)*560,'poof');}
function stoPoof(id){scene.stoFlash={id,t:0};const L=LOTS[id];if(!L) return;const G=stockGeom(L);const p=P(G.out[0]+.4,G.out[1]+.4,10);for(let k=0;k<12;k++) emitP(p[0]+(Math.random()-.5)*30,p[1]+(Math.random()-.5)*14,'poof');}
