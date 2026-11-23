import * as T from './vendor/three.module.js';
import { cube, cylinder, materials as M, part, river, sphere, surface, waterLevel } from './world.js';

const clamp=T.MathUtils.clamp;

function route(points) {
  return new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)));
}

function makeCart(scene) {
  const body=new T.Group();
  scene.add(body);
  part(body,cube,M.wood,0,.43,0,1.15,.22,1.35);
  part(body,cube,M.copper,0,.73,0,.83,.44,.91);
  part(body,cube,M.cyan,0,.75,.47,.58,.12,.045);
  const wheels=[];
  for(const side of [-1,1])for(const end of [-1,1]){
    const wheel=part(body,cylinder,M.ink,side*.62,.27,end*.43,.25,.13,.25);
    wheel.rotation.z=Math.PI/2;
    wheels.push(wheel);
  }
  part(body,sphere,M.gold,0,1.06,-.15,.14,.14,.14);
  return {body,wheels};
}

function makeBoat(scene) {
  const body=new T.Group();
  scene.add(body);
  for(const side of [-1,1]){
    part(body,cylinder,M.wood,side*.48,.12,0,.22,1.75,.22).rotation.x=Math.PI/2;
    part(body,cube,M.copper,side*.48,.30,0,.12,.10,2.50);
  }
  part(body,cube,M.wood,0,.28,0,1.12,.14,2.12);
  part(body,cube,M.cyan,0,.42,.85,.55,.10,.12);
  part(body,cylinder,M.copper,0,.80,-.45,.08,1.1,.08);
  part(body,sphere,M.gold,0,1.40,-.45,.18,.22,.18);
  return body;
}

export function createTraffic(scene,state) {
  const cart=makeCart(scene);
  const boat=makeBoat(scene);
  const cartRoute=route([[59.5,-98.3],[65,-104],[74,-104.2],[81,-103.5],[86,-99.5]]);
  const boatRoute=route([
    [river(-43)-9,-43],[river(-39)-13,-39],[river(-34)-12,-34],
    [river(-29)+1,-29],[river(-26)+10,-26]
  ]);
  const flow=Array.from({length:18},()=>part(scene,sphere,M.cyan,0,0,0,.055,.035,.12));
  const point=new T.Vector3(),ahead=new T.Vector3();

  function placeOnRoute(object,curve,phase,water=false) {
    curve.getPointAt(phase,point);
    curve.getPointAt((phase+.006)%1,ahead);
    object.position.set(point.x,water?waterLevel+.04*Math.sin(phase*40):surface(point.x,point.z),point.z);
    object.rotation.y=Math.atan2(ahead.x-point.x,ahead.z-point.z);
  }

  function update(dt,t) {
    const tasks=state.journey.tasks;
    cart.body.visible=tasks.market==='done';
    if(cart.body.visible){
      const phase=(t*.037)%1;
      placeOnRoute(cart.body,cartRoute,phase<.5?phase*2:2-phase*2);
      if(phase>=.5)cart.body.rotation.y+=Math.PI;
      cart.wheels.forEach(w=>w.rotation.y+=dt*5.5);
    }
    boat.visible=tasks.ferry==='done';
    if(boat.visible){
      const phase=(t*.021)%1;
      placeOnRoute(boat,boatRoute,phase<.5?phase*2:2-phase*2,true);
      if(phase>=.5)boat.rotation.y+=Math.PI;
      boat.rotation.z=.025*Math.sin(t*1.7);
    }
    flow.forEach((drop,i)=>{
      drop.visible=tasks.pines==='done';
      if(!drop.visible)return;
      const phase=(t*.32+i/flow.length)%1;
      const z=-141+phase*12;
      const x=-82+Math.sin((z+153)*.192)*2;
      drop.position.set(x,surface(x,z)+.16,z);
      drop.scale.setScalar(.55+.45*Math.sin(Math.PI*clamp(phase*3,0,1)));
    });
  }

  return {update};
}
