/* Separate optional stops. Original Tricky Doorsteps content and workday assignments are untouched. */
window.OTR=window.OTR||{};
OTR.fpCustomerProtocolContent={
  create(id){
    const kind={'m3-intercom':'intercom','m3-reception':'reception','m3-locker':'locker'}[id];if(!kind)throw Error('Unknown optional customer protocol');
    const source=OTR_DATA.stopSets.m3_doorsteps,original=source.stops[1],recipient=original.packages[0].to;
    const spec={kind,parcel:'p1',...(kind==='intercom'?{button:'12',available:true}:kind==='reception'?{recipient,receptionist:'Alex Morgan',signature:true}:{compartment:'B12'})};
    const brief=kind==='intercom'?'Deliver the parcel to unit 12. Use the intercom at the building entrance.':kind==='reception'?`Deliver the parcel for ${recipient} to the staffed reception desk. The person at the desk is Alex Morgan.`:'Deliver the parcel to compartment B12. Record the closed compartment with the handheld camera.';
    const stop={...original,id,brief,lot:{...original.lot,spec:{...original.lot.spec,steps:0}},packages:[{...original.packages[0],id:'p1',weight:8,service:kind==='reception'?'signature':'standard'}],decoys:original.decoys.map(p=>({...p})),answer:{...original.answer,name:kind==='reception'?spec.receptionist:recipient},talks:{},expected:{outcome:'deliver',types:[kind==='reception'?'reception':'recipient']}};
    return {content:{...source,title:kind==='intercom'?'At the Intercom':kind==='reception'?'At Reception':'Locker Delivery',stops:[stop],keyLessons:[]},spec};
  }
};
