const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../shoreline.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../vessels.js'),'utf8'),ctx);
const V=ctx.RiverVessels;
function river(limit=100){return {length:10000,sample:s=>({x:0,z:-s,tx:0,tz:-1,width:limit*2,leftWidth:limit,rightWidth:limit}),project:(x,z)=>({s:-z,offset:x,width:limit*2,leftWidth:limit,rightWidth:limit}),currentAt:()=>({x:0,z:0})};}
function boat(x,z=-100,heading=-Math.PI/2,speed=20){return {x,z,heading,speed,hull:100,throttle:0};}
function sail(s,r,frames=120,input={throttle:0,rudder:0}){for(let i=0;i<frames;i++)V.stepBoat(s,input,1/60,r,[]);return s;}
// The old width-only physics ignores actual mapped land inside its corridor.
let r=river();r.hullInWater=(x,z,h,l,w)=>x+Math.abs(Math.sin(h))*l/2+Math.abs(Math.cos(h))*w/2<=0;
let s=sail(boat(-10),r);
assert(s.x<=-3.5+.001,'boat hull crossed a mapped shoreline inside the sampled corridor');
assert(s.hull<100,'a powered-speed shoreline impact should damage the hull');
// Retreat remains possible after grounding.
s.speed=-3;s.throttle=-.4;const stopped=s.x;sail(s,r,120,{throttle:-.4,rudder:0});assert(s.x<stopped-1,'boat cannot reverse away from shoreline');
// Mapped open water beyond a narrow centerline cross-section must stay navigable.
r=river(5);r.hullInWater=()=>true;s=sail(boat(15),r,20);assert(s.x>15,'invisible width boundary still blocks mapped open water');
// Heading changes may not rotate hull corners through a bank.
r=river();r.hullInWater=(x,z,h,l,w)=>x+Math.abs(Math.sin(h))*l/2+Math.abs(Math.cos(h))*w/2<=0;
s=sail(boat(-1.7,-100,0,8),r,120,{throttle:.2,rudder:1});assert(r.hullInWater(s.x,s.z,s.heading,7,3.2),'turning hull entered mapped land');
// Zero-dt calls remain harmless.
const before=JSON.stringify(s);V.stepBoat(s,{},0,r);assert.equal(s.x,JSON.parse(before).x);
// A fast parallel pass is not a fast impact: only the velocity into land
// contributes to damage. Exercise the real polygon API, including winding.
const bank=[[-1000,-10000],[0,-10000],[0,0],[-1000,0]];
for(const ring of [bank,[...bank].reverse()]){
  const shore=ctx.RiverShoreline.create([{outer:ring,holes:[]}]);
  const mapped={...river(1000),hullInWater:shore.hullInWater,shoreContact:shore.contact,currentAt:()=>({x:.2,z:0})};
  const glancing={...boat(-1.681,-1000,0,40),driftX:.2,driftZ:0};
  V.stepBoat(glancing,{throttle:0,rudder:0},1/60,mapped,[]);
  assert(glancing.grounded,'glancing case must actually touch the shoreline');
  assert.equal(glancing.hull,100,'gentle lateral current must not cause full-speed hull damage');
  assert(shore.hullInWater(glancing.x,glancing.z,glancing.heading,7,3.2),'glancing contact must remain in water');
  const headOn=sail(boat(-12,-1000,-Math.PI/2,40),mapped,60);
  assert(headOn.hull<95,'fast perpendicular shoreline impact must still damage the hull');
  assert(shore.hullInWater(headOn.x,headOn.z,headOn.heading,7,3.2),'head-on collision must remain in water');
  const contactX=headOn.x;headOn.speed=-3;headOn.throttle=-.4;sail(headOn,mapped,120,{throttle:-.4,rudder:0});
  assert(headOn.x<contactX-1,'normal-based damage must preserve reverse retreat');
}
console.log('shoreline physics: 5 baseline checks plus 12 mapped-contact checks passed');
