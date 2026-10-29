(function(global){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const GRAVITY=9.81;
  const PLAYER_SPEC=Object.freeze({length:7,width:3.2,draft:.18,maxSpeedKnots:80,maxSpeedMps:80*1852/3600,maxReverseSpeedKnots:12,maxReverseSpeedMps:12*1852/3600,anchorMaxSpeedKnots:4,anchorMaxSpeedMps:4*1852/3600,idleRPM:12000,maxRPM:55000,maxSubstepDistance:.55});
  const finite=(v,f=0)=>Number.isFinite(v)?v:f;
  const sideWidth=(p,side)=>Math.max(1,finite(side<0?p.leftWidth:p.rightWidth,finite(p.width,100)*.5));
  const approach=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
  let materials;
  function palette(){
    if(materials)return materials;
    const M=(color,roughness=.55,metalness=.15)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
    return materials={white:M(0xf0eee2),orange:M(0xe65226),navy:M(0x19383b),rubber:M(0x1b2426),metal:M(0xb9beb4,.3,.7),glass:M(0x224c59,.12,.52),deck:M(0x92978a),rust:M(0x7d4733),red:M(0x8c3d2d),barge:M(0x3e4b4c),cargo:M(0xc4aa7c),dark:M(0x343d3b),green:new THREE.MeshStandardMaterial({color:0x3acb87,emissive:0x199151,emissiveIntensity:1.4}),redLight:new THREE.MeshStandardMaterial({color:0xfb4938,emissive:0xf12812,emissiveIntensity:1.2}),lamp:new THREE.MeshStandardMaterial({color:0xffecd1,emissive:0xffdca0,emissiveIntensity:.7})};
  }
  function box(group,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  function cylinder(group,r1,r2,h,x,y,z,mat,n=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  function rod(group,a,b,r,mat){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),6),mat);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());m.castShadow=true;group.add(m);return m;}
  function hull(group,length,beam,top,bottom,mat){
    const outline=[[-beam/2,length/2],[beam/2,length/2],[beam/2,-length*.24],[beam*.37,-length*.39],[0,-length/2],[-beam*.37,-length*.39],[-beam/2,-length*.24]];
    const points=[],indices=[];for(const [x,z]of outline)points.push(x,top,z);for(const[x,z]of outline)points.push(x*.72,bottom,z*.92+.15);
    const n=outline.length;for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,n+i,j,j,n+i,n+j);}
    points.push(0,top,0);for(let i=0;i<n;i++)indices.push(n*2,i,(i+1)%n);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);return outline;
  }
  function rail(group,points,y,mat){for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];rod(group,[a[0],y,a[1]],[b[0],y,b[1]],.045,mat);rod(group,[a[0],y-.45,a[1]],[b[0],y-.45,b[1]],.025,mat);}for(const p of points)rod(group,[p[0],y-.85,p[1]],[p[0],y,p[1]],.035,mat);}
  function fender(group,x,z,scale=1){const m=palette();const tire=new THREE.Mesh(new THREE.TorusGeometry(.31*scale,.115*scale,6,12),m.rubber);tire.position.set(x,.4,z);tire.rotation.y=Math.PI/2;group.add(tire);rod(group,[x,1.1,z],[x,.55,z],.025,m.metal);}
  function createPlayer(){return global.RiverFanBoat.createPlayer();}
  function createTow(){
    const m=palette(),g=new THREE.Group();
    hull(g,23,10.5,1.4,-1.2,m.navy);box(g,9.7,.15,19,0,1.43,.7,m.deck);
    box(g,7,2.8,10,0,2.9,2.6,m.white);box(g,6.6,.25,10.4,0,4.4,2.6,m.orange);
    box(g,4.8,3.6,4.8,0,6.1,1.2,m.white);box(g,4.3,1.2,5.0,0,6.7,1.2,m.glass);
    box(g,5.3,.3,5.3,0,8.08,1.2,m.white);
    for(const x of[-1.8,1.8])cylinder(g,.38,.5,5.8,x,5.4,6,m.dark);
    cylinder(g,.07,.1,3.3,0,9.6,1.2,m.metal);
    for(const x of[-4.9,4.9])rail(g,[[x,-9],[x,8]],2.45,m.metal);
    for(const x of[-3.7,3.7])box(g,1.0,3.0,1.3,x,1.5,-11.5,m.rubber);
    box(g,.25,.25,.5,-2.8,8.2,1.2,m.redLight);box(g,.25,.25,.5,2.8,8.2,1.2,m.green);
    return g;
  }
  function createBargeTrain(){
    const m=palette(),g=new THREE.Group();
    for(let i=0;i<2;i++){
      const barge=new THREE.Group();barge.position.z=-25-i*44;g.add(barge);
      hull(barge,42,14,1.6,-2,m.rust);box(barge,13,.25,39,0,1.73,0,m.barge);
      for(const x of[-6.2,6.2])box(barge,.55,2.2,38,x,2.7,0,m.rust);
      for(const z of[-18,18])box(barge,12.8,2.2,.55,0,2.7,z,m.rust);
      for(let j=0;j<5;j++){
        const cargo=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),m.cargo);cargo.scale.set(5.1,1.8,4.5);cargo.position.set(0,2.4,-14+j*7);barge.add(cargo);
      }
      for(const x of[-5.5,5.5])for(const z of[-17,17])cylinder(barge,.35,.4,.8,x,2.1,z,m.dark);
    }
    const tow=createTow();tow.position.z=8;g.add(tow);
    // Center the convoy bounds so physics matches the visible footprint.
    for(const child of g.children)child.position.z+=35;
    return {mesh:g,length:111,width:14.6};
  }
  function createFreighter(){
    const m=palette(),g=new THREE.Group();
    hull(g,112,19,5.0,-4,m.red);hull(g,112.3,19.1,1.05,-4.2,m.navy);
    box(g,16.5,.3,91,0,5.0,3,m.deck);
    for(let j=0;j<3;j++){
      box(g,14.5,2.6,18,0,6.45,-26+j*22,m.rust);
      box(g,13.9,.2,17.5,0,7.85,-26+j*22,m.barge);
    }
    box(g,15,6.6,15,0,8.6,42,m.white);box(g,16,2.7,11,0,13.2,41,m.white);
    box(g,15.2,1.3,.12,0,13.65,35.4,m.glass);box(g,16.4,.35,11.6,0,14.75,41,m.white);
    for(const x of[-8.05,8.05])box(g,.1,1.2,8,x,13.65,41,m.glass);
    cylinder(g,1.5,1.7,6,0,17.5,45,m.orange);cylinder(g,1.55,1.55,1,0,20.8,45,m.dark);
    cylinder(g,.13,.2,8,0,18.6,38,m.white);
    for(const z of[-35,-6,18]){
      cylinder(g,.32,.65,10,3.7,10,z,m.cargo);
      rod(g,[3.7,14,z],[-6,15,z+5],.28,m.cargo);
      rod(g,[-6,15,z+5],[-6,7,z+5],.035,m.metal);
    }
    for(const x of[-8.3,8.3])rail(g,[[x,-35],[x,31]],6.1,m.metal);
    box(g,.45,.4,.7,-7.8,15.2,38,m.redLight);box(g,.45,.4,.7,7.8,15.2,38,m.green);
    return {mesh:g,length:112,width:19.5};
  }
  function createTraffic(scene,river){
    const traffic=[];traffic.river=river;
    const length=river.length,bridges=river.bridges||[];
    const oldBridge=bridges.find(b=>/Huey|190|Allen/i.test(b.name||''));
    const newBridge=bridges.find(b=>/Wilkinson|I-10|Interstate 10/i.test(b.name||''));
    const oldS=finite(oldBridge?.s,length*.52),newS=finite(newBridge?.s,length*.64);
    const definitions=[
      {s:length*.05,d:1,kind:'tow',speed:2.1},
      {s:length*.16,d:-1,kind:'tow',speed:2.4},
      {s:length*.28,d:1,kind:'ship',speed:3.6},
      {s:length*.41,d:-1,kind:'tow',speed:2.5},
      {s:oldS-950,d:1,kind:'tow',speed:2.2},
      {s:oldS+650,d:-1,kind:'ship',speed:3.5},
      {s:(oldS+newS)*.5,d:1,kind:'tow',speed:2.6},
      {s:newS-950,d:-1,kind:'tow',speed:2.3},
      {s:newS+850,d:1,kind:'ship',speed:3.8},
      {s:length*.76,d:-1,kind:'tow',speed:2.2},
      {s:length*.86,d:1,kind:'tow',speed:2.7},
      {s:length*.95,d:-1,kind:'ship',speed:3.4}
    ];
    // Share detailed geometry/materials and use inexpensive silhouettes at range.
    const prototypes={tow:createBargeTrain(),ship:createFreighter()},far={};
    for(const kind of ['tow','ship']){
      const m=palette(),g=new THREE.Group();
      hull(g,prototypes[kind].length,prototypes[kind].width,kind==='ship'?5:2,-2,kind==='ship'?m.red:m.rust);
      box(g,kind==='ship'?14:12,kind==='ship'?3:2,kind==='ship'?65:80,0,kind==='ship'?6.5:3,kind==='ship'?-9:-8,m.barge);
      box(g,kind==='ship'?15:8,kind==='ship'?9:6,kind==='ship'?15:16,0,kind==='ship'?9.5:5,kind==='ship'?42:43,m.white);
      box(g,kind==='ship'?15.3:8.2,.5,kind==='ship'?15.3:16.3,0,kind==='ship'?14.2:8.2,kind==='ship'?42:43,m.orange);
      far[kind]=g;
    }
    for(let i=0;i<definitions.length;i++){
      const d=definitions[i],built=prototypes[d.kind],lod=new THREE.LOD();
      lod.addLevel(built.mesh.clone(true),0);lod.addLevel(far[d.kind].clone(true),1600);
      const item={mesh:lod,length:built.length,width:built.width,s:clamp(d.s,250,length-250),speed:d.speed,direction:d.d,lane:.25*d.d,kind:d.kind,x:0,z:0,heading:0,phase:i*1.7};
      item.mesh.name=d.kind==='ship'?'River cargo ship':'Loaded barge convoy';item.mesh.userData.traffic=true;scene.add(item.mesh);traffic.push(item);
    }
    updateTraffic(traffic,0,0);return traffic;
  }
  function updateTraffic(traffic,time,dt){
    const river=traffic.river;if(!river)return;dt=clamp(finite(dt),0,.1);
    for(const item of traffic){
      item.s+=item.speed*item.direction*dt;
      const lo=250,hi=river.length-250;
      if(item.s>hi)item.s=lo;if(item.s<lo)item.s=hi;
      const p=river.sample(item.s),nx=-p.tz,nz=p.tx;
      const laneOffset=sideWidth(p,item.direction)*item.lane;
      item.x=p.x+nx*laneOffset;item.z=p.z+nz*laneOffset;
      item.heading=Math.atan2(-p.tx*item.direction,-p.tz*item.direction);
      item.mesh.position.set(item.x,.09*Math.sin(time*.65+item.phase),item.z);
      item.mesh.rotation.set(.0015*Math.sin(time*.5+item.phase),item.heading,.002*Math.sin(time*.7+item.phase));
    }
  }
  function boatVelocity(state){
    const fx=-Math.sin(state.heading),fz=-Math.cos(state.heading),rx=Math.cos(state.heading),rz=-Math.sin(state.heading);
    const driftX=state.driftX+rx*state.lateralSpeed,driftZ=state.driftZ+rz*state.lateralSpeed;
    const cap=state.speed<0?PLAYER_SPEC.maxReverseSpeedMps:PLAYER_SPEC.maxSpeedMps;
    const parallel=driftX*fx+driftZ*fz,perpendicular=driftX*fz-driftZ*fx;
    if(Math.abs(perpendicular)<cap){
      const available=Math.sqrt(Math.max(0,cap*cap-perpendicular*perpendicular));
      if(state.speed>=0)state.speed=Math.min(state.speed,Math.max(0,-parallel+available));
      else state.speed=Math.max(state.speed,Math.min(0,-parallel-available));
    }
    let x=fx*state.speed+driftX,z=fz*state.speed+driftZ;
    const groundSpeed=Math.hypot(x,z);
    if(groundSpeed>cap){const scale=cap/groundSpeed;x*=scale;z*=scale;}
    return {x,z,fx,fz,rx,rz};
  }
  function stepFanBoat(state,input,dt,river,traffic){
    const beforeX=state.x,beforeZ=state.z,beforeHeading=state.heading;
    state.collisionCooldown=Math.max(0,finite(state.collisionCooldown)-dt);state.collision=false;
    const desired=state.hull>0?clamp(finite(input.throttle),-.4,1):0;
    state.throttle=approach(state.throttle,desired,1.35,dt);
    state.rudder=approach(state.rudder,clamp(finite(input.rudder),-1,1),4,dt);
    const waterSpeed=Math.abs(state.speed),planing=clamp((waterSpeed-6)/15,0,1);
    const thrust=state.throttle>=0?5.2*state.throttle*(.45+.55*state.throttle):2.8*state.throttle/.4;
    let acceleration=thrust-.025*state.speed-(.0018-.0005*planing)*state.speed*waterSpeed;
    acceleration-=Math.sign(state.speed)*Math.abs(state.rudder)*planing*waterSpeed*.012;
    if(input.brake)acceleration-=Math.sign(state.speed)*Math.min(6,2.4+waterSpeed*.18);
    if(state.hull<=0)acceleration-=state.speed*.12;
    const previousSpeed=state.speed;
    state.speed+=acceleration*dt;
    if(input.brake&&previousSpeed*state.speed<0)state.speed=0;
    state.speed=clamp(state.speed,-PLAYER_SPEC.maxReverseSpeedMps-12,PLAYER_SPEC.maxSpeedMps+12);
    const authority=clamp(Math.abs(state.speed)/5+Math.abs(state.throttle)*.55,0,1);
    const direction=Math.abs(state.speed)>.3?Math.sign(state.speed):(Math.sign(state.throttle)||1);
    const wantedYaw=-state.rudder*(.55/(1+Math.abs(state.speed)*.085))*authority*direction;
    state.turnRate=approach(state.turnRate,wantedYaw,2.5,dt);
    state.heading=Math.atan2(Math.sin(state.heading+state.turnRate*dt),Math.cos(state.heading+state.turnRate*dt));
    state.lateralSpeed=approach(state.lateralSpeed,clamp(state.turnRate*state.speed*.65,-3.5,3.5),2.4,dt);
    const flow=river.currentAt(state.x,state.z);
    state.driftX=approach(finite(state.driftX,finite(flow.x)),finite(flow.x),1.5,dt);
    state.driftZ=approach(finite(state.driftZ,finite(flow.z)),finite(flow.z),1.5,dt);
    const velocity=boatVelocity(state);let vx=velocity.x,vz=velocity.z;
    state.x+=vx*dt;state.z+=vz*dt;
    let projection=river.project(state.x,state.z);
    const bankTangent=river.sample(projection.s),normalX=-bankTangent.tz,normalZ=bankTangent.tx;
    const sideExtent=Math.abs(velocity.fx*normalX+velocity.fz*normalZ)*PLAYER_SPEC.length*.5+Math.abs(velocity.rx*normalX+velocity.rz*normalZ)*PLAYER_SPEC.width*.5;
    const leftLimit=Math.max(1,sideWidth(projection,-1)-sideExtent-.35),rightLimit=Math.max(1,sideWidth(projection,1)-sideExtent-.35);
    state.grounded=!river.hullInWater&&(projection.offset<-leftLimit+3||projection.offset>rightLimit-3);
    if(state.grounded){state.speed*=Math.exp(-2.4*dt);state.lateralSpeed*=Math.exp(-4*dt);}
    if(!river.hullInWater&&(projection.offset<-leftLimit||projection.offset>rightLimit)){
      const p=river.sample(projection.s),side=projection.offset<0?-1:1,offset=side<0?-leftLimit:rightLimit;
      const crossing=Math.max(0,vx*(-p.tz)*side+vz*p.tx*side);
      state.x=p.x-p.tz*offset;state.z=p.z+p.tx*offset;
      if(crossing>1.2)state.hull=Math.max(0,state.hull-Math.min(12,crossing*.45)*dt);
      state.speed*=Math.exp(-7*dt);state.lateralSpeed*=Math.exp(-7*dt);state.collision=true;
    }
    for(const other of traffic){
      const length=finite(other.length),width=finite(other.width),angle=finite(other.heading),otherSpeed=finite(other.speed);
      const dx=state.x-other.x,dz=state.z-other.z;
      if(Math.abs(dx)+Math.abs(dz)>Math.max(length,width)+30)continue;
      const fx=-Math.sin(angle),fz=-Math.cos(angle),rx=Math.cos(angle),rz=-Math.sin(angle);
      const longitudinal=dx*fx+dz*fz,lateral=dx*rx+dz*rz;
      const alignment=Math.abs(Math.cos(state.heading-angle)),crossingAngle=Math.abs(Math.sin(state.heading-angle));
      const halfLength=length*.5+PLAYER_SPEC.length*.5*alignment+PLAYER_SPEC.width*.5*crossingAngle;
      const halfWidth=width*.5+PLAYER_SPEC.width*.5*alignment+PLAYER_SPEC.length*.5*crossingAngle;
      const alongPen=halfLength-Math.abs(longitudinal),sidePen=halfWidth-Math.abs(lateral);
      if(alongPen<=0||sidePen<=0)continue;
      // Both boats' axes are needed: obstacle axes alone falsely hit diagonal corners.
      const playerAlong=dx*velocity.fx+dz*velocity.fz,playerSide=dx*velocity.rx+dz*velocity.rz;
      const playerAlongLimit=PLAYER_SPEC.length*.5+length*.5*alignment+width*.5*crossingAngle;
      const playerSideLimit=PLAYER_SPEC.width*.5+width*.5*alignment+length*.5*crossingAngle;
      if(Math.abs(playerAlong)>=playerAlongLimit||Math.abs(playerSide)>=playerSideLimit)continue;
      const useSide=sidePen<alongPen,sign=Math.sign(useSide?lateral:longitudinal)||1;
      const nx=(useSide?rx:fx)*sign,nz=(useSide?rz:fz)*sign;
      const push=Math.min((useSide?sidePen:alongPen)+.02,PLAYER_SPEC.maxSpeedMps*dt);
      state.x+=nx*push;state.z+=nz*push;
      const normalRelative=(vx-fx*otherSpeed)*nx+(vz-fz*otherSpeed)*nz;
      if(state.collisionCooldown<=0&&normalRelative<-.25){state.hull=Math.max(0,state.hull-clamp(-normalRelative*.9,1,45));state.collisionCooldown=.7;}
      if(normalRelative<0){vx-=normalRelative*1.03*nx;vz-=normalRelative*1.03*nz;}
      state.speed=(vx-state.driftX)*velocity.fx+(vz-state.driftZ)*velocity.fz;
      state.lateralSpeed=clamp((vx-state.driftX)*velocity.rx+(vz-state.driftZ)*velocity.rz,-3.5,3.5);
      state.collision=true;
    }
    // Bound contact corrections as well as thrust/current motion: no frame teleport.
    const dx=state.x-beforeX,dz=state.z-beforeZ,distance=Math.hypot(dx,dz),budget=PLAYER_SPEC.maxSpeedMps*dt;
    if(distance>budget){state.x=beforeX+dx*budget/distance;state.z=beforeZ+dz*budget/distance;}
    constrainMappedShore(state,{x:beforeX,z:beforeZ,heading:beforeHeading},river,dt);
    state.groundSpeed=Math.min(PLAYER_SPEC.maxSpeedMps,Math.hypot(state.x-beforeX,state.z-beforeZ)/dt);
    projection=river.project(state.x,state.z);state.s=projection.s;
    state.bankDistance=Math.min(sideWidth(projection,-1)+projection.offset,sideWidth(projection,1)-projection.offset);
    state.planing=clamp((Math.abs(state.speed)-6)/15,0,1);state.draft=PLAYER_SPEC.draft-.08*state.planing;
    state.roll=approach(state.roll,-state.rudder*clamp(Math.abs(state.speed)*.0025,0,.105),3,dt);
    state.pitch=approach(state.pitch,.045*state.planing+clamp(acceleration,-6,6)*.003,2.5,dt);
    state.wakeStrength=clamp(Math.abs(state.speed)/PLAYER_SPEC.maxSpeedMps,0,1);
    const power=state.throttle<0?Math.abs(state.throttle)/.4:state.throttle;
    state.engineRPM=PLAYER_SPEC.idleRPM+(PLAYER_SPEC.maxRPM-PLAYER_SPEC.idleRPM)*Math.sqrt(clamp(power,0,1));
  }
  function constrainMappedShore(state,before,river,dt){
    if(!river.hullInWater||river.hullInWater(state.x,state.z,state.heading,PLAYER_SPEC.length,PLAYER_SPEC.width))return;
    const targetX=state.x,targetZ=state.z,turn=Math.atan2(Math.sin(state.heading-before.heading),Math.cos(state.heading-before.heading));
    const vx=(targetX-before.x)/Math.max(dt,1e-6),vz=(targetZ-before.z)/Math.max(dt,1e-6);
    const normals=river.shoreContact?.(targetX,targetZ,state.heading,PLAYER_SPEC.length,PLAYER_SPEC.width);
    const impactSpeed=normals?normals.reduce((speed,n)=>Math.max(speed,vx*n.x+vz*n.z),0):Math.hypot(vx,vz);
    let lo=0,hi=1;
    if(river.hullInWater(before.x,before.z,before.heading,PLAYER_SPEC.length,PLAYER_SPEC.width)){
      for(let i=0;i<12;i++){const t=(lo+hi)/2;
        if(river.hullInWater(before.x+(targetX-before.x)*t,before.z+(targetZ-before.z)*t,before.heading+turn*t,PLAYER_SPEC.length,PLAYER_SPEC.width))lo=t;else hi=t;
      }
    }
    state.x=before.x+(targetX-before.x)*lo;state.z=before.z+(targetZ-before.z)*lo;state.heading=before.heading+turn*lo;
    impact(state,impactSpeed,.45);
    state.speed*=Math.exp(-7*dt);state.lateralSpeed*=Math.exp(-7*dt);state.turnRate*=.5;state.grounded=true;
  }
  function rampFrame(ramp,x,z){const fx=-Math.sin(ramp.heading),fz=-Math.cos(ramp.heading),rx=Math.cos(ramp.heading),rz=-Math.sin(ramp.heading),dx=x-ramp.x,dz=z-ramp.z;return {fx,fz,rx,rz,along:dx*fx+dz*fz,side:dx*rx+dz*rz};}
  function rampSlope(ramp){return (finite(ramp.lipHeight,finite(ramp.height,4))-finite(ramp.entryHeight,-.28))/Math.max(1,finite(ramp.length,36));}
  function rampY(ramp,along){return Math.max(0,finite(ramp.entryHeight,-.28)+(along/ramp.length+.5)*(finite(ramp.lipHeight,finite(ramp.height,4))-finite(ramp.entryHeight,-.28))+PLAYER_SPEC.draft);}
  function bodyContact(state,body){
    const angle=finite(body.heading),fx=-Math.sin(angle),fz=-Math.cos(angle),rx=Math.cos(angle),rz=-Math.sin(angle),dx=state.x-body.x,dz=state.z-body.z;
    const length=finite(body.length),width=finite(body.width);if(Math.abs(dx)+Math.abs(dz)>Math.max(length,width)+30)return null;
    const alignment=Math.abs(Math.cos(state.heading-angle)),crossing=Math.abs(Math.sin(state.heading-angle));
    const along=dx*fx+dz*fz,side=dx*rx+dz*rz,ap=length*.5+PLAYER_SPEC.length*.5*alignment+PLAYER_SPEC.width*.5*crossing-Math.abs(along),sp=width*.5+PLAYER_SPEC.width*.5*alignment+PLAYER_SPEC.length*.5*crossing-Math.abs(side);
    if(ap<=0||sp<=0)return null;const pfx=-Math.sin(state.heading),pfz=-Math.cos(state.heading),prx=Math.cos(state.heading),prz=-Math.sin(state.heading);
    if(Math.abs(dx*pfx+dz*pfz)>=PLAYER_SPEC.length*.5+length*.5*alignment+width*.5*crossing||Math.abs(dx*prx+dz*prz)>=PLAYER_SPEC.width*.5+width*.5*alignment+length*.5*crossing)return null;
    const lateral=sp<ap,sign=Math.sign(lateral?side:along)||1;return {nx:(lateral?rx:fx)*sign,nz:(lateral?rz:fz)*sign,depth:lateral?sp:ap};
  }
  function bodyTop(body){return finite(body.maxHeight,finite(body.maxObstacleHeight,finite(body.height,body.kind==='bridge-pier'?70:body.kind==='historic-ship'?30:body.kind==='ship'?18:body.kind==='mooring-dolphin'?5:10)))+finite(body.y);}
  function impact(state,speed,scale=1){if(state.collisionCooldown<=0&&speed>.5){state.hull=Math.max(0,state.hull-clamp(speed*scale,1,45));state.collisionCooldown=.7;}state.collision=true;}
  function updatePositionInfo(state,river){const p=river.project(state.x,state.z);state.s=p.s;state.bankDistance=Math.min(sideWidth(p,-1)+p.offset,sideWidth(p,1)-p.offset);}
  function zeroPower(state){state.throttle=0;state.rudder=0;state.turnRate=0;state.speed=0;state.lateralSpeed=0;state.driftX=0;state.driftZ=0;state.wakeStrength=0;state.engineRPM=PLAYER_SPEC.idleRPM;}
  function toggleAnchor(state,river){
    if(state.anchorState==='setting'||state.anchorState==='down'){state.anchorState='up';state.anchorVX=0;state.anchorVZ=0;return {ok:true,action:'raised'};}
    if(state.airborne||state.onRamp)return {ok:false,action:'rejected',reason:'Wait until the boat is back on the water.'};
    if(state.groundedOnLand||state.grounded)return {ok:false,action:'rejected',reason:'Recover to open water before dropping anchor.'};
    const flow=river.currentAt(state.x,state.z),copy={...state,heading:finite(state.heading),speed:finite(state.speed),lateralSpeed:finite(state.lateralSpeed),driftX:finite(state.driftX,finite(flow.x)),driftZ:finite(state.driftZ,finite(flow.z))},v=boatVelocity(copy);
    if(Math.max(finite(state.groundSpeed),Math.hypot(v.x,v.z))>PLAYER_SPEC.anchorMaxSpeedMps+1e-8)return {ok:false,action:'rejected',reason:'Slow below 4 knots before dropping anchor.'};
    state.anchorState='setting';state.anchorVX=v.x;state.anchorVZ=v.z;state.anchorX=state.x;state.anchorZ=state.z;state.anchorTimer=0;state.throttle=0;state.anchorBreakEvent=false;return {ok:true,action:'setting'};
  }
  function stepAnchor(state,dt,river,traffic){
    const x=state.x,z=state.z;zeroPower(state);state.y=0;state.vy=0;state.airborne=false;state.onRamp=false;state.grounded=false;
    if(state.anchorState==='setting'){
      const decay=Math.exp(-4*dt);state.x+=finite(state.anchorVX)*(1-decay)/4;state.z+=finite(state.anchorVZ)*(1-decay)/4;state.anchorVX*=decay;state.anchorVZ*=decay;state.anchorTimer+=dt;
      if(state.anchorTimer>=1.1||Math.hypot(state.anchorVX,state.anchorVZ)<.025){state.anchorState='down';state.anchorX=state.x;state.anchorZ=state.z;state.anchorVX=0;state.anchorVZ=0;}
    }else{state.x=finite(state.anchorX,state.x);state.z=finite(state.anchorZ,state.z);}
    constrainMappedShore(state,{x,z,heading:state.heading},river,dt);
    if(state.grounded){state.anchorState='up';state.anchorBreakEvent=true;}
    state.groundSpeed=Math.hypot(state.x-x,state.z-z)/dt;state.roll=approach(state.roll,0,3,dt);state.pitch=approach(state.pitch,0,3,dt);
    // An anchor resists current, not a moving vessel striking the hull.
    for(const body of traffic)if(bodyContact(state,body)){state.anchorState='up';state.anchorBreakEvent=true;impact(state,Math.abs(finite(body.speed)),1);break;}
    updatePositionInfo(state,river);
  }
  function launch(state,ramp,speed){
    const f=rampFrame(ramp,state.x,state.z),angle=Math.atan(rampSlope(ramp));state.onRamp=false;state.airborne=true;state.rampId=null;state.rampCooldown=1;
    state.airVX=f.fx*speed*Math.cos(angle);state.airVZ=f.fz*speed*Math.cos(angle);state.vy=speed*Math.sin(angle);state.speed=speed*Math.cos(angle);state.airTime=0;state.flightMaxHeight=state.y;state.grounded=false;state.wakeStrength=0;
    state.lastTakeoff={x:state.x,z:state.z,y:state.y,vx:state.airVX,vz:state.airVZ,vy:state.vy,speed,angle,rampId:ramp.id};state.takeoffEvent=true;
  }
  function landingSurface(state,river,x,z){
    let highest=0,kind='water';const fx=-Math.sin(state.heading),fz=-Math.cos(state.heading),rx=Math.cos(state.heading),rz=-Math.sin(state.heading);
    for(const [a,b]of [[0,0],[PLAYER_SPEC.length/2,PLAYER_SPEC.width/2],[PLAYER_SPEC.length/2,-PLAYER_SPEC.width/2],[-PLAYER_SPEC.length/2,PLAYER_SPEC.width/2],[-PLAYER_SPEC.length/2,-PLAYER_SPEC.width/2]]){
      const px=x+fx*a+rx*b,pz=z+fz*a+rz*b,terrain=river.terrainAt?.(px,pz);
      if(Number.isFinite(terrain)&&!(river.isWater?.(px,pz))){const h=terrain+PLAYER_SPEC.draft;if(h>highest){highest=h;kind='land';}}
      else if(!river.terrainAt){const p=river.project(px,pz);if(p.offset<-sideWidth(p,-1)||p.offset>sideWidth(p,1)){highest=Math.max(highest,.15+PLAYER_SPEC.draft);kind='land';}}
    }
    return {height:highest,kind};
  }
  function finishLanding(state,river,traffic,surface){
    const takeoff=state.lastTakeoff||{x:state.x,z:state.z,speed:0,angle:0},impactVy=state.vy,beforeSpeed=Math.hypot(state.airVX,state.airVZ),flightTime=state.airTime;
    const travelHeading=Math.atan2(-state.airVX,-state.airVZ),yawError=Math.abs(Math.atan2(Math.sin(state.heading-travelHeading),Math.cos(state.heading-travelHeading)));
    const damage=Math.max(0,-impactVy-13)*2.5+Math.max(0,yawError-.55)*12+(surface.kind==='water'?0:12);if(damage>0)state.hull=Math.max(0,state.hull-Math.min(45,damage));
    state.y=surface.height;state.vy=0;state.airborne=false;state.onRamp=false;state.rampId=null;state.landingEvent=true;state.groundedOnLand=surface.kind!=='water';state.grounded=state.groundedOnLand;
    const damping=surface.kind==='water'?clamp(.82-Math.max(0,-impactVy-8)*.008,.68,.82):0;
    const flow=river.currentAt(state.x,state.z),vx=state.airVX*damping,vz=state.airVZ*damping,fx=-Math.sin(state.heading),fz=-Math.cos(state.heading);
    state.driftX=finite(flow.x);state.driftZ=finite(flow.z);state.speed=(vx-state.driftX)*fx+(vz-state.driftZ)*fz;state.lateralSpeed=clamp((vx-state.driftX)*Math.cos(state.heading)-(vz-state.driftZ)*Math.sin(state.heading),-3.5,3.5);state.groundSpeed=Math.hypot(vx,vz);
    state.lastJump={flightTime,maxHeight:state.flightMaxHeight,distance:Math.hypot(state.x-takeoff.x,state.z-takeoff.z),launchSpeed:takeoff.speed,launchAngle:takeoff.angle};
    state.lastLanding={x:state.x,z:state.z,impactVy,flightTime,speedBefore:beforeSpeed,speedAfter:state.groundSpeed,surface:surface.kind};state.pitch=-Math.min(.16,Math.abs(impactVy)*.008);state.wakeStrength=0;
    if(surface.kind==='obstacle'){const body=traffic[surface.bodyIndex];state.restingBodyIndex=surface.bodyIndex;state.supportOffsetX=state.x-body.x;state.supportOffsetZ=state.z-body.z;}
    if(state.groundedOnLand)zeroPower(state);updatePositionInfo(state,river);
  }
  function stepAir(state,input,dt,river,traffic){
    const oldX=state.x,oldZ=state.z,oldY=state.y,oldVy=state.vy;
    state.throttle=approach(state.throttle,clamp(finite(input.throttle),-.4,1),1.35,dt);state.rudder=approach(state.rudder,0,4,dt);state.turnRate=0;
    let duration=dt,nextX=oldX+state.airVX*dt,nextZ=oldZ+state.airVZ*dt,surface=landingSurface(state,river,nextX,nextZ),landing=false;
    const predicted=oldY+oldVy*dt-.5*GRAVITY*dt*dt;
    if(oldY>=surface.height-1e-8&&predicted<=surface.height&&oldVy-GRAVITY*dt<0){duration=clamp((oldVy+Math.sqrt(Math.max(0,oldVy*oldVy+2*GRAVITY*(oldY-surface.height))))/GRAVITY,0,dt);landing=true;}
    state.x=oldX+state.airVX*duration;state.z=oldZ+state.airVZ*duration;state.y=oldY+oldVy*duration-.5*GRAVITY*duration*duration;state.vy=oldVy-GRAVITY*duration;state.airTime+=duration;
    state.flightMaxHeight=Math.max(state.flightMaxHeight,oldY,state.y,oldVy>0&&state.vy<0?oldY+oldVy*oldVy/(2*GRAVITY):state.y);
    if(surface.kind==='land'&&oldY<surface.height-.05){state.x=oldX;state.z=oldZ;impact(state,Math.hypot(state.airVX,state.airVZ),.65);state.airVX*=-.12;state.airVZ*=-.12;landing=false;surface=landingSurface(state,river,state.x,state.z);}
    for(let index=0;index<traffic.length;index++){
      const body=traffic[index],top=bodyTop(body);if(state.y-PLAYER_SPEC.draft>top||state.y+3.7<finite(body.minY))continue;const contact=bodyContact(state,body);if(!contact)continue;
      if(oldY-PLAYER_SPEC.draft>=top&&state.y-PLAYER_SPEC.draft<=top&&state.vy<0){surface={height:top+PLAYER_SPEC.draft,kind:'obstacle',bodyIndex:index};landing=true;state.y=surface.height;break;}
      const bf=-Math.sin(finite(body.heading))*finite(body.speed),bz=-Math.cos(finite(body.heading))*finite(body.speed),normal=(state.airVX-bf)*contact.nx+(state.airVZ-bz)*contact.nz;
      const push=Math.min(contact.depth+.02,PLAYER_SPEC.maxSpeedMps*dt);state.x+=contact.nx*push;state.z+=contact.nz*push;if(normal<0){impact(state,-normal,.8);state.airVX-=normal*1.05*contact.nx;state.airVZ-=normal*1.05*contact.nz;}
    }
    state.groundSpeed=Math.hypot(state.airVX,state.airVZ);state.speed=state.groundSpeed;state.wakeStrength=0;state.roll=approach(state.roll,-state.rudder*.08,2,dt);state.pitch=approach(state.pitch,clamp(Math.atan2(state.vy,Math.max(1,state.groundSpeed)),-.45,.45),3,dt);
    state.engineRPM=PLAYER_SPEC.idleRPM+(PLAYER_SPEC.maxRPM-PLAYER_SPEC.idleRPM)*Math.sqrt(clamp(Math.abs(state.throttle),0,1));updatePositionInfo(state,river);
    if(landing){finishLanding(state,river,traffic,surface);const remainder=dt-duration;if(remainder>1e-6&&!state.groundedOnLand)stepFanBoat(state,input,remainder,river,traffic);}
  }
  function stepRamp(state,input,dt,river,traffic){
    const ramp=(river.ramps||[]).find(r=>r.id===state.rampId);if(!ramp){state.onRamp=false;state.y=0;state.vy=0;return;}
    const f=rampFrame(ramp,state.x,state.z),angle=Math.atan(rampSlope(ramp)),cos=Math.cos(angle),acceleration=GRAVITY*Math.sin(angle),oldY=state.y,oldSpeed=state.rampSpeed;
    const predicted=oldSpeed-acceleration*dt;let along=f.along+(oldSpeed+predicted)*.5*cos*dt;const height=rampY(ramp,along),available=oldSpeed*oldSpeed-2*GRAVITY*(height-oldY);
    if(available<0){const top=oldY+oldSpeed*oldSpeed/(2*GRAVITY);along=(top-PLAYER_SPEC.draft-finite(ramp.entryHeight,-.28))/rampSlope(ramp)-ramp.length/2;state.rampSpeed=0;}else state.rampSpeed=Math.sign(predicted||-1)*Math.sqrt(Math.max(0,available));
    state.heading=ramp.heading;state.turnRate=0;state.rudder=approach(state.rudder,finite(input.rudder),4,dt);state.pitch=angle;state.roll=approach(state.roll,0,4,dt);state.wakeStrength=0;state.grounded=false;
    if(along>=ramp.length/2&&oldSpeed>0){
      const lipY=rampY(ramp,ramp.length/2),lipSpeed=Math.sqrt(Math.max(0,oldSpeed*oldSpeed-2*GRAVITY*(lipY-oldY))),distance=(ramp.length/2-f.along)/cos;
      const used=acceleration>1e-9?clamp((oldSpeed-Math.sqrt(Math.max(0,oldSpeed*oldSpeed-2*acceleration*distance)))/acceleration,0,dt):clamp(distance/Math.max(.01,oldSpeed),0,dt);
      state.x=ramp.x+f.fx*ramp.length/2+f.rx*state.rampOffset;state.z=ramp.z+f.fz*ramp.length/2+f.rz*state.rampOffset;state.y=lipY;launch(state,ramp,lipSpeed);if(dt-used>1e-8)stepAir(state,input,dt-used,river,traffic);return;
    }
    if(along<=-ramp.length/2&&state.rampSpeed<0){state.onRamp=false;state.rampId=null;state.rampCooldown=.8;state.y=0;state.vy=0;state.speed=state.rampSpeed;state.driftX=0;state.driftZ=0;state.x=ramp.x-f.fx*(ramp.length/2+.05)+f.rx*state.rampOffset;state.z=ramp.z-f.fz*(ramp.length/2+.05)+f.rz*state.rampOffset;return;}
    state.x=ramp.x+f.fx*along+f.rx*state.rampOffset;state.z=ramp.z+f.fz*along+f.rz*state.rampOffset;state.y=rampY(ramp,along);state.vy=state.rampSpeed*Math.sin(angle);state.speed=state.rampSpeed*cos;state.groundSpeed=Math.abs(state.speed);updatePositionInfo(state,river);
    for(const body of traffic)if(state.y-PLAYER_SPEC.draft<bodyTop(body)&&bodyContact(state,body)){impact(state,Math.abs(state.rampSpeed),.8);state.rampSpeed=0;}
  }
  function meetRamps(state,before,input,dt,river,traffic){
    for(const ramp of river.ramps||[]){
      const f=rampFrame(ramp,state.x,state.z),old=rampFrame(ramp,before.x,before.z);if(Math.abs(f.along)>ramp.length/2+PLAYER_SPEC.length||Math.abs(f.side)>ramp.width/2+PLAYER_SPEC.length)continue;
      const alignment=Math.cos(state.heading-ramp.heading),sideExtent=PLAYER_SPEC.width*.5*Math.abs(alignment)+PLAYER_SPEC.length*.5*Math.abs(Math.sin(state.heading-ramp.heading)),clear=Math.abs(f.side)<ramp.width/2-sideExtent-.25;
      const v=boatVelocity(state),forward=v.x*f.fx+v.z*f.fz,entry=-ramp.length/2,approachClear=alignment>.85&&clear&&forward>1.5;
      if(state.rampCooldown<=0&&old.along<entry&&f.along>=entry&&approachClear){
        const fraction=clamp((entry-old.along)/(f.along-old.along),0,1);state.rampOffset=old.side+(f.side-old.side)*fraction;state.x=ramp.x+f.fx*entry+f.rx*state.rampOffset;state.z=ramp.z+f.fz*entry+f.rz*state.rampOffset;state.y=rampY(ramp,entry);state.onRamp=true;state.rampId=ramp.id;state.rampSpeed=Math.min(PLAYER_SPEC.maxSpeedMps,forward);state.lateralSpeed=0;state.driftX=0;state.driftZ=0;stepRamp(state,input,dt*(1-fraction),river,traffic);return;
      }
      if(f.along<entry&&approachClear)continue;
      const contact=bodyContact(state,ramp);if(!contact)continue;const normal=v.x*contact.nx+v.z*contact.nz,push=Math.min(contact.depth+.02,PLAYER_SPEC.maxSpeedMps*dt);state.x+=contact.nx*push;state.z+=contact.nz*push;
      if(normal<0){impact(state,-normal,.55);const vx=v.x-normal*1.02*contact.nx,vz=v.z-normal*1.02*contact.nz;state.speed=(vx-state.driftX)*v.fx+(vz-state.driftZ)*v.fz;state.lateralSpeed=clamp((vx-state.driftX)*v.rx+(vz-state.driftZ)*v.rz,-3.5,3.5);}state.collision=true;
    }
  }
  function stepBoat(state,input,dt,river,traffic=[]){
    dt=clamp(finite(dt),0,.08);input=input||{};
    state.x=finite(state.x);state.z=finite(state.z);state.heading=finite(state.heading);
    state.speed=clamp(finite(state.speed),-PLAYER_SPEC.maxReverseSpeedMps-12,PLAYER_SPEC.maxSpeedMps+12);
    state.hull=clamp(finite(state.hull,100),0,100);state.throttle=clamp(finite(state.throttle),-.4,1);state.rudder=clamp(finite(state.rudder),-1,1);
    for(const key of['turnRate','lateralSpeed','roll','pitch','y','vy','airVX','airVZ','airTime','flightMaxHeight','rampCooldown'])state[key]=finite(state[key]);
    if(!['up','setting','down'].includes(state.anchorState))state.anchorState='up';state.landingEvent=false;state.takeoffEvent=false;state.anchorBreakEvent=false;
    if(dt===0)return state;
    const estimatedSpeed=Math.min(PLAYER_SPEC.maxSpeedMps,Math.max(Math.hypot(state.airVX,state.airVZ),Math.abs(state.speed)+Math.hypot(finite(state.driftX),finite(state.driftZ))+5));
    const steps=Math.max(1,Math.ceil(dt/Math.min(1/60,PLAYER_SPEC.maxSubstepDistance/Math.max(estimatedSpeed,1))));
    let collided=false;for(let i=0;i<steps;i++){
      const step=dt/steps;state.collision=false;state.rampCooldown=Math.max(0,state.rampCooldown-step);
      if(state.anchorState!=='up'){state.collisionCooldown=Math.max(0,finite(state.collisionCooldown)-step);stepAnchor(state,step,river,traffic);}
      else if(state.groundedOnLand){zeroPower(state);state.grounded=true;if(Number.isInteger(state.restingBodyIndex)&&traffic[state.restingBodyIndex]){const body=traffic[state.restingBodyIndex];state.x=body.x+state.supportOffsetX;state.z=body.z+state.supportOffsetZ;state.y=bodyTop(body)+PLAYER_SPEC.draft;}state.groundSpeed=0;updatePositionInfo(state,river);}
      else if(state.airborne){state.collisionCooldown=Math.max(0,finite(state.collisionCooldown)-step);stepAir(state,input,step,river,traffic);}
      else if(state.onRamp){state.collisionCooldown=Math.max(0,finite(state.collisionCooldown)-step);stepRamp(state,input,step,river,traffic);}
      else{const before={x:state.x,z:state.z,heading:state.heading};state.y=0;state.vy=0;stepFanBoat(state,input,step,river,traffic);meetRamps(state,before,input,step,river,traffic);if(!state.onRamp&&!state.airborne){constrainMappedShore(state,before,river,step);state.groundSpeed=Math.min(PLAYER_SPEC.maxSpeedMps,Math.hypot(state.x-before.x,state.z-before.z)/step);updatePositionInfo(state,river);}}
      collided=collided||state.collision;
    }
    state.collision=collided;state.physicsSubsteps=steps;return state;
  }

  global.RiverVessels={PLAYER_SPEC,GRAVITY,createPlayer,createTraffic,updateTraffic,stepBoat,toggleAnchor};
})(typeof window!=='undefined'?window:globalThis);

