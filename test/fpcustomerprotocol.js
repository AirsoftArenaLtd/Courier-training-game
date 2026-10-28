/* Optional protocol actions compose the real richer-stop kernel and the unchanged StopScene rules. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Date:class extends Date{static now(){return 123;}}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/scanner.js','data/workday_events.js','data/m3_doorsteps.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/fpcustomerstop.js','src/core/fpstops.js','src/core/fpcustomerprotocol.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerStop,P=O.fpCustomerProtocol,source=c.OTR_DATA.stopSets.m3_doorsteps,plain=x=>JSON.parse(JSON.stringify(x));
c.BaseScenarioScene=class{};O.registerScene=C=>{O.StopReference=C;};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/stops/StopScene.js','utf8'),c);
function fixture(kind='intercom',options={}){
 const def=source.stops[1],content={...source,stops:[{...def,...options.stop}]},spec={kind,parcel:'p1',button:'Unit 12',available:true,recipient:'Ana Ortiz',receptionist:'Sam Lee',signature:true,compartment:'B12',...options.spec};
 const s=P.create(content,spec,{coaching:options.coaching!==false});assert.equal(P.begin(s),true);return s;
}
function tick(s,seconds,active=true){for(let i=0;i<Math.ceil(seconds*20);i++)P.step(s,.05,active);}
function leave(s,{scan=true,safe=true,wrong=false}={}){
 if(wrong){K.take(s,'d1');K.replace(s,'d1');}assert.equal(K.take(s,'p1'),true);if(scan)assert.equal(K.scan(s,'p1',true),true);assert.equal(K.exit(s,safe),true);
}
function deliver(s){
 const kind=s.protocol.spec.kind;
 if(kind==='intercom'){assert.equal(P.action(s,'call',{button:'Unit 12',purpose:'delivery'}),true);tick(s,2.05);assert.equal(P.action(s,'open'),true);assert.equal(P.handOver(s),true);}
 else if(kind==='reception'){assert.equal(P.action(s,'identify',{role:'reception',name:'Sam Lee'}),true);assert.equal(P.action(s,'sign','Sam Lee'),true);assert.equal(P.action(s,'handover'),true);}
 else{assert.equal(P.action(s,'open','B12'),true);assert.equal(P.action(s,'scan','p1'),true);assert.equal(P.action(s,'deposit'),true);assert.equal(P.action(s,'close'),true);assert.equal(P.action(s,'photo'),true);}
}
function finish(s,safe=true){assert.equal(K.enter(s,safe),true);assert.equal(P.evaluate(s),true);assert.equal(P.next(s),true);return P.result(s);}
function common(s){const ref={S:s.state,def:s.def,log:new O.ScoreLog(s.def.id),collapsed:false,heat:null};O.StopReference.prototype.evaluate.call(ref);return plain(ref.log.items.filter(i=>i.cat==='safety'||i.cat==='efficiency'));}
test('content is copied, each authored par is preserved with only the agreed protocol grace',()=>{
 const before=JSON.stringify(source);for(const def of source.stops)for(const kind of ['intercom','reception','locker']){const s=fixture(kind,{stop:{...def,packages:[{...def.packages[0],weight:8}]}});assert.equal(s.def.par,def.par+(kind==='locker'?0:30));}
 for(const kind of ['intercom','reception','locker'])assert.equal(fixture(kind,{stop:{par:0}}).def.par,120+(kind==='locker'?0:30));
 assert.equal(JSON.stringify(source),before);assert.throws(()=>P.create(source,{kind:'intercom',parcel:'p1'}),/Invalid/);assert.throws(()=>fixture('intercom',{spec:{parcel:'other'}}),/Invalid/);assert.throws(()=>fixture('intercom',{spec:{button:''}}),/Invalid/);
});
test('all three protocols finish with catalogue service and exact shared safety and efficiency',()=>{
 for(const kind of ['intercom','reception','locker']){const s=fixture(kind);leave(s);deliver(s);const result=finish(s),entry=c.OTR_DATA.workdayEvents['stop.'+kind];assert.equal(result.score,1100);assert.deepEqual(plain(result.ratios),{service:1,safety:1,efficiency:1});assert.deepEqual(plain(s.log.items.filter(i=>i.cat!=='service')),common(s));const rows=s.log.items.filter(i=>i.cat==='service');assert.equal(rows.length,1);assert.equal(rows[0].type,'stop.'+kind);assert.equal(rows[0].label,entry.label);assert.equal(rows[0].max,entry.max);assert.equal(rows[0].lesson,entry.lesson);assert.equal(result.log,s.log);assert.equal(result.stats.completed,true);assert.equal(P.result(s),result);assert.equal(s.log.items.length,6);}
});
test('the intercom buzz uses actual active game time, excluding paused time and legacy knock jumps',()=>{
 const s=fixture();leave(s);assert.equal(P.action(s,'call',{button:'Unit 12',purpose:'delivery'}),true);const clock=s.protocol.elapsed;tick(s,100,false);assert.equal(s.protocol.elapsed,clock);assert.equal(K.knock(s),true);assert.equal(s.state.elapsed,3);assert.equal(P.action(s,'open'),false);assert.equal(s.protocol.sequence.failed,true);tick(s,1.95);assert.equal(P.action(s,'open'),false);tick(s,.1);assert.equal(P.action(s,'open'),true);assert.equal(P.handOver(s),true);const result=finish(s);assert.equal(result.ratios.service,0);assert.equal(result.stats.protocol.complete,true);assert.equal(result.stats.protocol.failed,true);
});
test('wrong intercom identity stays a service failure after correcting the call and waiting',()=>{
 for(const value of [{button:'Unit 13',purpose:'delivery'},{button:'Unit 12',purpose:'visitor'}]){const s=fixture();leave(s);assert.equal(P.action(s,'call',value),false);deliver(s);finish(s);const row=s.log.items.find(i=>i.type==='stop.intercom');assert.equal(row.got,0);assert.equal(row.label,c.OTR_DATA.workdayEvents['stop.intercom'].fail);assert.equal(s.log.ratio('safety'),1);}
});
test('reception requires the actual carried scanned parcel, identified person and matching signature',()=>{
 const s=fixture('reception');assert.equal(P.action(s,'identify',{role:'reception',name:'Sam Lee'}),false,'cannot use the desk from the cab');leave(s,{scan:false});assert.equal(P.action(s,'identify',{role:'reception',name:'Sam Lee'}),true);assert.equal(P.action(s,'sign','Sam Lee'),true);assert.equal(P.action(s,'handover'),false);assert.equal(s.protocol.sequence.handed,false);assert.equal(K.scan(s,'p1'),true);assert.equal(P.action(s,'identify',{role:'recipient',name:'Ana Ortiz'}),true);assert.equal(s.protocol.sequence.signed,false,'changing the recipient clears the prior signature');assert.equal(P.action(s,'handover'),false);assert.equal(P.action(s,'sign','Ana Ortiz'),true);assert.equal(P.action(s,'handover'),true);assert.equal(s.state.signer,'Ana Ortiz');assert.deepEqual(plain(s.state.carrying),[]);assert.deepEqual(plain(s.state.delivered),['p1']);assert.equal(finish(s).ratios.service,0,'unsigned handover attempt is kept');
});
test('a standard recipient may take their parcel without a signature, while reception always signs',()=>{
 const s=fixture('reception',{spec:{signature:false}});leave(s);assert.equal(P.action(s,'identify',{role:'recipient',name:'Ana Ortiz'}),true);assert.equal(P.action(s,'handover'),true);assert.equal(finish(s).ratios.service,1);
 const r=fixture('reception',{spec:{signature:false}});leave(r);assert.equal(P.action(r,'identify',{role:'reception',name:'Sam Lee'}),true);assert.equal(P.action(r,'handover'),false);assert.equal(P.action(r,'sign','Sam Lee'),true);assert.equal(P.action(r,'handover'),true);assert.equal(finish(r).ratios.service,0);
});
test('a locker needs its own scan and a closed-door photo, and reopening invalidates the record',()=>{
 const s=fixture('locker');leave(s);assert.equal(P.action(s,'deposit'),false);assert.equal(P.action(s,'open','B12'),true);assert.equal(P.action(s,'deposit'),false,'the van scan does not replace the locker sequence');assert.equal(P.action(s,'scan','p1'),true);assert.equal(P.action(s,'deposit'),true);assert.deepEqual(plain(s.state.carrying),[]);assert.equal(s.state.outcome,null);assert.equal(P.action(s,'photo'),false);assert.equal(P.action(s,'close'),true);assert.equal(P.action(s,'photo'),true);assert.equal(s.state.outcome,'delivered');assert.equal(P.action(s,'open','B12'),true);assert.equal(s.state.outcome,null);assert.deepEqual(plain(s.state.delivered),[]);assert.equal(P.action(s,'retrieve'),true);assert.deepEqual(plain(s.state.carrying),['p1']);assert.equal(P.action(s,'deposit'),true);assert.equal(P.action(s,'close'),true);assert.equal(P.action(s,'photo'),true);assert.equal(finish(s).ratios.service,0,'early photo remains a failed observation');
});
test('a wrong locker or a wrong carried parcel cannot replace the actual compartment and parcel',()=>{
 const s=fixture('locker');leave(s);assert.equal(P.action(s,'open','B11'),false);assert.equal(P.action(s,'scan','unknown'),false);assert.equal(P.action(s,'deposit'),false);deliver(s);assert.equal(finish(s).ratios.service,0);assert.deepEqual(plain(s.state.delivered),['p1']);
});
test('common timing bands, climb choices, scan location and wrong pulls match the actual 2D evaluator',()=>{
 let cases=0;for(const kind of ['intercom','reception','locker'])for(const safe of [false,true])for(const scanAtVan of [false,true])for(const wrong of [false,true])for(const scale of [0,1,1.0001,1.4,1.4001,2,2.0001]){
  const s=fixture(kind);leave(s,{safe,scan:scanAtVan,wrong});if(!scanAtVan)K.scan(s,'p1',false);deliver(s);K.enter(s,safe);s.state.elapsed=s.def.par*scale;const expected=common(s);assert.equal(P.evaluate(s),true);assert.deepEqual(plain(s.log.items.filter(i=>i.cat!=='service')),expected);assert.equal(s.log.items.filter(i=>i.cat==='service').length,1);cases++;
 }assert.equal(cases,168);console.log(JSON.stringify({commonRuleComparisons:cases}));
});
test('return trips and previous unsafe climbing remain in the common log after a successful protocol',()=>{
 const s=fixture();leave(s,{safe:false});assert.equal(K.enter(s,false),true);assert.equal(s.state.vanTrips,1);assert.equal(K.take(s,'p1'),true);assert.equal(K.exit(s,true),true);deliver(s);finish(s,true);assert.deepEqual(plain(s.log.items.filter(i=>i.cat!=='service')),common(s));assert.equal(s.log.ratio('safety'),0);assert.ok(s.log.items.find(i=>i.kind==='penalty'&&i.cat==='efficiency'));assert.equal(s.log.ratio('service'),1);
});
test('an unfinished result is zero, keeps the observations and freezes further actions and finalization',()=>{
 const s=fixture();assert.equal(P.evaluate(s),false);assert.equal(P.result(s),null);leave(s);P.action(s,'call',{button:'wrong',purpose:'delivery'});const result=P.result(s,'timeout');assert.equal(result.score,0);assert.deepEqual(plain(result.ratios),{service:0,safety:0,efficiency:0});assert.equal(result.stats.protocol.failed,true);assert.equal(result.stats.completed,false);const before=JSON.stringify(s);assert.equal(P.step(s,.05),false);assert.equal(P.action(s,'call',{button:'Unit 12',purpose:'delivery'}),false);assert.equal(P.handOver(s),false);assert.equal(K.enter(s,true),false);assert.equal(K.take(s,'d1'),false);assert.equal(P.evaluate(s),false);assert.equal(P.next(s),false);assert.equal(P.begin(s),false);assert.equal(P.result(s),result);assert.equal(JSON.stringify(s),before);
});
test('completion cannot be evaluated twice or reported into a suspended workday',()=>{
 O.save={data:{workday:{current:{id:4}}}};O.workday={events:[{type:'brief.read',key:'suspended'}],report(){throw Error('Optional practice entered the workday');}};const outside=JSON.stringify([O.save.data,O.workday.events]);
 for(const kind of ['intercom','reception','locker']){const s=fixture(kind,{coaching:false});leave(s);deliver(s);assert.equal(P.evaluate(s),false,'return to the cab is required');finish(s);const before=JSON.stringify(s);assert.equal(P.evaluate(s),false);assert.equal(P.next(s),false);assert.equal(P.action(s,'open','B12'),false);assert.equal(P.step(s,.05),false);assert.equal(JSON.stringify(s),before);assert.equal(s.log.criticals().length,0);assert.ok(s.log.items.every(i=>i.group===s.def.id));}
 assert.equal(JSON.stringify([O.save.data,O.workday.events]),outside);
});
