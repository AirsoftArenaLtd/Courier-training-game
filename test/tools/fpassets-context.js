/* Real vendored GLB parsing in a CPU-only VM; keep ArrayBuffers in that VM's realm. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
function install(c){
  Object.assign(c,{TextDecoder,URL,AbortController,Response,Blob,setTimeout,clearTimeout});c.self=c;
  for(const f of ['lib/GLTFLoader.min.js','src/core/fpassets.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
  return c.OTR.fpAssets;
}
const local=async url=>{try{return new Response(fs.readFileSync(path.join(root,url)));}catch(_){return new Response('',{status:404});}};
module.exports={install,local,root};
