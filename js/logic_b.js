'use strict';
/* ===================== SAVE / LOAD ===================== */
function save(silent){
  S.lastSave=Date.now(); S.version=VERSION;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}
  if(!silent) toast('💾 Game saved.');
}
function load(){
  let raw=null; try{raw=localStorage.getItem(SAVE_KEY);}catch(e){}
  if(!raw) return null;
  try{const o=migrateSave(JSON.parse(raw)); S=merge(freshState(),o); return S;}catch(e){console.warn('Bad save, starting fresh');return null;}
}
function hardReset(){
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}
  S=freshState(); M=computeMods(); RES.forEach(r=>{rates[r.id]={p:0,c:0,s:0,d:0};}); coinRate=0;
  rebuildAll(); toast('🌲 Fresh start. Happy chopping!');
}

/* ===================== FORMAT ===================== */
const SUF=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','UDc','DDc','TDc'];
function fmt(n,dec){
  if(n===undefined||n===null||isNaN(n)) return '0';
  if(!isFinite(n)) return '∞';
  const neg=n<0; n=Math.abs(n); let s;
  if(n<1000){ if(dec===undefined) dec=n<10&&n%1!==0?1:0; s=n.toFixed(n<100?dec:0); if(dec&&n<100) s=parseFloat(s).toString(); }
  else{ const e=Math.floor(Math.log10(n)/3); if(e>=SUF.length) s=n.toExponential(2).replace('+','');
    else{const v=n/Math.pow(1000,e); s=v.toFixed(v<10?2:v<100?1:0)+SUF[e];} }
  return (neg?'-':'')+s;
}
function fr(n){
  if(n<0.005) return '0'; if(n<10) return n.toFixed(n<1?2:1); return fmt(n);
}
function fmtTime(s){s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}h ${m}m`:m?`${m}m ${x}s`:`${x}s`;}
function recipeStr(b){
  const i=Object.entries(b.inp).map(([k,v])=>`${v} ${RMAP[k].icon}`).join(' + ');
  const o=Object.entries(b.out).map(([k,v])=>`${v} ${RMAP[k].icon}`).join(' + ');
  return `${i} → ${o} /s per level`;
}

/* ===================== AUDIO ===================== */
let audioCtx=null;
function sfx(type){
  if(S.muted) return;
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const t=audioCtx.currentTime;
    const o=audioCtx.createOscillator(); const g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if(type==='chop'){o.frequency.value=180;o.type='triangle';g.gain.setValueAtTime(0.08,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.12);o.start(t);o.stop(t+0.12);}
    else if(type==='buy'){o.frequency.value=440;o.type='sine';g.gain.setValueAtTime(0.06,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.start(t);o.stop(t+0.15);}
    else if(type==='coin'){o.frequency.value=880;o.type='sine';g.gain.setValueAtTime(0.05,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.2);o.start(t);o.stop(t+0.2);}
    else if(type==='unlock'){o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+0.1);o.frequency.setValueAtTime(784,t+0.2);o.type='sine';g.gain.setValueAtTime(0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.4);o.start(t);o.stop(t+0.4);}
    else if(type==='golden'){o.type='triangle';[784,988,1175,1568].forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*0.07));g.gain.setValueAtTime(0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.45);o.start(t);o.stop(t+0.45);}
    else if(type==='event'){o.frequency.value=330;o.type='square';g.gain.setValueAtTime(0.04,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.start(t);o.stop(t+0.25);}
  }catch(e){}
}

/* ===================== FX ===================== */
function confettiBurst(){
  const L=$('fxLayer'); if(!L) return;
  const colors=['#7cc04f','#f5c84c','#c08a4f','#e0574f','#87b8d8','#f0a83a'];
  for(let i=0;i<36;i++){
    const d=document.createElement('div'); d.className='confetti';
    d.style.left=(40+Math.random()*20)+'%'; d.style.top=(20+Math.random()*30)+'%';
    d.style.background=colors[i%colors.length];
    d.style.animationDelay=(Math.random()*0.3)+'s';
    d.style.transform=`rotate(${Math.random()*360}deg)`;
    L.appendChild(d); setTimeout(()=>d.remove(),2000);
  }
}
/* ===================== UI HELPERS ===================== */
const $=id=>document.getElementById(id);
function toast(html,ms,cls){
  const t=document.createElement('div');t.className='toast'+(cls?' '+cls:'');t.innerHTML=html;$('toasts').appendChild(t);
  setTimeout(()=>{t.style.transition='opacity .4s';t.style.opacity='0';setTimeout(()=>t.remove(),400);},ms||4200);
  const all=$('toasts').children; while(all.length>5) all[0].remove();
}
function modal(title,body,buttons){
  const root=$('modalRoot');
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal" role="dialog"><h3>${title}</h3><div class="mb">${body}</div><div class="mbtns"></div></div>`;
  const box=bg.querySelector('.mbtns');
  (buttons||[{label:'OK'}]).forEach(b=>{const x=document.createElement('button');x.className='btn '+(b.cls||'');x.textContent=b.label;
    x.onclick=()=>{bg.remove();b.fn&&b.fn();};box.appendChild(x);});
  root.appendChild(bg); return bg;
}
function confirmModal(title,body,okLabel,fn){modal(title,body,[{label:'Cancel',cls:'wood'},{label:okLabel,cls:'red',fn}]);}
function floatText(x,y,text,parent){
  const f=document.createElement('div');f.className='float';f.textContent=text;f.style.left=x+'px';f.style.top=y+'px';
  (parent||document.body).appendChild(f); setTimeout(()=>f.remove(),1000);
}
function costBtnHtml(label,cost){return `${label}<small>${cost>0?'🪙 '+fmt(cost):'Free'}</small>`;}
