/* Geometry support queries use the visible, shoreline-clipped 3DEP triangles.
 * This does not create land, move source footprints or change source elevations. */
(function(root){
  'use strict';
  function create(chunks,cellSize=70){
    const entries=chunks.map(chunk=>{
      const positions=chunk.positions,indices=chunk.indices,grid=new Map();
      const bounds={minX:Infinity,minZ:Infinity,maxX:-Infinity,maxZ:-Infinity};
      for(let i=0;i<positions.length;i+=3){bounds.minX=Math.min(bounds.minX,positions[i]);bounds.maxX=Math.max(bounds.maxX,positions[i]);bounds.minZ=Math.min(bounds.minZ,positions[i+2]);bounds.maxZ=Math.max(bounds.maxZ,positions[i+2]);}
      for(let i=0;i<indices.length;i+=3){
        const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
        const minX=Math.floor(Math.min(positions[a],positions[b],positions[c])/cellSize),maxX=Math.floor(Math.max(positions[a],positions[b],positions[c])/cellSize);
        const minZ=Math.floor(Math.min(positions[a+2],positions[b+2],positions[c+2])/cellSize),maxZ=Math.floor(Math.max(positions[a+2],positions[b+2],positions[c+2])/cellSize);
        for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=x+','+z;let bucket=grid.get(key);if(!bucket){bucket=[];grid.set(key,bucket);}bucket.push(i);}
      }
      return {...chunk,positions,indices,bounds,grid};
    });
    function sample(x,z){
      const key=Math.floor(x/cellSize)+','+Math.floor(z/cellSize);
      for(const chunk of entries){
        const b=chunk.bounds;if(x<b.minX-.001||x>b.maxX+.001||z<b.minZ-.001||z>b.maxZ+.001)continue;
        const bucket=chunk.grid.get(key);if(!bucket)continue;const p=chunk.positions,indices=chunk.indices;
        for(const index of bucket){
          const a=indices[index]*3,b=indices[index+1]*3,c=indices[index+2]*3;
          const determinant=(p[b+2]-p[c+2])*(p[a]-p[c])+(p[c]-p[b])*(p[a+2]-p[c+2]);if(Math.abs(determinant)<1e-9)continue;
          const u=((p[b+2]-p[c+2])*(x-p[c])+(p[c]-p[b])*(z-p[c+2]))/determinant;
          const v=((p[c+2]-p[a+2])*(x-p[c])+(p[a]-p[c])*(z-p[c+2]))/determinant,w=1-u-v;
          if(Math.min(u,v,w)>=-1e-6)return {height:u*p[a+1]+v*p[b+1]+w*p[c+1],tileUrl:chunk.tileUrl};
        }
      }
      return null;
    }
    function footprint(rings,spacing=8){
      const sampled=[];let minimum=Infinity,maximum=-Infinity;
      for(const ring of rings){const points=[];for(let i=0;i<ring.length;i++){
        const a=ring[i],b=ring[(i+1)%ring.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));
        for(let j=0;j<steps;j++){const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,hit=sample(x,z);if(!hit)return null;points.push({x,z,height:hit.height,tileUrl:hit.tileUrl});minimum=Math.min(minimum,hit.height);maximum=Math.max(maximum,hit.height);}
      }sampled.push(points);}
      return {rings:sampled,minimum,maximum};
    }
    return {sample,heightAt(x,z){return sample(x,z)?.height??null;},footprint,chunks:entries};
  }
  function applyRefinement(chunks,refinement,decode){
    if(!refinement)return chunks;const patches=new Map(refinement.chunks.map(p=>[p.tileUrl,p]));
    return chunks.map(chunk=>{const patch=patches.get(chunk.tileUrl);if(!patch)return chunk;
      if(chunk.positions.length/3!==patch.sourceVertexCount||chunk.indices.length/3!==patch.sourceTriangleCount)throw Error('Levee refinement does not match the terrain source.');
      const remove=new Set(decode(patch.removedTrianglesB64,Uint32Array)),addedPositions=decode(patch.positionsB64,Float32Array),addedIndices=decode(patch.indicesB64,Uint32Array);
      const positions=new Float32Array(chunk.positions.length+addedPositions.length),indices=new Uint32Array(chunk.indices.length-remove.size*3+addedIndices.length);positions.set(chunk.positions);positions.set(addedPositions,chunk.positions.length);
      let offset=0;for(let i=0;i<chunk.indices.length;i+=3)if(!remove.has(i/3)){indices[offset++]=chunk.indices[i];indices[offset++]=chunk.indices[i+1];indices[offset++]=chunk.indices[i+2];}indices.set(addedIndices,offset);
      return {...chunk,positions,indices};
    });
  }
  root.BRGroundSupport={create,applyRefinement};
})(globalThis);
