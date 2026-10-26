'use strict';
/* ===================== v2.31 CONVEYOR BELTS (logistics tier 2, item 8 part 2) =====================
   Raised conveyor bridges between neighbouring buildings of the production chain, straight across the lane:
   Sawmill → Carpentry (planks), Wood Chipper → Pellet Press (chips), Veneer Peeler → Furniture (veneer), Beam Saw → Glulam (beams).
   - Unlock: Forklift Depot Lv BELT_UNLOCK (tier 1 → tier 2 in the Logistics ladder); a link needs both of its buildings.
   - Per link, Lv 0–10. Every level: the source makes +10 % of the carried good from the same logs (nothing is dropped or
     re-handled) and the destination +5 % output from the same inputs. Neither raises any demand, so no line can starve
     because of a belt (supply only goes up).
   - Costs: (2M + 20 × the destination's base price) × 4^level × the run's forest value (cs()). Rebuilt each run, like the depot.
   - Scene: an L-shaped raised belt leaves the middle of the source's lane wall, rises, turns 90° above the middle of the lane
     and enters the destination's lane wall (grid-aligned: along j, then along i). The steel frame is one cached sprite per link;
     the moving slats are one stroked path and the goods are cached cargo icons (at most BELT_ITEMS per link). A belted link
     needs no forklifts, so its cross-lane forklifts go away (less traffic, same calm motion for the rest).
   Save: S.logi.belt = {sawmill, chipper, peeler, beamsaw} (levels). */
const BELT_LINKS=[{src:'sawmill',dst:'carpentry',k:'planks'},{src:'chipper',dst:'pellet',k:'chips'},
  {src:'peeler',dst:'furniture',k:'veneer'},{src:'beamsaw',dst:'glulam',k:'beams'}];
const BELT_MAX=10, BELT_SRC=.10, BELT_DST=.05, BELT_UNLOCK=3, BELT_GROW=4, BELT_ITEMS=8;
const BELT_SHORT={sawmill:'Sawmill',carpentry:'Carpentry',chipper:'Chipper',pellet:'Pellet Press',peeler:'Peeler',furniture:'Furniture',beamsaw:'Beam Saw',glulam:'Glulam'};   // phone rows
const BELT_BY_SRC={}, BELT_BY_DST={}; BELT_LINKS.forEach(L=>{BELT_BY_SRC[L.src]=L;BELT_BY_DST[L.dst]=L;});
function beltState(){const l=logiState();if(!l.belt||typeof l.belt!=='object'||Array.isArray(l.belt)) l.belt={};
  for(const L of BELT_LINKS){const v=l.belt[L.src];l.belt[L.src]=isFinite(v)?Math.max(0,Math.min(BELT_MAX,v|0)):0;}return l.belt;}
function beltLvl(src){const b=S&&S.logi&&S.logi.belt;const v=b&&typeof b==='object'?b[src]:0;return isFinite(v)?Math.max(0,Math.min(BELT_MAX,v|0)):0;}
function beltUnlocked(){return logiLvl()>=BELT_UNLOCK;}
function beltBuilt(L){return S.buildings[L.src].lvl>0&&S.buildings[L.dst].lvl>0;}
function beltReady(L){return beltUnlocked()&&beltBuilt(L);}
function beltCount(){let n=0;for(const L of BELT_LINKS) if(beltLvl(L.src)>0) n++;return n;}
function beltAtLeast(l){let n=0;for(const L of BELT_LINKS) if(beltLvl(L.src)>=l) n++;return n;}
/* multipliers (used by tick via bOutK / bOutMult) */
function beltSrcMult(id,k){const L=BELT_BY_SRC[id];return L&&L.k===k?1+BELT_SRC*beltLvl(id):1;}
function beltDstMult(id){const L=BELT_BY_DST[id];return L?1+BELT_DST*beltLvl(L.src):1;}
/* building tag offset (tiles along the lane wall) so the 'Lv n' pill never sits on a belt */
function beltTagShift(id){const L=BELT_BY_SRC[id]||BELT_BY_DST[id];return L&&beltLvl(L.src)>0&&beltBuilt(L)?.9:0;}
function beltOnEdge(from,to){const L=BELT_BY_SRC[from];return !!(L&&L.dst===to&&beltLvl(from)>0);}
function beltBase(L){return 2e6+20*BMAP[L.dst].cost;}
function beltCost(src,l){const L=BELT_BY_SRC[src];if(!L) return Infinity;l=l===undefined?beltLvl(src):l;return l>=BELT_MAX?Infinity:beltBase(L)*cs()*Math.pow(BELT_GROW,l);}
function beltBuy(src){const L=BELT_BY_SRC[src];if(!L||!beltReady(L)) return false;const B=beltState(),c=beltCost(src);
  if(!isFinite(c)||S.coins+1e-9<c) return false;S.coins-=c;B[src]++;scene._tsig='';scene._fsig='';
  if(typeof sfx==='function') sfx('unlock');
  if(typeof toast==='function') toast(`🛤️ <b>${BMAP[L.src].name} → ${BMAP[L.dst].name} belt</b> → Lv ${B[src]}: ${RMAP[L.k].name} ×${(1+BELT_SRC*B[src]).toFixed(2)} · ${BMAP[L.dst].name} output ×${(1+BELT_DST*B[src]).toFixed(2)}${B[src]===1?' · no more forklifts needed on this link':''}`);
  if(typeof checkAch==='function') checkAch();return true;}
/* coins per second the next level of a link would add: extra carried good at its sale value + extra destination output */
function beltGain(src){const L=BELT_BY_SRC[src];if(!L||!beltBuilt(L)) return 0;const l=beltLvl(src);let v=0;
  const sb=BMAP[L.src],ss=bstat[L.src];if(ss&&sb.out[L.k]) v+=sb.out[L.k]*(ss.speed||0)*(ss.f||0)*bOutMult(L.src)*BELT_SRC*(typeof saleValue==='function'?saleValue(L.k):price(L.k));
  const db=BMAP[L.dst],ds=bstat[L.dst];if(ds) for(const k in db.out) v+=db.out[k]*(ds.speed||0)*(ds.f||0)*bOutMult(L.dst)/beltDstMult(L.dst)*BELT_DST*(typeof saleValue==='function'?saleValue(k):price(k));
  return v;}
/* Bottleneck Advisor hook: a waiting building whose input k is carried by an affordable belt gets "upgrade the belt" as its fix */
function beltFixFor(k,srcId){const L=BELT_BY_SRC[srcId];if(!L||L.k!==k||!beltReady(L)) return null;const c=beltCost(srcId);
  if(!isFinite(c)||S.coins+1e-9<c) return null;const l=beltLvl(srcId),nm=`${BMAP[L.src].name} → ${BMAP[L.dst].name} belt`;
  return {id:srcId,kind:'belt',k,via:[],label:`🛤️ ${l?'Upgrade':'Build'} the ${nm} (Lv ${l+1})`,btn:'🛤️ Belt',short:`${l?'upgrade':'build'} the ${nm}`,open:()=>beltOpen(srcId)};}
function beltOpen(src){logiOpen();setTimeout(()=>{const e=$('lgBelt_'+src);if(e){e.classList.add('lg-ping');setTimeout(()=>e.classList.remove('lg-ping'),1600);if(e.scrollIntoView) e.scrollIntoView({block:'center',behavior:'smooth'});}},160);}
/* ---------- Logistics ladder rows (Shipping sheet) ---------- */
function beltSig(){return (beltUnlocked()?1:0)+':'+BELT_LINKS.map(L=>beltBuilt(L)?1:0).join('');}
function beltHtml(){const u=beltUnlocked();
  if(!u) return `<div class="card lg-tier lock" id="lgBeltBox"><div class="ic">🛤️</div><div><div class="nm">Conveyor belts <span class="lg-tg">Tier 2</span></div><div class="ds">Raised belts between neighbouring buildings across the lane. Unlocks at Forklift Depot Lv ${BELT_UNLOCK}.</div></div></div>`;
  return `<div class="lg-belts" id="lgBeltBox"><div class="lg-bh">🛤️ <b>Conveyor belts</b> <span class="lg-tg">Tier 2</span> <small>each level: +${Math.round(BELT_SRC*100)} % of the good it carries, +${Math.round(BELT_DST*100)} % output at the end</small></div>
    ${BELT_LINKS.map(L=>`<div class="card lg-belt${beltBuilt(L)?'':' lock'}" id="lgBelt_${L.src}"><div class="ic">${RMAP[L.k].icon}</div><div><div class="nm"><span class="lg-full">${BMAP[L.src].name} → ${BMAP[L.dst].name}</span><span class="lg-short">${BELT_SHORT[L.src]} → ${BELT_SHORT[L.dst]}</span> <span class="cnt" id="lgBL_${L.src}"></span></div>
      <div class="ds" id="lgBD_${L.src}"></div></div><button class="btn buy" id="lgBB_${L.src}" data-belt="${L.src}"></button></div>`).join('')}</div>`;}
function beltUpdate(){for(const L of BELT_LINKS){const b=$('lgBB_'+L.src);if(!b) continue;const l=beltLvl(L.src),c=beltCost(L.src),mx=!isFinite(c),ok=beltBuilt(L);
  const bh=mx?'MAX':!ok?'🔒':costBtnHtml(l?'⬆':'🛤️',c);if(b._h!==bh){b.innerHTML=bh;b._h=bh;}b.disabled=mx||!ok||S.coins+1e-9<c;
  const e=$('lgBL_'+L.src),lt=`Lv ${l}/${BELT_MAX}`;if(e&&e._t!==lt){e.textContent=lt;e._t=lt;}
  const d=$('lgBD_'+L.src),g=ok&&!mx?beltGain(L.src):0,R=RMAP[L.k].name,f=x=>x.toFixed(2);
  const dt=!ok?`Build the ${S.buildings[L.src].lvl?BMAP[L.dst].name:BMAP[L.src].name} first`:mx?`${R} ×${f(1+BELT_SRC*l)} · ${BMAP[L.dst].name} output ×${f(1+BELT_DST*l)}`
    :`${R} ×${f(1+BELT_SRC*l)} → ×${f(1+BELT_SRC*(l+1))} · output ×${f(1+BELT_DST*l)} → ×${f(1+BELT_DST*(l+1))}${g>0?` (≈ +${fmt(g)}/s)`:''}`;
  if(d&&d._t!==dt){d.textContent=dt;d._t=dt;}}}
function beltBind(){for(const L of BELT_LINKS){const b=$('lgBB_'+L.src);if(b) b.onclick=()=>{if(beltBuy(L.src)){if(typeof haptic==='function') haptic(8);beltUpdate();if(typeof render==='function') render();}};}}
function beltFlowText(){if(!beltUnlocked()) return '';const n=beltCount();if(!n) return ' · 🛤️ belts ready to build';
  return ' · 🛤️ <b>'+n+'</b> belt'+(n>1?'s':'')+' '+BELT_LINKS.filter(L=>beltLvl(L.src)).map(L=>RMAP[L.k].icon+'Lv '+beltLvl(L.src)).join(' ');}
/* ---------- scene geometry ---------- */
const BELT_Z0=12, BELT_ZH=22, BELT_RAMP=.9, BELT_W=.22, BELT_V=.8;   // px, px, tiles, tiles, tiles/s
/* the belt's centre line: [i,j,z] points. Leaves the source's J wall (Phase I side) at its middle, rises, runs along +j to the
   middle of the lane, turns and runs along −i into the destination's I wall. src.ci === dst.cj (the lots sit straight across). */
function beltGeom(L){const s=LOTS[L.src],d=LOTS[L.dst];if(!s||!d) return null;const A=lotBox(s),B=lotBox(d),sig=A.bs.toFixed(3)+'|'+B.bs.toFixed(3);
  if(L._g&&L._g.sig===sig) return L._g;
  const ci=s.ci,cj=d.cj,j0=A.j1,i0=B.i1;
  const pts=[[ci,j0,BELT_Z0],[ci,j0+BELT_RAMP,BELT_ZH],[ci,cj,BELT_ZH],[i0+BELT_RAMP,cj,BELT_ZH],[i0,cj,BELT_Z0]];
  const seg=[];let tot=0;for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],l=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push({a,b,l,s0:tot});tot+=l;}
  // supports just outside the lane on both sides and under the top of each ramp
  const posts=[[ci,j0+BELT_RAMP],[ci,ci-2.4],[cj-2.4,cj],[i0+BELT_RAMP,cj]];
  const an=P(ci,cj,0);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const p of pts){for(const z of [0,p[2]+8]){const q=P(p[0],p[1],z);x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}}
  L._g={sig,pts,seg,tot,posts,ci,cj,an,bb:[x0-an[0]-12,y0-an[1]-12,x1-an[0]+12,y1-an[1]+10]};return L._g;}
function beltAt(g,s){s=Math.max(0,Math.min(g.tot,s));for(const q of g.seg){if(s<=q.s0+q.l+1e-9||q===g.seg[g.seg.length-1]){const t=q.l>0?(s-q.s0)/q.l:0;
  return [q.a[0]+(q.b[0]-q.a[0])*t,q.a[1]+(q.b[1]-q.a[1])*t,q.a[2]+(q.b[2]-q.a[2])*t,q];}}return g.pts[0];}
/* the static frame: posts, truss under the lane span, wall ports, belt bed with rails (drawn once into a cached sprite) */
function beltFrameRaw(g,G){const S0='#4a5058',S1='#6c747e',HI='#9aa4ae',RUB='#2e3134';
  const W=BELT_W;
  // wall ports (dark openings with a steel collar)
  const p0=G.pts[0],p4=G.pts[4];
  fillP(g,fq('J',p0[1],p0[0]-.32,p0[0]+.32,BELT_Z0-5,BELT_Z0+6),S0);fillP(g,fq('J',p0[1],p0[0]-.24,p0[0]+.24,BELT_Z0-3,BELT_Z0+4),'#1c1a18');
  fillP(g,fq('I',p4[0],p4[1]-.32,p4[1]+.32,BELT_Z0-5,BELT_Z0+6),S0);fillP(g,fq('I',p4[0],p4[1]-.24,p4[1]+.24,BELT_Z0-3,BELT_Z0+4),'#1c1a18');
  // posts: two legs + cross bar, contact shadow
  for(const p of G.posts){const z=BELT_ZH-4;const ax=p[0]===G.ci;   // posts on the j-run are spread along i, on the i-run along j
    const a=ax?[p[0]-W,p[1]]:[p[0],p[1]-W],b=ax?[p[0]+W,p[1]]:[p[0],p[1]+W];
    for(const q of [a,b]){const s=P(q[0],q[1],0);g.fillStyle='rgba(20,24,10,.22)';g.beginPath();g.ellipse(s[0]+1.5,s[1]+.5,4,1.8,0,0,TAU);g.fill();
      g.fillStyle=S0;g.fillRect(s[0]-1.4,s[1]-z,2.8,z);g.fillStyle=HI;g.fillRect(s[0]-1.4,s[1]-z,.9,z);}
    const ta=P(a[0],a[1],z-1),tb=P(b[0],b[1],z-1),ma=P(a[0],a[1],z*.45),mb=P(b[0],b[1],z*.45);
    g.strokeStyle=S0;g.lineWidth=1.6;g.beginPath();g.moveTo(ta[0],ta[1]);g.lineTo(tb[0],tb[1]);g.moveTo(ta[0],ta[1]);g.lineTo(mb[0],mb[1]);g.moveTo(tb[0],tb[1]);g.lineTo(ma[0],ma[1]);g.stroke();}
  // lane span: a light truss under the flat part, from post to post
  {const a=G.posts[1],c=[G.ci,G.cj],b=G.posts[2],chord=[a,c,b],zt=BELT_ZH-3.5,zb=BELT_ZH-9;
    g.strokeStyle=S1;g.lineWidth=1.3;g.beginPath();
    for(let k=0;k<chord.length;k++){const q=P(chord[k][0]+(k===1?0:0),chord[k][1],zb);k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);}g.stroke();
    g.beginPath();for(let k=1;k<chord.length;k++){const u=chord[k-1],v=chord[k],n=Math.max(2,Math.round(Math.hypot(v[0]-u[0],v[1]-u[1])/.55));
      for(let q=0;q<n;q++){const t0=q/n,t1=(q+.5)/n,t2=(q+1)/n;const A=P(u[0]+(v[0]-u[0])*t0,u[1]+(v[1]-u[1])*t0,zb),B=P(u[0]+(v[0]-u[0])*t1,u[1]+(v[1]-u[1])*t1,zt),C=P(u[0]+(v[0]-u[0])*t2,u[1]+(v[1]-u[1])*t2,zb);
        g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.lineTo(C[0],C[1]);}}g.stroke();}
  // belt bed: the j-run (visible +i side), then the i-run (visible +j side); each straight piece is a slab with a rubber top
  const slab=(a,b,ax)=>{const pa=ax==='j'?[[a[0]-W,a[1]],[a[0]+W,a[1]]]:[[a[0],a[1]-W],[a[0],a[1]+W]],pb=ax==='j'?[[b[0]-W,b[1]],[b[0]+W,b[1]]]:[[b[0],b[1]-W],[b[0],b[1]+W]];
    const za=a[2],zb=b[2];
    // visible long side (+i for the j-run, +j for the i-run) and the steel skirt
    fillP(g,[P(pa[1][0],pa[1][1],za-4.5),P(pb[1][0],pb[1][1],zb-4.5),P(pb[1][0],pb[1][1],zb),P(pa[1][0],pa[1][1],za)],ax==='j'?'#565d66':'#6a727c',EDGE);
    // rubber top + raised rails
    fillP(g,[P(pa[0][0],pa[0][1],za),P(pa[1][0],pa[1][1],za),P(pb[1][0],pb[1][1],zb),P(pb[0][0],pb[0][1],zb)],RUB);
    g.strokeStyle=HI;g.lineWidth=1.1;g.beginPath();for(const s of [0,1]){const A=P(pa[s][0],pa[s][1],za+1.2),B=P(pb[s][0],pb[s][1],zb+1.2);g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);}g.stroke();};
  const P_=G.pts;
  slab(P_[0],P_[1],'j');slab(P_[1],[P_[2][0],P_[2][1]+W,P_[2][2]],'j');
  slab([P_[2][0]+W,P_[2][1],P_[2][2]],P_[3],'i');slab(P_[3],P_[4],'i');
  // corner transfer plate
  fillP(g,[P(G.ci-W,G.cj-W,BELT_ZH+.2),P(G.ci+W,G.cj-W,BELT_ZH+.2),P(G.ci+W,G.cj+W,BELT_ZH+.2),P(G.ci-W,G.cj+W,BELT_ZH+.2)],'#3c4046');
  // the end cap at the corner (visible +i/+j faces of the turn)
  fillP(g,[P(G.ci+W,G.cj-W,BELT_ZH-4.5),P(G.ci+W,G.cj+W,BELT_ZH-4.5),P(G.ci+W,G.cj+W,BELT_ZH),P(G.ci+W,G.cj-W,BELT_ZH)],'#565d66',EDGE);
  fillP(g,[P(G.ci-W,G.cj+W,BELT_ZH-4.5),P(G.ci+W,G.cj+W,BELT_ZH-4.5),P(G.ci+W,G.cj+W,BELT_ZH),P(G.ci-W,G.cj+W,BELT_ZH)],'#6a727c',EDGE);
}
/* ---------- scene: per-frame motion ---------- */
function beltLive(){const out=[];if(!S.logi||!S.logi.belt) return out;for(const L of BELT_LINKS){const l=beltLvl(L.src);if(l>0&&beltBuilt(L)&&LOTS[L.src]&&LOTS[L.dst]) out.push(L);}return out;}
function beltRun(L){const a=S.buildings[L.src],b=S.buildings[L.dst];return a.on&&b.on&&bstat[L.src]&&bstat[L.src].f>.01;}
function beltItems(L){return Math.min(BELT_ITEMS,3+Math.ceil(beltLvl(L.src)/2));}
function beltTick(dt){if(!scene.belts) scene.belts={};for(const L of beltLive()){const st=scene.belts[L.src]||(scene.belts[L.src]={off:Math.random()});
  if(beltRun(L)) st.off=(st.off+dt*BELT_V/Math.max(1,(beltGeom(L)||{tot:9}).tot))%1;}}
function beltDraw(ctx,objs,inView){for(const L of beltLive()){const G=beltGeom(L);if(!G) continue;const an=G.an;
  if(!inView(an[0],an[1]-10,180)) continue;
  objs.push({k:G.ci+G.cj+.35,f:()=>{
    sprite(ctx,'belt|'+L.src+'|'+G.sig,an[0],an[1],G.bb,(g,ax,ay)=>{g.save();g.translate(ax-an[0],ay-an[1]);beltFrameRaw(g,G);g.restore();});
    const st=(scene.belts&&scene.belts[L.src])||{off:0},run=beltRun(L);
    // moving slats: one path
    const sp=.36,o=(st.off*G.tot)%sp;ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;ctx.beginPath();
    for(let s=o+.1;s<G.tot-.05;s+=sp){const q=beltAt(G,s),ax=q[3].a[0]===q[3].b[0];const a=ax?P(q[0]-BELT_W*.8,q[1],q[2]+.4):P(q[0],q[1]-BELT_W*.8,q[2]+.4),b=ax?P(q[0]+BELT_W*.8,q[1],q[2]+.4):P(q[0],q[1]+BELT_W*.8,q[2]+.4);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
    ctx.stroke();
    // goods riding on the belt (cached icons, bounded count)
    const n=run?beltItems(L):Math.min(2,beltItems(L));
    for(let k=0;k<n;k++){const s=((st.off+k/n)%1)*G.tot;if(s<.25||s>G.tot-.25) continue;const q=beltAt(G,s),p=P(q[0],q[1],q[2]+1);cargoIcon(ctx,p[0],p[1]-1,L.k,.72);}
  }});}}
/* test / debug: where the items are right now (tile coords + height) */
function beltItemPos(src){const L=BELT_BY_SRC[src];if(!L) return [];const G=beltGeom(L),st=scene.belts&&scene.belts[src];if(!G||!st) return [];
  const n=beltRun(L)?beltItems(L):Math.min(2,beltItems(L)),o=[];for(let k=0;k<n;k++){const s=((st.off+k/n)%1)*G.tot;o.push(beltAt(G,s).slice(0,3));}return o;}
