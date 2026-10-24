'use strict';
/* ===================== v2.8 SPRITE CACHE =====================
   Procedural drawings (people, trees, vehicles …) are rendered once into offscreen canvases and then blitted with drawImage.
   - Resolution follows the camera in √2 zoom buckets and never below the on-screen scale (crisp on 2x/3x screens).
   - LRU by pixel budget; canvases of evicted sprites are recycled so the cache does not churn the GC.
   - At most SPR.maxMiss new sprites are rendered per frame (the rest are drawn directly that frame) so a zoom change never hitches.
   - Pre-rendered PNG atlases in assets/ (tools/build_assets.py) are used for any key they contain. */
/* offscreen canvases are not DOM nodes (thousands of cached sprites used to inflate the node count) */
function mkCanvas(w,h){if(typeof OffscreenCanvas!=='undefined') return new OffscreenCanvas(Math.max(1,w),Math.max(1,h));const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const SPR={map:new Map(),px:0,budget:20e6,pool:[],hits:0,miss:0,direct:0,frameMiss:0,maxMiss:12,on:true,atlas:null,atlasFrames:null,atlasScale:2,atlasHits:0,stable:false,last:new Map(),scaled:0};
/* Blits are only fast when they are unscaled and land on whole device pixels (a scaled or sub-pixel drawImage resamples every
   pixel and costs ~7x more in software rasterisers). Sprites are therefore rendered at the exact current device scale and blitted
   with an identity transform at rounded positions. While the camera zooms, cache misses draw directly instead. */
function sprFrame(){SPR.frameMiss=0;SPR.liveRe=0;const c=scene.cam;SPR.stable=Math.abs(c.z-c.tz)<1e-4&&!camZooming();}
/* v2.9: while a pinch / wheel / fly-to zoom is in progress, cache misses blit the most recent cached frame of the same sprite
   scaled (one resampled drawImage) instead of re-running the vector drawing; sharp sprites are rendered once the zoom settles */
function camZooming(){return !!(scene.zoomUntil&&performance.now()<scene.zoomUntil);}
function sprCanvas(w,h){let c=null;for(let k=SPR.pool.length-1;k>=0;k--){const p=SPR.pool[k];if(p.width>=w&&p.height>=h&&p.width*p.height<=w*h*2){c=p;SPR.pool.splice(k,1);break;}}
  if(!c) c=mkCanvas(w,h);const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);g.globalAlpha=1;g.globalCompositeOperation='source-over';return c;}
function sprEvict(){while(SPR.px>SPR.budget&&SPR.map.size){const k=SPR.map.keys().next().value,e=SPR.map.get(k);SPR.map.delete(k);if(SPR.last.get(e.base)===e) SPR.last.delete(e.base);SPR.px-=e.c.width*e.c.height;if(SPR.pool.length<96) SPR.pool.push(e.c);}}
function sprClear(){for(const e of SPR.map.values()) if(SPR.pool.length<96) SPR.pool.push(e.c);SPR.map.clear();SPR.last.clear();SPR.px=0;LIVE.clear();PILLS.clear();}
function blit(ctx,c,w,h,m,x,y){ // x,y = top-left in the current (scale-only) transform
  const dx=Math.round(m.a*x+m.e),dy=Math.round(m.d*y+m.f);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(c,0,0,w,h,dx,dy,w,h);ctx.setTransform(m);}
/* draw `fn(g,0,0)` (anchor at the origin) through the cache; box = [x0,y0,x1,y1] around the anchor in world units */
function sprite(ctx,key,x,y,box,fn){
  if(!SPR.on||ctx!==scene.ctx){fn(ctx,x,y);return;}
  const m=ctx.getTransform();
  if(m.b!==0||m.c!==0||Math.abs(m.a-m.d)>1e-6){fn(ctx,x,y);SPR.direct++;return;}
  const sc=m.a, k=key+'@'+sc.toFixed(4); let e=SPR.map.get(k);
  if(e){SPR.map.delete(k);SPR.map.set(k,e);SPR.hits++;if(SPR.last.get(key)!==e) SPR.last.set(key,e);}
  else{
    if(!SPR.stable){const l=SPR.last.get(key);
      if(l){const r=sc/l.sc,ax=m.a*x+m.e,ay=m.d*y+m.f;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(l.c,0,0,l.w,l.h,ax+l.ox*r,ay+l.oy*r,l.w*r,l.h*r);ctx.setTransform(m);SPR.scaled++;return;}}
    if(SPR.frameMiss>=(SPR.stable?SPR.maxMiss:8)){SPR.direct++;fn(ctx,x,y);return;}   // while zooming a few new sprites are still cached so later frames can scale them
    SPR.frameMiss++;SPR.miss++;
    // render with the anchor's sub-pixel phase baked in so the blit lands on whole pixels
    const ax=m.a*x+m.e, ay=m.d*y+m.f, fx=ax-Math.floor(ax), fy=ay-Math.floor(ay);
    const w=Math.max(1,Math.ceil((box[2]-box[0])*sc)+1),h=Math.max(1,Math.ceil((box[3]-box[1])*sc)+1);
    const c=sprCanvas(w,h),g=c.getContext('2d');const ox=Math.floor(box[0]*sc),oy=Math.floor(box[1]*sc);
    g.setTransform(sc,0,0,sc,fx-ox,fy-oy);fn(g,0,0);
    e={c,w,h,ox,oy,sc,base:key};SPR.map.set(k,e);SPR.last.set(key,e);SPR.px+=c.width*c.height;sprEvict();
  }
  const dx=Math.floor(m.a*x+m.e)+e.ox,dy=Math.floor(m.d*y+m.f)+e.oy;
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(e.c,0,0,e.w,e.h,dx,dy,e.w,e.h);ctx.setTransform(m);
}
const _lookId=new WeakMap();let _lookSeq=0;
function lookKey(L){if(!L) return 'd';let k=_lookId.get(L);if(k===undefined){k=++_lookSeq;_lookId.set(L,k);}return k;}
/* people: ph / t are quantised into animation frames; poses that animate from the clock get a 4 s loop at 8 fps */
const H_TPOSE={saw:1,water:1,brow:1,clip:1,spray:1,look:1,drink:1,sitdrink:1};
const H_BOX=[-24,-62,24,8];
function human(ctx,x,y,o){
  if(!SPR.on||ctx!==scene.ctx){humanRaw(ctx,x,y,o);return;}
  const pose=o.pose||'stand', tp=H_TPOSE[pose]||o.zz;
  const TW=Math.PI*2, ph=o.ph||0, qph=tp?Math.floor((((ph%TW)+TW)%TW)/TW*4):Math.floor((((ph%TW)+TW)%TW)/TW*12)%12;
  const qt=o.t===undefined?-1:Math.floor((((o.t%1)+1)%1)*16);
  const tf=tp?Math.floor(scene.t*8)%32:0;
  const key='h'+lookKey(o.look)+pose+qph+'|'+qt+'|'+tf+(o.fx<0?'L':'R')+(o.back?'b':'f')+(o.cargo||'')+(o.zz?'z':'')+(o.noShadow?'n':'')+'|'+(o.s||1.15)+'|'+Math.round((o.lift||0)*2);
  sprite(ctx,key,x,y,H_BOX,(g,ax,ay)=>{const T0=scene.t;if(tp) scene.t=tf/8;
    const q=Object.assign({},o,{ph:tp?qph/4*TW:qph/12*TW});if(qt>=0) q.t=qt/16;humanRaw(g,ax,ay,q);scene.t=T0;});
}
/* trees: upright grown trees, saplings and stumps are cached; falling / felled / shaking trees draw directly */
const T_BOX=[-30,-66,30,8];
/* key of a tree frame in the pre-rendered atlas (assets/atlas-trees.png, built by tools/build_assets.py): drawn at s=1 */
function treeAtlasKey(tier,seas,qv,qg,stump){return 'T'+tier+'|'+seas+'|'+(stump?'s':qv+'|'+qg);}
function atlasBlit(g,key,scale){const f=SPR.atlasFrames&&SPR.atlasFrames[key];if(!f||!SPR.atlas) return false;const A=SPR.atlasScale;
  g.save();if(scale&&scale!==1) g.scale(scale,scale);g.drawImage(SPR.atlas,f[0],f[1],f[2],f[3],f[4],f[5],f[2]/A,f[3]/A);g.restore();SPR.atlasHits++;return true;}
function drawTree(ctx,x,y,t,tier){
  if(!SPR.on||ctx!==scene.ctx||t.down||t.fall>0||t.shake>0){drawTreeRaw(ctx,x,y,t,tier);return;}
  const qv=Math.round((t.var||0)*10)/10, g=t.grow===undefined?1:t.grow, qg=g>=.4?1:Math.round(g*50)/50, qs=Math.round((t.s||1)*50)/50, st=t.stump>0;
  const wind=!st&&t.dyn&&scene.wxv&&scene.wxv.wind>.05&&g>=.4?Math.sin(scene.t*2.3+t.var*9)*.045*scene.wxv.wind:0;
  if(wind){drawTreeRaw(ctx,x,y,t,tier);return;}
  // grown trees between 0.4 and 1 are drawn at s*grow, so they share the mature frame scaled
  const sc=st||g<.4?1:qs*Math.round(g*50)/50, key='t'+tier+'|'+SEAS+'|'+qv+'|'+qg+'|'+(st?1:sc);
  sprite(ctx,key,x,y,T_BOX,(gc,ax,ay)=>{
    if(SPR.atlas&&gc.getTransform().a<=SPR.atlasScale*sc+1e-6){gc.save();gc.translate(ax,ay);const ok=atlasBlit(gc,treeAtlasKey(tier,SEAS,qv,qg,st),sc);gc.restore();if(ok) return;}
    drawTreeRaw(gc,ax,ay,{s:st||g<.4?(t.s||1):sc,grow:st||g<.4?qg:undefined,var:qv,stump:t.stump,dyn:false,fdir:t.fdir},tier);});
}
/* pre-rendered atlases are optional: the game runs on runtime-rendered sprites until (or if) they load */
function loadAtlas(){
  if(/[?&]noatlas/.test(location.search)) return;
  fetch('assets/atlas-trees.json').then(r=>r.ok?r.json():null).then(j=>{if(!j) return;const im=new Image();
    im.onload=()=>{SPR.atlas=im;SPR.atlasFrames=j.frames;SPR.atlasScale=j.scale;sprClear();};im.src='assets/'+j.image;}).catch(()=>{});
}
/* ---------- live sprites: one cached canvas per building, re-rendered at a reduced animation rate ----------
   Buildings are the heaviest vector drawings. Each one is rendered into its own offscreen canvas and re-rendered only when its
   signature changes (level, running, season, weather, zoom bucket) or its animation frame is due (15 fps while running, 3 fps idle).
   Side effects of the draw call are preserved: window-light quads are replayed every frame and particle/smoke emitters see the
   accumulated dt of the skipped frames, so emission rates stay the same. */
const LIVE=new Map();
function liveSprite(ctx,id,box,sig,fps,fn){
  if(!SPR.on||ctx!==scene.ctx) return fn(ctx);
  const m=ctx.getTransform(); if(m.b!==0||m.c!==0||Math.abs(m.a-m.d)>1e-6) return fn(ctx);
  const sc=m.a; let e=LIVE.get(id);
  const ox=Math.floor(m.a*box[0]+m.e), oy=Math.floor(m.d*box[1]+m.f), fx=m.a*box[0]+m.e-ox, fy=m.d*box[1]+m.f-oy;
  const pos=fx.toFixed(3)+','+fy.toFixed(3);
  const stale=!e||e.sig!==sig||e.sc!==sc||e.pos!==pos||e.bw!==box[2]-box[0]||e.bh!==box[3]-box[1];
  const due=stale||scene.t-e.t>=1/fps||scene.t<e.t;
  // zooming, or (v2.9) too many buildings went stale at once after a zoom: scale the last frame, re-render a few per frame
  const scaleOnly=e&&e.sc&&e.w&&e.sig===sig&&e.bw===box[2]-box[0]&&e.bh===box[3]-box[1];
  if(stale&&(!SPR.stable||(scaleOnly&&SPR.liveRe>=4))){
    if(e&&e.sc&&e.w){const r=sc/e.sc;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(e.c,0,0,e.w,e.h,m.a*box[0]+m.e,m.d*box[1]+m.f,e.w*r,e.h*r);ctx.setTransform(m);
      for(const q of e.lq) scene.lq.push(q);SPR.scaled++;return e.ret;}
    return fn(ctx);}
  if(due&&(stale||SPR.frameMiss<SPR.maxMiss)){
    SPR.frameMiss++;if(stale) SPR.liveRe++;
    const w=Math.max(1,Math.ceil((box[2]-box[0])*sc)+1),h=Math.max(1,Math.ceil((box[3]-box[1])*sc)+1);
    if(!e){e={c:mkCanvas(1,1),t:scene.t-Math.random()/fps,lq:[]};LIVE.set(id,e);}
    if(e.c.width!==w||e.c.height!==h){e.c.width=w;e.c.height=h;}
    const g=e.c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);g.setTransform(sc,0,0,sc,fx-box[0]*sc,fy-box[1]*sc);
    const dt0=scene.dtF;scene.dtF=Math.min(.3,Math.max(dt0,scene.t-e.t));const lq0=scene.lq.length;
    e.ret=fn(g);scene.dtF=dt0;e.lq=scene.lq.slice(lq0);e.t=scene.t;e.sig=sig;e.sc=sc;e.pos=pos;e.bw=box[2]-box[0];e.bh=box[3]-box[1];e.w=w;e.h=h;
  } else if(e.lq.length) for(const q of e.lq) scene.lq.push(q);
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(e.c,0,0,e.w,e.h,ox,oy,e.w,e.h);ctx.setTransform(m);
  return e.ret;
}
function liveClear(){LIVE.clear();}
/* screen-space label cache (pills, tags): text rendering is one of the costliest canvas ops in software rasterisers */
const PILLS=new Map();
function pillCached(ctx,x,y,txt,o){
  if(!SPR.on||ctx!==scene.ctx) return pillRaw(ctx,x,y,txt,o);
  o=o||{};const dpr=scene.dpr,key=txt+'|'+(o.fs||11)+'|'+(o.bg||'')+'|'+(o.fg||'')+'|'+(o.stroke||'')+'|'+(o.lw||'')+'|'+(o.icon||'')+'|'+(o.padX||'')+'|'+(o.padY||'')+'|'+dpr;
  let e=PILLS.get(key);
  if(!e){const fs=o.fs||11,g0=scene.ctx;g0.save();g0.font=`800 ${fs}px system-ui,sans-serif`;const tw=g0.measureText(txt).width;g0.restore();
    const ic=o.icon?fs+4:0,w=tw+ic+(o.padX||14)+8,h=fs+(o.padY||9)+8;
    const c=mkCanvas(Math.ceil(w*dpr),Math.ceil(h*dpr));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    const r=pillRaw(g,w/2,h/2-1,txt,o);e={c,w,h,r:[r[0]-w/2,r[1]-(h/2-1),r[2],r[3]]};
    if(PILLS.size>600) PILLS.clear();PILLS.set(key,e);}
  else{PILLS.delete(key);PILLS.set(key,e);}
  const m=ctx.getTransform();if(m.b===0&&m.c===0&&Math.abs(m.a-dpr)<1e-6&&Math.abs(m.d-dpr)<1e-6) blit(ctx,e.c,e.c.width,e.c.height,m,x-e.w/2,y-e.h/2+1);else ctx.drawImage(e.c,x-e.w/2,y-e.h/2+1,e.w,e.h);
  return [x+e.r[0],y+e.r[1],e.r[2],e.r[3]];
}
/* ---------- vehicles: cached per heading (64 steps), suspension bounce, load and door state ----------
   The draw functions are translation-invariant in the iso projection, so a sprite rendered at one spot is valid everywhere;
   the exhaust point they return is stored relative to the anchor and re-based on every hit. */
const TAU64=Math.PI*2/64;
function qYaw(y){return Math.round(y/TAU64)*TAU64;}
function vehSprite(ctx,key,i,j,box,draw){
  const A=P(i,j); let rel=null;
  const fn=(g,ax,ay)=>{g.save();g.translate(ax-A[0],ay-A[1]);const st=draw(g);g.restore();return st?[st[0]-A[0],st[1]-A[1]]:null;};
  if(!SPR.on||ctx!==scene.ctx){const st=draw(ctx);return st;}
  rel=spriteRet(ctx,key,A[0],A[1],box,fn);
  return rel?[A[0]+rel[0],A[1]+rel[1]]:null;
}
/* sprite() variant that keeps the draw function's return value with the cached entry */
function spriteRet(ctx,key,x,y,box,fn){let ret;const k=key;
  const e0=SPR.map.get(k+'@'+ctx.getTransform().a.toFixed(4));if(e0) {sprite(ctx,k,x,y,box,fn);return e0.ret;}
  sprite(ctx,k,x,y,box,(g,ax,ay)=>{ret=fn(g,ax,ay);return ret;});
  const e=SPR.map.get(k+'@'+ctx.getTransform().a.toFixed(4));if(e) e.ret=ret;return ret;}
const VBOX=[-90,-86,90,48], VBOX_S=[-56,-64,56,34];
const q4=v=>Math.round((v||0)*4)/4, q6=v=>Math.round(Math.max(0,Math.min(1,v||0))*6)/6;
function logTruck(ctx,i,j,yaw,o){
  const qy=qYaw(yaw),b=q4(o.bounce),l=q6(o.load),bm=o.boom?{t:Math.round(o.boom.t*12)/12,carry:o.boom.carry}:null;
  const key='lt'+qy.toFixed(3)+'|'+b+'|'+l+'|'+(o.col||'')+'|'+(bm?bm.t+(bm.carry?'c':''):'')+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX,g=>logTruckRaw(g,i,j,qy,Object.assign({},o,{bounce:b,load:l,boom:bm})));
}
function boxTruck(ctx,i,j,yaw,o){
  const qy=qYaw(yaw),b=q4(o.bounce),l=q6(o.load),d=Math.round((o.doors||0)*4)/4;
  const key='bt'+qy.toFixed(3)+'|'+b+'|'+l+'|'+d+'|'+(o.col||'')+(o.box||'')+(o.stripe||'')+(o.logo||'')+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX,g=>boxTruckRaw(g,i,j,qy,Object.assign({},o,{bounce:b,load:l,doors:d})));
}
function limo(ctx,i,j,yaw,o){o=o||{};
  const qy=qYaw(yaw),b=q4(o.bounce),key='lm'+qy.toFixed(3)+'|'+b+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX,g=>limoRaw(g,i,j,qy,Object.assign({},o,{bounce:b})));
}
function fireTruck(ctx,i,j,yaw,o){
  const qy=qYaw(yaw),b=q4(o.bounce),fr=o.siren?Math.floor(scene.t*8)%8:0,key='ft'+qy.toFixed(3)+'|'+b+'|'+fr+(o.siren?'S':'')+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX,g=>{const T0=scene.t;scene.t=fr/8;const r=fireTruckRaw(g,i,j,qy,Object.assign({},o,{bounce:b}));scene.t=T0;return r;});
}
function forklift(ctx,i,j,yaw,cargo,bounce){
  const qy=qYaw(yaw),b=q4(bounce),key='fl'+qy.toFixed(3)+'|'+b+'|'+(cargo||'');
  return vehSprite(ctx,key,i,j,VBOX_S,g=>forkliftRaw(g,i,j,qy,cargo,b));
}
function mktVan(ctx,i,j,yaw,o){
  o=o||{}; const qy=qYaw(yaw),b=q4(o.bounce),l=q6(o.load);
  const key='mv'+qy.toFixed(3)+'|'+b+'|'+l+'|'+(o.cart?'C':'')+'|'+(o.col||'')+(o.box||'')+(o.stripe||'')+'|'+(o.cargo||'')+(o.brake?'B':'');
  return vehSprite(ctx,key,i,j,VBOX_S,g=>mktVanRaw(g,i,j,qy,Object.assign({},o,{bounce:b,load:l})));
}

/* v2.8 art pass: street lamp (was a grey bar with a dot) — cast-iron post with base, curved arm and a glass lantern */
function lampPostRaw(g,x,y){
  ell(g,x+2,y+1,5.5,2.6,'rgba(0,0,0,.22)');
  const OL='#1c2026';
  g.fillStyle=OL;g.fillRect(x-2.6,y-4.6,5.2,5.2);g.fillStyle='#4a525c';g.fillRect(x-2,y-4,4,4);g.fillStyle='#636c78';g.fillRect(x-2,y-4,1.4,4);
  g.fillStyle=OL;g.fillRect(x-1.5,y-31,3,27);g.fillStyle='#4a525c';g.fillRect(x-.9,y-31,1.8,27);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x-.9,y-31,.6,27);
  g.strokeStyle=OL;g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x,y-30);g.quadraticCurveTo(x+1,y-35,x+6.5,y-33.5);g.stroke();
  g.strokeStyle='#4a525c';g.lineWidth=1;g.stroke();g.lineCap='butt';
  g.fillStyle=OL;g.beginPath();g.moveTo(x+3.4,y-31.6);g.lineTo(x+9.6,y-31.6);g.lineTo(x+8.6,y-25.6);g.lineTo(x+4.4,y-25.6);g.closePath();g.fill();
  g.fillStyle='#fff1b8';g.beginPath();g.moveTo(x+4.2,y-31);g.lineTo(x+8.8,y-31);g.lineTo(x+8,y-26.3);g.lineTo(x+5,y-26.3);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.75)';g.fillRect(x+4.8,y-30.4,1,3.4);
  g.fillStyle=OL;g.beginPath();g.moveTo(x+2.8,y-31.4);g.lineTo(x+6.5,y-34.4);g.lineTo(x+10.2,y-31.4);g.closePath();g.fill();
  g.fillStyle='#363c44';g.fillRect(x+4.2,y-25.8,4.6,1.2);
}
function lampPost(ctx,x,y){sprite(ctx,'lamp',x,y,[-8,-38,14,5],(g,ax,ay)=>lampPostRaw(g,ax,ay));}
