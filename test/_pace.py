# Deterministic page timing for Playwright suites.
#
# js/main.js loop() ticks from Date.now() every 100 ms. A gap between two
# page.evaluate calls is enough for that tick to pull logs out of a full Log
# Yard, so the next chop() fills the yard instead of going on as overflow.
# Freezing Date.now() in the init script makes every loop dt 0. Drive game
# time with tick / TT.simulate, and call paint() when the DOM or the canvas
# must catch up: render() only runs from the loop when Date.now() moves.
#
# The multi-minute balance and order sims still call tick() themselves. This
# only removes the wall-clock waits and the live-tick races.
HOLD=("(()=>{if(window.__clk)return;window.__clk=Date.now();Date.now=()=>window.__clk;})();")
# HUD order line after renderOrderCard(). One row, timer fully drawn, clear of the 🔗 badge.
HUD_LINE=r'''(()=>{
  if(typeof renderOrderCard==='function') renderOrderCard();
  const c=document.getElementById('orderCard'); if(!c) return null;
  const l=c.querySelector('.oc-l'); if(!l) return {missing:true,cls:c.className,txt:c.innerText};
  const g=document.getElementById('ocGot'), tm=document.getElementById('ocTm'), ch=c.querySelector('.oc-ch');
  const gb=g.getBoundingClientRect(), tb=tm.getBoundingClientRect(), lb=l.getBoundingClientRect(), cb=c.getBoundingClientRect();
  const hb=ch?ch.getBoundingClientRect():null;
  const fabs=document.getElementById('fabs');
  const fb=fabs&&fabs.getBoundingClientRect().width>0?fabs.getBoundingClientRect():null;
  return {h:+lb.height.toFixed(2), one:Math.abs(gb.top-tb.top)<1, gap:+(tb.left-gb.right).toFixed(2),
    badge:hb?+(hb.left-tb.right).toFixed(2):null, fit:cb.left>=-0.5&&cb.right<=innerWidth+0.5,
    fab:fb?+(fb.left-cb.right).toFixed(2):null,
    gotClip:g.scrollWidth>g.clientWidth+1, tmClip:tm.scrollWidth>tm.clientWidth+1,
    txt:c.innerText, ws:getComputedStyle(l).whiteSpace, cardW:+cb.width.toFixed(1), vw:innerWidth};
})()'''
# Center a forest cell and return its screen point. The fit view on a narrow phone can
# show only the yard, so TT.forestScreen() is not enough on its own.
FOREST=r'''(()=>{
  let spot=null;
  for(let j=-6;j<12 && !spot;j+=0.5) for(let i=-4;i<14;i+=0.5) if(typeof isForestPt==='function'&&isForestPt(i,j)){spot=[i,j];break;}
  if(!spot) return null;
  const p=P(spot[0],spot[1],10);
  const c=scene.cam; c.fly=null; c.x=c.tx=p[0]; c.y=c.ty=p[1]; c.z=c.tz=Math.min(c.maxZ,Math.max(c.fitZ*1.2,.85));
  const s=w2s(p[0],p[1]);
  const [tb,bb]=barH();
  const open=(x,y)=>{const el=document.elementFromPoint(x,y);return !!(el&&(el.id==='scene'||el.tagName==='CANVAS'));};
  const hit=(x,y)=>{if(!open(x,y)) return null;const q=hitTest(x,y);return q&&q.type==='forest'?[x,y]:null;};
  const a=hit(s[0],s[1]); if(a) return a;
  for(let y=tb+6;y<innerHeight-bb-6;y+=12) for(let x=8;x<innerWidth-8;x+=12){const q=hit(x,y); if(q) return q;}
  return null;
})()'''
def ready(pg, timeout=15000):
    # page.evaluate runs in the page world, where TT lives. wait_for_function does not see those globals.
    import time
    end=time.monotonic()+timeout/1000; last=None
    while time.monotonic()<end:
        try:
            if pg.evaluate('() => typeof TT!=="undefined" && typeof S!=="undefined"'): return
        except Exception as e:
            last=e
        pg.wait_for_timeout(40)
    raise TimeoutError('game did not boot (%s)'%last)
def paint(pg, frames=2):
    pg.evaluate("()=>{if(window.TT&&TT.render)TT.render();if(typeof stepScene==='function')stepScene(1/60);}")
    if frames:
        pg.evaluate("(n)=>new Promise(res=>{let k=0;(function step(){requestAnimationFrame(()=>{if(++k>=n)res(1);else step();});})();})", frames)
