# v2.19: Research 2.0 — ~65 nodes in 5 branches × 5 tiers, tiers gated by Forest Legacy (25/150/800/2500 + Lv 200), milestone gates,
# costs grow with tier and nodes done, repeatable nodes (×1.6 cost, diminishing effect), no Seeds in research, persists through Replant,
# fair migration (Seed refund), new hooks (offline cap, power, order pay), mobile tree UI, multi-run pacing sim, phones, snapshot.
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
LAB="S.coins=1e12;S.totalEarned=1e12;TT.buyBuilding('sawmill',30);TT.buyBuilding('chipper',30);TT.buyBuilding('paper',10);TT.buyBuilding('lab',3);M=computeMods();"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,19),f"VERSION>=2.19 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,19),'sw cache bumped to >= v2.19')
    E(pg,CLEAN)
    r=E(pg,"({n:RNODES.length,br:[...new Set(RNODES.map(n=>n.b))].length,t:[1,2,3,4,5].map(t=>RNODES.filter(n=>n.t===t).length),rep:RNODES.filter(n=>n.rep).length,seeds:RNODES.filter(n=>n.seeds).length,ids:RNODES.map(n=>n.id).length===new Set(RNODES.map(n=>n.id)).size,req:RNODES.every(n=>n.req.every(r=>RNMAP[r]&&RNMAP[r].t<=n.t))})")
    ok(r['n']>=60 and r['br']==5 and min(r['t'])>=5 and r['rep']==5,f'~60+ nodes, 5 branches, 5 tiers, 5 repeatables ({r})')
    ok(r['seeds']==0 and r['ids'] and r['req'],'no Seed prices, unique ids, prerequisites never from a higher tier')
    ok(E(pg,"['science','blades','tar','pulp','bending','plywood','market','toys','drying','logistics','automation','boats','labx','master','genetics'].every(id=>!!RNMAP[id])"),'all 15 pre-v2.19 nodes still exist (saves stay valid)')
    # gating
    E(pg,LAB)
    r=E(pg,"(()=>{S.legacy=0;S.rp=1e9;const a=[tierOpen(1),tierOpen(2),canResearch('nightsh')];S.legacy=25;a.push(tierOpen(2),tierOpen(3));S.legacy=150;a.push(tierOpen(3),tierOpen(4));S.legacy=800;a.push(tierOpen(4),tierOpen(5));return a;})()")
    ok(r==[True,False,False,True,False,True,False,True,False],f'tiers open at Legacy 25 / 150 / 800, Tier V also needs a Lv 200 line ({r})')
    r=E(pg,"(()=>{S.legacy=3000;const a=tierOpen(5);S.buildings.sawmill.lvl=200;const b=tierOpen(5);S.buildings.sawmill.lvl=30;S.legacy=0;return [a,b]})()")
    ok(r==[False,True],f'Tier V: Legacy 2500 + a line at Lv 200 ({r})')
    r=E(pg,"(()=>{S.legacy=30;for(const id of ['science','firesci','labx','seedbank','felling','genetics','ergo']) S.research[id]=1;const a=gateOk(RNMAP.survey);S.collectors.drone=1;const b=gateOk(RNMAP.survey);S.collectors.drone=0;return [a,b,nodeWhy(RNMAP.survey)]})()")
    ok(r[0] is False and r[1] is True and 'Drone' in r[2],f'milestone gate (Aerial Survey needs a Drone Fleet) ({r})')
    E(pg,"S.research={};S.legacy=0;M=computeMods()")
    # costs
    r=E(pg,"(()=>{const c0=rpCost(RNMAP.blades);S.research.science=1;const c1=rpCost(RNMAP.blades);const t2=rpCost(RNMAP.nightsh)/RNMAP.nightsh.rp/(1+.06*resDone());return [c0,c1,t2]})()")
    ok(r[0]==30 and r[1]==round(30*1.06) and abs(r[2]-2)<0.01,f'cost = base × tier factor × (1 + 6 % per node done) ({r})')
    r=E(pg,"(()=>{S.research.r_sci=0;const n=RNMAP.r_sci,c=[];S.legacy=900;for(const id of ['firesci','labx','peer','nightsh','gridtune','procsim','labnet','matsci']) S.research[id]=1;S.buildings.lab.lvl=30;S.rp=1e12;const b0=(M=computeMods(),M.bldAll);for(let k=0;k<4;k++){c.push(rpCost(n));doResearch('r_sci');}M=computeMods();return {c,lv:resLvl('r_sci'),b:M.bldAll/b0,av:nodeAvail(n)}})()")
    c=r['c']; ok(r['lv']==4 and all(abs(c[i+1]/c[i]-1.6)<0.01 for i in range(3)) and r['av'],f'repeatable: levels stack, cost ×1.6 per level, stays available ({r})')
    ok(abs(r['b']-(1+.05*4**.7))<1e-6 and r['b']<1.2,f"repeatable effect has diminishing returns (+5 %·n^0.7 → ×{r['b']:.3f} at Lv 4)")
    # effects + hooks
    r=E(pg,"(()=>{S.research={nightsh:1,gridtune:1,orderdesk:1};M=computeMods();return [offCap()/3600,M.pw,M.orderPay]})()")
    ok(r==[10,1.25,1.2],f'Night Shift +2 h offline cap, Grid Tuning ×1.25 power boost, Order Desk +20 % order pay ({r})')
    r=E(pg,"(()=>{S.legacy=0;S.research={science:1};M=computeMods();const a=labRPmax();S.legacy=500;M=computeMods();const b=labRPmax();return [a,b,M.rep]})()")
    ok(r[1]/r[0]<r[2]**0.35 and r[1]>r[0],f'RP grows only ~rep^0.3 with the Legacy ({r})')
    # persists through Replant, no seeds spent
    r=E(pg,"(()=>{S.research={science:1,blades:1,r_sci:3};S.rp=1234;S.totalEarned=1e12;const s0=S.seeds;TT.doPrestige();return {r:S.research,rp:S.rp,lab:S.buildings.lab.lvl,g:S.seeds-s0}})()")
    ok(r['r']=={'science':1,'blades':1,'r_sci':3} and abs(r['rp']-1234)<1e-6 and r['lab']==0,f'research + RP kept through Replant, lab rebuilt ({r})')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # migration: v2.18 save that paid Seeds for Automation + Masterworks
    ctx,pg,errs,bad=page()
    o=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.18';o.seeds=7;o.legacy=120;o.research={science:1,blades:1,automation:1,master:1,genetics:1};o.lastSave=Date.now();return o;})()")
    init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(json.dumps(o))
    ctx.close(); ctx,pg,errs,bad=page(init=init)
    r=E(pg,"({s:S.seeds,L:S.legacy,r:Object.keys(S.research).sort(),v:S.version,bld:M.bldAll})")
    ok(r['s']==22 and r['L']==120 and r['r']==['automation','blades','genetics','master','science'],f'v2.18 save: nodes kept, 15 research Seeds refunded to the wallet, Legacy unchanged ({r})')
    E(pg,"localStorage.removeItem('timberTycoon_save_v1')")
    o['version']='2.17'; o.pop('legacy'); o['seeds']=7
    init='if(!sessionStorage.getItem("_n")){sessionStorage.setItem("_n","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(json.dumps(o))
    ctx.close(); ctx,pg,errs,bad=page(init=init)
    r=E(pg,"({s:S.seeds,L:S.legacy,old:S.oldRep})")
    ok(r['s']==22 and r['L']==22 and abs(r['old']-1.7)<1e-9,f'v2.17 save: Legacy = 7 held + 15 spent, Seeds refunded, run keeps its old ×1.7 ({r})')
    ok(not errs and not bad,f'migration: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # pacing sim
    ctx,pg,errs,bad=page(); E(pg,CLEAN+"localStorage.clear()"); pg.set_default_timeout(0)
    o={'runs':12,'maxMin':90,'hook':open(HERE+'/sim_v219_hook.js').read(),'extra':'({L:S.legacy,res:resDone(),pct:resDone()/resTotal(),rp:Math.round(S.rp)})'}
    runs=E(pg,'(%s)(%s)'%(open(HERE+'/sim_v218.js').read(),json.dumps(o)))
    for x in runs: print('  run',x['run'],x['min'],'min  L',x['x']['L'],' nodes',x['x']['res'],f"({x['x']['pct']*100:.0f}%)",' RP left',x['x']['rp'],flush=True)
    pc=[x['x']['pct'] for x in runs]
    ok(len(runs)==12,'sim: 12 Replants')
    ok(pc[4]<=0.35,f'sim: <= 35 % of the tree after 5 runs ({pc[4]*100:.0f}%)')
    ok(pc[5]>0,f'sim: research has started by run 6 ({pc[5]*100:.0f}%)')
    ok(pc[-1]<0.8 and all(pc[i+1]>=pc[i] for i in range(11)),f'sim: progress keeps growing and the tree is far from done after 12 runs ({pc[-1]*100:.0f}%)')
    ok(not errs,f'sim: no errors ({errs[:3]})'); ctx.close()
    # phones
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev); E(pg,CLEAN+LAB+"S.rp=1e4;S.legacy=30;M=computeMods();"); E(pg,"TT.openResearch()"); pg.wait_for_timeout(500)
        h=E(pg,"[...document.querySelectorAll('#rndRes .rb')].map(b=>b.getBoundingClientRect().height)")
        ok(len(h)==5 and min(h)>=44,f'{dev}: 5 branch chips >= 44 px ({h})')
        ok(E(pg,"document.querySelector('.rbranch').scrollWidth<=document.getElementById('rndRes').clientWidth+1"),f'{dev}: branches fit the width')
        E(pg,"document.querySelector('#rndRes .rb[data-b=for]').click()"); pg.wait_for_timeout(200)
        nh=E(pg,"[...document.querySelectorAll('#rndRes .rn')].map(b=>b.getBoundingClientRect().height)")
        ok(nh and min(nh)>=44 and E(pg,"[...document.querySelectorAll('#rndRes .rn')].every(e=>RNMAP[e.dataset.id].b==='for')"),f'{dev}: branch tab shows its nodes, rows >= 44 px')
        E(pg,"S.research.science=1;resSel='seedbank';resSig='';updateResearchUI()"); pg.wait_for_timeout(200)
        pg.locator('#resBuy').click(); pg.wait_for_timeout(200)
        ok(E(pg,"hasRes('seedbank')"),f'{dev}: tapping Research researches the node')
        ok(E(pg,"document.documentElement.scrollWidth<=innerWidth+1"),f'{dev}: no horizontal overflow')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.19'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.19/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.19' and E(pg,'RNODES.length')>=60 and not errs and not bad,'releases/v2.19/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.19/ not yet built')
    br.close()
print('ALL PASS 0 []' if not FAILS else f'FAILS {len(FAILS)} {FAILS}')
sys.exit(1 if FAILS else 0)
