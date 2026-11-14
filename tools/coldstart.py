# Cold-start and steady-frame harness (v2.53).
#   python3 tools/coldstart.py [out.json]
import json,sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.join(ROOT,'test'))
args=[a for a in sys.argv[1:]]
OUT=next((a for a in args if a.endswith('.json')), '/tmp/tt-cold.json')
URL=next((a for a in args if a.startswith('http')), None)
if not URL:
    from _server import URL as URL
OBS=r'''(()=>{
  window.__lt=[]; window.__raf=[]; window.__rafAt=[]; window.__draws=[]; window.__rafT=0;
  try{new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__lt.push({d:e.duration,t:e.startTime});}).observe({type:'longtask',buffered:true});}catch(e){}
  const tick=t=>{window.__rafAt.push(t); window.__raf.push(window.__rafT?t-window.__rafT:0); window.__rafT=t; requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
  const arm=()=>{
    if(typeof drawScene==='function'&&!drawScene.__w){
      const o=drawScene;
      const w=function(dt){const t0=performance.now();const r=o.apply(this,arguments);window.__draws.push(performance.now()-t0);return r;};
      w.__w=1; try{window.drawScene=w;}catch(e){} return;
    }
    setTimeout(arm,0);
  };
  arm();
})()'''
SNAP=r'''()=>{
  const pct=(a,p)=>{if(!a.length) return 0; const s=a.slice().sort((x,y)=>x-y); return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];};
  const stat=a=>{a=a.filter(x=>x>=0); if(!a.length) return {n:0};
    return {n:a.length,min:+Math.min(...a).toFixed(2),p50:+pct(a,.5).toFixed(2),p95:+pct(a,.95).toFixed(2),max:+Math.max(...a).toFixed(2),mean:+(a.reduce((s,x)=>s+x,0)/a.length).toFixed(2)};};
  const c=document.getElementById('scene');
  const lt=window.__lt||[];
  const first3=lt.filter(e=>e.t<3000);
  let gl=null;
  try{const g=window.TT&&TT.ground&&TT.ground.c; gl=g?{w:g.width,h:g.height,mp:+((g.width*g.height)/1e6).toFixed(3)}:null;}catch(e){gl=null;}
  const mark=performance.getEntriesByName('tt-splash-off')[0]; const ts=mark?mark.startTime:null; const at=window.__rafAt||[];
  let maxF=0,nF=0; for(let i=1;i<at.length;i++){if(ts!=null&&at[i-1]<ts) continue; maxF=Math.max(maxF, at[i]-at[i-1]); nF++;}
  return {
    version:window.TT&&TT.VERSION,
    raf:stat(window.__raf||[]),
    draws:stat(window.__draws||[]),
    longtasks:{n:first3.length,totalMs:+first3.reduce((s,e)=>s+e.d,0).toFixed(1),longest:first3.slice().sort((a,b)=>b.d-a.d).slice(0,6).map(e=>({d:+e.d.toFixed(1),t:+e.t.toFixed(1)}))},
    afterSplash:{t:ts, n:nF, maxFrame:+maxF.toFixed(1)},
    canvas:c&&window.TT?{cssW:TT.scene.w,cssH:TT.scene.h,bufW:c.width,bufH:c.height,dpr:TT.scene.dpr,mp:+((c.width*c.height)/1e6).toFixed(4),fps:TT.scene.fps,frameMs:TT.scene.frameMs}:null,
    ground:gl
  };
}'''
def run(b, name, w, h, dpr, warm):
    ctx=b.new_context(viewport={'width':w,'height':h}, device_scale_factor=dpr, service_workers='block')
    ctx.add_init_script(OBS)
    pg=ctx.new_page()
    pg.goto(URL, wait_until='commit')
    pg.wait_for_timeout(3400)
    cold=pg.evaluate(SNAP)
    row={'name':name,'viewport':{'w':w,'h':h,'dpr':dpr},'cold':cold}
    if warm:
        pg.evaluate('()=>{window.__lt=[]; window.__draws=[]; window.__raf=[]; window.__rafAt=[]; window.__rafT=0;}')
        pg.reload(wait_until='commit')
        pg.wait_for_timeout(3400)
        row['warm']=pg.evaluate(SNAP)
    pg.wait_for_timeout(2500)
    pg.evaluate('()=>{window.__draws=[]; window.__raf=[]; window.__rafT=0;}')
    pg.wait_for_timeout(4000)
    row['steady']=pg.evaluate(SNAP)
    ctx.close()
    st=row['steady']
    print(name, 'coldLT', cold['longtasks']['totalMs'], 'steadyFps', (st.get('canvas') or {}).get('fps'), 'draw', st.get('draws'), 'mp', (st.get('canvas') or {}).get('mp'), flush=True)
    return row
def main():
    with sync_playwright() as p:
        b=p.chromium.launch()
        rows=[
            run(b,'1920x1080_dpr1',1920,1080,1,True),
            run(b,'1920x1080_dpr2',1920,1080,2,False),
            run(b,'2560x1440_dpr2',2560,1440,2,False),
        ]
        b.close()
    json.dump(rows, open(OUT,'w'), indent=2)
    print('wrote', OUT)
if __name__=='__main__': main()
