'use strict';
/* ===================== v2.18 REPLANT 2.0: Forest Legacy, Seed Shop, Run Goals =====================
   Design: docs/replant-v2.18.md.
   - Seeds 🌱 are earned on Replant. Every Seed ever earned adds to your Forest LEGACY (S.legacy, never goes down).
     Seeds themselves are a currency (S.seeds) for the Seed Shop, research and manager levels: spending them never
     lowers your bonus (before v2.18 the bonus was S.seeds, so spending Seeds made you weaker).
   - Legacy bonus is diminishing: ×(1 + 0.1·L^0.8) on all production (collectors, chopping, buildings).
     Before v2.18 it was linear (+10 % per Seed), so the multiplier ran away and a new run bought hundreds of levels in a minute.
   - Seed gain: 3·√(earned this run / 1e7), scaled by run goals (+8 % each), Deep Roots, and divided by √(legacy bonus)
     so each Replant asks for real growth beyond what the Legacy already gives you.
   - Run goals: a ladder of 12 goals per run; each one reached adds +8 % to this run's Seed gain.
   - Ideal time: Seeds per minute of the run is tracked; once it falls clearly below its peak, the sheet says "good time to replant".
   - Seed Shop: permanent upgrades bought with Seeds (production, crews, mills, start money, wood species, premium charter, …).
   Old saves: old Seeds become Legacy (plus Seeds already spent on research / manager levels) and stay spendable;
   the run in progress keeps its old bonus until the next Replant (S.oldRep), so nobody drops mid-run. */
let rpSig='';
const RPC={a:.8,k:.1,gainK:3,gainE:.4,goal:.08,first:1e7,csE:.88};
function legacyOf(L){return 1+RPC.k*Math.pow(Math.max(0,L||0),RPC.a);}
function legacyMult(){return legacyOf(S.legacy||0);}
/* ---------- Seed Shop ---------- */
const SHOP=[
  {id:'soil',  e:'🌾',n:'Fertile Soil',    d:l=>`All production +${25*l}%`,          max:25,cost:l=>Math.ceil(4*Math.pow(1.7,l)), fx:(m,l)=>{m.prodShop*=1+.25*l;}},
  {id:'crews', e:'🪓',n:'Veteran Crews',   d:l=>`Collectors & chopping +${50*l}%`,   max:12,cost:l=>Math.ceil(3*Math.pow(1.75,l)),  fx:(m,l)=>{m.colAll*=1+.5*l;m.chop*=1+.5*l;}},
  {id:'mills', e:'🏭',n:'Mill Know-how',   d:l=>`All buildings +${50*l}% speed`,     max:12,cost:l=>Math.ceil(3*Math.pow(1.75,l)),  fx:(m,l)=>{m.bldAll*=1+.5*l;}},
  {id:'market',e:'💰',n:'Trusted Brand',   d:l=>`All sale prices +${10*l}%`,         max:15,cost:l=>Math.ceil(4*Math.pow(1.6,l)),  fx:(m,l)=>{m.priceAll*=1+.1*l;}},
  {id:'money', e:'🪙',n:'Seed Money',      d:l=>l?`Start each run with 🪙 ${fmt(seedMoney(l)*runScaleFor())}`:'Start each run with coins', max:6,cost:l=>[1,3,8,20,50,120][l]||Infinity},
  {id:'nursery',e:'🌲',n:'Nursery Head Start',d:l=>`Start with +${5*l} Lumberjacks and +${2*l} Planters`,max:5,cost:l=>Math.ceil(2*Math.pow(1.8,l))},
  {id:'arbor', e:'🌳',n:'Arboretum',       d:l=>l?`Start runs harvesting ${TREES[Math.min(l,TREES.length-1)].name}`:'Start runs with a better wood',max:4,cost:l=>[6,15,40,100][l]||Infinity},
  {id:'charter',e:'🎟️',n:'Premium Charter',d:()=>'The Premium Area starts open (Lv 1) every run',max:1,cost:()=>30,req:()=>S.prestiges>=2||(S.premium&&S.premium.lvl>0)},
  {id:'roots', e:'🌱',n:'Deep Roots',      d:l=>`Seeds from Replant +${15*l}%`,      max:10,cost:l=>Math.ceil(5*Math.pow(1.9,l)), fx:null},
];
const SHMAP={};SHOP.forEach(x=>SHMAP[x.id]=x);
function shopLvl(id){return (S.shop&&S.shop[id])||0;}
function seedMoney(l){return l?1e3*Math.pow(4,l-1):0;}   // × the run's forest value
function shopCost(id){const u=SHMAP[id],l=shopLvl(id);return l>=u.max?Infinity:u.cost(l);}
function shopAvail(id){const u=SHMAP[id];return !u.req||u.req()||shopLvl(id)>0;}
function buyShop(id){const u=SHMAP[id];if(!u||!shopAvail(id)) return false;const c=shopCost(id);if(!(c<=S.seeds)) return false;
  S.seeds-=c;S.shop=S.shop||{};S.shop[id]=shopLvl(id)+1;M=computeMods();
  if(id==='charter'&&S.premium&&!S.premium.lvl){S.premium.lvl=1;if(typeof rebuildAll==='function') try{rebuildAll();}catch(_){}}
  if(typeof sfx==='function') sfx('buy');rpSig='';return true;}
/* production side of the legacy, called from computeMods() */
function rpApply(m){
  m.prodShop=1;for(const u of SHOP) if(u.fx&&shopLvl(u.id)) u.fx(m,shopLvl(u.id));
  m.legacy=S.oldRep>0?Math.max(S.oldRep,legacyMult()):legacyMult();   // migrated run keeps its old bonus until the next Replant
  return m.legacy*m.prodShop;
}
/* ---------- run goals ---------- */
const GOALS=[
  {id:'e5',  e:'🪙',n:'Earn 100K this run',      p:()=>[S.totalEarned,1e5*cs()]},
  {id:'carp',e:'🔨',n:'Build the Carpentry',      p:()=>[S.buildings.carpentry.lvl,1]},
  {id:'s25', e:'🪚',n:'Sawmill Lv 25',            p:()=>[S.buildings.sawmill.lvl,25]},
  {id:'e7',  e:'🪙',n:'Earn 10M this run',       p:()=>[S.totalEarned,1e7*cs()]},
  {id:'furn',e:'🛋️',n:'Build the Furniture Factory',p:()=>[S.buildings.furniture.lvl,1]},
  {id:'s50', e:'⭐',n:'Any line Lv 50',           p:()=>[Math.max(...BUILDINGS.map(b=>S.buildings[b.id].lvl)),50]},
  {id:'prem',e:'✨',n:'Open the Premium Area',    p:()=>[(S.premium&&S.premium.lvl)&&!(S.run&&S.run.charter)?1:(S.run&&S.run.charter&&BUILDINGS.some(b=>b.premium&&S.buildings[b.id].lvl>0))?1:0,1]},
  {id:'e9',  e:'🪙',n:'Earn 1B this run',        p:()=>[S.totalEarned,1e9*cs()]},
  {id:'lab', e:'🔬',n:'Run the Research Lab',     p:()=>[S.buildings.lab.lvl,1]},
  {id:'e11', e:'🪙',n:'Earn 100B this run',      p:()=>[S.totalEarned,1e11*cs()]},
  {id:'l100',e:'🏅',n:'Any line Lv 100',          p:()=>[Math.max(...BUILDINGS.map(b=>S.buildings[b.id].lvl)),100]},
  {id:'e13', e:'🪙',n:'Earn 10T this run',       p:()=>[S.totalEarned,1e13*cs()]},
];
function runState(){if(!S.run||typeof S.run!=='object') S.run={goals:{},peak:0,start:S.playTime||0,charter:false};if(!S.run.goals) S.run.goals={};return S.run;}
function goalsDone(){const g=runState().goals;let n=0;for(const x of GOALS) if(g[x.id]) n++;return n;}
function goalTick(){const r=runState();let fresh=null;for(const x of GOALS){if(r.goals[x.id]) continue;const [c,t]=x.p();if(c>=t){r.goals[x.id]=1;fresh=x;}}
  if(fresh&&typeof toast==='function') toast(`<span style="font-size:20px">${fresh.e}</span><span><b>Run goal: ${fresh.n}</b><br>+${Math.round(RPC.goal*100)}% Seeds at the next Replant (${goalsDone()}/${GOALS.length})</span>`,4200);
  return fresh;}
/* ---------- gain ---------- */
function gainMult(){return (1+RPC.goal*goalsDone())*(1+.15*shopLvl('roots'));}
function seedsRaw(earned){const f=RPC.first*cs();return earned<f?0:RPC.gainK*Math.pow(earned/f,RPC.gainE);}   // run earnings in this run's forest value
function pendingSeeds(){const r=seedsRaw(S.totalEarned);return r<=0?0:Math.max(1,Math.floor(r*gainMult()));}
function seedsFor(earned){const r=seedsRaw(earned);return r<=0?0:Math.max(1,Math.floor(r*gainMult()));}
function runMin(){return Math.max(1/60,((S.playTime||0)-(runState().start||0))/60);}
function seedRate(){return pendingSeeds()/runMin();}
function rpTick(){const r=runState();goalTick();const rate=seedRate();if(rate>r.peak) r.peak=rate;}
/* "good time to replant": gain worth at least a quarter of the legacy (or 3 Seeds), and the Seeds-per-minute rate has passed its peak */
function rpAdvice(){const g=pendingSeeds(),r=runState(),rate=seedRate(),L=S.legacy||0;
  if(g<1) return {k:'wait',t:`First Seeds at 🪙 ${fmt(RPC.first*cs())} earned this run`};
  const worth=g>=Math.max(3,Math.ceil(L*.25)), past=r.peak>0&&rate<r.peak*.85&&runMin()>=5;
  if(worth&&past) return {k:'now',t:'🌟 Good time to replant: your Seeds per minute have peaked'};
  if(!worth) return {k:'grow',t:`Keep growing: aim for ≥ ${Math.max(3,Math.ceil(L*.25))} Seeds (¼ of your Legacy) for a worthwhile Replant`};
  return {k:'grow',t:'Seeds are still coming in faster: keep going a little longer'};}
function nextSeedAt(){const g=pendingSeeds(),gm=gainMult();const need=(g+1)/gm/RPC.gainK;return RPC.first*cs()*Math.max(1,Math.pow(need,1/RPC.gainE));}
/* ---------- replant ---------- */
/* the forest value of a new run: costs follow ~70 % of your global production bonus (Legacy × Fertile Soil), so a run starts
   ~(bonus)^0.3 faster than a fresh game, not hundreds of free levels faster */
function runPower(){const c=shopLvl('crews'),m=shopLvl('mills');return legacyMult()*(1+.25*shopLvl('soil'))*Math.sqrt((1+.5*c)*(1+.5*m))*(1+.1*shopLvl('market'))*TREES[Math.min(shopLvl('arbor'),TREES.length-1)].mult;}
function runScaleFor(){return Math.pow(runPower(),RPC.csE);}
function rpStartRun(){
  S.runCS=runScaleFor();
  const r=runState();r.goals={};r.peak=0;r.start=S.playTime||0;r.charter=false;
  const m=shopLvl('money');if(m) S.coins+=seedMoney(m)*S.runCS;
  const n=shopLvl('nursery');if(n){S.collectors.lumberjack+=5*n;S.planters.planter=(S.planters.planter||0)+2*n;}
  const a=shopLvl('arbor');if(a) S.tree=Math.min(a,TREES.length-1);
  if(shopLvl('charter')){S.premium.lvl=Math.max(1,S.premium.lvl||0);r.charter=true;}
}
function rpKeep(g){return {legacy:(S.legacy||0)+g,shop:Object.assign({},S.shop||{}),
  rpStats:(()=>{const st=Object.assign({runs:[],best:0},S.rpStats||{});st.runs=(st.runs||[]).concat([{min:+runMin().toFixed(1),g,earned:S.totalEarned,goals:goalsDone()}]).slice(-8);st.best=Math.max(st.best||0,g);return st;})()};}
/* ---------- migration (pre-v2.18 saves) ---------- */
function rpMigrate(o){
  if(typeof o.legacy==='number') return;
  const seeds=Math.max(0,o.seeds||0);let spent=0;
  try{for(const k in OLD_RES_SEEDS) if(o.research&&o.research[k]) spent+=OLD_RES_SEEDS[k];}catch(_){}
  try{for(const m of MANAGERS){const l=(o.mgr&&o.mgr[m.id])||0;for(let k=6;k<l;k++) spent+=k-5;}}catch(_){}
  o.legacy=seeds+spent;   // every Seed ever earned counts towards the Legacy
  o.shop=o.shop||{};
  if(seeds>0||spent>0) o.oldRep=1+.1*seeds;   // the run in progress keeps the old +10 %/Seed bonus until the next Replant
  o.run={goals:{},peak:0,start:o.playTime||0,charter:false};
  o.rpStats={runs:[],best:0,migrated:{seeds,spent}};
}

/* ===================== UI (mobile-first) ===================== */
let rpTab='replant';
function setupReplantUI(){
  const T=$('rpTabs');if(!T) return;
  T.querySelectorAll('button').forEach(b=>b.onclick=()=>{rpTab=b.dataset.t;rpSig='';T.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    for(const [k,id] of [['replant','rpReplant'],['shop','rpShop'],['goals','rpGoals']]) $(id).classList.toggle('hidden',k!==rpTab);
    const sb=$('shBody');if(sb) sb.scrollTop=0;});
  $('rpShopList').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b&&buyShop(b.dataset.buy)){rpSig='';updateCompany();}});
}
function rpTabOpen(t){const b=document.querySelector(`#rpTabs [data-t="${t}"]`);if(b) b.click();}
function shopAffordable(){return SHOP.some(u=>shopAvail(u.id)&&shopCost(u.id)<=S.seeds);}
function fx2(x){return x<10?x.toFixed(2):x<1000?x.toFixed(1):fmt(x);}
function updateCompany(){
  const g=pendingSeeds(),adv=rpAdvice();
  $('coDot').classList.toggle('hidden',!(adv.k==='now'||shopAffordable())||curSheet==='co');
  if(curSheet!=='co') return;
  const sd=$('rpShopDot');if(sd) sd.classList.toggle('hidden',!shopAffordable());
  const L=S.legacy||0,P=legacyMult(),P2=legacyOf(L+g);
  if(rpTab==='replant'){
    $('pGain').textContent='+'+fmt(g)+' 🌱';
    $('prestigeBtn').disabled=g<1;
    const h=`<div class="rp-l"><span>🌳 Forest Legacy</span><b>${fmt(L)}${g?` → ${fmt(L+g)}`:''}</b></div><div class="rp-l"><span>Production bonus</span><b>×${fx2(P)}${g?` → ×${fx2(P2)}`:''}</b></div>`+
      `<div class="rp-l"><span>🌱 Seeds to spend</span><b>${fmt(S.seeds)}</b></div><div class="rp-l"><span>🎯 Run goals</span><b>${goalsDone()}/${GOALS.length} · +${Math.round(RPC.goal*100*goalsDone())}% Seeds</b></div>`+
      (S.oldRep>0?`<div class="rp-l rp-old"><span>This run keeps your old bonus</span><b>×${fx2(S.oldRep)}</b></div>`:'');
    const lg=$('rpLegacy');if(lg._h!==h){lg.innerHTML=h;lg._h=h;}
    $('pNext').innerHTML=g<1?`Requires 🪙 ${fmt(RPC.first*cs())} earned this run (now ${fmt(S.totalEarned)}).`:`Next Seed at 🪙 ${fmt(nextSeedAt())} · ${fr(seedRate())} 🌱/min now (peak ${fr(runState().peak)})`;
    const ad=$('rpAdvice');ad.className='rp-advice '+adv.k;ad.textContent=adv.t;
  }
  if(rpTab==='shop'){
    const sig=JSON.stringify(S.shop||{})+'|'+Math.floor(S.seeds)+'|'+S.prestiges;
    $('rpWallet').innerHTML=`🌱 <b>${fmt(S.seeds)}</b> Seeds to spend · spending never lowers your Legacy (×${fx2(P)})`;
    if(sig!==rpSig){rpSig=sig;
      $('rpShopList').innerHTML=SHOP.map(u=>{const l=shopLvl(u.id),c=shopCost(u.id),av=shopAvail(u.id),mx=l>=u.max;
        return `<div class="rp-card${mx?' max':''}${av?'':' locked'}"><div class="rp-ic">${u.e}</div><div class="rp-tx"><div class="nm">${u.n} <small>Lv ${l}/${u.max}</small></div>
          <div class="ds">${l?u.d(l):'Not owned'}${mx?'':` → <b>${u.d(l+1)}</b>`}</div></div>
          ${mx?'<span class="chip">Max</span>':av?`<button class="btn ${c<=S.seeds?'gold':''}" data-buy="${u.id}" ${c<=S.seeds?'':'disabled'}>🌱 ${fmt(c)}</button>`:'<span class="chip off">After 2 Replants</span>'}</div>`;}).join('');}
  }
  if(rpTab==='goals'){
    const r=runState();$('rpGoalsHead').innerHTML=`Each goal reached this run adds <b>+${Math.round(RPC.goal*100)}%</b> to the Seeds of your next Replant. Goals restart every run; coin goals follow this run's forest value (×${fx2(cs())}).`;
    const h=GOALS.map(x=>{const [c,t]=x.p(),d=!!r.goals[x.id],k=Math.min(1,t>0?c/t:0);const nm=x.n.replace(/Earn [0-9.]+[KMBT]? this run/,`Earn ${fmt(t)} this run`);
      return `<div class="rp-goal${d?' done':''}"><span class="e">${d?'✅':x.e}</span><div class="g"><div>${nm}</div><div class="pbar"><i style="width:${(d?100:k*100).toFixed(0)}%"></i></div></div><b>+${Math.round(RPC.goal*100)}%</b></div>`;}).join('');
    const el=$('rpGoalList');if(el._h!==h){el.innerHTML=h;el._h=h;}
  }
  const st=S.rpStats||{},last=(st.runs||[]).slice(-1)[0];
  const rows=[['Forest Legacy',`${fmt(L)} 🌳 (×${fx2(P)})`],['Seeds to spend',`${fmt(S.seeds)} 🌱`],['Run forest value','×'+fx2(cs())],['Earned this run','🪙 '+fmt(S.totalEarned)],['Lifetime earnings','🪙 '+fmt(S.lifetimeEarned)],
    ['Logs per second',fr(logRate())],['Chops (run / lifetime)',`${fmt(S.clicks)} / ${fmt(S.lifetimeClicks)}`],['Replants',S.prestiges],['Last run',last?`${last.min} min · +${fmt(last.g)} 🌱`:'—'],
    ['Current wood',TREES[S.tree].name],['Trophies',`${achCount()} / ${ACH.length} (+${Math.round(achCount()*ACH_BONUS*100)}%)`],['Golden logs caught',S.golden||0],['Milestone stars',`${totStars()} ⭐`],['Play time',fmtTime(S.playTime)],['Version',S.version||VERSION]];
  const h=rows.map(r=>`<div>${r[0]}</div><div>${r[1]}</div>`).join(''); const k=$('statsKv'); if(k._h!==h){k.innerHTML=h;k._h=h;}
}
/* confirm sheet: what resets, what stays, what you get */
function rpConfirm(){
  const g=pendingSeeds();if(g<1) return;
  const L=S.legacy||0,P=legacyMult(),P2=legacyOf(L+g);
  const keepShop=SHOP.filter(u=>shopLvl(u.id)).map(u=>u.e).join(' ');
  const body=`<div class="rp-cf-gain">+${fmt(g)} 🌱 <small>Legacy ${fmt(L)} → <b>${fmt(L+g)}</b> · production ×${fx2(P)} → <b>×${fx2(P2)}</b></small></div>
  <div class="rp-cf">
   <div class="rp-cf-col reset"><b>🔄 Resets</b><ul><li>Coins &amp; stock</li><li>Buildings &amp; levels</li><li>Collectors &amp; planters</li><li>Upgrades &amp; wood species</li><li>Premium Area</li><li>Storage, orders in progress</li><li>Run goals</li></ul></div>
   <div class="rp-cf-col keep"><b>✅ Stays</b><ul><li>Forest Legacy &amp; Seeds</li><li>Seed Shop ${keepShop}</li><li>Research tree</li><li>Staff &amp; managers</li><li>Fire station, power plant</li><li>Builders' &amp; Shipping Yard</li><li>Harbour &amp; trade routes</li><li>Trophies, line picks, stats</li></ul></div>
  </div>
  <div class="legend">The new run is priced in your forest's value (×${fx2(Math.pow(legacyOf(L+g)*(1+.25*shopLvl('soil'))*Math.sqrt((1+.5*shopLvl('crews'))*(1+.5*shopLvl('mills')))*(1+.1*shopLvl('market'))*TREES[Math.min(shopLvl('arbor'),TREES.length-1)].mult,RPC.csE))}): costs and goals grow with it, so the climb stays meaningful.</div>`;
  confirmModal('🌱 Replant the Forest?',body,'Replant',()=>{if(doPrestige()!==false){closeSheet();fitCamera();if(S.seeds>0&&shopAffordable()) setTimeout(()=>{openSheet('co');rpTabOpen('shop');},700);}});
}
