/* Additional heavy-fixture proof over the unchanged graphics ceilings and standard resource protocol. */
const {checkReport}=require('../fpquality');
function checkHeavy(report,profile,tag){
 const peak=checkReport(report,profile,tag),fail=message=>{throw Error(profile.id+': '+message);};
 if(report.heavyFixture!==true)fail('Missing actual heavy module fixture.');
 for(const name of profile.views.split(',')){
  const p=report.heavyProof?.[name];
  if(!p||p.source!=='physical-heavy-resource-poses'||p.id!=='m2-heavy'||!p.registered||p.name!==name||p.loads!==2||!p.canonical||p.targets!==4||p.batches!==2||!p.bounded||p.completed!==0||!p.checkpointUnchanged||!p.eventsUnchanged||!p.workdayUnchanged)fail('Invalid physical module/state proof for '+name);
  if(p.weight!==(name==='heavyteam'?35:95))fail('Wrong real load in '+name);
  if(name==='heavyassess'&&(!p.panel||p.mode!=='assess'))fail('Missing policy decision panel.');
  if(name==='heavygrip'&&(!p.held||p.critical!==0))fail('A floor grip must not be a critical.');
  if(name==='heavycritical'&&(!p.held||p.critical!==1||!p.panel))fail('Missing actual raised-load critical panel.');
  if(name==='heavyteam'&&(!p.helperReady||!p.held||p.critical!==0))fail('Missing physical assisted load.');
  if(name==='heavytruck'&&(!p.pushing||p.transport<.5||p.critical!==0))fail('Missing pushed hand truck.');
  if(name==='heavystatus'&&!p.handheld)fail('Missing mounted policy/status page.');
 }
 return peak;
}
module.exports={checkHeavy};
