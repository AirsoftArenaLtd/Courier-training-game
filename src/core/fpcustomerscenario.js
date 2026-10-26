/* Physical customer conversations. Existing ids, authored replies and shared local ScoreLog results. */
window.OTR=window.OTR||{};
OTR.fpCustomerScenario={
  speaker(s,key){return key==='courier'?'the courier':key==='trainer'?'the trainer':s.cast[key]?.name||'the narrator';},
  panel(scene,title,body,choices,kind,back){scene.showPanel(title,body,choices,{accessibleText:true,back});scene.panel.customer=true;scene.panel.customerKind=kind;scene.panel.customerText=scene.panel.root.list.find(o=>o.type==='Text'&&o.y===170);},
  body(s){return s.remaining===null?'Choose this reply or read another reply.':`You have ${Math.ceil(s.remaining)} seconds to choose a reply.`;},
  present(scene,page=0){
    const run=scene.scenarioSession,s=scene.model.customerTalk,stage=scene.model.customerStage,K=OTR.fpCustomerTalk,A=this;
    if(run.phase!=='active')return;
    const presenter=run.definition.stage||OTR.fpCustomerStage,changed=presenter.apply(stage,s),ready=run.definition.conversationStage?run.definition.conversationStage(run,scene):true;scene.sync();if(ready===false)return;
    if(changed&&stage.routeChanged){scene.closePanel();scene.message(run.definition.stage?presenter.destination(stage):'Walk along the sidewalk to the house, then face its conversation point to continue.');return;}
    let activePanel=null;const back=()=>scene.closePanel(),token=s.entries,guard=(phase,action)=>()=>{if(run.phase==='active'&&s.entries===token&&s.phase===phase&&(!run.definition.guardConversation||scene.panel===activePanel))action();};
    if(s.phase==='line'){
      this.panel(scene,`Listen to ${this.speaker(s,s.node.speaker)}.`,s.node.text,[{label:s.node.choices?'Read the replies.':'Continue the conversation.',action:guard('line',()=>{K.advance(s);A.present(scene);})},{label:'Step back from the conversation.',action:back}],'line',()=>scene.showPause());
    }else if(s.phase==='choices'){
      page=((page%s.choices.length)+s.choices.length)%s.choices.length;s.replyPage=page;
      this.panel(scene,`Read reply ${page+1} of ${s.choices.length}.`,this.body(s),[
        {label:s.choices[page].text,action:guard('choices',()=>{K.choose(s,page);A.present(scene);})},
        {label:'Read the next reply.',action:guard('choices',()=>A.present(scene,page+1))},
        {label:'Read the question again.',action:guard('choices',()=>A.question(scene))},
        {label:'Step back from the conversation.',action:back}
      ],'reply',()=>scene.showPause());scene.panel.customerSecond=Math.ceil(s.remaining??0);
    }else if(s.phase==='feedback'){
      this.panel(scene,'Review the conversation.',s.feedback,[{label:'Continue the conversation.',action:guard('feedback',()=>{K.advance(s);A.present(scene);})},{label:'Step back from the conversation.',action:back}],'feedback',()=>scene.showPause());
    }else if(s.phase==='done'){if(run.definition.conversationEnded)run.definition.conversationEnded(run,scene);else this.ending(scene,0);}
    else this.unfinished(run,scene,'This conversation could not continue. Return to the station and start again.');
    activePanel=scene.panel;
  },
  question(scene){const s=scene.model.customerTalk;this.panel(scene,`Listen to ${this.speaker(s,s.node.speaker)} again.`,s.node.text,[{label:'Read the replies again.',action:()=>this.present(scene,s.replyPage||0)},{label:'Step back from the conversation.',action:()=>scene.closePanel()}],'question',()=>scene.showPause());},
  history(scene,index){
    const s=scene.model.customerTalk,list=s.transcript;if(!list.length){this.present(scene);return;}
    index=index===undefined?list.length-1:(index+list.length)%list.length;const entry=list[index];
    this.panel(scene,`Listen to ${this.speaker(s,entry.speaker)} again.`,entry.text,[{label:'Read the previous statement.',action:()=>this.history(scene,index-1)},{label:'Return to the conversation.',action:()=>this.present(scene,s.replyPage||0)}],'history',()=>scene.showPause());
  },
  ending(scene,page){
    const s=scene.model.customerTalk,practice=OTR.fpScenario.coaching(scene.scenarioSession),pages=practice?[s.ending.text,...s.notes]:['Your decisions have been recorded.'];
    this.panel(scene,'The conversation has ended.',pages[page],[{label:page+1<pages.length?'Read the next finding.':'Finish the conversation.',action:()=>{if(page+1<pages.length)this.ending(scene,page+1);else scene.finishScenario();}}],'ending',()=>scene.toHub());
  },
  controls(scene,page=0){
    const k=code=>OTR.fpAccess.key(code),body=page?'Read one reply at a time. Choosing the first button sends that reply. The decision clock keeps running while you review replies, the question or earlier statements. The pause menu and handheld stop both clocks.':`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face the nearby customer, door, reception counter or phone, then ${k('KeyE')} to continue. Walk along the sidewalk between the reception and the house.`;
    this.panel(scene,'Use the conversation controls.',body,[{label:page?'Read the walking controls.':'Read the reply controls.',action:()=>this.controls(scene,1-page)},{label:'Return to the conversation.',action:()=>scene.closePanel()}],'controls',()=>scene.showPause());
  },
  handheld(run,scene){
    const s=scene.model.customerStage,t=s.target,p=scene.model.player;scene.handheld.show({title:'Read the conversation details.',lines:[OTR.fpCustomerStage.destination(s),`The conversation point is ${Math.ceil(Math.hypot(t.x-p.x,t.z-p.z))} meters away.`],options:[{label:'Read the earlier statements.',onPick:()=>{scene.handheld.close(false);this.history(scene);}},{label:'Read the conversation controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}}],back:()=>scene.handheld.close()});
  },
  unfinished(run,scene,body){run.phase='timed-out';scene.showPanel('The conversation has stopped.',body,[{label:'Return to the station.',action:()=>scene.toHub()}],{accessibleText:true,back:()=>scene.toHub()});}
};
OTR.fpScenario.register('customer-conversation',{
  piece:'street',goal:'Speak with each customer and follow the delivery rules.',seconds:600,
  setup(run,m){
    const s=m.customerTalk=OTR.fpCustomerTalk.create(run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)}),stage=m.customerStage=OTR.fpCustomerStage.create(s);
    m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;m.solids=OTR.fpCustomerStage.solids(stage);m.van.x=1.7;m.van.z=-41;m.van.gear=2;m.cargoOpen=false;
    Object.assign(m.player,{x:11,z:stage.two?-27.9:-42.6,yaw:0,pitch:0});
  },
  interact(run,scene,id){
    if(id!=='customer-conversation'||scene.art.pick()!==id){OTR.fpCustomerScenario.panel(scene,'Face the conversation point.','Move close to the customer, door, counter or phone and look at it before continuing.',[{label:'Return to the street.',action:()=>scene.closePanel()}],'notice',()=>scene.closePanel());return true;}
    const s=scene.model.customerTalk;if(s.phase==='brief')OTR.fpCustomerTalk.begin(s);OTR.fpCustomerScenario.present(scene,s.replyPage||0);return true;
  },
  clockActive(run,scene,active){return active||!!(scene.model?.customerTalk?.phase==='choices'&&scene.panel?.customer&&scene.panel.customerKind!=='controls'&&scene.panel.customerKind!=='notice'&&!scene.loading&&!scene.external&&!scene.transitioning&&!scene.handheld?.isOpen);},
  tick(run,scene,dt,clockActive){
    const m=scene.model;if(!m?.customerTalk)return;const s=m.customerTalk,stage=m.customerStage,panel=scene.panel,animate=!scene.loading&&!scene.external&&!scene.transitioning&&!scene.handheld?.isOpen&&(!panel||panel.customer&&panel.customerKind!=='controls'&&panel.customerKind!=='notice');
    if(animate)OTR.fpCustomerStage.step(stage,dt,!!(OTR.fpAccess&&OTR.fpAccess.reduced()));
    const phase=s.phase;OTR.fpCustomerTalk.step(s,dt,clockActive);if(s.phase!==phase){OTR.fpCustomerScenario.present(scene,s.replyPage||0);return;}
    if(panel?.customerKind==='reply'&&s.phase==='choices'){const second=Math.ceil(s.remaining??0);if(panel.customerSecond!==second){panel.customerSecond=second;panel.customerText?.setText(OTR.fpCustomerScenario.body(s));}}
  },
  controls(run,scene){OTR.fpCustomerScenario.controls(scene);},
  handheld(run,scene){OTR.fpCustomerScenario.handheld(run,scene);},
  status(run){return OTR.fpCustomerStage.destination(run.model.customerStage);},
  timeout(run,scene){OTR.fpCustomerScenario.unfinished(run,scene,'There is no result because the conversation was not completed.');},
  result(run){const result=OTR.fpCustomerTalk.result(run.model.customerTalk);if(!result)throw Error('The customer conversation is incomplete');return result;}
});
