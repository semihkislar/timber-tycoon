{hold:()=>{if(!bldUnlocked('lab')) return false;const B=BMAP.lab,l=S.buildings.lab.lvl;if(l>=8) return false;const x=bulkCost(B.cost,B.scale,l,1);if(x>coinRate*240) return false;if(S.coins>=x){buyBuilding('lab',1);return false;}return true;},
 gain:()=>pendingSeeds(),cur:()=>S.legacy||0,prestige:()=>doPrestige(),
 spend:()=>{for(let g=0;g<50;g++){let b=null,bc=Infinity;for(const u of SHOP){if(!shopAvail(u.id)) continue;const c=shopCost(u.id);if(c<bc){bc=c;b=u.id;}}if(!b||bc>S.seeds||!buyShop(b)) break;}},
 want:(g,c,T)=>{rpTick();
   if(bldUnlocked('lab')){const B=BMAP.lab;for(let k=0;k<3;k++){const x=bulkCost(B.cost,B.scale,S.buildings.lab.lvl,1);if(x<.3*S.coins) buyBuilding('lab',1);else break;}}
   for(let k=0;k<5;k++){let b=null,bc=Infinity;for(const n of RNODES){if(nodeAvail(n)){const x=rpCost(n);if(x<bc){bc=x;b=n.id;}}}if(!b||!doResearch(b)) break;}
   return rpAdvice().k==='now'||(T>=600&&g>=Math.max(3,c*.5));}}
