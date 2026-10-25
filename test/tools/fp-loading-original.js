/* Replay observed native actions through the actual 2D callbacks in an isolated, UI-free reference. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
function context(id){
 const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
 for(const file of ['data/theme.js','data/config.js','data/modules.js','data/m6_loading.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),c);
 const O=c.OTR;O.registerScene=P=>{c.LoadingReference=P;};O.audio={play(){}};O.fx={sparkle(){},shake(){},floatText(){}};const text=()=>({active:true,text:'',setText(t){this.text=t;return this;},setDepth(){return this;}});O.txt=()=>text();O.tex={liveShape(){return {setDepth(){return this;}};}};
 vm.runInContext(fs.readFileSync(path.join(ROOT,'src/scenes/m6/LoadingScene.js'),'utf8'),c);
 const C=c.OTR_DATA.loading[id.replace('-','_')],sc=c.OTR_DATA.modules.find(m=>m.id==='m6').scenarios.find(s=>s.id===id),r=Object.create(c.LoadingReference.prototype);
 Object.assign(r,{content:C,mode:C.mode,cats:sc.categories,pkgs:C.packages.map(p=>({...p})),cart:[],sprites:{},elapsed:0,strapped:false,finished:false,reporting:false,extraLessons:[],log:new O.ScoreLog(),score:0,roundIndex:0,cleanRounds:0,wrongPicks:0,roundClean:true,queue:[],running:true,panelBody:{removeAll(){},add(){}},panelTitle:text(),hintText:text(),tweens:{add(){}},drawSlots(){},layoutCart(){},checkPlacement(){},floatAt(){},hideCard(){},loadReport(){this.reporting=true;this.running=false;},finish(result){this.finished=true;this.result=result;}});
 r.buildSlots();r.cart=r.pkgs.slice();r.time={delayedCall(ms,fn){r.queue.push({at:r.elapsed+ms/1000,fn});}};
 for(const p of r.pkgs)r.sprites[p.id]={width:1,height:1,x:0,y:0,scale:1,visible:true,disabled:false,setScale(k){this.scale=k;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},disableInteractive(){this.disabled=true;return this;},setTint(){return this;},setVisible(v){this.visible=v;return this;}};
 if(C.mode==='find'){for(const p of r.pkgs)r.place(p,r.slots.find(s=>s.id===p.slot));r.nextRound();}
 return {O,C,sc,r};
}
function normalize(value){
 const clean=x=>Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='at').map(([k,v])=>[k,clean(v)])):x;
 const v=JSON.parse(JSON.stringify(value));return clean({score:v.score,ratios:v.ratios,log:{items:v.log.items},lessons:v.lessons,summary:v.summary,stats:{log:v.stats.log,placement:v.stats.placement}});
}
function finish({O,C,sc,r}){assert.ok(r.result,'The original scene did not finish');return {result:normalize(r.result),stars:Object.fromEntries(sc.categories.map(cat=>[cat,O.scoring.stars(r.result.ratios[cat],C.starThresholds)]))};}
function load(observation){
 const x=context('m6-load'),r=x.r;assert.ok(Number.isFinite(observation.elapsed)&&observation.elapsed>=0);
 assert.equal(Object.keys(observation.placement).length,r.pkgs.length,'The native load must place every authored parcel');
 for(const p of r.pkgs){const slot=r.slots.find(s=>s.id===observation.placement[p.id]);assert.ok(slot,'An observed slot is not authored');assert.equal(slot.pkg,null,'Two observed parcels share one position');r.place(p,slot);}
 r.elapsed=observation.elapsed;r.strapped=!!observation.strapped;r.finishLoad();r.endScenario();return finish(x);
}
function find(observation){
 const x=context('m6-find'),r=x.r;assert.ok(Number.isFinite(observation.elapsed)&&observation.elapsed>=0);
 const flush=at=>{const pending=r.queue;r.queue=[];assert.ok(pending.length,'No original transition is pending');assert.ok(at+1e-8>=Math.max(...pending.map(q=>q.at)),'The native next round began before the original delay');r.elapsed=at;for(const q of pending)q.fn();};
 for(const e of observation.events){
  if(!r.round)flush(e.roundStart);assert.equal(r.roundIndex,e.roundIndex,'The observed action belongs to another original round');assert.equal(r.round.pkg,e.requested);assert.equal(r.roundStart,e.roundStart);assert.ok(e.elapsed>=r.roundStart);
  r.elapsed=e.elapsed;r.helpIfStuck(r.elapsed-r.roundStart);assert.equal(r.roundClean,e.roundClean,'The observed clean-round state differs from the original timed assistance');
  const p=r.pkgs.find(p=>p.id===e.pkg);assert.ok(p&&!r.sprites[p.id].disabled,'An observed pick targets an unavailable original parcel');r.pickPackage(p);
 }
 assert.equal(r.roundIndex,x.C.rounds.length,'The native run did not finish all original rounds');flush(observation.elapsed);return finish(x);
}
module.exports={load,find,normalize};
