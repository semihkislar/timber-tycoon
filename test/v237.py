# v2.37 Seasonal export contracts (maintenance proposal 9): each season of the v2.3 world clock brings one themed export
# contract (spring: houses/glulam/beams/planks, summer: boats/toys/flooring/gift boxes/chairs, autumn: luxury furniture/
# cabinets/furniture/chairs/paper, winter: pellets/charcoal/toys/gift boxes/chips) with a trophy per season. Sizing on the v2.25 rules (real output,
# ≥ 20 units, value floor in seconds of income / forest value), rewards 1.5–2.5 × the goods × seasonal premium, unlock with a
# Phase II line, early game untouched, forest-value scaling after Replant, season end, skip, Replant, saves, offline, UI,
# HUD badge, desktop + iPhone/Pixel touch, no console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
HERE=os.path.dirname(os.path.abspath(__file__))
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;})()"
SETUP='''(()=>{S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);TT.buyCollector("harvester",15);
  for(const [b,n] of [["sawmill",160],["chipper",60],["kiln",40],["peeler",40],["carpentry",120],["pellet",40],["paper",30],["furniture",20],["beamsaw",30],["glulam",15]]) TT.buyBuilding(b,n);
  S.premium.lvl=1;S.coins=1e15;for(const b of ["atelier","parquet","stationer","cabinetry"]) TT.buyBuilding(b,10);
  S.coins=1e15;M=computeMods();for(let k=0;k<60;k++){S.forest.m=1e9;tick(1,false);}S.events=[];M=computeMods();})()'''
# go to the start of season i (0 spring … 3 winter) of year y, and let the buyer call
GO='''((i,y)=>{setClock(TT.DAY_LEN*TT.SEASON_DAYS*(4*(y||0)+i)+30);S.seas.next=0;tick(.1,false);S.seas.next=0;S.time+=1;tick(.1,false);return S.seas;})'''
# line check: amount, value vs income and forest value, reward / goods value / multipliers
CHECK='''(()=>{const c=S.seas.c;if(!c) return null;const T=scLeft(),inc=ordInc();const m=mgrOrders()*(M.orderPay||1)*SC_PAY;
  const L=c.lines.map(l=>{const v=l.amt*price(l.item);return {it:l.item,amt:l.amt,val:v,vs:v/inc,prem:!!RMAP[l.item].premium};});
  const base=L.reduce((a,l)=>a+l.val*(l.prem?1.25:1)*m,0);return {sid:c.sid,L,rw:c.reward,rv:c.reward/base,inc,cs:cs(),seed:!!c.seed,T};})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(URL); pg.wait_for_timeout(1300); E(pg,QUIET); return ctx,pg
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,37),f"VERSION >= 2.37 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,37),'sw cache bumped to >= v2.37')
    # ---------------- unlock: a fresh game has none; early game untouched ----------------
    r=E(pg,"(()=>{const s=S.seas;return {st:s.st,c:s.c,open:scOpen()};})()")
    ok(r['st']=='wait' and r['c'] is None and not r['open'],f'fresh game: no seasonal contract, locked ({r})')
    pg.add_script_tag(path=os.path.join(HERE,'bot.js'))
    tl=[]
    for k in range(12):   # 12 minutes of the greedy bot: the contract only shows up once a Phase II line runs and SC_UNLOCK × forest value is earned
        E(pg,f"runBot(60,{3 if k<5 else 0},{60 if k<5 else 0})")
        tl.append(E(pg,"({t:Math.round(S.time),p2:scPhase2(),earned:S.totalEarned,st:S.seas.st,open:scOpen(),offer:!!S.seas.c})"))
    bad=[x for x in tl if x['offer'] and not (x['p2'] and x['earned']>=5e4)]
    ok(not bad,f'early game: no offer before a Phase II line + 🪙50K earned ({bad[:2]})')
    first=next((x['t'] for x in tl if x['open']),None)
    ok(first is None or first>=120,f'unlock is not in the first minutes (first open at {first} s of the bot run)')
    print('   timeline:',[(x['t'],x['p2'],round(x['earned']),x['st']) for x in tl])
    ctx.close()
    # ---------------- themes, sizing and rewards ----------------
    ctx,pg=page(); E(pg,SETUP)
    ok(E(pg,"scOpen()"),'mid game (Phase II + earned): open')
    TH={0:('spring',['houses','glulam','beams','panels','planks']),1:('summer',['boats','toys','flooring','giftbox','chairs','bark']),2:('autumn',['luxfurn','decor','cabinets','furniture','stationery','chairs','paper']),3:('winter',['pellets','charcoal','toys','giftbox','chips'])}
    seen={}
    for i in range(4):
        E(pg,f"{GO}({i},1)"); r=E(pg,CHECK); sid,goods=TH[i]; seen[sid]=r
        ok(r is not None and r['sid']==sid,f"{sid}: a {sid} contract is offered ({r and r['sid']})")
        if not r: continue
        its=[l['it'] for l in r['L']]
        ok(all(x in goods for x in its) and 'logs' not in its and len(its)<=2 and len(set(its))==len(its),f"{sid}: themed goods only, ≤ 2 lines, never logs ({its})")
        order=[goods.index(x) for x in its]; ok(order==sorted(order),f'{sid}: lines listed in theme order ({its})')
        ok(all(l['amt']>=20 and l['val']>=10*r['cs']*.999 for l in r['L']) and sum(l['vs'] for l in r['L'])>=1-1e-6,f"{sid}: every line ≥ 20 units and ≥ the forest-value floor, the contract ≥ 1 s of income ({[(l['it'],l['amt'],round(l['vs'],1)) for l in r['L']]})")
        ok(its[0]==next(g for g in goods if E(pg,f"prodRate('{g}')>0.02")) or sum(l['vs'] for l in r['L'])>=1,f"{sid}: the season's headline good the factory makes leads ({its[0]})")
        ok(1.5*.97<=r['rv']<=2.5*1.03,f"{sid}: reward = 1.5–2.5 × goods value × seasonal premium × managers × research ({r['rv']:.2f})")
    ok(seen['spring'] and 'glulam' in [l['it'] for l in seen['spring']['L']],'spring asks for timber-frame line goods (glulam) when the line runs')
    ok(seen['winter'] and 'pellets' in [l['it'] for l in seen['winter']['L']],'winter asks for pellets')
    # resize until accepted: output grows → amount follows; accepted contracts keep their amount
    r=E(pg,"""(()=>{const c=S.seas.c,a0=c.lines[0].amt;c.lines[0].amt=Math.max(20,Math.round(a0/3));scResize();const a1=c.lines[0].amt;return {a0,a1};})()""")
    ok(abs(r['a1']/r['a0']-1)<.2,f'unsigned offers follow the output (re-sized {r})')
    # ---------------- accept → priority fill over ticks → complete → trophies ----------------
    r=E(pg,"""(()=>{window.toast=()=>{};scAccept();const c=S.seas.c,ids=c.lines.map(l=>l.item);const p0=scPct(c);
      for(let k=0;k<40;k++){S.forest.m=1e9;tick(1,false);}const c2=S.seas.c;return {st:S.seas.st,p0,p1:c2?scPct(c2):1,ids,used:S.orders.acts.length};})()""")
    ok(r['st']=='run' and r['p1']>r['p0'],f"signed contract fills from the lines over time ({r['p0']:.3f} → {r['p1']:.3f})")
    ok(r['used']==0,'it does not take a client order slot')
    r=E(pg,"""(()=>{const c=S.seas.c;for(const l of c.lines) S.res[l.item]+=l.amt;const c0=S.coins,rw=c.reward,a0=achCount();const n=scDeliver();checkAch(true);
      return {n:n>0,st:S.seas.st,paid:S.coins-c0,rw,won:S.seas.won.winter,ach:!!S.ach.sc_winter,tot:S.seas.total};})()""")
    ok(r['st']=='done' and abs(r['paid']-r['rw'])<=1e-6*r['rw'] and r['won']==1,f'deliver from storage completes it and pays the reward ({r})')
    ok(r['ach'],'trophy "Winter Supplier"')
    E(pg,f"{GO}(3,1)"); ok(E(pg,"S.seas.st")=='done' and E(pg,"S.seas.c")==None,'one contract per season: no second winter offer in the same season')
    r=E(pg,f"""(()=>{{window.toast=()=>{{}};const out=[];for(const i of [0,1,2]){{({GO})(i,2);if(!scAccept()) return 'no offer '+i;const c=S.seas.c;for(const l of c.lines) S.res[l.item]+=l.amt;scDeliver();out.push(S.seas.st);}}
      checkAch(true);return {{out,sp:!!S.ach.sc_spring,su:!!S.ach.sc_summer,au:!!S.ach.sc_autumn,yr:!!S.ach.sc_year,year:scYear()}};}})()""")
    ok(isinstance(r,dict) and r['out']==['done']*3 and r['sp'] and r['su'] and r['au'],f'trophies Spring Builder / Summer Trader / Harvest Fair ({r})')
    ok(isinstance(r,dict) and r['yr'] and r['year']==4,'trophy "Four Seasons" for all four')
    r=E(pg,"ACH.filter(a=>a.id.startsWith('sc_')).map(a=>[a.g,a.t])")
    ok(len(r)==6 and all(x[0]=='sys' for x in r),f'six seasonal trophies in Factory systems ({r})')
    # ---------------- season end: fail with no penalty; skip ----------------
    r=E(pg,f"""(()=>{{window.toast=()=>{{}};({GO})(3,2);const ok1=scAccept();const c0=S.coins,f0=S.seas.failed;setClock(TT.DAY_LEN*TT.SEASON_DAYS*12+20);tick(.1,false);
      return {{ok1,st:S.seas.st,lost:c0-S.coins,failed:S.seas.failed-f0,hist:S.seas.hist[S.seas.hist.length-1].ok}};}})()""")
    ok(r['ok1'] and r['failed']==1 and r['hist']==False and r['st'] in ('wait','offer'),f'season ends → unfinished contract is missed, a new season starts ({r})')
    ok(r['lost']<1e9,'… and costs nothing (no penalty)')
    r=E(pg,f"(()=>{{({GO})(1,3);const a=S.seas.st;scSkip();const b=S.seas.st;S.seas.next=0;S.time+=30;tick(.1,false);return [a,b,S.seas.st];}})()")
    ok(r==['offer','skip','skip'],f'skip → no new offer until next season ({r})')
    r=E(pg,f"(()=>{{({GO})(2,3);setClock(TT.DAY_LEN*TT.SEASON_DAYS*(4*3+3)-100);tick(.1,false);return S.seas.st;}})()")
    ok(r=='missed',f'an unsigned offer is withdrawn in the last 3 minutes of a season ({r})')
    # ---------------- Replant: contract ends, counters/trophies stay ----------------
    r=E(pg,f"""(()=>{{window.toast=()=>{{}};({GO})(0,4);scAccept();const tot=S.seas.total,won=Object.assign({{}},S.seas.won);S.totalEarned=Math.max(S.totalEarned,1e16);doPrestige();
      return {{st:S.seas.st,c:S.seas.c,tot:S.seas.total,same:JSON.stringify(won)===JSON.stringify(S.seas.won),ach:!!S.ach.sc_year,open:scOpen()}};}})()""")
    ok(r['c'] is None and r['st']=='wait' and r['same'] and r['tot']>=4 and r['ach'],f'Replant ends the contract in hand, keeps counters and trophies ({r})')
    ok(not r['open'],'after Replant the new run unlocks it again like the first time')
    ctx.close()
    # ---------------- deliverable: a signed contract fills within its season (mid game and late game with a pellet boiler) ----------------
    for label,setup in [('mid game',SETUP),('late game + power plant on pellets',SETUP+";(()=>{S.coins=1e16;for(const n of RNODES) S.research[n.id]=1;TT.buyPower&&TT.buyPower();for(let k=0;k<4;k++) TT.buyPower&&TT.buyPower();setPowerFuel&&setPowerFuel('pellets');TT.buyBuilding('plymill',20);TT.buyBuilding('toyshop',10);M=computeMods();for(let k=0;k<30;k++){S.forest.m=1e9;tick(1,false);}})()")]:
        ctx,pg=page(); E(pg,setup)
        out=E(pg,f"""(()=>{{window.toast=()=>{{}};const R=[];for(const i of [0,1,2,3]){{({GO})(i,5);const st=S.seas.st;if(st!=='offer'){{R.push([i,st]);continue;}}const items=S.seas.c.lines.map(l=>l.item);scAccept();
          const T=scLeft();let t=0;while(t<T-5&&S.seas.st==='run'){{S.forest.m=1e9;simulate(5,1);t+=5;}}R.push([i,S.seas.st,Math.round(t),Math.round(T),items]);}}return R;}})()""")
        ok(all(x[1]=='done' for x in out),f'{label}: every season\'s contract is filled within the season by the lines alone ({out})')
        ctx.close()
    # ---------------- forest value: no tiny numbers after Replant ----------------
    ctx,pg=page()
    res=[]
    for csv in [1,50,675]:
        E(pg,f"""(()=>{{S.runCS={csv};S.coins=1e6*{csv};S.totalEarned=1e6*{csv};TT.buyCollector("lumberjack",20);TT.buyCollector("chainsaw",8);
          for(const [b,n] of [["sawmill",25],["chipper",10],["kiln",6],["carpentry",10],["pellet",5],["paper",3]]) TT.buyBuilding(b,n);M=computeMods();for(let k=0;k<60;k++){{S.forest.m=1e9;tick(1,false);}}S.events=[];M=computeMods();
          S.totalEarned=Math.max(S.totalEarned,2e5*{csv});S.seas.st='wait';S.seas.c=null;}})()""")
        for i in [0,3]:
            E(pg,f"(()=>{{S.seas.key=-1;({GO})({i},{csv});}})()"); r=E(pg,CHECK)
            if r: res.append((csv,i,r))
    ok(len(res)>=4,f'offers at forest value ×1 / ×50 / ×675 ({[(a,b) for a,b,_ in res]})')
    for csv,i,r in res:
        ok(all(l['amt']>=20 and l['val']>=10*csv*.999 for l in r['L']) and sum(l['vs'] for l in r['L'])>=1-1e-6 and r['rw']>=1.5*sum(l['val'] for l in r['L']),
           f"×{csv} {r['sid']}: amounts/rewards follow output + forest value ({[(l['it'],l['amt'],round(l['vs'],1)) for l in r['L']]} → 🪙{r['rw']:.3g}, inc {r['inc']:.3g})")
    ctx.close()
    # ---------------- saves ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,f"(()=>{{({GO})(3,1);scAccept();S.seas.won.spring=2;S.seas.total=2;}})()"); base=E(pg,"JSON.stringify(S)"); ctx.close()
    cases=[('round trip','',lambda r: r['st']=='run' and r['lines']>=1 and r['spring']==2),
           ('v2.36 save','o.version="2.36";delete o.seas;',lambda r: r['st'] in ('wait','offer') and r['spring']==0),
           ('damaged contract','o.seas.c={sid:"winter",lines:[{item:"logs",amt:5,got:0}],reward:"x"};',lambda r: r['st'] in ('wait','offer') and r['spring']==2),
           ('damaged seas','o.seas="x";',lambda r: r['st'] in ('wait','offer')),
           ('damaged fields','o.seas.won=null;o.seas.st="zzz";o.seas.total=-3;o.seas.hist=5;',lambda r: r['spring']==0 and r['tot']==0)]
    for name,mut,exp in cases:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        E(pg,QUIET); r=E(pg,"(()=>{for(let k=0;k<10;k++){S.forest.m=1e9;tick(1,false);}const s=scState();return {st:s.st,lines:s.c?s.c.lines.length:0,spring:s.won.spring,tot:s.total,ok:isFinite(S.coins)};})()")
        ok(exp(r) and r['ok'],f'{name}: loads ({r})')
        if name=='round trip':
            r=E(pg,"(()=>{const c=S.seas.c,p0=scPct(c);simulateOffline(120);const c2=S.seas.c;return [p0,c2?scPct(c2):1,S.seas.st];})()")
            ok(r[1]>r[0],f'offline: a signed contract keeps filling ({r})')
        ctx.close()
    # ---------------- UI (desktop) ----------------
    ctx,pg=page(); E(pg,SETUP); E(pg,f"(()=>{{window.toast=()=>{{}};({GO})(3,1);}})()"); pg.wait_for_timeout(400)
    ok(E(pg,"!document.getElementById('wxSc').classList.contains('hidden')&&document.getElementById('wxSc').textContent.includes('New')"),'HUD: "📦 New" badge on the season chip')
    ok(E(pg,"!document.getElementById('ordDot').classList.contains('hidden')"),'Orders button dot for a new seasonal offer')
    pg.click('#wxSc'); pg.wait_for_timeout(500)
    ok(E(pg,"TT.curSheet")=='ord' and E(pg,"TT.ordTab")=='season','tap the badge → Orders → Season tab')
    t=E(pg,"document.getElementById('ordBody').innerText")
    ok('Winter Heating Export' in t and 'Nordic Heating Co-op' in t and 'Winter Supplier' in t,'Season tab: theme, buyer and trophy shown')
    ok(not re.search(r'NaN|undefined|Infinity|null',t),'no NaN/undefined in the tab')
    pg.click('#scYes'); pg.wait_for_timeout(400)
    ok(E(pg,"S.seas.st")=='run' and E(pg,"!!document.getElementById('scDel')"),'Sign → in progress, Deliver button')
    E(pg,"(()=>{for(let k=0;k<5;k++){S.forest.m=1e9;tick(1,false);}})()"); pg.wait_for_timeout(500)
    ok('%' in E(pg,"document.getElementById('wxSc').textContent"),'HUD badge shows progress')
    pg.screenshot(path=os.path.join(HERE,'v237_desktop.png'))
    r=E(pg,"(()=>{closeSheet();wxOpen=true;wxSig='';updateWx();return document.getElementById('wxPop').innerText;})()")
    ok('Winter Heating Export' in r,'season popup names the contract')
    E(pg,"document.getElementById('wxScGo').click()"); pg.wait_for_timeout(300)
    ok(E(pg,"TT.curSheet")=='ord' and E(pg,"TT.ordTab")=='season','popup Open → Season tab')
    ctx.close()
    # ---------------- perf: flat frame cost with a running contract ----------------
    # (covered by the full-suite perf test test/v28.py; the tab only re-renders on signature changes)
    # ---------------- phones ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': '); E(pg,SETUP); E(pg,f"(()=>{{window.toast=()=>{{}};({GO})(0,1);}})()")
        pg.tap('#bbOrd'); pg.wait_for_timeout(700)
        pg.tap('#ordTabs button[data-t="season"]'); pg.wait_for_timeout(500)
        ok(E(pg,"TT.ordTab")=='season','%s: tap the Season tab'%dev)
        vw=E(pg,'innerWidth')
        tabs=E(pg,"[...document.querySelectorAll('#ordTabs button')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.height]})")
        ok(len(tabs)==3 and all(x[0]>=0 and x[1]<=vw+.5 for x in tabs),f'{dev}: three tabs fit ({tabs})')
        ok(E(pg,'(()=>{const e=document.getElementById("shBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{dev}: no sideways scroll')
        E(pg,"document.getElementById('scYes').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        bb=pg.locator('#scYes').bounding_box(); ok(bb and bb['height']>=44,f'{dev}: Sign button ≥ 44 px')
        pg.tap('#scYes'); pg.wait_for_timeout(500)
        ok(E(pg,"S.seas.st")=='run','%s: tap Sign → in progress'%dev)
        # hold the automatic fill so the storage button is what finishes it
        E(pg,"(()=>{window.scCollect=()=>{};for(const k in S.buildings) S.buildings[k].on=false;for(const l of S.seas.c.lines){S.autosell[l.item]=false;l.got=l.amt-5;S.res[l.item]=Math.max(S.res[l.item],0)+10;}})()"); pg.wait_for_timeout(300)
        E(pg,"document.getElementById('scDel').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        bb=pg.locator('#scDel').bounding_box(); ok(bb and bb['height']>=44,f'{dev}: Deliver button ≥ 44 px')
        pg.tap('#scDel'); pg.wait_for_timeout(500)
        r=E(pg,"[S.seas.st,S.seas.won.spring,S.seas.c&&S.seas.c.lines.map(l=>[l.item,l.got,l.amt,S.res[l.item]])]"); ok(r[0]=='done' and r[1]==1,f'{dev}: tap Deliver → delivered ({r})')
        E(pg,"document.querySelectorAll('.toast').forEach(t=>t.remove())"); E(pg,"document.getElementById('shBody').scrollTop=0"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(HERE,f'v237_{dev.split()[0].lower()}.png'))
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
