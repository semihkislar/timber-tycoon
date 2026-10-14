# Close-ups of the forest vehicles + shipping area. Usage: python3 tools/shot_vehicles.py out.png [mobile]
import sys,os,io
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','test'))
from _server import URL
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
OUT=sys.argv[1]
SET='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e13;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS){if(S.buildings[b.id]&&!b.premium) TT.buyBuilding(b.id,25);} S.coins=1e13;for(let k=0;k<4;k++){shBuy('dock');shBuy('fork');shBuy('fspd');}shBuy('crane');S.coins=1e10;TT.rebuildAll();})()'''
SPOTS=[('harvester',(-0.2,14.3,0),3.0,0),('forwarder',"FW",3.0,0),('skidder',"SK",3.0,0),('logtruck',None,2.6,0),('dock',(29.5,19.0,0),2.0,0),('forklifts',(26.5,19.0,0),2.6,0),('harvester',(-0.2,14.3,0),3.0,1)]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=2)
    pg.add_init_script('try{localStorage.clear()}catch(e){}')
    pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate('document.querySelectorAll(".modal-bg,.toast").forEach(t=>t.remove())'); pg.evaluate(SET); pg.wait_for_timeout(4000)
    pg.add_style_tag(content='#topbar,#bottombar,#subbar,#sheet,.toast,#toasts,#sceneLabel,#jumpBtn,#attnBtn,#hudBtn,.fab{visibility:hidden!important}')
    tiles=[]
    for name,pt,z,night in SPOTS:
        pg.evaluate(f"(()=>{{TT.setClock({420*.95 if night else 420*.45});TT.setWeather('clear',900);TT.S.wx.next=1e9;}})()")
        if pt=='FW': pt_js="(()=>{const v=(TT.scene.forwarders||[])[0]||{i:3.2,j:14.6};return [v.i,v.j,10]})()"
        elif pt=='SK': pt_js="(()=>{const v=(TT.scene.skidders||[])[0]||{i:-3,j:2.6};return [v.i,v.j,10]})()"
        elif pt is None: pt_js="(()=>{const v=TT.scene.logTrucks.find(v=>v.i!==undefined)||{i:-6,j:8.4};return [v.i,v.j,10]})()"
        else: pt_js=str(list(pt))
        for k in range(2):
            pg.evaluate(f"(()=>{{const q0={pt_js};const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.4);c.z=c.tz={z};c.fly=null;const q=TT.P(q0[0],q0[1],q0[2]+20);c.x=c.tx=q[0];c.y=c.ty=q[1];}})()")
            pg.wait_for_timeout(700)
        pg.wait_for_timeout(800)
        im=Image.open(io.BytesIO(pg.screenshot())); W,H=im.size
        t=im.crop((W//2-640,H//2-500,W//2+640,H//2+500)).resize((512,400),Image.LANCZOS)
        ImageDraw.Draw(t).text((6,4),name+(' (night)' if night else ''),fill=(255,255,255)); tiles.append(t)
    G=Image.new('RGB',(512*4,400*2),(20,20,20))
    for k,t in enumerate(tiles): G.paste(t,((k%4)*512,(k//4)*400))
    G.save(OUT); print('saved',OUT)
