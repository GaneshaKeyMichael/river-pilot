const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/(src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g,(match,attr,file)=>`${attr}="${file}?v=${hash(fs.readFileSync(path.join(root,file))).slice(0,12)}"`);
fs.writeFileSync(path.join(root,'index.html'),html);
const files=fs.readdirSync(root).filter(f=>f!=='WEB-PACKAGE-MANIFEST.json'&&fs.statSync(path.join(root,f)).isFile()).sort().map(file=>{const data=fs.readFileSync(path.join(root,file));if(file.endsWith('.js'))new vm.Script(data.toString(),{filename:file});return {path:file,bytes:data.length,sha256:hash(data)};});
fs.writeFileSync(path.join(root,'WEB-PACKAGE-MANIFEST.json'),JSON.stringify({flat:true,sourceUnchanged:false,losslessTerrainDeliverySplit:true,version:'2.5-map-audit',files},null,2)+'\n');
console.log(`Validated syntax and refreshed asset references; ${files.length} root files hashed.`);
