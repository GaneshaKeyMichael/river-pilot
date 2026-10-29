'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../three.min.js'),source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
// Run the production camera function with real Three.js vectors/camera. Terrain
// fixtures describe independent ground surfaces; no camera implementation is copied.
const cameraSource=source.slice(source.indexOf('function isPaused('),source.indexOf('function gameStep('));
function fixture(overrides={}){
  const context={THREE,state:{x:0,y:0,z:0,heading:0,pitch:0},mode:'free',simTime:0,cameraMode:0,orbitYaw:0,orbitPitch:0,zoom:1,landmarkView:null,player:{userData:{helm:{x:0,y:2.5,z:1}}},world:{terrainAt:()=>null},camera:new THREE.PerspectiveCamera(57,1,.2,32000),desiredCamera:new THREE.Vector3(),lookTarget:new THREE.Vector3(),camTarget:new THREE.Vector3(),...overrides};
  vm.createContext(context);vm.runInContext(cameraSource,context);return context;
}
const results=[];
function test(name,fn){try{fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}}
function near(actual,expected){assert(Math.abs(actual-expected)<1e-8,`${actual} differs from ${expected}`);}
function finite(position){assert([position.x,position.y,position.z].every(Number.isFinite));}

test('Chase view clears a measured bank while the vessel remains untouched',()=>{
  // Measured from the rendered terrain at HEAD 5d0063b; the independent map audit
  // confirmed this boat's entire 7 x 3.2 m hull is inside the river polygon.
  const ground=11.375464281968823,context=fixture({state:{x:-9125.265409679618,y:0,z:-22433.884401387095,heading:2.12846539321965,pitch:0},world:{terrainAt:(x,z)=>Math.hypot(x+9111.68955419223,z+22442.35175916775)<.01?ground:null}});
  const before=JSON.stringify(context.state);context.updateCamera(1,true);
  assert(context.camera.position.y>=ground+.25,'camera is inside the measured shoreline bank');
  assert.equal(JSON.stringify(context.state),before,'camera correction changed vessel state');finite(context.camera.position);
});
test('Interpolation cannot cross through a ridge between clear camera endpoints',()=>{
  const context=fixture({state:{x:16,y:0,z:0,heading:0},world:{terrainAt:x=>Math.abs(x)<2?12:null}});
  context.camera.position.set(-16,6.2,16);context.updateCamera(Math.log(2)/8);
  near(context.camera.position.x,0);assert(context.camera.position.y>=12.25,'smoothed camera crossed through the intermediate ridge');
});
test('Camera starts rising smoothly toward a bank before reaching it',()=>{
  const context=fixture({world:{terrainAt:(x,z)=>z>15?12:null}});context.camera.position.set(0,6.2,0);context.updateCamera(Math.log(2)/8);
  near(context.camera.position.z,8);assert(context.camera.position.y>6.2,'camera waits for penetration instead of smoothing toward a clear target');
});
test('Open-water chase position and camera target stay unchanged',()=>{
  const context=fixture();context.updateCamera(1,true);assert.deepEqual(context.camera.position.toArray(),[0,6.2,16]);assert.deepEqual(context.camTarget.toArray(),[0,1.1,-3.5]);
});
test('Unsupported and invalid terrain samples do not introduce non-finite camera values',()=>{
  for(const height of [null,undefined,NaN,Infinity,-Infinity]){const context=fixture({world:{terrainAt:()=>height}});context.updateCamera(1,true);finite(context.camera.position);near(context.camera.position.y,6.2);}
  const context=fixture({world:{}});context.updateCamera(1,true);finite(context.camera.position);near(context.camera.position.y,6.2);
});
test('Airborne chase height and overhead view remain above lower terrain',()=>{
  const airborne=fixture({state:{x:0,y:20,z:0,heading:0},world:{terrainAt:()=>5}});airborne.updateCamera(1,true);near(airborne.camera.position.y,26.2);
  const overhead=fixture({cameraMode:2,world:{terrainAt:()=>12}});overhead.updateCamera(1,true);assert.deepEqual(overhead.camera.position.toArray(),[0,85,110]);
});
test('Clear-water helm pose and snap behavior remain unchanged',()=>{
  const context=fixture({cameraMode:1,state:{x:0,y:4,z:0,heading:0,pitch:0}});context.camera.position.set(100,100,100);context.updateCamera(.001);assert.deepEqual(context.camera.position.toArray(),[0,6.5,1]);
});
test('Terrain guard does not detach the helm camera from the vessel',()=>{
  const context=fixture({cameraMode:1,world:{terrainAt:()=>20}});context.updateCamera(1,true);assert.deepEqual(context.camera.position.toArray(),[0,2.5,1]);
});
test('Zero elapsed time still clears an already obstructed external camera',()=>{
  const context=fixture({world:{terrainAt:()=>12}});context.camera.position.set(4,2,6);context.updateCamera(0);near(context.camera.position.x,4);near(context.camera.position.z,6);assert(context.camera.position.y>=12.25);
});
test('Landmark lens and water viewpoint remain unchanged',()=>{
  const context=fixture({landmarkView:{lookAt:{x:100,y:7,z:0},cameraHeight:14,cameraFov:57},zoom:2});context.updateCamera(1,true);assert.deepEqual(context.camera.position.toArray(),[-22,14,0]);near(context.camera.fov,28.5);
});
test('Intro and landmark overrides remain external cameras even after helm selection',()=>{
  const intro=fixture({mode:'intro',cameraMode:1,world:{terrainAt:()=>20}});intro.updateCamera(1,true);assert(intro.camera.position.y>=20.25);
  const landmark=fixture({cameraMode:1,landmarkView:{lookAt:{x:100,y:7,z:0},cameraHeight:14},world:{terrainAt:()=>20}});landmark.updateCamera(1,true);assert(landmark.camera.position.y>=20.25);
});
console.log(JSON.stringify({suite:'camera terrain clearance',passed:results.filter(r=>r.passed).length,total:results.length,results},null,2));
if(results.some(r=>!r.passed))throw Error('Camera terrain regression failed');
