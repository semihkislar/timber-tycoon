'use strict';
/* ===================== v2.13 FOREST MACHINES: harvester, forwarder, skidder (+ log truck crane) =====================
   Built from the same oriented-box kit as the trucks (VF/VL/vbox/vlog), so they are real iso volumes from every heading:
   articulated chassis, cab with glazing on all sides and a roof light bar, chunky lugged tyres with shaded rims,
   hydraulic cranes drawn as two-tone booms with rams, a load bunk whose logs show the current load.
   Every machine is cached per heading (64 steps) x pose/load bucket through vehSprite(), so a frame is one blit each. */
const FV_Y='#f0b52a', FV_YD='#c98f16', FV_G='#3f7d3a', FV_CH='#2c2c30', FV_GL='#9fd0e0';
function fvWheel(ctx,V,a,c,R,outer,rim){
  const cin=c-Math.sign(c||1)*.09;
  fillP(ctx,ellPts(V,a,cin,R,R,'s',16),'#141416');
  fillP(ctx,ellPts(V,a,c,R,R,'s',16),'#26262a','rgba(0,0,0,.6)',.6);
  if(!outer) return;
  // tread lugs around the visible tyre face
  const E=ellPts(V,a,c,R,R,'s',16),I=ellPts(V,a,c,R,R*.84,'s',16);ctx.strokeStyle='#3c3c42';ctx.lineWidth=1.1;ctx.beginPath();
  for(let k=0;k<16;k+=1){ctx.moveTo(E[k][0],E[k][1]);ctx.lineTo(I[k][0],I[k][1]);}ctx.stroke();
  fillP(ctx,ellPts(V,a,c,R,R*.56,'s',14),rim||FV_YD);
  fillP(ctx,ellPts(V,a,c,R+.6,R*.44,'s',12),shade(rim||FV_YD,1.25));
  fillP(ctx,ellPts(V,a,c,R,R*.18,'s',8),'#3a3a40');
  const h=VL(V,a-R/32*.35,c,R+R*.38);ell(ctx,h[0],h[1],R*.16,R*.1,'rgba(255,255,255,.4)');
}
function fvWheels(V,list,near){const sv=(V.si+V.sj)>0?1:-1;return list.map(([a,c,R])=>[a,(near?sv:-sv)*c,R]);}
/* two-tone hydraulic boom segment from p to q (screen points) with a highlight and an optional ram */
function fvBoom(ctx,p,q,w,col,ram){
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(30,20,8,.75)';ctx.lineWidth=w+1.6;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
  ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
  ctx.strokeStyle=shade(col,1.3);ctx.lineWidth=Math.max(.6,w*.3);ctx.beginPath();ctx.moveTo(p[0],p[1]-w*.25);ctx.lineTo(q[0],q[1]-w*.25);ctx.stroke();
  if(ram){const a=[lerp(p[0],q[0],.15),lerp(p[1],q[1],.15)+w*.7],b=[lerp(p[0],q[0],.7),lerp(p[1],q[1],.7)+w*.7];
    ctx.strokeStyle='#d8dde2';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle='#4a4a50';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(lerp(a[0],b[0],.5),lerp(a[1],b[1],.5));ctx.stroke();}
  ctx.lineCap='butt';ell(ctx,q[0],q[1],w*.45,w*.45,'#3a3a40');
}
/* cab: dark frame, glazing on every visible side, roof with a light bar; o.lit = night work lights */
function fvCab(ctx,V,parts,a0,a1,c,z0,z1,col,o){
  parts.push({d:vdepth(V,(a0+a1)/2,0)+.05,f:()=>{
    vbox(ctx,V,a0,a1,-c,c,z0,z0+5,col,{});
    vbox(ctx,V,a0,a1,-c,c,z0+5,z1,FV_CH,{deco:(f,b)=>{
      const g=f==='F'||f==='B'?[-c*.84,c*.84]:[a0+.06,a1-.06];
      vquad(ctx,V,f,b,g[0],g[1],z0+6.5,z1-1.5,FV_GL,'rgba(20,30,40,.6)');
      vquad(ctx,V,f,b,g[0],lerp(g[0],g[1],.42),z0+6.5,z1-1.5,'rgba(255,255,255,.3)');
      if(f!=='B'){const m=(g[0]+g[1])/2;vquad(ctx,V,f,b,m-.02,m+.02,z0+6.5,z1-1.5,'rgba(30,30,34,.7)');}}});
    vbox(ctx,V,a0-.05,a1+.05,-c-.04,c+.04,z1,z1+2.2,col,{topc:shade(col,1.15)});
    // light bar
    vbox(ctx,V,a1-.08,a1+.02,-c*.8,c*.8,z1+2.2,z1+4,'#2a2a2e',{edge:false,deco:(f,b)=>{if(f==='F') for(const cc of [-.5,-.17,.17,.5]) vquad(ctx,V,'F',b,cc*c-.05,cc*c+.05,z1+2.5,z1+3.7,o&&o.lit?'#fffbe0':'#e8e4cc');}});
    // amber beacon
    const bp=VL(V,a0+.08,c*.6,z1+2.2+V.dz);ell(ctx,bp[0],bp[1]-1.2,1.4,1.6,'#f59a1a');}});
}
/* ---------- harvester: 8-wheel articulated, boom with felling head holding a stem ---------- */
function harvesterRaw(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0);
  vshadow(ctx,V0,-1.3,1.25,.5,1.1);
  const W=[[.95,.48,6.2],[.5,.48,6.2],[-.55,.48,6.6],[-1.0,.48,6.6]];
  for(const w of fvWheels(V0,W,false)) fvWheel(ctx,V0,...w,false);
  const parts=[];
  // rear engine module
  parts.push({d:vdepth(V,-.75,0),f:()=>{vbox(ctx,V,-1.3,-.12,-.34,.34,4,9,FV_CH,{});
    vbox(ctx,V,-1.28,-.18,-.42,.42,9,20,FV_Y,{deco:(f,b)=>{if(f==='R'||f==='L'){ctx.strokeStyle='rgba(40,25,5,.45)';ctx.lineWidth=.6;ctx.beginPath();for(let a=-1.1;a<-.45;a+=.09){const q=vface(V,f,b,a,a,11.5+V.dz,18+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[2][0],q[2][1]);}ctx.stroke();
        vquad(ctx,V,f,b,-.4,-.22,10,19,FV_YD);}
      if(f==='B'){vquad(ctx,V,'B',b,-.3,.3,11,18,'#3a3a40');for(const cc of [-.34,.34]) vquad(ctx,V,'B',b,cc-.05,cc+.05,15,17,'#c8221a');}},
      decoTop:(b,z)=>{const p=VL(V,-.9,.2,z);ell(ctx,p[0],p[1],2,1.1,'#2a2a2e');}});
    vbox(ctx,V,-.95,-.88,.18,.25,20,27,'#3a3a40',{edge:false});}});   // exhaust
  // articulation joint
  parts.push({d:vdepth(V,-.05,0),f:()=>vbox(ctx,V,-.16,.08,-.2,.2,6,12,'#3a3a40',{})});
  // front module + cab
  parts.push({d:vdepth(V,.75,0)-.1,f:()=>vbox(ctx,V,.08,1.25,-.36,.36,4,12,FV_Y,{deco:(f,b)=>{if(f==='F'){vquad(ctx,V,'F',b,-.3,.3,5,8,'#3a3a40');}}})});
  fvCab(ctx,V,parts,.45,1.12,.38,12,33,FV_Y,o);
  drawParts(ctx,parts);
  for(const w of fvWheels(V0,W,true)) fvWheel(ctx,V0,...w,true);
  // crane on the front module, swinging out to the side
  const ph=o.pose||0, sw=Math.sin(ph*TAU)*.9, sv=(V.si+V.sj)>0?1:-1;
  const base=VL(V,.25,0,14+V.dz), top=VL(V,.25,0,24+V.dz);
  const tip=[1.9+Math.cos(ph*TAU)*.25,sw*1.6,10+Math.sin(ph*TAU*2)*3];
  const E=VL(V,1.05,sw*.55,46+V.dz),G=VL(V,tip[0],tip[1],tip[2]+18+V.dz);
  vbox(ctx,V,.12,.38,-.14,.14,12,24,FV_YD,{});
  fvBoom(ctx,top,E,3.4,FV_Y,true);fvBoom(ctx,E,G,2.6,FV_Y,true);
  // felling head: frame + rollers + red saw bar, holding a stem
  const W2=VF(V.i+tip[0]*V.fi+tip[1]*V.si,V.j+tip[0]*V.fj+tip[1]*V.sj,Math.atan2(V.fj,V.fi)+Math.PI/2,0);
  vlog(ctx,W2,-.75,.75,0,tip[2]+V.dz,3.4,'#7a4e26');
  vbox(ctx,W2,-.16,.16,-.16,.16,tip[2]+1,tip[2]+15,FV_Y,{});
  vbox(ctx,W2,-.18,.18,-.05,.05,tip[2]+15,tip[2]+18,'#3a3a40',{edge:false});
  const sb=VL(W2,0,.16,tip[2]+2);ctx.fillStyle='#d8342a';ctx.fillRect(sb[0]-5,sb[1]-1,10,2.2);
  return VL(V,-.92,.22,28+V.dz);
}
/* ---------- forwarder: carries cut logs in a bunk (load 0..1 = 0..9 logs), small crane folded on top ---------- */
function forwarderRaw(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0);const load=o.load||0;
  vshadow(ctx,V0,-1.45,1.15,.5,1.1);
  const W=[[.85,.48,6],[-.35,.48,6],[-.8,.48,6],[-1.25,.48,6]];
  for(const w of fvWheels(V0,W,false)) fvWheel(ctx,V0,...w,false,'#3f7d3a');
  const parts=[], col=FV_G;
  // rear frame + bunk floor
  parts.push({d:vdepth(V,-.85,0)-.4,f:()=>{vbox(ctx,V,-1.5,-.05,-.3,.3,4,9,FV_CH,{});vbox(ctx,V,-1.5,-.08,-.46,.46,9,11,'#4a4a50',{});}});
  // bunk stakes (U frames) + headboard grid
  for(const a of [-1.42,-.95,-.48]) for(const sc of [-1,1]) parts.push({d:vdepth(V,a,sc*.44)+(sc*(V.si+V.sj)>0?.45:-.45),f:()=>vbox(ctx,V,a-.035,a+.035,sc*.44-.035,sc*.44+.035,11,27,'#3a3a40',{edge:false})});
  parts.push({d:vdepth(V,-.1,0),f:()=>vbox(ctx,V,-.14,-.06,-.46,.46,11,30,'#3a3a40',{deco:(f,b)=>{if(f==='F'||f==='B'){ctx.strokeStyle='rgba(210,215,220,.4)';ctx.lineWidth=.6;ctx.beginPath();for(let z=14;z<30;z+=3.2){const q=vface(V,f,b,-.46,.46,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();}}})});
  // logs: 4-3-2 stack, lengthwise
  const n=Math.max(0,Math.min(9,Math.round(load*9))),r=3.9,LG=[[-.3,0],[-.1,0],[.1,0],[.3,0],[-.2,1],[0,1],[.2,1],[-.1,2],[.1,2]];
  const sv=(V.si+V.sj)>0?1:-1;
  for(let k=0;k<n;k++){const [c,row]=LG[k];const zc=11+r+row*r*1.72;parts.push({d:vdepth(V,-.8,c)*.2+row*.05-.2+sv*c*.15,f:()=>vlog(ctx,V,-1.6,-.15,c,zc,r,k%3?'#8a5a2c':'#6f4522')});}
  // articulation + front module + cab
  parts.push({d:vdepth(V,.05,0),f:()=>vbox(ctx,V,-.05,.15,-.2,.2,6,12,'#3a3a40',{})});
  parts.push({d:vdepth(V,.7,0)-.1,f:()=>vbox(ctx,V,.12,1.2,-.38,.38,4,14,col,{deco:(f,b)=>{if(f==='F'){vquad(ctx,V,'F',b,-.28,.28,6,10,'#2a2a2e');for(const cc of [-.32,.32]) vquad(ctx,V,'F',b,cc-.04,cc+.04,10.5,12.5,'#fff6c8');}}})});
  fvCab(ctx,V,parts,.25,.85,.37,14,33,col,o);
  // engine hood ahead of the cab
  parts.push({d:vdepth(V,1.0,0),f:()=>vbox(ctx,V,.85,1.2,-.32,.32,14,20,col,{})});
  drawParts(ctx,parts);
  for(const w of fvWheels(V0,W,true)) fvWheel(ctx,V0,...w,true,'#3f7d3a');
  // loader crane, folded back over the bunk (or reaching out when o.reach)
  const rch=o.reach||0, pil=VL(V,.05,0,30+V.dz), E=VL(V,lerp(-.3,.4,rch),lerp(0,-1.2*sv,rch),44+V.dz), G=VL(V,lerp(-1.0,.2,rch),lerp(0,-2.0*sv,rch),lerp(32,14,rch)+V.dz);
  vbox(ctx,V,-.02,.12,-.1,.1,11,30,'#4a4a50',{edge:false});
  fvBoom(ctx,pil,E,2.8,'#e8b52a',true);fvBoom(ctx,E,G,2.2,'#e8b52a',false);
  ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(G[0]-3,G[1]+1);ctx.lineTo(G[0]-2,G[1]+5);ctx.moveTo(G[0]+3,G[1]+1);ctx.lineTo(G[0]+2,G[1]+5);ctx.stroke();
  return VL(V,1.0,.22,24+V.dz);
}
/* ---------- skidder: 4 big tyres, dozer blade, grapple arch dragging a bundle of stems ---------- */
function skidderRaw(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0);const load=o.load||0;
  vshadow(ctx,V0,-1.3,1.05,.48,1.0);
  // dragged stems behind (on the ground, slightly raised at the grapple)
  if(load>.05){const n=load>.6?3:load>.3?2:1;for(let k=0;k<n;k++){const c=(k-(n-1)/2)*.2;vlog(ctx,V0,-2.6,-.9,c,3.4+k*.6,3.2,k%2?'#7a4e26':'#8a5a2c');}}
  const W=[[.6,.5,7.6],[-.6,.5,7.6]];
  for(const w of fvWheels(V0,W,false)) fvWheel(ctx,V0,...w,false,'#c84a2a');
  const parts=[], col='#d8562e';
  parts.push({d:vdepth(V,0,0)-.2,f:()=>{vbox(ctx,V,-1.05,1.0,-.3,.3,5,10,FV_CH,{});}});
  // engine (front) with grille
  parts.push({d:vdepth(V,.6,0),f:()=>vbox(ctx,V,.15,1.0,-.34,.34,10,20,col,{deco:(f,b)=>{if(f==='F'){vquad(ctx,V,'F',b,-.24,.24,11,18,'#2a2a2e');ctx.strokeStyle='rgba(200,200,200,.35)';ctx.lineWidth=.5;ctx.beginPath();for(let z=12;z<18;z+=1.5){const q=vface(V,'F',b,-.22,.22,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();for(const cc of [-.3,.3]) vquad(ctx,V,'F',b,cc-.04,cc+.04,17,19,'#fff6c8');}}})});
  // blade
  parts.push({d:vdepth(V,1.2,0)+.1,f:()=>vbox(ctx,V,1.12,1.22,-.56,.56,2,10,'#e0b52a',{})});
  fvCab(ctx,V,parts,-.45,.15,.36,10,30,col,o);
  // grapple arch at the back
  parts.push({d:vdepth(V,-.95,0),f:()=>{for(const sc of [-1,1]) vbox(ctx,V,-1.0,-.92,sc*.3-.04,sc*.3+.04,10,25,'#3a3a40',{edge:false});vbox(ctx,V,-1.05,-.87,-.34,.34,25,28,'#3a3a40',{edge:false});
    const g=VL(V,-1.15,0,load>.05?8+V.dz:16+V.dz);ctx.strokeStyle='#2a2a2e';ctx.lineWidth=1.5;ctx.beginPath();const a=VL(V,-.96,0,25+V.dz);ctx.moveTo(a[0],a[1]);ctx.lineTo(g[0],g[1]);ctx.stroke();ell(ctx,g[0],g[1],2.4,1.4,'#3a3a40');}});
  drawParts(ctx,parts);
  for(const w of fvWheels(V0,W,true)) fvWheel(ctx,V0,...w,true,'#c84a2a');
  const sv=(V.si+V.sj)>0?1:-1;vbox(ctx,V,.55,.62,sv*.18-.03,sv*.18+.03,20,29,'#3a3a40',{edge:false});
  return VL(V,.58,sv*.18,30+V.dz);
}
const VBOX_F=[-110,-96,110,56];
function harvester(ctx,i,j,yaw,o){const qy=qYaw(yaw),p=Math.round((o.pose||0)*8)/8%1,b=Math.round((o.bounce||0)*2)/2,L=o.lit?1:0;
  return vehSprite(ctx,'hv'+qy.toFixed(3)+'|'+p+'|'+b+'|'+L,i,j,VBOX_F,g=>harvesterRaw(g,i,j,qy,{pose:p,bounce:b,lit:L}));}
function forwarder(ctx,i,j,yaw,o){const qy=qYaw(yaw),l=Math.round((o.load||0)*9)/9,b=Math.round((o.bounce||0)*2)/2,r=Math.round((o.reach||0)*3)/3,L=o.lit?1:0;
  return vehSprite(ctx,'fw'+qy.toFixed(3)+'|'+l+'|'+b+'|'+r+'|'+L,i,j,VBOX_F,g=>forwarderRaw(g,i,j,qy,{load:l,bounce:b,reach:r,lit:L}));}
function skidder(ctx,i,j,yaw,o){const qy=qYaw(yaw),l=o.load>.6?1:o.load>.3?.5:o.load>.05?.25:0,b=q4(o.bounce),L=o.lit?1:0;
  return vehSprite(ctx,'sk'+qy.toFixed(3)+'|'+l+'|'+b+'|'+L,i,j,VBOX_F,g=>skidderRaw(g,i,j,qy,{load:l,bounce:b,lit:L}));}

/* ---------- movement: forwarders shuttle harvester strip -> south landing, skidders drag stems to the top landing ---------- */
const FW_PATH=[[-4.4,11.4],[-4.0,13.6],[-3.4,16.0]], SK_PATH=[[-4.6,1.6],[-3.0,2.6],[-1.9,3.3]];
function fvSync(){
  const nf=S.collectors.harvester>0?Math.min(2,Math.ceil(S.collectors.harvester/4)):0;
  const ns=S.collectors.chainsaw>=5?Math.min(2,1+Math.floor(S.collectors.chainsaw/25)):0;
  scene.forwarders=scene.forwarders||[];scene.skidders=scene.skidders||[];
  while(scene.forwarders.length<nf){const k=scene.forwarders.length;scene.forwarders.push({k,p:k*.9,path:mkPath(FW_PATH.map(([i,j])=>[i+k*.9,j-k*.5])),ph:0,load:0,wait:0});}
  scene.forwarders.length=nf;
  while(scene.skidders.length<ns){const k=scene.skidders.length;scene.skidders.push({k,p:k*.7,path:mkPath(SK_PATH.map(([i,j])=>[i+k*1.1,j-k*.9])),ph:0,load:0,wait:0});}
  scene.skidders.length=ns;
}
/* ping-pong along the path: p 0..1 out (empty), wait (crane loads), 1..2 back (loaded), wait (unload) */
function fvStep(v,dt,sp){
  if(v.wait>0){v.wait-=dt;v.reach=Math.min(1,(v.reach||0)+dt*1.5);if(v.p>=1&&v.p<1.001) v.load=Math.min(1,v.load+dt*.35);else v.load=Math.max(0,v.load-dt*.5);v.v=0;return;}
  v.reach=Math.max(0,(v.reach||0)-dt*2);
  const before=v.p;v.p+=dt*sp/v.path.tot;v.v=sp;v.ph+=dt*6;
  if(before<1&&v.p>=1){v.p=1;v.wait=3;} else if(v.p>=2){v.p=0;v.wait=2.4;}
  const f=v.p<=1?v.p:2-v.p,q=pathAt(v.path,Math.min(1,f));v.i=q[0];v.j=q[1];const sg=v.p<1?1:-1;
  if(Math.abs(q[2])+Math.abs(q[3])>1e-6){const y=Math.atan2(q[3]*sg,q[2]*sg);v.yaw=v.yaw===undefined?y:angLerp(v.yaw,y,Math.min(1,dt*5));}
}
function fvUpdate(dt){fvSync();for(const v of scene.forwarders) fvStep(v,dt,1.6);for(const v of scene.skidders) fvStep(v,dt,1.3);
  for(const h of scene.harvesters){h.i=-1.6+h.k*1.9;h.j=13.6+h.k*1.4+Math.sin(h.ph*.25)*1.4;}}
function fvObjs(ctx,objs,inView){const lit=(scene.dn&&scene.dn.lights>.3)?1:0;
  for(const h of scene.harvesters){if(h.i===undefined) continue;const [x,y]=P(h.i,h.j);if(!inView(x,y,110)) continue;
    objs.push({k:h.i+h.j,f:()=>{const st=harvester(ctx,h.i,h.j,h.yaw||0,{pose:(h.ph*.22)%1,bounce:Math.sin(h.ph*9)*.3,lit});exhaust(st,{v:.4,accel:false});}});}
  for(const v of scene.forwarders||[]){if(v.i===undefined) continue;const [x,y]=P(v.i,v.j);if(!inView(x,y,110)) continue;
    objs.push({k:v.i+v.j,f:()=>{const st=forwarder(ctx,v.i,v.j,v.yaw||0,{load:v.load,reach:v.reach,bounce:v.v?Math.sin(v.ph*4)*.4:0,lit});if(v.v) exhaust(st,v);}});}
  for(const v of scene.skidders||[]){if(v.i===undefined) continue;const [x,y]=P(v.i,v.j);if(!inView(x,y,110)) continue;
    objs.push({k:v.i+v.j,f:()=>{const st=skidder(ctx,v.i,v.j,v.yaw||0,{load:v.p>=1?1:0,bounce:v.v?Math.sin(v.ph*4)*.4:0,lit});if(v.v) exhaust(st,v);}});}
}
function fvLights(out){for(const v of [...scene.harvesters,...(scene.forwarders||[]),...(scene.skidders||[])]){if(v.i===undefined) continue;vehLights(out,v,1.25,-1.3);
  const V=VF(v.i,v.j,v.yaw||0,0),r=VL(V,.9,0,36);out.push({x:r[0],y:r[1],rx:9,ry:9,c:'cool',a:.9,core:1});const f=VL(V,2.6,0,0);out.push({x:f[0],y:f[1],rx:60,ry:28,c:'warm',a:.55});}}
