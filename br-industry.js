/* Source-positioned ExxonMobil and L'Auberge landmarks.
 * Tank footprints/heights: EBRGIS. Hotel/casino footprints: EBRGIS161307/161490.
 * Hotel12stories,69.19m skybridge and3-level garage: Manhattan Construction.
 * Facades, tower height, pipework and small details are visual approximations.
 * See br-landmark-reference-notes.json for provenance and limitations. */
(function(root){
  'use strict';
  const G=root.BR_GEO,T=root.THREE,buildings=root.BR_BUILDINGS?.features||[];
  const refineryBounds={minX:650,maxX:2400,minZ:-5900,maxZ:-3950};
  function equipment(feature){
    const ring=feature.rings?.[0];if(!ring||ring.length<16||!Number.isFinite(feature.heightM)||feature.heightM<3)return null;
    const first=ring[0];if(first[0]<-91.195||first[0]>-91.172||first[1]<30.474||first[1]>30.495)return null;
    const points=ring.slice(0,-1).map(p=>{const q=G.toWorld(...p);return[q.x,q.z];});
    const x=points.reduce((a,p)=>a+p[0],0)/points.length,z=points.reduce((a,p)=>a+p[1],0)/points.length;
    if(x<refineryBounds.minX||x>refineryBounds.maxX||z<refineryBounds.minZ||z>refineryBounds.maxZ)return null;
    let area=0,perimeter=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];perimeter+=Math.hypot(a[0]-b[0],a[1]-b[1]);}
    const circularity=4*Math.PI*Math.abs(area*.5)/(perimeter*perimeter);if(circularity<.89)return null;
    const radius=Math.min(...points.map(p=>Math.hypot(p[0]-x,p[1]-z)))*.97;if(radius<2.2||radius>45)return null;
    return{id:feature.id,x,z,radius,height:feature.heightM,ring:points,circularity};
  }
  const refineryEquipment=buildings.map(equipment).filter(Boolean);
  const excludeBuildingIds=[161307,161490,...refineryEquipment.map(p=>p.id)];
  const vegetationExclusions=[{outer:[[650,-5900],[2400,-5900],[2400,-3950],[650,-3950],[650,-5900]],holes:[]},{outer:[[4685,10245],[4860,10295],[4940,10475],[4880,10625],[4720,10560],[4685,10245]],holes:[]}];
  const notes=['ExxonMobil equipment uses circular municipal footprints and recorded height values; individual equipment type and pipe details are inferred from public aerial imagery.','L’Auberge uses the real municipal site footprints and documented12story configuration. Its43.2m tower and facade details are approximations, not a measured elevation.','All modeled ground structures require rendered-land support. Foundation skirts meet terrain instead of using unrelated source ground-elevation datums.'];
  function create(scene,options={}){
    const group=new T.Group();group.name='ExxonMobil refinery and L’Auberge';scene.add(group);
    const isWater=options.isWater||(()=>false),terrainAt=options.terrainAt||options.groundAt||(()=>0),groundAt=options.groundAt||terrainAt;
    const mats={tank:new T.MeshStandardMaterial({color:0xd3d7cb,roughness:.64,metalness:.35}),roof:new T.MeshStandardMaterial({color:0x9fa79b,roughness:.83,metalness:.25}),steel:new T.MeshStandardMaterial({color:0x858f8b,roughness:.52,metalness:.65}),dark:new T.MeshStandardMaterial({color:0x48514b,roughness:.77,metalness:.4}),pipe:new T.MeshStandardMaterial({color:0xb2b7a4,roughness:.58,metalness:.52}),concrete:new T.MeshStandardMaterial({color:0x8c9286,roughness:1}),stone:new T.MeshStandardMaterial({color:0xc9bfa7,roughness:.88}),cream:new T.MeshStandardMaterial({color:0xdfd4bd,roughness:.82}),bronze:new T.MeshStandardMaterial({color:0x8b7158,roughness:.8}),red:new T.MeshStandardMaterial({color:0x713837,roughness:.62,metalness:.3}),glass:new T.MeshStandardMaterial({color:0x36565c,roughness:.22,metalness:.48}),pool:new T.MeshStandardMaterial({color:0x438e98,roughness:.22,metalness:.28}),white:new T.MeshStandardMaterial({color:0xf0e6cf,roughness:.6}),green:new T.MeshStandardMaterial({color:0x53654c,roughness:.93})};
    const base={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,24),beam:new T.CylinderGeometry(1,1,1,8),sphere:new T.SphereGeometry(1,16,8)},batches=new Map(),dummy=new T.Object3D();
    const supportRecords=[],skipped=[],obstacles=[];
    function sample(x,z){if(isWater(x,z))return null;const y=terrainAt(x,z);return Number.isFinite(y)?y:null;}
    function support(ring,name){
      const heights=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));for(let j=0;j<n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n,y=sample(x,z);if(y===null){skipped.push(name);return null;}heights.push(y);}}
      const result={minimum:Math.min(...heights),maximum:Math.max(...heights),samples:heights.length};supportRecords.push({name,ring,minimum:result.minimum,maximum:result.maximum,samples:result.samples});return result;
    }
    function instance(kind,material,site){const key=site+':'+kind+':'+material;if(!batches.has(key))batches.set(key,{kind,material,site,matrices:[]});dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());}
    function box(x,y,z,w,h,d,material,angle=0,site='hotel'){if(h<=0)return;dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,h,d);instance('box',material,site);}
    function cylinder(x,y,z,r,h,material='tank',site='refinery'){if(h<=0)return;dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(r,h,r);instance('cylinder',material,site);}
    function beam(a,b,r,material='steel',site='refinery'){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);dummy.position.copy(p).add(q).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());dummy.scale.set(r,v.length(),r);instance('beam',material,site);}
    function ringRail(x,y,z,r,material='steel',site='refinery'){const n=24;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;beam([x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(b)*r,y,z+Math.cos(b)*r],.07,material,site);}}
    function oriented(ring){let area=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];area+=a[0]*b[1]-b[0]*a[1];}return area>=0?ring:ring.slice().reverse();}
    function facadeEdges(ring,callback){ring=oriented(ring);for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<7)continue;const nx=(b[1]-a[1])/length,nz=-(b[0]-a[0])/length,angle=-Math.atan2(b[1]-a[1],b[0]-a[0]);callback({a,b,length,nx,nz,angle,point:(t,offset=.22)=>[a[0]+(b[0]-a[0])*t+nx*offset,a[1]+(b[1]-a[1])*t+nz*offset]});}}
    function polygonMass(ring,height,material,name){
      ring=oriented(ring);
      const s=support(ring,name);if(!s)return null;const vertices=[],indices=[],top=s.maximum+height;
      for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));for(let j=0;j<n;j++){const t=j/n,u=(j+1)/n,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],q=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],baseP=sample(...p)-.25,baseQ=sample(...q)-.25,k=vertices.length/3;vertices.push(p[0],baseP,p[1],q[0],baseQ,q[1],p[0],top,p[1],q[0],top,q[1]);indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
      const k=vertices.length/3;for(const p of ring)vertices.push(p[0],top,p[1]);for(const tri of T.ShapeUtils.triangulateShape(ring.map(p=>new T.Vector2(...p)),[]))indices.push(k+tri[0],k+tri[2],k+tri[1]);
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,mats[material]);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.support=s;group.add(mesh);return{base:s.maximum,top};
    }
    // Only actual circular equipment footprints become tanks / process columns.
    for(const item of refineryEquipment){
      const s=support(item.ring,'EBRGIS equipment '+item.id);if(!s)continue;const y=s.maximum,h=item.height,r=item.radius;
      cylinder(item.x,s.minimum-.25,item.z,r+.15,s.maximum-s.minimum+.25,'concrete');cylinder(item.x,y,item.z,r,h,'tank');
      cylinder(item.x,y+h-.12,item.z,r*.98,.25,'roof');
      const column=h/r>4;
      ringRail(item.x,y+h+.7,item.z,r*.92);
      if(column)for(let level=8;level<h;level+=9){cylinder(item.x,y+level,item.z,r*1.11,.3,'steel');ringRail(item.x,y+level+1,item.z,r*1.06);}
      else{ringRail(item.x,y+h*.33,item.z,r+.02,'roof');ringRail(item.x,y+h*.68,item.z,r+.02,'roof');}
      const lx=item.x+r*.93,lz=item.z;beam([lx,y+.2,lz],[lx,y+h+.8,lz],.09,'dark');beam([lx+.65,y+.2,lz],[lx+.65,y+h+.8,lz],.09,'dark');for(let level=.5;level<h+.5;level+=1.1)beam([lx,y+level,lz],[lx+.65,y+level,lz],.055,'steel');
      if(r>8)cylinder(item.x+r*.22,y+h+.25,item.z-r*.15,1,.7,'dark');
    }
    // Schematic racks follow visible public-aerial process corridors. No pipe
    // network, operating process or exact equipment internals are claimed.
    const rackPaths=[[[1230,-5395],[1900,-5395]],[[1220,-4670],[1940,-4670]],[[1960,-5300],[1960,-4080]]];
    for(const [a,b] of rackPaths){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,nx=-dz,nz=dx,points=[];for(let distance=0;distance<=length;distance+=24)points.push([a[0]+dx*distance,a[1]+dz*distance]);points.push(b);
      const feet=points.flatMap(p=>[-1,1].map(side=>[p[0]+nx*side*4,p[1]+nz*side*4]));
      if(feet.some(p=>sample(...p)===null))continue;const level=Math.max(...feet.map(p=>sample(...p)))+5.5;
      for(const p of feet){const y=sample(...p)-.25;box(p[0],y,p[1],.7,level-y,.7,'steel',0,'refinery');}
      for(const p of points)beam([p[0]-nx*4,level,p[1]-nz*4],[p[0]+nx*4,level,p[1]+nz*4],.22,'steel');
      for(let lane=-3;lane<=3;lane++)beam([a[0]+nx*lane,level+.5,a[1]+nz*lane],[b[0]+nx*lane,level+.5,b[1]+nz*lane],lane%2===0?.3:.18,'pipe');
    }
    const footprint=id=>{const f=buildings.find(p=>p.id===id);return f?.rings[0].slice(0,-1).map(p=>{const q=G.toWorld(...p);return[q.x,q.z];});};
    const hotelRing=footprint(161307),casinoRing=footprint(161490);
    function clipSouth(ring,line){const result=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],insideA=a[1]>=line,insideB=b[1]>=line;if(insideA)result.push(a);if(insideA!==insideB){const t=(line-a[1])/(b[1]-a[1]);result.push([a[0]+(b[0]-a[0])*t,line]);}}return result;}
    let hotelTop=48;
    if(hotelRing&&casinoRing){
      const garage=polygonMass(hotelRing,10.8,'stone','L’Auberge three-level podium / garage');
      const casinoOutline=clipSouth(casinoRing,10463),casino=polygonMass(casinoOutline,18.288,'stone','L’Auberge casino podium');
      // A curved, narrow hotel mass follows the river-facing side of the real
      // northern footprint. 43.2m =12 modeled storeys at3.6m, not a survey height.
      const front=[[4779,10384],[4795,10390],[4812,10397],[4833,10406]];
      const towerRing=[...front,[4840,10392],[4834,10377],[4822,10369],[4802,10364],[4786,10366]];
      const tower=polygonMass(towerRing,43.2,'cream','L’Auberge12-story curved hotel tower');
      if(tower){hotelTop=tower.top;
        facadeEdges(towerRing,edge=>{const {length,angle,point}=edge,bays=Math.max(1,Math.round(length/8.7));
          for(let bay=0;bay<bays;bay++){const [x,z]=point((bay+.5)/bays),width=length/bays-2.5;box(x,tower.base+7,z,width,34,.3,'glass',angle);
            for(let floor=2;floor<12;floor++)box(x,tower.base+floor*3.6,z,width,.28,.5,floor%3===0?'red':'dark',angle);
            const [mx,mz]=point((bay+.5)/bays,.43);box(mx,tower.base+7,mz,.16,34,.18,'dark',angle);
          }
          for(let j=0;j<=bays;j++){const [x,z]=point(j/bays,.45);box(x,tower.base+2,z,1.6,41.5,.9,'stone',angle);box(x,tower.base+4,z,.5,37,1.05,'cream',angle);}
          const [x,z]=point(.5,.4);box(x,tower.top-.1,z,length+.5,.8,1.5,'bronze',angle);box(x,tower.base+27,z,length+.6,.5,1.4,'cream',angle);
          // Burgundy pergola stands above the roof, with visible open slats.
          box(x,tower.top+3.3,z,length+4,.32,1,'red',angle);
          for(let d=1;d<length;d+=3.3){const [px,pz]=point(d/length,-2);box(px,tower.top+3.3,pz,.3,.3,8,'red',angle);}
          for(const t of[.08,.92]){const [px,pz]=point(t,-.8);box(px,tower.top,pz,.36,3.5,.36,'red',angle);}
        });
        // Rooftop pool terrace / burgundy pergola interpreted from the exterior.
        const angle=-Math.atan2(9,21);box(4803,tower.top,10379,27,.35,15,'cream',angle);box(4803,tower.top+.36,10379,16,.12,6,'pool',angle);
        // Small illuminated L on the stone end cap; a geometric approximation.
        box(4779.2,tower.base+28,10383.5,.4,7,.4,'white');box(4781.5,tower.base+28,10384.5,5,.4,.4,'white',-.4);
      }
      // The documented227-foot pedestrian bridge crosses the levee, supported
      // by explicit land-reaching columns, not a solid floating connector wall.
      const a=[4816,10402],b=[4789.5,10465.9],length=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=-Math.atan2(b[1]-a[1],b[0]-a[0]),samples=[a,b,[(a[0]+b[0])/2,(a[1]+b[1])/2]];
      if(samples.every(p=>sample(...p)!==null)){const deck=Math.max(...samples.map(p=>sample(...p)))+5.5,cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;box(cx,deck,cz,length,.7,7.2,'dark',angle);box(cx,deck+.7,cz,length,4.5,6.8,'glass',angle);box(cx,deck+5.2,cz,length+1,.7,8,'red',angle);
        for(const p of samples){const baseY=sample(...p);cylinder(p[0],baseY-.2,p[1],.75,deck-baseY+.2,'concrete','hotel');}
        for(let d=4;d<length;d+=6){const t=d/length,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;box(x,deck+.7,z,.35,4.5,7,'cream',angle);}
      }
      // Horizontal slots make the lower parking mass read as three levels.
      if(garage)facadeEdges(hotelRing,({length,angle,point})=>{if(length<20)return;const [x,z]=point(.5);for(let floor=0;floor<3;floor++)box(x,garage.base+floor*3.6+1.1,z,length-1.2,1.8,.35,'dark',angle);});
      if(casino)facadeEdges(casinoOutline,({length,angle,point})=>{const bays=Math.max(1,Math.round(length/9));
        for(let i=0;i<bays;i++){const [x,z]=point((i+.5)/bays,.3);box(x,casino.base+3,z,length/bays-2.7,9,.45,'glass',angle);box(x,casino.base+6,z,length/bays-2.5,.25,.6,'bronze',angle);box(x,casino.base+10,z,length/bays-2.5,.25,.6,'bronze',angle);}
        for(let i=0;i<=bays;i++){const [x,z]=point(i/bays,.45);box(x,casino.base+1,z,1.4,15.5,.85,'cream',angle);box(x,casino.base+14.8,z,2.1,.65,1.3,'bronze',angle);}
        const [x,z]=point(.5,.45);box(x,casino.top-.4,z,length+.4,.9,2.2,'red',angle);box(x,casino.base+2,z,length+.2,.55,1.1,'bronze',angle);
      });
    }
    for(const batch of batches.values()){const mesh=new T.InstancedMesh(base[batch.kind],mats[batch.material],batch.matrices.length);batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.name=(batch.site==='refinery'?'ExxonMobil ':'L’Auberge ')+batch.kind+' '+batch.material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
    const refineryLocation=G.toLonLat(1510,-4800),hotelLocation=G.toLonLat(4800,10365);
    const landmarks=[{name:'ExxonMobil Baton Rouge refinery',...refineryLocation,x:1510,z:-4800,lookAt:{x:1510,y:Math.max(20,groundAt(1510,-4800)+24),z:-4800},viewPosition:{x:450,z:-4800},viewDistance:1060,cameraHeight:45,cameraFov:38},{name:'L’Auberge Casino & Hotel',...hotelLocation,x:4800,z:10365,lookAt:{x:4805,y:28,z:10435},viewPosition:{x:4630,z:10900},viewDistance:540,cameraHeight:25,cameraFov:40}];
    group.userData={supportRecords,skipped,sourceEquipmentCount:refineryEquipment.length,notes};
    return{group,landmarks,obstacles,excludeBuildingIds,vegetationExclusions,notes};
  }
  root.BRIndustry={create,excludeBuildingIds,vegetationExclusions,refineryEquipment,refineryBounds,notes};
})(typeof window!=='undefined'?window:globalThis);
