# v2.15.1: plank balance. Sawmill 3 planks per batch + saw yield from Lv 50, leaner plank recipes, fair/value plank
# allocation toggle, priority sinks (orders/daily/trade) share one budget, smoothed + grouped + actionable shortage warnings.
# Regression: plank supply is sustainable in a simulated early/mid/late game.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
QUIET="window.toast=()=>{};window.sfx=()=>{};window.confettiBurst=()=>{};window.milestoneHit=()=>{};document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());S.events=[];S.nextEvent=1e12;S.fireCool=1e12;S.fires={};"
# greedy cheapest-first player that keeps its forest planted; returns plank stats per checkpoint (game minutes)
GREEDY='''(cps)=>{const out=[];const cons=BUILDINGS.filter(b=>b.inp.planks);let T=0,acc;
 const buy=()=>{for(let g=0;g<20&&forestEff()<.97;g++){let bi=null,bc=Infinity;for(const p of PLANTERS){const c=plCost(p.id,1)/p.rate;if(c<bc){bc=c;bi=p.id;}}if(plCost(bi,1)>S.coins||!buyPlanter(bi,1)) break;}
  for(let g=0;g<40;g++){let best=null,bc=Infinity;
   for(const b of BUILDINGS){if(!bldUnlocked(b.id)) continue;const c=typeof bldNextCost==='function'?bldNextCost(b.id):bulkCost(b.cost,b.scale,S.buildings[b.id].lvl,1);if(c<bc){bc=c;best=()=>buyBuilding(b.id,1,{wsAuto:true});}}
   if(typeof colCost==='function'&&S.collectors.lumberjack===0) buyCollector('lumberjack',1);if(typeof sawLogsOk==='function'&&sawLogsOk()) buyBuilding('sawmill',1,{logsOnly:true});
   for(const c of COLLECTORS){const k=typeof colCost==='function'?colCost(c.id,S.collectors[c.id],1):bulkCost(c.cost,COL_SCALE,S.collectors[c.id],1);if(k<bc){bc=k;best=()=>buyCollector(c.id,1);}}
   if(!best||bc>S.coins||!best()) break;}};
 for(const cp of cps){acc={t:0,starve:0,want:0,got:0};
  while(T<cp*60){tick(1,false);T++;if(T%5===0) buy();
   if(T>cp*60-240){acc.t++;let w=0,g=0;for(const b of cons){const st=S.buildings[b.id];if(!st.lvl||!st.on) continue;const bs=bstat[b.id];const x=b.inp.planks*bs.speed*mgrIn(b.id);w+=x;g+=x*(bs.lim==='planks'?bs.f:1);if(bs.lim==='planks'&&bs.fs<.9) acc.starve++;}acc.want+=w;acc.got+=g;}}
  out.push({min:cp,saw:S.buildings.sawmill.lvl,cons:cons.filter(b=>S.buildings[b.id].lvl).map(b=>b.id),supply:acc.want?acc.got/acc.want:1,starve:acc.starve/acc.t});}
 return out;}'''
# cost-balanced late state: every building (premium + research too) bought up to the same budget, run the real tick
BAL='''(B)=>{S.premium.lvl=Math.max(1,S.premium.lvl);for(const n of RNODES) S.research[n.id]=1;
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}
 for(const c of COLLECTORS) S.collectors[c.id]=400;for(const k in S.res) S.res[k]=0;S.forest.m=1e9;S.orders.active=null;if(S.daily) S.daily.active=[];if(S.trade) S.trade.fleet=[];
 M=computeMods();for(let k=0;k<90;k++) tick(1,false);S.forest.m=1e9;
 const r={};for(const b of BUILDINGS) if(b.inp.planks&&S.buildings[b.id].lvl&&bldUnlocked(b.id)){const bs=bstat[b.id];r[b.id]=bs.lim==='planks'?+bs.f.toFixed(3):1;}
 return {saw:S.buildings.sawmill.lvl,yield:+sawYield().toFixed(2),f:r};}'''
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('response',lambda r:r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1800); E(pg,QUIET); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,15,1),f"VERSION>=2.15.1 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,15,1),'sw cache bumped')
    # recipes / yield
    ok(E(pg,"BMAP.sawmill.out.planks")==3 and E(pg,"BMAP.carpentry.inp.planks")==4 and E(pg,"BMAP.furniture.inp.planks")==12,'leaner plank recipes, sawmill 3 planks')
    ok(E(pg,"sawYieldAt(49)")==1 and E(pg,"sawYieldAt(50)")>1.5 and E(pg,"sawYieldAt(120)")>E(pg,"sawYieldAt(100)"),'saw yield starts at Lv 50 and keeps growing')
    # 1) regression: greedy play keeps planks flowing (early/mid/late)
    E(pg,"S.coins=50")
    G=E(pg,f"({GREEDY})([10,30,60,120])")
    for g in G: print('   ',g)
    ok(all(g['supply']>=.95 for g in G),'greedy play: plank consumers get >=95% of what they want at 10/30/60/120 min')
    ok(all(g['starve']<.05 for g in G),'greedy play: no sustained plank shortage warnings')
    # 2) cost-balanced late game incl. premium + research consumers
    worst=1
    for B in [1e8,1e10,1e12,1e14]:
        ctx.close(); ctx,pg,errs2,_=page(); errs+=errs2
        r=E(pg,f"({BAL})({B})"); print('   %.0e'%B,r); worst=min([worst]+list(r['f'].values()))
    ok(worst>=.9,f'cost-balanced mid/late game (premium + research): every plank consumer >= 90% fed in fair mode (worst {worst})')
    # 3) value mode + migration
    ctx.close(); ctx,pg,errs2,_=page(); errs+=errs2
    r=E(pg,"""(()=>{S.premium.lvl=1;for(const b of ['carpentry','furniture']) S.buildings[b].lvl=30;M=computeMods();
      const act=['carpentry','furniture'].map(id=>[BMAP[id],bSpeed(id)]);const dem={planks:0};for(const [b,sp] of act) dem.planks+=b.inp.planks*sp*mgrIn(b.id);
      S.res.planks=dem.planks*.5;S.prefs.plankMode='fair';const fair=plankAlloc(act,dem,1);togglePlankMode();const val=plankAlloc(act,dem,1);
      const order=act.map(a=>a[0].id).sort((a,b)=>plankValue(BMAP[b])-plankValue(BMAP[a]));S.res.planks=dem.planks*2;const plenty=plankAlloc(act,dem,1);
      return {fair,val,order,mode:S.prefs.plankMode,plenty};})()""")
    print('   ',r)
    ok(r['fair'] is None,'fair mode: proportional sharing (no per-building override)')
    ok(r['mode']=='value' and r['val'][r['order'][0]]>.6 and r['val'][r['order'][-1]]<r['val'][r['order'][0]] and min(r['val'].values())>=.14,f"value mode fills the best earner per plank first ({r['order']})")
    ok(r['plenty'] is None,'value mode does nothing while planks are plentiful')
    sv=E(pg,"(()=>{const o=JSON.parse(JSON.stringify(TT.S));delete o.prefs.plankMode;o.version='2.15';localStorage.setItem('timberTycoonSave',JSON.stringify(o));return Object.keys(localStorage)})()")
    # 4) priority sinks share one budget (order + daily + trade can't take more than 80% of fresh planks beyond the surplus)
    r=E(pg,"""(()=>{for(const k in PRI_TAKEN) PRI_TAKEN[k]=0;const pend={planks:100};const a=priBudget('planks',70,pend);priTook('planks',a);const b=priBudget('planks',65,pend);priTook('planks',b);const c=priBudget('planks',80,pend);return [a,b,c];})()""")
    ok(abs(r[0]-70)<1e-6 and abs(r[1]-10)<1e-6 and r[2]==0,f'priority sinks capped together at 80% of fresh output ({r})')
    # 5) warnings: smoothed, grouped, actionable
    r=E(pg,"""(()=>{S.prefs.plankMode='fair';S.buildings.sawmill.lvl=1;for(const b of ['carpentry','furniture']) S.buildings[b].lvl=40;S.res.planks=0;S.res.chairs=50;M=computeMods();for(const k in bstat) delete bstat[k].fs;
      S.res.logs=1e9;S.forest.m=1e9;tick(1,false);const one=attentionList().filter(a=>a.k==='starved').length;for(let k=0;k<40;k++){S.res.chairs=50;S.res.logs=1e9;S.forest.m=1e9;tick(1,false);}
      const L=attentionList().filter(a=>a.k==='starved'&&/Planks/.test(a.t));return {one,n:L.length,t:L.map(a=>a.t),id:L[0]&&L[0].id};})()""")
    print('   ',r)
    ok(r['one']==0,'a single short tick does not raise a warning (smoothed)')
    ok(r['n']==1 and 'Short on Planks' in r['t'][0] and 'Sawmill' in r['t'][0] and r['id']=='sawmill','plank shortage = one grouped entry naming the consumers and pointing at the Sawmill')
    E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(400)
    ok(pg.locator('#bpShort .bp-short-go').is_visible(),'building sheet shows the shortage hint with an Upgrade Sawmill button')
    pg.click('#bpShort .bp-short-go'); pg.wait_for_timeout(300)
    ok(E(pg,'TT.curSheet')=='bld' and E(pg,'sheetBld')=='sawmill','hint button jumps to the Sawmill')
    E(pg,'S.buildings.sawmill.lvl=60;M=computeMods()'); pg.wait_for_timeout(300); ok('Saw yield' in pg.locator('#bpIo').inner_text(),'sawmill sheet shows saw yield (from Lv 40)')
    # v2.20.1: logs aren't sold any more, so a Lv 60 Sawmill really feeds everyone; go back to Lv 1 for the shortage
    E(pg,"S.buildings.sawmill.lvl=1;S.res.planks=0;M=computeMods();TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(1500); m0=E(pg,'S.prefs.plankMode'); pg.click('#bpShort .bp-short-mode'); pg.wait_for_timeout(200)
    ok(E(pg,'S.prefs.plankMode')!=m0,'plank mode toggle in the hint works')
    pg.screenshot(path=ROOT+'/test/v2151_desktop.png')
    ok(not errs and not bad,f'no errors / 404s ({errs[:3]} {bad[:3]})')
    ctx.close()
    # 6) phones: hint visible and tappable
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev)
        E(pg,"(()=>{S.coins=1e9;for(const c of COLLECTORS) TT.buyCollector(c.id,10);S.buildings.sawmill.lvl=1;for(const b of ['carpentry']) S.buildings[b].lvl=30;S.res.planks=0;M=computeMods();for(let k=0;k<30;k++){S.res.logs=1e9;tick(1,false);}TT.openSheet('bld','carpentry');})()")
        pg.wait_for_timeout(600); pg.screenshot(path='/tmp/p151/'+dev.replace(' ','')+'.png'); b=pg.locator('#bpShort .bp-short-go'); bb=None
        for _ in range(6):   # v2.30: the hint row is re-rendered when its numbers change; retry if the node was just swapped
            bb=b.bounding_box() if b.count() else None
            if bb: break
            pg.wait_for_timeout(200)
        ok(bb and bb['height']>=38,f'{dev}: shortage hint button is a real touch target ({bb and bb["height"]})')
        if bb: pg.tap('#bpShort .bp-short-go'); pg.wait_for_timeout(400)
        ok(E(pg,'sheetBld')=='sawmill',f'{dev}: tap jumps to the Sawmill')
        if dev=='iPhone 13':
            E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(500); pg.screenshot(path=ROOT+'/test/v2151_mobile.png')
        ok(not errs and not bad,f'{dev}: no errors / 404s ({errs[:3]} {bad[:3]})')
        ctx.close()
    if os.path.isdir(ROOT+'/releases/v2.15.1'):
        ctx,pg,errs,bad=page(); pg.goto(BASE+'releases/v2.15.1/index.html'); pg.wait_for_timeout(1500)
        ok(E(pg,'TT.VERSION')=='2.15.1' and not errs,'releases/v2.15.1/ snapshot runs'); ctx.close()
    else: ok(True,'releases/v2.15.1/ not yet built')
print('ALL PASS' if not FAILS else 'FAILS', len(FAILS), FAILS)
sys.exit(1 if FAILS else 0)
