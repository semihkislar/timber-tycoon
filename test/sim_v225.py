# v2.25 order sizing sim: multi-Replant greedy runs (real game code, headless) that sample client orders, daily contracts
# and export contracts every 15 s and play the order board (accept everything a slot allows).
# Usage: python3 test/sim_v225.py [path-in-repo, default index.html] [runs] [strong 0/1]   → prints a JSON summary
# Compare with the old version: python3 test/sim_v225.py releases/v2.24/index.html
from playwright.sync_api import sync_playwright
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import BASE,ROOT
SIM=open(os.path.join(ROOT,'test','sim_v218.js')).read()
HOOK='''{gain:()=>pendingSeeds(),cur:()=>S.legacy||0,prestige:()=>doPrestige(),
 spend:()=>{for(let g=0;g<50;g++){let b=null,bc=Infinity;for(const u of SHOP){if(!shopAvail(u.id)) continue;const c=shopCost(u.id);if(c<bc){bc=c;b=u.id;}}if(!b||bc>S.seeds||!buyShop(b)) break;}
   if(window._strong){for(const n of RNODES) S.research[n.id]=1;S.premium.lvl=Math.max(1,S.premium.lvl);M=computeMods();}
   window._T0=S.time;window._lt=-99;(window._R=window._R||[]).push({s:[],done:[],fail0:S.orders.failed||0,done0:S.orders.done||0,dd0:(S.daily&&S.daily.total)||0,earn0:0,ord:0});S.orders.next=S.time+20;},
 hold:()=>{const R=window._R[window._R.length-1],t=S.time-window._T0,inc=(typeof ordInc==='function'?ordInc():Math.max(coinRate,1));
   // play the board: accept whatever fits
   for(let k=0;k<4;k++){if(!S.orders.offer||!acceptOrder()) break;}
   if(S.daily&&S.daily.offers&&S.daily.offers.length&&(S.daily.active||[]).length<DAILY_MAX_ACTIVE) acceptDaily(S.daily.offers[0].id);
   if(t-window._lt>=15){window._lt=t;
     const one=(kind,it,amt,rw,dur)=>R.s.push({k:kind,t:Math.round(t),it,amt,rw,val:amt*price(it),inc,cr:coinRate,cs:cs(),dur});
     if(ordersOpen()) for(let i=0;i<3;i++){const o=makeOrder();if(o) one('C',o.item,o.amt,o.reward,o.dur);}
     if(S.daily&&S.daily.offers) for(const o of S.daily.offers) one('D',o.item,o.amt,o.reward,o.dur);
     if(typeof shMakeOffer==='function'&&S.ship){const o=shMakeOffer();if(o) one('X',o.res,o.qty,shReward(o),o.t);}}
   return false;},
 want:(g,c,T)=>{rpTick();return rpAdvice().k==='now'||(T>=600&&g>=Math.max(3,c*.5));}}'''
EXTRA='''(()=>{const R=window._R[window._R.length-1];return {done:S.orders.done-R.done0,failed:S.orders.failed-R.fail0,daily:((S.daily&&S.daily.total)||0)-R.dd0,ordEarn:R.ord,cs:cs(),earned:S.totalEarned};})()'''
def run(path='index.html',runs=6,strong=1,maxMin=30):
    with sync_playwright() as p:
        b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
        ctx.add_init_script('if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}')
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto(BASE+path); pg.wait_for_timeout(1300)
        pg.evaluate("(()=>{S.events=[];S.nextEvent=S.time+1e12;S.fires={};S.fireCool=1e12;window._strong=%d;const ce=completeOrder;window.completeOrder=function(){const O=S.orders,o=arguments[1]||O.active;const R=window._R&&window._R[window._R.length-1];if(R&&o) R.ord+=o.reward;return ce.apply(this,arguments);};const cd=completeDaily;window.completeDaily=function(o){const R=window._R&&window._R[window._R.length-1];if(R&&o) R.ord+=o.reward;return cd.apply(this,arguments);};})()"%strong)
        R=pg.evaluate(f"({SIM})({{runs:{runs},maxMin:{maxMin},hook:{json.dumps(HOOK)},extra:{json.dumps(EXTRA)}}})")
        S=pg.evaluate('window._R'); ver=pg.evaluate('TT.VERSION')
        b.close()
    out=[]
    for i,(r,s) in enumerate(zip(R,S)):
        row={'run':i+1,'min':r['min'],'cs':r['x']['cs'],'done':r['x']['done'],'failed':r['x']['failed'],'daily':r['x']['daily'],'ordShare':r['x']['ordEarn']/max(1,r['x']['earned'])}
        for k in 'CDX':
            L=[x for x in s['s'] if x['k']==k]
            if not L: row[k]=None; continue
            amts=sorted(x['amt'] for x in L); rv=sorted(x['rw']/max(1e-12,x['val']) for x in L); vs=sorted(x['val']/max(1e-12,x['inc']) for x in L)
            rs=sorted(x['rw']/max(1e-12,x['inc']) for x in L)
            row[k]={'n':len(L),'minAmt':amts[0],'small':sum(1 for a in amts if a<20),'rvMax':rv[-1],'rvMed':rv[len(rv)//2],'valSecMin':vs[0],'valSecMed':vs[len(vs)//2],'rwSecMed':rs[len(rs)//2],'tiny':sum(1 for v in vs if v<1)}
        out.append(row)
    return {'version':ver,'runs':out,'errs':errs}
if __name__=='__main__':
    a=sys.argv[1:]
    r=run(a[0] if a else 'index.html',int(a[1]) if len(a)>1 else 6,int(a[2]) if len(a)>2 else 1)
    print(json.dumps(r,indent=1))
