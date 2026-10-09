# v2.2 tests: premium factory area, client orders, stock areas (capacity / FULL / upgrades), v2.1 save migration
import math
from playwright.sync_api import sync_playwright
URL='file:///workspace/lumber-idle/lumber-idle.html'
OLD='file:///workspace/lumber-idle/releases/timber-tycoon-v2.1.html'
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg)
    if not c: FAILS.append(msg)
MID='''(()=>{TT.S.coins=1e15;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",30);TT.buyCollector("truck",20);TT.buyCollector("harvester",10);
for(const [b,n] of [["sawmill",70],["chipper",40],["kiln",40],["carpentry",30],["pellet",30],["paper",20],["furniture",12]]) TT.buyBuilding(b,n);TT.S.coins=1e9;TT.simulate(3);})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def watch(pg):
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    # --- v2.1 save migration ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg)
    pg.goto(OLD); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.VERSION')=='2.1','old build is v2.1')
    pg.evaluate('(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",25);TT.buyBuilding("sawmill",30);TT.buyBuilding("kiln",6);TT.S.golden=4;TT.S.autosell.planks=false;TT.save(true);})()')
    old=pg.evaluate('JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(900)
    S=pg.evaluate('TT.S')
    ok(S['version']>='2.2','v2.1 save migrated to 2.2+')
    ok(S['collectors']==old['collectors'] and S['buildings']['sawmill']['lvl']==30 and S['buildings']['kiln']['lvl']==6 and S['golden']==4 and S['autosell']['planks']==False,'collectors, buildings, golden, autosell kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.02,'coins kept')
    ok(S['premium']['lvl']==0 and S['storage']=={} and S['orders']['done']==0 and S['orders']['offer'] is None,'new v2.2 fields initialised (premium locked, storage Lv0, no orders)')
    ok(all(S['buildings'][k]['lvl']==0 for k in ['atelier','parquet','stationer','cabinetry','showroom']) and S['autosell']['luxfurn']==True,'premium buildings + resources added')
    ctx.close()
    # --- fresh game: early game is not frustrating (no FULL with default auto-sell) ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400)
    pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js'); pg.evaluate('runBot(240,3,240)')
    full=pg.evaluate('Object.entries(TT.bstat).filter(([k,v])=>v.full).map(([k])=>k)')
    ok(full==[],f'early game with auto-sell: no building is ever FULL ({full})')
    ok(pg.locator('#bottombar .bb').count()>=7 and pg.locator('#bbOrd').count()==1,'Orders button in the bottom bar (7+ buttons)')
    ok(pg.evaluate('TT.S.orders.offer!==null||TT.S.orders.next>0'),'order schedule running')
    ctx.close()
    # --- mid game ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg); pg.goto(URL); pg.wait_for_timeout(400); pg.evaluate(MID); pg.wait_for_timeout(300)
    pg.evaluate('document.querySelectorAll(".toast").forEach(t=>t.remove())')
    # premium area: locked -> unlock
    ok(pg.evaluate('TT.buyBuilding("atelier",1)')==False,'premium workshop cannot be built while the area is locked')
    pt=pg.evaluate('TT.premScreen()'); h=pg.evaluate(f'TT.hitTest({pt[0]},{pt[1]})')
    ok(h['type']=='prem',f'tapping the premium plot hits the premium area ({h})')
    pg.mouse.click(pt[0],pt[1]); pg.wait_for_timeout(500)
    ok(pg.evaluate('TT.curSheet')=='prem' and pg.locator('#pmBuy').is_visible(),'premium sheet opens with the unlock button')
    c0=pg.evaluate('TT.S.coins'); cost=pg.evaluate('TT.premCost()')
    pg.click('#pmBuy'); pg.wait_for_timeout(500)
    ok(pg.evaluate('TT.S.premium.lvl')==1 and pg.evaluate('TT.S.coins')<c0-cost*0.5,f'premium area unlocked for {cost:.0f} coins')
    ok(pg.evaluate('!!TT.S.ach.premium')or pg.evaluate('(TT.checkAch(true),!!TT.S.ach.premium)'),'"Haute Bois" trophy')
    for bid in ['atelier','parquet','stationer','cabinetry','showroom']: pg.evaluate(f'TT.buyBuilding("{bid}",3)')
    ok(all(pg.evaluate(f'TT.S.buildings.{k}.lvl')==3 for k in ['atelier','parquet','stationer','cabinetry','showroom']),'all 5 premium workshops built')
    pg.evaluate('TT.simulate(20)'); pg.wait_for_timeout(1200)
    prod=pg.evaluate('Object.fromEntries(["giftbox","flooring","stationery","cabinets","luxfurn"].map(k=>[k,TT.rates[k].p]))')
    ok(all(v>0 for v in prod.values()),f'premium goods are produced {prod}')
    ok(pg.evaluate('TT.rates.luxfurn.s')>0,'premium goods are sold')
    ok(pg.evaluate('!!TT.LOTS.showroom.hit && !!TT.LOTS.atelier.top'),'premium workshops drawn in the world')
    sp=pg.evaluate('(()=>{const p=TT.P(TT.LOTS.showroom.ci,TT.LOTS.showroom.cj,20);return TT.w2s(p[0],p[1]);})()')
    pg.evaluate('TT.closeSheet()'); pg.wait_for_timeout(300)
    h=pg.evaluate(f'TT.hitTest({sp[0]},{sp[1]})'); ok(h['type']=='bld' and h['id']=='showroom',f'tapping a premium workshop hits it ({h})')
    ok(pg.evaluate('(TT.scene.premTrucks||[]).length')>=1 and pg.evaluate('!!TT.scene.pfork'),'premium dock truck and premium forklift active')
    lv0=pg.evaluate('TT.price("luxfurn")'); pg.evaluate('TT.S.coins=1e12;TT.buyPremium()'); lv1=pg.evaluate('TT.price("luxfurn")')
    ok(abs(lv1/lv0-1.25)<1e-6,'showroom Lv2 raises premium prices by 25%')
    # --- storage: capacity, FULL, upgrade ---
    pg.evaluate('TT.S.autosell.charcoal=false;TT.S.res.charcoal=0;for(const k of TT.PREM_BLD) TT.S.buildings[k.id].on=false')
    cap=pg.evaluate('TT.stockCaps().charcoal')
    ok(cap>0 and cap<1e30,f'charcoal stock capacity is finite ({cap:.0f})')
    pg.evaluate('TT.S.res.charcoal=TT.stockCaps().charcoal*.995;TT.simulate(3)')
    st=pg.evaluate('({b:TT.bstat.kiln,res:TT.S.res.charcoal,cap:TT.stockCaps().charcoal})')
    ok(st['b']['full']=='charcoal' and st['b']['f']<0.02,f'output full -> production pauses ({st["b"]})')
    ok(abs(st['res']-st['cap'])/st['cap']<0.01,'stock clamps at capacity')
    pg.evaluate("TT.openSheet('bld','kiln')"); pg.wait_for_timeout(300); pg.evaluate('TT.S.res.charcoal=TT.stockCaps().charcoal;TT.simulate(.5);TT.render()')
    chip=pg.locator('#bpStChip').inner_text(); stat=pg.locator('#bpChip').inner_text()
    ok('FULL' in chip and 'FULL' in stat,f'building sheet shows FULL ({chip} | {stat})')
    ok(pg.locator('#bpStBuy').is_visible() and pg.locator('#bpStKeep').is_checked(),'storage upgrade button + "keep stock" toggle')
    c0=pg.evaluate('TT.S.coins'); sc=pg.evaluate('TT.stoCost("kiln")'); pg.click('#bpStBuy'); pg.wait_for_timeout(300)
    ok(pg.evaluate('TT.stoLvl("kiln")')==1 and pg.evaluate('(()=>{const c=TT.S.coins,k=TT.stoCost("chipper");TT.buyStorage("chipper");return Math.abs(c-k-TT.S.coins)<1e-6*c&&TT.stoLvl("chipper")===1})()'),'storage upgraded to Lv1 for its cost')
    cap2=pg.evaluate('TT.stockCaps().charcoal'); ok(cap2>st['cap']*2.05,f'capacity more than doubled (x{cap2/st["cap"]:.2f}: 2x seconds and +10% speed)')
    pg.evaluate('TT.simulate(2)'); ok(not pg.evaluate('TT.bstat.kiln.full') and pg.evaluate('TT.bstat.kiln.f')>0.2,'production resumes after the upgrade')
    pg.click('label:has(#bpStKeep)'); pg.wait_for_timeout(200); ok(pg.evaluate('TT.S.autosell.charcoal')==True,'"keep stock" toggle drives auto-sell')
    pg.evaluate('TT.simulate(3)'); ok(pg.evaluate('TT.S.res.charcoal')<st['cap']*.2,'auto-sell drains the stockpile')
    pg.evaluate('for(const k of TT.PREM_BLD) TT.S.buildings[k.id].on=true;TT.closeSheet()')
    # --- orders: offer -> accept -> collect -> deliver -> complete ---
    pg.evaluate('document.querySelectorAll(".toast").forEach(t=>t.remove())')
    pg.evaluate("TT.S.orders.offer=null;TT.S.orders.active=null;TT.offerOrder('paper')"); pg.wait_for_timeout(500)
    ok(pg.locator('#orderCard').is_visible() and pg.locator('#ocYes').is_visible(),'animated order card with Accept/Decline appears')
    ok(pg.locator('#ordDot').is_visible(),'Orders button shows a red dot while an offer waits')
    o=pg.evaluate('TT.S.orders.offer'); ok(o['amt']>0 and o['reward']>0 and o['dur']>=180 and o['client'],f'order has client/item/amount/timer/reward ({o["client"]}: {o["amt"]} {o["item"]} for {o["reward"]:.0f})')
    for _ in range(50):
        if pg.evaluate('!!TT.scene.client && TT.scene.client.fig>0'): break
        pg.wait_for_timeout(500)
    ok(pg.evaluate('!!TT.scene.client && TT.scene.client.fig>0'),'client van parked at the premium gate with the client figure')
    pg.click('#ocYes'); pg.wait_for_timeout(300)
    ok(pg.evaluate('!!TT.S.orders.active && !TT.S.orders.offer'),'order accepted')
    pg.evaluate('TT.simulate(5)'); g=pg.evaluate('TT.S.orders.active.got'); ok(g>0,f'active order collects surplus production ({g:.0f})')
    pg.evaluate('TT.ordTab="clients"')  # v2.6 added a Daily tab
    pg.click('#bbOrd'); pg.wait_for_timeout(400)
    ok(pg.evaluate('TT.curSheet')=='ord' and pg.locator('#opBar').count()==1,'Orders panel with progress bar')
    c0,rw=pg.evaluate('(()=>{const r=[TT.S.coins,TT.S.orders.active.reward];TT.S.autosell.paper=false;TT.S.res.paper=TT.S.orders.active.amt*2;return r})()')
    pg.wait_for_timeout(500)
    ok(pg.evaluate('TT.S.orders.active')is None and pg.evaluate('TT.S.orders.done')==1,'stockpiled goods (keep stock) feed the order and complete it')
    ok(pg.evaluate('TT.S.coins')>=c0+rw*0.999,'big reward paid')
    pg.evaluate('TT.checkAch(true)'); ok(pg.evaluate('!!TT.S.ach.order1'),'"Order Up!" trophy')
    ok(pg.evaluate('TT.scene.orderEv&&TT.scene.orderEv.kind')=='done','delivery celebration triggered')
    d=pg.evaluate("(()=>{TT.offerOrder('planks');TT.acceptOrder();TT.S.res.planks=50;const n=TT.deliverFromStock();const g=TT.S.orders.active?TT.S.orders.active.got:-1;TT.S.orders.active=null;return [n,g]})()")
    ok(d[0]==50 and d[1]==50,f'"Deliver from storage" hands over buffer stock too ({d})')
    # decline + expiry
    pg.evaluate("TT.offerOrder('planks')"); pg.wait_for_timeout(200); pg.evaluate('TT.declineOrder()')
    ok(pg.evaluate('TT.S.orders.offer===null && TT.S.orders.next>TT.S.time'),'decline clears the offer and schedules the next call')
    pg.evaluate("TT.offerOrder('chairs');TT.acceptOrder();TT.S.autosell.paper=true;TT.S.autosell.chairs=true;TT.S.orders.active.amt=1e30;TT.S.time=TT.S.orders.active.ends+1;TT.tick(.1)")
    ok(pg.evaluate('TT.S.orders.active===null && TT.S.orders.failed===1'),'expired order counts as missed (no penalty)')
    # offline progress with premium + an active order
    pg.evaluate("TT.offerOrder('luxfurn');TT.acceptOrder()")
    r=pg.evaluate('(()=>{const r=TT.simulateOffline(3600);return {c:r.coins,n:Number.isFinite(TT.S.coins),o:TT.S.orders}})()')
    ok(r['c']>0 and r['n'],f'offline progress works with premium + orders (+{r["c"]:.3g})')
    ok(r['o']['active'] is None,'an accepted order resolves while offline')
    # natural scheduling: an offer appears by itself
    pg.evaluate('TT.S.orders.offer=null;TT.S.orders.active=null;TT.S.orders.next=TT.S.time+1'); pg.wait_for_timeout(2500)
    ok(pg.evaluate('!!TT.S.orders.offer'),'clients call on their own when the timer runs out')
    # save round-trip
    pg.evaluate('TT.save(true)'); sv=pg.evaluate('JSON.parse(localStorage.getItem("timberTycoon_save_v1"))')
    ok(sv['premium']['lvl']==2 and sv['storage']['kiln']==1 and sv['orders']['done']>=1,'premium / storage / orders saved')
    perf=pg.evaluate('({fps:TT.scene.fps,ms:TT.scene.frameMs})'); ok(perf['ms']<16,f'frame time ok {perf}')
    print('ERRORS:',errs)
    ok(not errs,'no console errors')
    b.close()
print('FAILS',FAILS)
if FAILS: raise SystemExit(1)
