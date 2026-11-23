import * as T from './vendor/three.module.js';
import { part, sphere, surface, terrain, waterLevel } from './world.js';

export function createAtmosphere(scene,state) {
  const group=new T.Group();scene.add(group);
  const clock={value:0};
  const cloudMaterial=new T.MeshBasicMaterial({color:0xe8e4cf,transparent:true,opacity:.075,depthWrite:false});
  const clouds=[];
  for(let i=0;i<24;i++){
    const cloud=new T.Group();
    const x=-175+(i*67)%350,z=-210+(i*91)%420,y=22+(i%5)*8;
    cloud.position.set(x,y,z);
    for(let j=0;j<4;j++)part(cloud,sphere,cloudMaterial,(j-1.5)*3.4,Math.sin(j)*.7,Math.cos(j*2)*2.0,4.5+(j%2)*2,.75+(j%3)*.35,2.8+(j%2));
    group.add(cloud);clouds.push({cloud,x,z,phase:i*.73});
  }

  const waterfallMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    uniforms:{clock},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`
      uniform float clock;varying vec2 vUv;
      void main(){
        float edge=smoothstep(0.0,.22,vUv.x)*smoothstep(0.0,.22,1.0-vUv.x);
        float stream=.38+.62*pow(.5+.5*sin(vUv.x*29.0+sin(vUv.y*9.0)-clock*.8),3.0);
        float beads=.55+.45*sin(vUv.y*90.0+clock*8.0);
        float fade=smoothstep(0.0,.15,vUv.y)*smoothstep(0.0,.12,1.0-vUv.y);
        gl_FragColor=vec4(.52,.88,.83,edge*stream*(.12+beads*.055)*fade);
      }
    `
  });
  const falls=[
    [-40,25,12,3.4],[123,6,24,5.8],[65,155,31,4.5],[64,-100,33,4.8],[-91,-132,27,4.6]
  ];
  for(const [x,z,lift,radius] of falls){
    const top=terrain(x,z)+lift-1.2,bottom=surface(x+radius*.7,z+1),height=Math.max(5,top-bottom);
    for(const angle of [0,Math.PI/2]){
      const fall=part(group,new T.PlaneGeometry(1.25,height),waterfallMaterial,x+radius*.7,(top+bottom)/2,z+1);
      fall.rotation.y=angle;
    }
  }

  const updrafts=[];
  const updraftMaterial=new T.MeshBasicMaterial({color:0xb9eee1,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide});
  falls.forEach(([x,z,lift,radius],index)=>{
    const px=x+radius*.7,pz=z+1,bottom=surface(px,pz);
    for(let i=0;i<4;i++){
      const ring=part(group,new T.TorusGeometry(.85+i*.18,.025,5,28),updraftMaterial,px,bottom+i*1.25,pz);
      ring.rotation.x=Math.PI/2;updrafts.push({ring,bottom,index,offset:i});
    }
  });

  const moteCount=150,motePositions=new Float32Array(moteCount*3),moteColors=new Float32Array(moteCount*3);
  const color=new T.Color();
  for(let i=0;i<moteCount;i++){
    motePositions.set([Math.sin(i*12.37)*26,(i%17)*2.3-5,Math.cos(i*7.91)*26],i*3);
    color.set(i%4===0?0xf2cf88:0x8fe5d5);moteColors.set([color.r,color.g,color.b],i*3);
  }
  const moteGeometry=new T.BufferGeometry();
  moteGeometry.setAttribute('position',new T.BufferAttribute(motePositions,3).setUsage(T.DynamicDrawUsage));
  moteGeometry.setAttribute('color',new T.BufferAttribute(moteColors,3));
  const motes=new T.Points(moteGeometry,new T.PointsMaterial({size:.12,vertexColors:true,transparent:true,opacity:.48,depthWrite:false,blending:T.AdditiveBlending}));
  motes.frustumCulled=false;group.add(motes);

  const dustCount=120,dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++)dustPositions.set([Math.sin(i*5.17)*17,-2.5+(i%13)*.24,Math.cos(i*8.33)*17],i*3);
  const dustGeometry=new T.BufferGeometry();
  dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3).setUsage(T.DynamicDrawUsage));
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:0x8dd8c8,size:.055,transparent:true,opacity:.38,depthWrite:false}));
  dust.frustumCulled=false;group.add(dust);

  function update(dt,t) {
    clock.value=t;
    updrafts.forEach(({ring,bottom,index,offset})=>{
      ring.position.y=bottom+(t*.9+offset*1.25+index*.3)%5;
      ring.scale.setScalar(.75+(ring.position.y-bottom)*.12);
    });
    clouds.forEach(({cloud,x,z,phase})=>{cloud.position.x=x+Math.sin(t*.025+phase)*8;cloud.position.z=z+Math.cos(t*.018+phase)*4;});
    motes.visible=state.form==='sky';
    if(motes.visible){
      motes.position.set(state.x,state.y-4,state.z);
      for(let i=0;i<moteCount;i++)moteGeometry.attributes.position.setY(i,((i%17)*2.3+t*.24+i*.11)%38-5);
      moteGeometry.attributes.position.needsUpdate=true;
    }
    dust.visible=state.dive;
    if(dust.visible){
      dust.position.set(state.x,0,state.z);
      for(let i=0;i<dustCount;i++)dustGeometry.attributes.position.setY(i,-2.5+(i%13)*.24+(t*.08+i*.03)%.28);
      dustGeometry.attributes.position.needsUpdate=true;
    }
  }
  function updraftAt(x,z) {
    return falls.some(([cx,cz,,radius])=>Math.hypot(x-(cx+radius*.7),z-(cz+1))<3.5);
  }
  return {update,updraftAt};
}
