/* Fictional floating stunt ramps. These are game objects, not real river assets.
 * Coordinates: forward = (-sin heading,-cos heading), boat bow local -Z.
 * Deck along a runs from -length/2 (entryHeight) to +length/2 (lipHeight).
 * Physics and rendered surface share the exact same linear slope.
 */
(function(root){
  'use strict';
  const settings=Object.freeze({count:18,approachLength:420,landingLength:180,shoreMargin:22,bridgeClearance:750,spacing:1250,sampleStep:8});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function seedValue(seed){if(seed===undefined)return Math.floor(Math.random()*4294967296)>>>0;if(typeof seed==='number'&&Number.isFinite(seed))return seed>>>0;const s=String(seed);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function point(ramp,along,lateral=0){const fx=-Math.sin(ramp.heading),fz=-Math.cos(ramp.heading),rx=Math.cos(ramp.heading),rz=-Math.sin(ramp.heading);return{x:ramp.x+fx*along+rx*lateral,z:ramp.z+fz*along+rz*lateral};}
  function deckHeight(ramp,along){return ramp.entryHeight+(along+ramp.length*.5)*ramp.slope;}
  function dimensions(ramp){return Number.isFinite(ramp.x)&&Number.isFinite(ramp.z)&&Number.isFinite(ramp.heading)&&ramp.length>=25&&ramp.length<=45&&ramp.width>=14&&ramp.width<=20&&ramp.height>=3&&ramp.height<=6;}
  function obstacleDistance(p,o){const h=Number(o.heading)||0,dx=p.x-o.x,dz=p.z-o.z,a=dx*-Math.sin(h)+dz*-Math.cos(h),l=dx*Math.cos(h)-dz*Math.sin(h);return Math.hypot(Math.max(0,Math.abs(a)-(Number(o.length)||0)*.5),Math.max(0,Math.abs(l)-(Number(o.width)||0)*.5));}
  function validatePlacement(ramp,river,options={}){
    if(!dimensions(ramp))return{valid:false,reason:'invalid-dimensions',samples:0};
    if(typeof options.isWater!=='function')throw Error('Ramp placement requires the mapped isWater(x,z) test.');
    const start=-ramp.length*.5-settings.approachLength,end=ramp.length*.5+settings.landingLength,steps=Math.ceil((end-start)/settings.sampleStep),obstacles=options.obstacles||[],bridges=river.bridges||[];
    const corridorHalf=ramp.width*.5+settings.shoreMargin;
    let samples=0;
    for(let i=0;i<=steps;i++){
      const along=start+(end-start)*i/steps,p=point(ramp,along),projection=river.project(p.x,p.z),s=projection.s;
      if(s<80||s>river.length-80||(projection.longitudinalOverflow||0)>0)return{valid:false,reason:'route-boundary',samples};
      if(bridges.some(b=>Number.isFinite(b.s)&&Math.abs(s-b.s)<settings.bridgeClearance))return{valid:false,reason:'bridge-approach',samples};
      const cross=river.sample(s),left=cross.leftWidth||cross.width*.5,right=cross.rightWidth||cross.width*.5;
      if(projection.offset-corridorHalf<-left||projection.offset+corridorHalf>right)return{valid:false,reason:'bank-clearance',samples};
      // Existing barge/freighter traffic uses these quarter-half-width lanes.
      // Reserve 22 m around each lane in addition to the full stunt corridor.
      if(Math.min(Math.abs(projection.offset+left*.25),Math.abs(projection.offset-right*.25))<corridorHalf+22)return{valid:false,reason:'shipping-lane',samples};
      for(const o of obstacles){if(!Number.isFinite(o.x)||!Number.isFinite(o.z))continue;const cultural=/kidd|museum|berth/i.test((o.name||'')+' '+(o.kind||'')),padding=cultural?400:90;if(obstacleDistance(p,o)<corridorHalf+padding)return{valid:false,reason:cultural?'cultural-berth':'static-obstacle',samples};}
      // Cover the center, edges and intermediate strips, including the widened
      // approach/landing zone. Public polygons, rather than width alone, decide.
      for(let j=0;j<=8;j++){const q=point(ramp,along,-corridorHalf+j*corridorHalf*.25);samples++;if(!options.isWater(q.x,q.z))return{valid:false,reason:'mapped-land',samples};}
    }
    return{valid:true,reason:'clear',samples,approachLength:settings.approachLength,landingLength:settings.landingLength,corridorHalfWidth:corridorHalf};
  }
  function generate(river,options={}){
    if(!river||typeof river.sample!=='function'||typeof river.project!=='function')throw Error('Ramp placement requires a sampled river.');
    const seed=seedValue(options.seed),rng=random(seed),ramps=[],failures={};
    const requested=Math.max(1,Math.min(24,Math.floor(options.count||settings.count)));
    const newBridge=(river.bridges||[]).find(b=>/Wilkinson|I-10|INTERSTATE 10/i.test((b.name||'')+' '+(b.road||''))),practiceS=clamp((newBridge?.s||river.length*.64)-1150,800,river.length-900);
    function candidate(s,practice){
      const p=river.sample(s),side=rng()<.5?-1:1,half=side<0?(p.leftWidth||p.width*.5):(p.rightWidth||p.width*.5),offset=rng()<.4?0:side*half*(.59+rng()*.075),heading=Math.atan2(-p.tx,-p.tz)+(rng()-.5)*.045;
      const length=34+rng()*8,width=16+rng()*4,height=3.4+rng()*1.8,entryHeight=-.28;
      const r={id:'ramp-'+seed.toString(36)+'-'+ramps.length.toString(36),kind:'stunt-ramp',fictional:true,x:p.x-p.tz*offset,z:p.z+p.tx*offset,s,heading,length,width,height,entryHeight,lipHeight:height,slope:(height-entryHeight)/length,maxObstacleHeight:height,speed:0,practice:!!practice,forward:{x:-Math.sin(heading),z:-Math.cos(heading)},approachLength:settings.approachLength,landingLength:settings.landingLength};
      if(ramps.some(q=>Math.abs(q.s-r.s)<settings.spacing||Math.hypot(q.x-r.x,q.z-r.z)<700))return null;
      const check=validatePlacement(r,river,options);if(!check.valid){failures[check.reason]=(failures[check.reason]||0)+1;return null;}
      const position=point(r,-length*.5-395),target=point(r,length*.5);
      r.practiceView={position,target:{x:target.x,y:r.height+1,z:target.z},heading:r.heading};
      r.placement={waterSamples:check.samples,corridorHalfWidth:check.corridorHalfWidth,trafficLaneClearance:22,bridgeClearance:settings.bridgeClearance};
      ramps.push(r);return r;
    }
    // A downtown practice ramp is attempted first, then stratified positions
    // spread the remaining ramps over the real 64 km course without clustering.
    for(let i=0;i<160&&!ramps.length;i++)candidate(clamp(practiceS+(rng()-.5)*650,800,river.length-900),true);
    const span=Math.max(1,river.length-2200),slots=requested-ramps.length;
    for(let i=0;i<slots&&ramps.length<requested;i++)for(let t=0;t<60;t++){const s=1100+(i+.12+rng()*.76)/Math.max(1,slots)*span;if(candidate(s,false))break;}
    for(let i=0;i<900&&ramps.length<requested;i++)candidate(800+rng()*Math.max(1,river.length-1800),false);
    if(ramps.length&&!ramps.some(r=>r.practice))ramps[0].practice=true;
    Object.defineProperties(ramps,{seed:{value:seed,enumerable:false},diagnostics:{value:{requested,placed:ramps.length,failures},enumerable:false}});
    return ramps;
  }
  function practiceView(ramps){const r=ramps.find(r=>r.practice)||ramps[0];if(!r)return null;return{name:'Jump ramps · practice approach',s:r.s,heading:r.heading,rampId:r.id,fictional:true,view:r.practiceView,position:r.practiceView.position,lookAt:r.practiceView.target,cameraHeight:7,cameraFov:57};}
  function create(scene,ramps){
    const T=root.THREE;if(!T)throw Error('Three.js must load before ramp rendering.');
    const group=new T.Group();group.name='Fictional floating jump ramps';group.userData.ramps=ramps;group.userData.fictional=true;scene.add(group);
    const materials={deck:new T.MeshStandardMaterial({color:0x294b51,roughness:.92,metalness:.24,side:T.DoubleSide}),metal:new T.MeshStandardMaterial({color:0x9ba5a2,roughness:.59,metalness:.65}),float:new T.MeshStandardMaterial({color:0x455d5c,roughness:.72,metalness:.43}),dark:new T.MeshStandardMaterial({color:0x20282a,roughness:.86}),orange:new T.MeshStandardMaterial({color:0xf08a24,roughness:.66}),yellow:new T.MeshStandardMaterial({color:0xf2c44d,roughness:.7,side:T.DoubleSide}),white:new T.MeshStandardMaterial({color:0xe8e7d5,roughness:.8,side:T.DoubleSide})};
    const geometry={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,12)},batches=new Map(),surfaces=new Map(),dummy=new T.Object3D();
    function transform(r,a,l,y){const p=point(r,a,l);return[p.x,y,p.z];}
    function tri(mat,a,b,c){if(!surfaces.has(mat))surfaces.set(mat,[]);surfaces.get(mat).push(...a,...b,...c);}
    function quad(mat,a,b,c,d){tri(mat,a,b,d);tri(mat,b,c,d);}
    function instance(kind,mat,r,a,l,y,sx,sy,sz,angle=0){dummy.position.fromArray(transform(r,a,l,y));dummy.rotation.set(0,r.heading+angle,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();const key=kind+':'+mat;if(!batches.has(key))batches.set(key,{kind,mat,matrices:[]});batches.get(key).matrices.push(dummy.matrix.clone());}
    function beam(mat,a,b,width){const v=new T.Vector3(...b).sub(new T.Vector3(...a));dummy.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());dummy.scale.set(width,v.length(),width);dummy.updateMatrix();const key='box:'+mat;if(!batches.has(key))batches.set(key,{kind:'box',mat,matrices:[]});batches.get(key).matrices.push(dummy.matrix.clone());}
    function deckPoint(r,a,l,lift=.025){return transform(r,a,l,deckHeight(r,a)+lift);}
    for(const r of ramps){
      const half=r.length*.5,w=r.width*.5;
      quad('deck',deckPoint(r,-half,-w,0),deckPoint(r,-half,w,0),deckPoint(r,half,w,0),deckPoint(r,half,-w,0));
      // Side floats and open structural braces support the sloping steel deck.
      // Entry remains submerged and unobstructed across the usable deck.
      for(const side of[-1,1]){
        const l=side*(w-.8);instance('box','float',r,0,l,-.55,1.4,.95,r.length+1.6);instance('box','metal',r,0,l,-.02,1.5,.16,r.length+.6);
        for(let a=-half+6;a<half-1;a+=6){const y=deckHeight(r,a);beam('metal',transform(r,a,l,-.1),transform(r,a,l,y-.12),.3);beam('metal',transform(r,a-5,l,-.1),transform(r,a,l,y-.12),.2);}
        const a=transform(r,-half,side*w,r.entryHeight-.1),b=transform(r,half,side*w,r.height-.1);beam('orange',a,b,.24);
        // Alternating bands on a narrow deck edge are readily visible at speed.
        for(let t=-half;t<half;t+=1.5){const end=Math.min(half,t+1.5),outer=side*(w-.04),inner=side*(w-.78);quad(Math.floor((t+half)/1.5)%2?'dark':'yellow',deckPoint(r,t,inner),deckPoint(r,t,outer),deckPoint(r,end,outer),deckPoint(r,end,inner));}
        const flagAlong=half-1.2,base=deckHeight(r,flagAlong);instance('cylinder','metal',r,flagAlong,side*(w+.2),base+1.15,.065,2.3,.065);const flagA=transform(r,flagAlong,side*(w+.2),base+2.2),flagB=transform(r,flagAlong-.1,side*(w+.2),base+1.25),flagC=transform(r,flagAlong-1.9,side*(w+.2),base+1.75);tri('orange',flagA,flagB,flagC);tri('orange',flagC,flagB,flagA);
      }
      // Bright forward chevrons and arrow remain on the physical deck plane.
      for(const a of[-half+6,-1,half-7]){quad('white',deckPoint(r,a-2,-3.1),deckPoint(r,a-.9,-3.1),deckPoint(r,a+2,0),deckPoint(r,a+.8,0));quad('white',deckPoint(r,a+.8,0),deckPoint(r,a+2,0),deckPoint(r,a-.9,3.1),deckPoint(r,a-2,3.1));}
      quad('orange',deckPoint(r,half-1,-w+.8),deckPoint(r,half-1,w-.8),deckPoint(r,half,w-.8),deckPoint(r,half,-w+.8));
      // Reinforced lip and rear cross frame; no underwater propeller/engine.
      beam('metal',transform(r,half,-w,r.height-.15),transform(r,half,w,r.height-.15),.32);
      beam('metal',transform(r,half-2,-w+.8,-.05),transform(r,half-2,w-.8,-.05),.26);
      beam('metal',transform(r,half-2,-w+.8,r.height-.5),transform(r,half-2,w-.8,-.05),.22);
      beam('metal',transform(r,half-2,w-.8,r.height-.5),transform(r,half-2,-w+.8,-.05),.22);
    }
    for(const [mat,data] of surfaces){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data,3));g.computeVertexNormals();const mesh=new T.Mesh(g,materials[mat]);mesh.name='Ramp '+mat+' surfaces';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
    for(const b of batches.values()){const mesh=new T.InstancedMesh(geometry[b.kind],materials[b.mat],b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.name='Ramp '+b.mat+' '+b.kind;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
    group.userData.dispose=()=>dispose(group);return group;
  }
  function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();group.removeFromParent();}
  root.RiverRamps={generate,create,dispose,practiceView,validatePlacement,point,deckHeight,settings};
})(globalThis);
