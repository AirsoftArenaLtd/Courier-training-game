/* Indicator lead time and short report identities belong to the owned mission checkpoint. */
window.OTR=window.OTR||{};
OTR.fpSignal={
  sync(m){
    if(!m.driving)return null;
    const d=m.driving,c=d.signalClock||(d.signalClock=[m.signal,m.elapsed,0]);
    if(c[0]!==m.signal||c[1]>m.elapsed){c[0]=m.signal;c[1]=m.elapsed;}
    return c;
  },
  change(m,value){
    const c=this.sync(m);if(value===m.signal)return;
    m.signal=value;if(c){c[0]=value;c[1]=m.elapsed;}
  },
  ready(m,side){
    const c=this.sync(m);return !!c&&side!==0&&c[0]===side&&m.elapsed-c[1]>=3-1e-8;
  },
  beginTurn(m,side){const t=m.driving.signalTurn||(m.driving.signalTurn=[0,0,false]);t[0]=side;t[1]=m.elapsed;t[2]=this.ready(m,side);},
  endTurn(m,side,start){
    const t=m.driving.signalTurn;
    // Older checkpoints can already be part way through a turn; do not add a retrospective check.
    if(!t||t[0]!==side||t[1]!==start)return;
    t[0]=0;this.report(m,t[2]);
  },
  report(m,ok){
    const c=this.sync(m);if(!c)return;
    const key=m.leg+':'+(++c[2]),id='driver:drive.signal:'+key;
    m.log(id,'driving',ok?'good':'needs',ok?'You signaled for at least three seconds before moving.':'You moved without signaling in the correct direction for three seconds.');
    if(m.kind!=='campaign'||!OTR.workday)return;
    const detail={key,ok,stop:m.phase==='route'?m.activeStop+1:undefined};
    if(!ok)detail.where={x:m.van.x,z:m.van.z,mph:Math.abs(m.van.speed)*2.2369362921};
    OTR.fpMission.emit(m,'drive.signal',detail);
  },
  valid(d,elapsed){
    const c=d.signalClock,t=d.signalTurn;
    if(c!==undefined&&(!Array.isArray(c)||c.length!==3||![-1,0,1].includes(c[0])||!Number.isFinite(c[1])||c[1]<0||c[1]>elapsed||!Number.isSafeInteger(c[2])||c[2]<0||c[2]>=Number.MAX_SAFE_INTEGER))return false;
    return t===undefined||!!c&&Array.isArray(t)&&t.length===3&&[-1,0,1].includes(t[0])&&Number.isFinite(t[1])&&t[1]>=0&&t[1]<=elapsed&&typeof t[2]==='boolean';
  }
};
