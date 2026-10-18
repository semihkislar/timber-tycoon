# v2.18: Replant 2.0 — Forest Legacy (sqrt-ish, never lowered by spending), Seeds as a shop currency, Seed Shop, run goals,
# forest-value cost scaling (no more "hundreds of free levels" after a Replant), advice/ideal-time hint, confirm sheet (resets vs stays),
# fair migration of pre-v2.18 saves, multi-run pacing sim, phones, snapshot.
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
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text)); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,18),f"VERSION>=2.18 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,18),'sw cache bumped to >= v2.18')
    ok('js/replant.js' in open(ROOT+'/index.html').read() and E(pg,'typeof rpConfirm')=='function','replant.js is loaded')
    E(pg,CLEAN)
    # fresh game
    r=E(pg,'({L:S.legacy,s:S.seeds,cs:cs(),lm:legacyMult(),g:pendingSeeds(),adv:rpAdvice().k,shop:JSON.stringify(S.shop)})')
    ok(r['L']==0 and r['s']==0 and r['cs']==1 and r['lm']==1 and r['g']==0 and r['adv']=='wait' and r['shop']=='{}',f'fresh game: no legacy, cost scale 1, advice "wait" ({r})')
    # gain formula: sqrt-ish (exponent 0.4) above 1e7 x forest value, x goal bonus
    r=E(pg,'({a:seedsRaw(9.9e6),b:seedsRaw(1e7),c:seedsRaw(1e9),d:seedsRaw(1e11)})')
    ok(r['a']==0 and abs(r['b']-3)<1e-9 and abs(r['c']/r['b']-100**.4)<1e-6 and abs(r['d']/r['c']-100**.4)<1e-6,f'gain = 3*(E/1e7cs)^0.4, zero below the threshold ({r})')
    r=E(pg,'(()=>{S.runCS=4;const x={raw:seedsRaw(4e7),c:bulkCost(100,1.15,0,1),u:upCost(UPGRADES[0])/UPGRADES[0].cost,t:treeCost(TREES[1])/TREES[1].cost};S.runCS=1;return x;})()')
    ok(abs(r['raw']-3)<1e-9 and abs(r['c']-400)<1e-6 and abs(r['u']-4)<1e-9 and abs(r['t']-4)<1e-9,f'forest value scales threshold, building, upgrade and tree costs ({r})')
    ok(E(pg,'Math.abs(legacyOf(100)-(1+.1*Math.pow(100,.8)))<1e-9 && legacyOf(400)/legacyOf(100)<3'),'Legacy multiplier 1+0.1*L^0.8: growing but sub-linear')
    # shop
    r=E(pg,'''(()=>{S.seeds=10;const L0=S.legacy;const c=shopCost('soil');const okb=buyShop('soil');const after={s:S.seeds,lv:shopLvl('soil'),L:S.legacy,c0:c,c1:shopCost('soil')};
      S.seeds=0;after.poor=buyShop('soil');S.seeds=1e9;after.charter=shopAvail('charter');S.shop.soil=25;after.max=buyShop('soil');S.shop.soil=after.lv;M=computeMods();after.prod=M.prodShop;after.L0=L0;after.okb=okb;S.seeds=0;return after;})()''')
    ok(r['okb'] and r['lv']==1 and r['s']==10-r['c0'] and r['c1']>r['c0'] and r['L']==r['L0'],f'buying a shop level spends Seeds, raises the price, never lowers the Legacy ({r})')
    ok(r['poor'] is False and r['max'] is False and r['charter'] is False and abs(r['prod']-1.25)<1e-9,f'shop: no buy when poor / at max, Charter locked before 2 Replants, Fertile Soil +25% ({r})')
    # goals
    r=E(pg,'(()=>{S.totalEarned=2e5;goalTick();return {d:goalsDone(),m:gainMult(),n:GOALS.length}})()')
    ok(r['n']>=10 and r['d']>=1 and abs(r['m']-(1+.08*r['d']))<1e-9,f'run goals tick and add +8% gain each ({r})')
    # prestige keep / reset
    r=E(pg,'''(()=>{S.coins=1e9;S.totalEarned=4e9;for(const c of COLLECTORS) TT.buyCollector(c.id,20);TT.buyBuilding('sawmill',20);S.research=Object.assign(S.research||{},{x_test:1});S.station={lvl:2};
      S.shop={soil:1,money:2};const g=pendingSeeds(),L0=S.legacy,s0=S.seeds;const okp=TT.doPrestige();const pw=runScaleFor();
      return {okp,g,L:S.legacy,L0,s:S.seeds,s0,saw:S.buildings.sawmill.lvl,lj:S.collectors.lumberjack,res:!!S.research.x_test,st:S.station.lvl,shop:S.shop.soil,cs:S.runCS,pw,coins:S.coins,
        exp:seedMoney(2)*S.runCS,pr:S.prestiges,runs:S.rpStats.runs.length,goals:goalsDone(),old:S.oldRep};})()''')
    ok(r['okp'] and r['g']>=3 and r['L']==r['L0']+r['g'] and r['s']==r['s0']+r['g'] and r['pr']==1,f'Replant adds the gain to Legacy and Seeds ({r})')
    ok(r['saw']==0 and r['lj']==0 and r['res'] and r['st']==2 and r['shop']==1 and r['goals']==0 and not r['old'],f'Replant resets buildings/collectors/goals, keeps research, station, shop ({r})')
    ok(r['cs']>1 and abs(r['cs']-r['pw'])<1e-9 and abs(r['coins']-r['exp'])<1e-6*r['exp'] and r['runs']==1,f'new run priced at the forest value, Seed Money scaled, run logged ({r})')
    # UI: tabs, shop, goals, confirm sheet
    E(pg,"S.totalEarned=Math.max(S.totalEarned,1e9*cs());rpTick();"+CLEAN); E(pg,"TT.openSheet('co')"); pg.wait_for_timeout(500)
    t=pg.locator('#rpReplant').inner_text(); ok('Legacy' in t and 'Seeds' in t,'Replant tab shows Legacy and Seeds')
    E(pg,"rpTabOpen('shop')"); pg.wait_for_timeout(300)
    ok(pg.locator('#rpShopList [data-buy]').count()>=8,'Seed Shop lists its items')
    E(pg,"rpTabOpen('goals')"); pg.wait_for_timeout(300)
    ok(pg.locator('#rpGoalList').inner_text().count('%')>=10,'Goals tab lists the run goals')
    E(pg,"rpTabOpen('replant')"); pg.wait_for_timeout(300)
    pg.click('#prestigeBtn'); pg.wait_for_timeout(400)
    t=pg.locator('.modal').inner_text(); ok('Resets' in t and 'Stays' in t and 'Research' in t and 'Legacy' in t,'confirm sheet shows what resets and what stays')
    pg.locator('.modal button.wood').click(); pg.wait_for_timeout(200)
    ok(E(pg,'S.prestiges')==1,'cancel keeps the run')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # migration of a v2.17 save: legacy = seeds held + seeds spent; the current run keeps the old bonus
    ctx,pg,errs,bad=page()
    o=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.17';delete o.legacy;delete o.shop;delete o.run;delete o.rpStats;delete o.runCS;o.seeds=20;o.prestiges=3;
      o.research=Object.assign({},o.research,{automation:1});o.totalEarned=5e8;o.lastSave=Date.now();return o;})()''')
    sp=E(pg,"OLD_RES_SEEDS.automation")
    init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(json.dumps(o))
    ctx.close(); ctx,pg,errs,bad=page(init=init)
    r=E(pg,'({L:S.legacy,s:S.seeds,old:S.oldRep,rep:M.legacy,cs:cs(),mig:S.rpStats.migrated,v:S.version})')
    ok(r['L']==20+sp and r['s']==20+sp and abs(r['old']-3)<1e-9 and abs(r['rep']-3)<1e-9 and r['cs']==1,f'v2.17 save: Legacy = seeds + spent ({20+sp}), Seeds refunded (v2.19), run keeps its old ×3 bonus, costs unscaled ({r})')
    r=E(pg,CLEAN+'S.totalEarned=Math.max(S.totalEarned,1e9);TT.doPrestige();({L:S.legacy,old:S.oldRep,rep:M.legacy,lm:legacyMult()})')
    ok(not r['old'] and abs(r['rep']-r['lm'])<1e-9 and r['lm']>3,f'after the first Replant the migrated save uses the Legacy curve (no drop) ({r})')
    ok(not errs and not bad,f'migration: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    # pacing sim: greedy player over 8 runs
    ctx,pg,errs,bad=page(); E(pg,CLEAN); pg.set_default_timeout(0)
    o={'runs':8,'maxMin':90,'hook':open(HERE+'/sim_v218_hook.js').read(),'extra':'({L:S.legacy,cs:+S.runCS.toPrecision(3)})'}
    runs=E(pg,'(%s)(%s)'%(open(HERE+'/sim_v218.js').read(),json.dumps(o)))
    for x in runs: print('  run',x['run'],x['min'],'min gain',x['gain'],'L',x['x']['L'],'cs',x['x']['cs'],'lv60s',x['lv60s'],'rMed',x['rMed'],'saw',x['saw'],flush=True)
    ok(len(runs)==8 and all('note' not in x for x in runs),'sim: 8 Replants completed')
    ok(all(10<=x['min']<=90 for x in runs),f"sim: every run lasts 10-90 min ({[x['min'] for x in runs]})")
    ok(all(x['lv60s']<=120 for x in runs),f"sim: no flood of free levels in the first minute ({[x['lv60s'] for x in runs]})")
    ok(all(x['rMed']>=1 for x in runs[1:]),f"sim: the cheapest building still costs >= 1 s of income after a Replant ({[x['rMed'] for x in runs]})")
    g=[x['gain'] for x in runs]; ok(g[-1]>2*g[0] and sum(g[4:])>sum(g[:4]),f'sim: gain per run grows over the runs ({g})')
    Ls=[x['x']['L'] for x in runs]; ok(all(Ls[i+1]>Ls[i] for i in range(len(Ls)-1)),f'sim: Legacy rises every Replant ({Ls})')
    ok(runs[-1]['saw']>runs[0]['saw'],'sim: later runs get deeper')
    ok(not errs and not bad,f'sim: no errors ({errs[:3]})'); ctx.close()
    # phones
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev); E(pg,CLEAN+'S.seeds=50;S.legacy=50;S.prestiges=2;M=computeMods();'); E(pg,"TT.openSheet('co')"); pg.wait_for_timeout(500)
        h=E(pg,"[...document.querySelectorAll('#rpTabs button')].map(b=>b.getBoundingClientRect().height)")
        ok(len(h)==3 and min(h)>=44,f'{dev}: three Replant tabs, >=44 px ({h})')
        E(pg,"rpTabOpen('shop')"); pg.wait_for_timeout(300)
        bh=E(pg,"[...document.querySelectorAll('#rpShopList [data-buy]')].map(b=>b.getBoundingClientRect().height)")
        ok(bh and min(bh)>=44,f'{dev}: shop buttons >=44 px')
        w=E(pg,'document.documentElement.scrollWidth<=innerWidth+1'); ok(w,f'{dev}: no horizontal overflow')
        pg.locator('#rpShopList [data-buy]').first.click(); pg.wait_for_timeout(300)
        ok(E(pg,'S.seeds')<50,f'{dev}: tapping a shop item buys it')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})'); ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.18'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.18/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.18' and E(pg,'typeof rpConfirm')=='function' and not errs and not bad,'releases/v2.18/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.18/ not yet built')
    br.close()
print('ALL PASS 0 []' if not FAILS else f'FAILS {len(FAILS)} {FAILS}')
sys.exit(1 if FAILS else 0)
