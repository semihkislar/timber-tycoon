'use strict';
/* ===================== v2.38 ONBOARDING (first-steps guide) =====================
   A short guide for the first minutes of a brand-new save: chop → hire the free Lumberjack → build the Sawmill with logs →
   first coins → upgrade the Sawmill → first client order. One small card (bottom-left on desktop, above the bottom bar on
   phones) and a bouncing pointer on the scene target; DOM targets get a soft gold ring. The card moves out of the way of the
   bottom sheet, the order card, the daily chip and the side buttons (obPlace), and the pointer hides behind sheets.
   It never gives anything: no coins, logs or boosts, so the early-run balance is unchanged.
   State S.ob: st 'on' | 'done' | 'skip' | 'old' (a save from before v2.38: never shown) | 'off'; step (index in OB_STEPS);
   rep (1 = replayed from Settings: steps that are already done wait for "Next" instead of skipping by themselves). */
const OB_ORD_OPEN=250;   // = ordersOpen() (js/premium.js)
const OB_FAR=1e6;        // a run this far along (earned or in hand, or after a Replant) no longer needs the guide: it ends quietly
const OB_BLD=4;         // … or with this many buildings standing
const OB_END_SEC=40;     // the "you're set" card closes by itself after this long
const OB_STEPS=[
  {id:'chop',e:'🪓',t:'Tap the forest to chop logs',
    d:()=>`Each tap fells a little wood for the 🪵 Log Yard. Logs are raw material: they feed your mills, they don't sell.`,
    done:()=>(S.clicks||0)>=5||S.collectors.lumberjack>0||S.buildings.sawmill.lvl>0,
    prog:()=>[Math.min(5,S.clicks||0),5],ptr:()=>({forest:1})},
  {id:'hire',e:'🧔',t:'Hire your first Lumberjack',
    d:()=>curSheet==='crew'?`Tap <b>Hire</b> on the Lumberjack. The first one is free, and he chops while you are away too.`:`Open <b>👷 Crew</b> below. The first Lumberjack is <b>free</b> and keeps chopping for you.`,
    done:()=>S.collectors.lumberjack>0||S.buildings.sawmill.lvl>0,
    hl:()=>curSheet==='crew'?(colEls.lumberjack&&colEls.lumberjack.btn):$('bbCrew')},
  {id:'saw',e:'🪚',t:'Build the Sawmill with logs',
    d:()=>sawLogsOk()?(curSheet==='bld'&&sheetBld==='sawmill'?`Tap <b>🔨 Build</b>. Your Sawmill turns logs into planks.`:`You have the logs! Tap the <b>Sawmill</b> lot to build it.`)
      :`The first Sawmill costs 🪵 ${SAW_LOGS} logs, not coins. Keep chopping while your Lumberjack works.`,
    done:()=>S.buildings.sawmill.lvl>0,
    prog:()=>[Math.min(SAW_LOGS,Math.floor(S.res.logs)),SAW_LOGS],
    ptr:()=>sawLogsOk()&&!(curSheet==='bld'&&sheetBld==='sawmill')?{lot:'sawmill'}:{forest:1},
    hl:()=>curSheet==='bld'&&sheetBld==='sawmill'&&sawLogsOk()?$('bpBuy'):null},
  {id:'coins',e:'🪙',t:'Earn your first coins',
    d:()=>`Planks sell by themselves: trucks haul them from the 🚚 Shipping dock. More logs make more planks, so keep chopping or hire more Lumberjacks.`,
    done:()=>S.buildings.sawmill.lvl>=2||S.coins+1e-9>=bldNextCost('sawmill'),
    prog:()=>[Math.floor(Math.min(S.coins,bldNextCost('sawmill'))),Math.ceil(bldNextCost('sawmill'))],coin:1,ptr:()=>({forest:1})},
  {id:'up',e:'⬆️',t:'Upgrade the Sawmill',
    d:()=>curSheet==='bld'&&sheetBld==='sawmill'?`Tap <b>Upgrade</b>. Every level makes more planks per second.`:`Tap the <b>Sawmill</b>, then <b>Upgrade</b>. Every level makes more planks per second.`,
    done:()=>S.buildings.sawmill.lvl>=2,
    ptr:()=>curSheet==='bld'&&sheetBld==='sawmill'?null:{lot:'sawmill'},hl:()=>curSheet==='bld'&&sheetBld==='sawmill'?$('bpBuy'):null},
  {id:'order',e:'📋',t:'Take your first client order',
    d:()=>{const O=ordNorm();if(!ordersOpen()) return `Clients phone in once you have earned 🪙 ${OB_ORD_OPEN}. Keep upgrading; the Wood Chipper lot opens at 🪙 250 too.`;
      if(O&&O.offers.length) return curSheet==='ord'?`Tap <b>✔ Accept</b> on a client's order. Deliveries pay 1.5–2.5× the goods.`:`A client is calling! Tap <b>✔ Accept</b> on the order card.`;
      return `A client will call any moment. Orders pay well, and the 📋 Orders button lists them.`;},
    done:()=>{const O=S.orders||{};return (O.acts&&O.acts.length>0)||(O.done||0)>0||(S.daily&&((S.daily.active&&S.daily.active.length)||(S.daily.total||0)>0));},
    prog:()=>ordersOpen()?null:[Math.floor(Math.min(S.totalEarned,OB_ORD_OPEN)),OB_ORD_OPEN],coin:1,
    hl:()=>{const O=ordNorm();if(!O||!O.offers.length) return null;const y=$('ocYes');if(y&&y.offsetParent) return y;return curSheet==='ord'?null:$('bbOrd');}},
  {id:'end',e:'🎉',t:'You\'re set, Tycoon!',
    d:()=>`Open more lots as you earn. When a building waits on an input, ⚠️ shows why and 🔀 Supply Flow shows what goes where. Replay this guide any time in ⚙️ Settings.`,
    done:()=>false,last:1},
];
const OB_N=OB_STEPS.length-1;   // steps that count (the last card is the wrap-up)
let obSig='', obEl=null, obHand=null, obHl=null, obPt=null, obPtAt=-9, obFlash=0, obPos='';
function obState(){if(!S.ob||typeof S.ob!=='object') S.ob={st:'old',step:0};return S.ob;}
function obNorm(o){   // saves: anything odd → not shown
  if(!o.ob||typeof o.ob!=='object'||Array.isArray(o.ob)) {o.ob={st:'old',step:0};return o;}
  if(!['on','done','skip','old','off'].includes(o.ob.st)) o.ob.st='old';
  o.ob.step=Math.max(0,Math.min(OB_STEPS.length-1,Math.floor(+o.ob.step||0)));o.ob.rep=o.ob.rep?1:0;return o;}
/* a run that is clearly past the first minutes: a Replant, 🪙1M earned or in hand, or 4+ buildings standing */
function obFar(){if((S.prestiges||0)>0||(S.totalEarned||0)>=OB_FAR||(S.coins||0)>=OB_FAR) return true;let n=0;for(const k in S.buildings) if(S.buildings[k]&&S.buildings[k].lvl>0) n++;return n>=OB_BLD;}
function obActive(){const o=S&&S.ob;return !!(o&&o.st==='on');}
function obStart(rep){S.ob={st:'on',step:0,rep:rep?1:0,t0:S.time||0};obSig='';obPt=null;obPtAt=-9;if(rep&&typeof closeSheet==='function'&&curSheet==='set') closeSheet();obTick();}
function obEnd(st){const o=obState();o.st=st;o.tEnd=S.time||0;obClear();}
function obSkip(){obEnd('skip');toast('📘 Guide hidden. You can replay it any time in ⚙️ Settings.',4200);}
function obCur(){const o=obState();return OB_STEPS[Math.max(0,Math.min(OB_STEPS.length-1,o.step|0))];}
function obNext(){const o=obState();if(o.st!=='on') return;if(OB_STEPS[o.step].last){obEnd('done');return;}o.step++;o.t1=S.time||0;obFlash=Date.now();obSig='';obPt=null;obPtAt=-9;obTick();}
/* called from render() (~4×/s). Advances finished steps, (re)draws the card, highlights, places it. */
function obTick(){
  const o=S&&S.ob;if(!o||o.st!=='on'){if(obEl) obClear();return;}
  if(!o.rep&&obFar()){obEnd('done');return;}   // far along: it would only be in the way
  if(!o.rep){let n=0;while(!OB_STEPS[o.step].last&&OB_STEPS[o.step].done()&&n<OB_STEPS.length){o.step++;o.t1=S.time||0;n++;}
    if(n){obFlash=Date.now();obPt=null;obPtAt=-9;}}
  const st=OB_STEPS[o.step];
  if(st.last&&(S.time||0)-(o.t1||0)>OB_END_SEC){obEnd('done');return;}
  if(!obEl) obBuild();
  const ok=!!(o.rep&&!st.last&&st.done()),pr=!ok&&st.prog?st.prog():null,tx=st.d();
  const sig=o.step+'|'+ok+'|'+tx+'|'+(pr?pr.join('/'):'');
  if(sig!==obSig){obSig=sig;
    const dots=OB_STEPS.slice(0,OB_N).map((x,i)=>`<i class="${i<o.step?'ok':i===o.step?'on':''}"></i>`).join('');
    obEl.querySelector('.ob-n').textContent=st.last?'All done':`Step ${o.step+1} of ${OB_N}`;
    obEl.querySelector('.ob-dots').innerHTML=dots;
    obEl.querySelector('.ob-e').textContent=ok?'✅':st.e;
    obEl.querySelector('.ob-t').textContent=st.t;
    obEl.querySelector('.ob-d').innerHTML=tx;
    const pb=obEl.querySelector('.ob-p');pb.classList.toggle('hidden',!pr);
    if(pr){pb.querySelector('i').style.width=(Math.min(1,pr[0]/Math.max(1,pr[1]))*100).toFixed(0)+'%';pb.querySelector('span').textContent=(st.coin?'🪙 ':'')+fmt(pr[0])+' / '+fmt(pr[1]);}
    const nb=obEl.querySelector('.ob-go');nb.classList.toggle('hidden',!(ok||st.last));nb.textContent=st.last?'Let\'s go!':'Next ›';
    obEl.classList.toggle('last',!!st.last);{const x=obEl.querySelector('#obSkip');x.textContent=st.last?'✕':'Skip ✕';x.title=st.last?'Close':'Skip the guide (replay it in Settings)';}obEl.querySelector('.ob-f').classList.toggle('hidden',!pr&&!(ok||st.last));
  }
  if(Date.now()-obFlash<700) obEl.classList.add('flash'); else obEl.classList.remove('flash');
  // DOM highlight
  const h=!ok&&st.hl?st.hl():null;
  if(h!==obHl){if(obHl) obHl.classList.remove('ob-hl');obHl=h;if(h) h.classList.add('ob-hl');}
  obPlace();
}
function obBuild(){
  obEl=document.createElement('div');obEl.id='obCard';obEl.setAttribute('role','status');
  obEl.innerHTML=`<div class="ob-h"><span class="ob-k">📘 First steps</span><span class="ob-n"></span><span class="ob-dots"></span><button class="ob-x" id="obSkip" title="Skip the guide (replay it in Settings)" aria-label="Skip the guide">Skip ✕</button></div>
    <div class="ob-b"><span class="ob-e"></span><div class="ob-tx"><b class="ob-t"></b><div class="ob-d"></div></div></div>
    <div class="ob-f"><div class="ob-p hidden"><span></span><em><i></i></em></div><button class="btn small gold ob-go hidden" id="obGo">Next ›</button></div>`;
  document.body.appendChild(obEl);
  obEl.querySelector('#obSkip').onclick=e=>{e.stopPropagation();if(OB_STEPS[obState().step].last) obEnd('done'); else obSkip();};
  obEl.querySelector('#obGo').onclick=e=>{e.stopPropagation();obNext();};
  obHand=document.createElement('div');obHand.id='obHand';obHand.className='hidden';obHand.innerHTML='<span class="ob-ring"></span><span class="ob-fg">👆</span>';
  document.body.appendChild(obHand);obPos='';
}
function obClear(){if(obHl){obHl.classList.remove('ob-hl');obHl=null;}if(obEl){obEl.remove();obEl=null;}if(obHand){obHand.remove();obHand=null;}obSig='';obPt=null;obPos='';}
/* card placement: the first spot that covers none of the sheet, order card, daily chip, side buttons, flow legend or bars */
function obRect(id){const e=typeof id==='string'?$(id):id;if(!e||!e.offsetParent&&getComputedStyle(e).position!=='fixed') return null;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return null;const r=e.getBoundingClientRect();return r.width&&r.height?r:null;}
function obHit(a,b){return a.x<b.right&&a.x+a.w>b.left&&a.y<b.bottom&&a.y+a.h>b.top;}
function obPlace(){
  if(!obEl) return;
  const W=window.innerWidth,H=window.innerHeight,phone=W<=720,rail=typeof railMode==='function'&&railMode();
  const sh=$('sheet').classList.contains('open')?$('sheet').getBoundingClientRect():null,fab=obRect('fabs');
  const tb=$('topbar').getBoundingClientRect().bottom,sb=$('subbar')?$('subbar').getBoundingClientRect().bottom:tb,bbR=$('bottombar').getBoundingClientRect();
  const lx=rail?Math.round(bbR.right+10):10,top=Math.max(tb,sb)+8,bot=(rail?H:bbR.top)-10;
  // phones: left-aligned, clear of the round side buttons (they sit bottom-right); desktop: a 300 px card bottom-left
  const w=Math.round(Math.max(220,Math.min(phone?360:300,(phone&&fab&&!sh?fab.left-8:W-10)-lx)));
  if(obEl._w!==w){obEl._w=w;obEl.style.width=w+'px';}
  const h=obEl.offsetHeight||100;
  const avoid=[sh,obRect('orderCard'),obRect('dailyChip'),fab,obRect('flowLegend'),obRect('jumpBar'),obRect('attnTip')].filter(Boolean);
  const cands=[[lx,bot-h]];
  for(const r of avoid){cands.push([lx,Math.round(r.top-8-h)]);cands.push([lx,Math.round(r.bottom+8)]);}
  cands.push([lx,top]);if(!phone) cands.push([W-w-10,top+60]);
  let best=null;for(const [x,y] of cands){if(y<top-1||y+h>bot+1||x<0||x+w>W) continue;const R={x,y,w,h};if(!avoid.some(a=>obHit(R,a))){best=[x,y];break;}}
  const mini=!best;   // nowhere free (a tall sheet on a phone): a slim strip under the HUD
  if(!best) best=[lx,top];
  obEl.classList.toggle('mini',mini);
  const k=best[0]+','+best[1]+mini;if(k!==obPos){obPos=k;obEl.style.left=best[0]+'px';obEl.style.top=best[1]+'px';}
}
/* pointer target in world coordinates (forest tile near the yard, or a lot) */
function obTarget(){
  const o=S.ob,st=OB_STEPS[o.step];if(!st||!st.ptr) return null;if(o.rep&&!st.last&&st.done()) return null;const p=st.ptr();if(!p) return null;
  if(p.lot){const L=p.lot==='dock'?DOCK:LOTS[p.lot];if(!L) return null;const q=P(L.ci,L.cj,p.lot==='dock'?40:22);return {x:q[0],y:q[1],k:'lot'};}
  if(p.forest){if(obPt&&scene.t-obPtAt<1.2) return obPt;obPtAt=scene.t;
    // a forest spot on screen, nearest the Log Yard (so the first chops land next to it)
    const [y0,y1]=viewBand(),[x0,x1]=viewBandX();let best=null,bd=1e9;
    const card=obEl&&obEl.getBoundingClientRect();
    for(let i=YARD.ci-12;i<=YARD.ci+14;i+=.5) for(let j=YARD.cj-14;j<=YARD.cj+10;j+=.5){if(!isForestPt(i,j)) continue;const q=P(i,j),s=w2s(q[0],q[1]);
      if(s[0]<x0+30||s[0]>x1-30||s[1]<y0+18||s[1]>y1-50) continue;if(card&&s[0]>card.left-30&&s[0]<card.right+30&&s[1]>card.top-60&&s[1]<card.bottom+20) continue;const h=hitTest(s[0],s[1]);if(h.type!=='forest') continue;const d=Math.hypot(i-YARD.ci,j-YARD.cj);if(d<bd){bd=d;best={x:q[0],y:q[1],k:'forest'};}}
    obPt=best;return best;}
  return null;
}
/* called every frame from stepScene (cheap: a w2s and, when it moved, one transform) */
function obFrame(){
  if(!obHand) return;const o=S.ob;if(!o||o.st!=='on'){obHand.classList.add('hidden');return;}
  const t=obTarget();let vis=false,x=0,y=0;
  if(t){[x,y]=w2s(t.x,t.y);const [y0,y1]=viewBand(),[x0,x1]=viewBandX();vis=x>x0+10&&x<x1-10&&y>y0+10&&y<y1;
    if(vis&&obEl){const r=obEl.getBoundingClientRect();if(x>r.left-30&&x<r.right+30&&y>r.top-60&&y<r.bottom+20) vis=false;}}
  obHand.classList.toggle('hidden',!vis);
  if(vis){const k=Math.round(x)+','+Math.round(y);if(obHand._k!==k){obHand._k=k;obHand.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;}obHand._xy=[Math.round(x),Math.round(y)];}
}
/* the pointer's screen position, or null when hidden (tests) */
function obPointer(){return obHand&&!obHand.classList.contains('hidden')&&obHand._xy?obHand._xy.slice():null;
}
function setupOnboardUI(){const b=$('obReplay');if(b) b.onclick=()=>{obStart(true);};}
