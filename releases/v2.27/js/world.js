'use strict';

/* ===================== v2.3 DAY / NIGHT, SEASONS & WEATHER (logic + HUD widget) ===================== */
const DAY_LEN=420;            // seconds per in-game day (7 min)
const SEASON_DAYS=3;          // in-game days per season (21 min); a full year is 84 min
const WX_START=DAY_LEN*.3;    // new games (and migrated saves) begin at ~07:12 on day 1 of spring
const SEASONS=[
  {id:'spring',n:'Spring',e:'🌸',fx:'Trees regrow fast: collectors +10%',apply:m=>{m.colAll*=1.10;}},
  {id:'summer',n:'Summer',e:'🌻',fx:'Long days: buildings +8%',apply:m=>{m.bldAll*=1.08;}},
  {id:'autumn',n:'Autumn',e:'🍂',fx:'Furniture season: chairs, furniture & cabinets +25%',apply:m=>{for(const k of ['chairs','furniture','cabinets','luxfurn']) m.price[k]*=1.25;}},
  {id:'winter',n:'Winter',e:'❄️',fx:'Heating season: charcoal & pellets +35%, gift boxes +20%',apply:m=>{m.price.charcoal*=1.35;m.price.pellets*=1.35;m.price.giftbox*=1.2;}},
];
const WEATHER={
  clear:{n:'Fair',e:'⛅',fx:'No weather effect'},
  sunny:{n:'Sunny',e:'☀️',fx:'Collectors & chopping +15%',apply:m=>{m.colAll*=1.15;m.chop*=1.15;}},
  rain:{n:'Rain',e:'🌧️',fx:'Collectors & chopping −15%',bad:true,apply:m=>{m.colAll*=.85;m.chop*=.85;}},
  snow:{n:'Snowfall',e:'🌨️',fx:'Collectors −10%, charcoal & pellets +15%',bad:true,apply:m=>{m.colAll*=.9;m.price.charcoal*=1.15;m.price.pellets*=1.15;}},
  wind:{n:'Windy',e:'💨',fx:'Kilns draw hotter: kiln +20%',apply:m=>{m.bld.kiln*=1.2;}},
};
const WX_TABLE={spring:[['rain',.35],['sunny',.3],['wind',.15]],summer:[['sunny',.5],['rain',.15],['wind',.1]],
  autumn:[['rain',.35],['wind',.3],['sunny',.1]],winter:[['snow',.55],['wind',.15],['sunny',.08]]};
function freshWx(){return {clock:WX_START,w:'clear',ends:0,next:WX_START+75};}
function wxClock(){return (S.wx&&S.wx.clock)||0;}
function dayPhase(c){c=c===undefined?wxClock():c;return (c%DAY_LEN)/DAY_LEN;}
function dayNum(c){c=c===undefined?wxClock():c;return Math.floor(c/DAY_LEN);}
function seasonIdx(c){return Math.floor(dayNum(c)/SEASON_DAYS)%4;}
function season(c){return SEASONS[seasonIdx(c)];}
function weatherId(){return (S.wx&&WEATHER[S.wx.w])?S.wx.w:'clear';}
function clockStr(c){const h=dayPhase(c)*24;const hh=Math.floor(h),mm=Math.floor((h-hh)*60/10)*10;return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');}
function isNight(c){const p=dayPhase(c);return p<.2||p>.81;}
function applyWorldMods(m){season().apply(m);const w=WEATHER[weatherId()];if(w.apply) w.apply(m);}
function setWeather(id,dur){const W=S.wx;W.w=id;W.ends=W.clock+(dur||90+Math.random()*80);if(id==='clear'){W.next=W.clock+(dur||60);W.ends=0;}M=computeMods();wxSig='';}
function wxTick(dt,offline){
  const W=S.wx; if(!W) return; const s0=seasonIdx(W.clock); W.clock+=dt;
  const s1=seasonIdx(W.clock);
  if(s1!==s0){ // a new season always opens with fair weather
    if(W.w!=='clear'){W.w='clear';W.ends=0;W.next=W.clock+40;}
    if(!offline){const s=SEASONS[s1];toast(`${s.e} <b>${s.n} has arrived!</b> ${s.fx}`,5200,'ms-toast');}
    wxSig='';
  }
  if(W.w!=='clear'){if(W.clock>=W.ends){W.w='clear';W.ends=0;W.next=W.clock+50+Math.random()*80;wxSig='';}}
  else if(W.clock>=W.next){
    const tab=WX_TABLE[SEASONS[s1].id];let r=Math.random(),pick=null;for(const [id,p] of tab){if(r<p){pick=id;break;}r-=p;}
    if(pick){W.w=pick;W.ends=W.clock+80+Math.random()*90;if(!offline){const w=WEATHER[pick];toast(`${w.e} <b>${w.n}</b> · ${w.fx}`,3800);}}
    else W.next=W.clock+60+Math.random()*70;
    wxSig='';
  }
}
/* ---------- HUD widget (season · weather · clock) ---------- */
let wxSig='', wxOpen=false;
function updateWx(){
  const el=$('wxChip'); if(!el) return; const s=season(),w=WEATHER[weatherId()],c=wxClock();
  const sig=s.id+'|'+weatherId()+'|'+dayNum(c)+'|'+wxOpen;
  const ph=dayPhase(c), night=isNight(c);
  $('wxClk').textContent=clockStr(c);
  $('wxSun').style.setProperty('--a',(ph*360-180)+'deg'); el.classList.toggle('night',night);
  if(sig===wxSig) return; wxSig=sig;
  $('wxS').textContent=s.e; $('wxT1').textContent=`${s.n} · Day ${dayNum(c)%SEASON_DAYS+1}`;
  $('wxT2').innerHTML=`${w.e} ${w.n}${weatherId()==='clear'?'':' · <span class="'+(w.bad?'bad':'good')+'">'+w.fx+'</span>'}`;
  el.classList.toggle('bad',!!w.bad);
  const pop=$('wxPop'); pop.classList.toggle('hidden',!wxOpen);
  if(wxOpen){const r=el.getBoundingClientRect();pop.style.top=(r.bottom+6)+'px';pop.style.left=Math.max(8,Math.min(r.left,window.innerWidth-pop.offsetWidth-8))+'px';}
  if(wxOpen){const left=(SEASON_DAYS-dayNum(c)%SEASON_DAYS)*DAY_LEN-(c%DAY_LEN);
    pop.innerHTML=`<div class="wx-row"><b>${s.e} ${s.n}</b><span>${s.fx}</span></div>
      <div class="wx-row"><b>${w.e} ${w.n}</b><span>${w.fx}</span></div>
      <div class="wx-seasons">${SEASONS.map((x,k)=>`<div class="${k===seasonIdx(c)?'on':''}"><i>${x.e}</i><small>${x.n}</small></div>`).join('')}</div>
      <div class="wx-foot">${SEASONS[(seasonIdx(c)+1)%4].n} in ${fmtTime(left)} · a day lasts ${fmtTime(DAY_LEN)}, a season ${SEASON_DAYS} days</div>`;}
}
function setupWx(){const el=$('wxChip'); if(el) el.onclick=e=>{e.stopPropagation();wxOpen=!wxOpen;wxSig='';updateWx();};
  document.addEventListener('pointerdown',e=>{if(wxOpen&&!e.target.closest('#wxChip,#wxPop')){wxOpen=false;wxSig='';updateWx();}});}
