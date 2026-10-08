# v2.0 tests: isometric scene, hit-testing, camera, sheets, v1.3 save migration, perf
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
OLD='file:///workspace/lumber-idle/releases/timber-tycoon-v1.3.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
IDS=['sawmill','chipper','kiln','carpentry','pellet','paper','furniture']
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- v1.3 save migration ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.VERSION')=='1.3','old build is v1.3')
    pg.evaluate('(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",50);TT.buyCollector("truck",4);TT.buyBuilding("sawmill",30);TT.buyBuilding("chipper",12);TT.buyBuilding("kiln",3);TT.S.buildings.kiln.on=false;TT.S.golden=2;TT.S.tree=1;TT.checkAch(true);TT.save(true);})()')
    old=pg.evaluate('JSON.parse(JSON.stringify(TT.S))')
    pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=pg.evaluate('TT.S')
    ok(float(S['version'])>=2.0,'v1.3 save migrated to current (>=2.0)')
    ok(S['buildings']['sawmill']['lvl']==30 and S['buildings']['chipper']['lvl']==12 and S['buildings']['kiln']['on']==False,'buildings, levels and on/off kept')
    ok(S['collectors']==old['collectors'] and S['golden']==2 and S['tree']==1 and len(S['ach'])>=len(old['ach']),'collectors, golden count, tree tier, trophies kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.01,'coins kept')
    pg.evaluate('document.querySelectorAll(".toast,.modal-bg,.modal").forEach(t=>t.remove())')
    # --- layout: scene-first ---
    lay=pg.evaluate('''(()=>{const c=document.getElementById('scene').getBoundingClientRect();const t=document.getElementById('topbar').getBoundingClientRect();const bb=document.getElementById('bottombar').getBoundingClientRect();
      return {cw:c.width,ch:c.height,top:t.height,bot:bb.height,old:!!document.querySelector('#bldList,#chain,#tabs,#chopBtn'),bw:TT.scene.canvas.width,dpr:devicePixelRatio}})()''')
    ok(lay['cw']>=1279 and lay['ch']>=799,f'canvas covers full viewport {lay}')
    ok(lay['top']<=64 and lay['bot']<=90,'slim top bar and compact bottom bar')
    ok(not lay['old'],'old 3-column layout removed')
    ok(lay['bw']==round(1280*lay['dpr']),'canvas backing store is DPR-aware')
    ok(pg.locator('#bottombar .bb').count()>=5,'bottom bar buttons')
    # --- hit-testing every building lot (built and unbuilt) ---
    for bid in IDS:
        pg.evaluate('TT.closeSheet()'); pg.wait_for_timeout(60)
        pt=pg.evaluate(f'TT.lotScreen("{bid}")')
        h=pg.evaluate(f'TT.hitTest({pt[0]},{pt[1]})')
        ok(h.get('type')=='bld' and h.get('id')==bid,f'hitTest {bid} -> {h}')
        pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(120)
        ok(pg.evaluate('TT.curSheet')=='bld' and pg.evaluate('TT.sheetBld')==bid,f'click opens {bid} sheet')
    # roof-level click on a built building also hits it
    pg.evaluate('TT.closeSheet()'); pg.wait_for_timeout(60)
    pt=pg.evaluate('(()=>{const L=TT.LOTS.sawmill;const p=TT.P(L.ci,L.cj,44);return TT.w2s(p[0],p[1]);})()')
    ok(pg.evaluate(f'TT.hitTest({pt[0]},{pt[1]}).id')=='sawmill','roof click hits sawmill')
    # the lane between lots is empty space
    pt=pg.evaluate('(()=>{const p=TT.P(16.5,16.5,0);return TT.w2s(p[0],p[1]);})()')
    ok(pg.evaluate(f'TT.hitTest({pt[0]},{pt[1]}).type')=='none','lane is not a building')
    pg.evaluate('TT.openSheet("bld","sawmill")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(100)
    ok(pg.evaluate('TT.curSheet') is None,'tapping empty ground closes the sheet')
    for lot,sheet in [('yard','crew'),('dock','market')]:
        pt=pg.evaluate(f'TT.lotScreen("{lot}")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(120)
        ok(pg.evaluate('TT.curSheet')==sheet,f'{lot} tap opens {sheet}')
        pg.evaluate('TT.closeSheet()')
    pt=pg.evaluate('TT.forestScreen()'); c0=pg.evaluate('TT.S.clicks'); pg.mouse.click(pt[0],pt[1])
    ok(pg.evaluate('TT.S.clicks')==c0+1,'forest tap chops')
    # sheet prev/next cycles buildings
    pg.evaluate('TT.openSheet("bld","sawmill")'); pg.wait_for_timeout(150); pg.click('#bpNext'); pg.wait_for_timeout(100)
    ok(pg.evaluate('TT.sheetBld')=='chipper','next button cycles to chipper')
    # focus: open building is visible above the sheet
    pg.wait_for_timeout(900)
    vis=pg.evaluate('(()=>{const p=TT.lotScreen("chipper");const t=document.getElementById("sheet").getBoundingClientRect().top;return [p[1],t];})()')
    ok(vis[0]<vis[1],f'selected building visible above sheet {vis}')
    pg.evaluate('TT.closeSheet()')
    # unbuilt lot build-by-tap: affordable -> builds
    pg.evaluate('TT.S.coins=1e15; TT.S.totalEarned=1e15'); pg.wait_for_timeout(200)
    pt=pg.evaluate('TT.lotScreen("paper")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(150)
    ok(pg.evaluate('TT.S.buildings.paper.lvl')==1,'tapping an affordable empty lot builds it')
    # --- camera: wheel zoom bounds, drag pan bounds, fit ---
    pg.evaluate('TT.closeSheet()')
    for i in range(30): pg.mouse.wheel(0,-400); pg.wait_for_timeout(5)
    pg.wait_for_timeout(300); z=pg.evaluate('TT.cam'); ok(abs(z['z']-z['maxZ'])<1e-6,f"zoom in clamps at maxZ {z['z']:.2f}")
    for i in range(30): pg.mouse.wheel(0,400); pg.wait_for_timeout(5)
    pg.wait_for_timeout(300); z=pg.evaluate('TT.cam'); ok(abs(z['z']-z['minZ'])<1e-6,f"zoom out clamps at minZ {z['z']:.2f}")
    pg.evaluate('TT.fitCamera(true)'); c0=pg.evaluate('TT.cam'); cl0=pg.evaluate('TT.S.clicks')
    pg.mouse.move(640,400); pg.mouse.down(); 
    for k in range(1,25): pg.mouse.move(640+k*60,400+k*40)
    pg.mouse.up(); pg.wait_for_timeout(200)
    c1=pg.evaluate('TT.cam'); ok(c1['x']<c0['x'] and c1['y']<c0['y'],'drag pans the camera')
    ok(c1['x']>=-760 and c1['y']>=-260,'pan clamped to bounds')
    ok(pg.evaluate('TT.S.clicks')==cl0 and pg.evaluate('TT.curSheet') is None,'drag is not a tap')
    pg.evaluate('TT.fitCamera(true)'); pg.wait_for_timeout(100)
    ins=pg.evaluate('''(()=>{const r=[];for(const id of Object.keys(TT.LOTS).concat(['yard','dock'])){const p=TT.lotScreen(id);r.push(p[0]>0&&p[0]<innerWidth&&p[1]>40&&p[1]<innerHeight-60);}return r;})()''')
    ok(all(ins),f'fit shows every lot {ins}')
    # --- world entities ---
    pg.evaluate('TT.S.coins=1e15;TT.buyCollector("lumberjack",20);TT.buyCollector("truck",3);for(const b of ["sawmill","chipper","kiln","carpentry","pellet","paper","furniture"]) TT.buyBuilding(b,15);'); pg.wait_for_timeout(2500)
    e=pg.evaluate('({w:TT.scene.workers.length,f:(TT.scene.forklifts||[]).length,t:(TT.scene.dockTrucks||TT.scene.trucks||[]).length,p:TT.scene.particles.length,ch:TT.scene.chunks.size,fps:TT.scene.fps,ms:TT.scene.frameMs})')
    print('entities',e)
    ok(e['w']>=7,'yard workers walking for each building')
    ok(e['p']<=400,'particles capped')
    ok(e['ch']<=42,'ground chunk cache bounded')
    ok(e['ms']<16,f"frame time {e['ms']:.1f}ms")
    ok(pg.evaluate('TT.scene.fps')>40,f"fps {pg.evaluate('TT.scene.fps'):.0f}")
    # pauses when hidden
    pg.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_timeout(300)
    t0=pg.evaluate('TT.scene.t'); pg.wait_for_timeout(400); ok(pg.evaluate('TT.scene.t')==t0,'render loop pauses when hidden')
    pg.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))'); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.scene.t')>t0,'render loop resumes')
    # golden log over the scene is clickable
    pg.evaluate('TT.spawnGolden()'); pg.wait_for_timeout(150); g0=pg.evaluate('TT.S.golden')
    pg.mouse.click(pg.evaluate('TT.golden.cur.x'),pg.evaluate('TT.golden.cur.y')); pg.wait_for_timeout(150)
    ok(pg.evaluate('TT.S.golden')==g0+1,'golden log clickable in scene')
    # --- mobile portrait ---
    mctx=b.new_context(viewport={'width':430,'height':900},has_touch=True,is_mobile=True,device_scale_factor=2); mp=mctx.new_page(); watch(mp)
    mp.goto(URL); mp.wait_for_timeout(600)
    ok(mp.evaluate('document.documentElement.scrollWidth')<=431,'no horizontal overflow on mobile')
    ok(mp.evaluate('TT.scene.canvas.width')==860,'mobile canvas at DPR 2')
    pt=mp.evaluate('TT.forestScreen()'); mp.touchscreen.tap(pt[0],pt[1]); mp.wait_for_timeout(100)
    ok(mp.evaluate('TT.S.clicks')==1,'tap forest on mobile')
    pt=mp.evaluate('TT.lotScreen("sawmill")'); mp.touchscreen.tap(pt[0],pt[1]); mp.wait_for_timeout(300)
    ok(mp.evaluate('TT.curSheet')=='bld' and mp.evaluate('TT.sheetBld')=='sawmill','tap building on mobile opens sheet')
    sh=mp.evaluate('(()=>{const r=document.getElementById("sheet").getBoundingClientRect();return [r.left,r.right,r.top]})()')
    ok(sh[0]>=0 and sh[1]<=430 and sh[2]>120,f'sheet fits mobile {sh}')
    ins=mp.evaluate('''(()=>{TT.closeSheet();TT.fitCamera(true);const r=[];for(const id of Object.keys(TT.LOTS).concat(['yard','dock'])){const p=TT.lotScreen(id);r.push(p[0]>0&&p[0]<innerWidth&&p[1]>40&&p[1]<innerHeight-70);}return r;})()''')
    ok(all(ins),f'mobile fit shows every lot {ins}')
    print('ERRORS:',errs); ok(len(errs)==0,'no console errors')
    b.close()
print('FAILS',FAILS)
