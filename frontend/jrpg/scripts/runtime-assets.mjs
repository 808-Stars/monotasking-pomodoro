import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(resolve(dir,e.name)):resolve(dir,e.name)))).flat();}
export async function runtimeManifest(root,base='/'){
 const publicDir=resolve(root,'public'),chosen=new Set();
 const sources=(await files(resolve(root,'src'))).filter(p=>/\.(tsx?|css)$/.test(p));
 sources.push(resolve(publicDir,'action-icons.css'),resolve(publicDir,'camp-color-grade.css'));
 for(const source of sources){
  const content=await readFile(source,'utf8');
  for(const match of content.matchAll(/\/assets\/[^\s"'`()<>;,]+/g)){
   const path=resolve(publicDir,'.'+match[0].split('${')[0]);
   if(!path.startsWith(publicDir))continue;
   let info;try{info=await stat(path);}catch{continue;}
   for(const file of info.isDirectory()?await files(path):[path])if(/\.(png|webp|svg|woff2?|ttf)$/i.test(file))chosen.add(file);
  }
 }
 const assets=await Promise.all([...chosen].sort().map(async file=>({url:base+relative(publicDir,file).replaceAll('\\','/'),bytes:(await stat(file)).size,sha256:createHash('sha256').update(await readFile(file)).digest('hex'),kind:/\.(woff2?|ttf)$/i.test(file)?'font':'image'})));
 return {version:createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,16),assets,totalBytes:assets.reduce((sum,a)=>sum+a.bytes,0)};
}
export function runtimeAssetsPlugin(){
 let root,base='/',pending;
 return {name:'runtime-assets-manifest',configResolved(config){root=config.root;base=config.base;},
  configureServer(server){
   server.watcher.on('all',(_event,path)=>{if(path.includes('/src/')||path.includes('\\src\\')||path.includes('/public/')||path.includes('\\public\\'))pending=undefined;});
   server.middlewares.use(async(req,res,next)=>{
    if(![base+'runtime-assets.json','/runtime-assets.json'].includes(req.url?.split('?')[0]))return next();
    try{pending??=runtimeManifest(root,base);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-cache');res.end(JSON.stringify(await pending));}
    catch{pending=undefined;res.statusCode=500;res.end('Unable to build asset manifest');}
   });
  },async generateBundle(){this.emitFile({type:'asset',fileName:'runtime-assets.json',source:JSON.stringify(await runtimeManifest(root,base))});}};
}
