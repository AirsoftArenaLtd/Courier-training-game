/* Seeded load discrepancies. The world reports actions; workday owns every score. */
window.OTR = window.OTR || {};
OTR.fpLoadout = {
  kinds: ['clear','missort','extra','missing','late'],
  configure(m, kind) {
    if(m.kind!=='campaign')return;
    kind=kind||this.kinds[m.seed%this.kinds.length];
    if(!this.kinds.includes(kind)||m.loadout)throw Error('Invalid load-out');
    const target=m.parcels[m.seed%m.stops.length];
    m.loadout={kind,counted:false,missingReported:false,found:false,notice:false,missingId:['missing','late'].includes(kind)?target.id:null};
    if(m.loadout.missingId)target.location='pending';
    if(kind==='missort'||kind==='extra'){
      const decoys=window.OTR_DATA&&OTR_DATA.loading&&OTR_DATA.loading.m6_find.packages;
      const decoy=decoys&&decoys.find(p=>!m.stops.some(s=>s.address===`${p.number} ${p.street}`));
      m.parcels.push({id:'parcel'+m.stops.length,stop:-1,address:decoy?`${decoy.number} ${decoy.street}`:'216 Birch Ct',
        tracking:`OTR-UNLISTED-${m.seed}`,weight:4,anomaly:kind,location:'depot',zone:null,scanned:false,stopScanned:false,loaded:false,returnRequired:false});
    }
  },
  fire(m,type,key,ok,text,stop) {
    const id=`loadout:${type}:${key}`;
    if(m.events[id])return;
    m.log(id,'loading',ok?'good':'needs',text);
    if(OTR.workday)OTR.workday.report(type,{key,ok,stop});
  },
  scan(m,p) {
    p.scanned=true;m.lastScan=p.id;m.touch();
    if(p.anomaly==='missort'&&!m.departed)this.fire(m,'load.missort-caught',p.id,true,'Identified a package for another route during the load-out scan.');
    return 'This package is not on the route manifest. Take it to Dispatch and set it aside.';
  },
  aside(m) {
    const p=m.parcel(m.heldId);
    if(!m.loadout||!p||!p.anomaly||m.mode!=='walk'||!m.near('dispatch'))return 'Bring the unlisted package to Dispatch first.';
    p.location='aside';m.heldId=null;m.touch();
    if(p.anomaly!=='missort'||!m.departed)this.fire(m,p.anomaly==='missort'?'load.missort-caught':'load.extra-caught',p.id,true,'Set the unlisted package aside at Dispatch.');
    return 'The unlisted package is set aside. It will not go on this route.';
  },
  missing(m) {
    const L=m.loadout,p=L&&m.parcel(L.missingId);
    if(!p||m.mode!=='walk'||!m.near('dispatch'))return 'Check the manifest and report a missing package at Dispatch.';
    if(p.location!=='pending')return 'The missing package has already been located.';
    L.missingReported=true;m.touch();
    this.fire(m,'load.missing-found',p.id,!m.departed,m.departed?'Reported the missing package after departure.':'Reported the missing package to Dispatch before leaving.');
    if(L.kind==='missing'){
      p.location='depot';
      return 'Dispatch found the package at the depot. Scan and load it before leaving.';
    }
    return 'Dispatch recorded the missing package. Recheck the cargo at the next stop.';
  },
  count(m,n) {
    if(m.departed)return 'The departure load check is already closed.';
    if(!m.loadout||m.mode!=='walk'||!m.near('dispatch')||!Number.isInteger(n)||n<0||n>OTR.fpMission.slots.length)return 'Count the packages and confirm the load at Dispatch.';
    let actual=0,unexpected=false,missing=false;
    for(const p of m.parcels){
      if(p.location.startsWith('slot')){actual++;if(p.anomaly)unexpected=true;}
      else if(!p.anomaly&&!(p.location==='pending'&&m.loadout.missingReported))missing=true;
    }
    const ok=n===actual&&!unexpected&&!missing;
    m.loadout.counted=true;m.touch();
    this.fire(m,'load.count','manifest',ok,ok?'Checked the loaded packages against the manifest.':'The load count did not match the checked manifest.');
    return ok?'The load count is recorded. Secure the load before departure.':'The count or load does not match the manifest. Recheck missing and unlisted packages.';
  },
  depart(m) {
    const L=m.loadout;if(!L)return;
    if(!L.counted)this.fire(m,'load.count','manifest',false,'Left without checking the load count against the manifest.');
    for(const p of m.parcels){
      if(p.anomaly==='missort'&&p.location.startsWith('slot'))this.fire(m,'load.missort-missed',p.id,false,'Departed with a package for another route.');
      if(p.id===L.missingId&&p.location==='pending'&&!L.missingReported)this.fire(m,'load.missing-found',p.id,false,'Left without reporting the missing package to Dispatch.');
    }
  },
  findLater(m) {
    const L=m.loadout;if(!L||L.kind!=='late'||L.found||!m.departed||m.phase!=='route'||m.mode!=='walk'||!m.cargoOpen||!m.parked()||!m.near('cargo'))return;
    const s=m.stop(m.activeStop);
    if(Math.hypot(m.van.x-s.x,m.van.z-s.z)>18)return;
    const slot=OTR.fpMission.slots.find(slot=>!m.parcels.some(p=>p.location===slot.id));
    if(!slot)return;
    const p=m.parcel(L.missingId);p.location=slot.id;p.zone=slot.id;p.loaded=true;
    L.found=true;L.notice=true;m.touch();
    this.fire(m,'load.found-later',p.id,false,'Found a package that had been missed during load-out.',s.id+1);
  },
  valid(m,L) {
    return L&&this.kinds.includes(L.kind)&&L.kind===m.loadout.kind&&L.missingId===m.loadout.missingId&&
      ['counted','missingReported','found','notice'].every(k=>typeof L[k]==='boolean');
  }
};
