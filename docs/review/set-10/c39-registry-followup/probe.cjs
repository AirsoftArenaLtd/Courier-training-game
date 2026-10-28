/* Read actual shared sources; evaluate the proposed patch only in an isolated VM. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const files=['data/theme.js','data/config.js','src/core/theme.js','src/core/flow.js','src/core/validate.js','src/core/fpscenario.js','src/core/fpschoollessonui.js'];
const sources=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]));
const replacements={
 'src/core/flow.js':[[
  'return OTR.util.getPath(OTR_DATA, sc.dataKey);',
  "return sc && typeof sc.dataKey === 'string' ? OTR.util.getPath(OTR_DATA, sc.dataKey) : undefined;"
 ]],
 'src/core/validate.js':[[
  '        if (sceneKeys && sceneKeys.indexOf(sc.scene) < 0) errors.push(`${sc.id}: scene "${sc.scene}" is not registered`);\n        const content = sc.dataKey.split(\'.\').reduce((o, k) => (o == null ? undefined : o[k]), DATA);\n        if (!content) errors.push(`${sc.id}: dataKey "${sc.dataKey}" not found`);',
  '        const only3d = sc.optional === true && !sc.scene && typeof sc.scene3d === \'string\';\n        if (sceneKeys && sceneKeys.indexOf(only3d ? \'FirstPersonScenarioScene\' : sc.scene) < 0) errors.push(`${sc.id}: scene "${sc.scene}" is not registered`);\n        if (only3d && sceneKeys && !OTR.fpScenario?.definitions.has(sc.scene3d)) errors.push(`${sc.id}: 3D adapter "${sc.scene3d}" is not registered`);\n        const content = typeof sc.dataKey === \'string\' ? sc.dataKey.split(\'.\').reduce((o, k) => (o == null ? undefined : o[k]), DATA) : undefined;\n        if ((!only3d || sc.dataKey !== undefined) && !content) errors.push(`${sc.id}: dataKey "${sc.dataKey}" not found`);'
 ]]
};
function build(patched){
 const c={};c.window=c;vm.createContext(c);
 for(const f of files){let text=sources[f];if(patched)for(const [old,next] of replacements[f]||[]){assert.equal(text.split(old).length,2,f);text=text.replace(old,next);}vm.runInContext(text,c,{filename:f});}
 return c;
}
const school={id:'m1-school',scene3d:'school-zone-drive',optional:true,categories:['safety']};
function validate(c,entry,sceneKeys=['FirstPersonScenarioScene']){return Array.from(c.OTR.validate.all({modules:[{scenarios:[entry]}],config:c.OTR_DATA.config},sceneKeys));}
const before=build(false),after=build(true),raw={};
try{validate(before,school);}catch(e){raw.missingDataKey=String(e);}
raw.provisionalSchoolKey=validate(before,{...school,dataKey:'schoolZoneLesson'});
assert.match(raw.missingDataKey,/split/);assert.equal(raw.provisionalSchoolKey.length,2);
try{before.OTR.registry.content(school);}catch(e){raw.registryContent=String(e);}
assert.match(raw.registryContent,/split/);
assert.deepEqual(validate(after,school),[]);assert.equal(after.OTR.registry.content(school),undefined);
assert.ok(validate(after,{...school,scene3d:'not-registered'}).some(x=>x.includes('adapter')));
assert.ok(validate(after,{...school,optional:false}).length>0);
assert.ok(validate(after,{...school,dataKey:'schoolZoneLesson'}).some(x=>x.includes('dataKey')));
assert.ok(validate(after,school,[]).some(x=>x.includes('scene')));
assert.ok(validate(after,{id:'existing',scene:'PreTripScene',dataKey:'missing',categories:['safety']},['PreTripScene']).some(x=>x.includes('dataKey')));
const route=after.OTR.fpScenario.resolve(school,{webgl:true});assert.equal(route.scene,'FirstPersonScenarioScene');assert.equal(after.OTR.fpScenario.resolve(school,{webgl:false}).presentation,'unavailable');
if(process.argv.includes('--patch')){
 const cp=require('node:child_process');let patch='';for(const [file,edits] of Object.entries(replacements)){
  let candidate=sources[file];for(const [old,next] of edits)candidate=candidate.replace(old,next);
  const temp=path.join('/tmp','c39-proposed-'+path.basename(file));fs.writeFileSync(temp,candidate);
  const d=cp.spawnSync('diff',['-u','--label','a/'+file,'--label','b/'+file,path.join(root,file),temp],{encoding:'utf8'});assert.equal(d.status,1);patch+=d.stdout;
 }fs.writeFileSync(path.join(__dirname,'shared-optional-support.patch'),patch);
}
console.log(JSON.stringify({scope:'Shared compatibility proposal only, evaluated in memory; actual shared source files are untouched. A-30 still owns startScenario routing and trainer selection.',sources:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(sources[f]).digest('hex')])),currentFailure:raw,proposedCasesPassed:9,launcherCurrentSourceStillRequires2dScene:sources['src/core/flow.js'].includes('scene.scene.manager.keys[sc.scene]')},null,2));
