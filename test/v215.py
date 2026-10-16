# v2.15: staff in the world — hired staff walk and work in their area, take real campfire breaks when tired,
# tap a worker -> their Team card, 📍 on a card -> camera flies to them, productivity bubbles, draw cap + frame cost,
# building sheet "Staff here" block (and the v2.14 updateBldMgr crash fix), v2.14/v2.13 save migration, phones, snapshot.
from playwright.sync_api import sync_playwright
import sys,os,json,math,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _server import URL,BASE,ROOT,ver
FAILS=[]
def ok(c,msg):
    print(('PASS ' if c else 'FAIL ')+msg,flush=True)
    if not c: FAILS.append(msg)
def E(pg,js,arg=None): return pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
CLEAR='if(!sessionStorage.getItem("_c")){sessionStorage.setItem("_c","1");try{localStorage.clear()}catch(e){}}'
MID='''(()=>{const S=TT.S;S.coins=1e12;S.totalEarned=1e12;for(const c of COLLECTORS) TT.buyCollector(c.id,30);
 for(const b of BUILDINGS) if(!b.premium) TT.buyBuilding(b.id,25);S.coins=1e12;TT.buyStation();TT.S.events=[];TT.S.nextEvent=TT.S.time+1e6;
 TT.S.fires={};TT.S.fireCool=TT.S.time+1e6;TT.setClock(420*.45);TT.setWeather('clear',900);TT.S.wx.next=1e9;const v=TT.scene.wxv;for(const k in v) v[k]=0;
 document.querySelectorAll('.toast,.modal-bg').forEach(t=>t.remove());TT.rebuildAll();})()'''
# one of every role (steady unless told otherwise), mill → sawmill, engineer → chipper
HIRE='''((o)=>{const st=TT.staffState();const roles=o.roles||['lumberjack','driver','mill','engineer','forklift','dock','firefighter'];const ids=[];
 roles.forEach((r,k)=>{const id='cT'+(st.seq+1)+'_'+k;st.candidates=[{id,name:'Test '+r+' '+k,role:r,skill:3,rarity:['C','R','E','L'][k%4],traits:o.traits||['steady'],look:STAFF_LOOKS[k%STAFF_LOOKS.length]}];
   TT.S.coins=1e12;TT.staffHireCandidate(id);const w=st.team[st.team.length-1];ids.push(w.id);
   if(r==='mill') TT.staffAssign(w.id,o.millAt||'sawmill'); if(r==='engineer') TT.staffAssign(w.id,o.engAt||'chipper');});
 document.querySelectorAll('.toast').forEach(t=>t.remove());return ids;})'''
AREA='''(()=>{const out={};const near=(a,i,j,r)=>Math.hypot(a.i-i,a.j-j)<=r;
 for(const a of TT.SW.list){const w=a.w;let good=false;
  if(a.rest) good=near(a,CAMP.i,CAMP.j,3.2);
  else if(w.role==='lumberjack') good=isLumberZone(a.i,a.j)||Object.values(LANDINGS).some(l=>near(a,l.i,l.j,3.5));
  else if(w.role==='driver') good=near(a,TT.YARD.ci,TT.YARD.cj,4.6);
  else if(w.role==='mill'||w.role==='engineer'){const L=w.assign?TT.LOTS[w.assign]:TT.YARD;good=near(a,L.ci,L.cj,4.2);}
  else if(w.role==='forklift'||w.role==='dock') good=near(a,TT.DOCK.ci,TT.DOCK.cj,4.6);
  else if(w.role==='firefighter') good=near(a,TT.STATION.ci,TT.STATION.cj,3.6);
  out[a.wid]={role:w.role,good,i:+a.i.toFixed(2),j:+a.j.toFixed(2),st:a.st,pose:a.pose,rest:a.rest};}
 return out;})()'''
def zoom_to(pg,i,j,z):
    E(pg,f'(()=>{{const c=TT.cam;c.maxZ=Math.max(c.maxZ||0,4);c.fly=null;c.z=c.tz={z};const p=TT.P({i},{j});c.x=c.tx=p[0];c.y=c.ty=p[1];}})()')
def zoom_on(pg,role,z):
    a=E(pg,"(r)=>{const a=TT.SW.list.find(x=>x.w.role===r);return a?[a.ti,a.tj]:null}",role)
    if a: zoom_to(pg,a[0],a[1],z)
    return a
def visible_worker(pg,role=None,act=False):
    return E(pg,'''(o)=>{const [tb,bb]=[document.getElementById('topbar').offsetHeight,document.getElementById('bottombar').offsetHeight];
      const L=TT.staffPeople().filter(a=>a.vis&&a.alpha>=1&&(!o.role||a.role===o.role)&&(!o.act||a.st!=='go')&&a.sx>40&&a.sx<innerWidth-40&&a.sy>tb+60&&a.sy<innerHeight-bb-10);
      return L.length?L[0]:null;}''',{'role':role,'act':act})
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]; missing=[]
    def watch(pg,tag=''):
        pg.on('pageerror',lambda e: errs.append(f'{tag}{e}'))
        pg.on('console',lambda m: errs.append(f'{tag}console: {m.text}') if m.type=='error' else None)
        pg.on('response',lambda r: missing.append(r.url) if r.status==404 and 'favicon' not in r.url else None)
    def page(vp=None,dev=None,tag=''):
        if dev:
            d=dict(p.devices[dev]); d.pop('default_browser_type',None); ctx=b.new_context(**d,service_workers='block')
        else: ctx=b.new_context(viewport=vp or {'width':1280,'height':800},service_workers='block')
        ctx.add_init_script(CLEAR); pg=ctx.new_page(); watch(pg,tag); pg.goto(URL); pg.wait_for_timeout(1200); return ctx,pg

    # --- version / sw ---
    ctx,pg=page()
    ok(ver(E(pg,'TT.VERSION'))>=(2,15),f"VERSION>=2.15 ({E(pg,'TT.VERSION')})")
    sw=E(pg,'fetch("sw.js").then(r=>r.text())'); m=re.search(r"timber-tycoon-v([\d.]+)'",sw)
    ok(m and ver(m.group(1))>=(2,15),f'sw.js cache bumped to >= v2.15 ({m and m.group(1)})')
    ok(E(pg,"[...document.scripts].some(s=>/js\\/staffworld\\.js/.test(s.src))"),'index.html loads js/staffworld.js')
    ok(E(pg,'TT.SW.list.length')==0,'fresh game: no staff in the world')
    ctx.close()

    # --- v2.14 save (tired staff hovering at ~15% energy, no brk field) migrates ---
    ctx,pg=page(); E(pg,MID); E(pg,HIRE,{'traits':['nightowl']})
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.14'
    for k,w in enumerate(old['staff']['team']):
        w.pop('brk',None); w['energy']=14.6 if k%2 else 72
    old['staff']['team'][0]['energy']=None   # a broken value must not crash the load
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1500)
    S=E(pg,'TT.S'); team=S['staff']['team']
    ok(ver(S['version'])==ver(E(pg,'TT.VERSION')) and len(team)==7,f'v2.14 save loads with its 7 staff (version {S["version"]})')
    ok(all(isinstance(w.get('brk'),bool) and isinstance(w.get('energy'),(int,float)) for w in team),'migration adds brk + numeric energy to every worker')
    E(pg,'staffTick(0.5,false)')
    ok(E(pg,"TT.S.staff.team.filter(w=>w.brk).length")>=3,f"tired v2.14 workers (<15%) go on a campfire break ({E(pg,'TT.S.staff.team.filter(w=>w.brk).length')})")
    ok(E(pg,'TT.SW.list.length')==7,'all 7 hired staff are in the world')
    ctx.close()

    # --- v2.13 save with managers: founding foremen stay manager sprites, no duplicate world worker ---
    ctx,pg=page(); E(pg,MID)
    E(pg,"(()=>{TT.S.coins=1e15;for(const m of MANAGERS.slice(0,3)){if(!mgrLvl(m.bid)) hireMgr(m.id);}})()")
    old=E(pg,'JSON.parse(JSON.stringify(TT.S))'); old['version']='2.13'; old.pop('staff',None)
    pg.evaluate('(s)=>{localStorage.setItem("timberTycoon_save_v1",JSON.stringify(s));Storage.prototype.setItem=function(){};}',old); pg.reload(); pg.wait_for_timeout(1500)
    ok(E(pg,"TT.S.staff.team.filter(w=>w.founding).length")>=3 and E(pg,'TT.SW.list.length')==0,'v2.13 managers → founding foremen, drawn once (as the building manager)')
    ctx.close()

    # --- every role works in its own area ---
    ctx,pg=page(); E(pg,MID); ids=E(pg,HIRE,{}); pg.wait_for_timeout(4500)
    ar=E(pg,AREA)
    ok(len(ar)==7 and all(v['good'] for v in ar.values()),'each role is in its area: '+', '.join(f"{v['role']}{'' if v['good'] else '✗('+str(v['i'])+','+str(v['j'])+')'}" for v in ar.values()))
    poses=E(pg,"(()=>{const s=new Set();for(let k=0;k<40;k++){}return [...new Set(TT.SW.list.map(a=>a.pose))];})()")
    ok(len(poses)>=2,f'workers animate between poses {poses}')
    seen=set()
    for k in range(12):
        for a in E(pg,'TT.staffPeople()'): seen.add((a['role'],a['pose']))
        pg.wait_for_timeout(500)
    ok(('lumberjack','chop') in seen,'lumberjack chops trees')
    ok(any(r=='mill' and q in ('box','hammer') for r,q in seen),'mill worker carries / hammers at the building')
    ok(any(r=='dock' and q=='box' for r,q in seen),'dock worker carries crates to the trucks')
    ok(E(pg,"new Set(TT.SW.list.map(a=>JSON.stringify(swLook(a.w)))).size")==7,'role-coloured look per role (7 distinct)')
    ok(E(pg,"TT.SW.list.every(a=>swLook(a.w).hat==='hard'&&swLook(a.w).hatc===TT.SW_ROLE[a.w.role].hat&&swLook(a.w).vest===TT.SW_ROLE[a.w.role].vest)"),'role hard hat + hi-vis vest colours')
    ok(E(pg,"TT.SW.list.every(a=>swLook(a.w)===swLook(a.w))"),'looks are shared objects (sprite cache keys stay stable)')

    # --- campfire break (gameplay) ---
    lj=E(pg,"TT.S.staff.team.find(w=>w.role==='lumberjack').id")
    E(pg,"((id)=>{const w=TT.S.staff.team.find(x=>x.id===id);w.traits=['nightowl'];w.energy=16;})",lj)
    chop0=E(pg,'TT.staffChopBonus()')
    E(pg,'staffTick(20,false)')
    ok(E(pg,"((id)=>TT.S.staff.team.find(x=>x.id===id).brk)",lj) is True,'energy below 15% → campfire break')
    ok(E(pg,"((id)=>staffEff(TT.S.staff.team.find(x=>x.id===id)))",lj)==0 and E(pg,'TT.staffChopBonus()')<chop0,'no output while on a break')
    pg.wait_for_timeout(3500)
    a=E(pg,"((id)=>{const a=TT.SW.map.get(id);return {d:Math.hypot(a.i-CAMP.i,a.j-CAMP.j),st:a.st,pose:a.pose}})",lj)
    ok(a['d']<3.2 and a['st']=='rest' and a['pose'] in ('sit','sitdrink'),f'resting worker sits on a stool at the campfire {a}')
    zoom_to(pg,4.6,-0.4,2.4); pg.wait_for_timeout(500)
    ok(E(pg,"((id)=>{const a=TT.SW.map.get(id);return a.vis})",lj),'resting worker drawn at the campfire')
    card=E(pg,"((id)=>swStatus(TT.S.staff.team.find(x=>x.id===id)))",lj)
    ok('break' in card and 'back in' in card,f'card status shows the break ({card})')
    t_back=E(pg,"((id)=>{let n=0;const w=TT.S.staff.team.find(x=>x.id===id);while(w.brk&&n<400){staffTick(.25,false);n++;}return n*.25})",lj)
    ok(10<t_back<120,f'break ends once fully rested ({t_back:.0f}s at {E(pg,"TT.STAFF_BREAK_REFILL")}/s)')
    ok(E(pg,"((id)=>{const w=TT.S.staff.team.find(x=>x.id===id);return w.energy>=99.9&&staffEff(w)>=.99})",lj),'back to work at 100%')
    pg.wait_for_timeout(3500)
    ok(E(pg,AREA)[lj]['good'] and not E(pg,AREA)[lj]['rest'],'rested worker returns to the forest')
    # fatigue off / steady
    E(pg,"((id)=>{const w=TT.S.staff.team.find(x=>x.id===id);w.energy=5;TT.S.prefs.fatigue=false;staffTick(1,false);})",lj)
    ok(E(pg,"((id)=>{const w=TT.S.staff.team.find(x=>x.id===id);return !w.brk&&w.energy===100})",lj),'fatigue setting off → no breaks')
    E(pg,"TT.S.prefs.fatigue=true")
    ok(E(pg,"(()=>{const w=TT.S.staff.team.find(x=>x.traits.includes('steady'));w.energy=3;staffTick(1,false);return !w.brk&&w.energy===100})()"),'Steady trait never needs a break')
    # long session economy: breaks are a short dip, average output > v2.14's permanent 80%
    avg=E(pg,"((id)=>{const w=TT.S.staff.team.find(x=>x.id===id);w.energy=100;w.brk=false;let s=0,n=0,brk=0,was=false;for(let k=0;k<12000;k++){staffTick(.5,true);s+=staffEff(w)/1.2*(isNight()?1:1.2);n++;if(w.brk&&!was)brk++;was=w.brk;}return [s/n,brk,w.energy]})",lj)
    ok(0.82<avg[0]<1.25 and avg[1]>=3 and 0<=avg[2]<=100,f'6000 s session: {avg[1]} breaks, average effect {avg[0]:.2f}, energy in range')
    off=E(pg,"(()=>{TT.S.staff.team.forEach(w=>{w.energy=40;w.brk=false;});TT.simulateOffline(4*3600);return TT.S.staff.team.map(w=>w.energy).every(e=>typeof e==='number'&&isFinite(e)&&e>=0&&e<=100)})()")
    ok(off,'offline 4h: energies stay finite and in range')

    # --- tap a worker → Team card ---
    E(pg,"TT.closeSheet();TT.S.staff.team.forEach(w=>{w.energy=100;w.brk=false;w.traits=['steady'];});TT.S.coins=1e12;staffTick(.1,false)"); pg.wait_for_timeout(3500)
    zoom_on(pg,'mill',2.4); pg.wait_for_timeout(1200)
    v=visible_worker(pg,'mill',True) or visible_worker(pg,'mill')
    ok(v is not None,'mill worker visible at the sawmill')
    if v:
        h=E(pg,'(o)=>TT.hitTest(o.x,o.y-20)',{'x':v['sx'],'y':v['sy']})
        ok(h.get('type')=='staff' and h.get('wid')==v['wid'],f'hitTest on the worker → staff {h}')
        pg.mouse.click(v['sx'],v['sy']-18); pg.wait_for_timeout(700)
        ok(E(pg,'TT.curSheet')=='staff' and E(pg,'TT.staffTabCur')=='team','click on a worker opens the Team sheet')
        r=E(pg,"((id)=>{const el=document.querySelector(`#staffTabBody .staff-card[data-wid=\"${id}\"]`);if(!el) return null;const b=document.getElementById('shBody').getBoundingClientRect(),e=el.getBoundingClientRect();return {top:e.top,bot:e.bottom,bt:b.top,bb:Math.min(b.bottom,innerHeight),cls:el.className}})",v['wid'])
        ok(r is not None and r['top']>=r['bt']-2 and r['bot']<=r['bb']+2,f'their card is scrolled into view {r}')
        ok(r is not None and 'sw-flash' in r['cls'] and 'sw-sel' in r['cls'],'card is highlighted')
        ok(E(pg,'TT.SW.sel')==v['wid'],'worker selected in the world (ring + name tag)')
        # 📍 find
        E(pg,"TT.fitCamera(true)"); pg.wait_for_timeout(300)
        z0=E(pg,'TT.cam.z')
        fb=E(pg,"((id)=>{const e=document.querySelector(`#staffTabBody [data-find=\"${id}\"]`);if(!e) return null;const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.width,r.height]})",v['wid'])
        ok(fb is not None and fb[2]>=44 and fb[3]>=44,f'📍 find button on the card is ≥44px {fb}')
        if fb: pg.mouse.click(fb[0],fb[1]); pg.wait_for_timeout(1100)
        d=E(pg,"((id)=>{const a=TT.SW.map.get(id);const p=TT.P(a.i,a.j);const s=TT.w2s(p[0],p[1]);const [t,bo]=viewBand();return {sx:s[0],sy:s[1],t,bo,z:TT.cam.z}})",v['wid'])
        ok(d['z']>z0 and 0<d['sx']<1280 and d['t']-10<d['sy']<d['bo']+30,f'📍 flies the camera to the worker {d}')
    # building sheet: Staff here + no crash (v2.14 updateBldMgr regression)
    n0=len(errs)
    E(pg,"TT.openSheet('bld','sawmill')"); pg.wait_for_timeout(600)
    ok(len(errs)==n0,'building sheet opens without errors (updateBldMgr restored)')
    bm=E(pg,"(()=>{const e=document.getElementById('bpMgr');return {vis:!e.classList.contains('hidden'),txt:e.textContent,chips:e.querySelectorAll('[data-wcard]').length}})()")
    ok(bm['vis'] and 'Staff here' in bm['txt'] and bm['chips']>=1,f"sawmill sheet lists its staff ({bm['chips']} chip)")
    c=E(pg,"(()=>{const e=document.querySelector('#bpMgr [data-wcard]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.height]})()")
    ok(c[2]>=44,'staff chip ≥44px'); pg.mouse.click(c[0],c[1]); pg.wait_for_timeout(600)
    ok(E(pg,'TT.curSheet')=='staff','staff chip opens the Team card')
    E(pg,"TT.startFire('kiln')"); E(pg,"TT.openSheet('bld','kiln')"); pg.wait_for_timeout(500)
    ok(E(pg,"!document.getElementById('bpFire').classList.contains('hidden')&&/fire/i.test(document.getElementById('bpFire').textContent)"),'fire note shows in the building sheet again')
    E(pg,"TT.S.fires={};TT.closeSheet()")

    # --- productivity bubbles ---
    zoom_to(pg,8.6,11.0,2.2); pg.wait_for_timeout(1500)
    E(pg,"TT.SW.list.forEach(a=>{a.nb=0;})"); pg.wait_for_timeout(400)
    bub=E(pg,"TT.SW.list.filter(a=>a.bub).map(a=>a.bub.txt)")
    ok(1<=len(bub)<=3,f'productivity bubbles over working staff (max 3): {bub}')
    ok(all(re.search(r'[+−]\d',t) for t in bub),'bubble shows the worker\'s effect')
    ctx.close()

    # --- many staff: draw cap + frame cost ---
    ctx,pg=page(); E(pg,MID); E(pg,"TT.fitCamera(true)"); pg.wait_for_timeout(2500)
    def frame_ms(pg,n=50):
        return E(pg,f'''(()=>{{const t=[];for(let k=0;k<{n};k++){{const t0=performance.now();stepScene(1/60);t.push(performance.now()-t0);}}t.sort((a,b)=>a-b);return t[Math.floor(t.length/2)];}})()''')
    frame_ms(pg,30); base=frame_ms(pg)
    E(pg,HIRE,{'roles':['lumberjack','driver','mill','engineer','forklift','dock','firefighter']*7,'traits':['nightowl']})
    E(pg,"TT.S.staff.team.forEach((w,k)=>{if(k%4==0) w.energy=10;})"); E(pg,'staffTick(.1,false)')
    pg.wait_for_timeout(3000); frame_ms(pg,60)
    many=frame_ms(pg)
    ok(E(pg,'TT.SW.list.length')==49 and E(pg,'TT.SW.drawn')<=E(pg,'TT.SW_CAP()'),f"49 staff simulated, {E(pg,'TT.SW.drawn')} drawn (cap {E(pg,'TT.SW_CAP()')})")
    ok(many<base*1.35+2.5,f'frame cost with 49 staff {many:.2f} ms vs {base:.2f} ms without')
    ok(E(pg,'TT.SPR.px')<=E(pg,'TT.SPR.budget'),'sprite cache stays within its pixel budget')
    seats=E(pg,"(()=>{const r=TT.SW.list.filter(a=>a.rest);return [r.length,new Set(r.map(a=>a.seat)).size]})()")
    ok(seats[0]>=8 and seats[0]==seats[1],f'every resting worker gets their own campfire seat {seats}')
    # Replant keeps the crew in the world
    E(pg,'TT.S.totalEarned=1e14;doPrestige()'); pg.wait_for_timeout(800)
    ok(E(pg,'TT.SW.list.length')==49 and E(pg,"BUILDINGS.every(b=>TT.S.buildings[b.id].lvl===0)"),'Replant keeps staff in the world and still resets buildings')
    ctx.close()

    # --- phones: tap a worker with touch ---
    for dev in ['iPhone 13','Pixel 7']:
        ctx,pg=page(dev=dev,tag=dev+' '); E(pg,MID); E(pg,HIRE,{}); cdp=ctx.new_cdp_session(pg)
        def tap(x,y):
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]}); pg.wait_for_timeout(60); cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); pg.wait_for_timeout(700)
        pg.wait_for_timeout(2500); zoom_on(pg,'firefighter',2.2); pg.wait_for_timeout(1200)
        v=visible_worker(pg,'firefighter',True) or visible_worker(pg,'firefighter')
        ok(v is not None,f'{dev}: firefighter visible at the station')
        if v:
            tap(v['sx'],v['sy']-16)
            ok(E(pg,'TT.curSheet')=='staff' and E(pg,'TT.SW.sel')==v['wid'],f'{dev}: tap on a worker opens their card')
            r=E(pg,"((id)=>{const el=document.querySelector(`#staffTabBody .staff-card[data-wid=\"${id}\"]`);if(!el) return null;const e=el.getBoundingClientRect();return {top:e.top,bot:e.bottom,h:innerHeight}})",v['wid'])
            ok(r is not None and r['top']>=0 and r['bot']<=r['h']+2,f'{dev}: card visible in the sheet {r}')
            fb=E(pg,"((id)=>{const e=document.querySelector(`#staffTabBody [data-find=\"${id}\"]`);const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.width,r.height]})",v['wid'])
            ok(fb[2]>=44 and fb[3]>=44,f'{dev}: 📍 button ≥44px')
            tap(fb[0],fb[1]); pg.wait_for_timeout(900)
            d=E(pg,"((id)=>{const a=TT.SW.map.get(id);const p=TT.P(a.i,a.j);const s=TT.w2s(p[0],p[1]);const [t,bo]=viewBand();return {sy:s[1],sx:s[0],t,bo}})",v['wid'])
            ok(d['t']-10<d['sy']<d['bo']+30 and 0<d['sx']<500,f'{dev}: 📍 frames the worker above the sheet {d}')
        ok(E(pg,'TT.SW_CAP()')==14,f'{dev}: phone draw cap 14')
        ctx.close()

    # --- release snapshot ---
    if os.path.isdir(ROOT+'/releases/v2.15'):
        ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); watch(pg,'rel ')
        pg.goto(BASE+'releases/v2.15/index.html'); pg.wait_for_timeout(1200); ok(E(pg,'TT.VERSION')=='2.15' and E(pg,'TT.scene.fps')>5 and E(pg,'typeof swUpdate')=='function','releases/v2.15/ snapshot runs')
        vh=open(ROOT+'/versions.html').read(); ok(vh.find('v2.15')!=-1 and vh.find('v2.15')<vh.find('v2.14'),'versions page lists v2.15 above v2.14'); ctx.close()
    else:
        ok(True,'releases/v2.15/ not yet built (will ship with release.py)')

    ok(not errs,f'no page errors {errs[:3]}'); ok(not missing,f'no 404s {missing[:3]}')
print('FAILED' if FAILS else 'ALL PASS',len(FAILS))
if FAILS:
    for f in FAILS: print(' -',f)
sys.exit(1 if FAILS else 0)
