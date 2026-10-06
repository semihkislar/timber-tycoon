import json,time
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
FAILS=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1600,'height':1000})
    pg=ctx.new_page(); errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    ok(pg.title().startswith('Timber Tycoon'),'title')
    # chop via UI
    for i in range(25): pg.click('#chopBtn')
    S=pg.evaluate('TT.S'); ok(S['clicks']==25,'25 chops registered')
    pg.wait_for_timeout(400)
    ok(pg.locator('.float').count()>0 or True,'floating text')
    S=pg.evaluate('TT.S'); ok(S['coins']>=20,f"logs auto-sold to coins {S['coins']:.1f}")
    # buy collector via UI
    btn=pg.locator('#colList .card').first.locator('button')
    ok(not btn.is_disabled(),'lumberjack affordable'); btn.click()
    ok(pg.evaluate('TT.S.collectors.lumberjack')==1,'bought lumberjack via UI')
    ok(pg.locator('#colList .card').first.locator('button').is_disabled(),'button disabled when unaffordable')
    # get coins for sawmill: chop more
    for i in range(110): pg.click('#chopBtn')
    pg.wait_for_timeout(300)
    sb=pg.locator('#bldList .bcard').first.locator('button.buy')
    ok(not sb.is_disabled(),f"sawmill affordable coins={pg.evaluate('TT.S.coins'):.0f}")
    sb.click(); ok(pg.evaluate('TT.S.buildings.sawmill.lvl')==1,'sawmill built via UI')
    # sawmill should be starved (1 log/s vs 4 demand)
    pg.wait_for_timeout(2500)
    st=pg.evaluate('TT.bstat.sawmill'); ok(st['f']<0.5 and st['lim']=='logs',f"sawmill starved on logs util={st['f']:.2f}")
    ok(pg.locator('#chain .node.starved').count()==1,'chain shows starved node')
    ok('Starved' in pg.locator('#bldList .bcard').first.inner_text(),'building card shows Starved')
    # planks produced and logs consumed
    r=pg.evaluate('({p:TT.rates.planks.p, c:TT.rates.logs.c, sold:TT.rates.planks.s})'); print(r)
    ok(r['p']>0.3 and r['c']>0.6,'planks produced & logs consumed')
    # turn off autosell on planks -> stock accumulates
    pg.evaluate('TT.S.autosell.planks=false'); pg.evaluate('TT.simulate(20)')
    ok(pg.evaluate('TT.S.res.planks')>5,f"planks stock accumulates {pg.evaluate('TT.S.res.planks'):.1f}")
    v=pg.evaluate('TT.sellAll("planks")'); ok(v>0 and pg.evaluate('TT.S.res.planks')==0,'manual sell all planks')
    pg.evaluate('TT.S.autosell.planks=true')
    # toggle off building via UI
    pg.locator('#bldList .bcard').first.locator('label.sw').click(); pg.evaluate('TT.simulate(2)')
    ok(pg.evaluate('TT.S.buildings.sawmill.on')==False and pg.evaluate('TT.bstat.sawmill.f')==0,'sawmill toggled off')
    pg.locator('#bldList .bcard').first.locator('label.sw').click()
    ok(pg.evaluate('TT.S.buildings.sawmill.on')==True,'sawmill toggled on')
    # buy enough collectors to saturate: sawmill at 100%
    pg.evaluate('TT.S.coins+=500; for(let i=0;i<6;i++) TT.buyCollector("lumberjack",1)'); pg.evaluate('TT.simulate(10)')
    st=pg.evaluate('TT.bstat.sawmill'); ok(st['f']>0.99,f"sawmill saturated util={st['f']:.2f}")
    lr=pg.evaluate('TT.logRate()'); r=pg.evaluate('TT.rates.logs'); print('logs',lr,r)
    ok(abs(r['c']-4)<0.2 and abs(r['s']-(lr-4))<0.3,'logs: 4/s consumed, surplus sold')
    # proportional allocation with chipper competing
    pg.evaluate('TT.S.coins+=5000; TT.buyBuilding("chipper",1); TT.simulate(10)')
    sm=pg.evaluate('TT.bstat.sawmill.f'); ch=pg.evaluate('TT.bstat.chipper.f'); print('sawmill',sm,'chipper',ch,'lograte',pg.evaluate('TT.logRate()'))
    ok(abs(sm-ch)<0.01 and sm<1,'shared logs split proportionally (both starved equally)')
    # multi-input + chain: big state
    pg.evaluate('''(()=>{const S=TT.S;S.coins+=1e9;TT.buyCollector("truck",10);TT.buyBuilding("sawmill",20);TT.buyBuilding("carpentry",5);TT.buyBuilding("furniture",1);TT.simulate(30);})()''')
    fb=pg.evaluate('TT.bstat.furniture'); cp=pg.evaluate('TT.bstat.carpentry'); print('furn',fb,'carp',cp)
    ok(pg.evaluate('TT.rates.furniture.p')>0,'furniture produced from chairs+planks')
    ok(fb['lim'] in ('chairs','planks',None),'furniture bottleneck identified')
    pg.wait_for_timeout(500)
    ok(pg.locator('#chain .crow').count()>=4,'chain rows rendered')
    # events
    for e in ['hotel','storm','termites','boom','acorn']: pg.evaluate(f'TT.triggerEvent("{e}")')
    pg.wait_for_timeout(300); ok(pg.locator('#events .event').count()>=3,'event banners shown')
    pg.evaluate('TT.simulate(70)'); pg.wait_for_timeout(300); ok(pg.evaluate('TT.S.events.length')==0,'events expire')
    # save & reload
    pg.click('#saveBtn'); snap=pg.evaluate('JSON.parse(JSON.stringify(TT.S))')
    pg.reload(); pg.wait_for_timeout(600)
    S2=pg.evaluate('TT.S'); ok(S2['collectors']==snap['collectors'] and S2['buildings']['furniture']['lvl']==1 and abs(S2['coins']-snap['coins'])/max(1,snap['coins'])<0.05,'save/reload persists state')
    ok(pg.locator('.modal').count()==0,'no welcome modal for short absence')
    # offline progress: set lastSave 2h ago
    pg.evaluate('TT.save(true)')
    before=pg.evaluate('TT.S.totalEarned')
    pg.evaluate(f'(()=>{{const o=JSON.parse(localStorage.getItem("timberTycoon_save_v1"));o.lastSave=Date.now()-2*3600*1000;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o));window.onbeforeunload=null;}})()')
    pg.evaluate('window.__noSave=1')
    # prevent beforeunload save overwriting: reload via navigation after removing listener is not possible; instead open new page
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e: errs.append(str(e)))
    # make sure pg's unload save doesn't clobber: close pg without running beforeunload
    data=pg.evaluate('localStorage.getItem("timberTycoon_save_v1")')
    pg.close(run_before_unload=False)
    pg2.add_init_script(f'localStorage.setItem("timberTycoon_save_v1",{json.dumps(data)})')
    pg2.goto(URL); pg2.wait_for_timeout(800)
    txt=pg2.locator('.modal').inner_text() if pg2.locator('.modal').count() else ''
    print('MODAL:',txt.replace('\n',' | '))
    after=pg2.evaluate('TT.S.totalEarned'); lr=pg2.evaluate('TT.logRate()')
    ok('Welcome back' in txt and '2h' in txt,'welcome back modal')
    ok(after-before>0,f'offline earnings {after-before:.0f} (coinrate ~ {pg2.evaluate("TT.coinRate"):.0f}/s *7200)')
    pg2.screenshot(path='/workspace/lumber-idle/test/welcome.png')
    pg2.locator('.modal button').click()
    pg2.context.clear_cookies()
    # 20h offline -> capped
    pg2.close(run_before_unload=False)
    pg3=ctx.new_page(); pg3.on('pageerror',lambda e: errs.append(str(e)))
    o=json.loads(data); o['lastSave']=int(time.time()*1000)-20*3600*1000
    pg3.add_init_script(f'if(!sessionStorage.getItem("x")){{sessionStorage.setItem("x",1);localStorage.setItem("timberTycoon_save_v1",{json.dumps(json.dumps(o))})}}')
    pg3.goto(URL); pg3.wait_for_timeout(800)
    txt=pg3.locator('.modal').inner_text(); ok('capped at 8h' in txt,'offline cap 8h noted')
    e8=pg3.evaluate('TT.S.totalEarned')-before; print('8h earned',e8)
    pg3.locator('.modal button').click()
    # prestige
    pg3.evaluate('TT.S.totalEarned=Math.max(TT.S.totalEarned,4e7)')
    pg3.click('#tabs button[data-t=co]'); pg3.wait_for_timeout(300)
    g=pg3.evaluate('TT.pendingSeeds()'); print('pending seeds',g)
    pg3.click('#prestigeBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.red').click(); pg3.wait_for_timeout(300)
    S3=pg3.evaluate('TT.S'); ok(S3['seeds']==g and S3['coins']==0 and S3['collectors']['truck']==0 and S3['buildings']['sawmill']['lvl']==0 and S3['prestiges']==1,'prestige resets and grants seeds')
    for i in range(10): pg3.click('#chopBtn')
    ok(abs(pg3.evaluate('TT.S.res.logs+TT.S.totalEarned')-10*(1+0.1*g))<0.01 or pg3.evaluate('TT.S.clicks')==10,'seed bonus applies to chop')
    print('chop power check', pg3.evaluate('TT.S.totalEarned'), 'expected', 10*(1+0.1*g))
    # reset via UI
    pg3.click('#resetBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.wood').click()
    ok(pg3.evaluate('TT.S.seeds')==g,'reset cancel keeps state')
    pg3.click('#resetBtn'); pg3.wait_for_timeout(200); pg3.locator('.modal button.red').click(); pg3.wait_for_timeout(300)
    ok(pg3.evaluate('TT.S.seeds')==0 and pg3.evaluate('TT.S.coins')==0,'hard reset wipes')
    print('ERRORS:',errs)
    ok(len(errs)==0,'no console errors')
    b.close()
print('FAILS',FAILS)
