/* Project-made label symbols and a six-sided turntable. No image maps or reflection passes. */
window.OTR=window.OTR||{};
OTR.fpPackageLabelWorld={
  center:{x:-10,y:1.65,z:14.9},
  stations:['belt','upright','fragile','dry','hazmat','isolate'],
  stationPoint(id){const i=this.stations.indexOf(id);return i<0?null:{x:-15+i*2,y:1.05,z:12.4};},
  solids(){return [{x:-10,z:this.center.z,w:1.8,d:1.1},...this.stations.map(id=>({...this.stationPoint(id),w:1.5,d:1.1}))];},
  build(parent,{interactions=[],occluders=[],cube=null}={}){
    const ownsCube=!cube;if(!cube)cube=new THREE.BoxGeometry(1,1,1);
    const T=THREE,A=this,root=new T.Group(),parcel=new T.Group(),paint=new T.MeshLambertMaterial({vertexColors:true}),proxyPaint=new T.MeshBasicMaterial();
    root.name='label-inspection-station';parent.add(root);parcel.position.copy(A.center);root.add(parcel);
    const positions=[],colours=[],v=new T.Vector3(),colour=new T.Color(),scratch=new T.Object3D(),normal=new T.Vector3(),point=new T.Vector3(),eye=new T.Vector3(),projected=new T.Vector3(),direction=new T.Vector3(),ray=new T.Raycaster(),hits=[];
    ray.layers.enable(1);let currentFace='front',item=null,disposed=false,parcelMesh=null;
    const rotations={front:[0,0,0],right:[0,-Math.PI/2,0],back:[0,Math.PI,0],left:[0,Math.PI/2,0],top:[Math.PI/2,0,0],base:[-Math.PI/2,0,0]};
    // Local face axes are right-handed. Printing remains glued to the cardboard when it turns.
    const frames={front:[0,0,.401,0,0,0],right:[.401,0,0,0,Math.PI/2,0],back:[0,0,-.401,0,Math.PI,0],left:[-.401,0,0,0,-Math.PI/2,0],top:[0,.401,0,-Math.PI/2,0,0],base:[0,-.401,0,Math.PI/2,0,0]};
    const matrices={};for(const face of Object.keys(frames)){const f=frames[face];scratch.position.set(f[0],f[1],f[2]);scratch.rotation.set(f[3],f[4],f[5]);scratch.scale.set(1,1,1);scratch.updateMatrix();matrices[face]=scratch.matrix.clone();}
    const triangle=(a,b,c,hex,matrix)=>{colour.setHex(hex);for(const p of [a,b,c]){v.set(p[0],p[1],p[2]||0);if(matrix)v.applyMatrix4(matrix);positions.push(v.x,v.y,v.z);colours.push(colour.r,colour.g,colour.b);}};
    const quad=(x,y,w,h,c,m,z=0)=>{triangle([x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],c,m);triangle([x-w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z],c,m);};
    const polygon=(points,c,m,z=.002)=>{const g=new T.ShapeGeometry(new T.Shape(points.map(p=>new T.Vector2(p[0],p[1]))));const a=g.getAttribute('position'),index=g.index;for(let i=0;i<index.count;i+=3){const p=[];for(let j=0;j<3;j++){const n=index.getX(i+j);p.push([a.getX(n),a.getY(n),z]);}triangle(...p,c,m);}g.dispose();};
    const line=(x,y,x2,y2,w,c,m,z=.003)=>{const dx=x2-x,dy=y2-y,len=Math.hypot(dx,dy),nx=-dy/len*w/2,ny=dx/len*w/2;triangle([x+nx,y+ny,z],[x-nx,y-ny,z],[x2-nx,y2-ny,z],c,m);triangle([x+nx,y+ny,z],[x2-nx,y2-ny,z],[x2+nx,y2+ny,z],c,m);};
    const text=(word,x,y,size,c,m,z=.004)=>{for(let i=0;i<word.length;i++){const rows=OTR.fpSignLettering.rows[word[i]];if(!rows)continue;for(let r=0;r<7;r++)for(let k=0;k<5;){if(rows[r][k]!=='1'){k++;continue;}const first=k;while(k<5&&rows[r][k]==='1')k++;quad(x+(i*6+(first+k-1)/2)*size,y-r*size,(k-first)*size,size,c,m,z);}}};
    const box=(x,y,z,w,h,d,c)=>{scratch.position.set(x,y,z);scratch.rotation.set(0,0,0);scratch.scale.set(w,h,d);scratch.updateMatrix();const g=cube.index,a=cube.getAttribute('position');for(let i=0;i<g.count;i+=3){const p=[];for(let j=0;j<3;j++){const n=g.getX(i+j);p.push([a.getX(n),a.getY(n),a.getZ(n)]);}triangle(...p,c,scratch.matrix);}};
    const geometry=()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colours,3));g.computeVertexNormals();g.computeBoundingSphere();positions.length=0;colours.length=0;return g;};
    const proxy=(id,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,proxyPaint);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.layers.set(1);mesh.userData.interaction=id;root.add(mesh);interactions.push(mesh);occluders.push(mesh);return mesh;};
    const cz=A.center.z;
    box(-10,1.12,cz,1.8,.12,1.1,0x77858A);for(const x of [-10.7,-9.3])for(const z of [cz-.4,cz+.4])box(x,.55,z,.09,1.1,.09,0x49565C);
    box(-10,1.22,cz,.9,.08,.9,0x3C454B);proxy('label-package',-10,1.65,cz,.8,.8,.8);
    const tableProxy=proxy(null,-10,.61,cz,1.8,1.22,1.1);tableProxy.userData.interaction=null;interactions.splice(interactions.indexOf(tableProxy),1);
    for(let i=0;i<A.stations.length;i++){
      const id=A.stations[i],p=A.stationPoint(id),c=[0x347DA8,0x357F73,0xB7853F,0x526E96,0xAA3948,0x742E38][i];
      box(p.x,.55,p.z,1.5,1.1,1.1,0x59666B);box(p.x,1.12,p.z,1.52,.08,1.12,c);
      box(p.x,.82,p.z+.56,.48,.48,.025,0xE9E5D8);
      scratch.position.set(p.x,.82,p.z+.578);scratch.rotation.set(0,0,0);scratch.scale.set(1,1,1);scratch.updateMatrix();text(String(i+1),-.115,.16,.05,0x18252C,scratch.matrix);
      if(id==='fragile'||id==='dry')for(const x of [-.67,.67])box(p.x+x,1.46,p.z,.055,.65,.95,c);
      if(id==='dry')box(p.x,1.82,p.z,1.5,.065,1.1,c);
      if(id==='hazmat')for(const x of [-.65,0,.65])box(p.x+x,1.45,p.z-.48,.035,.6,.035,c);
      if(id==='upright')for(const x of [-.65,.65])box(p.x+x,1.5,p.z-.48,.055,.8,.055,c);
      proxy('label-station-'+id,p.x,.83,p.z+.58,1.5,.8,.08);
      const solid=proxy(null,p.x,.55,p.z,1.5,1.1,1.1);interactions.splice(interactions.indexOf(solid),1);
    }
    const stationMesh=new T.Mesh(geometry(),paint);stationMesh.name='label-station-palette';root.add(stationMesh);
    const mark=(type,m,x,y,s)=>{
      const black=0x152025,white=0xF4F0E4,red=0xBE3039;
      const q=(dx,dy,w,h,c,z=.003)=>quad(x+dx*s,y+dy*s,w*s,h*s,c,m,z),l=(a,b,c,d,w,col=black)=>line(x+a*s,y+b*s,x+c*s,y+d*s,w*s,col,m,.005);
      const poly=(p,c,z=.004)=>polygon(p.map(p=>[x+p[0]*s,y+p[1]*s]),c,m,z);
      const flame=(dx=0,dy=.25,k=.65)=>poly([[-.32,.0],[-.4,.24],[-.08,.65],[-.04,.3],[.2,.55],[.35,.12],[.15,-.04]].map(p=>[p[0]*k+dx,p[1]*k+dy]),black);
      if(type.startsWith('class')){
        const fill={class2:0x349461,class3:0xD74042,class5:0xE4C94D}[type]||white;
        poly([[0,1],[1,0],[0,-1],[-1,0]],black,.001);poly([[0,.93],[.93,0],[0,-.93],[-.93,0]],fill,.002);
        if(type==='class3'||type==='class5')flame();
        if(type==='class5'){const points=[];for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;l(Math.cos(a)*.18,.08+Math.sin(a)*.18,Math.cos(b)*.18,.08+Math.sin(b)*.18,.05);}}
        if(type==='class2'){q(0,.23,.19,.55,white);q(0,.53,.1,.08,white);}
        if(type==='class8'){poly([[-.91,0],[.91,0],[0,-.91]],black);l(-.48,.5,-.15,.32,.1);l(.04,.5,.37,.32,.1);q(-.1,.15,.05,.1,black);q(.4,.15,.05,.1,black);q(0,.01,1.05,.045,white);}
        if(type.startsWith('class9')){for(let j=-3;j<=3;j++){const xx=j*.18,top=.88-Math.abs(xx);q(xx,top/2,.075,top,black);}if(type==='class9_li'){q(-.25,-.17,.32,.18,black);q(.25,-.17,.32,.18,black);}}
        const n=type==='class5'?'5.1':type.slice(5,6);text(n,x-(n.length*6-1)*s*.034/2,y-.5*s,s*.034,type==='class8'||type==='class2'?white:black,m,.006);
      }else{
        q(0,0,1.8,1.8,white,.001);
        if(type==='thisWayUp'){for(const dx of [-.42,.42]){l(dx,-.45,dx,.48,.12);poly([[dx-.25,.3],[dx,.7],[dx+.25,.3]],black);}l(-.73,-.65,.73,-.65,.1);}
        if(type==='fragile'){poly([[-.5,.6],[.5,.6],[.3,.02],[-.3,.02]],red);l(0,0,0,-.45,.12,red);l(-.4,-.5,.4,-.5,.1,red);l(-.12,.59,.1,.33,.06,white);l(.1,.33,-.09,.08,.06,white);}
        if(type==='keepDry'){poly([[-.74,.08],[-.55,.48],[0,.72],[.55,.48],[.74,.08]],black);l(0,.1,0,-.53,.08);l(0,-.53,.22,-.64,.08);l(.22,-.64,.36,-.47,.08);for(const dx of [-.6,0,.6])l(dx-.1,.89,dx,.74,.055);}
        if(type==='lithium'){for(const dy of [-.8,.8])q(0,dy,1.8,.12,red);for(const dx of [-.8,.8])q(dx,0,.12,1.6,red);q(-.12,0,.98,.5,black);q(.44,0,.12,.2,black);poly([[0,.34],[-.25,-.02],[-.07,-.02],[-.18,-.4],[.23,.08],[.02,.08]],0xE4C94D);}
      }
    };
    const api={root,parcel,stationMesh,targets:interactions.filter(o=>o.parent===root&&o.userData.interaction),currentFace:()=>currentFace,
      setItem(next){
        if(disposed)throw Error('The inspection station was disposed');if(item===next)return false;item=next;
        if(parcelMesh){parcelMesh.geometry.dispose();parcelMesh.removeFromParent();parcelMesh=null;}
        if(!item){parcel.visible=false;return true;}parcel.visible=true;parcel.position.copy(A.center);
        box(0,0,0,.8,.8,.8,0xB98D59);
        for(const face of Object.keys(frames)){
          const m=matrices[face];quad(0,0,.105,.8,0xCFB78A,m,.0005);
          if(face==='front'){quad(-.17,.15,.33,.3,0xF4F0E4,m,.002);for(let i=0;i<11;i++)quad(-.3+i*.025,.17,.01+(i%3)*.004,.13,0x243137,m,.004);for(let i=0;i<3;i++)quad(-.18,-.0-i*.025,.25-i*.04,.008,0x556163,m,.004);}
          const marks=item.marks?.[face]||[];if(marks.length>2)throw Error('Too many marks on a package face');
          marks.forEach((id,i)=>mark(id,m,face==='front'?.18:marks.length===1?0:-.19+i*.38,face==='front'?-.05:0,face==='front'?.15:marks.length===1?.24:.17));
          if(item.damage?.face===face){const leak=item.damage.kind==='leak',c=leak?0x4E5946:0x574435;polygon(leak?[[-.3,-.37],[-.28,-.12],[-.12,-.24],[.1,-.16],[.31,-.34]]:[[-.37,.36],[-.17,.23],[-.3,.04],[-.11,-.08],[-.36,-.28]],c,m,.008);}
        }
        parcelMesh=new T.Mesh(geometry(),paint);parcelMesh.name='label-six-sided-package';parcel.add(parcelMesh);this.turn('front');return true;
      },
      turn(face){if(!Object.hasOwn(rotations,face)||!item)return false;const r=rotations[face];parcel.rotation.set(r[0],r[1],r[2]);currentFace=face;root.updateMatrixWorld(true);return true;},
      visible(face,camera,blockers=occluders){
        if(disposed||!item||!parcel.visible||!Object.hasOwn(frames,face))return false;
        for(let p=root;p;p=p.parent)if(!p.visible)return false;
        parcel.updateWorldMatrix(true,false);camera.updateMatrixWorld(true);camera.getWorldPosition(eye);
        point.set(0,0,0).applyMatrix4(matrices[face]).applyMatrix4(parcel.matrixWorld);
        normal.set(0,0,1).transformDirection(matrices[face]).transformDirection(parcel.matrixWorld);direction.copy(eye).sub(point);
        if(direction.length()>2.65||normal.dot(direction.normalize())<.75)return false;
        // The whole face must fit on screen; each corner and its centre must have a clear sightline.
        for(let i=0;i<5;i++){
          point.set(i?((i-1)%2?.36:-.36):0,i?(i>2?.36:-.36):0,.012).applyMatrix4(matrices[face]).applyMatrix4(parcel.matrixWorld);
          projected.copy(point).project(camera);if(projected.z< -1||projected.z>1||Math.abs(projected.x)>.92||Math.abs(projected.y)>.92)return false;
          direction.copy(point).sub(eye);ray.far=direction.length()-.018;direction.normalize();ray.set(eye,direction);
          for(const object of blockers){let live=true;for(let p=object;p;p=p.parent)if(!p.visible){live=false;break;}if(!live||object.userData.interaction==='label-package')continue;
            hits.length=0;if(ray.intersectObject(object,false,hits).length)return false;}
        }
        return true;
      },
      dispose(){if(disposed)return;disposed=true;stationMesh.geometry.dispose();if(parcelMesh)parcelMesh.geometry.dispose();paint.dispose();proxyPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
    return api;
  }
};
