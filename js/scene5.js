'use strict';

/* ---------------- dynamic entities ---------------- */
function inputResOf(b,k){const ks=Object.keys(b.inp);return ks[k%ks.length];}
function workersFor(id){const st=S.buildings[id];if(!st.lvl) return 0;return Math.min(5,1+msCount(st.lvl));}
function workerRoute(w){
  const L=LOTS[w.bid]; let src;
  if(w.res==='logs') src=LOGPICK;
  else { let sid=SRC_OF[w.res]; if(w.res==='chips'&&!S.buildings.chipper.lvl&&S.buildings.sawmill.lvl) sid='sawmill'; src=convOf(LOTS[sid]).end; }
  const dst=doorOf(L);
  return mkPath([src,lanePt(src,w.off),lanePt(dst,w.off),dst]);
}
function mkPath(pts){const seg=[];let tot=0;for(let k=1;k<pts.length;k++){const d=Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]);seg.push(d);tot+=d;}return {pts,seg,tot:Math.max(.01,tot)};}
function pathAt(pa,f){let d=Math.max(0,Math.min(1,f))*pa.tot;for(let k=0;k<pa.seg.length;k++){if(d<=pa.seg[k]||k===pa.seg.length-1){const a=pa.pts[k],b=pa.pts[k+1],t=pa.seg[k]?Math.min(1,d/pa.seg[k]):0;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,b[0]-a[0],b[1]-a[1]];}d-=pa.seg[k];}return [pa.pts[0][0],pa.pts[0][1],0,0];}
let yardSigV='';
/* ---------- vehicle paths: dense polylines with arc length, accel/brake motion ---------- */
function densePath(pts){const L=[0];for(let k=1;k<pts.length;k++)L.push(L[k-1]+Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]));return {pts,L,tot:Math.max(.001,L[L.length-1])};}
function crPath(pts,steps){const out=[];for(let k=0;k<pts.length-1;k++){const p0=pts[Math.max(0,k-1)],p1=pts[k],p2=pts[k+1],p3=pts[Math.min(pts.length-1,k+2)];
  for(let s=0;s<steps;s++){const t=s/steps,t2=t*t,t3=t2*t;out.push([0,1].map(d=>.5*((2*p1[d])+(-p0[d]+p2[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t2+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t3)));}}
  out.push(pts[pts.length-1]);return densePath(out);}
function arcPts(fn,n){const o=[];for(let k=0;k<=n;k++)o.push(fn(k/n));return o;}
function dpAt(pa,s){s=Math.max(0,Math.min(pa.tot,s));let lo=0,hi=pa.L.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(pa.L[m]<=s)lo=m;else hi=m;}
  const a=pa.pts[lo],b=pa.pts[hi],seg=pa.L[hi]-pa.L[lo]||1,t=(s-pa.L[lo])/seg;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[1]-a[1],b[0]-a[0])];}
function angLerp(a,b,k){let d=b-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return a+d*k;}
/* vehicle: {legs:[{pa,rev,vmax,hold:(veh,dt)=>bool}], li, s, v} — hold() keeps it parked at a leg's end */
function stepVeh(veh,dt,limit){
  const leg=veh.legs[veh.li]; if(!leg){veh.done=true;return;}
  const rem=leg.pa.tot-veh.s, lim=Math.min(rem,limit===undefined?1e9:limit), vmax=leg.vmax||3.4;
  const tgt=Math.min(vmax,Math.sqrt(Math.max(0,2*2.2*(lim-.03))));
  const v0=veh.v; if(veh.v<tgt) veh.v=Math.min(tgt,veh.v+1.9*dt); else veh.v=Math.max(tgt,veh.v-4.5*dt);
  veh.brake=veh.v<v0-1e-4||veh.v<.05; veh.accel=veh.v>v0+1e-4;
  veh.s=Math.min(leg.pa.tot,veh.s+veh.v*dt);
  if(leg.pa.tot-veh.s<.03&&veh.v<.25){veh.v=0;veh.s=leg.pa.tot;veh.wait=(veh.wait||0)+dt;
    if(!leg.hold||!leg.hold(veh,dt)){veh.li++;veh.s=0;veh.wait=0;if(leg.done) leg.done(veh);}}
  const L2=veh.legs[Math.min(veh.li,veh.legs.length-1)];const p=dpAt(L2.pa,veh.li<veh.legs.length?veh.s:L2.pa.tot);
  veh.i=p[0];veh.j=p[1];const yaw=p[2]+(L2.rev?Math.PI:0);veh.yaw=veh.yaw===undefined?yaw:angLerp(veh.yaw,yaw,Math.min(1,dt*14));
  veh.ph=(veh.ph||Math.random()*9)+dt*(2+veh.v*3);
}
function vehBounce(veh){return Math.sin(veh.ph*4.3)*.55*Math.min(1,veh.v/1.5)+Math.sin(scene.t*38+veh.ph)*.12;}
/* log trucks: dirt road in, self-unload beside the log yard, turn in the bulb at the top of the lane, drive out */
const LOGT={inn:null,out:null};
function logTruckLegs(){
  if(!LOGT.inn){LOGT.inn={pa:densePath([[-27,8.46],[3.3,8.46]]),vmax:3.6};
    LOGT.out={pa:crPath([[3.3,8.46],[5.4,8.46],[6.9,8.7],[7.95,8.05],[7.3,7.15],[5.6,7.54],[2,7.54],[-28,7.54]],10),vmax:3.6};}
  return [{...LOGT.inn,hold:(v)=>{v.unload=v.wait;return v.wait<5.2;}},{...LOGT.out}];
}
function mkLogTruck(k,g){const v={kind:'log',k,legs:logTruckLegs(),li:0,s:0,v:0,col:['#c8452a','#2f6fb0','#3d7a3a'][k%3],load:1,unload:0,delay:0};
  // place along the route (global progress g) so the world starts populated
  const L0=v.legs[0].pa.tot; if(g>L0){v.li=1;v.s=Math.min(g-L0,v.legs[1].pa.tot-.1);v.load=0;v.v=2.5;} else {v.s=g;v.v=g>0?3:0;}
  return v;}
/* shipping trucks: road -> reverse into the dock bay -> load -> pull out and leave */
const DOCKB=[30.45,20.0], DOCK_R=1.0;
function dockTruckLegs(){
  const A=[DOCKB[0]+DOCK_R,DOCKB[1]+DOCK_R];
  return [
    {pa:densePath([[A[0],-18],[A[0],A[1]-3.6]]),vmax:3.6,lane:true,hold:(v)=>scene.dockTrucks.some(o=>o!==v&&(o.li===1||o.li===2||o.li===3||(o.li===4&&o.s<2.2)))},
    {pa:densePath([[A[0],A[1]-3.6],[A[0],A[1]]]),vmax:2.2,lane:true},
    {pa:densePath(arcPts(t=>{const th=t*Math.PI/2;return [A[0]-DOCK_R*(1-Math.cos(th)),A[1]-DOCK_R*Math.sin(th)];},12)),rev:true,vmax:1.1},
    {pa:densePath([[DOCKB[0],DOCKB[1]],[DOCKB[0]+.001,DOCKB[1]]]),vmax:.5,hold:(v,dt)=>{v.doors=Math.min(1,(v.doors||0)+dt*1.6);return v.load<1||v.doors<1;}},
    {pa:densePath([...arcPts(t=>{const th=(1-t)*Math.PI/2;return [DOCKB[0]+DOCK_R*Math.cos(th),DOCKB[1]+DOCK_R*(1-Math.sin(th))];},12),[A[0],60]]),vmax:3.8}
  ];
}
const DOCK_COLS=[['#2f6fb0','#f3f0e8','#2f6f9a'],['#c8452a','#f3f0e8','#c8452a'],['#3d7a3a','#eef2e6','#3d7a3a'],['#e8a020','#f6f1e4','#b06a10'],['#6a4a9a','#f1eef6','#6a4a9a']];
function mkDockTruck(atDock){const c=DOCK_COLS[Math.floor(Math.random()*DOCK_COLS.length)];
  const v={kind:'dock',legs:dockTruckLegs(),li:0,s:0,v:0,col:c[0],box:c[1],stripe:c[2],load:0,acc:0,doors:0};
  if(atDock===true){v.li=3;v.load=.3;v.doors=1;} else if(atDock==='q'){v.s=v.legs[0].pa.tot-.01;} return v;}
/* ---------- forest crew ---------- */
const LANDINGS={T:{i:-1.05,j:3.95,n:3},L:{i:-.6,j:22.6,n:2}};
const CAMP={i:4.3,j:-1.2};
function zoneTrees(z){scene._zt=scene._zt||{};if(scene._zt[z]) return scene._zt[z];
  const r=scene.dynTrees.filter(t=>{const u=t.i+t.j,v=t.i-t.j;return z==='T'?(u>=-2.9&&u<=.95&&Math.abs(v)<=10.5):(v>=-26.2&&v<=-22.6&&u>=14&&u<=34);});
  return scene._zt[z]=r;}
function workSpot(tr,side){return side==='R'?[tr.i,tr.j-.62]:[tr.i-.62,tr.j];}
function faceTo(p,di,dj){const sx=di-dj,sy=di+dj;if(Math.abs(sx)>.01)p.fx=sx>=0?1:-1;p.back=sy<-.01;}
function walkTo(p,dt,sp){const di=p.ti-p.i,dj=p.tj-p.j,d=Math.hypot(di,dj);if(d<.04){p.i=p.ti;p.j=p.tj;return true;}const st=Math.min(d,sp*dt);p.i+=di/d*st;p.j+=dj/d*st;faceTo(p,di,dj);p.ph+=dt*sp*7.5;return false;}
function pickTree(p){const c=zoneTrees(p.zone).filter(t=>!t.claim&&!t.stump&&!t.fall&&!t.down&&(t.grow||1)>=1);if(!c.length) return null;
  c.sort((a,b)=>Math.hypot(a.i-p.i,a.j-p.j)-Math.hypot(b.i-p.i,b.j-p.j));return c[Math.floor(Math.random()*Math.min(3,c.length))];}
function mkJack(id,type,zone){const lg=LANDINGS[zone];const p={id,type,zone,look:mkLook(id*31+(type==='saw'?500:0),{role:type==='saw'?'saw':'jack'}),
  st:'pick',i:lg.i+(Math.random()-.5)*2,j:lg.j+(Math.random()-.5)*2,ti:0,tj:0,tm:0,ph:Math.random()*6,fx:1,back:false,pose:'stand',tree:null};return p;}
function stepJack(p,dt){
  const tr=p.tree;
  switch(p.st){
    case 'pick':{const t=pickTree(p);if(!t){p.st='idle';p.tm=2+Math.random()*2;p.pose='look';break;}
      t.claim=p.id;p.tree=t;p.side=hash2(Math.round(t.i*10),Math.round(t.j*10))<.5?'R':'L';const w=workSpot(t,p.side);p.ti=w[0];p.tj=w[1];p.st='walk';break;}
    case 'walk': p.pose='walk'; if(walkTo(p,dt,1.05)){p.st='work';p.tm=p.type==='saw'?4+Math.random()*2:6+Math.random()*3;p.fx=p.side==='R'?-1:1;p.back=false;p.wt=Math.random();} break;
    case 'work':{p.pose=p.type==='saw'?'saw':'chop';p.fx=p.side==='R'?-1:1;p.back=false;
      if(p.type==='axe'){const u0=p.wt%1;p.wt+=dt/1.05;const u1=p.wt%1;if((u0<.57&&u1>=.57)||(u1<u0&&u1>=.57)){tr.shake=1;const b=P(tr.i,tr.j,5);for(let k=0;k<4;k++) emitP(b[0]+(p.side==='R'?4:-4),b[1],'chip');}}
      else if(Math.random()<dt*18){const b=P(tr.i,tr.j,4);emitP(b[0]+(p.side==='R'?5:-5),b[1],'saw');}
      p.tm-=dt;if(p.tm<=0){tr.fdir=p.side==='R'?-1:1;tr.fall=.001;tr.shake=0;p.st='watch';p.tm=1.8;p.pose='look';
        const top=P(tr.i,tr.j,52*tr.s);scene.floats.push({x:top[0],y:top[1],text:'Timber!',t:0,dur:1.5,col:'#fff2c0',timber:true});sfxSoft('timber');}
      break;}
    case 'watch': p.pose='stand'; p.tm-=dt; if(tr.down){const c=trunkMid(tr);p.ti=c[0]-.42;p.tj=c[1]-.42;p.st='tobuck';} break;
    case 'tobuck': p.pose='walk'; if(walkTo(p,dt,1.0)){p.st='buck';p.tm=1.8;p.wt=Math.random();p.fx=tr.fdir||1;p.back=false;} break;
    case 'buck':{p.pose=p.type==='saw'?'saw':'chop';p.fx=tr.fdir||1;p.back=false;p.wt+=dt/0.95;tr.buck=Math.min(1,(tr.buck||0)+dt/1.8);
      if(p.type==='saw'&&Math.random()<dt*16){const c=trunkMid(tr),b=P(c[0],c[1],3);emitP(b[0],b[1],'saw');}
      p.tm-=dt;if(p.tm<=0){tr.down=0;tr.buck=0;tr.stump=1;tr.claim=null;tr.planted=false;p.tree=null;const lg=LANDINGS[p.zone];p.ti=lg.i+(Math.random()-.5)*.9;p.tj=lg.j+.4+(Math.random()-.5)*.6;p.st='carry';}
      break;}
    case 'carry': p.pose='carry'; if(walkTo(p,dt,.82)){const lg=LANDINGS[p.zone];lg.n=Math.min(10,lg.n+1);const q=P(lg.i,lg.j,6);for(let k=0;k<5;k++)emitP(q[0],q[1],'dust');
        if(Math.random()<.4){p.st='rest';p.tm=2.2;p.pose='brow';}else p.st='pick';} break;
    case 'rest': p.pose='brow'; p.tm-=dt; if(p.tm<=0) p.st='pick'; break;
    case 'idle': p.tm-=dt; if(p.tm<=0) p.st='pick'; break;
  }
}
function trunkMid(tr){const dx=18*tr.s*(tr.fdir||1);return [tr.i+dx/64,tr.j-dx/64];}
function sfxSoft(){/* reserved */}
function stepForeman(p,dt){
  if(p.st==='walk'){p.pose='walk';if(walkTo(p,dt,.7)){p.st='check';p.tm=3+Math.random()*3;p.pose=Math.random()<.65?'clip':'point';p.back=p.pose==='point';if(p.pose==='point')p.fx=Math.random()<.5?1:-1;}}
  else {p.tm-=dt;if(p.tm<=0){const W=[[.4,2.7],[-2.3,4.4],[2.2,1.4],[-.9,2.2]];const w=W[Math.floor(Math.random()*W.length)];p.ti=w[0];p.tj=w[1];p.st='walk';}}
}
function syncEntities(){
  // yard workers (v1.3 system, walking the iso lane)
  const ysig=MAIN_BLD.map(b=>b.id+workersFor(b.id)).join(',')+'|'+(S.buildings.chipper.lvl>0)+(S.buildings.sawmill.lvl>0);
  if(ysig!==yardSigV){yardSigV=ysig; const old=scene.workers; scene.workers=[];
    for(const b of MAIN_BLD){const n=workersFor(b.id);for(let k=0;k<n;k++){
      const prev=old.find(o=>o.bid===b.id&&o.k===k);
      const w=prev||{bid:b.id,k,res:inputResOf(b,k),p:Math.random()*2,off:(Math.random()*2-1)*1.05,sp:.9+Math.random()*.3,ph:Math.random()*6,idle:false,look:mkLook(b.id.length*97+k*13+b.cost%97,{role:'worker',vest:VEST[b.id]})};
      w.path=workerRoute(w); scene.workers.push(w);}}
  }
  // forest crew: axe lumberjacks + chainsaw fellers (capped), split between the top and left work zones
  const nj=Math.min(8,Math.max(2,S.collectors.lumberjack)), ns=Math.min(5,S.collectors.chainsaw);
  const want=[];for(let k=0;k<nj;k++) want.push({id:k+1,type:'axe',zone:k%2?'L':'T'});for(let k=0;k<ns;k++) want.push({id:100+k,type:'saw',zone:k%2?'T':'L'});
  const sig=want.map(w=>w.id).join(',');
  if(scene._jsig!==sig){scene._jsig=sig;const old=scene.jacks;scene.jacks=want.map(w=>old.find(o=>o.id===w.id)||mkJack(w.id,w.type,w.zone));
    for(const o of old) if(!scene.jacks.includes(o)&&o.tree){o.tree.claim=null;}}
  if(!scene.foreman){scene.foreman={look:mkLook(4242,{role:'foreman',female:false}),i:.4,j:2.7,ti:.4,tj:2.7,st:'check',tm:2,ph:0,fx:1,back:false,pose:'clip'};}
  syncPlanters();
  if(!scene.campers){scene.campers=[{look:mkLook(6001,{role:'casual',female:false}),pose:'sitdrink',o:[-.12,.2],fx:1,ph:0},{look:mkLook(6002,{role:'casual',female:true}),pose:'sit',o:[.22,-.14],fx:-1,ph:2},
    {look:mkLook(6003,{role:'saw',female:false}),pose:'drink',o:[.62,.1],fx:-1,ph:4}];}
  // log trucks
  const nt=Math.min(3,S.collectors.truck);
  if(scene.logTrucks.length!==nt){const old=scene.logTrucks;scene.logTrucks=[];for(let k=0;k<nt;k++) scene.logTrucks.push(old[k]||mkLogTruck(k,k*24));}
  const nh=Math.min(2,S.collectors.harvester); while(scene.harvesters.length<nh) scene.harvesters.push({k:scene.harvesters.length,ph:Math.random()*6}); scene.harvesters.length=nh;
  const nd=Math.min(5,S.collectors.drone); while(scene.drones.length<nd) scene.drones.push({k:scene.drones.length,ph:Math.random()*6}); scene.drones.length=nd;
  const nc=Math.min(2,S.collectors.heli); while(scene.helis.length<nc) scene.helis.push({k:scene.helis.length,ph:scene.helis.length*7}); scene.helis.length=nc;
  // forklifts: carry finished goods (or raw logs early on) down the lane to the dock
  const built=MAIN_BLD.filter(b=>S.buildings[b.id].lvl>0);
  const nf=built.length?((S.ship&&S.ship.fork)||2):(totCol()>0?1:0);   // v2.13: the forklift fleet is an upgrade
  const fsig=nf+'|'+built.map(b=>b.id).join(',');
  if(scene._fsig!==fsig){scene._fsig=fsig;scene.forklifts=[];
    for(let k=0;k<nf;k++){const src=built.length?built[(built.length-1-(k%built.length))%built.length].id:null;scene.forklifts.push(mkForklift(src,k));}}
  if(!scene.dockTrucks.length) scene.dockTrucks.push(mkDockTruck(true),mkDockTruck('q'));
  if(!scene.dockHand) scene.dockHand={look:mkLook(7007,{role:'worker',vest:'#4ac0a0'}),p:0,ph:0};
}
function mkForklift(src,k){
  const from=src?convOf(LOTS[src]).end:LOGPICK, to=dockDrop(), off=k%2?.55:-.55;
  return {src,res:src?OUT_OF[src]:'logs',p:k*.45,path:mkPath([from,lanePt(from,off),lanePt(to,off),to])};
}
function updateEntities(dt){
  const t=scene.t;
  for(const w of scene.workers){
    const st=S.buildings[w.bid]; w.idle=!st.on;
    if(w.idle) continue;
    const f=bstat[w.bid].f, slow=f<0.985?0.35+0.65*f:1;
    w.p=(w.p+dt*1.25*w.sp*slow/w.path.tot)%2; w.ph+=dt*9*slow;
  }
  if(typeof tierLiftTick==='function') tierLiftTick(dt);   // v2.20 phase-1 → phase-2 shuttles
  for(const fl of scene.forklifts){fl.p=(fl.p+dt*shForkSpeed()/fl.path.tot)%2;const f=fl.p<1?fl.p:2-fl.p;const q=pathAt(fl.path,f);const sg=fl.p<1?1:-1;
    fl.i=q[0];fl.j=q[1];if(Math.abs(q[2])+Math.abs(q[3])>1e-6){const y=Math.atan2(q[3]*sg,q[2]*sg);fl.yaw=fl.yaw===undefined?y:angLerp(fl.yaw,y,Math.min(1,dt*7));}fl.ph=(fl.ph||0)+dt*6;}
  // forest crew
  for(const p of scene.jacks){stepJack(p,dt);}
  if(scene.foreman) stepForeman(scene.foreman,dt);
  forestVisTick(dt);
  for(const k in LANDINGS){const lg=LANDINGS[k];lg.dec=(lg.dec||0)+dt;if(lg.dec>9){lg.dec=0;if(lg.n>2) lg.n--;}}
  for(const tr of scene.dynTrees){
    if(tr.shake>0) tr.shake=Math.max(0,tr.shake-dt*2.8);
    if(tr.fall>0){tr.fall+=dt/1.35;if(tr.fall>=1){tr.fall=0;tr.down=1;const c=trunkMid(tr);const p=P(c[0],c[1]);for(let k=0;k<16;k++) emitP(p[0]+(Math.random()-.5)*40,p[1],'dust');}}
    else if(tr.down){ if(!tr.claim){tr.down=0;tr.stump=1;} }
    else if(tr.stump>0){}   // v2.7: a stump stays until a planter (or slow natural regrowth) puts a sapling on it
    else if(tr.grow<1){const sap=tr.grow<.4,cap=sap?.38:.96;tr.grow=Math.min(Math.max(tr.grow,cap),tr.grow+dt*growMult()*(sap?.24/GROW_SAP:.54/GROW_YOUNG));}
  }
  fvUpdate(dt);
  for(const h of scene.harvesters){h.ph+=dt;const dir=Math.cos(h.ph*.25)>=0?1:-1;const y=dir>0?Math.PI/2:-Math.PI/2;h.yaw=h.yaw===undefined?y:angLerp(h.yaw,y,Math.min(1,dt*2.5));}
  for(const d of scene.drones) d.ph+=dt;
  for(const h of scene.helis) h.ph+=dt;
  // log trucks with spacing along their shared route
  const prog=v=>(v.li>0?v.legs[0].pa.tot:0)+v.s;
  for(const v of scene.logTrucks){
    if(v.done){v.delay-=dt;if(v.delay<=0){Object.assign(v,mkLogTruck(v.k,0));}continue;}
    let lim; const g=prog(v); for(const o of scene.logTrucks){if(o===v||o.done) continue;const go=prog(o);if(go>g){const gap=go-g-3.6;lim=lim===undefined?gap:Math.min(lim,gap);}}
    const rem=v.legs[v.li]?v.legs[v.li].pa.tot-v.s:0; stepVeh(v,dt,lim===undefined?undefined:Math.max(0,Math.min(lim,rem)));
    if(v.li===0&&v.legs[0].pa.tot-v.s<.05&&v.v===0){v.load=Math.max(0,1-Math.floor((v.unload||0)/.85)/6);}
    if(v.li>0) v.load=0;
    if(v.done){v.delay=2+Math.random()*4;}
  }
  // shipping dock trucks
  const selling=coinRate>0.01;
  for(const tk of scene.dockTrucks){
    const wasLi=tk.li; if(tk.li===3) tk.load=Math.min(1,tk.load+dt*(selling?.2:0));
    if(tk.li===4) tk.doors=Math.max(0,tk.doors-dt*2);
    stepVeh(tk,dt,laneLimit(tk));
    if(wasLi===3&&tk.li===4&&tk.acc>0){const p=P(DOCKB[0],DOCKB[1],50);scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(tk.acc),coin:true,t:0,dur:1.6,big:true});}
    if(wasLi===2&&tk.li===3&&scene.dockTrucks.length<3) scene.dockTrucks.push(mkDockTruck(false));
  }
  scene.dockTrucks=scene.dockTrucks.filter(tk=>!tk.done);
  const loading=scene.dockTrucks.find(tk=>tk.li===3);
  scene.dockStock=selling?(loading?1-loading.load*.75:.6):.1;
  if(scene.dockHand){scene.dockHand.active=!!(loading&&selling);if(scene.dockHand.active){scene.dockHand.p=(scene.dockHand.p+dt*.45)%2;scene.dockHand.ph+=dt*8;}}
  // coin floats over the dock
  const te=S.totalEarned; let d=te-scene.lastEarned; if(d<0) d=0; scene.lastEarned=te;
  scene.earnAcc+=d; if(loading) loading.acc=(loading.acc||0)+d;
  scene.floatTimer-=dt;
  if(scene.floatTimer<=0){scene.floatTimer=1.5; if(scene.earnAcc>0.5){const p=P(DOCK.ci+.4,DOCK.cj+.2,74);scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(scene.earnAcc),coin:true,t:0,dur:1.3});} scene.earnAcc=0;}
  // build anims, milestone flash
  for(const k in scene.buildAnim){scene.buildAnim[k]+=dt*1.6;if(scene.buildAnim[k]>=1) delete scene.buildAnim[k];}
  if(scene.msFlash){scene.msFlash.t-=dt;if(scene.msFlash.t<=0) scene.msFlash=null;}
  if(typeof specFrame==='function') specFrame(dt);   // v2.17 banner pop
  // particles
  // v2.8: in-place compaction + object pools (no new arrays / objects per frame)
  {const A=scene.particles;let n=0;for(let k=0;k<A.length;k++){const p=A[k];p.life-=dt;if(p.life<=0){if(P_POOL.length<400) P_POOL.push(p);continue;}p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;A[n++]=p;}A.length=n;}
  {const A=scene.smoke;let n=0;for(let k=0;k<A.length;k++){const s=A[k];if(!smokeStep(s,dt)){if(S_POOL.length<200) S_POOL.push(s);continue;}A[n++]=s;}A.length=n;}   // v2.10.1: drift with wind, slowing rise
  {const A=scene.floats;let n=0;for(let k=0;k<A.length;k++){const f=A[k];if((f.t+=dt)<f.dur) A[n++]=f;}A.length=n;if(n>60) A.splice(0,n-60);}
  scene.axes=scene.axes.filter(a=>(a.t+=dt)<.35);
}
const P_POOL=[],S_POOL=[];
function emitP(x,y,type){
  if(scene.particles.length>340) return; const R=Math.random;
  let p=P_POOL.pop()||{};p.x=x;p.y=y;p.vx=0;p.vy=0;p.g=0;p.life=.6;p.max=.6;p.size=2;p.col='#c08a4f';p.rot=R()*6;p.vr=(R()-.5)*14;p.type=type;
  if(type==='chip'){p.vx=(R()-.3)*90;p.vy=-40-R()*70;p.g=260;p.life=p.max=.55+R()*.3;p.col=['#c08a4f','#8b5a2b','#e0b071','#a36d38'][R()*4|0];p.size=2.4;}
  else if(type==='dust'){p.vx=(R()-.5)*30;p.vy=-12-R()*20;p.g=10;p.life=p.max=.7+R()*.5;p.col='rgba(235,215,170,';p.size=2+R()*2.5;}
  else if(type==='saw'){p.vx=(R()-.5)*50;p.vy=-15-R()*25;p.g=60;p.life=p.max=.5+R()*.4;p.col='rgba(238,214,160,';p.size=1.2+R()*1.4;p.type='dust';}
  else if(type==='bark'){p.vx=20+R()*40;p.vy=-30-R()*30;p.g=180;p.life=p.max=.6;p.col='#6a4424';p.size=2;}
  else if(type==='poof'){const a=R()*TAU,s=30+R()*60;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s*.5-10;p.g=-8;p.life=p.max=.9+R()*.5;p.col='rgba(245,235,215,';p.size=5+R()*6;}
  else if(type==='soil'){p.vx=8+R()*30;p.vy=-30-R()*35;p.g=220;p.life=p.max=.5+R()*.25;p.col=['#5a3f22','#6a4a2a','#7d5a34'][R()*3|0];p.size=1.6+R()*1.2;p.type='chip';}
  else if(type==='seed'){p.vx=(R()-.5)*10;p.vy=10+R()*12;p.g=60;p.life=p.max=.6+R()*.3;p.col=['#c8a26a','#8a6a3a','#e8d8a0'][R()*3|0];p.size=1.2;p.type='chip';}
  else if(type==='spark'){const a=R()*TAU,s=40+R()*120;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s-30;p.g=90;p.life=p.max=1;p.col='spark';p.size=2;}
  scene.particles.push(p);
}
function emitSmoke(x,y,kind){if(scene.smoke.length>160) return;const s=S_POOL.pop()||{};s.x=x+(Math.random()-.5)*3;s.y=y;s.vx=2+Math.random()*4;s.vy=-20-Math.random()*9;s.life=0;s.max=2.8+Math.random()*1.6;s.kind=kind;s.sz=.75+Math.random()*.55;s.ph=Math.random()*6.28;scene.smoke.push(s);}
function buildPoof(id){const L=LOTS[id];if(!L) return;scene.buildAnim[id]=0;const p=P(L.ci,L.cj,10);for(let k=0;k<26;k++) emitP(p[0]+(Math.random()-.5)*80,p[1]+(Math.random()-.5)*30,'poof');}

/* ---------------- golden logs ---------------- */
const golden={cur:null,timer:35,sparks:[]};
function goldenSize(){return Math.max(16,Math.min(30,10+scene.cam.z*14));}
function safeRect(){const sb=$('subbar'),tb=Math.max(($('topbar').offsetHeight||50)+28,sb?sb.getBoundingClientRect().bottom+10:0);const bot=Math.min(sheetTop(),scene.h-($('bottombar').offsetHeight||70))-26;return [36,tb,scene.w-36,Math.max(tb+40,bot)];}
function spawnGolden(){
  const [x0,y0,x1,y1]=safeRect(); const vis=[];
  for(const t of scene.trees){const [x,y]=P(t.i,t.j,48*t.s);const s=w2s(x,y);if(s[0]>x0&&s[0]<x1&&s[1]>y0&&s[1]<y1) vis.push(t);}
  let t=vis.length?vis[Math.floor(Math.random()*vis.length)]:null;
  if(!t){let bd=1e9;const c=s2w(scene.w/2,(y0+y1)/2);for(const tr of scene.trees){const [x,y]=P(tr.i,tr.j);const d=Math.hypot(x-c[0],y-c[1]);if(d<bd){bd=d;t=tr;}}}
  const [wx,wy]=P(t.i,t.j,46*t.s+8);
  golden.cur={wx,wy,life:13,max:13,ph:Math.random()*6,x:0,y:0}; updateGoldenScreen();
  const L=$('sceneLabel'); if(L){L.textContent='✨ Golden Log! Tap it!';L.classList.add('golden');}
  return golden.cur;
}
function updateGoldenScreen(){const g=golden.cur;if(!g) return;const s=w2s(g.wx,g.wy);g.x=s[0];g.y=s[1];}
function clearGoldenLabel(){const L=$('sceneLabel'); if(L){L.textContent=sceneLabelText();L.classList.remove('golden');}}
function sceneLabelText(){return `${TREES[S.tree].icon} ${TREES[S.tree].name} Forest`;}
function goldenReward(kind){
  M=computeMods();
  const r=Math.random(); kind=kind||(r<0.5?'coins':r<0.8?'frenzy':'goldrush');
  let txt;
  if(kind==='coins'){
    const v=Math.max(50+chopPower()*25,coinRate*75); earn(v);
    txt=`+${fmt(v)}`;
    toast(`✨ <b>Lucky Haul!</b> The golden log was worth <b style="color:#b06a00">🪙 ${fmt(v)}</b>.`,4200,'golden-toast');
  } else {
    const d=EMAP[kind]; const ex=S.events.find(e=>e.id===kind);
    if(ex) ex.ends=Math.max(ex.ends,S.time)+d.dur; else S.events.push({id:kind,ends:S.time+d.dur});
    M=computeMods(); renderEvents(true);
    txt=kind==='frenzy'?'FRENZY ×5':'PRICES ×3';
    toast(`<b>${d.name}</b><br>${d.desc} for ${d.dur}s.`,4200,'golden-toast');
  }
  S.golden=(S.golden||0)+1;
  sfx('golden');
  return {kind,txt};
}
function catchGolden(kind){
  const g=golden.cur; if(!g) return null;
  golden.cur=null; golden.timer=60+Math.random()*90; clearGoldenLabel();
  for(let i=0;i<26;i++){const a=Math.random()*TAU,sp=40+Math.random()*120;golden.sparks.push({x:g.x,y:g.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,life:1});}
  const res=goldenReward(kind);
  scene.floats.push({x:g.wx,y:g.wy-10,text:res.txt,coin:kind==='coins'||res.kind==='coins',t:0,dur:1.4,big:true,col:'#fff3b0'});
  checkAch(); render();
  return res;
}
function updateGolden(dt){
  if(golden.cur){ golden.cur.life-=dt; golden.cur.ph+=dt; updateGoldenScreen(); if(golden.cur.life<=0){golden.cur=null;golden.timer=50+Math.random()*80;clearGoldenLabel();} }
  else { golden.timer-=dt; if(golden.timer<=0) spawnGolden(); }
}
function drawGolden(ctx,dt){
  const g=golden.cur;
  if(g){
    const sz=goldenSize(); const bob=Math.sin(g.ph*2.2)*sz*0.18; const x=g.x,y=g.y+bob;
    const fade=Math.min(1,g.life/1.5,(g.max-g.life)/0.4+0.2);
    ctx.save(); ctx.globalAlpha=Math.max(0,fade);
    const gl=ctx.createRadialGradient(x,y,2,x,y,sz*2.4); gl.addColorStop(0,'rgba(255,230,120,.85)'); gl.addColorStop(.45,'rgba(255,200,60,.3)'); gl.addColorStop(1,'rgba(255,200,60,0)');
    ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(x,y,sz*2.4,0,TAU); ctx.fill();
    const pr=(g.ph*1.2)%1; ctx.strokeStyle=`rgba(255,240,170,${0.8*(1-pr)})`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x,y,sz*(1+pr*1.4),0,TAU); ctx.stroke();
    ctx.translate(x,y); ctx.rotate(-0.35+Math.sin(g.ph*1.5)*0.12);
    const L=sz*1.7,R=sz*0.45;
    const lg=ctx.createLinearGradient(0,-R,0,R); lg.addColorStop(0,'#fff3b0'); lg.addColorStop(.35,'#f5c84c'); lg.addColorStop(1,'#a8740c');
    ctx.fillStyle=lg; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-L/2,-R,L,R*2,R*0.6); else ctx.rect(-L/2,-R,L,R*2); ctx.fill();
    ctx.strokeStyle='rgba(140,90,10,.6)'; ctx.lineWidth=1; for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(-L/2+R*0.6,k*R*0.45);ctx.lineTo(L/2-R*0.8,k*R*0.45+1);ctx.stroke();}
    ctx.fillStyle='#ffe58a'; ctx.beginPath(); ctx.ellipse(L/2,0,R*0.55,R,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#c8901a'; ctx.beginPath(); ctx.ellipse(L/2,0,R*0.3,R*0.6,0,0,TAU); ctx.stroke();
    ctx.rotate(0.35);
    for(let k=0;k<4;k++){const a=g.ph*1.6+k*Math.PI/2, rr2=sz*1.35; const sx=Math.cos(a)*rr2, sy=Math.sin(a)*rr2*0.7; const s2=2+1.5*Math.abs(Math.sin(g.ph*4+k));
      ctx.fillStyle='#fffbe0'; ctx.beginPath(); ctx.moveTo(sx,sy-s2*2); ctx.lineTo(sx+s2*0.5,sy); ctx.lineTo(sx,sy+s2*2); ctx.lineTo(sx-s2*0.5,sy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx-s2*2,sy); ctx.lineTo(sx,sy+s2*0.5); ctx.lineTo(sx+s2*2,sy); ctx.lineTo(sx,sy-s2*0.5); ctx.closePath(); ctx.fill();}
    ctx.restore();
  }
  golden.sparks=golden.sparks.filter(p=>{p.life-=dt*1.4;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt; if(p.life<=0) return false;
    ctx.fillStyle=`rgba(255,${200+Math.floor(55*p.life)},90,${p.life})`; ctx.fillRect(p.x-2,p.y-2,4,4); return true;});
}
function exhaust(st,v){if(!st) return;const rate=v.accel?9:v.v>.1?4:1.6;if(Math.random()<rate*scene.dtF){if(scene.smoke.length>160) return;const s=S_POOL.pop()||{};s.x=st[0];s.y=st[1];s.vx=2+Math.random()*3;s.vy=-9-Math.random()*5;s.life=0;s.max=1+Math.random()*.6;s.kind='exh';s.sz=1;s.ph=Math.random()*6.28;scene.smoke.push(s);}}
function drawLanding(ctx,lg){const n=lg.n;const V=VF(lg.i,lg.j,-Math.PI/4,0);
  const R=[[-.18,0],[0,0],[.18,0],[.36,0],[-.09,1],[.09,1],[.27,1],[0,2],[.18,2],[.09,3]];
  shadowAt(ctx,lg.i,lg.j,22,8,.18);
  for(let k=0;k<Math.min(n,10);k++){const [c,row]=R[k];vlog(ctx,V,-.55+((k*37)%5)*.02,.5-((k*13)%4)*.03,c-.09,3.2+row*5.6,3.2,k%2?'#8a5a2c':'#7a4e26');}
  for(const sc of [-1,1]){const p0=VL(V,sc*.62,-.36,0),p1=VL(V,sc*.62,-.36,14);ctx.strokeStyle='#5a3a1c';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();}
}
function drawCampfire(ctx,i,j){const [x,y]=P(i,j);
  ell(ctx,x,y+1,13,5.5,'rgba(60,40,20,.25)');
  for(let k=0;k<9;k++){const a=k/9*TAU;ell(ctx,x+Math.cos(a)*9,y+Math.sin(a)*4,2.3,1.6,k%2?'#8a8880':'#a8a69e');}
  ctx.strokeStyle='#5a3418';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-6,y+2);ctx.lineTo(x+5,y-2);ctx.moveTo(x-5,y-2);ctx.lineTo(x+6,y+2);ctx.stroke();ctx.lineCap='butt';
  const T=scene.t;const g=ctx.createRadialGradient(x,y-4,1,x,y-4,22);g.addColorStop(0,'rgba(255,190,80,.35)');g.addColorStop(1,'rgba(255,160,60,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y-4,22,0,TAU);ctx.fill();
  for(let k=0;k<3;k++){const h=8+Math.sin(T*11+k*2)*2.5+k*1.5,w=3.2-k*.7,ox=(k-1)*2.4+Math.sin(T*7+k)*.6;
    ctx.fillStyle=['#e8501a','#f59a1a','#ffe27a'][k];ctx.beginPath();ctx.moveTo(x+ox-w,y);ctx.quadraticCurveTo(x+ox-w*.6,y-h*.6,x+ox+Math.sin(T*9+k)*1.2,y-h);ctx.quadraticCurveTo(x+ox+w*.6,y-h*.6,x+ox+w,y);ctx.closePath();ctx.fill();}
  // kettle on a tripod
  ctx.strokeStyle='#3a3a3e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-7,y+1);ctx.lineTo(x,y-16);ctx.lineTo(x+7,y+1);ctx.moveTo(x,y-16);ctx.lineTo(x,y-11);ctx.stroke();
  ctx.fillStyle='#4a4f56';ctx.beginPath();ctx.ellipse(x,y-9,3.2,2.6,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(x-2,y-10.5,1.2,1.4);
  if(Math.random()<scene.dtF*2.5) emitSmoke(x+(Math.random()-.5)*4,y-12,'light');
}
