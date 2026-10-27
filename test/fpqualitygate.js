/* Guard against mislabeled/stale fixtures and false quality passes. No browser is needed. */
const test=require('node:test'),assert=require('node:assert/strict'),{checkReport}=require('./fpquality');
const profile={id:'fixture',quality:'low',views:'cab,reverse'};
function report(){const sample=()=>({frames:12,contextLost:false,peak:{calls:60,triangles:2400,textures:2,attachmentBytes:3557376},phaserTextures:{withMipmapsUpperBytes:3000000}});return {tag:'sample',quality:'low',actualQuality:'low',audioContext:'running',accessibility:[],assets:{loaded:14,failed:0,fallbacks:0},prototype:{cab:sample(),reverse:sample()},errors:[],missingViews:[]};}
test('a profile requires actual frames for every named view and its requested quality',()=>{
 const r=report();assert.equal(checkReport(r,profile,'sample').triangles,2400);r.prototype.cab.peak.calls=0;assert.throws(()=>checkReport(r,profile,'sample'),/empty render/);r.prototype.cab.peak.calls=60;delete r.prototype.reverse;assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.prototype.reverse={frames:0};assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.actualQuality='high';assert.throws(()=>checkReport(r,profile,'sample'),/tag and quality/);
});
test('resource overflow, lost contexts and page errors fail the integrated gate',()=>{
 for(const [key,n] of [['calls',65],['triangles',2501],['textures',3],['attachmentBytes',4194305]]){const r=report();r.prototype.cab.peak[key]=n;assert.throws(()=>checkReport(r,profile,'sample'),/exceeds/);}
 let r=report();r.prototype.reverse.contextLost=true;assert.throws(()=>checkReport(r,profile,'sample'),/valid frames/);r=report();r.errors=['Page error'];assert.throws(()=>checkReport(r,profile,'sample'),/browser check/);r=report();r.prototype.cab.phaserTextures.withMipmapsUpperBytes=4194305;assert.throws(()=>checkReport(r,profile,'sample'),/Phaser/);
});
test('a fallback profile must really fail every selected model without loading any',()=>{
 const p={...profile,fallback:true},r=report();assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);r.assetFailure='missing-model-files';r.assets={loaded:0,failed:14,fallbacks:0};assert.ok(checkReport(r,p,'sample'));r.assets.loaded=1;assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);
});
test('High has explicit separate ceilings while the original Low ceilings remain',()=>{
 const r=report();r.quality=r.actualQuality='high';r.prototype.cab.peak={calls:120,triangles:290000,textures:4,attachmentBytes:15000000};r.prototype.cab.phaserTextures.withMipmapsUpperBytes=15000000;assert.ok(checkReport(r,{...profile,quality:'high'},'sample'));r.prototype.cab.peak.triangles=300001;assert.throws(()=>checkReport(r,{...profile,quality:'high'},'sample'),/triangles/);
});
test('accessibility and running sound cannot be silently omitted from the fixture',()=>{
 const r=report(),p={...profile,accessibility:'large,colour,reduced'};
 assert.throws(()=>checkReport(r,p,'sample'),/accessibility fixture/);
 r.accessibility=['reduced','large','colour'];assert.ok(checkReport(r,p,'sample'));
 r.audioContext='suspended';assert.throws(()=>checkReport(r,p,'sample'),/live sound/);
});
test('a blank physical mirror cannot pass on resource counters alone',()=>{
 const r=report(),p={...profile,views:'mirror'};r.prototype.mirror=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/live reflected pixels/);
 r.mirrorProof={mirror:{red:[255,0,0,255],blue:[0,0,255,255]}};assert.ok(checkReport(r,p,'sample'));
 r.mirrorProof.mirror.red=[35,49,60,255];r.mirrorProof.mirror.blue=[35,49,60,255];assert.throws(()=>checkReport(r,p,'sample'),/live reflected pixels/);
});
test('module counters require the requested real set-piece, boundaries and unchanged workday state',()=>{
 const r=report(),p={...profile,views:'moduledepot,modulecabreverse,modulecabhandheld'};
 for(const name of p.views.split(','))r.prototype[name]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);
 r.moduleFixture=true;r.moduleProof={};for(const name of p.views.split(','))r.moduleProof[name]={source:'module-controller-fixture',id:'m1-pretrip',piece:name==='moduledepot'?'depot':'cab',phase:'active',bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true,reverse:true,handheld:true};assert.ok(checkReport(r,p,'sample'));
 for(const field of ['bounded','checkpointUnchanged','eventsUnchanged','workdayUnchanged','reverse']){r.moduleProof.modulecabreverse[field]=false;assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);r.moduleProof.modulecabreverse[field]=true;}
 r.moduleProof.moduledepot.piece='cab';assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);
});
test('radio and night counters need actual route, caption, visibility and reduced-motion proofs',()=>{
 const {RADIO_VIEWS,PROFILES}=require('./fpquality');assert.ok(PROFILES.every(p=>RADIO_VIEWS.split(',').every(v=>p.views.split(',').includes(v))));
 const r=report(),p={...profile,views:'radiocheckin,nightglare,nightreduced,nightoff,nighton'};
 for(const v of p.views.split(','))r.prototype[v]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/native radio\/night proof/);
 r.radioFixture=true;r.radioProof={};for(const v of p.views.split(','))r.radioProof[v]={marker:1,valid:true,kind:'checkin',context:'radio',radio:{accepted:true},reduced:false,glare:.1,headlights:true,far:48};
 r.radioProof.nightreduced.reduced=true;r.radioProof.nightreduced.glare=0;r.radioProof.nightoff.headlights=false;r.radioProof.nightoff.far=30;assert.ok(checkReport(r,p,'sample'));
 r.radioProof.radiocheckin.context='0';assert.throws(()=>checkReport(r,p,'sample'),/did not change navigation/);r.radioProof.radiocheckin.context='radio';r.radioProof.nightglare.glare=0;assert.throws(()=>checkReport(r,p,'sample'),/Oncoming glare/);
});

test('healthy profiles reject a recovered fallback and reports missing the fallback counter',()=>{
 const r=report();r.assets.fallbacks=1;assert.throws(()=>checkReport(r,profile,'sample'),/asset fixture/);delete r.assets.fallbacks;assert.throws(()=>checkReport(r,profile,'sample'),/asset fixture/);r.assets.fallbacks=0;assert.ok(checkReport(r,profile,'sample'));
});

test('navigation views must name their versioned campaign fixture',()=>{
 const r=report(),p={...profile,views:'navfull'};r.prototype.navfull=r.prototype.cab;assert.throws(()=>checkReport(r,p,'sample'),/navigation fixture/);r.navigationFixture=true;assert.ok(checkReport(r,p,'sample'));
});
test('damage views require the located damage, cargo and physical clearance fixture',()=>{
 const r=report(),p={...profile,views:'damagefront'};r.prototype.damagefront=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/damage and clearance fixture/);
 r.damageFixture=true;r.damageProof={damagefront:{marker:1,valid:true,zones:7,clearances:2,instances:15,shift:3}};assert.ok(checkReport(r,p,'sample'));
 r.damageProof.damagefront.zones=0;assert.throws(()=>checkReport(r,p,'sample'),/damage and clearance fixture/);
});
test('clearance views require a lasting readable warning and the reverse view also requires its camera',()=>{
 const {PROFILES,CLEARANCE_VIEWS}=require('./fpquality');assert.equal(CLEARANCE_VIEWS.split(',').length,3);
 assert.ok(PROFILES.every(p=>CLEARANCE_VIEWS.split(',').every(v=>p.views.split(',').includes(v))));
 const name='damagereverseclearance',r=report(),p={...profile,views:name};r.prototype[name]=r.prototype.cab;
 r.damageFixture=true;r.damageProof={[name]:{marker:1,valid:true,zones:7,clearances:2,instances:15,shift:3}};
 assert.throws(()=>checkReport(r,p,'sample'),/persistent readable/);
 r.prototype[name].clearanceAlert={text:'The clearance is 8 feet 10 inches.',visible:true,reverse:false,bounds:{x:24,y:18,right:700,bottom:160}};
 assert.throws(()=>checkReport(r,p,'sample'),/live reverse camera/);r.prototype[name].clearanceAlert.reverse=true;assert.ok(checkReport(r,p,'sample'));
 r.prototype[name].clearanceAlert.bounds.bottom=721;assert.throws(()=>checkReport(r,p,'sample'),/persistent readable/);
});
test('richer-stop counters need physical control, custody and native-schedule proofs',()=>{
 const r=report(),p={...profile,views:'stopslockeropen,stopsstresscab'};r.prototype.stopslockeropen=r.prototype.stopsstresscab=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/richer-stop fixture/);r.deliveryFixture=true;
 assert.throws(()=>checkReport(r,p,'sample'),/richer-stop proof/);
 r.deliveryProof={stopslockeropen:{marker:1,parts:5,physicalTarget:true,protocol:'locker',deposited:true,source:'native-later-authorized',later:true},stopsstresscab:{marker:1,parts:5,physicalTarget:true,source:'native-later-authorized',later:true,damageZones:7}};assert.ok(checkReport(r,p,'sample'));
 for(const patch of [{physicalTarget:false},{deposited:false},{parts:0},{later:false},{source:'standard-service-generated-fixture'}]){const saved={...r.deliveryProof.stopslockeropen};Object.assign(r.deliveryProof.stopslockeropen,patch);assert.throws(()=>checkReport(r,p,'sample'),/richer-stop proof/);r.deliveryProof.stopslockeropen=saved;}
});

test('traffic views require the combined versioned traffic and navigation fixture',()=>{
 const r=report(),p={...profile,views:'trafficpeak'};r.prototype.trafficpeak=r.prototype.cab;assert.throws(()=>checkReport(r,p,'sample'),/traffic and navigation fixture/);r.trafficFixture=true;assert.ok(checkReport(r,p,'sample'));
});

test('walkaround views require the opted-in model and seven non-rendered physical targets',()=>{
 const r=report(),p={...profile,views:'walkroof'};r.prototype.walkroof=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/physical walkaround fixture/);
 r.walkaroundFixture=true;r.walkaroundProof={walkroof:{marker:1,valid:true,targets:7,proxyOnly:true}};assert.ok(checkReport(r,p,'sample'));
 for(const [key,value] of [['marker',0],['valid',false],['targets',0],['proxyOnly',false]]){
  const saved=r.walkaroundProof.walkroof[key];r.walkaroundProof.walkroof[key]=value;assert.throws(()=>checkReport(r,p,'sample'),/physical walkaround fixture/);r.walkaroundProof.walkroof[key]=saved;
 }
});
test('ambient views require visible bounded people, the correct source variant and a restorable day',()=>{
 const r=report(),p={...profile,views:'ambientwalk'};r.prototype.ambientwalk=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/ambient presentation proof/);
 r.ambientFixture=true;const proof={sites:20,selected:1,limit:1,sourcePeople:0,reserved:36,solid:true,restoreValid:true};r.ambientProof={ambientwalk:proof};assert.ok(checkReport(r,p,'sample'));
 for(const [key,value] of [['sites',0],['selected',0],['selected',2],['limit',2],['sourcePeople',1],['reserved',0],['solid',false],['restoreValid',false]]){const saved=proof[key];proof[key]=value;assert.throws(()=>checkReport(r,p,'sample'),/ambient presentation proof/);proof[key]=saved;}
 const high={...p,quality:'high',views:'ambientbench'};r.actualQuality=r.quality='high';r.prototype.ambientbench=r.prototype.cab;r.ambientProof.ambientbench={...proof,selected:2,limit:2,sourcePeople:2,reserved:0,bench:true};assert.ok(checkReport(r,high,'sample'));r.ambientProof.ambientbench.bench=false;assert.throws(()=>checkReport(r,high,'sample'),/ambient presentation proof/);
});

test('pre-trip views require the real registered adapter, all targets, bounded canvas reuse and isolated saves',()=>{
 const r=report(),p={...profile,views:'pretriptire,pretripcycle'};for(const n of p.views.split(','))r.prototype[n]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/physical pre-trip proof/);r.pretripFixture=true;r.pretripProof={};for(const n of p.views.split(','))r.pretripProof[n]={source:'registered-pretrip-adapter',id:'m1-pretrip',key:'pretrip-van',targets:21,visited:21,canvases:1,bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true};assert.ok(checkReport(r,p,'sample'));
 for(const [field,value] of [['targets',20],['canvases',2],['visited',20],['workdayUnchanged',false]]){const old=r.pretripProof.pretripcycle[field];r.pretripProof.pretripcycle[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/physical pre-trip proof/);r.pretripProof.pretripcycle[field]=old;}
});
test('route views require the registered planner, bounded panels, all twenty stop edits and unchanged workday state',()=>{
 const {ROUTELESSON_VIEWS}=require('./fpquality');assert.equal(ROUTELESSON_VIEWS.split(',').length,6);
 const r=report(),p={...profile,views:'lessonroutecycle,lessonroutereverse'};for(const n of p.views.split(','))r.prototype[n]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/route-planning proof/);r.routeLessonFixture=true;r.routeLessonProof={};
 for(const n of p.views.split(','))r.routeLessonProof[n]={source:'registered-route-adapter',id:'m1-route',key:'route-satnav',manifests:3,stops:n==='lessonroutecycle'?8:5,logItems:0,panels:n==='lessonroutecycle'?1:0,mapVisits:20,reverse:true,bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true};
 assert.ok(checkReport(r,p,'sample'));
 for(const [field,value] of [['id','m1-pretrip'],['manifests',2],['mapVisits',19],['panels',2],['logItems',1],['workdayUnchanged',false]]){const proof=r.routeLessonProof.lessonroutecycle,saved=proof[field];proof[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/route-planning proof/);proof[field]=saved;}
 r.routeLessonProof.lessonroutereverse.reverse=false;assert.throws(()=>checkReport(r,p,'sample'),/route-planning proof/);
});

test('hazard clips require actual cue sightlines, timing, model sources and isolated same-id scoring',()=>{
 const {HAZARDLESSON_VIEWS}=require('./fpquality');assert.equal(HAZARDLESSON_VIEWS.split(',').length,15);
 const r=report(),p={...profile,views:HAZARDLESSON_VIEWS};r.hazardLessonFixture=true;r.hazardLessonProof={};
 for(const name of p.views.split(',')){const stage=name.endsWith('before')?'before':name.endsWith('clue')?'clue':'after',kind=name.slice(4,-stage.length);r.prototype[name]=r.prototype.cab;r.hazardLessonProof[name]={source:'registered-hazard-adapter',id:'m1-spot',key:'hazard-road-clips',clips:5,kind,stage,at:6,time:6+{before:-.1,clue:.15,after:1.8}[stage],logItems:0,flags:0,reduced:false,loadedCar:true,loadedPerson:true,cue:{visible:true,clear:true,x:0,y:.2,z:.99},bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true};}
 assert.ok(checkReport(r,p,'sample'));const proof=r.hazardLessonProof.clipballclue;
 for(const [field,value] of [['id','m1-pretrip'],['time',7],['clips',4],['logItems',1],['flags',1],['loadedCar',false],['loadedPerson',false],['reduced',true],['checkpointUnchanged',false],['eventsUnchanged',false],['workdayUnchanged',false]]){const old=proof[field];proof[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/visible hazard-clip proof/);proof[field]=old;}
 for(const [field,value] of [['visible',false],['clear',false],['x',1.01],['y',NaN],['z',-1]]){const old=proof.cue[field];proof.cue[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/visible hazard-clip proof/);proof.cue[field]=old;}
 r.assets={loaded:0,failed:14,fallbacks:0};r.assetFailure='missing-model-files';const f={...p,fallback:true};assert.throws(()=>checkReport(r,f,'sample'),/visible hazard-clip proof/);for(const x of Object.values(r.hazardLessonProof))x.loadedCar=x.loadedPerson=false;assert.ok(checkReport(r,f,'sample'));
});

test('controllable-driving resources require all hazards and bays without changing the full workday scope',()=>{
 const {DRIVINGLESSON_VIEWS,PROFILES}=require('./fpquality'),names=DRIVINGLESSON_VIEWS.split(',');assert.equal(names.length,18);assert.equal(new Set(names).size,18);assert.ok(PROFILES.every(p=>!p.views.split(',').some(v=>v.startsWith('drill'))));
 const r=report(),p={...profile,views:DRIVINGLESSON_VIEWS};for(const name of names)r.prototype[name]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/controllable-driving proof/);r.drivingLessonFixture=true;r.drivingLessonProof={};
 for(const name of names){const parking=name.startsWith('drillparking'),kind=parking?'parking':name.slice(5).replace(/(clue|after)$/, ''),stage=parking?'bay':name.endsWith('clue')?'clue':'after',index=parking?Number(name.slice(-1)):['phone','ball','door','water','crosswalk','bus'].indexOf(kind);
  r.drivingLessonProof[name]={source:'registered-driving-adapter',id:'m1-driving',key:'driving-town-drill',stops:6,navigation:true,traffic:true,signs:true,day:3,kind,stage,index,logItems:0,results:0,hazardActive:true,hazardJudged:false,hazardKind:kind,loadedCar:true,loadedPerson:true,reduced:false,weather:index>=3?'rain':'clear',marking:{instances:4,visible:true,stop:true,texture:false},bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true,device:kind==='phone'&&stage==='after',parking:parking?{ok:true,reverse:true,steer:.22}:null,cue:{visible:true,clear:true,x:0,y:0,z:0}};
 }assert.ok(checkReport(r,p,'sample'));
 for(const [field,value] of [['source','generic-model'],['id','m1-spot'],['kind','door'],['stage','after'],['index',4],['stops',5],['navigation',false],['traffic',false],['signs',false],['day',1],['logItems',1],['results',1],['hazardActive',false],['hazardJudged',true],['hazardKind','door'],['loadedCar',false],['loadedPerson',false],['bounded',false],['checkpointUnchanged',false],['eventsUnchanged',false],['workdayUnchanged',false],['weather','rain'],['reduced',true],['device',true]]){const proof=r.drivingLessonProof.drillballclue,old=proof[field];proof[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/controllable-driving proof/,field);proof[field]=old;}
 for(const field of ['visible','clear']){r.drivingLessonProof.drillballclue.cue[field]=false;assert.throws(()=>checkReport(r,p,'sample'),/controllable-driving proof/);r.drivingLessonProof.drillballclue.cue[field]=true;}
 r.drivingLessonProof.drillparking3.parking.reverse=false;assert.throws(()=>checkReport(r,p,'sample'),/controllable-driving proof/);r.drivingLessonProof.drillparking3.parking.reverse=true;
 for(const [field,value] of [['instances',0],['visible',false],['stop',false],['texture',true]]){const mark=r.drivingLessonProof.drillparking3.marking,old=mark[field];mark[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/controllable-driving proof/);mark[field]=old;}
 const f={...p,fallback:true};r.assetFailure='missing-model-files';r.assets={loaded:0,failed:14,fallbacks:0};for(const proof of Object.values(r.drivingLessonProof))proof.loadedCar=proof.loadedPerson=false;assert.ok(checkReport(r,f,'sample'));
});
test('school resources require live actors, the real painted bay, accessibility and isolated optional records',()=>{
 const {SCHOOLLESSON_VIEWS,PROFILES}=require('./fpquality'),names=SCHOOLLESSON_VIEWS.split(',');assert.equal(names.length,8);assert.equal(new Set(names).size,8);assert.ok(PROFILES.every(p=>!p.views.includes('schoolapproach')));
 const r=report(),p={...profile,views:SCHOOLLESSON_VIEWS};for(const name of names)r.prototype[name]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonFixture=true;r.schoolLessonProof={};
 for(const name of names)r.schoolLessonProof[name]={source:'registered-school-adapter',id:'m1-school',key:'school-zone-drive',name,signClearSamples:name==='schoolapproach'?6:0,optional:true,stops:1,signs:true,traffic:true,navigation:true,day:3,logItems:0,finished:false,sourceChildren:false,reduced:false,device:['schooldevice','schoolcycle'].includes(name),deviceVisits:name==='schoolcycle'?20:name==='schooldevice'?1:0,bus:name==='schoolbus'?'flashing':'waiting',lampLit:name==='schoolbus',crossing:name==='schoolchildren'?'crossing':name==='schoolclear'?'resolved':'waiting',reverse:name==='schoolreverse',parking:true,marking:{instances:4,visible:true,stop:true,texture:false},bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true,cue:{visible:true,clear:true,x:0,y:0,z:0}};
 assert.ok(checkReport(r,p,'sample'));const proof=r.schoolLessonProof.schoolchildren;
 for(const [field,value] of [['source','synthetic'],['id','m1-driving'],['key','generic'],['name','schoolbus'],['optional',false],['stops',5],['signs',false],['traffic',false],['navigation',false],['day',1],['logItems',1],['finished',true],['sourceChildren',true],['reduced',true],['device',true],['deviceVisits',1],['crossing','waiting'],['bounded',false],['checkpointUnchanged',false],['eventsUnchanged',false],['workdayUnchanged',false]]){const old=proof[field];proof[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/,field);proof[field]=old;}
 for(const [field,value] of [['instances',8],['visible',false],['stop',false],['texture',true]]){const old=proof.marking[field];proof.marking[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/,field);proof.marking[field]=old;}
 for(const [field,value] of [['visible',false],['clear',false],['x',1.01],['z',-1]]){const old=proof.cue[field];proof.cue[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/,field);proof.cue[field]=old;}
 r.schoolLessonProof.schoolapproach.signClearSamples=1;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonProof.schoolapproach.signClearSamples=6;r.schoolLessonProof.schoolbus.lampLit=false;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonProof.schoolbus.lampLit=true;r.schoolLessonProof.schoolbus.bus='done';assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonProof.schoolbus.bus='flashing';r.schoolLessonProof.schoolreverse.reverse=false;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonProof.schoolreverse.reverse=true;r.schoolLessonProof.schoolfinish.parking=false;assert.throws(()=>checkReport(r,p,'sample'),/school-drive proof/);r.schoolLessonProof.schoolfinish.parking=true;
 const high={...p,quality:'high'};r.quality=r.actualQuality='high';for(const proof of Object.values(r.schoolLessonProof))proof.sourceChildren=true;assert.throws(()=>checkReport(r,high,'sample'),/school-drive proof/);for(const name of ['schoolchildren','schoolclear'])r.schoolLessonProof[name].personTarget='loaded-upper-body-triangle';assert.ok(checkReport(r,high,'sample'));
});
test('junction views require real controls, no injected progress, correctly rotated paint and unchanged workday state',()=>{
 const r=report(),p={...profile,views:'junctionapproach1,junctionfinish2,junctioncycle'};r.junctionLessonFixture=true;r.junctionLessonProof={};
 for(const name of p.views.split(',')){
  const index=name==='junctionapproach1'?1:2,device=name==='junctioncycle';r.prototype[name]=r.prototype.cab;r.junctionLessonProof[name]={source:'registered-junction-adapter',id:'m1-junctions',key:'junction-approaches',optional:true,index,kind:index===1?'signal':'giveway',traffic:true,navigation:true,signs:true,day:3,logItems:0,rounds:0,observations:0,device,deviceVisits:device?20:0,reduced:false,bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true,marking:{instances:4,visible:true,stop:true,texture:false,axis:index===2?'x':'z'},parking:true,aspect:'red',cue:{visible:true,clear:true,x:0,y:0,z:0}};
 }
 assert.ok(checkReport(r,p,'sample'));
 for(const [field,value] of [['observations',1],['rounds',1],['logItems',1],['eventsUnchanged',false],['bounded',false],['aspect','green']]){const q=r.junctionLessonProof.junctionapproach1,old=q[field];q[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/junction proof/);q[field]=old;}
 for(const [field,value] of [['axis','z'],['texture',true],['instances',8]]){const q=r.junctionLessonProof.junctionfinish2.marking,old=q[field];q[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/junction proof/);q[field]=old;}
 r.junctionLessonProof.junctioncycle.deviceVisits=1;assert.throws(()=>checkReport(r,p,'sample'),/junction proof/);r.junctionLessonProof.junctioncycle.deviceVisits=20;r.junctionLessonProof.junctionfinish2.cue.clear=false;assert.throws(()=>checkReport(r,p,'sample'),/junction proof/);
});
