import * as T from './vendor/three.module.js';
import {cube,cylinder,materials as M,part,paths,river,sphere,surface,terrain,waterLevel,width} from './world.js';

export function createScenery(scene,state){
  const g=new T.Group();scene.add(g);const moving=[];
  const jade=new T.MeshStandardMaterial({color:0x719889,roughness:.84});
  const pale=new T.MeshStandardMaterial({color:0xded4ad,roughness:.8});
  const blossom=new T.MeshStandardMaterial({color:0xcb806a,emissive:0x713729,emissiveIntensity:.22,roughness:.9});
  const glow=new T.MeshStandardMaterial({color:0xffd58a,emissive:0xe99c45,emissiveIntensity:1.1});
  const dark=new T.MeshStandardMaterial({color:0x243d3b,roughness:.96});
  function root(x,z,y=surface(x,z)){const r=new T.Group();r.position.set(x,y,z);g.add(r);return r;}
  function tree(x,z,h=12,leaves=M.leaf){
    const r=root(x,z);part(r,cylinder,M.wood,0,h*.44,0,h*.07,h*.88,h*.07);
    for(let i=0;i<7;i++){const a=i*2.4;part(r,sphere,leaves,Math.sin(a)*h*.22,h*(.72+(i%3)*.12),Math.cos(a)*h*.22,h*.26,h*.18,h*.25);}
    return r;
  }
  function lantern(parent,x,y,z,s=1){part(parent,cube,M.red,x,y,z,.58*s,.72*s,.58*s);part(parent,cube,glow,x,y,z,.43*s,.54*s,.43*s);}
  function arch(x,z,w=8,h=6){const r=root(x,z);part(r,cube,M.red,-w/2,h/2,0,.35,h,.35);part(r,cube,M.red,w/2,h/2,0,.35,h,.35);part(r,cube,M.wood,0,h,0,w+1,.38,.5);for(let i=0;i<5;i++)lantern(r,-w*.4+i*w*.2,h-.8,0,.7);}

  const home=root(-40,25);
  part(home,new T.CylinderGeometry(10,11,.45,32),M.stone,0,.12,0);
  const homeRing=part(home,new T.TorusGeometry(9.4,.16,8,64),M.copper,0,.42,0);homeRing.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;part(home,cube,i%3?M.copper:glow,Math.sin(a)*9.4,.5,Math.cos(a)*9.4,.34,.12,.9).rotation.y=a;}
  const crane=root(-31,20);part(crane,cube,M.ink,0,4,0,.45,8,.45);part(crane,cube,M.copper,2.8,7.8,0,6,.28,.35);part(crane,cylinder,M.gold,5.4,5.7,0,.06,4.2,.06);part(crane,new T.TorusGeometry(.8,.18,8,20),M.copper,5.4,3.4,0);
  for(let i=0;i<8;i++)part(home,new T.TorusGeometry(.5+i%3*.14,.13,6,12),i%2?M.copper:M.ink,-6+(i%4)*1.3,.7,-5+Math.floor(i/4)*1.4).rotation.x=Math.PI/2;

  for(let i=0;i<5;i++){
    const z=-62+i*8,x=river(z)-width(z)+2.5,boat=root(x,z,waterLevel+.2);
    part(boat,cube,M.wood,0,0,0,3.8,.42,1.35);part(boat,cube,M.red,0,.7,0,2.2,1.1,1.1);
    part(boat,cube,M.tile,0,1.32,0,2.7,.18,1.6);lantern(boat,1.25,.72,.75,.55);
    moving.push((dt,t)=>{boat.position.y=waterLevel+.18+Math.sin(t*1.1+i)*.12;boat.rotation.z=Math.sin(t*.7+i)*.025;});
  }
  arch(-49,-47,7,5);arch(-52,-68,6,4.5);

  tree(-112,-145,23,dark);tree(-83,-146,19,M.leaf);tree(-111,-120,18,M.leaf2);
  arch(-91,-128,10,7);
  for(let i=0;i<52;i++){
    const a=i*2.399,r=5+(i%13)*1.25,x=-99+Math.sin(a)*r,z=-137+Math.cos(a)*r,y=surface(x,z);
    part(g,cylinder,pale,x,y+.32,z,.07,.64,.07);part(g,sphere,i%4===0?glow:blossom,x,y+.7,z,.34+(i%3)*.1,.16,.34+(i%3)*.1);
  }
  for(let i=0;i<9;i++){const a=(i-4)*.16,trail=part(g,sphere,glow,-108+Math.sin(a)*9,surface(-108,-140)+.16,-140+i*1.35,.18,.08,.45);trail.rotation.y=a;}

  for(const z of [-83,-99,-116])arch(65,z,12,7);
  for(let i=0;i<18;i++){const x=48+(i%6)*7,z=-119+Math.floor(i/6)*18;lantern(g,x,surface(x,z)+4.5,z,1.05);}
  for(let i=0;i<8;i++){const x=45+i*7,z=-78;part(g,cube,M.wood,x,surface(x,z)+.45,z,4,.9,2.8);part(g,sphere,i%2?blossom:M.gold,x,surface(x,z)+1.15,z,1.8,.25,1.3);}

  for(let i=0;i<13;i++){
    const a=i*2.399,r=12+(i%4)*4,x=123+Math.sin(a)*r,z=7+Math.cos(a)*r,h=5+(i%5)*2;
    const rock=part(g,new T.ConeGeometry(2.1+(i%3),h,5),i%3?M.stone:jade,x,surface(x,z)+h*.45,z);rock.rotation.z=(i%2-.5)*.15;
  }
  for(let i=0;i<3;i++){const ring=part(g,new T.TorusGeometry(12+i*3,.12,8,72),i===1?glow:M.copper,123,surface(123,7)+9+i*5,7);ring.rotation.x=Math.PI/2+.18*i;moving.push((dt,t)=>ring.rotation.z=t*.04*(i+1));}

  const shell=root(-12,139);part(shell,sphere,jade,0,1.1,0,7,1.45,5.4);
  for(let i=0;i<9;i++){const a=i*Math.PI/8;const line=part(shell,cube,M.gold,Math.cos(a)*4.8,2.15,Math.sin(a)*3.3,.13,.13,5.5);line.rotation.y=-a;}
  for(let i=0;i<70;i++){
    const a=i*2.399,r=8+(i%14)*1.15,x=-8+Math.sin(a)*r,z=127+Math.cos(a)*r,y=surface(x,z);
    part(g,cylinder,i%5===0?M.gold:M.leaf2,x,y+1.25,z,.065,2.5+(i%4)*.4,.065).rotation.z=Math.sin(a)*.1;
  }
  const whirlpool=part(g,new T.TorusGeometry(7,.18,8,64),M.cyan,river(123),waterLevel+.1,123);whirlpool.rotation.x=Math.PI/2;moving.push((dt,t)=>{whirlpool.rotation.z=t*.25;whirlpool.scale.setScalar(1+Math.sin(t)*.05);});

  const fusang=root(65,155);
  part(fusang,cylinder,M.wood,0,15,0,1.6,30,2.4);
  for(let i=0;i<11;i++){
    const a=i*2.399,y=17+(i%5)*3.2,r=5+(i%3)*2.4;
    const branch=part(fusang,cylinder,M.copper,Math.sin(a)*r*.45,y,Math.cos(a)*r*.45,.32,r*1.2,.32);branch.rotation.z=Math.PI/2;branch.rotation.y=a;
    part(fusang,sphere,blossom,Math.sin(a)*r,y+1,Math.cos(a)*r,4.3,2.5,4.3);
    if(i<9)part(fusang,sphere,glow,Math.sin(a)*r,y+1.1,Math.cos(a)*r,1.2,1.2,1.2);
  }
  const crown=part(fusang,sphere,glow,0,33,0,2.8,2.8,2.8);moving.push((dt,t)=>crown.scale.setScalar(1+Math.sin(t*.8)*.035));

  for(let i=0;i<6;i++){const x=30+(i%2)*18,z=-151-i*5;part(g,cube,M.stone,x,surface(x,z)+2,z,1.2,4,1.2);lantern(g,x,surface(x,z)+4.5,z,1.1);}
  const moon=root(39,-176,surface(39,-176)+15);part(moon,new T.TorusGeometry(5,.32,10,64),M.gold,0,0,0);part(moon,sphere,dark,.8,0,.2,4.3,4.3,.45);moving.push((dt,t)=>moon.rotation.y=Math.sin(t*.13)*.15);

  let routeIndex=0;
  for(const path of paths)for(let segment=0;segment<path.length-1;segment++){
    const [ax,az]=path[segment],[bx,bz]=path[segment+1],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    const steps=Math.max(1,Math.floor(length/8));
    for(let step=1;step<steps;step++){
      const t=step/steps,x=ax+dx*t,z=az+dz*t,side=routeIndex%2?-1:1,px=x+nx*side*4.2,pz=z+nz*side*4.2,y=surface(px,pz),theme=z<-105?0:x>85?1:z>95?2:3;
      if(routeIndex%4===0){
        part(g,cylinder,M.wood,px,y+1.8,pz,.13,3.6,.13);lantern(g,px,y+3.35,pz,.72);
        const banner=part(g,cube,theme===0?M.leaf2:theme===1?M.copper:theme===2?M.gold:M.red,px+side*.48,y+2.45,pz,.75,1.25,.06);banner.rotation.y=Math.atan2(dx,dz);
      }else if(routeIndex%4===1){
        part(g,new T.ConeGeometry(.75,2.8+(routeIndex%3),5),theme===1?M.stone:jade,px,y+1.25,pz);
        part(g,new T.TorusGeometry(.55,.07,6,18),M.gold,px,y+2.35,pz).rotation.x=Math.PI/2;
      }else{
        for(let plant=0;plant<5;plant++){const a=plant*2.399;part(g,sphere,theme===0?M.leaf:theme===2?blossom:M.leaf2,px+Math.sin(a)*.8,y+.45,pz+Math.cos(a)*.8,.75,.55,.75);}
        part(g,cube,M.stone,x,y+.08,z,1.25,.16,.7).rotation.y=Math.atan2(dx,dz);
      }
      if(routeIndex%7===0){
        const rx=x-nx*side*5.2,rz=z-nz*side*5.2,ry=surface(rx,rz);
        part(g,cube,M.stone,rx,ry+.45,rz,2.8,.35,1.05).rotation.y=Math.atan2(dx,dz);
        part(g,cube,M.wood,rx,ry+.95,rz,2.4,.18,.65).rotation.y=Math.atan2(dx,dz);
      }
      routeIndex++;
    }
  }
  for(let i=0;i<34;i++){
    const z=-188+i*11.3,x=river(z)+(i%2?-1:1)*(width(z)+8),y=surface(x,z);
    if(i%3===0){part(g,cube,M.stone,x,y+.65,z,2.2,1.3,1.8);part(g,sphere,M.leaf2,x,y+1.5,z,1.6,.7,1.4);}
    else{part(g,cylinder,M.wood,x,y+1.4,z,.09,2.8,.09);lantern(g,x,y+2.7,z,.58);}
  }
  const spirits=[];
  for(let i=0;i<6;i++){
    const spirit=new T.Group();g.add(spirit);part(spirit,sphere,i%2?pale:jade,0,.75,0,.75,.65,1.25);part(spirit,sphere,glow,0,1.2,.9,.42,.4,.5);
    for(const side of [-1,1])part(spirit,new T.ConeGeometry(.12,.65,5),M.gold,side*.3,1.72,.85).rotation.z=side*.35;
    spirits.push(spirit);
  }
  moving.push((dt,t)=>spirits.forEach((spirit,i)=>{
    const path=paths[i%paths.length],progress=(t*.025+i*.17)%(path.length-1),index=Math.floor(progress),mix=progress-index,[ax,az]=path[index],[bx,bz]=path[index+1],x=ax+(bx-ax)*mix,z=az+(bz-az)*mix;
    spirit.position.set(x,surface(x,z)+Math.abs(Math.sin(t*3+i))*.16,z);spirit.rotation.y=Math.atan2(bx-ax,bz-az);
  }));

  for(const path of paths)for(let segment=0;segment<path.length-1;segment++){
    const [ax,az]=path[segment],[bx,bz]=path[segment+1],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),count=Math.floor(length/3.4);
    for(let i=1;i<count;i++){
      const t=i/count,x=ax+dx*t,z=az+dz*t,y=surface(x,z),offset=Math.sin(i*2.3)*.34;
      const slab=part(g,cube,i%5===0?M.copper:M.stone,x-Math.cos(angle)*offset,y+.055,z+Math.sin(angle)*offset,1.45+(i%3)*.25,.10,.48+(i%2)*.22);slab.rotation.y=angle+(i%3-1)*.06;
      if(i%9===0){const side=i%2?1:-1,px=x+Math.cos(angle)*side*3.4,pz=z-Math.sin(angle)*side*3.4,py=surface(px,pz);part(g,new T.TorusGeometry(1.15,.16,7,24),jade,px,py+1.2,pz);part(g,sphere,glow,px,py+1.2,pz,.19,.19,.19);}
    }
  }

  const fishSchools=[];
  for(let school=0;school<7;school++){
    const group=new T.Group();g.add(group);
    for(let i=0;i<9;i++){
      const fish=new T.Group();group.add(fish);fish.position.set((i%3)*1.8,0,Math.floor(i/3)*2.2);
      part(fish,sphere,i%3?pale:glow,0,0,0,.55,.16,.23);part(fish,new T.ConeGeometry(1,1,9),M.copper,-.58,0,0,.19,.38,.12).rotation.z=-Math.PI/2;
      const wingL=part(fish,cube,M.cyan,-.05,.04,-.38,.45,.04,.55),wingR=part(fish,cube,M.cyan,-.05,.04,.38,.45,.04,.55);wingL.rotation.y=.35;wingR.rotation.y=-.35;
    }
    fishSchools.push(group);
  }
  moving.push((dt,t)=>fishSchools.forEach((school,i)=>{
    const z=-160+i*49+Math.sin(t*.23+i)*9,x=river(z)+Math.sin(t*.35+i)*9;school.position.set(x,waterLevel+.18+Math.max(0,Math.sin(t*1.4+i))*1.6,z);school.rotation.y=Math.sin(t*.2+i)*.55;school.visible=!state.dive;
  }));
  for(let i=0;i<5;i++){
    const z=-126+i*67,x=river(z)+(i%2?9:-10),ship=root(x,z,waterLevel+.24);
    part(ship,cube,M.wood,0,0,0,7.2,.75,2.8);part(ship,cube,M.red,0,.65,0,4.8,1.1,2.3);part(ship,cube,M.tile,0,1.32,0,5.8,.18,3.1);
    part(ship,cylinder,M.wood,0,4.4,0,.15,6.2,.15);part(ship,cube,pale,.2,4.3,0,.10,4.3,3.8);lantern(ship,2.6,1.1,1.7,.75);
    moving.push((dt,t)=>{ship.position.y=waterLevel+.24+Math.sin(t*.75+i)*.12;ship.rotation.z=Math.sin(t*.55+i)*.022;});
  }
  for(const z of [-101,74]){
    const x=river(z),r=root(x,z,waterLevel);
    for(const side of [-1,1]){part(r,cylinder,M.red,side*10,4.8,0,.5,9.6,.5);lantern(r,side*10,8.8,0,1.25);}
    part(r,cube,M.wood,0,9.2,0,22,.6,.75);part(r,cube,M.gold,0,9.62,0,8,.38,.82);
  }

  const coral=new T.MeshStandardMaterial({color:0x487f75,emissive:0x183f3b,emissiveIntensity:.35,roughness:.86});
  for(let i=0;i<145;i++){
    const z=-205+(i*2.87)%410,x=river(z)+Math.sin(i*2.399)*(width(z)*.76),floor=terrain(x,z),h=1.3+(i%7)*.55;
    if(i%4===0){const rock=part(g,new T.ConeGeometry(1.4+(i%3)*.6,h*2.5,5),i%3?M.stone:jade,x,floor+h,z);rock.rotation.z=Math.sin(i)*.18;}
    else{
      part(g,cylinder,coral,x,floor+h*.5,z,.10,h,.10).rotation.z=Math.sin(i)*.18;
      for(const side of [-1,1])part(g,sphere,i%6===0?glow:coral,x+side*.38,floor+h*.72,z,.5,.17,.32).rotation.z=side*.45;
    }
  }
  for(const z of [-151,-50,44,134]){
    const x=river(z);for(const side of [-1,1]){
      part(g,cylinder,M.stone,x+side*8,-1.4,z,1.0,5.2,1.0);part(g,new T.TorusGeometry(1.25,.16,7,24),M.copper,x+side*8,-.3,z).rotation.x=Math.PI/2;
    }
  }
  const wreck=root(river(75)+5,75,terrain(river(75)+5,75));wreck.rotation.z=.18;
  part(wreck,cube,M.wood,0,.5,0,10,1.1,3.4);for(let i=0;i<7;i++)part(wreck,cube,M.copper,-4+i*1.35,1.6,0,.16,2.4,3.5);
  part(wreck,cylinder,M.wood,2,4.1,0,.22,7,.22).rotation.z=.5;
  const deepFish=[];
  for(let i=0;i<28;i++){const fish=part(g,sphere,i%4?M.cyan:glow,0,0,0,.35,.13,.18);deepFish.push(fish);}
  moving.push((dt,t)=>deepFish.forEach((fish,i)=>{const z=-175+(i*29)%350,a=t*.25+i*.8,r=5+(i%6);fish.position.set(river(z)+Math.sin(a)*r,waterLevel-2.4-(i%3)*.65,z+Math.cos(a)*r);fish.rotation.y=a;}));

  const dragon=root(123,7,surface(123,7)+25);
  const dragonCurve=new T.CatmullRomCurve3([
    new T.Vector3(-25,-2,2),new T.Vector3(-15,3,0),new T.Vector3(-4,0,0),
    new T.Vector3(8,4,-1),new T.Vector3(19,1,1),new T.Vector3(27,5,0)
  ]);
  part(dragon,new T.TubeGeometry(dragonCurve,72,1.55,10,false),jade,0,0,0);
  for(let i=2;i<23;i++){
    const p=dragonCurve.getPoint(i/25),spine=part(dragon,new T.ConeGeometry(.52,2.8,5),i%3?M.copper:glow,p.x,p.y+1.8,p.z);
    spine.rotation.z=-.25;
  }
  part(dragon,sphere,jade,28,5,0,4.2,2.5,2.7);
  part(dragon,sphere,pale,30.6,4.5,0,2.7,1.35,2.2);
  for(const side of [-1,1]){
    part(dragon,sphere,glow,29.8,6,side*2.15,.34,.34,.25);
    const horn=part(dragon,new T.ConeGeometry(.36,5.5,7),M.gold,26.8,8.3,side*1.4);horn.rotation.z=-.55;
    const wingShape=new T.Shape();wingShape.moveTo(0,0);wingShape.lineTo(-7,side*15);wingShape.lineTo(4,side*11);wingShape.lineTo(10,side*4);wingShape.closePath();
    const wing=part(dragon,new T.ShapeGeometry(wingShape),new T.MeshStandardMaterial({color:0x9cb8a2,emissive:0x344e43,emissiveIntensity:.35,roughness:.8,side:T.DoubleSide}),3,3,0);
    wing.rotation.x=Math.PI/2;
    for(let feather=0;feather<7;feather++){
      const rib=part(dragon,cube,M.copper,1+feather*.5,3.08,side*(3+feather*1.55),8-feather*.55,.12,.14);rib.rotation.y=side*(-.45+feather*.06);
    }
    const whiskerCurve=new T.CatmullRomCurve3([new T.Vector3(31,4,side*1.5),new T.Vector3(36,3,side*4),new T.Vector3(39,5,side*7)]);
    part(dragon,new T.TubeGeometry(whiskerCurve,16,.075,5),M.gold,0,0,0);
  }
  moving.push((dt,t)=>{dragon.position.y=surface(123,7)+25+Math.sin(t*.45)*1.2;dragon.rotation.y=Math.sin(t*.16)*.08;});

  const kun=root(river(91),91,waterLevel-3.3);
  part(kun,sphere,new T.MeshStandardMaterial({color:0x679b96,emissive:0x285c60,emissiveIntensity:.9,roughness:.55}),0,0,0,7.5,3.6,16);
  part(kun,sphere,jade,0,.2,-12.5,7.1,3.4,6.2);
  for(const side of [-1,1]){
    part(kun,sphere,glow,side*5.6,.7,-14,.42,.32,.5);
    const fin=part(kun,new T.ConeGeometry(4.5,13,3),jade,side*8,-.3,-1);fin.rotation.z=side*Math.PI/2;fin.rotation.y=.2;
    part(kun,new T.ConeGeometry(3.4,9,3),M.copper,side*3.2,0,17).rotation.z=side*Math.PI/2;
  }
  for(let i=0;i<8;i++)part(kun,new T.TorusGeometry(4.8-i*.24,.10,6,32,Math.PI),glow,0,1.8,-9+i*3).rotation.x=Math.PI/2;
  moving.push((dt,t)=>{kun.position.y=waterLevel-3.3+Math.sin(t*.36)*.8;kun.position.x=river(91)+Math.sin(t*.19)*4;kun.rotation.y=Math.sin(t*.16)*.12;});

  const sunHalo=part(fusang,new T.TorusGeometry(12,.25,8,80),glow,0,32,0);sunHalo.rotation.y=.2;
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,sun=part(fusang,sphere,glow,Math.sin(a)*12,32+Math.cos(a)*12,0,1.05,1.05,1.05);
    moving.push((dt,t)=>sun.scale.setScalar(1+Math.sin(t*.8+i)*.07));
  }

  const flock=[];
  for(let i=0;i<22;i++){const bird=new T.Group();g.add(bird);part(bird,cube,i%3?pale:glow,-.35,0,0,.65,.045,.20).rotation.z=.25;part(bird,cube,i%3?pale:glow,.35,0,0,.65,.045,.20).rotation.z=-.25;flock.push(bird);}
  moving.push((dt,t)=>flock.forEach((b,i)=>{const a=t*.13+i*.29,r=30+(i%5)*4;b.position.set(20+Math.sin(a)*r,26+(i%6)*1.7+Math.sin(t+i),15+Math.cos(a)*r);b.rotation.y=a;b.rotation.z=Math.sin(t*5+i)*.18;}));
  return {update(dt,t){moving.forEach(fn=>fn(dt,t));}};
}
