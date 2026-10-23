# v2.27: factory layout (columns in chain order, Veneer Peeler at the bottom of Phase 1, helper strip on the right with the
# Shipping dock, Contract Office and Builders' Yard) + 21 trophies for the newer systems. Geometry (no overlaps, paths clear of
# buildings, helpers right of the columns, no trees in the strip), quick-jump chips, taps on moved buildings, flow view, trophy
# progress on fresh / old saves, unlocks, Replant, desktop + iPhone 13 / Pixel 7 touch, no console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;S.mish.next=S.time+1e9;})()"
SETUP='''(()=>{S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture']) TT.buyBuilding(b,15);
  S.premium.lvl=Math.max(1,S.premium.lvl);TT.buyBuilders&&TT.buyBuilders();S.coins=1e12;S.playTime=5000;S.time=5000;
  S.nextEvent=S.time+1e9;S.orders.next=S.time+1e9;S.mish.next=S.time+1e9;M=computeMods();TT.simulate(20);TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
# boxes in grid units (i0,j0,i1,j1) of every building / helper at its largest size
BOXES='''(()=>{const keep={};for(const b of BUILDINGS){keep[b.id]=S.buildings[b.id].lvl;S.buildings[b.id].lvl=400;}
  const o={};for(const id in LOTS){const L=LOTS[id];if(L.prem||L.tech) continue;const B=lotBox(L);o[id]=[B.i0,B.j0,B.i1,B.j1];}
  for(const b of BUILDINGS) S.buildings[b.id].lvl=keep[b.id];
  o.dock=[DOCK.ci-1.95,DOCK.cj-1.95,DOCK.ci+1.95,DOCK.cj+1.95];o.yard=[YARD.ci-2,YARD.cj-2,YARD.ci+2,YARD.cj+2];
  o.office=[OFFB.i0-.15,OFFB.j0-.15,OFFB.i1+.2,OFFB.j1+.7];o.build=[BYZ.i0,BYZ.j0,BYZ.i1,BYZ.j1];o.station=[STB.i0,STB.j0,STB.i1,STB.j1];
  o.power=[PWZ.i0,PWZ.j0,PWZ.i1,PWZ.j1];o.campus=[CAMPUS.i0,CAMPUS.j0,CAMPUS.i1,CAMPUS.j1];return o;})()'''
def overlap(a,b,m=0): return a[0]<b[2]-m and b[0]<a[2]-m and a[1]<b[3]-m and b[1]<a[3]-m
def inside(p,b,m): return b[0]+m<p[0]<b[2]-m and b[1]+m<p[1]<b[3]-m
def samples(pts,step=.2):
    out=[]
    for a,c in zip(pts,pts[1:]):
        d=((c[0]-a[0])**2+(c[1]-a[1])**2)**.5; n=max(1,int(d/step))
        for k in range(n+1): out.append((a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n))
    return out
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
    ok(ver(E(pg,'TT.VERSION'))>=(2,27),f"VERSION >= 2.27 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,27),'sw cache bumped to >= v2.27')
    ok(ver(E(pg,"document.getElementById('verBadge').textContent").strip().lstrip('v'))>=(2,27),'version badge shows >= v2.27')
    # ---------------- columns ----------------
    col=E(pg,"""(()=>{const o={};for(const id in LOTS){const L=LOTS[id];if(L.tech) continue;(o[L.side]=o[L.side]||[]).push({id,u:L.ci+L.cj,v:L.ci-L.cj,cost:BMAP[id].cost});}
      for(const k in o) o[k].sort((a,b)=>a.u-b.u);return o;})()""")
    for side,name in [('R','Phase 1'),('L','Phase 2'),('P','Phase 3')]:
        L=col[side]; vs=[x['v'] for x in L]
        ok(max(vs)-min(vs)<.01,f"{name} is one straight column ({[x['id'] for x in L]})")
        ok(all(L[k]['u']<L[k+1]['u'] for k in range(len(L)-1)),f"{name} runs down the screen")
    ok([x['id'] for x in col['R']][:4]==['sawmill','chipper','kiln','peeler'],f"Phase 1 in chain / unlock order top → bottom: {[x['id'] for x in col['R']]}")
    ok(all(col['R'][k]['cost']<col['R'][k+1]['cost'] for k in range(3)),'Phase 1: every newer building sits further down')
    ok([x['id'] for x in col['L']][:4]==['carpentry','pellet','paper','furniture'],'Phase 2 order kept (each across from its feeder)')
    r=E(pg,"""(()=>{const u=id=>LOTS[id].ci+LOTS[id].cj;return {saw:Math.abs(u('sawmill')-u('carpentry')),chip:Math.abs(u('chipper')-u('pellet')),veneer:Math.abs(u('peeler')-u('furniture'))};})()""")
    ok(r['saw']<.01 and r['chip']<.01 and r['veneer']<.01,f"feeders sit straight across the lane (sawmill↔carpentry, chipper↔pellet, peeler↔furniture): {r}")
    # ---------------- helpers on the right, nothing overlaps ----------------
    bx=E(pg,BOXES)
    names=list(bx); bad=[(a,c) for k,a in enumerate(names) for c in names[k+1:] if overlap(bx[a],bx[c],.02)]
    ok(not bad,f"no two buildings / helper yards overlap ({bad})")
    p1v=max(x['v'] for x in col['R'])
    for h in ['station','campus','power','office','build','dock']:
        B=bx[h]; vmin=B[0]-B[3]   # leftmost screen corner (i0-j1)
        ok(vmin>p1v-.5 and B[2]<30.05,f"{h} is in the helper strip right of the Phase 1 column, left of the highway (v ≥ {vmin:.1f}, i ≤ {B[2]:.1f})")
    ok(E(pg,"scene.trees.filter(t=>hStrip(t.i,t.j)).length")==0,'no trees grow in the helper strip')
    ok(E(pg,"zoneAt(OFFICE.ci,OFFICE.cj)==='yard'&&zoneAt(BYZ.ci,BYZ.cj)==='yard'&&zoneAt(DOCK.ci,DOCK.cj)==='yard'"),'helper strip is paved yard ground')
    # ---------------- paths (forklifts, tier lifts, vans, couriers) clear of buildings ----------------
    E(pg,SETUP); E(pg,QUIET); E(pg,"(()=>{for(let k=0;k<40;k++){tick(.25,false);TT.render();} spawnCourierVan({item:'chairs'});mktFleetSync&&mktFleetSync();for(let k=0;k<12;k++){scene._mktCD=0;mktFleetSync();}})()")
    paths=E(pg,"""(()=>{const o=[];const _tl=tierLiftsFor;window.tierLiftsFor=()=>2;scene._tsig=null;syncTierLifts();window.tierLiftsFor=_tl;scene._tsig=null;for(const f of scene.forklifts) o.push(['fork:'+f.src,f.path.pts]);
      for(const b of MAIN_BLD) for(const k of [0,1]) o.push(['fork*:'+b.id+k,mkForklift(b.id,k).path.pts]);   /* every possible dock run */
      for(const f of scene.tierLifts||[]) o.push(['lift:'+f.src+'>'+f.dst,f.path.pts]);
      for(const v of scene.marketVans||[]) v.legs.forEach((l,k)=>o.push(['van:'+v.bid+':'+k,l.pa.pts]));for(const v of scene.couriers||[]) v.legs.forEach((l,k)=>o.push(['courier:'+k,l.pa.pts]));
      for(const v of scene.dockTrucks||[]) v.legs.forEach((l,k)=>o.push(['dtruck:'+k,l.pa.pts]));return o;})()""")
    kinds=set(n.split(':')[0] for n,_ in paths)
    ok({'fork','fork*','lift','van','courier','dtruck'}<=kinds,f"all vehicle kinds present ({sorted(kinds)})")
    hits=[]
    for n,pts in paths:
        for q in samples(pts):
            for k,B in bx.items():
                if k=='dock' and n.startswith('dtruck'): continue
                if k=='office' and n.startswith('courier'): continue
                if inside(q,B,.3): hits.append((n,k,round(q[0],1),round(q[1],1))); break
            else: continue
            break
    ok(not hits,f"{len(paths)} vehicle paths stay clear of every building ({hits[:6]})")
    r=E(pg,"""(()=>{const d=dockDrop();return {u:d[0]+d[1],ku:LOTS.kiln.ci+LOTS.kiln.cj,pu:LOTS.peeler.ci+LOTS.peeler.cj};})()""")
    ok(r and r['ku']<r['u']<r['pu'],f"dock forklifts use the Kiln–Peeler aisle ({r})")
    # ---------------- camera, chips, flow ----------------
    r=E(pg,"""(()=>{const B=CAM_WORLD,o=[];for(const j of JUMPS){const [x,y]=j.pt();if(x<B.x0||x>B.x1||y<B.y0||y>B.y1) o.push(j.id);}
      for(const id of ['office','build','dock']){const L=id==='office'?OFFICE:id==='build'?BYZ:DOCK;const [x,y]=P(L.ci,L.cj);if(x<B.x0||x>B.x1||y<B.y0||y>B.y1) o.push('lot:'+id);}return o;})()""")
    ok(r==[],f"every quick-jump target and moved building is inside the camera bounds ({r})")
    ids=E(pg,"JUMPS.map(j=>j.id)")
    ok(ids[:6]==['forest','yard','factory','p1','p2','prem'] and ids.index('dock')>ids.index('office'),f"chips: production columns first, then helpers ({ids})")
    ok(E(pg,"JUMPS.find(j=>j.id==='p2').lock()") is False,'Phase 2 chip unlocked once a Phase 2 building runs')
    E(pg,"TT.toggleJump&&TT.toggleJump(true)"); pg.wait_for_timeout(300)
    E(pg,"buildJumpBar()"); pg.wait_for_timeout(100)
    pg.locator('#jumpBar .jchip[data-j=office]').click(); pg.wait_for_timeout(1400)
    r=E(pg,"(()=>{const s=w2s(...P(OFFICE.ci,OFFICE.cj,14));return [s[0]>0&&s[0]<scene.w,s[1]>0&&s[1]<scene.h];})()")
    ok(r==[True,True],'📅 Contracts chip flies to the Contract Office')
    E(pg,"closeSheet&&closeSheet()")
    for kind,expect,js in [('office','daily',"P(OFFICE.ci,OFFICE.cj,8)"),('build','build',"P(BYZ.ci,BYZ.cj,6)"),('dock','ship',"P(DOCK.ci-.6,DOCK.cj-.6,30)"),('peeler','bld',"P(LOTS.peeler.ci,LOTS.peeler.cj,20)")]:
        E(pg,f"(()=>{{closeSheet();const c=scene.cam,p={js};c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*1.5;c.fly=null;TT.render();}})()"); pg.wait_for_timeout(250)
        h=E(pg,f"(()=>{{const s=w2s(...{js});return hitTest(s[0],s[1]);}})()")
        ok(h and (h.get('type')==kind or (kind=='peeler' and h.get('id')=='peeler')),f"hit test finds the moved {kind} ({h})")
        E(pg,f"(()=>{{const s=w2s(...{js});TT.sceneTapAt(s[0],s[1]);}})()"); pg.wait_for_timeout(400)
        cur=E(pg,"TT.curSheet"); ok(cur==expect or (kind=='office' and cur in ('ord','daily')),f"tapping the {kind} opens its sheet ({cur})")
    E(pg,"closeSheet()")
    r=E(pg,"""(()=>{const a=flowAnchor('dock'),b=flowAnchor('peeler');scene.flow=true;TT.render();return [!!a,!!b,typeof flowEdges==='function'?flowEdges().some(e=>e.to==='dock'):true];})()""")
    ok(r==[True,True,True],f"supply flow anchors follow the moved dock / peeler and sold goods still flow to the dock ({r})")
    pg.locator('#flowBtn').click(); pg.wait_for_timeout(500); pg.locator('#flowBtn').click(); pg.wait_for_timeout(200)
    # ---------------- trophies ----------------
    r=E(pg,"""(()=>{const s=ACH.filter(a=>a.g==='sys');return {n:s.length,ids:new Set(ACH.map(a=>a.id)).size===ACH.length,tiers:[...new Set(s.map(a=>a.t))].sort(),
      bad:s.filter(a=>{const v=a.p();return !(Array.isArray(v)&&v.length===2&&isFinite(v[0])&&isFinite(v[1])&&v[1]>0);}).map(a=>a.id)};})()""")
    ok(r['n']>=20,f"{r['n']} new system trophies"); ok(r['ids'],'trophy ids are unique'); ok(r['tiers']==['bronze','gold','silver'],'bronze, silver and gold among them')
    ok(r['bad']==[],f"every new trophy reports finite progress mid-game ({r['bad']})")
    cov=E(pg,"ACH.filter(a=>a.g==='sys').map(a=>a.id).join()")
    for k,need in [('stations','ws'),('tiers','tier3'),('replant','rp5'),('research','res'),('bad luck','mish'),('orders','order'),('staff','train')]:
        ok(need in cov,f"covers {k}")
    r=E(pg,"""(()=>{const was=Object.assign({},S.ach);const got=x=>!!S.ach[x];
      for(const id of ['ws1','ws10','mish1','mish10','fix5','guard','ins3','slots3','order50','ship10','train1','rp5','res25','shop1']) delete S.ach[id];
      S.ws.sawmill=[10,0,0];S.mish.stats.n=10;S.mish.stats.repairs=5;S.mish.stats.dodged=1;S.mish.ins=3;S.orders.done=50;S.ship.stats.contracts=10;S.staff.trained=1;
      checkAch();return ['ws1','ws10','mish1','mish10','fix5','guard','ins3','order50','ship10','train1'].filter(x=>!got(x));})()""")
    ok(r==[],f"system trophies unlock from their counters ({r})")
    r=E(pg,"""(()=>{const st=S.staff;let w=st.team.find(w=>!w.founding&&(w.skill||1)<10);if(!w){if(st.candidates[0]) staffHireCandidate(st.candidates[0].id);w=st.team.find(w=>!w.founding&&(w.skill||1)<10);}
      if(!w) return 'no staff';const n0=st.trained|0;w.train={left:1,total:1,to:(w.skill||1)+1};staffTick(2,false);return (st.trained|0)-n0;})()""")
    ok(r==1,f"a finished training counts for Night School ({r})")
    E(pg,"openSheet('ach')"); pg.wait_for_timeout(500)
    ok(pg.locator('#achGrid .ach-h').count()==1 and 'Factory systems' in pg.locator('#achGrid .ach-h').inner_text(),'Trophies sheet has the new “Factory systems” section')
    ok(pg.locator('#achGrid .ach').count()==E(pg,'ACH.length'),'every trophy rendered')
    E(pg,"closeSheet()")
    # Replant keeps trophies, new layout still fine after it
    k=E(pg,"achCount()"); E(pg,"(()=>{S.seeds=0;doPrestige();})()"); pg.wait_for_timeout(300)
    ok(E(pg,"achCount()")>=k,'trophies survive a Replant')
    ok(E(pg,"ACH.filter(a=>a.g==='sys').every(a=>{const v=a.p();return isFinite(v[0])&&isFinite(v[1]);})"),'progress stays finite after a Replant')
    ctx.close()
    # ---------------- old saves ----------------
    ctx,pg=page()
    old=E(pg,"""(()=>{const s=freshState();s.version='2.26';s.coins=5e6;s.totalEarned=1e9;s.lifetimeEarned=1e10;s.buildings.sawmill.lvl=120;s.buildings.peeler.lvl=33;s.buildings.kiln.lvl=12;
      s.builders={lvl:2,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0};delete s.staff.trained;delete s.mish;s.ws={sawmill:[3,2,1]};return JSON.stringify(s);})()""")
    ctx.close()
    ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(old))
    r=E(pg,"[S.buildings.sawmill.lvl,S.buildings.peeler.lvl,S.buildings.kiln.lvl,S.builders.lvl,S.version,S.ws.sawmill.join()]")
    ok(r[:4]==[120,33,12,2] and ver(r[4])>=(2,27) and all(int(x)>=y for x,y in zip(r[5].split(','),[3,2,1])),f"a v2.26 save loads with its levels ({r})")
    sv=E(pg,"(()=>{TT.save(true);return localStorage.getItem('timberTycoon_save_v1');})()")
    ok('"ci"' not in sv and '"cj"' not in sv,'building positions are not saved (the layout comes from the code)')
    ok(E(pg,"ACH.find(a=>a.id==='ws1').p()[0]")>=6,'workstation trophies read old saves')
    ok(E(pg,"ACH.find(a=>a.id==='train1').p()[0]")==0 and E(pg,"ACH.find(a=>a.id==='mish1').p()[0]")==0,'missing counters read as 0')
    pg.wait_for_timeout(1500)
    ctx.close()
    # ---------------- touch ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': ')
        E(pg,SETUP); E(pg,QUIET); pg.wait_for_timeout(400)
        pg.locator('#jumpBtn').tap(); pg.wait_for_timeout(400)
        ok(pg.locator('#jumpBar .jchip').count()==E(pg,'JUMPS.length'),f"{dev}: quick-jump bar lists every chip")
        sw=E(pg,"document.documentElement.scrollWidth<=window.innerWidth+1"); ok(sw,f"{dev}: no sideways page scroll")
        for cid in ['p1','office','dock']:
            E(pg,f"document.querySelector('#jumpBar .jchip[data-j={cid}]').scrollIntoView({{inline:'center'}})"); pg.wait_for_timeout(150)
            pg.locator(f'#jumpBar .jchip[data-j={cid}]').tap(); pg.wait_for_timeout(1500)
            hgt=E(pg,f"document.querySelector('#jumpBar .jchip[data-j={cid}]').getBoundingClientRect().height")
            ok(hgt>=36,f"{dev}: {cid} chip is a comfortable touch target ({hgt:.0f}px)")
        r=E(pg,"(()=>{const s=w2s(...P(DOCK.ci,DOCK.cj,20)),[t,b]=barH();return [s[0]>0&&s[0]<scene.w,s[1]>t&&s[1]<scene.h-b];})()")
        ok(r==[True,True],f"{dev}: Dock chip frames the moved dock between the bars ({r})")
        E(pg,"(()=>{const c=scene.cam,p=P(OFFICE.ci,OFFICE.cj,8);c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.6);c.fly=null;TT.render();})()"); pg.wait_for_timeout(300)
        s=E(pg,"w2s(...P(OFFICE.ci,OFFICE.cj,8))"); pg.touchscreen.tap(s[0],s[1]); pg.wait_for_timeout(700)
        ok(E(pg,"TT.curSheet") in ('ord','daily'),f"{dev}: tapping the Contract Office opens contracts ({E(pg,'TT.curSheet')})")
        E(pg,"closeSheet()"); pg.wait_for_timeout(300)
        E(pg,"(()=>{const c=scene.cam,p=P(BYZ.ci,BYZ.cj,6);c.x=c.tx=p[0];c.y=c.ty=p[1];c.fly=null;TT.render();})()"); pg.wait_for_timeout(300)
        s=E(pg,"w2s(...P(BYZ.ci,BYZ.cj,6))"); pg.touchscreen.tap(s[0],s[1]); pg.wait_for_timeout(700)
        ok(E(pg,"TT.curSheet")=='build',f"{dev}: tapping the Builders' Yard opens it ({E(pg,'TT.curSheet')})")
        E(pg,"closeSheet()")
        if dev=='iPhone 13':
            pg.locator('#bbMore').tap(); pg.wait_for_timeout(400)
            t=pg.locator('[data-s=ach]:visible').first
            if t.count(): t.tap(); pg.wait_for_timeout(500)
            else: E(pg,"openSheet('ach')"); pg.wait_for_timeout(500)
            ok(E(pg,"TT.curSheet")=='ach' and pg.locator('#achGrid .ach-h').count()==1,f"{dev}: Trophies sheet opens with the systems section")
            w=E(pg,"document.querySelector('#achGrid').scrollWidth<=document.querySelector('#achGrid').clientWidth+1"); ok(w,f"{dev}: trophy grid fits the phone")
        ctx.close()
    ok(not errs,f"no console errors ({errs[:4]})")
    ok(not missing,f"no 404s ({missing[:4]})")
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S):\n- '+'\n- '.join(FAILS)))
sys.exit(1 if FAILS else 0)
