/* Additional fixture checks. The existing complete-frame resource ceilings remain authoritative. */
const {checkReport}=require('../fpquality');
function checkClosure(report,profile,tag){
 const peak=checkReport(report,profile,tag),fail=message=>{throw Error(profile.id+': '+message);};
 if(report.closureFixture!==true)fail('Missing physical closure fixture.');
 for(const name of profile.views.split(',')){
  const p=report.closureProof?.[name];
  if(!p||p.source!=='closure-static-resource-pose'||p.id!=='m4-closure'||!p.registered||p.phase!=='active'||!p.bounded||!p.solidClosure||p.gates!==7||p.mountedSigns!==2||p.floatingClosure||!p.checkpointUnchanged||!p.eventsUnchanged||!p.workdayUnchanged)fail('Invalid adapter/geometry/isolation proof: '+name);
  if(p.fontLettering!==(profile.quality==='high')||p.handheld!==(name==='closuredevice')||p.panel!==(name==='closurecontrols')||p.reverse!==(name==='closurereverse')||p.mode!==(['closurebay','closurebarrier'].includes(name)?'walk':'cab'))fail('Wrong requested resource pose: '+name);
 }
 return peak;
}
module.exports={checkClosure};
