
/* ---------------- camera & input ---------------- */
function w2s(x,y){const c=scene.cam;return [(x-c.x)*c.z+scene.w/2,(y-c.y)*c.z+scene.h/2];}
function s2w(x,y){const c=scene.cam;return [c.x+(x-scene.w/2)/c.z,c.y+(y-scene.h/2)/c.z];}
function clampCam(){const c=scene.cam;c.z=Math.max(c.minZ,Math.min(c.maxZ,c.z));c.tz=Math.max(c.minZ,Math.min(c.maxZ,c.tz));
  for(const k of ['x','tx']) scene.cam[k]=Math.max(-760,Math.min(760,scene.cam[k]));
  for(const k of ['y','ty']) scene.cam[k]=Math.max(-260,Math.min(1160,scene.cam[k]));}
function barH(){return [$('topbar').offsetHeight||50,$('bottombar').offsetHeight||70];}
function fitCamera(instant){
  const c=scene.cam,[tb,bb]=barH(),vw=scene.w,vh=scene.h;
  const uh=Math.max(200,vh-tb-bb-8), uw=vw;
  const portrait=uw/uh<1;
  const hb=typeof harborOpen==='function'&&harborOpen();   // v2.5: frame the harbour once it is built
  const bx0=portrait?-340:-480, bx1=portrait?356:(hb?900:880), by0=portrait?-66:-62, by1=portrait?900:(hb?935:826);
  const z=Math.min(uw/(bx1-bx0),uh/(by1-by0));
  c.fitZ=z; c.minZ=z*.7; c.maxZ=Math.max(2.4,z*3.2);
  c.tz=z; c.tx=(bx0+bx1)/2; c.ty=(by0+by1)/2-((tb+uh/2)-vh/2)/z;
  if(instant){c.x=c.tx;c.y=c.ty;c.z=c.tz;}
}
function zoomAt(sx,sy,nz){const c=scene.cam;const [wx,wy]=s2w(sx,sy);c.z=Math.max(c.minZ,Math.min(c.maxZ,nz));c.x=wx-(sx-scene.w/2)/c.z;c.y=wy-(sy-scene.h/2)/c.z;c.tx=c.x;c.ty=c.y;c.tz=c.z;clampCam();}
function focusLot(id){
  const L=LOTS[id]; if(!L) return; const c=scene.cam;
  const [tb]=barH(); const top=tb+20, bot=sheetTop()-16;
  const [wx,wy]=P(L.ci,L.cj,30); const s=w2s(wx,wy);
  if(s[1]>top+70&&s[1]<bot-40&&s[0]>50&&s[0]<scene.w-50) return;
  const ty=top+(bot-top)*.5;
  c.ty=wy-(ty-scene.h/2)/c.z; if(s[0]<50||s[0]>scene.w-50) c.tx=wx; clampCam();
}
const ptrs=new Map(); let drag=null, pinch=null;
function setupInput(){
  const cv=scene.canvas;
  cv.addEventListener('pointerdown',e=>{
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false,t:performance.now()};}
    else if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:scene.cam.z};if(drag) drag.moved=true;}
  });
  cv.addEventListener('pointermove',e=>{
    const p=ptrs.get(e.pointerId);
    if(!p){updateHover(e.clientX,e.clientY);return;}
    p.x=e.clientX;p.y=e.clientY;
    if(ptrs.size>=2&&pinch){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt((a.x+b.x)/2,(a.y+b.y)/2,pinch.z*d/Math.max(10,pinch.d));return;}
    if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>7){drag.moved=true;cv.classList.add('dragging');}
      if(drag.moved){const c=scene.cam;c.x-=dx/c.z;c.y-=dy/c.z;c.tx=c.x;c.ty=c.y;clampCam();}
      drag.x=e.clientX;drag.y=e.clientY;}
  });
  const end=e=>{
    const had=ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
    if(ptrs.size<2) pinch=null;
    if(had&&drag&&ptrs.size===0){ if(!drag.moved&&e.type==='pointerup') sceneTap(e.clientX,e.clientY); drag=null; cv.classList.remove('dragging'); }
  };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
  cv.addEventListener('pointerleave',()=>{if(!ptrs.size){scene.hover=null;cv.classList.remove('pointer');}});
  cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,scene.cam.z*Math.exp(-e.deltaY*.0016));},{passive:false});
  window.addEventListener('keydown',e=>{if(e.key==='Escape') closeSheet();});
}
function updateHover(x,y){const h=hitTest(x,y);const on=h.type!=='none'||h.type==='office'||(golden.cur&&Math.hypot(x-golden.cur.x,y-golden.cur.y)<Math.max(30,goldenSize()*2));
  scene.hover=h.type==='bld'||h.type==='yard'||h.type==='dock'?h.id:(h.type==='office'?'office':null); scene.canvas.classList.toggle('pointer',!!on);}
function hitTest(sx,sy){
  const [wx,wy]=s2w(sx,sy);
  if(OFFICE.hit&&pip(OFFICE.hit,wx,wy)) return {type:'office'};
  let best=null;
  for(const L of [...Object.values(LOTS),YARD,DOCK]){if(L.prem&&!S.premium.lvl) continue;if(L.hit&&pip(L.hit,wx,wy)&&(!best||L.ci+L.cj>best.ci+best.cj)) best=L;}
  if(best) return {type:best.id==='yard'?'yard':best.id==='dock'?'dock':'bld',id:best.id};
  if(STATION.hit&&pip(STATION.hit,wx,wy)) return {type:'station'};
  {const [gi,gj]=toGrid(wx,wy);if(gi>=14.2&&gi<=19.6&&gj>=-1.4&&gj<=3.5&&campusOpen()) return {type:'campus'};
    if(gi>=32.4&&gi<=37&&gj>=11.5&&gj<=17.2&&(harborOpen()||harborAvail())) return {type:'harbor'};}
  {const [gi,gj]=toGrid(wx,wy);if(gi>=PREM.i0-.2&&gi<=PREM.i1+.3&&gj>=PREM.j0-.2&&gj<=PREM.j1+.2) return {type:'prem'};
    if(PDOCK.hit&&pip(PDOCK.hit,wx,wy)) return {type:'prem'};}
  const [gi,gj]=toGrid(wx,wy);
  for(const d of [0,.7,1.4,2.1]) if(isForestPt(gi+d,gj+d)) return {type:'forest',i:gi,j:gj};
  return {type:'none'};
}
function sceneTap(sx,sy){
  const g=golden.cur;
  if(g&&Math.hypot(sx-g.x,sy-g.y)<=Math.max(30,goldenSize()*2)){catchGolden();return;}
  if(fireTapAt(sx,sy)) return;
  const h=hitTest(sx,sy);
  if(h.type==='bld'){
    const b=BMAP[h.id],st=S.buildings[h.id];
    if(!st.lvl&&bVisible(b)&&S.coins+1e-9>=bulkCost(b.cost,b.scale,0,1)){buyBuilding(h.id,1);render();}
    openSheet('bld',h.id);
  } else if(h.type==='yard') openSheet('crew');
  else if(h.type==='dock') openSheet('market');
  else if(h.type==='prem') openSheet('prem');
  else if(h.type==='station') openSheet('staff');
  else if(h.type==='office') openDaily();
  else if(h.type==='campus') openResearch();
  else if(h.type==='harbor') openTrade();
  else if(h.type==='forest') forestChop(sx,sy);
  else closeSheet();
}
function forestChop(sx,sy){
  const n=chop(); const [wx,wy]=s2w(sx,sy);
  let best=null,bd=70/scene.cam.z;
  for(const t of scene.trees){const [x,y]=P(t.i,t.j);const d=Math.hypot(x-wx,y-24*t.s-wy);if(d<bd){bd=d;best=t;}}
  let fx=wx,fy=wy;
  if(best&&!best.stump&&!best.fall){best.shake=1;const p=P(best.i,best.j);fx=p[0];fy=p[1]-10;if(!best.dyn) best.shake=0;}
  scene.axes.push({x:fx+7,y:fy-4,t:0});
  for(let k=0;k<10;k++) emitP(fx,fy,'chip');
  scene.floats.push({x:fx,y:fy-30,text:'+'+fmt(n,n<10?1:0),log:true,t:0,dur:1});
  render();
  return n;
}

/* ---------------- main draw ---------------- */
function resizeScene(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  scene.dpr=dpr; scene.w=window.innerWidth; scene.h=window.innerHeight;
  scene.canvas.width=Math.round(scene.w*dpr); scene.canvas.height=Math.round(scene.h*dpr);
  scene.canvas.style.width=scene.w+'px'; scene.canvas.style.height=scene.h+'px';
  const r=document.documentElement.style; r.setProperty('--tb',(($('topbar').offsetHeight)||52)+'px'); r.setProperty('--bb',(($('bottombar').offsetHeight)||76)+'px');
  const keep=scene._fitted&&Math.abs(scene.cam.z-scene.cam.fitZ)>1e-3;
  fitCamera(!keep); if(!scene._fitted) scene._fitted=true;
  scene.bg=null;
}
function initScene(){
  scene.canvas=$('scene'); scene.ctx=scene.canvas.getContext('2d');
  initWorld(); resizeScene(); setupInput();
  window.addEventListener('resize',()=>{resizeScene();});
  document.addEventListener('visibilitychange',()=>{scene.visible=!document.hidden; if(scene.visible&&!scene.running){scene.lastRAF=performance.now();scene.running=true;requestAnimationFrame(sceneLoop);}});
  scene.lastEarned=S.totalEarned; scene.firstFrame=true;
  scene.running=true; requestAnimationFrame(sceneLoop);
}
function sceneLoop(now){
  if(!scene.visible){scene.running=false;return;}
  const dt=Math.min(.05,Math.max(0,(now-(scene.lastRAF||now))/1000)); scene.lastRAF=now;
  const t0=performance.now();
  stepScene(dt);
  const ms=performance.now()-t0; scene.frameMs=scene.frameMs*.94+ms*.06; if(dt>0) scene.fps=scene.fps*.94+(1/dt)*.06;
  requestAnimationFrame(sceneLoop);
}
function stepScene(dt){
  scene.t+=dt; scene.dtF=dt;
  const c=scene.cam, k=1-Math.exp(-dt*9);
  if(!drag||!drag.moved){c.x+=(c.tx-c.x)*k;c.y+=(c.ty-c.y)*k;c.z+=(c.tz-c.z)*k;}
  updateWorldVis(dt); syncEntities(); premSync(); updateEntities(dt); fireSceneUpdate(dt); courierUpdate(dt); techVisTick(); premUpdate(dt); updateGolden(dt);
  drawScene(dt);
  scene.firstFrame=false;
}
function drawScene(dt){
  const ctx=scene.ctx, dpr=scene.dpr, W=scene.w, H=scene.h, c=scene.cam, z=c.z;
  scene.dn=dayState(); scene.lq.length=0;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!scene.bg){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#bfe3a8');g.addColorStop(1,'#5f9a48');scene.bg=g;}
  ctx.fillStyle=scene.bg; ctx.fillRect(0,0,W,H);
  ctx.setTransform(dpr*z,0,0,dpr*z,dpr*(W/2-c.x*z),dpr*(H/2-c.y*z));
  const vx0=c.x-W/2/z,vx1=c.x+W/2/z,vy0=c.y-H/2/z,vy1=c.y+H/2/z;
  drawChunks(ctx,vx0,vy0,vx1,vy1,scene.firstFrame);
  const inView=(x,y,m)=>x>vx0-m&&x<vx1+m&&y>vy0-m&&y<vy1+m*2;
  drawPuddles(ctx,inView);
  // decals: conveyors, dynamic shadows
  const lots=MAIN_BLD.map(b=>LOTS[b.id]);
  for(const L of lots) drawConveyor(ctx,L);
  const objs=[];
  for(const t of scene.dynTrees){const [x,y]=P(t.i,t.j);if(!inView(x,y,60)) continue;if(!t.stump&&!t.down&&!t.fall) treeShadow(ctx,x,y,t.s*(t.grow||1));objs.push({k:t.i+t.j,f:()=>drawTree(ctx,x,y,t,S.tree)});}
  for(const L of lots) objs.push({k:L.ci+L.cj,f:()=>drawLot(ctx,L)});
  objs.push({k:YARD.ci+YARD.cj,f:()=>drawYardLot(ctx)});
  objs.push({k:DOCK.ci+DOCK.cj,f:()=>drawDockLot(ctx)});
  for(const l of scene.lamps){objs.push({k:l.i+l.j,f:()=>{const [x,y]=P(l.i,l.j);ell(ctx,x+2,y+1,5,2.5,'rgba(0,0,0,.2)');ctx.fillStyle='#4a4f56';ctx.fillRect(x-1.2,y-30,2.4,30);ctx.fillRect(x-1.2,y-30,7,2);
    ctx.fillStyle='#fff3c0';ctx.beginPath();ctx.arc(x+6,y-27,2.4,0,TAU);ctx.fill();}});}
  // forest crew (people are depth-sorted among the trees)
  const hp=(p,o)=>{const [x,y]=P(p.i,p.j);if(!inView(x,y,40)) return;objs.push({k:p.i+p.j+.01,f:()=>human(ctx,x,y,Object.assign({look:p.look,fx:p.fx,back:p.back,pose:p.pose,ph:p.ph,t:p.wt},o||{}))});};
  for(const p of scene.jacks) hp(p);
  if(scene.foreman) hp(scene.foreman);
  for(const p of scene.planters||[]) hp(p,{t:p.wt});
  // log landings (piles grow as crews deliver)
  for(const k in LANDINGS){const lg=LANDINGS[k];const [x,y]=P(lg.i,lg.j);if(!inView(x,y,60)) continue;objs.push({k:lg.i+lg.j,f:()=>drawLanding(ctx,lg)});}
  // tea break by the campfire
  {const [x,y]=P(CAMP.i,CAMP.j);if(inView(x,y,80)){objs.push({k:CAMP.i+CAMP.j,f:()=>drawCampfire(ctx,CAMP.i,CAMP.j)});
    objs.push({k:CAMP.i+CAMP.j-.6,f:()=>{const V=VF(CAMP.i-.5,CAMP.j-.5,-Math.PI/4,0);vlog(ctx,V,-.75,.75,0,3.6,3.6,'#7a4e26');}});
    for(const c of scene.campers){const ci=c.pose==='drink'?CAMP.i+c.o[0]:CAMP.i-.5+c.o[0]*1.4,cj=c.pose==='drink'?CAMP.j+c.o[1]:CAMP.j-.5-c.o[0]*1.4;const [hx,hy]=P(ci,cj);
      objs.push({k:ci+cj+.02,f:()=>human(ctx,hx,hy,{look:c.look,fx:c.fx,pose:c.pose,ph:c.ph})});}}}
  for(const v of scene.logTrucks){if(v.done||v.i===undefined) continue;const [x,y]=P(v.i,v.j);if(!inView(x,y,110)) continue;
    const unloading=v.li===0&&v.legs[0].pa.tot-v.s<.05&&v.v===0;let boom=null;if(unloading){const ph=(v.unload||0)/.85;if(ph<6) boom={t:ph%1,carry:(ph%1)<.5&&v.load>0};}
    objs.push({k:v.i+v.j,f:()=>{const st=logTruck(ctx,v.i,v.j,v.yaw,{col:v.col,load:v.load,boom,brake:v.brake,bounce:vehBounce(v)});exhaust(st,v);}});}
  for(const h of scene.harvesters){const i=-1.2+h.k*2.2, j=13.6+h.k*1.4+Math.sin(h.ph*.25)*1.4;const [x,y]=P(i,j);if(!inView(x,y,80)) continue;
    objs.push({k:i+j,f:()=>harvesterV(ctx,i,j,h.yaw||0,h.ph)});}
  for(const w of scene.workers){const f=w.p<1?w.p:2-w.p;const [i,j,di,dj]=pathAt(w.path,f);const [x,y]=P(i,j);if(!inView(x,y,30)) continue;
    const sg=w.p<1?1:-1,sdx=(di-dj)*sg,sdy=(di+dj)*sg;const carrying=w.p<1&&!w.idle;
    objs.push({k:i+j,f:()=>human(ctx,x,y,{look:w.look,fx:sdx>=0?1:-1,back:sdy<0,pose:w.idle?'stand':carrying?'box':'walk',ph:w.ph,cargo:carrying?w.res:null,zz:w.idle})});}
  for(const fl of scene.forklifts){if(fl.i===undefined) continue;const [x,y]=P(fl.i,fl.j);if(!inView(x,y,40)) continue;
    objs.push({k:fl.i+fl.j,f:()=>forklift(ctx,fl.i,fl.j,fl.yaw||0,fl.p<1?fl.res:null,Math.sin(fl.ph*3)*.25)});}
  for(const tk of scene.dockTrucks){if(tk.i===undefined) continue;const [x,y]=P(tk.i,tk.j);if(!inView(x,y,110)) continue;
    objs.push({k:tk.i+tk.j,f:()=>{const st=boxTruck(ctx,tk.i,tk.j,tk.yaw,{col:tk.col,box:tk.box,stripe:tk.stripe,load:tk.load,doors:tk.doors,brake:tk.brake,bounce:vehBounce(tk)});exhaust(st,tk);}});}
  if(scene.dockHand&&scene.dockHand.active){const dh=scene.dockHand,f=dh.p<1?dh.p:2-dh.p;const a=[28.35,22.15],b=[28.62,20.55];const i=lerp(a[0],b[0],f),j=lerp(a[1],b[1],f);const [x,y]=P(i,j,7);
    objs.push({k:i+j,f:()=>human(ctx,x,y,{look:dh.look,fx:dh.p<1?1:-1,back:dh.p<1,pose:dh.p<1?'box':'walk',ph:dh.ph,cargo:dh.p<1?'furniture':null})});}
  premDraw(ctx,objs,inView); staffDraw(ctx,objs,inView); techDraw(ctx,objs,inView); forestDraw(ctx,objs,inView);
  for(const L of lots){const o=stockObj(ctx,L);if(o) objs.push(o);}
  objs.sort((a,b)=>a.k-b.k);
  for(const o of objs) o.f();
  scene.objCount=objs.length;
  staffPost(ctx);
  // loading progress over the docked truck
  for(const tk of scene.dockTrucks){if(tk.li!==3||tk.i===undefined) continue;const [x,y]=P(tk.i,tk.j,70);if(!inView(x,y,40)) continue;
    ctx.fillStyle='rgba(30,22,12,.72)';rr(ctx,x-19,y-4,38,8,4);ctx.fill();ctx.fillStyle=tk.load>=1?'#8fd14f':'#f5c84c';rr(ctx,x-17,y-2,34*Math.max(.06,tk.load),4,2);ctx.fill();}
  // drifting cloud shadows (soft, over ground and roofs)
  ctx.fillStyle='rgba(25,45,15,.075)';
  for(let k=0;k<3;k++){const span=2600,cx=((scene.t*9+k*890)%span)-1300,cy=120+k*330-((scene.t*4.5+k*445)%span)*.5+300;
    if(cx<vx0-260||cx>vx1+260||cy<vy0-160||cy>vy1+160) continue;
    ctx.beginPath();ctx.ellipse(cx,cy,150,58,0,0,TAU);ctx.ellipse(cx+110,cy+22,100,44,0,0,TAU);ctx.ellipse(cx-100,cy+18,90,40,0,0,TAU);ctx.fill();}
  // air traffic
  for(const d of scene.drones){const cx=-6+(d.k%3)*3.5,cj=10+(d.k%2)*5;const a=d.ph*.5+d.k*1.3;const i=cx+Math.cos(a)*2.4,j=cj+Math.sin(a)*2.4;const [x,y]=P(i,j);drone(ctx,x,y,46+Math.sin(d.ph*2)*4,d.ph);
    if(Math.random()<dt*2){emitP(x,y-40,'spark');}}
  for(const h of scene.helis){const T=16,tt=(h.ph%T)/T;const A=P(-14,-1),B=P(3.2,3.6);let e,carry;if(tt<.5){e=tt*2;carry=true;}else{e=1-(tt-.5)*2;carry=false;}const s=e*e*(3-2*e);
    const x=A[0]+(B[0]-A[0])*s,y=A[1]+(B[1]-A[1])*s;heli(ctx,x,y,74,h.ph,carry);}
  forestAir(ctx,dt);
  // smoke & particles (world space)
  for(const s of scene.smoke){const k2=s.life/s.max,r=s.kind==='exh'?1.6+k2*6:3+k2*11;const a=(1-k2)*(s.kind==='dark'?.55:s.kind==='grey'?.42:.5);
    ctx.fillStyle=s.kind==='dark'?`rgba(70,64,60,${a})`:s.kind==='grey'||s.kind==='exh'?`rgba(140,138,135,${s.kind==='exh'?a*.75:a})`:`rgba(250,250,248,${a})`;ctx.beginPath();ctx.arc(s.x,s.y,r,0,TAU);ctx.fill();}
  for(const p of scene.particles){const k2=p.life/p.max;
    if(p.col==='spark'){ctx.fillStyle=`rgba(120,255,240,${k2})`;ctx.fillRect(p.x-1,p.y-1,2,2);continue;}
    if(p.type==='dust'||p.type==='poof'){ctx.fillStyle=p.col+(k2*.7)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1.6-k2*.6),0,TAU);ctx.fill();continue;}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=Math.min(1,k2*2);ctx.fillStyle=p.col;ctx.fillRect(-p.size,-p.size*.6,p.size*2,p.size*1.2);ctx.restore();}
  for(const a of scene.axes){const k2=a.t/.35;const ang=-1.2+Math.sin(Math.min(1,k2*1.6)*Math.PI)*1.9;
    ctx.save();ctx.translate(a.x,a.y);ctx.scale(1.25,1.25);ctx.rotate(ang);ctx.globalAlpha=Math.min(1,(1-k2)*3);
    ctx.fillStyle='#7a4a22';ctx.fillRect(-1.5,-22,3,24);ctx.fillStyle='#c9d2da';ctx.beginPath();ctx.moveTo(1,-22);ctx.lineTo(11,-26);ctx.lineTo(12,-14);ctx.lineTo(1,-16);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#5a6470';ctx.lineWidth=.8;ctx.stroke();ctx.restore();}
  // v2.3: time-of-day light map (multiplied over the world), then sky & weather
  drawLighting(ctx);
  // ---- screen-space overlays ----
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawSky(ctx); drawWeather(ctx,dt);
  drawOverlays(ctx); staffOverlays(ctx); techOverlays(ctx); forestOverlays(ctx);
  drawGolden(ctx,dt);
}
function pill(ctx,x,y,txt,o){
  o=o||{}; const fs=o.fs||11; ctx.font=`800 ${fs}px system-ui,sans-serif`;
  const tw=ctx.measureText(txt).width, ic=o.icon?fs+4:0, w=tw+ic+(o.padX||14), h=fs+(o.padY||9);
  const x0=x-w/2,y0=y-h/2;
  ctx.fillStyle='rgba(0,0,0,.25)';rr(ctx,x0,y0+2,w,h,h/2);ctx.fill();
  ctx.fillStyle=o.bg||'rgba(43,27,14,.82)';rr(ctx,x0,y0,w,h,h/2);ctx.fill();
  if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.lw||1.5;ctx.stroke();}
  if(o.icon){coinAt(ctx,x0+(o.padX||14)/2+fs/2+1,y,fs*.55,o.icon);ctx.font=`800 ${fs}px system-ui,sans-serif`;}
  ctx.fillStyle=o.fg||'#fff6e0';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(txt,x0+(o.padX||14)/2+ic,y+.5);
  return [x0,y0,w,h];
}
function coinAt(ctx,x,y,r,kind){
  if(kind==='log'){ctx.fillStyle='#8a5a2c';ctx.fillRect(x-r*1.3,y-r*.7,r*2.2,r*1.4);ell(ctx,x+r*.9,y,r*.55,r*.72,'#e2b67a');return;}
  ell(ctx,x,y,r,r,'#f5c84c');ctx.strokeStyle='#b8860b';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
  ctx.fillStyle='#a8740c';ctx.font=`900 ${r*1.3}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',x,y+.5);
}
function drawOverlays(ctx){
  const z=scene.cam.z, t=scene.t;
  const showTags=z>.33;
  for(const b of BUILDINGS){const L=LOTS[b.id],st=S.buildings[b.id];if(b.tech||!L.top) continue;if(b.premium&&!S.premium.lvl) continue;
    const [sx,sy]=w2s(L.top[0],L.top[1]);
    if(sx<-80||sx>scene.w+80||sy<-60||sy>scene.h+120) continue;
    if(!st.lvl){
      const vis=bVisible(b),cost=bulkCost(b.cost,b.scale,0,1),can=S.coins+1e-9>=cost; const bob=can?Math.sin(t*4)*3:0;
      if(vis){
        pill(ctx,sx,sy-14+bob,`${b.name}`,{bg:can?'#4fa633':'rgba(43,27,14,.82)',fs:11,stroke:can?'#c9f59e':null});
        pill(ctx,sx,sy+6+bob,fmt(cost),{icon:'coin',bg:can?'#fff6e0':'rgba(255,246,224,.85)',fg:can?'#3b7f27':'#8a6a40',fs:11,stroke:can?'#4fa633':'#d9b98a'});
        if(can){ctx.fillStyle='#4fa633';ctx.beginPath();const ay=sy-34+Math.sin(t*5)*4;ctx.moveTo(sx-7,ay-8);ctx.lineTo(sx+7,ay-8);ctx.lineTo(sx,ay);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
      } else pill(ctx,sx,sy-4,'🔒 Earn '+fmt(b.cost*.25),{fs:10,bg:'rgba(43,27,14,.6)'});
      continue;
    }
    const bs=bstat[b.id], starved=st.on&&bs.f<0.985, ms=msCount(st.lvl);
    if(showTags){
      const hov=scene.hover===b.id||sheetBld===b.id;
      const fp=L.prem?P(L.ci-.2,L.cj-.2,L.id==='showroom'?62:44):P(L.ci+(L.face==='I'?1.95:.2),L.cj+(L.face==='I'?.2:1.95),0); let [px,py]=w2s(fp[0],fp[1]); if(L.prem) px-=30*Math.max(.8,Math.min(1.4,scene.cam.z)); // v2.2: premium tags float above the roof so they never cover a name board
      const txt='Lv '+st.lvl+(ms?' '+'★'.repeat(Math.min(ms,6)):'');
      pill(ctx,px,py+2,txt,{fs:hov?12:10.5,bg:hov?'#fff6e0':'rgba(43,27,14,.78)',fg:hov?'#7a4a10':(ms?'#ffe27a':'#fff6e0'),stroke:hov?'#e8a020':null,padX:12,padY:7});
    }
    if(S.fires[b.id]){} // v2.4: the fire pill replaces status badges
    else if(bs.full&&st.on){const by=sy-10+Math.sin(t*4)*2.5;pill(ctx,sx,by,'⛔ FULL',{bg:'#c4463d',fg:'#fff',fs:11.5,stroke:'#ffd2cc',padX:12,padY:7});}
    else if(starved){
      // v2.2: mild shortages (>=70% running) get a small calm amber badge; real starvation keeps the bouncing red alert
      const bad=bs.f<.7, R=bad?12:8.5, by=sy-8+(bad?Math.sin(t*5)*3:0);ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(sx,by+2,R,0,TAU);ctx.fill();
      ctx.fillStyle=bad?'#e8473c':'#e3a32a';ctx.beginPath();ctx.arc(sx,by,R,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(sx-R*.42,by+R*.75);ctx.lineTo(sx+R*.42,by+R*.75);ctx.lineTo(sx,by+R*1.33);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,by,R,0,TAU);ctx.stroke();
      ctx.fillStyle='#fff';ctx.font=`900 ${bad?15:11}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',sx,by+1);
    } else if(!st.on){ctx.fillStyle='rgba(255,255,255,.95)';ctx.strokeStyle='rgba(40,40,70,.7)';ctx.lineWidth=3;ctx.textAlign='center';ctx.textBaseline='middle';
      for(let k=0;k<3;k++){const ph=(t*.6+k/3)%1;ctx.globalAlpha=Math.sin(ph*Math.PI);ctx.font=`900 ${11+ph*8}px system-ui`;ctx.strokeText('z',sx+ph*16-4,sy-ph*26);ctx.fillText('z',sx+ph*16-4,sy-ph*26);}ctx.globalAlpha=1;}
    if(scene.msFlash&&scene.msFlash.id===b.id){const k=scene.msFlash.t/1.6, y2=sy-20-(1-k)*30;ctx.save();ctx.globalAlpha=Math.min(1,k*2);ctx.translate(sx,y2);ctx.rotate((1-k)*6);
      ctx.fillStyle='#f5c84c';ctx.strokeStyle='#a86a00';ctx.lineWidth=2;ctx.beginPath();for(let q=0;q<10;q++){const r=q%2?8:18,a=q/10*TAU-Math.PI/2;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      ctx.globalAlpha=Math.min(1,k*2);pill(ctx,sx,y2+28,'×2 speed!',{bg:'#f5c84c',fg:'#5a3a00',fs:12});ctx.globalAlpha=1;}
  }
  // yard + dock labels
  if(showTags){
    for(const [L,txt,id] of [[YARD,'Log Yard','yard'],[DOCK,'Shipping','dock']]){if(!L.top) continue;const [sx,sy]=w2s(L.top[0],L.top[1]);const hov=scene.hover===id;
      pill(ctx,sx,sy,(id==='yard'?'🪵 ':'🚚 ')+txt,{fs:hov?12:10.5,bg:hov?'#fff6e0':'rgba(43,27,14,.7)',fg:hov?'#7a4a10':'#fff6e0',padX:12,padY:7});}
  }
  premOverlays(ctx,showTags);
  // floating numbers
  for(const f of scene.floats){const k=f.t/f.dur;const [sx,sy]=w2s(f.x,f.y);const y=sy-k*(f.big?60:44);ctx.globalAlpha=k<.7?1:1-(k-.7)/.3;
    const fs=f.big?20:f.timber?17:15;ctx.font=`900 ${fs}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';const tw=ctx.measureText(f.text).width;const ix=f.coin||f.log?fs*.75:0;const x0=sx-(tw+ix)/2;
    if(f.coin) coinAt(ctx,x0+fs*.35,y,fs*.42,'coin'); if(f.log) coinAt(ctx,x0+fs*.35,y,fs*.38,'log');
    ctx.lineWidth=4;ctx.strokeStyle='rgba(40,20,5,.85)';ctx.strokeText(f.text,x0+ix,y);ctx.fillStyle=f.col||(f.coin?'#ffe066':'#fff');ctx.fillText(f.text,x0+ix,y);ctx.globalAlpha=1;}
  // first-time hint
  if(S.lifetimeClicks<8&&totCol()===0){const [tb,bb]=barH();let hs=null;for(const q of jackSpots()){const p=P(q.tree.i,q.tree.j,26);const s2=w2s(p[0],p[1]);if(s2[1]>tb+80&&s2[1]<scene.h-bb-60&&s2[0]>100&&s2[0]<scene.w-100){hs=s2;break;}}if(hs){const [sx,sy]=hs;const pr=(t*1.2)%1;
    ctx.strokeStyle=`rgba(255,255,255,${1-pr})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy,10+pr*22,0,TAU);ctx.stroke();
    ctx.font='26px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('👆',sx+10,sy+22+Math.sin(t*5)*4);
    pill(ctx,sx,sy-34,'Tap the forest to chop!',{bg:'#fff6e0',fg:'#7a4a10',fs:12,stroke:'#e8a020'});}}
}
