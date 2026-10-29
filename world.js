/* Baton Rouge atmosphere, water and lighting around the source-backed BRScene.
 * Water, weather, facade detail and foliage textures remain visual models. */
(function(root){
  'use strict';
  const T=root.THREE,R=root.RIVER;
  let seed=528104;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function texture(c,repeat){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);}t.anisotropy=8;return t;}
  function noise(x,z){return Math.sin(x*.028+Math.cos(z*.019)*1.5)*.4+Math.sin(z*.037+x*.011)*.25;}
  function surfaceTexture(){
    const c=canvas(512,512),ctx=c.getContext('2d'),im=ctx.createImageData(512,512);
    for(let z=0;z<512;z++)for(let x=0;x<512;x++){
      const n=18*noise(x,z)+random()*30-15,idx=(z*512+x)*4;
      im.data[idx]=99+n;im.data[idx+1]=112+n;im.data[idx+2]=69+n*.7;im.data[idx+3]=255;
    }
    ctx.putImageData(im,0,0);ctx.globalAlpha=.14;
    for(let i=0;i<16000;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=i%3?'#a9ad71':'#36452d';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*2-1,y-random()*5-2);ctx.stroke();}
    return texture(c,1);
  }
  function normalTexture(){
    const size=512,c=canvas(size,size),ctx=c.getContext('2d'),im=ctx.createImageData(size,size);
    const heights=new Float32Array(size*size),smooth=t=>t*t*(3-2*t);
    function lattice(x,y,n){let h=Math.imul((x+n)%n+17011,374761393)^Math.imul((y+n)%n+31337,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
    function valueNoise(x,y,n){const xx=x/size*n,yy=y/size*n,ix=Math.floor(xx),iy=Math.floor(yy),tx=smooth(xx-ix),ty=smooth(yy-iy),a=lattice(ix,iy,n),b=lattice(ix+1,iy,n),d=lattice(ix,iy+1,n),e=lattice(ix+1,iy+1,n);return (a+(b-a)*tx)*(1-ty)+(d+(e-d)*tx)*ty;}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)heights[y*size+x]=valueNoise(x,y,5)*.54+valueNoise(x,y,13)*.28+valueNoise(x,y,29)*.13+valueNoise(x,y,61)*.06+valueNoise(x,y,113)*.025;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*7;
      const dy=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*7;
      const inv=1/Math.hypot(dx,dy,1),i=(y*size+x)*4;
      im.data[i]=128+dx*inv*127;im.data[i+1]=128+dy*inv*127;im.data[i+2]=128+inv*127;im.data[i+3]=255;
    }
    ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
  }
  function foliageTexture(){
    const c=canvas(512,768),g=c.getContext('2d');
    // Branches are drawn beneath thousands of individually lit leaves. Three
    // crossed alpha-tested planes give a dense, irregular canopy silhouette.
    function branch(x,y,len,angle,thick,level){
      const xx=x+Math.sin(angle)*len,yy=y-Math.cos(angle)*len;
      g.strokeStyle=level<2?'#625747':'#75664d';g.lineWidth=thick;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();
      if(level<5){branch(xx,yy,len*(.62+random()*.12),angle-.34-random()*.35,thick*.63,level+1);branch(xx,yy,len*(.61+random()*.14),angle+.32+random()*.35,thick*.62,level+1);}
    }
    branch(256,760,220,0,27,0);
    const clusters=[];
    for(let i=0;i<28;i++){const a=random()*Math.PI*2,r=Math.sqrt(random());clusters.push({x:256+Math.cos(a)*188*r,y:300+Math.sin(a)*236*r});}
    clusters.sort((a,b)=>b.y-a.y);
    for(const cl of clusters)for(let j=0;j<190;j++){
      const a=random()*Math.PI*2,r=Math.sqrt(random()),x=cl.x+Math.cos(a)*62*r,y=cl.y+Math.sin(a)*62*r;
      const light=random(),shade=light>.78?'#8e9e55':light>.5?'#647b3e':light>.23?'#415e2d':'#2b4524';
      g.fillStyle=shade;g.beginPath();g.ellipse(x,y,3+random()*5,2+random()*3,random()*Math.PI,0,Math.PI*2);g.fill();
    }
    return texture(c);
  }
  function facadeTexture(){
    const c=canvas(256,512),g=c.getContext('2d');g.fillStyle='#9daba7';g.fillRect(0,0,256,512);
    for(let y=0;y<512;y+=20)for(let x=0;x<256;x+=18){
      const n=random();g.fillStyle=n>.86?'#a6b8ad':n>.5?'#60716f':'#4d625f';g.fillRect(x+3,y+3,11,13);
      g.fillStyle='#c8cbc0';g.fillRect(x,y+18,18,2);
    }
    return texture(c);
  }
  function cloudTexture(){
    const c=canvas(512,512),ctx=c.getContext('2d');
    for(let i=0;i<110;i++){
      const x=random()*512,y=random()*512,r=20+random()*65,g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(255,255,255,.095)');g.addColorStop(.45,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    return texture(c,3);
  }
  function shore(s,side,extra=0){const p=R.sample(s);return {x:p.x-p.tz*side*(p.width*.5+extra),z:p.z+p.tx*side*(p.width*.5+extra),angle:Math.atan2(-p.tx,-p.tz),p};}
  function material(color,opts){return new T.MeshStandardMaterial(Object.assign({color,roughness:.8,metalness:.05},opts));}

  function create(scene,renderer){
    seed=528104;
    const group=new T.Group();group.name='Mississippi landscape';scene.add(group);
    const obstacles=[];
    const grass=surfaceTexture(),facade=facadeTexture(),normal=normalTexture();
    const landMat=material(0xffffff,{map:grass,vertexColors:true,roughness:1});
    const concrete=material(0xaaa99a),steel=material(0x53635a,{roughness:.53,metalness:.5});
    const asphalt=material(0x77776a),roof=material(0xaaa795,{roughness:.7}),warehouseMat=material(0xc5c3ae);
    const sun=new T.DirectionalLight(0xffedd2,3.4);sun.position.set(2500,1600,-2500);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-450;sun.shadow.camera.right=450;sun.shadow.camera.top=450;sun.shadow.camera.bottom=-450;sun.shadow.camera.near=1;sun.shadow.camera.far=7000;sun.shadow.bias=-.00012;sun.shadow.normalBias=.45;sun.shadow.radius=2;scene.add(sun);scene.add(sun.target);
    const hemi=new T.HemisphereLight(0xc7dce3,0x6f674b,1.65);scene.add(hemi);
    const sky=new T.Sky();sky.scale.setScalar(10000);scene.add(sky);
    sky.material.fragmentShader=sky.material.fragmentShader.replace('vec4( retColor, 1.0 )','vec4( retColor * 0.68, 1.0 )');
    const skyU=sky.material.uniforms;skyU.turbidity.value=6.5;skyU.rayleigh.value=2.4;skyU.mieCoefficient.value=.006;skyU.mieDirectionalG.value=.82;
    const sunDirection=new T.Vector3();
    const water=new T.Water(root.BRScene.waterGeometry(),{textureWidth:512,textureHeight:512,waterNormals:normal,sunDirection,sunColor:0xffe8ba,waterColor:0x626044,distortionScale:2.8,fog:true,alpha:1});
    water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.025;').replace('vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);','vec3 albedo = mix( waterColor * ( vec3(0.65) + diffuseLight * 0.22 ) * getShadowMask(), reflectionSample * vec3(0.68,0.69,0.58) * 0.55 + waterColor * 0.19, reflectance * 0.82 ) + specularLight * 0.3;');
    water.material.uniforms.riverChop={value:.55};
    water.material.fragmentShader=water.material.fragmentShader.replace('uniform float size;', 'uniform float size; uniform float riverChop;').replace('noise.xzy * vec3( 1.5, 1.0, 1.5 )','noise.xzy * vec3( riverChop, 1.0, riverChop )');
    water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);
    // The water's repeated detail is generated entirely offline; a broad low
    // frequency layer and fine short waves break up the planar reflection.
    water.material.uniforms.size.value=3.2;
    const clouds=new T.Mesh(new T.PlaneGeometry(48000,48000),new T.MeshBasicMaterial({map:cloudTexture(),transparent:true,opacity:.47,depthWrite:false,color:0xfff7e7,side:T.DoubleSide,fog:false}));
    clouds.rotation.x=-Math.PI/2;clouds.position.y=2300;clouds.renderOrder=1;scene.add(clouds);

    // Replace the illustrative city with geographically registered source data.
    const mapped=root.BRScene.create(group,renderer,{foliageTexture,facadeTexture});
    obstacles.push(...mapped.obstacles);

    const pmrem=new T.PMREMGenerator(renderer);let environment=null,currentWeather='';
    const presets={
      golden:{elevation:8.5,azimuth:132,turbidity:4.2,rayleigh:2.2,fog:0xbab29b,density:.000078,sun:0xffdb9c,intensity:3.0,hemi:1.35,water:0x64583e,distortion:1.25,cloud:.19},
      morning:{elevation:27,azimuth:112,turbidity:3.6,rayleigh:2,fog:0xa6b9bd,density:.000085,sun:0xfff0d6,intensity:3.0,hemi:1.7,water:0x5e6458,distortion:1.1,cloud:.22},
      storm:{elevation:18,azimuth:140,turbidity:15,rayleigh:.65,fog:0x788a87,density:.00023,sun:0xc8d2cd,intensity:1.1,hemi:1.55,water:0x374e47,distortion:6.7,cloud:.88}
    };
    function setWeather(input){
      const name=typeof input==='string'?input:(input&&input.name)||'golden';if(name===currentWeather)return;currentWeather=name;
      const p=presets[name]||presets.golden;sunDirection.setFromSphericalCoords(1,T.MathUtils.degToRad(90-p.elevation),T.MathUtils.degToRad(p.azimuth));
      skyU.sunPosition.value.copy(sunDirection);skyU.turbidity.value=p.turbidity;skyU.rayleigh.value=p.rayleigh;
      water.material.uniforms.riverChop.value=name==='storm'?1.35:name==='morning'?.4:.55;
      water.material.uniforms.sunDirection.value.copy(sunDirection);water.material.uniforms.sunColor.value.setHex(p.sun);water.material.uniforms.waterColor.value.setHex(p.water);water.material.uniforms.distortionScale.value=p.distortion;
      sun.color.setHex(p.sun);sun.intensity=p.intensity;hemi.intensity=p.hemi;scene.fog=new T.FogExp2(p.fog,p.density);clouds.material.opacity=p.cloud;
      // Sky-derived image-based light makes every hull, tank and window belong
      // to the same atmosphere; refresh only when the selected weather changes.
      const envScene=new T.Scene(),envSky=sky.clone();envSky.scale.setScalar(10000);envSky.position.set(0,0,0);envScene.add(envSky);
      if(environment)environment.dispose();environment=pmrem.fromScene(envScene,.04,1,20000);scene.environment=environment.texture;
    }
    setWeather('golden');
    let targetPosition=scene.userData.initialFocus||R.sample(R.startS);
    function update(time,dt,weather){
      if(typeof dt==='string'||(dt&&typeof dt==='object'))weather=dt;
      if(weather)setWeather(weather);
      water.material.uniforms.time.value=time*(currentWeather==='storm'?.7:.35);
      clouds.material.map.offset.x=time*.00012;
      // Main may supply the vessel position through setFocus; a stable shadow
      // region follows it without rendering the entire river into the map.
      mapped.update(targetPosition.x,targetPosition.z,time);
      sun.target.position.set(targetPosition.x,0,targetPosition.z);
      sun.position.copy(sunDirection).multiplyScalar(3500).add(sun.target.position);
      sky.position.set(targetPosition.x,0,targetPosition.z);
    }
    function setFocus(x,z){if(typeof x==='object')targetPosition={x:x.x,z:x.z};else targetPosition={x,z};}
    update(0,0,'golden');
    return {water,sky,sun,group,obstacles,update,setWeather,setFocus,ready:mapped.ready,landmarks:mapped.landmarks,terrainAt:mapped.terrainAt,setQuality:mapped.setQuality,dispose(){environment?.dispose();pmrem.dispose();}};
  }
  root.RiverWorld={create};
})(globalThis);
