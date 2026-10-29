(() => {
'use strict';
const $=id=>document.getElementById(id);
const TAU=Math.PI*2,DEG=180/Math.PI;
const BOAT=RiverVessels.PLAYER_SPEC,HALF_LENGTH=BOAT.length*.5,HALF_WIDTH=BOAT.width*.5,KNOTS_PER_MPS=3600/1852;
let renderer,scene,camera,world,player,traffic,collisionBodies,river,state;
let mode='intro',paused=false,weather='golden',quality='high',cameraMode=0,throttle=0,gear=1,effectiveGear=1,simTime=0,voyageTime=0,checkpoint=0,lastHud=0,toastUntil=0;
let orbitYaw=.28,orbitPitch=0,zoom=1,dragging=false,lastPointer=null,frameCount=0,fpsFrames=0,fpsStart=performance.now();
const keys=new Set(),touch=new Set(),camNames=['Chase view','Helm view','Aerial view'];
let gates=[],currentKnots=2.4,audio=null,audioEnabled=false,mapOverview=false,locationStops=[],landmarkView=null;
let ramps=[],rampGroup=null,rampsEnabled=true,anchorLine;
const vec=new THREE.Vector3(),camTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),lookTarget=new THREE.Vector3();
const temporary=new THREE.Vector3();
const clock=new THREE.Clock();
const wakeCount=700,wakeData=[],wakePositions=new Float32Array(wakeCount*3),wakeColors=new Float32Array(wakeCount*3);
let wakeMesh,wakeCursor=0,wakeSpawn=0,rainMesh,rainPositions,checkpointGroup,lastWakeX,lastWakeZ;
function notify(text,seconds=4){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function fail(error){console.error(error);$('loading').hidden=true;$('error').hidden=false;const graphics=/WebGL|context|renderer/i.test(error?.message||'');$('error').querySelector('h2').textContent=graphics?'Your river needs a graphics connection.':'The river could not finish loading.';$('error-detail').textContent=graphics?'Enable hardware acceleration in your browser, then reload to sail.':'A scenery file could not load. Reload the page, or use the complete downloaded game.';}
function startPosition(s=RIVER.startS){const p=RIVER.sample(s);return {x:p.x-p.tz*75,z:p.z+p.tx*75,heading:Math.atan2(-p.tx,-p.tz),speed:0,turnRate:0,hull:100,throttle:0,rudder:0,grounded:false,s,y:0,vy:0,airborne:false,onRamp:false,anchorState:'up',airTime:0,flightMaxHeight:0,lastJump:null};}
function pointClearForView(x,z,heading){
  const p=RIVER.project(x,z),left=p.leftWidth||p.width*.5,right=p.rightWidth||p.width*.5;
  if(p.s<8||p.s>RIVER.length-8||p.offset< -left+28||p.offset>right-28)return false;
  const fx=-Math.sin(heading),fz=-Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading);
  for(const along of[-18,0,18])for(const across of[-14,0,14])if(!BRScene.isWater(x+fx*along+rx*across,z+fz*along+rz*across))return false;
  for(const body of [...(collisionBodies||[]),...(river?.ramps||[])]){
    const angle=body.heading||0,dx=x-body.x,dz=z-body.z,forward=dx*(-Math.sin(angle))+dz*(-Math.cos(angle)),side=dx*Math.cos(angle)-dz*Math.sin(angle);
    const alignment=Math.abs(Math.cos(heading-angle)),crossing=Math.abs(Math.sin(heading-angle));
    if(Math.abs(forward)<(body.length||0)*.5+HALF_LENGTH*alignment+HALF_WIDTH*crossing+25&&Math.abs(side)<(body.width||0)*.5+HALF_WIDTH*alignment+HALF_LENGTH*crossing+25)return false;
  }
  return true;
}
function landmarkDestination(stop){
  const candidates=[];
  const minS=Number.isFinite(stop.minS)?stop.minS:0,maxS=Number.isFinite(stop.maxS)?stop.maxS:RIVER.length;
  if(stop.viewPosition)candidates.push({x:stop.viewPosition.x,z:stop.viewPosition.z});
  if(stop.lookAt&&stop.viewDistance){
    const target=stop.lookAt,q=RIVER.project(target.x,target.z),center=RIVER.sample(q.s),length=Math.hypot(center.x-target.x,center.z-target.z)||1,dx=(center.x-target.x)/length,dz=(center.z-target.z)/length;
    const distances=[stop.viewDistance,220,160,260];
    // Inland landmarks need a shoreline-side water viewpoint. Short fixed
    // offsets can all land on shore and otherwise fall back to mid-channel.
    for(let distance=300;distance<length;distance+=60)distances.push(distance);
    for(const distance of distances)for(const shift of[0,-60,60])candidates.push({x:target.x+dx*distance+center.tx*shift,z:target.z+dz*distance+center.tz*shift});
  }
  for(const shift of[0,-80,80,-160,160,-300,300])for(const offset of[75,0,-75]){const p=RIVER.sample(Math.max(30,Math.min(RIVER.length-30,stop.s+shift)));candidates.push({x:p.x-p.tz*offset,z:p.z+p.tx*offset});}
  for(const point of candidates){const projection=RIVER.project(point.x,point.z);if(projection.s<minS||projection.s>maxS)continue;const p=RIVER.sample(projection.s),direction=Number.isFinite(stop.heading)?stop.heading:Math.atan2(-p.tx,-p.tz);if(pointClearForView(point.x,point.z,direction))return {...startPosition(projection.s),x:point.x,z:point.z,heading:direction};}
  return null;
}
function syncRampLocation(){
  const selected=$('jump').value===''?null:locationStops[Number($('jump').value)]?.name;
  locationStops=locationStops.filter(s=>!s.practice);
  const practice=rampsEnabled?RiverRamps.practiceView(ramps):null;
  if(practice)locationStops.push({name:'Jump ramps · practice approach',s:practice.s,heading:practice.heading,viewPosition:practice.position,practice:true});
  locationStops.sort((a,b)=>a.s-b.s);
  $('jump').innerHTML='<option value="">Choose a location…</option>'+locationStops.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');
  const index=locationStops.findIndex(s=>s.name===selected);$('jump').value=index<0?'':String(index);
}
function rebuildRamps(newLayout=false){
  if(state.airborne||state.onRamp){$('ramps-enabled').checked=rampsEnabled;notify('Land in the water before changing the ramps.');return;}
  rampsEnabled=$('ramps-enabled').checked;
  if(newLayout||!ramps.length){const obstacles=[...(world.obstacles||[])];if(mode!=='intro')obstacles.push({x:state.x,z:state.z,width:30,length:30,heading:state.heading});ramps=RiverRamps.generate(river,{isWater:BRScene.isWater,obstacles,seed:Math.floor(Math.random()*4294967296)});}
  rampGroup?.userData.dispose();rampGroup=rampsEnabled?RiverRamps.create(scene,ramps):null;river.ramps=rampsEnabled?ramps:[];
  if(locationStops.length)syncRampLocation();
  if(newLayout)notify(`${ramps.length} new ramps placed. Choose the practice approach to try one.`,6);
}
function toggleAnchor(){
  if(mode==='intro'||isPaused())return;
  const result=RiverVessels.toggleAnchor(state,river);
  if(!result.ok){notify(result.reason||'Slow below 4 knots in the water before dropping anchor.',5);return;}
  clearLandmarkView();throttle=0;RiverControls.clear(keys,touch);
  notify(result.action==='raised'?'Anchor raised. Space applies throttle.':'Anchor dropping. H raises it again.',4);updateHud();renderer.domElement.focus();
}
function clearLandmarkView(){if(!landmarkView)return;landmarkView=null;orbitYaw=0;orbitPitch=0;zoom=1;$('camera').innerHTML=`${camNames[cameraMode]} <span>↗</span>`;}
function buildGates(){
  const start=RIVER.startS,end=RIVER.finishS;
  const bridges=[...RIVER.bridges].sort((a,b)=>a.s-b.s);
  gates=[{s:start+1000,title:'Enter the upstream reach',detail:'Follow the mapped river. Space accelerates; ↑ shifts up.',name:'UPSTREAM REACH'},
    ...bridges.map(b=>({s:b.s+150,title:/190/.test(b.name)?'Clear the old bridge':'Clear the I-10 bridge',detail:'Pass through the channel, keeping clear of traffic and bridge piers.',name:/190/.test(b.name)?'US 190 · HUEY P. LONG':'I-10 · HORACE WILKINSON'})),
    {s:end-30,title:'Reach the southern boundary',detail:'Arrive at the Bayou Manchac reach below 8 knots.',name:'SOUTHERN PARISH REACH'}];
  checkpointGroup=new THREE.Group();scene.add(checkpointGroup);
  for(const gate of gates){gate.p=RIVER.sample(gate.s);gate.x=gate.p.x-gate.p.tz*75;gate.z=gate.p.z+gate.p.tx*75;
    for(const side of [-1,1]){const buoy=new THREE.Group(),color=side<0?0x728f54:0x9e4935;const mat=new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.6});
      const base=new THREE.Mesh(new THREE.CylinderGeometry(1.8,2.5,1.25,16),mat);base.position.y=.5;buoy.add(base);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.5,.8,3,10),mat);stem.position.y=2.3;buoy.add(stem);
      const cap=new THREE.Mesh(side<0?new THREE.CylinderGeometry(.9,.9,.8,12):new THREE.ConeGeometry(1,1.6,12),mat);cap.position.y=4;buoy.add(cap);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshBasicMaterial({color:side<0?0xb3e784:0xffbc8e}));lamp.position.y=4.9;buoy.add(lamp);
      buoy.position.set(gate.x-gate.p.tz*side*95,0,gate.z+gate.p.tx*side*95);checkpointGroup.add(buoy);
    }
  }
}
function initEffects(){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(240,239,211,.55)');g.addColorStop(.25,'rgba(240,239,211,.3)');g.addColorStop(1,'rgba(240,239,211,0)');c.fillStyle=g;c.fillRect(0,0,64,64);const texture=new THREE.CanvasTexture(canvas);
  for(let i=0;i<wakeCount;i++){wakePositions[i*3+1]=-30;wakeData.push({life:0,x:0,z:0,vx:0,vz:0});}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(wakePositions,3));geometry.setAttribute('color',new THREE.BufferAttribute(wakeColors,3));
  wakeMesh=new THREE.Points(geometry,new THREE.PointsMaterial({size:3.4,map:texture,transparent:true,opacity:.55,vertexColors:true,depthWrite:false,sizeAttenuation:true}));wakeMesh.frustumCulled=false;scene.add(wakeMesh);
  rainPositions=new Float32Array(900*6);for(let i=0;i<900;i++){const x=(Math.random()-.5)*160,y=Math.random()*90,z=(Math.random()-.5)*160;rainPositions.set([x,y,z,x+.7,y-3,z],i*6);}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));rainMesh=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xb8ccd2,transparent:true,opacity:.25,depthWrite:false}));rainMesh.frustumCulled=false;rainMesh.visible=false;scene.add(rainMesh);
  const chainGeometry=new THREE.BufferGeometry();chainGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(9),3));anchorLine=new THREE.Line(chainGeometry,new THREE.LineBasicMaterial({color:0x8e9791}));anchorLine.frustumCulled=false;anchorLine.visible=false;scene.add(anchorLine);
}
function updateEffects(dt){
  const speed=Math.abs(state.speed||0),waterContact=!state.airborne&&!state.onRamp&&!state.groundedOnLand&&(!state.anchorState||state.anchorState==='up');if(waterContact)wakeSpawn+=dt*speed*7;else wakeSpawn=0;
  const continuous=Number.isFinite(lastWakeX)&&Math.hypot(state.x-lastWakeX,state.z-lastWakeZ)<60;
  const fromX=continuous?lastWakeX:state.x,fromZ=continuous?lastWakeZ:state.z;
  const count=Math.floor(wakeSpawn);
  if(waterContact&&mode!=='intro'&&!isPaused())for(let j=0;j<count;j++){wakeSpawn--;const index=wakeCursor++%wakeCount,p=wakeData[index],side=Math.random()<.5?-1:1;const fx=-Math.sin(state.heading),fz=-Math.cos(state.heading),nx=-fz,nz=fx,t=(j+Math.random())/Math.max(1,count),spread=HALF_WIDTH-.35+Math.random()*.35;p.x=fromX+(state.x-fromX)*t-fx*(HALF_LENGTH-.3)+nx*side*spread;p.z=fromZ+(state.z-fromZ)*t-fz*(HALF_LENGTH-.3)+nz*side*spread;p.vx=nx*side*(.3+speed*.06)*( .75+Math.random()*.5);p.vz=nz*side*(.3+speed*.06)*(.75+Math.random()*.5);p.life=.8+Math.random()*.2;}
  lastWakeX=state.x;lastWakeZ=state.z;
  wakeSpawn=Math.min(wakeSpawn,1);
  for(let i=0;i<wakeCount;i++){const p=wakeData[i];if(p.life>0){p.life-=dt*.085;p.x+=p.vx*dt;p.z+=p.vz*dt;wakePositions[i*3]=p.x;wakePositions[i*3+1]=.09+Math.sin(simTime*2+p.x*.1)*.025;wakePositions[i*3+2]=p.z;const alpha=Math.max(0,p.life)*.85;wakeColors[i*3]=alpha;wakeColors[i*3+1]=alpha;wakeColors[i*3+2]=alpha*.9;}else wakePositions[i*3+1]=-30;}
  wakeMesh.geometry.attributes.position.needsUpdate=true;wakeMesh.geometry.attributes.color.needsUpdate=true;
  rainMesh.visible=weather==='storm';if(rainMesh.visible){rainMesh.position.set(camera.position.x,0,camera.position.z);for(let i=0;i<900;i++){const o=i*6;rainPositions[o+1]-=dt*35;rainPositions[o+4]-=dt*35;rainPositions[o]+=dt*4;rainPositions[o+3]+=dt*4;if(rainPositions[o+1]<0){rainPositions[o+1]=90;rainPositions[o+4]=87;rainPositions[o]=(Math.random()-.5)*160;rainPositions[o+3]=rainPositions[o]+.7;}}rainMesh.geometry.attributes.position.needsUpdate=true;}
  checkpointGroup.children.forEach((buoy,i)=>{buoy.position.y=Math.sin(simTime*1.7+i)*.17;buoy.rotation.z=Math.sin(simTime+i)*.025;});
}
function isPaused(){return paused||[...document.querySelectorAll('dialog')].some(d=>d.open);}
function clearCameraTerrain(position){
  const ground=world.terrainAt?.(position.x,position.z);
  if(Number.isFinite(ground))position.y=Math.max(position.y,ground+.75);
}
function updateCamera(dt,snap=false){
  const fwd=new THREE.Vector3(-Math.sin(state.heading),0,-Math.cos(state.heading));
  const elevation=state.y||0;
  let angle=state.heading+orbitYaw,dist,height;
  if(mode==='intro'){
    const t=simTime*.018;angle=state.heading+.58+Math.sin(t)*.12;dist=26;height=8;
    desiredCamera.set(state.x+Math.sin(angle)*dist,height,state.z+Math.cos(angle)*dist);
    lookTarget.set(state.x+fwd.x*10,1.4,state.z+fwd.z*10);
  }else if(landmarkView){
    const target=landmarkView.lookAt,dx=target.x-state.x,dz=target.z-state.z,length=Math.hypot(dx,dz)||1;
    desiredCamera.set(state.x-dx/length*22,landmarkView.cameraHeight||14,state.z-dz/length*22);
    // Look around from the selected water viewpoint. Zoom changes the lens,
    // so inspecting an inland building cannot move the camera through land.
    const vx=target.x-desiredCamera.x,vz=target.z-desiredCamera.z,c=Math.cos(orbitYaw),s=Math.sin(orbitYaw);
    lookTarget.set(desiredCamera.x+vx*c+vz*s,(target.y??7)+orbitPitch*length*.15,desiredCamera.z-vx*s+vz*c);
  }else if(cameraMode===1){
    const helm=player.userData.helm;
    desiredCamera.set(state.x+Math.cos(state.heading)*helm.x+Math.sin(state.heading)*helm.z,elevation+helm.y+(state.pitch||0)*.3,state.z-Math.sin(state.heading)*helm.x+Math.cos(state.heading)*helm.z);
    lookTarget.set(state.x-Math.sin(angle)*110,elevation+2.05+orbitPitch*25,state.z-Math.cos(angle)*110);
  }else{
    dist=(cameraMode===2?110:16)*zoom;height=(cameraMode===2?85:6.2)*zoom+orbitPitch*18;
    desiredCamera.set(state.x+Math.sin(angle)*dist,elevation+Math.max(2,height),state.z+Math.cos(angle)*dist);
    lookTarget.set(state.x+fwd.x*(cameraMode===2?28:3.5),elevation+1.1,state.z+fwd.z*(cameraMode===2?28:3.5));
  }
  const externalView=mode==='intro'||landmarkView||cameraMode!==1;
  if(externalView)clearCameraTerrain(desiredCamera);
  const fov=landmarkView?Math.max(18,Math.min(75,(landmarkView.cameraFov||57)/zoom)):57;
  if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}
  const smoothing=snap||(cameraMode===1&&!landmarkView)?1:1-Math.exp(-dt*8);camera.position.lerp(desiredCamera,smoothing);
  // Smoothing can cross a bank even when both endpoint positions are clear.
  // Keep the external camera above the visible terrain without moving the hull.
  if(externalView)clearCameraTerrain(camera.position);
  camTarget.lerp(lookTarget,smoothing);camera.lookAt(camTarget);
}
function gameStep(dt){
  const command=RiverControls.command(throttle,gear,keys,touch,dt);throttle=command.throttle;effectiveGear=command.effectiveGear;
  if(state.groundedOnLand||state.anchorState&&state.anchorState!=='up')throttle=0;
  if(landmarkView&&(keys.has('Space')||touch.has('fast')||Math.abs(command.rudder)>.01))clearLandmarkView();
  if(landmarkView){throttle=0;state.throttle=0;state.speed=0;state.groundSpeed=0;state.turnRate=0;state.rudder=0;state.driftX=0;state.driftZ=0;state.roll=0;state.pitch=0;state.wakeStrength=0;state.engineRPM=BOAT.idleRPM||12000;state.collision=false;return;}
  const brake=command.brake,rudder=command.rudder;
  RiverVessels.stepBoat(state,{throttle,rudder,brake},dt,river,collisionBodies);
  if(state.anchorBreakEvent)notify('Anchor released after an impact. Check your surroundings.',5);
  if(state.landingEvent&&state.lastJump)notify(`${state.lastJump.flightTime.toFixed(2)} s airborne · ${Math.round(state.lastJump.distance)} m jump · ${state.lastJump.maxHeight.toFixed(1)} m high`,5);
  if(state.s>=RIVER.length-.1||state.s<=.1){const atEnd=state.s>RIVER.length/2,p=RIVER.sample(atEnd?RIVER.length:0),along=(state.x-p.x)*p.tx+(state.z-p.z)*p.tz;if(atEnd?along>2:along< -2){const hull=state.hull;state=startPosition(atEnd?RIVER.length-180:5);if(atEnd)state.heading=Math.atan2(Math.sin(state.heading+Math.PI),Math.cos(state.heading+Math.PI));state.hull=hull;throttle=0;notify('You reached the mapped riverfront boundary. Turn back or explore another location.',6);}}
  if(state.hull<=0){throttle=0;paused=true;$('paused').hidden=false;$('paused').querySelector('h2').textContent='Your boat needs recovery.';syncPauseButton();notify('Hull damaged. Press R to recover your boat.',8);return;}
  if(mode==='mission'){
    voyageTime+=dt;const gate=gates[checkpoint];
    if(gate&&!state.airborne&&!state.onRamp){const distance=Math.hypot(state.x-gate.x,state.z-gate.z);if(distance<100){if(checkpoint<gates.length-1||(state.groundSpeed||0)*1.94384<8){checkpoint++;if(checkpoint<gates.length)notify(`Waypoint cleared. ${gates[checkpoint].title}.`);else complete();}else if(frameCount%120===0)notify('Ease the throttle. Arrive below 8 knots.');}}
  }
}
function complete(){
  const minutes=Math.floor(voyageTime/60),seconds=Math.floor(voyageTime%60);$('result-time').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;$('result-hull').textContent=`${Math.round(state.hull)}%`;$('complete-detail').textContent=`You navigated ${(RIVER.length/1000).toFixed(1)} km of the Baton Rouge riverfront, cleared both bridges, and arrived under control.`;$('complete-dialog').showModal();
}
function syncPlayer(dt=0){const chop=state.airborne||state.onRamp?0:weather==='storm'?2.8:1;player.position.set(state.x,(state.y||0)+.08+Math.sin(simTime*1.8)*.04*chop,state.z);player.rotation.set((state.pitch||0)+Math.sin(simTime*1.3)*.006*chop,state.heading,(state.roll||0)+Math.sin(simTime*1.6)*.009*chop);RiverFanBoat.updatePlayer(player,state,simTime,dt);if(anchorLine){anchorLine.visible=state.anchorState==='setting'||state.anchorState==='down';if(anchorLine.visible){const x=state.x-Math.sin(state.heading)*3.25,z=state.z-Math.cos(state.heading)*3.25,a=anchorLine.geometry.attributes.position;a.setXYZ(0,x,.84,z);a.setXYZ(1,x,.05,z);a.setXYZ(2,state.anchorX??x,-12,state.anchorZ??z);a.needsUpdate=true;}}}
function updateWaypoint(){
  const gate=gates[checkpoint],el=$('waypoint');if(mode!=='mission'||!gate){el.hidden=true;return;}
  vec.set(gate.x,9,gate.z);vec.project(camera);const inFront=vec.z<1&&vec.z>-1;el.hidden=!inFront;
  if(inFront){el.style.left=`${Math.max(9,Math.min(91,(vec.x*.5+.5)*100))}%`;el.style.top=`${Math.max(25,Math.min(67,(-vec.y*.5+.5)*100))}%`;$('waypoint-name').textContent=gate.name;const d=Math.hypot(state.x-gate.x,state.z-gate.z);$('waypoint-distance').textContent=d>999?`${(d/1000).toFixed(1)} km`:`${Math.round(d)} m`;}
}
function drawChart(){
  const c=$('chart').getContext('2d'),w=540,h=360,p=RIVER.sample(state.s||0),bounds=BR_GEO.bounds;
  const centerX=mapOverview?(bounds.minX+bounds.maxX)/2:state.x+p.tx*600,centerZ=mapOverview?(bounds.minZ+bounds.maxZ)/2:state.z+p.tz*600;
  const scale=mapOverview?Math.min((w-35)/(bounds.maxX-bounds.minX),(h-35)/(bounds.maxZ-bounds.minZ)):w/6500;
  const px=x=>(x-centerX)*scale+w/2,pz=z=>(z-centerZ)*scale+h/2;
  c.clearRect(0,0,w,h);c.fillStyle='#183b3e';c.fillRect(0,0,w,h);c.lineJoin='round';
  c.strokeStyle='#bed3bd12';c.lineWidth=1;for(let x=0;x<w;x+=45){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=45){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  for(const poly of BR_GEO.waterPolygons){c.beginPath();for(const ring of[poly.outer,...poly.holes]){ring.forEach((v,i)=>i?c.lineTo(px(v[0]),pz(v[1])):c.moveTo(px(v[0]),pz(v[1])));c.closePath();}c.fillStyle='#496d73';c.fill('evenodd');c.strokeStyle='#a9c5b877';c.lineWidth=1;c.stroke();}
  c.beginPath();RIVER.points.forEach((p,i)=>i?c.lineTo(px(p.x),pz(p.z)):c.moveTo(px(p.x),pz(p.z)));c.setLineDash([3,7]);c.lineWidth=1;c.strokeStyle='#eee3b83d';c.stroke();c.setLineDash([]);
  for(const bridge of RIVER.bridges){c.beginPath();c.moveTo(px(bridge.axis[0][0]),pz(bridge.axis[0][1]));c.lineTo(px(bridge.axis[1][0]),pz(bridge.axis[1][1]));c.strokeStyle='#e0ddd0';c.lineWidth=3;c.stroke();}
  for(const point of[RIVER.sample(0),RIVER.sample(RIVER.length)]){c.fillStyle='#e4d2a2';c.beginPath();c.arc(px(point.x),pz(point.z),4,0,TAU);c.fill();}
  if(mode==='mission')for(let i=0;i<gates.length;i++){const gate=gates[i];c.beginPath();c.arc(px(gate.x),pz(gate.z),i===checkpoint?6:3,0,TAU);c.fillStyle=i<checkpoint?'#8fbca2':i===checkpoint?'#e6ca89':'#a4b5af';c.fill();}
  for(const vessel of traffic){c.save();c.translate(px(vessel.x),pz(vessel.z));c.rotate(-vessel.heading);c.fillStyle='#d1d7c9aa';c.fillRect(-2,-4,4,8);c.restore();}
  for(const ramp of river.ramps||[]){c.save();c.translate(px(ramp.x),pz(ramp.z));c.rotate(-ramp.heading);c.fillStyle='#efb457';c.beginPath();c.moveTo(0,-5);c.lineTo(4,4);c.lineTo(-4,4);c.closePath();c.fill();c.restore();}
  c.save();c.translate(px(state.x),pz(state.z));c.rotate(-state.heading);c.beginPath();c.moveTo(0,-10);c.lineTo(6,8);c.lineTo(0,5);c.lineTo(-6,8);c.closePath();c.fillStyle='#f4dc9e';c.shadowColor='#f4dc9e';c.shadowBlur=8;c.fill();c.restore();c.fillStyle='#d0dcd0';c.font='12px Arial';c.fillText('N ↑',w-40,23);c.font='11px Arial';c.fillText(mapOverview?'FULL 64.3 KM REACH':'LOCAL VIEW · CLICK FOR WHOLE ROUTE',13,h-13);
}
function updateHud(){
  const p=RIVER.project(state.x,state.z);const heading=(-state.heading*DEG%360+360)%360;const speed=(state.groundSpeed||0)*KNOTS_PER_MPS;const depth=Math.max(.5,25*(1-Math.pow(Math.min(1,Math.abs(p.offset)/(p.offset<0?p.leftWidth:p.rightWidth)),2.2)));
  $('heading').textContent=String(Math.round(heading)%360).padStart(3,'0');$('speed').textContent=speed.toFixed(1);$('speed-track').style.width=`${Math.min(100,speed/BOAT.maxSpeedKnots*100)}%`;
  if($('gear'))$('gear').textContent=RiverControls.gearLabel(effectiveGear);
  $('current').innerHTML=`${currentKnots.toFixed(1)} <small>kn</small>`;$('depth').innerHTML=`${depth.toFixed(1)} <small>m</small>`;$('hull').innerHTML=`${Math.round(state.hull)}<small>%</small>`;$('hull-state').textContent=state.grounded?'GROUNDED':state.hull<35?'DAMAGE':state.hull<85?'CAUTION':'ALL CLEAR';
  $('throttle-label').textContent=throttle<-.03?'ASTERN':throttle<.03?'IDLE':throttle<.3?'SLOW AHEAD':throttle<.65?'HALF AHEAD':'FULL AHEAD';
  const anchored=state.anchorState==='setting'||state.anchorState==='down';$('anchor').textContent=anchored?'⚓ Raise':'⚓ Anchor';$('anchor').setAttribute('aria-label',anchored?'Raise anchor':'Drop anchor');$('anchor').setAttribute('aria-pressed',String(anchored));$('anchor').title=anchored?'Raise anchor · H':'Drop anchor below 4 knots · H';
  const motion=state.airborne?`AIRBORNE · ${(state.y||0).toFixed(1)} m · ${(state.airTime||0).toFixed(1)} s`:state.onRamp?'ON RAMP':state.anchorState==='setting'?'ANCHOR SETTING':state.anchorState==='down'?'ANCHORED · H TO RAISE':'';$('motion-status').textContent=motion;$('motion-status').hidden=!motion;
  $('throttle-track').style.width=`${Math.abs(throttle)*66.66}%`;$('throttle-track').style.left=throttle<0?`${33.33+throttle*66.66}%`:'33.33%';$('rudder-needle').style.transform=`rotate(${(state.rudder||0)*55}deg)`;
  const cardinal={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};let ticks='';for(let angle=0;angle<360;angle+=15){const delta=(angle-heading+540)%360-180;if(Math.abs(delta)<85)ticks+=`<span style="left:${delta*2.3}px">${cardinal[angle]||angle}</span>`;}$('compass-scale').innerHTML=ticks;
  if(mode==='mission'&&checkpoint<gates.length){$('mission-kind').textContent='FULL RIVERFRONT VOYAGE';$('checkpoint-count').textContent=`0${checkpoint+1} / 0${gates.length}`;$('mission-title').textContent=gates[checkpoint].title;$('mission-detail').textContent=gates[checkpoint].detail;$('mission-progress').style.width=`${Math.max(0,Math.min(100,(p.s-RIVER.startS)/(RIVER.finishS-RIVER.startS)*100))}%`;$('distance-left').textContent=`${Math.max(0,(RIVER.finishS-p.s)/1000).toFixed(1)} km remaining`;}
  else{$('mission-kind').textContent=landmarkView?'RIVERFRONT LANDMARK':'FREE NAVIGATION';$('checkpoint-count').textContent='EXPLORE';$('mission-title').textContent=landmarkView?.name||(anchored?'Holding in the current':state.lastJump?'Back on the river':'Follow your own current');$('mission-detail').textContent=landmarkView?'Drag to look around · scroll to zoom. Space resumes sailing.':anchored?'H or the anchor button raises the anchor. Throttle stays at idle until then.':state.lastJump?`Last jump: ${state.lastJump.flightTime.toFixed(2)} s in air · ${Math.round(state.lastJump.distance)} m long · ${state.lastJump.maxHeight.toFixed(1)} m high.`:'Single turbine fan boat · 80 kn max. Shift ↑ to gear 3 for full power.';$('mission-progress').style.width='0%';$('distance-left').textContent='FREE EXPLORATION';}
  const coordinate=BR_GEO.toLonLat(state.x,state.z);$('coordinates').textContent=`${coordinate.lat.toFixed(5)}° N · ${Math.abs(coordinate.lon).toFixed(5)}° W`;
  drawChart();
}
function setupAudio(){
  if(audio)return;const context=new(window.AudioContext||window.webkitAudioContext)();const master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const engine=context.createOscillator(),engineGain=context.createGain(),filter=context.createBiquadFilter();engine.type='sine';engine.frequency.value=450;filter.type='lowpass';filter.frequency.value=1800;engineGain.gain.value=.018;engine.connect(filter);filter.connect(engineGain);engineGain.connect(master);engine.start();
  const fan=context.createOscillator(),fanGain=context.createGain();fan.type='triangle';fan.frequency.value=38;fanGain.gain.value=.045;fan.connect(fanGain);fanGain.connect(master);fan.start();
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=brown*5;}
  const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;const waterGain=context.createGain();waterGain.gain.value=.05;noise.connect(waterGain);waterGain.connect(master);noise.start();audio={context,master,engine,engineGain,filter,fan,fanGain,waterGain};
}
function toggleSound(){try{setupAudio();audioEnabled=!audioEnabled;audio.context.resume();audio.master.gain.setTargetAtTime(audioEnabled?.7:0,audio.context.currentTime,.15);$('sound').textContent=`Sound ${audioEnabled?'on':'off'}`;$('sound').setAttribute('aria-pressed',String(audioEnabled));}catch{notify('Audio is not available in this browser.');}}
function updateAudio(){if(!audio)return;const t=audio.context.currentTime,power=Math.min(1,Math.abs(state.throttle||0)),speed=Math.min(1,Math.abs(state.speed||0)/BOAT.maxSpeedMps);audio.engine.frequency.setTargetAtTime(450+power*1750,t,.35);audio.engineGain.gain.setTargetAtTime(.012+power*.028,t,.3);audio.filter.frequency.setTargetAtTime(1800+power*1400,t,.3);audio.fan.frequency.setTargetAtTime(38+power*105,t,.35);audio.fanGain.gain.setTargetAtTime(.045+power*.065,t,.3);audio.waterGain.gain.setTargetAtTime(weather==='storm'?.17:.045+speed*.12,t,.2);audio.master.gain.setTargetAtTime(audioEnabled?(isPaused()?.15:.7):0,t,.2);}
function setWeather(name){weather=name;world.setWeather?.(name);document.querySelectorAll('[data-weather]').forEach(b=>b.classList.toggle('active',b.dataset.weather===name));const labels={golden:['GOLDEN HOUR','WARM LIGHT · OPEN WATER','☀'],morning:['MORNING MIST','COOL AIR · QUIET CURRENT','◌'],storm:['RIVER SQUALL','RAIN · LOW VISIBILITY','☂']};$('scene-weather').innerHTML=`${labels[name][0]}<span>${labels[name][1]}</span>`;document.querySelector('.sun-icon').textContent=labels[name][2];}
function setCamera(){clearLandmarkView();cameraMode=(cameraMode+1)%3;orbitYaw=0;orbitPitch=0;zoom=1;$('camera').innerHTML=`${camNames[cameraMode]} <span>↗</span>`;notify(camNames[cameraMode],2);}
function start(newMode='mission'){
  landmarkView=null;
  mode=newMode;paused=false;state=startPosition(newMode==='free'?(RIVER.bridges.find(b=>/I-10/.test(b.name))?.s||RIVER.length*.6)-650:RIVER.startS);throttle=0;gear=1;effectiveGear=1;checkpoint=0;voyageTime=0;cameraMode=0;orbitYaw=0;orbitPitch=0;zoom=1;keys.clear();touch.clear();wakeData.forEach(p=>p.life=0);$('welcome').hidden=true;$('intro-bottom').hidden=true;$('hud').hidden=false;$('paused').hidden=true;syncPauseButton();document.body.classList.add('running');$('camera').innerHTML='Chase view <span>↗</span>';document.querySelectorAll('dialog[open]').forEach(d=>d.close());syncPlayer();updateCamera(1,true);updateHud();renderer.domElement.focus();notify('Space accelerates · Ctrl + Space reverses · ←/→ steer · ↑/↓ shift gears · X slows',8);
}
function resetToIntro(){landmarkView=null;mode='intro';paused=false;throttle=0;gear=1;effectiveGear=1;state=startPosition((RIVER.bridges.find(b=>/I-10/.test(b.name))?.s||RIVER.length*.6)-650);$('welcome').hidden=false;$('intro-bottom').hidden=false;$('hud').hidden=true;$('paused').hidden=true;syncPauseButton();document.body.classList.remove('running');document.querySelectorAll('dialog[open]').forEach(d=>d.close());keys.clear();touch.clear();wakeData.forEach(p=>p.life=0);world.setFocus(state.x,state.z);syncPlayer();updateCamera(1,true);}
function recover(){
  if(mode==='intro')return;
  const nextGate=mode==='mission'?gates[checkpoint]:null,maxS=nextGate?nextGate.s-130:RIVER.length-8;
  const s=nextGate?Math.min(Math.max(RIVER.startS,state.s),maxS):Math.max(200,Math.min(RIVER.length-300,state.s));
  const destination=landmarkDestination({s,minS:Math.max(8,RIVER.startS),maxS});
  if(!destination){notify('No clear recovery position nearby. Choose another location or restart.',6);return;}
  const hull=Math.max(50,state.hull-10);clearLandmarkView();state=destination;state.hull=hull;throttle=0;effectiveGear=gear;paused=false;$('paused').hidden=true;syncPauseButton();keys.clear();touch.clear();wakeData.forEach(p=>p.life=0);syncPlayer();world.setFocus(state.x,state.z);updateCamera(1,true);updateHud();notify('Recovered to the channel. Turbine at idle.');
}
function syncPauseButton(){$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');}
function syncGearDisplay(){effectiveGear=RiverControls.command(throttle,gear,keys,touch,0).effectiveGear;updateHud();}
function togglePause(){if(mode==='intro')return;paused=!paused;$('paused').hidden=!paused;$('paused').querySelector('h2').textContent='The river can wait.';syncPauseButton();keys.clear();touch.clear();}
function wireControls(){
  $('start').onclick=()=>start('mission');$('explore').onclick=()=>start('free');$('pause').onclick=togglePause;$('resume').onclick=()=>{if(state.hull<=0)recover();else togglePause();};$('camera').onclick=setCamera;$('sound').onclick=toggleSound;$('anchor').onclick=toggleAnchor;$('ramps-enabled').onchange=()=>rebuildRamps();$('new-ramps').onclick=()=>rebuildRamps(true);
  $('menu').onclick=()=>{$('settings-dialog').showModal();keys.clear();touch.clear();};$('about').onclick=()=>$('about-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('restart').onclick=()=>start(mode==='intro'?'mission':mode);$('return-home').onclick=resetToIntro;$('keep-exploring').onclick=()=>{mode='free';$('complete-dialog').close();};$('complete-dialog').addEventListener('close',()=>{if(checkpoint>=gates.length)mode='free';});
  document.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>setWeather(b.dataset.weather));$('flow').oninput=()=>{currentKnots=Number($('flow').value);$('flow-value').textContent=`${currentKnots.toFixed(1)} knots`;};
  $('quality').onchange=()=>{quality=$('quality').value;renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.6:1));renderer.shadowMap.enabled=quality==='high';world.setQuality?.(quality);scene.traverse(o=>{if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.needsUpdate=true);}});notify(quality==='high'?'Full-quality reflections and shadows.':'Balanced graphics enabled.');};
  $('chart').onclick=()=>{mapOverview=!mapOverview;drawChart();};$('chart').style.pointerEvents='auto';$('chart').style.cursor='pointer';$('chart').title='Click to switch between local chart and whole-route overview';
  $('gear-up').onclick=()=>{gear=Math.min(3,gear+1);syncGearDisplay();};$('gear-down').onclick=()=>{gear=Math.max(-1,gear-1);syncGearDisplay();};
  $('jump').onchange=()=>{if($('jump').value==='')return;const stop=locationStops[Number($('jump').value)];if(!stop)return;const destination=landmarkDestination(stop);if(!destination){notify('No clear water viewpoint is available here. Try another location.');return;}mode='free';paused=false;state=destination;throttle=0;gear=1;effectiveGear=1;cameraMode=0;orbitYaw=0;orbitPitch=0;zoom=1;landmarkView=stop.lookAt&&!stop.practice?{lookAt:stop.lookAt,cameraHeight:stop.cameraHeight||14,cameraFov:stop.cameraFov||57,name:stop.name}:null;RiverControls.clear(keys,touch);wakeData.forEach(p=>p.life=0);$('paused').hidden=true;syncPauseButton();$('camera').innerHTML=`${landmarkView?'Landmark view':'Chase view'} <span>↗</span>`;syncPlayer();world.setFocus(state.x,state.z);updateCamera(1,true);updateHud();notify(`${stop.name}. ${stop.practice?'Shift ↑ twice for gear 3, hold Space, and aim straight up the ramp.':'Turbine at idle.'}${landmarkView?' Space resumes sailing; drag to look around.':''}`,7);renderer.domElement.focus();};
  window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;const result=RiverControls.keyDown(keys,e,gear);if(result.gear!==gear){gear=result.gear;syncGearDisplay();notify(`Gear ${RiverControls.gearLabel(gear)} selected`,1.5);}if(e.repeat)return;if(e.code==='KeyH'){e.preventDefault();toggleAnchor();}if(e.code==='KeyC')setCamera();if(e.code==='KeyP'||e.code==='Escape')togglePause();if(e.code==='KeyR')recover();});
  window.addEventListener('keyup',e=>RiverControls.keyUp(keys,e));window.addEventListener('blur',()=>RiverControls.clear(keys,touch));document.addEventListener('visibilitychange',()=>{RiverControls.clear(keys,touch);if(document.hidden&&mode!=='intro'&&!paused)togglePause();});
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D river. Hold Space to accelerate, Control and Space to reverse. Left and right arrows steer, up and down arrows shift gears. X slows the boat. H drops or raises the anchor below 4 knots.');canvas.addEventListener('pointerdown',e=>{if(mode==='intro')return;canvas.focus();dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging||!lastPointer)return;orbitYaw-=(e.clientX-lastPointer.x)*.005;orbitPitch=Math.max(-.3,Math.min(2,orbitPitch+(e.clientY-lastPointer.y)*.008));lastPointer={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',()=>{dragging=false;});canvas.addEventListener('pointercancel',()=>{dragging=false;});canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(2.5,zoom+e.deltaY*(landmarkView?-.001:.001)));},{passive:false});
  document.querySelectorAll('[data-hold]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.hold);});const clear=()=>touch.delete(b.dataset.hold);b.addEventListener('pointerup',clear);b.addEventListener('pointercancel',clear);b.addEventListener('lostpointercapture',clear);});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
function animate(){
  requestAnimationFrame(animate);const raw=Math.min(clock.getDelta(),.08),freeze=isPaused(),dt=freeze?0:raw;frameCount++;
  simTime+=dt;if(mode!=='intro'&&!freeze){let remaining=dt;while(remaining>0&&!isPaused()){const step=Math.min(1/60,remaining);gameStep(step);remaining-=step;}}
  if(!freeze)RiverVessels.updateTraffic(traffic,simTime,dt);world.setFocus?.(state.x,state.z);world.update(simTime,dt,weather);syncPlayer(dt);updateEffects(dt);updateCamera(raw);updateWaypoint();
  if(performance.now()-lastHud>100){lastHud=performance.now();if(mode!=='intro')updateHud();updateAudio();if(performance.now()>toastUntil)$('toast').classList.remove('visible');}
  renderer.render(scene,camera);fpsFrames++;if(performance.now()-fpsStart>2000){$('viewport').dataset.fps=String(Math.round(fpsFrames*1000/(performance.now()-fpsStart)));$('viewport').dataset.drawCalls=String(renderer.info.render.calls);fpsFrames=0;fpsStart=performance.now();}
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('viewport').appendChild(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.2,32000);const previewS=(RIVER.bridges.find(b=>/I-10/.test(b.name))?.s||RIVER.length*.6)-650;state=startPosition(previewS);scene.userData.initialFocus={x:state.x,z:state.z};
  river={...RIVER,currentAt(x,z){const p=RIVER.project(x,z),v=RIVER.sample(p.s),speed=currentKnots/1.94384*(.8+.2*(1-Math.min(1,Math.abs(p.offset)/(p.offset<0?p.leftWidth:p.rightWidth))));return {x:v.tx*speed,z:v.tz*speed,speed};}};
  world=RiverWorld.create(scene,renderer);world.setFocus(state.x,state.z);player=RiverFanBoat.createPlayer();scene.add(player);traffic=RiverVessels.createTraffic(scene,river);collisionBodies=traffic.concat(world.obstacles||[]);river.terrainAt=world.terrainAt;river.isWater=BRScene.isWater;rebuildRamps();buildGates();initEffects();wireControls();syncPlayer();updateCamera(1,true);setWeather('golden');
  $('route-length').textContent=(RIVER.length/1000).toFixed(1);$('distance-left').textContent=`${(RIVER.length/1000).toFixed(1)} km mapped`;
  const stops=[{name:'Northern riverfront boundary',s:20},...[...RIVER.bridges].sort((a,b)=>a.s-b.s).map(b=>{const structure=BRLandmarks.bridgeData[b.road];return {name:b.name,s:b.s-800,lookAt:{x:structure?.center.x??b.x,y:(structure?.deckElevation||45)-(BR_TERRAIN.waterElevation||4)+12,z:structure?.center.z??b.z},cameraHeight:22,cameraFov:57};}),{name:'Downtown riverfront',s:(RIVER.bridges.find(b=>/I-10/.test(b.name))?.s||40000)-1200},{name:'Southern riverfront / Bayou Manchac',s:RIVER.length-600}];
  for(const point of world.landmarks||[]){if(point.lon&&point.lat||Number.isFinite(point.x)&&Number.isFinite(point.z)){const w=Number.isFinite(point.x)&&Number.isFinite(point.z)?point:BR_GEO.toWorld(point.lon,point.lat);const base=BR_TERRAIN.elevationAt(w.x,w.z)-(BR_TERRAIN.waterElevation||4),height=/Louisiana State Capitol/.test(point.name)?65:12;stops.push({name:point.name,s:RIVER.project(w.x,w.z).s,lookAt:point.lookAt||point.view?.target||{x:w.x,y:Math.max(5,base+height),z:w.z},viewPosition:point.viewPosition||point.view?.position,viewDistance:point.viewDistance||(point.view?190:undefined),cameraHeight:point.cameraHeight,cameraFov:point.cameraFov});}}
  if(!stops.some(stop=>/Downtown levee/.test(stop.name))){const target={x:891.882,y:9.954,z:-432.756};stops.push({name:'Downtown levee & riverwalk',s:RIVER.project(target.x,target.z).s,lookAt:target,viewPosition:{x:600.1,z:-422.4},viewDistance:290,cameraHeight:14});}
  stops.sort((a,b)=>a.s-b.s);locationStops=stops;syncRampLocation();
  renderer.compile(scene,camera);renderer.render(scene,camera);animate();Promise.resolve(world.ready).then(()=>{$('loading').hidden=true;$('welcome').hidden=false;}).catch(fail);
  window.RiverPilot={getState:()=>({mode,paused:paused||isPaused(),weather,camera:landmarkView?'Landmark view':camNames[cameraMode],landmark:landmarkView?.name||null,checkpoint,throttle,gear,effectiveGear,currentKnots,x:state.x,z:state.z,s:state.s,speed:state.speed,hull:state.hull}),version:'2.5-map-audit'};
}catch(error){fail(error);}
})();

