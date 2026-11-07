# v2.48 calm advisor badges on phones (maintenance item 8 part 3). At the late-game phone fit zoom, spare-stock
# and mild "waiting on X" badges hide; only the worst badges of the top bottleneck stay (at most 3). Hover / the open
# sheet still shows a badge. Desktop, the early game, a zoomed-in phone and Settings → Scene labels Always are unchanged.
# Supply Flow and the building-sheet chip stay as they are. v2.47 + damaged saves load. iPhone 13, Pixel 7, landscape.
from playwright.sync_api import sync_playwright
import sys,os,json,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=48;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
LATE='''(()=>{const T=window.toast;window.toast=()=>{};if(S.ob) S.ob.st='skip';S.coins=1e16;S.totalEarned=1e16;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,40);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',25);for(const b of ['atelier','parquet','cabinetry','showroom','framer']) TT.buyBuilding(b,14);
  S.coins=1e18;S.buildings.panelpress.lvl=Math.max(8,S.buildings.panelpress.lvl||0);S.buildings.panelpress.on=true;
  S.buildings.decorstudio.lvl=Math.max(8,S.buildings.decorstudio.lvl||0);S.buildings.decorstudio.on=true;
  TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();S.playTime=6000;S.time=6000;S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.prefs.dcAll=false;S.wx.next=1e15;checkAch();for(const k in achFresh) delete achFresh[k];
  M=computeMods();TT.simulate(10);TT.render();document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());window.toast=T;if(typeof ntClear==='function'){ntClear();NT.log.length=0;}if(typeof closeSheet==='function') closeSheet();})()'''
# Keeps a fixed mix of waits alive across ticks: one big logs bottleneck, one small chips bottleneck, a mild wait, two spare lines.
HOLD=r'''(()=>{if(window.__badges) return;
  window.__forceWaits=function(){if(!window.__arm) return;
    for(const b of BUILDINGS){const st=S.buildings[b.id];if(!st||!st.lvl||!st.on) continue;const sp=(bstat[b.id]&&bstat[b.id].speed)||bSpeed(b.id)||1;bstat[b.id]={f:1,lim:null,speed:sp,fs:1,full:false};}
    const put=(id,fs,lim,spd)=>{const st=S.buildings[id];if(!st||!st.lvl) return;st.on=true;bstat[id]={f:fs,lim,speed:spd,fs,full:false};};
    put('sawmill',0.05,'logs',400);put('kiln',0.12,'logs',400);put('peeler',0.18,'logs',400);put('beamsaw',0.22,'logs',400);
    put('carpentry',0.02,'planks',400);put('furniture',0.08,'planks',400);put('glulam',0.80,'beams',80);
    put('paper',0.04,'chips',1);put('panelpress',0.15,'veneer',40);put('decorstudio',0.25,'plywood',40);};
  const orig=tick;tick=function(dt,off){const r=orig.apply(this,arguments);try{__forceWaits();}catch(e){}return r;};
  const draw=advBadge;window.__bn={n:0,skip:0};
  advBadge=function(){const a=scene.dcAdv||0;const r=draw.apply(this,arguments);if(r) __bn.n++;else if((scene.dcAdv||0)!==a) __bn.skip++;return r;};
  window.__badges=function(){__forceWaits();advC.t=-1;scene._acT=-1;scene.hover=null;try{sheetBld=null;}catch(e){}
    const ctx=document.querySelector('canvas').getContext('2d');
    const ids=['sawmill','kiln','peeler','beamsaw','carpentry','furniture','glulam','paper','panelpress','decorstudio'];
    const shown={};for(const id of ids) shown[id]=!!draw(ctx,id,12,12,scene.t||0);
    const L=advList(true);scene.hover='panelpress';const hover=!!draw(ctx,'panelpress',12,12,scene.t||0);scene.hover=null;
    let sel=null;try{sheetBld='glulam';sel=!!draw(ctx,'glulam',12,12,scene.t||0);sheetBld=null;}catch(e){sel=String(e);}
    const waits={};for(const id of ids){const w=advWait(id);if(w) waits[id]={fs:+w.fs.toFixed(3),bad:!!w.bad,spare:!!w.spare,k:w.k};}
    const snap=JSON.stringify([S.coins,BUILDINGS.map(b=>[b.id,S.buildings[b.id].lvl,!!S.buildings[b.id].on]),S.prefs&&S.prefs.dcAll]);
    return {dc:!!dcOn(),shown,hover,sel,adv:scene.dcAdv|0,hid:scene.dcHid|0,waits,snap,
      top:L[0]?{spare:!!L[0].spare,k:L[0].k,kind:L[0].fix&&L[0].fix.kind,ids:L[0].users.map(u=>u.id)}:null,
      chip:advChip('carpentry')||'',spareChip:advChip('panelpress')||'',hint:advHintHtml('carpentry').indexOf('data-adv')>=0,
      rows:(advRowsData().L||[]).length,built:BUILDINGS.filter(b=>S.buildings[b.id].lvl>0).length};};
})()'''
KEEP=['carpentry','sawmill','furniture']
HIDE=['kiln','peeler','beamsaw','glulam','paper','panelpress','decorstudio']
FXC="(()=>{const f=document.getElementById('fxLayer');if(f) f.innerHTML='';if(window.scene){if(scene.particles) scene.particles.length=0;if(scene.floats) scene.floats.length=0;scene.msFlash=null;}if(typeof ntClear==='function') ntClear();document.querySelectorAll('.toast').forEach(t=>t.remove());})()"
def snap(pg,name):
    E(pg,FXC); pg.wait_for_timeout(500); E(pg,FXC); pg.screenshot(path=shot_path(name))
def arm(pg):
    E(pg,HOLD); E(pg,'closeSheet&&closeSheet();window.__arm=true;window.__bn.n=0;window.__bn.skip=0;__forceWaits();')
def touch_at(pg,x,y):
    cdp=pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
def dbl(pg):
    spots=E(pg,'''(()=>{const [tb,bb]=barH(),o=[];for(let y=tb+8;y<innerHeight-bb-8;y+=20)for(let x=10;x<innerWidth-10;x+=20){const h=hitTest(x,y);if(h&&h.type==="none"){o.push([Math.round(x),Math.round(y)]);if(o.length>=6)return o;}}return o;})()''')
    before=E(pg,'GI.dbl')
    for s in (spots or [[E(pg,'innerWidth')/2,E(pg,'innerHeight')/2]]):
        touch_at(pg,s[0],s[1]); pg.wait_for_timeout(70); touch_at(pg,s[0],s[1]); pg.wait_for_timeout(200)
        if E(pg,'GI.dbl')>before: return True
    return False
def expect(r,calm,where):
    ok(r['built']>=12,f'{where}: late game ({r["built"]} buildings)')
    top=r['top'] or {}
    ok(top.get('kind')=='crew' and not top.get('spare') and 'carpentry' in (top.get('ids') or []) and 'paper' not in (top.get('ids') or []) and 'panelpress' not in (top.get('ids') or []),
       f'{where}: top bottleneck is the logs group, not spare or the small chips wait ({top})')
    w=r['waits']
    ok(w.get('glulam',{}).get('bad') is False and w.get('panelpress',{}).get('spare') is True and w.get('decorstudio',{}).get('spare') is True and w.get('carpentry',{}).get('bad') is True,
       f'{where}: forced mild / spare / bad waits ({w})')
    if calm:
        ok(r['dc'] is True,f'{where}: dcOn at fit')
        ok(all(r['shown'].get(i) for i in KEEP) and not any(r['shown'].get(i) for i in HIDE),
           f'{where}: only the 3 worst badges of the top bottleneck ({r["shown"]})')
        ok(r['hover'] is True and r['sel'] is True,f'{where}: hover and the open sheet still show a badge ({r["hover"]}, {r["sel"]})')
        ok(r['adv']>=len(HIDE),f'{where}: skipped-badge counter ({r["adv"]})')
    else:
        ok(r['dc'] is False,f'{where}: calm mode off')
        ok(all(r['shown'].get(i) for i in KEEP+HIDE),f'{where}: every forced badge still shows ({r["shown"]})')
    ok('Waiting on' in r['chip'] and 'spare' in r['spareChip'].lower() and r['hint'] and r['rows']>=2,
       f'{where}: sheet chip, spare chip and the full bottleneck list stay ({r["chip"]!r}, rows {r["rows"]})')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR,url=URL,vp=None):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block',has_touch=bool(vp),is_mobile=bool(vp))
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); pg.wait_for_timeout(1300); return pg
    # ---------- before: v2.47 draws a badge on every forced wait ----------
    if os.path.exists(ROOT+'/releases/v2.47/index.html'):
        pg=page('iPhone 13',url=BASE+'releases/v2.47/index.html'); E(pg,LATE); E(pg,HOLD); E(pg,'window.__arm=true;__forceWaits();fitCamera(true)')
        pg.wait_for_timeout(700); live=E(pg,'window.__bn')
        ok(live and live['n']>=8 and live['skip']==0,f'v2.47 (before): every forced badge still draws ({live})')
        snap(pg,'mobile-before.png'); pg.close()
    # ---------- desktop: unchanged, including Supply Flow ----------
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))==(2,48),f"VERSION is 2.48 ({E(pg,'TT.VERSION')})")
    m=re.search(r"timber-tycoon-v([\d.]+)'",open(ROOT+'/sw.js').read()); ok(m and m.group(1)=='2.48','sw cache is v2.48')
    html=open(ROOT+'/index.html').read(); ok('js/advisor.js' in html and 'js/declutter.js' in html,'index.html loads advisor and declutter')
    ok('advCalmAllow' in open(ROOT+'/js/advisor.js').read(),'the gate lives next to advBadge')
    note=E(pg,"document.querySelector('#dcSet small').textContent")
    ok('waiting badges' in note and 'zoom in' in note,f'settings copy mentions waiting badges ({note})')
    E(pg,LATE); arm(pg); E(pg,'fitCamera(true)'); pg.wait_for_timeout(600)
    live=E(pg,'window.__bn'); ok(live['n']>=4 and live['skip']==0,f'desktop late game: calm mode draws every badge ({live})')
    r=E(pg,'__badges()'); expect(r,False,'desktop')
    E(pg,"toggleFlow(true)"); pg.wait_for_timeout(700)
    lg=pg.locator('#flowLegend').inner_text()
    ok('Top bottlenecks' in lg and 'Logs' in lg and 'collectors' in lg.lower(),f'Supply Flow still lists the top bottlenecks ({lg[:220]!r})')
    E(pg,"toggleFlow(false);fitCamera(true)"); pg.wait_for_timeout(300)
    pg.mouse.move(640,400); pg.mouse.wheel(0,-300); pg.wait_for_timeout(300)
    ok(E(pg,'dcOn()') is False and all(E(pg,'__badges()').get('shown',{}).get(i) for i in KEEP+HIDE),'desktop: wheel zoom never hides badges')
    E(pg,'fitCamera(true)'); pg.wait_for_timeout(350); snap(pg,'desktop.png'); pg.close()
    # ---------- phones ----------
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); vw=E(pg,'innerWidth')
        ok(E(pg,'dcOn()') is False,f'{dev}: fresh game is not calm')
        early=E(pg,'''(()=>{for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
          S.buildings.sawmill.lvl=4;S.buildings.carpentry.lvl=4;S.buildings.panelpress.lvl=4;S.premium.lvl=0;
          bstat.sawmill={f:.05,lim:"logs",speed:20,fs:.05,full:false};bstat.carpentry={f:.8,lim:"planks",speed:20,fs:.8,full:false};bstat.panelpress={f:.2,lim:"veneer",speed:20,fs:.2,full:false};
          advC.t=-1;scene._acT=-1;const ctx=document.querySelector("canvas").getContext("2d");const ids=["sawmill","carpentry","panelpress"];
          const shown={};for(const id of ids) shown[id]=!!advBadge(ctx,id,12,12,scene.t||0);
          return {dc:!!dcOn(),built:BUILDINGS.filter(b=>S.buildings[b.id].lvl>0).length,shown,adv:scene.dcAdv||0};})()''')
        ok(early['built']<12 and early['dc'] is False and all(early['shown'].values()) and early['adv']==0,
           f'{dev}: early game still shows bad, mild and spare badges ({early})')
        E(pg,LATE); arm(pg); E(pg,'fitCamera(true)'); pg.wait_for_timeout(700)
        live=E(pg,'window.__bn')
        ok(live['skip']>0 and live['n']>0 and live['n']<live['skip'],f'{dev}: the scene draws fewer badges than it hides ({live})')
        if dev=='iPhone 13': snap(pg,'mobile.png'); snap(pg,'mobile-badges.png')
        same=E(pg,'''(()=>{const a=JSON.stringify([S.coins,BUILDINGS.map(b=>[b.id,S.buildings[b.id].lvl,!!S.buildings[b.id].on])]);const r=__badges();
          const c=JSON.stringify([S.coins,BUILDINGS.map(b=>[b.id,S.buildings[b.id].lvl,!!S.buildings[b.id].on])]);return {same:a===c,r};})()''')
        ok(same['same'],f'{dev}: drawing badges writes no game state')
        expect(same['r'],True,dev)
        # explicit double-tap on empty ground zooms in and brings mild / spare badges back
        E(pg,'closeSheet&&closeSheet()'); pg.wait_for_timeout(200)
        ok(dbl(pg),f'{dev}: double-tap on empty ground')
        pg.wait_for_timeout(900)
        z=E(pg,'scene.cam.z/scene.cam.fitZ'); rz=E(pg,'__badges()')
        ok(z>1.35 and rz['dc'] is False and all(rz['shown'].get(i) for i in HIDE),
           f'{dev}: zoom ×{z:.2f} brings mild and spare badges back')
        E(pg,'fitCamera(true)'); pg.wait_for_timeout(400)
        ok(E(pg,'__badges()').get('dc') is True,f'{dev}: back to fit → calm again')
        # Settings → Always, saved across reload
        E(pg,"openSheet('set')"); pg.wait_for_timeout(400)
        btn=pg.locator('#dcSeg button[data-a="1"]'); btn.scroll_into_view_if_needed(); bx=btn.bounding_box()
        ok(bx and bx['height']>=36 and bx['x']+bx['width']<=vw+2,f'{dev}: Scene labels is a touch target ({bx and round(bx["height"])} px)')
        touch_at(pg,bx['x']+bx['width']/2,bx['y']+bx['height']/2); pg.wait_for_timeout(250)
        always=E(pg,'__badges()')
        ok(E(pg,'S.prefs.dcAll===true&&dcOn()===false') and all(always['shown'].get(i) for i in KEEP+HIDE),
           f'{dev}: Always shows every badge again')
        E(pg,'save(true)'); pg.reload(); pg.wait_for_timeout(1500); E(pg,HOLD)
        ok(E(pg,'S.prefs.dcAll===true'),f'{dev}: Always kept after reload')
        E(pg,"openSheet('set')"); pg.wait_for_timeout(300)
        btn=pg.locator('#dcSeg button[data-a="0"]'); btn.scroll_into_view_if_needed(); bx=btn.bounding_box()
        touch_at(pg,bx['x']+bx['width']/2,bx['y']+min(bx['height']/2,24)); pg.wait_for_timeout(250)
        ok(E(pg,'S.prefs.dcAll===false'),f'{dev}: tap Auto'); pg.close()
    # landscape phone
    pg=page(vp={'width':844,'height':390}); E(pg,LATE); arm(pg); E(pg,'fitCamera(true)'); pg.wait_for_timeout(600)
    rz=E(pg,'__badges()'); expect(rz,True,'landscape')
    live=E(pg,'window.__bn'); ok(live['skip']>0 and 0<live['n']<live['skip'],f'landscape: fewer badges on screen ({live})')
    pg.close()
    # ---------- saves ----------
    pg=page('iPhone 13'); E(pg,LATE)
    sv=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(S));o.version="2.47";delete o.prefs.dcAll;return JSON.stringify(o);})()'''); pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    ok(ver(E(pg,'S.version'))>=(2,48) and E(pg,'S.buildings.sawmill.lvl')>=40 and E(pg,'!S.prefs.dcAll') is True,'v2.47 save loads on Auto')
    pg.close()
    dmg=json.dumps(json.dumps({'version':'2.47','coins':100,'prefs':{'dcAll':'yes','autoFocus':True},'buildings':{'sawmill':{'lvl':3,'on':True}}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    ok(E(pg,"!('dcAll' in S.prefs)") and E(pg,'S.buildings.sawmill.lvl')==3,'damaged scene-label pref is dropped')
    pg.close()
    ok(not errs,'no console errors '+str(errs[:4])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
sys.exit(1 if FAILS else 0)
