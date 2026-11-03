'use strict';
/* ===================== v2.7 SCENE: planting crew, saplings, tree nursery, seed drones =====================
   The 90-odd "dynamic" trees in the two logging zones mirror the forest stock: each tree is a stump, a sapling, a young or a grown tree,
   and a slow reconcile nudges them (always forward around the cycle grown → stump → sapling → young → grown) toward the logical mix. */
const NURSERY={ci:8.35,cj:-6.45,i0:7.2,i1:9.6,j0:-7.4,j1:-5.6};
function dynClass(t){if(t.stump>0||t.down||t.fall>0) return 'st';if((t.grow===undefined?1:t.grow)>=1) return 'm';return t.grow<.4?'s':'y';}
let _fvAcc=0;
function forestVisTick(dt){
  for(const p of scene.planters||[]) stepPlanterV(p,dt);
  for(const d of scene.sdrones||[]) d.ph+=dt;
  _fvAcc+=dt; if(_fvAcc<.35) return; _fvAcc=0;
  const F=S.forest,T=scene.dynTrees; if(!F||!T.length) return;
  const P=Math.max(1,F.m+F.y+F.s+F.st), N=T.length, tg={st:Math.round(N*F.st/P),s:Math.round(N*F.s/P),y:Math.round(N*F.y/P)}; tg.m=N-tg.st-tg.s-tg.y;
  const by={m:[],st:[],s:[],y:[]}; for(const t of T) by[dynClass(t)].push(t);
  const crew=(scene.planters||[]).length, tol={m:1,st:1+(crew?3:0),s:1,y:1};
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  // grown → stump (the logical forest was felled faster than the crews on screen)
  if(by.m.length>tg.m+tol.m){const c=by.m.filter(t=>!t.claim&&!t.shake);if(c.length){const t=pick(c);t.stump=1;t.planted=false;const p=P_(t);for(let k=0;k<6;k++) emitP(p[0]+(Math.random()-.5)*16,p[1],'dust');}}
  // stump → sapling (planting / natural regrowth that no crew member is showing)
  if(by.st.length>tg.st+tol.st){const c=by.st.filter(t=>t.stump>0&&!t.planted&&!t.down&&!(t.fall>0));if(c.length){const t=pick(c);t.stump=0;t.grow=.14;}}
  // sapling → young, young → grown: only plants that have finished their visible stage move on
  if(by.s.length>tg.s+tol.s){const c=by.s.filter(t=>t.grow>=.37);if(c.length){c.sort((a,b)=>b.grow-a.grow);c[0].grow=.42;}}
  if(by.y.length>tg.y+tol.y){const c=by.y.filter(t=>t.grow>=.9);if(c.length){c.sort((a,b)=>b.grow-a.grow);c[0].grow=1;}}
}
function P_(t){return P(t.i,t.j);}
/* ---------- planting crew figures ---------- */
function syncPlanters(){
  const pl=S.planters||{}, nP=Math.min(2,pl.planter||0), nT=Math.min(2,pl.team||0)*2, want=[];
  for(let k=0;k<nP;k++) want.push({id:'p'+k,kind:'planter'});
  for(let k=0;k<nT;k++) want.push({id:'t'+k,kind:'team'});
  if((pl.nursery||0)>0) want.push({id:'n0',kind:'nursery'});
  const sig=want.map(w=>w.id).join(',');
  if(scene._plsig!==sig){scene._plsig=sig;const old=scene.planters||[];
    scene.planters=want.map((w,k)=>old.find(o=>o.id===w.id)||mkPlanterV(w,k));
    for(const o of old) if(!scene.planters.includes(o)&&o.tree) o.tree.planted=false;}
  const nd=Math.min(2,pl.sdrone||0); scene.sdrones=scene.sdrones||[]; while(scene.sdrones.length<nd) scene.sdrones.push({k:scene.sdrones.length,ph:Math.random()*20}); scene.sdrones.length=nd;
}
function mkPlanterV(w,k){const lg=w.kind==='nursery'?{i:NURSERY.i0+.6,j:NURSERY.j1+.55}:LANDINGS[k%2?'L':'T'];
  return {id:w.id,kind:w.kind,look:mkLook(8100+k*37+(w.kind==='team'?500:0),{role:'planter',vest:w.kind==='team'?['#e8742a','#f2d21a'][k%2]:null}),
    i:lg.i+(Math.random()-.5)*1.4,j:lg.j+(Math.random()-.5)*1.4,ti:0,tj:0,st:'find',tm:Math.random()*2,ph:Math.random()*6,fx:1,back:false,pose:'stand',tree:null,wt:0};}
function stepPlanterV(p,dt){
  if(p.kind==='nursery'){ // tends the seedling beds outside the greenhouse
    if(p.st==='walk'){p.pose='walk';if(walkTo(p,dt,.6)){p.st='water';p.tm=3+Math.random()*2;p.fx=1;p.back=false;}}
    else {p.pose='water';p.tm-=dt;if(p.tm<=0){p.ti=NURSERY.i0+.4+Math.random()*1.8;p.tj=NURSERY.j1+.5+Math.random()*.25;p.st='walk';}}
    return;}
  switch(p.st){
    case 'find':{p.tm-=dt;if(p.tm>0){p.pose='look';break;}
      const c=scene.dynTrees.filter(t=>t.stump>0&&!t.planted&&!t.claim&&!t.down&&!(t.fall>0));
      if(!c.length){p.st='find';p.tm=2.5+Math.random()*2;p.pose='look';break;}
      c.sort((a,b)=>Math.hypot(a.i-p.i,a.j-p.j)-Math.hypot(b.i-p.i,b.j-p.j));const t=c[Math.floor(Math.random()*Math.min(2,c.length))];
      t.planted=true;p.tree=t;p.ti=t.i-.5;p.tj=t.j+.08;p.st='walk';break;}
    case 'walk': p.pose='walk'; if(walkTo(p,dt,.9)){p.st='dig';p.tm=2.6;p.wt=0;p.fx=1;p.back=false;} break;
    case 'dig':{p.pose='dig';p.fx=1;const u0=p.wt%1;p.wt+=dt/1.3;const u1=p.wt%1;
      if(u1<u0||(u0<.72&&u1>=.72)){const t=p.tree;if(t){const q=P(t.i,t.j);for(let k=0;k<5;k++) emitP(q[0]-2+(Math.random()-.5)*6,q[1]-1,'soil');}}
      p.tm-=dt;if(p.tm<=0){p.st='plant';p.tm=1.4;p.wt=0;} break;}
    case 'plant': p.pose='plant';p.wt=1-p.tm/1.4;p.tm-=dt;
      if(p.tm<=0){const t=p.tree;if(t&&t.stump>0){t.stump=0;t.grow=.14;}if(t) t.planted=false;p.st='water';p.tm=1.8;p.wt=0;} break;
    case 'water': p.pose='water'; p.tm-=dt; if(p.tm<=0){p.tree=null;p.st='find';p.tm=.3+Math.random()*.6;} break;
  }
}
/* ---------- tree nursery: clearing, greenhouse, seedling beds ---------- */
function forestGround(ctx){
  const {i0,i1,j0,j1}=NURSERY;
  fillP(ctx,[P(i0-.75,j0-.6),P(i1+.75,j0-.6),P(i1+.75,j1+1.35),P(i0-.75,j1+1.35)],SEAS===3?'#e6ecef':'#b9a37a');
  fillP(ctx,[P(i0-.55,j0-.4),P(i1+.55,j0-.4),P(i1+.55,j1+1.15),P(i0-.55,j1+1.15)],SEAS===3?'#eef2f4':'#c9b48a');
  // gravel path from the clearing toward the logging road
  fillP(ctx,[P(i1+.55,j1+.5),P(i1+2.4,j1+.5),P(i1+2.4,j1+.95),P(i1+.55,j1+.95)],SEAS===3?'#eef2f4':'#c9b48a');
}
function seedBed(ctx,i0,j0,i1,j1,seed){
  box(ctx,i0,j0,i1,j1,0,2.2,'#8a5a2c',{top:SEAS===3?'#f4f8fb':'#5a3f22',nosnow:true,hl:false});
  if(SEAS===3) return;
  const R=rng(seed);const pal=TREE_PAL[S.tree]||TREE_PAL[0];
  for(let a=0;a<3;a++) for(let b=0;b<5;b++){const i=i0+.18+(i1-i0-.36)*b/4,j=j0+.15+(j1-j0-.3)*a/2;const [x,y]=P(i,j,2.2);const g=.15+R()*.22;
    drawSapling(ctx,x,y,{grow:g,var:R(),s:1},pal,S.tree);}
}
function greenhouse(ctx){
  const {i0,i1,j0,j1}=NURSERY, jc=(j0+j1)/2, H=13, R=21, glass='rgba(200,236,246,.42)', frame='#f4f6f2', night=isNight();
  box(ctx,i0,j0,i1,j1,0,1.6,'#9a958a',{hl:false});   // concrete plinth
  // inside: benches with green trays (seen through the glass)
  for(const jj of [j0+.35,j1-.55]){box(ctx,i0+.2,jj,i1-.2,jj+.22,1.6,6,'#7a5a3a',{top:'#4f8a3a',hl:false,nosnow:true});
    for(let k=0;k<8;k++){const [x,y]=P(i0+.35+k*(i1-i0-.6)/7,jj+.11,6.2);ell(ctx,x,y-1.2,1.8,1.4,k%2?'#6ab84a':'#4f9a3a');}}
  if(night){const g=ctx.createRadialGradient(...P((i0+i1)/2,jc,8),2,...P((i0+i1)/2,jc,8),60);g.addColorStop(0,'rgba(255,236,170,.45)');g.addColorStop(1,'rgba(255,236,170,0)');ctx.fillStyle=g;fillP(ctx,[P(i0,j0,1.6),P(i1,j0,1.6),P(i1,j1,1.6),P(i0,j1,1.6)],g);}
  const wall=(pts)=>{fillP(ctx,pts,night?'rgba(255,236,170,.32)':glass,'rgba(255,255,255,.65)',.8);};
  // back walls first, then roof, then front walls
  wall([P(i0,j0,1.6),P(i1,j0,1.6),P(i1,j0,H),P(i0,j0,H)]);
  wall([P(i0,j0,1.6),P(i0,j1,1.6),P(i0,j1,H),P(i0,jc,R),P(i0,j0,H)]);
  fillP(ctx,[P(i0,j0,H),P(i1,j0,H),P(i1,jc,R),P(i0,jc,R)],SEAS===3?'rgba(244,248,251,.9)':(night?'rgba(255,236,170,.3)':'rgba(215,240,250,.5)'),frame,.9);
  wall([P(i0,j1,1.6),P(i1,j1,1.6),P(i1,j1,H),P(i0,j1,H)]);
  wall([P(i1,j0,1.6),P(i1,j1,1.6),P(i1,j1,H),P(i1,jc,R),P(i1,j0,H)]);
  fillP(ctx,[P(i0,j1,H),P(i1,j1,H),P(i1,jc,R),P(i0,jc,R)],SEAS===3?'rgba(244,248,251,.95)':(night?'rgba(255,236,170,.34)':'rgba(225,245,252,.55)'),frame,.9);
  // white mullions + glare
  ctx.strokeStyle=frame;ctx.lineWidth=.9;ctx.beginPath();
  for(let k=1;k<6;k++){const i=i0+(i1-i0)*k/6;let a=P(i,j1,1.6),b=P(i,j1,H),c=P(i,jc,R);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);}
  for(let k=1;k<4;k++){const j=j0+(j1-j0)*k/4;const a=P(i1,j,1.6),b=P(i1,j,j<jc?H+(R-H)*(j-j0)/(jc-j0):H+(R-H)*(j1-j)/(j1-jc));ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
  {const a=P(i0,j1,7),b=P(i1,j1,7);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);const c=P(i0,jc,R),d=P(i1,jc,R);ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);}
  ctx.stroke();
  if(!night&&SEAS!==3){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2.2;ctx.beginPath();const a=P(i0+.4,j1-.1,H+5),b=P(i0+1.1,j1-.6,R-1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  // door on the +i gable + sign
  fillP(ctx,fq('I',i1+.01,jc-.32,jc+.32,1.6,10),'rgba(120,160,120,.55)',frame,.9);
  fillP(ctx,fq('J',j1+.02,i0+.25,i0+1.35,H+.5,H+4.5),'#2f5a22','#f4f6f2',.7);
  ctx.save();fxf(ctx,'J',j1+.02,i0+.25,H+2.5);ctx.fillStyle='#eaf6dc';ctx.font='900 5.2px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('NURSERY',17.6,0);ctx.restore();
}
function forestDraw(ctx,objs,inView){
  const {i0,i1,j0,j1}=NURSERY,[nx,ny]=P(NURSERY.ci,NURSERY.cj);
  if(inView(nx,ny,140)){
    const own=(S.planters&&S.planters.nursery)||0;
    if(own) objs.push({k:i0+j0+.4,f:()=>greenhouse(ctx)});
    else objs.push({k:i0+j0,f:()=>{const e=[[i0,j0],[i1,j0],[i1,j1],[i0,j1]].map(([i,j])=>P(i,j));ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle='rgba(90,140,70,.7)';ctx.lineWidth=2;pth(ctx,e);ctx.stroke();ctx.restore();}});
    const beds=own?3:1;for(let b=0;b<beds;b++){const bi=i0+.1+b*.82;objs.push({k:bi+j1+.9,f:()=>seedBed(ctx,bi,j1+.55,bi+.68,j1+1.05,77+b)});}
  }
}
/* ---------- seed drones (air) ---------- */
function seedDrone(ctx,x,y,z,ph){
  ell(ctx,x+2,y+1,9,3.6,'rgba(25,35,10,.18)');const yy=y-z;
  ctx.strokeStyle='#7a828a';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x-9,yy-3);ctx.lineTo(x+9,yy+3);ctx.moveTo(x+9,yy-3);ctx.lineTo(x-9,yy+3);ctx.stroke();
  for(const [dx,dy] of [[-9,-3],[9,3],[9,-3],[-9,3]]){ell(ctx,x+dx,yy+dy-1.2,5.2,1.6,`rgba(210,225,235,${.55+.25*Math.sin(ph*60+dx)})`);ctx.fillStyle='#3a3f46';ctx.fillRect(x+dx-.8,yy+dy-1.6,1.6,1.6);}
  ctx.fillStyle='#2f5a3a';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x-5,yy-3,10,5.4,1.5);else ctx.rect(x-5,yy-3,10,5.4);ctx.fill();
  ctx.fillStyle='#7cc04f';ctx.fillRect(x-3,yy+2.2,6,3.2);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-4.2,yy-2.4,3,1);
  ctx.fillStyle=Math.sin(ph*6)>0?'#ff5a4a':'#7a2a2a';ctx.fillRect(x+3.6,yy-2.6,1.4,1.2);
}
function forestAir(ctx,dt){
  for(const d of scene.sdrones||[]){const a=d.ph*.32+d.k*2.6, i=-.4+Math.cos(a)*5.8+d.k*1.5, j=1.8+Math.sin(a)*3.2-d.k*.8;const [x,y]=P(i,j);const z=40+Math.sin(d.ph*1.7)*3;
    seedDrone(ctx,x,y,z,d.ph);if(Math.random()<dt*5) emitP(x+(Math.random()-.5)*4,y-z+6,'seed');}
}
/* ---------- warning bubble over the logging zone ---------- */
function forestOverlays(ctx){
  const F=S.forest;if(!F) return; const e=forestEff();
  const [nx,ny]=P(NURSERY.ci,NURSERY.cj,26),ns=w2s(nx,ny);
  if(!((S.planters&&S.planters.nursery)>0)&&scene.cam.z>=scene.cam.fitZ*.8&&ns[0]>-60&&ns[0]<scene.w+60&&ns[1]>-30&&ns[1]<scene.h+30){
    const p=PMAP.nursery,c=plCost('nursery',1),vis=(S.totalEarned>=p.cost*.3);
    pill(ctx,ns[0],ns[1],vis?`🏡 Tree Nursery · ${fmt(c)}`:'🔒 Tree Nursery',{fs:10,bg:vis?(S.coins>=c?'rgba(40,120,70,.88)':'rgba(30,70,90,.78)'):'rgba(43,27,14,.55)'});}
  if(e<.5&&(F.D||0)>0){const p=P(-.6,2.6,58),s=w2s(p[0],p[1]);if(s[0]>-80&&s[0]<scene.w+80&&s[1]>-200&&s[1]<scene.h){const top=($('topbar').offsetHeight||50)+62;if(s[1]<top) s[1]=top;s[0]=Math.max(130,Math.min(scene.w-130,s[0]));
    const k=.5+.5*Math.sin(scene.t*4);pill(ctx,s[0],s[1],'⚠ Forest depleted, hire planters!',{fs:11,bg:`rgba(196,70,61,${.82+.15*k})`});
    ctx.fillStyle=`rgba(196,70,61,${.82+.15*k})`;ctx.beginPath();ctx.moveTo(s[0]-6,s[1]+9);ctx.lineTo(s[0]+6,s[1]+9);ctx.lineTo(s[0],s[1]+16);ctx.closePath();ctx.fill();}}
}
