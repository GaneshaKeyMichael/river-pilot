const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={console};vm.createContext(ctx);
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
console.log('shoreline physics: 5 checks passed');
