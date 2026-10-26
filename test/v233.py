# v2.33 Veneer & Decor line (item 10): a Phase 2 Veneer Panel Press (8 veneer + 2 planks → 3 veneered panels, bottom of the Phase 2
# column, past the south gate road) and a Phase 3 Decor Studio (6 panels + 2 plywood → 1 decor furniture, slot 7 of row III; the
# premium dock moves south). Both run on spare stock only (SURPLUS_IN): they take veneer / planks / plywood after every older line
# has its fill, so nothing older is ever less fed; bigger presses from Lv 50; an idle surplus line reserves nothing (no hoarding).
# Glue .65 → .7. Early game identical to v2.32. Managers, workstations, research (craft), trade + client demand, trophies, Advisor
# (spare-stock lines are calm and rank last), Supply Flow, saves, Replant, perf. Desktop + iPhone 13 + Pixel 7 (touch).
from playwright.sync_api import sync_playwright
import sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;if(S.daily) S.daily.next=1e15;})()"
CAM="(([i,j,z])=>{const c=scene.cam;const p=P(i,j,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*z;})"
# a factory at a given stage: main lines at lv (chipper ×1.6, Plywood Mill ×0.6), row III at pl, Panel Press pp, Decor Studio ds
STAGE='''((lv,pl,pp,ds,rep)=>{S.ach={};window._realAch=window._realAch||checkAch;window.checkAch=()=>{};for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
 for(const id of ['sawmill','chipper','kiln','peeler','carpentry','pellet','paper','furniture','beamsaw','glulam']) S.buildings[id].lvl=lv;S.buildings.chipper.lvl=Math.round(lv*1.6);
 S.buildings.plymill.lvl=Math.round(lv*.6);S.premium.lvl=pl?1:0;for(const id of ['atelier','parquet','stationer','cabinetry','showroom','framer','toyshop','boatyard']) S.buildings[id].lvl=pl;
 S.buildings.panelpress.lvl=pp;S.buildings.decorstudio.lvl=ds;for(const c of COLLECTORS) S.collectors[c.id]=Math.round(lv*3);for(const n of RNODES) S.research[n.id]=1;
 S.logi.fk=8;S.logi.belt={sawmill:3,chipper:3,peeler:3,beamsaw:3};S.logi.drone=0;S.seeds=rep;S.legacy=rep;for(const k in S.autosell) S.autosell[k]=true;S.orders.offers=[];S.orders.active=null;
 S.wx.clock=200;S.wx.w='clear';S.wx.ends=0;S.wx.next=1e15;M=computeMods();for(const k in S.res) if(k!=='logs') S.res[k]=0;
 let v=0,n=0;const F={},full={};for(let k=0;k<480;k++){S.res.logs=Math.max(S.res.logs,1e9);tick(.5,false);if(k>=240){n++;for(const b of BUILDINGS) if(S.buildings[b.id].lvl){F[b.id]=(F[b.id]||0)+bstat[b.id].f;if(bstat[b.id].full) full[b.id]=1;}
   for(const r of RES){const R=rates[r.id];if(R&&R.s>0) v+=R.s*r.price*.5;}}}
 for(const id in F) F[id]/=n;const sold=r=>rates[r]&&rates[r].p>0?rates[r].s/rates[r].p:0;
 return {f:F,v:v/120,vs:sold('veneer'),ps:sold('plywood'),panels:rates.panels?rates.panels.c:0,full:Object.keys(full)};})'''
# deterministic early game (seeded RNG, frozen weather, no events): 2 h of greedy buying; the reference was taken from v2.32
EARLY='''(()=>{let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};S.coins=50;
 const want=['sawmill','chipper','kiln','carpentry','peeler','pellet','paper','furniture'];
 for(let k=0;k<14400;k++){if(k%4==0){TT.buyCollector('lumberjack',1);if(S.collectors.lumberjack>=10) TT.buyCollector('chainsaw',1);if(S.collectors.chainsaw>=10) TT.buyCollector('truck',1);
   for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
 return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.carpentry.lvl,S.buildings.peeler.lvl,S.buildings.pellet.lvl];})()'''
EARLY_V232=[3666495.023341302,39,13,2,6]
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
    ok(ver(E(pg,"TT.VERSION"))>=(2,33),'version ≥ 2.33')
    # ---- definitions ----
    r=E(pg,"[BMAP.panelpress&&[BTIER.panelpress,BMAP.panelpress.inp,BMAP.panelpress.out,BMAP.panelpress.cost,!!BMAP.panelpress.premium],BMAP.decorstudio&&[BTIER.decorstudio,BMAP.decorstudio.inp,BMAP.decorstudio.out,BMAP.decorstudio.cost,!!BMAP.decorstudio.premium],RMAP.panels&&RMAP.panels.price,RMAP.decor&&RMAP.decor.price,MAIN_BLD.map(b=>b.id).indexOf('panelpress')>MAIN_BLD.map(b=>b.id).indexOf('glulam'),PREM_BLD.map(b=>b.id).indexOf('decorstudio')>PREM_BLD.map(b=>b.id).indexOf('framer')]")
    ok(r[0]==[2,{'veneer':8,'planks':2},{'panels':3},6e7,False] and r[1]==[3,{'panels':6,'plywood':2},{'decor':1},2.5e9,True],f'Veneer Panel Press (Phase II: 8 veneer + 2 planks → 3 panels) and Decor Studio (Phase III: 6 panels + 2 plywood → decor furniture) ({r[:2]})')
    ok(r[2]==30 and r[3]==1200 and r[4] and r[5],f'veneered panels 🪙30, decor furniture 🪙1,200; listed after the Glulam Plant / Timber-frame Houses ({r[2:]})')
    r=E(pg,"(()=>{const a=bulkCost(BMAP.panelpress.cost,BMAP.panelpress.scale,0,1),b=bulkCost(BMAP.decorstudio.cost,BMAP.decorstudio.scale,0,1);S.runCS=100;const c=bulkCost(BMAP.panelpress.cost,BMAP.panelpress.scale,0,1),d=bulkCost(BMAP.decorstudio.cost,BMAP.decorstudio.scale,0,1);S.runCS=0;return [a,b,c/a,d/b];})()")
    ok(abs(r[0]-6e7)<1 and abs(r[1]-2.5e9)<1 and abs(r[2]-100)<1e-6 and abs(r[3]-100)<1e-6,f'costs 60M / 2.5B × forest value ({r})')
    r=E(pg,"(()=>{S.totalEarned=0;const a=bVisible(BMAP.panelpress);S.totalEarned=1.5e7;const b=bVisible(BMAP.panelpress);S.premium.lvl=0;const c=bVisible(BMAP.decorstudio);S.premium.lvl=1;const d=bVisible(BMAP.decorstudio);S.premium.lvl=0;S.totalEarned=0;return [a,b,c,d];})()")
    ok(r==[False,True,False,True],f'the Panel Press shows from 15M earned, the Decor Studio with the Premium Area ({r})')
    # ---- early game unchanged ----
    ctx.close(); ctx,pg=page()
    r=E(pg,EARLY)
    ok(abs(r[0]-EARLY_V232[0])/EARLY_V232[0]<1e-9 and r[1:]==EARLY_V232[1:],f'early game identical to v2.32: 2 h scripted run earns {r[0]:.6f} (v2.32 {EARLY_V232[0]:.6f}), same levels {r[1:]}')
    ctx.close(); ctx,pg=page()
    # ---- surplus-first inputs ----
    r=E(pg,"[SURPLUS_IN.panelpress&&SURPLUS_IN.panelpress.veneer&&SURPLUS_IN.panelpress.planks,SURPLUS_IN.decorstudio&&SURPLUS_IN.decorstudio.plywood,!(SURPLUS_IN.decorstudio&&SURPLUS_IN.decorstudio.panels),TAR_GLUE,pressCapAt(50),pressCapAt(70),pressCapAt(10)]")
    ok(r[:3]==[1,1,True] and abs(r[3]-.7)<1e-9 and r[4]==1 and abs(r[5]-2)<1e-9 and r[6]==1,f'the press takes spare veneer + planks, the studio spare plywood (panels are its own), glue .7, bigger presses from Lv 50 ({r})')
    A=E(pg,STAGE+'(40,5,40,0,0)'); B=E(pg,STAGE+'(40,5,0,0,0)')
    same=[i for i in B['f'] if abs(A['f'].get(i,0)-B['f'][i])>1e-6]
    ok(not same and A['f']['panelpress']<.05,f"veneer-short factory: the Panel Press gets nothing and every other line runs exactly as without it (press {A['f']['panelpress']:.2f}, changed {same})")
    rows=[]
    for nm,st in [('late B',(80,20,75,13,0)),('late C',(120,40,115,33,0)),('end',(150,60,145,53,0)),('after Replant',(80,20,75,13,120))]:
        on=E(pg,STAGE+'(%d,%d,%d,%d,%d)'%st); off=E(pg,STAGE+'(%d,%d,0,0,%d)'%(st[0],st[1],st[4]))
        worse=[i for i in off['f'] if on['f'].get(i,1)<off['f'][i]-1e-3]
        rows.append((nm,on,off,worse))
        ok(not worse and not on['full'],f"{nm}: no older line is less fed and nothing backs up ({worse}{on['full']})")
        g=on['v']/off['v']
        ok(1.0<=g<=1.35 and on['vs']<=max(.05,off['vs']*.5) and on['panels']>0,f"{nm}: veneer sold raw {off['vs']*100:.0f}% → {on['vs']*100:.0f}%, plywood {off['ps']*100:.0f}% → {on['ps']*100:.0f}%, studio uses {on['panels']:.3g} panels/s, sales ×{g:.2f}")
    r=E(pg,"(()=>{S.buildings.peeler.lvl=10;S.buildings.panelpress.lvl=60;M=computeMods();for(let k=0;k<200;k++){S.res.logs=1e9;tick(.5,false);}return [bstat.sawmill.full||null,bstat.carpentry.f,S.res.planks<stockCaps().planks*.9];})()")
    ok(r[0] is None and r[1]>.99 and r[2],f'an idle Panel Press reserves no planks: the Sawmill never backs up ({r})')
    # ---- Advisor / status / Supply Flow ----
    r=E(pg,"(()=>{for(let k=0;k<10;k++){S.res.logs=1e9;tick(1,false);}const w=advWait('panelpress');const L=advList(true);const i=L.findIndex(e=>e.users.some(u=>u.id==='panelpress'));const real=L.findIndex(e=>!e.spare);return [w&&w.k,w&&w.spare,w&&w.bad,i,real,advChip('panelpress'),bStatus?bStatus(BMAP.panelpress).txt:''];})()".replace("bStatus?bStatus(BMAP.panelpress).txt:''","''"))
    ok(r[0] in ('veneer','planks') and r[1] and not r[2] and (r[4]<0 or r[3]>r[4]) and '♻ Running on spare' in (r[5] or ''),f'Advisor: a press on spare stock is calm (never red) and ranks after real bottlenecks ({r})')
    E(pg,"openSheet('bld','panelpress')"); pg.wait_for_timeout(500)
    t=pg.locator('#sheet').inner_text()
    ok('spare' in t and 'leave over' in t,f'building sheet explains the spare-stock rule ({t[t.find("spare")-30:][:140]!r})')
    E(pg,"closeSheet()")
    r=E(pg,"(()=>{S.buildings.peeler.lvl=150;S.buildings.panelpress.lvl=80;S.buildings.decorstudio.lvl=30;M=computeMods();for(let k=0;k<20;k++){S.res.logs=1e9;tick(.5,false);}const E=flowEdges();const g=(a,b)=>E.find(e=>e.from===a&&e.to===b);return [!!g('peeler','panelpress'),!!g('sawmill','panelpress'),!!g('panelpress','decorstudio'),!!g('plymill','decorstudio'),E.filter(e=>e.to==='panelpress'||e.to==='decorstudio').every(e=>e.state!=='bad'||!surplusIn(e.to,e.k))];})()")
    ok(all(r),f'Supply Flow: peeler + sawmill → press → studio ← plywood arcs, spare-stock arcs never red ({r})')
    # ---- systems ----
    r=E(pg,"[!!MGR_OF.panelpress,!!MGR_OF.decorstudio,wsHas('panelpress'),wsHas('decorstudio'),CRAFT.includes('panelpress')&&CRAFT.includes('decorstudio'),CLIENTS.some(c=>c.likes.includes('decor')),CITIES.some(c=>c.likes.decor)&&CITIES.some(c=>c.likes.panels),FIRE_RISK.panelpress>0,!!FLOW_TINT.panels&&!!FLOW_TINT.decor,!!BDRAW.panelpress&&!!BDRAW.decorstudio]")
    ok(all(r),f'managers, workstations, craft research, client + trade demand, fire risk, flow tints and sprites for both ({r})')
    r=E(pg,"(()=>{S.ach={};if(window._realAch) window.checkAch=window._realAch;S.buildings.panelpress.lvl=1;S.buildings.decorstudio.lvl=50;checkAch(true);const a=ACH.filter(x=>/^(panel1|decor1|decor50)$/.test(x.id));return [a.length,a.every(x=>x.g==='sys'),!!S.ach.panel1,!!S.ach.decor1,!!S.ach.decor50];})()")
    ok(r==[3,True,True,True,True],f'3 new system trophies: Face Veneer, Interior Design, Grand Interiors ({r})')
    r=E(pg,"(()=>{const o=[];for(const k of ['panelpress','decorstudio']){const L=LOTS[k],B=lotBox(L);o.push(k==='panelpress'?[yardTile(Math.floor(B.i0),Math.floor(B.j0)),yardTile(Math.floor(B.i1-.01),Math.floor(B.j1-.01)),zoneAt(L.ci,L.cj)!=='road']:[inPremRow(L.ci,L.cj),inPremRow(B.i1,B.j1)]);}\
      const bx=id=>lotBox(LOTS[id]);const ov=(a,b)=>a.i0<b.i1&&b.i0<a.i1&&a.j0<b.j1&&b.j0<a.j1;const clash=[];for(const k of ['panelpress','decorstudio']) for(const id in LOTS) if(id!==k&&LOTS[id].ci!==undefined&&ov(bx(k),bx(id))) clash.push(k+'/'+id);\
      const pd=lotBox(LOTS.decorstudio).j1<PDOCK.cj-1.2;return [o,clash,pd,PGATES.panelpress<PROW.u1-.95,tierLinks().filter(l=>l.dst==='panelpress').map(l=>l.src).sort(),premLinks().filter(l=>l.dst==='decorstudio').map(l=>l.src)];})()")
    ok(all(r[0][0]) and all(r[0][1]) and not r[1] and r[2] and r[3],f'layout: the press on the yard (no road), the studio inside row III, no overlaps, premium dock moved clear, gate inside the row ({r[:4]})')
    ok(r[4]==['peeler','sawmill'] and r[5]==['panelpress'],f'forklifts: Peeler + Sawmill → Panel Press, Panel Press → Decor Studio through its gate ({r[4]}, {r[5]})')
    # ---- render + perf ----
    E(pg,"S.coins=1e15;S.buildings.panelpress.lvl=40;S.buildings.decorstudio.lvl=20;S.buildings.peeler.lvl=120;M=computeMods();scene._fsig='';scene._tsig='';scene._pfsig='';")
    E(pg,f"{CAM}([27,40,1.6])"); pg.wait_for_timeout(900)
    r=E(pg,'''(()=>{const t=on=>{S.buildings.panelpress.lvl=on?40:0;S.buildings.decorstudio.lvl=on?20:0;scene._tsig='';scene._pfsig='';scene.chunks.clear();for(let k=0;k<90;k++) stepScene(1/30);const a=[];for(let k=0;k<150;k++){const t0=performance.now();stepScene(1/30);a.push(performance.now()-t0);}a.sort((x,y)=>x-y);return a[75];};
      const x0=t(0),x1=t(1),x2=t(0),x3=t(1);return [Math.min(x0,x2),Math.min(x1,x3),scene.objCount];})()''')
    ok(r[1]<=r[0]*1.2+1.0 and r[2]>0,f'flat frame cost: median {r[0]:.2f} ms without the decor line → {r[1]:.2f} ms with both buildings, their forklifts and stock on screen')
    pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'v233_desktop.png'))
    r=E(pg,"(()=>{TT.fitCamera(true);for(let k=0;k<40;k++) stepScene(1/30);const c=scene.cam,[tb,bb]=barH();const s=id=>{const L=LOTS[id];const p=P(L.ci,L.cj,10);return w2s(p[0],p[1]);};return [s('panelpress'),s('decorstudio'),scene.h-bb,scene.w];})()")
    ok(all(0<=q[0]<=r[3] and q[1]<=r[2] for q in r[:2]),f'fit view frames the Panel Press and the Decor Studio above the bottom bar ({r})')
    ctx.close()
    # ---- save / load ----
    for name,mut,exp in [('round trip','',(12,7)),('v2.32 save (no decor line)','o.version="2.32";delete o.buildings.panelpress;delete o.buildings.decorstudio;delete o.res.panels;delete o.res.decor;delete o.autosell.panels;delete o.autosell.decor',(0,0)),
                         ('damaged levels','o.buildings.panelpress={lvl:"x"};o.buildings.decorstudio={lvl:-4};o.res.panels=null;o.res.decor="y"',(0,0))]:
        ctx,pg=page(tag=name+': ')
        E(pg,f"(()=>{{S.buildings.panelpress.lvl=12;S.buildings.decorstudio.lvl=7;S.res.panels=5;const o=JSON.parse(JSON.stringify(S));{mut};localStorage.setItem(SAVE_KEY,JSON.stringify(o));sessionStorage.setItem('_c','1');}})()")
        pg.reload(); pg.wait_for_timeout(1300)
        r=E(pg,"[S.buildings.panelpress.lvl,S.buildings.decorstudio.lvl,S.res.panels>=0,S.res.decor>=0,typeof S.autosell.panels,TT.VERSION]")
        ok(tuple(r[:2])==exp and r[2] and r[3] and r[4]=='boolean',f'{name}: loads with sane decor-line levels and stocks ({r})')
        E(pg,QUIET); E(pg,"for(let k=0;k<10;k++){tick(.5,false);stepScene(1/30);}")
        ctx.close()
    # ---- Replant ----
    ctx,pg=page()
    r=E(pg,"(()=>{S.buildings.panelpress.lvl=30;S.buildings.decorstudio.lvl=12;checkAch(true);S.totalEarned=1e20;const ok=doPrestige();for(let k=0;k<5;k++) stepScene(1/30);return [ok!==false,S.buildings.panelpress.lvl,S.buildings.decorstudio.lvl,!!S.ach.panel1,!!S.ach.decor1,cs()>1];})()")
    ok(r==[True,0,0,True,True,True],f'Replant: both buildings start over at the new run prices, trophies stay ({r})')
    ctx.close()
    # ---- phones (touch) ----
    for dev,W in [('iPhone 13',390),('Pixel 7',412)]:
        ctx,pg=page(dev,dev+': ')
        E(pg,"(()=>{for(const id of ['sawmill','chipper','kiln','peeler','carpentry','pellet','paper','furniture','beamsaw','glulam']) S.buildings[id].lvl=60;S.buildings.plymill.lvl=30;S.premium.lvl=1;S.buildings.framer.lvl=10;for(const c of COLLECTORS) S.collectors[c.id]=200;S.coins=1e13;S.totalEarned=1e13;M=computeMods();for(let k=0;k<10;k++){S.res.logs=1e9;tick(1,false);}TT.fitCamera(true);})()")
        pg.wait_for_timeout(900)
        for id in ['panelpress','decorstudio']:
            E(pg,f"(()=>{{const L=LOTS['{id}'];const c=scene.cam;const p=P(L.ci,L.cj,0);c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=c.fitZ*1.6;}})()"); pg.wait_for_timeout(700)
            x,y=E(pg,f"TT.lotScreen('{id}')")
            pg.touchscreen.tap(x,y); pg.wait_for_timeout(700)
            ok(E(pg,"TT.curSheet")=='bld' and E(pg,"sheetBld")==id,f'{dev}: tapping the {id} lot opens its sheet')
            btn=pg.locator('#bpBuy'); bb=btn.bounding_box()
            ok(bb and bb['height']>=40 and bb['x']+bb['width']<=W+1,f'{dev}: the Build button is a full touch target ({bb})')
            btn.tap(); pg.wait_for_timeout(400)
            ok(E(pg,f"S.buildings['{id}'].lvl")>=1,f'{dev}: tapping Build builds the {id}')
            w=E(pg,"Math.max(...[...document.querySelectorAll('#sheet *')].map(e=>e.getBoundingClientRect().right))")
            ok(w<=W+1,f'{dev}: nothing in the sheet runs off the screen ({w:.0f}px)')
            E(pg,"closeSheet()"); pg.wait_for_timeout(400)
        E(pg,"(()=>{S.buildings.panelpress.lvl=40;S.buildings.decorstudio.lvl=10;M=computeMods();TT.fitCamera(true);})()"); pg.wait_for_timeout(1200)
        if dev=='iPhone 13': pg.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'v233_mobile.png'))
        ctx.close()
    b.close()
    real=[e for e in errs if 'favicon' not in e]
    ok(not real,f'no console errors ({real[:3]})')
print('\n'+('ALL PASS' if not FAILS else f'{len(FAILS)} FAIL(S): {FAILS}'))
sys.exit(1 if FAILS else 0)
