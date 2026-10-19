'use strict';
/* ===================== v2.17 LINE SPECIALISATIONS =====================
   From Lv 50 (★3) every production building can run one of three specialised lines:
     ⚡ High-speed line: more items per second, but each item takes a little more input
     ♻️ Lean line:       each item takes less input (eases shortages up the chain)
     💎 Master craft:    the building's goods sell (and pay in orders/contracts/trade) for more
   The effect grows in three tiers: I at Lv 50, II at Lv 100, III at Lv 200.
   The first pick is free and instant; switching retools the line for 30 s at 25 % speed.
   The choice is remembered through Replant and switches back on once the building reaches Lv 50 again
   (Replant still resets building levels and upgrade/hire costs exactly as before).
   Save: S.spec = {buildingId:{k:'speed'|'lean'|'craft', rt:<S.time when retooling ends>}}, S.specStats = {picks, switches}. */
const SPEC_KINDS=[
  {k:'speed',icon:'⚡',name:'High-speed line',col:'#2f7fe0',dark:'#1b4f9a',lite:'#8cc0ff',spd:[1.4,1.6,1.8],inp:[1.15,1.15,1.15]},
  {k:'lean',icon:'♻️',name:'Lean line',col:'#3c9a4a',dark:'#1f5e2a',lite:'#9fe0a2',inp:[.8,.7,.6]},
  {k:'craft',icon:'💎',name:'Master craft',col:'#d99a1a',dark:'#8a5806',lite:'#ffe08a',price:[1.25,1.4,1.6]},
];
const SPMAP={}; SPEC_KINDS.forEach(s=>SPMAP[s.k]=s);
const SPEC_LV=[50,100,200], SPEC_RETOOL=30, SPEC_RETOOL_SPD=.25, SPEC_ROMAN=['','I','II','III'];
function specEligible(id){const b=BMAP[id];return !!b&&!b.rp&&Object.keys(b.out).length>0;}
function specTierAt(l){let t=0;for(const x of SPEC_LV) if(l>=x) t++;return t;}
function specTier(id){const st=S.buildings[id];return st?specTierAt(st.lvl):0;}
function specOf(id){const s=S.spec&&S.spec[id];return s&&SPMAP[s.k]?s:null;}
function specRetool(id){const s=specOf(id);return s&&specTier(id)&&s.rt>S.time?s.rt-S.time:0;}
/* [kind, tier] while the specialisation is in effect (unlocked, chosen, not retooling) */
function specActive(id){if(!specEligible(id)) return null;const s=specOf(id);if(!s) return null;const t=specTier(id);if(!t||s.rt>S.time) return null;return [SPMAP[s.k],t];}
function specSpd(id){if(!S.spec||!S.spec[id]) return 1;if(specRetool(id)>0) return SPEC_RETOOL_SPD;const a=specActive(id);return a&&a[0].spd?a[0].spd[a[1]-1]:1;}
function specIn(id){if(!S.spec||!S.spec[id]) return 1;const a=specActive(id);return a&&a[0].inp?a[0].inp[a[1]-1]:1;}
function specPriceMult(id){const a=specActive(id);return a&&a[0].price?a[0].price[a[1]-1]:1;}
/* called from computeMods(): master-craft lines raise the price of their own goods */
function applySpecMods(m){if(!S.spec) return;for(const id in S.spec){const x=specPriceMult(id);if(x!==1) for(const k in BMAP[id].out) m.price[k]*=x;}}
function specCount(minTier){let n=0;for(const id in (S.spec||{})) if(specOf(id)&&specTier(id)>=(minTier||1)) n++;return n;}
function specPending(){return BUILDINGS.filter(b=>specEligible(b.id)&&specTier(b.id)>0&&!specOf(b.id)&&(!b.premium||S.premium.lvl));}
function specPick(id,k){
  if(!specEligible(id)||!SPMAP[k]||!specTier(id)) return false;
  if(!S.spec) S.spec={}; if(!S.specStats) S.specStats={picks:0,switches:0};
  const cur=specOf(id); if(cur&&cur.k===k) return false;
  const sw=!!cur; S.spec[id]={k,rt:sw?S.time+SPEC_RETOOL:0};
  S.specStats.picks++; if(sw) S.specStats.switches++;
  M=computeMods(); const d=SPMAP[k], b=BMAP[id];
  toast(sw?`🔧 <b>${b.name}</b> is retooling to ${d.icon} <b>${d.name}</b> · ${SPEC_RETOOL} s at ${Math.round(SPEC_RETOOL_SPD*100)}% speed`:`${d.icon} <b>${b.name}</b>: ${d.name} ${SPEC_ROMAN[specTier(id)]} — ${specEffectTxt(d,specTier(id))}`);
  if(typeof sfx==='function') sfx(sw?'buy':'unlock'); if(typeof haptic==='function') haptic(12);
  if(typeof scene!=='undefined'&&scene) scene.specFlash={id,t:1.4};
  if(typeof checkAch==='function') checkAch();
  return true;
}
function specEffectTxt(d,t){const i=Math.max(1,t)-1;
  if(d.k==='speed') return `+${Math.round((d.spd[i]-1)*100)}% speed · +${Math.round((d.inp[i]-1)*100)}% input per item`;
  if(d.k==='lean') return `−${Math.round((1-d.inp[i])*100)}% input per item`;
  return `goods sell for +${Math.round((d.price[i]-1)*100)}%`;}
/* advisor: which line fits this building right now, and why */
function specSuggest(id){
  const b=BMAP[id],st=S.buildings[id],bs=bstat[id]; if(!b||!st.lvl) return null;
  const fs=bs&&isFinite(bs.fs)?bs.fs:(bs?bs.f:1);
  if(st.on&&bs&&bs.lim&&fs<.95) return {k:'lean',why:`it is short on ${RMAP[bs.lim].name}`};
  const outs=Object.keys(b.out);
  for(const k of outs){const users=BUILDINGS.filter(o=>o.inp[k]&&S.buildings[o.id].lvl&&S.buildings[o.id].on);
    if(users.some(o=>{const q=bstat[o.id];return q&&q.lim===k&&(isFinite(q.fs)?q.fs:q.f)<.95;})) return {k:'speed',why:`${users.length>1?'its buyers want':BMAP[users[0].id].name+' wants'} more ${RMAP[k].name}`};}
  let p=0,s=0;for(const k of outs){const R=rates[k];if(R){p+=R.p;s+=R.s;}}
  const used=outs.some(k=>BUILDINGS.some(o=>o.inp[k]&&S.buildings[o.id].lvl));
  if(!used||(p>0&&s/p>.5)) return {k:'craft',why:p>0?`${Math.round(Math.min(1,s/p)*100)}% of its goods are sold`:'its goods are sold, not used'};
  return {k:'speed',why:'more output for the buildings it feeds'};
}
/* per-option estimate at the building's current tier (what you would get with that line) */
function specEstimate(id,k){
  const b=BMAP[id],st=S.buildings[id],d=SPMAP[k],t=Math.max(1,specTier(id)),i=t-1; if(!st.lvl) return '';
  const f=st.on&&bstat[id]?bstat[id].f:0, base=bSpeed(id)/Math.max(1e-9,specSpd(id)), inBase=mgrIn(id);
  const ok=Object.keys(b.out)[0]; if(!ok) return '';
  if(k==='speed'){const o=b.out[ok]*base*f*bOutMult(id)*(d.spd[i]-1);return `≈ +${fr(o)} ${RMAP[ok].name}/s`;}
  if(k==='lean'){let s=0,ik=null;for(const q in b.inp){const v=b.inp[q]*base*f*inBase*(1-d.inp[i]);if(!ik||v>s){s=v;ik=q;}}return ik?`saves ≈ ${fr(s)} ${RMAP[ik].name}/s`:'';}
  let c=0;for(const q in b.out){const R=rates[q];if(!R) continue;const pb=price(q)/specPriceMult(id);c+=R.s*pb*(d.price[i]-1);}
  return c>0?`≈ +🪙${fmt(c)}/s at today's sales`:'pays off when its goods are sold';
}
/* milestone toast note */
function specMsNote(b,ms0,ms1){if(!specEligible(b.id)) return '';const t0=specTierAt(MILESTONES[ms0-1]||0),t1=specTierAt(MILESTONES[ms1-1]);if(t1<=t0) return '';
  const s=specOf(b.id);return t1===1&&!s?' · 🎛️ Specialisation unlocked!':s?` · ${SPMAP[s.k].icon} ${SPMAP[s.k].name} ${SPEC_ROMAN[t1]}`:` · 🎛️ Specialisation ${SPEC_ROMAN[t1]}`;}
function specKeep(){const o={};for(const id in (S.spec||{})){const s=specOf(id);if(s) o[id]={k:s.k,rt:0};}return o;}
function specMigrate(o){
  if(!o.spec||typeof o.spec!=='object'||Array.isArray(o.spec)) o.spec={};
  for(const id in o.spec){const s=o.spec[id];if(!BMAP[id]||!s||typeof s!=='object'||!SPMAP[s.k]){delete o.spec[id];continue;}if(typeof s.rt!=='number'||!isFinite(s.rt)) s.rt=0;}
  if(!o.specStats||typeof o.specStats!=='object') o.specStats={picks:0,switches:0};
  for(const k of ['picks','switches']) if(typeof o.specStats[k]!=='number') o.specStats[k]=0;
}

/* ---------- building sheet block ---------- */
let specPend=null;   // {id,k,until}: a switch waits for a second tap (it costs a retool)
function updateBldSpec(b){
  const el=$('bpSpec'); if(!el) return; const st=S.buildings[b.id];
  if(!specEligible(b.id)||!st.lvl||st.lvl<25){if(!el.classList.contains('hidden')){el.classList.add('hidden');el.innerHTML='';el._sig='';}return;}
  el.classList.remove('hidden');
  const t=specTier(b.id),s=specOf(b.id),rt=specRetool(b.id),sug=t?specSuggest(b.id):null,now=performance.now();
  if(specPend&&(specPend.id!==b.id||specPend.until<now)) specPend=null;
  const sig=b.id+'|'+t+'|'+(s?s.k:'')+'|'+(rt>0?1:0)+'|'+(sug?sug.k:'')+'|'+(specPend?specPend.k:'');
  if(el._sig!==sig){el._sig=sig;
    if(!t){el.className='bspec lock';el.innerHTML=`<div class="bspec-lock">🎛️ <span>Specialise this line at <b>Lv 50</b>: ${SPEC_KINDS.map(d=>`${d.icon} ${d.k==='speed'?'faster':d.k==='lean'?'leaner':'pricier goods'}`).join(' · ')}</span></div>`;}
    else{
      const nx=SPEC_LV[t];
      let h=`<div class="bspec-h"><b>🎛️ Specialisation</b><span class="bspec-tier">${'◆'.repeat(t)}${'◇'.repeat(3-t)} <b>${SPEC_ROMAN[t]}</b>${nx?` · ${SPEC_ROMAN[t+1]} at Lv ${nx}`:' · max'}</span></div>`;
      if(rt>0) h+=`<div class="bspec-rt"><span>🔧 Retooling to ${SPMAP[s.k].icon} <b>${SPMAP[s.k].name}</b> · <b data-rt></b></span><div class="bar"><i data-rtb></i></div></div>`;
      else if(!s&&sug) h+=`<div class="bspec-why">💡 Suggested: ${SPMAP[sug.k].icon} <b>${SPMAP[sug.k].name}</b> — ${sug.why}</div>`;
      h+='<div class="bspec-opts">';
      for(const d of SPEC_KINDS){const on=s&&s.k===d.k, pend=specPend&&specPend.k===d.k;
        const tag=on?(rt>0?'Retooling':'Active'):pend?'Tap again':(sug&&sug.k===d.k?'Suggested':'');
        h+=`<button class="bspec-o${on?' on':''}${pend?' pend':''}${sug&&sug.k===d.k&&!on?' sug':''}" data-k="${d.k}" style="--sc:${d.col};--sd:${d.dark}" aria-pressed="${on?'true':'false'}">`+
          `<span class="bspec-ic">${d.icon}</span><span class="bspec-t"><b>${d.name}</b><small>${specEffectTxt(d,t)}</small><em data-est="${d.k}"></em></span>${tag?`<span class="bspec-tag">${tag}</span>`:''}</button>`;}
      h+='</div>';
      h+=`<div class="bspec-note">${specPend?`Switching retools the line: <b>${SPEC_RETOOL} s at ${Math.round(SPEC_RETOOL_SPD*100)}% speed</b>. Tap again to confirm.`:s?`Switching retools for ${SPEC_RETOOL} s. Your pick is kept through Replant.`:'First pick is free and instant. Kept through Replant.'}</div>`;
      el.className='bspec'+(s?' has':'');el.innerHTML=h;
      el.querySelectorAll('.bspec-o').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.k,cur=specOf(b.id);
        if(cur&&cur.k===k) return;
        if(cur&&!(specPend&&specPend.id===b.id&&specPend.k===k)){specPend={id:b.id,k,until:performance.now()+4000};el._sig='';updateBldSpec(b);return;}
        specPend=null;specPick(b.id,k);el._sig='';bpSig='';updateBuildingSheet();});
    }
    el._est={};
  }
  if(!t) return;
  for(const e of el.querySelectorAll('[data-est]')){const v=specEstimate(b.id,e.dataset.est);if(e._v!==v){e.textContent=v;e._v=v;}}
  if(rt>0){const a=el.querySelector('[data-rt]'),bb=el.querySelector('[data-rtb]');if(a) a.textContent=Math.ceil(rt)+' s';if(bb) bb.style.width=((1-rt/SPEC_RETOOL)*100).toFixed(0)+'%';}
}

/* ---------- scene: a cloth banner on a post in front of every specialised building ----------
   Cached sprite per kind / tier / winter / retool (one blit per building per frame). */
const SPB_BOX=[-15,-64,21,8], SPB_S=1.25;
function specBannerRaw(g,x,y,d,t,winter,retool){
  // contact shadow + concrete footing
  g.fillStyle='rgba(25,20,10,.25)';g.beginPath();g.ellipse(x+3,y+1,7,3,0,0,TAU);g.fill();
  g.fillStyle='#8d9095';g.beginPath();g.moveTo(x-3.4,y-1);g.lineTo(x,y-2.7);g.lineTo(x+3.4,y-1);g.lineTo(x,y+.7);g.closePath();g.fill();
  g.fillStyle='#6d7075';g.beginPath();g.moveTo(x-3.4,y-1);g.lineTo(x,y+.7);g.lineTo(x,y+2.2);g.lineTo(x-3.4,y+.5);g.closePath();g.fill();
  g.fillStyle='#55585c';g.beginPath();g.moveTo(x+3.4,y-1);g.lineTo(x,y+.7);g.lineTo(x,y+2.2);g.lineTo(x+3.4,y+.5);g.closePath();g.fill();
  // steel pole with a lit edge
  const top=y-44;
  g.fillStyle='#2c3036';g.fillRect(x-1.3,top,2.6,y-1.5-top);g.fillStyle='#6a727c';g.fillRect(x-1.3,top,1,y-1.5-top);
  // cross arm + gold finial
  g.fillStyle='#2c3036';g.fillRect(x-1,top+1.2,14,2);g.fillStyle='#7a828c';g.fillRect(x-1,top+1.2,14,.7);
  const fg=g.createRadialGradient(x-.6,top-2.2,.3,x,top-1.6,2.4);fg.addColorStop(0,'#fff6c0');fg.addColorStop(.5,'#f2c23c');fg.addColorStop(1,'#9a6a0a');
  g.fillStyle=fg;g.beginPath();g.arc(x,top-1.6,2.2,0,TAU);g.fill();
  if(winter){g.fillStyle='#f4f8fb';g.beginPath();g.ellipse(x+6,top+.9,7.6,1.3,0,Math.PI,0);g.fill();}
  // cloth banner hanging from the arm: swallowtail hem, soft folds, a darker side and a top hem
  const bx0=x+1.2,bx1=x+12.4,by0=top+3.2,by1=top+27,mid=(bx0+bx1)/2,col=retool?'#8a8f96':d.col,dark=retool?'#5b6067':d.dark;
  const cg=g.createLinearGradient(bx0,0,bx1,0);cg.addColorStop(0,shade(col,1.18));cg.addColorStop(.35,col);cg.addColorStop(.62,shade(col,.92));cg.addColorStop(.8,shade(col,1.05));cg.addColorStop(1,dark);
  g.fillStyle=cg;g.beginPath();g.moveTo(bx0,by0);g.lineTo(bx1,by0);g.quadraticCurveTo(bx1+.6,(by0+by1)/2,bx1,by1);g.lineTo(mid,by1-4.2);g.lineTo(bx0,by1);g.quadraticCurveTo(bx0-.5,(by0+by1)/2,bx0,by0);g.closePath();g.fill();
  g.strokeStyle='rgba(20,14,6,.55)';g.lineWidth=.6;g.stroke();
  g.fillStyle='rgba(0,0,0,.22)';g.fillRect(bx0,by0,bx1-bx0,1.6);
  g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=.5;g.beginPath();g.moveTo(bx0+2.6,by0+2);g.lineTo(bx0+2.2,by1-2);g.stroke();
  // gold trim along the hem
  g.strokeStyle='#f2c94c';g.lineWidth=.7;g.beginPath();g.moveTo(bx0+.6,by1-1.4);g.lineTo(mid,by1-5.4);g.lineTo(bx1-.6,by1-1.4);g.stroke();
  // emblem: white disc with a vector icon
  const ex=mid,ey=by0+8.6,er=4.4;
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(ex+.4,ey+.6,er,0,TAU);g.fill();
  const eg=g.createRadialGradient(ex-1.4,ey-1.6,.5,ex,ey,er);eg.addColorStop(0,'#ffffff');eg.addColorStop(1,'#e6e1d4');g.fillStyle=eg;g.beginPath();g.arc(ex,ey,er,0,TAU);g.fill();
  g.strokeStyle=dark;g.lineWidth=.7;g.stroke();
  g.fillStyle=retool?'#5b6067':d.dark;g.strokeStyle=retool?'#5b6067':d.dark;
  if(retool){ // wrench while the line is retooled
    g.lineWidth=1.3;g.lineCap='round';g.beginPath();g.moveTo(ex-2.2,ey+2.2);g.lineTo(ex+1.2,ey-1.2);g.stroke();g.lineCap='butt';
    g.beginPath();g.arc(ex+1.7,ey-1.7,1.7,0,TAU);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(ex+2.3,ey-2.3,.75,0,TAU);g.fill();
  } else if(d.k==='speed'){ // lightning bolt
    g.beginPath();g.moveTo(ex+.9,ey-3.4);g.lineTo(ex-2.1,ey+.5);g.lineTo(ex-.1,ey+.5);g.lineTo(ex-.9,ey+3.4);g.lineTo(ex+2.1,ey-.6);g.lineTo(ex+.1,ey-.6);g.closePath();g.fill();
  } else if(d.k==='lean'){ // leaf with a vein
    g.beginPath();g.moveTo(ex-2.6,ey+2.6);g.bezierCurveTo(ex-3,ey-1.6,ex-.4,ey-3.4,ex+2.8,ey-2.8);g.bezierCurveTo(ex+3.2,ey+.6,ex+.6,ey+3,ex-2.6,ey+2.6);g.closePath();g.fill();
    g.strokeStyle='#e6f6e6';g.lineWidth=.55;g.beginPath();g.moveTo(ex-2.2,ey+2.2);g.quadraticCurveTo(ex,ey,ex+2.2,ey-2.2);g.stroke();
  } else { // cut gem
    g.beginPath();g.moveTo(ex-3,ey-1);g.lineTo(ex-1.6,ey-2.6);g.lineTo(ex+1.6,ey-2.6);g.lineTo(ex+3,ey-1);g.lineTo(ex,ey+3.2);g.closePath();g.fill();
    g.strokeStyle='#fff3c8';g.lineWidth=.45;g.beginPath();g.moveTo(ex-3,ey-1);g.lineTo(ex+3,ey-1);g.moveTo(ex-1,ey-1);g.lineTo(ex,ey+3);g.lineTo(ex+1,ey-1);g.stroke();
  }
  // tier pips (I / II / III) under the emblem
  for(let k=0;k<t;k++){const px=mid+(k-(t-1)/2)*3.2,py=ey+er+3.4;g.fillStyle='#f6d25a';g.beginPath();g.moveTo(px,py-1.6);g.lineTo(px+1.4,py);g.lineTo(px,py+1.6);g.lineTo(px-1.4,py);g.closePath();g.fill();g.strokeStyle='rgba(60,40,0,.6)';g.lineWidth=.4;g.stroke();}
}
function specBannerAt(L,B){const f=L.face||'I';return f==='I'?[B.i1+.24,B.j1-.22]:[B.i1-.22,B.j1+.24];}   // front corner, clear of door, conveyor and lamps
function specBanner(ctx,L,B){
  const s=specOf(L.id); if(!s) return; const t=specTier(L.id); if(!t) return;
  const d=SPMAP[s.k], rt=specRetool(L.id)>0, w=SEAS===3, [i,j]=specBannerAt(L,B), [x,y]=P(i,j);
  let lift=0; if(scene.specFlash&&scene.specFlash.id===L.id){const k=scene.specFlash.t/1.4;lift=Math.sin(k*Math.PI)*6;}
  sprite(ctx,'spb'+d.k+t+(w?'w':'')+(rt?'r':''),x,y-lift,SPB_BOX,(g,ax,ay)=>{g.save();g.translate(ax,ay);g.scale(SPB_S,SPB_S);specBannerRaw(g,0,0,d,t,w,rt);g.restore();});
}
function specFrame(dt){if(scene.specFlash){scene.specFlash.t-=dt;if(scene.specFlash.t<=0) scene.specFlash=null;}}
function specTag(id){const a=specOf(id);return a&&specTier(id)?' '+SPMAP[a.k].icon:'';}
