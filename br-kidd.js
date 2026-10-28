/* USS KIDD DD-661, historical Baton Rouge berth view compatible with 2023 NAIP.
 * Ship dimensions: U.S. Naval History and Heritage Command DANFS.
 * Berth center/axis and gangway: USDA/USGS orthophoto, acquired 2023-05-03.
 * Configuration: USS KIDD museum virtual tour and National Register nomination.
 * Original procedural interpretation, not a scanned model or present-day location.
 */
(function(root){
  'use strict';
  const berth={lon:-91.19150025507568,lat:30.444352762316594,x:808.62,z:-495.5,heading:.014};
  const dimensions={length:114.7572,beam:12.0904};
  const view={target:{x:berth.x,y:9,z:berth.z},position:{x:628.62,z:-485.5},heading:.014};
  const sources=[
    {title:'U.S. Navy DANFS: Kidd I (DD-661)',url:'https://www.history.navy.mil/research/histories/ship-histories/danfs/k/kidd.html',supports:'376 ft 6 in length, 39 ft 8 in beam; Fletcher class.'},
    {title:'USS KIDD museum virtual tour',url:'https://www.usskidd.com/explore-the-kidd/virtual-ship-tour/',supports:'Museum reconstruction of 1945 configuration, five main mounts, bridge, funnels, masts and deck equipment.'},
    {title:'USS KIDD: Approaching the Ship',url:'https://www.usskidd.com/ship-tour/approaching-the-ship/',supports:'Seasonal cradle, mooring arrangement and pirate flag.'},
    {title:'USS KIDD: Quarterdeck',url:'https://www.usskidd.com/ship-tour/the-quarterdeck-the-5-38-cal-guns/',supports:'Gangway boards the fantail; five main gun mounts numbered 51–55.'},
    {title:'National Register nomination 83000502',url:'https://npgallery.nps.gov/GetAsset/8dc8b95b-ca48-4062-a353-bb21a3608089',supports:'Forward and aft islands, two funnels, five main mounts and unusual seasonal cradle.'},
    {title:'USDA/USGS NAIP aerial, May 3, 2023',url:'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer',supports:'Actual berth center and approximately north-facing axis; narrow stern gangway.'}
  ];
  const notes=[
    'Historical 2023 berth view: the model places USS KIDD where the 2023 aerial imagery shows her. It does not represent the ship’s present-day location.',
    'Length and beam are published Navy dimensions. Berth center and orientation are digitized from 0.3-m source aerial imagery; sub-metre coordinate digits do not imply survey precision.',
    'Hull contours, deckhouse dimensions, equipment, rigging, cradle and gangway are visual reconstructions from museum references, not measured plans.',
    'Ship floats at the simulation water surface. Shore gangway follows the modeled terrain elevation; the historical photograph’s river stage is not reproduced.'
  ];
  function create(parent,options={}){
    const T=root.THREE,groundAt=options.groundAt||(()=>7),group=new T.Group();
    group.name='USS KIDD DD-661 — historical 2023 berth';group.position.set(berth.x,0,berth.z);group.rotation.y=berth.heading;parent.add(group);
    const mats={},batches=new Map(),dummy=new T.Object3D(),lines=[],rigging=[];
    const palette={hull:0x69777c,side:0x8a9699,trim:0xa5aeae,deck:0x505e62,dark:0x27343a,black:0x182025,red:0x693c32,steel:0x747e7d,glass:0x233d47,canvas:0xb3b3a1,concrete:0x9a998b,brass:0x8d8063,white:0xd8dfdc};
    for(const [key,color]of Object.entries(palette))mats[key]=new T.MeshStandardMaterial({color,roughness:key==='glass'?.2:.76,metalness:key==='glass'?.4:.17,side:T.DoubleSide});
    const base={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,16),beam:new T.CylinderGeometry(1,1,1,8),sphere:new T.SphereGeometry(1,12,8),ring:new T.TorusGeometry(1,.16,6,16)};
    function add(kind,material,matrix){const key=kind+':'+material;if(!batches.has(key))batches.set(key,{kind,material,matrices:[]});batches.get(key).matrices.push(matrix.clone());}
    function box(x,y,z,w,h,d,mat='side',rotation=0){dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();add('box',mat,dummy.matrix);}
    function cyl(x,y,z,rx,h,rz=rx,mat='side',rake=0){dummy.position.set(x,y+h/2,z);dummy.rotation.set(rake,0,0);dummy.scale.set(rx,h,rz);dummy.updateMatrix();add('cylinder',mat,dummy.matrix);}
    function sphere(x,y,z,rx,ry,rz,mat='side'){dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(rx,ry,rz);dummy.updateMatrix();add('sphere',mat,dummy.matrix);}
    function beam(a,b,r=.07,mat='steel'){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);dummy.position.copy(p).add(q).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());dummy.scale.set(r,v.length(),r);dummy.updateMatrix();add('beam',mat,dummy.matrix);}
    function wire(a,b,thin=false){(thin?rigging:lines).push(...a,...b);}
    function ring(x,y,z,rx,ry,rz,mat='canvas',rotY=0){dummy.position.set(x,y,z);dummy.rotation.set(0,rotY,0);dummy.scale.set(rx,ry,rz);dummy.updateMatrix();add('ring',mat,dummy.matrix);}
    function mesh(geometry,mat,name){const m=new T.Mesh(geometry,mats[mat]);m.name=name||mat;m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
    function geo(vertices,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));if(indices)g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;}

    // Longitudinal hull stations preserve the slender destroyer proportions,
    // rising bow sheer, flared topsides, rounded bilge and cruiser stern.
    const stations=[[-57.3786,.045,5.2],[-55,.72,5.04],[-52,1.65,4.75],[-48,2.65,4.38],[-43,3.65,4.04],[-37,4.55,3.63],[-31,5.25,3.34],[-24,5.8,3.17],[-16,6.0452,3.1],[0,6.0452,3.1],[16,5.91,3.1],[29,5.65,3.1],[40,5.08,3.12],[49,4.15,3.17],[54,2.95,3.24],[56.6,1.6,3.28],[57.3786,.18,3.3]];
    function at(z){let i=1;while(i<stations.length-1&&stations[i][0]<z)i++;const a=stations[i-1],b=stations[i],t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return {w:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t};}
    function strip(layer,material){const p=[],ind=[];for(const [z,w,top]of stations){const keel=-3.65+.018*Math.max(0,Math.abs(z)-36)**1.45;const rows=layer==='upper'?[[w*.98,.3],[w,top]]:layer==='stripe'?[[w*.91,-.55],[w*.98,.3]]:[[w*.06,keel],[w*.5,keel+.48],[w*.79,-2.0],[w*.91,-.55]];for(const side of[-1,1])for(const [xx,y]of rows)p.push(xx*side,y,z);}
      const count=layer==='lower'?4:2,span=count*2;for(let i=0;i<stations.length-1;i++)for(let side=0;side<2;side++)for(let j=0;j<count-1;j++){const a=i*span+side*count+j,b=a+span;ind.push(a,b,a+1,b,b+1,a+1);}mesh(geo(p,ind),material,'KIDD '+layer+' hull');}
    strip('lower','red');strip('stripe','black');strip('upper','hull');
    const deckP=[],deckI=[];for(const[z,w,y]of stations)deckP.push(-w,y,z,w,y,z);for(let i=0;i<stations.length-1;i++){const a=i*2;deckI.push(a,a+2,a+1,a+1,a+2,a+3);}mesh(geo(deckP,deckI),'deck','Swept main deck');
    // Subtle long plating seams and deck-edge safety rails.
    for(const side of[-1,1]){
      for(let i=1;i<stations.length;i++){const a=stations[i-1],b=stations[i];for(const h of[.9,2.1])wire([side*a[1]*.997,h,a[0]],[side*b[1]*.997,h,b[0]],true);}
      for(let z=-54;z<56;z+=2.3){const a=at(z),b=at(Math.min(56,z+2.3));beam([side*a.w,a.y,z],[side*a.w,a.y+1.02,z],.028);for(const h of[.38,.7,1.02])wire([side*a.w,a.y+h,z],[side*b.w,b.y+h,Math.min(56,z+2.3)]);}
      for(const z of[-48,-43,41,47,51]){const a=at(z);cyl(side*(a.w-.65),a.y,z,.14,.42,.14,'dark');box(side*(a.w-.65),a.y+.37,z,.72,.13,.23,'dark');}
      for(const z of[-46,-42]){const a=at(z);sphere(side*(a.w-.1),2.65,z,.09,.3,.55,'black');beam([side*(a.w-.14),2.7,z],[side*(a.w+.12),1.35,z+.1],.1,'dark');beam([side*(a.w+.12),1.35,z+.1],[side*(a.w+.45),1.3,z-.55],.12,'dark');}
    }
    // Forward island, square bridge wings and open flying bridge.
    box(0,3.1,-18,8.25,3.15,23);box(0,6.25,-19.2,7.0,2.5,11.7);box(0,8.75,-19.3,5.45,2.0,6.2);
    box(0,11.0,-19.4,6.15,.23,6.7,'deck');box(0,8.6,-19,10.2,.2,5.2,'deck');
    for(const side of[-1,1]){box(side*4.96,8.8,-19,.2,1.14,5.2);box(side*3.1,8.8,-21.55,3.5,1.14,.17);box(side*2.78,9.3,-19.2,.05,.84,5.2,'glass');for(let z=-21.7;z<-16.8;z+=1.25)box(side*2.83,9.25,z,.1,1.05,.09,'trim');}
    box(0,9.3,-22.43,5.2,.84,.05,'glass');for(let x=-2.4;x<=2.5;x+=1.2)box(x,9.25,-22.48,.1,1.05,.09,'trim');
    box(0,11.23,-22.65,6.1,1.0,.14);for(const x of[-3,3])box(x,11.23,-19.3,.14,1.0,6.5);box(0,11.23,-16.1,6.1,1.0,.14);
    cyl(0,11.25,-18.2,1.35,1.1,1.35);box(0,12.35,-18.2,2.7,1.5,2.65);box(0,13.85,-18.2,3.1,.3,2.9,'deck');beam([-2.2,13.25,-18.2],[2.2,13.25,-18.2],.22);
    // Mk-12/22 director radar represented as its visible open lattice.
    box(0,14.4,-18.2,2.8,.13,1.65,'dark');for(let x=-1.4;x<=1.4;x+=.35)wire([x,14.4,-19],[x,15.5,-19]);for(let y=14.4;y<=15.5;y+=.27)wire([-1.4,y,-19],[1.4,y,-19]);beam([0,13.9,-18.2],[0,15.1,-18.2],.09);
    // Door recesses and portholes on the deckhouses are real geometry, so no
    // bitmap asset or external request is needed for this model.
    for(const side of[-1,1])for(let z=-26;z<-8;z+=3.1){box(side*4.14,3.6,z,.035,1.65,.72,'dark');box(side*4.17,3.7,z,.04,1.45,.62,'side');sphere(side*4.2,5.25,z+.95,.05,.19,.19,'glass');}
    box(0,3.1,29,7.6,3.1,23);box(0,6.2,29,6.8,.2,23,'deck');
    for(const side of[-1,1])for(const z of[20,25,30,35,39]){box(side*3.82,3.4,z,.04,1.9,.7,'dark');sphere(side*3.86,5.25,z+1,.05,.17,.17,'glass');}
    // Five enclosed5-inch mounts: two forward; three aft, with elevated
    // mounts53/54 on the after island and55 down on the fantail.
    function turret(z,y,a,id){const f=new T.Object3D();f.position.set(0,y,z);f.rotation.y=a;f.updateMatrix();
      cyl(0,y,z,1.65,.45,1.65,'hull');const shape=[[-1.65,1.7],[1.65,1.7],[1.65,-.9],[1.05,-1.65],[-1.05,-1.65],[-1.65,-.9]],p=[],ix=[];
      for(const yy of[.42,2.55])for(const[x,zz]of shape){const v=new T.Vector3(x,yy,zz).applyMatrix4(f.matrix);p.push(v.x,v.y,v.z);}for(let i=0;i<6;i++){const j=(i+1)%6;ix.push(i,j,i+6,j,j+6,i+6);}for(let i=1;i<5;i++)ix.push(6,6+i,7+i);const mount=mesh(geo(p,ix),'side','Main gun mount '+id);mount.userData.mount=id;
      const start=new T.Vector3(0,1.7,-1.2).applyMatrix4(f.matrix),end=new T.Vector3(0,2.45,-6.0).applyMatrix4(f.matrix);beam(start.toArray(),end.toArray(),.135,'dark');const collar=start.clone().lerp(end,.23);beam(start.toArray(),collar.toArray(),.23,'hull');
      const hatch=new T.Vector3(.65,2.58,.4).applyMatrix4(f.matrix);box(hatch.x,hatch.y,hatch.z,.68,.1,.82,'deck',a);
    }
    turret(-40,3.9,0,51);box(0,3.2,-29,5.3,2.7,6.5);turret(-29,5.9,0,52);turret(21,6.4,0,53);turret(35,6.4,Math.PI,54);turret(47,3.2,Math.PI,55);
    // Twin oval funnels, lightly raked aft, with black exhaust openings,
    // external piping and circular strengthening bands.
    for(const z of[-7,7]){
      box(0,3.1,z,5,2.0,5.3,'hull');cyl(0,5.1,z,1.62,7.4,2.12,'side',.065);cyl(0,12.36,z+.25,1.65,.45,2.15,'dark',.065);cyl(0,12.8,z+.28,1.42,.035,1.91,'black',.065);
      for(const y of[6,8.2,10.4,12.2])cyl(0,y,z+(y-8)*.065,1.65,.095,2.16,'hull',.065);
      for(const side of[-1,1])beam([side*1.32,4.8,z+1.7],[side*1.32,12,z+2.16],.07,'dark');
    }
    // Torpedo-tube quintuple bank aft of second funnel (static museum display).
    cyl(0,3.1,15,1.7,.8,1.7,'hull');for(let x=-1.35;x<=1.36;x+=.675)beam([x,4.2,11.7],[x,4.2,17.7],.31,'side');box(0,4.5,14,3.8,.35,1.4,'deck');
    // Light AA platforms along the center section and fantail. These details
    // are decorative reconstruction only; the museum model has no weapons logic.
    function aa(x,y,z,angle=0){cyl(x,y,z,1.25,.15,1.25,'deck');cyl(x,y+.15,z,.42,1.0,.42,'hull');box(x,y+.55,z,1.1,.6,.45,'side',angle);for(const dx of[-.2,.2]){const xx=x+Math.cos(angle)*dx,zz=z-Math.sin(angle)*dx;beam([xx,y+1.05,zz],[xx-Math.sin(angle)*2.0,y+1.75,zz-Math.cos(angle)*2.0],.055,'dark');}for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;wire([x+1.3*Math.cos(a),y+.85,z+1.3*Math.sin(a)],[x+1.3*Math.cos(b),y+.85,z+1.3*Math.sin(b)]);}}
    for(const side of[-1,1]){aa(side*4.3,6.4,-11,side*.8);aa(side*4.35,5.4,5,side*1.35);aa(side*3.7,3.2,52,side*1.6);box(side*3.9,3.1,5,2.9,2.3,5.6,'hull');}
    // Whaleboats, davits, rafts, depth-charge replicas, vents and ladders.
    for(const side of[-1,1]){
      sphere(side*4.7,5.3,-2.3,.8,.55,3.3,'canvas');box(side*4.7,5.72,-2.3,1.25,.1,4.7,'deck');
      for(const z of[-5,0]){beam([side*3.8,3.2,z],[side*3.8,7.1,z],.11);beam([side*3.8,7.1,z],[side*5.2,7.7,z],.1);wire([side*5.2,7.7,z],[side*5.2,5.7,z]);}
      for(const z of[24,28,32]){ring(side*3.98,5.2,z,.5,.88,.7,'canvas',Math.PI/2);for(let h=-.55;h<=.55;h+=.28)wire([side*4.0,5.2+h,z-.28],[side*4.0,5.2+h,z+.28]);}
      for(const z of[48,50,52,54]){beam([side*2,3.35,z],[side*3.1,3.35,z],.39,'hull');box(side*2.55,3.1,z,1.4,.16,.9,'steel');}
      for(const z of[-12,17,32]){beam([side*3.72,3.3,z],[side*3.72,6.5,z],.035);beam([side*3.08,3.3,z],[side*3.08,6.5,z],.035);for(let y=3.4;y<=6.5;y+=.32)beam([side*3.08,y,z],[side*3.72,y,z],.028);}
      for(const z of[-10,3,10,24,39]){cyl(side*2.7,3.1,z,.28,1.05,.28,'side');sphere(side*2.7,4.15,z,.34,.3,.34,'hull');}
    }
    for(const z of[-47,-45]){cyl(0,at(z).y,z,.5,.48,.5,'hull');for(const side of[-1,1])wire([side*.28,at(z).y+.1,z],[side*2.5,at(z-1).y+.1,z-1],true);}
    // Masts and fine wire rigging dominate the recognisable Fletcher silhouette.
    beam([0,6.2,-12],[0,25.0,-12],.16,'side');beam([0,14,-12],[0,25,-12],.1,'dark');
    for(const y of[17.3,21.5])beam([-4.2,y,-12],[4.2,y,-12],.075,'side');beam([0,22.8,-12],[0,27,-12],.055,'dark');
    for(const x of[-2.0,2.0])beam([x,6.3,-10],[0,17.6,-12],.095,'side');
    for(let x=-1.6;x<=1.6;x+=.4)wire([x,25.0,-12.3],[x,26.5,-12.3]);for(let y=25;y<=26.5;y+=.3)wire([-1.6,y,-12.3],[1.6,y,-12.3]);
    beam([0,6.4,29],[0,18.3,29],.085,'side');beam([-2.7,13.9,29],[2.7,13.9,29],.045);beam([0,17.9,29],[0,20.2,29],.028);
    sphere(-.3,18.2,29,.25,.35,.18,'dark');sphere(.3,18.2,29,.25,.35,.18,'dark');
    for(const x of[-4.2,4.2]){wire([x,17.3,-12],[x*.7,6.4,-20],true);wire([x,21.5,-12],[x*.6,6.4,-10],true);wire([0,25,-12],[x,3.3,-36],true);wire([0,18.3,29],[x,3.3,44],true);}wire([0,25,-12],[0,18.3,29],true);wire([0,23,-12],[0,16,29],true);
    beam([0,3.3,56],[0,7.1,56],.04,'side');beam([0,5.1,-56],[0,8.1,-56],.04,'side');

    // Mooring dolphins on the river/port side, photographed by the museum.
    // Vertical dimensions are schematic: river stage varies substantially.
    for(const z of[-33,28]){for(const x of[-12.8,-10.4])cyl(x,-4,z,.46,12.5,.46,'concrete');beam([-12.8,7,z],[-10.4,7,z],.3,'steel');beam([-11.6,3.2,z],[-5.5,3.4,z],.2,'steel');wire([-11.6,7,z],[-5.3,3.4,z],true);}
    for(const z of[-33,-15,5,25,43]){box(0,-4.6,z,13.8,.8,1.6,'concrete');beam([-6,-4.2,z],[-4,-1.4,z],.24,'steel');beam([6,-4.2,z],[4,-1.4,z],.24,'steel');}
    // The narrow, uncovered stern gangway is traced from the2023 aerial.
    // Eastward it bends south before reaching the riverside walkway.
    const cos=Math.cos(berth.heading),sin=Math.sin(berth.heading);
    const wp=(x,z)=>({x:berth.x+x*cos+z*sin,z:berth.z-x*sin+z*cos});
    const shore=wp(114,66),shoreY=Math.max(3.7,groundAt(shore.x,shore.z)+.35);
    const gangway=[[5.9,3.3,44.4],[40.9,Math.max(4.6,shoreY-.9),47.3],[51.2,shoreY,65.8],[114,shoreY,66]];
    for(let i=0;i<gangway.length-1;i++){const a=gangway[i],b=gangway[i+1],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,n=Math.ceil(len/2.7);
      const p=[[a[0]+nx,a[1],a[2]+nz],[a[0]-nx,a[1],a[2]-nz],[b[0]+nx,b[1],b[2]+nz],[b[0]-nx,b[1],b[2]-nz]];mesh(geo(p.flat(),[0,1,2,1,3,2]),'deck','KIDD historic gangway');
      for(const side of[-1,1]){const aa=[a[0]+nx*side,a[1],a[2]+nz*side],bb=[b[0]+nx*side,b[1],b[2]+nz*side];beam(aa,bb,.11,'steel');beam([aa[0],aa[1]+1.1,aa[2]],[bb[0],bb[1]+1.1,bb[2]],.045,'trim');for(let j=0;j<=n;j++){const t=j/n,x=aa[0]+(bb[0]-aa[0])*t,y=aa[1]+(bb[1]-aa[1])*t,z=aa[2]+(bb[2]-aa[2])*t;beam([x,y,z],[x,y+1.1,z],.035,'trim');if(j<n){const t2=(j+1)/n,xx=aa[0]+(bb[0]-aa[0])*t2,yy=aa[1]+(bb[1]-aa[1])*t2,zz=aa[2]+(bb[2]-aa[2])*t2;beam([x,y-.8,z],[xx,yy,zz],.055,'steel');}}}
    }

    // Small original canvas decals for hull numbers and flags. No downloaded
    // photograph is embedded or redistributed; all geometry is original.
    if(typeof document!=='undefined'){
      const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=192;const ctx=labelCanvas.getContext('2d');ctx.font='bold 150px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=6;ctx.strokeStyle='#27343a';ctx.fillStyle='#e4e6df';ctx.strokeText('661',256,100);ctx.fillText('661',256,100);
      const tex=new T.CanvasTexture(labelCanvas);tex.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,roughness:.86,side:T.DoubleSide});
      for(const side of[-1,1])for(const z of[-40,50]){const m=new T.Mesh(new T.PlaneGeometry(z<0?4.3:2.2,z<0?1.6:.85),mat);m.position.set(side*(at(z).w+.045),z<0?2.5:2.25,z);m.rotation.y=side*Math.PI/2;group.add(m);}
      const flagCanvas=document.createElement('canvas');flagCanvas.width=128;flagCanvas.height=80;const fc=flagCanvas.getContext('2d');fc.fillStyle='#e3e1d7';fc.fillRect(0,0,128,80);for(let i=0;i<13;i+=2){fc.fillStyle='#94413c';fc.fillRect(0,i*80/13,128,80/13);}fc.fillStyle='#273d5a';fc.fillRect(0,0,53,43);fc.fillStyle='#e6e5dc';for(let y=5;y<40;y+=8)for(let x=5;x<50;x+=8)fc.fillRect(x,y,2,2);const flagTex=new T.CanvasTexture(flagCanvas);flagTex.colorSpace=T.SRGBColorSpace;
      const flagGeo=new T.PlaneGeometry(1.5,.9,6,2),pos=flagGeo.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,.12*Math.sin(pos.getX(i)*7));flagGeo.computeVertexNormals();const flag=new T.Mesh(flagGeo,new T.MeshStandardMaterial({map:flagTex,side:T.DoubleSide,roughness:1}));flag.position.set(-.75,6.55,56);group.add(flag);
      const pirateCanvas=document.createElement('canvas');pirateCanvas.width=96;pirateCanvas.height=64;const pc=pirateCanvas.getContext('2d');pc.fillStyle='#161c20';pc.fillRect(0,0,96,64);pc.strokeStyle='#dedfd8';pc.lineWidth=5;pc.beginPath();pc.moveTo(26,48);pc.lineTo(70,20);pc.moveTo(26,20);pc.lineTo(70,48);pc.stroke();pc.fillStyle='#dedfd8';pc.beginPath();pc.arc(48,27,12,0,Math.PI*2);pc.fill();pc.fillRect(42,34,12,8);pc.fillStyle='#161c20';pc.fillRect(41,25,4,5);pc.fillRect(51,25,4,5);const pirateTex=new T.CanvasTexture(pirateCanvas);pirateTex.colorSpace=T.SRGBColorSpace;const pirate=new T.Mesh(new T.PlaneGeometry(1.3,.85),new T.MeshStandardMaterial({map:pirateTex,side:T.DoubleSide,roughness:1}));pirate.position.set(-.65,23.2,-12);group.add(pirate);
    }
    for(const b of batches.values()){const m=new T.InstancedMesh(base[b.kind],mats[b.material],b.matrices.length);b.matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();m.name='KIDD '+b.kind+' '+b.material;group.add(m);}
    for(const [data,opacity]of[[lines,.9],[rigging,.55]]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data,3));const m=new T.LineSegments(g,new T.LineBasicMaterial({color:0x3b484b,transparent:true,opacity}));m.name='KIDD rails and rigging';group.add(m);}
    group.userData={historical:true,year:2023,dimensions,sources,notes};
    const obstacles=[{x:berth.x,z:berth.z,heading:berth.heading,length:dimensions.length,width:dimensions.beam,speed:0,kind:'historic-ship',name:'USS KIDD (2023 berth view)'}];
    for(const z of[-33,28]){const p=wp(-11.6,z);obstacles.push({x:p.x,z:p.z,heading:berth.heading,length:3,width:4,speed:0,kind:'mooring-dolphin',name:'USS KIDD mooring dolphin'});}
    const landmark={name:'USS KIDD · 2023 berth view',lon:berth.lon,lat:berth.lat,x:berth.x,z:berth.z,historical:true,year:2023,view,description:'Historic Fletcher-class destroyer at her actual Baton Rouge berth, reconstructed as seen in the 2023 aerial imagery.'};
    return {group,obstacles,landmarks:[landmark],view,sources,notes};
  }
  root.BRKidd={create,berth,dimensions,view,sources,notes};
})(globalThis);
