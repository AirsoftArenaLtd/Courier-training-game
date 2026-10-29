/* Execute the fetched B188 runner with stub processes; never start a browser or server. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const base=__dirname,root=path.resolve(base,'../../../..'),tests=path.join(root,'test');
const load=f=>JSON.parse(fs.readFileSync(path.join(base,f),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const audit=load('source-audit.json'),snapshot=fs.readFileSync(path.join(base,'pilot-run-all.js'),'utf8');
assert.equal(sha(snapshot),audit.pilotRunnerSha256);
assert.equal(sha(cp.execFileSync('git',['show',`${audit.pilotRunnerRevision}:test/run-all.js`],{cwd:root})),audit.pilotRunnerSha256);
const changed=cp.execFileSync('git',['diff','--name-only',audit.parent,'--','src','data','assets','lib','css','test','index.html','first-person.html'],{cwd:root,encoding:'utf8'}).trim().split('\n').sort();
assert.deepEqual(changed,Object.keys(audit.files).sort());
for(const [file,entry] of Object.entries(audit.files)){
 const before=cp.execFileSync('git',['show',`${audit.parent}:${file}`],{cwd:root,encoding:'utf8'}),after=fs.readFileSync(path.join(root,file),'utf8');
 assert.equal(sha(before),entry.beforeSha256);assert.equal(sha(after),entry.afterSha256);
 assert.equal(after.replace(entry.onlyInsertedText,''),before);
 assert.ok(after.split('\n')[0].startsWith('/* ')&&after.split('\n')[0].endsWith(' */'));
}
const inherited=['fpicefatiguebrowser.js','fpwellnessbrowser.js','fpincidentbrowser.js','fpreversebrowser.js'];
const named=['fppretriplessonbrowser.js','fproutelessonbrowser.js','fphazardlessonbrowser.js','fpdrivinglessonbrowser.js','fpjunctionlessonbrowser.js','fpnightlessonbrowser.js','fpschoollessonbrowser.js'].filter(f=>fs.existsSync(path.join(tests,f)));
const annotated=Object.keys(audit.files).map(f=>path.basename(f));
const ordinary=['fpbrandingbrowser.js','fppackagelabelboundbrowser.js'];
const selected=[...annotated,...inherited,...named,...ordinary];
assert.equal(new Set(selected).size,selected.length);

async function execute(label,overrides={}){
 const calls=[],timers=[],lines=[];let lastFile,serverClosed=false;
 return new Promise((resolve,reject)=>{
  const childStream={pipe(){}};
  const fakeCP={spawn(exe,args){
   assert.equal(exe,process.execPath);assert.equal(args.length,1);
   lastFile=path.basename(args[0]);assert.ok(selected.includes(lastFile));calls.push(lastFile);
   return {pid:1,stdout:childStream,stderr:childStream,on(event,callback){assert.equal(event,'close');queueMicrotask(()=>callback(0));}};
  }};
  const fakeFS=Object.assign(Object.create(fs),{mkdirSync(){},createWriteStream(){return {end(){}};}});
  const fakeHTTP={createServer(){return {listen(port,host,callback){assert.equal(port,0);assert.equal(host,'127.0.0.1');callback();},address(){return {port:65500};},close(){serverClosed=true;}};}};
  const fakeProcess={argv:[process.execPath,path.join(tests,'run-all.js'),'--browser',...selected],env:{QA_BROWSER:'/usr/bin/chromium',...overrides},execPath:process.execPath,kill(){throw Error('A dry run must not signal processes');},exit(code){
   try{
    assert.equal(code,0);assert.equal(serverClosed,true);assert.equal(timers.length,selected.length);assert.equal(calls.length,selected.length);
    const regular=ordinary.slice().sort(),long=selected.filter(f=>!ordinary.includes(f)).sort();
    assert.deepEqual(calls,[...regular,...long]);
    const normal=(Number(overrides.QA_TIMEOUT)||900)*1000,extended=Math.max(normal,(Number(overrides.QA_LONG_TIMEOUT)||3600)*1000);
    for(const t of timers)assert.equal(t.ms,ordinary.includes(t.file)?normal:extended,t.file);
    resolve({label,environment:overrides,stubbedChildCount:calls.length,actualChildProcessesStarted:0,actualServersStarted:0,ordinaryTimeoutMs:normal,longTimeoutMs:extended,orderAndLimits:timers,serverClosed});
   }catch(error){reject(error);}
  }};
  const fakeRequire=id=>id==='fs'?fakeFS:id==='http'?fakeHTTP:id==='child_process'?fakeCP:id==='path'?path:(()=>{throw Error('Unexpected runner dependency: '+id);})();
  try{vm.runInNewContext(snapshot,{__dirname:tests,__filename:path.join(tests,'run-all.js'),require:fakeRequire,process:fakeProcess,console:{log(...args){lines.push(args.join(' '));},error(...args){reject(Error(args.join(' ')));}},setTimeout(callback,ms){const token={file:lastFile,ms};timers.push(token);return token;},clearTimeout(token){assert.ok(timers.includes(token));},queueMicrotask,Buffer},{filename:'pilot-run-all.js'});}catch(error){reject(error);}
 });
}
(async()=>{
 const cases=[];
 for(const [name,env] of [['defaults',{}],['custom-limits',{QA_TIMEOUT:'1200',QA_LONG_TIMEOUT:'1800'}],['ordinary-limit-remains-a-floor',{QA_TIMEOUT:'4200',QA_LONG_TIMEOUT:'1800'}]])cases.push(await execute(name,env));
 const result={scope:'Dry execution of the exact fetched-pilot B188 runner. Child processes and HTTP serving are stubbed; these are scheduling checks, not successful browser runs.',parent:audit.parent,pilotRunnerRevision:audit.pilotRunnerRevision,pilotRunnerSha256:audit.pilotRunnerSha256,commentOnlyFilesVerified:annotated.length,inheritedMarkers:inherited,namedLessons:named,ordinaryControls:ordinary,cases,allPassed:true};
 fs.writeFileSync(path.join(base,'runner-verification.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({allPassed:true,commentOnlyFilesVerified:annotated.length,cases:cases.map(c=>({label:c.label,stubbedChildren:c.stubbedChildCount,ordinaryTimeoutMs:c.ordinaryTimeoutMs,longTimeoutMs:c.longTimeoutMs})),actualBrowsersStarted:0},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
