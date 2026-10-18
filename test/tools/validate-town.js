/* Validate converted town variants through the real scene loader without changing the game. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),prepared=process.argv[2],repeated=process.argv[3];
if(!prepared)throw Error('Pass the prepared asset directory, and optionally a repeated conversion to compare.');
const c=vm.createContext({console,setTimeout,clearTimeout});c.window=c;c.self=c;
vm.runInContext(fs.readFileSync(root+'/lib/three.min.js','utf8'),c);
const F=require(root+'/test/tools/fpassets-context.js').install(c);
const manifest=JSON.parse(fs.readFileSync(prepared+'/manifest.json','utf8'));
const local=async url=>new Response(fs.readFileSync(url==='assets/3d/manifest.json'?prepared+'/manifest.json':path.join(prepared,url.slice('assets/3d/'.length))));
(async()=>{
 const high=process.env.QA_GFX!=='low',bank=await F.preload({high,fetch:local,timeout:6000});
 assert.equal(bank.stats.loaded,8);assert.equal(bank.stats.failed,0);assert.equal(bank.stats.errors.length,0);
 const out={fixture:'Offline conversion validation. The command only reads models; it does not modify gameplay.',models:[],stats:bank.stats};
 for(const entry of manifest.files.filter(f=>f.quality===(high?'high':'low'))){
  const f=entry.path,raw=fs.readFileSync(path.join(prepared,f));if(repeated)assert.ok(raw.equals(fs.readFileSync(path.join(repeated,f))),'deterministic '+f);
  const model=bank.models.get(entry.use);assert.ok(model);assert.equal(model.parts.length,1);
  const p=model.parts[0],geometry=p.geometry;assert.ok(geometry.attributes.color);assert.ok(!p.material.map);assert.equal(p.material.side,c.THREE.FrontSide);
  const group=bank.add(new c.THREE.Group(),entry.use,[{x:5,z:-8,w:3,h:4,d:6}]);assert.ok(group);group.updateMatrixWorld(true);
  const size=new c.THREE.Box3().setFromObject(group).getSize(new c.THREE.Vector3());assert.ok(Math.abs(size.x-3)<1e-5&&Math.abs(size.y-4)<1e-5&&Math.abs(size.z-6)<1e-5);
  out.models.push({use:entry.use,bytes:raw.length,triangles:geometry.index.count/3,bounds:{x:model.size.x,y:model.size.y,z:model.size.z},parts:model.parts.length,textures:0});
  for(const mesh of group.children)mesh.dispose();
 }
 bank.dispose();assert.equal(bank.models.size,0);
 console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
