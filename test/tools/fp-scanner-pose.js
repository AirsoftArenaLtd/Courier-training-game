/* Frozen M5 resource poses; these are deliberately separate from native gameplay evidence. */
module.exports=view=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),run=scene.scenarioSession,m=scene.model,K=OTR.fpCustomerStop,A=OTR.fpScannerStopScenario,S=OTR.fpScannerStop,d=m.customerStop;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(run);scene.closePanel();
 scene.scannerBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 d.index=['scannersignature','scannerclosed','scanneridunder'].includes(view)?1:['scannerreception','scannerrefusal','scanneridexpired'].includes(view)?2:0;K.prepare(d);A.configure(run,m);K.begin(d);scene.rebuildWorld();
 if(!['scannercab','scannerreverse'].includes(view)){m.mode='walk';K.exit(d,true);Object.assign(m.player,{x:12,z:-42.9,yaw:0,pitch:.1});}if(view==='scannerreverse')m.van.gear=-1;
 if(view==='scannercargo'){m.cargoOpen=true;Object.assign(m.player,{x:1.7,z:-38.2,yaw:0,pitch:.15});}
 if(['scannerplanter','scannerphoto','scannersignature','scannerreception'].includes(view)||view.startsWith('scannerid')){K.take(d,'p1');K.scan(d,'p1',true);}
 if(['scannersignature','scannerreception','scannerrefusal'].includes(view)||view.startsWith('scannerid')){d.state.answered=true;m.customerStage.actors[0].visible=true;OTR.fpCustomerStage.target(m.customerStage);}
 if(['scannerplanter','scannerphoto'].includes(view)){S.place(d,'planter');Object.assign(m.player,{x:14.8,z:-44.6,yaw:Math.atan2(-2,-(-.1)),pitch:.8});scene.sync();if(view==='scannerphoto'){S.capture(d,scene.art.customerStop.photo(scene.view.camera));A.photoReview(scene);}}
 if(view==='scannersignature'){S.request(d,'recipient');A.signature(scene);scene.handheld.signatureToken=null;}
 if(view.startsWith('scannerid')){S.request(d,'recipient');A.identity(scene,0,view==='scanneridexpired'?2:view==='scanneridunder'?1:0);}
 if(view==='scannerhandheld')A.handheld(run,scene);if(view==='scannercontrols')A.controls(scene,2);
 m.customerStage.time=100;if(scene.panel)scene.panel.customer=false;m.paused=true;scene.sync();scene.refresh();
};
