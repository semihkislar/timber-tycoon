# v2.15 feature screenshots: staff in the world (desktop close-up with a tapped worker's card, phone portrait).
#   python3 test/shot_staff_v215.py -> screenshot-staff-world-v215.png, screenshot-staff-world-v215-scene.png, screenshot-mobile-staff-world-v215.png
from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
SEED='''Math.random=(()=>{let a=4242;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();'''
SETUP='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,25);S.coins=1e12;TT.buyStation();TT.S.events=[];TT.S.nextEvent=TT.S.time+1e6;TT.S.orders.next=TT.S.time+1e6;
 TT.S.fires={};TT.S.fireCool=TT.S.time+1e6;
 for(const m of MANAGERS.slice(0,2)){if(!mgrLvl(m.bid)) hireMgr(m.id);} staffMigrateFromMgr();
 const st=TT.staffState();const roles=['lumberjack','lumberjack','lumberjack','driver','driver','mill','engineer','mill','engineer','forklift','dock','dock','firefighter','firefighter','lumberjack','driver','mill'];
 const names=['Ada Berg','Barış Kılıç','Cemre Arslan','Diego Santos','Elin Norberg','Farah Haddad','Gina Park','Hiro Sato','Ines Vidal','Jonas Meyer','Kira Novak','Leila Rahman','Mateo Cruz','Nora Lind','Omar Farouk','Pia Schulz','Ravi Patel'];
 const asg=['kiln','chipper','carpentry','carpentry','pellet'];let ai=0;
 roles.forEach((r,k)=>{const id='cs'+k;st.candidates=[{id,name:names[k],role:r,skill:1+(k*3%5),rarity:['C','R','C','E','R','L'][k%6],traits:k%4==1?['steady']:['nightowl'],look:STAFF_LOOKS[(k*5)%STAFF_LOOKS.length]}];
   TT.staffHireCandidate(id);const w=st.team[st.team.length-1];w.energy=k%5==2?6:k%7==3?9:70+k;if(r==='mill'||r==='engineer') TT.staffAssign(w.id,asg[ai++%asg.length]);});
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
    # desktop: the world around the log yard, campfire, fire station and sawmill
    ctx,pg=page(viewport={'width':1280,'height':800})
    pg.wait_for_timeout(6000); cam(pg,float(os.environ.get('CI',6.2)),float(os.environ.get('CJ',4.6)),float(os.environ.get('CZ',1.55))); pg.wait_for_timeout(3500)
    pg.evaluate("TT.SW.list.forEach((a,k)=>{a.nb=k%3?30:0;})"); pg.wait_for_timeout(700); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'screenshot-staff-world-v215-scene.png'); print('screenshot-staff-world-v215-scene.png')
    # tap a mill worker in the world -> Team card
    v=pg.evaluate('''(()=>{const L=TT.staffPeople().filter(a=>a.vis&&a.alpha>=1&&a.st!=='go'&&!a.rest&&a.sx>120&&a.sx<760&&a.sy>140&&a.sy<700);const m=L.find(a=>a.role==='mill')||L.find(a=>a.role==='driver')||L[0];return m||null;})()''')
    print('tap',v)
    if v: pg.mouse.click(v['sx'],v['sy']-18)
    pg.wait_for_timeout(1500); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'screenshot-staff-world-v215.png'); print('screenshot-staff-world-v215.png')
    ctx.close()
    # phone portrait: campfire + yard, then a tapped worker's card in the half sheet
    ctx,pg=page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    pg.wait_for_timeout(6000); cam(pg,float(os.environ.get('MI',5.4)),float(os.environ.get('MJ',1.6)),float(os.environ.get('MZ',1.45))); pg.wait_for_timeout(3000); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'screenshot-mobile-staff-world-v215-scene.png'); print('screenshot-mobile-staff-world-v215-scene.png')
    v=pg.evaluate('''(()=>{const L=TT.staffPeople().filter(a=>a.vis&&a.alpha>=1&&a.st!=='go'&&a.sx>40&&a.sx<350&&a.sy>120&&a.sy<400);return L.find(a=>a.rest)||L[0]||null;})()''')
    print('tap',v)
    if v: pg.evaluate(f"swOpenCard('{v['wid']}')")
    pg.wait_for_timeout(1600); pg.evaluate(CLEAN)
    pg.screenshot(path=OUT+'screenshot-mobile-staff-world-v215.png'); print('screenshot-mobile-staff-world-v215.png')
    ctx.close(); b.close()
print('errs',errs)
