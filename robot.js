import * as T from './vendor/three.module.js';
import { cube, cylinder, sphere, part, materials as M, surface } from './world.js';

const ceramic=new T.MeshStandardMaterial({color:0xc6c0a3,roughness:.63,metalness:.22});
const patina=new T.MeshStandardMaterial({color:0x406365,roughness:.51,metalness:.53});
const brass=new T.MeshStandardMaterial({color:0xbb805b,roughness:.38,metalness:.66});
const dark=new T.MeshStandardMaterial({color:0x182629,roughness:.85});
const joint=new T.TorusGeometry(.23,.072,8,16);
const bevel=new T.CapsuleGeometry(.5,.15,3,10);
const lampBody=new T.CylinderGeometry(.77,1,1,6);

export function makeRobot(scene) {
  const root=new T.Group();
  scene.add(root);
  const pelvis=new T.Group();
  root.add(pelvis);
  const chest=new T.Group();
  pelvis.add(chest);
  part(chest,bevel,ceramic,0,.22,-.03,1.40,1.05,.92);
  part(chest,cube,patina,0,.08,.47,1.02,.61,.20);
  part(chest,cube,brass,0,-.22,.42,.84,.12,.26);
  part(chest,cube,M.cyan,0,.19,.59,.52,.066,.05);
  for(const s of [-1,1]){
    part(chest,cube,brass,s*.39,.02,.58,.08,.35,.08);
    part(chest,cube,dark,s*.34,-.2,-.32,.16,.5,.23);
  }
  const head=new T.Group();
  chest.add(head);
  part(head,cylinder,brass,0,-.34,0,.28,.22,.28);
  part(head,bevel,ceramic,0,0,0,1.02,.74,.73);
  part(head,bevel,dark,0,.02,.30,.83,.46,.19);
  for(const s of [-1,1]){
    part(head,sphere,M.cyan,s*.18,.035,.385,.075,.064,.043);
    part(head,cylinder,brass,s*.47,.0,.015,.145,.19,.145).rotation.z=Math.PI/2;
  }
  part(head,cube,brass,-.31,.41,0,.044,.36,.05).rotation.z=-.24;
  part(head,sphere,M.gold,-.26,.61,0,.075,.073,.062);
  const back=new T.Group();
  chest.add(back);
  part(back,bevel,patina,0,.15,0,1.38,.91,.24);
  part(back,cube,brass,0,.13,-.15,1.15,.09,.12);
  part(back,cube,M.cyan,0,.27,-.169,.72,.035,.035);
  part(back,cube,brass,0,-.37,0,.28,.32,.25);
  part(back,bevel,patina,0,-.50,.035,.67,.23,.33);
  const lampMount = new T.Group();
  root.add(lampMount);
  part(lampMount,cylinder,brass,0,-.18,0,.14,.37,.14);
  part(lampMount,cube,patina,0,-.37,-.14,.29,.09,.41);
  part(lampMount,cube,M.cyan,0,-.30,.04,.09,.06,.05);

  const arms=[], legs=[], wheels=[];
  for(const s of [-1,1]){
    const shoulder=new T.Group();
    chest.add(shoulder);
    part(shoulder,joint,brass,s*.11,0,0).rotation.y=Math.PI/2;
    part(shoulder,bevel,ceramic,0,-.29,.03,.58,.7,.55);
    part(shoulder,cylinder,brass,0,-.59,.02,.16,.25,.16);
    part(shoulder,bevel,patina,0,-.73,.025,.35,.32,.34);
    arms.push(shoulder);
    const leg=new T.Group();
    pelvis.add(leg);
    part(leg,joint,brass,s*.20,.02,.01).rotation.y=Math.PI/2;
    part(leg,bevel,patina,0,-.37,.018,.77,1.19,.64);
    part(leg,cube,ceramic,-s*.14,-.36,.24,.31,.54,.18);
    part(leg,cube,brass,0,-.91,.13,.56,.24,.89);
    part(leg,cube,dark,s*.31,-.46,0,.25,1.25,.56);
    part(leg,cube,M.cyan,s*.46,-.45,.01,.035,.91,.075);
    for(let i=0;i<4;i++){
      const wheel=part(leg,cylinder,brass,s*.463,-.90+i*.30,.015,.14,.13,.14);
      wheel.rotation.z=Math.PI/2;
      wheels.push(wheel);
    }
    legs.push(leg);
  }
  const wings=[];
  for(const side of [-1,1]){
    const wing=new T.Group();chest.add(wing);
    part(wing,cube,patina,side*1.35,.04,-.15,2.35,.10,1.05).rotation.y=side*.24;
    part(wing,cube,brass,side*1.40,.11,-.08,2.30,.055,.14).rotation.y=side*.24;
    part(wing,cube,M.cyan,side*1.48,.12,-.30,2.12,.035,.07).rotation.y=side*.24;
    for(let feather=0;feather<4;feather++)part(wing,cube,feather%2?brass:patina,side*(.75+feather*.48),-.01,-.73-feather*.10,.40,.065,.72).rotation.y=side*.24;
    wings.push(wing);
  }
  const lamp=new T.Group();
  scene.add(lamp);
  part(lamp,lampBody,brass,0,-.26,0,.24,.08,.24);
  part(lamp,lampBody,M.gold,0,-.02,0,.19,.45,.19);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    part(lamp,cube,brass,Math.cos(a)*.20,-.02,Math.sin(a)*.20,.034,.51,.034);
  }
  part(lamp,lampBody,patina,0,.25,0,.26,.12,.26);
  part(lamp,joint,brass,0,.36,0,.58,.59,.58);
  const light=new T.PointLight(0xffbc64,16,10,2);
  light.position.y=.02;
  lamp.add(light);
  const echo=new T.Group();
  scene.add(echo);
  part(echo,cylinder,patina,0,0,0,.21,.49,.21);
  part(echo,cylinder,brass,0,.235,0,.24,.07,.24);
  part(echo,cylinder,brass,0,-.235,0,.24,.07,.24);
  part(echo,joint,M.cyan,0,.047,0,.72,.72,.72).rotation.x=Math.PI/2;
  part(echo,sphere,M.cyan,0,.28,0,.097,.10,.097);

  const wake=new T.Group();
  scene.add(wake);
  const rippleGeo=new T.RingGeometry(.87,1,32,1,Math.PI*.22,Math.PI*.56);
  const wakeRings=[];
  for(let i=0;i<6;i++){
    const tint=new T.MeshBasicMaterial({color:i%2?0xa4c4af:0x8ae5db,transparent:true,depthWrite:false,side:T.DoubleSide});
    const stripe=part(wake,rippleGeo,tint,0,0,0);
    stripe.rotation.x=-Math.PI/2;
    wakeRings.push(stripe);
  }
  return {root,pelvis,chest,head,back,arms,legs,wheels,wings,lamp,lampMount,light,echo,wake,wakeRings};
}

const pose={
  walker:[1.13,0,.87,-.51,0, .43,0,0, .78,.41,.01,.06],
  rover:[.83,.06,.63,-.57,1.13, .68,.11,1.49, .63,.31,.16,.12],
  boat:[.43,-.15,.57,-.41,1.57, .93,-.055,1.57, .48,.31,.52,.06],
  sky:[.72,-.08,.65,-.46,1.36, .82,.02,1.50, 1.03,.38,.16,.08]
};
const position=new T.Vector3();
const lampTarget=new T.Vector3();
const echoTarget=new T.Vector3();
const interp=new T.Vector3();
const q=new T.Quaternion();
const clamp=T.MathUtils.clamp;

export function drawRobot(robot, state, dt, t, waterY, dock, ridge, groundAt=surface) {
  const { root,pelvis,chest,head,back,arms,legs,wheels,wings,lamp,lampMount,light,echo,wake,wakeRings }=robot;
  const [from,to,mix]=state.fold;
  const a=pose[from],b=pose[to];
  const v=a.map((n,i)=>T.MathUtils.lerp(n,b[i],mix));
  const [hip,tilt,neck,deck,backPitch,stepWidth,stepUp,roll,armWidth,armHeight,armPitch,armRoll]=v;
  const walk=(from==='walker'?1-mix:0)+(to==='walker'?mix:0);
  const boat=(from==='boat'?1-mix:0)+(to==='boat'?mix:0);
  const sky=(from==='sky'?1-mix:0)+(to==='sky'?mix:0);
  wings.forEach((wing,i)=>{
    const side=i===0?-1:1;
    wing.visible=sky>.02;
    wing.scale.x=Math.max(.02,sky);
    wing.rotation.z=side*(.12+Math.sin(t*2.4)*.09)*sky;
  });
  const transition=state.foldFrom&&mix<1?T.MathUtils.smoothstep(mix,0,1):1;
  root.position.set(
    state.foldFrom?T.MathUtils.lerp(state.foldFrom.x,state.x,transition):state.x,
    state.foldFrom?T.MathUtils.lerp(state.foldFrom.y,state.y,transition):state.y,
    state.foldFrom?T.MathUtils.lerp(state.foldFrom.z,state.z,transition):state.z
  );
  state.renderX=root.position.x;state.renderY=root.position.y;state.renderZ=root.position.z;
  if(mix>=1)delete state.foldFrom;
  root.rotation.y=state.heading;
  root.rotation.z=boat*Math.sin(t*1.8)*.022;
  const stride=state.stride;
  pelvis.position.y=hip+Math.sin(stride*2)*.035*state.motion*walk+boat*Math.sin(t*2.3)*.035-(state.rest==='fish'||state.rest==='pines'?.30:0);
  chest.rotation.x=tilt;
  head.position.set(0,neck,.04);
  head.rotation.y=Math.sin(t*.92)*.08*(1-state.motion);
  back.position.set(0,.19-.45*boat,deck+1.13*boat);
  back.rotation.x=backPitch;
  legs.forEach((leg,i)=>{
    const side=i*2-1, phase=stride+i*Math.PI;
    const localX=side*stepWidth,localZ=.13+Math.sin(phase)*walk*state.motion*.34;
    const footX=root.position.x+Math.cos(state.heading)*localX+Math.sin(state.heading)*localZ;
    const footZ=root.position.z-Math.sin(state.heading)*localX+Math.cos(state.heading)*localZ;
    const footLift=walk?clamp(groundAt(footX,footZ)-root.position.y,-.22,.22)*walk:0;
    leg.position.set(localX,stepUp+footLift,0);
    leg.rotation.x=roll+Math.sin(phase)*walk*state.motion*.46;
    leg.rotation.z=side*(.03+boat*.08);
    arms[i].position.set(side*armWidth,armHeight,.01);
    arms[i].rotation.z=side*armRoll;
    arms[i].rotation.x=-armPitch-Math.sin(phase)*walk*state.motion*.29;
  });
  wheels.forEach(w=>{w.rotation.y=stride*.65;});
  lampMount.position.set(.51*(1-boat),1.64-boat*1.03,.03+boat*1.18);
  lampMount.rotation.z=(1-boat)*Math.PI*.41;
  root.updateMatrixWorld(true);
  if(state.lamp==='dock')lampTarget.set(dock.x,dock.y+1.54,dock.z);
  else{
    if(state.lamp==='hand') position.set(.83,.81,1.02-boat*.23);
    else position.set(.51*(1-boat),1.89-boat*1.01,.03+boat*1.18);
    lampTarget.copy(root.localToWorld(position));
  }
  if(state.echo==='ridge')echoTarget.set(ridge.x,ridge.y+1.72,ridge.z);
  else{
    if(state.echo==='hand') position.set(-.83,.84,.83);
    else position.set(-.42,1.22-boat*.34,-.65);
    echoTarget.copy(root.localToWorld(position));
  }
  const damping=1-Math.exp(-dt*11);
  lamp.position.lerp(lampTarget,damping);
  echo.position.lerp(echoTarget,damping);
  q.setFromAxisAngle(interp.set(0,1,0),state.heading);
  lamp.quaternion.slerp(q,damping);
  echo.quaternion.slerp(q,damping);
  light.intensity=state.lampOn?20:0;
  lamp.children[1].material=state.lampOn?M.gold:patina;
  wake.visible=boat>.75&&state.motion>.07;
  wake.position.set(state.x,waterY+.026,state.z);
  wake.rotation.y=state.heading+Math.PI;
  wakeRings.forEach((ring,i)=>{
    const k=(t*.8+i/wakeRings.length)%1;
    const scale=.67+k*2.6;
    ring.position.z=.75+k*4.7;
    ring.scale.set(scale*1.3,scale*.72,1);
    ring.material.opacity=clamp((1-k)*state.motion*.39,0,1);
  });
}
