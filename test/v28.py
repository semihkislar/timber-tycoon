# v2.8 tests: multi-file layout (index.html + css/ + js/ + assets/, no 404s), v2.7 save migration, sprite caches & atlas,
# shade-cache leak fix, pools / caps, 4 Hz HUD, hidden-tab pause with catch-up, autosave throttle, art-pass functions,
# release snapshot, and a LONG-SESSION PERF TEST: ~2 game hours of late-game play fast-forwarded with the balance bot while
# the scene renders; asserts frame cost stays flat and the post-GC heap does not grow.
from playwright.sync_api import sync_playwright
import sys,os,json,time
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
from _server import ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD=BASE+'releases/timber-tycoon-v2.7.html'
LONG=int(os.environ.get('V28_LONG_SEC','300'))   # real seconds of fast-forwarded play (~2 game hours at 300; set lower for quick runs)
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
HOOK='''(()=>{window.__fc=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{const t0=performance.now();cb(t);
  if(cb.name==='sceneLoop'&&window.TT&&TT.scene.ctx){TT.scene.ctx.getImageData(0,0,1,1);window.__fc.push(performance.now()-t0);}});})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; bad=[]
    def watch(pg):
        def on_console(m):
            if m.type not in ('error','warning'): return
            # Test harness forces a 1x1 getImageData each frame for raster timing; Chromium warns about willReadFrequently.
            if 'willReadFrequently' in m.text: return
            errs.append(m.type+': '+m.text)
        pg.on('console',on_console); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
    E=lambda pg,s: pg.evaluate(s)

    # --- layout: slim shell + css/ + js/ + assets/ ---
    html=open(ROOT+'/index.html').read()
    ok(len(html)<20000 and '<style>' not in html and 'css/style.css' in html,f'index.html is a slim shell ({len(html)} bytes, external CSS)')
    ok(html.count('<script src="js/')>=20 and 'function ' not in html,'scripts load from js/ (no inline code)')
    ok(os.path.exists(ROOT+'/assets/atlas-trees.png') and os.path.exists(ROOT+'/assets/atlas-trees.json'),'assets/ holds the tree atlas + frame map')
    fr=json.load(open(ROOT+'/assets/atlas-trees.json'))
    ok(fr['scale']==2 and len(fr['frames'])>=400,f"atlas is 2x with {len(fr['frames'])} frames")

    # --- v2.7 save migration (same origin) ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(E(pg,'TT.VERSION')=='2.7','old build is v2.7')
    E(pg,'(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",30);TT.buyCollector("chainsaw",10);TT.buyPlanter("team",3);TT.buyBuilding("sawmill",20);TT.save();})()')
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(1200)
    S=E(pg,'TT.S')
    ok(ver(S['version'])>=(2,8),'v2.7 save migrated to current (>=2.8)')
    ok(S['collectors']['lumberjack']==old['collectors']['lumberjack'] and S['planters']['team']==old['planters']['team'] and S['buildings']['sawmill']['lvl']==old['buildings']['sawmill']['lvl'],'crew, planters and buildings kept')
    ok(abs(S['forest']['m']-old['forest']['m'])/max(1,old['forest']['m'])<.2,'forest stock kept')
    ok(E(pg,'!!TT.SPR.atlas'),'tree atlas loaded at runtime')
    ok(not bad,f'no 404s while loading ({bad[:3]})')
    ctx.close()

    # --- caches, pools, throttles ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.add_init_script(HOOK)
    pg.goto(URL); pg.wait_for_timeout(500); pg.add_script_tag(path=ROOT+'/test/bot.js')
    E(pg,'runBot(2400,3,300)'); pg.wait_for_timeout(2500)
    s=E(pg,'({hits:TT.SPR.hits,miss:TT.SPR.miss,px:TT.SPR.px,budget:TT.SPR.budget,n:TT.SPR.map.size,atlas:TT.SPR.atlasHits})')
    ok(s['hits']>s['miss']*3,f"sprite cache serves most draws ({s['hits']} hits / {s['miss']} renders)")
    ok(s['px']<=s['budget'],f"sprite cache within pixel budget ({s['px']/1e6:.1f} / {s['budget']/1e6:.0f} MP)")
    ok(s['atlas']>0,'atlas frames used for trees')
    for k in range(6): E(pg,'runBot(24,0,0)'); pg.wait_for_timeout(500)
    ok(E(pg,'TT.shadeCacheSize()')<=4001,f"shade() cache bounded ({E(pg,'TT.shadeCacheSize()')})")
    E(pg,'(()=>{for(let k=0;k<2000;k++){emitP(0,0,"chip");emitSmoke(0,0,"light");}})()')
    ok(E(pg,'TT.scene.particles.length<=341&&TT.scene.smoke.length<=161&&TT.scene.floats.length<=60'),'particles / smoke / floats capped under a burst')
    # HUD updates at ~4 Hz from the loop
    n=E(pg,'new Promise(r=>{const el=document.getElementById("hCoins");let n=0;const mo=new MutationObserver(()=>n++);mo.observe(el,{childList:true,characterData:true,subtree:true});TT.S.coins+=1;setTimeout(()=>{mo.disconnect();r(n);},2000);})')
    ok(n<=10,f'HUD coin text updates at most ~4-5x per second ({n} in 2 s)')
    # hidden tab: no tick work, catch-up on return
    E(pg,'(()=>{window.__h=true;Object.defineProperty(document,"hidden",{configurable:true,get:()=>window.__h});document.dispatchEvent(new Event("visibilitychange"));window.__t0=TT.S.totalEarned;})()')
    pg.wait_for_timeout(1500); earned_hidden=E(pg,'TT.S.totalEarned-window.__t0')
    ok(earned_hidden==0,'hidden tab: simulation paused')
    E(pg,'(()=>{window.__h=false;document.dispatchEvent(new Event("visibilitychange"));})()'); pg.wait_for_timeout(400)
    ok(E(pg,'TT.S.totalEarned-window.__t0')>0,'visible again: elapsed time caught up')
    ok(ver(E(pg,'JSON.parse(localStorage.getItem("timberTycoon_save_v1")).version'))>=(2,8),'saved when the tab was hidden')
    # art pass functions exist and are cached
    ok(E(pg,'["lampPostRaw","cargoIconRaw","drawTreeRaw","humanRaw","logTruckRaw","boxTruckRaw"].every(f=>typeof window[f]==="function")'),'raw draw functions + cached wrappers present')

    # --- LONG SESSION PERF TEST ---
    rows=[]; cdp=pg.context.new_cdp_session(pg); t0=time.time(); g0=E(pg,'TT.S.time')
    while time.time()-t0<LONG:
        for k in range(8): E(pg,'runBot(24,0,0)'); pg.wait_for_timeout(600)
        E(pg,'window.__fc=[]'); pg.wait_for_timeout(3000)
        a=sorted(E(pg,'window.__fc')); n=len(a)
        cdp.send('HeapProfiler.collectGarbage'); heap=cdp.send('Runtime.getHeapUsage')['usedSize']/1e6
        rows.append({'gameH':round((E(pg,'TT.S.time')-g0)/3600,2),'avg':round(sum(a)/max(1,n),2),'p95':round(a[int(n*.95)] if n else 0,2),'heap':round(heap,1)})
        print('   ',rows[-1],flush=True)
    k=max(1,len(rows)//3); first=rows[:k]; last=rows[-k:]
    fa=sum(r['avg'] for r in first)/k; la=sum(r['avg'] for r in last)/k
    hmin=min(r['heap'] for r in rows[:k]); hlast=sum(r['heap'] for r in last)/k
    ok(la<=fa*1.25+1.5,f'frame cost flat over {rows[-1]["gameH"]} game-h (first third {fa:.1f} ms -> last third {la:.1f} ms)')
    ok(hlast<=hmin*1.25+4,f'post-GC heap stable ({hmin:.1f} MB -> {hlast:.1f} MB)')
    ok(max(r['p95'] for r in rows)<40,f'p95 frame cost < 40 ms headless ({max(r["p95"] for r in rows):.1f})')
    ctx.close()

    # --- release snapshot playable ---
    if os.path.isdir(ROOT+'/releases/v2.8'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(BASE+'releases/v2.8/index.html'); pg.wait_for_timeout(900)
        ok(E(pg,'TT.VERSION')=='2.8' and E(pg,'TT.scene.fps')>5,'releases/v2.8/ snapshot runs'); ctx.close()
    ok(not errs,f'no console errors/warnings {errs[:5]}')
    ok(not bad,f'no 404s {bad[:5]}')
    b.close()
print('\nALL PASSED' if not FAILS else f'\n{len(FAILS)} FAILED: {FAILS}')
sys.exit(1 if FAILS else 0)
