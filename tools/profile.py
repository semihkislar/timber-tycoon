# Long-session profiler: late-game state, fast-forwarded with the balance bot while the scene renders in real time.
# Records frame times, long frames, heap (after forced GC), DOM nodes, listeners, scene/save array sizes, save size/time,
# GC pauses (CDP tracing windows) and a heap-snapshot constructor diff.
# usage: python3 tools/profile.py <url> <out.json> [realSeconds=360] [gameSecPerRealSec=20]
import sys,json,time,collections
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; OUT=sys.argv[2]; REAL=int(sys.argv[3]) if len(sys.argv)>3 else 360; FF=int(sys.argv[4]) if len(sys.argv)>4 else 20
SAMPLER='''(()=>{window.__ft=[];window.__fc=[];let last=performance.now();const f=t=>{window.__ft.push(t-last);last=t;requestAnimationFrame(f);};requestAnimationFrame(f);})()'''
# wraps rAF so every frame callback is timed including the canvas raster flush (1px readback forces it)
COST_HOOK='''(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{const t0=performance.now();cb(t);
  if(window.TT&&TT.scene&&TT.scene.ctx&&cb.name==='sceneLoop'){try{TT.scene.ctx.getImageData(0,0,1,1);}catch(e){}window.__fc&&window.__fc.push(performance.now()-t0);}});})()'''
PROBE='''(()=>{const sc=TT.scene,out={};for(const k in sc){const v=sc[k];if(Array.isArray(v)) out['scene.'+k]=v.length;else if(v instanceof Map||v instanceof Set) out['scene.'+k]=v.size;}
 const walk=(o,p,d)=>{if(!o||typeof o!=='object'||d>3) return;for(const k in o){const v=o[k];if(Array.isArray(v)){if(v.length>=5) out['S.'+p+k]=v.length;}else if(v&&typeof v==='object') walk(v,p+k+'.',d+1);}};walk(TT.S,'',0);
 const t=performance.now();const js=JSON.stringify(TT.S);out._saveMs=performance.now()-t;out._saveKB=js.length/1024;
 out._toasts=document.querySelectorAll('.toast').length;out._dom=document.getElementsByTagName('*').length;out._fx=document.getElementById('fxLayer')?document.getElementById('fxLayer').children.length:0;
 out._earned=TT.S.totalEarned;out._time=TT.S.time;return out;})()'''
def trace_window(pg,cdp,sec):
    evs=[]
    cdp.on('Tracing.dataCollected',lambda p: evs.extend(p['value']))
    done={'v':False}; cdp.on('Tracing.tracingComplete',lambda p: done.__setitem__('v',True))
    cdp.send('Tracing.start',{'categories':'devtools.timeline,v8,disabled-by-default-v8.gc,blink.user_timing','transferMode':'ReportEvents'})
    pg.wait_for_timeout(sec*1000); cdp.send('Tracing.end')
    for _ in range(100):
        if done['v']: break
        pg.wait_for_timeout(100)
    gc=collections.Counter(); gcms=collections.Counter(); mx=0; tasks=[]
    for e in evs:
        n=e.get('name',''); d=e.get('dur',0)/1000
        if n in ('MinorGC','MajorGC','V8.GC_SCAVENGER','V8.GC_MARK_COMPACTOR','V8.GCScavenger','V8.GCFinalizeMC','V8.GCIncrementalMarking','BlinkGC.AtomicPhase') and e.get('ph') in ('X','B'):
            gc[n]+=1; gcms[n]+=d; mx=max(mx,d) if n in ('MinorGC','MajorGC') else mx
        if n=='RunTask' and d>16: tasks.append(round(d,1))
    return {'gcCount':dict(gc),'gcMs':{k:round(v,1) for k,v in gcms.items()},'gcMaxMs':round(mx,1),'longTasks>16ms':len(tasks),'longestTask':max(tasks) if tasks else 0,'traceSec':sec}
def snap_summary(cdp):
    chunks=[]; h=lambda p: chunks.append(p['chunk'])
    cdp.on('HeapProfiler.addHeapSnapshotChunk',h)
    cdp.send('HeapProfiler.takeHeapSnapshot',{'reportProgress':False})
    s=json.loads(''.join(chunks)); chunks.clear()
    m=s['snapshot']['meta']; nf=m['node_fields']; NF=len(nf); ti=nf.index('type'); ni=nf.index('name'); si=nf.index('self_size')
    types=m['node_types'][0]; strs=s['strings']; nodes=s['nodes']; cnt=collections.Counter(); sz=collections.Counter()
    for i in range(0,len(nodes),NF):
        t=types[nodes[i+ti]]
        key=t+':'+strs[nodes[i+ni]][:40] if t in ('object','closure','native') else t
        cnt[key]+=1; sz[key]+=nodes[i+si]
    return cnt,sz
with sync_playwright() as p:
    b=p.chromium.launch(args=['--enable-precise-memory-info','--js-flags=--expose-gc'])
    pg=b.new_page(viewport={'width':1280,'height':800}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.add_init_script(COST_HOOK); pg.goto(URL); pg.wait_for_timeout(800)
    pg.add_script_tag(path='/workspace/lumber-idle/test/bot.js')
    pg.evaluate('window.BOT_ORDERS=true;runBot(2400,3,300);TT.S.lastSave=Date.now();')   # late game start (~40 min of greedy play)
    cdp=pg.context.new_cdp_session(pg); cdp.send('Performance.enable'); cdp.send('HeapProfiler.enable')
    pg.evaluate(SAMPLER); pg.wait_for_timeout(1500)
    cdp.send('HeapProfiler.collectGarbage'); c0,s0=snap_summary(cdp)
    rows=[]; t0=time.time(); tr0=trace_window(pg,cdp,8); k=0; game0=pg.evaluate('TT.S.time')
    while time.time()-t0<REAL:
        # fast-forward game time with the bot (buys, research, trade, orders), real-time rendering continues
        for _ in range(10):
            pg.evaluate(f'(()=>{{const r=runBot({FF},0,0);}})()'); k+=1
            if k%40==0: pg.evaluate('TT.openSheet(["crew","market","ord","upg","staff","ach"][Math.floor(Math.random()*6)])')
            if k%40==12: pg.evaluate('TT.closeSheet()')
            pg.wait_for_timeout(700)
        pg.evaluate('window.__ft=[];window.__fc=[]'); pg.wait_for_timeout(4000)   # clean measurement window (no fast-forward work)
        ft,fc=pg.evaluate('(()=>{const a=window.__ft.slice(2),c=window.__fc.slice(2);window.__ft=[];window.__fc=[];return [a,c];})()')
        cdp.send('HeapProfiler.collectGarbage'); pm={m['name']:m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
        a=sorted(ft); n=len(a); cc=sorted(fc); m=len(cc)
        row={'real':round(time.time()-t0),'gameH':round((pg.evaluate('TT.S.time')-game0)/3600,2),'frames':n,'avgMs':round(sum(a)/max(n,1),2),'p95':round(a[int(n*.95)] if n else 0,1),'p99':round(a[int(n*.99)] if n else 0,1),
             'long>50':sum(1 for x in a if x>50),'costAvg':round(sum(cc)/max(m,1),2),'costP95':round(cc[int(m*.95)] if m else 0,1),'costMax':round(cc[-1] if m else 0,1),'heapMB':round(pm['JSHeapUsedSize']/1e6,1),'nodes':pm['Nodes'],'listeners':pm['JSEventListeners'],'frameMs':round(pg.evaluate('TT.scene.frameMs'),2)}
        row.update(pg.evaluate(PROBE)); rows.append(row)
        print(json.dumps({k2:row[k2] for k2 in ('real','gameH','avgMs','p95','long>50','costAvg','costP95','costMax','heapMB','nodes','listeners','frameMs','_saveKB','_saveMs')}),flush=True)
    tr1=trace_window(pg,cdp,8)
    cdp.send('HeapProfiler.collectGarbage'); c1,s1=snap_summary(cdp)
    grow=sorted(((s1[k]-s0.get(k,0),c1[k]-c0.get(k,0),k) for k in s1),reverse=True)[:25]
    res={'rows':rows,'traceStart':tr0,'traceEnd':tr1,'heapGrowthTop':[{'key':k,'bytes':d,'count':c} for d,c,k in grow],'errors':errs[:10]}
    json.dump(res,open(OUT,'w'),indent=1)
    print('TRACE start',tr0); print('TRACE end',tr1)
    for g in res['heapGrowthTop'][:15]: print(g)
    a,z=rows[0],rows[-1]
    print('PROBE growth',{k:(a.get(k),z[k]) for k in z if isinstance(z[k],(int,float)) and a.get(k)!=z[k] and not k.startswith('_t')})
    print('errors',errs[:5])
    b.close()
