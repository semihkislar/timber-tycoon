'use strict';
/* ===================== v2.29 BOTTLENECK ADVISOR =====================
   Answers "what is holding my factory back, and what do I tap to fix it?".
   - advWait(id): the input a running building is waiting on (smoothed bstat.fs, so one-tick dips stay quiet).
   - advFix(k): the one action that brings more of k. It follows the chain to the root: if the Wood Chipper that makes the chips
     is itself waiting on logs, the fix is "hire collectors", not "upgrade the Chipper".
   - advList(): waiting buildings grouped by input, ranked by the income they lose (coins/s at full speed minus now).
   Shown in three places: a "waiting on X" badge over each building (icon only on phones, a short pill on desktop), the
   building sheet ("⏳ Waiting on Chips" + a jump button), and a "Top bottlenecks" list under the Supply Flow legend.
   Read-only: nothing here changes the economy or the save. */
const ADV_TH=.95, ADV_BAD=.6;
function advFs(bs){return bs?(isFinite(bs.fs)?bs.fs:bs.f):1;}
function advDown(id){return onFire(id)||(typeof mishBroken==='function'&&mishBroken(id)&&!S.mish.broke[id].slow);}
function advWait(id){
  const st=S.buildings[id],bs=bstat[id];if(!st||!st.lvl||!st.on||!bs||!bs.lim||advDown(id)) return null;
  const fs=advFs(bs);if(!(fs<ADV_TH)) return null;
  if(typeof surplusIn==='function'&&surplusIn(id,bs.lim)) return {k:bs.lim,fs,bad:false,spare:true};   // v2.33: the Panel Press / Decor Studio run on spare stock by design: never red
  return {k:bs.lim,fs,bad:fs<ADV_BAD};
}
/* who makes k: the first built producer, else the first one (same rule as shortInfo) */
function advSrc(k){
  const mk=b=>b.out[k]||(k==='chips'&&b.id==='sawmill'&&M.sawdust)||(k==='glue'&&b.id==='kiln'&&M.tar);
  const P=BUILDINGS.filter(b=>b.out[k]);
  return (P.find(b=>S.buildings[b.id].lvl)||BUILDINGS.find(b=>mk(b)&&S.buildings[b.id].lvl)||P[0]||{}).id||null;}
function advGo(id,tab){return ()=>{openSheet('bld',id);if(tab&&typeof bpTab==='function') bpTab(tab);if(typeof focusLot==='function') focusLot(id,true);advPing(id);};}
function advFix(k,seen,via){
  seen=seen||{};via=via||[];seen[k]=1;
  if(k==='logs') return {id:'yard',kind:'crew',k,via,label:'👷 Hire collectors',btn:'👷 Collectors',short:'hire collectors',open:()=>{openSheet('crew');if(typeof focusLot==='function') focusLot('yard',true);advPing('yard');}};
  const id=advSrc(k);if(!id) return null;const b=BMAP[id],st=S.buildings[id],nm=b.name;
  if(!st.lvl){
    if(!bldUnlocked(id)){const r=TECH_UNLOCK[id]&&RNMAP[TECH_UNLOCK[id]];
      return {id,kind:'research',k,via,label:r?`🔬 Research ${r.name}`:`🔒 Unlock ${nm}`,btn:'🔬 Research',short:r?`research ${r.name}`:`unlock the ${nm}`,open:()=>{if(r) openSheet('rnd');else advGo(id)();}};}
    return {id,kind:'build',k,via,label:`🔨 Build the ${nm}`,btn:`🔨 ${nm}`,short:`build the ${nm}`,open:advGo(id)};}
  if(advDown(id)) return {id,kind:'repair',k,via,label:`🔧 Fix the ${nm}`,btn:`🔧 ${nm}`,short:`fix the ${nm}`,open:advGo(id)};
  if(!st.on) return {id,kind:'on',k,via,label:`▶ Turn on the ${nm}`,btn:`▶ ${nm}`,short:`turn on the ${nm}`,open:advGo(id)};
  const w=advWait(id);
  if(w&&!seen[w.k]){const r=advFix(w.k,seen,via.concat([id]));if(r) return r;}   // the producer is starved too: fix the root
  if(typeof wsBlocked==='function'&&wsBlocked(id)){const g=wsGate(id);
    return {id,kind:'ws',k,via,label:`🛠 ${wsName(id,g.k)} Lv ${g.n} (${nm})`,btn:`🛠 ${wsName(id,g.k)}`,short:`upgrade the ${nm}'s ${wsName(id,g.k)}`,open:advGo(id,'ws')};}
  {const bf=typeof beltFixFor==='function'?beltFixFor(k,id):null;if(bf){bf.via=via;return bf;}}   // v2.31: an affordable belt on this link is the quickest fix
  {const df=typeof cdFixFor==='function'?cdFixFor(k,id):null;if(df){df.via=via;return df;}}   // v2.32: the Drone Port, when it is no dearer than upgrading the maker
  return {id,kind:'upg',k,via,label:`⬆ Upgrade the ${nm}`,btn:`⬆ ${nm}`,short:`upgrade the ${nm}`,open:advGo(id)};
}
/* coins/s a building would add if it ran at full speed (its sold value; intermediates count at their market price) */
function advLost(id,fs){const b=BMAP[id],bs=bstat[id];if(!b||!bs) return 0;let v=0;
  for(const o in b.out) v+=b.out[o]*(bs.speed||0)*price(o);return v*Math.max(0,1-fs);}
let advC={t:-1,L:[]};
function advList(force){
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(!force&&now-advC.t<400) return advC.L;
  const g={};
  for(const b of BUILDINGS){const L=LOTS[b.id];if(L&&L.prem&&!S.premium.lvl) continue;const w=advWait(b.id);if(!w) continue;
    (g[w.k]=g[w.k]||{k:w.k,users:[],lost:0,worst:1,spare:true}).users.push({id:b.id,fs:w.fs});g[w.k].lost+=advLost(b.id,w.fs);g[w.k].worst=Math.min(g[w.k].worst,w.fs);if(!w.spare) g[w.k].spare=false;}
  // group by ROOT fix: ten lines starved because the yard is short of logs are one bottleneck ("hire collectors"), not ten
  const R={};
  for(const e of Object.values(g)){const f=advFix(e.k),key=f?f.kind+':'+f.id:'?:'+e.k;
    const r=R[key]||(R[key]={k:f?f.k:e.k,fix:f,users:[],lost:0,worst:1,via:[],spare:true});if(!e.spare) r.spare=false;
    for(const u of e.users) if(!r.users.some(x=>x.id===u.id)) r.users.push(u);
    r.lost+=e.lost;r.worst=Math.min(r.worst,e.worst);if(r.via.indexOf(e.k)<0) r.via.push(e.k);}
  const L=Object.values(R);for(const e of L) e.users.sort((a,b)=>a.fs-b.fs);
  L.sort((a,b)=>(a.spare-b.spare)||(b.lost-a.lost)||(b.users.length-a.users.length)||(a.worst-b.worst));   // v2.33: a surplus line that only waits on spare stock ranks after every real bottleneck
  advC={t:now,L};return L;
}
function advPhone(){return scene.w<700;}
/* ---- in-scene: "waiting on X" badge (replaces the old "!" bubble) ---- */
function advBadge(ctx,id,sx,sy,t,o){o=o||{};
  const w=advWait(id);if(!w) return false;const R=RMAP[w.k],ic=R?R.icon:'⏳',bad=w.bad;
  const z=scene.cam.z/Math.max(1e-6,scene.cam.fitZ), sel=scene.hover===id||sheetBld===id;
  const by=sy-8+(bad?Math.sin(t*4)*2.5:0);
  if(!o.compact&&!advPhone()&&z>=.95||sel){   // desktop (or the selected building): a short readable pill
    pill(ctx,sx,by,w.spare?`♻ ${ic} spare ${R?R.name.toLowerCase():'input'} · ${Math.round(w.fs*100)}%`:`⏳ ${ic} ${R?R.name:'input'}${bad?' · '+Math.round(w.fs*100)+'%':''}`,{fs:sel?11.5:10.5,bg:w.spare?'#7a6a4a':bad?'#c4463d':'#c98a1e',fg:'#fff',stroke:bad?'#ffd2cc':'#ffe6b0',padX:12,padY:7});
    return true;}
  // phones / zoomed out: a calm round badge with the input's icon; only real starvation is red and bobs
  const r=bad?11:9;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.arc(sx,by+2,r,0,TAU);ctx.fill();
  ctx.fillStyle=w.spare?'#8a7a56':bad?'#e8473c':'#e3a32a';ctx.beginPath();ctx.arc(sx,by,r,0,TAU);ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.font=`${bad?12:10}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(ic,sx,by+1);
  return true;
}
/* ---- jump ping: a ring on the building the advisor sent you to ---- */
function advPing(id){scene.advPing={id,t0:performance.now(),t:0};}
function advLotPt(id){const L=id==='yard'?YARD:LOTS[id];if(!L) return null;const p=P(L.ci,L.cj,10);return w2s(p[0],p[1]);}
function advOverlay(ctx,dt){
  const p=scene.advPing;if(!p) return;p.t=(performance.now()-p.t0)/1000;if(p.t>3.2){scene.advPing=null;return;}
  const s=advLotPt(p.id);if(!s) return;const z=Math.max(.5,Math.min(1.6,scene.cam.z));
  ctx.save();for(let k=0;k<2;k++){const ph=((p.t*1.1)+k*.5)%1;ctx.globalAlpha=(1-ph)*Math.min(1,(3.2-p.t)*1.5);
    ctx.strokeStyle='#ffe066';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(s[0],s[1],(30+ph*50)*z,(15+ph*25)*z,0,0,TAU);ctx.stroke();}
  ctx.restore();
}
/* ---- building sheet: chip text + the "fix" hint ---- */
function advChip(id){const w=advWait(id);if(!w) return null;const n=RMAP[w.k]?RMAP[w.k].name:'input';if(w.spare) return `♻ Running on spare ${n.toLowerCase()} · ${Math.round(w.fs*100)}%`;return w.fs<.9?`⏳ Waiting on ${n}`:`Slightly short on ${n}`;}
function advHintHtml(id){
  const w=advWait(id);if(!w) return '';const f=advFix(w.k);if(!f) return '';
  if(w.spare){const nm=BMAP[id].name;return `<div class="adv-why">♻ The ${nm} only takes the ${RMAP[w.k].name.toLowerCase()} the other lines leave over, so it never slows them down. More ${RMAP[w.k].name.toLowerCase()} keeps it busy.</div><button class="bp-short-go adv-go" data-adv="${w.k}">${f.label} →</button>`;}
  const chain=f.via.length?` · the ${f.via.map(v=>BMAP[v].name).join(' and the ')} ${f.via.length>1?'are':'is'} waiting too, so the real fix is ${f.kind==='crew'?'more logs':'the '+(BMAP[f.id]?BMAP[f.id].name:'source')}`:'';
  return `${chain?`<div class="adv-why">👉 <b>Fix:</b> ${f.short}${chain}.</div>`:''}<button class="bp-short-go adv-go" data-adv="${w.k}">${f.label} →</button>`;
}
/* ---- Supply Flow: top bottlenecks ---- */
function advRowsData(){const L=advList(),n=advPhone()?2:3;return {L,n,top:L.slice(0,n)};}
function advSummaryHtml(){
  const {L,n,top}=advRowsData();if(!L.length) return `<div class="adv-sum ok">✔ No bottlenecks: every running building is fed</div>`;
  const rows=top.map((e,i)=>`<button class="adv-row" data-adv="${e.k}"><span class="adv-n">${i+1}</span><span class="adv-t"></span><span class="adv-f"></span></button>`).join('');
  return `<div class="adv-sum"><div class="adv-h">⏳ Top bottlenecks <small></small></div>${rows}</div>`;
}
function advRowText(e){const R=RMAP[e.k],u=e.users,who=u.length>2||advPhone()&&u.length>1?`${u.length} buildings wait`:u.map(x=>BMAP[x.id].name).join(', ')+(u.length>1?' wait':' waits');
  const vv=advPhone()?'':(e.via||[]).filter(k=>k!==e.k&&RMAP[k]).slice(0,4).map(k=>RMAP[k].icon).join('');
  if(advPhone()) return `${R.icon} <b>${R.name}</b> · ${u.length} wait <small>${Math.round(e.worst*100)}% fed${e.lost>0?` · −🪙${fmt(e.lost)}/s`:''}</small>`;
  return `${R.icon} <b>${R.name}</b>${vv?` <small>(also ${vv} short)</small>`:''} · ${who} <small>${Math.round(e.worst*100)}% fed${e.lost>0?` · −🪙${fmt(e.lost)}/s`:''}</small>`;}
/* keyed update: the row buttons are only rebuilt when the set of bottlenecks changes, so a tap never lands on a replaced node */
function advSummaryUpdate(box){
  if(!box) return;const {L,n,top}=advRowsData(),key=L.length?top.map(e=>e.k).join(','):'ok';
  if(box._k!==key){box.innerHTML=advSummaryHtml();box._k=key;}
  if(!L.length) return;
  const sm=box.querySelector('.adv-h small'),more=L.length>n?`+${L.length-n} more · tap one to jump`:'tap one to jump';if(sm&&sm._t!==more){sm.textContent=more;sm._t=more;}
  box.querySelectorAll('.adv-row').forEach((r,i)=>{const e=top[i];if(!e) return;r.classList.toggle('bad',e.worst<ADV_BAD&&!e.spare);
    const t=advRowText(e),f=(e.fix?(advPhone()?e.fix.btn||e.fix.label:e.fix.label):'Open')+' →',a=r.querySelector('.adv-t'),b=r.querySelector('.adv-f');
    if(a._h!==t){a.innerHTML=t;a._h=t;}if(b._h!==f){b.textContent=f;b._h=f;}});
}
function advRun(k){const f=advFix(k);if(!f) return false;if(typeof GI==='object') GI.touchedAt=camNow();f.open();if(typeof haptic==='function') haptic(8);return f;}
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-adv]');if(!b) return;e.preventDefault();advRun(b.dataset.adv);});
