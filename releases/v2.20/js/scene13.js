'use strict';
/* ===================== v2.12 SCENE: builders' yard, crew trucks, builders on scaffolding =====================
   The yard sits at the bottom of the lane, left of the lane end. The static part (gravel pad, fence, portacabin office, material
   stacks, floodlight, sign) is one live sprite that only re-renders when its level, season or lights change; the tower crane is
   drawn per frame (a handful of strokes) so its slow slewing and the hook are smooth. Each running job gets a yellow crew truck
   that drives up the lane (forward) and backs out (reverse), like the fire truck, so it never needs a U-turn in the lane.
   Premium and R&D buildings have no lane access: their crews walk on with a puff of dust. Scaffolding is a cached sprite per
   building and assembly step. */
const BYZ={id:'build',ci:24.52,cj:29.35,i0:23.35,i1:25.7,j0:28.0,j1:30.7};
const BY_CR=[23.78,30.22], BY_HM=84;                 // tower crane mast (front-left corner) and its height
const BY_HOME=[[53.9,-1.15],[53.9,1.15]];            // (u,v) lane-end parking, facing up the lane
const BY_YAW=Math.atan2(-1,-1);
const BY_TRUCK_COL='#f2b81a';
/* crew truck: yellow cab, flatbed with a headache rack, carrying a bundle of steel beams and a pallet of bricks out to the job */
function byTruckRaw(ctx,i,j,yaw,o){
  const V=VF(i,j,yaw,o.bounce||0),V0=VF(i,j,yaw,0),Y=BY_TRUCK_COL,K='#2b2b30';
  vshadow(ctx,V0,-1.6,1.6,.47);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],false);
  const parts=[];
  const stripes=(f,b)=>{if(f==='R'||f==='L'){for(let a=-1.62,k=0;a<.2;a+=.18,k++) vquad(ctx,V,f,b,a,Math.min(.2,a+.18),8.6,10.9,k%2?K:Y);}
    if(f==='B'){for(let c=-.47,k=0;c<.47;c+=.188,k++) vquad(ctx,V,'B',b,c,Math.min(.47,c+.188),8.6,10.9,k%2?K:Y);for(const cc of [-.38,.38]) vquad(ctx,V,'B',b,cc-.06,cc+.06,6.2,8.2,o.brake?'#ff3a2a':'#a8221a');}};
  parts.push({d:vdepth(V,-.7,0)-.6,f:()=>{vbox(ctx,V,-1.62,1.45,-.3,.3,4,8,'#34343a',{});vbox(ctx,V,-1.62,.2,-.47,.47,8.4,11,'#5a6068',{deco:stripes,top:'#6e747c'});
    ctx.strokeStyle='rgba(20,20,24,.35)';ctx.lineWidth=.5;ctx.beginPath();for(let a=-1.45;a<.2;a+=.25){const p0=VL(V,a,-.45,11+V.dz),p1=VL(V,a,.45,11+V.dz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();}});
  parts.push({d:vdepth(V,.15,0),f:()=>{vbox(ctx,V,.1,.2,-.45,.45,11,25,'#3a3f46',{});ctx.strokeStyle='rgba(200,206,214,.6)';ctx.lineWidth=.6;ctx.beginPath();
    for(const z of [15,19,23]){const p0=VL(V,.1,-.43,z+V.dz),p1=VL(V,.1,.43,z+V.dz);ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);}ctx.stroke();}});
  if(o.load){
    parts.push({d:vdepth(V,-.32,0),f:()=>{for(const a of [-.7,-.05]) vbox(ctx,V,a-.06,a+.06,-.4,.4,11,12.2,'#8a6038',{edge:false});
      vbox(ctx,V,-.78,.02,-.36,.36,12.2,17,'#7b8794',{lw:.6,deco:(f,b)=>{if(f==='F'||f==='B'){ctx.fillStyle='rgba(30,36,44,.55)';for(const cc of [-.24,0,.24]){const q=VL(V,f==='F'?b.a1:b.a0,cc,14.6+V.dz);ctx.fillRect(q[0]-1.2,q[1]-.4,2.4,.8);}}}});
      const st=VL(V,-.38,0,17.4+V.dz),en=VL(V,-.38,0,24+V.dz);ctx.strokeStyle='rgba(230,90,30,.9)';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(st[0],st[1]);ctx.lineTo(en[0],en[1]);ctx.stroke();}});
    parts.push({d:vdepth(V,-1.25,0),f:()=>{vbox(ctx,V,-1.56,-.94,-.4,.4,11,12.6,'#a8784a',{lw:.6});
      vbox(ctx,V,-1.53,-.97,-.37,.37,12.6,19.5,'#b4553a',{lw:.6,deco:(f,b)=>{ctx.strokeStyle='rgba(235,220,200,.55)';ctx.lineWidth=.45;ctx.beginPath();
        for(let z=14.2;z<19.4;z+=1.6){const q=f==='F'||f==='B'?vface(V,f,b,-.37,.37,z+V.dz,z+V.dz):vface(V,f,b,-1.53,-.97,z+V.dz,z+V.dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}ctx.stroke();}});}});}
  const stack=truckCab(ctx,V,Y,parts,o);
  drawParts(ctx,parts);
  truckWheels(ctx,V0,[1.12,-.95,-1.33],true);
  return stack;
}
function byTruck(ctx,i,j,yaw,o){const qy=qYaw(yaw),b=q4(o.bounce),l=o.load?1:0,key='byt'+qy.toFixed(3)+'|'+b+'|'+l+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX,g=>byTruckRaw(g,i,j,qy,Object.assign({},o,{bounce:b,load:l})));}
scene.by={trucks:[],fx:[],people:[],looks:null,seq:0};
function byLooks(){const s=scene.by;if(!s.looks) s.looks=Array.from({length:12},(_,k)=>mkLook(9101+k*37,{role:'worker',vest:k%4===3?'#f58a1a':'#d4ec3a',hatc:['#f7f7f2','#f2b81a','#f7f7f2','#e8742a'][k%4]}));return s.looks;}
function byUV(i,j){return [i+j,i-j];}
/* main lots: the truck parks in the lane beside the door (like the fire truck); premium / R&D lots: no truck */
function byTarget(bid){const L=LOTS[bid];if(!L||L.prem||L.tech) return null;const d=doorOf(L);return {u:Math.max(14.6,d[0]+d[1]),v:L.face==='I'?-1.2:1.2};}
function byPathTo(i,j,u1,v1){const [u0,v0]=byUV(i,j),du=u1-u0,pts=[[i,j]];
  if(Math.abs(du)>3){pts.push(lpt(u0+du*.25,v0+(v1-v0)*.4));pts.push(lpt(u0+du*.7,v1));}
  pts.push(lpt(u1,v1));return crPath(pts,8);}
/* forward when the goal is further up the lane, reverse when it is further down (the cab always faces up the lane) */
function byTruckGo(t,u1,v1,goal){
  const [u0,v0]=byUV(t.i,t.j),legs=[];
  const mk=(pa,rev)=>({pa,rev,vmax:rev?Math.min(5,Math.max(3.4,pa.tot/6)):Math.min(6.5,Math.max(3.2,pa.tot/3.6))});
  if(Math.abs(u1-u0)<3&&Math.abs(v1-v0)>.8){const m=lpt(u0+3.2,v0);legs.push(mk(crPath([[t.i,t.j],m],6),true));legs.push(mk(byPathTo(m[0],m[1],u1,v1),false));}
  else if(Math.abs(u1-u0)<.05&&Math.abs(v1-v0)<.05) legs.push(mk(densePath([[t.i,t.j],[t.i+1e-3,t.j+1e-3]]),false));
  else legs.push(mk(byPathTo(t.i,t.j,u1,v1),u1>u0));
  legs[legs.length-1].hold=()=>true;
  t.legs=legs;t.li=0;t.s=0;t.v=Math.min(t.v||0,.4);t.goal=goal;t.dest=[u1,v1];
}
function bySpawnTruck(slot){const h=BY_HOME[slot%2],p=lpt(h[0],h[1]);
  const t={slot,job:null,bid:null,crew:0,scf:0,i:p[0],j:p[1],yaw:BY_YAW,v:0,ph:Math.random()*9,id:++scene.by.seq};
  t.legs=[{pa:densePath([p,[p[0]+1e-3,p[1]+1e-3]]),hold:()=>true}];t.li=0;t.s=0;t.goal='home';return t;}
function byArrived(t){if(t.walk) return true;const L=t.legs[t.li];return t.li===t.legs.length-1&&L.pa.tot-t.s<.06&&t.v<.06;}
function bySceneUpdate(dt){
  const s=scene.by,l=byLvl();
  if(!l||!S.builders){if(s.trucks.length) s.trucks.length=0;s.people.length=0;return;}
  const jobs=S.builders.jobs||[],live={};for(const j of jobs) live[j.id]=j;
  const vehs=()=>s.trucks.filter(t=>!t.walk);
  while(vehs().length<Math.min(2,byCrews())) s.trucks.push(bySpawnTruck(vehs().length));
  for(const t of s.trucks) if(t.job&&!live[t.job]) t.job=null;
  // hand new jobs to a free truck (its crew back on board), or let a crew walk on at premium / R&D buildings
  for(const j of jobs){if(s.trucks.some(t=>t.job===j.id)) continue;
    const tg=byTarget(j.bid);
    if(!tg){s.trucks.push({walk:true,job:j.id,bid:j.bid,crew:0,scf:0,id:++s.seq});byPuff(j.bid);continue;}
    let t=s.trucks.find(t=>!t.walk&&!t.job&&t.crew<=0&&t.scf<=0&&t.goal==='home'&&byArrived(t))||s.trucks.find(t=>!t.walk&&!t.job&&t.crew<=0&&t.scf<=0);
    if(!t&&vehs().length<byCrews()){const n=vehs().length;t=bySpawnTruck(n);s.trucks.push(t);}
    if(!t) continue;
    t.job=j.id;t.bid=j.bid;byTruckGo(t,tg.u,tg.v,'site');}
  const ppl=s.people;ppl.length=0;const looks=byLooks();
  for(const t of s.trucks){
    if(!t.walk) stepVeh(t,dt);
    const j=t.job?live[t.job]:null, here=t.goal==='site'&&byArrived(t);
    if(here&&j){t.crew=Math.min(1,t.crew+dt/1.4);t.used=true;if(t.crew>=.6) t.scf=Math.min(1,t.scf+dt/1.6);}
    else if(t.scf>0) t.scf=Math.max(0,t.scf-dt/1.3);
    else t.crew=Math.max(0,t.crew-dt/(t.walk?.9:1.3));
    if(t.walk){if(!j&&t.crew<=0&&t.scf<=0){t.dead=true;byPuff(t.bid);}}
    else{
      if(!t.job&&t.crew<=0&&t.scf<=0&&t.goal==='site'){const h=BY_HOME[t.slot%2];byTruckGo(t,h[0],h[1],'home');}
      if(t.goal==='home'&&byArrived(t)) t.used=false;
      if(t.goal==='home'&&!t.job&&t.slot>=2&&byArrived(t)) t.dead=true;}
    if(t.crew>0&&t.bid&&LOTS[t.bid]) byCrewPeople(t,j,looks,ppl);
  }
  if(s.trucks.some(t=>t.dead)) s.trucks=s.trucks.filter(t=>!t.dead);
  s.fx=s.fx.filter(f=>(f.t+=dt)<2.2);
}
/* builders around the scaffold: two on the ground, one up on the deck */
function bySpots(bid){const L=LOTS[bid],B=lotBox(L),f=L.face||'I',deck=10;
  const at=(fr,o)=>f==='I'?[B.i1+o,B.j0+B.bs*fr]:[B.i0+B.bs*fr,B.j1+o];
  return [{p:at(.14,.5),z:0},{p:at(.52,.5),z:0},{p:at(.34,.17),z:deck}];}
function byCrewPeople(t,j,looks,out){
  const sp=bySpots(t.bid),L=LOTS[t.bid],f=L.face||'I',n=byLvl()>=4?3:2,going=!!j;
  for(let k=0;k<Math.min(n,sp.length);k++){const S0=sp[k],q=Math.min(1,t.crew*1.3-k*.15);if(q<=0) continue;
    let st;
    if(t.walk) st=S0.p; else {const dx=S0.p[0]-t.i,dy=S0.p[1]-t.j,d=Math.hypot(dx,dy)||1;st=[t.i+dx/d*.55,t.j+dy/d*.55];}
    const i=lerp(st[0],S0.p[0],t.walk?1:q),j2=lerp(st[1],S0.p[1],t.walk?1:q);
    const atSpot=q>=1||t.walk, lift=atSpot?S0.z*Math.min(1,t.scf*1.6):0;
    let pose,fx,back;
    if(atSpot){pose=!j||j.st==='wait'?'look':'hammer';fx=f==='I'?-1:1;back=true;}
    else{const a=P(st[0],st[1]),b=P(S0.p[0],S0.p[1]),sg=going?1:-1;fx=(b[0]-a[0])*sg>=0?1:-1;back=(b[1]-a[1])*sg<0;pose=going?'carry':'walk';}
    if(t.walk&&t.crew<1){if(pose==='hammer') pose='look';}
    out.push({i,j:j2,lift,pose,fx,back,look:looks[(t.id*3+k)%looks.length],ph:scene.t*(pose==='hammer'?8.6:7)+k*2.1+t.id,k,bid:t.bid,alpha:t.walk?Math.min(1,t.crew*2):1});}
}
function byPuff(bid){if(!scene.ctx) return;const L=LOTS[bid];if(!L) return;for(const s of bySpots(bid)){const p=P(s.p[0],s.p[1],6);for(let k=0;k<7;k++) emitP(p[0]+(Math.random()-.5)*16,p[1]+(Math.random()-.5)*8,'poof');}}
function byDoneFx(j,n){if(typeof scene==='undefined'||!scene.ctx||n<1) return;scene.by.fx.push({bid:j.bid,n,t:0});
  const L=LOTS[j.bid];if(!L) return;const p=P(L.ci,L.cj,18);for(let k=0;k<16;k++) emitP(p[0]+(Math.random()-.5)*70,p[1]+(Math.random()-.5)*26,'poof');}
function byPoof(){if(typeof scene==='undefined'||!scene.ctx) return;const p=P(BYZ.ci,BYZ.cj,14);for(let k=0;k<30;k++) emitP(p[0]+(Math.random()-.5)*110,p[1]+(Math.random()-.5)*44,'poof');}

/* ---------- ground (baked into the ground chunks): gravel pad with tyre tracks ---------- */
function byGround(ctx){
  const {i0,i1,j0,j1}=BYZ, G=SEAS===3?'#e6eaed':'#b9ad94', G2=SEAS===3?'#eef1f3':'#c6bba3';
  fillP(ctx,[P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)].map(p=>[p[0],p[1]+3]),SEAS===3?'#c9d0d6':'#9a8e76');
  fillP(ctx,[P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)],G);
  fillP(ctx,[P(i0+.12,j0+.12),P(i1-.12,j0+.12),P(i1-.12,j1-.12),P(i0+.12,j1-.12)],G2);
  for(let k=0;k<70;k++){const h=hash2(k*13+7,k*29+3),h2=hash2(k*7+1,k*17+11);const [x,y]=P(i0+.15+h*(i1-i0-.3),j0+.15+h2*(j1-j0-.3));ell(ctx,x,y,1+h*.8,.6+h2*.4,SEAS===3?'rgba(150,160,170,.35)':(k%3?'rgba(110,98,80,.35)':'rgba(240,232,215,.45)'));}
  // tyre tracks from the gate
  ctx.strokeStyle=SEAS===3?'rgba(150,160,170,.3)':'rgba(100,86,64,.22)';ctx.lineWidth=2.2;ctx.beginPath();
  for(const o of [-.18,.18]){const a=P(i1,29.4+o),b=P(24.6,29.4+o),c=P(24.2,28.95+o);ctx.moveTo(a[0],a[1]);ctx.quadraticCurveTo(b[0],b[1],c[0],c[1]);}ctx.stroke();
}
/* ---------- parts ---------- */
function byFence(ctx,a,b,h){
  const A=P(a[0],a[1],0),B=P(b[0],b[1],0),n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/.45));
  fillP(ctx,[A,B,[B[0],B[1]-h],[A[0],A[1]-h]],'rgba(205,214,220,.22)');
  ctx.strokeStyle='rgba(120,130,140,.35)';ctx.lineWidth=.45;ctx.beginPath();
  for(let k=0;k<=n*3;k++){const f=k/(n*3),x=lerp(A[0],B[0],f),y=lerp(A[1],B[1],f);ctx.moveTo(x,y);ctx.lineTo(x+h*.5,y-h);ctx.moveTo(x,y);ctx.lineTo(x-h*.5,y-h);}ctx.stroke();
  ctx.strokeStyle='#6f7882';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(A[0],A[1]-h);ctx.lineTo(B[0],B[1]-h);ctx.moveTo(A[0],A[1]-h*.45);ctx.lineTo(B[0],B[1]-h*.45);ctx.stroke();
  ctx.fillStyle='#5f6872';for(let k=0;k<=n;k++){const f=k/n,x=lerp(A[0],B[0],f),y=lerp(A[1],B[1],f);ctx.fillRect(x-.7,y-h-1.2,1.4,h+1.2);}
}
function byCabin(ctx,i0,j0,i1,j1,z0,lit,door){
  const H=11,c='#ebe7dc',fr='#36588a';
  box(ctx,i0,j0,i1,j1,z0,z0+H,c,{top:SEAS===3?SNOW:'#d9d4c8'});
  for(const [f,K,a0,a1] of [['J',j1,i0,i1],['I',i1,j0,j1]]){
    fillP(ctx,fq(f,K,a0,a1,z0,z0+1.5),f==='J'?fr:shade(fr,.8));fillP(ctx,fq(f,K,a0,a1,z0+H-1.3,z0+H),f==='J'?fr:shade(fr,.8));
    ctx.strokeStyle='rgba(90,90,80,.13)';ctx.lineWidth=.6;ctx.beginPath();for(let a=a0+.1;a<a1-.04;a+=.1){const q=fq(f,K,a,a,z0+1.5,z0+H-1.3);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[3][0],q[3][1]);}ctx.stroke();
    fillP(ctx,fq(f,K,a0,a0+.05,z0,z0+H),f==='J'?fr:shade(fr,.8));fillP(ctx,fq(f,K,a1-.05,a1,z0,z0+H),f==='J'?fr:shade(fr,.8));}
  const w=(i1-i0-.3)/2;win(ctx,'J',j1,i0+.12,w*.8,z0+3.6,4.6,lit,'#f4f1ea');win(ctx,'J',j1,i0+.18+w,w*.8,z0+3.6,4.6,lit,'#f4f1ea');
  if(door){fillP(ctx,fq('I',i1,j0+.16,j0+.4,z0+.4,z0+8.6),'#55657a');fillP(ctx,fq('I',i1,j0+.18,j0+.38,z0+5.2,z0+8),'#9fc8dc');ell(ctx,...(()=>{const p=P(i1,j0+.35,z0+4.4);return [p[0],p[1]];})(),.5,.5,'#e8e4dc');
    win(ctx,'I',i1,j0+.5,.2,z0+4,4,lit,'#f4f1ea');}
  else win(ctx,'I',i1,j0+.22,.26,z0+4,4,lit,'#f4f1ea');
  return z0+H;
}
function byBeams(ctx,i0,j0,i1,j1){ // steel I-beams on timber bearers, three layers
  for(const jj of [j0+.05,j1-.12]) box(ctx,i0+.05,jj,i1-.05,jj+.07,0,1.6,'#8a6038',{edge:false,hl:false});
  const col=SEAS===3?'#8e9aa6':'#7b8794',w=(j1-j0)/3;
  for(let ly=0;ly<3;ly++){const z=1.6+ly*2.5;for(let k=0;k<3;k++){const a=j0+k*w+.02,b=j0+(k+1)*w-.03;box(ctx,i0,a,i1,b,z,z+2.3,col,{lw:.6,top:ly===2&&SEAS===3?SNOW:shade(col,1.15)});
      const p=P(i1,(a+b)/2,z+1.15);ctx.fillStyle='rgba(30,36,44,.55)';ctx.fillRect(p[0]-1.6,p[1]-.4,3.2,.8);}}
  // red paint marks on the ends
  ctx.fillStyle='#c8402c';for(let k=0;k<3;k++){const p=P(i1,j0+k*w+w*.5,8.2);ctx.fillRect(p[0]-.8,p[1]-.8,1.6,1.6);}
}
function byBricks(ctx,i0,j0,i1,j1,h){ // shrink-wrapped brick pallet
  box(ctx,i0,j0,i1,j1,0,1.8,'#a8784a',{lw:.6});
  const c=SEAS===3?'#b26a54':'#b4553a';box(ctx,i0+.03,j0+.03,i1-.03,j1-.03,1.8,1.8+h,c,{lw:.7});
  ctx.strokeStyle='rgba(235,220,200,.55)';ctx.lineWidth=.5;ctx.beginPath();
  for(let z=1.8+1.6;z<1.8+h;z+=1.6){for(const [f,K,a0,a1] of [['J',j1-.03,i0+.03,i1-.03],['I',i1-.03,j0+.03,j1-.03]]){const q=fq(f,K,a0,a1,z,z);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[1][0],q[1][1]);}}ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.16)';pth(ctx,fq('J',j1-.03,i0+.08,i0+.2,2.2,1.4+h));ctx.fill();
}
function byTimber(ctx,i0,j0,i1,j1){ // sawn timber stack with spacer sticks, ends showing
  const col='#d9b07a',n=4,dz=1.9;
  for(let k=0;k<n;k++){const z=k*(dz+.5);box(ctx,i0,j0,i1,j1,z+.5,z+.5+dz,col,{lw:.6,top:k===n-1&&SEAS===3?SNOW:'#e6c28e'});
    box(ctx,i0+.1,j0,i0+.18,j1,z,z+.5,'#8a6038',{edge:false,hl:false});box(ctx,i1-.18,j0,i1-.1,j1,z,z+.5,'#8a6038',{edge:false,hl:false});
    ctx.strokeStyle='rgba(120,80,40,.45)';ctx.lineWidth=.5;ctx.beginPath();for(let a=j0+.1;a<j1;a+=.1){const q=fq('I',i1,a,a,z+.5,z+.5+dz);ctx.moveTo(q[0][0],q[0][1]);ctx.lineTo(q[3][0],q[3][1]);}ctx.stroke();}
}
function bySilo(ctx,i,j){ // cement silo on legs (Lv 5)
  const r=.27;ctx.strokeStyle='#5f6872';ctx.lineWidth=1.3;ctx.beginPath();for(const [di,dj] of [[-r,0],[r,0],[0,r]]){const a=P(i+di*.8,j+dj*.8,0),b=P(i+di*.8,j+dj*.8,12);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
  const [cx,cy]=P(i,j,12);ctx.fillStyle='#b8bec4';ctx.beginPath();ctx.moveTo(cx-r*45.25,cy-2);ctx.lineTo(cx-3,cy+5);ctx.lineTo(cx+3,cy+5);ctx.lineTo(cx+r*45.25,cy-2);ctx.closePath();ctx.fill();ctx.strokeStyle=EDGE;ctx.lineWidth=.8;ctx.stroke();
  cyl(ctx,i,j,r,10,30,SEAS===3?'#dfe4e8':'#d4d8dc',SEAS===3?SNOW:null);
  const t=P(i,j,34);ctx.fillStyle='#e8742a';ctx.fillRect(t[0]-r*45.25+.6,t[1]-1.2,r*90.5-1.2,2.4);
  const m=P(i,j,24);ctx.fillStyle='#4a525c';ctx.font='900 4.4px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CEM',m[0]-1.5,m[1]);
}
function byFlood(ctx,i,j,lit){ // floodlight mast (Lv 4)
  const [x,y]=P(i,j,0);ell(ctx,x+2,y+1,4,1.8,'rgba(25,35,10,.22)');
  ctx.fillStyle='#5f6872';ctx.fillRect(x-1,y-50,2,50);ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(x-1,y-50,.6,50);
  ctx.fillStyle='#3a4048';ctx.fillRect(x-8,y-52,16,2);
  for(const dx of [-6,0,6]){ctx.fillStyle='#2a2e34';ctx.fillRect(x+dx-2.4,y-57,4.8,4.4);ctx.fillStyle=lit?'#fff4c8':'#cfd8de';ctx.fillRect(x+dx-1.8,y-56.4,3.6,3.2);}
}
function byYardSign(ctx,i,j){
  const [x,y]=P(i,j,0);ctx.fillStyle='#5a3a1e';ctx.fillRect(x-12,y-14,1.6,14);ctx.fillRect(x+10.4,y-14,1.6,14);
  ctx.fillStyle='#1e2a3a';rr(ctx,x-19,y-24,38,11,2);ctx.fill();ctx.fillStyle='#f2b81a';rr(ctx,x-18,y-23,36,9,1.6);ctx.fill();
  ctx.fillStyle='#1e2a3a';ctx.font='900 4.3px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText("BUILDERS' YARD",x,y-18.4);
}
function byBarrier(ctx,a,b){ // low red/white plastic barriers along the front edge
  const A=P(a[0],a[1],0),B=P(b[0],b[1],0),n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/.5));
  for(let k=0;k<n;k++){const f0=k/n+.02,f1=(k+1)/n-.02;const p0=[lerp(A[0],B[0],f0),lerp(A[1],B[1],f0)],p1=[lerp(A[0],B[0],f1),lerp(A[1],B[1],f1)];
    fillP(ctx,[p0,p1,[p1[0],p1[1]-5.5],[p0[0],p0[1]-5.5]],k%2?'#f4f1ea':'#d8402a','rgba(60,20,10,.4)',.6);
    fillP(ctx,[[p0[0],p0[1]-3.6],[p1[0],p1[1]-3.6],[p1[0],p1[1]-2.4],[p0[0],p0[1]-2.4]],k%2?'#d8402a':'#f4f1ea');}
}
function byYardRaw(ctx,l,lit){
  const {i0,i1,j0,j1}=BYZ;
  // back fences
  byFence(ctx,[i0+.04,j1-.05],[i0+.04,j0+.04],10);byFence(ctx,[i0+.04,j0+.04],[i1-.05,j0+.04],10);
  // back row: cement silo (Lv5), site office (two storeys from Lv3), floodlight (Lv4)
  if(l>=5) bySilo(ctx,23.72,28.42);
  let top=byCabin(ctx,24.02,28.12,25.42,28.82,0,lit,true);
  if(l>=3){// external stair + second cabin
    ctx.strokeStyle='#5f6872';ctx.lineWidth=1.1;ctx.beginPath();const s0=P(24.12,28.98,0),s1=P(24.9,28.98,11);ctx.moveTo(s0[0],s0[1]);ctx.lineTo(s1[0],s1[1]);const s2=P(24.12,29.1,0),s3=P(24.9,29.1,11);ctx.moveTo(s2[0],s2[1]);ctx.lineTo(s3[0],s3[1]);ctx.stroke();
    ctx.lineWidth=.8;ctx.beginPath();for(let k=1;k<8;k++){const f=k/8,a=P(lerp(24.12,24.9,f),28.98,11*f),b=P(lerp(24.12,24.9,f),29.1,11*f);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
    ctx.strokeStyle='#8a929a';ctx.beginPath();const r0=P(24.12,29.1,6),r1=P(24.9,29.1,17);ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();
    fillP(ctx,[P(24.85,28.82,11),P(25.42,28.82,11),P(25.42,29.12,11),P(24.85,29.12,11)],'#7a828a','rgba(30,30,30,.4)',.6);
    top=byCabin(ctx,24.06,28.14,25.38,28.8,top+.4,lit,true);}
  // roof sign
  {const K=28.62,a0=24.2,a1=25.2,z=top+.6;ctx.strokeStyle='#4a4f56';ctx.lineWidth=.9;ctx.beginPath();for(const a of [a0+.12,a1-.12]){const p=P(a,K,z),q=P(a,K,z+3);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
    fillP(ctx,fq('J',K,a0,a1,z+3,z+9.5),'#f2b81a','rgba(60,40,0,.6)',.8);
    ctx.save();fxf(ctx,'J',K,a0,z+6.25);ctx.fillStyle='#1e2a3a';ctx.font='900 5.4px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BUILD CO.',(a1-a0)*16,0);ctx.restore();
    if(l>=6){ctx.strokeStyle='#f5c84c';ctx.lineWidth=1.4;ctx.beginPath();const c=[P(24.06,28.8,top),P(25.38,28.8,top),P(25.38,28.14,top)];ctx.moveTo(c[0][0],c[0][1]);ctx.lineTo(c[1][0],c[1][1]);ctx.lineTo(c[2][0],c[2][1]);ctx.stroke();
      const f=P(25.25,28.3,top);flag(ctx,f[0],f[1],'#f5c84c');}}
  if(l>=4) byFlood(ctx,25.56,28.14,lit);
  // middle + front rows: timber, steel beams, bricks
  byTimber(ctx,23.52,29.02,24.18,29.62);
  byBeams(ctx,24.32,29.05,25.52,29.5);
  byBricks(ctx,24.32,29.8,24.86,30.32,6.4);byBricks(ctx,24.98,29.8,25.52,30.32,l>=2?8:4.8);
  // crane base (the mast itself is drawn per frame)
  if(l>=2){box(ctx,BY_CR[0]-.24,BY_CR[1]-.24,BY_CR[0]+.24,BY_CR[1]+.24,0,3,'#a8a49c',{lw:.7});}
  else byBricks(ctx,23.55,29.85,24.05,30.35,4.8);
  // front: barriers on the left edge, sign at the gate
  byBarrier(ctx,[i0+.08,j1-.04],[i1-.55,j1-.04]);
  byYardSign(ctx,i1-.12,j1-.2);
  return 0;
}
function byPlot(ctx){ // not built yet: stakes, dashed outline, sign
  const vis=byVisible(),{i0,i1,j0,j1}=BYZ,pts=[P(i0+.2,j0+.2),P(i1-.2,j0+.2),P(i1-.2,j1-.2),P(i0+.2,j1-.2)];
  ctx.setLineDash([5,4]);fillP(ctx,pts,'rgba(255,240,210,.3)',vis?'rgba(232,140,26,.95)':'rgba(120,110,90,.6)',1.6);ctx.setLineDash([]);
  for(const p of pts){ctx.fillStyle='#f07020';ctx.beginPath();ctx.moveTo(p[0],p[1]-9);ctx.lineTo(p[0]-3.4,p[1]);ctx.lineTo(p[0]+3.4,p[1]);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(p[0]-2,p[1]-5,4,1.4);}
  byBricks(ctx,24.3,29.0,24.8,29.5,4);byTimber(ctx,24.95,28.6,25.5,29.1);
  if(vis) byYardSign(ctx,i1-.12,j1-.2);
}
function drawByYard(ctx){
  const l=byLvl(); BYZ.hit=boxHit(BYZ.i0,BYZ.j0,BYZ.i1,BYZ.j1,l?(l>=3?22:16):10); BYZ.top=l?P(BYZ.ci+.55,BYZ.j1+.25,0):P(BYZ.ci,BYZ.cj,16);
  if(!l){byPlot(ctx);return;}
  const D=scene.dn,lit=D.lights>.03;
  const bx=[Math.floor((BYZ.i0-BYZ.j1)*32-14),Math.floor((BYZ.i0+BYZ.j0)*16-92),Math.ceil((BYZ.i1-BYZ.j0)*32+14),Math.ceil((BYZ.i1+BYZ.j1)*16+10)];
  const sig=l+'|'+SEAS+'|'+Math.round(D.lights*8)+'|'+(D.night>.35?1:0);
  liveSprite(ctx,'byard',bx,sig,.2,g=>byYardRaw(g,l,lit));
}
/* ---------- tower crane (per frame): lattice mast, slewing jib with trolley, hook and a load of beams ---------- */
function byCrane(ctx){
  const t=scene.t,[mi,mj]=BY_CR,H=BY_HM,h=.12,Y='#f2b81a',YD='#a8760c';
  const th=2.35+.95*Math.sin(t*.13)+.25*Math.sin(t*.051), d=[Math.cos(th),Math.sin(th)], R=2.4, RC=.9;
  const busy=S.builders&&S.builders.jobs&&S.builders.jobs.length;
  const rt=1.15+.85*(.5+.5*Math.sin(t*.29)), zh=H-12-(H-26)*(.5+.5*Math.sin(t*.37+1)); 
  // mast: three visible chords + X bracing on the two front faces
  const C=[[mi+h,mj+h],[mi-h,mj+h],[mi+h,mj-h]];
  ctx.lineCap='round';ctx.strokeStyle=YD;ctx.lineWidth=.6;ctx.beginPath();
  for(let z=3;z<H-1;z+=5){for(const [a,b] of [[C[1],C[0]],[C[0],C[2]]]){const p=P(a[0],a[1],z),q=P(b[0],b[1],z+5),r=P(b[0],b[1],z),s=P(a[0],a[1],z+5);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.moveTo(r[0],r[1]);ctx.lineTo(s[0],s[1]);}}
  ctx.stroke();
  ctx.strokeStyle=Y;ctx.lineWidth=1.3;ctx.beginPath();for(const c of C){const p=P(c[0],c[1],3),q=P(c[0],c[1],H);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=.5;ctx.beginPath();{const p=P(C[1][0],C[1][1],3),q=P(C[1][0],C[1][1],H);ctx.moveTo(p[0]+.5,p[1]);ctx.lineTo(q[0]+.5,q[1]);}ctx.stroke();
  // slewing unit + operator cab (on the jib side)
  box(ctx,mi-.17,mj-.17,mi+.17,mj+.17,H,H+3,'#3a4048',{lw:.6});
  const ci=mi+d[0]*.28-d[1]*.12,cj=mj+d[1]*.28+d[0]*.12;box(ctx,ci-.11,cj-.11,ci+.11,cj+.11,H-5,H+1.5,Y,{lw:.6});
  {const p=P(ci+.11,cj,H-1.6),q=P(ci,cj+.11,H-1.6);ctx.fillStyle='#9fd0e6';ctx.fillRect(p[0]-2.5,p[1]-2,2.6,2.6);ctx.fillRect(q[0],q[1]-2,2.6,2.6);}
  // tower head (A-frame) + pendants
  const ap=P(mi,mj,H+17), tip=P(mi+d[0]*R,mj+d[1]*R,H+4), tipT=P(mi+d[0]*R,mj+d[1]*R,H+5.5), cw=P(mi-d[0]*RC,mj-d[1]*RC,H+5);
  ctx.strokeStyle=Y;ctx.lineWidth=1.2;ctx.beginPath();for(const s of [-1,1]){const b=P(mi+s*d[1]*.12,mj-s*d[0]*.12,H+3);ctx.moveTo(b[0],b[1]);ctx.lineTo(ap[0],ap[1]);}ctx.stroke();
  ctx.strokeStyle='rgba(40,40,44,.75)';ctx.lineWidth=.55;ctx.beginPath();const pm=P(mi+d[0]*R*.62,mj+d[1]*R*.62,H+6.5);ctx.moveTo(ap[0],ap[1]);ctx.lineTo(pm[0],pm[1]);ctx.moveTo(ap[0],ap[1]);ctx.lineTo(cw[0],cw[1]);ctx.stroke();
  // jib: bottom + top chords, zigzag web
  const J=(f,z)=>P(mi+d[0]*R*f,mj+d[1]*R*f,z), K=(f,z)=>P(mi-d[0]*RC*f,mj-d[1]*RC*f,z);
  ctx.strokeStyle=YD;ctx.lineWidth=.6;ctx.beginPath();for(let k=0;k<12;k++){const f0=k/12,f1=(k+1)/12,ztop=f=>H+8-3*f;const a=J(f0,H+3),b=J((f0+f1)/2,ztop((f0+f1)/2)),c=J(f1,H+3);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);}ctx.stroke();
  ctx.strokeStyle=Y;ctx.lineWidth=1.25;ctx.beginPath();{const a=J(0,H+3),b=J(1,H+3);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);const c=J(0,H+8),e=J(1,H+5);ctx.moveTo(c[0],c[1]);ctx.lineTo(e[0],e[1]);
    const f=K(0,H+3),g=K(1,H+3);ctx.moveTo(f[0],f[1]);ctx.lineTo(g[0],g[1]);const f2=K(0,H+6),g2=K(1,H+5);ctx.moveTo(f2[0],f2[1]);ctx.lineTo(g2[0],g2[1]);}ctx.stroke();
  // counterweight blocks
  {const ui=mi-d[0]*RC*.82,uj=mj-d[1]*RC*.82;box(ctx,ui-.11,uj-.11,ui+.11,uj+.11,H-3,H+3,'#9a968e',{lw:.6});}
  // trolley, hoist rope, hook and load
  const tr=J(rt/R,H+3),hk=P(mi+d[0]*rt,mj+d[1]*rt,zh);
  ctx.fillStyle='#3a4048';ctx.fillRect(tr[0]-2,tr[1]-.5,4,2.2);
  ctx.strokeStyle='rgba(40,40,44,.8)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(tr[0]-.8,tr[1]+1.6);ctx.lineTo(hk[0]-.8,hk[1]);ctx.moveTo(tr[0]+.8,tr[1]+1.6);ctx.lineTo(hk[0]+.8,hk[1]);ctx.stroke();
  ctx.fillStyle='#e8742a';ctx.fillRect(hk[0]-1.6,hk[1],3.2,2.2);
  if(busy||Math.sin(t*.37+1)>-.2){const li=mi+d[0]*rt,lj=mj+d[1]*rt;ctx.strokeStyle='rgba(40,40,44,.7)';ctx.lineWidth=.45;ctx.beginPath();const a=P(li-.22,lj,zh-6),b=P(li+.22,lj,zh-6);ctx.moveTo(hk[0],hk[1]+2);ctx.lineTo(a[0],a[1]);ctx.moveTo(hk[0],hk[1]+2);ctx.lineTo(b[0],b[1]);ctx.stroke();
    box(ctx,li-.26,lj-.08,li+.26,lj+.08,zh-8.6,zh-6,'#7b8794',{lw:.5});box(ctx,li-.26,lj-.08,li+.26,lj+.08,zh-11.2,zh-8.6,'#7b8794',{lw:.5});}
  // aviation lights
  const on=Math.floor(t*1.3)%2===0;ell(ctx,ap[0],ap[1]-1,1.3,1.3,on?'#ff4a3a':'#8a1e14');ell(ctx,tipT[0],tipT[1]-.5,1.2,1.2,on?'#ff4a3a':'#8a1e14');
  ctx.lineCap='butt';
  scene.by.craneTips=[ap,tipT,on];
}
/* ---------- scaffolding (cached per building and assembly step) ---------- */
function byScaffoldRaw(ctx,L,r){
  const B=lotBox(L),f=L.face||'I',H=Math.min(21,Math.max(13,(L.H||30)*.6)),hs=H*r; if(hs<2) return;
  const A0=f==='I'?B.j0+B.bs*.04:B.i0+B.bs*.04, A1=f==='I'?B.j0+B.bs*.66:B.i0+B.bs*.66, KI=(f==='I'?B.i1:B.j1)+.05, KO=KI+.3;
  const Pt=(o,a,z)=>f==='I'?P(o,a,z):P(a,o,z), n=4, as=Array.from({length:n},(_,k)=>lerp(A0,A1,k/(n-1)));
  const decks=[10,20].filter(z=>z<=hs+.5);
  ctx.lineCap='round';
  // inner poles
  ctx.strokeStyle='#6f7a84';ctx.lineWidth=1.3;ctx.beginPath();for(const a of as){const p=Pt(KI,a,0),q=Pt(KI,a,hs);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
  // decks (boards) + toe boards
  for(const z of decks){fillP(ctx,[Pt(KI,A0,z),Pt(KO,A0,z),Pt(KO,A1,z),Pt(KI,A1,z)],SEAS===3?'#eeeae2':'#dcaa62','rgba(70,45,20,.7)',.8);
    ctx.strokeStyle='rgba(90,60,25,.35)';ctx.lineWidth=.45;ctx.beginPath();for(const o of [.1,.2]){const p=Pt(KI+o,A0,z),q=Pt(KI+o,A1,z);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();
    fillP(ctx,[Pt(KO,A0,z),Pt(KO,A1,z),Pt(KO,A1,z+1.4),Pt(KO,A0,z+1.4)],'#e8c43a');}
  // outer poles
  const top=hs+(decks.length&&hs>=10?5:0);
  for(const [w,c] of [[2.6,'rgba(40,46,52,.75)'],[1.5,'#d2d9df']]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();for(const a of as){const p=Pt(KO,a,0),q=Pt(KO,a,top);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}ctx.stroke();}
  // ledgers + guard rails + braces
  ctx.strokeStyle='#9aa4ad';ctx.lineWidth=1.1;ctx.beginPath();
  for(const z of decks) for(const zz of [z,z+5]){const p=Pt(KO,A0,zz),q=Pt(KO,A1,zz);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}
  for(let k=0;k<n-1;k++){const z1=Math.min(hs,11);const p=Pt(KO,as[k],0),q=Pt(KO,as[k+1],z1);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);
    if(hs>=20){const p2=Pt(KO,as[k+1],11),q2=Pt(KO,as[k],Math.min(hs,22));ctx.moveTo(p2[0],p2[1]);ctx.lineTo(q2[0],q2[1]);}}
  for(const z of decks){for(const a of as){const p=Pt(KI,a,z),q=Pt(KO,a,z);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}}
  ctx.stroke();
  // base plates
  ctx.fillStyle='#5f6872';for(const a of as){const p=Pt(KO,a,0);ctx.fillRect(p[0]-1.4,p[1]-.6,2.8,1.2);}
  // safety banner on the lowest rail
  if(hs>=12){const a0=lerp(A0,A1,.36),a1=lerp(A0,A1,.64);fillP(ctx,[Pt(KO+.01,a0,6.2),Pt(KO+.01,a1,6.2),Pt(KO+.01,a1,10.2),Pt(KO+.01,a0,10.2)],'#e8742a','rgba(80,30,0,.5)',.5);
    fillP(ctx,[Pt(KO+.01,a0,7.6),Pt(KO+.01,a1,7.6),Pt(KO+.01,a1,8.6),Pt(KO+.01,a0,8.6)],'#f6f3ea');}
  ctx.lineCap='butt';
}
const BY_SBOX=[-150,-90,150,70];
function byScaffold(ctx,bid,r){const L=LOTS[bid];if(!L) return;const A=P(L.ci,L.cj),q=Math.max(1,Math.round(r*12));
  sprite(ctx,'byscf'+bid+'|'+lotBox(L).bs.toFixed(2)+'|'+(L.H||30)+'|'+q+'|'+SEAS,A[0],A[1],BY_SBOX,(g,ax,ay)=>{g.save();g.translate(ax-A[0],ay-A[1]);byScaffoldRaw(g,L,q/12);g.restore();});}
/* ---------- scene objects ---------- */
function byDraw(ctx,objs,inView){
  const [px,py]=P(BYZ.ci,BYZ.cj),l=byLvl();
  if(byVisible()&&inView(px,py,200)) objs.push({k:BYZ.i0+BYZ.j0+.4,f:()=>drawByYard(ctx)});
  if(!l) return;
  {const [x,y]=P(BY_CR[0],BY_CR[1]);if(l>=2&&inView(x,y-60,150)) objs.push({k:BY_CR[0]+BY_CR[1]+.05,f:()=>byCrane(ctx)});}
  const s=scene.by;
  for(const t of s.trucks){
    if(t.scf>.02&&t.bid&&LOTS[t.bid]){const L=LOTS[t.bid],B=lotBox(L),f=L.face||'I';const [x,y]=P(L.ci,L.cj);
      if(inView(x,y,160)){const k=f==='I'?B.i1+.2+B.j0+B.bs*.04:B.i0+B.bs*.04+B.j1+.2;const r=t.scf,bid=t.bid;objs.push({k,f:()=>byScaffold(ctx,bid,r)});}}
    if(t.walk||t.i===undefined) continue;const [x,y]=P(t.i,t.j);if(!inView(x,y,110)) continue;
    objs.push({k:t.i+t.j,f:()=>{const st=byTruck(ctx,t.i,t.j,t.yaw,{brake:t.brake,bounce:vehBounce(t),load:t.job||t.goal==='home'&&!t.used?1:0});exhaust(st,t);
      if(t.v>.05||(t.job&&t.goal==='site')){const V=VF(t.i,t.j,t.yaw,0),p=VL(V,.67,0,37.6),on=Math.floor(scene.t*5+t.id)%2===0;ell(ctx,p[0],p[1],1.7,1.2,on?'#ffb21a':'#a8640c');}}});}
  for(const p of s.people){const [x,y]=P(p.i,p.j);if(!inView(x,y,40)) continue;
    objs.push({k:p.i+p.j+.02+(p.lift?.01:0),f:()=>{if(p.alpha<1) ctx.globalAlpha=p.alpha;human(ctx,x,y,{look:p.look,fx:p.fx,back:p.back,pose:p.pose,ph:p.ph,lift:p.lift});ctx.globalAlpha=1;}});}
}
function byOverlays(ctx){
  const t=scene.t,l=byLvl();
  if(byVisible()&&BYZ.top){const [sx,sy]=w2s(BYZ.top[0],BYZ.top[1]);
    if(sx>-90&&sx<scene.w+90&&sy>-50&&sy<scene.h+50){
      if(!l){const c=byCost(),can=byUnlocked()&&S.coins+1e-9>=c,bob=can?Math.sin(t*4)*2.5:0;
        if(byUnlocked()){pill(ctx,sx,sy-12+bob,'🏗️ Builders\' Yard',{bg:can?'#d88a10':'rgba(43,27,14,.75)',fg:'#fff',fs:11,stroke:can?'#ffe0a0':null});pill(ctx,sx,sy+8+bob,fmt(c),{icon:'coin',bg:'#fff6e0',fg:can?'#3b7f27':'#8a6a40',fs:10.5,stroke:can?'#4fa633':'#d9b98a'});}
        else pill(ctx,sx,sy,'🔒 Builders\' Yard · build 3 buildings',{fs:10,bg:'rgba(43,27,14,.6)'});}
      else if(scene.cam.z>=scene.cam.fitZ*.75){const st=byStatus(),B=S.builders;
        if(st.k==='off') pill(ctx,sx,sy,'⏸ Builders off',{fs:10.5,bg:'rgba(43,27,14,.7)'});
        else if(st.k==='ok') pill(ctx,sx,sy,`🏗️ ${B.jobs.length}/${byCrews()} crews out`,{fs:10.5,bg:'rgba(120,80,6,.82)',fg:'#ffe58a'});
        else pill(ctx,sx,sy,`🏗️ Lv ${l} · ${st.k==='idle'?'no buildings allowed':'waiting for coins'}`,{fs:10,bg:'rgba(43,27,14,.7)',fg:'#ffe9c0'});}}}
  if(!l||!S.builders) return;
  // progress over every building with a crew on it
  for(const j of S.builders.jobs){const L=LOTS[j.bid];if(!L||!L.top||onFire(j.bid)) continue;if(L.prem&&!S.premium.lvl) continue;
    const [sx,sy]=w2s(L.top[0],L.top[1]);if(sx<-60||sx>scene.w+60||sy<-50||sy>scene.h+60) continue;
    const wait=j.st==='wait',p=Math.min(1,j.t/j.dur),y=sy-38;
    const r=pill(ctx,sx,y,wait?`⏳ +${j.n} Lv · coins`:`🏗️ +${j.n} Lv`,{fs:10.5,bg:wait?'rgba(120,70,10,.85)':'rgba(242,184,26,.95)',fg:wait?'#ffe0a0':'#2a1a04',stroke:wait?null:'#fff2c0',padX:10,padY:6});
    const w=48,by=y+r[3]/2+2;ctx.fillStyle='rgba(30,20,5,.72)';rr(ctx,sx-w/2,by,w,5,2.5);ctx.fill();ctx.fillStyle=wait?'#e8a43a':'#8fd14f';rr(ctx,sx-w/2+1,by+1,(w-2)*Math.max(.04,p),3,1.5);ctx.fill();}
  for(const f of scene.by.fx){const L=LOTS[f.bid];if(!L||!L.top) continue;const [sx,sy]=w2s(L.top[0],L.top[1]);const k=f.t/2.2;ctx.globalAlpha=Math.max(0,1-k*k);
    pill(ctx,sx,sy-40-k*38,`⬆ +${f.n} Lv`,{bg:'#3b8f2a',fg:'#fff',fs:12.5,stroke:'#d8f5b0',padX:12,padY:7});ctx.globalAlpha=1;}
}
function byLights(out){
  const l=byLvl();if(!l) return;
  {const [x,y]=P(24.7,28.95,0);out.push({x,y,rx:40,ry:18,c:'warm',a:.6});}
  if(l>=4){const [x,y]=P(25.56,28.14,56);for(const dx of [-6,0,6]) out.push({x:x+dx,y:y-.5,rx:7,ry:7,c:'cool',a:.95,core:1});const [gx,gy]=P(24.6,29.6,0);out.push({x:gx,y:gy,rx:96,ry:48,c:'cool',a:.7});}
  const ct=scene.by.craneTips;if(l>=2&&ct&&ct[2]){for(const p of [ct[0],ct[1]]) out.push({x:p[0],y:p[1]-1,rx:11,ry:11,c:'red',a:.9,core:1});}
  for(const t of scene.by.trucks){if(t.walk||t.i===undefined) continue;if(t.v>.05||t.goal==='site') vehLights(out,t,1.62,-1.64);
    if(t.v>.05||(t.job&&t.goal==='site')){if(Math.floor(scene.t*5+t.id)%2===0){const V=VF(t.i,t.j,t.yaw,0),p=VL(V,.67,0,37.6);out.push({x:p[0],y:p[1],rx:22,ry:22,c:'gold',a:.8});}}}
  for(const t of scene.by.trucks) if(t.scf>.3&&t.bid&&LOTS[t.bid]){const L=LOTS[t.bid];const [x,y]=P(L.ci,L.cj,0);out.push({x,y,rx:60,ry:30,c:'warm',a:.35*t.scf});}
}
