/* Painted BATON [fleur-de-lis] ROUGE lettering on the downtown levee.
 * Location/extent traced from 2023 public USGS/USDA aerial imagery.
 * Typeface and paint are reconstructed, not survey-grade glyph outlines. */
(function(root){
  'use strict';
  const start={x:862.5,z:-1141.75},end={x:868.5,z:-1038.5},width=9;
  const length=Math.hypot(end.x-start.x,end.z-start.z),ax=(end.x-start.x)/length,az=(end.z-start.z)/length;
  const center={x:(start.x+end.x)/2,z:(start.z+end.z)/2};
  function texture(){
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle='#b9322e';c.textAlign='left';c.textBaseline='alphabetic';
    function word(text,left,right){c.save();c.font='700 230px Arial, sans-serif';const m=c.measureText(text),height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;c.translate(left,12);c.scale((right-left)/m.width,232/height);c.fillText(text,0,m.actualBoundingBoxAscent);c.restore();}
    word('BATON',10,917);word('ROUGE',1128,2038);
    // Vector fleur-de-lis avoids relying on an optional symbol font.
    c.save();c.translate(1024,131);c.scale(.77,.88);c.beginPath();
    c.moveTo(0,-124);c.bezierCurveTo(-65,-52,-40,-13,-13,23);c.lineTo(-13,57);
    c.bezierCurveTo(-43,15,-89,-8,-109,26);c.bezierCurveTo(-136,-78,-47,-68,-21,14);
    c.bezierCurveTo(-49,-33,-93,-22,-86,9);c.bezierCurveTo(-78,-7,-52,15,-31,57);
    c.lineTo(-51,57);c.lineTo(-51,77);c.lineTo(-15,77);c.lineTo(-39,112);c.lineTo(0,94);
    c.lineTo(39,112);c.lineTo(15,77);c.lineTo(51,77);c.lineTo(51,57);c.lineTo(31,57);
    c.bezierCurveTo(52,15,78,-7,86,9);c.bezierCurveTo(93,-22,49,-33,21,14);
    c.bezierCurveTo(47,-68,136,-78,109,26);c.bezierCurveTo(89,-8,43,15,13,57);
    c.lineTo(13,23);c.bezierCurveTo(40,-13,65,-52,0,-124);c.closePath();c.fill();c.restore();
    const t=new root.THREE.CanvasTexture(canvas);t.colorSpace=root.THREE.SRGBColorSpace;t.anisotropy=8;return t;
  }
  function interpolate(a,b,t){const p={};for(const key of['x','y','z','u','v'])p[key]=a[key]+(b[key]-a[key])*t;return p;}
  function clip(poly,key,bound,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=greater?a[key]>=bound:a[key]<=bound,bi=greater?b[key]>=bound:b[key]<=bound;if(ai)out.push(a);if(ai!==bi)out.push(interpolate(a,b,(bound-a[key])/(b[key]-a[key])));}return out;}
  function create(group,{terrainMeshes=[],groundAt=()=>0}={}){
    const T=root.THREE,positions=[],uv=[];
    const minX=Math.min(start.x,end.x)-width,maxX=Math.max(start.x,end.x)+width,minZ=start.z-width,maxZ=end.z+width;
    // Clip the actual rendered terrain triangles to the painted rectangle.
    // This preserves their exact surface, avoiding a floating sign or ground gaps.
    for(const mesh of terrainMeshes){const geo=mesh.geometry,p=geo.attributes.position.array,idx=geo.index?.array;if(!idx)continue;
      for(let i=0;i<idx.length;i+=3){const ia=idx[i]*3,ib=idx[i+1]*3,ic=idx[i+2]*3;
        if(Math.max(p[ia],p[ib],p[ic])<minX||Math.min(p[ia],p[ib],p[ic])>maxX||Math.max(p[ia+2],p[ib+2],p[ic+2])<minZ||Math.min(p[ia+2],p[ib+2],p[ic+2])>maxZ)continue;
        let poly=[ia,ib,ic].map(k=>{const x=p[k],z=p[k+2],dx=x-start.x,dz=z-start.z;return{x,y:p[k+1],z,u:dx*ax+dz*az,v:dx*az-dz*ax};});
        for(const [key,bound,greater] of[['u',0,true],['u',length,false],['v',-width/2,true],['v',width/2,false]]){poly=clip(poly,key,bound,greater);if(poly.length<3)break;}
        for(let j=1;j<poly.length-1;j++)for(const v of[poly[0],poly[j],poly[j+1]]){positions.push(v.x,v.y+.035,v.z);uv.push(v.u/length,(v.v+width/2)/width);}
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new T.MeshStandardMaterial({map:texture(),roughness:1,metalness:0,transparent:true,alphaTest:.1,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const mesh=new T.Mesh(geometry,material);mesh.name='Red BATON ROUGE paint on levee';mesh.renderOrder=2;group.add(mesh);
    const point=root.BR_GEO.toLonLat(center.x,center.z),y=groundAt(center.x,center.z)+.5;
    const landmark={name:'BATON ROUGE · red levee lettering',...point,...center,cameraHeight:26,view:{target:{...center,y},position:{x:center.x-155,z:center.z+6}}};
    return {mesh,landmarks:[landmark],stats:{triangles:positions.length/9,length,width,center}};
  }
  root.BRLeveeLettering={create,start,end,width,length,center};
})(globalThis);
