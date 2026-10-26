# v2.31 logistics tiers, part 2 (item 8): conveyor belts (logistics tier 2). Four raised belts straight across the lane
# (Sawmill → Carpentry, Chipper → Pellet Press, Veneer Peeler → Furniture, Beam Saw → Glulam): unlock at Forklift Depot Lv 3,
# per-link levels 0–10 (+10 % of the carried good at the source, +5 % output at the destination, no extra demand), forest-value
# costs, Replant reset, grid-aligned isometric geometry, moving goods (bounded, cached), forklifts leave belted links,
# Bottleneck Advisor fix, Shipping sheet + Supply Flow, trophies, save/load and v2.30 / damaged save migration. Desktop + iPhone 13.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;})()"
# all four links built and running, rich, Forklift Depot at Lv 3 (belts unlocked)
WORLD='''(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
 for(const id of ['sawmill','chipper','kiln','peeler','carpentry','pellet','paper','furniture','beamsaw','glulam']) S.buildings[id].lvl=30;
 S.premium.lvl=1;S.buildings.atelier.lvl=10;S.buildings.cabinetry.lvl=10;for(const c of COLLECTORS) S.collectors[c.id]=60;
 S.coins=1e15;S.logi.fk=3;M=computeMods();for(let k=0;k<30;k++){S.res.logs=1e9;tick(1,false);}scene._fsig='';scene._tsig='';scene._pfsig='';return true;})()'''
SETB="(L)=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=L;scene._tsig='';M=computeMods();}"
CAM="(([i,j,z])=>{const c=scene.cam;const p=P(i,j,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*z;})"
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
    ok(ver(E(pg,'TT.VERSION'))>=(2,31),f"VERSION >= 2.31 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,31),'sw cache bumped')
    ok('js/belts.js' in open(ROOT+'/index.html').read(),'js/belts.js is in the script list')
    ok(E(pg,"BELT_LINKS.map(l=>l.src+'>'+l.dst+':'+l.k).join(',')")=='sawmill>carpentry:planks,chipper>pellet:chips,peeler>furniture:veneer,beamsaw>glulam:beams','four links: the neighbours straight across the lane')
    ok(E(pg,"BELT_LINKS.every(l=>LOTS[l.src].ci===LOTS[l.dst].cj&&LOTS[l.src].cj===LOTS[l.dst].ci&&BTIER[l.src]===1&&BTIER[l.dst]===2&&BMAP[l.dst].inp[l.k]>0&&BMAP[l.src].out[l.k]>0)"),'every link: Phase I maker → Phase II user of the same good, on the same row')
    ok(E(pg,"JSON.stringify(S.logi.belt)")=='{}' and E(pg,"!beltUnlocked()&&BELT_LINKS.every(l=>beltLvl(l.src)===0)"),'fresh game: no belts, locked')
    ok(E(pg,"(()=>{S.coins=1e15;return BELT_LINKS.every(l=>beltBuy(l.src)===false)&&beltCount()===0;})()"),'buying while locked does nothing')
    # ---- unlock ----
    E(pg,WORLD)
    ok(E(pg,"(()=>{S.logi.fk=2;const a=beltUnlocked()||beltBuy('sawmill');S.logi.fk=3;return !a&&beltUnlocked();})()"),'unlocks at Forklift Depot Lv 3 (not at Lv 2)')
    ok(E(pg,"(()=>{const g=S.buildings.glulam.lvl;S.buildings.glulam.lvl=0;const r=beltBuy('beamsaw');S.buildings.glulam.lvl=g;return r===false&&beltLvl('beamsaw')===0;})()"),'a link needs both of its buildings')
    # ---- multipliers ----
    r=E(pg,"(()=>{S.logi.belt.sawmill=6;const o=[beltSrcMult('sawmill','planks'),beltSrcMult('sawmill','chips'),beltDstMult('carpentry'),beltDstMult('pellet'),beltSrcMult('carpentry','chairs')];S.logi.belt.sawmill=0;return o;})()")
    ok(abs(r[0]-1.6)<1e-9 and r[1]==1 and abs(r[2]-1.3)<1e-9 and r[3]==1 and r[4]==1,f'Lv 6: Sawmill planks ×1.60, Carpentry output ×1.30, nothing else ({r})')
    r=E(pg,'''(()=>{const keep={};for(const b of BUILDINGS){keep[b.id]=S.buildings[b.id].lvl;S.buildings[b.id].lvl=0;}S.buildings.sawmill.lvl=40;S.buildings.carpentry.lvl=1;for(const k in S.autosell) S.autosell[k]=false;
      const run=L=>{S.logi.belt.sawmill=L;S.res.logs=1e12;S.res.planks=0;M=computeMods();S.buildings.carpentry.lvl=0;const l0=S.res.logs;tick(1,false);const o=[S.res.planks,l0-S.res.logs];S.buildings.carpentry.lvl=1;return o;};
      const a=run(0),c=run(10);S.logi.belt.sawmill=0;for(const id in keep) S.buildings[id].lvl=keep[id];return {a,c};})()''')
    ok(abs(r['a'][1]-r['c'][1])/r['a'][1]<1e-9 and abs(r['c'][0]/r['a'][0]-2)<1e-6,f"belt Lv 10: same logs in, ×2 planks out of the Sawmill ({r})")
    r=E(pg,'''(()=>{const keep={};for(const b of BUILDINGS){keep[b.id]=S.buildings[b.id].lvl;S.buildings[b.id].lvl=0;}S.buildings.carpentry.lvl=40;S.buildings.sawmill.lvl=1;S.autosell.chairs=false;S.autosell.planks=false;
      const run=L=>{S.logi.belt.sawmill=L;S.buildings.sawmill.lvl=0;S.res.planks=1e12;S.res.chairs=0;M=computeMods();const p0=S.res.planks;tick(1,false);S.buildings.sawmill.lvl=1;return [S.res.chairs,p0-S.res.planks];};
      const a=run(0),c=run(10);S.logi.belt.sawmill=0;for(const id in keep) S.buildings[id].lvl=keep[id];return {a,c};})()''')
    ok(abs(r['a'][1]-r['c'][1])/r['a'][1]<1e-9 and abs(r['c'][0]/r['a'][0]-1.5)<1e-6,f"belt Lv 10: same planks in, ×1.5 chairs out of the Carpentry ({r})")
    # ---- balance: belts only add supply, nothing ends up less fed ----
    r=E(pg,'''(()=>{const run=L=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=L;M=computeMods();for(const k in S.res) if(k!=='logs') S.res[k]=0;const f={};let n=0,coins0=S.totalEarned;
        for(let k=0;k<240;k++){S.res.logs=Math.max(S.res.logs,1e6);tick(.5,false);if(k>=120){n++;for(const b of BUILDINGS) if(S.buildings[b.id].lvl) f[b.id]=(f[b.id]||0)+bstat[b.id].f;}}
        for(const id in f) f[id]/=n;return {f,earned:S.totalEarned-coins0};};
      for(const k in S.autosell) S.autosell[k]=true;S.logs=1e6;const a=run(0),c=run(10);for(const l of BELT_LINKS) S.logi.belt[l.src]=0;
      const worse=Object.keys(a.f).filter(id=>c.f[id]<a.f[id]-1e-3).map(id=>id+':'+a.f[id].toFixed(3)+'→'+c.f[id].toFixed(3));return {worse,ea:a.earned,ec:c.earned,fa:a.f,fc:c.f};})()''')
    ok(not r['worse'],f"all belts Lv 10 (120 s steady state): no building is less fed than without belts ({r['worse']})")
    ok(r['ec']>r['ea']*1.05,f"…and the factory earns more ({r['ea']:.3g} → {r['ec']:.3g}/120 s)")
    starved=[k for k,v in r['fa'].items() if v>.97 and r['fc'][k]<.97]
    ok(not starved,f'no line that was fed starts starving ({starved})')
    # ---- costs ----
    r=E(pg,"(()=>{const c1=beltCost('sawmill',0);S.runCS=100;const c2=beltCost('sawmill',0);S.runCS=1;return [c1,c2,beltCost('sawmill',1),beltCost('sawmill',9),beltCost('beamsaw',0),beltCost('sawmill',10)];})()")
    ok(abs(r[0]-2.16e6)<1 and abs(r[1]/r[0]-100)<1e-6,f'Sawmill → Carpentry Lv 1 costs 2.16M × forest value ({r[0]:.4g}, ×100 after a big Replant: {r[1]:.4g})')
    ok(abs(r[2]/r[0]-4)<1e-9 and abs(r[3]/r[0]-4**9)<1e-3*4**9,'×4 per level')
    ok(abs(r[4]-5.02e8)<1 and r[5] is None or (r[5] is not None and r[5]>1e300),f'Beam Saw → Glulam starts at 502M; MAX at Lv 10 ({r[4]:.4g})')
    r=E(pg,"(()=>{S.coins=1e15;const c=beltCost('sawmill'),c0=S.coins;const a=beltBuy('sawmill');return [a,beltLvl('sawmill'),c0-S.coins,c,!!S.ach.belt1];})()")
    ok(r[0] and r[1]==1 and abs(r[2]-r[3])/r[3]<1e-9 and r[4],f'building the first belt spends its cost and earns Conveyor Age ({r})')
    r=E(pg,"(()=>{S.coins=1e30;for(const l of BELT_LINKS) for(let k=0;k<20;k++) beltBuy(l.src);return [BELT_LINKS.map(l=>beltLvl(l.src)),!!S.ach.belt5];})()")
    ok(r==[[10,10,10,10],True],f'caps at Lv 10 per link; Belt Baron (all four at Lv 5) ({r})')
    ok(E(pg,"(()=>{const a=ACH.filter(x=>x.id==='belt1'||x.id==='belt5');return a.length===2&&a.every(x=>x.g==='sys');})()"),'2 belt trophies among the system trophies')
    # ---- the scene: geometry, items move, forklifts leave belted links ----
    E(pg,"(()=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=4;scene._tsig='';})()")
    r=E(pg,'''(()=>{const o=[];for(const l of BELT_LINKS){const g=beltGeom(l);
      const axis=g.seg.every(q=>Math.abs(q.a[0]-q.b[0])<1e-9||Math.abs(q.a[1]-q.b[1])<1e-9);
      const corner=Math.abs(g.ci-g.cj)<1e-9, posts=g.posts.every(p=>Math.abs(p[0]-p[1])>2.05), Bs=lotBox(LOTS[l.src]),Bd=lotBox(LOTS[l.dst]);
      const ends=Math.abs(g.pts[0][1]-Bs.j1)<1e-9&&Math.abs(g.pts[4][0]-Bd.i1)<1e-9&&g.pts[0][0]>Bs.i0&&g.pts[0][0]<Bs.i1&&g.pts[4][1]>Bd.j0&&g.pts[4][1]<Bd.j1;
      const clear=g.seg.every(q=>{for(let t=.05;t<.96;t+=.05){const i=q.a[0]+(q.b[0]-q.a[0])*t,j=q.a[1]+(q.b[1]-q.a[1])*t;if(i>Bs.i0&&i<Bs.i1&&j>Bs.j0&&j<Bs.j1) return false;if(i>Bd.i0&&i<Bd.i1&&j>Bd.j0&&j<Bd.j1) return false;}return true;});
      o.push([l.src,axis,corner,posts,ends,clear,g.pts.every(p=>p[2]>=BELT_Z0)]);}return o;})()''')
    ok(all(x[1] for x in r),'belts follow the iso grid (every run is along i or along j)')
    ok(all(x[2] for x in r),'each belt turns above the middle of the lane')
    ok(all(x[3] for x in r),'its supports stand outside the lane (traffic passes under)')
    ok(all(x[4] and x[5] for x in r),'belts start in the source wall and end in the destination wall, never through a building')
    ok(all(x[6] for x in r),'raised all the way (≥ the wall port height)')
    E(pg,"for(let k=0;k<30;k++) stepScene(1/30)")
    a=E(pg,"beltItemPos('sawmill')"); E(pg,"for(let k=0;k<45;k++) stepScene(1/30)"); c=E(pg,"beltItemPos('sawmill')")
    ok(len(a)>=3 and len(a)==len(c) and any(abs(x[0]-y[0])+abs(x[1]-y[1])>.5 for x,y in zip(a,c)),f'goods move along the belt ({len(a)} items, e.g. {a[0][:2]} → {c[0][:2]})')
    g=E(pg,"(()=>{const g=beltGeom(BELT_LINKS[0]);return [g.ci,g.cj];})()")
    ok(all((abs(x[0]-g[0])<1e-6 or abs(x[1]-g[1])<1e-6) and x[2]>=E(pg,'BELT_Z0')-1e-6 for x in c),'goods sit on the belt line (no floating items)')
    sp=E(pg,"(()=>{const a=beltItemPos('sawmill');stepScene(1/30);const b=beltItemPos('sawmill');return Math.max(...a.map((p,k)=>Math.hypot(b[k][0]-p[0],b[k][1]-p[1])))*30;})()")
    ok(sp<1.0,f'calm belt speed ({sp:.2f} tiles/s)')
    ok(E(pg,"BELT_LINKS.every(l=>beltItems(l)<=BELT_ITEMS)&&BELT_ITEMS<=8"),'at most 8 goods per belt (bounded)')
    ok(E(pg,"(()=>{const L=tierLinks();return !L.some(l=>l.src==='sawmill'&&l.dst==='carpentry')&&!L.some(l=>l.src==='chipper'&&l.dst==='pellet')&&L.some(l=>l.src==='sawmill'&&l.dst==='furniture');})()"),'belted links drop their cross-lane forklifts; other links keep theirs')
    r=E(pg,"(()=>{for(let k=0;k<60;k++) stepScene(1/30);const n=[...SPR.map.keys()].filter(k=>k.startsWith('belt|')).length;let calls=0;const raw=beltFrameRaw;window.beltFrameRaw=beltFrameRaw=function(){calls++;return raw.apply(this,arguments);};for(let k=0;k<60;k++) stepScene(1/30);window.beltFrameRaw=beltFrameRaw=raw;return [n,calls];})()")
    ok(r[0]>=4 and r[0]<=4*20,f'belt frames are cached sprites, one per depth strip ({r[0]} cached)')
    ok(r[1]==0,f'steady state: the belt frames are never redrawn (only blitted) ({r[1]} redraws / 60 frames)')
    E(pg,f"{CAM}([12,11,2.6])"); pg.wait_for_timeout(900)
    ok(E(pg,"scene.objCount>0"),'scene renders with the belts on screen')
    # ---- Bottleneck Advisor ----
    r=E(pg,'''(()=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=0;S.buildings.sawmill.lvl=1;S.buildings.carpentry.lvl=60;S.buildings.furniture.lvl=0;S.buildings.cabinetry.lvl=0;M=computeMods();
      for(let k=0;k<20;k++){S.res.logs=1e9;tick(1,false);}const w=advWait('carpentry');S.coins=1e15;const f1=advFix('planks');S.coins=0;const f2=advFix('planks');S.coins=1e15;
      return [w&&w.k,f1&&f1.kind,f1&&f1.label,f2&&f2.kind];})()''')
    ok(r[0]=='planks' and r[1]=='belt' and 'Sawmill → Carpentry Workshop belt' in (r[2] or '') and r[3]=='upg',f'Advisor: Carpentry waits on planks → "build the belt" when affordable, else "upgrade the Sawmill" ({r})')
    E(pg,WORLD)
    # ---- Shipping sheet + Supply Flow, desktop ----
    E(pg,"(()=>{S.logi.fk=2;for(const l of BELT_LINKS) S.logi.belt[l.src]=0;TT.openSheet('ship');})()"); pg.wait_for_timeout(700)
    t=pg.locator('#lgBox').inner_text()
    ok('Conveyor belts' in t and 'Forklift Depot Lv 3' in t and pg.locator('#lgBB_sawmill').count()==0,'Depot Lv 2: belts shown as locked (unlock at Depot Lv 3)')
    E(pg,"(()=>{S.logi.fk=3;S.coins=1e15;})()"); pg.wait_for_timeout(900)
    t=pg.locator('#lgBox').inner_text()
    ok(pg.locator('#lgBB_sawmill').count()==1 and all(x in t for x in ['Sawmill → Carpentry Workshop','Wood Chipper → Pellet Press','Veneer Peeler → Furniture Factory','Beam Saw → Glulam Plant']),'Depot Lv 3: the sheet switches to the four belt rows')
    ok(not re.search(r'NaN|undefined|Infinity',pg.locator('#shipBody').inner_text()),'no NaN / undefined in the sheet')
    ok('Planks ×1.00 → ×1.10' in t and 'output ×1.00 → ×1.05' in t,'rows show the next level\'s gain')
    pg.locator('#lgBB_sawmill').click(); pg.wait_for_timeout(300)
    ok(E(pg,"beltLvl('sawmill')")==1,'clicking 🛤️ builds the belt')
    pg.locator('#lgBB_sawmill').click(); pg.wait_for_timeout(300)
    ok(E(pg,"beltLvl('sawmill')")==2 and 'Lv 2/10' in pg.locator('#lgBL_sawmill').inner_text(),'clicking ⬆ upgrades it (Lv 2/10)')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
    lg=pg.locator('#flowLegend').inner_text()
    ok('belt' in lg and 'Lv 2' in lg,f'Supply Flow shows the belts ({lg[lg.find("Forklifts"):][:90]!r})')
    ok(E(pg,"beltOnEdge('sawmill','carpentry')&&!beltOnEdge('sawmill','furniture')"),'Supply Flow marks the belted arc (🛤️ on its label)')
    E(pg,"closeSheet();toggleFlow(false)")
    # ---- save / load ----
    E(pg,"(()=>{S.logi.belt.chipper=7;const o=JSON.parse(JSON.stringify(S));localStorage.setItem(SAVE_KEY,JSON.stringify(o));sessionStorage.setItem('_c','1');})()")
    ctx.close()
    for name,mut,exp in [('round trip','',None),('v2.30 save (no belts)','o.version="2.30";o.logi={fk:4}',[0,0,0,0]),('belt null','o.logi.belt=null',[0,0,0,0]),
                         ('belt text','o.logi.belt="x"',[0,0,0,0]),('belt 99 / -3 / NaN','o.logi.belt={sawmill:99,chipper:-3,peeler:"q",beamsaw:2.7}',[10,0,0,2]),('belt array','o.logi.belt=[5,5]',[0,0,0,0])]:
        ctx,pg=page(tag=name+': ')
        E(pg,WORLD)
        E(pg,f"(()=>{{S.logi.belt={{sawmill:3,chipper:7,peeler:1,beamsaw:0}};const o=JSON.parse(JSON.stringify(S));{mut};localStorage.setItem(SAVE_KEY,JSON.stringify(o));sessionStorage.setItem('_c','1');}})()")
        pg.reload(); pg.wait_for_timeout(1300)
        r=E(pg,"[BELT_LINKS.map(l=>S.logi.belt[l.src]),S.logi.fk,TT.VERSION]")
        ok(r[0]==(exp or [3,7,1,0]),f'{name}: loads with sane belt levels ({r})')
        E(pg,QUIET); E(pg,"for(let k=0;k<20;k++) stepScene(1/30)")
        ctx.close()
    # ---- Replant ----
    ctx,pg=page(); E(pg,WORLD)
    r=E(pg,"(()=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=5;checkAch(true);S.totalEarned=1e20;const ok=doPrestige();return [ok,S.logi.fk,BELT_LINKS.map(l=>beltLvl(l.src)),!!S.ach.belt1];})()")
    ok(r[0] and r[1]==0 and r[2]==[0,0,0,0] and r[3],f'Replant: belts are rebuilt at the new run prices (trophies stay) ({r})')
    ctx.close()
    # ---- phone touch ----
    ctx,pg=page('iPhone 13','iPhone: '); E(pg,WORLD)
    E(pg,"(()=>{for(const l of BELT_LINKS) S.logi.belt[l.src]=0;TT.openSheet('ship');})()"); pg.wait_for_timeout(900)
    btn=pg.locator('#lgBB_chipper'); btn.scroll_into_view_if_needed(); pg.wait_for_timeout(300); bb=btn.bounding_box()
    ok(bb and bb['height']>=40 and bb['x']+bb['width']<=390+1,f'iPhone: belt buttons are full touch targets on screen ({bb})')
    h=E(pg,"$('lgBelt_sawmill').querySelector('.nm').getBoundingClientRect().height"); nm=pg.locator('#lgBelt_sawmill .nm').inner_text()
    ok(h<=48 and 'Sawmill → Carpentry' in nm and 'Workshop' not in nm,f'iPhone: belt rows use short names and stay compact ({nm!r}, {h:.0f}px)')
    btn.tap(); pg.wait_for_timeout(400)
    ok(E(pg,"beltLvl('chipper')")==1,'iPhone: tapping 🛤️ builds the Chipper → Pellet Press belt')
    w=E(pg,"Math.max(...[...document.querySelectorAll('#shipBody *')].map(e=>e.getBoundingClientRect().right))")
    ok(w<=391,f'iPhone: nothing in the sheet runs off the screen ({w:.0f}px)')
    E(pg,"closeSheet();toggleFlow(true)"); pg.wait_for_timeout(900)
    g=pg.locator('#lgFlowGo'); bb=g.bounding_box()
    ok(bb and bb['height']>=34 and 'belt' in pg.locator('#flowLegend').inner_text(),f'iPhone: Supply Flow shows the belt line and the Logistics button ({bb})')
    g.tap(); pg.wait_for_timeout(900)
    ok(E(pg,"TT.curSheet")=='ship','iPhone: tapping it opens Logistics')
    E(pg,"closeSheet();toggleFlow(false)")
    E(pg,f"{CAM}([17,16,2.2])"); pg.wait_for_timeout(600)
    a=E(pg,"beltItemPos('chipper')"); pg.wait_for_timeout(1500); c=E(pg,"beltItemPos('chipper')")
    ok(len(a)>=3 and any(abs(x[0]-y[0])+abs(x[1]-y[1])>.3 for x,y in zip(a,c)),'iPhone: goods move on the belt in the live scene')
    r=E(pg,"(()=>{let v=0;const prev=new Map();for(let n=0;n<300;n++){stepScene(1/30);for(const f of scene.tierLifts||[]){const q=prev.get(f);if(q&&q.path===f.path) v=Math.max(v,Math.hypot(f.i-q.i,f.j-q.j)*30);prev.set(f,{i:f.i,j:f.j,path:f.path});}}return v;})()")
    ok(r<=1.06*1.05,f'iPhone: forklifts on the other links stay calm with belts on ({r:.2f} tiles/s)')
    ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
print('\nALL PASS' if not FAILS else f'\n{len(FAILS)} FAIL(S): {FAILS}')
sys.exit(1 if FAILS else 0)
