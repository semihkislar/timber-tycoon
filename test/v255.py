# v2.55: Town growth. House kits from the Timber-frame workshop become a village by the
# south gate. Each stage adds 2.5% to Town Market sales of Phase 1–2 goods, capped at
# +15%. Logs stay unsellable. The opening minutes match the v2.54 snapshot.
from playwright.sync_api import sync_playwright
import os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, BASE, ROOT, ver
from _pace import ready, paint, touch_at
from shots import shot_path
FAILS=[]
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js):
    return pg.evaluate(js)
def near(a, b, rel=1e-6):
    if a==b: return True
    d=max(abs(a), abs(b), 1)
    return abs(a-b)<=rel*d
OLD=BASE+'releases/v2.54/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=255;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;}if(S.mish)S.mish.next=1e15;S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx){S.wx.w="clear";S.wx.next=1e15;}if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.modal-bg").forEach(e=>e.remove());}'''
EARLY=r'''(()=>{const __t=Date.now();Date.now=()=>__t;let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};
  S.coins=50;S.totalEarned=0;S.time=0;S.legacy=0;S.runCS=1;S.upgrades={};if(S.ob)S.ob.st="skip";
  if(S.forest){S.forest.m=1200;S.forest.y=0;S.forest.s=0;S.forest.st=0;}
  if(S.res){for(const k in S.res)S.res[k]=0;}
  if(S.wx){S.wx.clock=126;S.wx.w="clear";S.wx.ends=0;S.wx.next=1e15;}
  coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
  for(const c of COLLECTORS) S.collectors[c.id]=0;
  for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
  const want=["sawmill","chipper","kiln","carpentry","peeler","pellet","paper","furniture"];
  for(let k=0;k<2400;k++){if(k%4==0){TT.buyCollector("lumberjack",1);if(S.collectors.lumberjack>=10)TT.buyCollector("chainsaw",1);if(S.collectors.chainsaw>=10)TT.buyCollector("truck",1);
    for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,canSell("logs"),S.res.logs>0];})()'''
SHOW=r'''()=>{'''+QUIET+r'''
  S.coins=1e15;S.totalEarned=1e15;S.premium.lvl=Math.max(1,S.premium.lvl||0);
  for(const id of ["sawmill","chipper","kiln","carpentry","peeler","beamsaw","glulam","panelpress","framer"]){S.buildings[id].lvl=Math.max(4,S.buildings[id].lvl);S.buildings[id].on=true;}
  S.town.made=250000;townStage();S.town.best=Math.max(6,S.town.best||0);S.town.seen=6;
  S.ach.town2=1;S.ach.town6=1;
  TT.setClock&&TT.setClock(10*60);S.wx.w="clear";S.wx.next=1e15;
  const p=P(38.45,38.6,8);const c=scene.cam;c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,Math.max(c.fitZ*2.4,1.15));
  if(typeof closeSheet==="function") closeSheet();
  TT.render();
}'''
HOOK=r'''()=>{if(window.__pc)return;window.__pc=pillCached;window.__pl=[];pillCached=function(c,x,y,t,o){__pl.push(t);return __pc.apply(this,arguments);};}'''
def shot_clean(pg):
    E(pg, QUIET)
    E(pg, r'''()=>{if(typeof checkAch==="function")checkAch(true);if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.confetti,.modal-bg").forEach(e=>e.remove());const f=document.getElementById("fxLayer");if(f)f.innerHTML="";scene.particles.length=0;}''')
    paint(pg, 2)
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR, url=URL, vp=None):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport=vp or {'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,55), f"VERSION is 2.55 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    m=re.search(r"timber-tycoon-v([\d.]+)", sw)
    ok(m and ver(m.group(1))>=(2,55), f"service-worker cache is timber-tycoon-v2.55 or newer ({m.group(1) if m else sw[:40]})")
    ok(E(pg,'canSell("logs")') is False and E(pg,'sellAll("logs")')==0, 'logs stay unsellable')
    # ---- rules ----
    r=E(pg, r'''()=>{
      const stages=TOWN_STAGES.map(s=>s.n);
      const bonus=[];
      for(const n of [0,1,24,25,249,250,2499,2500,24999,25000,249999,250000,1e7]){
        S.town.made=n; S.town.stage=-1; bonus.push([n, townStage(), +townMult().toFixed(4)]);
      }
      S.town.made=250000; townStage(); M=computeMods();
      const base=price("planks");
      S.res.planks=100; S.autosell.planks=false;
      const c0=S.coins; const got=sellAll("planks");
      S.res.houses=40; const hs=sellAll("houses");
      S.res.logs=80; S.autosell.logs=true; const lg=sellAll("logs");
      const goods={};
      for(const id of ["planks","beams","chairs","glulam","panels","houses","toys","boats","glue","plywood","giftbox"]) goods[id]=townMarketGood(id);
      const ord6=ordPay(80,"planks",90,1.5,2.5,.25);
      const ship6=shReward({city:"ist",res:"planks",qty:10,mult:1.2,t:100,cr:0});
      const p6=price("planks");
      S.town.made=0; townStage(); M=computeMods();
      const ord0=ordPay(80,"planks",90,1.5,2.5,.25);
      const ship0=shReward({city:"ist",res:"planks",qty:10,mult:1.2,t:100,cr:0});
      return {stages,bonus,got,base,paid:c0,coins:S.coins,hs,hb:price("houses")*40,lg,goods,ord6,ord0,ship6,ship0,p6,p0:price("planks")};
    }''')
    ok(r['stages']==[0,1,25,250,2500,25000,250000], f"stage thresholds ({r['stages']})")
    expect={0:(0,1),1:(1,1.025),24:(1,1.025),25:(2,1.05),249:(2,1.05),250:(3,1.075),2499:(3,1.075),2500:(4,1.1),24999:(4,1.1),25000:(5,1.125),249999:(5,1.125),250000:(6,1.15),10000000:(6,1.15)}
    bad=[row for row in r['bonus'] if expect[row[0]]!=(row[1], row[2])]
    ok(not bad, f"bonus is 2.5% per stage, capped at +15% ({bad[:3]})")
    ok(r['base']>0 and near(r['got']/(r['base']*100), 1.15, 1e-9), f"Sell of planks at Timber Town pays +15% ({r['got']} vs {r['base']*115})")
    ok(near(r['hs'], r['hb']) and r['lg']==0, f"houses are not bonused and logs still pay nothing ({r['hs']}, {r['lg']})")
    ok(r['goods']['planks'] and r['goods']['beams'] and r['goods']['chairs'] and r['goods']['glulam'] and r['goods']['panels'] and r['goods']['glue'] and r['goods']['plywood'] and not r['goods']['houses'] and not r['goods']['toys'] and not r['goods']['boats'] and not r['goods']['giftbox'], f"only Phase 1–2 goods ({r['goods']})")
    ok(near(r['ord6'], r['ord0']) and near(r['ship6'], r['ship0']) and near(r['p6'], r['p0']), f"orders, exports and price() ignore the town ({r['ord6']} vs {r['ord0']})")
    # auto-sell uses the same multiplier; a sale does not add houses to `made`
    r=E(pg, r'''()=>{
      for(const b of BUILDINGS) S.buildings[b.id].on=false;
      S.orders.acts=[]; S.orders.offers=[]; S.orders.next=1e15; if(S.ship){S.ship.contract=null;S.ship.offer=null;}
      if(S.daily){S.daily.active=[];S.daily.offers=[];} if(S.seas) S.seas.st="wait";
      S.town.made=25; townStage(); M=computeMods();
      S.res.planks=800; S.autosell.planks=true; S.res.logs=500; S.autosell.logs=true;
      const c0=S.coins, p=price("planks"), m0=S.town.made;
      tick(1,false);
      const sold=800-S.res.planks, gain=S.coins-c0;
      S.buildings.framer.lvl=30; S.buildings.framer.on=true; S.premium.lvl=2;
      S.res.glulam=1e6; S.res.plywood=1e6; S.autosell.houses=true;
      const before=S.town.made;
      tick(3,false);
      return {sold,gain,want:sold*p*1.05,logs:S.res.logs,made:S.town.made-before,still:S.town.made>=m0,stage:townStage()};
    }''')
    ok(r['sold']>100 and near(r['gain'], r['want'], 1e-6) and r['logs']==500, f"auto-sell of planks takes +5% at Village and does not sell logs ({r['sold']:.1f}, gain {r['gain']:.2f})")
    ok(r['made']>=1 and r['stage']>=1, f"kits that enter stock raise `made` ({r['made']:.2f}, stage {r['stage']})")
    # ---- forest value: the bonus is a percentage, never a tiny flat coin ----
    r=E(pg, r'''()=>{
      for(const b of BUILDINGS) S.buildings[b.id].on=false;
      S.autosell.planks=false; const out=[];
      for(const cs of [1,50,675]){
        S.runCS=cs; S.town.made=250000; townStage(); M=computeMods();
        S.res.planks=1000; const c0=S.coins; const v=sellAll("planks");
        out.push({cs, v, ratio:v/(1000*price("planks")), finite:isFinite(v)&&v>1000*price("planks")*1.1});
      }
      S.runCS=1; S.town.made=0; townStage();
      return out;
    }''')
    ok(all(near(row['ratio'], 1.15) and row['finite'] for row in r), f"forest value ×1/×50/×675 the bonus stays +15% of the sale ({r})")
    # ---- Replant keeps best ----
    r=E(pg, r'''()=>{
      S.town.made=2500; townStage(); S.town.best=4; S.town.seen=4; S.ach.town2=1;
      S.totalEarned=1e15; S.legacy=3; S.res.houses=12;
      const g=doPrestige();
      return {g:!!g, made:S.town.made, stage:townStage(), best:S.town.best, seen:S.town.seen, ach:!!S.ach.town2, logs:canSell("logs"), houses:S.res.houses||0};
    }''')
    ok(r['g'] and r['made']==0 and r['stage']==0 and r['best']==4 and r['seen']==0 and r['ach'] and r['logs'] is False and r['houses']==0, f"Replant clears the village and keeps the best stage ({r})")
    # ---- early game vs v2.54 ----
    pg.close()
    pg=page(); e_new=E(pg, EARLY); pg.close()
    pg=page(url=OLD); e_old=E(pg, EARLY); pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and near(e_new[0], e_old[0], 1e-6), f"opening script matches v2.54 ({e_new[0]:.4f} vs {e_old[0]:.4f}, levels {e_new[1:]})")
    # ---- saves ----
    pg=page()
    for ver_s, houses, lvl in (('2.54',40,12),('2.53',0,8),('2.39',3,6),('2.33',0,4),('2.24',0,2)):
        raw=json.dumps(json.dumps({'version':ver_s,'coins':22000,'legacy':0,'upgrades':{'sharp':1},'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':30,'planks':8,'houses':houses}}))
        pg.close(); pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
        r=E(pg, r'''()=>{let s=0;for(let k=0;k<4;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell("logs"),made:S.town.made,stage:townStage(),best:S.town.best,ok:isFinite(S.town.made)&&isFinite(townMult())&&isFinite(S.coins)&&s>0};}''')
        want=0 if houses<1 else (2 if houses>=25 else 1)
        seeded=houses if houses>0 else 0
        ok(r['ok'] and ver(r['v'])>=(2,55) and r['saw']==lvl and r['logs'] is False and near(r['made'], seeded) and r['stage']==want and r['best']>=want, f"{ver_s} save loads (houses {houses} → stage {r['stage']}, made {r['made']})")
    dmg=json.dumps(json.dumps({'version':'2.54','coins':9000,'buildings':{'sawmill':{'lvl':5,'on':True}},'res':{'logs':-3,'houses':80,'planks':'no'},'town':{'made':None,'stage':'village','best':None,'seen':'later'}}))
    pg.close(); pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    r=E(pg, r'''()=>{for(let k=0;k<3;k++){S.forest.m=1e6;tick(1,false);}return {made:S.town.made,stage:townStage(),best:S.town.best,seen:S.town.seen,logs:S.res.logs,ok:isFinite(S.town.made)&&isFinite(S.town.best)&&isFinite(townMult())&&isFinite(S.coins)};}''')
    ok(r['ok'] and near(r['made'],80) and r['stage']==2 and r['best']>=2 and r['seen']==2 and r['logs']==0, f"damaged town state is repaired from stock ({r})")
    badtown=json.dumps(json.dumps({'version':'2.54','coins':4000,'res':{'houses':2},'town':'nope'}))
    pg.close(); pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+badtown+');')
    r=E(pg, '()=>({made:S.town.made,stage:townStage(),ok:isFinite(townMult())})')
    ok(r['ok'] and near(r['made'],2) and r['stage']==1, f"a non-object town block seeds from stock ({r})")
    # ---- layout: village tiles vs buildings, roads, belts, vehicle paths ----
    E(pg, QUIET)
    r=E(pg, r'''()=>{
      S.coins=1e16; S.premium.lvl=3; S.town.made=250000; townStage(); S.town.seen=6;
      for(const id in LOTS){S.buildings[id].lvl=400;S.buildings[id].on=true;}
      M=computeMods(); coinRate=5000;
      scene.marketVans=[]; scene._mktN=0; scene._mktCD=0;
      for(let k=0;k<10;k++){scene._mktCD=0; mktFleetSync();}
      if(typeof syncTierLifts==="function"){scene._tsig=null; syncTierLifts();}
      const foot=townFoot();
      const hits=[];
      function samples(pts){const o=[]; if(!pts||!pts.length) return o;
        for(let i=0;i<pts.length;i++){o.push(pts[i]); if(i){const a=pts[i-1],c=pts[i],n=Math.max(1,Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/0.3));
          for(let k=1;k<n;k++) o.push([a[0]+(c[0]-a[0])*k/n, a[1]+(c[1]-a[1])*k/n]);}} return o;}
      function hitBox(q,f,m){m=m||0; return q[0]>f.i0-m && q[0]<f.i1+m && q[1]>f.j0-m && q[1]<f.j1+m;}
      for(const f of foot){
        const pts=[[f.i0,f.j0],[f.i1,f.j0],[f.i0,f.j1],[f.i1,f.j1],[(f.i0+f.i1)/2,(f.j0+f.j1)/2]];
        for(const [i,j] of pts){
          if(Math.abs(hwOff(i,j))<1.02) hits.push("hwy "+f.k);
          if(sGate(i,j)) hits.push("gate "+f.k);
          if(laneTile(i,j)) hits.push("lane "+f.k);
          if(zoneAt(i,j)==="road") hits.push("road "+f.k);
        }
        for(const id in LOTS){const B=lotBox(LOTS[id]);
          if(f.i0<B.i1 && B.i0<f.i1 && f.j0<B.j1 && B.j0<f.j1) hits.push("bld "+id+" "+f.k);}
      }
      const paths=[];
      for(const f of scene.forklifts||[]) paths.push(["fork", f.path&&f.path.pts]);
      for(const b of MAIN_BLD) for(const k of [0,1]) paths.push(["fork", mkForklift(b.id,k).path.pts]);
      for(const f of scene.tierLifts||[]) paths.push(["lift", f.path&&f.path.pts]);
      for(const v of scene.marketVans||[]) (v.legs||[]).forEach(l=>paths.push([v.town?"tvan":"van", l.pa&&l.pa.pts]));
      for(const [n,pts] of paths){
        const boxes=n==="tvan"?foot.filter(f=>f.solid):foot;
        for(const q of samples(pts||[])){
          for(const f of boxes) if(hitBox(q,f,.02)){hits.push(n+" "+f.k); break;}
        }
      }
      if(typeof beltGeom==="function") for(const L of BELT_LINKS){const g=beltGeom(L); if(!g) continue;
        for(const q of g.pts) for(const f of foot){const cx=Math.max(f.i0,Math.min(q[0],f.i1)), cy=Math.max(f.j0,Math.min(q[1],f.j1));
          if(Math.hypot(q[0]-cx,q[1]-cy)<0.4) hits.push("belt "+f.k);}}
      const townVans=(scene.marketVans||[]).filter(v=>v.town).length;
      return {n:foot.length, solids:foot.filter(f=>f.solid).length, hits:[...new Set(hits)].slice(0,8), nh:[...new Set(hits)].length, vans:townVans};
    }''')
    ok(r['n']>=12 and r['solids']>=8 and r['nh']==0 and r['vans']>=1, f"village tiles stay off buildings, roads, belts and vehicle paths ({r['n']} tiles, {r['vans']} town vans, {r['hits']})")
    # ---- frame cost, paired blocks, village at stage 6 vs hidden ----
    r=E(pg, r'''()=>{const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
      S.town.made=250000; townStage(); S.town.seen=6; fitCamera(true);
      const p=P(38.4,39,0); const c=scene.cam; c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]; c.z=c.tz=Math.min(c.maxZ, Math.max(c.fitZ*1.35,.8));
      townHide=false;
      for(let k=0;k<80;k++) stepScene(1/30);
      const cached=[...SPR.map.keys()].filter(k=>String(k).startsWith("tw|")).length;
      if(cached<4) return [0,1e9,cached];
      const diffs=[], bases=[];
      for(let p2=0;p2<11;p2++){
        const order=p2%2?[false,true]:[true,false];
        const got={};
        for(const h of order){
          townHide=h; const a=[];
          for(let i=0;i<12;i++){const t0=performance.now(); stepScene(1/30); const ms=performance.now()-t0; if(i>=4) a.push(ms);}
          got[h?"z":"d"]=med(a);
        }
        diffs.push(got.d-got.z); bases.push(got.z);
      }
      townHide=false;
      const z=med(bases); return [z, z+med(diffs), cached];
    }''')
    ok(r[2]>=4 and r[1]<=r[0]*1.2+1.0, f"flat frame cost: median {r[0]:.2f} ms without the village → {r[1]:.2f} ms at Timber Town ({r[2]} cached sprites)")
    # ---- desktop click + shots ----
    E(pg, SHOW); paint(pg, 2); shot_clean(pg)
    xy=E(pg, 'townScreen()')
    hit=E(pg, f'hitTest({xy[0]},{xy[1]})')
    ok(hit and hit.get('type')=='town', f"desktop hit test finds the village ({hit})")
    box=E(pg, r'''()=>{const h=townHitPoly().map(q=>w2s(q[0],q[1]));const xs=h.map(q=>q[0]),ys=h.map(q=>q[1]);return {w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}''')
    ok(box['w']>=44 and box['h']>=44, f"village hit area is at least 44 px ({box['w']:.0f}×{box['h']:.0f})")
    pg.mouse.click(xy[0], xy[1]); paint(pg, 2)
    ok(E(pg,'TT.curSheet')=='town', 'desktop click opens the Town sheet')
    card=E(pg, 'document.getElementById("townCard")?document.getElementById("townCard").innerText:""')
    ok('Timber Town' in card and '250' in card and '+15%' in card and 'Logs' in card, f"Town sheet names the stage, the houses and the bonus ({card[:180]!r})")
    look=pg.locator('#townLook')
    look.scroll_into_view_if_needed(); pg.wait_for_timeout(150)
    geo=E(pg, r'''()=>{const b=document.getElementById("townLook").getBoundingClientRect();const bar=document.getElementById("bottombar").getBoundingClientRect();const fab=document.getElementById("fabs");const f=fab?fab.getBoundingClientRect():null;const op=fab?getComputedStyle(fab).opacity:"0";return {h:b.height,top:b.top,bot:b.bottom,l:b.left,r:b.right,vw:innerWidth,bar:bar.top,fab:f&&op!=="0"&&f.width>0?f.left:-1};}''')
    ok(geo['h']>=44 and geo['l']>=-1 and geo['r']<=geo['vw']+2 and geo['bot']<=geo['bar']+2, f"Look button is a 44 px target clear of the bottom bar ({geo})")
    mkt=E(pg, r'''()=>{openSheet("market");TT.render();const t=document.getElementById("townMkt");return t?t.textContent:"";}''')
    ok(mkt.strip()=='🏘️ Town demand +15%', f"Market sheet shows the Town demand line ({mkt!r})")
    E(pg, 'closeSheet()'); shot_clean(pg)
    # release shots
    E(pg, r'''()=>{S.coins=1e15;for(const id of ["sawmill","chipper","kiln","peeler","beamsaw","carpentry","pellet","paper","furniture","glulam","panelpress"]) S.buildings[id].lvl=Math.max(20,S.buildings[id].lvl);
      S.premium.lvl=2;S.buildings.framer.lvl=Math.max(8,S.buildings.framer.lvl);S.collectors.lumberjack=12;S.town.made=250000;townStage();S.town.seen=6;S.ach.town2=1;S.ach.town6=1;
      TT.setClock(10*60);S.wx.w="clear";S.wx.next=1e15;fitCamera(true);TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop.png'))
    E(pg, r'''()=>{TT.setClock(10*60);S.wx.w="clear";S.wx.next=1e15;const c=scene.cam,p=P(38.55,39.1,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,c.fitZ*3.3);TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop-town.png'))
    E(pg, r'''()=>{TT.setClock(21*60+20);S.wx.w="clear";S.wx.next=1e15;TT.render();}''')
    paint(pg, 4); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop-town-night.png'))
    E(pg, r'''()=>{TT.setClock(10*60);S.wx.w="clear";S.town.made=1;townStage();S.town.seen=1;S.town.best=Math.max(6,S.town.best);const c=scene.cam,p=P(38.3,33.7,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,c.fitZ*3.5);TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('town-hamlet.png'))
    ok(all(os.path.getsize(shot_path(n))>8000 for n in ('desktop.png','desktop-town.png','desktop-town-night.png','town-hamlet.png')), 'desktop release shots were written')
    pg.close()
    # ---- phones ----
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg, QUIET); E(pg, HOOK); E(pg, SHOW); paint(pg, 2)
        xy=E(pg, 'townScreen()')
        touch_at(pg, xy[0], xy[1]); paint(pg, 2)
        if E(pg,'TT.curSheet')!='town':
            touch_at(pg, xy[0], xy[1]); paint(pg, 2)
        ok(E(pg,'TT.curSheet')=='town', f'{dev}: touch opens the Town sheet')
        if E(pg,'innerWidth')<=720 and E(pg,'typeof setSheetState==="function"'):
            E(pg, "setSheetState('full')"); paint(pg, 1)
        E(pg, 'document.getElementById("townLook")&&document.getElementById("townLook").scrollIntoView({block:"center"})')
        pg.wait_for_timeout(200)
        geo=E(pg, r'''()=>{const b=document.getElementById("townLook").getBoundingClientRect();const bar=document.getElementById("bottombar").getBoundingClientRect();const fab=document.getElementById("fabs");const op=fab?+getComputedStyle(fab).opacity:0;const f=fab?fab.getBoundingClientRect():{left:1e9,right:-1,top:1e9,bottom:-1,width:0};const overlap=op>0.2&&b.right>f.left&&b.left<f.right&&b.bottom>f.top&&b.top<f.bottom;return {h:b.height,l:b.left,r:b.right,bot:b.bottom,vw:innerWidth,vh:innerHeight,bar:bar.top,overlap};}''')
        ok(geo and geo['h']>=44 and geo['l']>=-1 and geo['r']<=geo['vw']+2 and geo['bot']<=geo['bar']+4 and not geo['overlap'], f'{dev}: Town sheet target stays on screen and clear of the bars ({geo})')
        if dev=='iPhone 13':
            shot_clean(pg)
            pg.screenshot(path=shot_path('mobile-town.png'))
            E(pg, r'''()=>{closeSheet();S.town.made=250000;townStage();S.town.seen=6;TT.setClock(10*60);S.wx.w="clear";fitCamera(true);TT.render();}''')
            paint(pg, 2); shot_clean(pg)
            pg.screenshot(path=shot_path('mobile.png'))
            # calm fit: the info label is hidden, and it comes back when zoomed in
            E(pg, r'''()=>{for(const id of ["sawmill","chipper","kiln","carpentry","peeler","pellet","paper","furniture","beamsaw","glulam","panelpress","framer"]) S.buildings[id].lvl=Math.max(4,S.buildings[id].lvl||0);S.town.made=250000;townStage();S.town.seen=6;fitCamera(true);const p=P(38.4,33.2,0);const c=scene.cam;c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ;}''')
            E(pg, '__pl.length=0'); paint(pg, 3)
            calm=E(pg, '({on:dcOn(), pills:[...new Set(__pl)]})')
            ok(calm['on'] and not any('Town' in t or 'Hamlet' in t or 'Village' in t for t in calm['pills']), f'{dev}: fit view hides the village label ({calm["pills"][:6]})')
            E(pg, r'''()=>{const c=scene.cam;c.z=c.tz=Math.min(c.maxZ,c.fitZ*2.2);}''')
            E(pg, '__pl.length=0'); paint(pg, 3)
            back=E(pg, '[...new Set(__pl)]')
            ok(any('Timber Town' in t for t in back), f'{dev}: zooming in brings the village label back ({back[:6]})')
        pg.close()
    # landscape phone
    pg=page(vp={'width':844,'height':390})
    E(pg, QUIET); E(pg, SHOW); paint(pg, 2)
    xy=E(pg, 'townScreen()')
    pg.mouse.click(xy[0], xy[1]); paint(pg, 2)
    ok(E(pg,'TT.curSheet')=='town', 'landscape phone: click opens the Town sheet')
    E(pg, 'document.getElementById("townLook")&&document.getElementById("townLook").scrollIntoView({block:"center"})')
    pg.wait_for_timeout(150)
    geo=E(pg, r'''()=>{const b=document.getElementById("townLook").getBoundingClientRect();const bar=document.getElementById("bottombar").getBoundingClientRect();return {h:b.height,l:b.left,r:b.right,t:b.top,bot:b.bottom,vw:innerWidth,vh:innerHeight,barL:bar.right,barT:bar.top};}''')
    clear = geo['h']>=44 and geo['l']>=geo['barL']-2 and geo['r']<=geo['vw']+2 and geo['t']>=-2 and geo['bot']<=geo['vh']+2
    ok(clear, f"landscape: the Town button is on screen and clear of the rail ({geo})")
    pg.close()
    ok(not errs, 'no console errors '+str(errs[:4]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -', f)
sys.exit(1 if FAILS else 0)
