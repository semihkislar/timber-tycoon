# v2.51: forest-value pricing audit. At forest value ×1 every audited sticker matches v2.50,
# even when income is already high. After a Replant the price is max(sticker × forest value,
# N seconds of income). Desktop click, iPhone 13 / Pixel 7 touch. Old and damaged saves load.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,*a): return pg.evaluate(js,*a)
def near(a,b,rel=1e-6):
    if a==b: return True
    d=max(abs(a),abs(b),1)
    return abs(a-b)<=rel*d
OLD=BASE+'releases/v2.50/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=51;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CALM="S.events=[];S.nextEvent=S.time+1e9;S.fires={};S.fireCool=S.time+1e9;if(S.orders)S.orders.next=S.time+1e9;if(S.mish)S.mish.next=S.time+1e9;S.prefs.autoFocus=false;if(S.ob)S.ob.st='skip';if(S.wx)S.wx.next=1e15;"
QUIET=r'''()=>{coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}}'''
# Prices both builds can answer. At ×1 and a quiet income they are the published stickers.
LADDER=r'''()=>{S.runCS=1;coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
  const o={};
  o.bld=BUILDINGS.map(b=>bulkCost(b.cost,b.scale,0,1));
  o.col=COLLECTORS.map(c=>colCost(c.id,0,1));
  o.up=UPGRADES.map(u=>upCost(u,1));
  o.pw=[0,1,2,9].map(l=>pwCost(l));
  o.by=[0,1,5].map(l=>byCost(l));
  o.hb=harborCost();
  o.city=CITIES.map(c=>c.cost);
  o.mgr=MANAGERS.map(m=>mgrHireCost(m));
  o.ship=Object.keys(SH_UP).map(k=>shCost(k));
  o.st=[0,1,4].map(l=>stationCost(l));
  o.prem=typeof premReveal==='function'?premReveal():PREM_UNLOCK*0.25;
  o.ord=typeof ORD_OPEN==='number'?ORD_OPEN*cs():250;
  o.daily=typeof DAILY_OPEN==='number'?DAILY_OPEN*cs():500;
  o.logs=canSell('logs'); o.saw=SAW_LOGS;
  return o;}'''
EARLY=r'''(()=>{const __t=Date.now();Date.now=()=>__t;let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};
  S.coins=50;S.totalEarned=0;S.time=0;S.legacy=0;S.runCS=1;S.upgrades={};if(S.ob)S.ob.st='skip';if(S.wx)S.wx.next=1e15;
  coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
  for(const c of COLLECTORS) S.collectors[c.id]=0;for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
  const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
  for(let k=0;k<2400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10)TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10)TT.buyCollector('truck',1);
    for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,canSell('logs')];})()'''
# One synchronous pass: forest value, quiet income, and a hot income. No live tick in between.
AUDIT=r'''()=>{
  const quiet=()=>{coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}};
  const hot=inc=>{coinRate=inc;if(S.run){S.run.inc=inc;S.run.incE=inc;}};
  const rows=[];
  const push=(name,cs,got,base,sec)=>{
    const forest=base*cs, inc=mishInc(), ask=cs>1?sec*inc:0;
    const want=cs>1?Math.max(forest,ask):forest;
    rows.push({name,cs,ratio:got/want,forest:got/forest,floor:ask>0?got/ask:1,finite:isFinite(got)&&got>0});
  };
  for(const fv of [1,50,675,1e6,1e12]){
    S.runCS=fv; quiet();
    for(let l=0;l<PW_SEC.length;l++) push('power '+l,fv,pwCost(l),PW_COST*Math.pow(PW_SCALE,l),PW_SEC[l]);
    for(let l=0;l<BY_SEC.length;l++) push('yard '+l,fv,byCost(l),BY_COST*Math.pow(BY_SCALE,l),BY_SEC[l]);
    for(let l=0;l<HB_SEC.length;l++){S.trade.lvl=l;push('harbour '+l,fv,harborCost(),HARBOR_COST*Math.pow(4,l),HB_SEC[l]);}
    S.trade.lvl=0;
    for(const c of CITIES) push('route '+c.id,fv,routeCost(c),c.cost,ROUTE_SEC[c.id]);
    for(const m of MANAGERS) push('hire '+m.id,fv,mgrHireCost(m),BMAP[m.bid].cost*1000*RARITY[m.r].rm,MGR_SEC);
    S.ship.dock=1;S.ship.fork=2;S.ship.fspd=0;S.ship.crane=0;
    for(const k of Object.keys(SH_UP)) push('ship '+k,fv,shCost(k),SH_UP[k].cost(k==='dock'?1:k==='fork'?2:0),shSec(k,k==='dock'?1:k==='fork'?2:0));
    push('premium reveal',fv,premReveal(),PREM_UNLOCK*0.25,0);
    push('orders open',fv,ORD_OPEN*cs(),ORD_OPEN,0);
    push('daily open',fv,DAILY_OPEN*cs(),DAILY_OPEN,0);
    push('nursery reveal',fv,plReveal(PMAP.nursery),PMAP.nursery.cost*0.3,0);
    hot(1e9);
    push('power hot',fv,pwCost(0),PW_COST,PW_SEC[0]);
    push('yard hot',fv,byCost(0),BY_COST,BY_SEC[0]);
    S.trade.lvl=0; push('harbour hot',fv,harborCost(),HARBOR_COST,HB_SEC[0]);
    push('istanbul hot',fv,routeCost(CMAP.ist),CMAP.ist.cost,ROUTE_SEC.ist);
    push('tokyo hot',fv,routeCost(CMAP.tyo),CMAP.tyo.cost,ROUTE_SEC.tyo);
    const em=MANAGERS.find(m=>m.bid==='sawmill');
    push('emre hot',fv,mgrHireCost(em),BMAP.sawmill.cost*1000,MGR_SEC);
    S.ship.dock=1; push('dock hot',fv,shCost('dock'),SH_UP.dock.cost(1),shSec('dock',1));
    const up=mgrUpCost(em,3).coins, hire=mgrHireCost(em);
    rows.push({name:'emre lv',cs:fv,ratio:up/(hire*Math.pow(MGR_UP,3)),forest:1,floor:1,finite:isFinite(up)&&up>hire});
  }
  quiet(); S.runCS=1;
  const ord=[];
  for(const cs of [50,1e6]){
    S.runCS=cs; hot(1e8);
    const pw=[]; for(let l=0;l<10;l++) pw.push(pwCost(l));
    const rt=CITIES.map(c=>routeCost(c));
    ord.push(pw.every((v,i)=>i===0||v>pw[i-1]) && rt.every((v,i)=>i===0||v>rt[i-1]));
  }
  return {rows,ord};
}'''
with sync_playwright() as p:
    b=p.chromium.launch();errs=[];missing=[]
    def page(dev=None,init=CLEAR,url=URL):
        if dev:d=dict(p.devices[dev]);d.pop('default_browser_type',None);ctx=b.new_context(**d,service_workers='block')
        else:ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init);pg=ctx.new_page()
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('response',lambda r:missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url);pg.wait_for_timeout(1100);return pg
    def touch(pg,bt):
        bt.scroll_into_view_if_needed();bx=bt.bounding_box();vw=pg.viewport_size['width']
        ok(bool(bx) and bx['height']>=44 and bx['x']>=-1 and bx['x']+bx['width']<=vw+2,f'touch target fits ({None if not bx else round(bx["height"])}px)')
        if not bx: return
        cdp=pg.context.new_cdp_session(pg);x,y=bx['x']+bx['width']/2,bx['y']+min(bx['height']/2,24)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        pg.wait_for_timeout(350)
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,51),f"VERSION >= 2.51 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read());ok(m and ver(m.group(1))>=(2,51),f"service-worker cache >= v2.51 ({m and m.group(1)})")
    ok(E(pg,'canSell("logs")') is False,'logs stay unsellable')
    # Opening ladder vs the v2.50 snapshot, quiet income, forest value ×1.
    newL=E(pg,LADDER);pg.close()
    pg=page(url=OLD);oldL=E(pg,LADDER);pg.close()
    for key in ('bld','col','up','pw','by','ship','st','mgr'):
        ok(len(newL[key])==len(oldL[key]) and all(near(a,c) for a,c in zip(newL[key],oldL[key])),f'×1 {key} ladder matches v2.50')
    ok(near(newL['hb'],oldL['hb']) and newL['city']==oldL['city'] and near(newL['prem'],oldL['prem']) and newL['ord']==oldL['ord']==250 and newL['daily']==oldL['daily']==500 and newL['logs'] is False and oldL['logs'] is False and newL['saw']==oldL['saw']==40,'×1 harbour, routes, reveals, orders, daily, logs and the 40-log Sawmill match v2.50')
    # High income on a first run must not rewrite the sticker (older suites buy these mid-run).
    pg=page()
    r=E(pg,r'''()=>{S.runCS=1;coinRate=1e9;if(S.run){S.run.inc=2e9;S.run.incE=2e9;}
      return {pw:pwCost(0),by:byCost(0),hb:harborCost(),ist:routeCost(CMAP.ist),em:mgrHireCost(MANAGERS.find(m=>m.bid==="sawmill")),dk:shCost("dock")};}''')
    ok(near(r['pw'],2.5e5) and near(r['by'],2.5e4) and near(r['hb'],2.5e7) and near(r['ist'],2e7) and near(r['em'],1e5) and near(r['dk'],6e4),f'×1 at 1B/s income the stickers stay put ({r})')
    # After a Replant: floors, order, and nothing tiny.
    audit=E(pg,AUDIT)
    bad=[row for row in audit['rows'] if not row['finite'] or abs(row['ratio']-1)>1e-6 or row['forest']<1-1e-6]
    ok(not bad and all(audit['ord']),f"forest value floors hold and levels stay ordered ({bad[:3]})")
    # Systems that already scaled stay in proportion. Order rewards match v2.50.
    r=E(pg,r'''()=>{const quiet=()=>{coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}};const o={};
      for(const cs of [1,50,1e6]){S.runCS=cs;quiet();M=computeMods();
        o[cs]={ws:wsCost("sawmill",0,1)/(WS_K*BMAP.sawmill.cost*cs*Math.pow(BMAP.sawmill.scale,WS_LV[1])),logi:logiCost(0)/(2e4*cs),prem:premCost()/(PREM_UNLOCK*cs),
          ins:insCost(0)/(1.5e5*cs),st:stationCost(0)/(6e4*cs),dr:drCost()/(200*cs),
          hire:staffHireCostOf({skill:1,rarity:"C"})/(25*cs)};
      }
      S.runCS=675;coinRate=1e6;if(S.run){S.run.inc=2e6;S.run.incE=2e6;}M=computeMods();
      o.pay=[ordPay(1000,"planks",90,1.5,2.5,0.25),ordPay(40,"chairs",120,1.5,2.5,0.2)];
      return o;}''')
    for cs,row in ((1,r['1']),(50,r['50']),(1000000,r['1000000'])):
        ok(all(abs(v-1)<1e-6 for v in row.values()),f'already-scaled prices stay × forest value at ×{cs:g} ({row})')
    pay=r['pay'];pg.close()
    pg=page(url=OLD)
    oldPay=E(pg,r'''()=>{S.runCS=675;coinRate=1e6;if(S.run){S.run.inc=2e6;S.run.incE=2e6;}M=computeMods();
      return [ordPay(1000,"planks",90,1.5,2.5,0.25),ordPay(40,"chairs",120,1.5,2.5,0.2)];}''')
    pg.close()
    ok(all(near(a,c,1e-9) for a,c in zip(pay,oldPay)),f'order rewards match v2.50 ({pay} vs {oldPay})')
    # Opening script.
    pg=page();e_new=E(pg,EARLY);pg.close()
    pg=page(url=OLD);e_old=E(pg,EARLY);pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and near(e_new[0],e_old[0],1e-6),f'opening script matches v2.50 ({e_new[0]:.6f} vs {e_old[0]:.6f}, levels {e_new[1:]})')
    # Buys charge the scaled price. Replant keeps the plant and raises the next one.
    pg=page()
    r=E(pg,r'''()=>{const quiet=()=>{coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}};
      S.legacy=0;S.ach={};S.runCS=1;quiet();M=computeMods();const g0=S.coins;goldenReward("coins");const gold=S.coins-g0;
      S.runCS=1e6;quiet();S.buildings.kiln.lvl=3;startFire("kiln");const f0=S.coins;extinguish("kiln","tap");const fire=(S.coins-f0)/1e6;
      S.runCS=50;quiet();S.buildings.pellet.lvl=1;S.buildings.sawmill.lvl=1;S.buildings.chipper.lvl=1;S.buildings.kiln.lvl=1;S.buildings.furniture.lvl=1;
      const out={};
      const charge=(name,cost,fn)=>{S.coins=cost*0.5;const poor=fn()===false;const c0=S.coins=cost;const yes=fn()===true;out[name]={poor,yes,paid:(c0-S.coins)/cost};};
      charge('power',pwCost(),buyPower);
      charge('yard',byCost(),buyBuilders);
      charge('harbour',harborCost(),buyHarbor);
      charge('route',routeCost(CMAP.ist),()=>openRoute('ist'));
      charge('emre',mgrHireCost(MANAGERS.find(m=>m.bid==='sawmill')),()=>hireMgr('emre'));
      charge('dock',shCost('dock'),()=>shBuy('dock'));
      S.power.lvl=3;S.ship.dock=4;S.totalEarned=1e18;S.legacy=10;S.res.logs=500;const sold=sellAll('logs');const g=doPrestige();
      quiet();const next=pwCost(), base=PW_COST*Math.pow(PW_SCALE,3);
      out.re={g,sold,cs:cs(),pw:pwLvl(),dock:S.ship.dock,mgr:mgrLvl('sawmill'),ratio:next/base,logs:canSell('logs')};
      const odd=[];
      for(const [c,inc] of [[1,NaN],[0,0],[1e300,1e300]]){S.runCS=c;coinRate=inc;if(S.run){S.run.inc=0;S.run.incE=0;}odd.push(pwCost(0),byCost(0),harborCost(),routeCost(CMAP.ist),shCost('fork'));}
      out.odd=odd.every(x=>isFinite(x)&&x>0);out.gold=gold;out.fire=fire;
      return out;}''')
    for name,row in r.items():
        if name in ('re','odd','gold','fire'): continue
        ok(row['poor'] is True and row['yes'] is True and abs(row['paid']-1)<1e-6,f'{name} refuses half and charges the scaled price ({row})')
    ok(r['re']['g'] and r['re']['sold']==0 and r['re']['logs'] is False and r['re']['pw']==3 and r['re']['dock']==4 and r['re']['mgr']==1 and r['re']['cs']>1 and r['re']['ratio']>=r['re']['cs']*0.999,f"Replant keeps the plant, dock and foreman; the next plant price follows forest value ({r['re']})")
    ok(r['odd'] and near(r['gold'],75) and r['fire']>=150*0.999,f"odd states stay finite; ×1 golden haul is 75; fire floor follows forest value ({r['gold']}, {r['fire']})")
    # Saves.
    sv=E(pg,"""()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.50';o.coins=250000;o.runCS=40;o.power={lvl:2,on:true,fuel:'mix'};o.ship={dock:3,fork:2,fspd:0,crane:0};o.mgr={emre:2};o.buildings.sawmill={lvl:12,on:true};o.res={logs:40};return JSON.stringify(o);}""")
    pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    r=E(pg,"()=>({v:S.version,pw:pwLvl(),dock:S.ship.dock,mgr:mgrLvl('sawmill'),saw:S.buildings.sawmill.lvl,logs:canSell('logs'),coin:S.coins,cs:cs(),next:pwCost()/ (PW_COST*Math.pow(PW_SCALE,2)*cs())})")
    ok(ver(r['v'])>=(2,51) and r['pw']==2 and r['dock']==3 and r['mgr']==2 and r['saw']==12 and r['logs'] is False and r['coin']>2e5 and r['cs']==40 and abs(r['next']-1)<1e-6,f"v2.50 save loads; the next plant price is the sticker × forest value ({r})")
    pg.close()
    for ver_s,lvl in (('2.49',20),('2.39',12),('2.33',8),('2.24',6)):
        raw=json.dumps(json.dumps({'version':ver_s,'coins':18000,'legacy':0,'upgrades':{'sharp':1},'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':40,'planks':10}}))
        pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
        r=E(pg,"()=>{let s=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}return {v:S.version,coin:S.coins,saw:S.buildings.sawmill.lvl,logs:canSell('logs'),ok:isFinite(S.coins)&&isFinite(pwCost())&&isFinite(byCost())&&isFinite(harborCost())};}")
        ok(r['ok'] and r['logs'] is False and r['saw']==lvl and r['coin']>0,f'{ver_s} save loads and runs ({r})')
        pg.close()
    dmg=json.dumps(json.dumps({'version':'2.50','coins':-20,'runCS':'bad','upgrades':{'sharp':'bad'},'buildings':{'sawmill':{'lvl':'x','on':True}},'res':{'logs':-4},'power':{'lvl':'x'},'mgr':{'emre':'bad'},'trade':{'lvl':'z'}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg,"()=>{let s=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);s+=1;}return {coin:S.coins,logs:S.res.logs,ok:isFinite(S.coins)&&isFinite(pwCost())&&isFinite(mgrHireCost(MANAGERS[0]))&&s===5};}")
    ok(r['ok'] and r['coin']>=0 and r['logs']==0,f'damaged save runs ({r})')
    pg.close()
    # Desktop: a real click on the scaled power-plant price, then the release shots.
    SHOW='''()=>{'''+CALM+'''for(const a of ACH)S.ach[a.id]=1;if(S.run&&S.run.goals)for(const g of GOALS)S.run.goals[g.id]=1;
      for(const b of BUILDINGS){S.buildings[b.id].on=false;}for(const c of COLLECTORS)S.collectors[c.id]=0;
      for(const k in S.autosell)S.autosell[k]=false;
      S.runCS=675;coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
      S.buildings.pellet.lvl=1;S.buildings.kiln.lvl=1;S.power.lvl=0;
      S.coins=pwCost()*3;S.totalEarned=S.coins;if(typeof dispCoins!=='undefined')dispCoins=S.coins;
      M=computeMods();if(typeof ntClear==='function')ntClear();document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());
      openSheet('power');if(typeof pwSig!=='undefined')pwSig='';TT.render();}'''
    pg=page();E(pg,SHOW);pg.wait_for_timeout(400)
    want=E(pg,'fmt(pwCost())');text=pg.locator('#pwBuy').inner_text()
    ok(want in text and want!='250K',f'desktop: button shows the forest-scaled price {want}')
    ok('forest value' in pg.locator('#powerBody').inner_text(),'desktop: the sheet says the price follows forest value')
    c0=E(pg,'[pwCost(),S.coins,S.runCS]')
    pg.locator('#pwBuy').scroll_into_view_if_needed();pg.wait_for_timeout(200)
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    pg.locator('#sheet').screenshot(path=shot_path('pricing.png'))
    pg.locator('#pwBuy').click();pg.wait_for_timeout(250)
    ok(E(pg,'pwLvl()')==1 and near(E(pg,'S.coins'),c0[1]-c0[0]),f'desktop: click builds the plant and charges {c0[0]:.6g}')
    E(pg,"closeSheet();S.buildings.sawmill.lvl=8;S.buildings.sawmill.on=true;S.buildings.chipper.lvl=4;S.buildings.chipper.on=true;S.collectors.lumberjack=6;fitCamera(true);if(typeof ntClear==='function')ntClear();")
    pg.wait_for_timeout(250)
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    pg.screenshot(path=shot_path('desktop.png'))
    pg.close()
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev);E(pg,SHOW);pg.wait_for_timeout(500)
        pg.locator('#pwBuy').scroll_into_view_if_needed();pg.wait_for_timeout(200)
        E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
        if dev=='iPhone 13':
            pg.locator('#sheet').screenshot(path=shot_path('mobile-pricing.png'))
        touch(pg,pg.locator('#pwBuy'))
        if E(pg,'pwLvl()')!=1:
            pg.locator('#pwBuy').tap();pg.wait_for_timeout(300)
        ok(E(pg,'pwLvl()')==1,f'{dev}: tap builds the plant at the scaled price')
        if dev=='Pixel 7':
            E(pg,"closeSheet();fitCamera(true);if(typeof ntClear==='function')ntClear();")
            pg.wait_for_timeout(200)
            E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
            pg.screenshot(path=shot_path('mobile.png'))
        pg.close()
    ok(not errs,'no console errors '+str(errs[:3]))
    ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -',f)
sys.exit(1 if FAILS else 0)
