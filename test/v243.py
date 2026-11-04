# v2.43 calm notifications (maintenance item 8: late-game clutter on phones). Checks: every toast() goes through the
# js/notify.js queue; phones show one toast at a time (desktop three), the most important first (setbacks > milestones /
# taps > routine), repeats collapse into one toast with a ×N badge, waiting toasts hurry the one on screen and expire into
# the log, the 🔔 pill opens the notification log, tap/click dismisses a toast, Settings → Notifications All / Important
# (saved; old + damaged saves load), shorter phone durations, toasts clear of the HUD row, side buttons, bottom bar and order
# card, the compact premium-order offer on phones (still accepts / declines by tap), desktop + iPhone 13 / Pixel 7 touch and
# a landscape phone, and before (v2.42 snapshot) / after shots of a late-game phone burst. No console errors / 404s.
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
from shots import shot_path
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=7;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
LATE='''(()=>{const T=window.toast;window.toast=()=>{};if(S.ob) S.ob.st='skip';S.coins=1e16;S.totalEarned=1e16;TT.buyCollector("lumberjack",60);TT.buyCollector("chainsaw",40);TT.buyCollector("truck",30);
  for(const b of ['sawmill','chipper','kiln','pellet','carpentry','paper','peeler','furniture','beamsaw','glulam']) TT.buyBuilding(b,40);S.premium.lvl=Math.max(1,S.premium.lvl);
  for(const n of RNODES) S.research[n.id]=1;TT.buyBuilding('plymill',25);for(const b of ['atelier','parquet','cabinetry','showroom','framer']) TT.buyBuilding(b,14);
  TT.buyBuilders&&TT.buyBuilders();TT.buyPower&&TT.buyPower();S.coins=3.2e11;S.playTime=6000;S.time=6000;S.events=[];S.nextEvent=S.time+1e6;S.fires={};S.fireCool=S.time+1e6;
  S.orders.next=S.time+1e6;S.orders.chNext=S.time+1e6;if(S.mish) S.mish.next=S.time+1e9;S.prefs.autoFocus=false;S.wx.next=1e15;checkAch();for(const k in achFresh) delete achFresh[k];
  M=computeMods();TT.simulate(10);TT.render();document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());window.toast=T;if(typeof ntClear==='function'){ntClear();NT.log.length=0;}})()'''
BURST='''(()=>{toast('🌩️ <b>Storm damage!</b> The Sawmill roof took a hit: −12 % speed for 80 s.',6000,'bad-toast');
 toast('📝 <b>Claim ready</b>: file it for 🪙1.20B now, or bank a −20 % discount. Open 🛡️ Safety.',4200);
 toast('<span>🏆</span><span><b>Trophy: Belt Baron</b><br>All four belts at Lv 4 · +2% production</span>',5200,'ach-toast');
 toast('🌧️ <b>Rain</b> · forest grows +20 %',3800);
 toast('⬆ <b>Kiln</b> → Lv 41',3000);toast('⬆ <b>Kiln</b> → Lv 42',3000);toast('⬆ <b>Kiln</b> → Lv 43',3000);
 toast('<span style="font-size:20px">🎯</span><span><b>Run goal: Beam master</b><br>+5% Seeds at the next Replant (3/8)</span>',4200);})()'''
FXC="(()=>{const f=document.getElementById('fxLayer');if(f) f.innerHTML='';if(window.scene&&scene.particles) scene.particles.length=0;})()"
VIS="[...document.querySelectorAll('#toasts .toast')].filter(t=>t.offsetParent&&getComputedStyle(t).opacity>0.5).map(t=>t.innerText.replace(/\\s+/g,' ').trim())"
RECT="(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden') return null;const r=e.getBoundingClientRect();return r.width?[r.left,r.top,r.right,r.bottom]:null;})"
def inter(a,b): return a and b and not (a[2]<=b[0] or b[2]<=a[0] or a[3]<=b[1] or b[3]<=a[1])
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None,init=CLEAR,url=URL,vp=None):
        if dev: d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block',has_touch=bool(vp))
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.on('response',lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); pg.wait_for_timeout(1300); return pg
    # ---------- before: the v2.42 snapshot, same late-game burst on an iPhone ----------
    if os.path.exists(ROOT+'/releases/v2.42/index.html'):
        pg=page('iPhone 13',url=BASE+'releases/v2.42/index.html'); E(pg,LATE); pg.wait_for_timeout(500); E(pg,"(()=>{S.orders.next=0;S.time+=1;tick(.1,false);TT.render();})()")
        E(pg,FXC); E(pg,BURST); pg.wait_for_timeout(600); E(pg,FXC); old=E(pg,VIS); pg.screenshot(path=shot_path('mobile-before.png'))
        ok(not any('Storm damage' in t for t in old),f'v2.42 (before): the storm setback was pushed out by routine toasts ({old})'); pg.close()
    pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,43),f"VERSION >= 2.43 ({E(pg,'TT.VERSION')})")
    ok('timber-tycoon-v2.43' in open(ROOT+'/sw.js').read(),'sw cache bumped')
    ok('js/notify.js' in open(ROOT+'/index.html').read(),'index.html loads js/notify.js')
    # ---------- rules (desktop) ----------
    E(pg,LATE)
    r=E(pg,'''(()=>{const a=ntKey(ntText('⬆ <b>Kiln</b> → Lv 41')),b=ntKey(ntText('⬆ <b>Kiln</b> → Lv 42')),c=ntKey(ntText('⬆ <b>Sawmill</b> → Lv 42'));
      const d=ntKey(ntText('📝 Claim paid: +🪙1.20B.')),e=ntKey(ntText('📝 Claim paid: +🪙35.4K.'));return [a===b,a!==c,d===e];})()''')
    ok(r==[True,True,True],f'repeat key: same text with other numbers merges, other names do not ({r})')
    r=E(pg,'''[ntPri('x',"bad-toast",'x'),ntPri('x','','🔥 Fire at the Kiln!'),ntPri('x','ach-toast','x'),ntPri('x','ms-toast','x'),ntPri('x','','Rain')]''')
    ok(r==[3,3,2,2,1],f'priorities: setbacks/fires 3, milestones/trophies 2, routine 1 ({r})')
    ok(E(pg,'ntCap()')==3 and E(pg,'ntDur(4200,1)')==4200 and E(pg,'ntDur(6000,3)')==6000,'desktop: three at a time, durations unchanged')
    E(pg,"checkAch();for(const k in achFresh) delete achFresh[k];ntClear();"); E(pg,FXC); E(pg,BURST); pg.wait_for_timeout(400); E(pg,FXC); v=E(pg,VIS)
    ok(len(v)==3 and any('Storm damage' in t for t in v) and 'Rain' not in ' '.join(v),f'desktop: three toasts on screen, the setback among them, routine ones wait ({v})')
    ok(E(pg,"NT.q.length")>=2 and E(pg,"!!document.getElementById('ntPill')"),f"desktop: the rest wait, the 🔔 pill shows (+{E(pg,'NT.q.length')})")
    LOGOK="['Storm damage','Claim ready','Belt Baron','Rain','Kiln','Beam master'].every(k=>NT.log.filter(r=>r.txt.includes(k)).length===1)&&NT.log.find(r=>/Kiln/.test(r.txt)).n===3"
    ok(E(pg,LOGOK),f"log: every burst toast once, Kiln ×3 merged ({E(pg,'NT.log.map(r=>r.txt.slice(0,20)+String.fromCharCode(32)+r.n)')})")
    pg.screenshot(path=shot_path('desktop-notifications.png'))
    # click dismisses → the next one comes in
    n0=E(pg,"NT.q.length"); pg.locator('#toasts .toast.bad-toast').first.click(); pg.wait_for_timeout(500)
    ok(E(pg,"NT.q.length")<n0 and not any('Storm' in t for t in E(pg,VIS)),f'desktop: click dismisses a toast and a waiting one takes its place ({E(pg,VIS)})')
    # waiting toasts expire into the log after NT_WAIT
    E(pg,"ntClear();for(let i=0;i<6;i++) toast('🎓 <b>Worker '+String.fromCharCode(65+i)+'</b> reached skill 3!');NT.q.forEach(e=>e.t-=60000);ntPump();")
    ok(E(pg,"NT.q.length")==0 and E(pg,"NT.unseen")>=3,f"waiting routine toasts older than {E(pg,'NT_WAIT[1]')} s go to the log (unseen {E(pg,'NT.unseen')})")
    # nothing important is thrown away: 6 routine toasts then a setback → the setback is on screen at once
    E(pg,"ntClear();for(let i=0;i<6;i++) toast('🎓 <b>Trainee '+String.fromCharCode(65+i)+'</b> started training');toast('🌊 <b>Log Yard flood!</b> −8 % logs.',6000,'bad-toast')"); pg.wait_for_timeout(300)
    ok(any('Log Yard flood' in t for t in E(pg,VIS)),'a setback shows at once even behind a pile of routine toasts')
    E(pg,"ntClear()"); pg.close()
    # ---------- phones (portrait, touch) ----------
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg,LATE); pg.wait_for_timeout(300)
        ok(E(pg,'ntCap()')==1 and E(pg,'ntDur(4200,1)')<=3600 and E(pg,'ntDur(6000,3)')==5000 and E(pg,'ntDur(1000,1)')>=2200,f"{dev}: one at a time, shorter durations ({E(pg,'[ntDur(4200,1),ntDur(6000,3)]')})")
        E(pg,"(()=>{S.orders.next=0;S.time+=1;tick(.1,false);TT.render();})()"); pg.wait_for_timeout(200)
        E(pg,BURST); pg.wait_for_timeout(500); v=E(pg,VIS)
        ok(len(v)==1 and 'Storm damage' in v[0],f'{dev}: one toast on screen and it is the setback ({v})')
        tr=E(pg,RECT+"('#toasts .toast')"); vw=E(pg,'innerWidth')
        hud=[E(pg,RECT+f"('{s}')") for s in ('#topbar','#subbar .fchip','#fabs','#bottombar','#orderCard')]
        ok(tr and tr[0]>=0 and tr[2]<=vw+1 and tr[3]-tr[1]<=72,f'{dev}: compact toast fits the screen ({tr and [round(x) for x in tr]})')
        ok(not any(inter(tr,h) for h in hud),f'{dev}: toast clear of the HUD row, forest chip, side buttons, bottom bar and order card')
        pl=E(pg,RECT+"('#ntPill')"); pt=E(pg,"document.getElementById('ntPill').textContent"); ok(pl and pl[3]-pl[1]>=28 and not any(inter(pl,h) for h in hud),f"{dev}: 🔔 pill ({pt}) is tappable and clear of the HUD")
        if dev=='iPhone 13': E(pg,FXC); pg.screenshot(path=shot_path('mobile-notifications.png'))
        # repeats collapse on screen
        E(pg,"ntClear();toast('⬆ <b>Kiln</b> → Lv 41',3000);toast('⬆ <b>Kiln</b> → Lv 42',3000);toast('⬆ <b>Kiln</b> → Lv 43',3000)"); pg.wait_for_timeout(200)
        v=E(pg,VIS); ok(len(v)==1 and 'Lv 43' in v[0] and '×3' in v[0],f'{dev}: repeats collapse into one toast with ×3 ({v})')
        # tap dismisses, the next waiting one takes over
        E(pg,"ntClear();toast('🌧️ <b>Rain</b> · forest grows +20 %',3800);toast('🎓 <b>Ana</b> started training',3000)"); pg.wait_for_timeout(200)
        pg.locator('#toasts .toast').first.tap(); pg.wait_for_timeout(500); v=E(pg,VIS)
        ok(len(v)==1 and 'Ana' in v[0],f'{dev}: tap dismisses, the waiting toast shows ({v})')
        # a waiting toast hurries the one on screen (≤ 1.2 s more)
        E(pg,"ntClear();toast('🌧️ <b>Rain</b> · forest grows +20 %',3800);toast('🎓 <b>Ben</b> started training',3000)"); pg.wait_for_timeout(1700)
        ok(any('Ben' in t for t in E(pg,VIS)),f'{dev}: a waiting toast gets its turn after ~1.2 s, not the full duration')
        # pill → log
        E(pg,"ntClear();NT.log.length=0;"); E(pg,BURST); pg.wait_for_timeout(300)
        pg.locator('#ntPill').tap(); pg.wait_for_timeout(400)
        rows=E(pg,"document.querySelectorAll('.nt-modal .nt-row').length"); md=E(pg,RECT+"('.nt-modal .modal')")
        lt=E(pg,"document.querySelector('.nt-modal').innerText")
        ok(rows>=6 and all(k in lt for k in ('Storm damage','Claim ready','Belt Baron','Rain','Beam master','×3')) and md and md[2]<=vw+1,f'{dev}: 🔔 opens the log with every notification (Kiln ×3 merged) ({rows})')
        ok(E(pg,"NT.q.length")==0 and E(pg,"NT.unseen")==0,f'{dev}: opening the log clears the waiting ones')
        if dev=='iPhone 13': pg.screenshot(path=shot_path('mobile-log.png'))
        pg.locator('.nt-modal .mbtns .btn').tap(); pg.wait_for_timeout(300); ok(not E(pg,"!!document.querySelector('.nt-modal')"),f'{dev}: Close closes the log')
        ok(not E(pg,"!!document.getElementById('ntPill')"),f'{dev}: pill gone when nothing waits')
        # Settings → Important (tap), saved
        E(pg,"ntClear();openSheet('set')"); pg.wait_for_timeout(400)
        pg.locator('#ntSeg button[data-q="1"]').scroll_into_view_if_needed(); bx=pg.locator('#ntSeg button[data-q="1"]').bounding_box()
        ok(bx and bx['height']>=36 and bx['x']+bx['width']<=vw+1,f'{dev}: Settings → Notifications fits and is a touch target ({bx and round(bx["height"])} px)')
        pg.locator('#ntSeg button[data-q="1"]').tap(); pg.wait_for_timeout(200)
        ok(E(pg,"S.prefs.ntQuiet===true&&document.querySelector('#ntSeg button[data-q=\"1\"]').classList.contains('on')"),f'{dev}: tap Important')
        if dev=='iPhone 13': pg.locator('#ntSet').screenshot(path=shot_path('mobile-settings-notifications.png'))
        E(pg,"closeSheet();toast('🌧️ <b>Rain</b> · forest grows +20 %',3800);toast('<span>🏆</span><span><b>Trophy: Test</b></span>',5200,'ach-toast')"); pg.wait_for_timeout(300)
        v=E(pg,VIS); ok(len(v)==1 and 'Trophy' in v[0] and E(pg,"NT.log.some(r=>/Rain/.test(r.txt))"),f'{dev}: Important: routine toasts only go to the log, milestones still show ({v})')
        E(pg,"TT.save(true)"); pg.reload(); pg.wait_for_timeout(1300)
        ok(E(pg,"S.prefs.ntQuiet")==True,f'{dev}: Important is kept after reload')
        E(pg,"ntSetQuiet(false)")
        # compact premium-order offer
        E(pg,LATE); E(pg,"(()=>{S.orders.next=0;S.time+=1;tick(.1,false);TT.render();})()"); pg.wait_for_timeout(400)
        has=E(pg,"!!(ordNorm().offer)")
        if has:
            big=E(pg,RECT+"('#orderCard')"); E(pg,"document.getElementById('orderCard')._ntT-=8000;TT.render()"); pg.wait_for_timeout(300)
            sm=E(pg,RECT+"('#orderCard')"); ok(E(pg,"document.getElementById('orderCard').classList.contains('mini')") and sm[3]-sm[1]<=64 and sm[3]-sm[1]<(big[3]-big[1])*0.5,f'{dev}: offer card shrinks to one row after {E(pg,"NT_OC_MINI")} s ({round(big[3]-big[1])} → {round(sm[3]-sm[1])} px)')
            ok(sm[0]>=0 and sm[2]<=vw+1 and not inter(sm,E(pg,RECT+"('#fabs')")),f'{dev}: compact card fits, clear of the side buttons')
            ok('🪙' in E(pg,"document.getElementById('orderCard').innerText"),f'{dev}: compact card still shows the reward')
            if dev=='iPhone 13':
                E(pg,"toast('🌩️ <b>Storm damage!</b> The Sawmill roof took a hit: −12 % speed for 80 s.',6000,'bad-toast')"); pg.wait_for_timeout(300); E(pg,FXC)
                pg.screenshot(path=shot_path('mobile-after.png')); E(pg,"ntClear()")
            for bid,want in (('#ocYes','accept'),):
                yb=pg.locator(bid).bounding_box(); ok(yb and yb['height']>=38,f'{dev}: compact Accept is a touch target ({yb and round(yb["height"])} px)')
                a0=E(pg,"ordNorm().acts.length"); pg.locator(bid).tap(); pg.wait_for_timeout(300)
                ok(E(pg,"ordNorm().acts.length")==a0+1,f'{dev}: tap ✔ on the compact card accepts the order')
            E(pg,"(()=>{S.orders.next=0;S.time+=1;for(let k=0;k<3&&!ordNorm().offer;k++){S.orders.next=0;S.time+=1;tick(.1,false);}TT.render();})()"); pg.wait_for_timeout(300)
            if E(pg,"!!ordNorm().offer"):
                ok(not E(pg,"document.getElementById('orderCard').classList.contains('mini')"),f'{dev}: a new offer pops in full size again')
                E(pg,"document.getElementById('orderCard')._ntT-=8000;TT.render()"); pg.wait_for_timeout(200)
                n0=E(pg,"ordNorm().offers.length"); pg.locator('#ocNo').tap(); pg.wait_for_timeout(300)
                ok(E(pg,"ordNorm().offers.length")==n0-1,f'{dev}: tap ✕ on the compact card declines')
        else: ok(False,f'{dev}: no offer to test the compact card')
        pg.close()
    # desktop: the offer card never shrinks
    pg=page(); E(pg,LATE); E(pg,"(()=>{S.orders.next=0;S.time+=1;tick(.1,false);TT.render();document.getElementById('orderCard')._ntT-=60000;TT.render();})()"); pg.wait_for_timeout(200)
    ok(not E(pg,"document.getElementById('orderCard').classList.contains('mini')"),'desktop: the offer card keeps its full size'); pg.close()
    # landscape phone: one at a time, clear of the rail
    pg=page(vp={'width':844,'height':390}); E(pg,LATE); E(pg,BURST); pg.wait_for_timeout(300)
    v=E(pg,VIS); tr=E(pg,RECT+"('#toasts .toast')"); rail=E(pg,RECT+"('#bottombar')")
    ok(len(v)==1 and not inter(tr,rail),f'landscape phone: one toast, clear of the left rail ({len(v)})'); pg.close()
    # ---------- saves ----------
    pg=page(); sv=E(pg,'''(()=>{const o=JSON.parse(JSON.stringify(S));o.version='2.42';delete o.prefs.ntQuiet;return JSON.stringify(o);})()'''); pg.close()
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+json.dumps(sv)+');')
    ok(E(pg,"ntQuiet()")==False and E(pg,"S.version")>='2.43','v2.42 save loads with notifications on All'); pg.close()
    dmg=json.dumps(json.dumps({'version':'2.42','coins':100,'prefs':{'ntQuiet':'yes','autoFocus':True}}))
    pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+dmg+');')
    ok(E(pg,"ntQuiet()")==False and E(pg,"!('ntQuiet' in S.prefs)"),'damaged pref is dropped (All)')
    # fresh game: the first toast shows at once, nothing waits
    E(pg,"ntClear();toast('💾 Game saved.')"); pg.wait_for_timeout(200); ok(E(pg,VIS)==['💾 Game saved.'],'a lone toast shows at once')
    ok(E(pg,"(()=>{const r=ntPush('');return r===null&&NT.log.every(x=>x.txt);})()"),'empty toasts are ignored'); pg.close()
    ok(not errs,'no console errors '+str(errs[:3])); ok(not missing,'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED'); sys.exit(1 if FAILS else 0)
