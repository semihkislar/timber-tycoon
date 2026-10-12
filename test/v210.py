# v2.10 tests: biomass power plant (v2.9 save migration, unlock + visibility, build/upgrade costs, fuel burn as a share of the
# Pellet Press + Kiln capacity, +5%/level boost to every building, fuel modes, no-fuel / off states, max level, Replant keeps it,
# offline catch-up, save round trip, trophies, scene sprite + clearing + hit area, sheet UI on desktop and phone, quick-jump chip,
# needs-attention entry, More tile, no console errors / 404s)
from playwright.sync_api import sync_playwright
import sys,os,json; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
from _server import ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
QUIET='TT.S.orders.next=1e9;TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.S.fireCool=1e9;TT.S.nextEvent=1e12;'
# a factory with a running Pellet Press and Kiln (plenty of logs/chips), auto-sell on
SETUP='''(()=>{const S=TT.S;S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  TT.buyPlanter("team",6);TT.buyBuilding("sawmill",10);TT.buyBuilding("chipper",30);TT.buyBuilding("kiln",8);TT.buyBuilding("pellet",6);S.coins=1e13;})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; bad=[]
    def watch(pg,tag=''):
        pg.on('console',lambda m: errs.append(tag+m.type+': '+m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(tag+str(e)))
        pg.on('response',lambda r: bad.append(r.url) if r.status>=400 else None)
    E=lambda pg,s: pg.evaluate(s)
    def fresh(**kw):
        ctx=b.new_context(**(kw or {'viewport':{'width':1280,'height':800}})); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(500); E(pg,QUIET); return ctx,pg

    # --- v2.9 save migration (same origin) ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'mig ')
    pg.goto(BASE+'releases/v2.9/index.html'); pg.wait_for_timeout(800)
    ok(E(pg,'TT.VERSION')=='2.9','old build is v2.9')
    E(pg,'(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",30);TT.buyBuilding("sawmill",25);TT.buyBuilding("chipper",8);TT.buyBuilding("kiln",3);TT.prefs().haptics=false;TT.save();})()')
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg,'mig '); pg.goto(URL); pg.wait_for_timeout(1200)
    S=E(pg,'TT.S')
    ok(E(pg,'TT.VERSION')=='2.10' and ver(S['version'])==(2,10) and ver('2.10')>ver('2.9'),f"v2.9 save migrated to 2.10 ({S['version']})")
    ok('power' not in old and S['power']['lvl']==0 and S['power']['fuel']=='mix' and S['power']['on'] is True,f"power plant added with defaults ({S['power']})")
    ok(S['buildings']['sawmill']['lvl']==25 and S['buildings']['kiln']['lvl']==3 and S['collectors']['lumberjack']==old['collectors']['lumberjack'] and S['prefs']['haptics'] is False,'buildings, crew and prefs kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.05,'coins kept')
    ok(E(pg,'TT.pwVisible()') and not E(pg,'TT.pwUnlocked()'),'kiln owner sees the plot, Pellet Press still needed')
    ctx.close()

    # --- fresh game: hidden, then visible (kiln), then unlocked (pellet press) ---
    ctx,pg=fresh()
    ok(not E(pg,'TT.pwVisible()') and E(pg,'document.getElementById("bbPower").classList.contains("hidden")'),'new game: no power plant button yet')
    ok(E(pg,'TT.JUMPS.some(j=>j.id==="power"&&j.lock())'),'quick-jump chip is locked at the start')
    tr=E(pg,"TT.scene.trees.filter(t=>t.i>=21.2&&t.i<27.4&&t.j>=-7.0&&t.j<-1.2).map(t=>[t.i,t.j])"); ok(not tr,f"no trees on the power-plant pad ({tr[:4]})")
    ok(E(pg,'TT.buyPower()')==False,'cannot build before the Pellet Press')
    ok(abs(E(pg,'TT.pwCost()')-2.5e5)<1 and abs(E(pg,'TT.pwCost(1)')-1.25e6)<1 and abs(E(pg,'TT.pwCost(9)')-2.5e5*5**9)<1e3,'costs: 250K, x5 per level')
    E(pg,SETUP); E(pg,'TT.render()'); pg.wait_for_timeout(300)
    ok(E(pg,'TT.pwVisible()&&TT.pwUnlocked()') and not E(pg,'document.getElementById("bbPower").classList.contains("hidden")'),'Pellet Press unlocks it; Power button shows')
    ok(E(pg,'TT.JUMPS.some(j=>j.id==="power"&&!j.lock())'),'quick-jump chip unlocked')
    E(pg,'TT.simulate(20)')
    d=E(pg,'(()=>{const c0=TT.S.coins,r=TT.buyPower();return [r,TT.pwLvl(),c0-TT.S.coins]})()')
    ok(d[0] and d[1]==1 and abs(d[2]-2.5e5)<1,f'build Lv 1 for 250K ({d})')
    E(pg,'TT.simulate(30)')
    d=E(pg,'(()=>{const c=TT.pwCapacity(),n=TT.pwNeed();return {eff:TT.pwEff(),boost:TT.pwBoost(),c,n,burn:TT.S.power.burn,share:TT.pwShare(),sp:TT.bSpeed("sawmill"),st:TT.pwStatus().k,ba:TT.M.bldAll,rp:TT.rates.pellets,rc:TT.rates.charcoal}})()')
    ok(d['eff']>.97 and d['st']=='ok',f"full fuel -> {d['eff']*100:.1f}% power ({d['st']})")
    ok(abs(d['share']-.165)<1e-9 and abs(d['n']['total']-d['share']*(d['c']['pellets']+d['c']['charcoal']))<1e-6*max(1,d['n']['total']),f"burns 16.5% of Pellet Press + Kiln capacity ({d['n']['total']:.1f}/s)")
    ok(abs(d['burn']['pellets']-d['n']['pellets'])/max(1e-9,d['n']['pellets'])<.03 and abs(d['burn']['charcoal']-d['n']['charcoal'])/max(1e-9,d['n']['charcoal'])<.03,f"burn rates match need (pellets {d['burn']['pellets']:.2f}/{d['n']['pellets']:.2f}, charcoal {d['burn']['charcoal']:.2f}/{d['n']['charcoal']:.2f})")
    ok(d['rp']['c']>=d['burn']['pellets']*.95 and d['rc']['c']>=d['burn']['charcoal']*.95,'Market "used/s" includes the plant')
    sp=E(pg,'(()=>{TT.price("logs");const on=TT.bSpeed("sawmill"),pr=TT.bSpeed("showroom")||0;TT.setPowerOn(false);TT.price("logs");const off=TT.bSpeed("sawmill");TT.setPowerOn(true);TT.price("logs");return [on,off,TT.pwBoost()]})()')
    ok(abs(sp[0]/sp[1]-(1+sp[2]))<1e-6 and abs(sp[2]-.05*d['eff'])<1e-6,f"every building +5%/level (sawmill x{sp[0]/sp[1]:.4f})")
    ok(E(pg,'TT.bSpeed("pellet")')>0 and E(pg,'TT.S.res.pellets')>=0,'stocks never go negative')
    # fuel modes
    E(pg,'TT.setPowerFuel("pellets");TT.simulate(20)'); d=E(pg,'({b:TT.S.power.burn,e:TT.pwEff()})')
    ok(d['b']['charcoal']<1e-3*max(1,d['b']['pellets']) and d['b']['pellets']>0 and d['e']>.95,f"Pellets mode burns pellets only ({d})")
    E(pg,'TT.setPowerFuel("charcoal");TT.simulate(20)'); d=E(pg,'({b:TT.S.power.burn,e:TT.pwEff()})')
    ok(d['b']['pellets']<1e-3*max(1,d['b']['charcoal']) and d['b']['charcoal']>0 and d['e']>.95,f"Charcoal mode burns charcoal only ({d})")
    ok(E(pg,'TT.setPowerFuel("coal")')==False and E(pg,'TT.S.power.fuel')=='charcoal','unknown fuel rejected')
    # no fuel: kiln off in charcoal mode
    E(pg,'TT.S.buildings.kiln.on=false;TT.simulate(25)'); d=E(pg,'({e:TT.pwEff(),b:TT.pwBoost(),st:TT.pwStatus().k,att:TT.attentionList().some(a=>a.id==="power"&&a.k==="power")})')
    ok(d['e']<.02 and d['b']<.001 and d['st']=='nofuel' and d['att'],f"fuel building off -> no power, attention entry ({d})")
    E(pg,'TT.setPowerFuel("mix");TT.simulate(25)'); ok(E(pg,'TT.pwEff()')>.95,'Mix mode falls back on pellets when the kiln is off')
    E(pg,'TT.S.buildings.kiln.on=true;TT.setPowerOn(false);TT.simulate(5)'); ok(E(pg,'TT.pwBoost()')==0 and E(pg,'TT.pwStatus().k')=='off' and E(pg,'TT.S.power.burn.pellets')==0,'switched off: no burn, no boost')
    E(pg,'TT.setPowerOn(true);TT.simulate(20)')
    # starved fuel: the plant only takes what is in stock
    E(pg,'(()=>{TT.S.buildings.chipper.on=false;TT.S.res.chips=0;TT.S.res.logs=0;TT.S.buildings.kiln.on=false;TT.S.res.pellets=0;TT.S.res.charcoal=0;TT.simulate(30);})()')
    d=E(pg,'({e:TT.pwEff(),p:TT.S.res.pellets,c:TT.S.res.charcoal,st:TT.pwStatus().k})')
    ok(d['e']<.6 and d['p']>=0 and d['c']>=0 and d['st'] in ('low','nofuel'),f"starved Pellet Press -> low power ({d})")
    E(pg,'TT.S.buildings.chipper.on=true;TT.S.buildings.kiln.on=true;TT.simulate(30)'); ok(E(pg,'TT.pwEff()')>.9,'recovers when the fuel chain runs again')
    # max level
    E(pg,'(()=>{TT.S.coins=1e30;for(let k=0;k<20;k++) TT.buyPower();TT.simulate(20);TT.checkAch(true);})()')
    d=E(pg,'({l:TT.pwLvl(),b:TT.pwBoost(),e:TT.pwEff(),sh:TT.pwShare(),a1:!!TT.S.ach.power1,a10:!!TT.S.ach.power10})')
    ok(d['l']==10 and abs(d['b']-.5*d['e'])<1e-9 and abs(d['sh']-.3)<1e-9,f"max Lv 10: +50% at full fuel, burns 30% ({d})")
    ok(d['a1'] and d['a10'],'trophies Lights On + Grid Tycoon')
    # offline catch-up
    r=E(pg,'TT.simulateOffline(600)'); ok(E(pg,'TT.pwEff()')>.9 and r['coins']>0,'offline catch-up keeps the plant running')
    # save / load round trip
    E(pg,'TT.setPowerFuel("pellets");TT.save(true)'); pg.reload(); pg.wait_for_timeout(1200); E(pg,QUIET)
    ok(E(pg,'TT.pwLvl()')==10 and E(pg,'TT.S.power.fuel')=='pellets','level and fuel mode saved')
    # Replant keeps the plant (and costs/levels of everything else reset as usual)
    E(pg,'TT.S.totalEarned=1e15;TT.doPrestige()')
    d=E(pg,'({l:TT.pwLvl(),f:TT.S.power.fuel,e:TT.S.power.eff,pel:TT.S.buildings.pellet.lvl,saw:TT.S.buildings.sawmill.lvl,b:TT.pwBoost()})')
    ok(d['l']==10 and d['f']=='pellets' and d['pel']==0 and d['saw']==0 and d['b']==0,f"Replant keeps the plant, resets buildings; no boost until fuel runs ({d})")
    d=E(pg,'(()=>{TT.S.coins=100;const r=TT.buyBuilding("sawmill",1);return [r,TT.S.buildings.sawmill.lvl,TT.S.coins]})()')
    ok(d[0] and d[1]==1 and d[2]<1,f'costs reset as before (sawmill Lv 1 costs 100 again after Replant) ({d})')
    ctx.close()

    # --- scene + desktop sheet ---
    ctx,pg=fresh(); E(pg,SETUP); E(pg,'TT.buyPower();TT.buyPower();TT.buyPower();TT.simulate(15);TT.fitCamera(true)'); pg.wait_for_timeout(1500)
    ok(E(pg,'!!TT.PWZ.hit&&!!TT.PWZ.top'),'plant drawn (hit area + label anchor)')
    pt=E(pg,'TT.powerScreen()'); ok(0<pt[0]<1280 and 0<pt[1]<800,f'plant on screen in the fit view ({pt})')
    ok(E(pg,f'TT.hitTest({pt[0]},{pt[1]}).type')=='power','hit test finds the plant')
    pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(700)
    ok(E(pg,'TT.curSheet')=='power','click on the plant opens its sheet')
    txt=E(pg,'document.getElementById("powerBody").innerText')
    ok('Power Plant · Lv 3' in txt and 'Fuel' in txt and 'Lv 4' in txt,'sheet shows level, fuel and the next upgrade')
    ok(E(pg,'document.getElementById("pwPct").textContent').endswith('%') and E(pg,'document.getElementById("pwBoost").textContent').startswith('+'),'power meter and boost shown')
    c0=E(pg,'TT.S.coins'); pg.click('#pwBuy'); pg.wait_for_timeout(300); ok(E(pg,'TT.pwLvl()')==4 and E(pg,'TT.S.coins')<c0,'upgrade button works')
    pg.click('#pwFuel button[data-f="charcoal"]'); pg.wait_for_timeout(200); ok(E(pg,'TT.S.power.fuel')=='charcoal' and E(pg,'document.querySelector("#pwFuel button.on").dataset.f')=='charcoal','fuel buttons work')
    pg.click('#pwOn+.tr'); pg.wait_for_timeout(200); ok(E(pg,'TT.S.power.on')==False,'on/off switch works')
    pg.click('#pwOn+.tr'); pg.wait_for_timeout(200)
    ok(E(pg,'TT.SPR&&TT.scene.objCount>0'),'scene renders')
    fms=[]; 
    for k in range(6): pg.wait_for_timeout(250); fms.append(E(pg,'TT.scene.frameMs'))
    ok(max(fms)<60,f'frame cost with the plant on screen stays low ({max(fms):.1f} ms)')
    E(pg,'TT.closeSheet()'); ok(E(pg,'TT.jumpTo("power")'),'quick-jump to the plant'); pg.wait_for_timeout(1200)
    s=E(pg,'TT.powerScreen()'); ok(200<s[0]<1280-200 and 120<s[1]<720,f'camera framed the plant ({s})')
    ctx.close()

    # --- phone ---
    ctx,pg=fresh(**p.devices['iPhone 13']); E(pg,SETUP); E(pg,'TT.simulate(10);TT.render()'); pg.wait_for_timeout(400)
    E(pg,"TT.openSheet('more')"); pg.wait_for_timeout(400)
    ok(E(pg,'!!document.querySelector("#moreGrid .mtile[data-s=power]")'),'More sheet has a Power tile')
    pg.click('#moreGrid .mtile[data-s=power]'); pg.wait_for_timeout(500); ok(E(pg,'TT.curSheet')=='power','tile opens the power sheet')
    bb=E(pg,'(()=>{const r=document.getElementById("pwBuy").getBoundingClientRect();return [r.width,r.height]})()'); ok(bb[1]>=44,f'build button is a big touch target ({bb})')
    pg.tap('#pwBuy'); pg.wait_for_timeout(300); ok(E(pg,'TT.pwLvl()')==1,'tap builds the plant on a phone')
    E(pg,'TT.closeSheet();TT.S.coins=1e13;TT.render()')
    a=E(pg,'TT.attentionList().filter(x=>x.id==="power").map(x=>x.k)'); ok('upg' in a,f'needs-attention lists an affordable plant upgrade ({a})')
    E(pg,'(()=>{const L=TT.attentionList();const i=L.findIndex(x=>x.id==="power");for(let k=0;k<=i;k++) TT.nextAttention();})()'); pg.wait_for_timeout(1200)
    ok(E(pg,'TT.curSheet')=='power','needs-attention opens the power sheet')
    s=E(pg,'TT.powerScreen()'); top=E(pg,'document.getElementById("sheet").getBoundingClientRect().top')
    ok(s[1]<top+40 and s[1]>40,f'camera keeps the plant above the half sheet ({s}, sheet top {top:.0f})')
    ctx.close()

    if os.path.isdir(ROOT+'/releases/v2.10'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'rel '); pg.goto(BASE+'releases/v2.10/index.html'); pg.wait_for_timeout(900)
        ok(E(pg,'TT.VERSION')=='2.10' and E(pg,'TT.scene.fps')>5,'releases/v2.10/ snapshot runs'); ctx.close()
    vh=open(ROOT+'/versions.html').read()
    if os.path.isdir(ROOT+'/releases/v2.10'): ok(vh.index('v2.10')<vh.index('v2.9'),'versions page lists v2.10 above v2.9')
    ok(not bad,f'no 404s ({bad[:3]})')
    ok(not errs,f'no console errors ({errs[:4]})')
    b.close()
print('FAILS',FAILS); print('ALL PASSED' if not FAILS else f'{len(FAILS)} failures'); sys.exit(1 if FAILS else 0)
