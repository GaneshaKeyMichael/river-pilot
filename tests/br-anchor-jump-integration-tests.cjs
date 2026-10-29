'use strict';
// Independent behavioral checks: compare production movement with SI mechanics,
// not with copied physics code. This harness owns no production implementation.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('./vessels.js','utf8'),ctx,{filename:'vessels.js',displayErrors:false});
const V=ctx.RiverVessels,G=9.81,KNOT=1852/3600,results=[];
assert.equal(typeof V.toggleAnchor,'function','Anchor API is installed');
const fresh=(extra={})=>({x:0,z:-950,heading:0,speed:0,turnRate:0,lateralSpeed:0,driftX:0,driftZ:0,hull:100,throttle:0,rudder:0,y:0,vy:0,airborne:false,onRamp:false,anchorState:'up',...extra});
const channel=(flow={x:0,z:0},ramps=[])=>({
  length:1e7,ramps,isWater:()=>true,
  sample:s=>({x:0,z:-s,s,tx:0,tz:-1,width:100000,leftWidth:50000,rightWidth:50000}),
  project:(x,z)=>({s:-z,offset:x,distance:Math.abs(x),width:100000,leftWidth:50000,rightWidth:50000}),
  currentAt:()=>({...flow,speed:Math.hypot(flow.x,flow.z)})
});
const ramp={id:'independent-test-ramp',x:0,z:-1000,heading:0,length:32,width:14,height:4,entryHeight:-.28,lipHeight:4,slope:4.28/32};
function step(state,input,dt,river){V.stepBoat(state,input,dt,river,[]);for(const key of ['x','z','speed','hull','y','vy'])assert(Number.isFinite(state[key]),key+' remains finite');}
function advance(state,seconds,{input={},dt=1/60,river=channel()}={}){for(let t=0;t<seconds-1e-10;){const h=Math.min(dt,seconds-t);step(state,input,h,river);t+=h;}return state;}
function test(name,fn){try{const details=fn()||{};results.push({name,passed:true,...details});}catch(error){results.push({name,passed:false,error:error.message});}}
function near(a,b,tolerance,label){assert(Math.abs(a-b)<=tolerance,`${label}: got ${a}, expected ${b}, tolerance ${tolerance}`);}
function launch(dt=1/60,speed=30){const state=fresh({speed,z:-960}),river=channel({x:0,z:0},[ramp]);for(let t=0;t<8;t+=dt){step(state,{},dt,river);if(state.airborne)return {state,river};}throw new Error('Forward ramp traversal did not launch');}

test('Anchor deploys, settles and holds a changing current without propulsion',()=>{
  const river=channel({x:.7,z:-1.1}),state=fresh({driftX:.7,driftZ:-1.1,groundSpeed:Math.hypot(.7,1.1)}),reply=V.toggleAnchor(state,river);
  assert(reply.ok);assert.equal(reply.action,'setting');assert.equal(state.anchorState,'setting');
  advance(state,3,{river});assert.equal(state.anchorState,'down');const hold={x:state.x,z:state.z};
  advance(state,20,{river:channel({x:-2.1,z:3.2})});near(state.x,hold.x,.02,'Anchor x hold');near(state.z,hold.z,.02,'Anchor z hold');near(state.groundSpeed,0,.01,'Anchored groundspeed');assert.equal(state.hull,100);
  const release=V.toggleAnchor(state,river);assert(release.ok);assert.equal(release.action,'raised');assert.equal(state.anchorState,'up');
  advance(state,5,{river});assert(Math.hypot(state.x-hold.x,state.z-hold.z)>3,'Raising anchor resumes current drift');
  return {settledAt:hold,releasedDriftM:Math.hypot(state.x-hold.x,state.z-hold.z)};
});
test('Anchor rejects fast, airborne and ramp-supported deployment',()=>{
  for(const state of[fresh({speed:10,groundSpeed:10}),fresh({airborne:true,y:2,vy:1}),fresh({onRamp:true,y:1,rampId:ramp.id})]){
    const reply=V.toggleAnchor(state,channel());assert(!reply.ok);assert.equal(reply.action,'rejected');assert.equal(state.anchorState,'up');
  }
});
test('Anchor deployment boundary uses ground velocity including current',()=>{
  for(const factor of [.98,1.02]){const speed=4*KNOT*factor,river=channel({x:0,z:-speed}),state=fresh({driftZ:-speed,groundSpeed:speed});const reply=V.toggleAnchor(state,river);assert.equal(reply.ok,factor<1,`Current speed ${speed/KNOT} knots`);}
});
test('Free flight obeys SI gravity, keeps horizontal momentum and has no water wake',()=>{
  const initial=fresh({x:12,z:-1000,y:6,vy:10,airborne:true,airVX:8,airVZ:-23,speed:Math.hypot(8,23),heading:.3});
  const passive={...initial},powered={...initial};
  advance(passive,.8,{dt:1/60,river:channel({x:3,z:2})});advance(powered,.8,{input:{throttle:1,rudder:1,brake:true},dt:1/60,river:channel({x:-4,z:1})});
  const expectedY=initial.y+initial.vy*.8-.5*G*.8*.8;
  near(passive.y,expectedY,.02,'Airborne height');near(passive.vy,initial.vy-G*.8,.02,'Vertical velocity');
  near(passive.x,initial.x+8*.8,.02,'Horizontal x');near(passive.z,initial.z-23*.8,.02,'Horizontal z');
  near(powered.x,passive.x,.02,'Air input does not steer velocity x');near(powered.z,passive.z,.02,'Air input does not steer velocity z');near(powered.y,passive.y,.02,'Power cannot hover');
  near(powered.heading,initial.heading,1e-10,'Rudder cannot steer the boat in midair');
  near(powered.wakeStrength||0,0,1e-9,'No airborne water wake');assert(powered.airborne);
});
test('Analytic landing time and impact speed hold across frame sizes',()=>{
  const y0=4,vy0=8,vx=6,vz=-25,expectedT=(vy0+Math.sqrt(vy0*vy0+2*G*y0))/G,expectedImpact=-Math.sqrt(vy0*vy0+2*G*y0),cases=[];
  for(const dt of[1/120,1/60,1/30,.08]){const state=fresh({y:y0,vy:vy0,airborne:true,airVX:vx,airVZ:vz,speed:Math.hypot(vx,vz)});let elapsed=0;
    while(state.airborne&&elapsed<5){step(state,{throttle:0},dt,channel());elapsed+=dt;}
    assert(!state.airborne,'Must land, never hover');assert(elapsed>=expectedT-1e-7&&elapsed<expectedT+dt+1e-7,'Landing frame brackets analytic impact');
    assert(state.lastLanding,'Landing evidence exists');near(state.lastLanding.impactVy,expectedImpact,.08,'Impact velocity');near(state.lastLanding.x,vx*expectedT,.15,'Landing x range');near(state.lastLanding.z,-950+vz*expectedT,.15,'Landing z range');
    assert(state.groundSpeed<Math.hypot(vx,vz),'Landing dissipates forward speed');assert.equal(state.hull,100,'Aligned landing below the rough-impact threshold is repeatable');assert(state.y>=-.01&&state.y<.2,'Returned to water surface');
    cases.push({dt,elapsed,impactVy:state.lastLanding.impactVy,hull:state.hull});
  }
  return {expectedFlightTime:expectedT,expectedImpactVy:expectedImpact,cases};
});
test('A deliberately severe landing damages the hull and removes forward energy',()=>{
  const state=fresh({y:12,vy:10,airborne:true,airVX:0,airVZ:-25,speed:25});
  for(let t=0;state.airborne&&t<6;t+=.025)step(state,{},.025,channel());
  assert(!state.airborne);assert(state.lastLanding.impactVy < -13);assert(state.hull<100&&state.hull>0);assert(state.lastLanding.speedAfter<state.lastLanding.speedBefore);
  return {impactVy:state.lastLanding.impactVy,hull:state.hull,speedAfter:state.lastLanding.speedAfter};
});
test('Forward ramp launch redirects kinetic energy instead of adding a boost',()=>{
  const {state}=launch();assert(state.lastTakeoff);const takeoff=state.lastTakeoff;
  assert(takeoff.y>=ramp.height-.1&&takeoff.y<ramp.height+.2,'Takeoff occurs at the physical lip');assert(takeoff.vy>0,'Ramp produces positive vertical velocity');
  const horizontal=Math.hypot(takeoff.vx,takeoff.vz),slope=takeoff.vy/horizontal;
  near(slope,ramp.slope,.02,'Launch direction follows deck slope');
  const takeoffEnergy=.5*(horizontal*horizontal+takeoff.vy*takeoff.vy)+G*takeoff.y;
  assert(takeoffEnergy<=.5*30*30+1,'Unpowered ramp cannot add mechanical energy');
  return {takeoff,takeoffEnergy,initialEnergy:.5*30*30};
});
test('A complete ramp jump duration and range agree with its measured takeoff',()=>{
  const {state,river}=launch(.025),t=state.lastTakeoff,expectedT=(t.vy+Math.sqrt(t.vy*t.vy+2*G*t.y))/G;
  for(let elapsed=0;state.airborne&&elapsed<8;elapsed+=.025)step(state,{},.025,river);
  assert(!state.airborne);assert(state.lastJump);near(state.lastJump.flightTime,expectedT,.035,'Measured jump flight time');
  const expectedDistance=Math.hypot(t.vx,t.vz)*expectedT;near(state.lastJump.distance,expectedDistance,.5,'Jump horizontal range');
  return {expectedFlightTime:expectedT,reportedFlightTime:state.lastJump.flightTime,expectedDistance,reportedDistance:state.lastJump.distance};
});
test('Backside and off-edge approaches cannot receive a forward ramp boost',()=>{
  const cases=[fresh({z:-1045,heading:Math.PI,speed:20}),fresh({x:ramp.width*.5+V.PLAYER_SPEC.width,z:-960,speed:25})],river=channel({x:0,z:0},[ramp]);
  for(const state of cases){advance(state,4,{river});assert(!state.lastTakeoff||state.lastTakeoff.vy<=0,'No positive launch from backside or outside deck');}
});
test('An underpowered climb stalls and rolls back into water instead of hovering on the ramp',()=>{
  const state=fresh({z:-980,speed:5}),river=channel({x:0,z:0},[ramp]);let climbed=false;
  for(let t=0;t<18;t+=.025){step(state,{},.025,river);climbed=climbed||state.onRamp;}
  assert(climbed,'Fixture climbed onto the ramp');assert(!state.onRamp&&!state.airborne);assert(!state.lastTakeoff);assert(state.z>-984,'Rolled out of the entry');assert(state.y===0);
});
test('Side and partially overlapping edge contacts block the ramp rather than launching',()=>{
  const river=channel({x:0,z:0},[ramp]),cases=[fresh({x:-30,z:-1000,heading:-Math.PI/2,speed:15}),fresh({x:6.4,z:-960,speed:25})];
  for(const state of cases){advance(state,4,{river});assert(!state.lastTakeoff,'Only a clear forward approach launches');assert(state.hull<100,'Solid side/edge contact has a consequence');}
});


console.log(JSON.stringify({passed:results.every(r=>r.passed),tests:results},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
