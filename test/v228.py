# v2.28: south yard + timber-frame line. Beam Saw (Phase 1: logs → beams + chips), Glulam Plant (Phase 2: beams → glulam),
# Timber-frame Houses (Phase 3: glulam + plywood → houses). The highway bends east of the new south yard; a south gate road
# joins the lane end to it. Recipes / tiers / research / stations / managers, layout (bottom of each column, no overlaps, clear
# of the road), vehicle paths, camera + chips + fit view, supply flow, orders / trade, trophies, old saves, desktop + touch.
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
QUIET="(()=>{window.toast=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;})()"
SETUP='''(()=>{S.coins=1e15;S.totalEarned=1e15;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,15);
  S.premium.lvl=Math.max(1,S.premium.lvl);for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',10);TT.buyBuilding('framer',5);
  S.coins=1e12;S.playTime=5000;S.time=5000;S.nextEvent=S.time+1e9;S.orders.next=S.time+1e9;if(S.mish) S.mish.next=S.time+1e9;M=computeMods();TT.simulate(20);TT.rebuildAll&&TT.rebuildAll();TT.render();})()'''
BOXES='''(()=>{const keep={};for(const b of BUILDINGS){keep[b.id]=S.buildings[b.id].lvl;S.buildings[b.id].lvl=400;}
  const o={};for(const id in LOTS){const L=LOTS[id];if(L.tech) continue;const B=lotBox(L);o[id]=[B.i0,B.j0,B.i1,B.j1];}
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
NEW=['beamsaw','glulam','framer']
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
    ok(ver(E(pg,'TT.VERSION'))>=(2,28),f"VERSION >= 2.28 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,28),'sw cache bumped to >= v2.28')
    # ---------------- recipes, tiers, research, stations, managers ----------------
    r=E(pg,"""(()=>{const g=id=>{const b=BMAP[id];return {inp:b.inp,out:b.out,prem:!!b.premium,tech:!!b.tech,tier:BTIER[id]};};
      return {b:g('beamsaw'),g:g('glulam'),f:g('framer'),viol:tierViolations(),res:['beams','glulam','houses'].map(k=>!!RMAP[k]),hp:RMAP.houses.premium,
        mil:MIL.includes('beamsaw')&&MIL.includes('glulam'),craft:CRAFT.includes('framer'),ws:NEW_IDS.map(id=>!!(WS_DEF[id]&&WS_DEF[id].length===3)),
        mgr:NEW_IDS.map(id=>MANAGERS.some(m=>m.bid===id)),lots:NEW_IDS.map(id=>!!LOTS[id]),draw:NEW_IDS.map(id=>typeof BDRAW[id]==='function'),
        unl:[bldUnlocked('beamsaw'),bldUnlocked('glulam')]};})()""".replace('NEW_IDS',json.dumps(NEW)))
    ok(r['b']['inp']=={'logs':6} and r['b']['out']=={'beams':2,'chips':2} and r['b']['tier']==1,f"Beam Saw: 6 logs → 2 beams + 2 chips, Phase 1 ({r['b']})")
    ok(r['g']['inp']=={'beams':4} and r['g']['out']=={'glulam':1} and r['g']['tier']==2,f"Glulam Plant: 4 beams → 1 glulam, Phase 2 ({r['g']})")
    ok(r['f']['inp']=={'glulam':4,'plywood':2} and r['f']['out']=={'houses':1} and r['f']['prem'] and r['f']['tier']==3,f"Timber-frame Houses: 4 glulam + 2 plywood → 1 house, premium Phase 3 ({r['f']})")
    ok(r['viol']==[],f"tier rule holds (each building takes from the tier below) ({r['viol']})")
    ok(all(r['res']) and r['hp'],'beams, glulam and houses are resources; houses are a premium good')
    ok(r['mil'] and r['craft'],'research branches cover the new buildings (milling / craft)')
    ok(all(r['ws']),'each new building has 3 workstations'); ok(all(r['mgr']),'each new building has a manager')
    ok(all(r['lots']) and all(r['draw']),'each new building has a lot and art'); ok(all(r['unl']),'Beam Saw / Glulam Plant need no research')
    ok(E(pg,"PREM_BLD.slice(-1)[0].id==='framer'&&MAIN_BLD.some(b=>b.id==='beamsaw')&&MAIN_BLD.some(b=>b.id==='glulam')"),'framer is the last premium workshop; beam saw / glulam are main buildings')
    # ---------------- layout ----------------
    col=E(pg,"""(()=>{const o={};for(const id in LOTS){const L=LOTS[id];if(L.tech) continue;(o[L.side]=o[L.side]||[]).push({id,u:L.ci+L.cj,v:L.ci-L.cj});}
      for(const k in o) o[k].sort((a,b)=>a.u-b.u);return o;})()""")
    ok(col['R'][-1]['id']=='beamsaw',f"Beam Saw at the bottom of Phase 1 ({[x['id'] for x in col['R']]})")
    ok(col['L'][-1]['id']=='glulam',f"Glulam Plant at the bottom of Phase 2 ({[x['id'] for x in col['L']]})")
    ok(col['P'][-1]['id']=='framer',f"Timber-frame Houses at the bottom of Phase 3 ({[x['id'] for x in col['P']]})")
    for s in 'RLP':
        vs=[x['v'] for x in col[s]]; ok(max(vs)-min(vs)<.01,f"column {s} stays one straight line")
    ok(abs(col['R'][-1]['u']-col['L'][-1]['u'])<.01,'Beam Saw sits straight across the lane from the Glulam Plant')
    ok(col['R'][-1]['u']>55.5,f"the new row lies in the south yard, below the old lane end (u {col['R'][-1]['u']})")
    bx=E(pg,BOXES)
    names=list(bx); bad=[(a,c) for k,a in enumerate(names) for c in names[k+1:] if overlap(bx[a],bx[c],.02)]
    ok(not bad,f"no two buildings / helper yards overlap ({bad})")
    r=E(pg,"""(()=>{const o=[];for(const id in LOTS){const L=LOTS[id];if(L.tech) continue;const B=lotBox(Object.assign({},L));
      for(const [i,j] of [[B.i0,B.j0],[B.i1,B.j0],[B.i0,B.j1],[B.i1,B.j1],[L.ci,L.cj]]) if(Math.abs(hwOff(i,j))<1.3||zoneAt(i,j)==='road'&&!sGate(i,j)) {o.push(id);break;}}
      for(const id of NEW_IDS){const L=LOTS[id];if(zoneAt(L.ci,L.cj)==='forest') o.push('forest:'+id);}return o;})()""".replace('NEW_IDS',json.dumps(NEW)))
    ok(r==[],f"no building stands on the (bent) highway or in the forest ({r})")
    r=E(pg,"""(()=>{const o=[];for(let j=-20;j<70;j+=.5){const a=hwPt(j,0),b=hwPt(j+.5,0);const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(d>1.2) o.push(j);
      if(zoneAt(a[0],a[1])!=='road') o.push('z'+j);}return o;})()""")
    ok(r==[],f"the highway is continuous and reads as road along its whole length ({r[:5]})")
    r=E(pg,"""(()=>{const o=[];for(const id of NEW_IDS){const L=LOTS[id],B=lotBox(L);for(const [i,j] of [[B.i0,B.j0],[B.i1,B.j1],[B.i0,B.j1],[B.i1,B.j0]]){const [x,y]=P(i,j);if(x<CAM_WORLD.x0||x>CAM_WORLD.x1||y<CAM_WORLD.y0||y>CAM_WORLD.y1) o.push(id);}}
      for(const j of JUMPS){const [x,y]=j.pt();if(x<CAM_WORLD.x0||x>CAM_WORLD.x1||y<CAM_WORLD.y0||y>CAM_WORLD.y1) o.push(j.id);}
      const g=P(hwI(SGATE_J,0),SGATE_J);if(g[1]>CAM_WORLD.y1) o.push('gate');return o;})()""".replace('NEW_IDS',json.dumps(NEW)))
    ok(r==[],f"new lots, the south gate and every chip target are inside the camera bounds ({r})")
    ok(E(pg,"scene.trees.filter(t=>{for(const id of NEW_IDS){const B=lotBox(LOTS[id]);if(t.i>B.i0-.2&&t.i<B.i1+.2&&t.j>B.j0-.2&&t.j<B.j1+.2) return true;}return Math.abs(hwOff(t.i,t.j))<1.1||sGate(t.i,t.j);}).length".replace('NEW_IDS',json.dumps(NEW)))==0,'no trees on the new lots, the highway or the south gate road')
    # ---------------- running line + vehicle paths ----------------
    E(pg,SETUP); E(pg,QUIET)
    E(pg,"(()=>{for(let k=0;k<60;k++){tick(.25,false);TT.render();} spawnCourierVan({item:'chairs'});for(let k=0;k<14;k++){scene._mktCD=0;mktFleetSync&&mktFleetSync();}if(!scene.client){S.orders.offers=[];offerOrder('houses');for(let k=0;k<4;k++){tick(.25,false);TT.render();}}})()")
    r=E(pg,"(()=>{const r=rates||{};return {lv:NEW_IDS.map(id=>S.buildings[id].lvl),f:NEW_IDS.map(id=>+(bstat[id]&&bstat[id].f||0).toFixed(2)),houses:S.res.houses,beams:prodRate('beams'),glulam:prodRate('glulam'),chips:BMAP.beamsaw.out.chips*bSpeed('beamsaw')};})()".replace('NEW_IDS',json.dumps(NEW)))
    ok(all(x>0 for x in r['lv']) and r['beams']>0 and r['glulam']>0,f"the timber line runs (lv {r['lv']}, f {r['f']}, beams/s {r['beams']:.3g}, glulam/s {r['glulam']:.3g})")
    ok(r['houses']>0 or E(pg,"prodRate('houses')")>0,f"Timber-frame Houses are produced ({r['houses']:.3g} in stock, {E(pg,"prodRate('houses')"):.3g}/s)"); ok(r['chips']>0,'the Beam Saw adds chips for the pellet / paper lines')
    paths=E(pg,"""(()=>{const o=[];const _tl=tierLiftsFor;window.tierLiftsFor=()=>2;scene._tsig=null;syncTierLifts();window.tierLiftsFor=_tl;scene._tsig=null;
      for(const b of MAIN_BLD) for(const k of [0,1]) o.push(['fork*:'+b.id+k,mkForklift(b.id,k).path.pts]);
      for(const f of scene.tierLifts||[]) o.push(['lift:'+f.src+'>'+f.dst,f.path.pts]);
      for(const v of scene.marketVans||[]) v.legs.forEach((l,k)=>o.push(['van:'+v.bid+':'+k,l.pa.pts]));
      for(const v of scene.dockTrucks||[]) v.legs.forEach((l,k)=>o.push(['dtruck:'+k,l.pa.pts]));
      premTruckLegs().forEach((l,k)=>o.push(['ptruck:'+k,l.pa.pts]));clientLegsIn().concat(clientLegsOut()).forEach((l,k)=>o.push(['client:'+k,l.pa.pts]));
      for(const id of ['beamsaw','glulam']) mktVanLegs(mktPickupOf(id)).forEach((l,k)=>o.push(['van+:'+id+':'+k,l.pa.pts]));return o;})()""")
    kinds=set(n.split(':')[0] for n,_ in paths)
    ok({'fork*','lift','dtruck','ptruck','client','van+'}<=kinds,f"vehicle kinds present ({sorted(kinds)})")
    ok(any(n.startswith('lift:beamsaw>glulam') for n,_ in paths),'a tier forklift carries beams from the Beam Saw to the Glulam Plant')
    hits=[]
    for n,pts in paths:
        for q in samples(pts):
            hit=None
            for k,B in bx.items():
                if k=='dock' and n.startswith('dtruck'): continue
                if n.startswith('van') and n.split(':')[1]==k: continue
                if inside(q,B,.3): hit=k; break
            if hit: hits.append((n,hit,round(q[0],1),round(q[1],1))); break
    ok(not hits,f"{len(paths)} vehicle paths stay clear of every building ({hits[:6]})")
    gate=[n for n,pts in paths if n.startswith('van+') and any(abs(q[1]-E(pg,'SGATE_J'))<.6 and 33<q[0]<39 for q in samples(pts))]
    ok(len(gate)>=4,f"market vans for the south yard use the south gate road ({gate})")
    r=E(pg,"""(()=>{const o=[];const chk=(n,pts,lo,hi)=>{for(const q of pts){if(q[1]<lo||q[1]>hi) continue;const d=hwOff(q[0],q[1]);if(Math.abs(d)>1.05) {o.push(n+':'+q[0].toFixed(1)+','+q[1].toFixed(1));return;}}};
      premTruckLegs().forEach((l,k)=>{if(k===0) chk('pin',l.pa.pts,PROAD_J+2,70);if(k===3) chk('pout',l.pa.pts,-20,PROAD_J-2.5);});
      clientLegsOut().forEach(l=>chk('cout',l.pa.pts,-20,PROAD_J-2.5));for(const v of scene.dockTrucks||[]) chk('dock',v.legs[v.legs.length-1].pa.pts,22,58);return o;})()""")
    ok(r==[],f"premium trucks, client vans and dock trucks drive on the bent highway ({r[:4]})")
    # ---------------- flow, orders, trade ----------------
    r=E(pg,"""(()=>{const E=flowEdges();const has=(a,b,k)=>E.some(e=>e.from===a&&e.to===b&&e.k===k);
      return [has('beamsaw','glulam','beams'),has('glulam','framer','glulam'),has('plymill','framer','plywood'),!!flowAnchor('beamsaw'),!!flowAnchor('framer'),E.some(e=>e.from==='beamsaw'&&e.k==='chips')];})()""")
    ok(r==[True]*6,f"supply flow: beams → glulam → houses (+ plywood), chips from the Beam Saw, anchors on the new lots ({r})")
    r=E(pg,"""(()=>{S.orders.offers=[];const o=makeOrder('houses');return o&&{item:o.item,prem:o.premium,cl:o.client,rw:o.reward};})()""")
    ok(r and r['item']=='houses' and r['prem'] and r['rw']>0,f"client orders can ask for Timber-frame Houses ({r})")
    ok(E(pg,"CLIENTS.some(c=>c.likes.includes('houses'))&&CLIENTS.some(c=>c.likes.includes('beams'))"),'clients like houses / beams')
    ok(E(pg,"['beams','glulam','houses'].every(k=>CITIES.some(c=>c.likes[k]))"),'trade cities pay extra for beams, glulam and houses')
    ok(E(pg,"['beams','glulam','houses'].every(k=>canSell(k))"),'the new goods can be sold')
    # ---------------- trophies ----------------
    r=E(pg,"(()=>{for(const id of ['beams2','house1','house50']) delete S.ach[id];S.buildings.framer.lvl=Math.max(50,S.buildings.framer.lvl);checkAch();const o=['beams2','house1','house50'].map(x=>!!S.ach[x]);S.buildings.framer.lvl=5;return o;})()")
    ok(r==[True,True,True],f"Timber Line / Raise the Roof / Chalet Village unlock ({r})")
    ok(E(pg,"ACH.find(a=>a.id==='prem5').p()[1]===PREM_BLD.length&&PREM_BLD.length===6"),'Premium Row counts all 6 workshops')
    # ---------------- camera fit, taps, render ----------------
    E(pg,"(()=>{closeSheet&&closeSheet();fitCamera(true);TT.render();})()"); pg.wait_for_timeout(200)
    r=E(pg,"(()=>{const L=LOTS.beamsaw,s=w2s(...P(L.ci,L.cj,10)),[t,b]=barH();return [s[0]>0&&s[0]<scene.w,s[1]>t&&s[1]<scene.h-b];})()")
    ok(r==[True,True],f"fit view frames the south yard once it is built ({r})")
    for id in NEW:
        E(pg,f"(()=>{{closeSheet();const L=LOTS['{id}'],c=scene.cam,p=P(L.ci,L.cj,20);c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*1.6;c.fly=null;TT.render();}})()"); pg.wait_for_timeout(250)
        h=E(pg,f"(()=>{{const L=LOTS['{id}'],s=w2s(...P(L.ci,L.cj,14));return hitTest(s[0],s[1]);}})()")
        ok(h and h.get('id')==id,f"hit test finds the {id} ({h})")
        E(pg,f"(()=>{{const L=LOTS['{id}'],s=w2s(...P(L.ci,L.cj,14));TT.sceneTapAt(s[0],s[1]);}})()"); pg.wait_for_timeout(400)
        ok(E(pg,"[TT.curSheet,sheetBld]")==['bld',id],f"tapping the {id} opens its building sheet")
    E(pg,"closeSheet()")
    r=E(pg,"""(()=>{const o=[];for(const id of NEW_IDS){const st=S.buildings[id],keep=st.lvl;for(const lv of [1,25,60,120,250,420]){st.lvl=lv;try{TT.rebuildAll&&TT.rebuildAll();TT.render();}catch(e){o.push(id+lv+':'+e.message);}}st.lvl=keep;}TT.rebuildAll&&TT.rebuildAll();return o;})()""".replace('NEW_IDS',json.dumps(NEW)))
    ok(r==[],f"the new buildings draw at every milestone size ({r})")
    ctx.close()
    # ---------------- old saves ----------------
    ctx,pg=page()
    old=E(pg,"""(()=>{const s=freshState();s.version='2.27';s.coins=5e6;s.totalEarned=1e9;s.buildings.sawmill.lvl=120;s.buildings.peeler.lvl=33;s.premium={lvl:1};s.buildings.showroom.lvl=4;
      for(const id of ['beamsaw','glulam','framer']) delete s.buildings[id];for(const k of ['beams','glulam','houses']){delete s.res[k];if(s.autosell) delete s.autosell[k];}if(s.ws) for(const id of ['beamsaw','glulam','framer']) delete s.ws[id];
      return JSON.stringify(s);})()""")
    ctx.close()
    ctx,pg=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(old))
    r=E(pg,"[S.buildings.sawmill.lvl,S.buildings.peeler.lvl,S.buildings.showroom.lvl,S.version,S.buildings.beamsaw.lvl,S.buildings.framer.lvl,S.res.beams,S.res.houses]")
    ok(r[:3]==[120,33,4] and ver(r[3])>=(2,28) and r[4]==0 and r[5]==0 and r[6]==0 and r[7]==0,f"a v2.27 save loads; the new buildings start empty ({r})")
    E(pg,"(()=>{S.coins=1e12;TT.buyBuilding('beamsaw',3);for(let k=0;k<20;k++) tick(.5,false);TT.render();})()")
    r=E(pg,"[S.buildings.beamsaw.lvl,S.res.beams,prodRate('beams'),S.coins]")
    ok(r[0]==3 and (r[1]>0 or r[2]>0),f"the old save can build a Beam Saw and makes beams ({r})")
    pg.wait_for_timeout(800); ctx.close()
    # ---------------- touch ----------------
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev,dev+': ')
        E(pg,SETUP); E(pg,QUIET); pg.wait_for_timeout(400)
        sw=E(pg,"document.documentElement.scrollWidth<=window.innerWidth+1"); ok(sw,f"{dev}: no sideways page scroll")
        pg.locator('#jumpBtn').tap(); pg.wait_for_timeout(400)
        E(pg,"document.querySelector('#jumpBar .jchip[data-j=p2]').scrollIntoView({inline:'center'})"); pg.wait_for_timeout(150)
        pg.locator('#jumpBar .jchip[data-j=p2]').tap(); pg.wait_for_timeout(1500)
        r=E(pg,"(()=>{const s=w2s(...P(colMid('L')[0],colMid('L')[1],20)),[t,b]=barH();return [s[0]>0&&s[0]<scene.w,s[1]>t&&s[1]<scene.h-b];})()")
        ok(r==[True,True],f"{dev}: Phase 2 chip frames the longer column ({r})")
        for id in NEW:
            E(pg,f"(()=>{{closeSheet();const L=LOTS['{id}'],c=scene.cam,p=P(L.ci,L.cj,14);c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,c.fitZ*1.8);c.fly=null;TT.render();}})()"); pg.wait_for_timeout(300)
            s=E(pg,f"(()=>{{const L=LOTS['{id}'];return w2s(...P(L.ci,L.cj,14));}})()"); pg.touchscreen.tap(s[0],s[1]); pg.wait_for_timeout(700)
            ok(E(pg,"[TT.curSheet,sheetBld]")==['bld',id],f"{dev}: tapping the {id} opens its sheet ({E(pg,'[TT.curSheet,sheetBld]')})")
            if id=='framer':
                ok(E(pg,"document.querySelector('#pane-bld').scrollWidth<=document.querySelector('#pane-bld').clientWidth+1"),f"{dev}: the building sheet fits the phone")
        E(pg,"closeSheet()"); pg.wait_for_timeout(200)
        E(pg,"(()=>{const c=scene.cam;fitCamera(true);TT.render();})()"); pg.wait_for_timeout(300)
        r=E(pg,"(()=>{const L=LOTS.glulam,s=w2s(...P(L.ci,L.cj,10)),[t,b]=barH();return [s[0]>0&&s[0]<scene.w,s[1]>t&&s[1]<scene.h-b];})()")
        ok(r==[True,True],f"{dev}: the fit view shows the south yard ({r})")
        ctx.close()
    ok(not errs,f"no console errors ({errs[:4]})")
    ok(not missing,f"no 404s ({missing[:4]})")
    b.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S):\n- '+'\n- '.join(FAILS)))
sys.exit(1 if FAILS else 0)
