'use strict';
/* ===================== v2.9 CAMERA & TOUCH INPUT =====================
   One pointer-events layer for mouse, pen and touch (the canvas has touch-action:none):
   - one-finger pan with momentum + friction, rubber-band soft bounds sized to the world, spring back on release
   - pinch zoom anchored at the pinch midpoint (the midpoint also pans), soft zoom limits that spring back
   - double-tap on open ground zooms in / back out; taps on buildings, the forest, fires and golden logs act immediately
   - a tap only fires when the pointer moved less than TAP_SLOP px (touch) and was not a long press
   - smooth eased camera fly-to (flyTo) used by quick-jump chips, the attention button, sheet prev/next and auto-focus */
const TAP_SLOP={touch:10,pen:8,mouse:5};
const CAM_WORLD={x0:-1000,x1:1240,y0:-300,y1:1320};   // v2.20: y1 1180 -> 1320 so phase-1 lots (south-east) can sit above an open sheet
   // v2.21.1: x0 -860 -> -1000 (row III + the forest crew beyond it)
   // v2.10: x1 1060 -> 1240 so the power plant (far east) can be framed   // world rect the viewport may show (camera centre is limited from it)
const GI={ptrs:new Map(),mode:null,start:null,last:null,samples:[],pinch:null,lastTap:null,noTap:false,touchedAt:0,taps:0,pans:0,pinches:0,dbl:0};
function camNow(){return performance.now();}
/* gesture timing uses the events' own timestamps, so a slow frame between down and up does not turn a tap into a long press */
function evT(e){const t=e&&e.timeStamp;return t>0&&t<=performance.now()+50?t:performance.now();}
function camLimits(z){
  const c=scene.cam;z=z||c.z;const hw=scene.w/2/z, hh=scene.h/2/z, B=CAM_WORLD;
  const ax=(a0,a1,h)=>{let lo=a0+h,hi=a1-h;if(lo>hi){lo=hi=(a0+a1)/2;}return [lo,hi];};
  const [x0,x1]=ax(B.x0,B.x1,hw),[y0,y1]=ax(B.y0,B.y1,hh);return {x0,x1,y0,y1};
}
function clampTo(v,a,b){return v<a?a:v>b?b:v;}
/* hard clamp used after programmatic moves (keeps old callers working) */
function clampCam(){const c=scene.cam;c.z=clampTo(c.z,c.minZ,c.maxZ);c.tz=clampTo(c.tz,c.minZ,c.maxZ);
  const L=camLimits(c.tz);c.tx=clampTo(c.tx,L.x0,L.x1);c.ty=clampTo(c.ty,L.y0,L.y1);
  if(!GI.mode&&!c.fly){const L2=camLimits(c.z);c.x=clampTo(c.x,L2.x0-1e-6,L2.x1+1e-6);c.y=clampTo(c.y,L2.y0-1e-6,L2.y1+1e-6);}}
function camOut(){const c=scene.cam,L=camLimits();return {x:c.x<L.x0?c.x-L.x0:c.x>L.x1?c.x-L.x1:0,y:c.y<L.y0?c.y-L.y0:c.y>L.y1?c.y-L.y1:0};}
function markZoom(ms){scene.zoomUntil=Math.max(scene.zoomUntil||0,camNow()+(ms||160));}
function zoomAt(sx,sy,nz){const c=scene.cam;const [wx,wy]=s2w(sx,sy);c.fly=null;c.vx=c.vy=0;
  c.z=clampTo(nz,c.minZ,c.maxZ);c.x=wx-(sx-scene.w/2)/c.z;c.y=wy-(sy-scene.h/2)/c.z;c.tx=c.x;c.ty=c.y;c.tz=c.z;markZoom(220);clampCam();}
/* rubber band: movement past the soft bound is progressively resisted */
function rubber(pos,delta,lo,hi,z){
  const over=pos<lo?lo-pos:pos>hi?pos-hi:0, outward=(pos<=lo&&delta<0)||(pos>=hi&&delta>0);
  if(!outward) return delta; const k=1/(1+over*z/42); return delta*k*.55;
}
/* ---------- fly-to ---------- */
function easeInOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function flyTo(wx,wy,z,ms){
  const c=scene.cam; z=clampTo(z||c.z,c.minZ,c.maxZ); const L=camLimits(z);
  const tx=clampTo(wx,L.x0,L.x1), ty=clampTo(wy,L.y0,L.y1);
  const d=Math.hypot((tx-c.x)*c.z,(ty-c.y)*c.z)+Math.abs(Math.log(z/c.z))*400;
  if(d<1){c.tx=tx;c.ty=ty;c.tz=z;return;}
  ms=ms||Math.min(900,Math.max(320,260+d*.55));
  c.vx=c.vy=0; c.fly={x0:c.x,y0:c.y,z0:c.z,x1:tx,y1:ty,z1:z,t0:camNow(),dur:ms}; c.tx=tx;c.ty=ty;c.tz=z;
}
/* centre world point (wx,wy) in the visible band between the top HUD and the bottom bar / open sheet */
function viewBand(){const [tb]=barH();const top=tb+(($('subbar')&&$('subbar').offsetHeight)||0)+8;const bot=Math.min(sheetTop(),scene.h-((($('bottombar').offsetHeight)||70)))-8;return [top,Math.max(top+80,bot)];}
/* horizontal visible band: the landscape rail on the left and an open side sheet on the right */
function viewBandX(){let x0=0,x1=scene.w;if(typeof railMode==='function'&&railMode()){x0=($('bottombar').getBoundingClientRect().right)||0;const sh=$('sheet');if(sh.classList.contains('open')) x1=Math.min(x1,scene.w-sh.offsetWidth);}return [x0,Math.max(x0+80,x1)];}
function flyToWorld(wx,wy,z,ms){const c=scene.cam;z=clampTo(z||c.z,c.minZ,c.maxZ);const [top,bot]=viewBand(),[x0,x1]=viewBandX();const sy=(top+bot)/2,sx=(x0+x1)/2;flyTo(wx-(sx-scene.w/2)/z,wy-(sy-scene.h/2)/z,z,ms);}
function camUpdate(dt){
  const c=scene.cam, now=camNow();
  if(c.fly){const f=c.fly;let t=(now-f.t0)/f.dur;if(t>=1) t=1;const e=easeInOut(t);
    c.x=f.x0+(f.x1-f.x0)*e;c.y=f.y0+(f.y1-f.y0)*e;c.z=f.z0*Math.pow(f.z1/f.z0,e);
    if(f.z1!==f.z0) markZoom(120); if(t>=1){c.fly=null;c.x=f.x1;c.y=f.y1;c.z=f.z1;} return;}
  if(GI.mode==='pan'||GI.mode==='pinch') return;
  if(c.vx||c.vy){
    c.x-=c.vx*dt/c.z;c.y-=c.vy*dt/c.z;
    const o=camOut(); const fr=Math.exp(-dt*(o.x||o.y?16:3.6)); c.vx*=fr;c.vy*=fr;
    if(o.x&&Math.sign(o.x)===-Math.sign(c.vx)) c.vx*=.6; if(o.y&&Math.sign(o.y)===-Math.sign(c.vy)) c.vy*=.6;
    if(Math.hypot(c.vx,c.vy)<12){c.vx=c.vy=0;}
    c.tx=c.x;c.ty=c.y; if(!c.vx&&!c.vy) clampTargets(); return;}
  const k=1-Math.exp(-dt*9);
  const zc=Math.abs(c.tz-c.z)>2e-5;
  c.x+=(c.tx-c.x)*k;c.y+=(c.ty-c.y)*k;c.z+=(c.tz-c.z)*k; if(zc) markZoom(120);
  if(Math.abs(c.tx-c.x)*c.z<.01&&Math.abs(c.ty-c.y)*c.z<.01&&Math.abs(c.tz-c.z)<2e-5){c.x=c.tx;c.y=c.ty;c.z=c.tz;}
}
function clampTargets(){const c=scene.cam;c.tz=clampTo(c.tz,c.minZ,c.maxZ);const L=camLimits(c.tz);c.tx=clampTo(c.tx,L.x0,L.x1);c.ty=clampTo(c.ty,L.y0,L.y1);}
function camBusy(){const c=scene.cam;return !!(GI.mode||c.fly||c.vx||c.vy);}
/* ---------- pointer handling ---------- */
function setupInput(){
  const cv=scene.canvas, c=scene.cam;
  const mid=()=>{const v=[...GI.ptrs.values()];return {x:(v[0].x+v[1].x)/2,y:(v[0].y+v[1].y)/2,d:Math.max(10,Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y))};};
  const beginPinch=()=>{const m=mid();const [wx,wy]=s2w(m.x,m.y);GI.pinch={d0:m.d,z0:c.z,wx,wy};GI.mode='pinch';GI.pinches++;cv.classList.add('dragging');};
  cv.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0) return;
    e.preventDefault();
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    GI.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType});
    GI.touchedAt=camNow();
    const flinging=Math.hypot(c.vx||0,c.vy||0)>140;   // a tap that stops a fling only stops it; taps during a fly-to still act
    c.fly=null;c.vx=c.vy=0;c.tx=c.x;c.ty=c.y;c.tz=c.z;
    if(GI.ptrs.size===1){GI.mode='pending';GI.noTap=flinging;const ts=evT(e);GI.start={x:e.clientX,y:e.clientY,t:ts,type:e.pointerType||'mouse'};GI.last={x:e.clientX,y:e.clientY};GI.samples=[{x:e.clientX,y:e.clientY,t:ts}];}
    else if(GI.ptrs.size===2) beginPinch();
  });
  cv.addEventListener('pointermove',e=>{
    const p=GI.ptrs.get(e.pointerId);
    if(!p){if(e.pointerType==='mouse') updateHover(e.clientX,e.clientY);return;}
    p.x=e.clientX;p.y=e.clientY;
    if(GI.mode==='pinch'&&GI.ptrs.size>=2){
      const m=mid(),P0=GI.pinch;let z=P0.z0*m.d/P0.d0;
      const lo=c.minZ,hi=c.maxZ; if(z<lo) z=lo*Math.pow(z/lo,.35); else if(z>hi) z=hi*Math.pow(z/hi,.35);
      c.z=z;c.tz=z;c.x=P0.wx-(m.x-scene.w/2)/z;c.y=P0.wy-(m.y-scene.h/2)/z;c.tx=c.x;c.ty=c.y;markZoom(200);return;}
    if(GI.mode==='pending'){
      const slop=TAP_SLOP[GI.start.type]||8;
      if(Math.hypot(e.clientX-GI.start.x,e.clientY-GI.start.y)>slop){GI.mode='pan';GI.pans++;cv.classList.add('dragging');scene.hover=null;}
    }
    if(GI.mode==='pan'){
      const dx=e.clientX-GI.last.x, dy=e.clientY-GI.last.y, L=camLimits();
      c.x+=rubber(c.x,-dx/c.z,L.x0,L.x1,c.z);c.y+=rubber(c.y,-dy/c.z,L.y0,L.y1,c.z);c.tx=c.x;c.ty=c.y;
      const t=evT(e);GI.samples.push({x:e.clientX,y:e.clientY,t});while(GI.samples.length>2&&t-GI.samples[0].t>110) GI.samples.shift();
    }
    GI.last={x:e.clientX,y:e.clientY};
  });
  const end=e=>{
    const had=GI.ptrs.delete(e.pointerId); if(!had) return;
    if(GI.mode==='pinch'){
      if(GI.ptrs.size===1){const v=[...GI.ptrs.values()][0];GI.mode='pan';GI.last={x:v.x,y:v.y};GI.samples=[{x:v.x,y:v.y,t:evT(e)}];return;}
      if(GI.ptrs.size===0){settleZoom(GI.last||{x:scene.w/2,y:scene.h/2});GI.mode=null;cv.classList.remove('dragging');}
      return;
    }
    if(GI.ptrs.size) return;
    const mode=GI.mode; GI.mode=null; cv.classList.remove('dragging');
    if(mode==='pending'&&e.type==='pointerup'&&!GI.noTap&&evT(e)-GI.start.t<650) handleTap(e.clientX,e.clientY,evT(e));
    else if(mode==='pan'){
      const S0=GI.samples,t=evT(e),a=S0[0],b=S0[S0.length-1];
      if(S0.length>=2&&t-b.t<80&&b.t-a.t>8){let vx=(b.x-a.x)/((b.t-a.t)/1000),vy=(b.y-a.y)/((b.t-a.t)/1000);const sp=Math.hypot(vx,vy),mx=4200;
        if(sp>mx){vx*=mx/sp;vy*=mx/sp;} if(sp>90){c.vx=vx;c.vy=vy;}}
      // c.vx/c.vy = finger velocity in screen px/s; camUpdate glides the camera with it (c.x-=vx*dt/z) and friction
      if(!c.vx&&!c.vy) clampTargets();
    }
  };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end); cv.addEventListener('lostpointercapture',end);
  cv.addEventListener('pointerleave',e=>{if(!GI.ptrs.size){scene.hover=null;cv.classList.remove('pointer');}});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();const f=e.ctrlKey?.012:.0016;zoomAt(e.clientX,e.clientY,c.z*Math.exp(-e.deltaY*f));},{passive:false});
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(typeof closeMore==='function'&&closeMore()) return;closeSheet();return;}
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(k){e.preventDefault();flyTo(c.tx+k[0]*160/c.z,c.ty+k[1]*120/c.z,c.tz,260);}
    else if(e.key==='+'||e.key==='='){const z=c.tz*1.25;flyTo(c.tx,c.ty,z,240);}
    else if(e.key==='-'){const z=c.tz/1.25;flyTo(c.tx,c.ty,z,240);}
  });
  setupGestureGuards();
}
/* after a pinch: spring the zoom back inside its limits, keeping the last pinch midpoint fixed */
function settleZoom(at){const c=scene.cam;const z=clampTo(c.z,c.minZ,c.maxZ);const [wx,wy]=s2w(at.x,at.y);
  const tx=wx-(at.x-scene.w/2)/z, ty=wy-(at.y-scene.h/2)/z;c.tz=z;c.tx=tx;c.ty=ty;clampTargets();if(z!==c.z) markZoom(400);}
function handleTap(x,y,ts){
  GI.taps++;
  const now=ts||camNow(),lt=GI.lastTap; GI.lastTap={x,y,t:now};
  const g=golden.cur; const goldHit=g&&Math.hypot(x-g.x,y-g.y)<=Math.max(30,goldenSize()*2);
  const h=goldHit?{type:'golden'}:hitTest(x,y);
  if(h.type==='none'&&lt&&now-lt.t<340&&Math.hypot(x-lt.x,y-lt.y)<34){GI.lastTap=null;doubleTapZoom(x,y);return;}
  sceneTap(x,y);
}
function doubleTapZoom(x,y){
  const c=scene.cam;GI.dbl++;haptic(6);
  if(c.z<c.fitZ*1.9){const z=clampTo(c.z*2,c.minZ,c.maxZ);const [wx,wy]=s2w(x,y);flyTo(wx-(x-scene.w/2)/z,wy-(y-scene.h/2)/z,z,380);}
  else {fitCamera(false);const t={x:c.tx,y:c.ty,z:c.tz};flyTo(t.x,t.y,t.z,420);}
}
/* stop the browser from treating gestures as page zoom / scroll / pull-to-refresh (iOS ignores user-scalable=no) */
function setupGestureGuards(){
  const scrollable=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){if(n.classList&&(n.classList.contains('sh-body')||n.classList.contains('hscroll')||n.classList.contains('modal-body')||n.classList.contains('mbody'))) return true;
    if(n.nodeType===1){const s=getComputedStyle(n);if(/(auto|scroll)/.test(s.overflowY+s.overflowX)&&(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1)) return true;}}return false;};
  document.addEventListener('touchmove',e=>{if(e.touches.length>1||!scrollable(e.target)) {if(e.cancelable) e.preventDefault();}},{passive:false});
  for(const ev of ['gesturestart','gesturechange','gestureend']) document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
  document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
  document.addEventListener('selectstart',e=>{if(!(e.target&&e.target.closest&&e.target.closest('input,textarea'))) e.preventDefault();});
  window.addEventListener('scroll',()=>{if(window.scrollX||window.scrollY) window.scrollTo(0,0);},{passive:true});
}
