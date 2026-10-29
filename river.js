/* Real mapped Mississippi River course along the East Baton Rouge Parish
 * riverfront. Horizontal coordinates and chainage are uncompressed meters.
 * Channel polygons/flowline/city and parish boundaries: authoritative EBRGIS.
 * Water flow is a gameplay model, not a measured forecast. */
(function(root){
  'use strict';
  const G=root.BR_GEO;if(!G)throw Error('Load geodata.js before river.js');
  const points=G.route,length=G.length;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function sample(value){
    const s=clamp(Number(value)||0,0,length);let lo=0,hi=points.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(points[m].s>s)hi=m;else lo=m;}
    const a=points[lo],b=points[hi],t=(s-a.s)/(b.s-a.s||1),mix=(x,y)=>x+(y-x)*t;
    let tx=mix(a.tx,b.tx),tz=mix(a.tz,b.tz);const n=Math.hypot(tx,tz)||1;tx/=n;tz/=n;
    return {x:mix(a.x,b.x),z:mix(a.z,b.z),tx,tz,s,leftWidth:mix(a.leftWidth,b.leftWidth),rightWidth:mix(a.rightWidth,b.rightWidth),width:mix(a.width,b.width)};
  }
  const cell=500,index=new Map();
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++){const key=x+':'+z;if(!index.has(key))index.set(key,[]);index.get(key).push(i);}}
  function project(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('River position must be finite');
    const gx=Math.floor(x/cell),gz=Math.floor(z/cell),near=new Set();
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(const i of index.get((gx+dx)+':'+(gz+dz))||[])near.add(i);
    const candidates=near.size?[...near]:Array.from({length:points.length-1},(_,i)=>i);
    let best=Infinity,bestS=0,bestOffset=0,bestI=0,bestT=0;
    function visit(i){const a=points[i],b=points[i+1],vx=b.x-a.x,vz=b.z-a.z,segmentLength=Math.hypot(vx,vz),t=clamp(((x-a.x)*vx+(z-a.z)*vz)/(segmentLength*segmentLength||1),0,1),dx=x-a.x-vx*t,dz=z-a.z-vz*t,d2=dx*dx+dz*dz;if(d2<best){best=d2;bestS=a.s+(b.s-a.s)*t;bestOffset=(-vz*dx+vx*dz)/(segmentLength||1);bestI=i;bestT=t;}}
    for(const i of candidates)visit(i);
    const windowMargin=Math.min(x-(gx-2)*cell,(gx+3)*cell-x,z-(gz-2)*cell,(gz+3)*cell-z);
    if(near.size&&best>=windowMargin*windowMargin)for(let i=0;i<points.length-1;i++)if(!near.has(i))visit(i);
    const p=sample(bestS);let overflow=0;
    if(bestI===0&&bestT===0)overflow=Math.max(0,-((x-p.x)*p.tx+(z-p.z)*p.tz));
    if(bestI===points.length-2&&bestT===1)overflow=Math.max(0,(x-p.x)*p.tx+(z-p.z)*p.tz);
    return {s:bestS,distance:Math.sqrt(best),offset:bestOffset,width:p.width,leftWidth:p.leftWidth,rightWidth:p.rightWidth,longitudinalOverflow:overflow};
  }
  function currentAt(x,z){const p=project(x,z),v=sample(p.s),half=p.offset>=0?p.rightWidth:p.leftWidth,f=clamp(Math.abs(p.offset)/half,0,1),speed=(1.2+.15*Math.sin(p.s/3800))*(1-.3*f*f);return {x:v.tx*speed,z:v.tz*speed,speed};}
  function bankAt(s,side){const p=sample(s),distance=side<0?p.leftWidth:p.rightWidth;return {x:p.x-p.tz*distance*side,z:p.z+p.tx*distance*side};}
  root.RIVER={hullInWater:root.RIVER_SHORE?.hullInWater,points,length,sample,project,currentAt,bankAt,startS:0,finishS:length,landmarks:G.landmarks,bridges:G.bridges,scope:'East Baton Rouge Parish Mississippi riverfront',projection:'EPSG:26915',scale:1,toWorld:G.toWorld,toLonLat:G.toLonLat};
})(globalThis);
