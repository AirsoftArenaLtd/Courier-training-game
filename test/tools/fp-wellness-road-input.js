/* Test-only feedback driver. Observes the real van and returns physical movement keys; never moves it. */
module.exports=({van:v,park,kind})=>{
 const direction=kind==='ice'?-1:1,remaining=(park.z-v.z)*direction,heading=Math.max(-.16,Math.min(.16,Math.atan((park.x-v.x)*.55))),want=direction===-1?heading:Math.PI-heading,diff=Math.atan2(Math.sin(want-v.yaw),Math.cos(want-v.yaw)),predicted=diff-v.speed*Math.tan(v.steer)/3.3*.4,stop=remaining<.5,target=Math.abs(diff)>.4?.7:1.7;
 if(stop&&Math.abs(v.speed)<.08)return {done:true,keys:[]};
 const keys=[];if(!stop&&v.speed<target)keys.push('KeyW');if(stop||v.speed>target+.15)keys.push('KeyS');if(predicted<-.035)keys.push('KeyA');if(predicted>.035)keys.push('KeyD');return {done:false,keys};
};
