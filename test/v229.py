# v2.29 Bottleneck Advisor: "waiting on X" badges in the scene and on the building sheet, a root-cause fix that follows the chain,
# "Top bottlenecks" under the Supply Flow legend with tap-to-jump, plus the phone fit view framing the Shipping dock and the
# Logistics → Global Expansion / Trade Routes / Trade renames (ids kept, old saves keep their effects). Desktop + iPhone 13 / Pixel 7 touch.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
QUIET="(()=>{window.toast=()=>{};document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;S.orders.next=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;if(S.premium) S.premium.next=S.time+1e9;})()"
# A: no collectors, no logs -> the Sawmill waits on logs, the Carpentry waits on planks; root fix = hire collectors
SC_A="(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;}for(const c of COLLECTORS) S.collectors[c.id]=0;S.buildings.sawmill.lvl=5;S.buildings.carpentry.lvl=5;S.buildings.sawmill.on=S.buildings.carpentry.on=true;for(const k in S.res) S.res[k]=0;S.forest&&(S.forest.trees=S.forest.trees);M=computeMods();for(let i=0;i<20;i++) tick(1,false);return advList(true).map(e=>({k:e.k,kind:e.fix&&e.fix.kind,id:e.fix&&e.fix.id,u:e.users.map(x=>x.id).sort()}));})()"
# B: plenty of logs, a small Sawmill feeding a big Carpentry -> root fix = upgrade the Sawmill
SC_B="(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;}S.buildings.sawmill.lvl=1;S.buildings.carpentry.lvl=60;S.buildings.sawmill.on=S.buildings.carpentry.on=true;M=computeMods();for(let i=0;i<20;i++){S.res.logs=1e9;tick(1,false);}return advList(true).map(e=>({k:e.k,kind:e.fix&&e.fix.kind,id:e.fix&&e.fix.id,u:e.users.map(x=>x.id).sort(),lost:e.lost}));})()"
PILLSPY="(()=>{if(window._spy) return;window._spy=1;window._pl=[];const o=pill;pill=function(c,x,y,t,op){if(window._pl.length<4000) window._pl.push(String(t));return o.apply(this,arguments);};})()"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(dev=None,tag='',init=CLEAR):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(init); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}')); pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1300); return ctx,pg
    E=lambda pg,js: pg.evaluate(js)
    ctx,pg=page(); E(pg,QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,29),f"VERSION >= 2.29 ({E(pg,'TT.VERSION')})")
    # ---- renames (ids kept) ----
    r=E(pg,"[UPGRADES.find(u=>u.id==='logistics').name,RNMAP.logistics.name,RBRANCH.find(b=>b.id==='log').name]")
    ok(r==['Global Expansion','Trade Routes','Trade'],f'"Logistics" names freed for the logistics tiers ({r})')
    r=E(pg,"[...UPGRADES.map(u=>u.name+' '+u.desc),...RNODES.map(n=>n.name+' '+n.d),...RBRANCH.map(b=>b.name)].filter(t=>/logistic/i.test(t))")
    ok(r==[],f'no upgrade, research node or branch says "Logistics" any more ({r})')
    r=E(pg,"(()=>{const n=new Set();return [...UPGRADES.map(u=>u.name),...RNODES.map(x=>x.name)].filter(x=>n.has(x)||!n.add(x));})()")
    ok(r==[],f'upgrade and research names stay unique ({r})')
    # ---- advisor logic ----
    r=E(pg,SC_A)
    ok(len(r)==1 and r[0]['kind']=='crew' and r[0]['k']=='logs' and r[0]['u']==['carpentry','sawmill'],f'starved chain groups into one root bottleneck: hire collectors ({r})')
    r=E(pg,"(()=>{const f=advFix('planks');return [f.kind,f.via,f.label]})()")
    ok(r[0]=='crew' and r[1]==['sawmill'] and 'collectors' in r[2],f'planks fix follows the Sawmill to the log shortage ({r})')
    r=E(pg,"[advWait('carpentry')&&advWait('carpentry').k,advWait('sawmill')&&advWait('sawmill').k,advWait('chipper')]")
    ok(r==['planks','logs',None],f'advWait names the input each building waits on ({r})')
    r=E(pg,SC_B)
    ok(len(r)==1 and r[0]['kind']=='upg' and r[0]['id']=='sawmill' and r[0]['k']=='planks' and r[0]['u']==['carpentry'] and r[0]['lost']>0,f'a slow producer is the fix: upgrade the Sawmill, with lost income ({r})')
    r=E(pg,"(()=>{const o=[];S.buildings.sawmill.on=false;o.push(advFix('planks').kind);S.buildings.sawmill.on=true;const l=S.buildings.sawmill.lvl;S.buildings.sawmill.lvl=0;o.push(advFix('planks').kind);S.buildings.sawmill.lvl=l;"
          "const pl=S.buildings.plymill.lvl,rs=S.research.plywood;S.buildings.plymill.lvl=0;S.research.plywood=0;o.push(advFix('plywood').kind);S.research.plywood=rs;S.buildings.plymill.lvl=pl;"
          "let L=0;for(let i=1;i<400;i++){S.buildings.sawmill.lvl=i;if(wsBlocked('sawmill')){L=i;break;}}o.push(L?advFix('planks').kind:'nogate');S.buildings.sawmill.lvl=l;return o;})()")
    ok(r==['on','build','research','ws'],f'fix kinds: off → turn on, unbuilt → build, locked → research, capped → workstation ({r})')
    # ---- building sheet ----
    E(pg,SC_B); E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(700)
    ch=pg.locator('#bpChip').inner_text(); go=pg.locator('#bpShort .adv-go')
    ok('Waiting on Planks' in ch,f'building card says what it waits on ({ch})')
    ok(go.is_visible() and 'Upgrade the Sawmill' in go.inner_text(),'building card has a jump button to the fix')
    go.click(); pg.wait_for_timeout(700)
    ok(E(pg,"[TT.curSheet,TT.sheetBld,scene.advPing&&scene.advPing.id]")==['bld','sawmill','sawmill'],'tapping it opens the Sawmill and pings it in the scene')
    E(pg,"closeSheet()"); E(pg,SC_A); E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(700)
    t=pg.locator('#bpShort').inner_text()
    ok('real fix is more logs' in t and 'Hire collectors' in t,f'chain explained on the card ({t[:160]!r})')
    pg.locator('#bpShort .adv-go').click(); pg.wait_for_timeout(500)
    ok(E(pg,'TT.curSheet')=='crew','…and its button opens the Crew sheet')
    E(pg,"closeSheet()")
    # ---- scene badges (desktop: short pill) ----
    E(pg,PILLSPY); E(pg,"TT.fitCamera(true);window._pl=[]"); pg.wait_for_timeout(500)
    r=E(pg,"window._pl.filter(t=>t.startsWith('⏳'))")
    ok(any('Planks' in x for x in r) and any('Logs' in x for x in r),f'desktop scene shows "⏳ waiting on" pills ({sorted(set(r))[:4]})')
    # ---- supply flow summary ----
    E(pg,SC_B); E(pg,"toggleFlow(true)"); pg.wait_for_timeout(900)
    lg=pg.locator('#flowLegend').inner_text()
    ok('Top bottlenecks' in lg and 'Planks' in lg and 'Upgrade the Sawmill' in lg,f'Supply Flow lists the top bottlenecks ({lg[:200]!r})')
    E(pg,"window._row=document.querySelector('#flowLegend .adv-row')"); 
    for i in range(3): E(pg,"S.res.logs=1e9;tick(.5,false)"); pg.wait_for_timeout(400)
    ok(E(pg,"window._row===document.querySelector('#flowLegend .adv-row')&&window._row.isConnected"),'summary rows stay the same nodes while the numbers update (taps never miss)')
    pg.locator('#flowLegend .adv-row').first.click(); pg.wait_for_timeout(700)
    ok(E(pg,"[TT.curSheet,TT.sheetBld]")==['bld','sawmill'],'tapping a bottleneck jumps to the building to upgrade')
    E(pg,"closeSheet();for(const b of BUILDINGS) S.buildings[b.id].lvl=0;S.buildings.sawmill.lvl=1;S.res.logs=1e9;for(let i=0;i<10;i++) tick(1,false);advList(true)"); pg.wait_for_timeout(900)
    ok('No bottlenecks' in pg.locator('#flowLegend').inner_text(),'a fed factory says so')
    E(pg,"toggleFlow(false)")
    # ---- old save: renamed upgrade/research keep their effects ----
    ctx.close()
    sv=json.dumps({"version":"2.28.1","coins":10,"upgrades":{"logistics":1},"research":{"market":1,"logistics":1}})
    ctx,pg=page(tag='save:',init=CLEAR+f'if(!sessionStorage.getItem("_s")){{sessionStorage.setItem("_s","1");localStorage.setItem("timberTycoon_save_v1",{json.dumps(sv)});}}')
    r=E(pg,"(()=>{const a=computeMods(),u=S.upgrades.logistics,rs=S.research.logistics;S.upgrades.logistics=0;S.research.logistics=0;const b=computeMods();S.upgrades.logistics=u;S.research.logistics=rs;return [upLvl('logistics'),!!rs,a.bldAll/b.bldAll,a.trade/b.trade];})()")
    ok(r[0]==1 and r[1] and abs(r[2]-2)<1e-9 and abs(r[3]-1.2)<1e-9,f'old save keeps Global Expansion (×2) and Trade Routes (+20 %) under the old ids ({r})')
    ctx.close()
    # ---- phones ----
    for dev in ['iPhone 13','Pixel 7']:
        tag=dev.split()[0]
        ctx,pg=page(dev,tag+': '); E(pg,QUIET); pg.wait_for_timeout(300)
        E(pg,"closeSheet();TT.fitCamera(true)"); pg.wait_for_timeout(500)
        r=E(pg,"""(()=>{const s=w2s(...P(DOCK.ci,DOCK.cj,0)),lt=DOCK.top?w2s(DOCK.top[0],DOCK.top[1]):s,[tb,bb]=barH(),W=innerWidth,H=innerHeight;
          const fabs=[...document.querySelectorAll('.fab,#attnBtn,#jumpBtn')].map(e=>e.getBoundingClientRect()).filter(q=>q.width);
          const under=fabs.some(q=>lt[0]>q.left-4&&lt[0]<q.right+4&&lt[1]>q.top-4&&lt[1]<q.bottom+4);
          const lots=BUILDINGS.filter(b=>!b.tech&&!b.premium&&!['beamsaw','glulam'].includes(b.id)).map(b=>{const L=LOTS[b.id],q=w2s(...P(L.ci,L.cj,0));return q[0]>0&&q[0]<W&&q[1]>tb&&q[1]<H-bb;});
          return {dock:s.map(Math.round),label:lt.map(Math.round),inView:s[0]>10&&s[0]<W-10&&s[1]>tb&&s[1]<H-bb,under,lots:lots.every(x=>x)};})()""")
        ok(r['inView'] and not r['under'] and r['lots'],f'{tag}: fit view frames every lot and the Shipping dock, clear of the side buttons ({r})')
        # calm phone badges: icons, not pills
        E(pg,SC_B); E(pg,PILLSPY); E(pg,"TT.fitCamera(true);window._pl=[]"); pg.wait_for_timeout(500)
        r=E(pg,"window._pl.filter(t=>t.startsWith('⏳'))")
        ok(r==[],f'{tag}: phone scene uses quiet icon badges, no text pills ({r[:3]})')
        E(pg,"toggleFlow(true)"); pg.wait_for_timeout(900)
        q=E(pg,"(()=>{const l=document.getElementById('flowLegend').getBoundingClientRect(),r=[...document.querySelectorAll('#flowLegend .adv-row')].map(e=>e.getBoundingClientRect());return {l:[l.left,l.right],w:innerWidth,rows:r.map(x=>Math.round(x.height))};})()")
        ok(q['l'][0]>=0 and q['l'][1]<=q['w'] and q['rows'] and min(q['rows'])>=34 and len(q['rows'])<=2,f'{tag}: bottleneck list fits the screen, ≤2 rows, finger-sized ({q})')
        lg=pg.locator('#flowLegend .adv-row').first.inner_text()
        ok('Sawmill' in lg and 'Upgrade the' not in lg,f'{tag}: compact row label on phones ({lg!r})')
        pg.locator('#flowLegend .adv-row').first.tap(); pg.wait_for_timeout(800)
        ok(E(pg,"[TT.curSheet,TT.sheetBld]")==['bld','sawmill'],f'{tag}: tapping the row jumps to the Sawmill')
        E(pg,"toggleFlow(false);closeSheet()"); E(pg,SC_B); E(pg,"TT.openSheet('bld','carpentry')"); pg.wait_for_timeout(800)
        g=pg.locator('#bpShort .adv-go'); bb=g.bounding_box() if g.count() else None
        ok(bb and bb['height']>=36 and bb['x']>=0 and bb['x']+bb['width']<=E(pg,'innerWidth'),f'{tag}: sheet fix button is finger-sized and on screen ({bb})')
        g.tap(); pg.wait_for_timeout(800)
        ok(E(pg,"TT.sheetBld")=='sawmill',f'{tag}: tapping it jumps to the Sawmill')
        pg.screenshot(path=f'/tmp/v229-{tag}.png')
        ctx.close()
    ok(not errs,f'no console errors ({errs[:3]})')
    b.close()
print('FAILS',FAILS); sys.exit(1 if FAILS else 0)
