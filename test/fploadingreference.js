/* The native oracle must execute the original callbacks, including delayed removals, clean rounds and score clamps. */
const test=require('node:test'),assert=require('node:assert/strict'),reference=require('./tools/fp-loading-original');
const placement={l1:'A-mid-0',l2:'A-top-0',l3:'A-bottom-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l7:'C-mid-0',l8:'C-bottom-0',l9:'haz',l10:'A-mid-1',l11:'B-top-1',l12:'C-top-0'};
test('original load oracle retains the fixed perfect and unsafe scores and exact placement',()=>{
 const good=reference.load({placement,elapsed:100,strapped:true});assert.equal(good.result.score,2100);assert.deepEqual(good.result.ratios,{safety:1,efficiency:1});assert.deepEqual(good.stars,{safety:3,efficiency:3});assert.equal(Object.keys(good.result.stats.placement).length,12);
 const bad=reference.load({placement:{...placement,l3:'A-top-1',l6:'floor-0',l9:'B-mid-1'},elapsed:100,strapped:false});assert.equal(bad.result.score,1200);assert.equal(bad.result.ratios.safety,1/7);assert.equal(bad.result.ratios.efficiency,11/14);assert.equal(bad.stars.safety,0);assert.equal(bad.result.log.items.length,5);
});
function events({wrong=false,seconds=1}={}){const out=[];let start=0;const requests=['f1','f4','f6','f10','f12'],near=['f2','f5','f7','f11','f9'];for(let i=0;i<requests.length;i++){const base={roundIndex:i,roundStart:start,requested:requests[i]};if(wrong)out.push({...base,pkg:near[i],elapsed:start+.1,roundClean:true});out.push({...base,pkg:requests[i],elapsed:start+seconds,roundClean:!wrong&&seconds<=45});start+=seconds+.7;}return {events:out,elapsed:start};}
test('original find oracle executes five actual delayed rounds and the original 2000 perfect score',()=>{
 const r=reference.find(events());assert.equal(r.result.score,1850);assert.deepEqual(r.result.ratios,{efficiency:1,service:1});assert.equal(r.result.log.items.length,7);assert.equal(Object.keys(r.result.stats.placement).length,7);assert.equal(r.result.lessons.length,4);
 const instant=reference.find(events({seconds:0}));assert.equal(instant.result.score,2000);
});
test('near-match penalties clamp at zero, lose clean rounds, and slow assistance retains the source result',()=>{
 const r=reference.find(events({wrong:true}));assert.equal(r.result.score,1530);assert.equal(r.result.ratios.service,0);assert.match(r.result.summary,/5 wrong picks/);
 const slow=reference.find(events({seconds:46}));assert.equal(slow.result.score,250);assert.equal(slow.result.ratios.service,0);assert.equal(slow.result.ratios.efficiency,0);
});
test('native oracle rejects orphaned, repeated, early and unauthored observations',()=>{
 const r=events();assert.throws(()=>reference.find({...r,events:r.events.slice(1)}));assert.throws(()=>reference.find({...r,events:[r.events[0],r.events[0],...r.events.slice(1)]}));assert.throws(()=>reference.find({...r,elapsed:r.elapsed-1}));assert.throws(()=>reference.load({placement:{...placement,l3:'invented'},elapsed:10,strapped:true}));
});
