const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../br-scene.js'),'utf8');
const start=source.indexOf('  function loadTile('),end=source.indexOf('  function update(',start);
const images=[],tile={priority:2,materials:[{}],texture:null,promise:null},ctx={tiles:[tile],quality:'high',time:0,lastUpdate:0,root:{},console,renderer:{capabilities:{maxTextureSize:4096,getMaxAnisotropy:()=>8}},addVegetation(){},Image:class{constructor(){images.push(this);}width=4096;height=4096;},document:{createElement:()=>({getContext:()=>({drawImage(){}})})},T:{CanvasTexture:class{constructor(c){this.width=c.width;this.disposed=false;}dispose(){this.disposed=true;}},SRGBColorSpace:'srgb'}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 const old=ctx.loadTile(tile);ctx.setQuality('balanced');const current=ctx.loadTile(tile);images[0].onload();await old;assert.equal(tile.texture,null,'stale high quality request overwrote current quality');
 images[1].onload();await current;assert.equal(tile.texture.width,1024);
 const texture=tile.texture;ctx.setQuality('high');assert(texture.disposed);const pending=ctx.loadTile(tile);ctx.setQuality('balanced');const newer=ctx.loadTile(tile);images[2].onerror();await pending;assert(tile.promise===newer,'stale error cleared the current request');images[3].onload();await newer;assert.equal(tile.texture.width,1024);
 ctx.setQuality('high');const high=ctx.loadTile(tile);images[4].onload();await high;assert.equal(tile.texture.width,3072);
 console.log('imagery loading: 5 stale-request, disposal and source-detail checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
