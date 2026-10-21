'use strict';

/* ===================== v2.15 STAFF IN THE WORLD =====================
   Every hired staff member (v2.14) now lives in the scene and works in their own area:
   lumberjacks among the trees, drivers at the log yard, mill workers / engineers at their assigned building,
   forklift operators and dock workers at the Shipping Yard, firefighters on the fire-station apron.
   When their energy runs low they walk to the campfire for a real break (STAFF_BREAK_* in js/staffsys.js)
   and come back rested. Founding foremen keep their manager spot at their building (js/scene9.js).
   Perf: people go through the cached human() sprites (one shared look per role × face, poses quantised into frames),
   at most SW_CAP() are drawn per frame, marker/ring art is cached, bubbles use the cached pills.
   Tapping a worker opens their card in the Team sheet; the card's 📍 button flies the camera to them. */
const SW_ROLE={
  lumberjack:{hat:'#2f8a3a',vest:'#86cc4a',shirt:'#c43a2e',plaid:'#5a1a14',pants:'#3a3f48',tag:'#2f8a3a'},
  driver:{hat:'#2a64c8',vest:'#62b8f2',shirt:'#3a4a5a',pants:'#2e3e5a',tag:'#2a64c8'},
  mill:{hat:'#e8641e',vest:'#f7a23e',shirt:'#5a6a7a',pants:'#3a3a40',tag:'#e8641e'},
  engineer:{hat:'#f7f7f2',vest:'#8a5ad8',shirt:'#e8e2d4',pants:'#2e3440',tag:'#8a5ad8'},
  forklift:{hat:'#33363f',vest:'#d6ea3a',shirt:'#3a3f48',pants:'#2e3440',tag:'#9aae10'},
  dock:{hat:'#13a89a',vest:'#3fd2c2',shirt:'#2e3e5a',pants:'#33476e',tag:'#13a89a'},
  firefighter:{hat:'#d8261c',vest:'#d8a832',shirt:'#2c2c32',pants:'#2c2c32',tag:'#d8261c'},
};
const SW={list:[],map:new Map(),sig:'',teamRef:null,hits:[],drawn:0,sel:null,selT:-99,flashWid:null,flashUntil:0,bubN:0};
function SW_CAP(){return scene.w<700?14:24;}
const SW_LOOKS=new Map();
/* the in-world look: the worker's own face/hair (v2.14 look) + role-coloured hard hat, hi-vis vest and work clothes */
function swLook(w){
  const L=w.look||STAFF_LOOKS[0], C=SW_ROLE[w.role]||SW_ROLE.mill;
  const key=w.role+'|'+(L.f?1:0)+'|'+(L.skin|0)+'|'+(L.hair|0)+'|'+(L.style||'short')+'|'+(L.beard|0)+'|'+(L.glasses?1:0);
  let o=SW_LOOKS.get(key); if(o) return o;
  const hair=HAIRS[L.hair|0]||HAIRS[0];
  o={female:!!L.f,skin:SKINS[L.skin|0]||SKINS[0],hair,style:L.style==='crew'?'crew':(L.style||'short'),beard:L.beard===1?hair:null,mus:L.beard===2?hair:null,
    hat:'hard',hatc:C.hat,shirt:C.shirt,plaid:C.plaid||null,vest:C.vest,pants:C.pants,boots:'#1a1a1e',glasses:!!L.glasses};
  SW_LOOKS.set(key,o); return o;
}
function swFatigueOn(w){return !(S.prefs&&S.prefs.fatigue===false)&&!(w.traits||[]).includes('steady');}
function swResting(w){return !!w.brk&&swFatigueOn(w);}
function swTired(w){return swFatigueOn(w)&&!w.brk&&(typeof w.energy==='number'?w.energy:100)<STAFF_FATIGUE_THR;}

/* ---------- where each role works (grid coords) ---------- */
const SW_YARD=[[5.75,6.05],[6.6,5.25],[3.95,5.85],[6.2,4.3],[6.95,6.35]];        // log-yard apron between the yard, the dirt road and the lane
const SW_FORK=[[25.35,23.25],[27.55,23.45],[24.9,22.2],[26.6,24.0]];          // forklift drop at the Shipping Yard
const SW_DOCK_A=[[26.35,23.0],[27.05,23.05],[25.85,22.95]], SW_DOCK_B=[[29.05,22.0],[29.1,21.2],[29.05,20.45]], SW_DOCK_VIA=[29.05,23.0]; // platform crates → round the corner → truck bays
const SW_FIRE=[[[9.0,3.3],[8.4,2.8],[8.75,3.75]],[[11.85,1.0],[11.95,1.9],[12.35,1.45]]];   // apron corner | yard beside the station (never walk through it)    // fire-station apron
const SW_SEATS=[[.95,-.25],[.85,.55],[.25,1.0],[-.5,1.0],[1.3,-.95],[.55,-1.2],[1.6,.25],[1.15,1.2],[-1.1,1.3],[1.85,-.55],[.2,1.65],[1.75,.95]];
function swBldPts(bid,k){const L=LOTS[bid]; if(!L||(L.prem&&!(S.premium&&S.premium.lvl))) return null; const B=lotBox(L), o=(k%3)*.09;
  const f=(t,d)=>L.face==='I'?[B.i1+d,B.j0+B.bs*t]:[B.i0+B.bs*t,B.j1+d];
  return {a:f(.34+o,.62),b:f(.6+o*.5,.66),c:f(.5+o,1.05),d:f(.95,.5)};}
function swNear(p,r){return [p[0]+(Math.random()-.5)*r,p[1]+(Math.random()-.5)*r];}
function swPickTree(a){
  const z=zoneTrees(a.zone).filter(t=>!t.stump&&!t.fall&&!t.down&&(t.grow||1)>=1);
  if(!z.length) return null;
  z.sort((p,q)=>Math.hypot(p.i-a.i,p.j-a.j)-Math.hypot(q.i-a.i,q.j-a.j));
  return z[Math.min(z.length-1,1+Math.floor(Math.random()*Math.min(5,z.length-1)))];
}
/* next job for a worker: {to:[i,j], pose, tm, cargo, carry} */
function swNextJob(a,w){
  const r=Math.random(), k=a.k;
  switch(w.role){
    case 'lumberjack':{const t=swPickTree(a);if(!t){const lg=LANDINGS[a.zone];return {to:swNear([lg.i+.6,lg.j+.6],.8),pose:'look',tm:3};}
      a.tree=t;a.side=Math.random()<.5?'R':'L';return {to:workSpot(t,a.side),pose:'chop',tm:4+Math.random()*3,face:a.side==='R'?-1:1};}
    case 'driver': return {to:swNear(SW_YARD[(k+Math.floor(r*3))%SW_YARD.length],.4),pose:r<.4?'point':r<.75?'clip':'look',tm:3+Math.random()*3};
    case 'mill': case 'engineer':{
      const P2=w.assign?swBldPts(w.assign,k):null;
      if(!P2) return {to:swNear(SW_YARD[(k+2)%SW_YARD.length],.6),pose:'look',tm:4};   // unassigned: wait at the log yard
      if(w.role==='mill'){a.leg=(a.leg||0)+1; return a.leg%2?{to:P2.b,pose:'stand',tm:1.2,cargo:OUT_OF[w.assign]||'planks'}:{to:P2.a,pose:'hammer',tm:2.6+Math.random()*1.5};}
      return {to:r<.5?P2.c:P2.d,pose:r<.5?'clip':r<.8?'look':'point',tm:3+Math.random()*3};}
    case 'forklift': return {to:swNear(SW_FORK[(k+Math.floor(r*2))%SW_FORK.length],.35),pose:r<.5?'point':'clip',tm:2.5+Math.random()*3};
    case 'dock':{a.leg=(a.leg||0)+1; const A=SW_DOCK_A[k%SW_DOCK_A.length],B=SW_DOCK_B[k%SW_DOCK_B.length];
      return a.leg%2?{to:swNear(B,.15),via:SW_DOCK_VIA,pose:'stand',tm:.9,cargo:'furniture'}:{to:swNear(A,.15),via:SW_DOCK_VIA,pose:'look',tm:1.2};}
    case 'firefighter':{const fire=Object.keys(S.fires||{}).length;
      const G=SW_FIRE[k%2];return {to:swNear(G[Math.floor(r*G.length)%G.length],.3),pose:fire?'point':r<.4?'look':r<.7?'stand':'clip',tm:3+Math.random()*4};}
  }
  return {to:[a.i,a.j],pose:'stand',tm:3};
}
function swSeat(a){const n=SW_SEATS.length, s=SW_SEATS[a.seat%n], ring=Math.floor(a.seat/n)*.55; return [CAMP.i+s[0]*(1+ring*.5),CAMP.j+s[1]*(1+ring*.5)];}
function swHome(a,w){if(w.role==='lumberjack'){const lg=LANDINGS[a.zone];return [lg.i+.5,lg.j+.5];}const j=swNextJob(a,w);a.job=null;return j.to;}

/* ---------- sync + simulation ---------- */
function swSync(){
  const team=staffState().team;
  const sig=team.map(w=>w.id+':'+w.role+':'+(w.assign||'')+':'+(w.founding?1:0)).join(',');
  if(sig===SW.sig&&SW.teamRef===team) return;
  SW.sig=sig; SW.teamRef=team;
  const old=SW.map, list=[], map=new Map(), per={};
  for(const w of team){
    if(w.founding) continue;   // founding foremen are drawn as the building's manager
    const k=per[w.role]=(per[w.role]===undefined?0:per[w.role]+1);
    let a=old.get(w.id);
    if(!a||a.role!==w.role||a.assign!==w.assign){
      a={wid:w.id,role:w.role,assign:w.assign,k,zone:k%2?'L':'T',i:0,j:0,st:'go',tm:0,ph:Math.random()*6,wt:Math.random(),fx:1,back:false,pose:'stand',
        alpha:0,fade:1,rest:false,seat:-1,job:null,tree:null,nb:6+Math.random()*10,bub:null,vis:false};
      const h=swHome(a,w); a.i=h[0];a.j=h[1];a.ti=a.i;a.tj=a.j;
    }
    a.k=k; a.w=w; list.push(a); map.set(w.id,a);
  }
  SW.list=list; SW.map=map;
}
function swFreeSeat(){const used=new Set(SW.list.filter(a=>a.rest).map(a=>a.seat));let s=0;while(used.has(s)) s++;return s;}
function swStep(a,dt){
  const w=a.w, want=swResting(w);
  if(a.fade){a.alpha=Math.max(0,Math.min(1,a.alpha+a.fade*dt*2.6));if(a.alpha<=0&&a.fade<0){a.i=a.ti;a.j=a.tj;a.via=null;a.fade=1;}else if(a.alpha>=1&&a.fade>0) a.fade=0;}
  if(want!==a.rest){a.rest=want;a.seat=want?swFreeSeat():-1;a.job=null;a.tree=null;a.via=null;
    const to=want?swSeat(a):swHome(a,w);a.ti=to[0];a.tj=to[1];a.st='go';a.cargo=null;
    if(Math.hypot(a.ti-a.i,a.tj-a.j)>4.5) a.fade=-1;}   // long commutes (e.g. to the campfire): fade out, fade back in at the target
  if(a.fade<0){a.pose='walk';a.ph+=dt*7;return;}
  const tired=swTired(w), sp=(a.rest?1.25:1.05)*(tired?.8:1);
  if(a.st==='go'){
    a.pose=a.cargo?'box':'walk';
    if(a.via){const ti=a.ti,tj=a.tj;a.ti=a.via[0];a.tj=a.via[1];const r=walkTo(a,dt,sp);a.ti=ti;a.tj=tj;if(r) a.via=null;return;}
    if(walkTo(a,dt,sp)){
      if(a.rest){a.st='rest';a.pose=a.seat%3===1?'sit':'sitdrink';faceTo(a,CAMP.i-a.i,CAMP.j-a.j);}
      else{const j=a.job||{pose:'stand',tm:1};a.st='act';a.tm=j.tm;a.pose=j.pose;if(j.face){a.fx=j.face;a.back=false;}
}
    }
    return;
  }
  if(a.st==='rest'){a.ph+=dt;return;}
  // working at a spot
  a.ph+=dt*(a.pose==='hammer'?8.6:1.2); a.tm-=dt;
  if(a.pose==='chop'&&a.tree){const tr=a.tree;if(tr.stump||tr.fall||tr.down){a.tm=0;}
    else{const u0=a.wt%1;a.wt+=dt/1.05*(tired?.85:1);const u1=a.wt%1;
      if(a.vis&&((u0<.57&&u1>=.57)||(u1<u0&&u1>=.57))){tr.shake=1;const b=P(tr.i,tr.j,5);for(let q=0;q<3;q++) emitP(b[0]+(a.side==='R'?4:-4),b[1],'chip');}}}
  if(tired&&a.pose!=='chop'&&a.pose!=='hammer'&&a.tm>1&&Math.random()<dt*.15) a.pose='brow';
  if(a.tm<=0){
    const j=swNextJob(a,w); a.job=j; a.ti=j.to[0]; a.tj=j.to[1]; a.st='go'; a.via=j.via||null;
    if(w.role==='mill'||w.role==='dock') a.cargo=j.cargo||null;
    if(Math.hypot(a.ti-a.i,a.tj-a.j)>4.5) a.fade=-1;
  }
}
function swBubbleText(a){
  const w=a.w, se=staffSkillEff(w); if(!(se>0)) return null; const R=STAFF_ROLES[w.role]; if(!R) return null;
  const v=x=>x>=9.5?Math.round(x):Math.round(x*10)/10;
  switch(w.role){
    case 'lumberjack': return `🪓 +${v(2*se)}% chop`;
    case 'driver': return `🚛 +${v(3*se)}% haul`;
    case 'mill': return w.assign?`⚙️ +${v(3*se)}% speed`:null;
    case 'engineer': return w.assign?`🔧 −${v(2.5*se)}% input`:null;
    case 'forklift': return `🚜 +${v(4*se)}% loading`;
    case 'dock': return `⚓ +${v(se)}% export`;
    case 'firefighter': return `🧯 −${v(3*se)}% fire risk`;
  }
  return null;
}
function swUpdate(dt){
  if(!S||!S.staff) return;
  swSync();
  let bub=0;
  for(const a of SW.list){swStep(a,dt);
    if(a.bub){a.bub.t+=dt;if(a.bub.t>=a.bub.dur) a.bub=null;else bub++;}}
  // productivity bubbles: a few at a time over workers who are on screen and working
  if(scene.cam.z>=.55) for(const a of SW.list){if(a.bub||a.rest||!a.vis||a.st!=='act') continue;a.nb-=dt;
    if(a.nb<=0){a.nb=9+Math.random()*10;if(bub>=3) continue;const t=swBubbleText(a);if(t){a.bub={t:0,dur:2.2,txt:t};bub++;}}}
  SW.bubN=bub;
}

/* ---------- drawing ---------- */
function swMarkerRaw(g,x,y,col,rc,state){
  ell(g,x+.4,y+.9,4.2,4.2,'rgba(0,0,0,.25)');
  g.fillStyle=rc;g.beginPath();g.moveTo(x,y-5.6);g.lineTo(x+5.6,y);g.lineTo(x,y+5.6);g.lineTo(x-5.6,y);g.closePath();g.fill();
  g.fillStyle=state==='rest'?'#7ab8e8':col;g.beginPath();g.arc(x,y,3.7,0,TAU);g.fill();
  g.strokeStyle='#fff';g.lineWidth=1.1;g.stroke();
  g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x-1.1,y-1.3,1.3,.8,-.5,0,TAU);g.fill();
  if(state==='rest'){g.strokeStyle='#fff';g.lineWidth=.9;g.beginPath();g.moveTo(x-1.6,y-1.4);g.lineTo(x+1.6,y-1.4);g.lineTo(x-1.6,y+1.5);g.lineTo(x+1.6,y+1.5);g.stroke();}
  if(state==='tired'){g.fillStyle='#ffb43a';g.beginPath();g.arc(x+3.6,y-3.4,1.6,0,TAU);g.fill();}
}
function swRingRaw(g,x,y){g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=1.6;g.beginPath();g.ellipse(x,y,9.5,4.4,0,0,TAU);g.stroke();
  g.strokeStyle='rgba(245,200,76,.95)';g.lineWidth=1;g.beginPath();g.ellipse(x,y,11.5,5.4,0,0,TAU);g.stroke();}
/* tree-stump stool at a campfire seat (cached) */
function swStoolRaw(g,x,y){
  ell(g,x+1.5,y+1.2,6.4,2.8,'rgba(30,25,10,.28)');
  g.fillStyle='#6a4422';g.beginPath();g.moveTo(x-4.6,y-7);g.lineTo(x-4.6,y);g.ellipse(x,y,4.6,2.2,0,Math.PI,0,true);g.lineTo(x+4.6,y-7);g.closePath();g.fill();
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(x+1.2,y-7);g.lineTo(x+1.2,y+2.1);g.ellipse(x,y,4.6,2.2,0,Math.PI*.42,0,true);g.lineTo(x+4.6,y-7);g.closePath();g.fill();
  g.strokeStyle='rgba(40,22,8,.45)';g.lineWidth=.5;g.beginPath();for(const dx of [-3,-1.2,2.6]){g.moveTo(x+dx,y-6.4);g.lineTo(x+dx+.3,y+.6);}g.stroke();
  ell(g,x,y-7,4.6,2.2,'#d9ad72');g.strokeStyle='rgba(120,75,35,.7)';g.lineWidth=.45;g.beginPath();g.ellipse(x,y-7,3,1.4,0,0,TAU);g.ellipse(x,y-7,1.5,.7,0,0,TAU);g.stroke();
}
function swDrawOne(ctx,a,x,y){
  const w=a.w, sel=SW.sel===a.wid&&scene.t-SW.selT<8;
  if(a.alpha<1) ctx.globalAlpha=a.alpha;
  if(sel) sprite(ctx,'swring',x,y,[-13,-7,13,7],(g,ax,ay)=>swRingRaw(g,ax,ay));
  if(a.st==='rest'&&(a.pose==='sit'||a.pose==='sitdrink')) sprite(ctx,'swstool',x-a.fx*1.2,y-.6,[-8,-10,9,5],(g,ax,ay)=>swStoolRaw(g,ax,ay));
  human(ctx,x,y,{look:swLook(w),fx:a.fx,back:a.back,pose:a.pose,ph:a.ph,t:a.pose==='chop'?a.wt:undefined,cargo:a.pose==='box'?a.cargo:null});
  const C=SW_ROLE[w.role]||SW_ROLE.mill, R=RARITY[w.rarity]||RARITY.C, state=a.rest?'rest':swTired(w)?'tired':'';
  const bob=a.st==='act'||a.st==='rest'?Math.round(Math.sin(scene.t*2.4+a.k)*2)/2:0, my=y-(a.pose==='sit'||a.pose==='sitdrink'?37:45)+bob;
  // the marker keeps a readable on-screen size when zoomed out (quantised so the cached sprite count stays small)
  const ms=Math.max(1,Math.min(2.25,Math.round(.95/scene.cam.z*4)/4));
  sprite(ctx,'swm|'+C.tag+'|'+R.c+'|'+state+'|'+ms,x,my-(ms-1)*5,[-7*ms,-7*ms,7*ms,7*ms],(g,ax,ay)=>{if(ms!==1){g.save();g.translate(ax,ay);g.scale(ms,ms);swMarkerRaw(g,0,0,C.tag,R.c,state);g.restore();}else swMarkerRaw(g,ax,ay,C.tag,R.c,state);});
  if(a.alpha<1) ctx.globalAlpha=1;
}
function swDraw(ctx,objs,inView){
  SW.hits.length=0; let n=0; const cap=SW_CAP();
  for(const a of SW.list){a.vis=false;if(n>=cap||a.alpha<=0) continue;const [x,y]=P(a.i,a.j);if(!inView(x,y,40)) continue;
    n++;a.vis=true;SW.hits.push(a);objs.push({k:a.i+a.j+.015,f:()=>swDrawOne(ctx,a,x,y)});}
  SW.drawn=n;
}
function swOverlays(ctx){
  const z=scene.cam.z;
  for(const a of SW.hits){
    const sel=SW.sel===a.wid&&scene.t-SW.selT<8;
    if(!a.bub&&!sel) continue;
    const p=P(a.i,a.j);const [sx,sy]=w2s(p[0],p[1]);const top=sy-50*z;
    if(sx<-60||sx>scene.w+60||top<-40||top>scene.h+40) continue;
    if(sel){const k=Math.min(1,(8-(scene.t-SW.selT))*2);ctx.globalAlpha=Math.max(0,k);
      pill(ctx,sx,top-12,`${STAFF_ROLES[a.w.role].e} ${a.w.name}`,{fs:11,bg:'#fff6e0',fg:'#4a2e06',stroke:(RARITY[a.w.rarity]||RARITY.C).c,lw:2,padX:12,padY:7});ctx.globalAlpha=1;}
    else{const k=a.bub.t/a.bub.dur;ctx.globalAlpha=k<.15?k/.15:k>.75?Math.max(0,(1-k)/.25):1;
      pill(ctx,sx,top-6-k*18,a.bub.txt,{fs:10,bg:'rgba(30,60,24,.86)',fg:'#e8ffd0',stroke:'#8fd14f',lw:1.2,padX:10,padY:6});ctx.globalAlpha=1;}
  }
}
/* ---------- input ---------- */
function swHit(sx,sy){
  if(!SW.hits.length) return null;const z=scene.cam.z, hw=Math.max(13,8*z), ht=Math.max(42,44*z), hb=Math.max(6,4*z);
  let best=null,bd=1e9;
  for(const a of SW.hits){const p=P(a.i,a.j);const [x,y]=w2s(p[0],p[1]);
    if(Math.abs(sx-x)>hw||sy<y-ht||sy>y+hb) continue;const d=Math.hypot(sx-x,sy-(y-ht*.45));if(d<bd){bd=d;best=a;}}
  return best;
}
function swSelect(wid){SW.sel=wid;SW.selT=scene.t;SW.flashWid=wid;SW.flashUntil=performance.now()+2600;}
function swScrollToCard(wid){
  const body=$('shBody'), el=document.querySelector(`#staffTabBody .staff-card[data-wid="${wid}"]`); if(!body||!el) return false;
  const br=body.getBoundingClientRect(), er=el.getBoundingClientRect();
  body.scrollTop+=er.top-br.top-Math.max(8,(Math.min(body.clientHeight,window.innerHeight-br.top)-er.height)/2);
  return true;
}
/* tap on a worker: open the Team sheet on their card */
function swOpenCard(wid){
  swSelect(wid); staffTab='team'; staffSig=''; openSheet('staff');
  requestAnimationFrame(()=>{swScrollToCard(wid);swReveal(wid);}); haptic&&haptic(6);
}
/* keep the tapped worker visible above / beside the sheet (same idea as focusLot for buildings) */
function swReveal(wid){
  const a=SW.map.get(wid); if(!a) return; const p=P(a.i,a.j), s=w2s(p[0],p[1]-18), [top,bot]=viewBand(), [x0,x1]=viewBandX();
  if(s[1]>top+50&&s[1]<bot-20&&s[0]>x0+40&&s[0]<x1-40) return;
  flyToWorld(p[0],p[1]-18,scene.cam.tz,420);
}
/* 📍 on a card: fly the camera to that worker (founding foremen: to their building) */
function swFind(wid){
  const w=staffState().team.find(x=>x.id===wid); if(!w) return false;
  const a=SW.map.get(wid); const c=scene.cam;
  if(!a){if(w.assign&&LOTS[w.assign]) focusLot(w.assign,true); return true;}
  const p=P(a.alpha<=0||a.fade<0?a.ti:a.i,a.alpha<=0||a.fade<0?a.tj:a.j);
  swSelect(wid); flyToWorld(p[0],p[1]-18,Math.max(c.tz,Math.min(c.maxZ,c.fitZ*(scene.w<700?2.2:1.7))),520);
  staffSig=''; return true;
}
/* status line on the Team card */
function swStatus(w){
  if(w.founding) return w.assign&&BMAP[w.assign]?`📋 Running the ${BMAP[w.assign].name}`:'📋 Foreman';
  const en=typeof w.energy==='number'?w.energy:100;
  if(swResting(w)) return `☕ On a break at the campfire · back in ${fmtTime(Math.max(1,(100-en)/staffBreakRate()))}`;
  const where={lumberjack:'🪓 Chopping in the forest',driver:'🚛 Running the log yard',forklift:'🚜 Loading at the Shipping Yard',dock:'⚓ Loading trucks at the dock',
    firefighter:Object.keys(S.fires||{}).length?'🔥 Fire alarm! Standing by':'🚒 On duty at the fire station'}[w.role];
  let s=where||'';
  if(w.role==='mill'||w.role==='engineer') s=w.assign&&BMAP[w.assign]?`${w.role==='mill'?'⚙️ Working':'🔧 Tuning'} at the ${BMAP[w.assign].name}`:'⏳ Waiting at the log yard for an assignment';
  if(swTired(w)) s+=` · 😓 tired (80%), break at ${STAFF_BREAK_AT}%`;
  return s;
}
