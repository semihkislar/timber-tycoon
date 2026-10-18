# v2.20: Factory tiers — phase 1 (right, logs only), phase 2 (left, phase-1 goods only), phase 3 (premium, phase-2 goods only),
# new Veneer Peeler (veneer + bark), remapped recipes, export at every tier with rising value, processing margin in the sheet,
# market grouped by tier, forklifts between tiers, flow-view tier badges, re-layout, migration, plank/veneer shortage sim, phones, snapshot.
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
MID="S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,30);S.premium.lvl=1;for(const b of PREM_BLD) TT.buyBuilding(b.id,5);S.research={science:1,tar:1,plywood:1};TT.buyBuilding('lab',3);TT.buyBuilding('plymill',5);M=computeMods();TT.rebuildAll();"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,20),f"VERSION>=2.20 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,20),'sw cache bumped to >= v2.20')
    ok('js/tiers.js' in open(ROOT+'/index.html').read() and E(pg,'typeof tierViolations')=='function','tiers.js is loaded')
    E(pg,CLEAN)
    # the chain
    ok(E(pg,'tierViolations()')==[],f"every building takes goods only from the tier below ({E(pg,'tierViolations()')})")
    r=E(pg,"BUILDINGS.filter(b=>BTIER[b.id]===1).every(b=>Object.keys(b.inp).every(k=>k==='logs'))&&BUILDINGS.every(b=>BTIER[b.id]!==undefined)")
    ok(r,'phase 1 takes logs only; every building has a tier')
    r=E(pg,"({p:BMAP.peeler&&BMAP.peeler.inp,o:BMAP.peeler&&BMAP.peeler.out,f:BMAP.furniture.inp,ply:BMAP.plymill.inp,c:BMAP.peeler&&BMAP.peeler.cost})")
    ok(r['p']=={'logs':4} and r['o']=={'veneer':3,'bark':1} and r['f']=={'planks':12,'veneer':8} and r['ply']=={'veneer':6,'glue':2} and r['c']==6e4,f'Veneer Peeler 4 logs → 3 veneer + 1 bark; furniture & plywood use veneer ({r})')
    r=E(pg,"BUILDINGS.filter(b=>BTIER[b.id]).map(b=>[BTIER[b.id],unitMargin(b.id)])")
    ok(all(x[1]>0 for x in r),f'processing always beats selling the inputs raw (margin > 0 for every building)')
    avg=lambda t:sum(x[1] for x in r if x[0]==t)/max(1,len([x for x in r if x[0]==t]))
    ok(avg(1)<avg(2)<avg(3),f'profit per unit rises by tier ({avg(1):.1f} < {avg(2):.1f} < {avg(3):.1f})')
    r=E(pg,"[0,1,2,3].map(t=>RES.filter(x=>resTier(x.id)===t).map(x=>x.price)).map(a=>Math.max(...a))")
    ok(r[0]<=r[1]<r[2]<=r[3],f'top price per tier rises ({r})')
    # layout
    r=E(pg,"({r:['peeler','sawmill','chipper','kiln'].map(id=>LOTS[id].side),l:['carpentry','pellet','paper','furniture'].map(id=>LOTS[id].side),draw:typeof BDRAW.peeler})")
    ok(r['r']==['R']*4 and r['l']==['L']*4 and r['draw']=='function',f'phase 1 on the right, phase 2 on the left, the peeler has its own building art ({r})')
    r=E(pg,"(()=>{const ids=MAIN_BLD.map(b=>b.id),bx=ids.map(id=>[id,lotBox(Object.assign({},LOTS[id]))]);const hit=[];for(let a=0;a<bx.length;a++)for(let b=a+1;b<bx.length;b++){const A=bx[a][1],B=bx[b][1];if(A.i0<B.i1&&B.i0<A.i1&&A.j0<B.j1&&B.j0<A.j1) hit.push(bx[a][0]+'/'+bx[b][0]);}return hit;})()")
    ok(r==[],f'no two production lots overlap ({r})')
    # running mid game
    E(pg,MID+CLEAN); pg.wait_for_timeout(2500)
    r=E(pg,"({lifts:(scene.tierLifts||[]).length,links:tierLinks().map(l=>l.src+'>'+l.dst),ven:TT.rates.veneer.p,bark:TT.rates.bark.p,furn:TT.rates.furniture.p,ply:TT.rates.plywood.p})")
    ok(r['lifts']>=5 and 'peeler>furniture' in r['links'] and 'sawmill>carpentry' in r['links'],f'forklifts shuttle pallets from phase 1 to phase 2 ({r})')
    ok(r['ven']>0 and r['bark']>0 and r['furn']>0 and r['ply']>0,'veneer, bark, furniture and plywood are produced')
    ok(E(pg,"bMargin('furniture')")>0,'building sheet margin: furniture adds value')
    E(pg,"TT.openSheet('bld','furniture')"); pg.wait_for_timeout(400)
    t=pg.locator('#bpDesc').inner_text(); ok('Phase 2' in t and 'processing adds' in t,f'building sheet shows the tier and the processing margin ({t[:90]})')
    E(pg,"TT.openSheet('market')"); pg.wait_for_timeout(400)
    h=E(pg,"[...document.querySelectorAll('#mktBody tr.mkt-tier b')].map(e=>e.textContent)")
    ok(h[:4]==['Raw','Phase 1 · Primary','Phase 2 · Secondary','Phase 3 · Premium'],f'market grouped by tier ({h})')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(500)
    ok('III' in pg.locator('#flowLegend').inner_text(),'flow legend shows the tiers'); E(pg,"toggleFlow(false)")
    # Replant / research consistency
    r=E(pg,"(()=>{S.research.robomill=1;M=computeMods();const a=M.bld.peeler;delete S.research.robomill;M=computeMods();return a/M.bld.peeler})()")
    ok(abs(r-1.5)<1e-9,f'Robotic Mill research boosts the peeler ({r})')
    r=E(pg,"(()=>{S.totalEarned=1e13;TT.doPrestige();return {lv:S.buildings.peeler.lvl,c:bulkCost(BMAP.peeler.cost,BMAP.peeler.scale,0,1)/BMAP.peeler.cost,cs:cs()}})()")
    ok(r['lv']==0 and abs(r['c']-r['cs'])<1e-9,f'Replant resets the peeler; its price follows the forest value ({r})')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # migration of a v2.19 save
    ctx,pg,errs,bad=page()
    o=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.19';delete o.buildings.peeler;delete o.res.veneer;delete o.res.bark;delete o.autosell.veneer;delete o.autosell.bark;o.buildings.furniture.lvl=12;o.buildings.sawmill.lvl=40;o.res.chairs=500;o.autosell.chairs=false;o.totalEarned=1e9;delete o.tierNote;o.lastSave=Date.now();return o;})()")
    init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(json.dumps(o))
    ctx.close(); ctx,pg,errs,bad=page(init=init)
    r=E(pg,"({p:S.buildings.peeler&&S.buildings.peeler.lvl,v:S.res.veneer,f:S.buildings.furniture.lvl,s:S.buildings.sawmill.lvl,ch:S.res.chairs,flag:S.tierNote,ver:S.version})")
    ok(r['p']==0 and r['v']==0 and r['f']==12 and r['s']==40 and r['ch']>=499 and r['flag']==1,f'v2.19 save: levels kept, peeler added at Lv 0, old stock kept, one-time tier note ({r})')
    ok(not errs and not bad,f'migration: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # shortage sim: plank- or veneer-starved phase-2 lines over 8 runs
    ctx,pg,errs,bad=page(); E(pg,CLEAN+"localStorage.clear()"); pg.set_default_timeout(0)
    o={'runs':8,'maxMin':90,'hook':open(HERE+'/sim_v220_hook.js').read(),'extra':'({furn:S.buildings.furniture.lvl,peel:S.buildings.peeler.lvl,saw:S.buildings.sawmill.lvl})'}
    runs=E(pg,'(%s)(%s)'%(open(HERE+'/sim_v218.js').read(),json.dumps(o)))
    W=E(pg,'window._sh')
    for x in runs: print('  run',x['run'],x['min'],'min  saw',x['x']['saw'],'peeler',x['x']['peel'],'furniture',x['x']['furn'],flush=True)
    sh=W['starve']/max(1,W['n']); print('  starved samples',W,f'{sh*100:.1f}%',flush=True)
    ok(len(runs)==8 and all(10<=x['min']<=90 for x in runs),f"sim: 8 runs of sane length ({[x['min'] for x in runs]})")
    ok(any(x['x']['peel']>0 for x in runs) and any(x['x']['furn']>0 for x in runs),'sim: the peeler and furniture get built')
    ok(sh<0.15,f'sim: phase-2 lines are starved of planks/veneer in < 15 % of samples ({sh*100:.1f}%)')
    ok(not errs,f'sim: no errors ({errs[:3]})'); ctx.close()
    # phones
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev); E(pg,CLEAN+MID+CLEAN); pg.wait_for_timeout(800)
        E(pg,"TT.openSheet('bld','peeler')"); pg.wait_for_timeout(400)
        ok('Veneer Peeler' in pg.locator('#bpName').inner_text() and 'Phase 1' in pg.locator('#bpDesc').inner_text(),f'{dev}: peeler sheet opens with its tier')
        E(pg,"TT.openSheet('market')"); pg.wait_for_timeout(400)
        ok(E(pg,"document.documentElement.scrollWidth<=innerWidth+1"),f'{dev}: no horizontal overflow')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.20'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.20/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.20' and E(pg,'typeof tierViolations')=='function' and not errs and not bad,'releases/v2.20/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.20/ not yet built')
    br.close()
print('ALL PASS 0 []' if not FAILS else f'FAILS {len(FAILS)} {FAILS}')
sys.exit(1 if FAILS else 0)
