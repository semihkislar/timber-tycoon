# v2.13: forest machines (harvester/forwarder/skidder, cached per heading, lights), shipping yard (dock levels + bays,
# forklift fleet/speed, gantry crane, departures, export contracts tied to the trade map), manager cost rebalance +
# cost-vs-benefit line, v2.12 save migration, Replant keeps the yard, mobile touch (dock tap, More, Accept), snapshot.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
MID='''(()=>{const S=TT.S;S.coins=1e9;S.totalEarned=1e10;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,20);S.coins=1e9;TT.rebuildAll();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200)
    ok(ver(E(pg,'TT.VERSION'))>=(2,13),f"VERSION>=2.13 ({E(pg,'TT.VERSION')})")
    _m=re.search(r"timber-tycoon-v([\d.]+)'",E(pg,'fetch("sw.js").then(r=>r.text())'))   # v2.15: >= so later releases keep passing
    ok(_m and ver(_m.group(1))>=(2, 13),f'sw.js cache bumped to >= v2.13 ({_m and _m.group(1)})')
    sh=E(pg,'TT.S.ship'); ok(sh['dock']==1 and sh['fork']==2 and sh['crane']==0,f'fresh state has a Lv 1 dock with 2 forklifts ({sh})')
    # migration: a v2.12 save without ship
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.12'; old.pop('ship',None); old['buildings']['sawmill']['lvl']=9
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1300)
    S=E(pg,'TT.S'); ok(ver(S['version'])==ver(E(pg,'TT.VERSION')) and S['ship']['dock']==1 and S['buildings']['sawmill']['lvl']>=9,f"v2.12 save migrated (ship={S['ship']['dock']})")
    ctx.close()
    # logic
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID); pg.wait_for_timeout(2500)
    p0=E(pg,"price('planks')"); c=E(pg,"shCost('dock')"); ok(abs(c-6e4)<1,f'dock Lv 2 costs 60K ({c})')
    E(pg,"S.coins=1e15;shBuy('dock')"); p1=E(pg,"price('planks')"); ok(abs(p1/p0-1.02)<1e-6,f'dock Lv 2: +2% export premium on prices ({p1/p0:.4f})')
    E(pg,"shBuy('dock');shBuy('dock')"); ok(E(pg,'shBays()')==2 and E(pg,'S.ship.bays.length')==2,'dock Lv 4: 2 loading bays')
    f0=E(pg,'shForkSpeed()'); ok(f0>=3.0,f'forklifts ~2x faster than v2.12 (speed {f0} vs 1.7)')
    E(pg,"shBuy('fspd')"); ok(E(pg,'shForkSpeed()')>f0*1.2,'forklift speed upgrade makes them faster')
    E(pg,"shBuy('fork')"); pg.wait_for_timeout(600); ok(E(pg,'S.ship.fork')==3 and E(pg,'scene.forklifts.length')==3,'forklift fleet upgrade adds a forklift in the scene')
    l0=E(pg,'shLoadF()'); E(pg,"shBuy('crane')"); ok(E(pg,'shLoadF()')>l0*1.5 and E(pg,'S.ship.crane')==1,'gantry crane boosts loading')
    for k in ['dock','fork','fspd','crane']:
        E(pg,f"for(let n=0;n<20;n++) shBuy('{k}')")
    ok(E(pg,"!isFinite(shCost('dock'))&&S.ship.dock===10&&S.ship.fork===6&&S.ship.fspd===5&&S.ship.crane===3"),'every yard upgrade caps at its max')
    pg.wait_for_timeout(1500); ok(E(pg,'S.ship.stats.trucks')>=1,f"trucks depart from the bays ({E(pg,'S.ship.stats.trucks')})")
    # contracts
    E(pg,'S.ship.offer=null;S.ship.contract=null;S.ship.nextOffer=0'); pg.wait_for_timeout(600)
    o=E(pg,'S.ship.offer'); ok(o is not None and o['city'] in E(pg,'CITIES.map(c=>c.id)'),f'export contract offered by a trade-map city ({o and o["city"]})')
    E(pg,'shAccept()'); c0=E(pg,'S.ship.contract'); ok(c0 is not None and c0['reward']>0,'contract accepted with a reward')
    co0=E(pg,'S.coins'); E(pg,'S.ship.contract.got=S.ship.contract.qty-1e-6'); pg.wait_for_timeout(400)
    ok(E(pg,'S.ship.contract')==None and E(pg,'S.ship.stats.contracts')==1 and E(pg,'S.coins')>co0+c0['reward']*.99,'completing a contract pays the reward')
    E(pg,'S.ship.nextOffer=0;S.ship.offer=null'); pg.wait_for_timeout(500); E(pg,'shAccept();S.ship.contract.left=0.01'); pg.wait_for_timeout(400)
    ok(E(pg,'S.ship.contract')==None and E(pg,'S.ship.stats.failed')==1,'an expired contract fails without penalty')
    # replant keeps the yard
    E(pg,'S.totalEarned=1e14;doPrestige()'); pg.wait_for_timeout(500)
    ok(E(pg,"S.ship.dock===10&&S.ship.fork===6&&S.ship.crane===3&&S.ship.contract===null&&S.ship.stats.contracts===1"),'Replant keeps docks/forklifts/crane, drops the running contract')
    ok(E(pg,"BUILDINGS.every(b=>S.buildings[b.id].lvl===0)"),'Replant still resets building levels (and so their costs)')
    ctx.close()
    # managers rebalance + forest machines cached
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_timeout(1200); E(pg,MID); pg.wait_for_timeout(2000)
    m=E(pg,"(()=>{const m=MANAGERS.find(x=>x.bid==='showroom'),c=MANAGERS.find(x=>x.r==='C');return [mgrHireCost(m)/BMAP[m.bid].cost,mgrHireCost(c)/BMAP[c.bid].cost,mgrUpCost(c,2).coins/mgrUpCost(c,1).coins]})()")
    ok(abs(m[0]/m[1]-2)<1e-9 and abs(m[2]-2.2)<1e-9,f'manager cost: rarity x rarity power, x2.2 per level ({m})')
    E(pg,"TT.openSheet('staff')"); pg.wait_for_timeout(700)
    g=E(pg,"[...document.querySelectorAll('#staffBody .mg-g')].map(e=>e.textContent).filter(t=>/pays back/.test(t)).length")
    ok(g>=3,f'manager cards show cost vs benefit ({g} with payback)')
    ok(E(pg,"scene.harvesters.length>0&&scene.forwarders.length>0&&scene.skidders.length>0"),'harvesters, forwarders and skidders in the forest')
    E(pg,"(()=>{const c=TT.cam;c.z=c.tz=2.6;const q=TT.P(-2,13,10);c.x=c.tx=q[0];c.y=c.ty=q[1];})()"); pg.wait_for_timeout(1500)
    k1=E(pg,"[...SPR.map.keys()].filter(k=>/^(hv|fw|sk)/.test(k)).length"); pg.wait_for_timeout(1500); k2=E(pg,"[...SPR.map.keys()].filter(k=>/^(hv|fw|sk)/.test(k)).length")
    ok(0<k1 and k2-k1<40,f'forest machines are cached sprites ({k1} -> {k2})')
    E(pg,"TT.setClock(420*.95)"); pg.wait_for_timeout(600); ok(E(pg,"collectLights().length")>E(pg,"(()=>{const a=scene.harvesters;scene.harvesters=[];const f=scene.forwarders,s=scene.skidders;scene.forwarders=[];scene.skidders=[];const n=collectLights().length;scene.harvesters=a;scene.forwarders=f;scene.skidders=s;return n})()"),'forest machines have lights at night')
    ctx.close()
    # mobile touch
    for dev in ['iPhone 13','Pixel 7']:
        d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page(); watch(pg,dev+' ')
        cdp=ctx.new_cdp_session(pg)
        def tap(x,y):
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); pg.wait_for_timeout(50); cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); pg.wait_for_timeout(600)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,MID); E(pg,'document.querySelectorAll(".modal-bg").forEach(t=>t.remove());TT.fitCamera(true)'); pg.wait_for_timeout(800)
        s=E(pg,"TT.lotScreen('dock')"); tap(*s); ok(E(pg,'TT.curSheet')=='ship',f'{dev}: tapping the dock opens the Shipping Yard')
        E(pg,"TT.closeSheet()"); pg.wait_for_timeout(500)
        mb=E(pg,"(()=>{const e=[...document.querySelectorAll('#bottombar .bb')].find(x=>x.dataset.s==='more');const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); tap(*mb)
        t=E(pg,"(()=>{const e=document.querySelector('#moreGrid [data-s=ship]');if(!e) return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        ok(t is not None,f'{dev}: More lists Shipping'); t and tap(*t); ok(E(pg,'TT.curSheet')=='ship',f'{dev}: More -> Shipping opens')
        E(pg,'S.ship.nextOffer=0'); pg.wait_for_timeout(900)
        q=E(pg,"(()=>{const b=document.getElementById('shAc');if(!b) return null;b.scrollIntoView({block:'center'});return 1})()"); pg.wait_for_timeout(300)
        q=E(pg,"(()=>{const b=document.getElementById('shAc');if(!b) return null;const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.height]})()")
        if q: tap(q[0],q[1])
        ok(q is not None and q[2]>=40 and E(pg,'!!S.ship.contract'),f'{dev}: Accept contract by touch (44px button) {q}')
        q=E(pg,"(()=>{const b=document.getElementById('shU_fork');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); pg.wait_for_timeout(300)
        q=E(pg,"(()=>{const b=document.getElementById('shU_fork');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()"); tap(*q)
        ok(E(pg,'S.ship.fork')==3,f'{dev}: forklift upgrade by touch')
        ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.13'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.13/index.html'); pg.wait_for_timeout(1200); ok(E(pg,'TT.VERSION')=='2.13' and E(pg,'TT.scene.fps')>5,'releases/v2.13/ snapshot runs'); ctx.close()
    ok(not errs,f'no page errors {errs[:3]}'); ok(not missing,f'no 404s {missing[:3]}')
print('FAILED' if FAILS else 'ALL PASS',len(FAILS)); sys.exit(1 if FAILS else 0)
