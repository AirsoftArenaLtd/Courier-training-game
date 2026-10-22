/* Uploaded surface sources: High selects them, Low never requests them, failures stay local. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local,root}=require('./tools/fpassets-context');
const uses=['surface-asphalt','surface-brick','surface-grass','surface-pavement','surface-plaster'];
function context(){const c={THREE:{...THREE}};c.window=c;vm.createContext(c);return {c,F:install(c)};}
test('the real manifest keeps all five surface images exclusive to High',()=>{
 const {F}=context(),m=JSON.parse(fs.readFileSync(path.join(root,'assets/3d/manifest.json')));
 assert.deepEqual(Array.from(F.manifest(m.files,true),j=>j.use).filter(s=>s.startsWith('surface-')).sort(),uses);
 assert.equal(F.manifest(m.files,false).some(j=>j.use.startsWith('surface-')),false);
});
test('High preloads five bounded sources and releases their image handles once; Low requests none',async()=>{
 for(const high of [false,true]){
  const {F}=context(),requests=[],bank=await F.preload({high,fetch:url=>{requests.push(url);return local(url);}});
  assert.equal(bank.models.size,14);assert.equal(bank.textures.size,high?5:0);assert.equal(bank.stats.loaded,high?19:14);assert.equal(bank.stats.failed,0);
  assert.equal(requests.filter(u=>/\.jpg$/.test(u)).length,high?5:0);
  if(high)assert.ok(bank.stats.decodedBytes>=20*1024*1024&&bank.stats.decodedBytes<=64*1024*1024);
  const images=[...bank.textures.values()].map(t=>t.image);
  for(const image of images){assert.equal(image.width,1024);assert.equal(image.height,1024);assert.ok(!image.closed);}
  bank.dispose();bank.dispose();assert.ok(images.every(i=>i.closed));assert.equal(bank.textures.size,0);
 }
});
test('a missing surface leaves all models and the other material sources available',async()=>{
 const {F}=context(),bank=await F.preload({high:true,fetch:url=>url.includes('asphalt_pit_lane_diff')?Promise.resolve(new Response('',{status:404})):local(url)});
 assert.equal(bank.stats.loaded,18);assert.equal(bank.stats.failed,1);assert.equal(bank.models.size,14);assert.equal(bank.textures.size,4);assert.ok(!bank.textures.has('surface-asphalt'));bank.dispose();
});
