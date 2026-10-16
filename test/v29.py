# v2.9 tests: mobile-first controls on emulated phones (iPhone 13 + Pixel 7, hasTouch, real CDP touch events):
# touch pan with inertia, rubber-band bounds, pinch zoom anchored at the midpoint, double-tap zoom, tap vs drag threshold,
# generous hit areas, quick-jump chips, needs-attention cycling, auto-focus, draggable sheet snap/close, sheet scroll not
# panning the scene, hold-to-repeat + Buy max, no page scroll/overscroll, compact HUD, 'More' overflow, landscape rail,
# haptics, PWA files, v2.8 save migration and pan/zoom render-path checks.
from playwright.sync_api import sync_playwright
import sys,os,json,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,URL
from _server import ver
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
MID='''(()=>{const S=TT.S;S.coins=5e7;S.totalEarned=6e8;TT.buyCollector("lumberjack",40);TT.buyCollector("chainsaw",15);
  for(const id of ["sawmill","chipper","kiln","carpentry","pellet","paper","furniture"]) TT.buyBuilding(id,12);S.coins=5e7;TT.rebuildAll();})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; bad=[]
    def watch(pg,tag):
        pg.on('console',lambda m: errs.append(f'{tag} {m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append(f'{tag} {e}'))
        pg.on('response',lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
    E=lambda pg,s: pg.evaluate(s)
    def device(name):
        d=dict(p.devices[name]); d.pop('default_browser_type',None); return d
    class Touch:
        def __init__(s,pg,ctx): s.pg=pg; s.c=ctx.new_cdp_session(pg)
        def ev(s,t,pts): s.c.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
        def tap(s,x,y,hold=40):
            s.ev('touchStart',[(x,y)]); s.pg.wait_for_timeout(hold); s.ev('touchEnd',[])
        def drag(s,x0,y0,x1,y1,steps=10,ms=16,end=True,pause=0):
            s.ev('touchStart',[(x0,y0)])
            for k in range(1,steps+1): s.ev('touchMove',[(x0+(x1-x0)*k/steps,y0+(y1-y0)*k/steps)]); s.pg.wait_for_timeout(ms)
            if pause: s.pg.wait_for_timeout(pause)
            if end: s.ev('touchEnd',[])
        def pinch(s,cx,cy,d0,d1,steps=12,ms=16,dx=0,dy=0):
            pts=lambda d,k:[(cx-d/2+dx*k,cy+dy*k),(cx+d/2+dx*k,cy+dy*k)]
            s.ev('touchStart',pts(d0,0)); s.pg.wait_for_timeout(20)
            for k in range(1,steps+1): s.ev('touchMove',pts(d0+(d1-d0)*k/steps,k/steps)); s.pg.wait_for_timeout(ms)
            s.ev('touchEnd',[])
    cam=lambda pg: E(pg,'[TT.cam.x,TT.cam.y,TT.cam.z]')
    def settle(pg,ms=900): pg.wait_for_timeout(ms)
    def empty_point(pg):
        return E(pg,'''(()=>{const [t,b]=TT.viewBand();for(let y=t+40;y<b-20;y+=17) for(let x=40;x<innerWidth-40;x+=17){const h=TT.hitTest(x,y);
          if(h.type==='none'&&[[-30,0],[30,0],[0,-30],[0,30]].every(([a,c])=>TT.hitTest(x+a,y+c).type==='none')) return [x,y];}return null;})()''')

    for DEV in ['iPhone 13','Pixel 7']:
        tag=DEV.split()[0]
        ctx=b.new_context(**device(DEV)); pg=ctx.new_page(); watch(pg,tag)
        pg.goto(URL); pg.wait_for_timeout(1200); E(pg,'document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove())')
        T=Touch(pg,ctx); W,H=E(pg,'[innerWidth,innerHeight]')
        ok(E(pg,'navigator.maxTouchPoints')>0 and E(pg,"matchMedia('(pointer:coarse)').matches"),f'{tag}: touch emulation active ({W}x{H})')
        # --- page guards ---
        g=E(pg,'''(()=>{const cs=e=>getComputedStyle(e);return {cv:cs(TT.scene.canvas).touchAction,html:cs(document.documentElement).overscrollBehaviorY,body:cs(document.body).overscrollBehaviorY,
          vp:document.querySelector('meta[name=viewport]').content,sel:cs(document.body).userSelect||cs(document.body).webkitUserSelect,shb:cs(document.getElementById('shBody')).touchAction}})()''')
        ok(g['cv']=='none' and g['html']=='none' and g['body']=='none',f'{tag}: canvas touch-action:none, no overscroll ({g["cv"]},{g["html"]})')
        ok('viewport-fit=cover' in g['vp'] and 'user-scalable=no' in g['vp'] and g['sel']=='none' and g['shb']=='pan-y',f'{tag}: viewport-fit=cover, no zoom, no text selection, sheet body pan-y')
        ok(E(pg,"getComputedStyle(document.getElementById('topbar')).paddingTop").endswith('px'),'safe-area padding resolves')
        # --- compact HUD ---
        vis=E(pg,"[...document.querySelectorAll('#topbar .hc')].filter(e=>e.offsetParent).length")
        ok(vis==3,f'{tag}: compact HUD shows 3 numbers ({vis})')
        T.tap(*E(pg,"(()=>{const r=document.getElementById('hudX').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(250)
        ok(E(pg,"document.body.classList.contains('hud-x')&&!!document.querySelector('.hc.seeds').offsetParent&&!!document.getElementById('wxChip').offsetParent"),f'{tag}: tap expands the HUD (seeds + weather)')
        E(pg,'TT.toggleHud(false)')
        # --- bottom bar: 5 thumb targets + More ---
        bb=E(pg,"[...document.querySelectorAll('#bottombar .bb')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,r.bottom,e.dataset.s]})")
        ok(len(bb)==5 and min(x[0] for x in bb)>=48 and min(x[1] for x in bb)>=48 and bb[-1][3]=='more' and max(x[2] for x in bb)<=H+1,f'{tag}: 5 bottom buttons ≥48px incl. More ({[(round(a),round(c)) for a,c,_,_ in bb]})')
        T.tap(*E(pg,"(()=>{const r=document.getElementById('bbMore').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(400)
        tiles=E(pg,"[...document.querySelectorAll('#moreGrid .mtile')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.s,r.height]})")
        ok(E(pg,'TT.curSheet')=='more' and {'staff','ach','co','set'}<=set(t[0] for t in tiles) and min(t[1] for t in tiles)>=48,f'{tag}: More sheet lists the overflow ({[t[0] for t in tiles]})')
        T.tap(*E(pg,"(()=>{const r=document.querySelector('#moreGrid .mtile[data-s=set]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(300)
        ok(E(pg,'TT.curSheet')=='set' and E(pg,"document.getElementById('bbMore').classList.contains('on')"),f'{tag}: More → Settings opens, More stays highlighted')
        ok(E(pg,"!!document.getElementById('afToggle')&&!!document.getElementById('hapToggle')"),f'{tag}: auto-focus + haptics settings')
        E(pg,'TT.closeSheet()')
        E(pg,MID); E(pg,'TT.fitCamera(true)'); settle(pg,500); E(pg,'document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove())')
        # --- tap vs drag ---
        pt=E(pg,'TT.lotScreen("kiln")'); T.tap(*pt); pg.wait_for_timeout(250)
        ok(E(pg,'TT.curSheet')=='bld' and E(pg,'TT.sheetBld')=='kiln',f'{tag}: touch tap on a building opens it')
        E(pg,'TT.closeSheet();TT.fitCamera(true)'); settle(pg,300)
        pt=E(pg,'TT.lotScreen("kiln")'); T.drag(pt[0],pt[1],pt[0]+6,pt[1]+4,steps=3); pg.wait_for_timeout(250)
        ok(E(pg,'TT.sheetBld')=='kiln',f'{tag}: a 7px wobble still counts as a tap')
        E(pg,'TT.closeSheet();TT.fitCamera(true)'); settle(pg,300); c0=cam(pg)
        pt=E(pg,'TT.lotScreen("kiln")'); T.drag(pt[0],pt[1],pt[0]+60,pt[1]+30,steps=10,ms=30,pause=120); pg.wait_for_timeout(250)
        c1=cam(pg)
        ok(E(pg,'TT.curSheet') is None and abs(c1[0]-c0[0])>20,f'{tag}: dragging from a building pans instead of opening it (dx={c1[0]-c0[0]:.0f})')
        # generous hit area: just outside the polygon still hits the building
        e=E(pg,'''(()=>{const L=TT.LOTS.kiln;let x0=1e9,x1=-1e9,y0=1e9;for(const [x,y] of L.hit){const s=TT.w2s(x,y);x0=Math.min(x0,s[0]);x1=Math.max(x1,s[0]);y0=Math.min(y0,s[1]);}
          const lf=L.hit.map(p=>TT.w2s(p[0],p[1])).reduce((a,b)=>a[0]<b[0]?a:b);return [TT.hitTest(lf[0]-7,lf[1]),TT.hitTest(lf[0]-40,lf[1]).id||null];})()''')
        ok(e[0].get('id')=='kiln' and e[1]!='kiln',f'{tag}: a tap 7px outside the kiln outline still hits it, 40px does not ({e})')
        # --- pan with inertia ---
        E(pg,'TT.fitCamera(true);TT.cam.tz=TT.cam.z=TT.cam.fitZ*1.6;TT.cam.tx=TT.cam.x;TT.cam.ty=TT.cam.y'); settle(pg,300)
        c0=cam(pg); T.drag(W/2+90,H/2,W/2-90,H/2,steps=6,ms=12); cr=cam(pg); pg.wait_for_timeout(250); cm=cam(pg); pg.wait_for_timeout(1800); ce=cam(pg)
        ok(cr[0]>c0[0]+40,f'{tag}: one-finger pan follows the finger (dx={cr[0]-c0[0]:.0f})')
        ok(cm[0]>cr[0]+5 and ce[0]>=cm[0]-0.5,f'{tag}: momentum keeps gliding after release ({cr[0]:.0f}→{cm[0]:.0f}→{ce[0]:.0f})')
        ok(E(pg,'!TT.cam.vx&&!TT.cam.vy'),f'{tag}: friction stops the glide')
        # slow drag + hold still before lifting → no fling
        c0=cam(pg); T.drag(W/2,H/2,W/2-60,H/2,steps=8,ms=20,pause=150); c1=cam(pg); pg.wait_for_timeout(400); c2=cam(pg)
        ok(abs(c2[0]-c1[0])<2,f'{tag}: no fling after holding still ({c2[0]-c1[0]:.1f})')
        # --- rubber band soft bounds ---
        E(pg,'TT.fitCamera(true);TT.cam.tz=TT.cam.z=TT.cam.fitZ*2;'); settle(pg,400)
        lim=E(pg,'TT.camLimits()'); E(pg,'TT.cam.x=TT.cam.tx=TT.camLimits().x0+1')
        T.drag(60,H/2,W-40,H/2,steps=14,ms=16,end=False,pause=60)
        over=E(pg,'TT.camLimits().x0-TT.cam.x'); fing=(W-100)/E(pg,'TT.cam.z')
        T.ev('touchEnd',[]); pg.wait_for_timeout(1200)
        ok(0<over<fing*.6,f'{tag}: rubber band resists past the edge (over {over:.0f} < finger {fing:.0f})')
        ok(E(pg,'TT.cam.x>=TT.camLimits().x0-0.5'),f'{tag}: springs back inside the world bounds')
        # --- pinch zoom anchored at the midpoint ---
        E(pg,'TT.fitCamera(true)'); settle(pg,700)
        mx,my=W*.4,H*.45; w0=E(pg,f'TT.s2w({mx},{my})'); z0=E(pg,'TT.cam.z')
        T.pinch(mx,my,80,200); pg.wait_for_timeout(100)
        z1=E(pg,'TT.cam.z'); s=E(pg,f'TT.w2s({w0[0]},{w0[1]})')
        ok(z1>z0*2.0,f'{tag}: pinch out zooms in ({z0:.2f}→{z1:.2f})')
        ok(math.hypot(s[0]-mx,s[1]-my)<6,f'{tag}: pinch anchored at the midpoint (drift {math.hypot(s[0]-mx,s[1]-my):.1f}px)')
        T.pinch(mx,my,240,120); pg.wait_for_timeout(500)
        ok(E(pg,'TT.cam.z')<z1*.7,f'{tag}: pinch in zooms out')
        T.pinch(mx,my,300,20,steps=16); pg.wait_for_timeout(900)
        ok(abs(E(pg,'TT.cam.z')-E(pg,'TT.cam.minZ'))<1e-3,f'{tag}: over-pinch springs back to the zoom limit')
        ok(E(pg,'TT.SPR.scaled')>0,f'{tag}: zooming blits cached sprites scaled (no vector redraw path)')
        # --- double tap on open ground ---
        E(pg,'TT.closeSheet();TT.fitCamera(true)'); settle(pg,800); ep=empty_point(pg); z0=E(pg,'TT.cam.z')
        if ep:
            T.tap(*ep); pg.wait_for_timeout(120); T.tap(*ep); pg.wait_for_timeout(700)
            ok(E(pg,'TT.cam.z')>z0*1.6 and E(pg,'TT.curSheet') is None,f'{tag}: double-tap on open ground zooms in ({z0:.2f}→{E(pg,"TT.cam.z"):.2f})')
            T.tap(*ep); pg.wait_for_timeout(120); T.tap(*ep); pg.wait_for_timeout(800)
            ok(E(pg,'TT.cam.z')<z0*1.6,f'{tag}: double-tap again zooms back out')
        else: ok(False,f'{tag}: found empty ground for double-tap')
        # --- quick-jump chips ---
        E(pg,'TT.fitCamera(true)'); settle(pg,700)
        T.tap(*E(pg,"(()=>{const r=document.getElementById('jumpBtn').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(350)
        chips=E(pg,"[...document.querySelectorAll('#jumpBar .jchip')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.j,r.height,r.bottom]})")
        ok([c[0] for c in chips if c[0] not in ('power','build')]==['forest','yard','factory','prem','harbor','rnd','dock'] and min(c[1] for c in chips)>=44 and E(pg,"document.body.classList.contains('jump-on')"),f'{tag}: quick-jump chips shown ({[c[0] for c in chips]})')
        bbtop=E(pg,"document.getElementById('bottombar').getBoundingClientRect().top")
        ok(max(c[2] for c in chips)<=bbtop,f'{tag}: chips sit above the bottom bar')
        # scroll the chip row to Dock and tap it
        E(pg,"document.querySelector('#jumpBar .jchip[data-j=dock]').scrollIntoView({inline:'center'})"); pg.wait_for_timeout(100)
        dp=E(pg,"(()=>{const r=document.querySelector('#jumpBar .jchip[data-j=dock]').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        T.tap(*dp); pg.wait_for_timeout(1300)
        d=E(pg,'(()=>{const p=TT.P(TT.DOCK.ci,TT.DOCK.cj,20);const s=TT.w2s(p[0],p[1]);const [t,b]=TT.viewBand();return [s[0],s[1],t,b]})()')
        ok(abs(d[0]-W/2)<W*.2 and d[2]<d[1]<d[3],f'{tag}: Dock chip flies the camera to the dock ({d[0]:.0f},{d[1]:.0f})')
        for j in ['forest','factory','yard']:
            E(pg,f'TT.jumpTo("{j}")'); pg.wait_for_timeout(1000)
        ok(E(pg,'!TT.cam.fly')and E(pg,'TT.scene.lastJump')=='yard',f'{tag}: every chip flies and settles')
        E(pg,'TT.toggleJump(false)')
        # --- needs attention ---
        E(pg,'TT.S.buildings.paper.on=true;TT.S.res.pellets=0;TT.S.buildings.pellet.on=false;TT.tick(0.5,false);TT.render()')
        L=E(pg,'TT.attentionList().map(a=>a.id+":"+a.k)')
        ok(len(L)>0 and E(pg,"document.getElementById('attnN').textContent")==str(len(L)) if len(L)<100 else True,f'{tag}: attention badge counts problems ({L[:4]})')
        E(pg,'TT.fitCamera(true)'); settle(pg,500)
        T.tap(*E(pg,"(()=>{const r=document.getElementById('attnBtn').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(900)
        first=L[0].split(':')[0]
        ok(E(pg,'TT.curSheet')=='bld' and E(pg,'TT.sheetBld')==first,f'{tag}: attention button opens the first problem ({first})')
        if len(L)>1:
            E(pg,'TT.nextAttention()'); pg.wait_for_timeout(200)
            ok(E(pg,'TT.sheetBld')==L[1].split(':')[0],f'{tag}: …and cycles to the next one')
        # sheet prev/next fly the camera
        E(pg,'TT.openSheet("bld","sawmill")'); pg.wait_for_timeout(800); c0=cam(pg)
        T.tap(*E(pg,"(()=>{const r=document.getElementById('bpNext').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")); pg.wait_for_timeout(900)
        s=E(pg,'(()=>{const L=TT.LOTS[TT.sheetBld];const p=TT.P(L.ci,L.cj,30);const s=TT.w2s(p[0],p[1]);const [t,b]=TT.viewBand();return [TT.sheetBld,s[1],t,b]})()')
        ok(s[0]!='sawmill' and s[2]<s[1]<s[3],f'{tag}: › arrow goes to {s[0]} and frames it above the sheet')
        E(pg,'TT.closeSheet()')
        # --- auto-focus on events ---
        E(pg,'TT.fitCamera(true);TT.cam.x=TT.cam.tx=TT.camLimits().x0;TT.cam.y=TT.cam.ty=TT.camLimits().y0;TT.GI.touchedAt=0;TT.prefs().autoFocus=true'); settle(pg,200)
        E(pg,'TT.S.fires={};TT.startFire("chipper")'); pg.wait_for_timeout(1100)
        f=E(pg,'(()=>{const L=TT.LOTS.chipper;const p=TT.P(L.ci,L.cj,30);const s=TT.w2s(p[0],p[1]);return [s[0],s[1],TT.scene.lastAutoFocus]})()')
        ok(f[2]=='fire' and 0<f[0]<W and 0<f[1]<H,f'{tag}: auto-focus flies to a new fire ({f})')
        E(pg,'TT.S.fires={};TT.cam.x=TT.cam.tx=TT.camLimits().x0;TT.prefs().autoFocus=false;TT.scene.lastAutoFocus=null'); settle(pg,200); c0=cam(pg)
        E(pg,'TT.startFire("kiln")'); pg.wait_for_timeout(600)
        ok(abs(cam(pg)[0]-c0[0])<1,f'{tag}: auto-focus off keeps the camera still')
        E(pg,'TT.S.fires={};TT.prefs().autoFocus=true;TT.GI.touchedAt=performance.now()'); c0=cam(pg); E(pg,'TT.startFire("kiln")'); pg.wait_for_timeout(500)
        ok(abs(cam(pg)[0]-c0[0])<1,f'{tag}: no auto-focus right after the player touched the camera')
        E(pg,'TT.S.fires={}')
        # --- bottom sheet drag / snap / close ---
        E(pg,'TT.fitCamera(true);TT.openSheet("crew")'); pg.wait_for_timeout(500)
        sn=E(pg,'TT.shSnaps()'); h0=E(pg,"document.getElementById('sheet').getBoundingClientRect().height")
        ok(E(pg,'TT.SH.state')=='half' and h0<=sn['half']+2,f'{tag}: sheet opens half ({h0:.0f}px of {sn})')
        hp=E(pg,"(()=>{const r=document.getElementById('shHead').getBoundingClientRect();return [r.x+r.width*.4,r.y+r.height/2]})()")
        T.drag(hp[0],hp[1],hp[0],hp[1]-300,steps=10,ms=20,pause=60); pg.wait_for_timeout(400)
        h1=E(pg,"document.getElementById('sheet').getBoundingClientRect().height")
        ok(E(pg,'TT.SH.state')=='full' and abs(h1-sn['full'])<4,f'{tag}: drag up snaps to full ({h1:.0f}px)')
        tb=E(pg,"document.getElementById('topbar').getBoundingClientRect().bottom"); st=E(pg,"document.getElementById('sheet').getBoundingClientRect().top")
        ok(st>=tb-1,f'{tag}: full sheet stays below the HUD')
        hp=E(pg,"(()=>{const r=document.getElementById('shHead').getBoundingClientRect();return [r.x+r.width*.4,r.y+r.height/2]})()")
        T.drag(hp[0],hp[1],hp[0],hp[1]+200,steps=10,ms=25,pause=80); pg.wait_for_timeout(400)
        ok(E(pg,'TT.SH.state')=='half' and E(pg,'TT.curSheet')=='crew',f'{tag}: drag down from full snaps to half')
        hp=E(pg,"(()=>{const r=document.getElementById('shHead').getBoundingClientRect();return [r.x+r.width*.4,r.y+r.height/2]})()")
        T.drag(hp[0],hp[1],hp[0],hp[1]+260,steps=5,ms=10); pg.wait_for_timeout(500)
        ok(E(pg,'TT.curSheet') is None,f'{tag}: swipe down closes the sheet')
        # tap on the handle toggles half/full
        E(pg,'TT.openSheet("crew")'); pg.wait_for_timeout(400)
        hp=E(pg,"(()=>{const r=document.getElementById('shHead').getBoundingClientRect();return [r.x+r.width*.4,r.y+r.height/2]})()"); T.tap(*hp); pg.wait_for_timeout(350)
        ok(E(pg,'TT.SH.state')=='full',f'{tag}: tapping the sheet header expands it')
        # --- sheet scroll does not pan the scene / page ---
        c0=cam(pg); bp=E(pg,"(()=>{const r=document.getElementById('shBody').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height*.7]})()")
        T.drag(bp[0],bp[1],bp[0],bp[1]-260,steps=12,ms=16); pg.wait_for_timeout(600)
        st=E(pg,"document.getElementById('shBody').scrollTop"); c1=cam(pg)
        ok(st>40,f'{tag}: sheet content scrolls with a finger (scrollTop {st})')
        ok(max(abs(c1[i]-c0[i]) for i in range(3))<1e-6,f'{tag}: sheet scrolling does not pan the scene')
        ok(E(pg,'window.scrollY===0&&document.scrollingElement.scrollTop===0'),f'{tag}: page itself never scrolls')
        # pull-down at the top of the content drags the sheet (not the page / pull-to-refresh)
        E(pg,"document.getElementById('shBody').scrollTop=0"); pg.wait_for_timeout(100)
        T.drag(bp[0],bp[1]-100,bp[0],bp[1]+150,steps=6,ms=12); pg.wait_for_timeout(500)
        ok(E(pg,'TT.SH.state')!='full' or E(pg,'TT.curSheet') is None,f'{tag}: pulling content down at the top drags the sheet down')
        ok(E(pg,'window.scrollY===0'),f'{tag}: no pull-to-refresh / page overscroll')
        E(pg,'TT.closeSheet()')
        # canvas swipes never scroll the page either
        T.drag(W/2,H*.3,W/2,H*.8,steps=8,ms=12); pg.wait_for_timeout(300)
        ok(E(pg,'window.scrollY===0&&window.scrollX===0&&visualViewport.scale===1'),f'{tag}: no page scroll or browser zoom from scene gestures')
        # --- hold-to-repeat + Buy max ---
        E(pg,'TT.closeSheet();TT.setBuyMult(1);TT.S.coins=1e12;TT.openSheet("bld","sawmill")'); pg.wait_for_timeout(500)
        l0=E(pg,'TT.S.buildings.sawmill.lvl'); bp=E(pg,"(()=>{const r=document.getElementById('bpBuy').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.height]})()")
        ok(bp[2]>=44,f'{tag}: buy button is a big target ({bp[2]:.0f}px)')
        T.tap(bp[0],bp[1],hold=60); pg.wait_for_timeout(200); l1=E(pg,'TT.S.buildings.sawmill.lvl')
        ok(l1==l0+1,f'{tag}: a quick tap buys exactly one level ({l0}→{l1})')
        T.tap(bp[0],bp[1],hold=1600); pg.wait_for_timeout(250); l2=E(pg,'TT.S.buildings.sawmill.lvl')
        ok(l2>=l1+6,f'{tag}: holding the button repeats the purchase ({l1}→{l2})')
        pg.wait_for_timeout(400); ok(E(pg,'TT.S.buildings.sawmill.lvl')==l2,f'{tag}: repeating stops on release')
        n=E(pg,'(()=>{const b=TT.BUILDINGS.find(x=>x.id==="sawmill");return Math.floor(Math.log(TT.S.coins*(b.scale-1)/(b.cost*Math.pow(b.scale,TT.S.buildings.sawmill.lvl))+1)/Math.log(b.scale))})()')
        mp=E(pg,"(()=>{const r=document.getElementById('bpMax').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        ok(str(n) in E(pg,"document.getElementById('bpMax').textContent"),f'{tag}: Buy max shows +{n}')
        T.tap(*mp); pg.wait_for_timeout(250)
        ok(E(pg,'TT.S.buildings.sawmill.lvl')==l2+n,f'{tag}: Buy max buys {n} levels')
        # haptics
        E(pg,'TT.S.coins=1e15;TT.render();window.__vib=0;navigator.vibrate=()=>{window.__vib++;return true};TT.prefs().haptics=true'); T.tap(*mp); T.tap(bp[0],bp[1]); pg.wait_for_timeout(200)
        v1=E(pg,'window.__vib'); E(pg,'TT.prefs().haptics=false;window.__vib=0'); T.tap(bp[0],bp[1]); pg.wait_for_timeout(200)
        ok(v1>0 and E(pg,'window.__vib')==0,f'{tag}: haptic feedback on taps, off when disabled ({v1})')
        E(pg,'TT.prefs().haptics=true;TT.closeSheet()')
        # toasts never cover the bottom controls
        E(pg,'for(let i=0;i<4;i++) toast("Test toast number "+i+" with some longer text")'); pg.wait_for_timeout(300)
        tr=E(pg,"[...document.querySelectorAll('.toast')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().bottom)")
        lim=E(pg,"Math.min(document.getElementById('fabs').getBoundingClientRect().top,document.getElementById('bottombar').getBoundingClientRect().top)")
        ok(tr and max(tr)<lim and len(tr)<=2,f'{tag}: toasts stay clear of the bottom controls ({len(tr)} visible)')
        # --- pan render path: the ground layer is shifted, not redrawn, while panning ---
        E(pg,'document.querySelectorAll(".toast").forEach(t=>t.remove());TT.fitCamera(true)'); settle(pg,900)
        g0=E(pg,'TT.ground.builds'); d0=E(pg,'TT.SPR.direct')
        T.drag(W/2,H/2,W/2-120,H/2+60,steps=20,ms=16,pause=80); pg.wait_for_timeout(200)
        g1=E(pg,'TT.ground.builds'); d1=E(pg,'TT.SPR.direct')
        ok(g1-g0<=2,f'{tag}: panning re-uses the ground layer ({g1-g0} rebuilds over 20 frames)')
        ok(d1-d0<200,f'{tag}: panning hits the sprite caches ({d1-d0} direct draws)')
        ctx.close()

    # --- landscape phone ---
    ctx=b.new_context(**device('iPhone 13 landscape')); pg=ctx.new_page(); watch(pg,'land'); pg.goto(URL); pg.wait_for_timeout(1000)
    E(pg,'document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove())')
    W,H=E(pg,'[innerWidth,innerHeight]')
    r=E(pg,"(()=>{const r=document.getElementById('bottombar').getBoundingClientRect();return [r.left,r.width,r.height]})()")
    ok(E(pg,'TT.railMode()') and r[0]<=1 and r[1]<100 and r[2]>H*.8,f'landscape: bottom bar becomes a left rail ({W}x{H}, {r})')
    bb=E(pg,"[...document.querySelectorAll('#bottombar .bb')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().height)")
    ok(len(bb)==5 and min(bb)>=44,f'landscape: rail buttons ≥44px ({[round(x) for x in bb]})')
    E(pg,'TT.openSheet("crew")'); pg.wait_for_timeout(500)
    s=E(pg,"(()=>{const r=document.getElementById('sheet').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom]})()")
    ok(s[1]>=W-1 and s[0]>W*.4 and s[3]>=H-1,f'landscape: sheet is a right side panel ({s})')
    ok(E(pg,"document.getElementById('shBody').scrollHeight>document.getElementById('shBody').clientHeight"),'landscape: side sheet content scrolls')
    T=Touch(pg,ctx); E(pg,'TT.closeSheet();TT.fitCamera(true)'); pg.wait_for_timeout(500); pt=E(pg,'TT.lotScreen("sawmill")'); T.tap(*pt); pg.wait_for_timeout(300)
    ok(E(pg,'TT.sheetBld')=='sawmill','landscape: tap opens a building')
    ctx.close()

    # --- desktop still works (mouse drag, wheel zoom, click) ---
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'desk'); pg.goto(URL); pg.wait_for_timeout(900)
    E(pg,'document.querySelectorAll(".toast,.modal-bg").forEach(t=>t.remove())')
    vis=E(pg,"[...document.querySelectorAll('#bottombar .bb')].filter(e=>e.offsetParent).map(e=>e.dataset.s)")
    ok('more' not in vis and len(vis)>=8,f'desktop: full bottom bar, no More ({vis})')
    c0=cam(pg); pg.mouse.move(640,420); pg.mouse.down(); pg.mouse.move(540,380,steps=8); pg.mouse.up(); pg.wait_for_timeout(100)
    ok(cam(pg)[0]>c0[0]+50,'desktop: mouse drag pans')
    z0=E(pg,'TT.cam.z'); pg.mouse.wheel(0,-300); pg.wait_for_timeout(200)
    ok(E(pg,'TT.cam.z')>z0,'desktop: wheel zooms')
    E(pg,'TT.fitCamera(true)'); pg.wait_for_timeout(300); pt=E(pg,'TT.lotScreen("dock")'); pg.mouse.click(*pt); pg.wait_for_timeout(200)
    ok(E(pg,'TT.curSheet') in ('market','ship'),'desktop: click on the dock opens the market')
    E(pg,'TT.closeSheet()'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(400); ok(E(pg,'TT.cam.x')>c0[0]-1,'desktop: arrow keys pan')
    ctx.close()

    # --- v2.8 save migration (same origin) ---
    ctx=b.new_context(**device('Pixel 7')); pg=ctx.new_page(); watch(pg,'mig')
    pg.goto(BASE+'releases/v2.8/index.html'); pg.wait_for_timeout(800)
    ok(E(pg,'TT.VERSION')=='2.8','old build is v2.8')
    E(pg,'(()=>{TT.S.coins=1e9;TT.buyCollector("lumberjack",30);TT.buyPlanter("team",2);TT.buyBuilding("sawmill",25);TT.buyBuilding("chipper",5);TT.save();})()')
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); pg.close(run_before_unload=False)
    pg=ctx.new_page(); watch(pg,'mig'); pg.goto(URL); pg.wait_for_timeout(1200)
    S=E(pg,'TT.S')
    ok(ver(S['version'])>=(2,9) and 'prefs' not in old,'v2.8 save migrated to 2.9')
    _want={'autoFocus':True,'haptics':True}
    if ver(S['version'])>=(2,14): _want['fatigue']=True   # v2.14 added the staff-fatigue pref
    if ver(S['version'])>=(2,15,1): _want['plankMode']='fair'   # v2.15.1 plank allocation pref
    ok(S['prefs']==_want,f"prefs added with defaults ({S['prefs']})")
    ok(S['collectors']['lumberjack']==old['collectors']['lumberjack'] and S['planters']['team']==old['planters']['team'] and S['buildings']['sawmill']['lvl']==old['buildings']['sawmill']['lvl'] and S['buildings']['chipper']['lvl']==5,'crew, planters and buildings kept')
    ok(abs(S['coins']-old['coins'])/old['coins']<0.05,'coins kept')
    E(pg,'TT.prefs().autoFocus=false;TT.S.totalEarned=1e9;TT.doPrestige()'); ok(E(pg,'TT.S.prefs.autoFocus')==False,'prefs survive a replant')
    ctx.close()

    # --- PWA ---
    m=json.load(open(ROOT+'/manifest.webmanifest'))
    ok(m['display'] in ('fullscreen','standalone') and m['start_url']=='./' and any(i['sizes']=='512x512' for i in m['icons']) and all(os.path.exists(ROOT+'/'+i['src']) for i in m['icons']),'manifest with icons (192/512/maskable)')
    sw=open(ROOT+'/sw.js').read()
    ok('fetch(r)' in sw and 'releases/' in sw and 'skipWaiting' in sw,'service worker: network-first, skips release snapshots')
    ok(not bad,f'no 404s ({bad[:3]})')
    ok(not errs,f'no console errors ({errs[:4]})')
    b.close()
print('FAILS',FAILS); print('ALL PASSED' if not FAILS else f'{len(FAILS)} failures'); sys.exit(1 if FAILS else 0)
