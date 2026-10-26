/* Replay observed counter decisions through actual PickupScene/TalkController callbacks, with UI stubs only. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
function normalize(value){const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='at').map(([k,x])=>[k,clean(x)])):v;const v=JSON.parse(JSON.stringify(value));return clean({score:v.score,ratios:v.ratios,log:{items:v.log.items},lessons:v.lessons,stats:{log:v.stats.log}});}
function replay(id,observation){
 const c={Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m7_pickups.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/scenes/BaseScenarioScene.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c);
 const O=c.OTR;O.registerScene=P=>{c.Reference=P;};O.audio={play(){}};O.util.shuffle=a=>a;O.ui={toast(){},button(){return {};},modal(r,spec){r.lastModal=spec;if(r.captureCount&&spec.build)spec.build({add(){}},{close:fn=>fn()},spec.w,spec.h);}};
 vm.runInContext(fs.readFileSync(path.join(ROOT,'src/scenes/m7/PickupScene.js'),'utf8'),c);
 const sc=c.OTR_DATA.modules.find(m=>m.id==='m7').scenarios.find(s=>s.id===id);assert.ok(sc,'Unknown original pickup');const C=c.OTR_DATA.pickups[sc.dataKey.split('.')[1]],r=Object.create(c.Reference.prototype);
 Object.assign(r,{content:C,cats:sc.categories,pieces:C.pieces.map(p=>({...p})),manifest:C.manifest,counted:{},decided:{},docFlags:{},docDone:false,countAnswered:false,shortRaised:0,elapsed:0,log:new O.ScoreLog(),pieceImgs:{},tweens:{add(){}},refreshPanel(){},finish(result){this.result=result;}});for(const p of r.pieces)r.pieceImgs[p.id]={setTint(){}};
 const scorer={o:{log:r.log,cats:O.scoring.CATS},cast:{},moods:{},flags:{}},graph=C.talk;let nodeId=graph.start;
 const settle=()=>{for(let n=0;n<30;n++){const node=graph.nodes[nodeId];assert.ok(node);if(node.choices||node.type==='end')return node;nodeId=node.next;}throw Error('Original conversation did not settle');};
 for(const h of observation.talk){const node=settle();assert.equal(nodeId,h.node);const choice=node.choices.find(ch=>ch.text===h.text);assert.ok(choice,'The native reply is not an original choice');O.TalkController.prototype.applyEffects.call(scorer,choice.effects,node.check,choice,node);nodeId=choice.next;}
 assert.equal(settle().type,'end','The native conversation is incomplete');
 for(const decision of observation.counts){assert.ok(!r.countAnswered);for(const key of decision.ids){assert.ok(r.pieces.some(p=>p.id===key));r.counted[key]=true;}r.captureCount=true;r.confirmCount();r.captureCount=false;assert.ok(r.countChoices[decision.choice]);r.answerCount(r.countChoices[decision.choice]);}
 assert.ok(r.countAnswered,'The native count was not reconciled');
 if(C.docs){for(const index of observation.flags){assert.ok(Number.isInteger(index)&&C.docs.fields[index]);r.docFlags[index]=true;}r.openDocs();r.lastModal.buttons[0].onClick();assert.ok(r.docDone);}
 for(const decision of observation.decisions){const p=r.pieces.find(p=>p.id===decision.id);assert.ok(p&&!r.decided[p.id]);assert.equal(typeof decision.accept,'boolean');if(!decision.accept)assert.ok(c.OTR_DATA.pickups.reasons.some(q=>q.id===decision.reason));r.decide(p,decision.accept,decision.reason);}
 assert.equal(Object.keys(r.decided).length,r.pieces.length,'The native pickup left an undecided piece');assert.ok(Number.isFinite(observation.elapsed)&&observation.elapsed>=0);r.elapsed=observation.elapsed;r.endScenario();
 const criticals=r.log.criticals(undefined,sc.categories),stars=Object.fromEntries(sc.categories.map(cat=>[cat,Math.min(O.scoring.stars(r.result.ratios[cat],sc.starThresholds),criticals.some(it=>it.cat===cat)?1:3)]));return {result:normalize(r.result),stars};
}
module.exports={replay,normalize};
