/* Original complete-frame caps plus exact blocked-drive fixture geometry/isolation checks. */
const {checkReport}=require('../fpquality');
function checkBlocked(report,profile,tag){
 const peak=checkReport(report,profile,tag),fail=message=>{throw Error(profile.id+': '+message);};
 if(report.blockedFixture!==true)fail('Missing blocked-drive fixture.');
 for(const name of profile.views.split(',')){
  const p=report.blockedProof?.[name],walking=['blockednotice','blockedcar','blockedcard','blockedgate','blockedcargo'].includes(name);
  if(!p||p.source!=='blocked-static-resource-pose'||p.id!=='m4-blocked'||!p.registered||p.phase!=='active'||!p.bounded||!p.solidCar||!p.solidHolder||p.mountedSigns!==2||p.floatingAddress||!p.checkpointUnchanged||!p.eventsUnchanged||!p.workdayUnchanged)fail('Invalid physical adapter/isolation proof: '+name);
  if(p.fontLettering!==(profile.quality==='high')||p.handheld!==(name==='blockeddevice')||p.panel!==(name==='blockedcontrols')||p.mode!==(walking?'walk':'cab')||p.cardLeft!==(name==='blockedcard')||p.locked!==(name==='blockedgate')||p.gate!==(name==='blockedgate')||p.cargo!==(name==='blockedcargo'))fail('Wrong requested pose: '+name);
 }
 return peak;
}
module.exports={checkBlocked};
