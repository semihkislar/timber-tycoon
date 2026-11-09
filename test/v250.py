# v2.50: Drum Chipper and Chair Line. More chips from the same logs, more chairs from the same planks,
# from mid-game only (Forest Legacy 25, then a level curve). Equal-level chips-bound and chairs-bound
# time drops vs v2.49. Plywood-bound time does not rise. The opening script matches v2.49.
# Desktop click, iPhone 13 / Pixel 7 touch. Old and damaged saves load. Logs stay unsellable.
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
OLD=BASE+'releases/v2.49/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=50;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CALM="S.events=[];S.nextEvent=S.time+1e9;S.fires={};S.fireCool=S.time+1e9;if(S.orders)S.orders.next=S.time+1e9;if(S.mish)S.mish.next=S.time+1e9;S.prefs.autoFocus=false;if(S.ob)S.ob.st='skip';if(S.wx)S.wx.next=1e15;"
# equal levels, research on, gates grandfathered. On v2.50 the new lines are bought as far as the level allows.
BOUND=r'''(L)=>{
  window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};window.mishTick=()=>{};window.fireTick=()=>{};
  if(S.ob)S.ob.st='skip';S.events=[];S.nextEvent=1e12;S.fires={};if(S.mish)S.mish.next=1e12;if(S.orders)S.orders.next=1e12;
  if(S.daily){S.daily.active=[];S.daily.offers=[];} if(S.trade){S.trade.fleet=[];S.trade.lvl=1;} if(S.seas)S.seas.st='skip';
  S.premium.lvl=1;S.coins=1e30;S.runCS=1;S.power.lvl=0;S.legacy=0;S.upgrades={};
  for(const n of RNODES) if(!n.rep) S.research[n.id]=1;
  for(const b of BUILDINGS){S.buildings[b.id].lvl=L;S.buildings[b.id].on=true;}
  for(const r of RES) if(S.autosell) S.autosell[r.id]=canSell(r.id);
  if(typeof wsGrandfather==='function') wsGrandfather(S);
  for(const c of COLLECTORS) S.collectors[c.id]=800;
  const has=UPGRADES.some(u=>u.id==='drum');
  if(has){S.legacy=5000;for(const id of ['drum','chairline']){const u=UPGRADES.find(x=>x.id===id);let lv=0;for(let k=1;k<=upMax(u);k++) if(upReqOk(u,k)) lv=k;S.upgrades[id]=lv;}}
  M=computeMods();
  const ids=['pellet','paper','cabinetry','showroom','boatyard'];
  const acc={}; for(const id of ids) acc[id]={chip:0,chair:0,ply:0,f:0};
  let ply=0,n=0;
  for(let k=0;k<80;k++){S.forest.m=1e12;tick(1,false);if(k<30) continue;n++;
    const users=BUILDINGS.filter(b=>b.inp.plywood&&S.buildings[b.id].lvl&&bldUnlocked(b.id)&&!(typeof surplusIn==='function'&&surplusIn(b.id,'plywood')));
    if(users.some(b=>bstat[b.id]&&bstat[b.id].lim==='plywood'&&bstat[b.id].f<.95)) ply++;
    for(const id of ids){const bs=bstat[id];acc[id].f+=bs.f;
      if(bs.lim==='chips'&&bs.f<.95) acc[id].chip++;
      if(bs.lim==='chairs'&&bs.f<.95) acc[id].chair++;
      if(bs.lim==='plywood'&&bs.f<.95) acc[id].ply++;}}
  const o={}; for(const id of ids) o[id]={chip:acc[id].chip/n,chair:acc[id].chair/n,ply:acc[id].ply/n,f:acc[id].f/n};
  return {has,up:has?[upLvl('drum'),upLvl('chairline')]:[0,0],ply:ply/n,o};
}'''
EARLY=r'''(()=>{let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  S.coins=50;S.totalEarned=0;S.time=0;S.legacy=0;S.upgrades={};if(S.ob)S.ob.st='skip';if(S.wx)S.wx.next=1e15;
  for(const c of COLLECTORS) S.collectors[c.id]=0;for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
  const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
  for(let k=0;k<14400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10)TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10)TT.buyCollector('truck',1);
    for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,canSell('logs')];})()'''
with sync_playwright() as p:
    b=p.chromium.launch();errs=[];missing=[]
    def page(dev=None,init=CLEAR,url=URL):
        if dev:d=dict(p.devices[dev]);d.pop('default_browser_type',None);ctx=b.new_context(**d,service_workers='block')
        else:ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(SEED+init);pg=ctx.new_page()
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('response',lambda r:missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url);pg.wait_for_timeout(1200);return pg
    def touch(pg,bt):
        bt.scroll_into_view_if_needed();bx=bt.bounding_box();vw=pg.viewport_size['width']
        ok(bool(bx) and bx['height']>=40 and bx['x']>=-1 and bx['x']+bx['width']<=vw+2,f'touch target fits ({None if not bx else round(bx["height"])}px)')
        if not bx: return
        cdp=pg.context.new_cdp_session(pg);x,y=bx['x']+bx['width']/2,bx['y']+min(bx['height']/2,24)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        pg.wait_for_timeout(400)
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))==(2,50),f"VERSION is 2.50 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read());ok(m and m.group(1)=='2.50','service-worker cache is v2.50')
    r=E(pg,"""()=>({n:UPGRADES.length,logs:canSell('logs'),
      rec:[BMAP.chipper.inp.logs,BMAP.chipper.out.chips,BMAP.carpentry.inp.planks,BMAP.carpentry.out.chairs,BMAP.pellet.inp.chips,BMAP.paper.inp.chips,BMAP.cabinetry.inp.chairs,BMAP.showroom.inp.chairs,BMAP.boatyard.inp.chairs],
      cost:[UPGRADES.find(u=>u.id==='drum').cost,UPGRADES.find(u=>u.id==='chairline').cost]})""")
    ok(r['n']==33 and r['logs'] is False,f"33 upgrades, logs unsellable ({r['n']})")
    ok(r['rec']==[6,6,4,1,20,40,2,2,2] and r['cost']==[15000,120000],f"recipes unchanged, catalog stickers stay 15× the first building level ({r})")
    # Owned or not, the curve is ×1 through the opening levels. Legacy 0 cannot buy either line.
    r=E(pg,"""()=>{S.legacy=0;S.upgrades={drum:5,chairline:5};S.buildings.chipper.lvl=25;S.buildings.carpentry.lvl=20;S.buildings.chipper.on=S.buildings.carpentry.on=true;M=computeMods();
      const early=[reliefMul('chipper'),reliefMul('carpentry'),chainYield('chipper'),bSpeed('chipper')];
      S.upgrades={};M=computeMods();const bare=bSpeed('chipper');
      const u=UPGRADES.find(x=>x.id==='drum'),h=UPGRADES.find(x=>x.id==='chairline');
      return {early,bare,no:upReqOk(u)===false&&upReqOk(h)===false&&TT.buyUpgrade('drum')===false};}""")
    ok(r['early'][0]==1 and r['early'][1]==1 and r['early'][2]==1 and abs(r['early'][3]-r['bare'])<1e-9 and r['no'],f"through Lv 25 the yield is ×1 and a fresh run cannot buy the lines ({r})")
    # Lv 50: Drum Chipper is at its cap (×4.6 at line Lv 3) and uses the same logs. Chair Line is still shut.
    # Lv 60: Chair Line is ×31 at line Lv 3, same planks, and the building's speed is unchanged.
    r=E(pg,"""()=>{S.legacy=5000;S.coins=1e18;S.runCS=1;S.upgrades={};for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=false;}
      S.buildings.chipper.lvl=50;S.buildings.chipper.on=true;for(const c of COLLECTORS) S.collectors[c.id]=0;M=computeMods();
      const run=()=>{S.res.logs=1e9;S.res.chips=0;S.autosell.chips=false;const l0=S.res.logs;tick(1,false);return {logs:l0-S.res.logs,chips:S.res.chips,sp:bSpeed('chipper'),y:chainYield('chipper')};};
      const a=run();S.upgrades.drum=3;M=computeMods();const c=run();
      S.buildings.chipper.on=false;S.buildings.carpentry.lvl=60;S.buildings.carpentry.on=true;S.upgrades.chairline=0;M=computeMods();
      const seat=()=>{S.res.planks=1e9;S.res.chairs=0;S.autosell.chairs=false;S.autosell.planks=false;const p0=S.res.planks;tick(1,false);return {planks:p0-S.res.planks,chairs:S.res.chairs,sp:bSpeed('carpentry'),y:chainYield('carpentry')};};
      const h0=seat();S.upgrades.chairline=3;M=computeMods();const h1=seat();
      return {a,c,h0,h1,cap:1+(4-1)*1.2,hcap:1+(26-1)*1.2};}""")
    ok(abs(r['c']['logs']-r['a']['logs'])<1e-6*r['a']['logs'] and abs(r['c']['sp']-r['a']['sp'])<1e-9 and abs(r['c']['chips']/r['a']['chips']-r['cap'])<1e-6,f"Lv 50 Drum Chipper: same logs, same speed, ×4.6 chips ({r['a']['chips']:.4g} → {r['c']['chips']:.4g})")
    ok(abs(r['h1']['planks']-r['h0']['planks'])<1e-6*max(1,r['h0']['planks']) and abs(r['h1']['sp']-r['h0']['sp'])<1e-9 and abs(r['h1']['y']-r['hcap'])<1e-9 and abs(r['h1']['chairs']/r['h0']['chairs']-r['hcap'])<1e-6,f"Lv 60 Chair Line: same planks, same speed, ×31 chairs ({r['h0']['chairs']:.4g} → {r['h1']['chairs']:.4g})")
    # At the unlock level the price is 15× that building's current upgrade (not the Lv 1 sticker) and at least
    # RELIEF_SEC seconds of income. Forest value scales the building side, so a Replant is not pocket change.
    r=E(pg,r"""()=>{
      const quiet=()=>{coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}};
      const one=(bid,lv)=>{const b=BMAP[bid];return b.cost*cs()*Math.pow(b.scale,lv);};
      const rows=[];
      S.legacy=5000;S.upgrades={};quiet();
      for(const [id,bid,lv] of [['drum','chipper',28],['chairline','carpentry',56]]){
        const u=UPGRADES.find(x=>x.id===id);
        S.buildings[bid].lvl=lv;S.upgrades[id]=0;
        for(const cs of [1,50,675,1e6,1e12]){
          S.runCS=cs;quiet();S.upgrades[id]=0;const cost=upCost(u,1),bld=one(bid,lv);S.coins=cost*3;const c0=S.coins;
          const bought=TT.buyUpgrade(id)===true;rows.push({k:'bld',id,cs,ratio:cost/bld,paid:(c0-S.coins)/cost,cost,sticker:u.cost*cs});
          S.upgrades[id]=0;}
        S.runCS=1;quiet();S.buildings[bid].lvl=lv;S.upgrades[id]=0;coinRate=1e9;if(S.run){S.run.inc=1e9;S.run.incE=1e9;}
        const ci=upCost(u,1),bld=one(bid,lv);
        rows.push({k:'inc',id,cs:1,ratio:ci/(RELIEF_SEC*1e9),paid:ci/bld,cost:ci,sticker:u.cost});
        const hi=60;S.buildings[bid].lvl=hi;S.upgrades[id]=1;quiet();
        const cn=upCost(u,2),bh=one(bid,hi);
        coinRate=752e6;if(S.run){S.run.inc=1504e6;S.run.incE=1504e6;}
        const ce=upCost(u,2);
        rows.push({k:'late',id,cs:1,ratio:cn/bh,paid:ce/(RELIEF_SEC*752e6*12),cost:ce,sticker:bh});
      }
      S.runCS=1;quiet();S.upgrades={};return {sec:RELIEF_SEC,rows};}""")
    for row in r['rows']:
        if row['k']=='bld':
            ok(abs(row['ratio']-15)<1e-6 and abs(row['paid']-1)<1e-6 and row['cost']>row['sticker']*50,f"{row['id']} at unlock, forest ×{row['cs']:g}: 15× the current upgrade, not the {row['sticker']:.3g} sticker ({row['cost']:.3g})")
        elif row['k']=='inc':
            ok(abs(row['ratio']-1)<1e-6 and row['paid']>15,f"{row['id']} at unlock with 1B/s income: 30s of income, above the building ({row['cost']:.3g})")
        else:
            ok(row['ratio']>=15*12*0.999 and abs(row['paid']-1)<1e-6 and row['cost']>row['sticker']*100,f"{row['id']} at Lv 60: next level is 15×12 the current upgrade and 30s×12 of income ({row['cost']:.3g} vs upgrade {row['sticker']:.3g})")
    # Lv 2 costs ×12 and needs the normal building gate; the description scales with the level rule.
    r=E(pg,"""()=>{S.legacy=5000;S.runCS=1;coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}S.coins=1e15;S.upgrades={};S.buildings.chipper.lvl=28;const u=UPGRADES.find(x=>x.id==='drum');
      const c1=upCost(u,1);TT.buyUpgrade('drum');S.buildings.chipper.lvl=24;const no=TT.buyUpgrade('drum')===false;S.buildings.chipper.lvl=28;const c2=upCost(u,2);const yes=TT.buyUpgrade('drum')===true;
      S.legacy=0;const lock=u.lock();return {r:c2/c1,no,yes,d:upDesc(u,3),lock};}""")
    ok(abs(r['r']-12)<1e-9 and r['no'] and r['yes'] and '×4.6' in r['d'] and 'Legacy' in r['lock'],f"Lv 2 costs ×12, the Lv 3 text is ×4.6, and the lock names Legacy ({r})")
    pg.close()
    # Opening script: identical to v2.49. Fresh pages, so nothing above can leak in.
    pg=page();e_new=E(pg,EARLY);pg.close()
    pg=page(url=OLD);e_old=E(pg,EARLY);pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and abs(e_new[0]-e_old[0])<=1e-6*e_old[0],f'opening script matches v2.49 ({e_new[0]:.6f} vs {e_old[0]:.6f}, levels {e_new[1:]})')
    # Equal levels. v2.49 has no lines; v2.50 buys each line as far as that level allows.
    ctx=page(url=OLD);old={}
    for L in (40,50,60,80,100,150):
        old[L]=E(ctx,f'({BOUND})({L})')
    ctx.close()
    ctx=page();new={}
    for L in (40,50,60,80,100,150):
        new[L]=E(ctx,f'({BOUND})({L})')
    ctx.close()
    print('   equal levels  L  chips v2.49→v2.50   chairs cab/show/boat   plywood')
    for L in (40,50,60,80,100,150):
        o,n=old[L],new[L]
        def f(x,id,k): return x['o'][id][k]
        print(f"   {L:>3}  chip {f(o,'pellet','chip'):.2f}→{f(n,'pellet','chip'):.2f} (fed {f(o,'pellet','f'):.2f}→{f(n,'pellet','f'):.2f})  "
              f"cab {f(o,'cabinetry','chair'):.2f}→{f(n,'cabinetry','chair'):.2f}  show {f(o,'showroom','chair'):.2f}→{f(n,'showroom','chair'):.2f}  "
              f"boat {f(o,'boatyard','chair'):.2f}→{f(n,'boatyard','chair'):.2f}  ply {o['ply']:.2f}→{n['ply']:.2f}  up {n['up']}")
        ok(n['ply']<=o['ply']+1e-9,f'L{L}: plywood-bound time is not worse ({o["ply"]:.2f} → {n["ply"]:.2f})')
        ok(abs(f(n,'pellet','chip')-f(n,'paper','chip'))<1e-9,f'L{L}: Pellet Press and Paper Mill share the chip wait')
    ok(new[40]['o']['pellet']['f']>=old[40]['o']['pellet']['f']+0.2 and new[40]['ply']==0,f"L40: chips are fed harder ({old[40]['o']['pellet']['f']:.2f} → {new[40]['o']['pellet']['f']:.2f}) and plywood stays clear")
    ok(old[50]['o']['pellet']['chip']==1 and new[50]['o']['pellet']['chip']==0 and new[50]['o']['paper']['chip']==0,f"L50: Pellet Press and Paper Mill stop waiting on chips")
    for L in (60,80):
        ok(old[L]['o']['pellet']['chip']==1 and new[L]['o']['pellet']['chip']==0,f'L{L}: chips-bound time 100% → 0%')
    ok(new[100]['o']['pellet']['chip']<=0.02 and new[150]['o']['pellet']['chip']<=0.02 and new[100]['o']['pellet']['chip']<=old[100]['o']['pellet']['chip']+1e-9 and new[150]['o']['pellet']['chip']<=old[150]['o']['pellet']['chip']+1e-9,'L100 and L150: chips stay fed, and v2.50 is not worse than v2.49')
    for L in (60,80,100,150):
        for bid in ('cabinetry','showroom','boatyard'):
            ok(old[L]['o'][bid]['chair']==1 and new[L]['o'][bid]['chair']==0,f'L{L}: {bid} chairs-bound time 100% → 0%')
    ok(new[50]['o']['cabinetry']['chair']==1 and new[40]['o']['cabinetry']['chair']==1,'below Lv 56 the Chair Line is shut, so Cabinets are still chairs-bound at Lv 40 and Lv 50')
    # Replant clears both lines. Logs were not sold along the way.
    pg=page()
    r=E(pg,"""()=>{S.coins=1e18;S.totalEarned=1e18;S.legacy=80;S.buildings.chipper.lvl=40;S.buildings.carpentry.lvl=70;S.upgrades.drum=2;S.upgrades.chairline=3;S.res.logs=800;const sold=sellAll('logs');const g=doPrestige();
      return {g,sold,can:canSell('logs'),drum:upLvl('drum'),chair:upLvl('chairline'),lv:S.buildings.chipper.lvl,leg:S.legacy};}""")
    ok(r['g'] and r['sold']==0 and r['can'] is False and r['drum']==0 and r['chair']==0 and r['lv']==0 and r['leg']>=80,f'Replant clears both lines; logs were not sold ({r})')
    # Saves.
    sv=E(pg,"""()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.49';o.coins=250000;o.legacy=40;o.upgrades={steamsaw:2,sharp:1};o.buildings.sawmill={lvl:30,on:true};o.buildings.chipper={lvl:40,on:true};o.res.logs=80;return JSON.stringify(o);}""")
    pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    r=E(pg,"()=>({v:S.version,st:upLvl('steamsaw'),drum:upLvl('drum'),chair:upLvl('chairline'),lv:S.buildings.chipper.lvl,logs:S.res.logs,can:canSell('logs'),coin:S.coins,y:chainYield('chipper')})")
    ok(ver(r['v'])>=(2,50) and r['st']==2 and r['drum']==0 and r['chair']==0 and r['lv']==40 and r['can'] is False and r['coin']>2e5 and abs(r['y']-2.05)<1e-9,f"v2.49 save loads, new lines stay unbought, Lv 40 chip yield is still ×2.05 ({r})")
    pg.close()
    for ver_s,lvl in (('2.39',20),('2.33',12),('2.24',8)):
        raw=json.dumps(json.dumps({'version':ver_s,'coins':18000,'legacy':0,'upgrades':{'sharp':1},'buildings':{'sawmill':{'lvl':lvl,'on':True},'chipper':{'lvl':6,'on':True}},'res':{'logs':40,'planks':10}}))
        pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
        r=E(pg,"()=>{let s=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}return {v:S.version,coin:S.coins,saw:S.buildings.sawmill.lvl,drum:upLvl('drum'),logs:canSell('logs'),s,ok:isFinite(S.coins)&&isFinite(chainYield('chipper'))};}")
        ok(r['ok'] and r['logs'] is False and r['drum']==0 and r['saw']==lvl and r['coin']>0,f'{ver_s} save loads and runs ({r})')
        pg.close()
    dmg=json.dumps(json.dumps({'version':'2.49','coins':-20,'upgrades':{'drum':'bad','chairline':True,'steamsaw':2},'buildings':{'chipper':{'lvl':'x','on':True},'carpentry':{'lvl':3,'on':True}},'res':{'logs':-4}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg,"()=>{let s=0;for(let k=0;k<5;k++){S.forest.m=1e6;tick(1,false);s+=bSpeed('carpentry');}return {coin:S.coins,drum:upLvl('drum'),chair:upLvl('chairline'),lv:S.buildings.chipper.lvl,logs:S.res.logs,s,ok:isFinite(S.coins)&&isFinite(reliefMul('chipper'))&&isFinite(reliefMul('carpentry'))};}")
    ok(r['ok'] and r['coin']>=0 and r['drum']==0 and r['chair']==1 and r['lv']==0 and r['logs']==0 and r['s']>=0,f'damaged save runs ({r})')
    pg.close()
    # Desktop: the two cards and a real click. Income is quiet here so the charge is the building floor, not a moving income number.
    SHOW='''()=>{'''+CALM+'''for(const a of ACH)S.ach[a.id]=1;if(S.run&&S.run.goals)for(const g of GOALS)S.run.goals[g.id]=1;
      S.coins=1e16;S.totalEarned=1e16;S.legacy=5000;S.runCS=1;S.upgrades={};coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
      for(const k in S.autosell)S.autosell[k]=false;
      S.buildings.chipper.lvl=60;S.buildings.chipper.on=true;S.buildings.carpentry.lvl=60;S.buildings.carpentry.on=true;
      M=computeMods();if(typeof ntClear==='function')ntClear();document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());
      openSheet('upg');TT.render();}'''
    # Late running factory: line already bought, income held by the run's income floor so the sheet price cannot decay into pocket change.
    SHOT='''(which)=>{'''+CALM+'''for(const a of ACH)S.ach[a.id]=1;if(S.run&&S.run.goals)for(const g of GOALS)S.run.goals[g.id]=1;
      S.coins=9.68e15;S.totalEarned=9.68e15;if(typeof dispCoins!=='undefined')dispCoins=S.coins;
      S.legacy=80;S.runCS=1;S.upgrades={drum:1,chairline:1};
      const lv={sawmill:60,chipper:60,kiln:45,carpentry:60,peeler:40,pellet:40,paper:36,furniture:30,beamsaw:24,glulam:16};
      for(const id in lv){S.buildings[id].lvl=lv[id];S.buildings[id].on=true;}
      S.collectors.lumberjack=30;S.collectors.chainsaw=12;S.collectors.truck=6;
      for(const k in S.autosell)S.autosell[k]=false;
      coinRate=752e6;if(S.run){S.run.inc=1504e6;S.run.incE=1504e6;}
      M=computeMods();if(typeof ntClear==='function')ntClear();document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());
      openSheet('bld',which);if(typeof bpSig!=='undefined')bpSig='';TT.render();
      const el=[...document.querySelectorAll('.bp-yield')].pop();if(el)el.scrollIntoView({block:'center'});
      return {io:document.getElementById('bpIo').innerText,desc:(document.getElementById('bpDesc')||{}).innerText||'',price:fmt(upCost(UPGRADES.find(u=>u.id===LINE_UP[which]),2))};}'''
    pg=page();E(pg,'('+SHOW+')()');pg.wait_for_timeout(400)
    ids=E(pg,"[...document.querySelectorAll('.upg-card[data-id]')].map(e=>e.dataset.id)")
    ok('drum' in ids and 'chairline' in ids and ids.index('drum')<ids.index('chairline'),f'desktop: both new lines are on offer, Drum Chipper first ({ids})')
    card=pg.locator('.upg-card[data-id="drum"]')
    ok('Drum Chipper' in card.inner_text() and '×4' in card.inner_text(),'desktop: Drum Chipper explains the chip yield')
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    c0=E(pg,'''(()=>{const u=UPGRADES.find(x=>x.id==="drum");const bld=bulkCost(BMAP.chipper.cost,BMAP.chipper.scale,S.buildings.chipper.lvl,1);return [S.coins,upCost(u),bld];})()''')
    card.locator('button').click();pg.wait_for_timeout(250)
    ok(E(pg,'upLvl("drum")')==1 and abs(E(pg,'S.coins')-(c0[0]-c0[1]))<1 and c0[1]>=c0[2]*15*0.999 and c0[1]>1e8,f"desktop: click buys Drum Chipper for {c0[1]:.3g}, at least 15× the {c0[2]:.3g} upgrade")
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    bt=pg.locator('.upg-card[data-id="chairline"] button');bt.scroll_into_view_if_needed();bt.click();pg.wait_for_timeout(200)
    ok(E(pg,'upLvl("chairline")')==1,'desktop: click buys Chair Line')
    shot=E(pg,'('+SHOT+')("chipper")')
    ok('base recipe' in shot['desc'] and 'Chip yield' in shot['io'] and 'level curve' in shot['io'] and '×3.45' in shot['io'] and '×4.00' in shot['io'] and '×13.80' in shot['io'],f"Chipper sheet separates the curve from Drum Chipper ({shot['io'][-240:]!r})")
    ok('×4.00 now' in shot['io'] and '×5.20 at Lv 5' in shot['io'] and 'up to ×4' not in shot['io'] and shot['price'] in shot['io'],f"Drum Chipper shows ×4 now, ×5.20 at max, and the late price {shot['price']}")
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    pg.locator('#sheet').screenshot(path=shot_path('desktop-yield.png'))
    E(pg,"closeSheet();fitCamera(true);if(typeof ntClear==='function')ntClear();document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove())")
    pg.wait_for_timeout(200)
    E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
    pg.screenshot(path=shot_path('desktop.png'))
    pg.close()
    phones={'iPhone 13':'drum','Pixel 7':'chairline'}
    for dev,uid in phones.items():
        pg=page(dev);E(pg,'('+SHOW+')()');pg.wait_for_timeout(500)
        bt=pg.locator(f'.upg-card[data-id="{uid}"] button')
        touch(pg,bt)
        if E(pg,f'upLvl("{uid}")')!=1:
            bt.tap();pg.wait_for_timeout(300)
        ok(E(pg,f'upLvl("{uid}")')==1,f'{dev}: tap buys {uid}')
        which='carpentry' if uid=='chairline' else 'chipper'
        shot=E(pg,'('+SHOT+')('+json.dumps(which)+')')
        if uid=='chairline':
            ok('base recipe' in shot['desc'] and '×26.00 now' in shot['io'] and '×36.00 at Lv 5' in shot['io'] and 'base recipe stays 1 chair' in shot['io'] and 'up to ×26' not in shot['io'] and shot['price'] in shot['io'],f"{dev}: Chair Line is the multiplier, the recipe stays 1 chair, price {shot['price']} ({shot['io'][-220:]!r})")
        else:
            ok('Drum Chipper' in shot['io'] and '×4.00 now' in shot['io'] and '×5.20 at Lv 5' in shot['io'] and shot['price'] in shot['io'],f"{dev}: building sheet names Drum Chipper and its price {shot['price']}")
        E(pg,"document.querySelectorAll('.toast,#fxLayer .confetti').forEach(e=>e.remove());if(typeof ntClear==='function')ntClear()")
        if dev=='iPhone 13':
            pg.locator('#sheet').screenshot(path=shot_path('mobile-yield.png'))
        else:
            pg.screenshot(path=shot_path('mobile.png'))
        pg.close()
    ok(not errs,'no console errors '+str(errs[:3]))
    ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -',f)
sys.exit(1 if FAILS else 0)
