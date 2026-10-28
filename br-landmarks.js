/* Baton Rouge landmarks. Horizontal positions use official EBRGIS geometry.
 * Building masses and bridge members are modeled approximations, not scans.
 * Capitol height: Louisiana House of Representatives (450 ft / 137.16 m).
 * US190 main spans: Louisiana DOTD Historic Bridge Management Plan, March 2017.
 * I10 dimensions: University of Illinois MAE report 09-02, bridge 46.
 */
(function(root){
  'use strict';
  const locations=[
    {name:'Louisiana State Capitol',lon:-91.18744222814806,lat:30.457143907024797,cameraHeight:36,cameraFov:34},
    {name:'Old State Capitol',lon:-91.18907405460517,lat:30.446600248429696,cameraHeight:24,cameraFov:34},
    {name:'LSU Tiger Stadium',lon:-91.1838426850992,lat:30.412044972195265,cameraHeight:58,cameraFov:28}
  ];
  // Horizontal anchors are derived from official footprints and the 2023 NAIP aerial.
  const anchors={capitol:{x:1182.0826665601926,z:-1913.3922641095705,angle:.025,height:137.16},oldCapitol:{x:1038.5863888624008,z:-747.5436031809077,angle:.025,height:26.213},stadium:{x:1601.551703066798,z:3073.790545713622,angle:.397,height:59}};
  const stadiumFootprint=[[1502.34,3048.76],[1496.28,3048.7],[1485.03,3051.4],[1484.6,3049.48],[1482.77,3049.71],[1481.24,3042.61],[1481.17,3037.32],[1482.13,3033.75],[1484.26,3026.4],[1486.1,3027.39],[1486.48,3025.14],[1497.32,3029.36],[1499.57,3030.34],[1502.16,3029.82],[1503.29,3025.24],[1506.45,3016.99],[1510.54,3007.72],[1517.13,2997.16],[1525.05,2989.23],[1536.06,2981.1],[1535.16,2978.36],[1577.66,2959.44],[1578.68,2961.92],[1594.34,2958.93],[1600.03,2958.23],[1606.88,2958.53],[1611.74,2958.9],[1617.47,2959.66],[1628.32,2962.66],[1637.71,2966.63],[1646.05,2971.53],[1654.69,2978.48],[1659.95,2984.32],[1682.27,2966.62],[1692.09,2984.92],[1697.4,2997.12],[1704.18,3011.73],[1721.58,3050.38],[1731.58,3071.77],[1735.96,3081.76],[1739.46,3097.85],[1739.59,3103.28],[1739.2,3113.88],[1737.08,3126.8],[1733.98,3153.76],[1737.41,3154],[1737.02,3157.37],[1735.63,3164.94],[1727.77,3164.37],[1711.19,3194.09],[1704.55,3190.28],[1699.13,3187.15],[1695.37,3185.44],[1690.2,3190.7],[1664.93,3202.02],[1644.82,3211.37],[1630.62,3216.9],[1618.16,3219.09],[1606.66,3219.16],[1600.31,3219.25],[1592.31,3217.69],[1583.19,3215.76],[1574.54,3212.41],[1572.01,3210.89],[1573.08,3208],[1563.51,3203.4],[1559.74,3209.31],[1554.53,3206.3],[1550.5,3209.51],[1526.48,3187.76],[1529.45,3183.86],[1505.13,3132.8],[1495.28,3110.85],[1486.92,3095.11],[1480.84,3077.88],[1474.6,3060.22],[1497.79,3053.97],[1502.5,3052.51],[1502.43,3050.71],[1502.34,3048.76]];
  const vegetationExclusions=[{name:'Tiger Stadium mapped footprint and playing field',outer:stadiumFootprint}];
  const bridgeData={
    'W INTERSTATE 10 HWY':{center:{x:376.2967718271986,z:47.47450418595291},length:1386.84,mainSpan:376.428,mainHalf:438.214,deckElevation:58,deckWidth:32.828,color:0x596c70,piers:[-438.214,-188.214,188.214,438.214],source:'https://mae.cee.illinois.edu/publications/reports/Report09-02.pdf'},
    'AIRLINE HWY':{center:{x:105.99690006020376,z:-7425.338802192363},length:1791.9192,mainSpan:258.4704,mainHalf:506.8824,deckElevation:41,deckWidth:29.973,color:0x86533f,piers:[-506.8824,-357.5304,-99.06,99.06,357.5304,506.8824],source:'https://dotd.la.gov/media/dbuegte2/mississippi-river-huey-p-long-bridge-160802a_051880.pdf'}
  };
  const notes=[
    'Bridge axes come from EBRGIS Bridge polygons; crossing centers are intersections of those axes with the mapped Mississippi water polygon.',
    'Bridge main-span lengths and structure types are source-backed. Individual truss members, pier locations, approach grades and deck elevations are visual reconstructions, not engineering clearance data.',
    'The State Capitol tower uses the documented 137.16-m height. Its facade details and stepped masses are approximations within the mapped building location.',
    'Old State Capitol height is 26.213 m from EBRGIS building id150960; the Gothic facade is a geometric reconstruction.',
    'Tiger Stadium follows the real playing-field location and aerial orientation, with an open lower bowl, east/west upper decks and the 2014 south expansion. Upper-deck elevations and facade details are visual estimates, not surveyed dimensions. The north scoreboard depicts the pre-2024 configuration.',
    'USS KIDD is supplied separately by BRKidd as an explicitly historical 2023 berth view. The museum remains represented by its actual mapped building footprint.'
  ];
  function create(scene,options={}){
    const T=root.THREE,G=root.BR_GEO,groundAt=options.groundAt||(()=>0),waterElevation=Number.isFinite(options.waterElevation)?options.waterElevation:4;
    const group=new T.Group();group.name='Source-positioned Baton Rouge landmarks';scene.add(group);
    const obstacles=[],batches=new Map(),surfaces=new Map(),dummy=new T.Object3D();let model='bridges';
    const mats={stone:new T.MeshStandardMaterial({color:0xc9c6b3,roughness:.82}),oldStone:new T.MeshStandardMaterial({color:0xd3d4bd,roughness:.9}),concrete:new T.MeshStandardMaterial({color:0xaaa99b,roughness:.93}),road:new T.MeshStandardMaterial({color:0x777972,roughness:.97}),glass:new T.MeshStandardMaterial({color:0x52666a,roughness:.35,metalness:.25}),dark:new T.MeshStandardMaterial({color:0x454b49,roughness:.74}),white:new T.MeshStandardMaterial({color:0xd9d8bd,roughness:.86}),rust:new T.MeshStandardMaterial({color:0x86533f,roughness:.66,metalness:.48}),blue:new T.MeshStandardMaterial({color:0x596c70,roughness:.58,metalness:.5})};
    Object.assign(mats,{roof:new T.MeshStandardMaterial({color:0x6c7b73,roughness:.88,side:T.DoubleSide}),seat:new T.MeshStandardMaterial({color:0xb7b6ad,roughness:.86,side:T.DoubleSide}),purple:new T.MeshStandardMaterial({color:0x4e3c60,roughness:.94}),gold:new T.MeshStandardMaterial({color:0xc0a74b,roughness:.9}),grass:new T.MeshStandardMaterial({color:0x55773a,roughness:1}),line:new T.MeshStandardMaterial({color:0xddd9c2,roughness:.95})});
    const baseBox=new T.BoxGeometry(1,1,1),baseCylinder=new T.CylinderGeometry(1,1,1,16),baseOctagon=new T.CylinderGeometry(1,1,1,8),baseBeam=new T.BoxGeometry(1,1,1);
    function archGeometry(pointed){const s=new T.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(.5,.55);if(pointed){s.quadraticCurveTo(.45,.82,0,1);s.quadraticCurveTo(-.45,.82,-.5,.55);}else{s.absarc(0,.5,.5,0,Math.PI,false);}s.lineTo(-.5,0);return new T.ShapeGeometry(s,8);}
    const gothicArch=archGeometry(true),romanArch=archGeometry(false);
    function frame(x,z,y=0,angle=0){const f=new T.Object3D();f.position.set(x,y,z);f.rotation.y=angle;f.updateMatrixWorld(true);return f;}
    function push(kind,mat,f,matrix){const key=model+'-'+kind+'-'+mat;if(!batches.has(key))batches.set(key,{kind,mat,model,matrices:[]});batches.get(key).matrices.push(new T.Matrix4().multiplyMatrices(f.matrixWorld,matrix));}
    function box(f,x,y,z,w,h,d,mat='stone'){dummy.position.set(x,y+h*.5,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();push('box',mat,f,dummy.matrix);}
    function cylinder(f,x,y,z,r,h,mat='stone'){dummy.position.set(x,y+h*.5,z);dummy.rotation.set(0,0,0);dummy.scale.set(r,h,r);dummy.updateMatrix();push('cylinder',mat,f,dummy.matrix);}
    function octagon(f,x,y,z,r,h,mat='oldStone'){dummy.position.set(x,y+h*.5,z);dummy.rotation.set(0,Math.PI/8,0);dummy.scale.set(r,h,r);dummy.updateMatrix();push('octagon',mat,f,dummy.matrix);}
    function arch(f,x,y,z,w,h,angle=0,pointed=true){dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,h,1);dummy.updateMatrix();push(pointed?'arch':'roman','glass',f,dummy.matrix);}
    function quad(f,a,b,c,d,mat){const key=model+'-'+mat;if(!surfaces.has(key))surfaces.set(key,{model,mat,positions:[]});const out=surfaces.get(key).positions;for(const p of[a,b,d,b,c,d]){const v=new T.Vector3(...p).applyMatrix4(f.matrixWorld);out.push(v.x,v.y,v.z);}}
    function roof(f,x,z,w,d,y,rise){quad(f,[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y+rise,z],[x-w/2,y+rise,z],'roof');quad(f,[x-w/2,y+rise,z],[x+w/2,y+rise,z],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2],'roof');}
    function foundation(f,ring,top,mat='concrete'){for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5));for(let j=0;j<steps;j++){const p=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps],q=[a[0]+(b[0]-a[0])*(j+1)/steps,a[1]+(b[1]-a[1])*(j+1)/steps],wp=new T.Vector3(p[0],0,p[1]).applyMatrix4(f.matrixWorld),wq=new T.Vector3(q[0],0,q[1]).applyMatrix4(f.matrixWorld),yp=Math.min(top,groundAt(wp.x,wp.z)-f.position.y-.3),yq=Math.min(top,groundAt(wq.x,wq.z)-f.position.y-.3);quad(f,[p[0],yp,p[1]],[q[0],yq,q[1]],[q[0],top,q[1]],[p[0],top,p[1]],mat);}}}
    function beam(f,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());dummy.scale.set(r,v.length(),r);dummy.updateMatrix();push('beam',mat,f,dummy.matrix);}
    function makeBridge(b){
      const cfg=bridgeData[b.road];if(!cfg)return;
      const d0=b.axis[0],d1=b.axis[1],dx=d1[0]-d0[0],dz=d1[1]-d0[1];
      const angle=Math.atan2(-dz,dx),f=frame(cfg.center.x,cfg.center.z,0,angle),deck=cfg.deckElevation-waterElevation;
      const old=b.road==='AIRLINE HWY',steel=old?'rust':'blue',half=cfg.length*.5,width=cfg.deckWidth;
      const deckAt=x=>deck-8*Math.max(0,(Math.abs(x)-cfg.mainHalf)/(half-cfg.mainHalf));
      // Main crossing is level; shallow approach grades are a reconstruction.
      // Short segments avoid a single implausible kilometre-long flat slab.
      const deckPanels=Math.ceil(cfg.length/24),panelLength=cfg.length/deckPanels;
      for(let i=0;i<deckPanels;i++){const x=-half+(i+.5)*panelLength,y=deckAt(x);box(f,x,y-2,0,panelLength+.12,2,width,'concrete');box(f,x,y,0,panelLength+.12,.25,width-1.4,'road');for(const z of[-width*.5+.35,width*.5-.35])box(f,x,y+.25,z,panelLength+.12,.9,.45,'concrete');}
      // US190 has a central railway with highway decks cantilevered outside its
      // two truss planes; I10 has six highway lanes inside a wider truss.
      if(old){
        for(let i=0;i<deckPanels;i++){const x=-half+(i+.5)*panelLength,y=deckAt(x);box(f,x,y+.27,0,panelLength,.12,4,'dark');for(const z of[-.72,.72])box(f,x,y+.4,z,panelLength,.17,.12,'blue');}
        for(let x=-half+1.2;x<half;x+=2.4)box(f,x,deckAt(x)+.3,0,.22,.14,2.8,'dark');
        for(const z of[-10,10])for(let x=-half+5;x<half-4;x+=18)box(f,x,deckAt(x)+.28,z,8,.015,.12,'white');
      }else{
        for(const z of[-8,-4,0,4,8])for(let x=-half+5;x<half-4;x+=18)box(f,x,deckAt(x)+.28,z,8,.015,.12,'white');
      }
      for(const x of cfg.piers){
        box(f,x,-5,0,10,14,width+4,'concrete');
        for(const z of[-width*.28,width*.28])box(f,x,9,z,8,deck-11,8,'concrete');
        box(f,x,deck-5,0,17,3,width+9,'concrete');
        const p=new T.Vector3(x,0,0).applyMatrix4(f.matrixWorld);
        obstacles.push({x:p.x,z:p.z,heading:angle,length:width+4,width:10,speed:0,kind:'bridge-pier',name:b.name});
      }
      // Approach piers are placed along the mapped axis; only the bridge
      // superstructure is reconstructed, not unverified interchange ramps.
      for(const side of[-1,1])for(let x=cfg.mainHalf+80;x<half-35;x+=90){
        const y=deckAt(x),world=new T.Vector3(x*side,0,0).applyMatrix4(f.matrixWorld),foot=Math.min(y-5,groundAt(world.x,world.z)-.5);
        for(const z of[-width*.32,width*.32])box(f,x*side,foot,z,4.5,y-3-foot,5,'concrete');box(f,x*side,y-3,0,9,1,width,'concrete');
      }
      const trussZ=old?4.8768:width*.5-1.0;
      function top(x){
        if(old){const nearest=Math.min(...cfg.piers.slice(1,-1).map(p=>Math.abs(p-x)));return deck+14+20*Math.max(0,1-nearest/130);}
        const nearest=Math.min(Math.abs(x-188.214),Math.abs(x+188.214));return deck+11+35*Math.max(0,1-nearest/250);
      }
      const panels=old?62:56,step=cfg.mainHalf*2/panels;
      for(const z of[-trussZ,trussZ])for(let i=0;i<panels;i++){
        const x=-cfg.mainHalf+i*step,next=x+step,h=top(x),hn=top(next);
        beam(f,[x,deck+1,z],[next,deck+1,z],.75,steel);beam(f,[x,h,z],[next,hn,z],.82,steel);
        beam(f,[x,deck+1,z],[x,h,z],.53,steel);beam(f,[x,deck+1,z],[next,hn,z],.5,steel);
        if(i%2===0)beam(f,[x,h,z],[next,deck+1,z],.35,steel);
      }
      for(let i=0;i<=panels;i+=2){const x=-cfg.mainHalf+i*step,h=top(x);beam(f,[x,h,-trussZ],[x,h,trussZ],.65,steel);beam(f,[x,deck-1,-width*.5],[x,deck-1,width*.5],1,steel);if(i<panels){const nx=x+step*2,nh=top(nx);beam(f,[x,h,-trussZ],[nx,nh,trussZ],.45,steel);beam(f,[x,h,trussZ],[nx,nh,-trussZ],.45,steel);}}
      for(const side of[-1,1])for(let x=cfg.mainHalf;x<half-20;x+=24){
        const next=Math.min(half,x+24),y=deckAt(x),ny=deckAt(next);for(const z of[-width*.45,width*.45]){beam(f,[x*side,y-2,z],[next*side,ny-8,z],.65,steel);beam(f,[x*side,y-8,z],[next*side,ny-2,z],.65,steel);beam(f,[x*side,y-8,z],[next*side,ny-8,z],.85,steel);beam(f,[x*side,y-2,z],[x*side,y-8,z],.7,steel);}
      }
    }
    for(const b of G.bridges||[])makeBridge(b);
    function makeCapitol(){
      model='Louisiana State Capitol';const a=anchors.capitol,f=frame(a.x,a.z,groundAt(a.x,a.z),a.angle);
      // Broad four-storey base, two legislative chamber wings and the narrow
      // limestone tower: dimensions follow the official footprint and photos.
      const base=[[-52,-21],[52,-21],[52,21],[-52,21]];foundation(f,base,1.1);
      box(f,0,.6,0,104,3.5,42);box(f,0,4.1,0,61,17,39);
      for(const side of[-1,1]){box(f,side*40,4.1,0,24,14.4,37);box(f,side*40,18.5,0,25,1.2,38);box(f,side*40,19.7,-1,19,2.5,29);box(f,side*39,22.2,-1,20,.6,30);}
      box(f,0,21.1,0,47,5.9,33);box(f,0,27,0,29,74,25.8);
      // Successive stepped shoulders terminate at 450 feet. No dome.
      for(const p of[[0,101,0,26,11,23.8],[0,112,0,22.5,8.5,21],[0,120.5,0,19,6.4,18.3],[0,126.9,0,14.7,4.2,14.4],[0,131.1,0,10.2,3.5,10],[0,134.6,0,6.2,2.56,6.2]])box(f,...p);
      for(const side of[-1,1]){
        for(let x=-11.7;x<=11.8;x+=3.9)box(f,x,28,side*13.05,.72,72,.52);
        for(let y=29;y<99;y+=3.95)for(let x=-9.75;x<=9.8;x+=3.9)box(f,x,y,side*13.16,1.52,2.25,.12,'glass');
        for(let z=-8.3;z<=8.4;z+=4.15){box(f,side*14.65,28,z,.6,72,.73);for(let y=29;y<99;y+=3.95)box(f,side*14.59,y,z+1.9,.12,2.25,1.4,'glass');}
        // Vertical ribs continue into the stepped crown.
        for(let x=-8;x<=8;x+=4)box(f,x,103,side*12,.6,8,.6);
        for(let x=-7;x<=7;x+=3.5)box(f,x,113,side*10.6,.6,6.7,.6);
        for(let x=-48;x<49;x+=5.2)for(let y=6;y<17;y+=4.1)box(f,x,y,side*19.65,1.8,2.9,.12,'glass');
        for(let x=-23;x<=23;x+=4.6)box(f,x,5,side*20.2,.85,14.9,.9);
        box(f,side*51.9,5,0,1,12,35);box(f,0,19.8,side*20.4,104,1,1.2);
      }
      // South ceremonial stair and central portico.
      for(let i=0;i<47;i++)box(f,0,i*.16,39-i*.35,35,.16,1.1);
      box(f,0,6.5,21.2,24,14,3.7);for(let x=-8.4;x<9;x+=4.2){box(f,x,7.5,23.11,2.2,8.7,.12,'dark');box(f,x-1.6,7.4,23.25,.7,11.1,.8);}
      box(f,0,20.2,21.4,26,1.4,4.8);
      foundation(f,[[-17.5,39.6],[17.5,39.6],[17.5,21],[-17.5,21]],.2);
    }
    function makeOldCapitol(){
      model='Old State Capitol';const a=anchors.oldCapitol,f=frame(a.x,a.z,groundAt(a.x,a.z),a.angle);
      // NPS nomination: cruciform plan, eight towers; west pair octagonal,
      // other six square. West is the river-facing elevation.
      const cross=[[-29,-12],[-14,-12],[-14,-20],[14,-20],[14,-12],[29,-12],[29,12],[14,12],[14,20],[-14,20],[-14,12],[-29,12]];
      foundation(f,cross,.6,'oldStone');box(f,0,0,0,54,15.7,25,'oldStone');box(f,0,0,0,28,20,37,'oldStone');
      roof(f,0,0,54,25,15.7,4.3);roof(f,0,0,28,37,20,2);
      box(f,0,22,0,13,1.8,12,'oldStone');box(f,0,23.8,0,10.7,.7,10,'glass');
      for(const z of[-10,10]){
        octagon(f,-24.2,0,z,5,24,'oldStone');octagon(f,-24.2,24,z,5.35,.7,'oldStone');
        for(let i=0;i<8;i++){const q=i*Math.PI/4+Math.PI/8;box(f,-24.2+Math.cos(q)*4.55,24.7,z+Math.sin(q)*4.55,1.6,1.513,1.6,'oldStone');}
        for(const y of[5.8,14])arch(f,-28.84,y,z,2.1,5,-Math.PI/2);
      }
      for(const p of[[24.2,-10],[24.2,10],[-10,-17],[10,-17],[-10,17],[10,17]]){
        box(f,p[0],0,p[1],7.5,23.6,7.5,'oldStone');box(f,p[0],23.6,p[1],8.1,1.1,8.1,'oldStone');
        for(const s of[-1,1])for(const t of[-1,0,1]){box(f,p[0]+s*3.3,24.7,p[1]+t*2.7,1.5,1.513,1.5,'oldStone');box(f,p[0]+t*2.7,24.7,p[1]+s*3.3,1.5,1.513,1.5,'oldStone');}
        for(const s of[-1,1]){arch(f,p[0],7,p[1]+s*3.79,2.1,5,s<0?Math.PI:0);arch(f,p[0],15,p[1]+s*3.79,1.8,5,s<0?Math.PI:0);}
      }
      // Pointed stained-glass west window, side lancets and tracery.
      arch(f,-27.06,5.8,0,9.2,12,-Math.PI/2);for(const z of[-2.8,0,2.8])box(f,-27.2,6,z,.25,7.7,.28,'oldStone');
      beam(f,[-27.25,13.5,-4],[-27.25,17.4,0],.18,'oldStone');beam(f,[-27.25,17.4,0],[-27.25,13.5,4],.18,'oldStone');
      for(const side of[-1,1])for(const x of[-19,-13,13,19]){arch(f,x,4,side*12.56,2.1,7,side<0?Math.PI:0);box(f,x-1.6,1,side*12.8,.7,14.4,1.1,'oldStone');}
      for(let z=-8;z<=8;z+=4)arch(f,27.06,5,z,2.2,7,Math.PI/2);
      for(const side of[-1,1])for(let x=-23;x<=23;x+=3.6)box(f,x,16.3,side*12.55,1.3,1.7,1,'oldStone');
      for(const side of[-1,1])for(let x=-6.8;x<=6.9;x+=3.4)box(f,x,20,side*18.6,1.5,1.9,1,'oldStone');
    }
    function makeStadium(){
      model='LSU Tiger Stadium';const a=anchors.stadium,f=frame(a.x,a.z,groundAt(a.x,a.z),a.angle);
      // Field dimensions are regulation. Architectural tiers follow LSU's
      // chronology and the 2023 aerial, with visually estimated elevations.
      box(f,0,.22,0,48.768,.1,109.728,'grass');
      for(const s of[-1,1])box(f,0,.34,s*50.292,48.7,.018,9.144,'purple');
      for(let z=-45.72;z<=45.73;z+=9.144)box(f,0,.35,z,48.5,.02,.12,'line');
      for(const x of[-24.42,24.42])box(f,x,.35,0,.12,.02,109.8,'line');
      for(let z=-45.72;z<=45.73;z+=.9144)for(const x of[-6.096,6.096])box(f,x,.36,z,.63,.02,.09,'line');
      function stadiumPoint(t,rx,rz){const c=Math.cos(t),v=Math.sin(t);return[Math.sign(c)*Math.pow(Math.abs(c),.72)*rx,Math.sign(v)*Math.pow(Math.abs(v),.85)*rz];}
      function annularRows(rows,y0,rise,rx0,rz0,step,begin,end,segments,mat='seat'){
        for(let r=0;r<rows;r++){const rx=rx0+r*step,rz=rz0+r*step,y=y0+r*rise;for(let j=0;j<segments;j++){const t=begin+(end-begin)*j/segments,u=begin+(end-begin)*(j+1)/segments,p=stadiumPoint(t,rx,rz),q=stadiumPoint(u,rx,rz),v=stadiumPoint(u,rx+step,rz+step),w=stadiumPoint(t,rx+step,rz+step);quad(f,[p[0],y,p[1]],[q[0],y,q[1]],[v[0],y,v[1]],[w[0],y,w[1]],mat);quad(f,[w[0],y,w[1]],[v[0],y,v[1]],[v[0],y+rise,v[1]],[w[0],y+rise,w[1]],'concrete');}}
      }
      annularRows(44,1.3,.49,37,67,.92,0,Math.PI*2,96);
      // Lower bowl wall: an open center is retained, never a solid roof slab.
      for(let j=0;j<96;j++){const t=j*Math.PI*2/96,u=(j+1)*Math.PI*2/96,p=stadiumPoint(t,78,108),q=stadiumPoint(u,78,108);quad(f,[p[0],0,p[1]],[q[0],0,q[1]],[q[0],23,q[1]],[p[0],23,p[1]],'stone');}
      const outer=[];for(let j=0;j<96;j++)outer.push(stadiumPoint(j*Math.PI*2/96,78,108));foundation(f,outer,.5,'stone');
      // Original north-end dormitory facade, paired arches and flat parapet.
      for(let j=0;j<40;j++){const t=Math.PI+(j+.5)*Math.PI/40,p=stadiumPoint(t,78.3,108.3),angle=Math.atan2(Math.cos(t),Math.sin(t));for(const y of[3.3,10.2])arch(f,p[0],y,p[1],3.2,5.3,angle,false);}
      // East and west upper decks. Their long straight sidelines terminate
      // short of the lower north horseshoe; south is the later expansion.
      for(const side of[-1,1]){
        for(let r=0;r<29;r++){const inner=70+r*1.53,outer=inner+1.53,y=30.5+r*.77,z0=-69,z1=67;quad(f,[side*inner,y,z0],[side*inner,y,z1],[side*outer,y,z1],[side*outer,y,z0],'seat');quad(f,[side*outer,y,z0],[side*outer,y,z1],[side*outer,y+.77,z1],[side*outer,y+.77,z0],'concrete');}
        box(f,side*88,23,-1,28,7.5,142,'stone');box(f,side*102.1,25.5,-1,.18,3.5,140,'glass');
        box(f,side*115.3,50,-1,3.2,2.5,140,'concrete');
        for(let z=-67;z<=67;z+=13.4){box(f,side*111,0,z,2.5,48,3.5,'concrete');beam(f,[side*71,22,z],[side*114,50,z],1.3,'concrete');}
        for(let z=-58;z<=58;z+=29){box(f,side*115,51,z,.65,7,.65,'dark');box(f,side*114.2,57,z,1.3,1.6,6,'dark');for(let q=-2;q<=2;q++)box(f,side*113.4,57.4,z+q*1.15,.2,.8,.8,'white');}
        foundation(f,[[side*69,-72],[side*118,-72],[side*118,71],[side*69,71]],.3);
      }
      // West press box and premium suites sit above the west grandstand.
      box(f,-111.2,43,-2,11,8.1,106,'stone');box(f,-105.6,44.1,-2,.16,5.7,102,'glass');box(f,-111.2,51.1,-2,12,.8,109,'white');
      annularRows(23,31,.77,78,103,1.4,.16*Math.PI,.84*Math.PI,48);
      // South suites follow the curved stand, leaving the field open.
      for(let i=0;i<28;i++){const t=.16*Math.PI+i*.68*Math.PI/28,u=.16*Math.PI+(i+1)*.68*Math.PI/28,p=stadiumPoint(t,97,124),q=stadiumPoint(u,97,124);quad(f,[p[0],.2,p[1]],[q[0],.2,q[1]],[q[0],30.4,q[1]],[p[0],30.4,p[1]],'stone');quad(f,[p[0]*1.001,24,p[1]*1.001],[q[0]*1.001,24,q[1]*1.001],[q[0]*1.001,28,q[1]*1.001],[p[0]*1.001,28,p[1]*1.001],'glass');}
      const south=[];for(let i=0;i<=32;i++)south.push(stadiumPoint(.16*Math.PI+i*.68*Math.PI/32,97,124));foundation(f,south,.4,'stone');
      // Pre-2024 north video board; historic scene uses the 80 ft x 27 ft board.
      for(const x of[-9,9])box(f,x,20,-109,1.1,12,1.1,'dark');box(f,0,29,-109,25.6,9.6,1.8,'dark');box(f,0,29.7,-107.99,24.384,8.2296,.12,'purple');
      for(const x of[-54,54]){box(f,x,42,105,1.2,11,1.2,'dark');box(f,x,48,104,13,5,1.2,'dark');}
      for(const s of[-1,1]){box(f,0,0,s*58, .24,5.5,.24,'gold');box(f,0,5.3,s*55.6,5.64,.2,.2,'gold');for(const x of[-2.82,2.82])box(f,x,5.3,s*55.6,.18,4.6,.18,'gold');beam(f,[0,5.3,s*58],[0,5.3,s*55.6],.22,'gold');}
      // Small aisle breaks across rows read as individual grandstand sections.
      for(const side of[-1,1])for(let z=-58;z<=58;z+=19.33)for(let r=0;r<29;r++)box(f,side*(70.7+r*1.53),30.53+r*.77,z,1.5,.035,1.2,'dark');
      if(root.document){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#d0cbb3';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#42334d';ctx.font='bold 78px sans-serif';ctx.textAlign='center';ctx.fillText('TIGER STADIUM',512,94);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const label=new T.Mesh(new T.PlaneGeometry(64,8),new T.MeshStandardMaterial({map:tex,roughness:.9}));label.name='Tiger Stadium west name';label.userData.landmark=model;label.position.set(-117.1,44.5,-1);label.rotation.y=-Math.PI/2;label.applyMatrix4(f.matrixWorld);group.add(label);}
    }
    makeCapitol();makeOldCapitol();makeStadium();
    for(const b of batches.values()){
      const geometry=b.kind==='box'?baseBox:b.kind==='beam'?baseBeam:b.kind==='octagon'?baseOctagon:b.kind==='arch'?gothicArch:b.kind==='roman'?romanArch:baseCylinder;
      const mesh=new T.InstancedMesh(geometry,mats[b.mat],b.matrices.length);
      mesh.name=b.model+' '+b.kind+' '+b.mat;mesh.userData.landmark=b.model;
      b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    }
    for(const b of surfaces.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));g.computeVertexNormals();const material=mats[b.mat].clone();material.side=T.DoubleSide;const mesh=new T.Mesh(g,material);mesh.name=b.model+' surfaces '+b.mat;mesh.userData.landmark=b.model;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
    const modelAnchors=[anchors.capitol,anchors.oldCapitol,anchors.stadium],targetHeights=[72,14,32];
    const landmarks=locations.map((p,i)=>{const a=modelAnchors[i];return{...p,...G.toWorld(p.lon,p.lat),modelHeight:a.height,view:{target:{x:a.x,y:groundAt(a.x,a.z)+targetHeights[i],z:a.z}}};});
    return {group,obstacles,landmarks,notes,anchors,vegetationExclusions};
  }
  root.BRLandmarks={create,excludeBuildingIds:[211881,150960,9110],locations,notes,bridgeData,anchors,vegetationExclusions};
})(globalThis);
