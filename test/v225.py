# v2.25: order sizing after Replant (item 5 of Semih's Oct 20 list). Client orders, daily contracts and export contracts
# are sized on the line's real output with a value floor that follows this run's income (forest value as the floor), rewards
# stay proportional to the goods, daily contracts wait for running lines and follow output until accepted, and the client
# order board holds several offers and runs 1–3 orders at once. Multi-Replant sims, old saves, desktop + touch.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
import sim_v225
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;window.toast=()=>{};})()"
# a mid/late factory: Phase I + II running, Premium Area open with two workshops
SETUP='''(()=>{S.coins=1e13;S.totalEarned=1e13;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  TT.buyPlanter("team",6);for(const [b,n] of [["sawmill",60],["chipper",30],["kiln",20],["peeler",20],["carpentry",25],["pellet",20],["paper",15],["furniture",10]]) TT.buyBuilding(b,n);
  S.premium.lvl=1;S.coins=1e13;TT.buyBuilding("atelier",5);TT.buyBuilding("parquet",5);S.coins=1e13;M=computeMods();for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}S.orders.next=S.time+1e6;})()'''
SIMS=[(label,sim_v225.run('index.html',5,strong)) for strong,label in [(1,'late-game player (all research, Premium Area)'),(0,'greedy fresh player')]]
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page(); watch(pg,tag); pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg

    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,25),f"VERSION >= 2.25 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,25),'sw cache bumped to >= v2.25')
    # ---------------- root cause: the day's contracts right after a Replant ----------------
    E(pg,SETUP)
    r=E(pg,"""(()=>{S.totalEarned=1e15;S.seeds=0;S.legacy=Math.max(S.legacy||0,2000);doPrestige();S.orders.next=S.time+1e6;window.toast=()=>{};
      const o={cs:cs(),made0:!!S.daily._made,ready0:dailyReady(),goods0:dailyGoods().length,c0:makeDailyContract(DAILY_DIFFS[1],new Set())};
      // the old fallback (goods not made yet, sized at 0.05/s = 5 units) is gone: nothing to contract before a line runs
      o.noProd=RES.filter(r=>canSell(r.id)&&prodRate(r.id)<=0.015).map(r=>r.id);
      buyBuilding('sawmill',1,{logsOnly:true});S.coins=1e9*cs();buyCollector('lumberjack',40);
      for(let k=0;k<40;k++){S.forest.m=1e9;tick(1,false);}
      o.made1=!!S.daily._made;o.goods1=dailyGoods().length;
      for(const [b,n] of [['sawmill',30],['chipper',15],['kiln',10],['peeler',10]]){S.coins=1e30;buyBuilding(b,n);}S.coins=1e9*cs();M=computeMods();
      for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}
      o.made2=!!S.daily._made;o.offers=S.daily.offers.map(x=>({it:x.item,amt:x.amt,rw:x.reward,val:x.amt*price(x.item),p:prodRate(x.item)}));o.inc=ordInc();return o;})()""")
    ok(r['cs']>5,f"after a Replant with Legacy 2000 the forest value is ×{r['cs']:.0f}")
    ok(not r['made0'] and r['c0'] is None,f"no daily contract before any product line runs (old: 3 contracts of 5 units from a fallback list) ({r['c0']})")
    ok(r['offers'] and all(x['amt']>=20 for x in r['offers']),f"the day's contracts, once drawn, ask for ≥ 20 units ({[x['amt'] for x in r['offers']]})")
    ok(r['offers'] and all(x['val']>=4.5*r['inc'] for x in r['offers']),f"… and are each worth ≥ 5 s of income ({[round(x['val']/r['inc'],1) for x in r['offers']]} s)")
    ok(r['offers'] and all(x['p']>0.015 for x in r['offers']),'… only for goods the factory makes')
    # ---------------- daily offers follow output until accepted ----------------
    r=E(pg,"""(()=>{const D=S.daily;const o=D.offers[0];o.amt=5;o.reward=40;S.coins=1e30;buyBuilding(BUILDINGS.find(b=>b.out[o.item]).id,60);M=computeMods();
      for(let k=0;k<25;k++){S.forest.m=1e9;tick(1,false);}const pl=dailyPlan(o);return {it:o.item,a1:o.amt,r1:o.reward,pa:pl.amt,val:o.amt*price(o.item),inc:ordInc(),n:D.offers.length,act:D.active.length};})()""")
    ok(r['a1']>=20 and r['val']>=4.5*r['inc'] and abs(r['a1']/r['pa']-1)<.16,f"a 5-unit / 🪙40 daily offer (drawn too early) is resized to the current output within 10 s ({r['it']}: {r['a1']:.3g} units, 🪙{r['r1']:.3g})")
    r=E(pg,"""(()=>{const D=S.daily;const o=D.offers[0];const okA=acceptDaily(o.id);const a=D.active.find(x=>x.id===o.id);if(!a) return {okA,n:D.active.length,max:DAILY_MAX_ACTIVE};const a0=a.amt;S.coins=1e30;buyBuilding(BUILDINGS.find(b=>b.out[o.item]).id,40);
      for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);}return [a0,a.amt];})()""")
    ok(r[0]==r[1],f'an accepted contract keeps its amount ({r})')
    ctx.close()
    # ---------------- sizing rules ----------------
    ctx,pg=page(); E(pg,SETUP)
    r=E(pg,"""(()=>{const k='chairs',pot=prodRate(k);rates[k].p=pot*1e-4;const pl=ordPlan(k,240,.3);rates[k].p=pot;return {pot,amt:pl.amt,min:pot*.35*240*.3};})()""")
    ok(r['amt']>=r['min']*.95,f"a lagging / starved line still gets an order sized on ≥ 35 % of its potential (amt {r['amt']:.3g} ≥ {r['min']:.3g}; old: min(potential, EMA) → a handful)")
    r=E(pg,"""(()=>{const L=[];for(let i=0;i<300;i++){const o=makeOrder();if(o) L.push({it:o.item,amt:o.amt,rw:o.reward,val:o.amt*price(o.item),pr:!!o.premium});}
      return {L,inc:ordInc(),m:mgrOrders()*(M.orderPay||1)};})()""")
    L=r['L']; rv=[x['rw']/x['val']/(1.25 if x['pr'] else 1)/r['m'] for x in L]
    ok(len(L)==300 and min(x['amt'] for x in L)>=20,f"300 client orders: every amount ≥ 20 (min {min(x['amt'] for x in L):.3g})")
    ok(min(x['val'] for x in L)>=4.5*r['inc'],f"… every order worth ≥ 5 s of income (min {min(x['val'] for x in L)/r['inc']:.1f} s)")
    ok(min(rv)>=1.4 and max(rv)<=2.65,f"… reward = goods value × 1.5–2.5 before bonuses (± rounding) ({min(rv):.2f}–{max(rv):.2f}; old: up to ×7000)")
    r=E(pg,"""(()=>{const pr=price('luxfurn');S.coins=1e30;S.buildings.showroom.lvl=1;S.buildings.showroom.on=true;M=computeMods();for(let k=0;k<5;k++){S.forest.m=1e9;tick(1,false);}
      const pl=ordPlan('luxfurn',240,.3);let n=0,tiny=0;for(let i=0;i<300;i++){const o=makeOrder();if(o&&o.item==='luxfurn'){n++;if(o.amt*price('luxfurn')<4.5*ordInc()) tiny++;}}
      const f=makeOrder('luxfurn');return {ok:pl.ok,n,tiny,f:f&&f.amt};})()""")
    ok(r['tiny']==0 and (r['ok'] or r['n']==0),f"a brand-new Lv 1 premium workshop is only offered once it can carry a real order (ok {r['ok']}, picked {r['n']}×, tiny {r['tiny']})")
    ok(r['f'] and r['f']>=20,f"forcing that good still asks for ≥ 20 units ({r['f']})")
    r=E(pg,"""(()=>{const L=[];for(let i=0;i<200;i++){const d=DAILY_DIFFS[i%3];const o=makeDailyContract(d,new Set());if(o) L.push({amt:o.amt,val:o.amt*price(o.item),rv:o.reward/(o.amt*price(o.item))/d.pay/streakMult()/mgrOrders()/(M.orderPay||1),am:d.amt});}return {L,inc:ordInc()};})()""")
    L=r['L']
    ok(len(L)==200 and min(x['amt'] for x in L)>=20 and min(x['val']/x['am'] for x in L)>=4.5*r['inc'],f"200 daily contracts: ≥ 20 units, worth ≥ 5 s of income × difficulty (min {min(x['val']/x['am'] for x in L)/r['inc']:.1f} s)")
    ok(min(x['rv'] for x in L)>=1.3 and max(x['rv'] for x in L)<=2.35,f"… reward = value × 1.4–2.2 before difficulty/streak bonuses (± rounding) ({min(x['rv'] for x in L):.2f}–{max(x['rv'] for x in L):.2f})")
    r=E(pg,"""(()=>{S.ship=S.ship||shFresh();const L=[];for(let i=0;i<200;i++){const o=shMakeOffer();if(o){const v=o.qty*price(o.res)*o.mult;L.push({q:o.qty,val:o.qty*price(o.res),rv:shReward(o)/v/(1+.2*S.ship.crane)});}}return {L,inc:ordInc()};})()""")
    L=r['L']
    ok(L and min(x['q'] for x in L)>=20 and min(x['val'] for x in L)>=4.5*r['inc'],f"export contracts: ≥ 20 units and ≥ 5 s of income ({len(L)} offers; old: 1 unit)")
    ok(L and max(x['rv'] for x in L)<=2*1.25+1e-9,f"… reward at most 2× goods × multiplier (max {max(x['rv'] for x in L):.2f}; old: up to ×23M)")
    # forest value floor: the minimum reward and the income reference follow cs()
    r=E(pg,"""(()=>{const c0=coinRate,inc0=S.run.inc;coinRate=0;S.run.inc=0;S.runCS=1000;const a=ordInc();const pay=ordPay(20,'planks',180,1.5,2.5,.15);S.runCS=1;const b=ordInc();coinRate=c0;S.run.inc=inc0;return [a,b,pay];})()""")
    ok(abs(r[0]-1000*r[1])<1e-6 and r[2]>=50*1000,f"income floor and minimum reward follow forest value (×1000: {r[0]:.0f}/s, 🪙{r[2]:.0f})")
    ctx.close()
    # ---------------- order board ----------------
    ctx,pg=page()
    r=E(pg,"""(()=>{for(const b of BUILDINGS) S.buildings[b.id].lvl=0;S.premium.lvl=0;S.buildings.sawmill.lvl=5;M=computeMods();const a=[ordSlots(),ordBoardMax()];
      S.buildings.carpentry.lvl=1;const b=ordSlots();S.premium.lvl=1;const c=[ordSlots(),ordBoardMax()];return {a,b,c};})()""")
    ok(r['a']==[1,2] and r['b']==2 and r['c']==[3,3],f"order slots 1 → 2 with a Phase II line → 3 with the Premium Area; board 2 → 3 ({r})")
    E(pg,SETUP)
    r=E(pg,"""(()=>{const O=S.orders;O.offer=null;O.active=null;O.next=S.time;const seen=[];
      for(let k=0;k<400;k++){S.forest.m=1e9;tick(1,false);seen.push(O.offers.length);}
      return {max:Math.max(...seen),items:O.offers.map(o=>o.item),uniq:new Set(O.offers.map(o=>o.item)).size,n:O.offers.length};})()""")
    ok(r['max']==3 and r['n']==3 and r['uniq']==3,f"clients keep calling until 3 different offers wait on the board ({r['items']}; old: one call every 3–5 min)")
    r=E(pg,"""(()=>{const O=S.orders;const ids=O.offers.map(o=>o.id);const a=acceptOrder(ids[1]);const b=acceptOrder(ids[0]);const c=acceptOrder(ids[2]);
      const d=offerOrder('paper')&&acceptOrder(O.offers[O.offers.length-1].id);return {a,b,c,d,acts:O.acts.length,first:O.active&&O.active.id===ids[1],off:O.offers.length};})()""")
    ok(r['a'] and r['b'] and r['c'] and r['acts']==3 and r['first'],f"three orders run at once, accepted by id in any order ({r})")
    ok(r['d']==False and r['off']==1,'a fourth is refused while all 3 slots are busy (offer stays on the board)')
    r=E(pg,"""(()=>{const O=S.orders,o=O.acts[1];S.autosell[o.item]=false;S.res[o.item]=o.amt*2;const need=o.amt-o.got;const n=deliverFromStock(o.id);return {n,need,amt:o.amt,acts:O.acts.length,done:O.done,still:O.acts.includes(o)};})()""")
    ok(abs(r['n']-r['need'])<1e-6 and r['acts']==2 and not r['still'],f"Deliver from storage completes that order only ({r})")
    r=E(pg,"""(()=>{const O=S.orders;for(const o of O.acts){o.amt=1e30;}S.time=Math.max(...O.acts.map(o=>o.ends))+1;const f0=O.failed;tick(.1);return [O.acts.length,O.failed-f0];})()""")
    ok(r==[0,2],f'expired orders count as missed, one by one ({r})')
    r=E(pg,"""(()=>{const O=S.orders;O.offer=null;offerOrder('planks');offerOrder('chairs');const id=O.offers[1].id;declineOrder(id);return [O.offers.length,O.offers[0].item,O.next>S.time];})()""")
    ok(r==[1,'chairs',True] or r[0]==1,f'decline removes just that offer ({r})')
    # saves: lists are saved; a v2.24 save with offer/active loads into the board
    r=E(pg,"""(()=>{const O=S.orders;O.offer=null;O.active=null;offerOrder('planks');offerOrder('chairs');acceptOrder();const j=JSON.parse(JSON.stringify(S));return {offers:j.orders.offers.length,acts:j.orders.acts.length};})()""")
    ok(r=={'offers':1,'acts':1},f'the board is saved ({r})')
    sv=E(pg,"""(()=>{const O=S.orders;const off=O.offers[0],act=O.acts[0];const o=JSON.parse(JSON.stringify(S));o.version='2.24';act.amt=1e30;act.ends=S.time+1e5;o.orders={offer:off,active:act,next:S.time+50,done:7,failed:2,hist:[]};
      o.daily.offers=[{id:5,item:'planks',amt:5,dur:210,reward:40,bonus:null,diff:'std',diffN:'Standard',e:'🟡',got:0,status:'offer'}];o.daily._made=true;o.daily.day=dayKey();return JSON.stringify(o);})()""")
    ctx.close()
    ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(sv))
    r=E(pg,"(()=>{const O=ordNorm();return {offers:O.offers.length,acts:O.acts.length,done:O.done,failed:O.failed,offer:!!O.offer,active:!!O.active,d:S.daily.offers.length?S.daily.offers[0].amt:-1};})()")
    ok(r['offers']==1 and r['acts']==1 and r['done']==7 and r['failed']==2 and r['offer'] and r['active'],f'v2.24 save: the waiting offer and the running order move onto the board ({r})')
    E(pg,"(()=>{S.forest.m=1e9;for(let k=0;k<12;k++) tick(1,false);})()")
    r=E(pg,"S.daily.offers.length?S.daily.offers[0].amt:-1")
    ok(r>=20,f'v2.24 save: a 5-unit daily offer from before the update is resized to the current output ({r})')
    E(pg,'TT.simulate(30)'); ok(E(pg,"isFinite(S.coins)&&S.coins>0"),'v2.24 save: game runs on')
    ctx.close()
    # ---------------- multi-Replant sims (run before this browser, see SIMS) ----------------
    for label,R in SIMS:
        rows=R['runs']
        print('   ',label,[(x['run'],round(x['cs'],1),x['done'],round(x['ordShare'],2),x['C'] and x['C']['minAmt'],x['D'] and x['D']['minAmt'],x['X'] and x['X']['minAmt']) for x in rows])
        ok(len(rows)==5 and rows[-1]['cs']>1.5,f'{label}: 5 runs with 4 Replants (forest value ×{rows[-1]["cs"]:.3g})')
        bad=[(x['run'],k) for x in rows for k in 'CDX' if x[k] and (x[k]['small'] or x[k]['tiny'])]
        ok(not bad,f'{label}: no client order, daily or export contract under 20 units or worth < 1 s of income, in any run ({bad})')
        rvm=max(x[k]['rvMax'] for x in rows for k in 'CX' if x[k])
        ok(rvm<=8,f'{label}: reward ≤ 8× the goods value incl. all bonuses (max {rvm:.1f})')
        ok(all(x['done']>=3 for x in rows),f"{label}: every run completes ≥ 3 client orders on the board ({[x['done'] for x in rows]})")
        ok(not R['errs'],f'{label}: no page errors')
    # ---------------- desktop UI ----------------
    ctx,pg=page(); E(pg,SETUP)
    E(pg,"(()=>{const O=S.orders;O.offer=null;O.active=null;offerOrder('chairs');offerOrder('planks');offerOrder('furniture');acceptOrder();for(const o of O.acts) o.amt=1e30;render();})()"); pg.wait_for_timeout(500)
    ok(pg.locator('#orderCard').is_visible() and '+2' in E(pg,"document.getElementById('orderCard').innerText"),'order card shows the running order and "+2" more on the board')
    E(pg,"TT.ordTab='clients'"); pg.click('#bbOrd'); pg.wait_for_timeout(500)
    ok(E(pg,"document.querySelectorAll('#ordBody .ord-card.act').length")==1 and E(pg,"document.querySelectorAll('#ordBody .ord-card.offer').length")==2,'Clients tab: one card per running order and per offer')
    ok('1/3' in E(pg,"document.querySelector('#ordBody .ord-board').innerText"),'board header shows slots in use (1/3)')
    id2=E(pg,"S.orders.offers[1].id"); pg.click(f'[data-oyes="{id2}"]'); pg.wait_for_timeout(400)
    ok(E(pg,f"S.orders.acts.some(o=>o.id==={id2})"),'click Accept on the second offer accepts that one'); E(pg,"for(const o of S.orders.acts) o.amt=1e30")
    id1=E(pg,"S.orders.offers[0].id"); pg.click(f'[data-ono="{id1}"]'); pg.wait_for_timeout(400)
    ok(E(pg,"S.orders.offers.length")==0 and E(pg,"S.orders.acts.length")==2,'click Decline removes that offer')
    oid=E(pg,"S.orders.acts[1].id")
    r=E(pg,"""(()=>{const o=S.orders.acts[1];o.amt=Math.max(1e6,prodRate(o.item)*2000);o.got=0;S.res[o.item]=o.amt*1.5;updateOrders();const b=document.querySelector(`[data-odel="${o.id}"]`);const dis=b.disabled;b.click();return dis;})()""")
    ok(r==False,'Deliver from storage button is enabled with stock on hand')
    ok(E(pg,f"!S.orders.acts.some(o=>o.id==={oid})") and E(pg,"S.orders.done")>=1,'Deliver from storage on the second order completes it')
    E(pg,"(()=>{offerOrder('paper');offerOrder('chairs');acceptOrder();acceptOrder();for(const o of S.orders.acts) o.amt=1e30;ordSig='';})()"); pg.wait_for_timeout(500)
    E(pg,"(()=>{offerOrder('furniture');ordSig='';})()"); pg.wait_for_timeout(500)
    ok(E(pg,"S.orders.acts.length")==3 and E(pg,"[...document.querySelectorAll('[data-oyes]')].every(b=>b.disabled)"),'with all slots busy the Accept buttons are disabled')
    pg.screenshot(path='/tmp/v225_desk_board.png')
    ctx.close()
    # ---------------- phones (touch) ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+' '); E(pg,SETUP)
        E(pg,"(()=>{const O=S.orders;O.offer=null;O.active=null;offerOrder('chairs');offerOrder('planks');offerOrder('paper');render();})()"); pg.wait_for_timeout(600)
        ok(pg.locator('#ocYes').is_visible(),f'{dev}: order card with Accept')
        id0=E(pg,"S.orders.offers[0].id"); pg.tap('#ocYes'); pg.wait_for_timeout(400); E(pg,"for(const o of S.orders.acts) o.amt=1e30")
        ok(E(pg,f"S.orders.acts.some(o=>o.id==={id0})"),f'{dev}: tap Accept on the card')
        E(pg,"TT.ordTab='clients'"); E(pg,"TT.openSheet('ord')"); pg.wait_for_timeout(700)
        vw=E(pg,'innerWidth')
        bx=E(pg,'[...document.querySelectorAll("#ordBody [data-oyes],#ordBody [data-ono],#ordBody [data-odel]")].map(b=>{const r=b.getBoundingClientRect();return [r.left,r.right,r.height]})')
        ok(len(bx)==5 and all(x[0]>=0 and x[1]<=vw+.5 and x[2]>=36 for x in bx),f'{dev}: order buttons fit the screen and are touch-sized ({[round(x[2]) for x in bx]})')
        ok(E(pg,'(()=>{const e=document.getElementById("ordBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll in the Orders sheet')
        id1=E(pg,"S.orders.offers[1].id"); E(pg,f"document.querySelector('[data-oyes=\"{id1}\"]').scrollIntoView({{block:'center'}})"); pg.wait_for_timeout(200)
        pg.tap(f'[data-oyes="{id1}"]'); pg.wait_for_timeout(400)
        ok(E(pg,f"S.orders.acts.some(o=>o.id==={id1})") and E(pg,"S.orders.acts.length")==2,f'{dev}: tap Accept on the second offer in the sheet'); E(pg,"for(const o of S.orders.acts) o.amt=1e30")
        E(pg,"document.querySelector('#ordBody .ord-board').scrollIntoView({block:'start'})"); pg.wait_for_timeout(200)
        pg.screenshot(path=f'/tmp/v225_{dev.split()[0].lower()}_board.png')
        E(pg,"TT.ordTab='daily';ordSig='';TT.updateOrders&&TT.updateOrders()"); pg.wait_for_timeout(200)
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('FAILS',FAILS)
sys.exit(1 if FAILS else 0)
