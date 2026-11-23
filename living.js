import * as T from './vendor/three.module.js';
import { cube, cylinder, materials, part, river, sites, sphere, terrain, waterLevel, width } from './world.js';

const TAU=2*Math.PI;
const stick=new T.CylinderGeometry(.048,.06,1,7);
const leafShape=new T.BufferGeometry();
leafShape.setAttribute('position',new T.Float32BufferAttribute([
  -.5,0,0, -.16,.04,-.23, .19,.06,-.19, .54,.01,0,
  .18,.05,.18, -.13,.03,.21, -.02,.105,0
],3));
leafShape.setIndex([0,6,1,1,6,2,2,6,3,3,6,4,4,6,5,5,6,0]);
leafShape.computeVertexNormals();
const wingShape=new T.BufferGeometry();
wingShape.setAttribute('position',new T.Float32BufferAttribute([
  0,0,.08, .28,.04,.19, .65,0,.02, .48,.01,-.12, .20,.012,-.16, 0,0,-.12
],3));
wingShape.setIndex([0,1,2,0,2,3,0,3,4,0,4,5]);
wingShape.computeVertexNormals();
const wingMaterial=new T.MeshStandardMaterial({color:0xc9c6a1,roughness:.8,side:T.DoubleSide});
const bodyMaterial=new T.MeshStandardMaterial({color:0x455c56,roughness:.85});
const leafMaterial=new T.MeshStandardMaterial({color:0xe1c793,roughness:1,side:T.DoubleSide});
const mapColors=[0xa87a46,0xe2a559,0xd2bb77,0x87996d,0xb46f43,0xd1a964];

function lantern(parent,x,y,z,tone,phase) {
  const anchor=new T.Group();
  anchor.position.set(x,y,z);
  parent.add(anchor);
  const joint=new T.Group();
  anchor.add(joint);
  part(joint,stick,materials.copper,0,-.24,0,1,.49,1);
  part(joint,cylinder,materials.tile,0,-.52,0,.24,.12,.24);
  const flame=part(joint,sphere,tone,0,-.75,0,.21,.25,.21);
  for(let i=0;i<4;i++){
    const angle=i*TAU/4;
    part(joint,stick,materials.copper,.20*Math.sin(angle),-.75,.20*Math.cos(angle),.38,.39,.38);
  }
  part(joint,cylinder,materials.copper,0,-.98,0,.19,.07,.19);
  part(joint,cube,tone,0,-1.11,0,.056,.19,.05);
  return {joint,flame,phase};
}

function breezeCloth(parent,clock) {
  const palettes=[0x9a4c3f,0xa97543,0x6a8a79];
  const textiles=palettes.map(color=>{
    const material=new T.MeshStandardMaterial({color,roughness:.94,side:T.DoubleSide,metalness:0});
    material.onBeforeCompile=shader=>{
      shader.uniforms.airClock=clock;
      shader.vertexShader='uniform float airClock;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float loose=clamp(-position.y,0.0,1.0);
        float origin=sin(modelMatrix[3].x*.8+modelMatrix[3].z*.6);
        float plume=sin(airClock*3.1+position.x*3.7-position.y*4.8+origin*4.0);
        transformed.z+=loose*loose*(plume*.23+.12*sin(airClock*1.1+origin));
        transformed.x+=loose*sin(airClock*2.24-position.y*2.9+origin)*.14;
        transformed.y+=loose*loose*(.04+.06*plume);
      `);
    };
    return material;
  });
  const cloth=new T.PlaneGeometry(.57,.87,8,8);
  cloth.translate(0,-.435,0);
  const pos=cloth.attributes.position;
  for(let i=0;i<pos.count;i++){
    const bite=Math.max(0,1-Math.abs(pos.getX(i))/.285);
    pos.setY(i,pos.getY(i)+bite*Math.max(0,-pos.getY(i)-.68)*.58);
  }
  cloth.computeVertexNormals();
  const lines=[[-52,10,-31,21],[57,-100,91,-101],[65,148,53,134],[127,3,112,11]];
  lines.forEach(([x,z,xx,zz],line)=>{
    for(let i=1;i<=5;i++){
      const k=i/6;
      const a=T.MathUtils.lerp(x,xx,k),b=T.MathUtils.lerp(z,zz,k);
      const y=T.MathUtils.lerp(terrain(x,z),terrain(xx,zz),k)+4.16-4*k*(1-k);
      const pennant=part(parent,cloth,textiles[(i+line)%textiles.length],a,y,b);
      pennant.rotation.y=-Math.atan2(zz-z,xx-x);
    }
  });
}

function makeBird(parent, x,z, alt, n) {
  const root=new T.Group();
  parent.add(root);
  part(root,sphere,bodyMaterial,0,0,0,.087,.099,.23);
  part(root,sphere,wingMaterial,0,.035,.19,.061,.065,.085);
  const left=new T.Group(),right=new T.Group();
  root.add(left,right);
  part(left,wingShape,wingMaterial,0,0,0).scale.x=-1;
  part(right,wingShape,wingMaterial,0,0,0);
  return {root,left,right,x,z,alt,n};
}

function fireflies(parent) {
  const centers=[[-42,25],[-46,-51],[-84,-131],[5,122],[-19,46]];
  const specs=[];
  for(const [x,z] of centers){
    for(let i=0;i<12;i++){
      const n=i*.673+x*.319+z*.524;
      specs.push({x:x+Math.sin(n*13.9)*5.9,z:z+Math.cos(n*11.2)*6.3,y:1.1+.55*Math.sin(n*3.1),n});
    }
  }
  const positions=new Float32Array(specs.length*3);
  const flashes=new Float32Array(specs.length);
  const geometry=new T.BufferGeometry();
  const points=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  const glows=new T.BufferAttribute(flashes,1).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',points);
  geometry.setAttribute('glow',glows);
  const swarm=new T.Points(geometry,new T.ShaderMaterial({
    transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`
      attribute float glow;
      varying float lum;
      void main(){
        vec4 depth=modelViewMatrix*vec4(position,1.0);
        lum=glow;
        gl_Position=projectionMatrix*depth;
        gl_PointSize=clamp(43.0/-depth.z,1.5,10.0);
      }
    `,
    fragmentShader:`
      varying float lum;
      void main(){
        float a=length(gl_PointCoord-.5)*2.0;
        float core=1.0-smoothstep(.05,.37,a);
        float halo=(1.0-smoothstep(.14,.94,a))*.58;
        gl_FragColor=vec4(.83,1.0,.39,(core+halo)*lum);
      }
    `
  }));
  swarm.frustumCulled=false;
  parent.add(swarm);
  return {swarm,specs,positions,flashes,points,glows};
}

export function createLiving(scene) {
  const group=new T.Group();
  scene.add(group);
  const clock={value:0};
  breezeCloth(group,clock);
  const lamps=[
    lantern(group,-49.4,terrain(-47,17)+3.04,20.82,materials.gold,.7),
    lantern(group,-44.6,terrain(-47,17)+3.04,20.82,materials.gold,2.8),
    lantern(group,-49.1,terrain(-53,-58)+3.02,-54.2,materials.gold,1.3),
    lantern(group,-47.8,terrain(-47.8,-49)+3.48,-49,materials.gold,3.1),
    lantern(group,-44.5,terrain(-44.5,-49)+3.69,-49,materials.cyan,2.05),
    lantern(group,66.8,terrain(66.8,-96)+3.92,-96,materials.cyan,2.6),
    lantern(group,63.6,terrain(64,154)+3.36,153.5,materials.gold,4.1)
  ];
  const reflected=[lamps[3],lamps[4],lamps[1]];
  const reflections=reflected.map(()=>new T.Vector3());
  const flock=[];
  for(const [x,z,alt,count] of [[-33,26,4.0,4],[-32,-54,4.9,5],[61,-103,7.9,3],[118,6,8.2,3],[15,137,4.6,4]]){
    for(let i=0;i<count;i++)flock.push(makeBird(group,x,z,alt,i+3*flock.length));
  }
  const flecks=[];
  sites.forEach((site,index)=>{
    const count=site.id==='home'||site.id==='ferry'?24:12;
    for(let i=0;i<count;i++){
      const n=(i+1)*5.723+index*13.438;
      flecks.push({x:site.x-6,z:site.z,n,water:false});
    }
  });
  for(const center of [23,-47,120,151]){
    for(let i=0;i<7;i++)flecks.push({center,n:i*4.397+center,water:true});
  }
  const foliage=new T.InstancedMesh(leafShape,leafMaterial,flecks.length);
  foliage.instanceMatrix.setUsage(T.DynamicDrawUsage);
  foliage.frustumCulled=false;
  for(let i=0;i<flecks.length;i++)foliage.setColorAt(i,new T.Color(mapColors[i%mapColors.length]));
  group.add(foliage);
  const dummy=new T.Object3D();
  const motes=fireflies(group);

  function update(t, daylight, gust) {
    clock.value=t;
    lamps.forEach(({joint,phase})=>{
      joint.rotation.x=Math.sin(t*1.3+phase)*(.085+.11*gust);
      joint.rotation.z=Math.cos(t*1.09+phase*.32)*(.10+.15*gust);
    });
    reflected.forEach(({flame},i)=>flame.getWorldPosition(reflections[i]));
    flock.forEach(({root,left,right,x,z,alt,n})=>{
      const a=t*(.23+Math.abs(Math.sin(n))*.11)+n*2.398;
      const px=x+Math.sin(a)*11.5,pz=z+Math.cos(a)*15.3;
      const climb=Math.sin(a*1.8+n)*.92+Math.sin(t*.47+n)*.65;
      root.position.set(px,terrain(x,z)+alt+climb,pz);
      root.rotation.y=Math.atan2(Math.cos(a)*11.5,-Math.sin(a)*15.3);
      root.rotation.z=Math.cos(a)*.24;
      const flap=Math.sin(t*(8.9+Math.sin(n)) +n)*(.36+.29*Math.sin(t*1.4+n));
      left.rotation.z=-flap;
      right.rotation.z=flap;
    });
    flecks.forEach((item,i)=>{
      const {n,water,center}=item;
      const age=(t*(water?.024:.13+(Math.sin(n)+1)*.032)+.5+.5*Math.sin(n*8.71))%1;
      const fade=Math.min(1,age*13,(1-age)*10);
      if(water){
        const z=center+age*16-8;
        const side=Math.cos(n)>0?1:-1;
        const x=river(z)+side*(width(z)-3.5-(.5+.5*Math.sin(n))*4.5)+Math.sin(t*.8+n)*.37;
        dummy.position.set(x,waterLevel+.035+Math.sin(t*2+n)*.022,z);
        dummy.rotation.set(Math.sin(t*1.4+n)*.12,n+t*.44,Math.sin(t*1.2+n)*.1);
        dummy.scale.setScalar((.29+.20*Math.abs(Math.sin(n)))*fade);
      }else{
        const x=item.x+age*14+4*Math.sin(n*1.73)+Math.sin(t*.83+n)*(1+gust);
        const z=item.z+age*5+6*Math.cos(n*2.19)+Math.cos(t*.72+n)*1.1;
        const y=terrain(x,z)+.55+3.9*(1-age)+.48*Math.sin(t*1.8+n);
        dummy.position.set(x,y,z);
        dummy.rotation.set(t*(1.7+.3*Math.sin(n))+n,t*.66+n,t*1.17+n);
        dummy.scale.setScalar((.16+.16*Math.abs(Math.sin(n)))*fade);
      }
      dummy.updateMatrix();
      foliage.setMatrixAt(i,dummy.matrix);
    });
    foliage.instanceMatrix.needsUpdate=true;
    motes.swarm.visible=daylight<.66;
    if(motes.swarm.visible){
      const night=1-T.MathUtils.smoothstep(daylight,.11,.68);
      motes.specs.forEach(({x,z,y,n},i)=>{
        const xx=x+1.16*Math.sin(t*(.62+.13*Math.sin(n))+n),zz=z+1.03*Math.cos(t*.82+n);
        motes.positions.set([xx,terrain(xx,zz)+y+.71*Math.sin(t*.73+n*2.2),zz],i*3);
        motes.flashes[i]=night*(.21+.79*Math.max(0,Math.sin(t*1.9+n*7.4))**2);
      });
      motes.points.needsUpdate=true;
      motes.glows.needsUpdate=true;
    }
  }
  return {update,reflections};
}
