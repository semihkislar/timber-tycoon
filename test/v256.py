# v2.56: village depth. A tall piece is two halves, so a resident, a town van and the
# scaffold stay behind a building whose footprint is in front of them and in front
# of a building behind them. Walkers never replace a church roof or tower pixel.
# The opening minutes match the v2.55 snapshot.
from playwright.sync_api import sync_playwright
import os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _server import URL, BASE, ROOT, ver
from _pace import ready, paint, touch_at
from shots import shot_path
FAILS=[]
def ok(c, msg):
    print(('PASS ' if c else 'FAIL ')+msg, flush=True)
    if not c: FAILS.append(msg)
def E(pg, js):
    return pg.evaluate(js)
def near(a, b, rel=1e-6):
    d=max(abs(a), abs(b), 1)
    return abs(a-b)<=rel*d
OLD=BASE+'releases/v2.55/index.html'
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
SEED='(()=>{let s=256;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};})();'
QUIET=r'''()=>{S.events=[];S.nextEvent=1e15;S.fires={};S.fireCool=1e15;if(S.orders){S.orders.next=1e15;S.orders.chNext=1e15;}if(S.mish)S.mish.next=1e15;S.prefs.autoFocus=false;if(S.ob)S.ob.st="skip";if(S.wx){S.wx.w="clear";S.wx.next=1e15;}if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.modal-bg").forEach(e=>e.remove());}'''
EARLY=r'''(()=>{const __t=Date.now();Date.now=()=>__t;let sd=12345;Math.random=()=>{sd=(sd*1103515245+12345)%2147483648;return sd/2147483648;};
  window.toast=()=>{};window.save=()=>{};window.sfx=()=>{};
  S.coins=50;S.totalEarned=0;S.time=0;S.legacy=0;S.runCS=1;S.upgrades={};if(S.ob)S.ob.st="skip";
  if(S.forest){S.forest.m=1200;S.forest.y=0;S.forest.s=0;S.forest.st=0;}
  if(S.res){for(const k in S.res)S.res[k]=0;}
  if(S.wx){S.wx.clock=126;S.wx.w="clear";S.wx.ends=0;S.wx.next=1e15;}
  coinRate=0;if(S.run){S.run.inc=0;S.run.incE=0;}
  for(const c of COLLECTORS) S.collectors[c.id]=0;
  for(const b of BUILDINGS){S.buildings[b.id].lvl=0;S.buildings[b.id].on=true;}
  const want=["sawmill","chipper","kiln","carpentry","peeler","pellet","paper","furniture"];
  for(let k=0;k<2400;k++){if(k%4==0){TT.buyCollector("lumberjack",1);if(S.collectors.lumberjack>=10)TT.buyCollector("chainsaw",1);if(S.collectors.chainsaw>=10)TT.buyCollector("truck",1);
    for(const id of want) TT.buyBuilding(id,1);}S.wx.next=1e15;tick(.5,false);}
  return [S.totalEarned,S.buildings.sawmill.lvl,S.buildings.chipper.lvl,S.buildings.carpentry.lvl,S.buildings.paper.lvl,canSell("logs"),S.res.logs>0];})()'''
SHOW=r'''()=>{'''+QUIET+r'''
  S.coins=1e15;S.totalEarned=1e15;S.premium.lvl=Math.max(1,S.premium.lvl||0);
  for(const id of ["sawmill","chipper","framer"]){if(S.buildings[id]){S.buildings[id].lvl=Math.max(4,S.buildings[id].lvl);S.buildings[id].on=true;}}
  S.town.made=250000;townStage();S.town.best=Math.max(6,S.town.best||0);S.town.seen=6;
  TT.setClock&&TT.setClock(10*60);S.wx.w="clear";S.wx.next=1e15;
  const p=P(38.35,37.2,8);const c=scene.cam;c.fly=null;c.x=c.tx=p[0];c.y=c.ty=p[1];c.z=c.tz=Math.min(c.maxZ,Math.max(c.fitZ*2.2,1.1));
  if(typeof closeSheet==="function") closeSheet();
  TT.render();
}'''
TALL=set(['cot','church','stall','well','tree','sign','scaffold'])
ORDER=r'''()=>{
  const TALL='''+json.dumps(sorted(TALL))+r''';
  function hits(i,j,b){const ti0=b.i0-i,ti1=b.i1-i,tj0=b.j0-j,tj1=b.j1-j;return Math.max(ti0,tj0)<Math.min(ti1,tj1)-1e-9&&Math.min(ti1,tj1)>1e-6;}
  const bad=[], inside=[];
  let checks=0, vans=0, paused=0;
  for(const s of [1,2,3,4,5,6]){
    S.town.made=TOWN_STAGES[s].n; townStage();
    for(let step=0; step<48; step++){
      scene.t=step*0.85+s*3.1;
      const parts=townSortParts();
      const pts=parts.filter(q=>q.kind==='folk'||q.kind==='van');
      const bld=parts.filter(q=>TALL.indexOf(q.kind)>=0);
      for(const f of parts) if(f.kind==='folk'){
        if(f.pose==='stand') paused++;
        for(const q of townLive()){
          if(q.kind==='path'||q.kind==='garden'||q.kind==='stake') continue;
          const b=townBoxOf(q);
          if(f.i>b.i0+1e-6&&f.i<b.i1-1e-6&&f.j>b.j0+1e-6&&f.j<b.j1-1e-6) inside.push(s+':'+q.kind+'@'+f.j.toFixed(2));
        }
      }
      for(const f of pts) for(const b of bld){
        if(b.kind==='scaffold'&&f.kind!=='folk') continue;
        checks++;
        const box={i0:b.i0,i1:b.i1,j0:b.j0,j1:b.j1};
        const ahead=box.i1+box.j1<f.i+f.j-1e-3;
        const occludes=hits(f.i,f.j,box);
        if(ahead&&!(f.k>b.k)) bad.push('behind '+b.kind+' '+b.half+' s'+s);
        if(occludes&&b.half==='front'&&!(b.k>f.k)) bad.push('over '+b.kind+' s'+s);
        // TOWN_FEET (0.004) puts a walker a hair in front of the ground line. Only a clear gap counts.
        if(f.i+f.j+0.02<box.i0+box.j0&&!(f.k<b.k)) bad.push('under '+b.kind+' '+b.half+' s'+s);
      }
    }
  }
  S.town.made=250000; townStage(); S.town.seen=6;
  coinRate=2000; scene.marketVans=[]; scene._mktN=0; scene._mktCD=0;
  for(let k=0;k<8;k++){scene._mktCD=0; mktFleetSync();}
  for(let step=0; step<24; step++){
    stepScene(0.35);
    const vansNow=(scene.marketVans||[]).filter(v=>v.town&&v.i!==undefined);
    vans=Math.max(vans, vansNow.length);
    const bld=townSortParts().filter(q=>TALL.indexOf(q.kind)>=0&&q.kind!=='scaffold');
    for(const v of vansNow){
      const f={i:v.i,j:v.j,k:v.i+v.j};
      for(const b of bld){
        checks++;
        const box={i0:b.i0,i1:b.i1,j0:b.j0,j1:b.j1};
        if(box.i1+box.j1<f.i+f.j-1e-3&&!(f.k>b.k)) bad.push('van behind '+b.kind);
        if(hits(f.i,f.j,box)&&b.half==='front'&&!(b.k>f.k)) bad.push('van over '+b.kind);
        if(f.i+f.j+0.02<box.i0+box.j0&&!(f.k<b.k)) bad.push('van under '+b.kind);
      }
    }
  }
  const host=townPieces().find(q=>q.kind==='cot');
  scene.townFx={i:host.i,j:host.j,t:0.4};
  scene.t=12;
  const sc=townSortParts().filter(q=>q.kind==='scaffold');
  const folk=townSortParts().filter(q=>q.kind==='folk');
  let scBad=0;
  for(const f of folk) for(const b of sc){
    const box={i0:b.i0,i1:b.i1,j0:b.j0,j1:b.j1};
    if(hits(f.i,f.j,box)&&b.half==='front'&&!(b.k>f.k)) scBad++;
    if(box.i1+box.j1<f.i+f.j-1e-3&&!(f.k>b.k)) scBad++;
  }
  scene.townFx=null;
  return {bad:[...new Set(bad)].slice(0,6), nb:[...new Set(bad)].length, checks, vans, paused, inside:[...new Set(inside)].slice(0,4), ni:[...new Set(inside)].length, sc:sc.length, scBad};
}'''
FEET=r'''()=>{
  const keep=townFolk;
  const cv=document.getElementById('scene'); const g=cv.getContext('2d'); const rct=cv.getBoundingClientRect(); const dpr=scene.dpr||1;
  function shot(){stepScene(0); return g.getImageData(0,0,cv.width,cv.height).data;}
  function roof(data,x,y){const i=(y*cv.width+x)*4; const R=data[i],G=data[i+1],B=data[i+2]; return R>120&&R>G+35&&R>B+30&&G<140&&B<120;}
  townFolk=()=>[]; const bare=shot();
  townFolk=keep; const both=shot();
  const tall={cot:1,church:1,stall:1,well:1,tree:1,sign:1};
  function hitsBox(i,j,b){const ti0=b.i0-i,ti1=b.i1-i,tj0=b.j0-j,tj1=b.j1-j;return Math.max(ti0,tj0)<Math.min(ti1,tj1)-1e-9&&Math.min(ti1,tj1)>1e-6;}
  let hits=0;
  for(const f of townFolk()){
    let occluded=false;
    for(const q of townLive()){if(!tall[q.kind]) continue; if(hitsBox(f.i,f.j,townBoxOf(q))) occluded=true;}
    if(!occluded) continue;
    const s=w2s(P(f.i,f.j)[0], P(f.i,f.j)[1]);
    for(let dy=-2; dy<=4; dy+=2) for(let dx=-4; dx<=4; dx+=2){
      const x=Math.round((s[0]+dx-rct.left)*dpr), y=Math.round((s[1]+dy-rct.top)*dpr);
      if(x<1||y<1||x>=cv.width-1||y>=cv.height-1) continue;
      if(!roof(bare,x,y)) continue;
      const i=(y*cv.width+x)*4;
      if(both[i]!==bare[i]||both[i+1]!==bare[i+1]||both[i+2]!==bare[i+2]) hits++;
    }
  }
  return {hits};
}'''
def shot_clean(pg):
    E(pg, QUIET)
    E(pg, r'''()=>{if(typeof checkAch==="function")checkAch(true);if(typeof ntClear==="function")ntClear();document.querySelectorAll(".toast,.confetti,.modal-bg").forEach(e=>e.remove());const f=document.getElementById("fxLayer");if(f)f.innerHTML="";scene.particles.length=0;}''')
    paint(pg, 2)
def arm_view(pg):
    E(pg, r'''()=>{
      S.coins=1e12; S.premium.lvl=Math.max(1,S.premium.lvl||0);
      for(const id of ["sawmill","chipper","framer"]) if(S.buildings[id]){S.buildings[id].lvl=Math.max(8,S.buildings[id].lvl);S.buildings[id].on=true;}
      if(S.town){S.town.made=250000; if(typeof townStage==="function") townStage(); S.town.seen=6;}
      S.events=[]; S.nextEvent=1e15; if(S.mish) S.mish.next=1e15;
      S.wx.w="clear"; S.wx.next=1e15; if(TT.setClock) TT.setClock(10*60); if(S.ob) S.ob.st="skip";
      const q=P(38.3,38.4,0); const c=scene.cam; c.fly=null; c.x=c.tx=q[0]; c.y=c.ty=q[1];
      c.z=c.tz=Math.min(c.maxZ, Math.max((c.fitZ||0.4)*1.55, 0.9));
      for(let i=0;i<24;i++) stepScene(1/30);
    }''')
def med_frames(pg):
    return E(pg, r'''()=>{const a=[]; for(let i=0;i<10;i++){const t0=performance.now(); stepScene(1/30); const ms=performance.now()-t0; if(i>=3) a.push(ms);} a.sort((x,y)=>x-y); return a[a.length>>1];}''')
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def page(dev=None, init=CLEAR, url=URL, vp=None):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type', None)
            ctx=b.new_context(**d, service_workers='block')
        else:
            ctx=b.new_context(viewport=vp or {'width':1280,'height':800}, service_workers='block')
        ctx.add_init_script(SEED+init); pg=ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: missing.append(r.url) if r.status>=400 and 'favicon' not in r.url else None)
        pg.goto(url); ready(pg); return pg
    pg=page(); E(pg, QUIET)
    ok(ver(E(pg,'TT.VERSION'))>=(2,56), f"VERSION is 2.56 or newer ({E(pg,'TT.VERSION')})")
    sw=open(os.path.join(ROOT,'sw.js'), encoding='utf-8').read()
    m=re.search(r"timber-tycoon-v([\d.]+)", sw)
    ok(m and ver(m.group(1))>=(2,56), 'service-worker cache is timber-tycoon-v2.56 or newer')
    ok(E(pg,'canSell("logs")') is False, 'logs stay unsellable')
    order=E(pg, ORDER)
    ok(order['nb']==0 and order['checks']>1000 and order['sc']>=2 and order['scBad']==0 and order['ni']==0,
       f"sort holds for residents, vans and the scaffold ({order['checks']} checks, {order['nb']} bad, scaffold halves {order['sc']}, inside {order['inside'][:2]})")
    ok(order['vans']>=1, f"a town van was on the street ({order['vans']})")
    ok(order['paused']>0, f"walkers pause ({order['paused']} stand samples)")
    E(pg, SHOW); paint(pg, 2)
    foot_hits=[]
    for t in (1.2, 4.4, 8.1, 12.6, 19.4, 26.7, 33.0):
        E(pg, f'()=>{{scene.t={t};}}')
        foot_hits.append(E(pg, FEET)['hits'])
    ok(max(foot_hits)<=8, f"feet are not standing on a roof (roof-coloured pixels in the foot box: {foot_hits})")
    # Church roof and tower, at several moments of the walk and three daytime hours.
    # (The day is DAY_LEN seconds, so these are morning, midday and afternoon, all
    # in the white part of the day. A night hour would relight the sprite.)
    # A pixel counts as covered only when the walker fully replaces it. An edge the
    # church still paints, blended with whoever stands behind it, does not.
    roof=E(pg, r'''()=>{
      scene.visible=false;
      const cv=document.getElementById("scene"); const g=cv.getContext("2d");
      const cam=scene.cam, p=P(38.35,40.8,8);
      cam.fly=null; cam.x=cam.tx=p[0]; cam.y=cam.ty=p[1];
      cam.z=cam.tz=Math.min(cam.maxZ, Math.max(cam.fitZ*3.4, 1.6));
      S.town.made=250000; townStage(); S.town.seen=6; S.wx.w="clear"; S.wx.next=1e15;
      scene.particles.length=0;
      for(let i=0;i<5;i++){scene.t=1; stepScene(0);}
      const ch=townPieces().find(q=>q.kind==="church");
      const cot=townPieces().filter(q=>q.kind==="cot").pop();
      const dpr=scene.dpr||1, W=scene.w, H=scene.h;
      function flatCount(piece, half){
        const z=cam.z;
        g.setTransform(dpr,0,0,dpr,0,0); g.fillStyle="#00ff00"; g.fillRect(0,0,cv.width,cv.height);
        const base=g.getImageData(0,0,cv.width,cv.height).data;
        g.setTransform(dpr*z,0,0,dpr*z,dpr*(W/2-cam.x*z),dpr*(H/2-cam.y*z));
        townClip(g, piece, half);
        const d=g.getImageData(0,0,cv.width,cv.height).data;
        let n=0, gold=0;
        for(let i=0;i<d.length;i+=4){
          if(d[i]===base[i]&&d[i+1]===base[i+1]&&d[i+2]===base[i+2]) continue;
          n++;
          const R=d[i],G=d[i+1],B=d[i+2];
          if(R>200&&G>165&&B<140&&G>B+40) gold++;
        }
        return {n, gold};
      }
      const front=flatCount(ch,"front"), back=flatCount(ch,"back"), cotBack=flatCount(cot,"back");
      function art(R,G,B){
        const roof=R>140&&G<140&&B<115&&R>G+40&&R>B+35;
        const gold=R>200&&G>165&&B<140&&G>B+40&&R-G<80;
        const cap=R>40&&R<100&&G>25&&G<75&&B<65&&R>G+15&&Math.abs(G-B)<25;
        return roof||gold||cap;
      }
      const keepLive=townLive, keepFolk=townFolk;
      const times=[];
      for(let t=0;t<110&&times.length<4;t+=0.45){
        scene.t=t;
        if(townFolk().some(f=>Math.abs(f.j-ch.j)<1.7)&&(times.length===0||t-times[times.length-1]>10)) times.push(+t.toFixed(2));
      }
      const clocks=[0.35, 0.50, 0.65].map(p=>Math.round(p*DAY_LEN));
      let covered=0, mask=0, checks=0;
      const bad=[];
      for(const clock of clocks){
        TT.setClock(clock); S.wx.w="clear"; S.wx.next=1e15;
        scene.particles.length=0; scene.t=times[0];
        for(let i=0;i<3;i++) stepScene(0);
        for(const t of times){
          scene.particles.length=0; scene.t=t;
          townLive=keepLive; townFolk=()=>[]; stepScene(0);
          const A=g.getImageData(0,0,cv.width,cv.height).data;
          townLive=()=>keepLive().filter(q=>q.kind!=="church"); stepScene(0);
          const B=g.getImageData(0,0,cv.width,cv.height).data;
          townLive=keepLive; townFolk=keepFolk; stepScene(0);
          const C=g.getImageData(0,0,cv.width,cv.height).data;
          townLive=()=>keepLive().filter(q=>q.kind!=="church"); stepScene(0);
          const W=g.getImageData(0,0,cv.width,cv.height).data;
          checks++;
          for(let i=0;i<A.length;i+=4){
            if(A[i]===B[i]&&A[i+1]===B[i+1]&&A[i+2]===B[i+2]) continue;
            if(!art(A[i],A[i+1],A[i+2])) continue;
            mask++;
            if(C[i]===A[i]&&C[i+1]===A[i+1]&&C[i+2]===A[i+2]) continue;
            if(C[i]===W[i]&&C[i+1]===W[i+1]&&C[i+2]===W[i+2]){
              covered++;
              if(bad.length<4) bad.push(clock+":"+t);
            }
          }
        }
      }
      townLive=keepLive; townFolk=keepFolk; scene.particles.length=0;
      TT.setClock(10*60); scene.visible=true;
      return {covered, mask, checks, times, bad, front, back, cotBack:cotBack.n};
    }''')
    ok(roof['times'] and len(roof['times'])>=3 and roof['checks']>=9 and roof['mask']>2000
       and roof['covered']==0 and roof['cotBack']>200 and roof['front']['gold']>10 and roof['back']['gold']==0,
       f"walkers cover 0 church roof/tower pixels ({roof['covered']} covered, mask {roof['mask']}, times {roof['times']}, clocks {roof['checks']}, far half {roof['cotBack']}, cross in the near half {roof['front']['gold']}/{roof['back']['gold']})")
    # ---- early game vs v2.55 ----
    pg.close()
    pg=page(); e_new=E(pg, EARLY); pg.close()
    pg=page(url=OLD); e_old=E(pg, EARLY); pg.close()
    ok(e_new[5] is False and e_old[5] is False and e_new[1:]==e_old[1:] and near(e_new[0], e_old[0], 1e-6), f"opening script matches v2.55 ({e_new[0]:.4f} vs {e_old[0]:.4f})")
    # ---- frame cost vs the v2.55 snapshot, short blocks, order flips ----
    pg=page(); pg2=page(url=OLD)
    E(pg, QUIET); E(pg2, QUIET)
    arm_view(pg); arm_view(pg2)
    news=[]; olds=[]
    for rnd in range(9):
        if rnd%2==0:
            news.append(med_frames(pg)); olds.append(med_frames(pg2))
        else:
            olds.append(med_frames(pg2)); news.append(med_frames(pg))
    def med(a):
        b=sorted(a); return b[len(b)//2]
    mn, mo = med(news), med(olds)
    ok(mn<=mo*1.2+1.0, f"village view frame cost {mn:.2f} ms vs v2.55 {mo:.2f} ms (limit {mo*1.2+1:.2f})")
    pg2.close()
    # ---- saves ----
    for ver_s, houses, lvl in (('2.55',40,12),('2.54',8,8),('2.39',3,6),('2.24',0,2)):
        raw=json.dumps(json.dumps({'version':ver_s,'coins':22000,'legacy':0,'upgrades':{'sharp':1},'buildings':{'sawmill':{'lvl':lvl,'on':True}},'res':{'logs':30,'planks':8,'houses':houses}}))
        pg.close(); pg=page(init='localStorage.setItem("timberTycoon_save_v1",'+raw+');')
        r=E(pg, r'''()=>{let s=0;for(let k=0;k<4;k++){S.forest.m=1e6;tick(1,false);s+=S.coins;}return {v:S.version,saw:S.buildings.sawmill.lvl,logs:canSell("logs"),made:S.town.made,ok:isFinite(S.town.made)&&isFinite(townMult())&&isFinite(S.coins)&&s>0};}''')
        ok(r['ok'] and ver(r['v'])>=(2,56) and r['saw']==lvl and r['logs'] is False and (houses<=0 or r['made']+1e-6>=houses or near(r['made'], houses)), f"{ver_s} save loads (saw {r['saw']}, made {r['made']})")
    # ---- desktop click + town shot ----
    E(pg, QUIET); E(pg, SHOW); paint(pg, 2); shot_clean(pg)
    xy=E(pg, 'townScreen()')
    pg.mouse.click(xy[0], xy[1]); paint(pg, 2)
    ok(E(pg,'TT.curSheet')=='town', 'desktop click opens the Town sheet')
    E(pg, 'closeSheet()'); shot_clean(pg)
    E(pg, r'''()=>{S.coins=1e15;for(const id of ["sawmill","chipper","kiln","peeler","beamsaw","carpentry","pellet","paper","furniture","glulam","panelpress"]) if(S.buildings[id]) S.buildings[id].lvl=Math.max(20,S.buildings[id].lvl);
      S.premium.lvl=2; if(S.buildings.framer) S.buildings.framer.lvl=Math.max(8,S.buildings.framer.lvl); S.collectors.lumberjack=12;
      S.town.made=250000; townStage(); S.town.seen=6; TT.setClock(10*60); S.wx.w="clear"; S.wx.next=1e15; fitCamera(true); TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('desktop.png'))
    E(pg, r'''()=>{scene.t=18; TT.setClock(10*60); S.wx.w="clear"; const c=scene.cam,p=P(38.15,36.4,8); c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]; c.z=c.tz=Math.min(c.maxZ, Math.max(c.fitZ*3.1,1.4)); TT.render();}''')
    paint(pg, 3); shot_clean(pg)
    pg.screenshot(path=shot_path('town.png'))
    ok(os.path.getsize(shot_path('desktop.png'))>8000 and os.path.getsize(shot_path('town.png'))>8000, 'desktop and town shots were written')
    pg.close()
    # ---- phones ----
    for dev in ('iPhone 13','Pixel 7'):
        pg=page(dev); E(pg, QUIET); E(pg, SHOW); paint(pg, 2)
        xy=E(pg, 'townScreen()')
        touch_at(pg, xy[0], xy[1]); paint(pg, 2)
        if E(pg,'TT.curSheet')!='town':
            touch_at(pg, xy[0], xy[1]); paint(pg, 2)
        ok(E(pg,'TT.curSheet')=='town', f'{dev}: touch opens the Town sheet')
        if dev=='iPhone 13':
            E(pg, r'''()=>{closeSheet(); S.town.made=250000; townStage(); S.town.seen=6; TT.setClock(10*60); S.wx.w="clear"; fitCamera(true); TT.render();}''')
            paint(pg, 2); shot_clean(pg)
            pg.screenshot(path=shot_path('mobile.png'))
            ok(os.path.getsize(shot_path('mobile.png'))>8000, 'mobile shot was written')
        pg.close()
    ok(not errs, 'no console errors '+str(errs[:4]))
    ok(not missing, 'no 404s '+str(missing[:3]))
    b.close()
print('ALL PASS' if not FAILS else f'{len(FAILS)} FAILED')
for f in FAILS: print(' -', f)
sys.exit(1 if FAILS else 0)
