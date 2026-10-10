# CPU profile of the render loop in a late-game state: top functions by self time
import sys,json,collections
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; SEC=int(sys.argv[2]) if len(sys.argv)>2 else 6
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.goto(URL); pg.wait_for_timeout(600); pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
    pg.evaluate('runBot(3600,3,300)'); pg.evaluate('TT.setClock&&TT.setClock(420*.93)')  # night: light map on
    pg.wait_for_timeout(1500)
    cdp=pg.context.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval',{'interval':200}); cdp.send('Profiler.start')
    pg.wait_for_timeout(SEC*1000)
    prof=cdp.send('Profiler.stop')['profile']
    nodes={n['id']:n for n in prof['nodes']}; cnt=collections.Counter()
    dts=prof['timeDeltas']; 
    for s,dt in zip(prof['samples'],dts): cnt[s]+=dt
    self_=collections.Counter()
    for nid,t in cnt.items(): cf=nodes[nid]['callFrame']; self_[(cf['functionName'] or '(anon)')+':'+str(cf['lineNumber'])]+=t
    tot=sum(self_.values())
    for k,v in self_.most_common(30): print(f'{v/1000:8.0f}ms {v/tot*100:5.1f}%  {k}')
    print('frameMs',pg.evaluate('TT.scene.frameMs'),'fps',pg.evaluate('TT.scene.fps'))
    b.close()
