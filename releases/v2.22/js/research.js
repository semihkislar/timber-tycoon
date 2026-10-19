'use strict';
/* ===================== v2.19 RESEARCH 2.0 + TRADE MAP ===================== */
// Research Lab turns paper into Research Points (RP). Research is the slow, permanent track: nodes and RP are kept through Replant.
// 5 branches × 5 tiers (~65 nodes). Tiers open with Forest Legacy (T2 25 · T3 150 · T4 800 · T5 2500 + a line at Lv 200),
// some nodes also need a milestone. Cost = base × (1 + 0.06 × nodes done); repeatable nodes ×1.6 per level with diminishing effect.
// No Seeds are spent in research any more (Seeds belong to the Seed Shop, js/replant.js).
const RP_PER=0.04;      // RP per unit of lab speed per second
const RP_DAMP=0.7;      // the lab ignores 70 % of the Legacy/trophy multiplier (log-ish): RP grows ~Legacy^0.3, so the tree can't be rushed by Replanting
const RES_GROW=0.06;    // +6 % cost per node already researched
const REP_SCALE=1.6;    // repeatable node: cost ×1.6 per level
const OLD_RES_SEEDS={automation:5,master:10};   // pre-v2.19 Seed prices (refunded on migration)
const RBRANCH=[
  {id:'sci',name:'Science',icon:'🔬',c:'#3f7fb8'},{id:'for',name:'Forestry',icon:'🌲',c:'#3d8a4a'},{id:'mil',name:'Milling',icon:'🪚',c:'#9a6a2e'},
  {id:'cra',name:'Craft',icon:'🪑',c:'#a8508a'},{id:'log',name:'Logistics',icon:'⚓',c:'#2f6f8f'}];
const RTIER=[null,{L:0,n:'Tier I'},{L:25,n:'Tier II'},{L:150,n:'Tier III'},{L:800,n:'Tier IV'},{L:2500,n:'Tier V',ms:true}];
const blv=id=>(S.buildings[id]&&S.buildings[id].lvl)||0, anyLv=l=>BUILDINGS.some(b=>blv(b.id)>=l);
const MIL=['peeler','sawmill','chipper','kiln','pellet','paper'], CRAFT=['carpentry','furniture','atelier','parquet','stationer','cabinetry','showroom','toyshop','boatyard'];
const PREM_RES=()=>RES.filter(r=>r.premium||r.tech).map(r=>r.id);
const mulB=(ids,k)=>m=>{for(const id of ids) if(m.bld[id]!==undefined) m.bld[id]*=k;};
const mulP=(ids,k)=>m=>{for(const id of (typeof ids==='function'?ids():ids)) m.price[id]*=k;};
const repV=n=>.05*Math.pow(n,.7);   // repeatable: +5 % × level^0.7 (diminishing)
const RNODES=[
  // ---------- Science ----------
  {id:'science', b:'sci',t:1,name:'Wood Science',    icon:'🔬',rp:5,    req:[],          d:'Research Lab +25 % RP',fx:m=>{m.lab*=1.25;}},
  {id:'firesci', b:'sci',t:1,name:'Fire Science',    icon:'🧯',rp:60,   req:['science'], d:'Fire risk −20 %',fx:m=>{m.fire*=.8;}},
  {id:'labx',    b:'sci',t:1,name:'Lab Robotics',    icon:'🦾',rp:900,  req:['firesci'], d:'Research Lab +50 % RP',fx:m=>{m.lab*=1.5;}},
  {id:'nightsh', b:'sci',t:2,name:'Night Shift',     icon:'🌙',rp:2500, req:['labx'],    d:'Offline earnings cap +2 h (8 h → 10 h)',fx:m=>{m.offH+=2;}},
  {id:'gridtune',b:'sci',t:2,name:'Grid Tuning',     icon:'⚡',rp:3000, req:['labx'],    d:'Power Plant boost +25 %',fx:m=>{m.pw*=1.25;}},
  {id:'peer',    b:'sci',t:2,name:'Peer Review',     icon:'📑',rp:4000, req:['nightsh','gridtune'],d:'Research Lab +40 % RP',fx:m=>{m.lab*=1.4;}},
  {id:'procsim', b:'sci',t:3,name:'Process Simulation',icon:'🖥️',rp:9000,req:['peer'],  d:'Every building +12 %',fx:m=>{m.bldAll*=1.12;}},
  {id:'dreamsh', b:'sci',t:3,name:'Remote Control Room',icon:'📡',rp:10000,req:['peer'], d:'Offline earnings cap +4 h',fx:m=>{m.offH+=4;}},
  {id:'labnet',  b:'sci',t:3,name:'Lab Network',     icon:'🧠',rp:12000,req:['procsim'],d:'Research Lab +60 % RP',fx:m=>{m.lab*=1.6;},gate:{f:()=>blv('lab')>=25,t:'Research Lab Lv 25'}},
  {id:'smartgrid',b:'sci',t:4,name:'Smart Grid',     icon:'🔌',rp:30000,req:['labnet'], d:'Power Plant boost +50 %',fx:m=>{m.pw*=1.5;}},
  {id:'matsci',  b:'sci',t:4,name:'Material Science',icon:'⚗️',rp:35000,req:['labnet'], d:'Every building +20 %',fx:m=>{m.bldAll*=1.2;}},
  {id:'r_sci',   b:'sci',t:4,name:'Applied Research',icon:'♾️',rp:40000,req:['matsci'], rep:true,d:'Every building +5 % × level^0.7 (repeatable)',fx:(m,n)=>{m.bldAll*=1+repV(n);}},
  {id:'unified', b:'sci',t:5,name:'Unified Wood Theory',icon:'🌌',rp:250000,req:['smartgrid','matsci'],d:'All production ×1.3',fx:m=>{m.bldAll*=1.3;m.colAll*=1.3;}},
  // ---------- Forestry ----------
  {id:'seedbank',b:'for',t:1,name:'Seed Bank',       icon:'🌰',rp:25,   req:['science'], d:'Saplings grow 20 % faster',fx:m=>{m.grow*=1.2;}},
  {id:'felling', b:'for',t:1,name:'Felling Physics', icon:'🪓',rp:120,  req:['seedbank'],d:'Collectors +15 %',fx:m=>{m.colAll*=1.15;}},
  {id:'genetics',b:'for',t:1,name:'Tree Genetics',   icon:'🧬',rp:1500, req:['felling'], d:'Saplings grow 30 % faster and every grown tree yields +20 % logs',fx:m=>{m.grow*=1.3;m.yield*=1.2;}},
  {id:'mycorr',  b:'for',t:2,name:'Mycorrhiza',      icon:'🍄',rp:2500, req:['genetics'],d:'Every grown tree yields +25 % logs',fx:m=>{m.yield*=1.25;}},
  {id:'ergo',    b:'for',t:2,name:'Crew Ergonomics', icon:'🦺',rp:3000, req:['genetics'],d:'Collectors +25 %, chopping ×2',fx:m=>{m.colAll*=1.25;m.chop*=2;}},
  {id:'survey',  b:'for',t:2,name:'Aerial Survey',   icon:'🛰️',rp:4500, req:['ergo'],    d:'Drone Fleets & Sky-Cranes +50 %',fx:m=>{m.col.drone*=1.5;m.col.heli*=1.5;},gate:{f:()=>(S.collectors.drone||0)>=1,t:'own a Forest Drone Fleet'}},
  {id:'clonal',  b:'for',t:3,name:'Clonal Forestry', icon:'🌱',rp:9000, req:['mycorr'],  d:'Saplings grow 40 % faster',fx:m=>{m.grow*=1.4;}},
  {id:'precis',  b:'for',t:3,name:'Precision Felling',icon:'🎯',rp:11000,req:['survey'], d:'Collectors +40 %',fx:m=>{m.colAll*=1.4;}},
  {id:'oldgrow', b:'for',t:3,name:'Old Growth',      icon:'🌳',rp:13000,req:['clonal'],  d:'Every grown tree yields +30 % logs',fx:m=>{m.yield*=1.3;},gate:{f:()=>((S.forestLife&&S.forestLife.planted)||0)>=20000,t:'20K saplings planted (lifetime)'}},
  {id:'canopy',  b:'for',t:4,name:'Canopy Robotics', icon:'🤖',rp:32000,req:['precis'],  d:'Collectors +50 %',fx:m=>{m.colAll*=1.5;}},
  {id:'livsoil', b:'for',t:4,name:'Living Soil',     icon:'🪱',rp:34000,req:['oldgrow'], d:'Saplings grow 30 % faster, trees yield +30 %',fx:m=>{m.grow*=1.3;m.yield*=1.3;}},
  {id:'r_for',   b:'for',t:4,name:'Forest Yield',    icon:'♾️',rp:40000,req:['canopy'],  rep:true,d:'Collectors +5 % × level^0.7 (repeatable)',fx:(m,n)=>{m.colAll*=1+repV(n);}},
  {id:'eternal', b:'for',t:5,name:'Eternal Forest',  icon:'🏞️',rp:250000,req:['canopy','livsoil'],d:'Saplings grow ×2, trees yield ×1.5',fx:m=>{m.grow*=2;m.yield*=1.5;}},
  // ---------- Milling ----------
  {id:'blades',  b:'mil',t:1,name:'Carbide Blades',  icon:'🪚',rp:30,   req:['science'], d:'Sawmill & Wood Chipper +15 %',fx:m=>{m.bld.sawmill*=1.15;m.bld.chipper*=1.15;}},
  {id:'tar',     b:'mil',t:1,name:'Pine Tar Glue',   icon:'🍯',rp:40,   req:['science'], d:'Charcoal Kilns also distil glue (½ per charcoal)',fx:m=>{m.tar=true;}},
  {id:'pulp',    b:'mil',t:1,name:'Pulp Chemistry',  icon:'🧪',rp:30,   req:['science'], d:'Paper Mill +15 %',fx:m=>{m.bld.paper*=1.15;}},
  {id:'plywood', b:'mil',t:1,name:'Plywood Mill',    icon:'🟧',rp:120,  req:['tar'],     d:'Unlocks the Plywood Mill (veneer + glue → plywood)',unlock:'plymill'},
  {id:'drying',  b:'mil',t:1,name:'Kiln Science',    icon:'🌡️',rp:500,  req:['plywood'], d:'Kiln & Pellet Press +15 %, fire risk −30 %',fx:m=>{m.bld.kiln*=1.15;m.bld.pellet*=1.15;m.fire*=.7;}},
  {id:'thinkerf',b:'mil',t:2,name:'Thin-kerf Saws',  icon:'🔪',rp:2500, req:['blades'],  d:'Sawmill +30 %',fx:m=>{m.bld.sawmill*=1.3;}},
  {id:'refiner', b:'mil',t:2,name:'Pressure Refiner',icon:'🌀',rp:3000, req:['drying'],  d:'Wood Chipper & Pellet Press +30 %',fx:m=>{m.bld.chipper*=1.3;m.bld.pellet*=1.3;}},
  {id:'liquor',  b:'mil',t:2,name:'Black Liquor',    icon:'🛢️',rp:3500, req:['pulp'],    d:'Paper Mill +30 %',fx:m=>{m.bld.paper*=1.3;}},
  {id:'grading', b:'mil',t:3,name:'Laser Grading',   icon:'🔦',rp:10000,req:['thinkerf'],d:'Sawmill & Plywood Mill +40 %',fx:m=>{m.bld.sawmill*=1.4;m.bld.plymill*=1.4;},gate:{f:()=>blv('sawmill')>=100,t:'Sawmill Lv 100'}},
  {id:'biochar', b:'mil',t:3,name:'Biochar Retorts', icon:'⚫',rp:11000,req:['refiner'], d:'Charcoal Kiln +50 %, charcoal sells +20 %',fx:m=>{m.bld.kiln*=1.5;m.price.charcoal*=1.2;}},
  {id:'twinwire',b:'mil',t:3,name:'Twin-wire Paper', icon:'📜',rp:12000,req:['liquor'],  d:'Paper Mill +50 %',fx:m=>{m.bld.paper*=1.5;}},
  {id:'robomill',b:'mil',t:4,name:'Robotic Mill',    icon:'🏭',rp:32000,req:['grading'], d:'Peeler, Sawmill, Chipper, Kiln, Pellet Press & Paper Mill +50 %',fx:mulB(MIL,1.5)},
  {id:'coldpress',b:'mil',t:4,name:'Cold Press',     icon:'🧊',rp:34000,req:['twinwire'],d:'Plywood Mill +60 %',fx:m=>{m.bld.plymill*=1.6;}},
  {id:'r_mil',   b:'mil',t:4,name:'Throughput',      icon:'♾️',rp:40000,req:['robomill'],rep:true,d:'Primary mills +5 % × level^0.7 (repeatable)',fx:(m,n)=>mulB(MIL.concat(['plymill']),1+repV(n))(m)},
  {id:'zerowaste',b:'mil',t:5,name:'Zero-waste Mill',icon:'♻️',rp:250000,req:['robomill','coldpress'],d:'All mills ×2',fx:mulB(MIL.concat(['plymill']),2)},
  // ---------- Craft ----------
  {id:'bending', b:'cra',t:1,name:'Steam Bending',   icon:'🪑',rp:150,  req:['blades'],  d:'Carpentry & Furniture Factory +15 %',fx:m=>{m.bld.carpentry*=1.15;m.bld.furniture*=1.15;}},
  {id:'jigs2',   b:'cra',t:1,name:'Joinery Jigs',    icon:'📐',rp:300,  req:['bending'], d:'Carpentry +20 %',fx:m=>{m.bld.carpentry*=1.2;}},
  {id:'toys',    b:'cra',t:1,name:'Toy Workshop',    icon:'🧸',rp:600,  req:['plywood'], d:'Unlocks the Toy Workshop (plywood + paper → wooden toys)',unlock:'toyshop'},
  {id:'automation',b:'cra',t:2,name:'Automation',    icon:'🤖',rp:3000, req:['bending','toys'],d:'Every building +10 %',fx:m=>{m.bldAll*=1.1;}},
  {id:'boats',   b:'cra',t:2,name:'Boat Yard',       icon:'⛵',rp:3000, req:['toys'],    d:'Unlocks the Boat Yard at the harbour (plywood + chairs → boats)',unlock:'boatyard'},
  {id:'uphol',   b:'cra',t:2,name:'Upholstery',      icon:'🛋️',rp:3500, req:['jigs2'],   d:'Chairs & Furniture Sets sell +25 %',fx:m=>{m.price.chairs*=1.25;m.price.furniture*=1.25;},gate:{f:()=>blv('furniture')>=1,t:'Furniture Factory built'}},
  {id:'master',  b:'cra',t:3,name:'Masterworks',     icon:'🏆',rp:10000,req:['automation','boats'],d:'Plywood, toys, boats & luxury goods sell +25 %',fx:mulP(['plywood','toys','boats','luxfurn','cabinets'],1.25)},
  {id:'ateliers',b:'cra',t:3,name:'Atelier Methods', icon:'🎨',rp:11000,req:['uphol'],   d:'Premium buildings +40 %',fx:m=>{for(const b of BUILDINGS) if(b.premium) m.bld[b.id]*=1.4;},gate:{f:()=>S.premium&&S.premium.lvl>0,t:'Premium Area open'}},
  {id:'toyline', b:'cra',t:3,name:'Toy Line',        icon:'🪀',rp:12000,req:['master'],  d:'Toy Workshop & Boat Yard +50 %',fx:m=>{m.bld.toyshop*=1.5;m.bld.boatyard*=1.5;}},
  {id:'cnc',     b:'cra',t:4,name:'CNC Workshop',    icon:'🛠️',rp:32000,req:['ateliers'],d:'All craft buildings +50 %',fx:mulB(CRAFT,1.5)},
  {id:'signat',  b:'cra',t:4,name:'Signature Pieces',icon:'✍️',rp:34000,req:['toyline'], d:'Premium & tech goods sell +30 %',fx:mulP(PREM_RES,1.3)},
  {id:'r_cra',   b:'cra',t:4,name:'Craftsmanship',   icon:'♾️',rp:40000,req:['cnc'],     rep:true,d:'Craft buildings +5 % × level^0.7 (repeatable)',fx:(m,n)=>mulB(CRAFT,1+repV(n))(m)},
  {id:'heritage',b:'cra',t:5,name:'Heritage Brand',  icon:'👑',rp:250000,req:['cnc','signat'],d:'Premium & tech goods sell ×1.5',fx:mulP(PREM_RES,1.5)},
  // ---------- Logistics ----------
  {id:'market',  b:'log',t:1,name:'Market Research', icon:'📊',rp:150,  req:['pulp'],    d:'All sell prices +5 %',fx:m=>{m.priceAll*=1.05;}},
  {id:'orderdesk',b:'log',t:1,name:'Order Desk',     icon:'📋',rp:250,  req:['market'],  d:'Client orders & daily contracts pay +20 %',fx:m=>{m.orderPay*=1.2;}},
  {id:'logistics',b:'log',t:1,name:'Trade Logistics',icon:'⚓',rp:450,  req:['market'],  d:'Trade payouts +20 %, trips 20 % faster',fx:m=>{m.trade*=1.2;m.tripSpd*=.8;}},
  {id:'pallets', b:'log',t:2,name:'Pallet Standards',icon:'📦',rp:2500, req:['logistics'],d:'Trade payouts +15 %, trips 15 % faster',fx:m=>{m.trade*=1.15;m.tripSpd*=.85;},gate:{f:()=>harborLvl()>=1,t:'Harbour built'}},
  {id:'bulk',    b:'log',t:2,name:'Bulk Contracts',  icon:'🤝',rp:3000, req:['orderdesk'],d:'Client orders & daily contracts pay +30 %',fx:m=>{m.orderPay*=1.3;}},
  {id:'analytics',b:'log',t:2,name:'Price Analytics',icon:'📈',rp:3500, req:['orderdesk'],d:'All sell prices +8 %',fx:m=>{m.priceAll*=1.08;}},
  {id:'container',b:'log',t:3,name:'Container Port', icon:'🏗️',rp:10000,req:['pallets'], d:'Trade payouts +30 %',fx:m=>{m.trade*=1.3;},gate:{f:()=>harborLvl()>=3,t:'Harbour Lv 3'}},
  {id:'railspur',b:'log',t:3,name:'Rail Spur',       icon:'🚂',rp:11000,req:['pallets'], d:'Trips 20 % faster',fx:m=>{m.tripSpd*=.8;}},
  {id:'agency',  b:'log',t:3,name:'Brand Agency',    icon:'🏷️',rp:12000,req:['analytics'],d:'All sell prices +12 %',fx:m=>{m.priceAll*=1.12;}},
  {id:'network', b:'log',t:4,name:'Global Network',  icon:'🌐',rp:32000,req:['container'],d:'Trade payouts +50 %',fx:m=>{m.trade*=1.5;}},
  {id:'futures', b:'log',t:4,name:'Futures Desk',    icon:'💹',rp:34000,req:['agency'],  d:'All sell prices +15 %',fx:m=>{m.priceAll*=1.15;}},
  {id:'r_log',   b:'log',t:4,name:'Market Reach',    icon:'♾️',rp:40000,req:['futures'], rep:true,d:'All sell prices +4 % × level^0.7 (repeatable)',fx:(m,n)=>{m.priceAll*=1+.8*repV(n);}},
  {id:'exchange',b:'log',t:5,name:'World Exchange',  icon:'🌍',rp:250000,req:['network','futures'],d:'All prices ×1.4, trade payouts ×1.4',fx:m=>{m.priceAll*=1.4;m.trade*=1.4;}},
];
const RNMAP={}; RNODES.forEach(n=>RNMAP[n.id]=n);
const TECH_UNLOCK={}; RNODES.forEach(n=>{if(n.unlock) TECH_UNLOCK[n.unlock]=n.id;});
function hasRes(id){return !!(S.research&&S.research[id]);}
function resLvl(id){const v=S.research&&S.research[id];return v?(+v||1):0;}
function resDone(){let k=0;for(const n of RNODES) if(!n.rep&&hasRes(n.id)) k++;return k;}
function resTotal(){return RNODES.filter(n=>!n.rep).length;}
function legacyNow(){return (S&&S.legacy)||0;}
function tierOpen(t){const T=RTIER[t];return legacyNow()>=T.L&&(!T.ms||anyLv(200));}
function tierWhy(t){const T=RTIER[t];return `Forest Legacy ${fmt(T.L)}${T.ms?' + a line at Lv 200':''}`;}
function gateOk(n){return tierOpen(n.t)&&(!n.gate||n.gate.f());}
const TIER_K=[0,1,2,3,5,6];   // tier price factor on top of the node's base
function rpCost(n){const lv=n.rep?resLvl(n.id):0;return Math.round(n.rp*TIER_K[n.t]*(1+RES_GROW*resDone())*Math.pow(REP_SCALE,lv));}
function nodeAvail(n){return (n.rep||!hasRes(n.id))&&n.req.every(hasRes)&&labBuilt()&&gateOk(n);}
function labBuilt(){return S.buildings.lab&&S.buildings.lab.lvl>0;}
function labAvail(){return S.buildings.paper.lvl>0;}
function bldUnlocked(id){const b=BMAP[id];if(!b) return false;if(b.premium) return S.premium&&S.premium.lvl>0;
  if(id==='lab') return labAvail(); if(TECH_UNLOCK[id]) return hasRes(TECH_UNLOCK[id])&&(id!=='boatyard'||harborLvl()>0); return true;}
function canResearch(id){const n=RNMAP[id];return !!n&&nodeAvail(n)&&S.rp+1e-9>=rpCost(n);}
function doResearch(id){if(!canResearch(id)) return false;const n=RNMAP[id];S.rp-=rpCost(n);S.research[id]=n.rep?resLvl(id)+1:1;M=computeMods();
  sfx('unlock');toast(`🔬 <b>${n.name}${n.rep?' '+resLvl(id):''}</b> researched! ${n.d}`,4200,'ms-toast');resSig='';checkAch&&checkAch();return true;}
function applyResearch(m){m.lab=1;m.trade=1;m.tripSpd=1;m.tar=false;m.offH=0;m.pw=1;m.orderPay=1;
  for(const n of RNODES) if(hasRes(n.id)&&n.fx) n.fx(m,resLvl(n.id));}
function rpDamp(){return Math.pow(Math.max(1,M.rep||1),-RP_DAMP);}
function labRP(){return labBuilt()&&S.buildings.lab.on?bstat.lab.speed*(bstat.lab.f||0)*RP_PER*M.lab*rpDamp():0;}
function labRPmax(){return labBuilt()?bSpeed('lab')*RP_PER*M.lab*rpDamp():0;}
function researchTick(dt){if(labBuilt()&&bstat.lab) S.rp+=bstat.lab.speed*(bstat.lab.f||0)*RP_PER*M.lab*rpDamp()*dt;}
function offCap(){return OFFLINE_CAP+((typeof M!=='undefined'&&M&&M.offH)||0)*3600;}
/* migration: pre-v2.19 research stays done; the Seeds once paid for Automation / Masterworks go back to the Seed Shop wallet */
function resMigrate(o){
  const v=String(o.version||'1.0').split('.').map(Number); if(v[0]>2||(v[0]===2&&v[1]>=19)) return;
  let back=0; for(const k in OLD_RES_SEEDS) if(o.research&&o.research[k]) back+=OLD_RES_SEEDS[k];
  if(back) o.seeds=(o.seeds||0)+back;
  o.resMig={refund:back,kept:Object.keys(o.research||{}).length};
}

/* ---------- trade ---------- */
const HARBOR_COST=2.5e7, HARBOR_MAX=5, SPIKE_MULT=2;
const CITIES=[
  {id:'ist',name:'Istanbul', flag:'🇹🇷',mode:'train',trip:70, cost:2e7, base:1.11,x:.6,y:.39,likes:{furniture:1.38,toys:1.34,chairs:1.26,flooring:1.22,giftbox:1.22}},
  {id:'ham',name:'Hamburg',  flag:'🇩🇪',mode:'train',trip:150,cost:8e7,base:1.15, x:.52,y:.17,likes:{plywood:1.45,flooring:1.38,pellets:1.34,cabinets:1.30,boats:1.22}},
  {id:'rot',name:'Rotterdam',flag:'🇳🇱',mode:'ship', trip:190,cost:3e8, base:1.16,x:.42,y:.24,likes:{pellets:1.52,charcoal:1.41,plywood:1.34,boats:1.30,paper:1.22}},
  {id:'dxb',name:'Dubai',    flag:'🇦🇪',mode:'ship', trip:250,cost:1e9, base:1.19,x:.74,y:.6,likes:{luxfurn:1.68,furniture:1.49,cabinets:1.45,giftbox:1.38,boats:1.45}},
  {id:'nyc',name:'New York', flag:'🇺🇸',mode:'ship', trip:330,cost:4e9, base:1.22, x:.27,y:.31,likes:{stationery:1.60,toys:1.56,boats:1.52,luxfurn:1.38,flooring:1.34}},
  {id:'tyo',name:'Tokyo',    flag:'🇯🇵',mode:'ship', trip:420,cost:1.5e10,base:1.26,x:.92,y:.36,likes:{paper:1.68,toys:1.64,stationery:1.49,boats:1.60,plywood:1.38}},
];
const HOME={name:'Bartın',x:.67,y:.355};   // our mill: Black Sea timber coast
const CMAP={}; CITIES.forEach(c=>CMAP[c.id]=c);
function harborLvl(){return (S.trade&&S.trade.lvl)||0;}
function harborCost(){return HARBOR_COST*Math.pow(4,harborLvl());}
function harborAvail(){return S.buildings.furniture.lvl>0||harborLvl()>0;}
function slots(mode){const l=harborLvl();if(!l) return 0;return mode==='ship'?Math.ceil(l/2):1+(l>=3?1:0);}
function busy(mode){return S.trade.fleet.filter(v=>v.mode===mode).length;}
function freeSlot(mode){return busy(mode)<slots(mode);}
function routeOpen(cid){return !!S.trade.routes[cid];}
function tradeGoods(){return RES.filter(r=>canSell(r.id)&&prodRate(r.id)>0.01);}
function demOf(cid,k){const d=S.trade.dem[cid];return (d&&d[k])||1;}
function spikeOn(cid,k){const s=S.trade.spike;return !!(s&&s.city===cid&&s.good===k&&s.ends>S.time);}
function tradeMult(cid,k){const c=CMAP[cid];return (c.likes[k]||c.base)*demOf(cid,k)*(spikeOn(cid,k)?SPIKE_MULT:1)*M.trade;}
function capSec(mode){return (mode==='ship'?80:45)*(1+.15*Math.max(0,harborLvl()-1));}
function vesselCap(k,mode){return Math.max(20,prodRate(k)*capSec(mode));}
function tripTime(cid){return CMAP[cid].trip*M.tripSpd;}
function buyHarbor(){const l=harborLvl();if(l>=HARBOR_MAX||!harborAvail()) return false;const c=harborCost();if(S.coins+1e-9<c) return false;
  S.coins-=c;S.trade.lvl=l+1;sfx('unlock');if(typeof harborPoof==='function') harborPoof();
  toast(l?`⚓ Harbour → Lv ${l+1}: ${slots('ship')} ship${slots('ship')>1?'s':''} · ${slots('train')} train${slots('train')>1?'s':''}, bigger cargo holds`:`⚓ <b>Harbour & Rail Station built!</b> Open trade routes on the world map.`,4200,'ms-toast');
  tradeSig='';checkAch&&checkAch();return true;}
function openRoute(cid){const c=CMAP[cid];if(!c||routeOpen(cid)||!harborLvl()||S.coins+1e-9<c.cost) return false;S.coins-=c.cost;S.trade.routes[cid]=1;sfx('unlock');
  toast(`${c.flag} <b>Route to ${c.name} opened!</b> ${c.mode==='ship'?'🚢 by sea':'🚂 by rail'} · ${fmtTime(tripTime(cid))} round trip`,4000,'ms-toast');tradeSig='';checkAch&&checkAch();return true;}
function dispatch(cid,k,quiet){const c=CMAP[cid];if(!c||!routeOpen(cid)||!freeSlot(c.mode)||!RMAP[k]||!canSell(k)) return false;
  const v={id:(S.trade.seq=(S.trade.seq||0)+1),mode:c.mode,city:cid,good:k,cap:vesselCap(k,c.mode),got:0,state:'load',t:0,trip:tripTime(cid)};
  S.trade.fleet.push(v);if(!quiet) sfx('click');tradeSig='';return v;}
function depart(v,offline){if(v.state!=='load') return;if(v.got<1e-6){S.trade.fleet=S.trade.fleet.filter(x=>x!==v);tradeSig='';return;}
  v.mult=tradeMult(v.city,v.good);v.pay=v.got*price(v.good)*v.mult;v.state='out';v.t=0;tradeSig='';
  if(!offline) toast(`${v.mode==='ship'?'🚢':'🚂'} Departed for <b>${CMAP[v.city].name}</b>: ${fmt(v.got)} ${RMAP[v.good].name} · expected +🪙${fmt(v.pay)} (×${v.mult.toFixed(2)})`,3200);}
function departNow(id){const v=S.trade.fleet.find(x=>x.id===id);if(!v) return false;depart(v);return true;}
function tradeCollect(demand,dt,pend){
  if(!S.trade) return;
  for(const v of S.trade.fleet){if(v.state!=='load') continue;const k=v.good,reserve=(demand[k]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const share=.8*((pend&&pend[k])||0);const take=Math.min(v.cap-v.got,S.res[k],Math.max(S.res[k]-reserve,priBudget(k,share,pend)));if(take>1e-9){S.res[k]-=take;v.got+=take;priTook(k,Math.max(0,take-Math.max(0,S.res[k]+take-reserve)));}}
}
function tradeTick(dt,offline){
  const T=S.trade; if(!T) return;
  for(const v of T.fleet.slice()){v.t+=dt;
    if(v.state==='load'){if(v.got>=v.cap-1e-6||(v.t>capSec(v.mode)*2.2&&v.got>0)) depart(v,offline);continue;}
    if(v.state==='out'&&v.t>=v.trip/2){v.state='back';earn(v.pay);T.stats.trips++;T.stats.earned+=v.pay;tradeSig='';
      if(!offline){toast(`${CMAP[v.city].flag} <b>${CMAP[v.city].name}</b> paid +🪙${fmt(v.pay)} for ${fmt(v.got)} ${RMAP[v.good].name}${v.mult>2?' — demand spike bonus!':''}`,3800,'ms-toast');sfx('coin');}
      checkAch&&checkAch();}
    if(v.state==='back'&&v.t>=v.trip){T.fleet=T.fleet.filter(x=>x!==v);tradeSig='';
      // auto-repeat: the returning vessel reloads the same cargo for the same city (idle-friendly; toggle in the Trade tab)
      if(T.repeat!==false&&routeOpen(v.city)&&prodRate(v.good)>0.01&&freeSlot(v.mode)) dispatch(v.city,v.good,true);}}
  // demand drifts every 45 s (mean-reverting random walk), and now and then a city has a demand spike
  if(S.time>=(T.nextDrift||0)){T.nextDrift=S.time+45;for(const c of CITIES){const d=T.dem[c.id]=T.dem[c.id]||{};
      for(const r of RES){if(r.id==='logs') continue;const x=d[r.id]||1;d[r.id]=Math.max(.8,Math.min(1.25,1+(x-1)*.85+(Math.random()-.5)*.14));}}tradeSig='';}
  if(harborLvl()&&S.time>=(T.nextSpike||0)){const open=CITIES.filter(c=>routeOpen(c.id)),goods=tradeGoods();T.nextSpike=S.time+160+Math.random()*120;
    if(open.length&&goods.length){const c=open[Math.floor(Math.random()*open.length)];const liked=goods.filter(r=>c.likes[r.id]);const pool=liked.length&&Math.random()<.7?liked:goods;
      const g=pool[Math.floor(Math.random()*pool.length)];T.spike={city:c.id,good:g.id,ends:S.time+150};tradeSig='';
      if(!offline){toast(`📈 <b>Demand spike!</b> ${c.flag} ${c.name} pays <b>×${SPIKE_MULT}</b> for ${g.icon} ${g.name} for 2½ min`,4500);sfx('event');}}}
}

/* ---------- R&D sheet (research graph + trade map) ---------- */
let resSig='', tradeSig='', rndTab='res', resSel=null, resBr=null;
function nodeState(n){return hasRes(n.id)&&!n.rep?'done':nodeAvail(n)?(S.rp+1e-9>=rpCost(n)?'ready':'avail'):'lock';}
function brStats(b){const ns=RNODES.filter(n=>n.b===b&&!n.rep);return {d:ns.filter(n=>hasRes(n.id)).length,n:ns.length,ready:RNODES.some(n=>n.b===b&&nodeState(n)==='ready')};}
function nodeWhy(n){if(!labBuilt()) return 'Build the Research Lab first.';
  if(!tierOpen(n.t)) return `🔒 ${RTIER[n.t].n} opens at ${tierWhy(n.t)}.`;
  if(n.gate&&!n.gate.f()) return `🔒 Needs ${n.gate.t}.`;
  const miss=n.req.filter(r=>!hasRes(r)); if(miss.length) return 'Needs: '+miss.map(r=>RNMAP[r].name).join(', ');
  const c=rpCost(n); if(S.rp<c) return `Need ${fmt(c-S.rp)} more RP (≈ ${labRP()>0?fmtTime((c-S.rp)/labRP()):'∞'})`; return '';}
function updateResearchUI(){
  if(!resBr){const f=RNODES.find(n=>nodeAvail(n));resBr=f?f.b:'sci';}
  const sig=RNODES.map(n=>nodeState(n)+resLvl(n.id)).join(',')+'|'+labBuilt()+labAvail()+'|'+resSel+'|'+resBr+'|'+[1,2,3,4,5].map(tierOpen).join();
  if(sig!==resSig){resSig=sig;
    const chips=RBRANCH.map(b=>{const s=brStats(b.id);return `<button class="rb${resBr===b.id?' on':''}" data-b="${b.id}" style="--bc:${b.c}"><span class="rb-i">${b.icon}</span><span class="rb-n">${b.name}</span><span class="rb-c">${s.d}/${s.n}</span>${s.ready?'<i class="rb-dot"></i>':''}</button>`;}).join('');
    let list='';
    for(let t=1;t<=5;t++){const ns=RNODES.filter(n=>n.b===resBr&&n.t===t);if(!ns.length) continue;const open=tierOpen(t);
      list+=`<div class="rt-h${open?'':' lock'}"><b>${RTIER[t].n}</b><span>${open?'open':'🔒 '+tierWhy(t)}</span></div>`;
      for(const n of ns){const s=nodeState(n),lv=resLvl(n.id),sel=resSel===n.id;
        const cost=s==='done'?'✓ Done':`🔬 ${fmt(rpCost(n))}`;
        list+=`<button class="rn ${s}${sel?' sel':''}${n.rep?' rep':''}" data-id="${n.id}"><span class="ri">${n.icon}</span><span class="rt">${n.name}${n.rep&&lv?` <em>Lv ${lv}</em>`:''}</span><span class="rc">${cost}</span></button>`;
        if(sel) list+=`<div id="resDetail" class="res-detail"></div>`;}
    }
    const tot=resTotal(),dn=resDone(),nt=[2,3,4,5].find(t=>!tierOpen(t));
    $('rndRes').innerHTML=`<div class="lab-hero" id="labHero"></div>
      <div class="res-prog"><div class="pbar"><i style="width:${(dn/tot*100).toFixed(1)}%"></i></div><span><b>${dn}/${tot}</b> nodes${nt?` · next: ${RTIER[nt].n} at ${tierWhy(nt)}`:' · all tiers open'}</span></div>
      <div class="rbranch">${chips}</div><div class="rlist">${list}</div>
      <div class="legend">Research is kept through Replant (and so are unspent Research Points). Higher tiers open as your Forest Legacy grows; every node researched makes the next ones 6 % dearer. ♾️ nodes can be researched again and again.</div>`;
    $('rndRes').querySelectorAll('.rb').forEach(el=>el.onclick=()=>{resBr=el.dataset.b;resSel=null;resSig='';updateResearchUI();});
    $('rndRes').querySelectorAll('.rn').forEach(el=>el.onclick=()=>{resSel=resSel===el.dataset.id?null:el.dataset.id;resSig='';updateResearchUI();});
    if(!resSel){const f=RNODES.find(n=>n.b===resBr&&nodeAvail(n))||RNODES.find(n=>n.b===resBr&&!hasRes(n.id));if(f){resSel=f.id;resSig='';return updateResearchUI();}}
  }
  const lh=$('labHero'),l=S.buildings.lab.lvl;
  const h=`<div class="lab-ic">${svgIcon('paper',34)}</div><div style="flex:1"><div class="ph-t">${l?`Research Lab · Lv ${l}`:'Research Lab'}</div><div class="legend" style="margin:2px 0 0">${l?`<b>+${fr(labRP())} RP/s</b> · burns ${fr(bstat.lab.speed*BMAP.lab.inp.paper*(bstat.lab.f||0))} paper/s${bstat.lab.f<.95?' <span style="color:#c4463d">(short on paper)</span>':''}`:labAvail()?'Build the lab on the R&D campus (top right of the yard) to start researching.':'🔒 Needs a Paper Mill first — the lab turns paper into research.'}</div></div>
    <div class="rp-big">🔬 ${fmt(S.rp)}<small>Research Points</small></div>`;
  if(lh._h!==h){lh.innerHTML=h;lh._h=h;}
  const n=RNMAP[resSel],de=$('resDetail'); if(!n||!de) return; const s=nodeState(n),c=rpCost(n);
  const btn=s==='done'?'<button class="btn small" disabled>✓ Researched</button>':`<button class="btn ${s==='ready'?'gold':''}" id="resBuy" ${s==='ready'?'':'disabled'}>🔬 ${n.rep&&resLvl(n.id)?'Lv '+(resLvl(n.id)+1)+' · ':'Research · '}${fmt(c)} RP</button>`;
  const why=s==='done'?'':nodeWhy(n);
  const dh=`<div class="rd-top"><div class="rd-ic">${n.icon}</div><div style="flex:1"><b>${n.name}</b> <span class="rd-tier">${RBRANCH.find(b=>b.id===n.b).name} · ${RTIER[n.t].n}</span><div class="legend" style="margin:2px 0">${n.d}</div>${why?`<div class="rd-why">${why}</div>`:''}</div></div>${btn}`;
  if(de._h!==dh){de.innerHTML=dh;de._h=dh;const b=$('resBuy');if(b) b.onclick=()=>{if(doResearch(n.id)){if(!n.rep){const nx=RNODES.find(x=>x.b===resBr&&nodeAvail(x));resSel=nx?nx.id:null;}resSig='';render();}};}
}
function rndShown(){return labAvail()||harborAvail()||harborLvl()>0||Object.keys(S.research||{}).length>0;}
function updateRnd(){
  const bb=$('bbRnd'); if(bb){const sh=rndShown(); if(bb._sh!==sh){bb._sh=sh;bb.classList.toggle('hidden',!sh);$('bottombar').classList.toggle('many',sh);}}
  const dot=$('rndDot'); if(dot) dot.classList.toggle('hidden',curSheet==='rnd'||!(RNODES.some(n=>canResearch(n.id))||(S.trade&&S.trade.spike&&S.trade.spike.ends>S.time&&routeOpen(S.trade.spike.city)&&freeSlot(CMAP[S.trade.spike.city].mode))));
  if(curSheet!=='rnd') return;
  document.querySelectorAll('#rndTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===rndTab));
  $('rndRes').classList.toggle('hidden',rndTab!=='res'); $('rndTrade').classList.toggle('hidden',rndTab!=='trade');
  if(rndTab==='res') updateResearchUI(); else updateTradeUI();
}
function updateTradeUI(){
  const T=S.trade,l=harborLvl();
  const sig=l+'|'+harborAvail()+'|'+Object.keys(T.routes).join()+'|'+T.fleet.map(v=>v.id+v.state).join()+'|'+(T.spike?T.spike.city+T.spike.good+(T.spike.ends>S.time):'')+'|'+tradeGoods().map(r=>r.id).join()+'|'+Math.floor(S.time/45);
  if(sig!==tradeSig){tradeSig=sig;
    let h=`<div class="stn-hero"><div class="ph-ic">${UI_ICONS.trade}</div><div style="flex:1"><div class="ph-t" style="color:#1f4a7a">${l?`Harbour & Rail Station · Lv ${l}`:'Harbour & Rail Station'}</div>
      <div class="legend" style="margin:2px 0 0">${l?`🚢 ${slots('ship')} ship${slots('ship')>1?'s':''} · 🚂 ${slots('train')} train${slots('train')>1?'s':''} · holds ${Math.round(capSec('train'))}s / ${Math.round(capSec('ship'))}s of production`:harborAvail()?'Build the harbour on the coast across the highway to ship goods abroad for better prices.':'🔒 Build a Furniture Factory first.'}</div></div></div>
      <button class="btn big sea" id="hbBuy"></button>`;
    if(T.fleet.length){h+=`<h4>⛴️ Fleet <span class="mg-count">${T.fleet.length} active</span></h4><div class="list">`+T.fleet.map(v=>{const c=CMAP[v.city],r=RMAP[v.good];
      return `<div class="vsl" data-id="${v.id}"><div class="vi">${v.mode==='ship'?'🚢':'🚂'}</div><div style="flex:1;min-width:0"><b>${c.flag} ${c.name}</b> · ${r.icon} ${r.name}<div class="bar"><i class="vb"></i></div><div class="vt legend" style="margin:1px 0 0"></div></div>${v.state==='load'?'<button class="btn small gold vgo">Depart ▸</button>':''}</div>`;}).join('')+`</div>`;}
    h+=`<h4>🌍 Routes <span class="mg-count">${Object.keys(T.routes).length}/${CITIES.length} open</span></h4><div class="list">`;
    const goods=tradeGoods();
    for(const c of CITIES){const open=routeOpen(c.id),sp=T.spike&&T.spike.city===c.id&&T.spike.ends>S.time?T.spike:null;
      const top=goods.map(r=>[r,tradeMult(c.id,r.id)]).sort((a,b)=>b[1]-a[1]).slice(0,open?5:3);
      h+=`<div class="city${open?' open':''}${sp?' spike':''}"><div class="cy-h"><span class="cy-f">${c.flag}</span><b>${c.name}</b><span class="chip">${c.mode==='ship'?'🚢 Sea':'🚂 Rail'} · ${fmtTime(tripTime(c.id))}</span>${sp?`<span class="chip spk">📈 ${RMAP[sp.good].icon} ×${SPIKE_MULT}</span>`:''}
        ${open?'':`<button class="btn small cy-open" data-c="${c.id}" ${l?'':'disabled'}>🔓 ${fmt(c.cost)}</button>`}</div>
        <div class="cy-g">${top.map(([r,m])=>`<button class="gch${m>=2?' hot':m>=1.5?' good':''}" data-c="${c.id}" data-g="${r.id}" ${open?'':'disabled'}>${r.icon}<span>×${m.toFixed(2)}</span></button>`).join('')||'<span class="legend">Produce goods to trade</span>'}</div></div>`;}
    h+=`</div><label class="rep-row"><span>🔁 Returning vessels reload the same cargo</span><label class="sw"><input type="checkbox" id="tradeRep" ${T.repeat!==false?'checked':''}><span class="tr"></span></label></label>`;
    h+=`<div class="legend">Tap a good to load the next free ${'ship or train'}: it collects goods from production until full, sails, and the city pays the shown multiplier on today's price. Demand drifts every 45 s; spikes pay ×${SPIKE_MULT}. Routes and the harbour are kept through Replant.</div>`;
    $('tradeBody').innerHTML=h;
    $('tradeRep').onchange=e=>{T.repeat=e.target.checked;};
    $('hbBuy').onclick=()=>{if(buyHarbor()){tradeSig='';render();}};
    $('tradeBody').querySelectorAll('.cy-open').forEach(b=>b.onclick=()=>{if(openRoute(b.dataset.c)) render();});
    $('tradeBody').querySelectorAll('.gch').forEach(b=>b.onclick=()=>{if(dispatch(b.dataset.c,b.dataset.g)){render();} else {const c=CMAP[b.dataset.c];toast(`No free ${c.mode==='ship'?'ship':'train'} — wait for one to return${harborLvl()<HARBOR_MAX?' or upgrade the harbour':''}.`,2400);}});
    $('tradeBody').querySelectorAll('.vgo').forEach(b=>b.onclick=()=>{departNow(+b.closest('.vsl').dataset.id);render();});
  }
  const hb=$('hbBuy'); if(hb){const c=harborCost();const t=l>=HARBOR_MAX?'Harbour at max level':costBtnHtml(l?`⬆ Harbour Lv ${l+1}`:'⚓ Build the Harbour',c);if(hb._h!==t){hb.innerHTML=t;hb._h=t;}hb.disabled=l>=HARBOR_MAX||!harborAvail()||S.coins+1e-9<c;}
  document.querySelectorAll('#tradeBody .vsl').forEach(el=>{const v=T.fleet.find(x=>x.id==+el.dataset.id);if(!v) return;
    const f=v.state==='load'?v.got/v.cap:v.t/v.trip; el.querySelector('.vb').style.width=(Math.min(1,f)*100).toFixed(1)+'%';
    el.querySelector('.vt').textContent=v.state==='load'?`Loading ${fmt(v.got)} / ${fmt(v.cap)}`:v.state==='out'?`Sailing · arrives in ${fmtTime(v.trip/2-v.t)} · +🪙${fmt(v.pay)}`:`Returning · back in ${fmtTime(v.trip-v.t)}`;});
  document.querySelectorAll('#tradeBody .cy-open').forEach(b=>{b.disabled=!harborLvl()||S.coins+1e-9<CMAP[b.dataset.c].cost;});
  document.querySelectorAll('#tradeBody .gch').forEach(b=>{const c=CMAP[b.dataset.c];b.classList.toggle('nofree',routeOpen(c.id)&&!freeSlot(c.mode));});
  const cv=$('tradeMap'); if(cv&&typeof drawTradeMap==='function') drawTradeMap(cv);
}
function setupRndUI(){document.querySelectorAll('#rndTabs button').forEach(b=>b.onclick=()=>{rndTab=b.dataset.t;resSig='';tradeSig='';updateRnd();});}
function openTrade(){rndTab='trade';openSheet('rnd');}
function openResearch(){rndTab='res';openSheet('rnd');}
UI_ICONS.rnd=`<svg viewBox="0 0 32 32"><path d="M12 3h8v2h-1.5v7.5l7.2 12.3c1 1.8-.3 4.2-2.4 4.2H8.7c-2.1 0-3.4-2.4-2.4-4.2l7.2-12.3V5H12z" fill="#e8f4fb" stroke="#2f5a7a" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.2 22h13.6l2.3 3.9c.5.9-.1 2.1-1.2 2.1H8.1c-1.1 0-1.7-1.2-1.2-2.1z" fill="#5ac08a"/><circle cx="14" cy="24.5" r="1.3" fill="#fff"/><circle cx="18.5" cy="23.6" r=".9" fill="#fff"/><circle cx="23" cy="8" r="3.2" fill="#ffd34a" stroke="#b08010"/><path d="M23 6.4v3.2M21.4 8h3.2" stroke="#b08010" stroke-width="1"/></svg>`;
UI_ICONS.trade=`<svg viewBox="0 0 32 32"><path d="M3 21h26l-3.5 6H6.5z" fill="#2f6fb0" stroke="#1a3e66" stroke-width="1.2"/><rect x="7" y="15" width="5" height="6" fill="#e8742a"/><rect x="12.5" y="15" width="5" height="6" fill="#3aa0d8"/><rect x="18" y="15" width="5" height="6" fill="#e8c43a"/><rect x="9.5" y="10" width="5" height="5" fill="#5ac08a"/><rect x="23.5" y="11" width="3.5" height="10" fill="#f4f1ea" stroke="#999" stroke-width=".6"/><path d="M2 29q3.5-2 7 0t7 0 7 0 7 0" fill="none" stroke="#5aa6e8" stroke-width="1.6"/></svg>`;
