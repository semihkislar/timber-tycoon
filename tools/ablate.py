# Ablation profiler: wraps draw functions with skip switches in a temporary copy (.dbg/) and reports frame-cost deltas.
import sys,os,shutil,re,json
from playwright.sync_api import sync_playwright
R='/workspace/lumber-idle'; D=R+'/.dbg'; FN=sys.argv[1].split(',') if len(sys.argv)>1 else ['drawChunks','drawLot','drawTreeRaw','humanRaw','drawLighting','drawOverlays','logTruck','boxTruck','premDraw','techDraw','staffDraw','drawWeather','drawYardLot','drawDockLot','stockObj','drawConveyor','drawSky','forestDraw','drawGolden','drawPuddles']
shutil.rmtree(D,ignore_errors=True); shutil.copytree(R+'/js',D+'/js'); shutil.copytree(R+'/css',D+'/css')
if os.path.isdir(R+'/assets'): shutil.copytree(R+'/assets',D+'/assets')
shutil.copy(R+'/index.html',D+'/index.html')
for f in os.listdir(D+'/js'):
    s=open(D+'/js/'+f).read()
    for fn in FN:
        a=f'\nfunction {fn}('
        if a in s: s=s.replace(a,f"\nfunction {fn}(...A){{if(window.__skip&&__skip['{fn}']) return null; return {fn}__(...A);}}\nfunction {fn}__(",1)
    open(D+'/js/'+f,'w').write(s)
sys.path.insert(0,R+'/test'); os.chdir(R)
from _server import BASE
HOOK='''(()=>{window.__fc=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{const t0=performance.now();cb(t);
  if(cb.name==='sceneLoop'&&window.TT&&TT.scene.ctx){TT.scene.ctx.getImageData(0,0,1,1);window.__fc.push(performance.now()-t0);}});})()'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.add_init_script(HOOK); pg.goto(BASE+'.dbg/index.html'); pg.wait_for_timeout(600); pg.add_script_tag(path=R+'/test/bot.js')
    pg.evaluate('runBot(3600,3,300);TT.S.orders.next=1e12;TT.S.nextEvent=1e12;TT.S.fireCool=1e12;TT.S.fires={};')
    def cost():
        pg.evaluate('window.__fc=[]'); pg.wait_for_timeout(2500); a=sorted(pg.evaluate('window.__fc')); return sum(a[:int(len(a)*.9)])/int(len(a)*.9)
    for clock,lab in [(420*.45,'day'),(420*.93,'night')]:
        pg.evaluate(f'(()=>{{TT.setClock({clock});TT.setWeather("clear",1e6);TT.S.wx.next=1e9;TT.fitCamera(true);}})()'); pg.wait_for_timeout(1500)
        base=cost(); print(lab,'base %.2f'%base)
        for fn in FN+['ALL']:
            pg.evaluate('window.__skip={};'+(f"{json.dumps(FN)}.forEach(k=>__skip[k]=1)" if fn=='ALL' else f"__skip['{fn}']=1")); pg.wait_for_timeout(300)
            c=cost(); print(f'   {fn:14s} {c:6.2f}  saves {base-c:5.2f}')
        pg.evaluate('window.__skip={}')
    b.close()
shutil.rmtree(D,ignore_errors=True)
