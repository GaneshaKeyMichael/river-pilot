/* Build a bounded terrain patch from an official 2 m export. Requires the
 * source elevation.f32, export.json and catalog-verified.json in argv[2]. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),source=path.resolve(process.argv[2]||'../terrain-detail-source');
const ctx={console,atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
for(const f of ['geodata.js','shoreline.js','terrain-mesh.js','terrain-mesh-part-2.js','terrain-mesh-part-3.js','br-ground-support.js','br-levee-refinement.js'])vm.runInContext(fs.readFileSync(path.join(repo,f),'utf8'),ctx);
const decode=(s,T)=>{const b=Buffer.from(s,'base64');return new T(b.buffer,b.byteOffset,b.byteLength/T.BYTES_PER_ELEMENT);},encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
const meta=JSON.parse(fs.readFileSync(path.join(source,'export.json'))),catalog=JSON.parse(fs.readFileSync(path.join(source,'catalog-verified.json'))),raw=fs.readFileSync(path.join(source,'elevation.f32'));
const dem=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),width=meta.width,height=meta.height,[minX,minZ,maxX,maxZ]=meta.worldBounds;
function sample(x,z){const u=Math.max(0,Math.min(width-1,(x-minX)/(maxX-minX)*width-.5)),v=Math.max(0,Math.min(height-1,(z-minZ)/(maxZ-minZ)*height-.5));const a=Math.floor(u),b=Math.floor(v),c=Math.min(a+1,width-1),d=Math.min(b+1,height-1),fx=u-a,fz=v-b;return (dem[b*width+a]*(1-fx)+dem[b*width+c]*fx)*(1-fz)+(dem[d*width+a]*(1-fx)+dem[d*width+c]*fx)*fz-4;}
const chunks=ctx.BRGroundSupport.applyRefinement(ctx.BR_TERRAIN_MESH.chunks.map(c=>({...c,tileUrl:c.tileUrl||c.url,positions:decode(c.positionsB64,Float32Array),indices:decode(c.indicesB64,c.indexType==='Uint16Array'?Uint16Array:Uint32Array)})),ctx.BR_LEVEE_REFINEMENT,decode);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function detailHeight(x,z,old){const edge=Math.min(x-minX,maxX-x,z-minZ,maxZ-z),shore=ctx.RIVER_SHORE.distance(x,z,550);const blend=smooth(edge/100)*smooth((shore-3)/17)*smooth((500-shore)/100);return old+(sample(x,z)-old)*blend;}
const patches=[];let removedCount=0,addedCount=0,maxChange=0,sumChange=0,changedCount=0;
// Subdivide twice at a fixed level, preserving every patch boundary line. Shared
// vertices receive the same sampled height; shoreline vertices remain fixed.
for(const chunk of chunks){
 const p=chunk.positions,ix=chunk.indices,selected=new Set(),edgeCount=new Map();const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
 for(let i=0;i<ix.length;i+=3){const ids=[ix[i],ix[i+1],ix[i+2]],x=ids.reduce((s,id)=>s+p[id*3],0)/3,z=ids.reduce((s,id)=>s+p[id*3+2],0)/3;
  if(ids.every(id=>p[id*3]>=minX&&p[id*3]<=maxX&&p[id*3+2]>=minZ&&p[id*3+2]<=maxZ)&&ctx.RIVER_SHORE.distance(x,z,550)<500)selected.add(i);
  for(let k=0;k<3;k++){const key=edgeKey(ids[k],ids[(k+1)%3]);if(!edgeCount.has(key))edgeCount.set(key,{total:0,selected:0});const e=edgeCount.get(key);e.total++;if(selected.has(i))e.selected++;}
 }
 if(!selected.size)continue;
 const boundary=new Set();for(const [key,e]of edgeCount)if(e.selected&&e.selected!==e.total||e.selected&&e.total===1){for(const id of key.split(','))boundary.add(Number(id));}
 const positions=Array.from(p),updates=[],heights=[],midpoints=new Map(),newIndices=[];
 for(const i of new Set([...selected].flatMap(i=>[ix[i],ix[i+1],ix[i+2]]))){if(boundary.has(i))continue;const old=p[i*3+1],y=detailHeight(p[i*3],p[i*3+2],old);if(Math.abs(y-old)>.0001){updates.push(i);heights.push(y);positions[i*3+1]=y;const d=Math.abs(y-old);maxChange=Math.max(maxChange,d);sumChange+=d;changedCount++;}}
 function midpoint(a,b,linear=false){const key=edgeKey(a,b);if(midpoints.has(key))return midpoints.get(key);const x=(positions[a*3]+positions[b*3])/2,z=(positions[a*3+2]+positions[b*3+2])/2,old=(positions[a*3+1]+positions[b*3+1])/2;
  const y=linear?old:detailHeight(x,z,old),id=positions.length/3;positions.push(x,y,z);midpoints.set(key,id);return id;}
 function divide(a,b,c,level,abEdge,bcEdge,caEdge){if(level===0){newIndices.push(a,b,c);return;}const ab=midpoint(a,b,abEdge),bc=midpoint(b,c,bcEdge),ca=midpoint(c,a,caEdge);divide(a,ab,ca,level-1,abEdge,false,caEdge);divide(ab,b,bc,level-1,abEdge,bcEdge,false);divide(ca,bc,c,level-1,false,bcEdge,caEdge);divide(ab,bc,ca,level-1,false,false,false);}
 const isBoundary=(a,b)=>{const e=edgeCount.get(edgeKey(a,b));return e.total!==2||e.selected!==2;};
 for(const i of selected){const a=ix[i],b=ix[i+1],c=ix[i+2];divide(a,b,c,2,isBoundary(a,b),isBoundary(b,c),isBoundary(c,a));}
 patches.push({tileUrl:chunk.tileUrl,sourceVertexCount:p.length/3,sourceTriangleCount:ix.length/3,updatedVerticesB64:encode(new Uint32Array(updates)),updatedHeightsB64:encode(new Float32Array(heights)),removedTrianglesB64:encode(new Uint32Array([...selected].map(i=>i/3))),positionsB64:encode(new Float32Array(positions.slice(p.length))),indicesB64:encode(new Uint32Array(newIndices))});removedCount+=selected.size;addedCount+=newIndices.length/3;
}
const evidence={coverageWorldBounds:meta.worldBounds,coverage:'Downtown Baton Rouge, bounded 5 km north-south export; terrain within 500 m of mapped water inside this rectangle.',exportSpacingMetres:2,patchTrianglesRemoved:removedCount,patchTrianglesAdded:addedCount,changedOriginalVertices:changedCount,maximumOriginalVertexChangeMetres:maxChange,meanOriginalVertexChangeMetres:sumChange/changedCount,sourceRasterSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(source,'elevation.tif'))).digest('hex'),catalogSample:catalog,sourceRequest:meta.sourceRequest,verticalDatum:'NAVD88 source metres minus existing 4 m gameplay water reference',limits:'Historical bare-earth data, not current survey. Catalog verified at the lettering location only; mosaic coverage can vary. First 3 m at mapped shore preserve existing geometry, then blend to source across 17 m; outer patch border blends over 100 m. This reconciles differing water/imagery/elevation epochs, not measured river stage.'};
fs.writeFileSync(path.join(repo,'br-terrain-detail.js'),'/* USGS source-backed downtown terrain detail. See terrain-detail-provenance.json. */\nglobalThis.BR_TERRAIN_DETAIL='+JSON.stringify({evidence,chunks:patches})+';\n');
fs.writeFileSync(path.join(repo,'terrain-detail-provenance.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({...evidence,catalogSample:undefined,sourceRequest:undefined},null,2));
