/* Short handheld pages; the existing device supplies remapped keys, focus, larger text and narration. */
window.OTR=window.OTR||{};
OTR.fpRadioUI={
  open(scene){
    const m=scene.model,h=scene.handheld,R=OTR.fpRadio,size=OTR.fpAccess.settings().large?19:17,lines=text=>[{text,size}];
    if(!R.pending(m))return h.show({title:'The dispatch radio.',lines:lines('There is no dispatch radio message waiting.'),options:[{label:'Back',onPick:()=>h.home()}],back:()=>h.home()});
    if(!m.parked()){scene.message('Stop and set the parking brake before reading the radio message.');return;}
    const text=R.read(m),call=R.descriptor(m),act=fn=>{const response=fn();scene.checkpoint();h.show({title:'The dispatch radio.',lines:lines(response),options:[{label:'Review the radio message.',onPick:()=>this.open(scene)},{label:'Put away the handheld.',onPick:()=>h.close()}],back:()=>h.home()});};
    scene.checkpoint();
    h.show({title:'The dispatch radio.',lines:lines(text),options:[
      ...(!m.radio.accepted?[{label:'Accept the route update.',onPick:()=>act(()=>R.accept(m))},{label:'Decline the route update.',onPick:()=>act(()=>R.decline(m))}]:call.kind==='checkin'?[{label:'Confirm arrival at the check-in stop.',onPick:()=>act(()=>R.arrive(m))}]:[]),
      {label:'Put away the handheld.',onPick:()=>h.close()}
    ],back:()=>h.home()});
  }
};
