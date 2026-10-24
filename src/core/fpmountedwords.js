/* Bounded lettering on physical sign faces. Geometry only; no texture or extra render pass. */
window.OTR=window.OTR||{};
OTR.fpMountedWords={
  build(parent,{high=false,capacity=8192}={}){
    const T=THREE,geometry=new T.PlaneGeometry(),paint=new T.MeshLambertMaterial({color:0x18232B}),mesh=new T.InstancedMesh(geometry,paint,capacity),scratch=new T.Object3D(),entries=[];let count=0,disposed=false,font=false;
    mesh.frustumCulled=false;parent.add(mesh);
    const quad=(x,y,z,w,h)=>{if(count>=capacity)throw Error('Mounted lettering capacity exceeded');scratch.position.set(x,y,z);scratch.scale.set(w,h,1);scratch.updateMatrix();mesh.setMatrixAt(count++,scratch.matrix);entries.push({matrix:scratch.matrix.clone(),sphere:new T.Sphere(new T.Vector3(x,y,z),Math.hypot(w,h)/2)});};
    return {mesh,entries,get font(){return font;},get count(){return count;},
      write(value,x,y,z,width,height){
        const text=String(value).toUpperCase();if(!text.length||text.length>16)throw Error('Mounted sign text is outside its capacity');
        if(high&&typeof document!=='undefined'){
          const canvas=document.createElement('canvas');canvas.width=640;canvas.height=72;const ctx=canvas.getContext('2d');if(ctx){ctx.font='700 56px "Noto Sans", Arial, sans-serif';ctx.fillStyle='#ffffff';ctx.fillText(text,2,58);const data=ctx.getImageData(0,0,640,72).data,runs=[];let left=640,right=0,top=72,bottom=0;
            for(let row=0;row<72;row++){let start=-1;for(let col=0;col<=640;col++){if(col<640&&data[(row*640+col)*4+3]>=96){if(start<0)start=col;}else if(start>=0){runs.push([start,col,row]);left=Math.min(left,start);right=Math.max(right,col);top=Math.min(top,row);bottom=Math.max(bottom,row+1);start=-1;}}}
            if(runs.length){const scale=Math.min(width/(right-left),height/(bottom-top)),x0=x-(right-left)*scale/2,y0=y+(bottom-top)*scale/2;for(const r of runs)quad(x0+((r[0]+r[1])/2-left)*scale,y0-(r[2]-top+.5)*scale,z,(r[1]-r[0])*scale,scale);font=true;canvas.width=canvas.height=1;return;}}
          canvas.width=canvas.height=1;
        }
        const cell=Math.min(width/(text.length*6-1),height/7),x0=x-(text.length*6-1)*cell/2;
        for(let i=0;i<text.length;i++){const rows=OTR.fpSignLettering?.rows[text[i]];if(!rows)continue;for(let row=0;row<7;row++){let start=-1;for(let col=0;col<=5;col++){if(col<5&&rows[row][col]==='1'){if(start<0)start=col;}else if(start>=0){quad(x0+(i*6+(start+col)/2)*cell,y+(3-row)*cell,z,(col-start)*cell,cell);start=-1;}}}}
      },
      finish(){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;},
      dispose(){if(disposed)return;disposed=true;mesh.dispose();geometry.dispose();paint.dispose();mesh.removeFromParent();}
    };
  }
};
