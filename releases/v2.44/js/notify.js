/* ===================== v2.43 CALM NOTIFICATIONS (maintenance item 8: late-game clutter on phones) =====================
   Every toast() goes through ntPush. Rules:
   - priority: 3 setbacks / fires (bad-toast), 2 milestones (ms / trophy / golden / forest toasts) and anything the player just
     tapped (feedback), 1 the rest (weather, staff, routine upgrades);
   - at most NT_CAP_PHONE toast on a phone (NT_CAP_DESK on desktop); the rest wait in a short queue, highest priority first;
     a newer, more important toast takes the slot of a less important one at once; waiting toasts that are too old go
     straight to the log (NT_WAIT seconds per priority), so nothing important is thrown away any more;
   - repeats (the same text with other numbers, e.g. "Kiln → Lv 41/42/43") collapse into one toast with a ×N badge;
   - phones show shorter, two-line toasts (ntDur) right under the HUD row; tap a toast to dismiss it;
   - the 🔔 pill under the toast (+N waiting / unseen) opens the notification log (last NT_LOG, newest first);
   - Settings → Notifications: All / Important (Important = priority ≥ 2 shows; the rest only go to the log).
   The log is per session (not saved), so old saves load unchanged. */
const NT_CAP_PHONE=1, NT_CAP_DESK=3, NT_QMAX=8, NT_LOG=40, NT_WAIT={1:8,2:30,3:45}, NT_MERGE_LOG=60;
const NT={vis:[],q:[],log:[],seq:0,unseen:0,stats:{pushed:0,shown:0,merged:0,queued:0,bumped:0,expired:0,quiet:0}};
function ntPhone(){return innerWidth<=720||(innerHeight<=520&&innerWidth>innerHeight);}
function ntCap(){return ntPhone()?NT_CAP_PHONE:NT_CAP_DESK;}
function ntQuiet(){return !!(S&&S.prefs&&S.prefs.ntQuiet===true);}
function ntSetQuiet(v){if(!S.prefs||typeof S.prefs!=='object') S.prefs={};S.prefs.ntQuiet=!!v;ntPill();}
const _ntTpl=document.createElement('div');
function ntText(html){_ntTpl.innerHTML=String(html==null?'':html);return (_ntTpl.textContent||'').replace(/\s+/g,' ').trim();}
function ntKey(txt,cls){return (cls||'')+'|'+txt.replace(/[+−\-]?[🪙]?\s?\d[\d.,:]*\s?(?:[KMBTQ]|[kmb]n|[a-z]{2})?\b\s?%?/g,'#').replace(/#(\s*#)+/g,'#').slice(0,90);}
function ntFeedback(){try{const e=window.event;return !!(e&&e.isTrusted!==false&&/^(click|pointerup|pointerdown|touchend|keydown|keyup|change|mouseup)$/.test(e.type));}catch(_){return false;}}
function ntPri(html,cls,txt){
  if(/\bbad-toast\b/.test(cls||'')||/^🔥 Fire at/.test(txt)) return 3;
  if(/\b(ms|ach|golden|forest)-toast\b/.test(cls||'')) return 2;
  return ntFeedback()?2:1;
}
function ntDur(ms,p){const base=+ms>0?+ms:4200;
  if(!ntPhone()) return base;
  return p>=3?Math.min(base,5000):Math.max(2200,Math.min(3600,base*0.72));}
function ntHost(){return $('toasts');}
function ntPrune(){NT.vis=NT.vis.filter(v=>v.el&&v.el.isConnected&&!v.gone);}
function ntLog(e){
  const L=NT.log[0], now=Date.now();
  if(L&&L.key===e.key&&now-L.at<NT_MERGE_LOG*1000){L.n++;L.txt=e.txt;L.html=e.html;L.at=now;e.logRef=L;return;}
  const r={key:e.key,txt:e.txt,html:e.html,p:e.p,n:1,at:now,cls:e.cls||'',seen:false};NT.log.unshift(r);e.logRef=r;
  if(NT.log.length>NT_LOG) NT.log.length=NT_LOG;
}
function ntBadge(el,n){let b=el.querySelector(':scope>.nt-n');if(n>1){if(!b){b=document.createElement('span');b.className='nt-n';el.appendChild(b);}b.textContent='×'+n;}else if(b) b.remove();}
function ntShow(e){
  const host=ntHost(); if(!host) return;
  const t=document.createElement('div');t.className='toast'+(e.cls?' '+e.cls:'')+(e.p>=3?' nt-hi':'');t.innerHTML=e.html;t.dataset.p=e.p;
  t.addEventListener('click',ev=>{ev.stopPropagation();ntHide(e,true);});
  const pill=$('ntPill'); if(pill&&pill.parentNode===host) host.insertBefore(t,pill); else host.appendChild(t);
  e.el=t;e.gone=false;e.shownAt=performance.now();if(e.logRef) e.logRef.seen=true;ntBadge(t,e.n);NT.vis.push(e);NT.stats.shown++;ntArm(e);
}
function ntArm(e,ms){clearTimeout(e.tm);e.tm=setTimeout(()=>ntHide(e),ms!=null?ms:e.dur);}
function ntHide(e,fast){
  if(e.gone) return; e.gone=true; clearTimeout(e.tm); const t=e.el;
  NT.vis=NT.vis.filter(v=>v!==e);
  if(t&&t.isConnected){t.style.transition='opacity '+(fast?'.18s':'.4s');t.style.opacity='0';t.style.pointerEvents='none';setTimeout(()=>{t.remove();ntPill();},fast?180:400);}
  setTimeout(ntPump,fast?120:250);
}
function ntPump(){
  ntPrune(); const now=performance.now();
  NT.q=NT.q.filter(e=>{if((now-e.t)/1000>NT_WAIT[e.p]){NT.stats.expired++;NT.unseen++;return false;}return true;});
  while(NT.vis.length<ntCap()&&NT.q.length){NT.q.sort((a,b)=>b.p-a.p||a.t-b.t);ntShow(NT.q.shift());}
  // something waits: the visible low-priority toast hurries up (but stays readable ≥ 1.2 s)
  if(NT.q.length) for(const v of NT.vis){if(v.p<=NT.q[0].p&&!v.hurry){const left=v.dur-(now-v.shownAt);if(left>1200){v.hurry=1;ntArm(v,Math.max(1200-(now-v.shownAt),0)+0);}}}
  ntPill();
}
function ntPush(html,ms,cls){
  html=String(html==null?'':html); const txt=ntText(html); if(!txt&&!/<svg/i.test(html)) return null;
  ntPrune(); NT.stats.pushed++;
  const p=ntPri(html,cls,txt), key=ntKey(txt,cls);
  const e={id:++NT.seq,html,cls:cls||'',ms,p,key,txt,n:1,t:performance.now(),dur:ntDur(ms,p)};
  ntLog(e);
  // a repeat of what is on screen: update in place with a ×N badge
  const v=NT.vis.find(x=>x.key===key);
  if(v){v.n++;v.html=html;v.txt=txt;v.el.innerHTML=html;ntBadge(v.el,v.n);v.hurry=0;v.shownAt=performance.now();ntArm(v);NT.stats.merged++;if(v.logRef) v.logRef.seen=true;ntPill();return v.el;}
  const w=NT.q.find(x=>x.key===key);
  if(w){w.n++;w.html=html;w.txt=txt;w.p=Math.max(w.p,p);NT.stats.merged++;ntPill();return null;}
  if(p===1&&ntQuiet()){NT.stats.quiet++;NT.unseen++;ntPill();return null;}
  if(NT.vis.length<ntCap()){ntShow(e);ntPill();return e.el;}
  // full: a more important (or just-tapped) toast takes the slot of the least important one on screen
  const low=NT.vis.slice().sort((a,b)=>a.p-b.p||a.shownAt-b.shownAt)[0];
  if(low&&(p>low.p||(p>=2&&ntFeedback()&&p>=low.p&&low.p<3))){
    NT.stats.bumped++; if(low.p>=2&&performance.now()-low.shownAt<1500){low.gone=false;NT.q.push(Object.assign({},low,{el:null,t:performance.now()}));}
    ntHide(low,true); NT.vis=NT.vis.filter(x=>x!==low); ntShow(e); ntPump(); return e.el;}
  NT.q.push(e);NT.stats.queued++;
  if(NT.q.length>NT_QMAX){NT.q.sort((a,b)=>b.p-a.p||a.t-b.t);NT.q.length=NT_QMAX;NT.unseen++;NT.stats.expired++;}
  ntPump(); return null;
}
function ntPill(){
  const host=ntHost(); if(!host) return; let pill=$('ntPill');
  const n=NT.q.length+NT.unseen;
  if(!n){if(pill) pill.remove();return;}
  if(!pill){pill=document.createElement('button');pill.id='ntPill';pill.type='button';pill.className='nt-pill';pill.onclick=ev=>{ev.stopPropagation();ntOpenLog();};}
  if(pill.parentNode!==host||pill.nextSibling) host.appendChild(pill);
  const txt=`🔔 +${n}`; if(pill.textContent!==txt){pill.textContent=txt;pill.title=`${NT.q.length} waiting · ${NT.unseen} in the log`;pill.setAttribute('aria-label',`${n} more notifications: open the log`);}
}
function ntAgo(at){const s=Math.max(0,Math.round((Date.now()-at)/1000));return s<60?s+' s':s<3600?Math.floor(s/60)+' min':Math.floor(s/3600)+' h';}
function ntLogHtml(){
  if(!NT.log.length) return '<div class="legend" style="text-align:center">No notifications yet this session.</div>';
  return `<div class="nt-log">${NT.log.map(r=>`<div class="nt-row p${r.p}${r.seen?'':' new'}"><div class="nt-tx">${r.html}${r.n>1?` <span class="nt-n">×${r.n}</span>`:''}</div><span class="nt-ago">${ntAgo(r.at)}</span></div>`).join('')}</div>
    <div class="legend" style="margin-top:6px">The last ${NT_LOG} notifications of this session, newest first. ⚙️ Settings → Notifications: <b>Important</b> keeps only setbacks, milestones and trophies on screen.</div>`;
}
function ntOpenLog(){
  // whatever waited is now in front of the player: clear the queue into the log
  for(const e of NT.q){if(e.logRef) e.logRef.seen=false;} NT.q=[];
  const bg=modal('🔔 Notifications',ntLogHtml(),[{label:'Close'}]); if(bg) bg.classList.add('nt-modal');
  for(const r of NT.log) r.seen=true; NT.unseen=0; ntPill(); return bg;
}
function ntClear(){for(const v of NT.vis.slice()) ntHide(v,true);NT.q=[];NT.unseen=0;ntPill();}
/* Settings row (built once) */
function ntSetupSettings(){
  const pane=$('pane-set'); if(!pane||$('ntSet')) return;
  const row=document.createElement('div');row.className='setrow';row.id='ntSet';
  row.innerHTML=`<span>Notifications<small>Phones show one at a time; repeats merge. <b>Important</b> keeps only setbacks, milestones and trophies on screen, the rest go to the 🔔 log.</small></span>
    <span class="nt-set"><span class="seg" id="ntSeg"><button data-q="0">All</button><button data-q="1">Important</button></span><button class="btn wood small" id="ntLogBtn">🔔 Log</button></span>`;
  const anchor=($('obReplay')||$('afToggle'))&&($('obReplay')||$('afToggle')).closest('.setrow'); if(anchor&&anchor.nextSibling) pane.insertBefore(row,anchor.nextSibling); else pane.insertBefore(row,pane.firstChild);
  row.querySelectorAll('#ntSeg button').forEach(b=>b.onclick=()=>{ntSetQuiet(b.dataset.q==='1');ntSyncSettings();if(typeof save==='function') save(true);});
  $('ntLogBtn').onclick=()=>ntOpenLog(); ntSyncSettings();
}
function ntSyncSettings(){const q=ntQuiet();document.querySelectorAll('#ntSeg button').forEach(b=>b.classList.toggle('on',(b.dataset.q==='1')===q));}
/* v2.43 compact premium-order offer on phones: after NT_OC_MINI s the big offer card shrinks to one row (name, reward, ✕ / ✔);
   tap the row to open Orders. A new offer pops in full size again. */
const NT_OC_MINI=7;
function ntOrderCard(){
  const c=$('orderCard'); if(!c) return;
  const on=c.classList.contains('offer')&&!c.classList.contains('hidden');
  if(!on){c._ntT=0;c._ntOid='';c.classList.remove('mini');return;}
  if(c._ntOid!==c.dataset.oid){c._ntOid=c.dataset.oid;c._ntT=performance.now();}
  const mini=ntPhone()&&performance.now()-c._ntT>NT_OC_MINI*1000;
  if(mini!==c.classList.contains('mini')) c.classList.toggle('mini',mini);
}
