const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console,atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
for(const f of ['geodata.js','shoreline.js','terrain-mesh.js','terrain-mesh-part-2.js','terrain-mesh-part-3.js','br-ground-support.js','br-levee-refinement.js','br-terrain-detail.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const decode=(s,T)=>{const b=Buffer.from(s,'base64');return new T(b.buffer,b.byteOffset,b.byteLength/T.BYTES_PER_ELEMENT);};
const old=ctx.BRGroundSupport.applyRefinement(ctx.BR_TERRAIN_MESH.chunks.map(c=>({...c,tileUrl:c.tileUrl||c.url,positions:decode(c.positionsB64,Float32Array),indices:decode(c.indicesB64,c.indexType==='Uint16Array'?Uint16Array:Uint32Array)})),ctx.BR_LEVEE_REFINEMENT,decode);
const fresh=ctx.BRGroundSupport.applyRefinement(old,ctx.BR_TERRAIN_DETAIL,decode);let triangles=0,waterErrors=0,sharedHeightError=0;const heights=new Map();
function area(chunk){const p=chunk.positions,ix=chunk.indices;let sum=0;for(let i=0;i<ix.length;i+=3){const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;assert(c<p.length&&b<p.length&&a<p.length);const cross=(p[b]-p[a])*(p[c+2]-p[a+2])-(p[b+2]-p[a+2])*(p[c]-p[a]);assert(cross<=.01,'triangle must face upward');sum-=cross/2;}return sum;}
for(let i=0;i<old.length;i++){
 const a=old[i],b=fresh[i];assert(Math.abs(area(a)-area(b))<.05,'patch changes horizontal land area');
 for(let j=0;j<a.positions.length;j+=3){assert.equal(a.positions[j],b.positions[j]);assert.equal(a.positions[j+2],b.positions[j+2]);}
 for(let j=0;j<b.positions.length;j+=3){const x=b.positions[j],y=b.positions[j+1],z=b.positions[j+2];assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));const key=x+','+z;if(heights.has(key))sharedHeightError=Math.max(sharedHeightError,Math.abs(heights.get(key)-y));else heights.set(key,y);}
 triangles+=b.indices.length/3;
}
assert(sharedHeightError<.001,`coincident mesh vertices disagree in height by ${sharedHeightError} m`);
for(const patch of ctx.BR_TERRAIN_DETAIL.chunks){const chunk=fresh.find(c=>c.tileUrl===patch.tileUrl),p=chunk.positions,ix=decode(patch.indicesB64,Uint32Array);for(let i=0;i<ix.length;i+=3){const x=(p[ix[i]*3]+p[ix[i+1]*3]+p[ix[i+2]*3])/3,z=(p[ix[i]*3+2]+p[ix[i+1]*3+2]+p[ix[i+2]*3+2])/3;if(ctx.RIVER_SHORE.contains(x,z)&&ctx.RIVER_SHORE.distance(x,z)>0.02)waterErrors++;}}
assert.equal(waterErrors,0,'terrain detail must not fill mapped water');
const result={passed:true,totalTriangles:triangles,patchTriangles:ctx.BR_TERRAIN_DETAIL.evidence.patchTrianglesAdded,coincidentVertexMaximumHeightDifferenceM:sharedHeightError,terrainTrianglesInsideMappedWater:waterErrors};
// Optional independent check against the downloaded source raster, not included
// in the static package. This measures interpolation fidelity, not survey error.
if(process.env.RIVER_DEM_SOURCE){
 const src=process.env.RIVER_DEM_SOURCE,meta=JSON.parse(fs.readFileSync(path.join(src,'export.json'))),raw=fs.readFileSync(path.join(src,'elevation.f32')),dem=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),[xmin,zmin,xmax,zmax]=meta.worldBounds;
 const before=ctx.BRGroundSupport.create(old),after=ctx.BRGroundSupport.create(fresh);let n=0,errOld=0,errNew=0;
 for(let x=xmin+120;x<xmax-120;x+=17)for(let z=zmin+120;z<zmax-120;z+=19){const distance=ctx.RIVER_SHORE.distance(x,z,550);if(distance<25||distance>350)continue;const a=before.heightAt(x,z),b=after.heightAt(x,z);if(a===null||b===null)continue;
  const u=(x-xmin)/2-.5,v=(z-zmin)/2-.5,ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,expected=((dem[iz*meta.width+ix]*(1-fx)+dem[iz*meta.width+ix+1]*fx)*(1-fz)+(dem[(iz+1)*meta.width+ix]*(1-fx)+dem[(iz+1)*meta.width+ix+1]*fx)*fz)-4;
  errOld+=Math.abs(a-expected);errNew+=Math.abs(b-expected);n++;
 }
 result.sourceSamples=n;result.meanAbsoluteDifferenceBeforeM=errOld/n;result.meanAbsoluteDifferenceAfterM=errNew/n;assert(n>100);assert(errNew<errOld*.8,'detail should materially improve source interpolation');
}
console.log(JSON.stringify(result,null,2));
