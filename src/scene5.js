
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
function syncEntities(){
  // yard workers (v1.3 system, now walking the iso lane)
  const ysig=BUILDINGS.map(b=>b.id+workersFor(b.id)).join(',')+'|'+(S.buildings.chipper.lvl>0)+(S.buildings.sawmill.lvl>0);
  if(ysig!==yardSigV){yardSigV=ysig; const old=scene.workers; scene.workers=[];
    for(const b of BUILDINGS){const n=workersFor(b.id);for(let k=0;k<n;k++){
      const prev=old.find(o=>o.bid===b.id&&o.k===k);
      const w=prev||{bid:b.id,k,res:inputResOf(b,k),p:Math.random()*2,off:(Math.random()*2-1)*1.05,sp:.9+Math.random()*.3,ph:Math.random()*6,idle:false};
      w.path=workerRoute(w); scene.workers.push(w);}}
  }
  // forest crews
  const nj=Math.min(10,S.collectors.lumberjack), ns=Math.min(6,S.collectors.chainsaw);
  if(scene.jacks.length!==nj+ns||scene.jacks.filter(j=>j.type==='jack').length!==nj){
    const spots=jackSpots(); scene.jacks=[];
    for(let k=0;k<nj+ns;k++){const sp=spots[k%Math.max(1,spots.length)]; if(!sp) break; const t=sp.tree;
      scene.jacks.push({type:k<nj?'jack':'saw',tree:t,i:t.i+.5,j:t.j+.1,ph:Math.random()*6,next:6+Math.random()*10});}
  }
  const nt=Math.min(3,S.collectors.truck); while(scene.logTrucks.length<nt) scene.logTrucks.push({k:scene.logTrucks.length,col:['#d8582f','#3e86c8','#5a9a3a'][scene.logTrucks.length%3]}); scene.logTrucks.length=nt;
  const nh=Math.min(2,S.collectors.harvester); while(scene.harvesters.length<nh) scene.harvesters.push({k:scene.harvesters.length,ph:Math.random()*6}); scene.harvesters.length=nh;
  const nd=Math.min(5,S.collectors.drone); while(scene.drones.length<nd) scene.drones.push({k:scene.drones.length,ph:Math.random()*6}); scene.drones.length=nd;
  const nc=Math.min(2,S.collectors.heli); while(scene.helis.length<nc) scene.helis.push({k:scene.helis.length,ph:scene.helis.length*7}); scene.helis.length=nc;
  // forklifts: carry finished goods (or raw logs early on) down the lane to the dock
  const built=BUILDINGS.filter(b=>S.buildings[b.id].lvl>0);
  const nf=built.length?Math.min(4,Math.ceil(built.length*.6)):(totCol()>0?1:0);
  const fsig=nf+'|'+built.map(b=>b.id).join(',');
  if(scene._fsig!==fsig){scene._fsig=fsig;scene.forklifts=[];
    for(let k=0;k<nf;k++){const src=built.length?built[(built.length-1-k)%built.length].id:null;scene.forklifts.push(mkForklift(src,k));}}
  if(!scene.dockTrucks.length) scene.dockTrucks.push({j:21,state:'load',load:.3,col:'#3e86c8'});
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
  for(const fl of scene.forklifts){fl.p=(fl.p+dt*1.7/fl.path.tot)%2;}
  for(const j of scene.jacks){
    const tr=j.tree; j.ph+=dt*(j.type==='jack'?5.5:3);
    if(tr.stump>0||tr.fall>0) continue;
    if(j.type==='jack'){const s=Math.sin(j.ph);if(j._s!==undefined&&j._s<.95&&s>=.95){tr.shake=1;const p=P(tr.i,tr.j);for(let k=0;k<3;k++) emitP(p[0]+4,p[1]-6,'chip');}j._s=s;}
    else if(Math.random()<dt*10){const p=P(tr.i,tr.j);emitP(p[0]+5,p[1]-5,'dust');}
    j.next-=dt; if(j.next<=0){j.next=10+Math.random()*12;tr.fall=0.001;}
  }
  for(const tr of scene.dynTrees){
    if(tr.shake>0) tr.shake=Math.max(0,tr.shake-dt*2.8);
    if(tr.fall>0){tr.fall+=dt*.9;if(tr.fall>=1){tr.fall=0;tr.stump=5;const p=P(tr.i,tr.j);for(let k=0;k<10;k++) emitP(p[0]+(tr.var>.5?20:-20),p[1],'dust');}}
    else if(tr.stump>0){tr.stump-=dt;if(tr.stump<=0){tr.stump=0;tr.grow=.15;}}
    else if(tr.grow<1){tr.grow=Math.min(1,tr.grow+dt*.5);}
  }
  for(const h of scene.harvesters) h.ph+=dt;
  for(const d of scene.drones) d.ph+=dt;
  for(const h of scene.helis) h.ph+=dt;
  // shipping dock trucks
  const selling=coinRate>0.01;
  for(const tk of scene.dockTrucks){
    if(tk.state==='arrive'){tk.j=Math.min(21,tk.j+dt*Math.max(1.2,(21-tk.j)*.9));if(tk.j>=20.98){tk.j=21;tk.state='load';}}
    else if(tk.state==='load'){tk.load=Math.min(1,tk.load+dt*(selling?.2:.0));tk.acc=(tk.acc||0);
      if(tk.load>=1){tk.state='leave';tk.v=.5;if(tk.acc>0) scene.floats.push({x:P(ROAD_I,21,30)[0],y:P(ROAD_I,21,30)[1],text:'+'+fmt(tk.acc),coin:true,t:0,dur:1.6,big:true});
        scene.dockTrucks.push({j:-16,state:'arrive',load:0,acc:0,col:['#3e86c8','#d84a3a','#5a9a3a','#e8a020','#8a5ac8'][Math.floor(Math.random()*5)]});}}
    else {tk.v=Math.min(8,(tk.v||.5)+dt*4);tk.j+=dt*tk.v;}
  }
  scene.dockTrucks=scene.dockTrucks.filter(tk=>tk.j<56);
  const loading=scene.dockTrucks.find(tk=>tk.state==='load');
  scene.dockStock=selling?(loading?1-loading.load*.75:.6):.1;
  // coin floats over the dock
  const te=S.totalEarned; let d=te-scene.lastEarned; if(d<0) d=0; scene.lastEarned=te;
  scene.earnAcc+=d; if(loading) loading.acc=(loading.acc||0)+d;
  scene.floatTimer-=dt;
  if(scene.floatTimer<=0){scene.floatTimer=1.5; if(scene.earnAcc>0.5){const p=P(DOCK.ci+.4,DOCK.cj+.2,74);scene.floats.push({x:p[0],y:p[1],text:'+'+fmt(scene.earnAcc),coin:true,t:0,dur:1.3});} scene.earnAcc=0;}
  // build anims, milestone flash
  for(const k in scene.buildAnim){scene.buildAnim[k]+=dt*1.6;if(scene.buildAnim[k]>=1) delete scene.buildAnim[k];}
  if(scene.msFlash){scene.msFlash.t-=dt;if(scene.msFlash.t<=0) scene.msFlash=null;}
  // particles
  scene.particles=scene.particles.filter(p=>{p.life-=dt;if(p.life<=0) return false;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;return true;});
  scene.smoke=scene.smoke.filter(s=>{s.life+=dt;if(s.life>=s.max) return false;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx+=dt*3;return true;});
  scene.floats=scene.floats.filter(f=>(f.t+=dt)<f.dur);
  scene.axes=scene.axes.filter(a=>(a.t+=dt)<.35);
}
function emitP(x,y,type){
  if(scene.particles.length>340) return; const R=Math.random;
  let p={x,y,vx:0,vy:0,g:0,life:.6,max:.6,size:2,col:'#c08a4f',rot:R()*6,vr:(R()-.5)*14,type};
  if(type==='chip'){p.vx=(R()-.3)*90;p.vy=-40-R()*70;p.g=260;p.life=p.max=.55+R()*.3;p.col=['#c08a4f','#8b5a2b','#e0b071','#a36d38'][R()*4|0];p.size=2.4;}
  else if(type==='dust'){p.vx=(R()-.5)*30;p.vy=-12-R()*20;p.g=10;p.life=p.max=.7+R()*.5;p.col='rgba(235,215,170,';p.size=2+R()*2.5;}
  else if(type==='bark'){p.vx=20+R()*40;p.vy=-30-R()*30;p.g=180;p.life=p.max=.6;p.col='#6a4424';p.size=2;}
  else if(type==='poof'){const a=R()*TAU,s=30+R()*60;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s*.5-10;p.g=-8;p.life=p.max=.9+R()*.5;p.col='rgba(245,235,215,';p.size=5+R()*6;}
  else if(type==='spark'){const a=R()*TAU,s=40+R()*120;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s-30;p.g=90;p.life=p.max=1;p.col='spark';p.size=2;}
  scene.particles.push(p);
}
function emitSmoke(x,y,kind){if(scene.smoke.length>160) return;scene.smoke.push({x:x+(Math.random()-.5)*3,y,vx:3+Math.random()*5,vy:-13-Math.random()*7,life:0,max:2.4+Math.random()*1.2,kind});}
function buildPoof(id){const L=LOTS[id];if(!L) return;scene.buildAnim[id]=0;const p=P(L.ci,L.cj,10);for(let k=0;k<26;k++) emitP(p[0]+(Math.random()-.5)*80,p[1]+(Math.random()-.5)*30,'poof');}

/* ---------------- golden logs ---------------- */
const golden={cur:null,timer:35,sparks:[]};
function goldenSize(){return Math.max(16,Math.min(30,10+scene.cam.z*14));}
function safeRect(){const tb=($('topbar').offsetHeight||50)+28;const bot=Math.min(sheetTop(),scene.h-($('bottombar').offsetHeight||70))-26;return [36,tb,scene.w-36,Math.max(tb+40,bot)];}
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
