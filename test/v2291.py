# v2.29.1 chip balance: the Wood Chipper gets a chip-yield curve from Lv 25 (+7 %/level, ×1.6 per milestone from Lv 100) and the
# Plywood Mill an early start (+5 %/level from Lv 10) so the extra paper doesn't just move the wait to plywood. Lv ≤ 25 is unchanged
# (early pacing). Checks: curves, real output, cost-balanced and greedy multi-Replant sims (seeded), advisor, sheet text, phone.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEEDED=CLEAR+';(()=>{let s=7;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})()'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;})()"
BAL='''(B)=>{S.premium.lvl=Math.max(1,S.premium.lvl);for(const n of RNODES) S.research[n.id]=1;if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}
 for(const c of COLLECTORS) S.collectors[c.id]=400;for(const k in S.res) S.res[k]=0;S.forest.m=1e9;S.orders.active=null;if(S.daily) S.daily.active=[];if(S.trade) S.trade.fleet=[];
 M=computeMods();for(let k=0;k<120;k++){tick(1,false);S.forest.m=1e9;}
 return {r:rates.chips.p/Math.max(1e-9,rates.chips.d),lv:S.buildings.chipper.lvl,users:['pellet','paper'].map(id=>[bstat[id].lim,+bstat[id].f.toFixed(2)])};}'''
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),
 spend:()=>{for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);
   S.power.lvl=Math.max(S.power.lvl,6);M=computeMods();window._cs={a:[]};},
 want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=1500,
 hold:()=>{const C=window._cs;C.a.push(['pellet','paper'].some(id=>S.buildings[id].lvl&&bstat[id].lim==='chips'&&bstat[id].f<.95)?1:0);return false;}}'''
EXTRA='''(()=>{const a=window._cs.a,h=a.slice(a.length>>1);return {cb:h.reduce((s,v)=>s+v,0)/Math.max(1,h.length),lv:S.buildings.chipper.lvl,
 adv:advList(true).filter(e=>e.k==='chips'||(e.fix&&e.fix.id==='chipper')).length,r:rates.chips.p/Math.max(1e-9,rates.chips.d)};})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate(QUIET); return ctx,pg
    E=lambda pg,js: pg.evaluate(js)
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,29,1),f"VERSION >= 2.29.1 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,29,1),'sw cache bumped')
    r=E(pg,"[BMAP.chipper.inp.logs,BMAP.chipper.out.chips,BMAP.pellet.inp.chips,BMAP.paper.inp.chips,BMAP.chipper.cost,BMAP.chipper.scale,BMAP.chipper.spd||1]")
    ok(r==[6,6,20,40,1000,1.19,1],f'recipes, price and speed unchanged: only the yield moved ({r})')
    r=E(pg,"[1,10,24,25].map(l=>chipYieldAt(l))")
    ok(r==[1,1,1,1],f'chipper Lv 1–25 unchanged: early pacing intact ({r})')
    r=E(pg,"[26,50,75,99,100,150].map(l=>+chipYieldAt(l).toFixed(3))")
    ok(abs(r[0]-1.07)<1e-9 and abs(r[1]-2.75)<1e-9 and all(a<b for a,b in zip(r,r[1:])) and abs(r[4]/r[3]-1.6*(1+75*.07)/(1+74*.07))<1e-6,f'chip yield: +7 %/level from Lv 25, ×1.6 at Lv 100 ({r})')
    r=E(pg,"[10,20,40,49,60,100].map(l=>[+plyYieldAt(l).toFixed(3),+sawYieldAt(l).toFixed(3)])")
    ok(all(a>=s for a,s in r) and r[0][0]==1 and r[1][0]>1.4 and r[3][0]>2.9,f'Plywood Mill: early start from Lv 10, never below the old curve ({r})')
    ok(E(pg,"[chainYield('sawmill'),chainYield('peeler'),chainYield('pellet'),chainYield('paper')].every(x=>x===1)") ,'producers at Lv 0 / consumers get no yield')
    r=E(pg,"""(()=>{for(const b of BUILDINGS) S.buildings[b.id].lvl=0;S.buildings.chipper.lvl=60;S.buildings.chipper.on=true;S.res.logs=1e12;S.res.chips=0;S.autosell.chips=false;S.upgrades.sawdust=0;
      M=computeMods();const l0=S.res.logs;tick(1,false);return {c:S.res.chips,l:l0-S.res.logs,y:chainYield('chipper'),f:bstat.chipper.f};})()""")
    ok(r['f']>.99 and abs(r['c']/r['l']-r['y'])/r['y']<1e-6 and r['y']>3,f"Lv 60 chipper: {r['c']/r['l']:.2f} chips per log (= yield ×{r['y']:.2f}), same logs in")
    ctx.close()
    # ---- cost-balanced (every building gets the same coins) ----
    ctx,pg=page(); R={}
    for B in [1e6,1e7,1e8,1e10,1e12,1e14]:
        pg.goto(URL+'?b='+str(B)); pg.wait_for_timeout(800); E(pg,QUIET); R[B]=E(pg,f"({BAL})({B})")
    rs=[round(R[B]['r'],2) for B in R]
    print('   cost-balanced chips supply/demand:',rs,'(v2.29: [0.42, 0.47, 0.29, 0.15, 0.29, 0.19])')
    ok(min(rs)>=.6 and sorted(rs)[len(rs)//2]>=1,f'cost-balanced chips: never below 60 % of demand, usually fed ({rs})')
    ok(all(R[B]['r']>=.95 for B in [1e7,1e12,1e14]),'…and fully fed at 1e7, 1e12 and 1e14 coins per building')
    ctx.close()
    # ---- greedy multi-Replant sim (seeded): pellet / paper rarely wait on chips ----
    ctx,pg=page(init=SEEDED); E(pg,"window.mishTick=()=>{}")
    G=E(pg,f"({SIM})({{runs:4,maxMin:30,hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})")
    cb=[round(x['x']['cb'],2) for x in G]
    print('   greedy runs (chips-bound share of the 2nd half, chipper Lv, chips p/d):',[(x['run'],round(x['x']['cb'],2),x['x']['lv'],round(x['x']['r'],2)) for x in G],'(v2.29: 0.91–1.00)')
    ok(len(G)==4 and max(cb)<=.1,f'greedy play over 3 Replants: Pellet Press / Paper Mill wait on chips ≤10 % of the 2nd half ({cb})')
    ok(all(x['x']['adv']==0 for x in G),'the Bottleneck Advisor no longer lists chips at the end of any run')
    ctx.close()
    # ---- building sheet shows the chip yield (desktop + phone) ----
    for dev in [None,'iPhone 13']:
        tag=dev or 'desktop'
        ctx,pg=page(dev,tag+': ')
        E(pg,"S.coins=1e12;S.buildings.chipper.lvl=40;M=computeMods();TT.openSheet('bld','chipper')"); pg.wait_for_timeout(700)
        t=pg.locator('#bpIo').inner_text()
        ok('Chip yield' in t and '×2.05' in t,f'{tag}: chipper card shows the chip yield ({t.replace(chr(10)," ")[-80:]!r})')
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})')
    b.close()
print('FAILS',FAILS); sys.exit(1 if FAILS else 0)
