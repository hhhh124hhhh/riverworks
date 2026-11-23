import * as T from './vendor/three.module.js';
import {cube,materials as M,part,sphere,surface} from './world.js';

const $=id=>document.getElementById(id);
const beasts=[
  {name:'当康',x:-57,z:15,hp:3,color:0xa96546,speed:3.5},
  {name:'穷奇',x:-83,z:-119,hp:5,color:0x714b45,speed:4.1},
  {name:'天狗',x:42,z:-157,hp:4,color:0x354c4b,speed:4.5}
];

export function createCombat(scene,state,{toast,onDefeat,save}){
  const group=new T.Group();scene.add(group);
  const pulseMaterial=new T.MeshBasicMaterial({color:0x8ff5e3,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});
  const pulse=part(group,new T.RingGeometry(.75,1,48),pulseMaterial,0,0,0);pulse.rotation.x=-Math.PI/2;
  let cooldown=0,pulseAt=-9,invulnerable=0,health=5,active=null,time=0;
  const enemies=beasts.map((data,index)=>{
    const root=new T.Group();group.add(root);root.position.set(data.x,surface(data.x,data.z),data.z);
    const material=new T.MeshStandardMaterial({color:data.color,roughness:.72,emissive:0x000000});
    part(root,sphere,material,0,1,0,1.15,.85,1.55);
    part(root,sphere,material,0,1.55,1.15,.8,.72,.8);
    for(const side of [-1,1]){
      part(root,new T.ConeGeometry(.19,.9,5),M.gold,side*.48,2.35,1.2).rotation.z=side*-.38;
      part(root,sphere,M.gold,side*.43,1.72,1.77,.12,.12,.10);
      part(root,cube,M.ink,side*.62,.38,.65,.34,.75,.38);
    }
    const warningMaterial=new T.MeshBasicMaterial({color:0xff694f,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});
    const warning=part(group,new T.RingGeometry(1.8,2.05,40),warningMaterial,data.x,surface(data.x,data.z)+.08,data.z);warning.rotation.x=-Math.PI/2;
    return {...data,index,root,material,warning,hp:data.hp,attackAt:0,windup:-1,respawnAt:0,hitAt:-9};
  });

  function attack(){
    if(!state.started||cooldown>0||document.querySelector('dialog[open]'))return;
    cooldown=.48;pulseAt=time;
    pulse.position.set(state.x,state.y+.15,state.z);
    let hits=0;
    for(const enemy of enemies){
      if(enemy.hp<=0)continue;
      const distance=Math.hypot(state.x-enemy.root.position.x,state.y-enemy.root.position.y,state.z-enemy.root.position.z);
      if(distance>7)continue;
      enemy.hp--;enemy.hitAt=pulseAt;hits++;
      const angle=Math.atan2(enemy.root.position.x-state.x,enemy.root.position.z-state.z);
      enemy.root.position.x+=Math.sin(angle)*1.8;enemy.root.position.z+=Math.cos(angle)*1.8;
      if(enemy.hp===0){
        enemy.root.visible=false;enemy.warning.visible=false;enemy.respawnAt=pulseAt+25;
        state.combat.essence+=enemy.index+1;save();
        toast(enemy.name+'已退去 · 拾得灵息 '+(enemy.index+1));
      }else toast(enemy.name+' · 机芯冲击命中');
    }
    if(!hits)toast('机芯冲击落空了，再靠近一些。');
  }

  function update(dt,t,running){
    time=t;
    cooldown=Math.max(0,cooldown-dt);invulnerable=Math.max(0,invulnerable-dt);
    const pulseAge=t-pulseAt;pulse.visible=pulseAge>=0&&pulseAge<.38;
    if(pulse.visible){pulse.scale.setScalar(1+pulseAge*15);pulse.material.opacity=.7*(1-pulseAge/.38);}
    active=null;
    let nearest=28;
    for(const enemy of enemies){
      if(enemy.hp<=0){
        if(t>=enemy.respawnAt){enemy.hp=enemy.hpMax??enemy.hp;enemy.hp=beasts[enemy.index].hp;enemy.root.position.set(enemy.x,surface(enemy.x,enemy.z),enemy.z);enemy.root.visible=true;}
        else continue;
      }
      const dx=state.x-enemy.root.position.x,dz=state.z-enemy.root.position.z;
      const distance=Math.hypot(dx,dz);
      if(distance<nearest&&running){nearest=distance;active=enemy;}
      enemy.material.emissive.setHex(t-enemy.hitAt<.13?0xffb073:0x000000);
      enemy.root.rotation.y=Math.atan2(dx,dz);
      enemy.warning.position.set(enemy.root.position.x,enemy.root.position.y+.08,enemy.root.position.z);
      if(running&&distance<20&&distance>2.6){
        const step=Math.min(distance-2.5,enemy.speed*dt);
        enemy.root.position.x+=dx/distance*step;enemy.root.position.z+=dz/distance*step;
        enemy.root.position.y=surface(enemy.root.position.x,enemy.root.position.z);
      }
      if(running&&distance<4.3&&t-enemy.attackAt>3.2){enemy.attackAt=t;enemy.windup=t+.68;}
      const winding=enemy.windup>t;
      enemy.warning.visible=winding;
      if(winding){enemy.warning.material.opacity=.35+.35*Math.sin(t*22);enemy.warning.scale.setScalar(1+(enemy.windup-t)*1.4);}
      if(enemy.windup>0&&t>=enemy.windup){
        enemy.windup=-1;enemy.warning.visible=false;
        if(distance<4.8&&invulnerable<=0){
          health--;invulnerable=1.15;
          toast(enemy.name+'撞击了你 · 机芯完整度 '+health+' / 5');
          if(health<=0){health=5;onDefeat(enemy.name);}
        }
      }
    }
    $('combat').hidden=!active||!state.started;
    if(active){
      $('combat-name').textContent=active.name+' · '+active.hp+' / '+beasts[active.index].hp;
      $('combat-health').textContent='机芯完整度 '+health+' / 5 · 灵息 '+state.combat.essence;
      $('combat-meter').style.width=(active.hp/beasts[active.index].hp*100)+'%';
    }
  }
  return {attack,update};
}
