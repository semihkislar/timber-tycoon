# v1.2 tests (updated for v2.0 scene UI): trophies, golden logs, v1.1 save migration
import json
from playwright.sync_api import sync_playwright
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OLD=BASE+'releases/timber-tycoon-v1.1.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- migration from a v1.1 save ---
    ctx=b.new_context(viewport={'width':1400,'height':1000}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    pg.evaluate('(()=>{TT.S.coins=1e6;TT.buyCollector("lumberjack",30);for(let i=0;i<120;i++)TT.chop();TT.S.lifetimeEarned=2e6;TT.S.tree=1;TT.save(true);})()')
    data=pg.evaluate('localStorage.getItem("timberTycoon_save_v1")')
    ok('"ach"' not in data,'v1.1 save has no trophy data')
    pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(800)
    S=pg.evaluate('TT.S')
    ok(S['version']==pg.evaluate('TT.VERSION'),'save migrated to current version')
    ok(S['collectors']['lumberjack']==30 and S['tree']==1,'old progress kept')
    got=sorted(k for k in S['ach'])
    print('unlocked from old save:',got)
    for k in ['chop1','chop100','earn1k','earn1m','jack25','oak']: ok(k in got,f'trophy {k} unlocked on load')
    ok(pg.locator('.toast.ach-toast').count()==1,'single summary toast for bulk unlock')
    ok(not pg.locator('#achDot').get_attribute('class').count('hidden'),'trophy button dot shown')
    n=pg.evaluate('TT.achCount()'); m=pg.evaluate('TT.M.ach')
    ok(abs(m-(1+0.02*n))<1e-9,f'trophy bonus x{m:.2f} for {n} trophies')
    # tab UI
    pg.click('#bottombar [data-s=ach]'); pg.wait_for_timeout(300)
    ok(pg.locator('#achGrid .ach').count()==pg.evaluate('TT.ACH.length'),'all trophies rendered')
    ok(pg.locator('#achGrid .ach.got').count()==n,'unlocked trophies highlighted')
    ok(pg.locator('#achGrid .ach.fresh').count()==n,'NEW badges on fresh trophies')
    ok(f'{n} / ' in pg.locator('#achCount').inner_text(),'trophy count header')
    pg.click('#shClose'); pg.wait_for_timeout(200)
    ok('hidden' in pg.locator('#achDot').get_attribute('class'),'dot cleared after viewing')
    # live unlock via loop
    pg.evaluate('TT.S.coins+=1e5; TT.buyBuilding("sawmill",10)'); pg.wait_for_timeout(1500)
    ok('saw10' in pg.evaluate('TT.S.ach'),'live unlock Sawdust Everywhere')
    ok(pg.locator('.toast.ach-toast').count()>=1,'trophy toast shown')
    # --- golden log: real click on canvas ---
    g=pg.evaluate('(()=>{const g=TT.spawnGolden();return {x:g.x,y:g.y};})()')
    pg.wait_for_timeout(200)
    ok('Golden' in pg.locator('#sceneLabel').text_content(),'scene label announces golden log')
    box=pg.locator('#scene').bounding_box()
    before=pg.evaluate('({c:TT.S.totalEarned,g:TT.S.golden,ev:TT.S.events.length})')
    gy=pg.evaluate('TT.golden.cur.y'); gx=pg.evaluate('TT.golden.cur.x')
    pg.mouse.click(box['x']+gx, box['y']+gy); pg.wait_for_timeout(300)
    after=pg.evaluate('({c:TT.S.totalEarned,g:TT.S.golden,ev:TT.S.events.length})')
    ok(after['g']==before['g']+1,'golden log caught by clicking the scene')
    ok(after['c']>before['c'] or after['ev']>before['ev'],'golden log gave a reward')
    ok(pg.evaluate('TT.golden.cur')is None,'golden log removed after catch')
    ok('gold1' in pg.evaluate('TT.S.ach'),'Golden Find trophy')
    # miss click does nothing
    pg.evaluate('TT.spawnGolden()'); gx=pg.evaluate('TT.golden.cur.x')
    pg.mouse.click(box['x']+ (gx+300 if gx<600 else gx-300), box['y']+5); pg.wait_for_timeout(100)
    ok(pg.evaluate('TT.golden.cur')is not None,'missed click keeps golden log')
    # frenzy reward
    r=pg.evaluate('(()=>{TT.S.events=[];TT.S.nextEvent=TT.S.time+999;TT.logRate();const a=TT.M.colAll,c=TT.M.chop;TT.catchGolden("frenzy");TT.logRate();return [a,c,TT.M.colAll,TT.M.chop];})()')
    ok(abs(r[2]/r[0]-5)<0.01 and abs(r[3]/r[1]-5)<0.01,f'Timber Frenzy multiplies collectors & chop x5 {r}')
    ok(pg.locator('#events .event[data-id=frenzy]').count()==1,'frenzy banner shown')
    p0=pg.evaluate('TT.price("planks")'); pg.evaluate('TT.spawnGolden(); TT.catchGolden("goldrush")')
    ok(abs(pg.evaluate('TT.price("planks")')/p0-3)<0.01,'Gold Rush prices x3')
    pg.evaluate('TT.simulate(25)'); ok(pg.evaluate('TT.S.events.filter(e=>e.id=="frenzy"||e.id=="goldrush").length')==0,'golden buffs expire')
    # golden log expires on its own
    pg.evaluate('TT.spawnGolden(); TT.golden.cur.life=0.05'); pg.wait_for_timeout(400)
    ok(pg.evaluate('TT.golden.cur') is None and 'Golden' not in pg.locator('#sceneLabel').text_content(),'uncaught golden log fades away')
    # golden events never rolled randomly
    pool=pg.evaluate('(()=>{let s=new Set();for(let i=0;i<200;i++){TT.S.events=[];TT.triggerEvent();TT.S.events.forEach(e=>s.add(e.id));}TT.S.events=[];return [...s];})()')
    ok('frenzy' not in pool and 'goldrush' not in pool,f'random events exclude golden buffs {pool}')
    # --- prestige keeps trophies ---
    k=pg.evaluate('TT.achCount()'); gl=pg.evaluate('TT.S.golden')
    pg.evaluate('TT.S.totalEarned=5e7; TT.doPrestige()'); pg.wait_for_timeout(1300)
    ok(pg.evaluate('TT.achCount()')>=k and pg.evaluate('TT.S.golden')==gl,'trophies & golden count survive replant')
    ok('replant' in pg.evaluate('TT.S.ach'),'Replanter trophy')
    # save/reload keeps trophies
    pg.evaluate('TT.save(true)'); k=pg.evaluate('TT.achCount()')
    pg.reload(); pg.wait_for_timeout(600)
    ok(pg.evaluate('TT.achCount()')==k,'trophies persist through reload')
    pg.click('#bottombar [data-s=co]'); pg.wait_for_timeout(200)
    ok('Trophies' in pg.locator('#statsKv').inner_text() and 'Golden logs' in pg.locator('#statsKv').inner_text(),'stats show trophies & golden logs')
    # hard reset wipes trophies
    pg.evaluate('TT.hardReset()'); ok(pg.evaluate('TT.achCount()')==0,'hard reset wipes trophies')
    # --- mobile: tabs & golden tap ---
    mctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True); mp=mctx.new_page(); watch(mp)
    mp.goto(URL); mp.wait_for_timeout(400)
    mp.evaluate('TT.spawnGolden()'); box=mp.locator('#scene').bounding_box()
    gx=mp.evaluate('TT.golden.cur.x'); gy=mp.evaluate('TT.golden.cur.y')
    mp.touchscreen.tap(box['x']+gx, box['y']+gy); mp.wait_for_timeout(300)
    ok(mp.evaluate('TT.S.golden')==1,'golden log tappable on mobile')
    ok(mp.evaluate('document.documentElement.scrollWidth')<=391,'no horizontal overflow on mobile')
    # v2.27: the dock moved to the helper strip, off the portrait fit view, so centre it first
    mp.evaluate('TT.closeSheet()'); mp.evaluate('(()=>{const c=scene.cam,p=P(DOCK.ci,DOCK.cj,20);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];TT.render();})()'); mp.wait_for_timeout(200); pt=mp.evaluate('TT.lotScreen("dock")'); mp.touchscreen.tap(pt[0],pt[1]); mp.wait_for_timeout(300)
    ok(mp.evaluate('TT.curSheet') in ('market','ship'),'dock tappable on mobile (touch) -> shipping yard (v2.13)')
    print('ERRORS:',errs); ok(len(errs)==0,'no console errors')
    b.close()
print('FAILS',FAILS)
