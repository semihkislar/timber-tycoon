{gain:()=>pendingSeeds(),cur:()=>S.legacy||0,prestige:()=>doPrestige(),
 spend:()=>{for(let g=0;g<50;g++){let b=null,bc=Infinity;for(const u of SHOP){if(!shopAvail(u.id)) continue;const c=shopCost(u.id);if(c<bc){bc=c;b=u.id;}}if(!b||bc>S.seeds||!buyShop(b)) break;}},
 want:(g,c,T)=>{rpTick();return rpAdvice().k==='now'||(T>=600&&g>=Math.max(3,c*.5));}}
