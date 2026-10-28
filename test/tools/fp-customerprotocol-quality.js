/* Additional fixture proof; the original renderer, sound, reflection and texture ceilings remain authoritative. */
const {checkReport}=require('../fpquality');
function checkProtocol(report,profile,tag){
 const peak=checkReport(report,profile,tag),fail=message=>{throw Error(profile.id+': '+message);};
 if(report.protocolFixture!==true)fail('Missing real customer protocol fixture.');
 for(const name of profile.views.split(',')){
  const p=report.protocolProof?.[name],kind=name.includes('reception')||name==='protocolsignature'?'reception':name.includes('locker')||name==='protocolcamera'||name==='protocolstatus'?'locker':'intercom';
  if(!p||p.source!=='customer-protocol-resource-pose'||p.name!==name||p.id!=='m3-'+kind||p.kind!==kind||!p.registered||!p.bounded||p.batches!==3||p.parcels!==2||p.targets!==(kind==='reception'?1:2)||p.par!==p.basePar+(kind==='locker'?0:30)||!p.checkpointUnchanged||!p.eventsUnchanged||!p.workdayUnchanged)fail('Invalid adapter/state proof: '+name);
  if(p.importedPerson===!!profile.fallback||(p.importedBuildings>0)===!!profile.fallback||p.fontLettering!==(profile.quality==='high'))fail('Wrong loaded/fallback/lettering profile: '+name);
  if(p.panel!==['protocolintercom','protocolreception','protocolreport'].includes(name)||p.handheld!==['protocolsignature','protocolstatus'].includes(name))fail('Wrong physical panel/device pose: '+name);
  if(kind==='locker'&&(!p.sequence.deposited||p.sequence.open!==(name==='protocollockeropen')))fail('Wrong locker door/parcel pose: '+name);
  if(name==='protocolsignature'&&(p.sequence.role!=='reception'||p.sequence.signed))fail('Missing unsigned reception widget.');
  if(name==='protocolreport'&&(!p.sequence.opened||!p.sequence.failed||p.mode!=='cab'))fail('Missing actual service failure finding.');
 }
 return peak;
}
module.exports={checkProtocol};
