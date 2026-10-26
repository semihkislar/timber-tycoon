# v2.21.1: Phase 3 (Premium) is its own row beyond Phase 2 — three parallel rows I → II → III.
# Layout (band, ordering, no overlaps, no trees), sign, Phase 3 jump chip, II→III forklift lifts through the gates,
# Supply Flow to the Phase 3 dock, hit tests, camera bounds, phone framing above the sheet, old saves unaffected.
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js): return pg.evaluate(js)
CLEAN="document.querySelectorAll('.modal-bg,.toast').forEach(t=>t.remove());S.events=[];S.nextEvent=1e12;S.fires={};S.fireCool=1e12;S.lifetimeClicks=99;"
FULL=("S.coins=1e16;S.totalEarned=1e16;for(const c of COLLECTORS) TT.buyCollector(c.id,20);for(const b of BUILDINGS) if(!b.premium&&!b.tech) TT.buyBuilding(b.id,20);"
      "TT.buyBuilding('plymill',5);TT.buyPremium();for(const b of PREM_BLD) TT.buyBuilding(b.id,8);M=computeMods();for(const r of RES) if(canSell(r.id)) S.autosell[r.id]=true;TT.simulate(25);")
PREM_IDS=['atelier','parquet','stationer','cabinetry','showroom']
with sync_playwright() as p:
    br=p.chromium.launch()
    def page(dev=None,init=None):
        d=dict(p.devices[dev]) if dev else {'viewport':{'width':1280,'height':860}}; d.pop('default_browser_type',None)
        ctx=br.new_context(**d,service_workers='block'); ctx.add_init_script(init or 'if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; bad=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.on('response',lambda r: r.status==404 and bad.append(r.url))
        pg.goto(URL); pg.wait_for_timeout(1600); return ctx,pg,errs,bad
    ctx,pg,errs,bad=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,21,1),f"VERSION>=2.21.1 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)",open(ROOT+'/sw.js').read()); ok(m and ver(m.group(1))>=(2,21,1),'sw cache bumped to >= v2.21.1')
    # --- three parallel rows ---
    r=E(pg,"""(()=>{const vr=id=>{const B=lotBox(LOTS[id]);return [B.i0-B.j1,B.i1-B.j0];};const o={};
      for(const b of BUILDINGS){const L=LOTS[b.id];if(!L||b.tech) continue;const [a,c]=vr(b.id);o[b.id]={side:L.side,v0:a,v1:c,u:L.ci+L.cj};}return o;})()""")
    p1=[k for k,v in r.items() if v['side']=='R' and k!='peeler']; p2=[k for k,v in r.items() if v['side']=='L']; p3=[k for k in PREM_IDS]
    ok(all(r[k]['side']=='P' for k in p3),'all five premium workshops are Phase 3 lots')
    ok(min(r[k]['v0'] for k in p1)>0 and max(r[k]['v1'] for k in p2)<0,'row I right of the lane, row II left of it')
    ok(max(r[k]['v1'] for k in p3)<min(r[k]['v0'] for k in p2)-3,f"row III sits beyond row II with a clear gap ({max(r[k]['v1'] for k in p3):.2f} < {min(r[k]['v0'] for k in p2):.2f})")
    cv=[(r[k]['v0']+r[k]['v1'])/2 for k in p3]; ok(max(cv)-min(cv)<.01,f'row III lots share one centre line (parallel row) {cv}')
    us=[r[k]['u'] for k in p3]; ok(us==sorted(us),'row III runs in unlock order down the lane (gift box → … → showroom)')
    ok(min(us)>=min(r[k]['u'] for k in p2)-1 and max(us)<=max(r[k]['u'] for k in p2)+4,f'row III spans the same stretch as row II ({us})')
    E(pg,CLEAN+"S.buildings.peeler.lvl=0")
    ov=E(pg,"""(()=>{const ids=Object.keys(LOTS);const out=[];const bx=id=>lotBox(LOTS[id]);
      for(let a=0;a<ids.length;a++) for(let b=a+1;b<ids.length;b++){const A=bx(ids[a]),B=bx(ids[b]);if(A.i0<B.i1&&B.i0<A.i1&&A.j0<B.j1&&B.j0<A.j1) out.push(ids[a]+'/'+ids[b]);}return out;})()""")
    ok(not ov,f'no lot boxes overlap ({ov})')
    r=E(pg,"""(()=>{const inR=(i,j)=>inPremRow(i,j,.3);return {trees:scene.trees.filter(t=>inR(t.i,t.j)).length,dyn:scene.dynTrees.filter(t=>inR(t.i,t.j)).length,
      deco:scene.deco.filter(d=>inR(d.i,d.j)).length,zone:zoneAt(PREM.ci,PREM.cj),lots:PREM_BLD.every(b=>inPremRow(LOTS[b.id].ci,LOTS[b.id].cj)&&zoneAt(LOTS[b.id].ci,LOTS[b.id].cj)==='prem'),
      dock:zoneAt(PDOCK.ci,PDOCK.cj),road:zoneAt(27,PROAD_J),land:inPremRow(LANDINGS.L.i,LANDINGS.L.j,.5),jl:scene.dynTrees.filter(t=>zoneTrees('L').includes(t)&&inR(t.i,t.j)).length,
      jz:zoneTrees('L').length};})()""")
    ok(r['trees']==0 and r['dyn']==0 and r['deco']==0,f'row III is cleared of trees and verge deco ({r})')
    ok(r['zone']=='prem' and r['lots'] and r['dock']=='prem' and r['road']=='prem','row, dock and access road are premium ground')
    ok(not r['land'] and r['jl']==0 and r['jz']>=6,f"left forest crew works beyond row III, not inside it ({r['jz']} trees)")
    sg=E(pg,"TIER_SIGNS.filter(s=>s.t===3).map(s=>({txt:s.txt,row:inPremRow(s.i,s.j,2.5)}))")
    ok(len(sg)==1 and 'PHASE 3' in sg[0]['txt'] and 'PREMIUM' in sg[0]['txt'] and sg[0]['row'],f'Phase 3 sign at the head of row III ({sg})')
    cw=E(pg,"(()=>{const c=PREM.corners.map(([i,j])=>P(i,j));const B=CAM_WORLD;return c.every(p=>p[0]>=B.x0&&p[0]<=B.x1&&p[1]>=B.y0&&p[1]<=B.y1)&&P(PDOCK.ci,PDOCK.cj)[1]<=B.y1&&P(LANDINGS.L.i,LANDINGS.L.j)[0]>=B.x0;})()")
    ok(cw,'camera bounds include row III, its dock and the moved forest landing')
    # --- locked: chip locked, tap opens the premium sheet ---
    ok(E(pg,"JUMPS.find(j=>j.id==='prem').l")=='Phase 3','quick-jump chip is labelled Phase 3')
    ok(E(pg,"JUMPS.find(j=>j.id==='prem').lock()") is True,'Phase 3 chip locked before the area opens')
    E(pg,"S.coins=1e16;S.totalEarned=1e16"); pg.wait_for_timeout(300)
    E(pg,"(()=>{const c=TT.scene.cam;const p=P(PREM.ci,PREM.cj,0);c.tx=c.x=p[0];c.ty=c.y=p[1];c.tz=c.z=Math.max(c.minZ,.7);})()"); pg.wait_for_timeout(400)
    pt=E(pg,'TT.premScreen()'); h=E(pg,f'TT.hitTest({pt[0]},{pt[1]})'); ok(h['type']=='prem',f'tapping the locked row hits the Premium Area ({h})')
    # --- open + built ---
    E(pg,CLEAN+FULL); pg.wait_for_timeout(1500)
    ok(E(pg,"JUMPS.find(j=>j.id==='prem').lock()") is False,'Phase 3 chip unlocks with the area')
    L=E(pg,"TT.premLinks()"); ok(len(L)>=5 and all(l['src'] in ['carpentry','pellet','paper','furniture','panelpress'] for l in L),f'II → III links from phase-2 buildings ({len(L)})')
    r=E(pg,"""(()=>{const out=[];for(const f of scene.plifts){const pts=f.path.pts.map(([i,j])=>[i+j,i-j]);
      out.push({src:f.src,dst:f.dst,start:pts[0][1],gate:Math.abs(pts[1][0]-PGATES[f.src])<.01,inRow:pts.slice(1).every(([u,v])=>v<=PROW.v1+.01&&v>=PROW.v0),
        end:inPremRow(f.path.pts[f.path.pts.length-1][0],f.path.pts[f.path.pts.length-1][1],.6)});}return out;})()""")
    ok(len(r)==len(L) and len(r)<=6,f'one forklift per link, capped at 6 ({len(r)})')
    ok(all(x['start']>-11.2 and x['gate'] and x['inRow'] and x['end'] for x in r),f'lifts leave phase-2 racks, pass their gate, run the row aisle to the workshop ({r[:2]})')
    pg.wait_for_timeout(1500); mv=E(pg,"TT.plifts().filter(f=>f.i!==undefined).length"); ok(mv==len(r),f'lifts move in the scene ({mv})')
    fe=E(pg,"flowEdges().map(e=>e.from+'>'+e.to)")
    ok(any(e.endswith('>pdock') for e in fe),f'Supply Flow: premium goods ship from the Phase 3 dock')
    ok(not any(e.split('>')[0] in PREM_IDS and e.endswith('>dock') for e in fe),'Supply Flow: no premium arc to the main dock')
    ok('carpentry>cabinetry' in fe and 'furniture>showroom' in fe,'Supply Flow: II → III arcs present')
    a=E(pg,"(()=>{const a=flowAnchor('pdock'),b=flowAnchor('showroom');return !!(a&&b)})()"); ok(a,'flow anchor for the Phase 3 dock')
    # tap each premium workshop opens its sheet
    good=[]
    for bid in PREM_IDS:
        E(pg,f"TT.closeSheet();focusLot('{bid}',true)"); pg.wait_for_timeout(900)
        pt=E(pg,f'TT.lotScreen("{bid}")'); h=E(pg,f'TT.hitTest({pt[0]},{pt[1]})'); good.append(h.get('id')==bid)
    ok(all(good),f'every Phase 3 workshop is tappable ({good})')
    E(pg,"TT.closeSheet()")
    jb=E(pg,"(()=>{buildJumpBar();const b=[...document.querySelectorAll('#jumpBar [data-j], #jumpBar button')].map(x=>x.textContent.trim());return b;})()")
    ok(any('Phase 3' in x for x in jb),f'jump bar shows the Phase 3 chip ({jb})')
    ok(not errs and not bad,f'desktop: no errors / 404s ({errs[:3]} {bad[:3]})')
    sv=E(pg,"JSON.stringify(S)"); ctx.close()
    # --- old save: levels kept, nothing in the save depends on the layout ---
    old=json.loads(sv); old['version']='2.21'
    ctx,pg,errs,bad=page(init='if(!sessionStorage.getItem("_m")){sessionStorage.setItem("_m","1");localStorage.setItem("timberTycoon_save_v1",%s)}'%json.dumps(json.dumps(old)))
    r=E(pg,"({p:S.premium.lvl,b:PREM_BLD.map(b=>S.buildings[b.id].lvl),logs:canSell('logs')})")
    ok(r['p']==old['premium']['lvl'] and r['b']==[old['buildings'][b['id']]['lvl'] for b in E(pg,"PREM_BLD.map(b=>({id:b.id}))")] and r['logs'] is False,f'v2.21 save loads with premium levels intact ({r})')
    ok(not errs,f'old save: no errors ({errs[:3]})'); ctx.close()
    # --- phones: selected Phase 3 building stays above the sheet ---
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg,errs,bad=page(dev)
        E(pg,CLEAN+FULL); pg.wait_for_timeout(1200)
        res=[]
        for bid in PREM_IDS:
            E(pg,"TT.closeSheet()"); pg.wait_for_timeout(200)
            E(pg,f"TT.openSheet('bld','{bid}')"); pg.wait_for_timeout(1300)
            v=E(pg,f"(()=>{{const p=TT.lotScreen('{bid}');const t=document.getElementById('sheet').getBoundingClientRect().top;const tb=(document.getElementById('topbar')||{{offsetHeight:40}}).offsetHeight;return [Math.round(p[0]),Math.round(p[1]),Math.round(t),tb,innerWidth];}})()")
            res.append((bid,v)); 
        okk=[b for b,v in res if v[1]<v[2] and v[1]>v[3] and 0<v[0]<v[4]]
        ok(len(okk)==5,f'{dev}: every Phase 3 workshop framed above the sheet ({res})')
        E(pg,"TT.closeSheet()"); E(pg,"TT.openSheet('prem')"); pg.wait_for_timeout(1300)
        v=E(pg,"(()=>{const p=P(PREM.ci,PREM.cj,20);const s=w2s(p[0],p[1]);return [s[1],document.getElementById('sheet').getBoundingClientRect().top];})()")
        ok(v[0]<v[1],f'{dev}: Premium sheet frames row III above the sheet ({v})')
        E(pg,"TT.closeSheet()"); pg.wait_for_timeout(200)
        ch=pg.locator('#jumpBar').get_by_text('Phase 3')
        if ch.count():
            if not ch.first.is_visible(): E(pg,"document.getElementById('jumpBar').classList.add('open')")
            try: ch.first.click(timeout=3000)
            except Exception: E(pg,"[...document.querySelectorAll('#jumpBar *')].find(x=>x.textContent.trim().endsWith('Phase 3')).click()")
            pg.wait_for_timeout(1400)
            v=E(pg,"(()=>{const p=P(PREM.ci,PREM.cj,20);const s=w2s(p[0],p[1]);return [s[0],s[1],innerWidth,innerHeight];})()")
            ok(0<v[0]<v[2] and 0<v[1]<v[3],f'{dev}: Phase 3 chip flies to the row ({v})')
        else: ok(False,f'{dev}: Phase 3 chip present')
        if dev=='iPhone 13':
            E(pg,"focusLot('cabinetry',true)"); pg.wait_for_timeout(1200); pg.screenshot(path='/tmp/v2211-mobile-test.png')
        ok(not errs,f'{dev}: no errors ({errs[:3]})'); ctx.close()
    br.close()
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): '+'; '.join(FAILS)))
sys.exit(1 if FAILS else 0)
