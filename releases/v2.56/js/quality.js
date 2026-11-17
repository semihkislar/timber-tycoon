/* v2.56 — graphics quality: frame-rate relief for slow browsers and devices.
   Low drops the per-frame vector effects that never reach the sprite cache (smoke, puddles, tree shadows, stars, rain
   splashes, most weather particles, trees swaying in the wind), swaps the night light map for one flat tint and draws at 30 fps. High draws
   everything and skips only the extra ticks of 120 Hz+ screens. Auto starts on High, watches the real frame rate and
   steps down to Low once it stays under GFX_MIN_FPS; the step is remembered on this device for GFX_KEEP ms (not in the
   save) and then tried again. Settings → Graphics: Auto / High / Low (`S.prefs.gfx`). Pure drawing: no game state changes. */
const GFX_KEY='timberTycoon_gfx_v1', GFX_MIN_FPS=40, GFX_WIN=4000, GFX_BAD=2, GFX_GRACE=8000, GFX_STALL=1500, GFX_KEEP=3*864e5;
const GFX_GAP_HI=10, GFX_GAP_LO=28, GFX_SKIP_HI=3, GFX_SKIP_LO=8;
const GFX={low:false,autoLow:false,watch:!navigator.webdriver,t0:0,last:0,n:0,ms:0,bad:0,skip:0,drops:0,fps:0};
function gfxMode(){const p=S&&S.prefs&&S.prefs.gfx;return p==='low'||p==='high'?p:'auto';}
function gfxLow(){return GFX.low;}
function gfxLoadAuto(){let t=0;try{t=+localStorage.getItem(GFX_KEY)||0;}catch(e){}GFX.autoLow=t>0&&Date.now()-t<GFX_KEEP;}
function gfxStoreAuto(on){GFX.autoLow=on;try{if(on) localStorage.setItem(GFX_KEY,String(Date.now()));else localStorage.removeItem(GFX_KEY);}catch(e){}}
function gfxResetWatch(){GFX.last=0;GFX.n=0;GFX.ms=0;GFX.bad=0;}
function gfxSet(mode){
  if(typeof prefs==='function') prefs(); else if(!S.prefs||typeof S.prefs!=='object') S.prefs={};
  if(mode==='low'||mode==='high') S.prefs.gfx=mode; else delete S.prefs.gfx;
  if(mode==='high') gfxStoreAuto(false);   // "this device can take it": Auto measures again the next time it is picked
  gfxResetWatch(); gfxRefresh(); gfxSync();
}
function gfxRefresh(){const m=gfxMode(),low=m==='low'||(m==='auto'&&GFX.autoLow);
  if(low!==GFX.low){GFX.low=low;GFX.skip=0;if(typeof scene==='object'){scene.lmSig='';if(low) scene.lm=scene.lmUp=null;}}
  return low;}
function gfxAutoDrop(){
  gfxStoreAuto(true); GFX.drops++; gfxResetWatch(); gfxRefresh(); gfxSync();
  if(typeof toast==='function') toast('⚡ Graphics set to <b>Low</b> for a smoother game. You can change it in ⚙️ Settings.',5200);
}
/* called once per requestAnimationFrame tick; false = the frame cap skips this tick */
function gfxTick(now){
  if(!GFX.t0){GFX.t0=now;gfxLoadAuto();}
  const low=gfxRefresh();
  if(GFX.watch&&!low&&gfxMode()==='auto'){
    const d=GFX.last?now-GFX.last:0; GFX.last=now;
    if(d>GFX_STALL||now-GFX.t0<GFX_GRACE){GFX.n=0;GFX.ms=0;}   // loading, or the tab was away
    else if(d>0||GFX.n){GFX.n++;GFX.ms+=d;
      if(GFX.ms>=GFX_WIN){GFX.fps=GFX.n*1000/GFX.ms;GFX.bad=GFX.fps<GFX_MIN_FPS?GFX.bad+1:0;GFX.n=0;GFX.ms=0;if(GFX.bad>=GFX_BAD){gfxAutoDrop();return true;}}}
  } else GFX.last=0;
  // frame cap; never more than a few ticks in a row, so a coarse or odd clock cannot stall the scene
  if(scene.lastRAF&&now-scene.lastRAF<(low?GFX_GAP_LO:GFX_GAP_HI)&&GFX.skip<(low?GFX_SKIP_LO:GFX_SKIP_HI)){GFX.skip++;return false;}
  GFX.skip=0; return true;
}
/* Settings row: Graphics Auto / High / Low (built once, after the Scene labels row) */
function gfxSetupSettings(){
  const pane=$('pane-set'); if(!pane||$('gfxSet')) return;
  const row=document.createElement('div');row.className='setrow';row.id='gfxSet';
  row.innerHTML=`<span>Graphics<small><b>Low</b> turns off smoke, puddles, tree shadows and night lights, thins the weather and draws at 30 fps. <b>Auto</b> switches to Low when the game runs slowly on this device.<span id="gfxNote"></span></small></span>
    <span class="nt-set"><span class="seg" id="gfxSeg"><button data-g="auto">Auto</button><button data-g="high">High</button><button data-g="low">Low</button></span></span>`;
  const anchor=$('dcSet')||$('ntSet'); if(anchor&&anchor.nextSibling) pane.insertBefore(row,anchor.nextSibling); else pane.appendChild(row);
  row.querySelectorAll('#gfxSeg button').forEach(b=>b.onclick=()=>{gfxSet(b.dataset.g);if(typeof save==='function') save(true);});
  gfxSync();
}
function gfxSync(){const m=gfxMode();document.querySelectorAll('#gfxSeg button').forEach(b=>b.classList.toggle('on',b.dataset.g===m));
  const n=$('gfxNote'); if(n) n.textContent=m==='auto'?(GFX.low?' Now: Low.':' Now: High.'):'';}
