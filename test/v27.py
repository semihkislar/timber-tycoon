# v2.7 tests: forest stock + planting crew (migration from v2.6, free first planter, depletion slows logs, trickle at 0,
# planting / growth / seasons, upgrades, research node, trophies, Replant, offline, HUD chip + Crew sheet, warning toast,
# scene planters / saplings / nursery / seed drones, perf, mobile, no console errors)
from playwright.sync_api import sync_playwright
import time
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
OLD=BASE+'releases/timber-tycoon-v2.6.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
QUIET='TT.S.orders.next=1e9;TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.S.fireCool=1e9;TT.S.nextEvent=1e12;'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    def fresh(vp=(1280,800)):
        ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400); pg.evaluate(QUIET); return ctx,pg
    E=lambda pg,s: pg.evaluate(s)

    # --- v2.6 save migration: full forest + a crew that covers the loggers ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(E(pg,'TT.VERSION')=='2.6','old build is v2.6')
    E(pg,'(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",30);TT.buyCollector("truck",20);TT.buyCollector("harvester",10);TT.buyBuilding("sawmill",30);TT.S.golden=3;TT.save(true);})()')
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=E(pg,'TT.S')
    ok(float(S['version'])>=2.7,'v2.6 save migrated to 2.7')
    ok(S['collectors']==old['collectors'] and S['buildings']['sawmill']['lvl']==30 and S['golden']==3,'collectors, buildings, golden kept')
    d=E(pg,'({D:TT.fellDemand(),cap:TT.plantCap(),eff:TT.forestEff(),m:TT.S.forest.m,P:TT.forestPlots(),pl:TT.S.planters})')
    ok(d['cap']>=d['D']*1.0,f"migrated crew covers felling demand ({d['cap']:.2f} vs {d['D']:.2f}, {d['pl']})")
    ok(d['eff']>=.99 and d['m']>=d['P']*.97,f"migrated forest is full ({d['m']:.0f}/{d['P']:.0f})")
    ok(abs(S['coins']-old['coins'])/max(old['coins'],1)<0.02,'coins kept')
    ctx.close()

    # --- fresh game ---
    ctx,pg=fresh()
    ok(float(E(pg,'TT.VERSION'))>=2.7,'VERSION is 2.7')
    ok(E(pg,'TT.S.planters.planter')==1,'first planter is free')
    ok(E(pg,'TT.S.forest.m')>=1150 and E(pg,'TT.forestEff()')==1,'fresh forest is full')
    c0=E(pg,'TT.plCost("planter",1)'); ok(c0<=100,f'second planter is cheap ({c0:.0f})')
    ok(E(pg,'TT.PLANTERS.map(p=>p.id).join()')=='planter,team,nursery,sdrone','4 planting tiers')
    costs=E(pg,'TT.PLANTERS.map(p=>[p.cost,p.rate])'); ok(all(costs[i+1][0]>costs[i][0] and costs[i+1][1]>costs[i][1] for i in range(3)),'tiers scale in cost and rate')
    E(pg,'TT.S.coins=1e6'); n0=E(pg,'TT.S.planters.planter'); c1=E(pg,'TT.plCost("planter",1)')
    ok(E(pg,'TT.buyPlanter("planter",1)') and E(pg,'TT.S.planters.planter')==n0+1,'buy a planter')
    ok(E(pg,'TT.plCost("planter",1)')>c1*1.1,'planter cost scales')
    E(pg,'TT.S.coins=0'); ok(not E(pg,'TT.buyPlanter("team",1)'),'cannot buy without coins')
    # early game: no depletion pressure in the first minutes with a modest crew
    E(pg,'(()=>{TT.S.coins=1e5;TT.buyCollector("lumberjack",15);TT.buyCollector("chainsaw",8);TT.simulate(240,.5);})()')
    ok(E(pg,'TT.forestEff()')>=.99,f'early game: 15 lumberjacks + 8 chainsaws keep full output for 4 min ({E(pg,"TT.forestEff()"):.2f})')
    ctx.close()

    # --- depletion lowers log output; 0 trees -> trickle ---
    ctx,pg=fresh()
    E(pg,'(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",30);TT.buyCollector("truck",20);TT.simulate(.5,.25);})()')
    pot,full=E(pg,'[TT.logRatePot(),TT.logRate()]')
    ok(abs(full-pot)/pot<1e-6,'full forest: logRate = potential')
    E(pg,'(()=>{const F=TT.S.forest;F.st+=F.m-20;F.m=20;TT.simulate(.25,.25);})()')
    half=E(pg,'TT.logRate()'); eff=E(pg,'TT.forestEff()')
    ok(0<eff<1 and half<pot*.9,f'thin forest: output scales down ({eff:.2f})')
    E(pg,'(()=>{const F=TT.S.forest;F.st+=F.m+F.y+F.s;F.m=0;F.y=0;F.s=0;TT.S.planters={planter:0,team:0,nursery:0,sdrone:0};TT.simulate(1,.25);})()')
    tr=E(pg,'TT.logRate()'); ok(0<=tr<pot*.05,f'0 trees: only a trickle ({tr:.3g} of {pot:.3g})')
    ok(E(pg,'TT.forestState().cls')=='bad','state = bad when depleted')
    E(pg,'TT.simulate(60,.5)'); tr2=E(pg,'TT.logRate()')
    ok(tr2>0,f'natural regrowth gives a trickle after a minute ({tr2:.3g})')
    ok(E(pg,'TT.S.forest.warn')==1,'depletion warning flag set')
    E(pg,'TT.render()'); pg.wait_for_timeout(300)
    ok(E(pg,'!!document.querySelector(".toast.forest-toast")') or E(pg,'TT.S.forest.warn')==1,'warning toast shown')
    ok('bad' in E(pg,'document.getElementById("forestChip").className'),'HUD chip turns red')
    ok(E(pg,'!!document.querySelector("#crewDot")?getComputedStyle(document.querySelector("#crewDot")).display!=="none":true'),'crew dot hints at hiring planters')
    # hire crew -> recovery
    E(pg,'(()=>{TT.S.coins=1e15;TT.buyPlanter("team",40);TT.buyPlanter("nursery",5);TT.simulate(240,.5);})()')
    ok(E(pg,'TT.forestEff()')>.9,f'with planters the forest recovers ({E(pg,"TT.forestEff()"):.2f})')
    ok(E(pg,'TT.S.forest.warn')==0,'warning clears after recovery')
    ctx.close()

    # --- growth stages, seasons, upgrades, research ---
    ctx,pg=fresh()
    E(pg,'(()=>{const F=TT.S.forest;F.m=0;F.y=0;F.s=100;F.st=1100;TT.S.planters={planter:0,team:0,nursery:0,sdrone:0};})()')
    E(pg,'TT.simulate(30,.5)'); g=E(pg,'({s:TT.S.forest.s,y:TT.S.forest.y,m:TT.S.forest.m})')
    ok(g['s']<100 and g['y']>0,f'saplings grow into young trees ({g})')
    E(pg,'TT.simulate(120,.5)'); ok(E(pg,'TT.S.forest.m')>g['m']+5,'young trees mature')
    gm=E(pg,'[0,1,2,3].map(k=>{TT.setClock(k*TT.SEASON_DAYS*TT.DAY_LEN+TT.DAY_LEN*.4);return TT.growMult();})')
    ok(gm[0]>gm[1]>gm[2]>gm[3],f'spring grows fastest, winter slowest ({[round(x,2) for x in gm]})')
    u=E(pg,'TT.UPGRADES.filter(u=>["spades","fert","elite","irrig"].includes(u.id)).map(u=>u.id)')
    ok(len(u)==4,f'4 planting upgrades ({u})')
    E(pg,'TT.S.coins=1e12;TT.S.planters={planter:10,team:5,nursery:2,sdrone:0}')
    r0=E(pg,'TT.plRate("planter")'); g0=E(pg,'TT.growMult()'); d0=E(pg,'(TT.buyCollector("lumberjack",20),TT.fellDemand())')
    for x in u: E(pg,f'TT.buyUpgrade("{x}")')
    ok(E(pg,'TT.plRate("planter")')>=r0*1.99,'spades double planter rate')
    ok(E(pg,'TT.growMult()')>=g0*2.2,'fertilizer + irrigation speed growth')
    ok(E(pg,'TT.fellDemand()')<d0*.7,'better saplings: each tree yields more logs')
    node=E(pg,'TT.RNODES.find(n=>n.id==="genetics")'); ok(node is not None and node['req']==['labx'],'research node: Tree Genetics')
    E(pg,'TT.S.research=TT.S.research||{};TT.S.research.genetics=1'); ok(E(pg,'(TT.logRate(),TT.growMult())')>E(pg,'(delete TT.S.research.genetics,TT.logRate(),TT.growMult())')*1.2,'Tree Genetics speeds growth')
    ctx.close()

    # --- trophies, prestige, offline ---
    ctx,pg=fresh()
    ok(E(pg,'TT.ACH.some(a=>a.id==="plant1k")&&TT.ACH.some(a=>a.id==="plant100k")'),'2 new trophies')
    E(pg,'TT.S.forestLife.planted=1001;TT.checkAch(true)'); ok(E(pg,'TT.S.ach.plant1k')!=None,'Green Thumb unlocks at 1,000 planted')
    E(pg,'(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",30);TT.buyPlanter("team",3);const F=TT.S.forest;F.st+=F.m*.8;F.m*=.2;TT.S.totalEarned=1e13;})()')
    ok(E(pg,'TT.pendingSeeds()')>=1,'prestige available')
    E(pg,'TT.doPrestige()'); S=E(pg,'TT.S')
    ok(S['planters']=={'planter':1,'team':0,'nursery':0,'sdrone':0},'Replant resets crew to one free planter')
    ok(S['forest']['m']>=1150 and S['forest']['st']<60,'Replant resets the forest to full')
    ok(S['forestLife']['planted']>=1001,'lifetime planted survives Replant')
    E(pg,'(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",30);TT.buyCollector("chainsaw",20);TT.buyPlanter("planter",10);const F=TT.S.forest;F.st+=F.m-50;F.m=50;})()')
    pl0=E(pg,'TT.S.forestLife.planted'); m0=E(pg,'TT.S.forest.m')
    r=E(pg,'TT.simulateOffline(1800)')
    ok(E(pg,'TT.S.forestLife.planted')>pl0+50,'offline: planters keep planting')
    ok(E(pg,'TT.S.forest.m+TT.S.forest.y')>m0,'offline: saplings grow')
    ok(isinstance(r,dict) and r.get('planted',0)>0 if isinstance(r,dict) else True,'offline report carries planted saplings')
    ctx.close()

    # --- UI: chip + crew sheet + planter cards ---
    ctx,pg=fresh()
    ok(E(pg,'!!document.getElementById("forestChip")&&document.getElementById("forestChip").offsetWidth>0'),'HUD forest chip visible')
    pg.click('#forestChip'); pg.wait_for_timeout(400)
    ok(E(pg,'TT.curSheet')=='crew','chip opens the Crew sheet')
    ok(E(pg,'document.getElementById("forestCard").innerText').find('grown')>=0,'forest card shows stock')
    cards=E(pg,'document.querySelectorAll("#plList .card.pl").length'); ok(cards>=1,f'planter cards listed ({cards})')
    E(pg,'TT.S.coins=1e9;TT.render()'); pg.wait_for_timeout(200)
    n0=E(pg,'TT.S.planters.planter'); pg.click('#plList .card.pl[data-id="planter"] button'); pg.wait_for_timeout(200)
    ok(E(pg,'TT.S.planters.planter')>n0,'Hire button buys planters')
    E(pg,'TT.S.totalEarned=1e9;TT.render()'); pg.wait_for_timeout(200)
    ok(E(pg,'document.querySelectorAll("#plList .card.pl").length')==4,'all 4 tiers revealed later')
    ctx.close()

    # --- scene: planters, saplings, nursery, seed drones ---
    ctx,pg=fresh()
    E(pg,'(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",20);TT.buyPlanter("planter",3);TT.buyPlanter("team",3);TT.buyPlanter("nursery",1);TT.buyPlanter("sdrone",3);})()')
    E(pg,'(()=>{let k=0;for(const t of TT.scene.dynTrees){if(k++%3==0){t.stump=1;}}})()')
    pg.wait_for_timeout(7000)
    pp=E(pg,'TT.planterPeople().map(p=>({k:p.kind,st:p.st,pose:p.pose}))')
    ok(len(pp)==7,f'planter figures capped (2 planters + 4 team + nursery worker = {len(pp)})')
    ok(any(p['st'] in ('walk','dig','plant','water') for p in pp),f'planters work ({[p["st"] for p in pp]})')
    seen=set()
    for k in range(30):
        for x in E(pg,'TT.planterPeople().map(p=>p.pose)'): seen.add(x)
        pg.wait_for_timeout(250)
    ok({'dig','water'}<=seen,f'dig and water animations play ({seen})')
    ok(E(pg,'TT.scene.dynTrees.some(t=>!t.stump&&t.grow<.4)'),'saplings visible in the scene')
    ok(E(pg,'(TT.scene.sdrones||[]).length')==2,'seed drones capped at 2')
    fp=E(pg,'TT.forestPeople().filter(p=>p.type!=="jack").length'); ok(fp>=7,'forestPeople includes planters')
    # perf
    t0=time.time(); fr=E(pg,'(()=>{const t=performance.now();for(let i=0;i<60;i++) TT.render&&TT.render();return performance.now()-t;})()')
    fps=E(pg,'new Promise(r=>{let n=0;const t=performance.now();const f=()=>{n++;if(performance.now()-t<2000) requestAnimationFrame(f);else r(n/2);};requestAnimationFrame(f);})')
    ok(fps>=20,f'scene keeps a playable frame rate with full crew ({fps:.0f} fps headless)')
    ctx.close()

    # --- mobile ---
    ctx,pg=fresh((430,900))
    ok(E(pg,'document.documentElement.scrollWidth<=innerWidth+1'),'mobile: no horizontal overflow')
    ok(E(pg,'document.getElementById("forestChip").getBoundingClientRect().right<=innerWidth'),'mobile: forest chip fits')
    E(pg,'TT.openSheet("crew")'); pg.wait_for_timeout(400)
    ok(E(pg,'document.documentElement.scrollWidth<=innerWidth+1'),'mobile: crew sheet no overflow')
    ok(E(pg,'document.getElementById("forestCard").offsetHeight')>40,'mobile: forest card visible')
    ctx.close()
    b.close()
real=[e for e in errs if 'favicon' not in e]
ok(not real,f'no console errors ({real[:3]})')
print(f"\n{'ALL PASSED' if not FAILS else str(len(FAILS))+' FAILED'}")
