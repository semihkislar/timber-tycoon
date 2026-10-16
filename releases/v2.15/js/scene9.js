'use strict';

/* ===================== v2.4 MANAGERS, FIRE STATION & FIRES (scene) ===================== */
const STATION={id:'station',ci:10.05,cj:1.55,face:'J'};
const STB={i0:8.75,i1:11.35,j0:.25,j1:2.85,bs:2.6};
const FT_HOME=[9.62,1.15];
const FIRE_LOOK=[0,1].map(k=>Object.assign(mkLook(611+k,{role:'worker'}),{shirt:'#2c2c32',vest:'#d8a832',hat:'hard',hatc:'#d8261c',pants:'#2c2c32',boots:'#141414'}));
scene.mgrs={}; scene.mgrFx=[]; scene.stDoor=0; scene.ftruck=null; scene.smoulder={};
function lpt(u,v){return [(u+v)/2,(u-v)/2];}
function ftRoute(bid){
  const L=LOTS[bid],d=doorOf(L),u=d[0]+d[1],vt=L.face==='I'?-1.2:1.2;
  const pts=[FT_HOME,[9.62,4.4],[9.66,7.5]];
  if(u>22){pts.push(lpt(20.4,.7));pts.push(lpt(u-2.6,vt));}
  pts.push(lpt(u,vt)); return {pts,u,vt};
}
function crewSpots(T){const r=T.route;return [lpt(r.u-.55,r.vt*2.05),lpt(r.u+.75,r.vt*2.05)];}
function fireSceneUpdate(dt){
  // dispatch the truck so it arrives as the station's crew starts spraying (logic eta)
  for(const bid in S.fires){const f=S.fires[bid];
    if(f.eta>=0&&!scene.ftruck&&f.t>=f.eta-7.2){const R=ftRoute(bid);const pa=crPath(R.pts,8);const vmax=Math.max(2.6,pa.tot/5.0);
      scene.ftruck={bid,route:R,crew:0,legs:[{pa,vmax,hold:(v)=>!!S.fires[bid]||v.crewT.crew>.02},{pa:crPath(R.pts.slice().reverse(),8),vmax:2.3,rev:true}],li:0,s:0,v:0};
      scene.ftruck.crewT=scene.ftruck;}}
  const T=scene.ftruck;
  if(T){stepVeh(T,dt);const parked=T.li===0&&T.legs[0].pa.tot-T.s<.05&&T.v<.05;
    T.crew=parked&&S.fires[T.bid]?Math.min(1,T.crew+dt/1.3):Math.max(0,T.crew-dt/1.1);
    if(T.done){scene.ftruck=null;}}
  const home=!T||(T.li===0&&T.s<2.2)||(T.li===1&&T.legs[1].pa.tot-T.s<2.4);
  scene.stDoor=Math.max(0,Math.min(1,scene.stDoor+((T&&home)?dt*1.6:-dt*1.2)));
  for(const k in scene.smoulder){scene.smoulder[k]-=dt;if(scene.smoulder[k]<=0) delete scene.smoulder[k];}
  if(scene.fireOut){scene.fireOut.t+=dt;if(scene.fireOut.t>2.6) scene.fireOut=null;}
  if(scene.fireTap){scene.fireTap.t+=dt;if(scene.fireTap.t>.4) scene.fireTap=null;}
  // managers idle routines + lucky-batch pops
  for(const m of MANAGERS){const l=mgrLvl(m.bid);if(!l) continue;let s=scene.mgrs[m.bid];
    if(!s) s=scene.mgrs[m.bid]={ph:Math.random()*9,pose:'clip',tm:2+Math.random()*4,off:0,to:0,fx:0,dbl:6+Math.random()*8};
    s.ph+=dt*(s.pose==='walk'?7:1); s.tm-=dt;
    if(s.pose==='walk'){const d=s.to-s.off;s.off+=Math.sign(d)*Math.min(Math.abs(d),dt*.45);if(Math.abs(d)<.01){s.pose='clip';s.tm=3+Math.random()*4;}}
    else if(s.tm<=0){const r=Math.random();if(r<.35){s.pose='walk';s.to=(Math.random()-.5)*.8;}else{s.pose=r<.6?'look':r<.8?'point':'clip';s.tm=2.5+Math.random()*3.5;}}
    if(m.skill==='double'&&S.buildings[m.bid].on&&bstat[m.bid]&&bstat[m.bid].f>.2){s.dbl-=dt*mgrSkill(m.bid,'double')*3;if(s.dbl<=0){s.dbl=4+Math.random()*6;scene.mgrFx.push({bid:m.bid,t:0});}}}
  scene.mgrFx=scene.mgrFx.filter(x=>(x.t+=dt)<1.8);
  if(scene.mgrPoof){const L=LOTS[scene.mgrPoof];if(L){const sp=mgrSpot(scene.mgrPoof),p=P(sp[0],sp[1],10);for(let k=0;k<18;k++) emitP(p[0]+(Math.random()-.5)*30,p[1]+(Math.random()-.5)*14,'poof');}scene.mgrPoof=null;}
}
function mgrSpot(bid){const L=LOTS[bid],B=lotBox(L),s=scene.mgrs[bid],o=s?s.off:0;return L.face==='I'?[B.i1+.52,B.j0+B.bs*.08+o]:[B.i0+B.bs*.08+o,B.j1+.52];}
/* ---------- fire truck ---------- */
function fireTruckRaw(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0),red='#d42a1e';
  vshadow(ctx,V0,-1.6,1.6,.47);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],false);
  const parts=[];
  parts.push({d:vdepth(V,-.7,0),f:()=>{
    vbox(ctx,V,-1.62,1.45,-.3,.3,4,8,'#34343a',{});
    vbox(ctx,V,-1.62,.24,-.46,.46,8.5,29,red,{deco:(f,b)=>{
      if(f==='R'||f==='L'){for(const [a0,a1] of [[-1.52,-1.0],[-.94,-.42],[-.36,.14]]){vquad(ctx,V,f,b,a0,a1,12.5,26.5,'#c9ced4','rgba(30,30,30,.5)');
          ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=.5;ctx.beginPath();for(let z=14.5;z<26;z+=2.2){const q=vface(V,f,b,a0,a1,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();}
        vquad(ctx,V,f,b,-1.62,.24,9.4,11.2,'#f4f4ee');vquad(ctx,V,f,b,-1.62,.24,27,28,'#f5c84c');}
      if(f==='B'){vquad(ctx,V,'B',b,-.4,.4,11,27,'#c9ced4','rgba(30,30,30,.5)');for(const cc of [-.38,.38]) vquad(ctx,V,'B',b,cc-.05,cc+.05,6,8.4,o.brake?'#ff3a2a':'#a8221a');}
    },decoTop:(b,z)=>{ // roof ladder
      ctx.strokeStyle='#e6e9ec';ctx.lineWidth=1.1;ctx.beginPath();for(const cc of [-.22,.22]){const p0=VL(V,-1.72,cc,z+2.4),p1=VL(V,.6,cc,z+2.4);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}
      for(let a=-1.62;a<.6;a+=.22){const p0=VL(V,a,-.22,z+2.4),p1=VL(V,a,.22,z+2.4);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
      ctx.strokeStyle='#8a9098';ctx.lineWidth=1;ctx.beginPath();for(const a of [-1.4,0]) for(const cc of [-.22,.22]){const p0=VL(V,a,cc,z),p1=VL(V,a,cc,z+2.4);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();
      const hr=VL(V,-.8,0,z+.4);ell(ctx,hr[0],hr[1],4.2,2.4,'#b8902a');ell(ctx,hr[0],hr[1]-1,3,1.6,'#d8b040');}});
  }});
  const stack=truckCab(ctx,V,red,parts,o);
  drawParts(ctx,parts);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],true);
  // flashing light bar on the cab roof
  vbox(ctx,V,.56,.78,-.32,.32,36,38,'#2a2a2e',{edge:false});
  const on=o.siren?Math.floor(scene.t*7)%2:-1;
  const pr=VL(V,.67,-.18,38.6+V.dz),pb=VL(V,.67,.18,38.6+V.dz);
  ell(ctx,pr[0],pr[1],2,1.3,on===0?'#ff5a4a':'#a81e14');ell(ctx,pb[0],pb[1],2,1.3,on===1?'#5aa8ff':'#1e4a9a');
  if(o.siren){ctx.save();ctx.globalCompositeOperation='lighter';glow(ctx,on===0?pr[0]:pb[0],on===0?pr[1]:pb[1],26,26,on===0?'red':'90,160,255',.75);ctx.restore();}
  return stack;
}
/* ---------- fire station ---------- */
function drawStation(ctx){
  const l=stationLvl(),{i0,i1,j0,j1}=STB,t=scene.t;
  if(!l){if(!stationVisible()) return;
    const pts=[P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)];ctx.setLineDash([5,4]);fillP(ctx,pts,'rgba(255,240,210,.35)','rgba(200,60,40,.85)',1.6);ctx.setLineDash([]);
    for(const [ci,cj] of [[i0+.1,j1+.15],[i1+.15,j1-.1],[i1+.1,j0+.1]]){const [x,y]=P(ci,cj);ctx.fillStyle='#f07020';ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x-3.4,y);ctx.lineTo(x+3.4,y);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x-2,y-5,4,1.4);}
    const [sx,sy]=P(10,2.4,0);ctx.fillStyle='#6a4a2a';ctx.fillRect(sx-1,sy-16,2,16);ctx.fillStyle='#d42a1e';rr(ctx,sx-16,sy-26,32,12,2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 6.5px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FIRE STATION',sx,sy-20);
    STATION.hit=[P(i0,j0,20),P(i1,j0,20),P(i1,j0,0),P(i1,j1,0),P(i0,j1,0),P(i0,j1,20)];STATION.top=P(STATION.ci,STATION.cj,26);return;}
  const B=STB, H=22;
  // apron with hatched lines in front of the bays
  fillP(ctx,[P(i0,j1),P(i1,j1),P(i1,j1+1.15),P(i0,j1+1.15)],SEAS===3?'#e2e6e9':'#d6d0c4');
  ctx.strokeStyle='rgba(210,50,30,.55)';ctx.lineWidth=2;ctx.beginPath();for(let a=i0+.15;a<i1;a+=.32){const p=P(a,j1+.15),q=P(a+.2,j1+1);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
  // hose tower at the back corner (Lv2+)
  if(l>=2){box(ctx,i0+.12,j0+.12,i0+.95,j0+.95,0,44+l*2,'#a63a26',{});win(ctx,'I',i0+.95,j0+.35,.35,30,6,false);win(ctx,'J',j0+.95,i0+.35,.35,30,6,false);
    box(ctx,i0+.05,j0+.05,i0+1.02,j0+1.02,44+l*2,47+l*2,'#5a2418',{});
    const [fx,fy]=P(i0+.5,j0+.5,47+l*2);flag(ctx,fx,fy,'#d42a1e');}
  box(ctx,i0,j0,i1,j1,0,H,'#b8442e',{});
  bricks(ctx,B,'J',0,H);bricks(ctx,B,'I',0,H);
  // white trim band + sign
  fillP(ctx,fq('J',j1,i0,i1,H-4.5,H-.5),'#f2eee6');fillP(ctx,fq('I',i1,j0,j1,H-4.5,H-.5),'#f2eee6');
  ctx.save();fxf(ctx,'J',j1,(i0+i1)/2,H-2.5);ctx.fillStyle='#b8261c';ctx.font='900 5.6px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l>=5?'★ FIRE STATION ★':'FIRE STATION',0,0);ctx.restore();
  // bay doors (second bay from Lv3); the first one rolls up when the truck goes out
  const bays=l>=3?[[i0+.22,i0+1.18],[i0+1.42,i0+2.38]]:[[i0+.22,i0+1.18]];
  bays.forEach(([a0,a1],k)=>{fillP(ctx,fq('J',j1,a0-.06,a1+.06,0,15.2),'#f2eee6');fillP(ctx,fq('J',j1,a0,a1,0,14.4),'#1c1714');
    const open=k===0?scene.stDoor:0, z0=14.4*open;
    if(z0<14.3){fillP(ctx,fq('J',j1,a0,a1,z0,14.4),'#e9e3d6','rgba(60,40,30,.4)',.6);ctx.strokeStyle='rgba(90,70,50,.3)';ctx.lineWidth=.6;ctx.beginPath();for(let z=z0+1.6;z<14.4;z+=1.6){const q=fq('J',j1,a0,a1,z,z);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();
      if(open<.6){for(const z of [9.5]){const q=fq('J',j1,a0+.12,a1-.12,z,z+2.2);fillP(ctx,q,'#8fc3dc');}}}});
  if(l<3) winOn(ctx,B,'J',.62,.22,7,6,false);
  winOn(ctx,B,'I',.18,.22,7,6,false);winOn(ctx,B,'I',.55,.22,7,6,false);
  doorOn(ctx,B,'I',.82,.95,11,'#8a2a1e');
  // roof: parapet + siren mast (Lv4+) + AC box
  box(ctx,i0+1.6,j0+.5,i0+2.2,j0+1.1,H,H+3.5,'#9aa0a6',{});
  if(l>=4){const [mx,my]=P(i1-.4,j0+.4,H);ctx.fillStyle='#5a5f66';ctx.fillRect(mx-.8,my-16,1.6,16);const on=Math.floor(t*3)%2;ell(ctx,mx,my-17,2.6,2.6,on?'#ff4a3a':'#a81e14');}
  // lamp over the bays
  const [lx,ly]=P(i0+.7,j1,16.8);ell(ctx,lx,ly,1.6,1.2,'#fff3c0');
  STATION.hit=boxHit(i0-.1,j0-.1,i1+.15,j1+.15,l>=2?50:26);STATION.top=P(STATION.ci,STATION.cj,l>=2?52:28);
}
/* ---------- flames ---------- */
function flame(ctx,x,y,s,ph){
  for(const [c,sc] of [['rgba(205,48,18,.92)',1],['rgba(255,128,26,.95)',.72],['rgba(255,226,110,.96)',.42]]){
    const w=8*s*sc,h=(22+7*Math.sin(ph*7.3)+4*Math.sin(ph*11.1))*s*sc,sw=Math.sin(ph*5.3)*3.2*s;
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-w,y);ctx.bezierCurveTo(x-w*1.05,y-h*.5,x+sw-w*.35,y-h*.72,x+sw,y-h);ctx.bezierCurveTo(x+sw+w*.35,y-h*.72,x+w*1.05,y-h*.5,x+w,y);ctx.quadraticCurveTo(x,y+w*.35,x-w,y);ctx.fill();}
}
function fireSpots(L){const B=lotBox(L),H=(L.H||30)*.82;return [[B.i0+B.bs*.3,B.j0+B.bs*.32,H],[B.i0+B.bs*.72,B.j0+B.bs*.45,H*.95],[B.i0+B.bs*.42,B.j0+B.bs*.78,H*.9]];}
function drawFire(ctx,bid){
  const L=LOTS[bid],f=S.fires[bid],t=scene.t; if(!f) return;
  const k=Math.min(1,f.t/1.5)*(.35+.65*Math.max(0,f.hp)/f.max);
  fireSpots(L).forEach(([i,j,z],n)=>{const [x,y]=P(i,j,z);
    ctx.save();ctx.globalCompositeOperation='lighter';glow(ctx,x,y-8,46*k+10,34*k+8,'fire',.55);ctx.restore();
    flame(ctx,x,y,(.9+n*.15)*k+.25,t*1.1+n*2.1);flame(ctx,x+7*k,y+2,.5*k+.15,t*1.3+n*3.7);flame(ctx,x-6*k,y+1.5,.45*k+.12,t*1.5+n*1.3);
    if(Math.random()<scene.dtF*4*k) emitSmoke(x+(Math.random()-.5)*6,y-20*k,'dark');
    if(Math.random()<scene.dtF*7*k&&scene.particles.length<300) scene.particles.push({x:x+(Math.random()-.5)*10,y:y-8,vx:(Math.random()-.5)*16+(scene.wxv?-scene.wxv.wind*20:0),vy:-26-Math.random()*26,g:-6,life:1.1,max:1.1,size:1,col:'#ffb040',rot:0,vr:5,type:'ember'});});
}
function sprayArc(ctx,from,to,t,a){
  const mx=(from[0]+to[0])/2,my=Math.min(from[1],to[1])-34;
  ctx.lineCap='round';ctx.strokeStyle=`rgba(150,205,255,${.85*a})`;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(from[0],from[1]);ctx.quadraticCurveTo(mx,my,to[0],to[1]);ctx.stroke();
  ctx.setLineDash([3,5]);ctx.lineDashOffset=-t*60;ctx.strokeStyle=`rgba(255,255,255,${.8*a})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(from[0],from[1]);ctx.quadraticCurveTo(mx,my,to[0],to[1]);ctx.stroke();ctx.setLineDash([]);ctx.lineCap='butt';
  for(let k=0;k<5;k++){const ph=(t*2.3+k*.2)%1;ctx.fillStyle=`rgba(200,230,255,${(1-ph)*.8*a})`;ctx.beginPath();ctx.arc(to[0]+(hash2(k,9)-.5)*20*ph,to[1]-6*ph+12*ph*ph,1.4,0,TAU);ctx.fill();}
  if(Math.random()<scene.dtF*5) emitSmoke(to[0]+(Math.random()-.5)*10,to[1]-4,'white');
}

/* ===================== v2.6 CONTRACT OFFICE + COURIER VAN ===================== */
// Small notice-board office between the furniture row and the shipping dock.
const OFFICE={id:'office',ci:24.2,cj:24.5,face:'J'};
const OFFB={i0:23.35,i1:25.05,j0:23.7,j1:25.3,bs:1.7};
scene.couriers=[];
function spawnCourierVan(o){
  // park by the office, load briefly, then drive onto the highway and off-screen north
  const park=[25.1,24.9];
  const legs=[
    {pa:crPath([[30.35,22.5],[28.4,23.4],[26.4,24.4],[park[0],park[1]]],8),vmax:2.8,hold:(v,dt)=>{v.load=Math.min(1,(v.load||0)+dt*.55);v.doors=Math.min(1,(v.doors||0)+dt*1.4);return v.load<1||v.wait<1.6;}},
    {pa:crPath([[park[0],park[1]],[26.8,24.2],[28.6,22.8],[30.35,21.2],[30.35,12],[30.35,-26]],10),vmax:3.6}
  ];
  scene.couriers.push({kind:'courier',legs,li:0,s:0,v:0,load:0,doors:0,col:'#2f6fb0',box:'#f4f1e8',stripe:'#e8a020',item:o&&o.item,logo:'DAILY CO.'});
}
function courierUpdate(dt){
  for(const tk of scene.couriers){if(tk.li===0){/* loading at office */} if(tk.li===1) tk.doors=Math.max(0,(tk.doors||0)-dt*1.8); stepVeh(tk,dt);}
  scene.couriers=scene.couriers.filter(t=>!t.done);
}
function drawOffice(ctx){
  const {i0,i1,j0,j1}=OFFB, H=18, t=scene.t;
  // apron / wooden deck
  fillP(ctx,[P(i0-.15,j1),P(i1+.15,j1),P(i1+.15,j1+.55),P(i0-.15,j1+.55)],SEAS===3?'#e4e8ea':'#c4b08a');
  // posts
  for(const [a,b] of [[i0+.12,j1+.08],[i1-.12,j1+.08],[i0+.12,j0+.12],[i1-.12,j0+.12]]) box(ctx,a-.07,b-.07,a+.07,b+.07,0,H+2,'#6a4a2a',{edge:false});
  // cabin body
  box(ctx,i0,j0,i1,j1,0,H,'#c99357',{left:'#b07a42',right:'#8a5a32',top:SEAS===3?SNOW:'#6a4228'});
  // door on +j
  const dm=(i0+i1)/2; fillP(ctx,fq('J',j1,dm-.18,dm+.18,0,11),'#5a3a1a'); fillP(ctx,fq('J',j1,dm-.15,dm+.15,1,10),'#3a2414');
  {const hp=P(dm+.12,j1+.02,5.5); ctx.fillStyle='#f5c84c'; ctx.fillRect(hp[0]-.5,hp[1]-1.5,1,3);}
  // windows on the side walls
  win(ctx,'I',i1,j0+(j1-j0)*.28,.38,9,6,true);
  win(ctx,'I',i0,j0+(j1-j0)*.28,.38,9,6,true);
  // porch roof
  const pr=H+1; fillP(ctx,[P(i0-.2,j1,pr),P(i1+.2,j1,pr),P(i1+.2,j1+.7,pr-3),P(i0-.2,j1+.7,pr-3)],SEAS===3?SNOW:'#5a3a22');
  // cork notice board on the apron with fluttering papers
  const bx=i0+.35, by=j1+.28;
  box(ctx,bx,by,bx+.95,by+.08,0,9,'#8a5a32',{});
  fillP(ctx,fq('J',by+.08,bx+.05,bx+.9,1,8.5),'#c4a06a');
  for(let k=0;k<5;k++){
    const a=bx+.12+k*.16, flutter=Math.sin(t*3.2+k*1.7)*.04;
    const z0=2.2+(k%3)*.9, z1=z0+2.2;
    fillP(ctx,[P(a,by+.09+flutter,z0),P(a+.12,by+.09+flutter,z0),P(a+.12,by+.09,z1),P(a,by+.09,z1)],['#fff6e0','#ffe8c0','#e8f2ff','#f0ffe0','#ffe0e8'][k]);
    // pin
    const p=P(a+.06,by+.1,z1+.2); ell(ctx,p[0],p[1],1.1,1.1,'#d42a1e');
  }
  // sign
  const sp=P((i0+i1)/2,j0+.05,H+6);
  ctx.fillStyle='#1f3a5a'; rr(ctx,sp[0]-18,sp[1]-10,36,14,2); ctx.fill();
  ctx.strokeStyle='#6ab0e0'; ctx.lineWidth=1.4; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='900 6.5px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('CONTRACTS',sp[0],sp[1]-3); ctx.fillText('DAILY BOARD',sp[0],sp[1]+4);
  // night lamp over the porch
  const lp=P(dm,j1+.35,H+2); ctx.fillStyle='#4a4f56'; ctx.fillRect(lp[0]-1,lp[1]-6,2,6);
  ctx.fillStyle='#fff3c0'; ctx.beginPath(); ctx.arc(lp[0],lp[1]-7,2.6,0,TAU); ctx.fill();
  if(scene.dn&&scene.dn.lights>.03) scene.lq.push([P(dm-.3,j1+.2,8),P(dm+.3,j1+.2,8),P(dm+.3,j1+.2,14),P(dm-.3,j1+.2,14)]);
  OFFICE.hit=boxHit(i0-.15,j0-.15,i1+.2,j1+.7,H+8);
  OFFICE.top=P(OFFICE.ci,OFFICE.cj,H+10);
}
function officeOverlay(ctx){
  if(!OFFICE.top||!dailyOpen()) return;
  const [sx,sy]=w2s(OFFICE.top[0],OFFICE.top[1]);
  if(sx<-80||sx>scene.w+80||sy<-40||sy>scene.h+40) return;
  const n=dailyAwaiting()?S.daily.offers.length:0, act=dailyActiveN();
  const bob=n?Math.sin(scene.t*3.5)*2.5:0;
  if(n){const r=pill(ctx,sx,sy-8+bob,`📅 ${n} daily contract${n>1?'s':''}`,{bg:'#3e86c8',fg:'#fff',fs:11,stroke:'#cfe6ff',padX:11,padY:7});
    const k=(scene.t*1.3)%1;ctx.strokeStyle=`rgba(62,134,200,${1-k})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(sx,sy-8+bob,r[2]/2+k*16,0,TAU);ctx.stroke();}
  else if(act) pill(ctx,sx,sy-6,`📅 ${act} active`,{bg:'#fff6e0',fg:'#4a2e06',fs:10,stroke:'#e8b13a'});
}

/* ---------- scene objects (depth sorted) ---------- */
function staffDraw(ctx,objs,inView){
  {const [x,y]=P(STATION.ci,STATION.cj);if(inView(x,y,120)) objs.push({k:STATION.ci+STATION.cj,f:()=>drawStation(ctx)});}
  {const [x,y]=P(OFFICE.ci,OFFICE.cj);if(inView(x,y,100)) objs.push({k:OFFICE.ci+OFFICE.cj,f:()=>drawOffice(ctx)});}
  for(const tk of scene.couriers||[]){if(tk.i===undefined) continue;const [x,y]=P(tk.i,tk.j);if(!inView(x,y,110)) continue;
    objs.push({k:tk.i+tk.j,f:()=>{const st=boxTruck(ctx,tk.i,tk.j,tk.yaw,{col:tk.col,box:tk.box,stripe:tk.stripe,load:tk.load||0,doors:tk.doors||0,brake:tk.brake,bounce:vehBounce(tk),logo:tk.logo||'DAILY CO.'});exhaust(st,tk);}});}
  // fire truck (clipped by the station wall while it's still in the bay)
  const T=scene.ftruck;
  if(T&&T.i!==undefined){const [x,y]=P(T.i,T.j);if(inView(x,y,110)){
    objs.push({k:T.i+T.j,f:()=>{const inBay=T.j<STB.j1+1.7;if(inBay){ctx.save();ctx.beginPath();ctx.rect(-1e5,-1e5,2e5,2e5);pth(ctx,boxHit(STB.i0,STB.j0,STB.i1,STB.j1,22).slice().reverse());const dq=fq('J',STB.j1,STB.i0+.22,STB.i0+1.18,0,14.4);pth(ctx,dq);ctx.clip('evenodd');}
      const st=fireTruck(ctx,T.i,T.j,T.yaw||Math.PI/2,{bounce:vehBounce(T),brake:T.brake,siren:!!S.fires[T.bid]||T.li===0});if(inBay) ctx.restore();exhaust(st,T);}});}
    // crew: hop out, unroll the hose and spray
    if(T.crew>0){const sp=crewSpots(T),door=[T.i,T.j];sp.forEach((s,k)=>{const q=Math.min(1,T.crew*1.15-k*.15);if(q<=0) return;const i=lerp(door[0],s[0],q),j=lerp(door[1],s[1],q);const [hx,hy]=P(i,j);
      const L=LOTS[T.bid],tgt=P(L.ci,L.cj,0),fx=tgt[0]>=hx?1:-1;
      objs.push({k:i+j+.02,f:()=>human(ctx,hx,hy,{look:FIRE_LOOK[k],fx,pose:q<1?'walk':S.fires[T.bid]?'spray':'stand',ph:scene.t*7+k})});});}}
  for(const bid in S.fires){const L=LOTS[bid];const [x,y]=P(L.ci,L.cj);if(inView(x,y,120)) objs.push({k:L.ci+L.cj+.05,f:()=>drawFire(ctx,bid)});}
  for(const bid in scene.smoulder){const L=LOTS[bid];if(Math.random()<scene.dtF*3){const s=fireSpots(L)[Math.floor(Math.random()*3)];const p=P(s[0],s[1],s[2]);emitSmoke(p[0],p[1],'grey');}}
  // managers
  for(const m of MANAGERS){const l=mgrLvl(m.bid);if(!l||!S.buildings[m.bid].lvl) continue;const L=LOTS[m.bid];if(L.prem&&!S.premium.lvl) continue;
    const sp=mgrSpot(m.bid),s=scene.mgrs[m.bid];if(!s) continue;const [x,y]=P(sp[0],sp[1]);if(!inView(x,y,40)) continue;
    const walkDir=s.pose==='walk'?Math.sign(s.to-s.off):0;const fx=L.face==='I'?(walkDir? (walkDir>0?-1:1):1):(walkDir?(walkDir>0?1:-1):-1);
    objs.push({k:sp[0]+sp[1]+.03,f:()=>{human(ctx,x,y,{look:mgrHumanLook(m),fx,pose:onFire(m.bid)?'point':s.pose,ph:s.ph,back:false});
      const R=RARITY[m.r],by=y-38+Math.sin(scene.t*3+s.ph)*1.5;ctx.fillStyle=R.c;ctx.strokeStyle='#fff';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,by-4.5);ctx.lineTo(x+3.4,by);ctx.lineTo(x,by+4.5);ctx.lineTo(x-3.4,by);ctx.closePath();ctx.fill();ctx.stroke();
      if(m.r==='L'&&Math.sin(scene.t*2.2+s.ph)>.6){ctx.fillStyle='rgba(255,240,170,.9)';ctx.fillRect(x+4,by-6,1.4,1.4);ctx.fillRect(x-5,by+2,1.2,1.2);}}});}
}
function staffPost(ctx){ // after the depth-sorted pass: water jets on top
  const T=scene.ftruck; if(!T||T.crew<.9||!S.fires[T.bid]) return;
  const sp=crewSpots(T),L=LOTS[T.bid],spots=fireSpots(L);
  sp.forEach((s,k)=>{const [hx,hy]=P(s[0],s[1]);const tgtS=spots[k%3],tg=P(tgtS[0],tgtS[1],tgtS[2]);const fx=tg[0]>=hx?1:-1;
    sprayArc(ctx,[hx+fx*11.3,hy-20.5],[tg[0],tg[1]-6],scene.t+k*.37,1);});
}
function staffLights(out){
  for(const bid in S.fires){const L=LOTS[bid];for(const [i,j,z] of fireSpots(L)){const [x,y]=P(i,j,z);out.push({x,y:y-6,rx:90,ry:60,c:'fire',a:1});}const [x,y]=P(L.ci,L.cj,0);out.push({x,y,rx:110,ry:60,c:'fire',a:.8});}
  if(stationLvl()){const [x,y]=P(STB.i0+.7,STB.j1+.5,0);out.push({x,y,rx:34,ry:17,c:'warm',a:.7});}
  const T=scene.ftruck;if(T&&T.i!==undefined){vehLights(out,T,1.62,-1.64);if(S.fires[T.bid]||T.li===0){const on=Math.floor(scene.t*7)%2,[x,y]=P(T.i,T.j,0);out.push({x,y,rx:70,ry:40,c:on?'90,160,255':'red',a:.6});}}
}
function staffOverlays(ctx){
  officeOverlay(ctx);
  const t=scene.t;
  for(const bid in S.fires){const L=LOTS[bid],f=S.fires[bid];if(!L.top) continue;const [sx,sy]=w2s(L.top[0],L.top[1]-26);if(sx<-60||sx>scene.w+60||sy<-40||sy>scene.h+40) continue;
    const bob=Math.sin(t*6)*2;const r=pill(ctx,sx,sy+bob,`🔥 TAP! ${Math.ceil(f.hp)}`,{bg:'#d8261c',fg:'#fff',fs:12,stroke:'#ffd0a0',padX:11,padY:7});
    const w=56;ctx.fillStyle='rgba(30,10,5,.7)';rr(ctx,sx-w/2,sy+bob+r[3]/2+3,w,5,2.5);ctx.fill();ctx.fillStyle='#ffb040';rr(ctx,sx-w/2+1,sy+bob+r[3]/2+4,(w-2)*Math.max(0,f.hp)/f.max,3,1.5);ctx.fill();
    const tl=FIRE_BURN-f.t;if(f.eta>=0&&f.t<f.eta&&!(scene.ftruck&&scene.ftruck.bid===bid&&scene.ftruck.crew)) pill(ctx,sx,sy+bob+r[3]/2+17,`🚒 ${Math.ceil(f.eta-f.t)}s`,{fs:10,bg:'rgba(43,27,14,.75)'});
    else if(f.eta<0) pill(ctx,sx,sy+bob+r[3]/2+17,`burns out in ${Math.ceil(tl)}s`,{fs:9.5,bg:'rgba(43,27,14,.6)'});
    const k=(t*1.4)%1;ctx.strokeStyle=`rgba(255,90,40,${1-k})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy+bob+30,18+k*26,0,TAU);ctx.stroke();}
  if(scene.fireOut){const L=LOTS[scene.fireOut.bid];if(L.top){const [sx,sy]=w2s(L.top[0],L.top[1]-20);const k=scene.fireOut.t/2.6;ctx.globalAlpha=Math.max(0,1-k);
    pill(ctx,sx,sy-k*40,(scene.fireOut.by==='tap'?'🧑‍🚒 Fire out! +':'🚒 Saved! +')+fmt(scene.fireOut.r),{bg:'#2f86d8',fg:'#fff',fs:13,stroke:'#cfe6ff',padX:13,padY:8});ctx.globalAlpha=1;}}
  if(!stationLvl()&&stationVisible()&&STATION.top){const [sx,sy]=w2s(STATION.top[0],STATION.top[1]);if(sx>-80&&sx<scene.w+80&&sy>-40&&sy<scene.h+40){const c=stationCost(),can=S.coins+1e-9>=c,bob=can?Math.sin(t*4)*2.5:0;
    pill(ctx,sx,sy-12+bob,'🚒 Fire Station',{bg:can?'#d8261c':'rgba(43,27,14,.75)',fg:'#fff',fs:11,stroke:can?'#ffd0a0':null});pill(ctx,sx,sy+8+bob,fmt(c),{icon:'coin',bg:'#fff6e0',fg:can?'#3b7f27':'#8a6a40',fs:10.5,stroke:can?'#4fa633':'#d9b98a'});}}
  for(const fx of scene.mgrFx){const L=LOTS[fx.bid];if(!L.top) continue;const [sx,sy]=w2s(L.top[0],L.top[1]);const k=fx.t/1.8;ctx.globalAlpha=Math.max(0,1-k*k);
    pill(ctx,sx+22,sy-6-k*30,'🎲 ×2',{bg:'#9a4ad8',fg:'#fff',fs:11,stroke:'#e8d0ff'});ctx.globalAlpha=1;}
}
function stationPoof(){const p=P(STATION.ci,STATION.cj,10);for(let k=0;k<26;k++) emitP(p[0]+(Math.random()-.5)*80,p[1]+(Math.random()-.5)*30,'poof');}
function fireTapAt(sx,sy){
  for(const bid in S.fires){const L=LOTS[bid];let hit=L.hit&&pip(L.hit,...s2w(sx,sy));
    if(!hit&&L.top){const [tx,ty]=w2s(L.top[0],L.top[1]);hit=Math.hypot(sx-tx,sy-ty)<Math.max(46,60*scene.cam.z);}
    if(hit){tapFire(bid);const [wx,wy]=s2w(sx,sy);for(let k=0;k<10;k++) scene.particles.push({x:wx,y:wy,vx:(Math.random()-.5)*90,vy:-40-Math.random()*60,g:220,life:.5,max:.5,size:1.6,col:'#9fd4ff',rot:0,vr:0,type:'water'});
      emitSmoke(wx,wy-6,'white');sfx('chop');render();return true;}}
  return false;
}
