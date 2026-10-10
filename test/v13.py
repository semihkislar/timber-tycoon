# v1.3 tests (updated for v2.0 scene UI): building milestones & yard workers, v1.2 save migration
from playwright.sync_api import sync_playwright
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OLD=BASE+'releases/timber-tycoon-v1.2.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- migration from a v1.2 save ---
    ctx=b.new_context(viewport={'width':1400,'height':1000}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    pg.evaluate('(()=>{TT.S.coins=1e7;TT.buyCollector("lumberjack",40);TT.buyBuilding("sawmill",27);TT.S.golden=3;TT.checkAch(true);TT.save(true);})()')
    old=pg.evaluate('({a:Object.keys(TT.S.ach).length,c:TT.S.coins})')
    pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(800)
    S=pg.evaluate('TT.S')
    ok(S['version']==pg.evaluate('TT.VERSION'),'save migrated to current version')
    ok(S['buildings']['sawmill']['lvl']==27 and S['collectors']['lumberjack']==40 and S['golden']==3,'old progress kept')
    ok(len(S['ach'])>=old['a'],'old trophies kept')
    ok('ms1' in S['ach'],'Milestone! trophy unlocked from old save (sawmill Lv 27)')
    ok(pg.evaluate('TT.msCount(27)')==2,'two milestones at Lv 27')
    # speed multiplier
    r=pg.evaluate('(()=>{const M=TT.M;const base=27*M.bld.sawmill*M.bldAll*M.rep;return TT.bSpeed("sawmill")/base;})()')
    ok(abs(r-4)<1e-6,f'sawmill speed x4 at Lv 27 ({r})')
    ok(pg.evaluate('[TT.msCount(9),TT.msCount(10),TT.msCount(24),TT.msCount(25),TT.msCount(400)]')==[0,1,1,2,6],'milestone thresholds')
    ok(pg.evaluate('TT.nextMs(27)')==50 and pg.evaluate('TT.nextMs(400)') is None,'next milestone lookup')
    # card UI
    pt=pg.evaluate('TT.lotScreen("sawmill")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.curSheet')=='bld' and pg.evaluate('TT.sheetBld')=='sawmill','tapping sawmill opens its sheet')
    ok(pg.locator('#bpStars .on').count()==2,'sawmill sheet shows 2 lit stars')
    ok('Lv 50' in pg.locator('#bpMtx').inner_text() and '×4' in pg.locator('#bpMtx').inner_text(),'sheet shows next milestone and current multiplier')
    # crossing a milestone
    pg.evaluate('document.querySelectorAll(".toast").forEach(t=>t.remove()); TT.S.coins=1e12')
    sp0=pg.evaluate('TT.bSpeed("sawmill")/27')
    pg.evaluate('TT.buyBuilding("sawmill",23)')  # -> 50
    sp1=pg.evaluate('TT.bSpeed("sawmill")/50')
    ok(abs(sp1/sp0-2)<1e-6,'reaching Lv 50 doubles per-level speed')
    ok(pg.locator('.toast.ms-toast').count()==1 and 'Lv 50' in pg.locator('.toast.ms-toast').inner_text(),'milestone toast shown')
    ok(pg.evaluate('TT.scene.msFlash && TT.scene.msFlash.id')=='sawmill','scene star flash on milestone')
    pg.evaluate('document.querySelectorAll(".toast").forEach(t=>t.remove())')
    pg.evaluate('TT.buyBuilding("sawmill",1)'); ok(pg.locator('.toast.ms-toast').count()==0,'no milestone toast for a normal level')
    # yard workers
    pg.evaluate('TT.buyBuilding("chipper",1);TT.buyBuilding("carpentry",12)'); pg.wait_for_timeout(1500)
    w=pg.evaluate('TT.scene.workers.map(w=>({b:w.bid,res:w.res,p:w.p}))')
    cnt={}
    for x in w: cnt[x['b']]=cnt.get(x['b'],0)+1
    ok(cnt.get('sawmill')==pg.evaluate('TT.workersFor("sawmill")')==4,f'sawmill has 1+3 yard workers {cnt}')
    ok(cnt.get('chipper')==1 and cnt.get('carpentry')==2,'chipper 1 worker, carpentry (Lv12) 2 workers')
    ok(all(x['res']=='planks' for x in w if x['b']=='carpentry'),'carpentry workers carry planks')
    ok(all(x['res']=='logs' for x in w if x['b']=='sawmill'),'sawmill workers carry logs')
    p0=pg.evaluate('TT.scene.workers.map(w=>w.p)'); pg.wait_for_timeout(700); p1=pg.evaluate('TT.scene.workers.map(w=>w.p)')
    ok(sum(1 for a,c in zip(p0,p1) if abs(a-c)>1e-4)>=len(p0)//2,'workers are walking')
    pg.evaluate('TT.S.buildings.sawmill.on=false'); pg.wait_for_timeout(500)
    q0=pg.evaluate('TT.scene.workers.filter(w=>w.bid=="sawmill").map(w=>w.p)'); pg.wait_for_timeout(400)
    q1=pg.evaluate('TT.scene.workers.filter(w=>w.bid=="sawmill").map(w=>w.p)')
    ok(q0==q1 and pg.evaluate('TT.scene.workers.filter(w=>w.bid=="sawmill").every(w=>w.idle)'),'workers idle when building is off')
    pg.evaluate('TT.S.buildings.sawmill.on=true')
    # stats + trophies
    pg.click('#bottombar [data-s=co]'); pg.wait_for_timeout(200)
    ok('Milestone stars' in pg.locator('#statsKv').inner_text(),'stats show milestone stars')
    pg.evaluate('TT.buyBuilding("sawmill",60)'); pg.wait_for_timeout(1300)
    ok('lvl100' in pg.evaluate('TT.S.ach'),'Centurion trophy at Lv 100')
    # prestige resets levels, workers follow
    pg.evaluate('TT.S.totalEarned=5e7; TT.doPrestige()'); pg.wait_for_timeout(600)
    ok(pg.evaluate('TT.totStars()')==0 and pg.evaluate('TT.scene.workers.length')==0,'replant clears milestones and yard')
    # offline sim with milestones stays sane
    pg.evaluate('TT.S.coins=1e9;TT.buyCollector("lumberjack",60);TT.buyBuilding("sawmill",30);TT.simulateOffline(3600)')
    ok(pg.evaluate('isFinite(TT.S.coins) && TT.S.coins>0'),'offline sim fine')
    # --- mobile ---
    mctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True); mp=mctx.new_page(); watch(mp)
    mp.goto(URL); mp.wait_for_timeout(300)
    mp.evaluate('TT.S.coins=1e9;TT.buyBuilding("sawmill",30);TT.buyBuilding("chipper",12);TT.render()'); mp.wait_for_timeout(600)
    ok(mp.evaluate('TT.scene.workers.length')==5,'mobile yard workers')
    ok(mp.evaluate('document.documentElement.scrollWidth')<=391,'no horizontal overflow on mobile')
    print('ERRORS:',errs); ok(len(errs)==0,'no console errors')
    b.close()
print('FAILS',FAILS)
