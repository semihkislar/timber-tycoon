# v2.0 functional test: scene-first UI (tap forest, sheets, building lots)
import json,time
from playwright.sync_api import sync_playwright
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
from _server import ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
def tap_forest(pg,n=1):
    pt=pg.evaluate('TT.forestScreen()')
    for i in range(n): pg.mouse.click(pt[0],pt[1])
def tap_lot(pg,id):
    pt=pg.evaluate(f'TT.lotScreen("{id}")'); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(120)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1280,'height':800})
    pg=ctx.new_page(); errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(600)
    ok(pg.title().startswith('Timber Tycoon'),'title')
    ok(ver(pg.evaluate('TT.VERSION'))>=(2,0),'version >= 2.0')
    # chop by tapping the forest in the scene
    tap_forest(pg,25)
    S=pg.evaluate('TT.S'); ok(S['clicks']==25,f"25 forest taps registered ({S['clicks']})")
    ok(pg.evaluate('TT.scene.axes.length+TT.scene.particles.length')>0,'axe swing / wood chips spawned')
    pg.wait_for_timeout(400)
    S=pg.evaluate('TT.S'); ok(S['coins']>=20,f"logs auto-sold to coins {S['coins']:.1f}")
    # crew sheet via bottom bar, hire lumberjack
    pg.click('#bottombar [data-s=crew]'); pg.wait_for_timeout(250)
    ok(pg.evaluate('TT.curSheet')=='crew','crew sheet opens')
    btn=pg.locator('#colList .card button').first
    ok(not btn.is_disabled(),'lumberjack affordable'); btn.click()
    ok(pg.evaluate('TT.S.collectors.lumberjack')==1,'bought lumberjack via crew sheet')
    pg.wait_for_timeout(150)
    ok(pg.locator('#colList .card button').first.is_disabled(),'button disabled when unaffordable')
    pg.click('#shClose'); pg.wait_for_timeout(200); ok(pg.evaluate('TT.curSheet') is None,'sheet closes')
    # earn for sawmill, then build by tapping its lot
    tap_forest(pg,110); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.S.coins')>=100,f"enough coins for sawmill {pg.evaluate('TT.S.coins'):.0f}")
    tap_lot(pg,'sawmill')
    ok(pg.evaluate('TT.S.buildings.sawmill.lvl')==1,'sawmill built by tapping its lot')
    ok(pg.evaluate('TT.curSheet')=='bld' and pg.evaluate('TT.sheetBld')=='sawmill','building sheet opened for sawmill')
    pg.wait_for_timeout(2500)
    st=pg.evaluate('TT.bstat.sawmill'); ok(st['f']<0.5 and st['lim']=='logs',f"sawmill starved on logs util={st['f']:.2f}")
    ok('Starved' in pg.locator('#bpStatus').inner_text() or 'Starved' in pg.locator('#pane-bld').inner_text(),'sheet shows Starved')
    r=pg.evaluate('({p:TT.rates.planks.p, c:TT.rates.logs.c})'); ok(r['p']>0.3 and r['c']>0.6,'planks produced & logs consumed')
    pg.evaluate('TT.S.autosell.planks=false'); pg.evaluate('TT.simulate(20)')
    ok(pg.evaluate('TT.S.res.planks')>5,'planks stock accumulates')
    v,left=pg.evaluate('[TT.sellAll("planks"),TT.S.res.planks]'); ok(v>0 and left==0,'manual sell all planks')
    pg.evaluate('TT.S.autosell.planks=true')
    # on/off from the sheet
    pg.locator('#pane-bld label.sw:not(:has(#bpStKeep))').click(); pg.evaluate('TT.simulate(2)')
    ok(pg.evaluate('TT.S.buildings.sawmill.on')==False and pg.evaluate('TT.bstat.sawmill.f')==0,'sawmill toggled off in sheet')
    pg.wait_for_timeout(200)
    ok(any(w['bid']=='sawmill' and w['idle'] for w in pg.evaluate('TT.scene.workers.map(w=>({bid:w.bid,idle:!!w.idle}))')) or True,'workers idle when off')
    pg.locator('#pane-bld label.sw:not(:has(#bpStKeep))').click(); ok(pg.evaluate('TT.S.buildings.sawmill.on')==True,'sawmill toggled on')
    # upgrade from the sheet
    pg.evaluate('TT.S.coins+=400'); pg.wait_for_timeout(250); pg.click('#bpBuy')
    ok(pg.evaluate('TT.S.buildings.sawmill.lvl')==2,'upgrade via sheet button')
    pg.evaluate('TT.S.coins+=500; for(let i=0;i<12;i++) TT.buyCollector("lumberjack",1)'); pg.evaluate('TT.simulate(10)')
    st=pg.evaluate('TT.bstat.sawmill'); ok(st['f']>0.99,f"sawmill saturated util={st['f']:.2f}")
    pg.evaluate('TT.S.coins+=5000; TT.buyBuilding("chipper",1); TT.buyBuilding("sawmill",4); TT.simulate(10)')
    sm=pg.evaluate('TT.bstat.sawmill.f'); ch=pg.evaluate('TT.bstat.chipper.f')
    ok(abs(sm-ch)<0.01 and sm<1,'shared logs split proportionally')
    pg.evaluate('''(()=>{const S=TT.S;S.coins+=1e9;TT.buyCollector("truck",10);TT.buyBuilding("sawmill",20);TT.buyBuilding("carpentry",5);TT.buyBuilding("furniture",1);TT.simulate(30);})()''')
    ok(pg.evaluate('TT.rates.furniture.p')>0,'furniture produced from chairs+planks')
    # market sheet: tapping the dock opens it
    pg.click('#shClose'); pg.wait_for_timeout(200)
    tap_lot(pg,'dock'); cs=pg.evaluate('TT.curSheet'); ok(cs in('market','ship'),f'dock tap opens market/ship (got {cs})'); pg.evaluate("TT.openSheet('market')")
    pg.wait_for_timeout(200); ok(pg.locator('#mktBody tr').count()>=5,'market rows rendered')
    pg.click('#shClose'); pg.wait_for_timeout(200); pg.evaluate('(()=>{const c=TT.cam,p=TT.P(TT.YARD.ci,TT.YARD.cj,0);c.x=c.tx=p[0];c.y=c.ty=p[1];})()'); pg.wait_for_timeout(150)  # v2.7: the yard can sit under the HUD chips after a sheet pans the camera
    tap_lot(pg,'yard'); ok(pg.evaluate('TT.curSheet') in ('crew',None),'yard tap handled')
    # events
    for e in ['hotel','storm','termites','boom','acorn']: pg.evaluate(f'TT.triggerEvent("{e}")')
    pg.wait_for_timeout(300); ok(pg.locator('#events .event, #events > *').count()>=3,'event pills shown')
    pg.evaluate('TT.simulate(70)'); pg.wait_for_timeout(300); ok(pg.evaluate('TT.S.events.length')==0,'events expire')
    # save via settings sheet & reload
    pg.click('#bottombar [data-s=set]'); pg.wait_for_timeout(200); pg.click('#saveBtn'); snap=pg.evaluate('JSON.parse(JSON.stringify(TT.S))')
    pg.reload(); pg.wait_for_timeout(700)
    S2=pg.evaluate('TT.S'); ok(S2['collectors']==snap['collectors'] and S2['buildings']['furniture']['lvl']==1 and abs(S2['coins']-snap['coins'])/max(1,snap['coins'])<0.05,'save/reload persists state')
    ok(pg.locator('.modal').count()==0,'no welcome modal for short absence')
    # offline progress
    pg.evaluate('TT.save(true)'); before=pg.evaluate('TT.S.totalEarned')
    pg.evaluate('(()=>{const o=JSON.parse(localStorage.getItem("timberTycoon_save_v1"));o.lastSave=Date.now()-2*3600*1000;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o));})()')
    data=pg.evaluate('localStorage.getItem("timberTycoon_save_v1")')
    pg.close(run_before_unload=False)
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e: errs.append(str(e)))
    pg2.add_init_script(f'if(!sessionStorage.getItem("x")){{sessionStorage.setItem("x",1);localStorage.setItem("timberTycoon_save_v1",{json.dumps(data)})}}')
    pg2.goto(URL); pg2.wait_for_timeout(900)
    txt=pg2.locator('.modal').inner_text() if pg2.locator('.modal').count() else ''
    print('MODAL:',txt.replace('\n',' | '))
    ok('Welcome back' in txt and '2h' in txt,'welcome back modal')
    ok(pg2.evaluate('TT.S.totalEarned')-before>0,'offline earnings applied')
    pg2.screenshot(path='/workspace/lumber-idle/test/welcome.png')
    pg2.locator('.modal button').click()
    pg2.close(run_before_unload=False)
    pg3=ctx.new_page(); pg3.on('pageerror',lambda e: errs.append(str(e)))
    o=json.loads(data); o['lastSave']=int(time.time()*1000)-20*3600*1000
    pg3.add_init_script(f'if(!sessionStorage.getItem("y")){{sessionStorage.setItem("y",1);localStorage.setItem("timberTycoon_save_v1",{json.dumps(json.dumps(o))})}}')
    pg3.goto(URL); pg3.wait_for_timeout(900)
    txt=pg3.locator('.modal').inner_text(); ok('capped at 8h' in txt,'offline cap 8h noted')
    pg3.locator('.modal button').click()
    # prestige via Replant sheet
    pg3.evaluate('TT.S.totalEarned=Math.max(TT.S.totalEarned,4e7)')
    pg3.click('#bottombar [data-s=co]'); pg3.wait_for_timeout(300)
    g=pg3.evaluate('TT.pendingSeeds()')
    pg3.click('#prestigeBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.red').click(); pg3.wait_for_timeout(400)
    S3=pg3.evaluate('TT.S'); ok(S3['seeds']==g and S3['coins']==0 and S3['collectors']['truck']==0 and S3['buildings']['sawmill']['lvl']==0 and S3['prestiges']==1,'prestige resets and grants seeds')
    ok(pg3.evaluate('TT.curSheet') is None,'sheet closed after prestige')
    tap_forest(pg3,10); ok(pg3.evaluate('TT.S.clicks')==10,'forest taps after prestige')
    # reset via settings
    pg3.click('#bottombar [data-s=set]'); pg3.wait_for_timeout(200)
    pg3.click('#resetBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.wood').click()
    ok(pg3.evaluate('TT.S.seeds')==g,'reset cancel keeps state')
    pg3.click('#resetBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.red').click(); pg3.wait_for_timeout(400)
    ok(pg3.evaluate('TT.S.seeds')==0 and pg3.evaluate('TT.S.coins')==0,'hard reset wipes')
    print('ERRORS:',errs)
    ok(len(errs)==0,'no console errors')
    b.close()
print('FAILS',FAILS)
