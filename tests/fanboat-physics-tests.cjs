const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('./vessels.js','utf8'),sandbox);
const {stepBoat,PLAYER_SPEC:spec}=sandbox.RiverVessels;
const knots=3600/1852,results=[];
const fresh=(extra={})=>({x:0,z:-1000,heading:0,speed:0,turnRate:0,hull:100,throttle:0,rudder:0,...extra});
const channel=(flow={x:0,z:0},leftWidth=50000,rightWidth=50000)=>({
 length:1e7,sample:s=>({x:0,z:-s,s,tx:0,tz:-1,width:leftWidth+rightWidth,leftWidth,rightWidth}),
 project:(x,z)=>({s:-z,offset:x,distance:Math.abs(x),width:leftWidth+rightWidth,leftWidth,rightWidth}),
 currentAt:()=>({...flow,speed:Math.hypot(flow.x,flow.z)})
});
function run(state,input,seconds,river=channel(),traffic=[],dt=.05){
 let maximum=0,timeTo80=null,largestStep=0;
 for(let t=0;t<seconds-1e-9;t+=dt){
  const x=Number.isFinite(state.x)?state.x:0,z=Number.isFinite(state.z)?state.z:0;stepBoat(state,input,dt,river,traffic);
  for(const key of ['x','z','heading','speed','hull','turnRate','roll','pitch','groundSpeed','engineRPM'])assert(Number.isFinite(state[key]),key+' is finite');
  const distance=Math.hypot(state.x-x,state.z-z),speed=distance/dt;
  assert(speed<=spec.maxSpeedMps+1e-7,'actual frame ground displacement respects 80 kn cap');
  assert(state.groundSpeed<=spec.maxSpeedMps+1e-7,'reported ground speed respects 80 kn cap');
  maximum=Math.max(maximum,speed);largestStep=Math.max(largestStep,distance);
  if(timeTo80===null&&speed*knots>=79.99)timeTo80=t+dt;
 }
 return {state,maximumKnots:maximum*knots,timeTo80,largestStep};
}
function test(name,fn){const details=fn();results.push({name,...details});}
test('Published fanboat dimensions and exact speed / RPM limits',()=>{
 assert.equal(spec.length,7);assert.equal(spec.width,3.2);assert.equal(spec.maxSpeedMps,80*1852/3600);
 assert.equal(spec.maxReverseSpeedMps,12*1852/3600);assert.equal(spec.idleRPM,12000);assert.equal(spec.maxRPM,55000);
});
test('Still-water full power reaches exact 80 kn in 10–20 seconds',()=>{
 const result=run(fresh(),{throttle:1},30);
 assert(result.timeTo80>=10&&result.timeTo80<=20,'acceleration time '+result.timeTo80);
 assert(Math.abs(result.state.groundSpeed*knots-80)<1e-5);assert.equal(result.state.hull,100);
 return {timeTo80:Number(result.timeTo80.toFixed(2)),maximumKnots:result.maximumKnots};
});
test('Current and all eight headings preserve 80 kn ground cap and top-speed reachability',()=>{
 const measured=[];
 for(const flow of [{x:0,z:-3},{x:3,z:0},{x:-2,z:1}])for(let n=0;n<8;n++){
  const result=run(fresh({heading:n*Math.PI/4}),{throttle:1},35,channel(flow));
  assert(result.state.groundSpeed*knots>=79.99,'terminal speed '+result.state.groundSpeed*knots);
  measured.push(result.maximumKnots);
 }
 return {cases:measured.length,maximumKnots:Math.max(...measured)};
});
test('All three power stages produce distinct usable speeds',()=>{
 const speeds=[.25,.55,1].map(throttle=>run(fresh(),{throttle},100).state.groundSpeed*knots);
 assert(speeds[0]>20&&speeds[0]<speeds[1]);assert(speeds[1]<speeds[2]-5);assert(Math.abs(speeds[2]-80)<1e-5);
 return {stageSpeedsKnots:speeds.map(v=>Number(v.toFixed(2)))};
});
test('Reverse has inertia and 12 kn ground-speed limit including current',()=>{
 const measured=[];
 for(const flow of [{x:0,z:0},{x:0,z:-3},{x:3,z:0}])for(let n=0;n<4;n++){
  const state=run(fresh({heading:n*Math.PI/2}),{throttle:-.4},25,channel(flow)).state;
  assert(state.speed<0);assert(state.groundSpeed<=spec.maxReverseSpeedMps+1e-7);assert(state.groundSpeed*knots>11.9);
  measured.push(state.groundSpeed*knots);
 }
 const state=run(fresh(),{throttle:1},25).state;
 stepBoat(state,{throttle:-.4},.05,channel(),[]);assert(state.speed>35,'reverse command does not instantly reverse motion');
 run(state,{throttle:-.4},25);assert(state.speed<0);assert(state.groundSpeed<=spec.maxReverseSpeedMps+1e-7);
 return {cases:measured.length,maximumReverseKnots:Math.max(...measured)};
});
test('Brake stops from 80 kn and idle only drifts with current',()=>{
 const state=run(fresh(),{throttle:1},25).state;
 run(state,{throttle:0,brake:true},12);assert(Math.abs(state.speed)<.05,'brake speed '+state.speed);
 const idle=run(fresh(),{throttle:0},10,channel({x:0,z:-1.25})).state;
 assert.equal(idle.speed,0);assert.equal(idle.throttle,0);assert.equal(idle.engineRPM,12000);assert(Math.abs(idle.z+1012.5)<1e-7);
 return {stoppedSpeed:state.speed,idleCurrentKnots:idle.groundSpeed*knots};
});
test('High-speed turns remain finite, bounded and responsive in both directions',()=>{
 const endpoints=[];
 for(const rudder of [-1,1]){
  const state=run(fresh(),{throttle:1},25).state;
  const result=run(state,{throttle:1,rudder},20,channel({x:1,z:-1.5}));
  assert(Math.abs(state.roll)<=.105+1e-6);assert(Math.abs(state.turnRate)<.25);assert(Math.abs(state.x)>100);assert(state.groundSpeed*knots>50);
  assert.equal(Math.sign(state.x),rudder);endpoints.push({rudder,heading:state.heading,speedKnots:state.groundSpeed*knots});
 }
 return {endpoints};
});
test('Maximum frame delta uses substeps and cannot tunnel through a thin pier',()=>{
 const state=fresh({speed:spec.maxSpeedMps,throttle:1});
 const obstacle={x:0,z:-1006,heading:0,speed:0,length:.15,width:2};
 const before={x:state.x,z:state.z};stepBoat(state,{throttle:1},.08,channel(),[obstacle]);
 const impactSubsteps=state.physicsSubsteps;
 assert(impactSubsteps>=6);assert(state.collision,'thin pier detected');assert(state.hull<100);assert(state.z>-1002.5,'bow stays upstream of pier');
 assert(Math.hypot(state.x-before.x,state.z-before.z)<=spec.maxSpeedMps*.08+1e-7);assert(state.speed<5);
 const hull=state.hull;stepBoat(state,{throttle:1},.08,channel(),[obstacle]);assert.equal(state.hull,hull,'damage cooldown');
 return {impactSubsteps,hull:state.hull,z:state.z};
});
test('Diagonal near misses clear pier corners while actual rotated hull contact still collides',()=>{
 const heading=Math.PI/4,extent=(spec.length+spec.width)/2/Math.sqrt(2);
 for(const dimensions of [{length:36,width:10},{length:.15,width:2}]){
  const body={x:0,z:-1000,heading:0,speed:0,...dimensions};
  const state=fresh({x:body.width/2+extent-.1,z:body.z+body.length/2+extent-.1,heading,speed:10});
  // This diagonal has over 1 m separation along the player's forward axis.
  stepBoat(state,{throttle:0},1/60,channel(),[body]);
  assert(!state.collision,'Clear diagonal corner must not collide');assert.equal(state.hull,100);
 }
 const body={x:0,z:-1000,heading:Math.PI/4,speed:0,length:36,width:10};
 const state=fresh({x:6,z:-994,heading:Math.PI/4,speed:10});
 stepBoat(state,{throttle:0},1/60,channel(),[body]);assert(state.collision,'Actual rotated intersection must still collide');
});
test('Actual asymmetric banks contain the compact hull at high speed and allow reverse recovery',()=>{
 const river=channel({x:0,z:-1.2},350,45),state=fresh({x:40,heading:-Math.PI/2,speed:spec.maxSpeedMps,throttle:1});
 run(state,{throttle:1},1,river);
 assert(state.x<=45-spec.length/2-.35+1e-6,'right bank and bow length applied');assert(state.grounded);assert(state.hull<100);
 const groundedX=state.x;run(state,{throttle:-.4},8,river);assert(state.x<groundedX-5,'reverse leaves bank');
 return {groundedX,recoveredX:state.x,hull:state.hull};
});
test('Large / invalid deltas and malformed state cannot create a teleport or nonfinite values',()=>{
 const state=fresh({speed:spec.maxSpeedMps,throttle:1});const z=state.z;stepBoat(state,{throttle:1},20,channel(),[]);
 assert(Math.abs(state.z-z)<=spec.maxSpeedMps*.08+1e-7);const unchanged=JSON.stringify(state);stepBoat(state,{throttle:1},-1,channel(),[]);assert.equal(JSON.stringify(state),unchanged);
 const bad={x:NaN,z:NaN,heading:NaN,speed:Infinity,hull:NaN};run(bad,{throttle:NaN,rudder:Infinity},.1);
 const wreck=run(fresh({hull:0}),{throttle:1},5).state;assert.equal(wreck.speed,0);assert.equal(wreck.throttle,0);
});
console.log(JSON.stringify({passed:results.length,results},null,2));
