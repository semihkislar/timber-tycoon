
/* ===================== v2.2 SCENE: premium area, stockpiles, premium trucks, client van ===================== */
const GOLD='#d8a930', GOLD_L='#f5d36a', WALNUT='#4a2c1c', SLATE='#3a3430';
/* ---------- ground (inside cached chunks) ---------- */
function drawPremGround(ctx,x0,y0,x1,y1){
  const A=P(PREM.i0,PREM.j1),B=P(PREM.i1,PREM.j0),T=P(PREM.i0,PREM.j0),Bt=P(PREM.i1,PREM.j1);
  if(B[0]<x0-20||A[0]>x1+20||T[1]>y1+20||Bt[1]<y0-20) return;
  const open=S.premium&&S.premium.lvl>0;
  // raised plinth lip
  fillP(ctx,[P(PREM.i1,PREM.j0),P(PREM.i1,PREM.j1),P(PREM.i1,PREM.j1,-5),P(PREM.i1,PREM.j0,-5)],open?'#2a2420':'#9a8e78');
  fillP(ctx,[P(PREM.i0,PREM.j1),P(PREM.i1,PREM.j1),P(PREM.i1,PREM.j1,-5),P(PREM.i0,PREM.j1,-5)],open?'#3a322c':'#b0a48c');
  for(let i=PREM.i0;i<PREM.i1;i++) for(let j=PREM.j0;j<PREM.j1;j++){
    const h=hash2(i+300,j+300); let c;
    if(open){c=((i+j)&1)?'#5e554c':'#665c52'; if(i===24||i===25&&j>6) c=((j)&1)?'#a08c70':'#a8947a';}
    else c=h>.5?'#bdb19a':'#b5a891';
    fillP(ctx,[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],c);
    if(!open&&h>.62){const [x,y]=P(i+h*.8,j+.4);ell(ctx,x,y,2,1.2,'rgba(90,80,60,.35)');ell(ctx,x+6,y+3,1.3,.8,'rgba(90,80,60,.3)');}
  }
  ctx.strokeStyle=open?'rgba(216,169,48,.22)':'rgba(110,95,70,.18)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=PREM.i0;i<=PREM.i1;i++){const a=P(i,PREM.j0),b=P(i,PREM.j1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
  for(let j=PREM.j0;j<=PREM.j1;j++){const a=P(PREM.i0,j),b=P(PREM.i1,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  if(open){ // dark marble pads with gold inlay under each workshop + dock
    for(const b of PREM_BLD){const L=LOTS[b.id],e=(L.bs0+.42)/2+.18;const pts=[P(L.ci-e,L.cj-e),P(L.ci+e,L.cj-e),P(L.ci+e,L.cj+e),P(L.ci-e,L.cj+e)];
      fillP(ctx,pts.map(p=>[p[0],p[1]+3]),'#1e1a17');fillP(ctx,pts,'#2f2a26');ctx.strokeStyle=GOLD;ctx.lineWidth=1.4;pth(ctx,pts);ctx.stroke();}
    // gold plaza inlay line down the forklift aisle
    ctx.strokeStyle='rgba(245,211,106,.55)';ctx.lineWidth=1.5;ctx.beginPath();let a=P(24.75,.4),b=P(24.75,8.8);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  }
  // verge apron between premium dock and highway
  fillP(ctx,[P(29,6.2),P(30,6.2),P(30,8.9),P(29,8.9)],'#5c5f66');
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2.4;ctx.beginPath();for(let j=6.5;j<8.8;j+=.5){const a=P(29.1,j),b=P(29.8,j);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
}
/* ---------- sync / update ---------- */
function premOpen(){return S.premium&&S.premium.lvl>0;}
function premSync(){
  const open=premOpen();
  if(scene._premOpen!==open){scene._premOpen=open;scene.chunks.clear();if(!open){for(const b of PREM_BLD){LOTS[b.id].hit=null;LOTS[b.id].top=null;}scene.premTrucks=[];scene.pfork=null;scene.pworkers=[];}}
  if(!open) return;
  const built=PREM_BLD.filter(b=>S.buildings[b.id].lvl>0);
  const sig=built.map(b=>b.id).join(',');
  if(scene._pfsig!==sig){scene._pfsig=sig;
    scene.pfork=built.length?{k:0,p:0,ph:0,route:null}:null;
    scene.pworkers=built.length?[0,1].map(k=>({k,p:k*.5,ph:k*2,look:mkLook(8100+k*7,{role:'worker',vest:'#2a2a30',female:k===1}),route:null,tgt:built[(k+1)%built.length].id})):[];}
  if(!scene.premTrucks) scene.premTrucks=[];
  if(built.length&&!scene.premTrucks.length&&!(scene._ptDelay>0)) scene.premTrucks.push(mkPremTruck(scene._ptFirst?false:true)),scene._ptFirst=true;
}
const PDOCKB=[30.62,7.55], PD_R=.83;
function premTruckLegs(){
  const A=[31.45,PDOCKB[1]+PD_R];
  return [
    {pa:densePath([[31.45,-26],[A[0],A[1]]]),vmax:3.6,lane:true},
    {pa:densePath(arcPts(t=>{const th=t*Math.PI/2;return [A[0]-(A[0]-PDOCKB[0])*(1-Math.cos(th)),A[1]-PD_R*Math.sin(th)];},12)),rev:true,vmax:1.0},
    {pa:densePath([[PDOCKB[0],PDOCKB[1]],[PDOCKB[0]+.001,PDOCKB[1]]]),vmax:.5,hold:(v,dt)=>{v.doors=Math.min(1,(v.doors||0)+dt*1.6);return v.load<1||v.doors<1;}},
    {pa:crPath([[PDOCKB[0],PDOCKB[1]],[31.15,7.42],[31.32,6.6],[30.85,5.6],[30.35,4.4],[30.35,2.5],[30.35,-26]],8),vmax:3.6}
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
function premRoute(from,id){const L=LOTS[id],B=lotBox(L);const tgt=[B.i1+.62,L.cj-.25];return mkPath([from,[24.75,from[1]>4?Math.min(8.4,from[1]):from[1]],[24.75,tgt[1]],tgt]);}
function premUpdate(dt){
  const ev=scene.orderEv; if(ev){ev.t+=dt; if(ev.t>4) scene.orderEv=null;}
  clientUpdate(dt);
  if(!premOpen()) return;
  const built=PREM_BLD.filter(b=>S.buildings[b.id].lvl>0); if(!built.length) return;
  const running=built.some(b=>S.buildings[b.id].on&&bstat[b.id].f>.01);
  scene.pconv=(scene.pconv||0)+dt*(running?.55:0);
  // forklift shuttles pallets from the receiving table to each workshop
  const f=scene.pfork; if(f){if(!f.route){const b=built[f.k%built.length];f.bid=b.id;f.route=premRoute(PRECV,b.id);f.p=0;}
    f.p+=dt*(running?.16:.06)*(4/Math.max(4,f.route.tot)); if(f.p>=2){f.p=0;f.k++;f.route=null;} else {const q=f.p<1?f.p:2-f.p;const [i,j,di,dj]=pathAt(f.route,q);const sg=f.p<1?1:-1;f.i=i;f.j=j;f.yaw=Math.atan2(dj*sg,di*sg)+(f.p<1?0:Math.PI);f.ph+=dt*6;}}
  for(const w of scene.pworkers||[]){if(!w.route){const b=BMAP[w.tgt]||built[0];w.route=premRoute([PRECV[0]+.45,PRECV[1]-.35],b.id);}
    w.p+=dt*.11*(4/Math.max(4,w.route.tot)); if(w.p>=2){w.p=0;w.k++;w.tgt=built[w.k%built.length].id;w.route=null;} w.ph+=dt*7;}
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
const CLIENT_PARK=[29.6,3.0];
function clientLegsIn(){return [{pa:crPath([[31.45,-26],[31.45,-1.4],[31.0,.4],[30.0,1.7],[CLIENT_PARK[0],2.6],[CLIENT_PARK[0],CLIENT_PARK[1]]],8),vmax:3.2,lane:true}];}
function clientLegsOut(){return [{pa:crPath([[CLIENT_PARK[0],CLIENT_PARK[1]],[29.62,4.25],[30.55,4.75],[31.3,4.25],[31.15,3.0],[30.45,1.9],[30.35,.5],[30.35,-26]],8),vmax:3.0}];}
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
function limo(ctx,i,j,yaw,o){
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
    if(kind==='atelier'){const ci=B.i0+.45,cj=B.j0+.45;box(ctx,ci-.16,cj-.16,ci+.16,cj+.16,h,h+16,'#5a2a1e',{});const cp=P(ci,cj,h+16);ell(ctx,cp[0],cp[1],4,2,run?'#ff9a3a':'#3a2a22');if(run) chimneySmoke(cp[0],cp[1]-2,'grey',1.1);}
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
/* fence: dark iron railings with gold finials; gate arch on the highway side */
const PGATE=[2.45,3.85];
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
  const open=premOpen(), segs=[]; const st=.75;
  for(let i=PREM.i0;i<PREM.i1-1e-6;i+=st){segs.push([[i,PREM.j0],[Math.min(PREM.i1,i+st),PREM.j0]]);segs.push([[i,PREM.j1],[Math.min(PREM.i1,i+st),PREM.j1]]);}
  for(let j=PREM.j0;j<PREM.j1-1e-6;j+=st){const j2=Math.min(PREM.j1,j+st);segs.push([[PREM.i0,j],[PREM.i0,j2]]);
    if(open&&j2>PGATE[0]+.01&&j<PGATE[1]-.01) continue; segs.push([[PREM.i1,j],[PREM.i1,j2]]);}
  for(const [a,b] of segs){const m=P((a[0]+b[0])/2,(a[1]+b[1])/2);if(!inView(m[0],m[1],40)) continue;
    // conveyor gap on the front fence
    if(open&&a[1]===PREM.j1&&b[1]===PREM.j1&&a[0]<PCONV[2][0]+.3&&b[0]>PCONV[2][0]-.3){continue;}
    objs.push({k:(a[0]+b[0])/2+(a[1]+b[1])/2+.02,f:()=>fenceSeg(ctx0(),a,b,open)});}
  if(open){ // gate pillars + arch
    for(const j of PGATE) objs.push({k:PREM.i1+j+.03,f:()=>{const c=ctx0();box(c,PREM.i1-.14,j-.14,PREM.i1+.14,j+.14,0,24,SLATE,{});const p=P(PREM.i1,j,24);ell(c,p[0],p[1]-3,3.2,3.2,GOLD_L);c.fillStyle='rgba(255,230,150,.25)';c.beginPath();c.arc(p[0],p[1]-3,7,0,TAU);c.fill();}});
    objs.push({k:PREM.i1+PGATE[1]+.04,f:()=>{const c=ctx0();const a=P(PREM.i1,PGATE[0],24),b=P(PREM.i1,PGATE[1],24);
      fillP(c,[[a[0],a[1]],[b[0],b[1]],[b[0],b[1]-9],[a[0],a[1]-9]],'#1a1410',GOLD);c.save();fxf(c,'I',PREM.i1,PGATE[0],19.5);c.fillStyle=GOLD_L;c.font='900 6px system-ui';c.textAlign='center';c.textBaseline='middle';
      c.fillText('TIMBER CO. RESERVE',(PGATE[1]-PGATE[0])*16,0);c.restore();}});
  }
}
let _ctx7=null; function ctx0(){return _ctx7;}
/* overhead conveyor carrying main-factory goods into the premium area */
function convPt(s){ // s in tiles along PCONV
  let d=s; for(let k=1;k<PCONV.length;k++){const a=PCONV[k-1],b=PCONV[k],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=L||k===PCONV.length-1){const t=Math.min(1,d/L);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}d-=L;}return PCONV[0];}
const PCONV_LEN=Math.hypot(PCONV[1][0]-PCONV[0][0],PCONV[1][1]-PCONV[0][1])+Math.hypot(PCONV[2][0]-PCONV[1][0],PCONV[2][1]-PCONV[1][1]);
const PCZ=19;
function convObjs(objs,inView){
  const built=PREM_BLD.filter(b=>S.buildings[b.id].lvl>0); const inputs=[];for(const b of built) for(const k in b.inp) if(!inputs.includes(k)) inputs.push(k);
  const run=scene.pconv||0, w=.17;
  // lift tower at the lane side
  objs.push({k:PCONV[0][0]+PCONV[0][1],f:()=>{const c=ctx0(),[i,j]=PCONV[0];box(c,i-.28,j-.28,i+.28,j+.28,0,PCZ+5,'#5a6470',{});box(c,i-.2,j-.29,i+.2,j-.27,3,PCZ,'#2a2f36',{top:false,edge:false});
    const q=(run*1.2)%1,p=P(i,j+.3,3+q*(PCZ-3));if(inputs.length) cargoIcon(c,p[0],p[1],inputs[Math.floor(run)%inputs.length],.75);}});
  for(let s=0;s<PCONV_LEN-.01;s+=1){const s1=Math.min(PCONV_LEN,s+1),a=convPt(s),b=convPt(s1);const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];const mp=P(m[0],m[1]);if(!inView(mp[0],mp[1],60)) continue;
    objs.push({k:m[0]+m[1]+.05,f:()=>{const c=ctx0();const ax=Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1])?'i':'j';
      // trestle leg
      const lg=P(a[0],a[1]);c.fillStyle='#4a4f56';c.fillRect(lg[0]-1.2,lg[1]-PCZ,2.4,PCZ);c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(lg[0]+3,lg[1]+1,5,2,0,0,TAU);c.fill();
      if(ax==='i') box(c,Math.min(a[0],b[0]),a[1]-w,Math.max(a[0],b[0]),a[1]+w,PCZ-3,PCZ,'#7a828c',{top:'#3f454c'}); else box(c,a[0]-w,Math.min(a[1],b[1]),a[0]+w,Math.max(a[1],b[1]),PCZ-3,PCZ,'#7a828c',{top:'#3f454c'});
      // side rails (gold accents once premium is open)
      const r0=P(a[0],a[1],PCZ+2),r1=P(b[0],b[1],PCZ+2);c.strokeStyle=GOLD;c.lineWidth=1;c.beginPath();c.moveTo(r0[0],r0[1]);c.lineTo(r1[0],r1[1]);c.stroke();
      if(inputs.length){for(let n=0;n<2;n++){const ss=((run*1.0+n*.5)%1)+s;if(ss<s||ss>=s1) continue;const p=convPt(ss),q=P(p[0],p[1],PCZ);cargoIcon(c,q[0],q[1]-1,inputs[(Math.floor(ss*2)+n)%inputs.length],.8);}}}});}
  // ramp down to the receiving table
  objs.push({k:PRECV[0]+PRECV[1]+.1,f:()=>{const c=ctx0();const a=P(PCONV[2][0],PCONV[2][1],PCZ),b=P(PRECV[0],PRECV[1]+.3,7);c.strokeStyle='#5a6470';c.lineWidth=5;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();
    c.strokeStyle=GOLD;c.lineWidth=1;c.beginPath();c.moveTo(a[0],a[1]-2);c.lineTo(b[0],b[1]-2);c.stroke();
    box(c,PRECV[0]-.35,PRECV[1]-.3,PRECV[0]+.35,PRECV[1]+.3,0,7,'#2f2a26',{});
    const n=Math.min(3,1+Math.floor(run)%3);for(let k=0;k<n;k++){const q=P(PRECV[0]-.15+k*.15,PRECV[1],7+k*0);if(inputs.length) cargoIcon(c,q[0],q[1],inputs[k%inputs.length],.8);}}});
}
/* ---------- stockpiles (stock areas) ---------- */
function palletStack(ctx,i0,j0,sz,res,frac,lvl,full,isInput){
  box(ctx,i0,j0,i0+sz,j0+sz,0,2.5,'#b88a52',{hl:false,lw:.7});
  const g=sz<.6?2:3, cell=sz/g, layers=1+Math.min(3,Math.floor((lvl+1)/2)), hz=sz<.6?5:6.5;
  const rack=lvl>=2, zr=2.5+layers*hz+(rack?layers*1.2:0);
  if(rack){for(const [a,b] of [[i0,j0],[i0+sz,j0],[i0,j0+sz]]){const p=P(a,b,0);ctx.fillStyle='#2f6fb0';ctx.fillRect(p[0]-.9,p[1]-zr,1.8,zr);}}
  const n=Math.max(0,Math.min(g*g*layers,Math.round(frac*g*g*layers)));
  const col=RCOL[res]||'#c98a4a';
  if(res==='logs'){const k=Math.max(1,Math.round(frac*6));logPile(ctx,i0+sz*.5,j0+sz*.18,'i',Math.min(6,k),sz*.95);}
  else for(let q=0;q<n;q++){const L=Math.floor(q/(g*g)),r=q%(g*g),a=r%g,b=Math.floor(r/g);
    const z0=2.5+L*(hz+(rack?1.2:0)), x=i0+a*cell+.03, y=j0+b*cell+.03;
    box(ctx,x,y,x+cell-.06,y+cell-.06,z0,z0+hz-.6,col,{hl:false,lw:.6,top:shade(col,1.25)});
    if(L===0&&rack){const p0=P(i0,j0+sz,z0+hz),p1=P(i0+sz,j0+sz,z0+hz);}}
  if(rack){for(let L=1;L<=layers;L++){const z=2.5+L*(hz+1.2)-.6;ctx.strokeStyle='#e8742a';ctx.lineWidth=1.3;ctx.beginPath();const a=P(i0,j0+sz,z),b=P(i0+sz,j0+sz,z),c=P(i0+sz,j0,z);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();}
    const p=P(i0+sz,j0+sz,0);ctx.fillStyle='#2f6fb0';ctx.fillRect(p[0]-.9,p[1]-zr,1.8,zr);}
  if(lvl>=4){const z=zr+3;fillP(ctx,[P(i0-.05,j0-.05,z),P(i0+sz+.05,j0-.05,z),P(i0+sz+.05,j0+sz+.05,z),P(i0-.05,j0+sz+.05,z)],lvl>=6?'#3a3430':'#5a6470',lvl>=6?GOLD:'rgba(0,0,0,.3)');}
  if(full){const p=P(i0+sz*.5,j0+sz,zr+(lvl>=4?10:6));ctx.fillStyle='#c4463d';rr(ctx,p[0]-11,p[1]-6,22,10,3);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FULL',p[0],p[1]-1);}
}
function stockGeom(L){
  if(L.prem){const B=lotBox(L),sz=.42;return {inp:[B.i1+.1,L.cj-.47,sz],out:[B.i1+.1,L.cj+.05,sz]};}
  if(L.side==='L') return {inp:[L.ci-1.6,L.cj+2.22,.95],out:[L.ci-.5,L.cj+2.22,.95]};
  return {inp:[L.ci+2.22,L.cj-1.6,.95],out:[L.ci+2.22,L.cj-.5,.95]};
}
function stockVals(id){
  const b=BMAP[id],st=S.buildings[id],bs=bstat[id],ok=st.on&&bs.f>.01; const out=Object.keys(b.out)[0], inp=Object.keys(b.inp)[0];
  const caps=scene._caps||{}; const cap=caps[out]||Infinity; const stock=cap<Infinity?S.res[out]/cap:0;
  const wob=.5+.5*Math.sin(scene.t*.5+L_HASH(id));
  const of=bs.full?1:Math.min(1,stock+(ok?.14+.12*wob:0));
  const inf=!st.on?.25:bs.lim===inp?Math.max(.05,bs.f*.5):Math.min(1,.42+.38*bs.f+.1*wob);
  return {out,inp,of,inf,full:!!(bs.full&&st.on),lvl:stoLvl(id)};
}
function L_HASH(id){let h=0;for(const c of id) h=h*31+c.charCodeAt(0);return (h%100)/10;}
function stockObj(ctx,L){
  const st=S.buildings[L.id]; if(!st.lvl) return null;
  const G=stockGeom(L); const m=P(G.out[0],G.out[1]); const [sx,sy]=w2s(m[0],m[1]); if(sx<-80||sx>scene.w+80||sy<-80||sy>scene.h+120) return null;
  return {k:G.inp[0]+G.inp[1]+G.inp[2],f:()=>{const v=stockVals(L.id);palletStack(ctx,G.inp[0],G.inp[1],G.inp[2],v.inp,v.inf,v.lvl,false,true);palletStack(ctx,G.out[0],G.out[1],G.out[2],v.out,v.of,v.lvl,v.full,false);
    const fl=scene.stoFlash&&scene.stoFlash.id===L.id?scene.stoFlash:null; if(fl){const p=P(G.out[0]+.5,G.out[1]+.5,30);ctx.globalAlpha=Math.max(0,1-fl.t/1.4);pill(ctx,p[0],p[1]-fl.t*20,'📦 Lv '+v.lvl,{bg:'#2f6fb0',fs:10});ctx.globalAlpha=1;}}};
}
/* ---------- draw everything premium ---------- */
function premDraw(ctx,objs,inView){
  _ctx7=ctx; scene._caps=stockCaps();
  if(scene.stoFlash){scene.stoFlash.t+=scene.dtF;if(scene.stoFlash.t>1.4) scene.stoFlash=null;}
  const c=P((PREM.i0+PREM.i1)/2,(PREM.j0+PREM.j1)/2); const vis=inView(c[0],c[1],360);
  // client van + figure (always: it parks at the premium gate even before the area opens)
  const cl=scene.client; if(cl&&cl.veh.i!==undefined){const v=cl.veh;const [x,y]=P(v.i,v.j);if(inView(x,y,80)) objs.push({k:v.i+v.j,f:()=>limo(ctx,v.i,v.j,v.yaw||0,{bounce:vehBounce(v),brake:v.brake})});
    if(cl.fig>0){const fi=CLIENT_PARK[0]-.38,fj=CLIENT_PARK[1]+1.55;const [hx,hy]=P(fi,fj);objs.push({k:fi+fj+.02,f:()=>{ctx.globalAlpha=cl.fig;human(ctx,hx,hy,{look:cl.look,fx:-1,pose:S.orders.offer?'point':'clip',ph:cl.ph*3});ctx.globalAlpha=1;}});}}
  for(const tk of scene.premTrucks||[]){if(tk.i===undefined) continue;const [x,y]=P(tk.i,tk.j);if(!inView(x,y,110)) continue;
    objs.push({k:tk.i+tk.j,f:()=>{const st=boxTruck(ctx,tk.i,tk.j,tk.yaw,{col:'#1c1c22',box:'#2a2a31',stripe:GOLD,load:tk.load,doors:tk.doors,brake:tk.brake,bounce:vehBounce(tk),logo:'TIMBER CO. RESERVE'});exhaust(st,tk);}});}
  if(!vis) return;
  fenceObjs(objs,inView);
  const open=premOpen();
  if(!open){ // locked plot: survey stakes + site board
    objs.push({k:25+4.5,f:()=>{const p=P(25,4.5);const b=P(24.6,4.2,0);ctx.fillStyle='#5a3a22';ctx.fillRect(b[0]-14,b[1]-26,2.4,26);ctx.fillRect(b[0]+12,b[1]-26,2.4,26);
      ctx.fillStyle='#1a1410';rr(ctx,b[0]-20,b[1]-44,40,22,3);ctx.fill();ctx.strokeStyle=GOLD;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=GOLD_L;ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PREMIUM',b[0],b[1]-37);ctx.fillText('COMING SOON',b[0],b[1]-28);
      for(const [a,bq] of [[22,1],[28,1],[22,8],[28,8]]){const s=P(a,bq);ctx.fillStyle='#d86a2a';ctx.fillRect(s[0]-1,s[1]-8,2,8);}}});
    return;
  }
  for(const b of PREM_BLD){const L=LOTS[b.id],st=S.buildings[b.id];const [x,y]=P(L.ci,L.cj);if(!inView(x,y,100)) continue;
    if(!st.lvl){const can=S.coins+1e-9>=bulkCost(b.cost,b.scale,0,1);objs.push({k:L.ci+L.cj,f:()=>premConstruction(ctx,L,can)});}
    else {objs.push({k:L.ci+L.cj,f:()=>drawLot(ctx,L)});const so=stockObj(ctx,L);if(so) objs.push(so);}}
  objs.push({k:PDOCK.ci+PDOCK.cj,f:()=>drawPremDock(ctx)});
  convObjs(objs,inView);
  // gold lamp posts + topiary planters
  for(const [i,j] of [[24.75,.35],[24.75,8.7],[28.75,.3],[21.25,.3]]){objs.push({k:i+j,f:()=>{const [x,y]=P(i,j);ell(ctx,x+2,y+1,4,2,'rgba(0,0,0,.2)');ctx.fillStyle='#1a1410';ctx.fillRect(x-1,y-26,2,26);ell(ctx,x,y-27,3,3,'#fff3c0');ctx.strokeStyle=GOLD;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-27,3.4,0,TAU);ctx.stroke();}});}
  for(const [i,j] of [[28.6,1.9],[28.6,4.4],[24.3,8.75]]){objs.push({k:i+j,f:()=>{box(ctx,i-.16,j-.16,i+.16,j+.16,0,5,'#2a2420',{hl:false});const [x,y]=P(i,j,5);ell(ctx,x,y-5,6,6,'#3f7a32');ell(ctx,x-1.5,y-7,3,2.4,'#5aa843');}});}
  const f=scene.pfork; if(f&&f.i!==undefined){objs.push({k:f.i+f.j,f:()=>forklift(ctx,f.i,f.j,f.yaw||0,f.p<1?(BMAP[f.bid]?Object.keys(BMAP[f.bid].inp)[0]:null):null,Math.sin(f.ph*3)*.25)});}
  for(const w of scene.pworkers||[]){if(!w.route) continue;const q=w.p<1?w.p:2-w.p;const [i,j,di,dj]=pathAt(w.route,q);const sg=w.p<1?1:-1;const [x,y]=P(i,j);if(!inView(x,y,30)) continue;
    objs.push({k:i+j,f:()=>human(ctx,x,y,{look:w.look,fx:(di-dj)*sg>=0?1:-1,back:(di+dj)*sg<0,pose:w.p<1?'box':'walk',ph:w.ph,cargo:w.p<1?Object.keys(BMAP[w.tgt].inp)[0]:null})});}
}
function premOverlays(ctx,showTags){
  const t=scene.t, c=P(25,4.5,40); const [sx,sy]=w2s(c[0],c[1]);
  if(sx>-120&&sx<scene.w+120&&sy>-60&&sy<scene.h+80){
    if(!premOpen()){if(premVisible()){const cost=premCost(),can=S.coins+1e-9>=cost,bob=can?Math.sin(t*4)*3:0;
        pill(ctx,sx,sy-14+bob,'🏛️ Premium Area',{bg:can?'#d8a930':'#2a1d14',fg:can?'#2a1d14':'#f5d36a',fs:12,stroke:'#f5d36a'});
        pill(ctx,sx,sy+8+bob,fmt(cost),{icon:'coin',bg:'#fff6e0',fg:can?'#3b7f27':'#8a6a40',fs:11,stroke:can?'#4fa633':'#d9b98a'});}
      else pill(ctx,sx,sy,'🔒 Premium Area · earn '+fmt(PREM_UNLOCK*.25),{fs:10,bg:'rgba(43,27,14,.6)'});}
    else if(showTags){const p=P(PREM.i1-.5,PREM.j0+.5,30);const [px,py]=w2s(p[0],p[1]);pill(ctx,px,py,'🏛️ Premium · Lv '+S.premium.lvl,{bg:'#2a1d14',fg:'#f5d36a',fs:10.5,stroke:GOLD,padX:12,padY:7});}
  }
  // client bubble: who is at the gate and what they want
  const cl=scene.client, O=S.orders; if(cl&&cl.fig>.5&&(O.offer||O.active)){const o=O.offer||O.active;const p=P(CLIENT_PARK[0]-.38,CLIENT_PARK[1]+1.55,44);const [bx,by]=w2s(p[0],p[1]);
    if(bx>-60&&bx<scene.w+60&&by>-40&&by<scene.h+40){const bob=Math.sin(t*3)*2;const txt=O.offer?`${o.e} New order!`:`${o.e} ${fmt(o.got)}/${fmt(o.amt)}`;
      const r=pill(ctx,bx,by+bob,txt,{bg:O.offer?'#f5c84c':'#fff6e0',fg:'#4a2e06',fs:O.offer?12:10.5,stroke:O.offer?'#fff6c8':'#e8b13a',padX:12,padY:8});
      ctx.fillStyle=O.offer?'#f5c84c':'#fff6e0';ctx.beginPath();ctx.moveTo(bx-5,by+bob+r[3]/2-1);ctx.lineTo(bx+5,by+bob+r[3]/2-1);ctx.lineTo(bx,by+bob+r[3]/2+6);ctx.closePath();ctx.fill();
      if(O.offer){const k=(t*1.3)%1;ctx.strokeStyle=`rgba(245,200,76,${1-k})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx,by+bob,r[2]/2+k*18,0,TAU);ctx.stroke();}}}
  // delivery celebration over the client
  const ev=scene.orderEv; if(ev&&ev.kind==='done'&&ev.o){const p=P(CLIENT_PARK[0],CLIENT_PARK[1],40);const [ex,ey]=w2s(p[0],p[1]);const k=ev.t/4;ctx.globalAlpha=Math.max(0,1-k);
    pill(ctx,ex,ey-k*50,'🎉 Delivered! +'+fmt(ev.o.reward),{bg:'#4fa633',fg:'#fff',fs:14,stroke:'#c9f59e',padX:16,padY:10});
    for(let q=0;q<14;q++){const a=q/14*TAU+ev.t*2,r=20+ev.t*40;ctx.fillStyle=['#f5c84c','#e85a4a','#4fa633','#3e86c8'][q%4];ctx.fillRect(ex+Math.cos(a)*r,ey-20+Math.sin(a)*r*.6+ev.t*20,4,6);}ctx.globalAlpha=1;}
}
function focusPrem(){const c=scene.cam;const [tb]=barH();const bot=sheetTop()-16;const p=P(25,4.6,20);const z=Math.max(c.z,Math.min(c.maxZ,c.fitZ*1.25));c.tz=z;c.tx=p[0];c.ty=p[1]+((bot-tb)/2+tb-scene.h/2)/-z;}
function premPoof(){const p=P(25,4.5,10);for(let k=0;k<40;k++) emitP(p[0]+(Math.random()-.5)*200,p[1]+(Math.random()-.5)*80,'poof');}
function stoPoof(id){scene.stoFlash={id,t:0};const L=LOTS[id];if(!L) return;const G=stockGeom(L);const p=P(G.out[0]+.4,G.out[1]+.4,10);for(let k=0;k<12;k++) emitP(p[0]+(Math.random()-.5)*30,p[1]+(Math.random()-.5)*14,'poof');}
