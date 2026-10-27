/* CPU reproduction only: original motor/cab actions, no van/car position fixture. */
const {O,fixture}=require('/workspace/c46-safety-wellness/test/tools/fp-reverse-context')(),s=fixture(),m=s.model;
try{
 O.fpCab.act(m,'cab-reverse');O.fpCab.act(m,'cab-handbrake');let steps=0;
 for(;steps<2000&&!s.scenarioSession.log.criticals().length;steps++)m.step({forward:true},.0125);
 const hit={z:m.van.z,hand:m.van.hand,car:{...m.traffic[0]},critical:s.scenarioSession.log.criticals().length};
 O.fpCab.act(m,'cab-drive');if(m.van.hand)O.fpCab.act(m,'cab-handbrake');
 for(let n=0;n<400;n++)m.step({forward:true},.0125);
 console.log(JSON.stringify({scope:'CPU reproduction using actual motor/cab actions; no van/car position fixture',steps,hit,after:{z:m.van.z,hand:m.van.hand,car:{...m.traffic[0]},critical:s.scenarioSession.log.criticals().length},movedForward:hit.z-m.van.z},null,2));
}finally{s.art.dispose();}
