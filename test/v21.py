# v2.1 tests: iso 3D vehicles, realistic forest crew, camera shows people on load, v2.0 save migration
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
OLD='file:///workspace/lumber-idle/releases/timber-tycoon-v2.0.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
MID='(()=>{TT.S.coins=1e12;TT.buyCollector("lumberjack",30);TT.buyCollector("chainsaw",12);TT.buyCollector("truck",6);TT.buyCollector("harvester",2);TT.buyBuilding("sawmill",55);TT.buyBuilding("chipper",30);TT.buyBuilding("kiln",12);TT.buyBuilding("carpentry",26);TT.buyBuilding("pellet",10);TT.buyBuilding("paper",8);TT.buyBuilding("furniture",4);TT.S.coins=5e6;})()'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- v2.0 save migration ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.VERSION')=='2.0','old build is v2.0')
    pg.evaluate('(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",20);TT.buyCollector("chainsaw",3);TT.buyBuilding("sawmill",25);TT.buyBuilding("chipper",8);TT.S.golden=3;TT.save(true);})()')
    old=pg.evaluate('JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=pg.evaluate('TT.S')
    ok(float(S['version'])>=2.1,'v2.0 save migrated (version %s)'%S['version'])
    ok(S['collectors']==old['collectors'] and S['buildings']['sawmill']['lvl']==25 and S['golden']==3,'collectors, buildings, golden kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.01,'coins kept')
    fp=pg.evaluate('TT.forestPeople()')
    ok(len([q for q in fp if q.get('type')=='axe'])==8 and len([q for q in fp if q.get('type')=='saw'])==3,'migrated crew: 8 axe (capped from 20) + 3 chainsaw')
    ctx.close()
    # --- fresh game: people visible on load (desktop + mobile) ---
    for (w,h,mob,name) in [(1280,800,False,'desktop'),(430,900,True,'mobile'),(390,844,True,'phone')]:
        c2=b.new_context(viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob); pg=c2.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(1200)
        fp=pg.evaluate('TT.forestPeople()')
        jacks=[q for q in fp if q['type']=='axe']
        ok(len(jacks)>=2,f'{name}: starter lumberjack crew exists ({len(jacks)})')
        ok(len([q for q in fp if q['vis']])>=2,f'{name}: >=2 forest people on screen on load')
        ok(pg.evaluate('TT.scene.campers.length')>=3,f'{name}: tea-break campers present')
        c2.close()
    # --- mid game: crew loop, felling, landings, trucks ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate(MID); pg.wait_for_timeout(300)
    fp=pg.evaluate('TT.forestPeople()')
    ok(len([q for q in fp if q['type']=='axe'])==8 and len([q for q in fp if q['type']=='saw'])==5,'mid-game crew 8 axe + 5 chainsaw (cap)')
    ok(pg.evaluate('!!TT.scene.foreman && (TT.scene.planters||[]).length>0'),'foreman and planter present')
    seen=set(); poses=set(); fell=0; stumps=0; n0=pg.evaluate('TT.LANDINGS.T.n+TT.LANDINGS.L.n'); nmax=n0
    dockLegs=set(); logUnload=False; logLoads=[]
    for k in range(40):
        pg.wait_for_timeout(500)
        st=pg.evaluate('''(()=>{const fp=TT.forestPeople();const tr=TT.scene.dynTrees;return {st:fp.map(q=>q.st),pose:fp.map(q=>q.pose),fall:tr.filter(t=>t.fall||t.down).length,stump:tr.filter(t=>t.stump).length,
          land:TT.LANDINGS.T.n+TT.LANDINGS.L.n,veh:TT.vehicles()}})()''')
        seen.update(st['st']); poses.update(st['pose']); fell=max(fell,st['fall']); stumps=max(stumps,st['stump']); nmax=max(nmax,st['land'])
        for d in st['veh']['dock']: dockLegs.add(d['li'])
        for v in st['veh']['log']:
            if v['li']==0 and v['v']==0 and v['load']<1: logUnload=True
    print('states',sorted(seen),'poses',sorted(p for p in poses if p))
    ok({'walk','work'}<=seen,'lumberjacks walk to trees and work')
    ok('watch' in seen or fell>0,'trees get felled ("Timber!")')
    ok('carry' in seen,'lumberjacks carry logs to the landing')
    ok({'chop','saw'}&poses=={'chop','saw'},'axe swing and chainsaw poses used')
    ok(stumps>0,'stumps remain after felling')
    ok(nmax>n0 or 'carry' in seen,'landing pile grows')
    ok({0,3}<=dockLegs or {3,4}<=dockLegs or {1,2,3}<=dockLegs,f'dock trucks approach, load and depart (legs {sorted(dockLegs)})')
    ok(logUnload,'log truck stops and unloads with its crane')
    veh=pg.evaluate('TT.vehicles()')
    ok(len(veh['log'])>=1 and len(veh['dock'])>=1 and veh['forklifts']>=1,'log trucks, dock trucks and forklifts exist')
    ok(all(isinstance(v['yaw'],(int,float)) for v in veh['log']+veh['dock']),'vehicles have a continuous heading (yaw)')
    perf=pg.evaluate('({fps:TT.scene.fps,ms:TT.scene.frameMs})')
    ok(perf['ms']<14,f'frame time ok {perf}')
    print('ERRORS:',errs)
    ok(not errs,'no console errors')
    b.close()
print('FAILS',FAILS)
if FAILS: raise SystemExit(1)
