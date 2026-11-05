/* v2.44 — calm scene on phones (maintenance item 8 part 2: late-game scene clutter).
   At the fit zoom on a phone in the late game, info-only scene pills (lot price/lock tags, "Lv N" tags, helper status chips
   such as "Tree Nursery", "Research Lab", "3 daily contracts", "crews out", yard/dock labels) are hidden; they come back as
   soon as the player zooms in (≥ DC_ZOOM × fit). Calls to action that can be acted on right now (an affordable factory lot; helper lots such as the Lab or the Tree Nursery stay in their sheets, fires,
   FULL, setbacks, order offers, floating feedback) always show. Pills opt in with {lo:1}; daily contracts stay on the HUD
   📅 chip. Settings → Scene labels: Auto / Always. Pure drawing: no game state is written. */
const DC_ZOOM=1.35, DC_LATE=12;
function dcPhone(){return scene.w<=720||(scene.h<=520&&scene.w<=1000);}
function dcLate(){let n=0;for(const id in S.buildings) if(S.buildings[id]&&S.buildings[id].lvl>0) n++;return n>=DC_LATE;}
function dcOn(){if(S.prefs&&S.prefs.dcAll) return false;const c=scene.cam;if(!c||!c.fitZ) return false;
  return dcPhone()&&c.z<=c.fitZ*DC_ZOOM&&dcLate();}
function dcCalm(){if(scene._dcT!==scene.t){scene._dcT=scene.t;scene.dc=dcOn();scene.dcHid=0;}return scene.dc;}
/* Settings row: Scene labels Auto / Always (built once, after the Notifications row) */
function dcSetupSettings(){
  const pane=$('pane-set'); if(!pane||$('dcSet')) return;
  const row=document.createElement('div');row.className='setrow';row.id='dcSet';
  row.innerHTML=`<span>Scene labels<small><b>Auto</b> hides price and level tags on phones in the late game until you zoom in. Alerts and things you can buy now always show.</small></span>
    <span class="nt-set"><span class="seg" id="dcSeg"><button data-a="0">Auto</button><button data-a="1">Always</button></span></span>`;
  const anchor=$('ntSet'); if(anchor&&anchor.nextSibling) pane.insertBefore(row,anchor.nextSibling); else pane.appendChild(row);
  row.querySelectorAll('#dcSeg button').forEach(b=>b.onclick=()=>{if(!S.prefs||typeof S.prefs!=='object') S.prefs={};S.prefs.dcAll=b.dataset.a==='1';dcSync();if(typeof save==='function') save(true);});
  dcSync();
}
function dcSync(){const a=!!(S.prefs&&S.prefs.dcAll===true);document.querySelectorAll('#dcSeg button').forEach(b=>b.classList.toggle('on',(b.dataset.a==='1')===a));}
