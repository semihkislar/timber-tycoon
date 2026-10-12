# Close-up chimney screenshots (late game, every chimney building, day + a night tile). Usage: python3 tools/shot_chimneys.py out.png
import sys,os,io
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','test'))
from _server import URL
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
OUT=sys.argv[1]; CZ=float(os.environ.get('CZ','2.2')); ZO=float(os.environ.get('ZO','85'))
LATE='''(()=>{const S=TT.S;S.coins=1e18;S.totalEarned=1e19;for(const c of COLLECTORS) TT.buyCollector(c.id,150);
 for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,40);} if(!S.premium.lvl) buyPremium(); for(const b of BUILDINGS){if(S.buildings[b.id]) TT.buyBuilding(b.id,40);}
 S.power=S.power||{lvl:0}; while(pwLvl()<8&&buyPower()); S.coins=1e18; TT.rebuildAll();})()'''
SPOTS=[('sawmill',0),('chipper',0),('kiln',0),('carpentry',0),('paper',0),('furniture',0),('atelier',0),('power',0),('kiln',1),('sawmill',1)]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=2)
    pg.add_init_script('try{localStorage.clear()}catch(e){}')
    pg.goto(URL); pg.wait_for_timeout(1500); pg.evaluate('document.querySelectorAll(".modal-bg,.toast").forEach(t=>t.remove())'); pg.evaluate(LATE); pg.wait_for_timeout(6000)
    pg.add_style_tag(content='#topbar,#bottombar,#subbar,#sheet,.toast,#toasts,#sceneLabel,#jumpBtn,#attnBtn,#hudBtn{visibility:hidden!important}')
    tiles=[]
    for id,night in SPOTS:
        pg.evaluate(f"(()=>{{TT.setClock({420*.93 if night else 420*.45});TT.setWeather('clear',900);TT.S.wx.next=1e9;}})()")
        pg.evaluate(f"""(()=>{{const L='{id}'==='power'?{{ci:22.4,cj:-6.4}}:LOTS['{id}'];const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,3.4);c.z=c.tz={CZ};c.fly=null;const q=TT.P(L.ci,L.cj,{110 if id=='power' else 62});c.x=c.tx=q[0];c.y=c.ty=q[1];}})()""")
        pg.wait_for_timeout(400)
        sp=pg.evaluate(f"(()=>{{const L='{id}'==='power'?{{ci:22.4,cj:-6.4}}:LOTS['{id}'];const q=TT.P(L.ci,L.cj,{120 if id=='power' else ZO});return TT.w2s(q[0],q[1]);}})()")
        pg.wait_for_timeout(2600)
        im=Image.open(io.BytesIO(pg.screenshot())); W,H=im.size; cw,ch=int(os.environ.get('CW','900')),int(os.environ.get('CW','900'))*76//90
        t=im.crop((int(sp[0]*2)-cw//2,int(sp[1]*2)-ch//2,int(sp[0]*2)+cw//2,int(sp[1]*2)+ch//2)).resize((380,320),Image.LANCZOS)
        ImageDraw.Draw(t).text((6,4),id+(' (night)' if night else ''),fill=(255,255,255))
        tiles.append(t)
    G=Image.new('RGB',(380*5,320*2),(20,20,20))
    for k,t in enumerate(tiles): G.paste(t,((k%5)*380,(k//5)*320))
    G.save(OUT); print('saved',OUT)
