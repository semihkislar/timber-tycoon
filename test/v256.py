# v2.56: graphics quality. Settings → Graphics has Auto / High / Low. Low skips smoke, puddles,
# tree shadows and the night light map and draws at 30 fps. Auto steps down to Low when the
# frame rate stays under 40 fps. Fence segments and nursery seed beds come from the sprite
# cache. Drawing never changes the game state.
from playwright.sync_api import sync_playwright
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, ROOT, ver
from _pace import ready, paint
from shots import shot_path
FAILS=[]
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js, arg=None):
    return pg.evaluate(js, arg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=256;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;}if(S.mish)S.mish.next=1e15;S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx)S.wx.next=1e15;if(typeof ntClear==="function")ntClear();}'''
# canvas commands the main scene context receives per stepScene
COUNT=r'''()=>{const c=scene.ctx,K=['drawImage','fill','stroke','fillRect','fillText','strokeText'],own={};let n=0;
  for(const k of K){own[k]=Object.prototype.hasOwnProperty.call(c,k)?c[k]:null;const f=c[k];c[k]=function(){n++;return f.apply(this,arguments);};}
  for(let i=0;i<40;i++)stepScene(1/60);n=0;for(let i=0;i<20;i++)stepScene(1/60);
  for(const k of K){if(own[k])c[k]=own[k];else delete c[k];}return Math.round(n/20);}'''
# which scene effects run in one frame
EFFECTS=r'''()=>{const o={shadow:0,lm:0};const ts=treeShadow;treeShadow=function(){o.shadow++;return ts.apply(this,arguments);};
  const cl=collectLights;collectLights=function(){o.lm++;return cl.apply(this,arguments);};scene.lmSig='';
  for(let i=0;i<4;i++)stepScene(1/60);treeShadow=ts;collectLights=cl;return o;}'''
# drawn frames per second of the live loop
FPS=r'''()=>new Promise(res=>{const ss=stepScene;let n=0;stepScene=function(){n++;return ss.apply(this,arguments);};
  const t0=performance.now();setTimeout(()=>{stepScene=ss;res(n*1000/(performance.now()-t0));},2000);})'''
# feed the Auto watch a steady frame rate for `sec` seconds of fake time
FEED=r'''([fps,sec])=>{GFX.watch=true;GFX.t0=1;GFX.last=0;GFX.n=0;GFX.ms=0;GFX.bad=0;scene.lastRAF=0;
  let t=1e6;const d=1000/fps;for(let i=0;i<fps*sec;i++){t+=d;gfxTick(t);}GFX.watch=false;return {low:GFX.low,auto:GFX.autoLow,drops:GFX.drops,key:localStorage.getItem(GFX_KEY)};}'''
LATE=r'''()=>{S.coins=1e15;S.totalEarned=1e15;for(const b of BUILDINGS){if(!S.buildings[b.id])continue;S.buildings[b.id].lvl=Math.max(S.buildings[b.id].lvl||0,5);}
  if(S.premium&&typeof S.premium==='object')S.premium.open=true;TT.rebuildAll&&TT.rebuildAll();TT.render();if(typeof fitCamera==='function')fitCamera(true);}'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport={'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,56), f"VERSION is 2.56 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    ok(ver(re.search(r"timber-tycoon-v([\d.]+)", sw).group(1))>=(2,56), 'service-worker cache is timber-tycoon-v2.56 or newer')
    # ---- setting ----
    ok(E(pg,'gfxMode()')=='auto' and E(pg,'gfxLow()') is False, 'a new game starts on Auto, drawing High')
    ok(E(pg,'GFX.watch') is False, 'the Auto watch is off under WebDriver, so the suites always see High')
    E(pg,'()=>openSheet("set")'); pg.wait_for_timeout(300)
    ok(E(pg,'[...document.querySelectorAll("#gfxSeg button")].map(b=>b.textContent).join("/")')=='Auto/High/Low', 'Settings has a Graphics row: Auto / High / Low')
    ok(E(pg,'document.querySelector("#gfxSeg button.on").dataset.g')=='auto', 'Auto is the marked choice')
    ok(E(pg,'!!$("dcSet")&&$("dcSet").nextElementSibling===$("gfxSet")'), 'the row sits right after Scene labels')
    pg.click('#gfxSeg button[data-g="low"]'); paint(pg, 2)
    ok(E(pg,'S.prefs.gfx')=='low' and E(pg,'gfxLow()') is True, 'tapping Low sets S.prefs.gfx and the scene draws Low')
    ok(E(pg,'document.querySelector("#gfxSeg button.on").dataset.g')=='low', 'Low is the marked choice')
    ok(E(pg,'JSON.parse(localStorage.getItem("timberTycoon_save_v1")).prefs.gfx')=='low', 'the choice is in the save')
    pg.reload(); ready(pg); E(pg, QUIET); paint(pg, 3)
    ok(E(pg,'gfxMode()')=='low' and E(pg,'gfxLow()') is True, 'Low survives a reload')
    E(pg,'()=>openSheet("set")'); pg.wait_for_timeout(300)
    pg.click('#gfxSeg button[data-g="auto"]'); paint(pg, 2)
    ok(E(pg,'S.prefs.gfx')is None and E(pg,'gfxLow()') is False, 'Auto removes the pref and draws High again')
    ok('Now: High' in E(pg,'$("gfxNote").textContent'), 'on Auto the row says which level is in use')
    E(pg,'()=>closeSheet()')
    # ---- what Low draws ----
    E(pg, LATE); E(pg,'()=>{TT.setClock(420*.93);TT.setWeather("rain",1e6);S.wx.next=1e15;scene.wet=1;for(let i=0;i<30;i++)stepScene(1/60);}')
    E(pg,'()=>gfxSet("high")'); hi=E(pg, EFFECTS); nhi=E(pg, COUNT); smoke_hi=E(pg,'scene.smoke.length')
    E(pg,'()=>gfxSet("low")'); lo=E(pg, EFFECTS); nlo=E(pg, COUNT)
    ok(hi['shadow']>0 and lo['shadow']==0, f"tree shadows: {hi['shadow']} on High, {lo['shadow']} on Low")
    ok(hi['lm']>0 and lo['lm']==0, f"night light map rebuilt {hi['lm']}× on High, {lo['lm']}× on Low")
    ok(E(pg,'scene.lm===null&&scene.lmUp===null'), 'Low frees the light-map canvases')
    ok(nlo<nhi*.9, f'Low sends fewer canvas commands per frame at night in rain ({nhi} → {nlo})')
    px=E(pg,'()=>{const c=scene.canvas,d=scene.ctx.getImageData(c.width>>1,c.height>>1,1,1).data;return d[0]+d[1]+d[2];}')
    E(pg,'()=>{TT.setClock(420*.45);TT.setWeather("clear",1e6);for(let i=0;i<10;i++)stepScene(1/60);}')
    px_day=E(pg,'()=>{const c=scene.canvas,d=scene.ctx.getImageData(c.width>>1,c.height>>1,1,1).data;return d[0]+d[1]+d[2];}')
    ok(px<px_day*.8, f'night is still dark on Low (centre pixel {px} at night, {px_day} by day)')
    # ---- cached fence and seed beds ----
    E(pg,'()=>gfxSet("high")'); E(pg,'()=>{for(let i=0;i<60;i++)stepScene(1/60);}')
    keys=E(pg,'()=>{const m={};for(const e of SPR.map.values()){const k=e.base.split("|")[0];m[k]=(m[k]||0)+1;}return m;}')
    segs=E(pg,'()=>{const f=fenceSeg;let n=0;fenceSeg=function(){n++;return f.apply(this,arguments);};stepScene(1/60);fenceSeg=f;return n;}')
    ok(segs>20 and 0<keys.get('fence',0)<=8, f"{segs} fence segments on screen share {keys.get('fence',0)} cached sprites")
    ok(keys.get('seedbed',0)>=1, f"nursery seed beds are cached ({keys.get('seedbed',0)} sprite)")
    raw=E(pg,'()=>{const f=fenceSegRaw,s=drawSapling;let a=0,c=0;fenceSegRaw=function(){a++;return f.apply(this,arguments);};drawSapling=function(){c++;return s.apply(this,arguments);};for(let i=0;i<5;i++)stepScene(1/60);fenceSegRaw=f;drawSapling=s;return [a,c];}')
    ok(raw[0]==0, f'a warm frame draws no fence segment as vectors ({raw[0]})')
    k1=E(pg,'()=>{const k=[...SPR.map.values()].filter(e=>e.base.startsWith("seedbed|")).map(e=>e.base);return k[0];}')
    E(pg,'()=>{TT.setClock(S.wx.clock+SEASON_DAYS*DAY_LEN);for(let i=0;i<5;i++)stepScene(1/60);}')
    k2=E(pg,'()=>[...SPR.map.values()].filter(e=>e.base.startsWith("seedbed|")).map(e=>e.base)')
    ok(any(k!=k1 for k in k2), 'a new season draws a new seed-bed sprite')
    # ---- frame cap ----
    E(pg,'()=>gfxSet("high")'); pg.wait_for_timeout(300); fh=E(pg, FPS)
    E(pg,'()=>gfxSet("low")'); pg.wait_for_timeout(300); fl=E(pg, FPS)
    ok(fl<=34 and fl<fh*.75, f'Low draws at most 30 fps ({fl:.1f} fps; High {fh:.1f} fps)')
    cap=E(pg,'''()=>{const run=(mode,hz)=>{gfxSet(mode);GFX.skip=0;let t=5e6,n=0;scene.lastRAF=t;for(let i=0;i<hz;i++){t+=1000/hz;if(gfxTick(t)){n++;scene.lastRAF=t;}}return n;};
      return {h60:run('high',60),h120:run('high',120),h144:run('high',144),l60:run('low',60),l120:run('low',120)};}''')
    ok(cap['h60']==60 and cap['h120']==60 and cap['h144']==72, f"High: 60 Hz draws every tick, 120 and 144 Hz every other one ({cap})")
    ok(29<=cap['l60']<=31 and 29<=cap['l120']<=31, f"Low: 30 fps on 60 and 120 Hz ({cap['l60']}, {cap['l120']})")
    stuck=E(pg,'()=>{gfxSet("low");GFX.skip=0;scene.lastRAF=9e6;let n=0;for(let i=0;i<40;i++)if(gfxTick(9e6))n++;return n;}')
    ok(stuck>=4, f'a clock that does not advance cannot stall the scene ({stuck} of 40 ticks drawn)')
    # ---- Auto ----
    E(pg,'()=>{gfxSet("auto");ntClear&&ntClear();}')
    r=E(pg, FEED, [60,20]); ok(r['low'] is False and r['drops']==0, '20 s at 60 fps on Auto stays High')
    r=E(pg, FEED, [45,20]); ok(r['low'] is False, '20 s at 45 fps on Auto stays High')
    r=E(pg, FEED, [20,3]);  ok(r['low'] is False, '3 s at 20 fps is not enough to switch')
    E(pg,'()=>gfxSet("high")'); r=E(pg, FEED, [20,20]); ok(r['low'] is False and r['drops']==0, '20 s at 20 fps on High stays High')
    E(pg,'()=>gfxSet("auto")'); r=E(pg, FEED, [20,20])
    ok(r['low'] is True and r['auto'] is True and r['drops']==1, f'20 s at 20 fps on Auto switches to Low once ({r})')
    ok(bool(r['key']), 'the switch is remembered on the device')
    ok(E(pg,'S.prefs.gfx') is None, 'the save still says Auto')
    ok('Graphics set to' in E(pg,'document.body.innerText+JSON.stringify(typeof NT==="object"?NT:0)'), 'the player is told once')
    E(pg,'()=>openSheet("set")'); pg.wait_for_timeout(300)
    ok('Now: Low' in E(pg,'$("gfxNote").textContent'), 'Settings shows "Now: Low" under Auto')
    E(pg,'()=>{closeSheet();save(true);}')
    pg.reload(); ready(pg); E(pg, QUIET); paint(pg, 3)
    ok(E(pg,'gfxMode()')=='auto' and E(pg,'gfxLow()') is True, 'after a reload Auto is still on Low')
    E(pg,'()=>{localStorage.setItem(GFX_KEY,String(Date.now()-GFX_KEEP-1000));GFX.t0=0;}'); paint(pg, 3)
    ok(E(pg,'gfxLow()') is False, 'after three days Auto tries High again')
    E(pg,'()=>{localStorage.setItem(GFX_KEY,String(Date.now()));GFX.t0=0;}'); paint(pg, 3)
    E(pg,'()=>gfxSet("high")'); ok(E(pg,'localStorage.getItem(GFX_KEY)') is None and E(pg,'gfxLow()') is False, 'picking High clears the remembered switch')
    # ---- drawing does not touch the game ----
    same=E(pg,'''()=>{const out={};for(const m of ['high','low']){gfxSet(m);const a=JSON.stringify(S);for(let i=0;i<120;i++)stepScene(1/60);out[m]=JSON.stringify(S)===a;}return out;}''')
    ok(same['high'] and same['low'], f'120 drawn frames leave the game state untouched on High and on Low ({same})')
    # ---- phone ----
    ph=page('iPhone 13'); E(ph, QUIET); E(ph,'()=>openSheet("set")'); ph.wait_for_timeout(400)
    E(ph,'()=>$("gfxSet").scrollIntoView({block:"center"})'); ph.wait_for_timeout(200)
    box=E(ph,'()=>{const r=$("gfxSeg").getBoundingClientRect();return [r.left,r.right,innerWidth];}')
    ok(box[0]>=0 and box[1]<=box[2], f'the three buttons fit a phone ({box[0]:.0f}–{box[1]:.0f} of {box[2]})')
    ph.locator('#gfxSet').screenshot(path=shot_path('mobile-settings-graphics.png'))
    ph.context.close()
    ok(not errs, 'no console errors '+str(errs[:4]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -', f)
sys.exit(1 if FAILS else 0)
