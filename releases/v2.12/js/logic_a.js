'use strict';
const VERSION='2.12';
const SAVE_KEY='timberTycoon_save_v1';
const OFFLINE_CAP=8*3600;
const BUFFER_SEC=2;

/* ===================== SVG ICONS ===================== */
const ICONS={
  logs:(c)=>`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="24" rx="10" ry="4" fill="#5a3a1a"/><rect x="6" y="8" width="20" height="16" rx="3" fill="${c||'#8b5a2b'}"/><ellipse cx="16" cy="8" rx="10" ry="4" fill="#c08a4f"/><ellipse cx="16" cy="8" rx="4" ry="1.5" fill="#6b4226"/><line x1="8" y1="12" x2="24" y2="12" stroke="#6b4226" stroke-width=".8" opacity=".4"/><line x1="8" y1="16" x2="24" y2="16" stroke="#6b4226" stroke-width=".8" opacity=".4"/></svg>`,
  planks:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="6" rx="1" fill="#c08a4f" stroke="#8b5a2b"/><rect x="4" y="13" width="24" height="6" rx="1" fill="#b07a42" stroke="#8b5a2b"/><rect x="4" y="20" width="24" height="6" rx="1" fill="#a36d38" stroke="#8b5a2b"/></svg>`,
  chips:()=>`<svg viewBox="0 0 32 32"><ellipse cx="10" cy="18" rx="5" ry="3" fill="#c08a4f" transform="rotate(-20 10 18)"/><ellipse cx="18" cy="14" rx="4" ry="2.5" fill="#a36d38" transform="rotate(15 18 14)"/><ellipse cx="22" cy="20" rx="5" ry="3" fill="#8b5a2b" transform="rotate(-10 22 20)"/><ellipse cx="14" cy="22" rx="3.5" ry="2" fill="#d4a574"/></svg>`,
  charcoal:()=>`<svg viewBox="0 0 32 32"><circle cx="12" cy="18" r="6" fill="#2a2a2a"/><circle cx="20" cy="14" r="5" fill="#3a3a3a"/><circle cx="18" cy="22" r="4.5" fill="#1a1a1a"/><circle cx="14" cy="12" r="2" fill="#4a4a4a" opacity=".6"/></svg>`,
  chairs:()=>`<svg viewBox="0 0 32 32"><rect x="8" y="10" width="16" height="3" rx="1" fill="#8b5a2b"/><rect x="9" y="13" width="3" height="12" fill="#6b4226"/><rect x="20" y="13" width="3" height="12" fill="#6b4226"/><rect x="9" y="20" width="14" height="3" fill="#a36d38"/><rect x="8" y="4" width="3" height="9" fill="#6b4226"/><rect x="21" y="4" width="3" height="9" fill="#6b4226"/></svg>`,
  pellets:()=>`<svg viewBox="0 0 32 32"><ellipse cx="10" cy="16" rx="3" ry="5" fill="#6b4226"/><ellipse cx="16" cy="14" rx="3" ry="5" fill="#8b5a2b"/><ellipse cx="22" cy="17" rx="3" ry="5" fill="#5a3a1a"/><ellipse cx="13" cy="22" rx="2.5" ry="4" fill="#a36d38"/></svg>`,
  paper:()=>`<svg viewBox="0 0 32 32"><rect x="8" y="4" width="16" height="22" rx="1" fill="#f5f0e0" stroke="#c9b28c"/><line x1="11" y1="9" x2="21" y2="9" stroke="#c9b28c" stroke-width="1"/><line x1="11" y1="13" x2="21" y2="13" stroke="#c9b28c" stroke-width="1"/><line x1="11" y1="17" x2="18" y2="17" stroke="#c9b28c" stroke-width="1"/></svg>`,
  furniture:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="14" width="24" height="10" rx="1" fill="#8b5a2b"/><rect x="6" y="8" width="8" height="6" fill="#a36d38"/><rect x="18" y="10" width="10" height="4" fill="#c08a4f"/><rect x="6" y="24" width="3" height="4" fill="#5a3a1a"/><rect x="23" y="24" width="3" height="4" fill="#5a3a1a"/></svg>`,
  coins:()=>`<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#f5c84c" stroke="#c08a20" stroke-width="2"/><circle cx="16" cy="16" r="8" fill="none" stroke="#e0a92a" stroke-width="1.5"/><text x="16" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="#8a6210">$</text></svg>`,
  seeds:()=>`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="22" rx="4" ry="6" fill="#5a8a2a"/><path d="M16 16 Q12 8 16 4 Q20 8 16 16" fill="#7cc04f"/><path d="M16 14 Q8 10 6 14 Q12 16 16 14" fill="#5a9a37"/><path d="M16 14 Q24 10 26 14 Q20 16 16 14" fill="#5a9a37"/></svg>`,
  lumberjack:()=>`<svg viewBox="0 0 32 32"><circle cx="16" cy="8" r="5" fill="#e8c4a0"/><rect x="11" y="12" width="10" height="10" rx="2" fill="#3a6aaa"/><rect x="12" y="22" width="3" height="8" fill="#4a3423"/><rect x="17" y="22" width="3" height="8" fill="#4a3423"/><rect x="22" y="10" width="3" height="12" fill="#6b3a1a"/><rect x="20" y="8" width="8" height="4" fill="#c0c8d0"/></svg>`,
  chainsaw:()=>`<svg viewBox="0 0 32 32"><circle cx="16" cy="8" r="4" fill="#e8c4a0"/><rect x="12" y="11" width="8" height="9" fill="#ffaa00"/><rect x="13" y="20" width="2.5" height="8" fill="#4a3423"/><rect x="16.5" y="20" width="2.5" height="8" fill="#4a3423"/><rect x="20" y="14" width="10" height="3" fill="#888"/><circle cx="28" cy="15.5" r="2" fill="#aaa"/></svg>`,
  truck:()=>`<svg viewBox="0 0 32 32"><rect x="2" y="14" width="18" height="8" rx="1" fill="#c45a2a"/><rect x="18" y="10" width="10" height="12" rx="1" fill="#e07040"/><circle cx="8" cy="24" r="3" fill="#333"/><circle cx="24" cy="24" r="3" fill="#333"/><rect x="4" y="12" width="14" height="3" fill="#8b5a2b"/></svg>`,
  harvester:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="12" width="20" height="10" rx="1" fill="#5a8a2a"/><rect x="18" y="6" width="10" height="10" fill="#7aa84a"/><circle cx="10" cy="24" r="4" fill="#333"/><circle cx="24" cy="24" r="3" fill="#333"/><rect x="2" y="16" width="6" height="4" fill="#888"/></svg>`,
  drone:()=>`<svg viewBox="0 0 32 32"><rect x="12" y="14" width="8" height="5" rx="1" fill="#4a6a8a"/><line x1="4" y1="12" x2="12" y2="16" stroke="#aaa" stroke-width="1.5"/><line x1="28" y1="12" x2="20" y2="16" stroke="#aaa" stroke-width="1.5"/><circle cx="4" cy="12" r="3" fill="#7dfcff" opacity=".7"/><circle cx="28" cy="12" r="3" fill="#7dfcff" opacity=".7"/><circle cx="16" cy="16" r="2" fill="#f5c84c"/></svg>`,
  heli:()=>`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="8" ry="5" fill="#4a6a4a"/><rect x="22" y="16" width="8" height="3" fill="#5a7a5a"/><line x1="2" y1="12" x2="30" y2="12" stroke="#888" stroke-width="2"/><circle cx="16" cy="12" r="2" fill="#666"/><rect x="14" y="22" width="2" height="6" fill="#555"/><rect x="10" y="27" width="10" height="2" fill="#555"/></svg>`,
  sawmill:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="14" width="24" height="12" fill="#8b5a2b"/><polygon points="4,14 16,4 28,14" fill="#a36d38"/><circle cx="16" cy="20" r="5" fill="#c0c8d0" stroke="#666"/><circle cx="16" cy="20" r="1.5" fill="#444"/><line x1="16" y1="15" x2="16" y2="25" stroke="#888"/><line x1="11" y1="20" x2="21" y2="20" stroke="#888"/></svg>`,
  chipper:()=>`<svg viewBox="0 0 32 32"><rect x="6" y="12" width="20" height="14" rx="2" fill="#5a6a7a"/><circle cx="16" cy="19" r="6" fill="#333"/><circle cx="16" cy="19" r="3" fill="#f0a83a"/><rect x="2" y="16" width="6" height="4" fill="#888"/></svg>`,
  kiln:()=>`<svg viewBox="0 0 32 32"><rect x="8" y="10" width="16" height="16" fill="#6a4a3a"/><rect x="12" y="4" width="8" height="8" fill="#5a3a2a"/><rect x="14" y="2" width="4" height="4" fill="#4a2a1a"/><ellipse cx="16" cy="20" rx="4" ry="3" fill="#f0a83a" opacity=".8"/><circle cx="14" cy="6" r="1.5" fill="#888" opacity=".5"/></svg>`,
  carpentry:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="16" width="24" height="10" fill="#8b5a2b"/><polygon points="4,16 16,6 28,16" fill="#c08a4f"/><rect x="12" y="18" width="8" height="8" fill="#5a3a1a"/><rect x="20" y="10" width="3" height="8" fill="#6b3a1a"/></svg>`,
  pellet:()=>`<svg viewBox="0 0 32 32"><rect x="6" y="10" width="20" height="16" rx="2" fill="#5a5a6a"/><rect x="10" y="6" width="12" height="6" fill="#4a4a5a"/><circle cx="16" cy="18" r="4" fill="#8b5a2b"/><rect x="4" y="20" width="4" height="3" fill="#888"/></svg>`,
  paper_b:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="12" width="24" height="14" fill="#7a8a9a"/><rect x="8" y="4" width="6" height="10" fill="#5a6a7a"/><rect x="18" y="6" width="6" height="8" fill="#5a6a7a"/><rect x="10" y="16" width="12" height="6" fill="#f5f0e0"/></svg>`,
  furniture_b:()=>`<svg viewBox="0 0 32 32"><rect x="2" y="10" width="28" height="16" fill="#6a7a8a"/><rect x="6" y="4" width="8" height="8" fill="#5a6a7a"/><rect x="18" y="4" width="8" height="8" fill="#5a6a7a"/><rect x="8" y="14" width="16" height="8" fill="#8b5a2b"/></svg>`,
  tree:(hue)=>`<svg viewBox="0 0 32 32"><rect x="14" y="20" width="4" height="10" fill="#6b4226"/><polygon points="16,2 6,16 26,16" fill="${hue||'#2f5b2a'}"/><polygon points="16,8 8,20 24,20" fill="${hue||'#3f7a2a'}"/></svg>`,
};
function svgIcon(id, size){
  const fn=ICONS[id]; if(!fn) return '';
  const s=fn(); return size?s.replace('viewBox','width="'+size+'" height="'+size+'" viewBox'):s;
}
function iconHtml(id, size){return `<span class="ric" style="display:inline-flex;width:${size||28}px;height:${size||28}px">${svgIcon(id,size||28)}</span>`;}

/* ===================== DATA ===================== */
const RES=[
  {id:'logs',name:'Logs',icon:'🪵',svg:'logs',price:1},
  {id:'planks',name:'Planks',icon:'🟫',svg:'planks',price:4},
  {id:'chips',name:'Wood Chips',icon:'🍂',svg:'chips',price:2},
  {id:'charcoal',name:'Charcoal',icon:'⚫',svg:'charcoal',price:9},
  {id:'chairs',name:'Chairs',icon:'🪑',svg:'chairs',price:60},
  {id:'pellets',name:'Pellets',icon:'🟤',svg:'pellets',price:10},
  {id:'paper',name:'Paper',icon:'📜',svg:'paper',price:20},
  {id:'furniture',name:'Furniture Sets',icon:'🛋️',svg:'furniture',price:700},
  // v2.2 premium goods (made in the Premium Factory Area)
  {id:'giftbox',name:'Grill Gift Boxes',icon:'🎁',svg:'giftbox',price:230,premium:true},
  {id:'flooring',name:'Artisan Flooring',icon:'🪵',svg:'flooring',price:180,premium:true},
  {id:'stationery',name:'Premium Stationery',icon:'✒️',svg:'stationery',price:380,premium:true},
  {id:'cabinets',name:'Designer Cabinets',icon:'🗄️',svg:'cabinets',price:380,premium:true},
  {id:'luxfurn',name:'Luxury Furniture',icon:'👑',svg:'luxfurn',price:1900,premium:true},
  // v2.5 research goods (R&D campus + harbour)
  {id:'glue',name:'Pine Tar Glue',icon:'🍯',svg:'glue',price:6,tech:true},
  {id:'plywood',name:'Plywood',icon:'🟧',svg:'plywood',price:90,tech:true},
  {id:'toys',name:'Wooden Toys',icon:'🧸',svg:'toys',price:320,tech:true},
  {id:'boats',name:'Wooden Boats',icon:'⛵',svg:'boats',price:4500,tech:true},
];
const RMAP={}; RES.forEach(r=>RMAP[r.id]=r);
const COLLECTORS=[
  {id:'lumberjack',name:'Lumberjack',icon:'🧔',svg:'lumberjack',rate:1,cost:20,desc:'Flannel, beard, axe.'},
  {id:'chainsaw',name:'Chainsaw Crew',icon:'👷',svg:'chainsaw',rate:5,cost:160,desc:'Loud and efficient.'},
  {id:'truck',name:'Logging Truck',icon:'🚛',svg:'truck',rate:25,cost:2200,desc:'Hauls whole trunks.'},
  {id:'harvester',name:'Harvester Machine',icon:'🚜',svg:'harvester',rate:120,cost:35000,desc:'Fells, strips & cuts.'},
  {id:'drone',name:'Forest Drone Fleet',icon:'🛸',svg:'drone',rate:650,cost:6e5,desc:'Laser-precise felling.'},
  {id:'heli',name:'Sky-Crane Helicopter',icon:'🚁',svg:'heli',rate:4000,cost:1.2e7,desc:'Lifts logs from anywhere.'},
];
const COL_SCALE=1.15;
const BUILDINGS=[
  {id:'sawmill',name:'Sawmill',icon:'🪚',svg:'sawmill',inp:{logs:4},out:{planks:2},cost:100,scale:1.19,desc:'Saws logs into planks.'},
  {id:'chipper',name:'Wood Chipper',icon:'🌀',svg:'chipper',inp:{logs:6},out:{chips:6},cost:1000,scale:1.19,desc:'Shreds logs into chips.'},
  {id:'kiln',name:'Charcoal Kiln',icon:'🔥',svg:'kiln',inp:{logs:10},out:{charcoal:3},cost:5000,scale:1.2,desc:'Slow-burns logs into charcoal.'},
  {id:'carpentry',name:'Carpentry Workshop',icon:'🔨',svg:'carpentry',inp:{planks:6},out:{chairs:1},cost:8000,scale:1.2,desc:'Crafts planks into chairs.'},
  {id:'pellet',name:'Pellet Press',icon:'⚙️',svg:'pellet',inp:{chips:20},out:{pellets:8},cost:25000,scale:1.2,desc:'Compresses chips into fuel pellets.'},
  {id:'paper',name:'Paper Mill',icon:'🏭',svg:'paper_b',inp:{chips:40},out:{paper:10},cost:100000,scale:1.21,desc:'Pulps chips into fine paper.'},
  {id:'furniture',name:'Furniture Factory',icon:'🏗️',svg:'furniture_b',inp:{chairs:8,planks:20},out:{furniture:2},cost:6e5,scale:1.22,desc:'Assembles full furniture sets.'},
  // v2.2 premium workshops (need the Premium Area; spd = base throughput multiplier)
  {id:'atelier',name:'Gift Box Atelier',icon:'🎁',svg:'giftbox',inp:{charcoal:5,pellets:5},out:{giftbox:1},cost:1.5e6,scale:1.21,premium:true,spd:5,desc:'Packs charcoal & pellets into grill gift boxes.'},
  {id:'parquet',name:'Parquet Workshop',icon:'🪵',svg:'flooring',inp:{planks:12,charcoal:3},out:{flooring:1},cost:4e6,scale:1.21,premium:true,spd:5,desc:'Planks + a charcoal-oil finish become artisan hardwood flooring.'},
  {id:'stationer',name:'Stationery House',icon:'✒️',svg:'stationery',inp:{paper:8},out:{stationery:1},cost:1.2e7,scale:1.22,premium:true,spd:5,desc:'Binds fine paper into premium stationery.'},
  {id:'cabinetry',name:'Cabinet Studio',icon:'🗄️',svg:'cabinets',inp:{chairs:2,planks:10},out:{cabinets:1},cost:4e7,scale:1.22,premium:true,spd:5,desc:'Turns chairs & planks into designer cabinets.'},
  // v2.5 research buildings (tech: unlocked by the research tree; drawn on the R&D campus / harbour)
  {id:'lab',name:'Research Lab',icon:'🔬',svg:'lab',inp:{paper:6},out:{},rp:1,cost:3e6,scale:1.24,tech:true,spd:1,desc:'Turns paper into Research Points for the research tree.'},
  {id:'plymill',name:'Plywood Mill',icon:'🟧',svg:'plywood',inp:{planks:10,glue:2},out:{plywood:2},cost:1.5e7,scale:1.22,tech:true,spd:4,desc:'Glues veneers of planks into strong plywood sheets.'},
  {id:'toyshop',name:'Toy Workshop',icon:'🧸',svg:'toys',inp:{plywood:2,paper:4},out:{toys:2},cost:8e7,scale:1.22,tech:true,spd:4,desc:'Cuts plywood into wooden toys, boxed in printed paper.'},
  {id:'boatyard',name:'Boat Yard',icon:'⛵',svg:'boats',inp:{plywood:12,planks:30,glue:4},out:{boats:1},cost:4e8,scale:1.23,tech:true,spd:4,desc:'Builds wooden boats on the slipway at the harbour.'},
  {id:'showroom',name:'Luxury Showroom',icon:'👑',svg:'luxfurn',inp:{furniture:1,planks:20},out:{luxfurn:1},cost:1.5e8,scale:1.23,premium:true,spd:5,desc:'Hand-finishes furniture sets into luxury collections.'},
];
const MAIN_BLD=BUILDINGS.filter(b=>!b.premium&&!b.tech), PREM_BLD=BUILDINGS.filter(b=>b.premium), TECH_BLD=BUILDINGS.filter(b=>b.tech);
const BMAP={}; BUILDINGS.forEach(b=>BMAP[b.id]=b);
// v1.3 building milestones: each reached level doubles that building's speed and hires a yard worker
const MILESTONES=[10,25,50,100,200,400];
const MS_MULT=2;
function msCount(lvl){let n=0;for(const m of MILESTONES) if(lvl>=m) n++;return n;}
function nextMs(lvl){for(const m of MILESTONES) if(lvl<m) return m;return null;}
function totStars(){return BUILDINGS.reduce((a,b)=>a+msCount(S.buildings[b.id].lvl),0);}
const TREES=[
  {name:'Pine',icon:'🌲',mult:1,cost:0,flt:'',color:'#2f5b2a',color2:'#3f7a2a'},
  {name:'Oak',icon:'🌳',mult:1.5,cost:25000,flt:'',color:'#2a5a20',color2:'#4a8a30'},
  {name:'Maple',icon:'🍁',mult:2,cost:6e5,flt:'',color:'#8a4a20',color2:'#c06030'},
  {name:'Mahogany',icon:'🌳',mult:3,cost:1.5e7,flt:'hue-rotate(-50deg) saturate(1.6) brightness(.8)',color:'#5a2010',color2:'#8a3020'},
  {name:'Ebony',icon:'🌲',mult:5,cost:4e8,flt:'brightness(.35) contrast(1.3)',color:'#1a1a1a',color2:'#2a2a2a'},
];
const bl=id=>S.buildings[id].lvl, cn=id=>S.collectors[id], pn=id=>(S.planters&&S.planters[id])||0;
const UPGRADES=[
  {id:'sharp',icon:'🪓',name:'Sharper Axes',desc:'Chopping ×2',cost:40,req:()=>true,apply:m=>m.chop*=2},
  {id:'steel',icon:'⚒️',name:'Steel Axes',desc:'Lumberjacks ×2',cost:400,req:()=>cn('lumberjack')>=5,apply:m=>m.col.lumberjack*=2},
  {id:'steamsaw',icon:'♨️',name:'Steam Saw',desc:'Sawmill speed ×2',cost:1500,req:()=>bl('sawmill')>=2,apply:m=>m.bld.sawmill*=2},
  {id:'oil',icon:'🛢️',name:'Chainsaw Oil',desc:'Chainsaw Crews ×2',cost:3000,req:()=>cn('chainsaw')>=5,apply:m=>m.col.chainsaw*=2},
  {id:'combo',icon:'💪',name:'Ambidextrous Chopping',desc:'Each chop also gives 2% of your logs/s',cost:8000,req:()=>cn('lumberjack')>=10,apply:m=>m.chopPct+=0.02},
  {id:'kilndry',icon:'🌡️',name:'Kiln Drying',desc:'Planks & Charcoal sell ×1.5',cost:20000,req:()=>bl('sawmill')>=5,apply:m=>{m.price.planks*=1.5;m.price.charcoal*=1.5}},
  {id:'sawdust',icon:'🧹',name:'Sawdust Recovery',desc:'Sawmills also output 1 Chip per Plank',cost:30000,req:()=>bl('chipper')>=1,apply:m=>m.sawdust=true},
  {id:'diesel',icon:'⛽',name:'Diesel Trucks',desc:'Logging Trucks ×2',cost:50000,req:()=>cn('truck')>=5,apply:m=>m.col.truck*=2},
  {id:'conveyor',icon:'🛤️',name:'Conveyor Belts',desc:'All buildings speed ×1.5',cost:150000,req:()=>BUILDINGS.filter(b=>bl(b.id)>0).length>=3,apply:m=>m.bldAll*=1.5},
  {id:'jigs',icon:'📐',name:'Ergonomic Jigs',desc:'Carpentry speed ×2',cost:200000,req:()=>bl('carpentry')>=3,apply:m=>m.bld.carpentry*=2},
  {id:'dryer',icon:'💨',name:'Pellet Dryer',desc:'Pellets sell ×2',cost:400000,req:()=>bl('pellet')>=2,apply:m=>m.price.pellets*=2},
  {id:'goldaxe',icon:'✨',name:'Golden Axe',desc:'Chopping ×5',cost:250000,req:()=>S.clicks>=400,apply:m=>m.chop*=5},
  {id:'gps',icon:'🛰️',name:'GPS Harvesters',desc:'Harvesters ×2',cost:500000,req:()=>cn('harvester')>=5,apply:m=>m.col.harvester*=2},
  {id:'export',icon:'🚢',name:'Export Contracts',desc:'All products sell ×1.5',cost:1500000,req:()=>bl('carpentry')>=1,apply:m=>m.priceAll*=1.5},
  {id:'bleach',icon:'🧪',name:'Paper Bleaching',desc:'Paper sells ×2',cost:2500000,req:()=>bl('paper')>=2,apply:m=>m.price.paper*=2},
  {id:'heattreat',icon:'🔥',name:'Retort Kilns',desc:'Charcoal Kiln speed ×2',cost:3000000,req:()=>bl('kiln')>=5,apply:m=>m.bld.kiln*=2},
  {id:'ai',icon:'🤖',name:'Swarm AI',desc:'Drone Fleets ×2',cost:15000000,req:()=>cn('drone')>=5,apply:m=>m.col.drone*=2},
  {id:'automation',icon:'🦾',name:'Automated Assembly',desc:'Furniture Factory speed ×2',cost:25000000,req:()=>bl('furniture')>=2,apply:m=>m.bld.furniture*=2},
  {id:'brand',icon:'🏷️',name:'Designer Brand',desc:'Chairs & Furniture sell ×2',cost:40000000,req:()=>bl('furniture')>=1,apply:m=>{m.price.chairs*=2;m.price.furniture*=2}},
  {id:'logistics',icon:'🌍',name:'Global Logistics',desc:'All buildings speed ×2',cost:100000000,req:()=>bl('furniture')>=4,apply:m=>m.bldAll*=2},
  {id:'rotors',icon:'🌀',name:'Twin Rotors',desc:'Sky-Cranes ×2',cost:300000000,req:()=>cn('heli')>=5,apply:m=>m.col.heli*=2},
  // v2.4 fire safety
  {id:'alarm',icon:'🚨',name:'Smoke Detectors',desc:'Fire risk −25%',cost:40000,req:()=>bl('kiln')>=1,apply:m=>m.fire*=.75},
  // v2.7 forestry
  {id:'spades',icon:'⛏️',name:'Steel Spades',desc:'Planters & Planting Teams ×2',cost:2500,req:()=>pn('planter')>=5,apply:m=>{m.plantT.planter*=2;m.plantT.team*=2;}},
  {id:'fert',icon:'🌾',name:'Fertilizer',desc:'Saplings grow 50% faster',cost:12000,req:()=>pn('planter')>=3,apply:m=>m.grow*=1.5},
  {id:'elite',icon:'🌲',name:'Elite Saplings',desc:'Every grown tree yields 50% more logs',cost:6e5,req:()=>pn('team')>=3,apply:m=>m.yield*=1.5},
  {id:'irrig',icon:'💧',name:'Drip Irrigation',desc:'Saplings grow 50% faster',cost:3e6,req:()=>pn('nursery')>=1,apply:m=>m.grow*=1.5},
  {id:'sprinkler',icon:'🚿',name:'Sprinkler System',desc:'Fire risk −35%',cost:5000000,req:()=>bl('kiln')>=10,apply:m=>m.fire*=.65},
];
const EVENTS=[
  {id:'hotel',name:'🏨 Big Hotel Order',desc:'Chairs & Furniture sell for 3×!',dur:60,req:()=>bl('carpentry')>0,apply:m=>{m.price.chairs*=3;m.price.furniture*=3}},
  {id:'storm',name:'⛈️ Storm!',desc:'A storm knocked down trees',dur:0,instant:()=>{const n=Math.max(40,logRate()*45);addRes('logs',n);return '+'+fmt(n)+' 🪵 logs collected!';}},
  {id:'termites',name:'🐜 Termites!',desc:'Collectors −25% while you fumigate',dur:30,bad:true,instant:()=>{const n=S.res.logs*0.05;S.res.logs-=n;return n>1?'Lost '+fmt(n)+' 🪵 from storage.':'';},apply:m=>m.colAll*=0.75},
  {id:'boom',name:'📈 Lumber Boom',desc:'All prices 2×!',dur:30,apply:m=>m.priceAll*=2},
  {id:'acorn',name:'🌰 Golden Acorn',desc:'Chopping power 10×!',dur:20,apply:m=>m.chop*=10},
  {id:'print',name:'🗞️ Election Print Rush',desc:'Paper sells 3×!',dur:45,req:()=>bl('paper')>0,apply:m=>m.price.paper*=3},
  {id:'cold',name:'❄️ Cold Snap',desc:'Charcoal & Pellets sell 3×!',dur:45,req:()=>(bl('kiln')>0||bl('pellet')>0)&&(!S.wx||seasonIdx()!==1),apply:m=>{m.price.charcoal*=3;m.price.pellets*=3}},
  // golden-log rewards (never rolled randomly)
  {id:'frenzy',name:'✨ Timber Frenzy',desc:'Collectors & chopping 5×!',dur:20,golden:true,req:()=>false,apply:m=>{m.colAll*=5;m.chop*=5}},
  {id:'goldrush',name:'✨ Gold Rush',desc:'All prices 3×!',dur:20,golden:true,req:()=>false,apply:m=>m.priceAll*=3},
  // client-order reward (never rolled randomly)
  {id:'viprush',name:'🎩 VIP Rush',desc:'A delighted client spread the word: all prices 2×!',dur:45,golden:true,req:()=>false,apply:m=>m.priceAll*=2},
];
const EMAP={}; EVENTS.forEach(e=>EMAP[e.id]=e);
const ACH_BONUS=0.02;
const totCol=()=>COLLECTORS.reduce((a,c)=>a+S.collectors[c.id],0);
const totLvl=()=>BUILDINGS.reduce((a,b)=>a+S.buildings[b.id].lvl,0);
const nBuilt=()=>BUILDINGS.filter(b=>S.buildings[b.id].lvl>0).length;
const nUpg=()=>Object.keys(S.upgrades).filter(k=>S.upgrades[k]).length;
const maxLvl=()=>Math.max(0,...BUILDINGS.map(b=>S.buildings[b.id].lvl));
const nSat=()=>BUILDINGS.filter(b=>S.buildings[b.id].lvl>0&&S.buildings[b.id].on&&bstat[b.id].f>0.995).length;
const ACH=[
  {id:'chop1',t:'bronze',e:'🪓',n:'First Swing',d:'Chop your first log',p:()=>[S.lifetimeClicks,1]},
  {id:'chop100',t:'bronze',e:'✋',n:'Callused Hands',d:'Chop 100 times',p:()=>[S.lifetimeClicks,100]},
  {id:'chop1k',t:'silver',e:'🐦',n:'Woodpecker',d:'Chop 1,000 times',p:()=>[S.lifetimeClicks,1000]},
  {id:'chop5k',t:'gold',e:'⚔️',n:'Axe Legend',d:'Chop 5,000 times',p:()=>[S.lifetimeClicks,5000]},
  {id:'earn1k',t:'bronze',e:'🪙',n:'Pocket Change',d:'Earn 1K coins (lifetime)',p:()=>[S.lifetimeEarned,1e3]},
  {id:'earn1m',t:'silver',e:'💰',n:'Millionaire Mill',d:'Earn 1M coins (lifetime)',p:()=>[S.lifetimeEarned,1e6]},
  {id:'earn1b',t:'gold',e:'🏦',n:'Timber Baron',d:'Earn 1B coins (lifetime)',p:()=>[S.lifetimeEarned,1e9]},
  {id:'earn1t',t:'gold',e:'👑',n:'Lumber Lord',d:'Earn 1T coins (lifetime)',p:()=>[S.lifetimeEarned,1e12]},
  {id:'jack25',t:'bronze',e:'🧔',n:'Beard Brigade',d:'Hire 25 Lumberjacks',p:()=>[S.collectors.lumberjack,25]},
  {id:'col100',t:'silver',e:'👷',n:'Crew of 100',d:'Own 100 collectors',p:()=>[totCol(),100]},
  {id:'heli',t:'gold',e:'🚁',n:'Sky Logger',d:'Own a Sky-Crane Helicopter',p:()=>[S.collectors.heli,1]},
  {id:'rate100',t:'bronze',e:'🌲',n:'Steady Stream',d:'Reach 100 logs/s',p:()=>[logRate(),100]},
  {id:'rate10k',t:'silver',e:'🌊',n:'Log Flood',d:'Reach 10K logs/s',p:()=>[logRate(),1e4]},
  {id:'rate1m',t:'gold',e:'🌋',n:'Deforestation Inc.',d:'Reach 1M logs/s',p:()=>[logRate(),1e6]},
  {id:'saw10',t:'bronze',e:'🪚',n:'Sawdust Everywhere',d:'Sawmill level 10',p:()=>[S.buildings.sawmill.lvl,10]},
  {id:'allbld',t:'silver',e:'🏭',n:'Full Chain',d:'Build all 7 buildings',p:()=>[MAIN_BLD.filter(b=>S.buildings[b.id].lvl>0).length,MAIN_BLD.length]},
  {id:'furn',t:'silver',e:'🛋️',n:'Interior Design',d:'Build a Furniture Factory',p:()=>[S.buildings.furniture.lvl,1]},
  {id:'lvl250',t:'gold',e:'🏗️',n:'Industrial Giant',d:'250 total building levels',p:()=>[totLvl(),250]},
  {id:'sat5',t:'silver',e:'⚙️',n:'Well Oiled',d:'5 buildings at 100% at once',p:()=>[nSat(),5]},
  {id:'oak',t:'bronze',e:'🌳',n:'Mighty Oak',d:'Harvest Oak',p:()=>[S.tree,1]},
  {id:'maple',t:'silver',e:'🍁',n:'Maple Syrup',d:'Harvest Maple',p:()=>[S.tree,2]},
  {id:'ebony',t:'gold',e:'🖤',n:'Ebony Empire',d:'Harvest Ebony',p:()=>[S.tree,4]},
  {id:'upg10',t:'silver',e:'⬆️',n:'Tinkerer',d:'Own 10 upgrades',p:()=>[nUpg(),10]},
  {id:'upgall',t:'gold',e:'🧰',n:'Fully Tooled',d:'Own every upgrade',p:()=>[nUpg(),UPGRADES.length]},
  {id:'replant',t:'silver',e:'🌱',n:'Replanter',d:'Replant the forest once',p:()=>[S.prestiges,1]},
  {id:'seeds25',t:'gold',e:'🌾',n:'Seed Bank',d:'Hold 25 Seeds',p:()=>[S.seeds,25]},
  {id:'gold1',t:'bronze',e:'✨',n:'Golden Find',d:'Catch a Golden Log',p:()=>[S.golden,1]},
  {id:'gold10',t:'silver',e:'🌟',n:'Gold Digger',d:'Catch 10 Golden Logs',p:()=>[S.golden,10]},
  {id:'gold50',t:'gold',e:'💫',n:'Midas Touch',d:'Catch 50 Golden Logs',p:()=>[S.golden,50]},
  {id:'ms1',t:'bronze',e:'⭐',n:'Milestone!',d:'Reach a building milestone (Lv 10)',p:()=>[totStars(),1]},
  {id:'ms10',t:'silver',e:'🌟',n:'Star Factory',d:'Earn 10 milestone stars',p:()=>[totStars(),10]},
  {id:'lvl100',t:'gold',e:'💯',n:'Centurion',d:'Get any building to Lv 100',p:()=>[maxLvl(),100]},
  {id:'order1',t:'bronze',e:'📋',n:'Order Up!',d:'Complete a client order',p:()=>[(S.orders&&S.orders.done)||0,1]},
  {id:'order10',t:'silver',e:'🤝',n:'Trusted Supplier',d:'Complete 10 client orders',p:()=>[(S.orders&&S.orders.done)||0,10]},
  {id:'fire1',t:'bronze',e:'🧑‍🚒',n:'Firefighter',d:'Put out a fire by tapping it',p:()=>[(S.fireStats&&S.fireStats.tap)>0?1:0,1]},
  {id:'fire10',t:'silver',e:'🚒',n:'Fire Brigade',d:'Put out 10 fires',p:()=>[(S.fireStats&&S.fireStats.n)||0,10]},
  {id:'mgr1',t:'bronze',e:'🤝',n:'First Hire',d:'Hire a manager',p:()=>[Object.keys(S.mgr||{}).length,1]},
  {id:'res1',t:'bronze',e:'🔬',n:'Eureka!',d:'Research your first node',p:()=>[Object.keys(S.research||{}).length,1]},
  {id:'res10',t:'gold',e:'🧠',n:'Think Tank',d:'Research 10 nodes',p:()=>[Object.keys(S.research||{}).length,10]},
  {id:'trade1',t:'bronze',e:'🚢',n:'Bon Voyage',d:'Complete a trade delivery',p:()=>[(S.trade&&S.trade.stats.trips)||0,1]},
  {id:'trade6',t:'gold',e:'🌍',n:'Global Brand',d:'Open all 6 trade routes',p:()=>[Object.keys((S.trade&&S.trade.routes)||{}).length,6]},
  {id:'mgr6',t:'gold',e:'👔',n:'Management Team',d:'Hire 6 managers',p:()=>[Object.keys(S.mgr||{}).length,6]},
  {id:'plant1k',t:'silver',e:'🌱',n:'Green Thumb',d:'Plant 1,000 saplings',p:()=>[(S.forestLife&&S.forestLife.planted)||0,1000]},
  {id:'plant100k',t:'gold',e:'🌳',n:'Reforestation',d:'Plant 100,000 saplings',p:()=>[(S.forestLife&&S.forestLife.planted)||0,1e5]},
  {id:'premium',t:'gold',e:'🏛️',n:'Haute Bois',d:'Open the Premium Factory Area',p:()=>[(S.premium&&S.premium.lvl)>0?1:0,1]},
  {id:'daily1',t:'bronze',e:'📅',n:'On the Clock',d:'Complete a daily contract',p:()=>[(S.daily&&S.daily.total)||0,1]},
  {id:'daily3',t:'silver',e:'🔥',n:'Three-Day Grind',d:'Reach a 3-day contract streak',p:()=>[(S.daily&&S.daily.bestStreak)||0,3]},
  {id:'daily7',t:'gold',e:'📆',n:'Week Warrior',d:'Reach a 7-day contract streak',p:()=>[(S.daily&&S.daily.bestStreak)||0,7]},
  {id:'daily25',t:'gold',e:'📬',n:'Contract Ace',d:'Complete 25 daily contracts',p:()=>[(S.daily&&S.daily.total)||0,25]},
  // v2.10 power plant
  {id:'power1',t:'bronze',e:'⚡',n:'Lights On',d:'Build the Biomass Power Plant',p:()=>[(S.power&&S.power.lvl)>0?1:0,1]},
  {id:'power10',t:'gold',e:'🔌',n:'Grid Tycoon',d:'Upgrade the Power Plant to Lv 10',p:()=>[(S.power&&S.power.lvl)||0,10]},
  // v2.12 builders' yard
  {id:'build1',t:'bronze',e:'🏗️',n:'Hard Hats On',d:"Build the Builders' Yard",p:()=>[(S.builders&&S.builders.lvl)>0?1:0,1]},
  {id:'build1k',t:'gold',e:'🏙️',n:'Skyline',d:'Let your crews build 1,000 building levels',p:()=>[(S.builders&&S.builders.stats&&S.builders.stats.lv)||0,1000]},
];

/* ===================== STATE ===================== */
function freshState(keep){
  const s={v:1,version:VERSION,coins:0,res:{},collectors:{},buildings:{},upgrades:{},autosell:{},tree:0,
    seeds:0,prestiges:0,totalEarned:0,lifetimeEarned:0,clicks:0,lifetimeClicks:0,time:0,playTime:0,
    events:[],nextEvent:75,lastSave:Date.now(),runStart:Date.now(),firstStart:Date.now(),muted:true,ach:{},golden:0,
    storage:{},premium:{lvl:0},orders:{offer:null,active:null,next:100,done:0,failed:0,hist:[]},
    wx:{clock:126,w:'clear',ends:0,next:201},
    mgr:{},station:{lvl:0},fires:{},fireStats:{n:0,tap:0},fireCool:0,
    research:{},rp:0,trade:{lvl:0,routes:{},fleet:[],dem:{},spike:null,nextDrift:0,nextSpike:0,stats:{trips:0,earned:0},seq:0},
    daily:{day:'',offers:[],active:[],doneToday:0,streak:0,bestStreak:0,total:0,hist:[],failedToday:0},
    planters:{planter:1,team:0,nursery:0,sdrone:0},forest:{m:1200,y:0,s:0,st:0,eff:1,warn:0,D:0},forestLife:{planted:0},prefs:{autoFocus:true,haptics:true},power:{lvl:0,on:true,fuel:'mix',eff:0,burn:{}},
    builders:{lvl:0,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0}};   // v2.7: one free planter, a full forest
  RES.forEach(r=>{s.res[r.id]=0;s.autosell[r.id]=true;});
  COLLECTORS.forEach(c=>s.collectors[c.id]=0);
  BUILDINGS.forEach(b=>s.buildings[b.id]={lvl:0,on:true});
  if(keep) Object.assign(s,keep);
  return s;
}
let S=freshState();
let M=null;
const bstat={}; BUILDINGS.forEach(b=>bstat[b.id]={f:0,lim:null,speed:0});
const rates={}; RES.forEach(r=>rates[r.id]={p:0,c:0,s:0,d:0});
let coinRate=0, chopRateEma=0;
let offlineAcc=null;
let dispCoins=0, lastDispCoins=-1;
let prevBldSig='', prevTree=-1;

function migrateSave(o){
  // v1.0 -> v1.1: add missing fields
  if(o.version===undefined) o.version='1.0';
  if(o.muted===undefined) o.muted=true;
  // v1.1 -> v1.2: trophies & golden logs
  if(!o.ach||typeof o.ach!=='object') o.ach={};
  if(typeof o.golden!=='number') o.golden=0;
  // v1.2 -> v1.3: milestones are derived from building levels; nothing to add
  // v1.3 -> v2.0: visual-only overhaul (isometric scene); camera/view state is not saved
  // v2.1 -> v2.2: storage levels, premium area and client orders (new fields; new buildings/resources come from freshState)
  if(!o.storage||typeof o.storage!=='object') o.storage={};
  if(!o.premium||typeof o.premium!=='object') o.premium={lvl:0};
  if(!o.orders||typeof o.orders!=='object') o.orders={offer:null,active:null,next:(o.time||0)+60,done:0,failed:0,hist:[]};
  // v2.2 -> v2.3: world clock / season / weather (starts at 07:12, day 1 of spring)
  if(!o.wx||typeof o.wx!=='object'||typeof o.wx.clock!=='number') o.wx={clock:126,w:'clear',ends:0,next:201};
  // v2.3 -> v2.4: managers, fire station, fires
  if(!o.mgr||typeof o.mgr!=='object') o.mgr={};
  if(!o.station||typeof o.station!=='object') o.station={lvl:0};
  if(!o.fires||typeof o.fires!=='object') o.fires={};
  if(!o.fireStats||typeof o.fireStats!=='object') o.fireStats={n:0,tap:0};
  // v2.4 -> v2.5: research tree, research points, trade (harbour, routes, fleet)
  if(!o.research||typeof o.research!=='object') o.research={};
  if(typeof o.rp!=='number') o.rp=0;
  if(!o.trade||typeof o.trade!=='object') o.trade={lvl:0,routes:{},fleet:[],dem:{},spike:null,nextDrift:0,nextSpike:0,stats:{trips:0,earned:0},seq:0};
  if(!Array.isArray(o.trade.fleet)) o.trade.fleet=[]; if(!o.trade.routes) o.trade.routes={}; if(!o.trade.stats) o.trade.stats={trips:0,earned:0}; if(!o.trade.dem) o.trade.dem={};
  // v2.5 -> v2.6: daily contracts
  if(!o.daily||typeof o.daily!=='object') o.daily={day:'',offers:[],active:[],doneToday:0,streak:0,bestStreak:0,total:0,hist:[],failedToday:0};
  if(!Array.isArray(o.daily.offers)) o.daily.offers=[]; if(!Array.isArray(o.daily.active)) o.daily.active=[]; if(!Array.isArray(o.daily.hist)) o.daily.hist=[];
  if(typeof o.daily.streak!=='number') o.daily.streak=0; if(typeof o.daily.bestStreak!=='number') o.daily.bestStreak=0;
  if(typeof o.daily.total!=='number') o.daily.total=0; if(typeof o.daily.doneToday!=='number') o.daily.doneToday=0;
  if(typeof o.daily.failedToday!=='number') o.daily.failedToday=0;
  // v2.6 -> v2.7: forest stock + planting crew (full forest; free starter crew sized to the current loggers)
  if(!o.forest||typeof o.forest!=='object') migrateForest(o);
  if(!o.forestLife||typeof o.forestLife!=='object') o.forestLife={planted:0};
  // v2.8 -> v2.9: mobile preferences (auto-focus camera on events, haptic feedback)
  if(!o.prefs||typeof o.prefs!=='object') o.prefs={autoFocus:true,haptics:true};
  if(typeof o.prefs.autoFocus!=='boolean') o.prefs.autoFocus=true; if(typeof o.prefs.haptics!=='boolean') o.prefs.haptics=true;
  // v2.9 -> v2.10: biomass power plant
  if(!o.power||typeof o.power!=='object') o.power={lvl:0,on:true,fuel:'mix',eff:0,burn:{}};
  if(typeof o.power.lvl!=='number') o.power.lvl=0; if(typeof o.power.on!=='boolean') o.power.on=true; if(!['mix','pellets','charcoal'].includes(o.power.fuel)) o.power.fuel='mix';
  if(typeof o.power.eff!=='number') o.power.eff=0; if(!o.power.burn||typeof o.power.burn!=='object') o.power.burn={};
  // v2.11 -> v2.12: builders' yard (construction crews)
  if(!o.builders||typeof o.builders!=='object') o.builders={lvl:0,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0};
  {const B=o.builders;if(typeof B.lvl!=='number') B.lvl=0;if(typeof B.on!=='boolean') B.on=true;if(!['ms','cheap','low'].includes(B.plan)) B.plan='ms';
    if(![.1,.25,.5,1].includes(B.budget)) B.budget=.25;if(!B.off||typeof B.off!=='object'||Array.isArray(B.off)) B.off={};if(!Array.isArray(B.jobs)) B.jobs=[];
    if(!B.stats||typeof B.stats!=='object') B.stats={lv:0,spent:0,jobs:0};for(const k of ['lv','spent','jobs']) if(typeof B.stats[k]!=='number') B.stats[k]=0;
    if(typeof B.seq!=='number') B.seq=0;B.cool=0;}
  if(o.v===undefined) o.v=1;
  o.version=VERSION;
  return o;
}
function merge(base,obj){
  for(const k in obj){
    if(obj[k]&&typeof obj[k]==='object'&&!Array.isArray(obj[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k])){
      merge(base[k],obj[k]);
      for(const k2 in obj[k]) if(!(k2 in base[k])) base[k][k2]=obj[k][k2];
    } else if(k in base) base[k]=obj[k];
  }
  return base;
}

/* ===================== MODIFIERS ===================== */
function computeMods(){
  const m={chop:1,chopPct:0,col:{},colAll:1,bld:{},bldAll:1,price:{},priceAll:1,sawdust:false,fire:1,grow:1,yield:1,plantT:{planter:1,team:1,nursery:1,sdrone:1}};
  COLLECTORS.forEach(c=>m.col[c.id]=1); BUILDINGS.forEach(b=>m.bld[b.id]=1); RES.forEach(r=>m.price[r.id]=1);
  for(const u of UPGRADES) if(S.upgrades[u.id]) u.apply(m);
  m.priceAll*=TREES[S.tree].mult;
  for(const e of S.events){const d=EMAP[e.id]; if(d&&d.apply) d.apply(m);}
  if(S.wx) applyWorldMods(m);
  applyResearch(m);
  if(typeof pwBoost==='function'&&S.power&&S.power.lvl) m.bldAll*=1+pwBoost();   // v2.10 power plant
  if(S.premium&&S.premium.lvl>1) for(const r of RES) if(r.premium) m.price[r.id]*=1+PREM_LVL_BONUS*(S.premium.lvl-1);
  m.ach=1+ACH_BONUS*achCount();
  m.rep=(1+0.1*S.seeds)*m.ach;
  return m;
}
function price(id){return RMAP[id].price*M.priceAll*M.price[id];}
function colRate(id){return COLLECTORS.find(c=>c.id===id).rate*M.col[id]*M.colAll*M.rep;}
function logRatePot(){let t=0;for(const c of COLLECTORS) t+=S.collectors[c.id]*colRate(c.id);return t;}
function logRate(){return logRatePot()*forestEff();}   // v2.7: collectors can only fell grown trees
function bSpeed(id){const l=S.buildings[id].lvl;const b=BMAP[id];return l*Math.pow(MS_MULT,msCount(l))*M.bld[id]*M.bldAll*M.rep*(b.spd||1)*stoBonus(id)*mgrSpd(id);}
function chopPower(){return (1*M.chop+M.chopPct*logRate())*M.rep;}
function addRes(id,n){S.res[id]+=n;}
function earn(n){S.coins+=n;S.totalEarned+=n;S.lifetimeEarned+=n;}

/* ===================== SIMULATION ===================== */
function tick(dt,offline){
  M=computeMods();
  S.time+=dt; S.playTime+=dt; wxTick(dt,offline); fireTick(dt,offline);
  const fl={}; RES.forEach(r=>fl[r.id]={p:0,c:0,s:0});
  forestTick(dt,offline);
  const lr=logRate()*dt; S.res.logs+=lr; fl.logs.p+=lr;
  const demand={}; RES.forEach(r=>demand[r.id]=0);
  const active=[];
  for(const b of BUILDINGS){
    const st=S.buildings[b.id];
    if(!st.lvl||!st.on||onFire(b.id)){bstat[b.id]={f:0,lim:null,speed:st.lvl?bSpeed(b.id):0,fire:onFire(b.id)};continue;}
    const sp=bSpeed(b.id); active.push([b,sp]); const mi=mgrIn(b.id);
    for(const k in b.inp) demand[k]+=b.inp[k]*sp*dt*mi;
  }
  const frac={};
  for(const k in demand) frac[k]=demand[k]>0?Math.min(1,S.res[k]/demand[k]):1;
  const pend={};
  // v2.2 storage: each building's output stockpile has a capacity; when it's full the building pauses
  const caps=stockCaps(), want={}, pre=[];
  for(const [b,sp] of active){
    let f=1,lim=null;
    for(const k in b.inp) if(frac[k]<f-1e-9){f=frac[k];lim=k;}
    pre.push([b,sp,f,lim]); const mo=mgrOut(b.id); for(const k in b.out) want[k]=(want[k]||0)+b.out[k]*sp*dt*f*mo;
  }
  const ofr={}; for(const k in want){const room=Math.max(0,caps[k]-S.res[k]);ofr[k]=want[k]>room+1e-12?room/want[k]:1;}
  for(const [b,sp,f0,lim] of pre){
    let f=f0,full=null;
    for(const k in b.out) if(ofr[k]<1&&f0*ofr[k]<f-1e-12){f=f0*ofr[k];full=k;}
    const mi=mgrIn(b.id), mo=mgrOut(b.id);   // v2.4 managers: lean line (less input) / lucky batch (expected extra output)
    for(const k in b.inp){const a=b.inp[k]*sp*dt*f*mi;S.res[k]=Math.max(0,S.res[k]-a);fl[k].c+=a;}
    for(const k in b.out){const a=b.out[k]*sp*dt*f*mo;pend[k]=(pend[k]||0)+a;}
    if(b.id==='sawmill'&&M.sawdust){pend.chips=(pend.chips||0)+b.out.planks*sp*dt*f;}
    if(b.id==='kiln'&&M.tar){pend.glue=(pend.glue||0)+b.out.charcoal*sp*dt*f*mo*.5;}   // v2.5 pine tar glue
    bstat[b.id]={f,lim:full?null:lim,speed:sp,full};
  }
  for(const k in pend){S.res[k]+=pend[k];fl[k].p+=pend[k];if(caps[k]<Infinity&&S.res[k]>caps[k]) S.res[k]=caps[k];}
  if(typeof powerTick==='function') powerTick(demand,dt,fl);   // v2.10: the power plant takes its fuel before auto-sell
  orderCollect(demand,dt,offline,pend); dailyCollect(demand,dt,offline,pend); tradeCollect(demand,dt,pend); researchTick(dt);
  let earned=0;
  for(const r of RES){
    if(!S.autosell[r.id]) continue;
    const reserve=(demand[r.id]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const sell=S.res[r.id]-reserve;
    if(sell>1e-9){S.res[r.id]-=sell;fl[r.id].s+=sell;earned+=sell*price(r.id);}
  }
  if(earned>0) earn(earned);
  if(!offline){
    const a=Math.min(1,dt/1.5);
    for(const r of RES){const R=rates[r.id],F=fl[r.id];
      R.p+=(F.p/dt-R.p)*a;R.c+=(F.c/dt-R.c)*a;R.s+=(F.s/dt-R.s)*a;R.d=demand[r.id]/dt;}
    coinRate+=(earned/dt-coinRate)*a;
  } else if(offlineAcc){
    offlineAcc.coins+=earned;
    for(const r of RES){offlineAcc.p[r.id]+=fl[r.id].p;offlineAcc.s[r.id]+=fl[r.id].s;}
    for(const r of RES) rates[r.id].d=demand[r.id]/dt;
  }
  if(typeof byTick==='function') byTick(dt,offline);   // v2.12: construction crews
  orderTick(dt,offline); dailyTick(dt,offline); tradeTick(dt,offline);
  S.events=S.events.filter(e=>e.ends>S.time);
  if(offline){ if(S.nextEvent<S.time) S.nextEvent=S.time+60; }
  else if(S.time>=S.nextEvent){ triggerEvent(); S.nextEvent=S.time+90+Math.random()*90; }
}
function triggerEvent(forceId){
  const pool=EVENTS.filter(e=>(!e.req||e.req())&&!S.events.some(x=>x.id===e.id));
  if(!pool.length) return;
  const e=forceId?EMAP[forceId]:pool[Math.floor(Math.random()*pool.length)];
  M=computeMods();
  let extra='';
  if(e.instant) extra=e.instant()||'';
  if(e.dur>0) S.events.push({id:e.id,ends:S.time+e.dur});
  toast(`<b>${e.name}</b><br>${e.desc}${e.dur?` for ${e.dur}s`:''}. ${extra}`);
  M=computeMods();
  renderEvents(true);
  sfx('event');
}
function simulate(sec,step){
  step=step||0.1; let t=sec;
  while(t>1e-9){const d=Math.min(step,t);tick(d,false);t-=d;}
}
function simulateOffline(sec){
  offlineAcc={coins:0,p:{},s:{},planted:0,built:0}; RES.forEach(r=>{offlineAcc.p[r.id]=0;offlineAcc.s[r.id]=0;});
  const steps=Math.min(Math.ceil(sec),6000), dt=sec/steps;
  for(let i=0;i<steps;i++) tick(dt,true);
  const res=offlineAcc; offlineAcc=null; return res;
}

/* ===================== COSTS & PURCHASES ===================== */
function bulkCost(base,scale,owned,n){return base*Math.pow(scale,owned)*(Math.pow(scale,n)-1)/(scale-1);}
function maxAfford(base,scale,owned){const c=S.coins;const n=Math.floor(Math.log(c*(scale-1)/(base*Math.pow(scale,owned))+1)/Math.log(scale));return Math.max(0,n);}
let buyMult=1;
function qty(base,scale,owned){if(buyMult==='max') return Math.max(1,maxAfford(base,scale,owned));return buyMult;}
function buyCollector(id,n){
  const c=COLLECTORS.find(x=>x.id===id);n=n||qty(c.cost,COL_SCALE,S.collectors[id]);
  const cost=bulkCost(c.cost,COL_SCALE,S.collectors[id],n);
  if(S.coins+1e-9<cost) return false; S.coins-=cost; S.collectors[id]+=n; M=computeMods(); sfx('buy'); return true;
}
function buyBuilding(id,n){
  const b=BMAP[id];n=n||qty(b.cost,b.scale,S.buildings[id].lvl);
  const cost=bulkCost(b.cost,b.scale,S.buildings[id].lvl,n);
  if(!bldUnlocked(id)) return false;
  if(S.coins+1e-9<cost) return false; const first=S.buildings[id].lvl===0;
  const ms0=msCount(S.buildings[id].lvl);
  S.coins-=cost; S.buildings[id].lvl+=n; M=computeMods();
  const ms1=msCount(S.buildings[id].lvl);
  if(first){toast(`${b.icon} <b>${b.name}</b> built! ${recipeStr(b)}`); confettiBurst(); sfx('unlock'); if(typeof buildPoof==='function') buildPoof(id);}
  else if(ms1>ms0) milestoneHit(b,ms0,ms1);
  else sfx('buy');
  return true;
}
function buyUpgrade(id){
  const u=UPGRADES.find(x=>x.id===id); if(!u||S.upgrades[id]||S.coins<u.cost) return false;
  S.coins-=u.cost; S.upgrades[id]=true; M=computeMods(); toast(`${u.icon} <b>${u.name}</b>: ${u.desc}`); sfx('buy'); return true;
}
function buyTree(){
  const nx=TREES[S.tree+1]; if(!nx||S.coins<nx.cost) return false;
  S.coins-=nx.cost; S.tree++; M=computeMods(); toast(`${nx.icon} Now harvesting <b>${nx.name}</b>! All prices ×${nx.mult}`); confettiBurst(); sfx('unlock'); return true;
}
function chop(){
  const n=chopPower()*chopForest(); S.res.logs+=n; S.clicks++; S.lifetimeClicks++; chopRateEma+=1; sfx('chop'); return n;
}
function sellAll(id){
  const n=S.res[id]; if(n<=0) return 0; const v=n*price(id); S.res[id]=0; earn(v); sfx('coin'); return v;
}
function seedsFor(earned){return earned<1e7?0:Math.floor(3*Math.sqrt(earned/1e7));}
function pendingSeeds(){return seedsFor(S.totalEarned);}
function doPrestige(){
  const g=pendingSeeds(); if(g<1) return false;
  const keep={seeds:S.seeds+g,prestiges:S.prestiges+1,lifetimeEarned:S.lifetimeEarned,lifetimeClicks:S.lifetimeClicks,
    firstStart:S.firstStart,playTime:S.playTime,autosell:Object.assign({},S.autosell),muted:S.muted,prefs:Object.assign({autoFocus:true,haptics:true},S.prefs),wx:S.wx,mgr:Object.assign({},S.mgr),station:{lvl:stationLvl()},fireStats:Object.assign({},S.fireStats),research:Object.assign({},S.research),rp:S.rp,
    trade:{lvl:harborLvl(),routes:Object.assign({},S.trade.routes),fleet:[],dem:S.trade.dem,spike:null,nextDrift:0,nextSpike:0,stats:Object.assign({},S.trade.stats),seq:S.trade.seq||0,repeat:S.trade.repeat},ach:Object.assign({},S.ach),golden:S.golden,
    orders:{offer:null,active:null,next:100,done:(S.orders&&S.orders.done)||0,failed:(S.orders&&S.orders.failed)||0,hist:((S.orders&&S.orders.hist)||[]).slice(-5)},
    daily:{day:'',offers:[],active:[],doneToday:0,streak:(S.daily&&S.daily.streak)||0,bestStreak:(S.daily&&S.daily.bestStreak)||0,total:(S.daily&&S.daily.total)||0,hist:[],failedToday:0}};
  keep.forestLife=Object.assign({},S.forestLife||{planted:0});
  keep.power={lvl:pwLvl(),on:S.power?S.power.on!==false:true,fuel:(S.power&&S.power.fuel)||'mix',eff:0,burn:{}};   // v2.10: the plant stays built
  {const B=S.builders||{};keep.builders={lvl:B.lvl||0,on:B.on!==false,plan:B.plan||'ms',budget:B.budget||.25,off:Object.assign({},B.off||{}),jobs:[],stats:Object.assign({lv:0,spent:0,jobs:0},B.stats||{}),seq:B.seq||0,cool:0};}   // v2.12: the yard stays built, jobs are dropped
  S=freshState(keep); M=computeMods();
  RES.forEach(r=>{rates[r.id]={p:0,c:0,s:0,d:0};}); coinRate=0;
  save(); rebuildAll(); toast(`🌱 Forest replanted! You now have <b>${S.seeds}</b> Seeds (+${S.seeds*10}% production).`);
  confettiBurst(); sfx('unlock');
  return true;
}

function milestoneHit(b,ms0,ms1){
  const k=ms1-ms0, lv=MILESTONES[ms1-1], tot=Math.pow(MS_MULT,ms1);
  toast(`<span style="font-size:22px">⭐</span><span><b>${b.name} reached Lv ${lv}!</b><br>Speed ×${Math.pow(MS_MULT,k)} (now ×${tot}) · ${k>1?k+' yard workers':'a yard worker'} hired</span>`,4600,'ms-toast');
  if(typeof sheetPop==='function') sheetPop(b.id);
  if(typeof scene!=='undefined') scene.msFlash={id:b.id,t:1.6};
  confettiBurst(); sfx('unlock');
}

/* ===================== TROPHIES ===================== */
function achCount(){let n=0;for(const a of ACH) if(S.ach&&S.ach[a.id]) n++;return n;}
let achFresh={};
function checkAch(silent){
  if(!S.ach) S.ach={};
  const got=[];
  for(const a of ACH){ if(S.ach[a.id]) continue; const [c,t]=a.p(); if(c>=t){S.ach[a.id]=Date.now();got.push(a);achFresh[a.id]=1;} }
  if(!got.length) return got;
  M=computeMods(); achSig='';
  if(silent||got.length>3){
    toast(`<span>${medalSvg('gold','🏆')}</span><span><b>${got.length} trophies unlocked!</b><br>+${got.length*2}% production · ${achCount()}/${ACH.length} total</span>`,5200,'ach-toast');
  } else for(const a of got){
    toast(`<span>${medalSvg(a.t,a.e)}</span><span><b>Trophy: ${a.n}</b><br><span style="color:var(--muted)">${a.d}</span> · <b style="color:var(--green)">+2% production</b></span>`,5200,'ach-toast');
  }
  if(!silent){ if(got.some(a=>a.t==='gold')) confettiBurst(); sfx('unlock'); }
  return got;
}
function medalSvg(tier,emoji){
  const C={bronze:['#f2b27a','#b0683a','#7a4320'],silver:['#ffffff','#b8c2cc','#6e7a86'],gold:['#fff1a8','#f0b828','#9a6c0a']}[tier]||['#ccc','#888','#444'];
  const gid='mg'+tier;
  return `<svg class="md" viewBox="0 0 48 56" aria-hidden="true"><defs><radialGradient id="${gid}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${C[0]}"/><stop offset=".6" stop-color="${C[1]}"/><stop offset="1" stop-color="${C[2]}"/></radialGradient></defs>`+
    `<path d="M12 0h9l5 20-8 3z" fill="#c0392b"/><path d="M36 0h-9l-5 20 8 3z" fill="#2c6fbb"/><path d="M15 0h3l4 18-3 1z" fill="rgba(255,255,255,.25)"/>`+
    `<circle cx="24" cy="34" r="19" fill="${C[2]}"/><circle cx="24" cy="33" r="18" fill="url(#${gid})"/>`+
    `<circle cx="24" cy="33" r="13.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="2 2"/>`+
    `<text x="24" y="39" text-anchor="middle" font-size="15">${emoji}</text><ellipse cx="17" cy="24" rx="5" ry="2.5" fill="rgba(255,255,255,.45)" transform="rotate(-30 17 24)"/></svg>`;
}
