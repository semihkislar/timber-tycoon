'use strict';
const VERSION='2.28.1';
const SAVE_KEY='timberTycoon_save_v1';
const OFFLINE_CAP=8*3600;
const BUFFER_SEC=2;

/* ===================== SVG ICONS ===================== */
const ICONS={
  logs:(c)=>`<svg viewBox="0 0 32 32"><ellipse cx="16" cy="24" rx="10" ry="4" fill="#5a3a1a"/><rect x="6" y="8" width="20" height="16" rx="3" fill="${c||'#8b5a2b'}"/><ellipse cx="16" cy="8" rx="10" ry="4" fill="#c08a4f"/><ellipse cx="16" cy="8" rx="4" ry="1.5" fill="#6b4226"/><line x1="8" y1="12" x2="24" y2="12" stroke="#6b4226" stroke-width=".8" opacity=".4"/><line x1="8" y1="16" x2="24" y2="16" stroke="#6b4226" stroke-width=".8" opacity=".4"/></svg>`,
  planks:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="6" rx="1" fill="#c08a4f" stroke="#8b5a2b"/><rect x="4" y="13" width="24" height="6" rx="1" fill="#b07a42" stroke="#8b5a2b"/><rect x="4" y="20" width="24" height="6" rx="1" fill="#a36d38" stroke="#8b5a2b"/></svg>`,
  veneer:()=>`<svg viewBox="0 0 32 32"><rect x="5" y="7" width="22" height="4" rx="1" fill="#ecd3a2" stroke="#b88c52"/><rect x="4" y="13" width="22" height="4" rx="1" fill="#e2c48c" stroke="#b08446"/><rect x="6" y="19" width="22" height="4" rx="1" fill="#ecd3a2" stroke="#b88c52"/><path d="M8 9h14M7 15h15M10 21h14" stroke="#c9a26a" stroke-width=".7"/></svg>`,
  bark:()=>`<svg viewBox="0 0 32 32"><path d="M6 22l5-12 5 3 4-6 6 9-3 7z" fill="#6b4428" stroke="#3e2614"/><path d="M10 18l3-5M15 20l2-6M20 21l2-7" stroke="#a07048" stroke-width="1.2"/></svg>`,
  peeler:()=>`<svg viewBox="0 0 32 32"><rect x="4" y="14" width="24" height="12" fill="#a9b08a"/><polygon points="4,14 16,6 28,14" fill="#4f7a52"/><ellipse cx="14" cy="20" rx="5" ry="3.4" fill="#b07a42" stroke="#6b4226"/><circle cx="14" cy="20" r="1.6" fill="#e2c48c"/><rect x="19" y="18" width="7" height="5" fill="#ecd3a2" stroke="#b88c52"/></svg>`,
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
  // v2.28 timber line: beams (Phase 1), glulam (Phase 2), timber-frame houses (Phase 3)
  beams:()=>`<svg viewBox="0 0 32 32"><path d="M4 12l16-6 8 3-16 6z" fill="#d9a865" stroke="#8b5a2b"/><path d="M4 12v5l8 3v-5z" fill="#b07a42" stroke="#8b5a2b"/><path d="M12 15l16-6v5l-16 6z" fill="#c48d4f" stroke="#8b5a2b"/><path d="M4 20l16-6 8 3-16 6z" fill="#d9a865" stroke="#8b5a2b"/><path d="M4 20v5l8 3v-5z" fill="#b07a42" stroke="#8b5a2b"/><path d="M12 23l16-6v5l-16 6z" fill="#c48d4f" stroke="#8b5a2b"/></svg>`,
  glulam:()=>`<svg viewBox="0 0 32 32"><path d="M3 22Q16 4 29 22" fill="none" stroke="#8b5a2b" stroke-width="7" stroke-linecap="round"/><path d="M3 22Q16 4 29 22" fill="none" stroke="#e2b877" stroke-width="5" stroke-linecap="round"/><path d="M4.5 21Q16 6.5 27.5 21" fill="none" stroke="#b9874c" stroke-width=".8"/><path d="M5.5 23Q16 9 26.5 23" fill="none" stroke="#b9874c" stroke-width=".8"/><rect x="2" y="24" width="28" height="3" rx="1" fill="#6b4226"/></svg>`,
  houses:()=>`<svg viewBox="0 0 32 32"><path d="M5 15L16 6l11 9v12H5z" fill="#e8d2a6" stroke="#6b4226"/><path d="M3 16L16 5l13 11" fill="none" stroke="#7a3a24" stroke-width="2.6" stroke-linejoin="round"/><path d="M5 15h22M5 21h22M10 15v12M22 15v12M10 15l12 6M22 15l-12 6" stroke="#8b5a2b" stroke-width="1.2"/><rect x="14" y="21" width="4" height="6" fill="#6b4226"/></svg>`,
  beamsaw:()=>`<svg viewBox="0 0 32 32"><rect x="3" y="14" width="26" height="12" fill="#9a7a5a"/><polygon points="3,14 16,6 29,14" fill="#5a6a7a"/><rect x="6" y="18" width="12" height="4" fill="#d9a865" stroke="#8b5a2b"/><circle cx="23" cy="20" r="4" fill="#c0c8d0" stroke="#666"/><path d="M23 16v8M19 20h8" stroke="#888"/></svg>`,
  glulam_b:()=>`<svg viewBox="0 0 32 32"><rect x="3" y="13" width="26" height="13" fill="#7a8a6a"/><path d="M3 14Q16 2 29 14" fill="#c48d4f" stroke="#6b4226"/><rect x="7" y="18" width="18" height="3" fill="#e2b877" stroke="#8b5a2b"/><rect x="7" y="21" width="18" height="2" fill="#d9a865" stroke="#8b5a2b"/></svg>`,
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
  {id:'planks',name:'Planks',icon:'🟫',svg:'planks',price:3},
  {id:'veneer',name:'Veneer',icon:'📃',svg:'veneer',price:3.5},
  {id:'bark',name:'Bark Mulch',icon:'🟤',svg:'bark',price:1.5},
  {id:'chips',name:'Wood Chips',icon:'🍂',svg:'chips',price:2},
  {id:'charcoal',name:'Charcoal',icon:'⚫',svg:'charcoal',price:9},
  {id:'chairs',name:'Chairs',icon:'🪑',svg:'chairs',price:60},
  {id:'pellets',name:'Pellets',icon:'🟤',svg:'pellets',price:10},
  {id:'paper',name:'Paper',icon:'📜',svg:'paper',price:20},
  {id:'furniture',name:'Furniture Sets',icon:'🛋️',svg:'furniture',price:700},
  // v2.2 premium goods (made in the Premium Factory Area)
  {id:'giftbox',name:'Grill Gift Boxes',icon:'🎁',svg:'giftbox',price:230,premium:true},
  {id:'flooring',name:'Artisan Flooring',icon:'🪵',svg:'flooring',price:260,premium:true},
  {id:'stationery',name:'Premium Stationery',icon:'✒️',svg:'stationery',price:380,premium:true},
  {id:'cabinets',name:'Designer Cabinets',icon:'🗄️',svg:'cabinets',price:380,premium:true},
  {id:'luxfurn',name:'Luxury Furniture',icon:'👑',svg:'luxfurn',price:1900,premium:true},
  // v2.5 research goods (R&D campus + harbour)
  {id:'glue',name:'Pine Tar Glue',icon:'🍯',svg:'glue',price:6,tech:true},
  {id:'plywood',name:'Plywood',icon:'🟧',svg:'plywood',price:90,tech:true},
  {id:'toys',name:'Wooden Toys',icon:'🧸',svg:'toys',price:320,tech:true},
  {id:'boats',name:'Wooden Boats',icon:'⛵',svg:'boats',price:4500,tech:true},
  // v2.28 timber line (bottom of the Phase 1 / 2 / 3 columns)
  {id:'beams',name:'Timber Beams',icon:'🪜',svg:'beams',price:14},
  {id:'glulam',name:'Glulam Beams',icon:'🌉',svg:'glulam',price:220},
  {id:'houses',name:'Timber-frame Houses',icon:'🏡',svg:'houses',price:3200,premium:true},
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
  {id:'sawmill',name:'Sawmill',icon:'🪚',svg:'sawmill',inp:{logs:4},out:{planks:3},cost:100,scale:1.19,desc:'Saws logs into planks.'},
  {id:'chipper',name:'Wood Chipper',icon:'🌀',svg:'chipper',inp:{logs:6},out:{chips:6},cost:1000,scale:1.19,desc:'Shreds logs into chips.'},
  {id:'kiln',name:'Charcoal Kiln',icon:'🔥',svg:'kiln',inp:{logs:10},out:{charcoal:3},cost:5000,scale:1.2,desc:'Slow-burns logs into charcoal.'},
  {id:'carpentry',name:'Carpentry Workshop',icon:'🔨',svg:'carpentry',inp:{planks:4},out:{chairs:1},cost:8000,scale:1.2,desc:'Crafts planks into chairs.'},
  {id:'peeler',name:'Veneer Peeler',icon:'📃',svg:'peeler',inp:{logs:4},out:{veneer:4,bark:1},cost:6e4,scale:1.19,desc:'Debarks logs and peels them into thin veneer sheets (bark is sold as mulch).'},   // v2.20 phase 1
  {id:'pellet',name:'Pellet Press',icon:'⚙️',svg:'pellet',inp:{chips:20},out:{pellets:8},cost:25000,scale:1.2,desc:'Compresses chips into fuel pellets.'},
  {id:'paper',name:'Paper Mill',icon:'🏭',svg:'paper_b',inp:{chips:30},out:{paper:10},cost:100000,scale:1.21,desc:'Pulps chips into fine paper.'},
  {id:'furniture',name:'Furniture Factory',icon:'🏗️',svg:'furniture_b',inp:{planks:12,veneer:6},out:{furniture:2},cost:6e5,scale:1.22,desc:'Assembles full furniture sets.'},
  // v2.28 timber line: a Phase 1 beam saw and a Phase 2 glulam plant at the bottom of their columns (south of the old highway)
  {id:'beamsaw',name:'Beam Saw',icon:'🪜',svg:'beamsaw',inp:{logs:6},out:{beams:2,chips:2},cost:2e6,scale:1.19,spd:6,desc:'Squares big logs into heavy timber beams; the slabs and offcuts are chipped, feeding the pellet and paper lines.'},
  {id:'glulam',name:'Glulam Plant',icon:'🌉',svg:'glulam_b',inp:{beams:4},out:{glulam:1},cost:2.5e7,scale:1.21,spd:5,desc:'Laminates timber beams into long, strong glulam beams.'},
  // v2.2 premium workshops (need the Premium Area; spd = base throughput multiplier)
  {id:'atelier',name:'Gift Box Atelier',icon:'🎁',svg:'giftbox',inp:{pellets:5,paper:2},out:{giftbox:1},cost:1.5e6,scale:1.21,premium:true,spd:5,desc:'Packs pellets in printed paper into grill gift boxes.'},
  {id:'parquet',name:'Parquet Workshop',icon:'🪵',svg:'flooring',inp:{plywood:1,paper:2},out:{flooring:1},cost:4e6,scale:1.21,premium:true,spd:5,desc:'Engineered parquet: a plywood core on a paper underlay, finished by hand.'},
  {id:'stationer',name:'Stationery House',icon:'✒️',svg:'stationery',inp:{paper:8},out:{stationery:1},cost:1.2e7,scale:1.22,premium:true,spd:5,desc:'Binds fine paper into premium stationery.'},
  {id:'cabinetry',name:'Cabinet Studio',icon:'🗄️',svg:'cabinets',inp:{chairs:2,plywood:1},out:{cabinets:1},cost:4e7,scale:1.22,premium:true,spd:5,desc:'Turns chairs & plywood into designer cabinets.'},
  // v2.5 research buildings (tech: unlocked by the research tree; drawn on the R&D campus / harbour)
  {id:'lab',name:'Research Lab',icon:'🔬',svg:'lab',inp:{paper:6},out:{},rp:1,cost:5e5,scale:1.24,tech:true,spd:1,desc:'Turns paper into Research Points for the research tree.'},
  {id:'plymill',name:'Plywood Mill',icon:'🟧',svg:'plywood',inp:{veneer:4,glue:2},out:{plywood:3},cost:1.5e7,scale:1.22,tech:true,spd:4,desc:'Glues veneer sheets into strong plywood.'},
  {id:'toyshop',name:'Toy Workshop',icon:'🧸',svg:'toys',inp:{plywood:2,paper:4},out:{toys:2},cost:8e7,scale:1.22,tech:true,spd:4,desc:'Cuts plywood into wooden toys, boxed in printed paper.'},
  {id:'boatyard',name:'Boat Yard',icon:'⛵',svg:'boats',inp:{plywood:8,chairs:2},out:{boats:1},cost:4e8,scale:1.23,tech:true,spd:4,desc:'Builds wooden boats on the slipway at the harbour.'},
  {id:'showroom',name:'Luxury Showroom',icon:'👑',svg:'luxfurn',inp:{furniture:1,chairs:2},out:{luxfurn:1},cost:1.5e8,scale:1.23,premium:true,spd:5,desc:'Hand-finishes furniture sets into luxury collections.'},
  {id:'framer',name:'Timber-frame Houses',icon:'🏡',svg:'houses',inp:{glulam:4,plywood:2},out:{houses:1},cost:6e8,scale:1.23,premium:true,spd:5,desc:'Raises timber-frame house kits: a glulam frame sheathed in plywood.'},   // v2.28 bottom of row III
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
  {id:'export',icon:'🚢',name:'Export Licence',desc:'All products sell ×1.5',cost:1500000,req:()=>bl('carpentry')>=1,apply:m=>m.priceAll*=1.5},   // v2.28.1: was "Export Contracts" (clashed with the Shipping Yard's export contracts)
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
/* v2.22 leveled upgrades (docs/stations-v2.22.md §1): every upgrade is a line Lv 0 → N. Lv 1 = the old one-time upgrade;
   each further level scales the Lv-1 bonus by g(L)=1+0.1·(L−1). Cost ×12 per level. Lv 2+ need the thing the upgrade is about. */
const UPG_MAX={sawdust:1,alarm:3,sprinkler:3}, UPG_GROW=12, UPG_STEP=.1;
const UPG_REF={sharp:['k'],steel:['c','lumberjack'],steamsaw:['b','sawmill'],oil:['c','chainsaw'],combo:['c','lumberjack'],kilndry:['b','sawmill'],sawdust:['b','chipper'],
  diesel:['c','truck'],conveyor:['n'],jigs:['b','carpentry'],dryer:['b','pellet'],goldaxe:['k'],gps:['c','harvester'],export:['n'],bleach:['b','paper'],heattreat:['b','kiln'],
  ai:['c','drone'],automation:['b','furniture'],brand:['b','furniture'],logistics:['n'],rotors:['c','heli'],alarm:['b','kiln'],spades:['p','planter'],fert:['p','planter'],
  elite:['p','team',[0,0,5,10,20,40]],irrig:['p','nursery',[0,0,2,4,7,10]],sprinkler:['b','kiln']};
const UPG_TH={c:[0,0,15,30,60,100],p:[0,0,10,25,50,100],b:[0,0,25,50,100,200],n:[0,0,5,7,9,11],k:[0,0,200,600,1500,4000]};
function upLvl(id){const v=S.upgrades&&S.upgrades[id];return v===true?1:(+v||0);}
function upMax(u){return UPG_MAX[u.id]||5;}
function upG(L){return 1+UPG_STEP*(L-1);}
function upRefVal(u){const r=UPG_REF[u.id]||['n'];return r[0]==='c'?cn(r[1]):r[0]==='p'?pn(r[1]):r[0]==='b'?bl(r[1]):r[0]==='k'?S.clicks:nBuilt();}
function upNeed(u,L){const r=UPG_REF[u.id]||['n'];return (r[2]||UPG_TH[r[0]])[Math.min(5,L)]||0;}
function upReqOk(u,L){L=L||upLvl(u.id)+1;if(L>upMax(u)) return false;if(!u.req()) return false;return L<2||upRefVal(u)>=upNeed(u,L);}
function upReqTxt(u,L){const r=UPG_REF[u.id]||['n'],n=upNeed(u,L);
  if(r[0]==='c'){const c=COLLECTORS.find(x=>x.id===r[1]);return `${c?c.name:r[1]} ×${n}`;}
  if(r[0]==='p'){const p=(typeof PLANTERS!=='undefined'?PLANTERS:[]).find(x=>x.id===r[1]);return `${p?p.name:r[1]} ×${n}`;}
  if(r[0]==='b') return `${BMAP[r[1]].name} Lv ${n}`;if(r[0]==='k') return `${fmt(n)} taps this run`;return `${n} buildings built`;}
function upDesc(u,L){if(L<=1||upMax(u)===1) return u.desc;const g=upG(L),r2=x=>{const v=Math.round(x*100)/100;return (v%1?v.toFixed(v*10%1?2:1):String(v));};
  return u.desc.replace(/×(\d+(?:\.\d+)?)|−(\d+)%|(\d+)%/,(m0,a,b,c)=>a?'×'+r2(1+(+a-1)*g):b?'−'+r2(Math.min(80,+b*g))+'%':r2(+c*g)+'%');}
const NEUTRAL_M=()=>{const m={chop:1,chopPct:0,col:{},colAll:1,bld:{},bldAll:1,price:{},priceAll:1,sawdust:false,fire:1,grow:1,yield:1,plantT:{planter:1,team:1,nursery:1,sdrone:1}};
  COLLECTORS.forEach(c=>m.col[c.id]=1); BUILDINGS.forEach(b=>m.bld[b.id]=1); RES.forEach(r=>m.price[r.id]=1); return m;};
const _upD={};
function upDiff(u){if(_upD[u.id]) return _upD[u.id];const m0=NEUTRAL_M(),m1=NEUTRAL_M();u.apply(m1);const d=[];
  for(const k in m1){const a=m0[k],b=m1[k];if(typeof b==='number'){if(b!==a) d.push([k,null,a,b]);}else if(typeof b==='boolean'){if(b!==a) d.push([k,null,a,b]);}
    else if(b&&typeof b==='object') for(const q in b) if(b[q]!==a[q]) d.push([k,q,a[q],b[q]]);}
  return _upD[u.id]=d;}
function upApply(u,m,L){if(!(L>0)) return;if(L===1){u.apply(m);return;}const g=upG(L);
  for(const [k,q,a,b] of upDiff(u)){const o=q===null?m:m[k],f=q===null?k:q;
    if(typeof b==='boolean') o[f]=b; else if(a===0) o[f]+=b*g; else o[f]*=Math.max(.2,1+(b/a-1)*g);}}
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
const nUpg=()=>Object.keys(S.upgrades).filter(k=>S.upgrades[k]).length;   // lines at Lv ≥ 1
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
  {id:'allbld',t:'silver',e:'🏭',n:'Full Chain',d:`Build all ${MAIN_BLD.length} Phase 1–2 buildings`,p:()=>[MAIN_BLD.filter(b=>S.buildings[b.id].lvl>0).length,MAIN_BLD.length]},
  {id:'furn',t:'silver',e:'🛋️',n:'Interior Design',d:'Build a Furniture Factory',p:()=>[S.buildings.furniture.lvl,1]},
  {id:'lvl250',t:'gold',e:'🏗️',n:'Industrial Giant',d:'250 total building levels',p:()=>[totLvl(),250]},
  {id:'sat5',t:'silver',e:'⚙️',n:'Well Oiled',d:'5 buildings at 100% at once',p:()=>[nSat(),5]},
  {id:'oak',t:'bronze',e:'🌳',n:'Mighty Oak',d:'Harvest Oak',p:()=>[S.tree,1]},
  {id:'maple',t:'silver',e:'🍁',n:'Maple Syrup',d:'Harvest Maple',p:()=>[S.tree,2]},
  {id:'ebony',t:'gold',e:'🖤',n:'Ebony Empire',d:'Harvest Ebony',p:()=>[S.tree,4]},
  {id:'upg10',t:'silver',e:'⬆️',n:'Tinkerer',d:'Own 10 upgrades',p:()=>[nUpg(),10]},
  {id:'upgall',t:'gold',e:'🧰',n:'Fully Tooled',d:'Own every upgrade',p:()=>[nUpg(),UPGRADES.length]},
  {id:'replant',t:'silver',e:'🌱',n:'Replanter',d:'Replant the forest once',p:()=>[S.prestiges,1]},
  {id:'seeds25',t:'gold',e:'🌾',n:'Seed Bank',d:'Reach a Forest Legacy of 25 Seeds',p:()=>[S.legacy||S.seeds,25]},
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
  {id:'mgr1',t:'bronze',e:'🤝',n:'First Hire',d:'Hire a manager or staff',p:()=>[typeof staffHiredCount==='function'?staffHiredCount():Object.keys(S.mgr||{}).length,1]},
  {id:'res1',t:'bronze',e:'🔬',n:'Eureka!',d:'Research your first node',p:()=>[Object.keys(S.research||{}).length,1]},
  {id:'res10',t:'gold',e:'🧠',n:'Think Tank',d:'Research 10 nodes',p:()=>[Object.keys(S.research||{}).length,10]},
  {id:'trade1',t:'bronze',e:'🚢',n:'Bon Voyage',d:'Complete a trade delivery',p:()=>[(S.trade&&S.trade.stats.trips)||0,1]},
  {id:'trade6',t:'gold',e:'🌍',n:'Global Brand',d:'Open all 6 trade routes',p:()=>[Object.keys((S.trade&&S.trade.routes)||{}).length,6]},
  {id:'mgr6',t:'gold',e:'👔',n:'Management Team',d:'Hire 6 staff (incl. founding foremen)',p:()=>[typeof staffHiredCount==='function'?staffHiredCount():Object.keys(S.mgr||{}).length,6]},
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
  // v2.17 line specialisations
  {id:'spec1',t:'bronze',e:'🎛️',n:'Specialist',d:'Specialise a production line (Lv 50)',p:()=>[typeof specCount==='function'?specCount(1):0,1]},
  {id:'spec3',t:'gold',e:'💠',n:'Master Lines',d:'Run 3 lines at Specialisation III (Lv 200)',p:()=>[typeof specCount==='function'?specCount(3):0,3]},
  // v2.27 trophies for the newer systems (g:'sys' = their own section in the Trophies sheet); every progress fn is safe on old saves
  {id:'ws1',g:'sys',t:'bronze',e:'🛠️',n:'Shop Floor',d:'Upgrade a workstation',p:()=>[achWsTot(),1]},
  {id:'ws50',g:'sys',t:'silver',e:'🔧',n:'Tuned Lines',d:'50 workstation levels in total',p:()=>[achWsTot(),50]},
  {id:'ws10',g:'sys',t:'gold',e:'⚙️',n:'Precision Works',d:'Max out a workstation (Lv 10)',p:()=>[achWsMax(),10]},
  {id:'tier3',g:'sys',t:'bronze',e:'🏗️',n:'Three Phases',d:'Run a building in Phase 1, 2 and 3 at once',p:()=>[[1,2,3].filter(t=>BUILDINGS.some(b=>BTIERa(b.id)===t&&S.buildings[b.id].lvl>0)).length,3]},
  {id:'prem5',g:'sys',t:'gold',e:'💎',n:'Premium Row',d:'Build every Phase 3 workshop',p:()=>[PREM_BLD.filter(b=>S.buildings[b.id].lvl>0).length,PREM_BLD.length]},
  // v2.28 south yard / timber-frame line
  {id:'beams2',g:'sys',t:'bronze',e:'🪜',n:'Timber Line',d:'Build a Beam Saw and a Glulam Plant',p:()=>[['beamsaw','glulam'].filter(k=>S.buildings[k]&&S.buildings[k].lvl>0).length,2]},
  {id:'house1',g:'sys',t:'silver',e:'🏡',n:'Raise the Roof',d:'Build the Timber-frame Houses workshop',p:()=>[S.buildings.framer&&S.buildings.framer.lvl>0?1:0,1]},
  {id:'house50',g:'sys',t:'gold',e:'🏘️',n:'Chalet Village',d:'Timber-frame Houses Lv 50',p:()=>[(S.buildings.framer&&S.buildings.framer.lvl)||0,50]},
  {id:'rp5',g:'sys',t:'silver',e:'🌲',n:'Evergreen',d:'Replant the forest 5 times',p:()=>[S.prestiges||0,5]},
  {id:'shop1',g:'sys',t:'bronze',e:'🛒',n:'Seed Shopper',d:'Buy a Seed Shop perk',p:()=>[Object.values(S.shop||{}).reduce((a,v)=>a+(+v||0),0),1]},
  {id:'goals',g:'sys',t:'gold',e:'🎯',n:'Goal Getter',d:'Finish every run goal in one run',p:()=>typeof GOALS!=='undefined'&&typeof goalsDone==='function'?[goalsDone(),GOALS.length]:[0,1]},
  {id:'res25',g:'sys',t:'gold',e:'🧪',n:'Research Campus',d:'Research 25 nodes',p:()=>[Object.keys(S.research||{}).length,25]},
  {id:'resrep',g:'sys',t:'silver',e:'♾️',n:'Never Done',d:'Research a ♾️ repeatable node',p:()=>[typeof RNODES!=='undefined'&&RNODES.some(n=>n.rep&&S.research&&S.research[n.id])?1:0,1]},
  {id:'mish1',g:'sys',t:'bronze',e:'🍀',n:'Still Standing',d:'Get through your first setback',p:()=>[achMish('n'),1]},
  {id:'mish10',g:'sys',t:'silver',e:'☂️',n:'Weathered',d:'Get through 10 setbacks',p:()=>[achMish('n'),10]},
  {id:'fix5',g:'sys',t:'bronze',e:'🔩',n:'Quick Fix',d:'Use Repair now 5 times',p:()=>[achMish('repairs'),5]},
  {id:'guard',g:'sys',t:'silver',e:'💂',n:'Night Watch',d:'Have the night guard stop a theft',p:()=>[achMish('dodged'),1]},
  {id:'ins3',g:'sys',t:'gold',e:'🛡️',n:'Fully Covered',d:'Insurance Lv 3',p:()=>[(S.mish&&S.mish.ins)||0,3]},
  {id:'slots3',g:'sys',t:'silver',e:'📋',n:'Full Board',d:'Run 3 client orders at once',p:()=>[(S.orders&&S.orders.acts&&S.orders.acts.length)||0,3]},
  {id:'order50',g:'sys',t:'gold',e:'🏅',n:'Preferred Supplier',d:'Complete 50 client orders',p:()=>[(S.orders&&S.orders.done)||0,50]},
  {id:'ship10',g:'sys',t:'silver',e:'🚢',n:'Export Desk',d:'Complete 10 export contracts',p:()=>[(S.ship&&S.ship.stats&&S.ship.stats.contracts)||0,10]},
  {id:'train1',g:'sys',t:'bronze',e:'🎓',n:'Night School',d:'Finish a staff training',p:()=>[(S.staff&&S.staff.trained)||0,1]},
  {id:'skill10',g:'sys',t:'gold',e:'🧑‍🏫',n:'Master Class',d:'Train a staff member to skill 10',p:()=>[Math.max(0,...((S.staff&&S.staff.team)||[]).filter(w=>!w.founding).map(w=>w.skill||1)),10]},
  {id:'team12',g:'sys',t:'silver',e:'👥',n:'Full Payroll',d:'Have 12 staff on the team',p:()=>[(S.staff&&S.staff.team&&S.staff.team.length)||0,12]},
];
function achWsTot(){let n=0;for(const k in (S.ws||{})){const w=S.ws[k];if(Array.isArray(w)) for(const x of w) n+=x|0;}return n;}
function achWsMax(){let n=0;for(const k in (S.ws||{})){const w=S.ws[k];if(Array.isArray(w)) for(const x of w) n=Math.max(n,x|0);}return n;}
function achMish(k){return (S.mish&&S.mish.stats&&+S.mish.stats[k])||0;}
function BTIERa(id){return typeof BTIER!=='undefined'?(BTIER[id]||0):0;}

/* ===================== STATE ===================== */
function freshState(keep){
  const s={v:1,version:VERSION,coins:0,res:{},collectors:{},buildings:{},upgrades:{},ws:{},autosell:{},tree:0,
    seeds:0,legacy:0,oldRep:0,tierNote:0,shop:{},runCS:1,run:{goals:{},peak:0,start:0,charter:false},rpStats:{runs:[],best:0},prestiges:0,totalEarned:0,lifetimeEarned:0,clicks:0,lifetimeClicks:0,time:0,playTime:0,
    events:[],nextEvent:75,lastSave:Date.now(),runStart:Date.now(),firstStart:Date.now(),muted:true,ach:{},golden:0,
    storage:{},premium:{lvl:0},orders:{offer:null,active:null,offers:[],acts:[],next:100,done:0,failed:0,hist:[]},
    wx:{clock:126,w:'clear',ends:0,next:201},
    mgr:{},station:{lvl:0},fires:{},fireStats:{n:0,tap:0},fireCool:0,
    research:{},rp:0,trade:{lvl:0,routes:{},fleet:[],dem:{},spike:null,nextDrift:0,nextSpike:0,stats:{trips:0,earned:0},seq:0},
    daily:{day:'',offers:[],active:[],doneToday:0,streak:0,bestStreak:0,total:0,hist:[],failedToday:0},
    planters:{planter:1,team:0,nursery:0,sdrone:0},forest:{m:1200,y:0,s:0,st:0,eff:1,warn:0,D:0},forestLife:{planted:0},prefs:{autoFocus:true,haptics:true,fatigue:true,plankMode:'fair'},power:{lvl:0,on:true,fuel:'mix',logs:'surplus',res:60,eff:0,burn:{}},mish:{next:0,ins:0,broke:{},log:[],stats:{n:0,dodged:0,lost:0,repairs:0}},staff:{team:[],candidates:[],nextRefresh:40,nextReroll:0,seq:0,unpaid:false},
    builders:{lvl:0,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0},
    ship:{dock:1,fork:2,fspd:0,crane:0,bays:[],contract:null,offer:null,nextOffer:40,stats:{trucks:0,contracts:0,bonus:0,failed:0}},
    spec:{},specStats:{picks:0,switches:0}};   // v2.17 line specialisations   // v2.7: one free planter, a full forest
  RES.forEach(r=>{s.res[r.id]=0;s.autosell[r.id]=canSell(r.id);});
  COLLECTORS.forEach(c=>s.collectors[c.id]=0);
  BUILDINGS.forEach(b=>s.buildings[b.id]={lvl:0,on:true});
  if(keep) Object.assign(s,keep);
  return s;
}
let S=freshState();
let M=null;
const bstat={}; BUILDINGS.forEach(b=>bstat[b.id]={f:0,lim:null,speed:0});
const rates={}; RES.forEach(r=>rates[r.id]={p:0,c:0,s:0,d:0});
let coinRate=0, chopRateEma=0; const SOLD_TMP={};
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
  // v2.26 bad-luck events (older saves: no insurance, empty log)
  if(!o.mish||typeof o.mish!=='object') o.mish={next:0,ins:0,broke:{},log:[],stats:{n:0,dodged:0,lost:0,repairs:0}};
  if(!(o.mish.ins>=0&&o.mish.ins<=3)) o.mish.ins=Math.max(0,Math.min(3,Math.floor(+o.mish.ins)||0)); if(!o.mish.broke||typeof o.mish.broke!=='object') o.mish.broke={}; if(!Array.isArray(o.mish.log)) o.mish.log=[];
  if(!o.mish.stats||typeof o.mish.stats!=='object') o.mish.stats={n:0,dodged:0,lost:0,repairs:0}; if(!isFinite(o.mish.next)) o.mish.next=0;
  // v2.9 -> v2.10: biomass power plant
  if(!o.power||typeof o.power!=='object') o.power={lvl:0,on:true,fuel:'mix',logs:'surplus',res:60,eff:0,burn:{}};
  if(typeof o.power.lvl!=='number') o.power.lvl=0; if(typeof o.power.on!=='boolean') o.power.on=true; if(!['mix','pellets','charcoal'].includes(o.power.fuel)) o.power.fuel='mix';
  if(typeof o.power.eff!=='number') o.power.eff=0; if(!o.power.burn||typeof o.power.burn!=='object') o.power.burn={};
  if(!['off','surplus','first'].includes(o.power.logs)) o.power.logs='surplus'; if(![30,60,120,300].includes(o.power.res)) o.power.res=60;   // v2.24 log fuel
  // v2.12 -> v2.13: shipping yard (docks, forklifts, contracts)
  if(!o.ship||typeof o.ship!=='object') o.ship={dock:1,fork:2,fspd:0,crane:0,bays:[],contract:null,offer:null,nextOffer:40,stats:{trucks:0,contracts:0,bonus:0,failed:0}};
  // v2.13 -> v2.14: staff system (roles, wages, candidates, training); migrate managers → founding foremen
  if(typeof o.prefs.fatigue!=='boolean') o.prefs.fatigue=true;
  if(o.prefs.plankMode!=='fair'&&o.prefs.plankMode!=='value') o.prefs.plankMode='fair';   // v2.15.1
  if(!o.staff||typeof o.staff!=='object') o.staff={team:[],candidates:[],nextRefresh:40,nextReroll:0,seq:0,unpaid:false};
  if(!Array.isArray(o.staff.team)) o.staff.team=[]; if(!Array.isArray(o.staff.candidates)) o.staff.candidates=[];
  if(typeof o.staff.seq!=='number') o.staff.seq=0; if(typeof o.staff.unpaid!=='boolean') o.staff.unpaid=false;
  // v2.14 -> v2.15: campfire breaks (w.brk); energy must be a number (0 used to read as 100)
  for(const w of o.staff.team){if(!w||typeof w!=='object') continue;if(typeof w.brk!=='boolean') w.brk=false;if(typeof w.energy!=='number'||!isFinite(w.energy)) w.energy=100;}
  o.staff.team=o.staff.team.filter(w=>w&&typeof w==='object');
  if(typeof staffMigrateFromMgr==='function') staffMigrateFromMgr(o);
  else {
    // deferred: staffsys may not be parsed yet during early calls; main init also migrates
    o._needStaffMig=1;
  }
  // v2.11 -> v2.12: builders' yard (construction crews)
  if(!o.builders||typeof o.builders!=='object') o.builders={lvl:0,on:true,plan:'ms',budget:.25,off:{},jobs:[],stats:{lv:0,spent:0,jobs:0},seq:0,cool:0};
  {const B=o.builders;if(typeof B.lvl!=='number') B.lvl=0;if(typeof B.on!=='boolean') B.on=true;if(!['ms','cheap','low'].includes(B.plan)) B.plan='ms';
    if(![.1,.25,.5,1].includes(B.budget)) B.budget=.25;if(!B.off||typeof B.off!=='object'||Array.isArray(B.off)) B.off={};if(!Array.isArray(B.jobs)) B.jobs=[];
    if(!B.stats||typeof B.stats!=='object') B.stats={lv:0,spent:0,jobs:0};for(const k of ['lv','spent','jobs']) if(typeof B.stats[k]!=='number') B.stats[k]=0;
    if(typeof B.seq!=='number') B.seq=0;B.cool=0;}
  // v2.16 -> v2.17: line specialisations (none chosen yet); drop anything malformed
  if(!o.spec||typeof o.spec!=='object'||Array.isArray(o.spec)) o.spec={};
  for(const id in o.spec){const x=o.spec[id];if(!BMAP[id]||!x||typeof x!=='object'||!['speed','lean','craft'].includes(x.k)){delete o.spec[id];continue;}if(typeof x.rt!=='number'||!isFinite(x.rt)) x.rt=0;}
  if(!o.specStats||typeof o.specStats!=='object') o.specStats={picks:0,switches:0};
  for(const k of ['picks','switches']) if(typeof o.specStats[k]!=='number') o.specStats[k]=0;
  if(o.v===undefined) o.v=1;
  if(typeof rpMigrate==='function') rpMigrate(o);   // v2.18 Replant 2.0
  if(typeof resMigrate==='function') resMigrate(o);   // v2.19 Research 2.0 (refund research Seeds)
  if(o.autosell) o.autosell.logs=false; if(o.res&&!(o.res.logs>=0)) o.res.logs=0;   // v2.20.1: logs are raw stock only (held logs stay and feed the mills)
  // v2.21.1 -> v2.22: owned one-time upgrades become Lv 1 of their line; workstations start at what each building's level needs (free)
  if(!o.upgrades||typeof o.upgrades!=='object') o.upgrades={}; for(const k in o.upgrades){const v=o.upgrades[k];o.upgrades[k]=v===true?1:Math.max(0,Math.floor(+v||0));}
  if(typeof wsGrandfather==='function') wsGrandfather(o);
  o.version=VERSION;
  return o;
}
function merge(base,obj){
  for(const k in obj){
    if(obj[k]&&typeof obj[k]==='object'&&!Array.isArray(obj[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k])){
      merge(base[k],obj[k]);
      for(const k2 in obj[k]) if(!(k2 in base[k])) base[k][k2]=obj[k][k2];
    } else if(k in base){
      // v2.28.1: a hand-edited / damaged save can't replace an object or number with the wrong type (null, string, NaN, Infinity)
      const b=base[k],v=obj[k];
      if(b&&typeof b==='object'&&!Array.isArray(b)&&(!v||typeof v!=='object'||Array.isArray(v))) continue;
      if(Array.isArray(b)&&!Array.isArray(v)) continue;
      if(typeof b==='number'&&!Number.isFinite(v)) continue;
      base[k]=v;
    }
  }
  return base;
}
/* v2.28.1: final clamp after loading (levels are whole numbers ≥ 0, stocks and coins never negative) */
function sanitizeState(s){
  for(const id in s.buildings){const b=s.buildings[id];if(b&&typeof b==='object') b.lvl=Math.max(0,Math.floor(+b.lvl||0));}
  for(const k of ['coins','totalEarned','lifetimeEarned','seeds']) if(typeof s[k]==='number'&&s[k]<0) s[k]=0;
  if(s.res&&typeof s.res==='object') for(const k in s.res) if(!(s.res[k]>=0)) s.res[k]=0;
  if(s.collectors&&typeof s.collectors==='object') for(const k in s.collectors) s.collectors[k]=Math.max(0,Math.floor(+s.collectors[k]||0));
  return s;
}

/* ===================== MODIFIERS ===================== */
function computeMods(){
  const m=NEUTRAL_M();
  for(const u of UPGRADES){const L=upLvl(u.id);if(L) upApply(u,m,L);}   // v2.22 leveled upgrades
  if(typeof wsApplyPrice==='function') wsApplyPrice(m);   // v2.22 quality workstations
  m.priceAll*=TREES[S.tree].mult;
  for(const e of S.events){const d=EMAP[e.id]; if(d&&d.apply) d.apply(m);}
  if(S.wx) applyWorldMods(m);
  applyResearch(m);
  if(typeof pwBoost==='function'&&S.power&&S.power.lvl) m.bldAll*=1+pwBoost()*(m.pw||1);   // v2.10 power plant
  if(S.premium&&S.premium.lvl>1) for(const r of RES) if(r.premium) m.price[r.id]*=1+PREM_LVL_BONUS*(S.premium.lvl-1);
  if(S.ship&&S.ship.dock>1) m.priceAll*=1+.02*(S.ship.dock-1);   // v2.13 export premium (shipping dock)
  if(typeof staffDockPrem==='function') m.priceAll*=1+staffDockPrem();   // v2.14 dock workers
  if(typeof applySpecMods==='function') applySpecMods(m);   // v2.17 master-craft lines
  m.ach=1+ACH_BONUS*achCount();
  m.rep=(typeof rpApply==='function'?rpApply(m):1+0.1*S.seeds)*m.ach;   // v2.18 Forest Legacy (js/replant.js)
  return m;
}
function price(id){return RMAP[id].price*M.priceAll*M.price[id];}
/* v2.20.1: logs are raw material only. They can't be sold, auto-sold, shipped or ordered; exports start at Phase 1. */
function canSell(k){return k!=='logs';}   // (a function, not a table: freshState runs before this line)
function saleValue(k){return canSell(k)?price(k):0;}
/* Log Yard: holds ~3 min of collection (at least 600). When it is full the collectors stop felling (nothing is wasted, the forest is spared). */
function logCap(){return Math.max(600,logRatePot()*180);}
function yardRun(){return S&&isFinite(S.yardRun)?S.yardRun:1;}
function yardFull(){return yardRun()<.95;}
/* the first Sawmill of every run is built with LOGS, not coins (logs can't be sold, so a run would otherwise start with no income),
   and the first Lumberjack of a run is hired for free, so a run with 0 coins can never soft-lock: free lumberjack → logs → Sawmill → planks → coins */
const SAW_LOGS=40;   // ~40 s of one lumberjack (or ~40 taps); flat, so it is never a wall after a Replant either
function sawByLogs(){return S.buildings.sawmill.lvl===0;}
function sawLogsOk(){return sawByLogs()&&S.res.logs+1e-9>=SAW_LOGS;}
function colCost(id,owned,n){const c=COLLECTORS.find(x=>x.id===id);if(id==='lumberjack'&&owned===0) return n>1?bulkCost(c.cost,COL_SCALE,1,n-1):0;return bulkCost(c.cost,COL_SCALE,owned,n);}
function canFirstBuild(id){return id==='sawmill'?sawLogsOk():S.coins+1e-9>=bulkCost(BMAP[id].cost,BMAP[id].scale,0,1);}
function colRate(id){return COLLECTORS.find(c=>c.id===id).rate*M.col[id]*M.colAll*M.rep;}
function logRatePot(){let t=0;for(const c of COLLECTORS) t+=S.collectors[c.id]*colRate(c.id);return t;}
function logRate(){const base=logRatePot()*forestEff();return typeof staffApplyToLogRate==='function'?staffApplyToLogRate(base):base;}   // v2.7 + v2.14 lumberjack/driver
function bSpeed(id){const l=S.buildings[id].lvl;const b=BMAP[id];return l*Math.pow(MS_MULT,msCount(l))*M.bld[id]*M.bldAll*M.rep*(b.spd||1)*stoBonus(id)*mgrSpd(id)*(typeof staffMillSpd==='function'?staffMillSpd(id):1)*(typeof specSpd==='function'?specSpd(id):1)*(typeof wsSpd==='function'?wsSpd(id):1)*(typeof mishSpd==='function'?mishSpd(id):1);}   // v2.22 workstations   // v2.17 specialisation / retool
/* v2.17: input per item = manager thrift × specialisation (lean −20…40 %, high-speed +15 %) */
function bInMult(id){return mgrIn(id)*(typeof specIn==='function'?specIn(id):1)*(typeof wsIn==='function'?wsIn(id):1);}
/* v2.15.1 saw yield: from Lv 50 the Sawmill gets more planks out of every log (milestones ×1.6, plus +5 % per level above 50),
   so one Sawmill keeps up with the many plank-hungry buildings that come later. Inputs (logs) are unchanged. */
function sawYieldAt(l){const ms=msCount(l);return Math.pow(1.6,Math.max(0,ms-2))*(1+Math.max(0,l-50)/20);}
function sawYield(){return sawYieldAt(S.buildings.sawmill.lvl);}
/* v2.24 veneer/plywood balance: the Peeler and the Plywood Mill get the same yield curve as the Sawmill (from Lv 50:
   milestones ×1.6, plus +5 % per level above 50), so they keep up with the consumers that grow behind them. Inputs are unchanged. */
const TAR_GLUE=.65;
const YIELD_BLD={sawmill:1,peeler:1,plymill:1};
function chainYield(id){return YIELD_BLD[id]&&S.buildings[id]?sawYieldAt(S.buildings[id].lvl):1;}
function bOutMult(id){return mgrOut(id)*chainYield(id)*(typeof wsOut==='function'?wsOut(id):1);}
function chopPower(){return (1*M.chop+M.chopPct*logRate())*M.rep;}
function addRes(id,n){S.res[id]+=n;}
function earn(n){S.coins+=n;S.totalEarned+=n;S.lifetimeEarned+=n;}

/* ===================== SIMULATION ===================== */
/* v2.15.1 plank allocation. 'fair': every consumer gets the same share (old behaviour).
   'value': every consumer keeps 30 % of a fair share, the rest goes to the best earner per plank first. */
const PRI_TAKEN={};   // priority sinks (orders, daily, trade) share one budget per resource per tick
function shareValue(b,r){let v=0;for(const k in b.out) v+=b.out[k]*(RMAP[k]?RMAP[k].price:0);let c=0;for(const k in b.inp) if(k!==r) c+=b.inp[k]*(RMAP[k]?RMAP[k].price:0);return (v-c)/b.inp[r];}
function plankValue(b){return shareValue(b,'planks');}
/* v2.24: the same rule covers every shared intermediate good (planks, veneer, plywood) */
const SHARED_GOODS=['planks','veneer','plywood'];
function shareAlloc(r,active,demand,dt){
  if(!(S.prefs&&S.prefs.plankMode==='value')||!(demand[r]>S.res[r])) return null;
  const L=active.filter(([b])=>b.inp[r]).map(([b,sp])=>[b,b.inp[r]*sp*dt*bInMult(b.id),shareValue(b,r)]).sort((x,y)=>y[2]-x[2]);
  // everyone keeps 30 % of a fair share (so chair-making never stops and chained buildings keep moving), the rest goes by value
  const tot=L.reduce((t,x)=>t+x[1],0),base=S.res[r]*.3/Math.max(1e-12,tot);let left=S.res[r]*.7;const out={};
  for(const [b,need] of L){const g=Math.min(need*(1-base),left);out[b.id]=need>0?Math.min(1,base+g/need):1;left-=g;}return out;}
function plankAlloc(active,demand,dt){return shareAlloc('planks',active,demand,dt);}
function priBudget(k,share,pend){const p=(pend&&pend[k])||0,cap=.8*p;const s=Math.max(0,Math.min(share,cap-(PRI_TAKEN[k]||0)));return s;}
function priTook(k,n){PRI_TAKEN[k]=(PRI_TAKEN[k]||0)+n;}

function tick(dt,offline){
  M=computeMods();
  S.time+=dt; S.playTime+=dt; wxTick(dt,offline); fireTick(dt,offline); if(typeof mishTick==='function') mishTick(dt,offline); if(typeof staffTick==='function') staffTick(dt,offline);
  const fl={}; RES.forEach(r=>fl[r.id]={p:0,c:0,s:0});
  forestTick(dt,offline);
  {const lr=logRate()*dt,room=Math.max(0,logCap()-S.res.logs),acc=Math.min(lr,room);S.res.logs+=acc;fl.logs.p+=acc;fl.logs.w=lr-acc;   // v2.20.1 Log Yard capacity: old stock above the cap is kept
    const f=lr>1e-12?acc/lr:(S.res.logs>=logCap()-1e-9?0:1);S.yardRun=yardRun()+(f-yardRun())*Math.min(1,dt/2);if(S.yardRun>.999&&f>=1) S.yardRun=1;}
  const demand={}; RES.forEach(r=>demand[r.id]=0);
  const active=[];
  for(const b of BUILDINGS){
    const st=S.buildings[b.id];
    const brk=typeof mishPaused==='function'&&mishPaused(b.id);   // v2.26 breakdowns pause a building
    if(!st.lvl||!st.on||onFire(b.id)||brk){bstat[b.id]={f:0,lim:null,speed:st.lvl?bSpeed(b.id):0,fire:onFire(b.id),broke:brk};continue;}
    const sp=bSpeed(b.id); active.push([b,sp]); const mi=bInMult(b.id);
    for(const k in b.inp) demand[k]+=b.inp[k]*sp*dt*mi;
  }
  const frac={};
  for(const k in demand) frac[k]=demand[k]>0?Math.min(1,S.res[k]/demand[k]):1;
  const pfr={};for(const r of SHARED_GOODS) pfr[r]=shareAlloc(r,active,demand,dt);   // v2.15.1: per-building plank share (fair = proportional, value = best output per plank first)
  for(const k in PRI_TAKEN) PRI_TAKEN[k]=0;
  const pend={};
  // v2.2 storage: each building's output stockpile has a capacity; when it's full the building pauses
  const caps=stockCaps(), want={}, pre=[];
  for(const [b,sp] of active){
    let f=1,lim=null;
    for(const k in b.inp){const fk=pfr[k]?pfr[k][b.id]:frac[k];if(fk<f-1e-9){f=fk;lim=k;}}
    pre.push([b,sp,f,lim]); const mo=bOutMult(b.id); for(const k in b.out) want[k]=(want[k]||0)+b.out[k]*sp*dt*f*(k==='bark'?mo/chainYield(b.id):mo);
  }
  const ofr={}; for(const k in want){const room=Math.max(0,caps[k]-S.res[k]);ofr[k]=want[k]>room+1e-12?room/want[k]:1;}
  for(const [b,sp,f0,lim] of pre){
    let f=f0,full=null;
    for(const k in b.out) if(ofr[k]<1&&f0*ofr[k]<f-1e-12){f=f0*ofr[k];full=k;}
    const mi=bInMult(b.id), mo=bOutMult(b.id);   // v2.4 managers: lean line (less input) / lucky batch (expected extra output)
    for(const k in b.inp){const a=b.inp[k]*sp*dt*f*mi;S.res[k]=Math.max(0,S.res[k]-a);fl[k].c+=a;}
    for(const k in b.out){const a=b.out[k]*sp*dt*f*(k==='bark'?mo/chainYield(b.id):mo);pend[k]=(pend[k]||0)+a;}   // v2.24: peel yield makes more veneer, not more bark
    if(b.id==='sawmill'&&M.sawdust){pend.chips=(pend.chips||0)+2*sp*dt*f;}
    if(b.id==='kiln'&&M.tar){pend.glue=(pend.glue||0)+b.out.charcoal*sp*dt*f*mo*TAR_GLUE;}   // v2.5 pine tar glue (v2.24: .5 → .65 so late Plywood Mills aren't glue-bound)
    const o0=bstat[b.id];bstat[b.id]={f,lim:full?null:lim,speed:sp,full,fs:(o0&&isFinite(o0.fs)?o0.fs:1)+(f-(o0&&isFinite(o0.fs)?o0.fs:1))*Math.min(1,dt/6)};   // fs: smoothed (~6 s) for warnings
  }
  for(const k in pend){S.res[k]+=pend[k];fl[k].p+=pend[k];if(caps[k]<Infinity&&S.res[k]>caps[k]) S.res[k]=caps[k];}
  if(typeof powerTick==='function') powerTick(demand,dt,fl,frac);   // v2.10: the power plant takes its fuel before auto-sell
  orderCollect(demand,dt,offline,pend); dailyCollect(demand,dt,offline,pend); tradeCollect(demand,dt,pend); researchTick(dt); if(!offline&&typeof rpTick==='function'&&(S.time%5)<dt) rpTick();
  let earned=0;const sold=SOLD_TMP;for(const k in sold) sold[k]=0;
  for(const r of RES){
    if(!S.autosell[r.id]||!canSell(r.id)) continue;
    const reserve=(demand[r.id]/dt)*Math.max(BUFFER_SEC,dt*1.5);
    const sell=S.res[r.id]-reserve;
    if(sell>1e-9){S.res[r.id]-=sell;fl[r.id].s+=sell;earned+=sell*price(r.id);sold[r.id]=sell;}
  }
  if(earned>0) earn(earned);
  if(typeof shipTick==='function') shipTick(dt,sold,earned,offline);   // v2.13 shipping yard
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
/* v2.18 run cost scale: everything you rebuy each run is priced in this run's 'forest value' (set at Replant from your
   Legacy + Fertile Soil, see js/replant.js). Kept infrastructure (fire station, power plant, yards, harbour, managers) is not scaled. */
function upCost(u,L){L=L||Math.min(upMax(u),upLvl(u.id)+1);return u.cost*cs()*Math.pow(UPG_GROW,L-1);}
function treeCost(t){return t.cost*cs();}
function cs(){return (S&&S.runCS>0)?S.runCS:1;}
function bulkCost(base,scale,owned,n){base*=cs();return base*Math.pow(scale,owned)*(Math.pow(scale,n)-1)/(scale-1);}
function maxAfford(base,scale,owned){base*=cs();const c=S.coins;const n=Math.floor(Math.log(c*(scale-1)/(base*Math.pow(scale,owned))+1)/Math.log(scale));return Math.max(0,n);}
let buyMult=1;
function qty(base,scale,owned){if(buyMult==='max') return Math.max(1,maxAfford(base,scale,owned));return buyMult;}
function buyCollector(id,n){
  const c=COLLECTORS.find(x=>x.id===id);n=n||qty(c.cost,COL_SCALE,S.collectors[id]);
  const cost=colCost(id,S.collectors[id],n);
  if(S.coins+1e-9<cost) return false; S.coins-=cost; S.collectors[id]+=n; M=computeMods(); sfx('buy'); return true;
}
function buyBuilding(id,n,opt){
  if(id==='sawmill'&&sawByLogs()&&(sawLogsOk()||(opt&&opt.logsOnly))){   // v2.20.1: the first Sawmill costs logs (the game's UI only offers this path)
    if(!sawLogsOk()) return false; S.res.logs-=SAW_LOGS; S.buildings.sawmill.lvl=1; M=computeMods(); const b=BMAP.sawmill;
    toast(`${b.icon} <b>${b.name}</b> built from 🪵 ${SAW_LOGS} logs! ${recipeStr(b)} · planks sell, logs don't`); confettiBurst(); sfx('unlock'); if(typeof buildPoof==='function') buildPoof('sawmill');
    n=n||1; if(n>1&&!(opt&&opt.logsOnly)) buyBuilding('sawmill',n-1); return true;}
  const b=BMAP[id];n=n||qty(b.cost,b.scale,S.buildings[id].lvl);
  if(!bldUnlocked(id)) return false;
  // v2.22 workstation gates: purchases are clipped at the cap. opt.wsAuto (the TT test/dev API) buys the needed station levels too.
  if(typeof wsRoom==='function'&&wsHas(id)&&S.buildings[id].lvl>0){
    if(opt&&opt.wsAuto){const need=wsNeedFor(id,S.buildings[id].lvl+n);if(need.list.length){const tot=need.cost+bulkCost(b.cost,b.scale,S.buildings[id].lvl,n);if(S.coins+1e-9<tot) return false;
        for(const [k] of need.list) buyWs(id,k,true);}}
    else{const room=wsRoom(id);if(room<1) return false;n=Math.min(n,room);}}
  const cost=bulkCost(b.cost,b.scale,S.buildings[id].lvl,n);
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
  const u=UPGRADES.find(x=>x.id===id); if(!u) return false; const L=upLvl(id)+1;
  if(L>upMax(u)||!upReqOk(u,L)||S.coins+1e-9<upCost(u,L)) return false;
  S.coins-=upCost(u,L); S.upgrades[id]=L; M=computeMods(); toast(`${u.icon} <b>${u.name}</b>${upMax(u)>1?' Lv '+L:''}: ${upDesc(u,L)}`); sfx('buy'); return true;
}
function buyTree(){
  const nx=TREES[S.tree+1]; if(!nx||S.coins<treeCost(nx)) return false;
  S.coins-=treeCost(nx); S.tree++; M=computeMods(); toast(`${nx.icon} Now harvesting <b>${nx.name}</b>! All prices ×${nx.mult}`); confettiBurst(); sfx('unlock'); return true;
}
function chop(){
  const room=Math.max(0,logCap()-S.res.logs);   // v2.20.1: a full Log Yard takes no more logs (and the tree is left standing)
  const n=room>0?Math.min(chopPower()*chopForest(),room):0; S.res.logs+=n; S.clicks++; S.lifetimeClicks++; chopRateEma+=1; sfx('chop'); return n;
}
function sellAll(id){
  const n=S.res[id]; if(n<=0||!canSell(id)) return 0; const v=n*price(id); S.res[id]=0; earn(v); sfx('coin'); return v;
}
/* v2.18: seedsFor / pendingSeeds live in js/replant.js */
function doPrestige(){
  const g=pendingSeeds(); if(g<1) return false;
  const keep={seeds:S.seeds+g,prestiges:S.prestiges+1,...rpKeep(g),lifetimeEarned:S.lifetimeEarned,lifetimeClicks:S.lifetimeClicks,
    firstStart:S.firstStart,playTime:S.playTime,autosell:Object.assign({},S.autosell),muted:S.muted,prefs:Object.assign({autoFocus:true,haptics:true,fatigue:true,plankMode:'fair'},S.prefs),wx:S.wx,mgr:Object.assign({},S.mgr),station:{lvl:stationLvl()},fireStats:Object.assign({},S.fireStats),research:Object.assign({},S.research),rp:S.rp,staff:(()=>{const st=S.staff||{team:[],candidates:[],nextRefresh:40,nextReroll:0,seq:0,unpaid:false};return {team:(st.team||[]).map(w=>Object.assign({},w,{train:w.train?Object.assign({},w.train):null,traits:(w.traits||[]).slice(),energy:100})),candidates:[],nextRefresh:40,nextReroll:0,seq:st.seq||0,unpaid:false,capHi:Object.assign({},st.capHi||{}),capNoted:st.capNoted||0};})(),   // v2.22.1: hiring limits never drop
    trade:{lvl:harborLvl(),routes:Object.assign({},S.trade.routes),fleet:[],dem:S.trade.dem,spike:null,nextDrift:0,nextSpike:0,stats:Object.assign({},S.trade.stats),seq:S.trade.seq||0,repeat:S.trade.repeat},ach:Object.assign({},S.ach),golden:S.golden,
    orders:{offer:null,active:null,offers:[],acts:[],next:100,done:(S.orders&&S.orders.done)||0,failed:(S.orders&&S.orders.failed)||0,hist:((S.orders&&S.orders.hist)||[]).slice(-5)},
    daily:{day:'',offers:[],active:[],doneToday:0,streak:(S.daily&&S.daily.streak)||0,bestStreak:(S.daily&&S.daily.bestStreak)||0,total:(S.daily&&S.daily.total)||0,hist:[],failedToday:0}};
  keep.forestLife=Object.assign({},S.forestLife||{planted:0});
  keep.tierNote=S.tierNote||0;   // v2.20
  keep.mish=typeof mishKeep==='function'?mishKeep():S.mish;   // v2.26: insurance, log and stats stay; breakdowns are cleared
  keep.power={lvl:pwLvl(),on:S.power?S.power.on!==false:true,fuel:(S.power&&S.power.fuel)||'mix',logs:pwLogMode(),res:pwReserveSec(),eff:0,burn:{}};   // v2.10: the plant stays built
  keep.spec=typeof specKeep==='function'?specKeep():{}; keep.specStats=Object.assign({picks:0,switches:0},S.specStats||{});   // v2.17: picks are remembered, retooling is dropped
  keep.ship=typeof shKeep==='function'?shKeep():S.ship;   // v2.13: docks, forklifts and crane are kept through Replant
  {const B=S.builders||{};keep.builders={lvl:B.lvl||0,on:B.on!==false,plan:B.plan||'ms',budget:B.budget||.25,off:Object.assign({},B.off||{}),jobs:[],stats:Object.assign({lv:0,spent:0,jobs:0},B.stats||{}),seq:B.seq||0,cool:0};}   // v2.12: the yard stays built, jobs are dropped
  S=freshState(keep); rpStartRun(); M=computeMods();   // v2.18: Seed Shop start bonuses, fresh run goals
  RES.forEach(r=>{rates[r.id]={p:0,c:0,s:0,d:0};}); coinRate=0;
  save(); rebuildAll(); toast(`🌱 Forest replanted! <b>+${g}</b> Seeds · Legacy <b>${fmt(S.legacy)}</b> (production ×${legacyMult().toFixed(2)}) · ${fmt(S.seeds)} 🌱 to spend in the Seed Shop`,5200);
  confettiBurst(); sfx('unlock');
  return true;
}

function milestoneHit(b,ms0,ms1){
  const k=ms1-ms0, lv=MILESTONES[ms1-1], tot=Math.pow(MS_MULT,ms1);
  toast(`<span style="font-size:22px">⭐</span><span><b>${b.name} reached Lv ${lv}!</b><br>Speed ×${Math.pow(MS_MULT,k)} (now ×${tot}) · ${k>1?k+' yard workers':'a yard worker'} hired${typeof specMsNote==='function'?specMsNote(b,ms0,ms1):''}</span>`,4600,'ms-toast');
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
