/* Protocol fixtures share the doorstep's bounded instance batches; no textures or render passes. */
window.OTR=window.OTR||{};
OTR.fpCustomerProtocolWorld={
  build(m,{fixed,part,writing,proxy}){
    const p=m.customerStop.protocol,kind=p.spec.kind,targets=[];
    if(kind==='intercom'){
      fixed(9.12,1.42,-44.74,.46,.65,.1,0x67757B);fixed(9.12,1.57,-44.678,.35,.2,.03,0x1E2C33);
      for(let i=0;i<4;i++)fixed(9.12,1.51+i*.04,-44.658,.28,.012,.01,0x8F9B9E);
      for(const [button,y] of [['12',1.31],['13',1.16]]){fixed(9.12,y,-44.675,.33,.12,.035,0xE0DED0);writing(button,9.05,y,-44.65,.16,.09);fixed(9.23,y,-44.646,.055,.055,.022,0xB5BDAC);targets.push(proxy('protocol-intercom-'+button,9.12,y,-44.625,.33,.12,.045));}
    }else if(kind==='reception'){
      fixed(12.05,.51,-43.65,2.05,1.02,.65,0x6B6457);fixed(12.05,1.06,-43.65,2.2,.1,.78,0xB7B4A5);fixed(12.68,1.24,-43.65,.32,.28,.18,0x303B43);fixed(11.65,1.13,-43.53,.42,.025,.23,0xDDD9CB);
      targets.push(proxy('protocol-reception',12.05,1.13,-43.2,1.9,.3,.1));
    }else{
      fixed(8.8,.98,-43.9,1.8,1.96,.6,0x465B66);fixed(8.8,.09,-43.9,1.94,.18,.7,0x26353D);
      for(const [id,x] of [['B11',8.35],['B12',9.25]]){fixed(x,1.6,-43.578,.68,.2,.028,0xDADDD3);writing(id,x,1.6,-43.56,.53,.14);targets.push(proxy('protocol-locker-'+id,x,1.03,-43.51,.77,.85,.04));}
    }
    return {
      targets,
      sync(){
        const seq=p.sequence;
        if(kind==='intercom')part(9.23,1.41,-44.65,.04,.025,.015,seq.opened?0x68B06B:seq.calledAt!==null?0xDBBB6B:0x283E46);
        if(kind==='locker'){
          const angle=seq.open?Math.PI*.45:0,cs=Math.cos(angle),sn=Math.sin(angle);
          part(8.35,1.02,-43.568,.78,.91,.035,0x9AA7A8);part(8.85+.4*cs,1.02,-43.568+.4*sn,.8,.91,.035,0xA9B4AF,-angle);
          part(8.85+.69*cs,1.02,-43.54+.69*sn,.045,.12,.045,0x26353D,-angle);
          if(seq.deposited&&seq.open){part(9.25,.83,-43.72,.42,.32,.34,0xBB925D);part(9.25,.84,-43.542,.25,.18,.012,0xE9E5D7);}
          targets[1].position.set(8.85+.4*cs,1.03,-43.52+.4*sn);targets[1].rotation.y=-angle;
        }
      },
      photo(camera){
        if(kind!=='locker'||p.sequence.open||!p.sequence.deposited)return false;
        camera.updateMatrixWorld(true);const point=new THREE.Vector3();
        for(const x of [8.85,9.65])for(const y of [.565,1.475]){point.set(x,y,-43.54).project(camera);if(point.z< -1||point.z>1||Math.abs(point.x)>.72||Math.abs(point.y)>.72)return false;}
        return true;
      }
    };
  }
};
