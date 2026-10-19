# v2.21: Town Market Fleet (vans at Phase 1–2 stock when selling) + Veneer Peeler manager (Aylin).
# Cosmetic vans only; logs stay raw (v2.20.1); old saves load; phones smoke; no console errors.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
HERE=os.path.dirname(os.path.abspath(__file__))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;"
MID="S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,20);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,20);M=computeMods();for(const r of RES) if(canSell(r.id)) S.autosell[r.id]=true;TT.simulate(25);"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.on('response',lambda r: r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1600); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,21),f"VERSION>=2.21 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,21),'sw cache bumped to >= v2.21')
    ok('js/marketfleet.js' in open(ROOT+'/index.html').read() and E(pg,"typeof mktFleetUpdate")=='function','marketfleet.js loaded')
    ok(E(pg,"typeof mktVanRaw")=='function' and E(pg,"typeof mktVan")=='function','van art + sprite wrapper present')
    # --- peeler manager ---
    r=E(pg,"(()=>{const m=MANAGERS.find(x=>x.bid==='peeler');return m&&{id:m.id,skill:m.skill,r:m.r,n:m.name};})()")
    ok(r and r['id']=='aylin' and r['skill']=='thrift' and r['r']=='R',f'peeler manager Aylin (Rare, thrift) in MANAGERS ({r})')
    ok(E(pg,"MGR_OF.peeler&&MGR_OF.peeler.id")=='aylin','MGR_OF maps peeler → Aylin')
    E(pg,CLEAN+"S.coins=1e12;S.buildings.peeler.lvl=0")
    ok(E(pg,"mgrAvail(MGR_OF.peeler)") is False,'peeler manager locked until peeler is built')
    E(pg,"TT.buyBuilding('peeler',1);M=computeMods()")
    ok(E(pg,"mgrAvail(MGR_OF.peeler)") is True and E(pg,"mgrLvl('peeler')")==0,'hireable when peeler built, not auto-hired')
    ok(E(pg,"hireMgr('aylin')") is True and E(pg,"mgrLvl('peeler')")==1,'can hire Aylin')
    mi=E(pg,"mgrIn('peeler')"); ok(mi<1,f"thrift reduces peeler input ({mi})")
    # --- vans when selling ---
    E(pg,CLEAN+MID); pg.wait_for_timeout(800)
    r=E(pg,"({cr:TT.coinRate,want:mktFleetWant(),sells:mktSellBids().length})")
    ok(r['cr']>0.05 and r['want']>=1 and r['sells']>=1,f'selling mid-game: coinRate and fleet want ({r})')
    # advance scene so vans spawn and move
    E(pg,"(()=>{scene._mktCD=0;for(let i=0;i<90;i++){mktFleetUpdate(0.2);}return true;})()")
    r=E(pg,"(()=>{const v=TT.vehicles().market||[];return {n:v.length,loading:v.filter(x=>x.li===1).length,any:v.length>0,loads:v.map(x=>x.load),cargos:[...new Set(v.map(x=>x.cargo))],bids:[...new Set(v.map(x=>x.bid))]};})()")
    ok(r['n']>=1 and r['n']<=3,f'1–3 market vans while selling ({r})')
    ok('logs' not in r['cargos'],f'vans never carry logs ({r["cargos"]})')
    # let a van finish loading and leave
    E(pg,"(()=>{for(let i=0;i<120;i++){mktFleetUpdate(0.25);}const left=(TT.vehicles().market||[]).some(v=>v.li>=2&&v.load>.5)||(TT.vehicles().market||[]).some(v=>v.load>=.9);return left||(scene.floats||[]).some(f=>f.coin);})()")
    left=E(pg,"(()=>{const v=TT.vehicles().market||[];const gone=v.some(x=>x.li===2);const loaded=v.some(x=>x.load>=.5);const coin=(scene.floats||[]).some(f=>f.coin&&f.t<f.dur);return {gone,loaded,coin,n:v.length};})()")
    ok(left['gone'] or left['loaded'],f'vans load and/or depart ({left})')
    # idle: turn off autosell and starve sales → fleet want 0
    E(pg,CLEAN+"for(const r of RES) S.autosell[r.id]=false;for(const b of BUILDINGS) if(S.buildings[b.id]) S.buildings[b.id].on=false;S.res={};RES.forEach(r=>S.res[r.id]=0);TT.simulate(3);coinRate=0;scene.marketVans=[];scene._mktCD=0;")
    r=E(pg,"({cr:TT.coinRate,want:mktFleetWant(),n:(TT.vehicles().market||[]).length})")
    ok(r['want']==0 and r['n']==0,f'idle: no fleet when not selling ({r})')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # --- v2.20.1 save still loads; logs not sellable ---
    ctx,pg,errs,bad=page()
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.20.1';o.res.logs=12345;o.autosell.logs=true;o.buildings.sawmill.lvl=8;o.buildings.peeler={lvl:2,on:true};o.mgr=o.mgr||{};return JSON.stringify(o);})()")
    ctx.close()
    ctx,pg,errs,bad=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    r=E(pg,"({v:S.version,a:S.autosell.logs,l:S.res.logs,can:canSell('logs'),peel:S.buildings.peeler.lvl,mgr:mgrLvl('peeler')})")
    ok(r['a'] is False and r['can'] is False and r['l']>1e4 and r['peel']==2 and r['mgr']==0,f'v2.20.1 save: logs raw, peeler kept, Aylin not forced ({r})')
    ok(not errs,f'migration: no errors ({errs[:3]})'); ctx.close()
    # --- phones ---
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev)
        E(pg,CLEAN+MID+"scene._mktCD=0;for(let i=0;i<40;i++) mktFleetUpdate(0.25);TT.fitCamera(true)")
        pg.wait_for_timeout(600)
        r=E(pg,"({n:(TT.vehicles().market||[]).length,cr:TT.coinRate,w:innerWidth})")
        ok(r['n']>=1 or r['cr']>0,f'{dev}: fleet or income visible ({r})')
        ok(not errs,f'{dev}: no errors ({errs[:3]})'); ctx.close()
    br.close()
print('FAILS',len(FAILS));
sys.exit(1 if FAILS else 0)
