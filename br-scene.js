/* Baton Rouge scenery assembled from public geospatial source data.
 * Source positions/footprints are preserved; facade and vegetation volumes are visual models. */
(function(root){
'use strict';
const T=root.THREE,G=root.BR_GEO;
function shapeFrom(poly){
  const s=new T.Shape(poly.outer.slice(0,-1).map(p=>new T.Vector2(p[0],-p[1])));
  for(const ring of poly.holes||[])s.holes.push(new T.Path(ring.slice(0,-1).map(p=>new T.Vector2(p[0],-p[1]))));
  return s;
}
function waterGeometry(){return new T.ShapeGeometry(G.waterPolygons.map(shapeFrom));}
function typed(base64,Type){const str=atob(base64),bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);return new Type(bytes.buffer);}
function distanceToBox(x,z,b){return Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ));}
function pointInside(x,z,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function isWater(x,z){return root.RIVER_SHORE?root.RIVER_SHORE.contains(x,z):G.waterPolygons.some(p=>pointInside(x,z,p.outer)&&!(p.holes||[]).some(h=>pointInside(x,z,h)));}
function vegetationExcluded(x,z){return [...(root.BRLandmarks?.vegetationExclusions||[]),...(root.BRIndustry?.vegetationExclusions||[])].some(p=>pointInside(x,z,p.outer||p.ring)&&!(p.holes||[]).some(h=>pointInside(x,z,h)));}
function create(group,renderer,helpers={}){
  const tiles=root.BR_IMAGERY.tiles.map(t=>({...t,texture:null,promise:null,materials:[],meshes:[],trees:null,lastUsed:0}));
  const buildingGroups=new Map(),terrainMeshes=[],tileLookup=new Map(tiles.map(t=>[t.url,t]));
  const waterElevation=root.BR_TERRAIN.waterElevation||4;
  let focus=group.parent?.userData.initialFocus||root.RIVER.sample((root.RIVER.bridges.find(b=>/I-10/.test(b.name))?.s||root.RIVER.length*.6)-700),time=0,quality='high',lastUpdate=-1,lastX=Infinity,lastZ=Infinity;
  const facade=helpers.facadeTexture?.();if(facade){facade.wrapS=facade.wrapT=T.RepeatWrapping;}
  function makeMaterial(tile,roof=false){const material=new T.MeshStandardMaterial({color:roof?0xffffff:0xffffff,roughness:roof?.88:1,metalness:0,side:T.DoubleSide});tile?.materials.push(material);return material;}
  const sourceChunks=root.BR_TERRAIN_MESH?.chunks||[];
  if(!sourceChunks.length)throw Error('Baton Rouge terrain mesh was not loaded.');
  if(!root.BRGroundSupport)throw Error('Baton Rouge terrain support was not loaded.');
  const leveeChunks=root.BRGroundSupport.applyRefinement(sourceChunks.map(chunk=>({...chunk,tileUrl:chunk.tileUrl||chunk.url,positions:typed(chunk.positionsB64,Float32Array),indices:typed(chunk.indicesB64,chunk.indexType==='Uint16Array'?Uint16Array:Uint32Array)})),root.BR_LEVEE_REFINEMENT,typed);
  const chunks=root.BRGroundSupport.applyRefinement(leveeChunks,root.BR_TERRAIN_DETAIL,typed);
  const support=root.BRGroundSupport.create(chunks),terrainAt=(x,z)=>support.heightAt(x,z);
  const groundAt=(x,z)=>terrainAt(x,z)??root.BR_TERRAIN.elevationAt(x,z)-waterElevation;
  const diagnostics={terrain:'Visible triangle surface',terrainDetail:root.BR_TERRAIN_DETAIL?.evidence||null,leveeRefinement:root.BR_LEVEE_REFINEMENT?.evidence||null,buildings:{emitted:0,excluded:[],unsupported:[],maximumOldDemGap:0},foundationEmbedMeters:.08};
  for(const chunk of chunks){
    const tile=tileLookup.get(chunk.tileUrl||chunk.url);if(!tile)continue;
    const positions=chunk.positions,indices=chunk.indices;
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setIndex(new T.BufferAttribute(indices,1));
    const uv=new Float32Array(positions.length/3*2),b=tile.bounds;
    for(let i=0;i<positions.length/3;i++){uv[i*2]=(positions[i*3]-b.minX)/(b.maxX-b.minX);uv[i*2+1]=1-(positions[i*3+2]-b.minZ)/(b.maxZ-b.minZ);}
    geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,makeMaterial(tile));mesh.receiveShadow=true;mesh.name='USGS terrain and aerial imagery';mesh.userData.tile=tile.url;group.add(mesh);tile.meshes.push(mesh);terrainMeshes.push(mesh);
  }
  const landmarks=root.BRLandmarks?.create(group,{groundAt,waterElevation,terrainAt,isWater})||{obstacles:[]};
  const kidd=root.BRKidd?.create(group,{groundAt,waterElevation})||{obstacles:[],landmarks:[]};
  const lettering=root.BRLeveeLettering?.create(group,{groundAt,terrainMeshes})||{landmarks:[]};
  const industry=root.BRIndustry?.create(group,{groundAt,waterElevation,terrainAt,isWater})||{obstacles:[],landmarks:[]};
  const excluded=new Set([...(root.BRLandmarks?.excludeBuildingIds||landmarks.excludeBuildingIds||[]),...(root.BRIndustry?.excludeBuildingIds||industry.excludeBuildingIds||[])]);
  const wallChunks=new Map(),roofChunks=new Map();
  function chooseTile(x,z){return tiles.filter(t=>x>=t.bounds.minX&&x<=t.bounds.maxX&&z>=t.bounds.minZ&&z<=t.bounds.maxZ).sort((a,b)=>b.priority-a.priority)[0];}
  function addTriangle(bucket,a,b,c,color,uv){for(let i=0;i<3;i++){const p=[a,b,c][i];bucket.pos.push(...p);if(color)bucket.colors.push(...color);if(uv)bucket.uv.push(...uv[i]);}}
  for(const f of root.BR_BUILDINGS.features){
    if(excluded.has(f.id)){diagnostics.buildings.excluded.push(f.id);continue;}if(!f.rings?.[0]?.length)continue;
    const rings=f.rings.map(r=>r.slice(0,-1).map(p=>{const w=G.toWorld(p[0],p[1]);return new T.Vector2(w.x,-w.z);}));
    if(rings[0].length<3)continue;
    const outer=rings[0];let x=0,z=0;for(const v of outer){x+=v.x;z-=v.y;}x/=outer.length;z/=outer.length;
    if(x<G.bounds.minX||x>G.bounds.maxX||z<G.bounds.minZ||z>G.bounds.maxZ)continue;
    const height=Number.isFinite(f.heightM)&&f.heightM>1?f.heightM:(Number.isFinite(f.floors)&&f.floors>0?f.floors*3.2:3.6);
    const surface=terrainAt(x,z),foundation=support.footprint(rings.map(ring=>ring.map(v=>({x:v.x,z:-v.y}))));
    // Mapped piers/docks are not generic buildings: leave unsupported footprints
    // to explicit structural models instead of inventing a foundation over water.
    if(surface===null||!foundation){diagnostics.buildings.unsupported.push({id:f.id,x,z,reason:surface===null?'No land at footprint center':'Footprint crosses unsupported terrain'});continue;}
    diagnostics.buildings.maximumOldDemGap=Math.max(diagnostics.buildings.maximumOldDemGap,root.BR_TERRAIN.elevationAt(x,z)-waterElevation-surface);
    const base=surface,roofY=Math.max(base+height,foundation.maximum+.3);diagnostics.buildings.emitted++;
    const cellKey=`${Math.floor(x/1600)},${Math.floor(z/1600)}`;
    if(!wallChunks.has(cellKey))wallChunks.set(cellKey,{pos:[],colors:[],uv:[],x,z,cellKey});const wall=wallChunks.get(cellKey);
    const tall=height>18,color=tall?[.75,.75,.7]:height>8?[.61,.64,.61]:[.65,.6,.53];
    for(const ring of foundation.rings)for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],len=Math.hypot(b.x-a.x,b.z-a.z);
      const bottom=Math.min(base,a.height,b.height,terrainAt((a.x+b.x)*.5,(a.z+b.z)*.5))-.08;
      const aa=[a.x,bottom,a.z],bb=[b.x,bottom,b.z],cc=[b.x,roofY,b.z],dd=[a.x,roofY,a.z];
      const u=len/18,v=height/30;addTriangle(wall,aa,bb,dd,color,[[0,0],[u,0],[0,v]]);addTriangle(wall,bb,cc,dd,color,[[u,0],[u,v],[0,v]]);
    }
    const tile=chooseTile(x,z),roofKey=cellKey+'|'+(tile?.url||'none');if(!roofChunks.has(roofKey))roofChunks.set(roofKey,{pos:[],colors:[],uv:[],tile,cellKey});const roof=roofChunks.get(roofKey);
    const triangles=T.ShapeUtils.triangulateShape(outer,rings.slice(1)),flat=rings.flat(),bounds=tile?.bounds;
    for(const tri of triangles){const p=tri.map(i=>flat[i]);const uv=bounds?p.map(v=>[(v.x-bounds.minX)/(bounds.maxX-bounds.minX),1-(-v.y-bounds.minZ)/(bounds.maxZ-bounds.minZ)]):[[0,0],[1,0],[1,1]];addTriangle(roof,[p[0].x,roofY,-p[0].y],[p[1].x,roofY,-p[1].y],[p[2].x,roofY,-p[2].y],null,uv);}
  }
  const wallMat=new T.MeshStandardMaterial({map:facade||null,vertexColors:true,roughness:.85,metalness:.05,side:T.DoubleSide});
  for(const wall of wallChunks.values()){
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(wall.pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(wall.colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(wall.uv,2));geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,wallMat);mesh.name='Supported mapped building walls';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geo.computeBoundingBox();buildingGroups.set(wall.cellKey,{meshes:[mesh],bounds:geo.boundingBox});
  }
  for(const roof of roofChunks.values()){
    if(!roof.pos.length)continue;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(roof.pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(roof.uv,2));geo.computeVertexNormals();geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,makeMaterial(roof.tile,true));mesh.name='Supported mapped building roofs';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);buildingGroups.get(roof.cellKey)?.meshes.push(mesh);
  }
  function addVegetation(tile,canvas){
    if(tile.trees||!helpers.foliageTexture)return;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}),image=ctx.getImageData(0,0,canvas.width,canvas.height),accepted=[];
    let seed=Math.abs(Math.round(tile.bounds.minX+tile.bounds.minZ))||31;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const b=tile.bounds,area=(b.maxX-b.minX)*(b.maxZ-b.minZ);
    const tries=tile.priority>10?Math.max(200,Math.round(9600*area/(6500*6500))):tile.priority>1?9600:12800;
    for(let i=0;i<tries;i++){const u=rand(),v=rand(),ix=Math.floor(u*(canvas.width-2))+1,iy=Math.floor(v*(canvas.height-2))+1,o=(iy*canvas.width+ix)*4,r=image.data[o],g=image.data[o+1],blue=image.data[o+2];
      if(!(g>r*1.08&&g>blue*1.1&&g>35&&g<128))continue;
      const x=b.minX+u*(b.maxX-b.minX),z=b.minZ+v*(b.maxZ-b.minZ);if(isWater(x,z)||vegetationExcluded(x,z)||terrainAt(x,z)===null)continue;
      const near=root.RIVER.project(x,z);if(near.distance>1700)continue;
      if(tiles.some(t=>t.priority>tile.priority&&x>=t.bounds.minX&&x<=t.bounds.maxX&&z>=t.bounds.minZ&&z<=t.bounds.maxZ))continue;
      accepted.push({x,z,h:8+rand()*10,w:7+rand()*9,angle:rand()*Math.PI});
    }
    if(!accepted.length)return;
    const geo=new T.PlaneGeometry(1,1),mat=new T.MeshStandardMaterial({map:helpers.foliageTexture(),alphaTest:.4,side:T.DoubleSide,roughness:1,color:0xa4af88});
    const mesh=new T.InstancedMesh(geo,mat,accepted.length*3),dummy=new T.Object3D();let index=0;
    for(const p of accepted)for(let side=0;side<3;side++){dummy.position.set(p.x,groundAt(p.x,p.z)+p.h*.5,p.z);dummy.rotation.set(0,p.angle+side*Math.PI/3,0);dummy.scale.set(p.w,p.h,1);dummy.updateMatrix();mesh.setMatrixAt(index++,dummy.matrix);}
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);tile.trees=mesh;
  }
  function loadTile(tile){
    tile.lastUsed=time;if(tile.texture&&tile.textureQuality===quality)return Promise.resolve();if(tile.promise)return tile.promise;
    const revision=tile.revision=(tile.revision||0)+1,requestedQuality=quality;
    tile.promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{
      if(revision!==tile.revision){resolve();return;}
      const max=Math.min(renderer.capabilities.maxTextureSize,requestedQuality==='high'?(tile.priority>10?3072:2048):1024),scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());tex.generateMipmaps=true;
      const previous=tile.texture;tile.texture=tex;tile.textureQuality=requestedQuality;tile.materials.forEach(m=>{m.map=tex;m.needsUpdate=true;});previous?.dispose();addVegetation(tile,canvas);resolve();
    };image.onerror=()=>{if(revision!==tile.revision){resolve();return;}tile.promise=null;reject(Error('Could not load mapped aerial imagery '+tile.url));};image.src=root.RIVER_EMBEDDED_ASSETS?.[tile.url]||tile.url;});
    return tile.promise;
  }
  // Keep the last usable aerial image during a quality change, including failed
  // replacements. Revision tokens still prevent obsolete requests from winning.
  function setQuality(value){if(value===quality)return;quality=value;for(const tile of tiles){tile.revision=(tile.revision||0)+1;tile.promise=null;}lastUpdate=-1;}
  function update(x,z,now){focus={x,z};time=now;if(now-lastUpdate<.8&&lastUpdate>=0&&Math.hypot(x-lastX,z-lastZ)<1000)return;lastUpdate=now;lastX=x;lastZ=z;
    for(const tile of tiles){const distance=distanceToBox(x,z,tile.bounds),visible=distance<8500;tile.meshes.forEach(m=>m.visible=visible);if(tile.trees)tile.trees.visible=distance<5500;if(visible&&distance<5500)loadTile(tile).catch(e=>console.warn(e.message));
      if(distance>11000&&(tile.texture||tile.promise)){tile.revision=(tile.revision||0)+1;tile.texture?.dispose();tile.texture=null;tile.promise=null;tile.materials.forEach(m=>{m.map=null;m.needsUpdate=true;});}
    }
    for(const cell of buildingGroups.values()){const b=cell.bounds,visible=distanceToBox(x,z,{minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z})<6500;for(const mesh of cell.meshes)mesh.visible=visible;}
  }
  const initiallyNeeded=tiles.filter(t=>distanceToBox(focus.x,focus.z,t.bounds)<4500);const ready=Promise.all(initiallyNeeded.map(loadTile));
  update(focus.x,focus.z,0);
  return {obstacles:[...(landmarks.obstacles||[]),...(kidd.obstacles||[]),...(industry.obstacles||[])],landmarks:[...(landmarks.landmarks||[]),...(kidd.landmarks||[]),...(lettering.landmarks||[]),...(industry.landmarks||[])],ready,update,setQuality,groundAt,terrainAt,diagnostics,terrainMeshes,buildingGroups,tiles};
}
root.BRScene={create,waterGeometry,isWater,vegetationExcluded};
})(globalThis);
