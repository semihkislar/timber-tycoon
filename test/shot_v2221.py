# v2.22.1 screenshots: staff panel with team limits (x/y) and a working assignment, plus the Assign picker.
#   python3 test/shot_v2221.py -> screenshot-v2221-desktop.png, screenshot-v2221-desktop-picker.png,
#                                 screenshot-v2221-mobile.png, screenshot-v2221-mobile-picker.png
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
SEED='''Math.random=(()=>{let a=2221;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();'''
SETUP='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,25);S.coins=1e12;TT.buyStation();TT.S.events=[];TT.S.nextEvent=TT.S.time+1e6;TT.S.orders.next=TT.S.time+1e6;
 TT.S.fires={};TT.S.fireCool=TT.S.time+1e6;
 const st=TT.staffState();
 const H=[['Ada Berg','mill',4,'R','carpentry'],['Hiro Sato','engineer',3,'E','chipper'],['Nora Lind','lumberjack',3,'C'],['Diego Santos','driver',2,'R'],
   ['Jonas Meyer','forklift',3,'C'],['Kira Novak','forklift',2,'R'],['Sena Yılmaz','mill',2,'C',null],['Leila Rahman','dock',2,'C']];
 H.forEach((h,k)=>{const id='cs'+k;st.candidates=[{id,name:h[0],role:h[1],skill:h[2],rarity:h[3],traits:k%3==1?['steady']:['nightowl'],look:STAFF_LOOKS[(k*3)%STAFF_LOOKS.length]}];
   TT.staffHireCandidate(id);const w=st.team[st.team.length-1];w.energy=80+k;if(h[4]) TT.staffAssign(w.id,h[4]);});
 TT.staffRefreshCandidates(false);
 staffTick(.1,false);TT.setClock(420*.42);TT.setWeather('clear',900);TT.S.wx.next=1e9;const v=TT.scene.wxv;for(const k in v) v[k]=0;
 document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());TT.rebuildAll();TT.GI.touchedAt=performance.now()+1e9;})()'''
CLEAN='document.querySelectorAll(".toast,.modal-bg,#fxLayer *").forEach(t=>t.remove())'
def cam(pg,i,j,z):
    pg.evaluate(f'(()=>{{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,4);c.fly=null;c.z=c.tz={z};const p=TT.P({i},{j});c.x=c.tx=p[0];c.y=c.ty=p[1];}})()')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    def page(**kw):
        ctx=b.new_context(service_workers='block',**kw); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page()
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.goto(URL); pg.wait_for_timeout(1200); pg.evaluate(SEED); pg.evaluate(SETUP); return ctx,pg
    for tag,kw,z in [('desktop',dict(viewport={'width':1280,'height':800}),1.6),('mobile',None,1.5)]:
        if kw is None:
            d=dict(p.devices['iPhone 13']); d.pop('default_browser_type',None); kw=d
        ctx,pg=page(**kw)
        pg.evaluate("TT.openSheet('staff')"); pg.wait_for_timeout(400)
        L=pg.evaluate("[TT.LOTS.carpentry.ci,TT.LOTS.carpentry.cj]")
        # camera on the Carpentry so Ada (assigned there) is visible above the sheet
        pg.wait_for_timeout(9000); pg.evaluate(CLEAN)
        pg.evaluate("(()=>{const w=TT.S.staff.team.find(x=>x.name==='Ada Berg');TT.swFind(w.id);})()"); pg.wait_for_timeout(1200)
        if tag=='mobile': pg.evaluate("document.getElementById('shSize').click()"); pg.wait_for_timeout(600)
        pg.evaluate("(()=>{const b=document.getElementById('shBody'),c=document.querySelector('.staff-caps');b.scrollTop+=c.getBoundingClientRect().top-b.getBoundingClientRect().top-6;})()"); pg.wait_for_timeout(900); pg.evaluate(CLEAN)
        if tag=='mobile': pg.evaluate("document.querySelector('.sc-chip[data-cap=forklift]').click()"); pg.wait_for_timeout(200)
        pg.screenshot(path=OUT+f'screenshot-v2221-{tag}.png')
        if tag=='mobile': pg.evaluate("document.getElementById('shSize').click()"); pg.wait_for_timeout(500)
        pg.evaluate("(()=>{const w=TT.S.staff.team.find(x=>x.name==='Sena Yılmaz');TT.staffAssignSheet(w.id);})()"); pg.wait_for_timeout(600); pg.evaluate(CLEAN)
        pg.screenshot(path=OUT+f'screenshot-v2221-{tag}-picker.png')
        ctx.close()
    print('errors:',errs[:5]); print('OK' if not errs else 'ERR')
