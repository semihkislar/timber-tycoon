# v2.20.1: logs are raw material only. No market sell, no auto-sell, no shipping/contract/order/daily/trade demand for logs,
# no Supply Flow arc from the yard to the dock. Log Yard capacity (collectors idle when full, shown in HUD/Market/attention),
# first Sawmill built with logs + free first Lumberjack (no soft-lock with 0 coins), fresh/idle/after-Replant sims, old-save migration, tier texts, phones.
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
MID="S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,30);S.premium.lvl=1;for(const b of PREM_BLD) TT.buyBuilding(b.id,5);M=computeMods();TT.simulate(20);"
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(URL); pg.wait_for_timeout(1500); return ctx,pg,errs
    ctx,pg,errs=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,20,1),f"VERSION>=2.20.1 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,20,1),'sw cache bumped')
    # --- the first Sawmill is built with logs, the first Lumberjack is free: no soft-lock with 0 coins ---
    r=E(pg,"({c:S.coins,saw:S.buildings.sawmill.lvl,lj:S.collectors.lumberjack,as:S.autosell.logs,need:SAW_LOGS,cc:colCost('lumberjack',0,1),cc2:colCost('lumberjack',1,1)})")
    ok(r['saw']==0 and r['c']==0 and r['lj']==0,f'fresh game: 0 coins, no Sawmill, no Lumberjack ({r})')
    ok(r['as'] is False,'fresh game: logs have no auto-sell')
    ok(30<=r['need']<=60 and r['cc']==0 and r['cc2']>0,f"first Sawmill costs {r['need']} logs; first Lumberjack is free, the second is not ({r['cc']} / {r['cc2']:.0f})")
    E(pg,"openSheet('crew')"); pg.wait_for_timeout(300)
    t=pg.locator('#colList .card button').first.inner_text(); ok('Free' in t and not pg.locator('#colList .card button').first.is_disabled(),f'crew card: the first Lumberjack reads Free ({t!r})')
    pg.locator('#colList .card button').first.click(); pg.wait_for_timeout(150); ok(E(pg,'S.collectors.lumberjack')==1 and E(pg,'S.coins')==0,'free Lumberjack hired with 0 coins')
    E(pg,"closeSheet();S.res.logs=0;openSheet('bld','sawmill')"); pg.wait_for_timeout(400)
    r=E(pg,"({t:document.getElementById('bpBuy').innerText,d:document.getElementById('bpBuy').disabled,m:document.getElementById('bpMax').disabled})")
    ok('logs' in r['t'] and f"/ {E(pg,'SAW_LOGS')}" in r['t'] and r['d'] and r['m'],f"sheet: 'Build 🪵 x / N logs', disabled until enough logs, Max off ({r})")
    E(pg,"S.res.logs=SAW_LOGS/2"); pg.wait_for_timeout(400)
    ok(48<=float(E(pg,"document.getElementById('bpPbar').style.width")[:-1])<=56,f"sheet progress bar follows the log stock ({E(pg,'document.getElementById(\"bpPbar\").style.width')})")
    pg.screenshot(path=ROOT+'/screenshot-v2201-sawmill-logs.png')
    E(pg,"closeSheet();S.res.logs=0;TT.fitCamera(true)"); pg.wait_for_timeout(900)
    pt=E(pg,"TT.lotScreen('sawmill')"); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(200)
    ok(E(pg,"S.buildings.sawmill.lvl")==0,'tapping the lot with too few logs does not build')
    E(pg,"closeSheet();TT.fitCamera(true);S.res.logs=SAW_LOGS+5"); pg.wait_for_timeout(900); pt=E(pg,"TT.lotScreen('sawmill')"); pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(200)
    r=E(pg,"({l:S.buildings.sawmill.lvl,logs:S.res.logs,c:S.coins})")
    ok(r['l']==1 and r['logs']<8 and r['c']<10,f'tapping the lot with enough logs builds the Sawmill for logs, no coins ({r})')
    ok(E(pg,"sawByLogs()")==False and E(pg,"bulkCost(BMAP.sawmill.cost,BMAP.sawmill.scale,1,1)")>0,'the next Sawmill levels cost coins as usual')
    E(pg,"closeSheet()")
    # --- no path sells logs ---
    E(pg,CLEAN+"S.buildings.sawmill.on=false;S.res.logs=500;S.autosell.logs=true;S.coins=0;TT.simulate(10)")
    r=E(pg,"({logs:S.res.logs,c:S.coins,s:TT.rates.logs.s,v:sellAll('logs'),can:canSell('logs'),sv:saleValue('logs')})")
    ok(r['logs']>=500 and r['s']==0 and r['v']==0 and r['c']<1e-6 and r['can'] is False and r['sv']==0,f'logs are never sold: auto-sell forced on, Sell all → 0 ({r})')
    ok(E(pg,"RES.filter(r=>r.id!=='logs').every(r=>canSell(r.id))"),'every other good still sells')
    E(pg,"(()=>{"+MID+"})()"); E(pg,CLEAN)
    r=E(pg,"""(()=>{const L=[];for(let i=0;i<300;i++){const o=makeOrder();if(o) L.push(o.item||o.res);}
      const D=[];for(let i=0;i<300;i++){const o=makeDailyContract(DAILY_DIFFS[i%3],new Set());if(o) D.push(o.item||o.res);}
      const X=[];S.autosell.logs=true;TT.rates.logs.s=50;for(let i=0;i<300;i++){const o=shMakeOffer();if(o) X.push(o.res);}
      return {o:L.includes('logs'),d:D.includes('logs'),x:X.includes('logs'),n:[L.length,D.length,X.length],sh:shProducts().some(r=>r.id==='logs'),
        tg:tradeGoods().some(r=>r.id==='logs'),dis:dispatch(CITIES[0].id,'logs',true),cl:CLIENTS.some(c=>c.likes.includes('logs'))};})()""")
    ok(not r['o'] and not r['d'] and not r['x'] and min(r['n'])>50,f"no client order, daily contract or export contract asks for logs ({r['n']})")
    ok(not r['sh'] and not r['tg'] and r['dis'] is False and not r['cl'],f'logs are not a shipping product, trade good or client favourite ({r})')
    E(pg,"TT.simulate(5)")
    r=E(pg,"flowEdges().filter(e=>e.to==='dock').map(e=>e.k)")
    ok('logs' not in r and len(r)>0,f'Supply Flow: no logs arc to the dock ({r})')
    r=E(pg,"flowEdges().some(e=>e.from==='yard'&&e.k==='logs')"); ok(r,'Supply Flow still shows logs going from the yard into the mills')
    # --- texts ---
    r=E(pg,"[TIER_D[0],TIER_D[1]]"); ok('not for sale' in r[0] and 'exports start here' in r[1],f'tier texts: raw logs not for sale, exports from Phase 1 up ({r})')
    E(pg,"openSheet('market')"); pg.wait_for_timeout(500)
    r=E(pg,"(()=>{const t=document.querySelector('#mktBody tr[data-id=logs]');const o=document.querySelector('#mktBody tr[data-id=planks]');return {raw:t&&t.innerText,btn:t&&!!t.querySelector('button,input'),ob:o&&!!o.querySelector('button')&&!!o.querySelector('input')};})()")
    ok(r['raw'] and 'not for sale' in r['raw'] and not r['btn'] and r['ob'],f'Market: logs row has no Sell / auto-sell, shows the Log Yard; planks keep both ({r})')
    E(pg,"closeSheet();openSheet('bld','sawmill')"); pg.wait_for_timeout(400)
    t=pg.locator('#bpMargin').inner_text(); ok("can't be sold" in t,f'Phase-1 sheet: margin says logs can\'t be sold ({t[:90]})')
    E(pg,"closeSheet()"); ok(not errs,f'no errors ({errs[:3]})'); ctx.close()
    # --- Log Yard capacity: collectors go idle, nothing is sold or wasted silently ---
    ctx,pg,errs=page(); E(pg,CLEAN+"TT.setWeather('clear',1e6);S.wx.next=1e9;S.coins=1e9;TT.buyBuilding('sawmill',1);TT.buyCollector('lumberjack',60);TT.buyCollector('chainsaw',20);S.buildings.sawmill.on=false;S.planters.planter=50;M=computeMods();")
    E(pg,"TT.simulate(400)"); pg.wait_for_timeout(1500); E(pg,"TT.checkAch&&TT.checkAch(true);M=computeMods();TT.simulate(90)"); pg.wait_for_timeout(300)   # trophies raise the log rate (and the cap) once; let it settle
    r=E(pg,"({l:S.res.logs,cap:logCap(),y:yardRun(),f:yardFull(),D:S.forest.D,p:TT.rates.logs.p,hud:document.getElementById('hLogs').textContent,att:TT.attentionList().map(a=>a.t).filter(t=>t.includes('Log Yard')).length,c:S.coins})")
    ok(abs(r['l']-r['cap'])<r['cap']*0.01 and r['f'] and r['y']<0.1,f"full Log Yard: stock stops at the cap, collectors idle ({r['l']:.0f}/{r['cap']:.0f}, run {r['y']:.2f})")
    ok(r['D']<1 and r['p']<1,f"idle collectors fell no trees and add no logs (fell {r['D']:.2f}, +{r['p']:.2f}/s)")
    ok(r['hud']=='Yard full' and r['att']==1,f"shown clearly: HUD '{r['hud']}', attention item ({r['att']})")
    n=E(pg,"chop()"); ok(n==0 and E(pg,"S.res.logs")<=E(pg,"logCap()")+1e-6,'chopping into a full yard adds nothing')
    E(pg,"S.buildings.sawmill.on=true;TT.buyBuilding('sawmill',60);M=computeMods();TT.simulate(60)")
    ok(not E(pg,"yardFull()") and E(pg,"TT.rates.logs.p")>1,'once the mills use logs again, the collectors go back to work')
    E(pg,"openSheet('market')"); pg.wait_for_timeout(300); ok('Log Yard' in E(pg,"document.querySelector('#mktBody tr[data-id=logs]').innerText"),'Market row shows Log Yard fill'); ctx.close()
    # --- sims: a fresh game and a run after Replant never soft-lock, even with no taps at all ---
    def sim(pg,clicks,label):
        out=[]
        for seg in [30,30,60,120,60]:
            out.append(E(pg,f"(()=>{{runBot({seg},{clicks},{seg});return [Math.round(S.playTime),S.totalEarned,S.buildings.sawmill.lvl,S.collectors.lumberjack,TT.coinRate,S.prestiges]}})()"))
        print('   '+label,[[o[0],round(o[1]),o[2],o[3],round(o[4],1)] for o in out]); return out
    ctx,pg,errs=page(); pg.add_script_tag(path=HERE+'/bot.js'); out=sim(pg,3,'fresh+taps')
    ok(out[0][2]>=1,f'sim (taps): Sawmill built within 30 s ({out[0]})')
    ok(out[1][1]>100,f'sim (taps): planks earn coins in the first minute ({out[1][1]:.0f})')
    ok(out[4][1]>2e4 and out[3][3]>=5,f'sim (taps): the run is moving after 5 min ({out[4][1]:.0f} earned)')
    ok(not errs,f'sim: no errors ({errs[:3]})'); ctx.close()
    ctx,pg,errs=page(); pg.add_script_tag(path=HERE+'/bot.js'); out=sim(pg,0,'fresh idle')
    ok(out[1][2]>=1 and out[1][1]>0,f'sim (no taps at all): free Lumberjack → Sawmill from logs within 60 s → coins ({out[1]})')
    ok(out[4][1]>1e3,f'sim (no taps): 5 min earnings ({out[4][1]:.0f})'); ctx.close()
    ctx,pg,errs=page(); pg.add_script_tag(path=HERE+'/bot.js')
    E(pg,CLEAN+"S.coins=1e12;S.totalEarned=5e9;S.lifetimeEarned=5e9;for(const c of COLLECTORS) TT.buyCollector(c.id,40);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,40);rpTick();")
    E(pg,"doPrestige()"); E(pg,CLEAN)
    r=E(pg,"({p:S.prestiges,c:S.coins,saw:S.buildings.sawmill.lvl,lj:S.collectors.lumberjack,cs:cs(),need:SAW_LOGS})")
    ok(r['p']==1 and r['saw']==0 and r['cs']>1,f'after Replant: no Sawmill, costs scaled ×{r["cs"]:.1f}, Sawmill still {r["need"]} logs (flat) ({r})')
    out=sim(pg,0,'after Replant, idle')
    ok(out[1][2]>=1 and out[2][1]>0,f'sim after Replant (no taps): Sawmill from logs within 60 s and income ({out[1]})'); ok(not errs,f'replant sim: no errors ({errs[:3]})'); ctx.close()
    # --- migration: a v2.20 save with log stock + log auto-sell ---
    ctx,pg,errs=page(); E(pg,CLEAN+"S.coins=1e6;TT.buyBuilding('sawmill',10);")
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.20';o.res.logs=987654;o.autosell.logs=true;return JSON.stringify(o);})()")
    ctx.close()
    ctx,pg,errs=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    r=E(pg,"({v:S.version,l:S.res.logs,a:S.autosell.logs,saw:S.buildings.sawmill.lvl})")
    ok(r['a'] is False and r['l']>=987000 and r['saw']==10,f'v2.20 save: log stock kept as raw stock, auto-sell off ({r})')
    E(pg,CLEAN+"S.buildings.sawmill.on=false;const c0=S.coins;TT.simulate(5);window.__c=S.coins-c0")
    ok(E(pg,"S.res.logs")>=987000 and E(pg,"TT.rates.logs.s")==0,'old over-cap log stock is not sold or wiped')
    ok(not errs,f'migration: no errors ({errs[:3]})'); ctx.close()
    # --- phones: market logs row fits ---
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs=page(dev); E(pg,CLEAN+"S.coins=1e6;TT.buyBuilding('sawmill',5);TT.simulate(5);openSheet('market')"); pg.wait_for_timeout(700)
        r=E(pg,"(()=>{const t=document.querySelector('#mktBody tr[data-id=logs]').getBoundingClientRect(),b=document.getElementById('shBody');return {w:t.right,W:innerWidth,sc:b.scrollWidth<=b.clientWidth+1}})()")
        ok(r['w']<=r['W']+1 and r['sc'],f'{dev}: logs row fits, no sideways scroll ({r})')
        if dev=='iPhone 13': pg.screenshot(path=ROOT+'/screenshot-v2201-mobile-market.png')
        ok(not errs,f'{dev}: no errors ({errs[:3]})'); ctx.close()
    br.close()
print('ALL PASS' if not FAILS else 'FAILS', len(FAILS), FAILS)
sys.exit(1 if FAILS else 0)
