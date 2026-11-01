# v2.39 Late-game plywood balance. Five workshops (Parquet, Cabinet Studio, Toy Workshop, Boat Yard, Timber-frame Houses) wait on
# one Plywood Mill. Root cause: the mill levels ~7 levels behind them (3.75× the Parquet Workshop's cost + research lock), so their
# ×2 milestones land first (with research tiers I–III it made 57–85 % of what they could use right before each of its own
# milestones), and research sped the workshops up long before the mill, while the late Zero-waste ×2 / Throughput pushed it to
# 2–3× their needs. Fix: press yield ×1.4 with the early start from Lv 1 (same veneer + glue), supply parity (`plyRes`: research
# speed ≥ the plywood-weighted research speed of its workshops), Zero-waste / Throughput for the primary mills only, and the Veneer
# Panel Press keeps pace with the Peeler's research (`pressRes`, spare veneer only).
# Checks: rules, early game identical to v2.38, supply/demand table vs v2.38 for research tiers II/III/V, steady-state sims
# (workshops fed with everything but plywood, and a normal factory), greedy multi-Replant sim, Replant audit at forest value
# ×1/×50/×675 (costs, order amounts/rewards, sheet text), saves, Plywood Mill + Panel Press sheet by mouse (desktop) and by touch
# (iPhone 13, Pixel 7), no console errors / 404s. Writes scratch shots to test/v239_*.png.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
HERE=os.path.dirname(os.path.abspath(__file__))
OLD=BASE+'releases/v2.38/index.html'
SEED='(()=>{let s=11;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};window.checkAch=()=>{};S.ach={};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e15;S.orders.next=S.time+1e15;if(S.mish) S.mish.next=S.time+1e15;S.prefs.autoFocus=false;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;if(S.daily) S.daily.next=1e15;if(S.ob) S.ob.st='skip';M=computeMods();})()"
# cost-balanced factory: every building gets the same coins B; research tiers ≤ T (no repeatables), Premium Area + harbour open
BAL='''([B,T])=>{S.premium.lvl=1;for(const n of RNODES) S.research[n.id]=n.t<=T&&!n.rep?1:0;if(S.trade) S.trade.lvl=1;
 for(const b of BUILDINGS){S.buildings[b.id].lvl=Math.max(0,Math.floor(Math.log(B/b.cost)/Math.log(b.scale)));S.buildings[b.id].on=true;}M=computeMods();}'''
# potential plywood made / what the (non-spare) plywood workshops can use, both at full speed (works on v2.38 too)
POT='''()=>{let need=0;for(const b of BUILDINGS){if(!b.inp.plywood||surplusIn(b.id,'plywood')||!S.buildings[b.id].lvl||!bldUnlocked(b.id)) continue;need+=b.inp.plywood*bSpeed(b.id)*bInMult(b.id);}
 const made=S.buildings.plymill.lvl&&bldUnlocked('plymill')?BMAP.plymill.out.plywood*bSpeed('plymill')*bOutMult('plymill'):0;return need>0?made/need:99;}'''
# steady state over 75 s (after 75 s warm-up); rel: paper / chairs / glulam / panels topped up, so the workshops only wait on plywood
SS='''([B,T,rel])=>{(%s)([B,T]);for(const c of COLLECTORS) S.collectors[c.id]=400;for(const k in S.res) S.res[k]=0;S.forest.m=1e9;S.orders.offers=[];S.orders.active=null;
 if(S.daily) S.daily.active=[];if(S.trade) S.trade.fleet=[];for(const k in S.autosell) S.autosell[k]=true;M=computeMods();
 const U=BUILDINGS.filter(b=>b.inp.plywood&&!surplusIn(b.id,'plywood')).map(b=>b.id),W=U.concat(['furniture','plymill','decorstudio','panelpress']);
 const F={},PB={},VB={};let n=0,full=0,p=0,s=0,vp=0,vs=0,inc=0;
 for(let k=0;k<300;k++){S.res.logs=Math.max(S.res.logs,1e9);S.forest.m=1e9;if(rel) for(const r of ['paper','chairs','glulam','panels']) S.res[r]=1e12;
   const e0=S.totalEarned;tick(.5,false);if(k<150) continue;n++;inc+=S.totalEarned-e0;
   for(const id of W){const st=S.buildings[id];if(!st.lvl||!bldUnlocked(id)) continue;const bs=bstat[id];F[id]=(F[id]||0)+bs.f;
     if(bs.lim==='plywood'&&bs.f<.95) PB[id]=(PB[id]||0)+1;if(bs.lim==='veneer'&&bs.f<.95) VB[id]=(VB[id]||0)+1;}
   if(bstat.plymill&&bstat.plymill.full) full++;const R=rates.plywood;if(R){p+=R.p;s+=R.s;}const Q=rates.veneer;if(Q){vp+=Q.p;vs+=Q.s;}}
 const o={pb:{},vb:{},f:{}};for(const id in PB) if(PB[id]/n>.05&&U.includes(id)) o.pb[id]=+(PB[id]/n).toFixed(2);for(const id in VB) if(VB[id]/n>.05) o.vb[id]=+(VB[id]/n).toFixed(2);
 for(const id in F) o.f[id]=+(F[id]/n).toFixed(2);o.sold=p>0?s/p:0;o.vsold=vp>0?vs/vp:0;o.full=full;o.inc=inc/(n*.5);return o;}'''%BAL
TIERS=[2,3,5]
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.seeds,prestige:()=>doPrestige(),
 spend:()=>{for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);if(S.trade) S.trade.lvl=Math.max(1,S.trade.lvl||0);
   S.power.lvl=Math.max(S.power.lvl,6);S.power.logs='first';S.power.res=30;M=computeMods();window._cs={a:[]};},
 want:(g,c,T)=>g>=Math.max(1,Math.ceil(c*0.5))&&T>=900,
 hold:()=>{const C=window._cs;const us=BUILDINGS.filter(b=>b.inp.plywood&&S.buildings[b.id].lvl&&S.buildings[b.id].on&&bldUnlocked(b.id)&&!surplusIn(b.id,'plywood'));
   if(us.length) C.a.push(us.some(b=>bstat[b.id]&&bstat[b.id].lim==='plywood'&&bstat[b.id].f<.95)?1:0);return false;}}'''
EXTRA='''(()=>{const a=window._cs.a,h=a.slice(a.length>>1);return {ply:h.length?h.reduce((s,v)=>s+v,0)/h.length:0,cs:cs(),mill:S.buildings.plymill.lvl};})()'''
EARLY='''(()=>{let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};S.coins=50;if(S.ob) S.ob.st='skip';
 const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
 for(let k=0;k<14400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10) TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10) TT.buyCollector('truck',1);
   for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
 return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.carpentry.lvl,S.buildings.peeler.lvl,S.buildings.pellet.lvl];})()'''
LATE='''(()=>{S.coins=1e16;S.totalEarned=1e16;S.premium.lvl=1;for(const n of RNODES) S.research[n.id]=n.t<=3&&!n.rep?1:0;if(S.trade) S.trade.lvl=1;
 for(const b of BUILDINGS){S.buildings[b.id].lvl=b.tech||b.premium?30:45;S.buildings[b.id].on=true;}S.buildings.plymill.lvl=40;for(const c of COLLECTORS) S.collectors[c.id]=200;
 M=computeMods();if(TT.rebuildAll) TT.rebuildAll();for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);}TT.render();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,tag='',init=CLEAR,url=URL,seed=True):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script((SEED if seed else '')+init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); pg.wait_for_timeout(1200); E(pg,QUIET); return ctx,pg
    # ---------------- version ----------------
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,39),f"VERSION >= 2.39 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,39),'sw cache bumped to >= v2.39')
    # ---------------- rules ----------------
    r=E(pg,"""(()=>{const old=l=>Math.max(sawYieldAt(l),(1+Math.max(0,l-10)/20)*Math.pow(1.6,Math.max(0,msCount(l)-3)));const L=[];for(let l=1;l<=520;l++) L.push([plyYieldAt(l),old(l)]);
      return {k:PLY_PRESS,y1:plyYieldAt(1),y10:plyYieldAt(10),mono:L.every((x,i)=>i===0||x[0]>=L[i-1][0]-1e-12),ge:L.every(x=>x[0]>=x[1]*PLY_PRESS-1e-9),
        rec:[BMAP.plymill.inp.veneer,BMAP.plymill.inp.glue,BMAP.plymill.out.plywood,BMAP.plymill.cost,BMAP.plymill.scale,TAR_GLUE]};})()""")
    ok(r['k']==1.4 and abs(r['y1']-1.4)<1e-9 and abs(r['y10']-1.4*1.45)<1e-9,f"press yield ×1.4, early start from Lv 1 (Lv 1 ×{r['y1']:.2f}, Lv 10 ×{r['y10']:.2f})")
    ok(r['mono'] and r['ge'],'press yield never drops with a level and is ≥ 1.4× the v2.38 curve at every level (Lv 1–520)')
    ok(r['rec']==[4,2,3,1.5e7,1.22,.7],f"recipe, cost, scale and glue unchanged: only the yield moved, so the mill uses no extra veneer or glue ({r['rec']})")
    r=E(pg,"""(()=>{for(const n of RNODES) S.research[n.id]=0;S.research.zerowaste=1;S.research.r_mil=3;M=computeMods();return [M.bld.plymill,M.bld.peeler>2,M.bld.sawmill>2,RNMAP.zerowaste.d];})()""")
    ok(r[0]==1 and r[1] and r[2] and 'primary' in r[3],f"Zero-waste ×2 and Throughput now boost the primary mills only, not the Plywood Mill ({r})")
    r=E(pg,"""(()=>{for(const n of RNODES) S.research[n.id]=0;S.premium.lvl=1;if(S.trade) S.trade.lvl=1;for(const b of BUILDINGS) S.buildings[b.id].lvl=0;M=computeMods();
      const a=[plyRes(),M.bld.plymill];S.buildings.plymill.lvl=20;S.buildings.parquet.lvl=30;S.buildings.toyshop.lvl=20;S.buildings.decorstudio.lvl=40;S.research.ateliers=1;S.research.toyline=1;S.research.toys=1;S.research.plywood=1;M=computeMods();
      const w=(id)=>BMAP[id].inp.plywood*S.buildings[id].lvl*Math.pow(2,msCount(S.buildings[id].lvl))*(BMAP[id].spd||1);
      const exp=(w('parquet')*M.bld.parquet+w('toyshop')*M.bld.toyshop)/(w('parquet')+w('toyshop'));const b=[plyRes(),exp,M.bld.plymill];
      S.research.grading=1;S.research.coldpress=1;M=computeMods();const c=[plyRes(),M.bld.plymill];
      S.buildings.toyshop.on=false;const d=plyRes();return {a,b,c,d,excl:plyUsers().map(x=>x.id)};})()""")
    ok(r['a']==[1,1],'no workshops: the mill runs at its own research speed')
    ok(abs(r['b'][0]-r['b'][1])<1e-9 and r['b'][2]==1 and r['b'][0]>1.4,f"supply parity: the mill gets the plywood-weighted research speed of its workshops (×{r['b'][0]:.3f} = expected ×{r['b'][1]:.3f}, own ×1)")
    ok(abs(r['c'][0]-r['c'][1])<1e-9 and r['c'][1]>2,f"…and keeps its own research when that is higher (×{r['c'][0]:.2f})")
    ok('decorstudio' not in r['excl'] and set(r['excl'])=={'parquet','cabinetry','toyshop','boatyard','framer'},f"the Decor Studio (spare plywood only) never sets the pace ({r['excl']})")
    r=E(pg,"""(()=>{for(const n of RNODES) S.research[n.id]=0;M=computeMods();const a=pressRes();S.research.robomill=1;S.research.zerowaste=1;M=computeMods();return [a,pressRes(),M.bld.peeler,M.bld.panelpress,SURPLUS_IN.panelpress.veneer];})()""")
    ok(r[0]==1 and abs(r[1]-r[2])<1e-9 and r[3]<r[2] and r[4]==1,f"the Veneer Panel Press keeps pace with the Peeler's research and still takes spare veneer only ({r})")
    ctx.close()
    # ---------------- early game identical to v2.38 ----------------
    ctx,pg=page(seed=False); e_new=E(pg,EARLY); ctx.close()
    ctx,pg=page(url=OLD,seed=False); e_old=E(pg,EARLY); ctx.close()
    ok(abs(e_new[0]-e_old[0])/e_old[0]<1e-9 and e_new[1:]==e_old[1:],f'early game identical to v2.38: 2 h scripted run earns {e_new[0]:.6f} (v2.38 {e_old[0]:.6f}), levels {e_new[1:]}')
    # ---------------- supply / demand table vs v2.38 ----------------
    BS=[1e8,3e8,1e9,3e9,1e10,3e10,1e11,1e12,1e13,1e14,1e15]
    tab={}
    for tag,url in [('new',URL),('old',OLD)]:
        ctx,pg=page(url=url)
        for T in TIERS:
            tab[(tag,T)]=[round(E(pg,f"(()=>{{({BAL})([{B},{T}]);return ({POT})();}})()"),2) for B in BS]
        ctx.close()
    for T in TIERS:
        n,o=tab[('new',T)],tab[('old',T)]
        print(f'   tier ≤{T} plywood made / needed  v2.38 {o}\n                                 v2.39 {n}')
        ok(min(n)>=1.1,f'research tier ≤ {T}: the Plywood Mill makes ≥ 1.1× what its workshops can use at every budget 1e8–1e15 (min {min(n)}, v2.38 min {min(o)})')
        ok(max(n)<=2.8,f'research tier ≤ {T}: …and at most 2.8× at the top of a milestone sawtooth (max {max(n)}, v2.38 max {max(o)})')
    OMX=max(max(tab[('old',T)]) for T in TIERS); NMX=max(max(tab[('new',T)]) for T in TIERS)
    ok(NMX<=OMX,f'no new surplus: the worst over-supply anywhere is lower than v2.38 ({NMX} vs {OMX})')
    ok(min(min(tab[('old',T)]) for T in [2,3])<.8,'v2.38 reference: the pinch was real (made < 0.8× needed for tiers II–III)')
    # ---------------- steady state: workshops fed with everything but plywood ----------------
    SB=[1e9,1e10,1e11,1e12,1e13,1e14,1e15]
    for rel in [1,0]:
        res={}
        for tag,url in [('new',URL),('old',OLD)]:
            ctx,pg=page(url=url)
            for T in TIERS:
                for B in SB: res[(tag,T,B)]=E(pg,f"({SS})",[B,T,rel])
            ctx.close()
        lab='workshops fed with everything but plywood' if rel else 'normal factory (auto-sell, real paper / chairs)'
        for T in TIERS:
            N=[res[('new',T,B)] for B in SB]; O=[res[('old',T,B)] for B in SB]
            pb=[x['pb'] for x in N]
            ok(not any(pb),f"{lab}, tier ≤{T}: no plywood workshop waits on plywood at any budget 1e9–1e15 ({pb}; v2.38 {[x['pb'] for x in O]})")
            ok(all(x['full']==0 for x in N),f'{lab}, tier ≤{T}: the Plywood Mill never backs up (stock full)')
            if rel:
                ds=[x['f'].get('decorstudio') for x in N if 'decorstudio' in x['f']]
                ok(all(d>=.95 for d in ds),f'{lab}, tier ≤{T}: the Decor Studio (spare plywood) is always fed ({ds}; v2.38 {[x["f"].get("decorstudio") for x in O if "decorstudio" in x["f"]]})')
                sold=[round(x['sold'],2) for x in N]
                osold=[round(x['sold'],2) for x in O]
                ok(max(sold)<=.55,f'{lab}, tier ≤{T}: spare plywood sold raw ≤ 55 %, never piling up ({sold}; v2.38 {osold})')
            else:
                print(f'   {lab}, tier ≤{T}: income v2.38→v2.39',' '.join(f'{x["inc"]/y["inc"]-1:+.0%}' for x,y in zip(N,O)),
                      '| plywood sold raw',[round(x['sold'],2) for x in N],'(v2.38',[round(x['sold'],2) for x in O],') | veneer sold raw',[round(x['vsold'],2) for x in N],'(v2.38',[round(x['vsold'],2) for x in O],')')
                vb=[k for x in N for k in x['vb'] if k in ('furniture','plymill')]
                ok(not vb,f'{lab}, tier ≤{T}: the Furniture Factory and the Plywood Mill never wait on veneer ({vb})')
                if T==5:
                    ok(sum(x['vsold'] for x in N)<=sum(x['vsold'] for x in O)+1e-9,f"{lab}, tier V: less veneer is sold raw than in v2.38 (avg {sum(x['vsold'] for x in N)/len(N):.2f} vs {sum(x['vsold'] for x in O)/len(O):.2f})")
                    ok(sum(x['sold'] for x in N)<=sum(x['sold'] for x in O)+1e-9,f"{lab}, tier V: less plywood is sold raw than in v2.38 (avg {sum(x['sold'] for x in N)/len(N):.2f} vs {sum(x['sold'] for x in O)/len(O):.2f})")
                    ok(min(x['inc']/y['inc'] for x,y in zip(N,O))>=.85,'…and income stays within 15 % of v2.38 at every budget')
                else:
                    ok(min(x['inc']/y['inc'] for x,y in zip(N,O))>=.95,f'{lab}, tier ≤{T}: income is never lower than v2.38 (−5 % noise allowed)')
    # the start of the premium phase: veneer (not plywood) is the limit there, in both versions; plywood workshops are better fed
    ctx,pg=page(); a=E(pg,f"({SS})",[1e8,3,1]); ctx.close(); ctx,pg=page(url=OLD); o=E(pg,f"({SS})",[1e8,3,1]); ctx.close()
    ok(a['f']['parquet']>=o['f']['parquet']+.3 and a['f']['parquet']>=.75,f"first premium minutes (1e8): Parquet runs at {a['f']['parquet']:.0%} (v2.38 {o['f']['parquet']:.0%}); the rest is the Peeler's veneer, shared with furniture")
    # ---------------- greedy multi-Replant sim (seeded) ----------------
    ctx,pg=page(); E(pg,"window.mishTick=()=>{};window.fireTick=fireTick=()=>{}")
    R=E(pg,f"({SIM})({{runs:4,maxMin:25,hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})")
    print('   greedy runs (run, forest value, plywood-short share of the 2nd half, mill Lv):',[(x['run'],round(x['x']['cs'],1),round(x['x']['ply'],3),x['x']['mill']) for x in R])
    ok(len(R)==4 and R[-1]['x']['cs']>5,f'4 runs with 3 Replants (forest value ×{R[-1]["x"]["cs"]:.1f})')
    ok(all(x['x']['ply']<=.05 for x in R),f"every run: a plywood workshop waits on plywood in ≤ 5 % of the second half ({[round(x['x']['ply'],3) for x in R]})")
    ctx.close()
    # ---------------- Replant audit: no tiny numbers at forest value ×1 / ×50 / ×675 ----------------
    ctx,pg=page()
    for CS in [1,50,675]:
        r=E(pg,"""(CS)=>{S.runCS=CS;(%s)([1e13*CS,5]);for(const c of COLLECTORS) S.collectors[c.id]=400;for(const k in S.res) S.res[k]=0;M=computeMods();
          for(let k=0;k<60;k++){S.res.logs=1e12;S.forest.m=1e9;tick(1,false);}
          const out={cs:cs(),cost:bulkCost(BMAP.plymill.cost,BMAP.plymill.scale,0,1),inc:ordInc(),bad:[]};
          for(const k of ['plywood','flooring','cabinets','toys','boats','houses','decor']){if(!(prodRate(k)>0)) continue;const o=makeOrder(k);if(!o) continue;
            const v=o.amt*price(k);if(o.amt<20||o.reward<ORD_MIN_PAY*cs()||o.reward<v*1.5-1e-6||!isFinite(o.reward)) out.bad.push([k,o.amt,o.reward,v]);}
          const B=plyBal();out.bal=[B.made,B.need,B.r];openSheet('bld','plymill');out.txt=document.getElementById('bpIo').innerText;closeSheet();return out;}"""%BAL,CS)
        ok(abs(r['cost']/r['cs']-1.5e7)<1,f"×{CS}: the Plywood Mill's first level costs 15M × forest value ({r['cost']:.3g})")
        ok(not r['bad'],f"×{CS}: plywood-line orders keep ≥ 20 units and a reward ≥ 1.5× the goods and ≥ 🪙{50*CS} ({r['bad']})")
        ok(all(isinstance(x,(int,float)) and x>0 for x in r['bal']) and 1<=r['bal'][2]<10,f"×{CS}: sheet balance makes {r['bal'][0]:.3g}/s vs {r['bal'][1]:.3g}/s ({r['bal'][2]:.2f}×)")
        ok(not re.search(r'NaN|undefined|Infinity|null|e\+',r['txt']) and 'At full speed' in r['txt'],f"×{CS}: Plywood Mill sheet text is clean ({r['txt'][-110:]!r})")
    ctx.close()
    # ---------------- saves ----------------
    ctx,pg=page(); E(pg,LATE); base=E(pg,"JSON.stringify(Object.assign(JSON.parse(JSON.stringify(S)),{version:'2.38'}))"); ref=E(pg,"[bSpeed('plymill'),chainYield('plymill')]"); ctx.close()
    for name,mut in [('v2.38 save',''),('damaged','o.buildings.plymill.lvl="x";o.research.zerowaste="?";')]:
        ctx,pg=page(tag=name+': ',init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");sessionStorage.setItem("_c","1");const o=JSON.parse(%s);%s;localStorage.setItem("timberTycoon_save_v1",JSON.stringify(o))}'%(json.dumps(base),mut))
        r=E(pg,"(()=>{for(let k=0;k<20;k++){S.forest.m=1e9;tick(1,false);}return {lv:S.buildings.plymill.lvl,sp:bSpeed('plymill'),y:chainYield('plymill'),c:S.coins,ok:isFinite(S.coins)&&isFinite(S.res.plywood)&&isFinite(bSpeed('plymill'))};})()")
        ok(r['ok'] and (r['lv']==40 if not mut else r['lv']>=0),f"{name}: loads and runs (Plywood Mill Lv {r['lv']}, speed {r['sp']:.3g})")
        if not mut: ok(abs(r['y']-ref[1])<1e-9,'v2.38 save: the new press yield applies at once, nothing to migrate')
        ctx.close()
    # ---------------- desktop UI (mouse) ----------------
    def aim(pg,id,z):
        E(pg,f"(()=>{{const L=LOTS['{id}'];const c=scene.cam;const p=P(L.ci,L.cj,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*{z};}})()"); pg.wait_for_timeout(1100)
    def sheet_checks(pg,tag,touch):
        aim(pg,'plymill',1.6); xy=E(pg,"TT.lotScreen('plymill')")
        (pg.touchscreen.tap if touch else pg.mouse.click)(xy[0],xy[1]-20); pg.wait_for_timeout(800)
        ok(E(pg,"[TT.curSheet,TT.sheetBld]")==['bld','plymill'],f'{tag}: {"tap" if touch else "click"} on the Plywood Mill opens its sheet')
        t=E(pg,"document.getElementById('bpIo').innerText")
        ok('Press yield ×' in t and 'At full speed' in t and 'workshops can use' in t,f'{tag}: sheet shows the press yield and plywood made vs needed ({t.splitlines()[-3:]})')
        ok(E(pg,"!!document.getElementById('plyPar')") and 'Supply parity' in t,f'{tag}: supply parity line (workshops have Atelier Methods / Toy Line)')
        ok(E(pg,"document.getElementById('plyBal').classList.contains('ok')"),f'{tag}: balance line is green (enough plywood)')
        ok(E(pg,'(()=>{const e=document.getElementById("shBody");return e.scrollWidth<=e.clientWidth+1})()'),f'{tag}: no sideways scroll in the sheet')
        W=E(pg,'innerWidth'); bx=E(pg,"['plyBal','plyPar'].map(id=>{const e=document.getElementById(id);if(!e) return [-1,-1];const r=e.getBoundingClientRect();return [r.left,r.right]})")
        ok(all(x[0]>=0 and x[1]<=W+.5 for x in bx),f'{tag}: the new lines fit the screen ({bx})')
        E(pg,"document.getElementById('plyBal').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
    for dev in [None,'iPhone 13','Pixel 7']:
        tag=dev or 'desktop'; touch=bool(dev)
        ctx,pg=page(dev,tag+': '); E(pg,LATE); E(pg,"(()=>{S.research.zerowaste=1;M=computeMods();})()")
        sheet_checks(pg,tag,touch)
        if touch:
            pg.tap('#shSize'); pg.wait_for_timeout(600); E(pg,"document.getElementById('plyBal').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
            ok(E(pg,"getComputedStyle(document.getElementById('plyBal')).display")!='none',f'{tag}: full-height sheet still shows the balance')
        pg.screenshot(path=os.path.join(HERE,f"v239_{tag.split()[0].lower()}.png"))
        # a shortage reads red with a hint (mill far behind)
        E(pg,"(()=>{S.buildings.plymill.lvl=3;M=computeMods();TT.render();})()"); pg.wait_for_timeout(500)
        ok(E(pg,"(()=>{const e=document.getElementById('plyBal');return e&&e.classList.contains('short')&&/upgrade the mill/.test(e.innerText)})()"),f'{tag}: a Plywood Mill far behind shows a red "upgrade the mill" line')
        # Panel Press sheet: keeps pace with the Peeler
        E(pg,"closeSheet()"); pg.wait_for_timeout(300); aim(pg,'panelpress',1.6); xy=E(pg,"TT.lotScreen('panelpress')")
        (pg.touchscreen.tap if touch else pg.mouse.click)(xy[0],xy[1]-20); pg.wait_for_timeout(800)
        ok(E(pg,"TT.sheetBld")=='panelpress' and 'Keeps pace with the Peeler' in E(pg,"document.getElementById('bpIo').innerText"),f'{tag}: the Panel Press sheet shows it keeps pace with the Peeler')
        ctx.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
    ok(not missing,f'no 404s ({missing[:3]})')
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
