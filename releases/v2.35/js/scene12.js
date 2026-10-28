'use strict';
/* ===================== v2.10 SCENE: biomass power plant + power line =====================
   The plant stands on a clearing north-east of the R&D campus, next to the highway. The static body is one live sprite
   (re-rendered only when its level, season, lights or running state change); smoke, cooling-tower steam, blinking aviation
   lights and the energy pulses on the line are drawn per frame and cost a few dozen path ops. */
const PWZ={id:'power',ci:24.3,cj:-4.1,i0:21.2,i1:27.4,j0:-7.0,j1:-1.2};
const PW_CH=[[21.95,-6.45,.33,98],[23.05,-6.6,.3,84]];   // chimneys (i,j,r,h); the second one from Lv 7
const PW_CT={ci:26.15,cj:-5.45,r:1.05,h:66};              // cooling tower from Lv 3
const PW_SILO=[[25.0,-3.95],[26.25,-3.85]];               // fuel silos from Lv 5
const PW_POLES=[[24.45,-0.95],[21.7,-0.5],[20.4,1.6],[20.4,4.9],[20.4,8.3]];
scene.pw={run:0,pulse:0,poof:0};
function pwRunning(){return pwLvl()>0&&pwEff()>.05;}
function powerSceneUpdate(dt){const w=scene.pw,tg=pwLvl()?pwEff():0;w.run+=(tg-w.run)*Math.min(1,dt*1.5);w.pulse+=dt*(.35+.9*w.run);}
/* ---------- ground (baked into the ground chunks): gravel clearing, access road to the highway, cut line under the wires ---------- */
function powerGround(ctx){
  const G=SEAS===3?'#e8edf0':'#c2b494', G2=SEAS===3?'#f1f4f6':'#cfc3a4';
  fillP(ctx,[P(20.8,-7.4),P(27.9,-7.4),P(27.9,-.7),P(20.8,-.7)],G);
  fillP(ctx,[P(21.0,-7.2),P(27.7,-7.2),P(27.7,-.9),P(21.0,-.9)],G2);
  // access road to the highway
  fillP(ctx,[P(27.4,-2.75),P(30,-2.75),P(30,-1.85),P(27.4,-1.85)],'#6e6c69');
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.2;ctx.setLineDash([5,5]);ctx.beginPath();{const a=P(27.5,-2.3),b=P(30,-2.3);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();ctx.setLineDash([]);
  // cleared strip under the power line
  fillP(ctx,[P(20.0,-.9),P(20.8,-.9),P(20.8,8.8),P(20.0,8.8)],SEAS===3?'#e6ecef':'rgba(120,150,70,.35)');
}
/* ---------- parts ---------- */
function pwChimney(ctx,i,j,r,h,lv10){   // v2.10.1: one cached round stack, red/white aviation bands, ladder + platform ring
  const seg=h/7,bands=[[h-seg,h,'#c8402c'],[h-3*seg,h-2*seg,'#c8402c']];
  const top=rstack(ctx,i,j,{r,z0:0,top:h,style:'white',taper:.08,bands,ring:h*.62,bandStep:seg});
  ctx.strokeStyle='rgba(60,60,60,.55)';ctx.lineWidth=.7;ctx.beginPath();const a=P(i,j+r*.9,6),b=P(i,j+r*.9,h*.62);ctx.moveTo(a[0]-2,a[1]);ctx.lineTo(b[0]-2,b[1]);ctx.moveTo(a[0]+1,a[1]);ctx.lineTo(b[0]+1,b[1]);
  for(let z=8;z<h*.62;z+=3){const q=P(i,j+r*.9,z);ctx.moveTo(q[0]-2,q[1]);ctx.lineTo(q[0]+1,q[1]);}ctx.stroke();
  if(lv10){const [gx,gy]=P(i,j,h-2);ctx.strokeStyle='#f5c84c';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(gx,gy+1,r*45.25,r*22.63,0,0,Math.PI);ctx.stroke();}
  return top;
}
function pwCoolTower(ctx){
  const {ci,cj,r,h}=PW_CT,[cx,cy]=P(ci,cj,0),RX=r*45.25,RY=r*22.63;
  const f=t=>.68*Math.sqrt(1+Math.pow((t-.72)/.668,2));
  ell(ctx,cx+6,cy+3,RX*1.08,RY*1.05,'rgba(30,40,10,.22)');
  // legs ring
  ctx.fillStyle='#6a6660';ctx.beginPath();ctx.ellipse(cx,cy,RX,RY,0,0,Math.PI);ctx.lineTo(cx-RX,cy-6);ctx.ellipse(cx,cy-6,RX,RY,0,Math.PI,0,true);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#4a4640';ctx.lineWidth=1;ctx.beginPath();for(let k=0;k<=16;k++){const a=Math.PI*k/16,x=cx-Math.cos(a)*RX,y=cy+Math.sin(a)*RY;ctx.moveTo(x,y);ctx.lineTo(x+(k%2?2.5:-2.5),y-6);}ctx.stroke();
  // shell silhouette (front half)
  const N=14,L=[],R=[];for(let k=0;k<=N;k++){const t=k/N,z=6+(h-6)*t,w=RX*f(t);L.push([cx-w,cy-z]);R.push([cx+w,cy-z]);}
  const g=ctx.createLinearGradient(cx-RX,0,cx+RX,0);const base=SEAS===3?'#dfe3e6':'#d4cfc5';
  g.addColorStop(0,shade(base,1.08));g.addColorStop(.35,shade(base,1));g.addColorStop(.75,shade(base,.8));g.addColorStop(1,shade(base,.62));
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(L[0][0],L[0][1]);for(const p of L) ctx.lineTo(p[0],p[1]);
  const wt=RX*f(1),ht=RY*f(1);ctx.ellipse(cx,cy-h,wt,ht,0,Math.PI,0,true);for(let k=N;k>=0;k--) ctx.lineTo(R[k][0],R[k][1]);
  ctx.ellipse(cx,cy-6,RX*f(0),RY*f(0),0,0,Math.PI,false);ctx.closePath();ctx.fill();ctx.strokeStyle=EDGE;ctx.lineWidth=1;ctx.stroke();
  // weathering streaks + rings
  ctx.strokeStyle='rgba(90,80,70,.14)';ctx.lineWidth=1.4;ctx.beginPath();for(const s of [-.55,-.2,.15,.42,.66]){for(let k=0;k<N;k++){const t0=k/N,t1=(k+1)/N;const a=[cx+s*RX*f(t0),cy-6-(h-6)*t0],b=[cx+s*RX*f(t1),cy-6-(h-6)*t1];if(k===0) ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}}ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.beginPath();for(const t of [.25,.5,.8]){const w=RX*f(t),hh=RY*f(t);ctx.ellipse(cx,cy-6-(h-6)*t,w,hh,0,0,Math.PI);}ctx.stroke();
  // top rim + dark throat
  ctx.fillStyle=SEAS===3?SNOW:shade(base,1.1);ctx.beginPath();ctx.ellipse(cx,cy-h,wt,ht,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#4a4642';ctx.beginPath();ctx.ellipse(cx,cy-h+.6,wt*.86,ht*.84,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(cx,cy-h+1.6,wt*.7,ht*.5,0,0,Math.PI);ctx.fill();
  // red band near the top
  ctx.strokeStyle='rgba(200,64,44,.85)';ctx.lineWidth=2.2;ctx.beginPath();{const t=.93,w=RX*f(t),hh=RY*f(t);ctx.ellipse(cx,cy-6-(h-6)*t,w,hh,0,.08,Math.PI-.08);}ctx.stroke();
}
function pwBoiler(ctx,l,lit){
  const i0=21.5,i1=24.3,j0=-6.0,j1=-3.5,H=46,col='#d9d3c5';
  box(ctx,i0,j0,i1,j1,0,H,col,{});
  // vertical cladding seams
  ctx.strokeStyle='rgba(70,60,50,.16)';ctx.lineWidth=1;ctx.beginPath();
  for(let a=j0+.2;a<j1;a+=.2){const p=P(i1,a,0),q=P(i1,a,H-6);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}
  for(let a=i0+.2;a<i1;a+=.2){const p=P(a,j1,26),q=P(a,j1,H-6);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
  // orange band + sign
  fillP(ctx,fq('I',i1,j0,j1,H-6,H-1),'#d8742a');fillP(ctx,fq('J',j1,i0,i1,H-6,H-1),'#e0823a');
  ctx.save();fxf(ctx,'I',i1,(j0+j1)/2,H-3.5);ctx.scale(-1,1);ctx.restore();
  ctx.save();fxf(ctx,'J',j1,(i0+i1)/2,H-3.5);ctx.fillStyle='#fff';ctx.font='900 4.6px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l>=PW_MAX?'★ TIMBER POWER ★':'TIMBER POWER',0,0);ctx.restore();
  // windows: two rows on the +i face, one row above the turbine hall on the +j face
  for(const z of [12,27]) for(let k=0;k<4;k++) win(ctx,'I',i1,j0+.28+k*.58,.32,z,7,lit&&k%2===0);
  for(let k=0;k<3;k++) win(ctx,'J',j1,i0+.35+k*.85,.42,31,6,lit);
  // roof kit: flue duct to the chimney, air-cooler boxes, roof fan
  box(ctx,21.72,-6.32,22.18,-5.98,34,41,'#8a8f96',{hl:false});
  box(ctx,22.3,-5.7,23.3,-5.0,H,H+5,'#a8aeb4',{});box(ctx,23.5,-5.6,24.0,-5.1,H,H+3.5,'#9aa0a6',{});
  {const [x,y]=P(22.8,-4.2,H);ell(ctx,x,y,9,4.6,'#7a8088');ell(ctx,x,y-1,7.6,3.8,'#4a4f56');const a=.6;ctx.strokeStyle='#c9ced4';ctx.lineWidth=1.4;ctx.beginPath();for(let k=0;k<3;k++){const b=a+k*TAU/3;ctx.moveTo(x,y-1);ctx.lineTo(x+Math.cos(b)*6.5,y-1+Math.sin(b)*3.2);}ctx.stroke();}
  if(l>=PW_MAX){ctx.strokeStyle='#f5c84c';ctx.lineWidth=2;const a=P(i0,j1,H),b=P(i1,j1,H),c=P(i1,j0,H);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();const [fx,fy]=P(23.9,-5.8,H);flag(ctx,fx,fy,'#f5c84c');}
}
function pwTurbineHall(ctx,lit){
  const i0=21.5,i1=24.3,j0=-3.5,j1=-1.9,H=24,col='#6f8aa6';
  box(ctx,i0,j0,i1,j1,0,H,col,{top:false});
  // ribbed steel
  ctx.strokeStyle='rgba(20,30,50,.18)';ctx.lineWidth=1;ctx.beginPath();for(let a=i0+.14;a<i1;a+=.14){const p=P(a,j1,0),q=P(a,j1,H);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}
  for(let a=j0+.14;a<j1;a+=.14){const p=P(i1,a,0),q=P(i1,a,H);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
  // tall window strip + plinth
  fillP(ctx,fq('J',j1,i0,i1,0,3),'#4a5a6a');
  for(let k=0;k<6;k++) win(ctx,'J',j1,i0+.16+k*.44,.32,7,12,lit,'#e8ecef');
  // roller door on the +i end
  fillP(ctx,fq('I',i1,j0+.3,j0+1.2,0,15),'#e8ecef');fillP(ctx,fq('I',i1,j0+.36,j0+1.14,0,14),'#b8bec4');
  ctx.strokeStyle='rgba(60,60,60,.3)';ctx.lineWidth=.6;ctx.beginPath();for(let z=1.6;z<14;z+=1.6){const q=fq('I',i1,j0+.36,j0+1.14,z,z);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();
  fillP(ctx,fq('I',i1,j0+.3,j0+1.2,15,16.5),'#f2c230');
  gable(ctx,i0,j0,i1,j1,H,7,'i','#4f6a86',col,.15);
  // rooftop sign board
  const [a,b]=[P(22.1,-2.7,H+8),P(23.7,-2.7,H+8)];ctx.fillStyle='#4a4f56';for(const p of [a,b]) ctx.fillRect(p[0]-.8,p[1]-1,1.6,8);
  fillP(ctx,fq('J',-2.7,22.0,23.8,H+8,H+15),'#2a5a32','#f4f6f2',.8);
  ctx.save();fxf(ctx,'J',-2.7,22.9,H+11.5);ctx.fillStyle='#f5c84c';ctx.font='900 5.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡ BIOMASS POWER',0,0);ctx.restore();
}
function pwBunker(ctx){
  box(ctx,24.6,-4.45,25.95,-3.45,0,6,'#a39c8e',{top:false,hl:false});
  const [x,y]=P(25.28,-3.95,4);cone(ctx,x,y,22,10,9,'#6b4a2e');ell(ctx,x-6,y-3,4,2,'#8b5a34');ell(ctx,x+5,y-1,4.5,2,'#2f2c2a');
  fillP(ctx,fq('J',-3.45,24.6,25.95,0,6),shade('#a39c8e',.9),EDGE);fillP(ctx,fq('I',25.95,-4.45,-3.45,0,6),shade('#a39c8e',.7),EDGE);
}
function pwSilos(ctx){
  const [[a0,b0],[a1,b1]]=PW_SILO;
  const silo=(i,j)=>{const t=cyl(ctx,i,j,.42,0,34,'#b8bec4');cone(ctx,t[0],t[1],.42*45.25,.42*22.63,7,SEAS===3?'#eef2f4':'#9aa2aa');
    ctx.strokeStyle='rgba(40,50,60,.2)';ctx.lineWidth=1;ctx.beginPath();for(const z of [8,16,24]){const [x,y]=P(i,j,z);ctx.ellipse(x,y,.42*45.25,.42*22.63,0,0,Math.PI);}ctx.stroke();
    const [x,y]=P(i,j,14);ctx.fillStyle='#2a5a32';ctx.fillRect(x-5,y-3,10,6);ctx.fillStyle='#f5c84c';ctx.font='900 4.4px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('FUEL',x,y);};
  silo(a0,b0);
  box(ctx,a0,b0-.12,a1,b0+.12,33,36,'#7a828c',{top:'#5a6068'});   // bridge between the silos
  silo(a1,b1);
  box(ctx,24.3,-4.1,a0-.3,-3.82,30,34,'#7a828c',{top:'#5a6068'}); // feed conveyor into the boiler house
}
function pwSubstation(ctx,run){
  const i0=24.7,i1=27.1,j0=-3.0,j1=-1.5;
  fillP(ctx,[P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)],SEAS===3?'#eef2f4':'#a8a296');
  const tr=(a,b)=>{box(ctx,a,b,a+.62,b+.55,0,10,'#7f8f7c',{});
    ctx.strokeStyle='rgba(20,30,20,.35)';ctx.lineWidth=.8;ctx.beginPath();for(let q=.08;q<.55;q+=.09){const p=P(a+.62,b+q,1.5),r=P(a+.62,b+q,8.5);ctx.moveTo(p[0],p[1]);ctx.lineTo(r[0],r[1]);}ctx.stroke();
    for(const d of [.15,.31,.47]){const [x,y]=P(a+.31,b+d,10);ctx.fillStyle='#c9a87a';for(let k=0;k<3;k++) ell(ctx,x,y-2-k*2.2,1.7,.9,k%2?'#a8865a':'#d8b88a');ctx.fillStyle='#5a5f66';ctx.fillRect(x-.5,y-9,1,2.4);}};
  tr(24.95,-2.75);tr(26.05,-2.75);
  // gantry
  ctx.strokeStyle='#5a5f66';ctx.lineWidth=1.6;ctx.beginPath();const g0=P(25.0,-1.75,0),g1=P(26.85,-1.75,0);ctx.moveTo(g0[0],g0[1]);ctx.lineTo(g0[0],g0[1]-30);ctx.lineTo(g1[0],g1[1]-30);ctx.lineTo(g1[0],g1[1]);ctx.stroke();
  for(const q of [.25,.5,.75]){const x=g0[0]+(g1[0]-g0[0])*q,y=g0[1]+(g1[1]-g0[1])*q-30;ell(ctx,x,y+2.5,1.4,.8,'#d8b88a');ell(ctx,x,y+4.3,1.4,.8,'#a8865a');}
  // chain-link fence (front + right sides)
  ctx.strokeStyle='rgba(90,95,100,.55)';ctx.lineWidth=.8;ctx.beginPath();
  for(const [p,q] of [[P(i0,j1,0),P(i1,j1,0)],[P(i1,j0,0),P(i1,j1,0)]]){for(const z of [0,7]){ctx.moveTo(p[0],p[1]-z);ctx.lineTo(q[0],q[1]-z);}
    for(let k=0;k<=8;k++){const x=p[0]+(q[0]-p[0])*k/8,y=p[1]+(q[1]-p[1])*k/8;ctx.moveTo(x,y);ctx.lineTo(x,y-7);}}ctx.stroke();
  {const [x,y]=P(i1-.4,j1,4);ctx.fillStyle='#f2c230';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+3.5,y+2);ctx.lineTo(x-3.5,y+2);ctx.closePath();ctx.fill();ctx.fillStyle='#222';ctx.font='900 4px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',x,y);}
}
function pwPlantRaw(ctx,l,lit){
  // concrete pad + yard markings
  fillP(ctx,[P(21.2,-7.0),P(24.5,-7.0),P(24.5,-1.2),P(21.2,-1.2)],SEAS===3?'#eef2f4':'#d9d3c6');
  fillP(ctx,[P(24.5,-7.0),P(27.4,-7.0),P(27.4,-3.1),P(24.5,-3.1)],SEAS===3?'#eef2f4':'#d2ccbe');
  fillP(ctx,[P(24.5,-3.1),P(27.4,-3.1),P(27.4,-2.75),P(24.5,-2.75)],'rgba(0,0,0,.06)');
  for(const [i,j,r,h] of PW_CH.slice(0,l>=7?2:1)) pwChimney(ctx,i,j,r,h,l>=PW_MAX);
  pwBoiler(ctx,l,lit);
  if(l>=3) pwCoolTower(ctx);
  if(l>=5) pwSilos(ctx); else pwBunker(ctx);
  pwTurbineHall(ctx,lit);
  pwSubstation(ctx);
  return 60;
}
function pwPlot(ctx){ // not built yet: survey stakes, dashed outline, sign
  const vis=pwVisible(),pts=[P(PWZ.i0+.4,PWZ.j0+.4),P(PWZ.i1-.4,PWZ.j0+.4),P(PWZ.i1-.4,PWZ.j1-.4),P(PWZ.i0+.4,PWZ.j1-.4)];
  ctx.setLineDash([5,4]);fillP(ctx,pts,'rgba(255,240,210,.28)',vis?'rgba(216,116,42,.9)':'rgba(120,110,90,.6)',1.6);ctx.setLineDash([]);
  for(const p of pts){ctx.fillStyle='#f07020';ctx.beginPath();ctx.moveTo(p[0],p[1]-9);ctx.lineTo(p[0]-3.4,p[1]);ctx.lineTo(p[0]+3.4,p[1]);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(p[0]-2,p[1]-5,4,1.4);}
  const [sx,sy]=P(23.4,-2.2,0);ctx.fillStyle='#6a4a2a';ctx.fillRect(sx-1,sy-18,2,18);ctx.fillStyle=vis?'#2a5a32':'#6a5a40';rr(ctx,sx-19,sy-29,38,12,2);ctx.fill();
  ctx.fillStyle='#f5c84c';ctx.font='900 6.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡ POWER PLANT',sx,sy-23);
}
function drawPowerPlant(ctx){
  const l=pwLvl(); PWZ.hit=boxHit(PWZ.i0,PWZ.j0,PWZ.i1,PWZ.j1,l?70:24); PWZ.top=P(PWZ.ci,PWZ.cj,l?(l>=3?74:62):30);
  if(!l){pwPlot(ctx);return;}
  const D=scene.dn,lit=D.lights>.03, run=pwRunning();
  const bx=[Math.floor((PWZ.i0-PWZ.j1)*32-24),Math.floor((PWZ.i0+PWZ.j0)*16-118),Math.ceil((PWZ.i1-PWZ.j0)*32+24),Math.ceil((PWZ.i1+PWZ.j1)*16+12)];
  const sig=l+'|'+SEAS+'|'+Math.round(D.lights*8)+'|'+(D.night>.35?1:0)+'|'+(run?1:0);
  liveSprite(ctx,'power',bx,sig,.2,g=>pwPlantRaw(g,l,lit&&run));
}
/* ---------- power line ---------- */
function pwPole(ctx,i,j,first){
  const [x,y]=P(i,j,0);ell(ctx,x+3,y+1,5,2.2,'rgba(25,35,10,.22)');
  ctx.fillStyle='#6a4a2a';ctx.fillRect(x-1.3,y-44,2.6,44);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+.3,y-44,1,44);
  ctx.fillStyle='#5a3a1e';ctx.fillRect(x-10,y-41,20,2.2);
  for(const dx of [-8,0,8]){ctx.fillStyle='#d8b88a';ctx.fillRect(x+dx-1,y-44.5,2,3.4);}
  if(first===2){ctx.fillStyle='#7f8f7c';ctx.fillRect(x+1.3,y-30,6,8);ctx.fillStyle='#5a6a58';ctx.fillRect(x+1.3,y-30,6,1.4);}
}
function pwWireTops(i,j){const [x,y]=P(i,j,0);return [[x-8,y-44],[x,y-44],[x+8,y-44]];}
function pwGantryTops(){const g0=P(25.0,-1.75,0),g1=P(26.85,-1.75,0);return [.25,.5,.75].map(q=>[g0[0]+(g1[0]-g0[0])*q,g0[1]+(g1[1]-g0[1])*q-25.5]);}
function pwSpan(ctx,a,b,run,ph,gantry){
  const A=gantry?pwGantryTops():pwWireTops(a[0],a[1]),B=pwWireTops(b[0],b[1]);
  ctx.strokeStyle='rgba(40,36,32,.75)';ctx.lineWidth=.8;ctx.beginPath();
  for(let k=0;k<3;k++){const p=A[k],q=B[k],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2+9;ctx.moveTo(p[0],p[1]);ctx.quadraticCurveTo(mx,my,q[0],q[1]);}ctx.stroke();
  if(run>.05){ctx.save();ctx.globalCompositeOperation='lighter';
    for(let k=0;k<3;k++){const p=A[k],q=B[k],mx=(p[0]+q[0])/2,my=(p[1]+q[1])/2+9;const t=(ph+k*.33)%1,u=1-t;
      const x=u*u*p[0]+2*u*t*mx+t*t*q[0],y=u*u*p[1]+2*u*t*my+t*t*q[1];glow(ctx,x,y,7,7,'gold',.55*run);ctx.fillStyle=`rgba(255,240,160,${.9*run})`;ctx.fillRect(x-1,y-1,2,2);}
    ctx.restore();}
}
function powerDraw(ctx,objs,inView){
  const [px,py]=P(PWZ.ci,PWZ.cj);
  if(inView(px,py,260)) objs.push({k:PWZ.i0+PWZ.j0+5.6,f:()=>drawPowerPlant(ctx)});
  if(!pwLvl()) return;
  const run=scene.pw.run, n=PW_POLES.length;
  for(let k=0;k<n;k++){const [i,j]=PW_POLES[k],[x,y]=P(i,j);if(inView(x,y,60)) objs.push({k:i+j+.02,f:()=>pwPole(ctx,i,j,k===n-1?2:k===0?1:0)});}
  // first span from the substation gantry to pole 0, then pole to pole
  const g=[26.4,-1.75];
  const spans=[[g,PW_POLES[0]]];for(let k=0;k+1<n;k++) spans.push([PW_POLES[k],PW_POLES[k+1]]);
  spans.forEach(([a,b],k)=>{const m=P((a[0]+b[0])/2,(a[1]+b[1])/2);if(!inView(m[0],m[1],140)) return;
    objs.push({k:Math.max(a[0]+a[1],b[0]+b[1])+.03,f:()=>pwSpan(ctx,a,b,run,scene.pw.pulse+k*.21,k===0)});});
}
/* ---------- per-frame effects: smoke, steam, aviation lights ---------- */
function powerFx(ctx){
  const l=pwLvl(); if(!l) return; const run=scene.pw.run, dt=scene.dtF||0;
  const chs=PW_CH.slice(0,l>=7?2:1);
  for(const [i,j,r,h] of chs){const [x,y]=P(i,j,h);
    if(run>.05&&Math.random()<dt*(3+5*run)) emitSmoke(x+(Math.random()-.5)*4,y-3,run>.6?'grey':'dark');
    const on=Math.floor(scene.t*1.4+i)%2===0;ell(ctx,x+r*45.25*1.02,y+.5,1.5,1.5,on?'#ff4a3a':'#8a1e14');}
  if(l>=3&&run>.05){const {ci,cj,r,h}=PW_CT,[x,y]=P(ci,cj,h);for(let k=0;k<2;k++) if(Math.random()<dt*(4+8*run)) emitSmoke(x+(Math.random()-.5)*r*60,y-2,'white');}
}
function powerOverlays(ctx){
  if(!pwVisible()||!PWZ.top) return;
  const [sx,sy]=w2s(PWZ.top[0],PWZ.top[1]); if(sx<-90||sx>scene.w+90||sy<-50||sy>scene.h+50) return;
  const l=pwLvl(),t=scene.t;
  if(!l){const c=pwCost(),can=pwUnlocked()&&S.coins+1e-9>=c,bob=can?Math.sin(t*4)*2.5:0;
    if(pwUnlocked()){pill(ctx,sx,sy-12+bob,'⚡ Power Plant',{bg:can?'#2a7a3a':'rgba(43,27,14,.75)',fg:'#fff',fs:11,stroke:can?'#c8f0b0':null});pill(ctx,sx,sy+8+bob,fmt(c),{icon:'coin',bg:'#fff6e0',fg:can?'#3b7f27':'#8a6a40',fs:10.5,stroke:can?'#4fa633':'#d9b98a'});}
    else pill(ctx,sx,sy,'🔒 Power Plant · needs a Pellet Press',{fs:10,bg:'rgba(43,27,14,.6)'});
    return;}
  const s=pwStatus();
  if(scene.cam.z>=scene.cam.fitZ*.75){
    if(s.k==='nofuel'||s.k==='low'){const k=.5+.5*Math.sin(t*4);pill(ctx,sx,sy,s.k==='nofuel'?'⛔ No fuel':'⚠ Low fuel',{fs:11,bg:`rgba(196,70,61,${.8+.15*k})`,fg:'#fff'});}
    else if(s.k==='off') pill(ctx,sx,sy,'⏸ Power off',{fs:10.5,bg:'rgba(43,27,14,.7)'});
    else pill(ctx,sx,sy,`⚡ +${Math.round(pwBoost()*100)}% · Lv ${l}`,{fs:10.5,bg:'rgba(30,60,30,.78)',fg:'#ffe58a'});}
}
function powerLights(out){
  if(!pwLvl()) return; const r=scene.pw.run;
  {const [x,y]=P(22.9,-1.9,8);out.push({x,y,rx:60,ry:24,c:'warm',a:.35+.4*r});}
  {const [x,y]=P(25.9,-1.6,26);out.push({x,y,rx:30,ry:16,c:'cool',a:.35});}
  {const [x,y]=P(24.3,-4.7,20);out.push({x:x+8,y,rx:34,ry:24,c:'warm',a:.3+.3*r});}
  for(const [i,j,,h] of PW_CH.slice(0,pwLvl()>=7?2:1)) if(Math.floor(scene.t*1.4+i)%2===0){const [x,y]=P(i,j,h);out.push({x,y:y-1.5,rx:14,ry:14,c:'red',a:.9,core:1});}
}
function pwPoof(){if(typeof scene==='undefined'||!scene.ctx) return;const p=P(PWZ.ci,PWZ.cj,16);for(let k=0;k<34;k++) emitP(p[0]+(Math.random()-.5)*150,p[1]+(Math.random()-.5)*60,'poof');}
