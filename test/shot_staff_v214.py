from playwright.sync_api import sync_playwright
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL
import sys as _s,os as _o; _s.path.insert(0,_o.path.dirname(_o.path.abspath(__file__))); from shots import shot_dir
OUT=shot_dir('2.14')
MID='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,40);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,25);S.coins=1e12;
 for(const m of MANAGERS.slice(0,6)){if(!mgrLvl(m.bid)) hireMgr(m.id); while(mgrLvl(m.bid)<3){const c=mgrUpCost(m,mgrLvl(m.bid));S.seeds=Math.max(S.seeds,c.seeds||0);levelMgr(m.id);}}
 staffMigrateFromMgr(); TT.staffRefreshCandidates(true);
 for(let i=0;i<3 && TT.S.staff.candidates.length;i++){const c=TT.S.staff.candidates[0]; TT.staffHireCandidate(c.id);}
 const bids=BUILDINGS.filter(b=>S.buildings[b.id].lvl>0).map(b=>b.id);
 for(const w of TT.S.staff.team){
   if((w.role==='mill'||w.role==='engineer')&&!w.assign){
     for(const bid of bids){if(TT.staffCanAssign(w,bid)){TT.staffAssign(w.id,bid);break;}}
   }
 }
 TT.rebuildAll();})()'''
CLEAN='document.querySelectorAll(".toast,#fxLayer *").forEach(t=>t.remove());'
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1280,'height':800},service_workers='block')
    ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page()
    pg.on('pageerror',lambda e:print('ERR',e))
    pg.goto(URL); pg.wait_for_timeout(1200); pg.evaluate(MID); pg.wait_for_timeout(500)
    pg.evaluate("TT.staffTabCur='team';staffSig='';TT.openSheet('staff')"); pg.wait_for_timeout(900)
    pg.evaluate(CLEAN); pg.screenshot(path=OUT+'staff.png')
    print('wrote staff.png', os.path.getsize(OUT+'staff.png'))
    pg.evaluate("TT.staffRefreshCandidates(true);TT.staffTabCur='cand';staffSig='';TT.openSheet('staff')"); pg.wait_for_timeout(700)
    pg.evaluate(CLEAN); pg.screenshot(path=OUT+'staff-candidates.png')
    print('wrote staff-candidates.png')
    ctx.close()
    d=dict(p.devices['iPhone 13']); d.pop('default_browser_type',None)
    ctx=b.new_context(**d,service_workers='block'); ctx.add_init_script('try{localStorage.clear()}catch(e){}'); pg=ctx.new_page()
    pg.goto(URL); pg.wait_for_timeout(1300); pg.evaluate(MID)
    pg.evaluate('document.querySelectorAll(".modal-bg").forEach(t=>t.remove());TT.fitCamera(true)'); pg.wait_for_timeout(400)
    pg.evaluate("TT.staffTabCur='team';staffSig='';TT.openSheet('staff')"); pg.wait_for_timeout(900)
    pg.evaluate(CLEAN); pg.screenshot(path=OUT+'mobile-staff.png')
    print('wrote mobile-staff.png', os.path.getsize(OUT+'mobile-staff.png'))
    ctx.close(); b.close()
print('done')
