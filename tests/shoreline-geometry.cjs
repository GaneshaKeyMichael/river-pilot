const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx={console};vm.createContext(ctx);for(const file of ['geodata.js','shoreline.js','river.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
const water=ctx.RiverShoreline.create([{outer:[[-20,-20],[20,-20],[20,20],[-20,20],[-20,-20]],holes:[[[-.2,-.2],[.2,-.2],[.2,.2],[-.2,.2],[-.2,-.2]]]}]);
assert(!water.contains(0,0));assert(water.contains(5,0));assert(!water.hullInWater(0,1,0,7,3.2),'tiny island entirely inside the hull must collide');
assert(!water.hullInWater(19,0,0,7,3.2));assert(water.hullInWater(10,0,0,7,3.2));assert.equal(water.distance(19,0),1);
function inside(x,z,r){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i][1]>z)!==(r[j][1]>z)&&x<(r[j][0]-r[i][0])*(z-r[i][1])/(r[j][1]-r[i][1])+r[i][0])hit=!hit;return hit;}
const G=ctx.BR_GEO;let seed=6519;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let count=0;
for(let i=0;i<10000;i++){const x=G.bounds.minX+random()*(G.bounds.maxX-G.bounds.minX),z=G.bounds.minZ+random()*(G.bounds.maxZ-G.bounds.minZ);const expected=G.waterPolygons.some(p=>inside(x,z,p.outer)&&!p.holes.some(h=>inside(x,z,h)));assert.equal(ctx.RIVER_SHORE.contains(x,z),expected);count++;}
// Confirm the index has not moved or simplified the source geometries.
console.log(`shoreline geometry: ${count} mapped points plus 6 island/bank checks passed; ${ctx.RIVER_SHORE.segmentCount} source edges`);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../vessels.js'),'utf8'),ctx);
let routeSamples=0,impacts=0;
for(let s=100;s<ctx.RIVER.length-100;s+=25){const p=ctx.RIVER.sample(s),h=Math.atan2(-p.tx,-p.tz);assert(ctx.RIVER_SHORE.hullInWater(p.x-p.tz*75,p.z+p.tx*75,h,7,3.2),`mapped route obstructed at ${s}`);routeSamples++;}
for(let s=3000;s<ctx.RIVER.length-3000;s+=6000)for(const side of [-1,1]){
 const p=ctx.RIVER.sample(s),nx=-p.tz*side,nz=p.tx*side,h=Math.atan2(-nx,-nz);let offset=(side<0?p.leftWidth:p.rightWidth)-12;
 while(offset>0&&!ctx.RIVER_SHORE.hullInWater(p.x+nx*offset,p.z+nz*offset,h,7,3.2))offset-=5;
 const boat={x:p.x+nx*offset,z:p.z+nz*offset,heading:h,speed:40,hull:100,throttle:1};let contact=false;
 for(let i=0;i<240;i++){ctx.RiverVessels.stepBoat(boat,{throttle:1},1/60,ctx.RIVER,[]);assert(ctx.RIVER_SHORE.hullInWater(boat.x,boat.z,boat.heading,7,3.2),`hull crosses real bank at route ${s}`);contact=contact||boat.grounded;}
 assert(contact,'real-bank approach should produce contact');impacts++;
}
console.log(`mapped river navigation: ${routeSamples} route samples and ${impacts} fast bank approaches passed`);
