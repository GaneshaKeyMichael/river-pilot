/* River fan boat: original procedural aluminum airboat model.
 * One compact turbine-style engine, one guarded air propeller, two air rudders.
 * Visual design and animation only; navigation and the 80-knot limit live in physics.
 * Local bow is-Z, stern+Z, waterline y=0. All dimensions are metres. */
(function(root){
  'use strict';
  const dimensions=Object.freeze({length:7,width:3.2,bow:-3.5,stern:3.5,draft:.18,fanRadius:1.4,fanCenterY:2.25});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finite=(v,f=0)=>Number.isFinite(v)?v:f;
  function createPlayer(){
    const T=root.THREE,g=new T.Group();g.name='Single-turbine river fan boat';
    const M=(color,roughness=.5,metalness=.25)=>new T.MeshStandardMaterial({color,roughness,metalness});
    const mat={aluminum:M(0xc4cfcc,.38,.72),edge:M(0xe0e6dc,.3,.72),deck:M(0x6a7c79,.83,.25),dark:M(0x233537,.7,.28),cage:M(0x374744,.38,.7),tan:M(0xb99768,.92,.03),tanLight:M(0xcdb487,.88,.03),titanium:M(0x8c9695,.3,.8),engine:M(0x3c5d62,.36,.64),heat:M(0x968364,.45,.74),black:M(0x151f22,.72,.24),orange:M(0xdf7837,.52,.18),rubber:M(0x343b38,.95,.04),white:M(0xd7dfce,.68,.12)};
    mat.glass=new T.MeshStandardMaterial({color:0x9cc1c3,transparent:true,opacity:.28,roughness:.12,metalness:.1,side:T.DoubleSide,depthWrite:false});
    const base={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,16),beam:new T.CylinderGeometry(1,1,1,8),sphere:new T.SphereGeometry(1,12,8)};
    const batches=new Map(),dummy=new T.Object3D();
    function push(kind,material,matrix){const key=kind+':'+material;if(!batches.has(key))batches.set(key,{kind,material,matrices:[]});batches.get(key).matrices.push(matrix.clone());}
    function box(x,y,z,w,h,d,material='aluminum',rotY=0){dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,rotY,0);dummy.scale.set(w,h,d);dummy.updateMatrix();push('box',material,dummy.matrix);}
    function beam(a,b,r=.035,material='edge'){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),delta=bb.clone().sub(aa);dummy.position.copy(aa).add(bb).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(r,delta.length(),r);dummy.updateMatrix();push('beam',material,dummy.matrix);}
    function cyl(x,y,z,rx,h,rz=rx,material='titanium',rotationX=0){dummy.position.set(x,y,z);dummy.rotation.set(rotationX,0,0);dummy.scale.set(rx,h,rz);dummy.updateMatrix();push('cylinder',material,dummy.matrix);}
    function sphere(x,y,z,rx,ry,rz,material='edge'){dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(rx,ry,rz);dummy.updateMatrix();push('sphere',material,dummy.matrix);}
    function mesh(geometry,material,name,parent=g){const m=new T.Mesh(geometry,typeof material==='string'?mat[material]:material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
    function custom(vertices,indices,material,name,parent=g){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();return mesh(geo,material,name,parent);}
    function torus(x,y,z,r,tube,material='cage',parent=g){const m=mesh(new T.TorusGeometry(r,tube,6,64),material,'Fan guard ring',parent);m.position.set(x,y,z);return m;}

    // Flat-bottomed, shallow-draft hull with a broad upswept spoon bow.
    const outline=[[-1.48,3.5],[1.48,3.5],[1.6,2.8],[1.6,-1.65],[1.45,-2.45],[1.08,-3.1],[.55,-3.44],[0,-3.5],[-.55,-3.44],[-1.08,-3.1],[-1.45,-2.45],[-1.6,-1.65],[-1.6,2.8]];
    const top=z=>.43+Math.max(0,-z-1.7)*.16;
    const hull=[],idx=[],n=outline.length;
    for(const[x,z]of outline)hull.push(x,top(z),z);
    for(const[x,z]of outline)hull.push(x*.91,-.18+Math.max(0,-z-1.8)*.22,z*.97);
    for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,n+i,j,j,n+i,n+j);}
    for(let i=1;i<n-1;i++)idx.push(n,n+i+1,n+i);
    const hullMesh=custom(hull,idx,'aluminum','Shallow aluminum airboat hull');hullMesh.userData.part='hull';
    const deckVertices=outline.map(([x,z])=>[x,top(z)+.015,z]).flat(),deckIdx=[];for(let i=1;i<n-1;i++)deckIdx.push(0,i,i+1);
    custom(deckVertices,deckIdx,'deck','Open nonslip deck');
    for(let i=0;i<n;i++){const a=outline[i],b=outline[(i+1)%n];beam([a[0],top(a[1])+.025,a[1]],[b[0],top(b[1])+.025,b[1]],.042,'edge');}
    // Rubbing rails, hull ribs, visible rivets, low bow rail and cleats.
    for(const side of[-1,1]){
      for(let z=-1.6;z<=3.1;z+=.38){sphere(side*1.605,.29,z,.022,.022,.022,'titanium');sphere(side*1.56,.46,z,.021,.021,.021,'edge');}
      beam([side*1.6,.17,-1.55],[side*1.6,.17,2.85],.036,'dark');
      for(const z of[-1.3,-.5,.3,1.1,1.9,2.7])box(side*1.43,.45,z,.12,.16,.07,'aluminum');
      for(const z of[-1.8,2.9]){cyl(side*1.3,.56,z,.045,.16,.045,'dark');box(side*1.3,.62,z,.25,.06,.07,'dark');}
      beam([side*.86,.74,-2.75],[side*1.18,.95,-2.25],.027,'edge');beam([side*1.18,.95,-2.25],[side*1.36,.9,-1.6],.027,'edge');beam([side*1.36,.9,-1.6],[side*1.36,.46,-1.6],.027,'edge');
    }
    box(0,.67,-2.8,.88,.035,.65,'aluminum');box(0,.71,-2.76,.19,.04,.08,'dark');
    // Small anti-slip strips and a forward deck locker.
    for(const z of[-2.1,-1.85,-1.6])box(0,top(z)+.024,z,1.45,.012,.08,'rubber');
    box(0,.45,-1.18,2.25,.27,.7,'aluminum');box(0,.72,-1.18,2.31,.045,.74,'edge');
    for(const side of[-1,1])box(side*.7,.51,-1.545,.13,.09,.025,'dark');

    // Two individual, open, raised seats with tan cushions and welded frames.
    const seats=[];
    for(const x of[-.55,.55]){
      const seat=new T.Group();seat.name=x<0?'Pilot seat':'Passenger seat';seat.position.set(x,1.1,-.12);seat.userData.part='seat';g.add(seat);seats.push(seat);
      const cushion=mesh(new T.BoxGeometry(.72,.16,.68),'tanLight','Seat cushion',seat);cushion.position.set(0,.02,0);
      const back=mesh(new T.BoxGeometry(.73,.86,.18),'tan','Seat back',seat);back.position.set(0,.51,.3);back.rotation.x=.09;
      const pad=mesh(new T.BoxGeometry(.58,.6,.04),'tanLight','Seat back inset',seat);pad.position.set(0,.52,.195);pad.rotation.x=.09;
      for(const side of[-1,1]){beam([x+side*.29,.48,-.34],[x+side*.29,1.03,-.34],.035,'dark');beam([x+side*.29,.48,.12],[x+side*.29,1.03,.12],.035,'dark');beam([x+side*.37,1.22,.16],[x+side*.37,1.22,-.31],.03,'dark');}
      box(x,.62,-.68,.72,.045,.43,'rubber');
      for(const dx of[-.19,0,.19])box(x+dx,1.196,-.08,.013,.005,.43,'tan');
    }
    // Compact dashboard and actual circular steering wheel in front of pilot.
    box(-.55,1.03,-.96,.83,.34,.31,'dark');box(-.55,1.37,-.96,.88,.055,.36,'aluminum');
    for(const x of[-.78,-.54,-.32]){cyl(x,1.25,-.792,.07,.018,.07,'black',Math.PI/2);cyl(x,1.25,-.778,.053,.022,.053,'white',Math.PI/2);beam([x,1.25,-.761],[x+.028,1.28,-.761],.005,'dark');}
    const wheel=new T.Group();wheel.name='Steering wheel';wheel.position.set(-.55,1.43,-.57);wheel.rotation.x=-.38;g.add(wheel);
    const rim=mesh(new T.TorusGeometry(.215,.024,8,24),'black','Steering wheel rim',wheel);
    const hub=mesh(new T.CylinderGeometry(.055,.055,.065,12),'titanium','Steering hub',wheel);hub.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const spoke=mesh(new T.BoxGeometry(.018,.185,.025),'titanium','Steering spoke',wheel);spoke.position.set(Math.sin(a)*.105,Math.cos(a)*.105,0);spoke.rotation.z=-a;}
    beam([-.55,1.38,-.6],[-.55,1.17,-.94],.045,'dark');
    beam([-.08,1.08,-.56],[-.08,1.41,-.51],.02,'titanium');sphere(-.08,1.41,-.51,.045,.045,.045,'orange');
    // A low wind deflector keeps the cockpit open and the rear equipment visible.
    const screen=mesh(new T.PlaneGeometry(1.9,.38),'glass','Low wind deflector');screen.position.set(0,1.2,-1.22);screen.rotation.x=-.14;
    for(const x of[-.97,.97])beam([x,.99,-1.19],[x,1.42,-1.25],.023,'edge');beam([-.97,1.42,-1.25],[.97,1.42,-1.25],.022,'edge');

    // A single elevated turbine-style power unit feeds the single air rotor.
    // The housing is intentionally compact, with one intake and a side exhaust.
    const engine=new T.Group();engine.name='Single compact turbine engine';engine.userData.part='engine';engine.userData.engineCount=1;engine.position.set(0,2.25,1.25);g.add(engine);
    const housing=mesh(new T.CylinderGeometry(.285,.35,1.03,24),'engine','Turbine housing',engine);housing.rotation.x=Math.PI/2;
    const intake=mesh(new T.CylinderGeometry(.265,.265,.12,24),'titanium','Turbine intake lip',engine);intake.rotation.x=Math.PI/2;intake.position.z=-.56;
    const intakeDark=mesh(new T.CircleGeometry(.23,24),new T.MeshStandardMaterial({color:0x111c20,roughness:.85,side:T.DoubleSide}),'Single turbine intake',engine);intakeDark.position.z=-.625;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const vane=mesh(new T.BoxGeometry(.025,.21,.02),'titanium','Intake grille vane',engine);vane.position.set(Math.sin(a)*.13,Math.cos(a)*.13,-.64);vane.rotation.z=-a;}
    const cone=mesh(new T.ConeGeometry(.085,.12,16),'titanium','Intake center cone',engine);cone.rotation.x=-Math.PI/2;cone.position.z=-.65;
    const hot=mesh(new T.CylinderGeometry(.28,.24,.32,24),'heat','Turbine heat shield',engine);hot.rotation.x=Math.PI/2;hot.position.z=.61;
    for(const z of[-.4,-.12,.16,.4]){const band=mesh(new T.TorusGeometry(z>.2?.282:.32,.014,6,24),'titanium','Turbine casing band',engine);band.position.z=z;}
    const exhaust=mesh(new T.CylinderGeometry(.105,.12,.48,14),'heat','Single side exhaust',engine);exhaust.rotation.z=Math.PI/2;exhaust.position.set(.39,-.045,.57);
    const exhaustMouth=mesh(new T.CircleGeometry(.087,14),new T.MeshStandardMaterial({color:0x151b1b,side:T.DoubleSide}),'Exhaust opening',engine);exhaustMouth.rotation.y=Math.PI/2;exhaustMouth.position.set(.635,-.045,.57);
    // Dark hose, a warm metal oil line and casing fasteners add useful scale.
    for(let i=0;i<10;i++){const a=i*Math.PI/5;const bolt=mesh(new T.SphereGeometry(.023,6,4),'titanium','Casing fastener',engine);bolt.position.set(Math.sin(a)*.27,Math.cos(a)*.27,-.48);}
    beam([-.27,2.3,.93],[-.37,1.72,1.08],.025,'black');beam([-.37,1.72,1.08],[-.7,.68,1.28],.024,'black');beam([.29,2.32,1.22],[.38,2.08,1.55],.018,'heat');
    box(-.82,.48,1.38,.65,.43,.75,'dark');box(-.82,.91,1.38,.5,.03,.6,'aluminum');cyl(-.82,.96,1.38,.055,.055,.055,'orange');
    // Triangulated engine and cage supports are kept behind the seats.
    for(const side of[-1,1]){
      beam([side*1.26,.48,1.1],[side*.39,2.04,1.02],.045,'cage');beam([side*1.27,.48,2.85],[side*.39,2.04,1.74],.045,'cage');
      beam([side*1.29,.48,2.75],[side*1.03,1.25,2.48],.048,'cage');beam([side*.39,2.03,.93],[side*.39,2.03,1.9],.045,'titanium');
    }
    box(0,1.98,1.4,.89,.085,1.13,'titanium');beam([0,2.25,1.9],[0,2.25,2.58],.073,'titanium');

    // Large cylindrical fan cage: light rings and rods leave the rotor visible.
    const cage=new T.Group();cage.name='Rear propeller safety cage';cage.userData.part='fan-cage';g.add(cage);
    for(const z of[2.14,2.55,2.95])torus(0,2.25,z,1.46,z===2.55?.028:.037,'cage',cage);
    for(let i=0;i<20;i++){const a=i*Math.PI/10,x=Math.sin(a)*1.46,y=2.25+Math.cos(a)*1.46;beam([x,y,2.14],[x,y,2.95],.017,'cage');}
    for(const r of[.48,.96])torus(0,2.25,2.96,r,.011,'cage',cage);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;beam([Math.sin(a)*.16,2.25+Math.cos(a)*.16,2.965],[Math.sin(a)*1.46,2.25+Math.cos(a)*1.46,2.965],.013,'cage');}
    // Four swept composite blades, high-visibility tips, one mechanical hub.
    const rotor=new T.Group();rotor.name='Single rear air propeller';rotor.userData.part='air-propeller';rotor.position.set(0,2.25,2.55);g.add(rotor);
    const bladeShape=new T.Shape();bladeShape.moveTo(-.085,.16);bladeShape.bezierCurveTo(-.2,.45,-.34,.9,-.22,1.25);bladeShape.quadraticCurveTo(-.16,1.38,.04,1.39);bladeShape.lineTo(.19,1.25);bladeShape.bezierCurveTo(.15,.91,.14,.55,.085,.16);bladeShape.closePath();
    const bladeGeo=new T.ExtrudeGeometry(bladeShape,{depth:.032,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:8});
    const tipShape=new T.Shape();tipShape.moveTo(-.255,1.16);tipShape.quadraticCurveTo(-.23,1.38,.04,1.39);tipShape.lineTo(.19,1.25);tipShape.lineTo(.17,1.13);tipShape.closePath();const tipGeo=new T.ShapeGeometry(tipShape,8);
    for(let i=0;i<4;i++){const b=mesh(bladeGeo,'dark','Swept propeller blade '+(i+1),rotor);b.rotation.z=i*Math.PI/2;const tip=mesh(tipGeo,'orange','High-visibility blade tip',b);tip.position.z=.041;}
    const propHub=mesh(new T.CylinderGeometry(.17,.17,.2,24),'titanium','Propeller hub',rotor);propHub.rotation.x=Math.PI/2;propHub.position.z=.06;
    const hubCap=mesh(new T.SphereGeometry(.13,16,8),'edge','Propeller hub cap',rotor);hubCap.scale.z=.45;hubCap.position.z=.19;
    const blurMaterial=new T.MeshBasicMaterial({color:0x8faaa3,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});
    const blur=mesh(new T.RingGeometry(.2,1.39,64),blurMaterial,'Subtle rotor motion blur');blur.position.set(0,2.25,2.58);blur.castShadow=false;blur.receiveShadow=false;
    // Two linked vertical air rudders pivot behind the fan, above the hull.
    const rudders=[];
    for(const side of[-1,1]){
      const rudder=new T.Group();rudder.name=side<0?'Port air rudder':'Starboard air rudder';rudder.userData.part='air-rudder';rudder.position.set(side*.59,1.35,3.03);g.add(rudder);rudders.push(rudder);
      const panel=mesh(new T.BoxGeometry(.055,2.1,.43),'aluminum','Air rudder foil',rudder);panel.position.set(0,1.05,.19);
      const accent=mesh(new T.BoxGeometry(.064,.19,.43),'orange','Rudder visibility stripe',rudder);accent.position.set(0,1.83,.19);
      for(const y of[.15,.65,1.15,1.65,2.05]){const rib=mesh(new T.BoxGeometry(.064,.022,.4),'edge','Rudder stiffening rib',rudder);rib.position.set(0,y,.18);}
      beam([side*.59,.49,3.03],[side*.59,3.52,3.03],.035,'cage');
    }
    beam([-.59,1.43,3.06],[.59,1.43,3.06],.025,'titanium');
    // Bow navigation lights and modest stern pole keep scale believable.
    for(const [x,color]of[[-1.42,0xe93c36],[1.42,0x55c98f]]){const light=mesh(new T.SphereGeometry(.045,8,6),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4}),'Navigation light');light.position.set(x,.74,-2.01);}
    beam([1.15,.47,2.9],[1.15,1.12,2.9],.018,'dark');sphere(1.15,1.13,2.9,.034,.05,.034,'white');
    for(const b of batches.values()){const m=new T.InstancedMesh(base[b.kind],mat[b.material],b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.name='Airboat '+b.kind+' '+b.material;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();g.add(m);}
    g.userData={length:dimensions.length,width:dimensions.width,bow:dimensions.bow,engineCount:1,propulsion:'Single turbine-driven air propeller',dimensions,helm:{x:-.55,y:2.15,z:-1.2},nodes:{rotor,rudders,engine,wheel,blur,seats},rotorAngle:0};
    return g;
  }
  function updatePlayer(group,state={},time=0,dt=1/60){
    const nodes=group?.userData?.nodes;if(!nodes)return;
    const delta=clamp(finite(dt,1/60),0,.1),throttle=clamp(Math.abs(finite(state.throttle)),0,1);
    const spec=root.RiverVessels?.PLAYER_SPEC||{},idleRPM=finite(spec.idleRPM,12000),maxRPM=Math.max(idleRPM+1,finite(spec.maxRPM,55000));
    const turbineRPM=clamp(finite(state.engineRPM,idleRPM+throttle*(maxRPM-idleRPM)),0,maxRPM);
    const power=clamp((turbineRPM-idleRPM)/(maxRPM-idleRPM),0,1);
    // Turbine spool RPM is reduced to a visible, plausible air-propeller speed.
    // The idle state is360prop RPM and full power2000, rather than clamping the
    // much faster turbine shaft and displaying identical motion at all powers.
    const propellerRPM=turbineRPM<=idleRPM?360*turbineRPM/idleRPM:360+power*1640;
    group.userData.propellerRPM=propellerRPM;
    group.userData.rotorAngle=(finite(group.userData.rotorAngle)+propellerRPM/60*Math.PI*2*delta)%(Math.PI*2);nodes.rotor.rotation.z=group.userData.rotorAngle;
    const rudder=clamp(finite(state.rudder),-1,1);for(const r of nodes.rudders)r.rotation.y=rudder*.48;nodes.wheel.rotation.z=-rudder*1.15;
    nodes.blur.material.opacity=power*.105;
    // Small vibration stays inside the engine rig, never displacing the hull.
    const t=finite(time);nodes.engine.position.y=2.25+Math.sin(t*67)*.003*throttle;
  }
  root.RiverFanBoat={createPlayer,updatePlayer,dimensions};
})(globalThis);
