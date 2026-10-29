/* Shared mapped-water geometry. Coordinates are the unchanged EBRGIS polygons.
 * Spatial indexes speed up exact polygon/rectangle tests; no shoreline smoothing. */
(function(root){
  'use strict';
  function create(polygons,cell=128){
    const grid=new Map(),segments=[];
    function ringIndex(points){
      const rows=new Map();let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[j],b=points[i];minX=Math.min(minX,b[0]);maxX=Math.max(maxX,b[0]);minZ=Math.min(minZ,b[1]);maxZ=Math.max(maxZ,b[1]);
        if(a[0]===b[0]&&a[1]===b[1])continue;
        const s={ax:a[0],az:a[1],bx:b[0],bz:b[1]},id=segments.length;segments.push(s);
        for(let z=Math.floor(Math.min(a[1],b[1])/cell);z<=Math.floor(Math.max(a[1],b[1])/cell);z++){
          if(!rows.has(z))rows.set(z,[]);rows.get(z).push(s);
          for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++){
            const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(id);
          }
        }
      }
      return {rows,minX,maxX,minZ,maxZ};
    }
    const indexed=polygons.map(p=>({outer:ringIndex(p.outer),holes:(p.holes||[]).map(ringIndex)}));
    function inside(x,z,r){
      if(x<r.minX||x>r.maxX||z<r.minZ||z>r.maxZ)return false;
      let hit=false;for(const s of r.rows.get(Math.floor(z/cell))||[])
        if((s.az>z)!==(s.bz>z)&&x<(s.bx-s.ax)*(z-s.az)/(s.bz-s.az)+s.ax)hit=!hit;
      return hit;
    }
    function contains(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&indexed.some(p=>inside(x,z,p.outer)&&!p.holes.some(h=>inside(x,z,h)));}
    function nearby(minX,minZ,maxX,maxZ){
      const ids=new Set();for(let x=Math.floor(minX/cell);x<=Math.floor(maxX/cell);x++)for(let z=Math.floor(minZ/cell);z<=Math.floor(maxZ/cell);z++)for(const id of grid.get(x+','+z)||[])ids.add(id);
      return ids;
    }
    function distance(x,z,radius=128){
      let best=radius;for(const id of nearby(x-radius,z-radius,x+radius,z+radius)){
        const s=segments[id],dx=s.bx-s.ax,dz=s.bz-s.az,t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz||1)));
        best=Math.min(best,Math.hypot(x-s.ax-dx*t,z-s.az-dz*t));
      }return best;
    }
    function hullInWater(x,z,heading,length,width,margin=.08){
      if(!contains(x,z))return false;
      const fx=-Math.sin(heading),fz=-Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading),hl=length/2+margin,hw=width/2+margin;
      const ex=Math.abs(fx)*hl+Math.abs(rx)*hw,ez=Math.abs(fz)*hl+Math.abs(rz)*hw;
      for(const a of [-hl,hl])for(const b of [-hw,hw])if(!contains(x+fx*a+rx*b,z+fz*a+rz*b))return false;
      // Segment/rectangle clipping also catches narrow spits or entire small
      // islands between hull samples, including polygon holes.
      for(const id of nearby(x-ex,z-ez,x+ex,z+ez)){
        const s=segments[id],ax=(s.ax-x)*fx+(s.az-z)*fz,az=(s.ax-x)*rx+(s.az-z)*rz,bx=(s.bx-x)*fx+(s.bz-z)*fz,bz=(s.bx-x)*rx+(s.bz-z)*rz;
        let low=0,high=1;const dx=bx-ax,dz=bz-az;
        for(const [p,q] of [[-dx,ax+hl],[dx,hl-ax],[-dz,az+hw],[dz,hw-az]]){
          if(Math.abs(p)<1e-12){if(q<0){high=-1;break;}}
          else{const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)break;}
        }
        if(low<=high)return false;
      }return true;
    }
    return {contains,hullInWater,distance,segmentCount:segments.length};
  }
  root.RiverShoreline={create};
  if(root.BR_GEO)root.RIVER_SHORE=create(root.BR_GEO.waterPolygons);
})(globalThis);
