
function finishPose(){const r=setup(),m=r.model,s=m.schoolLesson;Object.assign(m.van,m.stops[0].park,{speed:0,hand:true});s.busSeen=s.crossingSeen=true;m.driving.bus.state='done';m.crossing.state='resolved';return r;}
test('the school bay rejects a body beyond either painted side while preserving a van just inside',()=>{
 for(const side of [-1,1]){const r=finishPose(),m=r.model;m.van.x+=side*.5;assert.equal(S.ready(m),false,'lateral body overhang '+side);}
 const r=finishPose();r.model.van.x+=.21;assert.equal(S.ready(r.model),true,'one centimetre inside the painted edge');
});
test('the school bay rejects the former end tolerance and a rotated body crossing a side',()=>{
 for(const end of ['z0','z1']){const r=finishPose(),m=r.model;m.van.z=m.stops[0].bay[end]+(end==='z0'?2.6:-2.6);assert.equal(S.ready(m),false,'ten-centimetre end overhang '+end);}
 const r=finishPose();r.model.van.yaw+=.1;assert.equal(S.ready(r.model),false,'the rotated corners cross the paint');
});
test('a reversed whole van cannot finish, and invalid paint parking retains observations with a zero result',()=>{
 const reverse=finishPose();reverse.model.van.yaw+=Math.PI;assert.equal(S.ready(reverse.model),false);
 const r=finishPose();S.report(r,'drive.sign-school',{key:'school'});S.report(r,'drive.school-bus',{key:'bus'});r.model.van.x+=.5;
 const result=S.result(r);assert.equal(result.stats.completed,false);assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.log.items.length,2);assert.ok(result.log.items.every(x=>x.got===2));
});
