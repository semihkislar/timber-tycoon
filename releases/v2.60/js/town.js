'use strict';
/* ===================== v2.55 TOWN GROWTH =====================
   Timber-frame Houses (good `houses`, building `framer`) leave the workshop and become a
   village on the grass verge by the south gate, west of the bent highway and east of the lane.
   `made` counts house kits that entered stock this run: the framer's output after the stock
   cap (the amount that actually left the machine). Orders, contracts and auto-sell do not
   add a second count. `stage` follows TOWN_STAGES. `best` is the highest stage ever and is
   only for trophies — Replant clears `made`, `stage` and `seen`, and keeps `best`.
   `seen` is the last stage we announced, so a loaded save does not toast its history.
   Town demand is townMult() on Town Market sales only (auto-sell and the Sell button) of
   Phase 1–2 goods. Logs stay unsellable. Orders, contracts, exports and research use price().
   v2.58: a tall piece is two depths (far half at the back corner, near half at the front
   corner) so a walker, a van or the scaffold cannot paint across a roof. The clip is
   the sprite's own box: a canvas-sized rectangle is dropped by the browser and the
   top of the sprite never paints. The church spire stands on the near corner, so the
   whole tower stays in the near half (townSplitLift 64). A cottage chimney stands
   on the near corner of the roof, and its lift is 42, so the stack stays in the near half.
   One more walker on a large screen, and only while graphics are not Low.
   v2.60: the empty lot draws foundation outlines and a larger sign until the first kit.
   The name stays readable at phone fit zoom. A stage-up toast has a Look action;
   nothing moves the camera on its own, and an offline catch-up does not toast.
   The sheet's Look button stays in the visible half-height sheet, above the toolbar. */
const TOWN_STAGES=[
  {n:0,name:'Empty lot',say:'A cleared lot by the south gate, waiting on the first house kit.'},
  {n:1,name:'Hamlet',say:'One timber-frame cottage, a garden and a tree.'},
  {n:25,name:'Village',say:'A short street of cottages joins the south gate road.'},
  {n:250,name:'Large village',say:'The street runs on, with more gardens and trees.'},
  {n:2500,name:'Market town',say:'A little square, two stalls and a well.'},
  {n:25000,name:'Town',say:'The south gate has a proper town now.'},
  {n:250000,name:'Timber Town',say:'A clock tower looks over the red roofs.'}
];
const TOWN_BONUS=0.025;   // +2.5% per stage, +15% at Timber Town
const TOWN_ROAD=37.90;    // street centre: east of the lane, west of the cottages
let townHide=false;
let _twPcs=null, _twLooks=null;

function townStageFor(made){
  let s=0; made=+made; if(!(made>=0)||!isFinite(made)) made=0;
  for(let i=1;i<TOWN_STAGES.length;i++) if(made+1e-9>=TOWN_STAGES[i].n) s=i;
  return s;
}
/* Repair a missing or damaged town on any save. An old save with houses already in stock
   seeds `made` from that stock (never NaN). A finite `made` of 0 is a real empty run. */
function townNorm(o){
  const empty={made:0,stage:0,best:0,seen:0};
  if(!o||typeof o!=='object') return empty;
  const stock=o.res&&typeof o.res==='object'&&isFinite(+o.res.houses)?Math.max(0,+o.res.houses):0;
  const src=o.town, bad=!src||typeof src!=='object'||Array.isArray(src);
  // null, a string, NaN or a negative count is damage. A real 0 stays 0 (a fresh run, or just after Replant).
  let made=bad?stock:+src.made;
  if(bad||typeof src.made!=='number'||!(src.made>=0)||!isFinite(src.made)) made=isFinite(stock)?stock:0;
  made=Math.min(1e15,made);
  const stage=townStageFor(made);
  let best=bad?stage:+src.best;
  if(bad||typeof src.best!=='number'||!(src.best>=0)||!isFinite(src.best)) best=stage;
  best=Math.max(stage,Math.min(TOWN_STAGES.length-1,Math.floor(best)));
  let seen=bad?stage:+src.seen;
  if(bad||typeof src.seen!=='number'||!(src.seen>=0)||!isFinite(src.seen)) seen=stage;
  seen=Math.max(0,Math.min(TOWN_STAGES.length-1,Math.floor(seen)));
  o.town={made,stage,best,seen};
  return o.town;
}
function townState(){
  if(!S.town||typeof S.town!=='object'||Array.isArray(S.town)||!isFinite(S.town.made)||S.town.made<0) townNorm(S);
  return S.town;
}
function townStage(){
  const t=townState(), s=townStageFor(t.made);
  if(t.stage!==s) t.stage=s;
  if(!(t.best>=s)) t.best=s;
  return s;
}
function townBest(){townStage();const t=S.town;return t&&isFinite(t.best)?t.best:0;}
function townMade(){return townState().made;}
function townMult(){return 1+Math.min(0.15,townStage()*TOWN_BONUS);}
function townPct(){return townStage()*TOWN_BONUS*100;}
function townPctLabel(){const p=townPct();return (Math.round(p*10)%10)?p.toFixed(1):String(Math.round(p));}
/* Phase 1–2 goods only. Logs fail canSell, so they never pick up the bonus. */
function townMarketGood(id){
  if(!id||typeof canSell!=='function'||!canSell(id)) return false;
  if(typeof resTier!=='function') return false;
  const t=resTier(id); return t===1||t===2;
}
function marketPrice(id){const p=price(id);return townMarketGood(id)?p*townMult():p;}
function townVanExtra(){const s=townStage();return s>1?s>>1:0;}
function townStageName(){return TOWN_STAGES[townStage()].name;}

/* Houses that fitted into stock this tick. Offline growth updates the village without a toast. */
function townCredit(n,offline){
  if(!(n>0)||!isFinite(n)) return;
  const t=townState(), prev=townStageFor(t.made);
  t.made=Math.min(1e15,t.made+n);
  const s=townStageFor(t.made);
  t.stage=s; if(s>t.best) t.best=s;
  if(s<=prev) return;
  const born=townLive().filter(p=>p.st===s&&p.kind!=='path');
  const piece=born.length?born[born.length-1]:null;
  if(piece) scene.townFx={i:piece.i,j:piece.j,t:0,k:0};
  if(s>t.seen){
    t.seen=s;
    if(!offline&&typeof toast==='function'){
      const stg=TOWN_STAGES[s];
      const look=()=>{if(typeof townOpen==='function') townOpen();};
      toast(`<span>🏘️ <b>${stg.name}</b><br>${stg.say} Town demand <b>+${townPctLabel()}%</b>.</span><button type="button" class="toast-look">Look</button>`,6400,'ms-toast town-toast',look);
    }
    if(piece&&!offline&&typeof emitP==='function'){const q=P(piece.i,piece.j,16);for(let i=0;i<12;i++) emitP(q[0],q[1],'poof');}
  }
  if(typeof checkAch==='function') checkAch(!!offline);
}

/* ---------- layout (fixed, grid-aligned, east of the lane and west of the highway) ---------- */
function townRoadEnd(s){return [33.55,34.35,37.15,41.7,41.7,43.05,44.35][s]||33.55;}
function townMakePieces(){
  const P=[];
  const add=o=>P.push(o);
  for(let j=32.78;j<44.2;j+=0.68) add({kind:'path',st:0,i:TOWN_ROAD,j:j+.34,wi:.32,wj:.70});
  for(let i=37.04;i<37.76;i+=.40) add({kind:'path',st:4,i:i+.20,j:34.48,wi:.42,wj:.22});
  add({kind:'stake',st:0,i:38.62,j:33.18,wi:.08,wj:.08});
  add({kind:'stake',st:0,i:39.18,j:33.18,wi:.08,wj:.08});
  add({kind:'sign',st:0,i:38.90,j:33.18,wi:.34,wj:.16});
  add({kind:'board',st:0,i:38.90,j:33.05,wi:.96,wj:.28});
  [[1,33.72,0,0],[2,35.15,1,1],[2,36.62,0,2],[3,38.20,1,0],[3,39.72,0,1],[3,41.22,1,2],[5,42.55,0,0]].forEach(([st,j,chim,v])=>{
    add({kind:'plot',st:0,i:38.95,j,wi:.80,wj:.68});
    add({kind:'cot',st,i:38.95,j,wi:.80,wj:.68,chim:!!chim,v});
  });
  add({kind:'tree',st:1,i:37.32,j:33.28,wi:.38,wj:.38,v:0});
  add({kind:'garden',st:1,i:37.32,j:33.95,wi:.46,wj:.40,v:0});
  add({kind:'tree',st:2,i:39.50,j:35.90,wi:.34,wj:.34,v:1});
  add({kind:'tree',st:3,i:37.28,j:38.40,wi:.34,wj:.34,v:2});
  add({kind:'garden',st:3,i:39.52,j:40.40,wi:.34,wj:.38,v:1});
  add({kind:'well',st:4,i:36.70,j:34.42,wi:.50,wj:.50});
  add({kind:'stall',st:4,i:36.66,j:35.24,wi:.56,wj:.38,v:0});
  add({kind:'stall',st:4,i:37.30,j:34.98,wi:.44,wj:.36,v:1});
  add({kind:'tree',st:5,i:37.28,j:42.15,wi:.34,wj:.34,v:0});
  add({kind:'church',st:6,i:38.95,j:43.58,wi:1.12,wj:1.02,chim:1});
  return P;
}
function townPieces(){return _twPcs||(_twPcs=townMakePieces());}
/* A foundation can share a cottage's cell. The building wins, so the scaffold still splits on the house. */
function townFxHost(i,j){
  let flat=null;
  for(const q of townPieces()){
    if(Math.abs(q.i-i)>=.02||Math.abs(q.j-j)>=.02||q.kind==='plot'||q.kind==='board') continue;
    if(!townFlat(q)) return q;
    flat=q;
  }
  return flat;
}
function townLive(){
  const s=townStage(), end=townRoadEnd(s);
  return townPieces().filter(p=>{
    if(p.kind==='plot'||p.kind==='board') return s<1;
    if(p.kind==='sign'&&s<1) return false;
    return p.st<=s&&!(p.kind==='path'&&p.j>end);
  });
}
function townAABB(p){return {k:p.kind,st:p.st,solid:p.kind!=='path',i0:p.i-p.wi/2,i1:p.i+p.wi/2,j0:p.j-p.wj/2,j1:p.j+p.wj/2};}
function townFoot(){return townLive().map(townAABB);}
/* The whole reserved verge, used so rocks and trees are not born under a later cottage. */
function townPlot(i,j){return i>=36.15&&i<39.9&&j>=32.55&&j<44.55;}
function townBounds(pad){
  pad=pad||0; let i0=1e9,j0=1e9,i1=-1e9,j1=-1e9;
  for(const p of townLive()){const b=townAABB(p);i0=Math.min(i0,b.i0);i1=Math.max(i1,b.i1);j0=Math.min(j0,b.j0);j1=Math.max(j1,b.j1);}
  if(!(i0<i1)){i0=37.6;i1=39.4;j0=32.8;j1=34.2;}
  return {i0:i0-pad,j0:j0-pad*1.35,i1:i1+pad*.45,j1:j1+pad*.35};
}
function townHitPoly(){
  const b=townBounds(.55), z=22;
  return [P(b.i0,b.j0,z),P(b.i1,b.j0,z),P(b.i1,b.j0,0),P(b.i1,b.j1,0),P(b.i0,b.j1,0),P(b.i0,b.j1,z)];
}
function townHit(wx,wy){const h=townHitPoly();return pip(h,wx,wy);}
function townFocusPt(){const s=townStage();return P(38.35, s<2?33.6:s<4?36.4:s<6?38.8:40.2, 12);}
function focusTown(){
  if(typeof flyTo!=='function'&&typeof flyToWorld!=='function') return;
  const p=townFocusPt(), c=scene.cam;
  const z=Math.min(c.maxZ, Math.max(c.fitZ*(scene.w<700?2.05:1.7), .9));
  if(typeof flyToWorld==='function') flyToWorld(p[0], p[1], z);
  else flyTo(p[0], p[1]-(scene.w<700?40:0), z);
}
function townOpen(){if(typeof openSheet==='function') openSheet('town'); else focusTown();}
/* World span of the cottages that exist. Null until the first kit, so a fresh fit stays the old frame. */
function townFitSpan(){
  if(townStage()<1) return null;
  let foot=-1e9, x0=1e9, x1=-1e9;
  for(const p of townLive()){
    const wi=p.wi||.3, wj=p.wj||.3;
    const mid=P(p.i,p.j,0), south=P(p.i, p.j+wj/2, 0);
    const west=P(p.i-wi/2, p.j, 0), east=P(p.i+wi/2, p.j, 0);
    foot=Math.max(foot, mid[1]+30, south[1]+10);
    x0=Math.min(x0, west[0], east[0], south[0]);
    x1=Math.max(x1, west[0], east[0], south[0]);
  }
  if(!(foot>0)) return null;
  return {foot, x0, x1};
}
function townGoalText(){
  const made=townState().made, nx=townNext();
  if(!nx) return '';
  const kits=nx.n===1?'house kit':'house kits';
  const now=made<10&&made%1?(+made).toFixed(1):fmt(made);
  return now+' / '+fmt(nx.n)+' '+kits+' → '+nx.name;
}
function townScreen(){const p=townFocusPt();return w2s(p[0],p[1]);}

/* ---------- art (one cached sprite per kind × night × snow × variant) ---------- */
const TOWN_WALL=['#f4e2c2','#f7e7cc','#f1dcc0'];
const TOWN_TIMB='#5c3418', TOWN_ROOF='#a33b28', TOWN_ROOF2='#c45a38';
function townBoxPx(p){
  const hx=(p.wi+p.wj)*HW*.7+18, top=p.kind==='church'?210:p.kind==='board'?118:p.kind==='tree'?86:p.kind==='well'?78:72;
  return [-hx,-top,hx+16,26];
}
function townBeams(ctx,i0,j0,i1,j1,z0,z1){
  ctx.strokeStyle=TOWN_TIMB; ctx.lineWidth=1.35; ctx.lineJoin='round';
  const J=j1, I=i1;
  ctx.beginPath();
  const sW=(z)=>{const a=P(i0,J,z),b=P(i1,J,z);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);};
  const sV=(i)=>{const a=P(i,J,z0),b=P(i,J,z1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);};
  sW(z0+.4); sW(z1-.3); sW(z0+(z1-z0)*.48); sV(i0+.02); sV(i1-.02); sV((i0+i1)/2);
  const a=P(i0+.04,J,z0+.6), b=P(i1-.04,J,z1-.5), c=P(i0+.04,J,z1-.5), d=P(i1-.04,J,z0+.6);
  ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.moveTo(c[0],c[1]); ctx.lineTo(d[0],d[1]);
  const eW=(z)=>{const a=P(I,j0,z),b=P(I,j1,z);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);};
  const eV=(j)=>{const a=P(I,j,z0),b=P(I,j,z1);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);};
  eW(z0+.4); eW(z1-.3); eW(z0+(z1-z0)*.48); eV(j0+.02); eV(j1-.02);
  const e=P(I,j0+.04,z0+.6), f=P(I,j1-.04,z1-.5), g=P(I,j0+.04,z1-.5), h=P(I,j1-.04,z0+.6);
  ctx.moveTo(e[0],e[1]); ctx.lineTo(f[0],f[1]); ctx.moveTo(g[0],g[1]); ctx.lineTo(h[0],h[1]);
  ctx.stroke();
}
function townWin(ctx,face,i,j,z,w,h){
  const night=scene.dn&&scene.dn.night>.35, glass=night?'#ffd98a':'#c5dff0', fr=TOWN_TIMB;
  if(face==='J'){
    fillP(ctx,[P(i,j,z),P(i+w,j,z),P(i+w,j,z+h),P(i,j,z+h)],fr);
    const m=Math.min(.045,w*.18);
    fillP(ctx,[P(i+m,j,z+m*.8),P(i+w-m,j,z+m*.8),P(i+w-m,j,z+h-m*.8),P(i+m,j,z+h-m*.8)],glass);
    const mid=i+w*.5; fillP(ctx,[P(mid-.012,j,z+m),P(mid+.012,j,z+m),P(mid+.012,j,z+h-m),P(mid-.012,j,z+h-m)],'#f4e6c8');
    if(!night){const a=P(i+m,j,z+h*.55),b=P(i+w*.42,j,z+h-m);fillP(ctx,[a,b,P(i+m,j,z+h-m)],'rgba(255,255,255,.35)');}
  }else{
    fillP(ctx,[P(i,j,z),P(i,j+w,z),P(i,j+w,z+h),P(i,j,z+h)],fr);
    const m=Math.min(.045,w*.18);
    fillP(ctx,[P(i,j+m,z+m*.8),P(i,j+w-m,z+m*.8),P(i,j+w-m,z+h-m*.8),P(i,j+m,z+h-m*.8)],glass);
    const mid=j+w*.5; fillP(ctx,[P(i,mid-.012,z+m),P(i,mid+.012,z+m),P(i,mid+.012,z+h-m),P(i,mid-.012,z+h-m)],'#f4e6c8');
  }
}
function townDoor(ctx,i,j,z,w,h){
  fillP(ctx,[P(i,j,0),P(i+w,j,0),P(i+w,j,z+h),P(i,j,z+h)],'#4a2c18');
  fillP(ctx,[P(i+.03,j,z*.15),P(i+w-.03,j,z*.15),P(i+w-.03,j,z+h-.08),P(i+.03,j,z+h-.08)],'#8a5a32');
  const k=P(i+w*.72,j,z+h*.45); ell(ctx,k[0],k[1],1.1,.7,'#e8c56a');
}
function townChim(ctx,i,j,z){
  box(ctx,i-.085,j-.085,i+.085,j+.085,z,z+7.4,'#b24a32',{top:'#7a3024'});
  box(ctx,i-.115,j-.115,i+.115,j+.115,z+7.4,z+8.6,'#6a5648',{top:true});
}
function townCot(ctx,p){
  const i0=p.i-p.wi/2,i1=p.i+p.wi/2,j0=p.j-p.wj/2,j1=p.j+p.wj/2,wall=TOWN_WALL[p.v%3]||TOWN_WALL[0],h=11.5;
  shadowAt(ctx,p.i,p.j+.06,p.wi*16,p.wj*9,.2);
  box(ctx,i0,j0,i1,j1,0,1.6,'#c4b496',{top:'#ddd0b4'});
  box(ctx,i0,j0,i1,j1,1.6,h,wall,{top:false});
  townBeams(ctx,i0,j0,i1,j1,1.6,h);
  townDoor(ctx,p.i-.09,j1,1.6,.2,6.4);
  townWin(ctx,'J',i0+.1,j1,5.2,.2,3.3);
  townWin(ctx,'J',i1-.3,j1,5.2,.18,3.3);
  townWin(ctx,'I',i1,j0+.12,5.4,.2,3.1);
  gable(ctx,i0,j0,i1,j1,h,7.2,'j',TOWN_ROOF,wall,.08);
  // Near corner of the roof. A stack on the far corner is pulled up onto the street,
  // and a walker pausing at the doorstep stands on the pot.
  if(p.chim) townChim(ctx,p.i+.28,p.j+.26,9.4);
  // flower box under the east window
  box(ctx,i1-.02,j0+.16,i1+.08,j0+.34,3.6,4.5,'#6b4226',{top:'#5a9a40'});
  // street-side picket and a few blooms, kept inside the footprint so the cached sprite does not grow
  for(let t=0;t<4;t++){
    const jj=j0+.08+(j1-j0-.16)*t/3;
    box(ctx,i0+.015,jj-.018,i0+.052,jj+.018,0,2.05,'#f7f1e4',{top:'#fff6e8',edge:false});
  }
  box(ctx,i0+.02,j0+.08,i0+.048,j1-.08,1.02,1.28,'#f4e6c8',{top:false,edge:false});
  const blooms=['#e85a78','#ffd24a','#f7f4ee'];
  for(let t=0;t<3;t++){const jj=j0+.2+t*(j1-j0-.4)/2, q=P(i0+.11,jj,1.2); ell(ctx,q[0],q[1],1.6,.9,blooms[t]);}
}
function townChurch(ctx,p){
  const i0=p.i-p.wi/2,i1=p.i+p.wi/2,j0=p.j-p.wj/2,j1=p.j+p.wj/2,h=13;
  shadowAt(ctx,p.i,p.j+.1,p.wi*18,p.wj*10,.24);
  box(ctx,i0,j0,i1,j1,0,1.8,'#d5cbb8',{top:'#ece4d4'});
  box(ctx,i0,j0,i1,j1,1.8,h,'#f6ead0',{top:false});
  townBeams(ctx,i0,j0,i1,j1,1.8,h);
  townDoor(ctx,p.i-.12,j1,1.8,.26,7.6);
  box(ctx,p.i-.28,j1-.02,p.i-.04,j1+.05,1.25,2.1,'#6b4226',{top:'#5a9a40'});
  {const q=P(p.i-.16,j1+.01,2.25); ell(ctx,q[0],q[1],1.7,.95,'#e85a78'); ell(ctx,q[0]+3.2,q[1]+.4,1.3,.75,'#ffd24a');}
  townWin(ctx,'J',i0+.16,j1,6.2,.22,4.2);
  townWin(ctx,'J',i1-.4,j1,6.2,.22,4.2);
  townWin(ctx,'I',i1,p.j-.05,6.4,.24,4);
  gable(ctx,i0,j0,i1,j1,h,8.4,'j',TOWN_ROOF,'#f6ead0',.1);
  // clock tower on the near corner, taller than the nave so the spire reads at fit zoom
  const ts=.42, ti=i1-ts-.04, tj=j1-ts-.04, th=h+16;
  box(ctx,ti,tj,ti+ts,tj+ts,0,th,'#f7edd8',{top:false});
  townBeams(ctx,ti,tj,ti+ts,tj+ts,2,th-1.2);
  townWin(ctx,'J',ti+.08,tj+ts,8,.16,3.2);
  const top=P(ti+ts/2,tj+ts/2,th);
  cone(ctx,top[0],top[1],ts*26,ts*13,22,SEAS===3?SNOW:TOWN_ROOF);
  const tip=P(ti+ts/2,tj+ts/2,th+22);
  ctx.strokeStyle='#e8c56a'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(tip[0],tip[1]-7); ctx.lineTo(tip[0],tip[1]+1); ctx.moveTo(tip[0]-3.2,tip[1]-3); ctx.lineTo(tip[0]+3.2,tip[1]-3); ctx.stroke();
  const ck=P(ti+ts*.55,tj+ts,th-7.5);
  ctx.fillStyle='#fffaf2'; ctx.beginPath(); ctx.ellipse(ck[0],ck[1],7.2,5.6,0,0,TAU); ctx.fill();
  ctx.strokeStyle=TOWN_TIMB; ctx.lineWidth=1.3; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ck[0],ck[1]); ctx.lineTo(ck[0]-2.4,ck[1]-4.2);
  ctx.moveTo(ck[0],ck[1]); ctx.lineTo(ck[0]+4.4,ck[1]-.6);
  ctx.stroke();
  ell(ctx,ck[0],ck[1],1.1,.85,'#7a3a24');
  if(p.chim) townChim(ctx,i0+.2,j0+.18,h+5);
}
function townStall(ctx,p){
  const i0=p.i-p.wi/2,i1=p.i+p.wi/2,j0=p.j-p.wj/2,j1=p.j+p.wj/2;
  shadowAt(ctx,p.i,p.j,p.wi*14,p.wj*8,.16);
  box(ctx,i0+.04,j0+.04,i1-.02,j1-.02,0,3.2,'#c4a574',{top:'#e6d2a4'});
  // striped awning, higher at the back
  const cols=p.v?['#c44536','#f4e6c8']:['#f4e6c8','#c44536'];
  const n=4;
  for(let k=0;k<n;k++){
    const a=j0+(j1-j0)*k/n, b=j0+(j1-j0)*(k+1)/n;
    fillP(ctx,[P(i0-.06,a,6.4),P(i1+.08,a,6.4),P(i1+.08,b,4.6),P(i0-.06,b,4.6)],cols[k%2],null);
  }
  ctx.strokeStyle='rgba(90,40,24,.35)'; ctx.lineWidth=.6;
  ctx.beginPath(); const r0=P(i0-.06,j0,6.4), r1=P(i1+.08,j0,6.4); ctx.moveTo(r0[0],r0[1]); ctx.lineTo(r1[0],r1[1]); ctx.stroke();
  // a couple of goods on the counter
  box(ctx,p.i-.12,j1-.16,p.i-.02,j1-.06,3.2,4.3,'#e0b071',{});
  box(ctx,p.i+.02,j1-.18,p.i+.12,j1-.08,3.2,4.6,'#8d3d28',{});
}
function townWell(ctx,p){
  shadowAt(ctx,p.i,p.j,8,4,.2);
  cyl(ctx,p.i,p.j,.2,0,4.2,'#c8c2b6','#ded8cc');
  const w=P(p.i,p.j,4.3); ell(ctx,w[0],w[1],5.2,2.6,'#7eb6d4'); ell(ctx,w[0]-1,w[1]-.6,2,1,'rgba(255,255,255,.45)');
  // little roof on two posts
  box(ctx,p.i-.16,p.j-.04,p.i-.1,p.j+.02,0,7.2,'#6b4226',{top:false});
  box(ctx,p.i+.1,p.j-.04,p.i+.16,p.j+.02,0,7.2,'#6b4226',{top:false});
  gable(ctx,p.i-.24,p.j-.16,p.i+.24,p.j+.16,7,3.4,'j',TOWN_ROOF,'#6b4226',.02);
}
function townTree(ctx,p){
  shadowAt(ctx,p.i,p.j,7,3.2,.18);
  box(ctx,p.i-.04,p.j-.04,p.i+.04,p.j+.04,0,4.5,'#6b4226',{top:false,edge:false});
  const s=p.v===1?.85:p.v===2?1.05:1;
  const c=P(p.i,p.j,4);
  cone(ctx,c[0],c[1],9*s,4.4*s,11*s,p.v===2?'#3d6a32':'#4f8a3a');
  cone(ctx,c[0],c[1]-6*s,6.5*s,3.2*s,8*s,'#6aaa48');
}
function townGarden(ctx,p){
  const i0=p.i-p.wi/2,i1=p.i+p.wi/2,j0=p.j-p.wj/2,j1=p.j+p.wj/2;
  fillP(ctx,[P(i0,j0,.4),P(i1,j0,.4),P(i1,j1,.4),P(i0,j1,.4)],SEAS===3?'#e4ece8':'#6ea24a');
  // picket posts
  for(const [i,j] of [[i0,j0],[i1,j0],[i0,j1],[i1,j1]]) box(ctx,i-.025,j-.025,i+.025,j+.025,0,1.7,'#f4e6c8',{top:'#f7f1e4',edge:false});
  const cols=['#e85a78','#ffd24a','#f7f4ee','#d4564a'];
  for(let k=0;k<5;k++){
    const i=i0+.08+(k%3)*(p.wi- .16)/2, j=j0+.08+((k*2)%3)*(p.wj-.16)/2;
    const q=P(i,j,1.1); ell(ctx,q[0],q[1],2.1,1.15,cols[k%cols.length]);
  }
}
function townSign(ctx,p){
  shadowAt(ctx,p.i,p.j,5,2.4,.16);
  box(ctx,p.i-.03,p.j-.03,p.i+.03,p.j+.03,0,6.5,'#6b4226',{top:false,edge:false});
  box(ctx,p.i-.16,p.j-.05,p.i+.16,p.j+.05,4.2,6.6,'#f4e6c8',{top:'#fff6e4'});
  // a tiny roof mark so it reads as the house lot
  const a=P(p.i-.14,p.j,6.5), b=P(p.i,p.j,7.6), c=P(p.i+.14,p.j,6.5);
  ctx.fillStyle=TOWN_ROOF; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.closePath(); ctx.fill();
}
function townBoard(ctx,p){
  shadowAt(ctx,p.i,p.j,12,5,.18);
  box(ctx,p.i-.045,p.j-.045,p.i+.045,p.j+.045,0,12.2,'#5c3418',{top:false,edge:false});
  box(ctx,p.i-.46,p.j-.07,p.i+.46,p.j+.07,6.4,10.6,'#fff6e4',{top:'#fffaf2'});
  const a=P(p.i-.5,p.j,10.5), b=P(p.i,p.j,12.6), c=P(p.i+.5,p.j,10.5);
  ctx.fillStyle=TOWN_ROOF; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8a5a32'; ctx.lineWidth=1.15;
  ctx.beginPath();
  [[-0.3,7.5,0.3],[-0.22,8.7,0.22]].forEach(([x0,z,x1])=>{const u=P(p.i+x0,p.j,z), v=P(p.i+x1,p.j,z); ctx.moveTo(u[0],u[1]); ctx.lineTo(v[0],v[1]);});
  ctx.stroke();
}
function townPlotMark(ctx,p){
  const i0=p.i-p.wi/2, i1=p.i+p.wi/2, j0=p.j-p.wj/2, j1=p.j+p.wj/2;
  fillP(ctx,[P(i0,j0,.45),P(i1,j0,.45),P(i1,j1,.45),P(i0,j1,.45)],'rgba(236,220,184,.72)');
  ctx.strokeStyle='#6b4226'; ctx.lineWidth=2.1; ctx.lineJoin='round';
  ctx.beginPath();
  [[i0,j0],[i1,j0],[i1,j1],[i0,j1]].forEach(([i,j],k)=>{const q=P(i,j,.85); if(k) ctx.lineTo(q[0],q[1]); else ctx.moveTo(q[0],q[1]);});
  ctx.closePath(); ctx.stroke();
  for(const [i,j] of [[i0,j0],[i1,j0],[i0,j1],[i1,j1]]) box(ctx,i-.035,j-.035,i+.035,j+.035,0,3.1,'#f4e6c8',{top:'#fff6e8',edge:false});
}
function townStake(ctx,p){
  box(ctx,p.i-.02,p.j-.02,p.i+.02,p.j+.02,0,2.4,'#e8d7b0',{top:'#f7f1e4',edge:false});
}
function townPath(ctx,p){
  const i0=p.i-p.wi/2,i1=p.i+p.wi/2,j0=p.j-p.wj/2,j1=p.j+p.wj/2,snow=SEAS===3;
  fillP(ctx,[P(i0,j0,.25),P(i1,j0,.25),P(i1,j1,.25),P(i0,j1,.25)],snow?'#e7eef2':'#d2c09a');
  fillP(ctx,[P(i0,j0,.32),P(i0+.035,j0,.32),P(i0+.035,j1,.32),P(i0,j1,.32)],snow?'#d5dee6':'#b49a72');
  fillP(ctx,[P(i1-.035,j0,.32),P(i1,j0,.32),P(i1,j1,.32),P(i1-.035,j1,.32)],snow?'#d5dee6':'#a89068');
}
function townArt(ctx,p){
  if(p.kind==='path') return townPath(ctx,p);
  if(p.kind==='cot') return townCot(ctx,p);
  if(p.kind==='church') return townChurch(ctx,p);
  if(p.kind==='stall') return townStall(ctx,p);
  if(p.kind==='well') return townWell(ctx,p);
  if(p.kind==='tree') return townTree(ctx,p);
  if(p.kind==='garden') return townGarden(ctx,p);
  if(p.kind==='sign') return townSign(ctx,p);
  if(p.kind==='board') return townBoard(ctx,p);
  if(p.kind==='plot') return townPlotMark(ctx,p);
  if(p.kind==='stake') return townStake(ctx,p);
}
function townStamp(ctx,p){
  const night=scene.dn&&scene.dn.night>.35?1:0, snow=SEAS===3?1:0;
  const key='tw|'+p.kind+'|'+night+'|'+snow+'|'+(p.chim?1:0)+'|'+(p.v||0)+'|'+p.wi.toFixed(2)+'|'+p.wj.toFixed(2);
  const [x,y]=P(p.i,p.j,0);
  sprite(ctx,key,x,y,townBoxPx(p),(g)=>{g.save();g.translate(-x,-y);townArt(g,p);g.restore();});
}
function townLights(p){
  if(!(scene.dn&&scene.dn.lights>.03&&scene.dn.night>.35)) return;
  if(p.kind!=='cot'&&p.kind!=='church') return;
  const j=p.j+p.wj/2, z=p.kind==='church'?7.2:6.2, h=p.kind==='church'?3.6:2.8;
  const spots=p.kind==='church'?[p.i-p.wi*.32,p.i+p.wi*.28]:[p.i-p.wi*.28,p.i+p.wi*.22];
  for(const i of spots) scene.lq.push([P(i,j,z),P(i+.18,j,z),P(i+.18,j,z+h),P(i,j,z+h)]);
}
function townScaffold(ctx,fx){
  const k=1-fx.t/1.35; if(k<=0) return;
  ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,k*1.4));
  const i=fx.i, j=fx.j;
  for(const [di,dj] of [[-.28,-.22],[.28,-.22],[-.28,.22],[.28,.22]]){
    box(ctx,i+di-.02,j+dj-.02,i+di+.02,j+dj+.02,0,8+k*6,'#e8d7b0',{top:false,edge:false});
  }
  box(ctx,i-.32,j-.26,i+.32,j+.26,7.2,8,'#f4e6c8',{top:false});
  ctx.restore();
}

/* ---------- people (cached human sprites, draw cap like the crew) ---------- */
function townCap(){return scene.w<700?4:6;}
function townLooks(){
  if(_twLooks) return _twLooks;
  _twLooks=[
    {female:false,skin:SKINS[1],hair:HAIRS[2],style:'short',beard:HAIRS[2],hat:'cap',hatc:'#7a3a24',shirt:'#f4e6c8',plaid:null,vest:null,pants:'#3e4c5c',boots:'#2c2118'},
    {female:true,skin:SKINS[0],hair:HAIRS[4],style:'pony',beard:null,hat:'beanie',hatc:'#c44536',shirt:'#f7f1e4',plaid:null,vest:'#7aaa48',pants:'#4a3a32',boots:'#3a2414'},
    {female:false,skin:SKINS[3],hair:HAIRS[0],style:'short',beard:null,hat:'cap',hatc:'#2f4a32',shirt:'#ead8b0',plaid:null,vest:null,pants:'#2e3a48',boots:'#241810'},
    {female:true,skin:SKINS[2],hair:HAIRS[7],style:'bun',beard:null,hat:null,hatc:'#8d3d28',shirt:'#fff6e8',plaid:null,vest:'#d8a24a',pants:'#5a4030',boots:'#3a2414'},
    {female:false,skin:SKINS[4],hair:HAIRS[5],style:'short',beard:null,hat:'cap',hatc:'#3a4a6a',shirt:'#d8d2c4',plaid:null,vest:'#8d3d28',pants:'#2c241c',boots:'#241810'},
    {female:true,skin:SKINS[5],hair:HAIRS[3],style:'pony',beard:null,hat:'beanie',hatc:'#6a8f4a',shirt:'#f2c1b0',plaid:null,vest:null,pants:'#3e4c5c',boots:'#2c2118'}
  ];
  return _twLooks;
}
/* Places a walker actually stops: beside the well, beside the stalls, and on a cottage doorstep.
   Every point is outside the solid footprints. */
function townStops(s){
  const o=[];
  if(s>=4){
    o.push({j:34.50,i:37.22,fx:-1});
    o.push({j:35.30,i:37.72,fx:-1});
  }
  if(s>=2){
    const js=[33.72,35.15,36.62,38.20,39.72,41.22,42.55];
    const end=townRoadEnd(s);
    const door=js.filter(j=>j+.55<end);
    if(door.length){const j=door[(s+1)%door.length]; o.push({j:j+.48,i:38.28,fx:1});}
  }
  return o;
}
/* One more resident on a large screen. Low graphics keeps the v2.57 count: it already
   drops smoke and shadows and draws at 30 fps, and it does not pay for another walker. */
function townExtraFolk(){return scene.w>=700 && !(typeof gfxLow==='function'&&gfxLow());}
function townFolk(){
  const s=townStage(); if(s<1||townHide) return [];
  const n=Math.min(townCap(), 1+(s>1?1:0)+(s>3?1:0)+(townExtraFolk()&&s>4?1:0)+(s>5?1:0));
  const j0=33.15, j1=Math.min(townRoadEnd(s)-.35, 42.7), span=Math.max(.4,j1-j0);
  const looks=townLooks(), stops=townStops(s), out=[];
  const HOLD=1.65;
  for(let k=0;k<n;k++){
    const spd=.28+(k%3)*.06, holds=[];
    for(let si=0;si<stops.length;si++){
      const st=stops[si];
      if(st.j<=j0+.25||st.j>=j1-.2) continue;
      if((si+k)%2) continue;                 // neighbours do not all stop at the same bench
      holds.push({ph:st.j-j0,st});
      holds.push({ph:span+(j1-st.j),st});
    }
    holds.sort((a,b)=>a.ph-b.ph);
    const holdPh=HOLD*spd, cycle=span*2, tot=cycle+holds.length*holdPh;
    let t=((scene.t*spd)+k*tot/Math.max(1,n))%tot;
    let ph=0, prev=0, pose='walk', stop=null;
    for(const h of holds){
      const walk=h.ph-prev;
      if(t<=walk){ph=prev+t; t=-1; break;}
      t-=walk;
      if(t<=holdPh){ph=h.ph; stop=h.st; pose='stand'; t=-1; break;}
      t-=holdPh; prev=h.ph;
    }
    if(t>=0) ph=Math.min(cycle, prev+t);
    const going=ph<span;
    let j=Math.max(j0, Math.min(j1, going?j0+ph:j1-(ph-span)));
    let i=TOWN_ROAD+(k%2?.06:-.06), fx=going?1:-1;
    if(stop){i=stop.i; j=stop.j; fx=stop.fx;}
    out.push({i,j,look:looks[k%looks.length],fx,ph:scene.t*(pose==='walk'?7:1.4)+k,pose});
  }
  return out;
}
/* A resident's feet sort a hair in front of the ground tile they stand on. */
const TOWN_FEET=0.004;
function townFlat(p){return p.kind==='path'||p.kind==='garden'||p.kind==='stake'||p.kind==='plot';}
function townBoxOf(p){return {i0:p.i-p.wi/2,j0:p.j-p.wj/2,i1:p.i+p.wi/2,j1:p.j+p.wj/2};}
/* Pixels above the footprint centre where the near half begins.
   Screen Y is (i+j)*HH - z, so a taller part or a far corner sits further above the centre.
   The near half is everything at or below this line, and it sorts at the front corner, so a
   walker between the two depths cannot paint over it. The far half is only what clears the line.
   Anything left above the line is behind that walker: the church cross (about 49px up) and a
   cottage chimney (wall 11.5, stack from +3.2, cap to +8.6, about 35px up at the far corner)
   both did that. The back clip also reaches 0.8px below the line, so the lift sits a few
   pixels past the tallest near-facing part. */
function townSplitLift(p){
  if(p.kind==='church') return 64;  // cross ~49px, nave chimney ~41px
  if(p.kind==='cot') return 42;     // chimney cap ~35px; the near roof is below that
  if(p.kind==='tree') return 28;    // upper cone tip ~19px
  if(p.kind==='stall') return 22;   // awning, higher at the back, ~16px
  if(p.kind==='well') return 20;    // little roof peak ~14px
  if(p.kind==='sign') return 12;    // roof mark ~8px
  if(p.kind==='board') return 22;   // stage-0 notice board; hidden once a cottage exists
  return 14;
}
/* Far half at the back corner, near half at the front corner.
   One key for the whole cottage was the front corner, so the far roof was treated as
   closer than a walker whose feet were already in front of the near wall. */
function townPieceKeys(p){
  const box=townBoxOf(p);
  if(p.kind==='path') return [{k:p.i+p.j-.4,half:'all',box}];
  if(townFlat(p)) return [{k:p.i+p.j-.02,half:'all',box}];
  return [{k:box.i0+box.j0,half:'back',box},{k:box.i1+box.j1,half:'front',box}];
}
/* Clip one half to the sprite box. A rect of ±1e5 is large enough that the browser
   drops it, and the far half then paints nothing — the spire stays in whichever half
   the dropped clip left it, and a walker between the depths shows through. */
function townHalfClip(ctx,p,half,draw){
  if(half==='all'){draw();return;}
  const b=townBoxPx(p), o=P(p.i,p.j,0);
  const x0=o[0]+b[0], y0=o[1]+b[1], x1=o[0]+b[2], y1=o[1]+b[3];
  if(!(x1>x0+.5)){draw();return;}
  const seam=o[1]-townSplitLift(p);
  let ry, rh;
  if(half==='back'){ry=y0; rh=Math.min(y1,seam+.8)-y0;}
  else{ry=Math.max(y0,seam-.8); rh=y1-ry;}
  if(!(rh>.5)) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0,ry,x1-x0,rh); ctx.clip();
  draw(); ctx.restore();
}
function townClip(ctx,p,half){townHalfClip(ctx,p,half,()=>townStamp(ctx,p));}
function townSortParts(){
  const out=[];
  for(const p of townLive()) for(const part of townPieceKeys(p)) out.push({kind:p.kind,half:part.half,k:part.k,i0:part.box.i0,i1:part.box.i1,j0:part.box.j0,j1:part.box.j1});
  for(const f of townFolk()) out.push({kind:'folk',half:'pt',k:f.i+f.j+TOWN_FEET,i:f.i,j:f.j,pose:f.pose});
  if(scene.townFx){
    const fx=scene.townFx, host=townFxHost(fx.i,fx.j);
    const parts=host?townPieceKeys(host):[{k:fx.i+fx.j,half:'all',box:townBoxOf({i:fx.i,j:fx.j,wi:.2,wj:.2})}];
    for(const part of parts) if(part.half!=='all') out.push({kind:'scaffold',half:part.half,k:part.k+.008,i0:part.box.i0,i1:part.box.i1,j0:part.box.j0,j1:part.box.j1});
  }
  return out;
}

function townSmoke(dt){
  if(townHide||townStage()<2||typeof emitSmoke!=='function') return;
  scene._twSm=(scene._twSm||0)+dt; if(scene._twSm<.7) return; scene._twSm=0;
  const list=townLive().filter(p=>p.chim); if(!list.length) return;
  const p=list[Math.floor(scene.t/.7)%list.length];
  const q=P(p.i-p.wi*.32, p.j-p.wj*.32, p.kind==='church'?22:18);
  emitSmoke(q[0],q[1],'light');
}
function townStep(dt){
  if(scene.townFx){scene.townFx.t+=dt; if(scene.townFx.t>1.35) scene.townFx=null;}
  townSmoke(dt);
}
function townDraw(ctx,objs,inView){
  if(townHide) return;
  for(const p of townLive()){
    const [x,y]=P(p.i,p.j,0); if(!inView(x,y-20,80)) continue;
    const parts=townPieceKeys(p), piece=p;
    let lit=false;
    for(const part of parts){
      const half=part.half;
      objs.push({k:part.k,f:()=>{townClip(ctx,piece,half); if(!lit&&half!=='back'){townLights(piece); lit=true;}}});
    }
  }
  for(const f of townFolk()){
    const [x,y]=P(f.i,f.j); if(!inView(x,y,40)) continue;
    const folk=f;
    objs.push({k:f.i+f.j+TOWN_FEET,f:()=>human(ctx,x,y,{look:folk.look,fx:folk.fx,pose:folk.pose||'walk',ph:folk.ph})});
  }
  if(scene.townFx){
    const fx=scene.townFx; const [x,y]=P(fx.i,fx.j); if(!inView(x,y,60)) return;
    const host=townFxHost(fx.i,fx.j);
    let draw=host?townPieceKeys(host):[{k:fx.i+fx.j+.4,half:'all',box:null}];
    if(draw.every(part=>part.half==='all')) draw=[draw[draw.length-1]];
    for(const part of draw){
      objs.push({k:part.k+.008,f:()=>{
        if(!host||part.half==='all'){townScaffold(ctx,fx);return;}
        townHalfClip(ctx,host,part.half,()=>townScaffold(ctx,fx));
      }});
    }
  }
}
function townPill(ctx,x,y,txt,o){
  o=o||{};
  const fs=o.fs||11, wGuess=Math.max(48, txt.length*(fs*0.56)+(o.padX||14)+6), hGuess=fs+(o.padY||9)+6;
  const fab=typeof townChromeFab==='function'?townChromeFab():null;
  if(fab){
    const hit=(px,py)=>px+wGuess/2>fab.left-4&&px-wGuess/2<fab.right+4&&py+hGuess/2>fab.top-4&&py-hGuess/2<fab.bottom+4;
    if(hit(x,y)){
      const left=fab.left-wGuess/2-10;
      if(left>wGuess/2+4) x=left;
      else y=Math.min(y, fab.top-hGuess/2-10);
    }
  }
  x=Math.max(wGuess/2+2, Math.min(scene.w-wGuess/2-2, x));
  y=Math.max(16, Math.min(scene.h-10, y));
  const r=pill(ctx,x,y,txt,o);
  if(r&&r[2]>0){
    const rec={x:r[0],y:r[1],w:r[2],h:r[3],t:txt};
    scene.townPills.push(rec);
    if(!scene.townPill) scene.townPill=rec;
  }
  return r;
}
function townOverlay(ctx){
  scene.townPill=null; scene.townPills=[];
  if(townHide) return;
  const s=townStage(), b=townBounds(0);
  const [x,y]=P((b.i0+b.i1)/2, b.j0-.15, s<1?16:8);
  if(x<scene.cam.x-scene.w/scene.cam.z||x>scene.cam.x+scene.w/scene.cam.z) return;
  const [sx,sy]=w2s(x,y);
  if(sy<18||sy>scene.h-8) return;
  // v2.60: this name is how a phone at fit zoom still finds the village. Other info pills keep {lo:1}.
  const nr=townPill(ctx,sx,sy,'🏘️ '+TOWN_STAGES[s].name,{fs:11,bg:'rgba(90,48,22,.9)',fg:'#fff6e0',stroke:'#e7c48a',padX:12,padY:7});
  if(s<1){
    const goal=townGoalText();
    if(goal){
      const gx=nr&&nr[2]?nr[0]+nr[2]/2:sx, gy=nr&&nr[3]?nr[1]+nr[3]+18:sy+30;
      townPill(ctx,gx,gy,goal,{fs:14,bg:'rgba(255,246,224,.96)',fg:'#5a3418',stroke:'#c99560',padX:12,padY:8});
    }
  }
}

/* ---------- sheet ---------- */
function townNext(){
  const s=townStage(); if(s>=TOWN_STAGES.length-1) return null;
  return TOWN_STAGES[s+1];
}
function townSheetHtml(){
  const s=townStage(), st=TOWN_STAGES[s], made=townState().made, nx=townNext();
  const span=nx?nx.n-st.n:1, into=nx?Math.max(0,made-st.n):1, pct=nx?Math.max(0,Math.min(100,into/span*100)):100;
  const cur='+'+townPctLabel()+'%', nxt=nx?'+'+((s+1)*2.5).toFixed(1).replace(/\.0$/,'')+'%':'at the cap';
  const goal=townGoalText();
  const src=(typeof BMAP!=='undefined'&&BMAP.framer&&BMAP.framer.name)||'Timber-frame Houses';
  return `<div class="town-scroll"><div class="town-hero"><div class="town-ic">${svgIcon('houses',56)}</div><div><div class="town-stage">${st.name}</div><div class="legend">${st.say}</div></div></div>
    <div class="town-row"><span>Houses this run</span><b>${fmt(made, made<10&&made%1?1:0)}</b></div>
    ${goal?`<div class="town-goal">${goal}</div>`:''}
    <div class="pbar town-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="legend">${nx?`${fmt(Math.max(0,nx.n-made))} more to <b>${nx.name}</b>`:'Timber Town is built. The demand bonus is at its cap.'}</div>
    <div class="legend town-src">House kits come from the <b>${src}</b> workshop.</div>
    <div class="town-bonus"><div class="b"><div class="legend">Town demand now</div><b>${cur}</b></div><div class="b"><div class="legend">${nx?'Next stage':'Cap'}</div><b>${nxt}</b></div></div>
    <p class="legend">The Town Market pays this on planks, beams, chairs and the other Phase 1–2 goods, whether they auto-sell or you press Sell. Orders, contracts, exports and research are unchanged. Logs stay raw material and are never sold. Replant clears the village; the best stage stays for trophies.</p></div>
    <button class="btn wood" id="townLook" type="button">Look at the village</button>`;
}
function townUpdate(){
  const tm=$('townMkt');
  if(tm){
    const tx='🏘️ Town demand +'+townPctLabel()+'%';
    if(tm.textContent!==tx){tm.textContent=tx; tm.title='Phase 1–2 goods sold at the Town Market. Tap to see the village. Orders, contracts, exports and research are not included. Logs are not sold.';}
    if(!tm._tw){
      tm._tw=1; tm.setAttribute('role','button'); tm.tabIndex=0;
      const go=ev=>{if(ev) ev.stopPropagation(); townOpen();};
      tm.addEventListener('click',go);
      tm.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go(ev);}});
    }
  }
  if(typeof curSheet==='undefined'||curSheet!=='town') return;
  const el=$('townCard'); if(!el) return;
  const h=townSheetHtml(); if(el._h!==h){el.innerHTML=h; el._h=h; const b=$('townLook'); if(b) b.onclick=()=>{if(typeof focusTown==='function') focusTown();};}
  const title=townStageName(); const ht=$('shTitle'); if(ht&&ht.textContent!==title) ht.textContent=title;
}
function townFlowLine(){
  const s=townStage(); if(s<1&&townPct()<=0) return '';
  return `<div class="town-flow">🏘️ Town demand <b>+${townPctLabel()}%</b> on Phase 1–2 market sales</div>`;
}

/* Town Market vans: one extra cosmetic van per two stages, and those drive the village street. */
function mktTownLegs(){
  const G=typeof SGATE_J==='number'?SGATE_J:32, street=TOWN_ROAD, deep=Math.min(townRoadEnd(townStage())-.85, 41.5);
  const hold=(v,dt)=>{v.load=Math.min(1,(v.load||0)+dt*.45); return v.load<1||v.wait<1.5;};
  // Highway, along the south-gate road, then straight down the village street (west of the cottages).
  const mouth=[street, G+.22], toe=[street, 33.12];
  return [
    {pa:crPath([[hwN(G+4),G+4],[hwN(G+.35),G+.35],[39.15,G+.18],mouth,toe,[street,deep]],6), vmax:3.0},
    {pa:densePath([[street,deep],[street+.001,deep]]), vmax:.4, hold},
    {pa:crPath([[street,deep],toe,mouth,[39.15,G+.12],[hwS(G+.2),G+.2],[hwS(54),54]],6), vmax:3.3}
  ];
}
