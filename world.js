import * as T from './vendor/three.module.js';

export const size = { x: 205, z: 240 };
export const waterLevel = .62;
export const river = z => Math.sin(z * .022) * 16 + z * .16;
export const width = z => 22 + 5 * Math.cos(z * .033);
export const crossing = [-151, -50, 44, 134];
export const sites = [
  { id:'home', name:'拾遗工坊', x:-40, z:25, detail:'山河修理铺、失落机芯与青鸟浮岛' },
  { id:'ferry', name:'文鳐古渡', x:-50, z:-50, detail:'浮舟机芯、夜船与归航灯' },
  { id:'pines', name:'青丘松谷', x:-91, z:-132, detail:'九尾、鹿蜀与松风水闸' },
  { id:'market', name:'白泽水巷', x:64, z:-100, detail:'万象之眼、铜线与长街灯火' },
  { id:'ridge', name:'应龙山脊', x:123, z:6, detail:'云翼机芯、帝江云阙与风车' },
  { id:'lotus', name:'旋龟汀洲', x:-5, z:125, detail:'渊甲机芯、归墟水眼与夜渡' },
  { id:'station', name:'扶桑驿站', x:65, z:155, detail:'扶桑十日、北冥鲲影与通信线' },
  { id:'tower', name:'天狗望楼', x:39, z:-169, detail:'夜观天狗与江月' }
];
export const paths = [
  [[-40,25],[-46,10],[-47,-25],[-50,-50],[-58,-79],[-91,-132],[-72,-151],[-51,-151]],
  [[-40,25],[-37,44],[-35,83],[-20,115],[-5,125],[-5,134]],
  [[27,-50],[64,-100],[63,-135],[39,-169]],
  [[27,-50],[61,-32],[81,-24],[100,-8],[123,6],[142,30],[118,58],[78,83],[65,155]],
  [[-37,44],[-25,42],[-11,44]],
  [[50,44],[69,57],[78,83]],
  [[16,-151],[39,-169]],
  [[45,134],[65,155]]
];

const clamp = T.MathUtils.clamp;
const smooth = T.MathUtils.smoothstep;
const mix = T.MathUtils.lerp;
export const distanceToBank = (x,z) => Math.abs(x-river(z)) - width(z);
export const onBridge = (x,z) => Math.abs(x-river(z)) < width(z)+8 && crossing.some(b=>Math.abs(b-z)<3.1);
export function terrain(x,z) {
  const d = distanceToBank(x,z);
  const h = 2.3 + .65*Math.sin(z*.043) + .55*Math.sin(x*.074+z*.034);
  const ridge = 13*Math.exp(-((x-129)**2/2400+(z-11)**2/4300));
  const pine = 7*Math.exp(-((x+104)**2/2900+(z+145)**2/4200));
  const hills = 12*smooth(Math.abs(x),145,210) + 14*smooth(Math.abs(z),192,246);
  return mix(-2.8, h+(ridge+pine+hills)*smooth(d,5,32), smooth(d,-6,5));
}
export const surface = (x,z) => onBridge(x,z) ? Math.max(terrain(x,z),3.28) : terrain(x,z);
export const isWet = (x,z) => terrain(x,z)<waterLevel-.03;
export const atShore = (x,z) => Math.abs(distanceToBank(x,z)+2.5)<10;

export const materials = {
  ink:new T.MeshStandardMaterial({color:0x182d2d,roughness:.87}),
  wood:new T.MeshStandardMaterial({color:0x503a32,roughness:.91}),
  red:new T.MeshStandardMaterial({color:0x81463a,roughness:.77}),
  plaster:new T.MeshStandardMaterial({color:0xa29778,roughness:.93}),
  slate:new T.MeshStandardMaterial({color:0x304a48,roughness:.89}),
  tile:new T.MeshStandardMaterial({color:0x203a3e,roughness:.74}),
  copper:new T.MeshStandardMaterial({color:0xad7655,roughness:.53,metalness:.48}),
  gold:new T.MeshStandardMaterial({color:0xf3c477,emissive:0xffa33f,emissiveIntensity:1.55}),
  cyan:new T.MeshStandardMaterial({color:0x6eeadf,emissive:0x0fc9cf,emissiveIntensity:1.18}),
  leaf:new T.MeshStandardMaterial({color:0x23473f,roughness:1}),
  leaf2:new T.MeshStandardMaterial({color:0x45634b,roughness:1}),
  stone:new T.MeshStandardMaterial({color:0x5d7066,roughness:1}),
  path:new T.MeshStandardMaterial({color:0x84907a,roughness:1,side:T.DoubleSide})
};
const M = materials;
export const cube = new T.BoxGeometry(1,1,1);
export const sphere = new T.SphereGeometry(1,16,10);
export const cylinder = new T.CylinderGeometry(1,1,1,12);
const cone = new T.ConeGeometry(1,1,9);
const pineGeometry = new T.IcosahedronGeometry(1,0);
const roofMaterial = M.tile.clone();
roofMaterial.side = T.DoubleSide;
const matrix = new T.Matrix4();
const stamp = new T.Object3D();
let seed = 23118;
function rand() {
  seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

export function part(parent, geometry, material, x,y,z, sx=1,sy=1,sz=1) {
  const mesh = new T.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.scale.set(sx,sy,sz);
  parent.add(mesh);
  return mesh;
}

function building(parent, x,z, w,d, floors=1, facing=0, light=M.gold, name='') {
  const g = new T.Group();
  const y = terrain(x,z);
  g.position.set(x,y,z);
  g.rotation.y=facing;
  parent.add(g);
  parent.userData.blocks.push({x,z,w,d,angle:facing,h:floors*3.2+2.1});
  const level=3.2;
  for (let i=0;i<floors;i++) {
    const base=i*level;
    const scale=1-i*.17;
    const a=w*scale, b=d*scale;
    part(g,cube,M.stone,0,base+.18,0,a+.5,.56,b+.5);
    part(g,cube,M.plaster,0,base+1.52,0,a,2.75,b);
    part(g,cube,M.ink,0,base+.12,0,a+.22,.25,b+.2);
    part(g,cube,M.wood,0,base+2.75,0,a+.22,.25,b+.23);
    part(g,cube,M.wood,0,base+1.19,b*.5+.025,1.1,2.25,.1);
    for (const side of [-1,1]) {
      for (const edge of [-1,1]) part(g,cube,M.red,side*a*.5,base+1.55,edge*b*.5,.22,3,.22);
      for (const face of [-1,1]) {
        part(g,cube,M.ink,side*a*.28,base+1.58,face*(b*.5+.05),a*.221,.96,.11);
        part(g,cube,light,side*a*.28,base+1.58,face*(b*.5+.11),a*.18,.75,.07);
        for(let j=-1;j<=1;j++)part(g,cube,M.wood,side*a*.28+j*a*.041,base+1.58,face*(b*.5+.16),.048,.77,.05);
        part(g,cube,M.wood,side*a*.28,base+1.58,face*(b*.5+.16),a*.182,.055,.06);
        part(g,cube,M.ink,side*(a*.5+.02),base+1.58,face*b*.23,.11,.92,b*.22);
        part(g,cube,light,side*(a*.5+.082),base+1.58,face*b*.23,.04,.68,b*.172);
        part(g,cube,M.wood,side*(a*.5+.114),base+1.58,face*b*.23,.036,.68,.047);
      }
      part(g,cube,M.copper,side*a*.33,base+2.76,b*.5+.19,.09,.62,.13);
      part(g,cylinder,light,side*a*.33,base+2.48,b*.5+.19,.14,.28,.14);
    }
    if (i===0) part(g,cube,M.cyan,0,base+2.5,b*.5+.14,a*.32,.066,.07);
    roof(g,a+1.15,b+1.14,base+2.88);
  }
  if(name){
    const c=document.createElement('canvas');
    c.width=384;c.height=120;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#222e2d';ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle='#d5a571';ctx.lineWidth=7;ctx.strokeRect(8,8,368,104);
    ctx.fillStyle='#f0d9ae';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='60px SimSun, serif';ctx.fillText(name,192,62);
    const map=new T.CanvasTexture(c);
    map.colorSpace=T.SRGBColorSpace;
    const sign=new T.MeshBasicMaterial({map});
    part(g,new T.PlaneGeometry(2.05,.64),sign,0,2.44,d*.5+.167);
  }
  return g;
}

function roof(g,w,d,y) {
  const ridge = 1.28;
  const roofY=(u,v)=>y+ridge*(1-Math.abs(v))**1.6+.51*Math.abs(u)**7*Math.abs(v)**3;
  const pos=[], triangles=[];
  const edge=12;
  for (let j=0;j<=8;j++) for(let i=0;i<=edge;i++) {
    const u=(i/edge)*2-1, v=j/4-1;
    pos.push(u*w/2,roofY(u,v),v*d/2);
    if(j<8&&i<edge) {
      const a=j*(edge+1)+i, b=a+edge+1;
      triangles.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setIndex(triangles);
  geo.computeVertexNormals();
  part(g,geo,roofMaterial,0,0,0);
  part(g,cube,M.copper,0,y+ridge+.03,0,w+.13,.11,.17);
  for(let i=0;i<=16;i++){
    const u=i/8-1;
    for(const s of [-1,1]){
      const a=new T.Vector3(u*w*.5,roofY(u,s)+.045,s*d*.5);
      const b=new T.Vector3(u*w*.5,roofY(u,s*.52)+.048,s*d*.26);
      const c=new T.Vector3(u*w*.5,roofY(u,0)+.041,0);
      const rail=new T.CatmullRomCurve3([a,b,c]);
      part(g,new T.TubeGeometry(rail,5,.027,3),i%4===0?M.slate:M.ink,0,0,0);
    }
  }
  for(const s of [-1,1]){
    const fascia=[];
    for(let i=0;i<=edge;i++) {const u=i/6-1; fascia.push(new T.Vector3(u*w/2,roofY(u,s),s*d/2));}
    part(g,new T.TubeGeometry(new T.CatmullRomCurve3(fascia),16,.055,4),M.copper,0,0,0);
  }
}

function post(g,x,y,z,height=3,light=M.gold) {
  g.userData.solids?.push({x,z,r:.28});
  part(g,cube,M.ink,x,y+height*.5,z,.18,height,.18);
  part(g,cube,M.copper,x,y+height-.07,z,.64,.10,.64);
  part(g,cube,light,x,y+height-.29,z,.36,.35,.36);
  part(g,cube,M.ink,x,y+height-.53,z,.46,.12,.46);
}

function streetCable(g, x,z, dx,dz) {
  const y=terrain(x,z)+4.2, yy=terrain(dx,dz)+4.2;
  const curve=new T.QuadraticBezierCurve3(new T.Vector3(x,y,z),new T.Vector3((x+dx)/2,(y+yy)/2-2,(z+dz)/2),new T.Vector3(dx,yy,dz));
  part(g,new T.TubeGeometry(curve,13,.045,4),M.cyan,0,0,0);
  post(g,x,terrain(x,z),z,4.2,M.cyan);
  post(g,dx,terrain(dx,dz),dz,4.2,M.gold);
}

function texturedTerrain() {
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 groundLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundLocal=position;');
    shader.fragmentShader='varying vec3 groundLocal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 tile=groundLocal.xz;
      float moss=sin(tile.x*1.1+sin(tile.y*.8)*2.1)*sin(tile.y*.7+tile.x*.17);
      float textureFine=sin(tile.x*24.5+tile.y*17.3)*sin(tile.y*27.9-tile.x*13.1);
      float veins=sin(tile.x*4.1+sin(tile.y*3.6)*1.3)*sin(tile.y*5.9);
      diffuseColor.rgb*=.92+.10*moss+.046*veins+.038*textureFine;
    `);
  };
  return material;
}

function makeTerrain(scene) {
  const g=new T.PlaneGeometry(size.x*2+60,size.z*2+72,176,194);
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  const raw=[];
  const bank=new T.Color(0x78836a), upland=new T.Color(0x485c4b), peak=new T.Color(0x354845), mud=new T.Color(0x344d48);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i), y=terrain(x,z), d=distanceToBank(x,z);
    p.setY(i,y);
    const col=bank.clone().lerp(upland,smooth(d,3,46)).lerp(peak,smooth(y,9,22)).lerp(mud,1-smooth(y,0,1.6));
    col.multiplyScalar(.91+rand()*.14);
    raw.push(col.r,col.g,col.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(raw,3));
  g.computeVertexNormals();
  const ground=part(scene,g,texturedTerrain(),0,0,0);
  for(const route of paths){
    const pts=[];
    const indices=[];
    const curve=new T.CatmullRomCurve3(route.map(([x,z])=>new T.Vector3(x,0,z)));
    for(let i=0;i<=100;i++){
      const v=curve.getPoint(i/100), t=curve.getTangent(i/100);
      for(const side of [-1,1]){
        const x=v.x+t.z*side*1.65, z=v.z-t.x*side*1.65;
        pts.push(x,terrain(x,z)+.065,z);
      }
      if(i<100){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    part(scene,geo,M.path,0,0,0);
  }
  return ground;
}

function makeWater(scene) {
  const uniforms = {
    clock:{value:0}, dark:{value:.55}, gust:{value:.4}, moon:{value:new T.Vector3(-.4,.5,-.75)},
    lamp:{value:new T.Vector3()}, shines:{value:1},
    reflections:{value:Array.from({length:3},()=>new T.Vector3())},
    rings:{value:Array.from({length:5},()=>new T.Vector4(0,0,9,0))}
  };
  const material=new T.ShaderMaterial({
    uniforms,
    vertexShader:`
      varying vec3 w;
      void main(){w=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}
    `,
    fragmentShader:`
      uniform float clock;
      uniform float dark;
      uniform float gust;
      uniform vec3 moon;
      uniform vec3 lamp;
      uniform float shines;
      uniform vec3 reflections[3];
      uniform vec4 rings[5];
      varying vec3 w;
      float reflectedLight(vec3 source,float amount,float wave) {
        vec2 delta=w.xz-source.xz;
        vec2 forward=normalize(cameraPosition.xz-source.xz+vec2(.001));
        float across=dot(delta,vec2(-forward.y,forward.x));
        float along=dot(delta,forward);
        float broken=.46+.54*pow(.5+.5*sin(along*12.0+wave*2.4-clock*3.0),3.0);
        return exp(-abs(across+wave*.24)*3.5-abs(along)*.47)*smoothstep(-.9,.67,along)*broken*amount;
      }
      void main(){
        vec2 flow=vec2(w.x,w.z-clock*.98);
        float swell=sin(flow.y*.55+flow.x*.26+sin(flow.x*.48)*1.3);
        float a=sin(flow.x*.84+flow.y*1.0+sin(flow.y*.36+flow.x*.27)*2.2);
        float b=sin(flow.x*1.06+flow.y*2.33+sin(flow.x*.49-flow.y*.64)*1.44+clock*.7);
        float c=sin(flow.y*4.9+flow.x*.47+sin(flow.y*.83+flow.x*.89)*2.7);
        vec3 n=normalize(vec3(a*.049+b*.024,1.0,(swell*.054+b*.058+c*.015)*(.82+gust*.38)));
        vec3 v=normalize(cameraPosition-w);
        float rim=pow(1.0-max(.0,dot(n,v)),2.4);
        float glow=pow(max(.0,dot(reflect(-moon,n),v)),27.0);
        float sheen=pow(.5+.5*sin(flow.x*.67+flow.y*5.6+a*1.2),9.0);
        vec3 color=mix(vec3(.185,.343,.352),vec3(.063,.143,.181),dark);
        color=mix(color,mix(vec3(.61,.69,.59),vec3(.24,.41,.46),dark),rim*.56);
        color+=vec3(.31,.27,.21)*glow+vec3(.18,.27,.24)*sheen*max(0.0,a+.22)*.23;
        color+=vec3(.87,.52,.22)*reflectedLight(lamp,shines*.82,c);
        color+=vec3(.91,.53,.21)*reflectedLight(reflections[0],.82,c);
        color+=vec3(.23,.70,.75)*reflectedLight(reflections[1],.65,c);
        color+=vec3(.83,.51,.21)*reflectedLight(reflections[2],.60,c);
        if(length(w.xz-vec2(-45.0,29.0))<7.0){
          float ripples=0.0;
          for(int i=0;i<5;i++){
            vec4 r=rings[i];
            float dist=length(w.xz-r.xy);
            float crest=(1.0-smoothstep(.018,.078+r.z*.036,abs(dist-r.z*.59)));
            ripples+=crest*exp(-r.z*1.24)*smoothstep(.01,.16,r.z)*r.w;
          }
          color+=ripples*vec3(.33,.49,.40);
        }
        float haze=smoothstep(63.0,220.0,distance(cameraPosition,w));
        color=mix(color,mix(vec3(.48,.56,.51),vec3(.10,.23,.29),dark),haze*.93);
        gl_FragColor=vec4(color,1.0);
      }
    `
  });
  const pos=[], ix=[];
  for(let i=0;i<=192;i++){
    const z=-265+i*(530/192);
    const w=width(z)+4;
    pos.push(river(z)-w,waterLevel,z,river(z)+w,waterLevel,z);
    if(i<192){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setIndex(ix);
  const channel=part(scene,geo,material,0,0,0);
  const pond=new T.CircleGeometry(1,48);
  pond.rotateX(-Math.PI/2);
  const pondY=terrain(-45,29)+.08;
  part(scene,pond,material,-45,pondY,29,6,1,4.4);
  const rivulet = [];
  const triangles = [];
  for(let i=0;i<=75;i++){
    const z=-153+i*.52,x=-82+Math.sin(i*.1)*2;
    for(const s of [-1,1]){
      const px=x+s*(.6+.20*Math.sin(i*.13));
      rivulet.push(px,terrain(px,z)+.07,z);
    }
    if(i<75){const a=i*2;triangles.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const stream=new T.BufferGeometry();
  stream.setAttribute('position',new T.Float32BufferAttribute(rivulet,3));stream.setIndex(triangles);
  part(scene,stream,material,0,0,0);
  return { uniforms, pondY, channel };
}

function bridge(g,z) {
  const x=river(z), span=width(z)+9;
  const deck=part(g,cube,M.wood,x,3.12,z,span*2,.35,6.2);
  for(const s of [-1,1]){
    part(g,cube,M.red,x,4.02,z+s*3.03,span*2,.15,.17);
    part(g,cube,M.cyan,x,3.08,z+s*3.11,span*2,.055,.055);
    for(let off=-span;off<=span;off+=4.5){
      part(g,cube,M.ink,x+off,3.68,z+s*3.03,.19,1.1,.20);
      if(Math.abs(off)>span-5) post(g,x+off,3.25,z+s*2.9,1.65);
    }
    for(let i=-2;i<=2;i++) part(g,cube,M.stone,x+i*span*.39,1,z+s*2.4,.45,4.2,.46);
  }
  return deck;
}

function reedShape() {
  const positions=[],indices=[];
  for(let blade=0;blade<5;blade++){
    const angle=blade*2.399;
    const x=Math.cos(angle),z=Math.sin(angle),height=.58+(blade%4)*.14;
    for(let i=0;i<=5;i++){
      const v=i/5,lean=.31*v*v+.07,w=(1-v)**.72*.065+.008;
      positions.push(x*lean+z*w,v*height,z*lean-x*w,x*lean-z*w,v*height,z*lean+x*w);
      if(i<5){const a=blade*12+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function windMaterial(material,air) {
  const moving=material.clone();
  moving.onBeforeCompile=shader=>{
    shader.uniforms.airClock=air.clock;
    shader.uniforms.gust=air.gust;
    shader.vertexShader=`
      uniform float airClock;
      uniform float gust;
      attribute vec3 bendSpec;
    `+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec3 worldPlant=(instanceMatrix*vec4(position,1.0)).xyz;
      vec2 root=instanceMatrix[3].xz;
      float oscillator=airClock*1.42+root.x*.095+root.y*.078;
      float height=clamp((worldPlant.y-bendSpec.x)/bendSpec.y,0.0,1.23);
      float sway=(sin(oscillator)+.34*sin(oscillator*2.26+bendSpec.x*.28))*(.61+gust*.57);
      vec3 shift=vec3(sway,0.0,.55*cos(oscillator*.88)+sway*.25)*height*height*bendSpec.z;
      transformed+=vec3(dot(shift,instanceMatrix[0].xyz)/dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),
                        dot(shift,instanceMatrix[1].xyz)/dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),
                        dot(shift,instanceMatrix[2].xyz)/dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz));
    `);
  };
  return moving;
}

function foliage(g) {
  const groups = new Map();
  const air={clock:{value:0},gust:{value:.35}};
  const reeds=reedShape();
  const green=new T.MeshStandardMaterial({color:0x718653,roughness:1,side:T.DoubleSide});
  const straw=new T.MeshStandardMaterial({color:0xa69a62,roughness:1,side:T.DoubleSide});
  function batch(geometry, material,x,y,z,a,b,c,spin,bend=null) {
    const key=geometry.id+':'+material.id;
    if(!groups.has(key)) groups.set(key,{geometry,material,transforms:[],bendSpecs:bend?[]:null});
    stamp.position.set(x,y,z); stamp.scale.set(a,b,c); stamp.rotation.set(0,spin,0); stamp.updateMatrix();
    const group=groups.get(key);
    group.transforms.push(stamp.matrix.clone());
    if(bend)group.bendSpecs.push(...bend);
  }
  function tree(x,y,z,h,full=true) {
    g.userData.solids?.push({x,z,r:Math.max(.32,h*.04)});
    const w=h*.36, flex=[y,h,.54+h*.046];
    batch(cylinder,M.wood,x,y+h*.46,z,h*.039,h*.96,h*.039,0,flex);
    batch(pineGeometry,M.leaf,x,y+h*.87,z,w,h*.24,w,rand()*6,flex);
    batch(pineGeometry,M.leaf2,x+w*.37,y+h*.72,z-w*.31,w*.71,h*.17,w*.64,rand()*6,flex);
    if(full)batch(pineGeometry,M.leaf,x-w*.52,y+h*.65,z+w*.29,w*.62,h*.19,w*.61,rand()*6,flex);
  }
  function tuft(x,z,height,gold) {
    const y=terrain(x,z),s=.5+rand()*.72;
    batch(reeds,gold?straw:green,x,y-.04,z,s,height,s,rand()*6,[y,height,.46+rand()*.38]);
  }
  for(let i=0;i<2150;i++) {
    const x=(rand()-.5)*450,z=(rand()-.5)*510, y=terrain(x,z), d=distanceToBank(x,z);
    if(d<-.5 || sites.some(p=>Math.hypot(x-p.x,z-p.z)<14) || crossing.some(b=>Math.abs(z-b)<6&&d<15))continue;
    if(paths.some(path=>path.slice(1).some(([bx,bz],j)=>{
      const [ax,az]=path[j], vx=bx-ax,vz=bz-az;
      const t=clamp(((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz),0,1);
      return Math.hypot(x-ax-vx*t,z-az-vz*t)<3.6;
    }))) continue;
    if(d<6){
      tuft(x,z,.48+rand()*1.5,i%3===0);
    }else if(i%4===0){
      batch(pineGeometry,M.stone,x,y,z,.4+rand()*2,.3+rand()*1.5,.4+rand()*2,rand()*6);
    }else{
      tree(x,y,z,2.1+rand()*5.2,d>18&&i%5===0);
    }
  }
  for(const [x,z,h] of [[-54,29,5.8],[-51,36,5.2],[-38,15,4.5],[-37,37,5.2],[-59,-49,5.8],[-48,-44,3.8],[-55,-42,4.7],[-81,-133,5.6],[-89,-123,5.7]]){
    tree(x,terrain(x,z),z,h);
  }
  for(let i=0;i<910;i++){
    const z=-230+rand()*460, side=i%2===0?-1:1;
    if(crossing.some(b=>Math.abs(z-b)<5.2))continue;
    const patch=.5+.5*Math.sin(z*.47+side*2.2);
    if(rand()>.50+patch*.45)continue;
    const x=river(z)+side*(width(z)+.5+rand()*5);
    tuft(x,z,.55+rand()*(.68+patch*.97),i%4===0);
  }
  for(let i=0;i<96;i++){
    const a=rand()*Math.PI*2,r=1.04+rand()*.20;
    const x=-45+Math.sin(a)*6*r,z=29+Math.cos(a)*4.4*r;
    if(x>-42&&z<31)continue;
    tuft(x,z,.32+rand()*.85,i%3===0);
  }
  for(const {geometry,material,transforms,bendSpecs} of groups.values()){
    const shape=bendSpecs?geometry.clone():geometry;
    const plant=bendSpecs?windMaterial(material,air):material;
    if(bendSpecs)shape.setAttribute('bendSpec',new T.InstancedBufferAttribute(new Float32Array(bendSpecs),3));
    const mesh=new T.InstancedMesh(shape,plant,transforms.length);
    transforms.forEach((t,i)=>mesh.setMatrixAt(i,t));
    g.add(mesh);
  }
  return air;
}

function combineStaticMeshes(g) {
  g.updateMatrixWorld(true);
  const batches=new Map();
  g.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh)return;
    const id=object.geometry.id+':'+object.material.id;
    if(!batches.has(id))batches.set(id,[]);
    batches.get(id).push(object);
  });
  const combine=new Map();
  for(const meshes of batches.values()){
    if(meshes.length<4){
      for(const mesh of meshes){
        if(mesh.material.map||!mesh.geometry.attributes.normal)continue;
        if(!combine.has(mesh.material))combine.set(mesh.material,[]);
        combine.get(mesh.material).push(mesh);
      }
      continue;
    }
    const first=meshes[0];
    const batch=new T.InstancedMesh(first.geometry,first.material,meshes.length);
    meshes.forEach((mesh,index)=>{
      matrix.copy(mesh.matrixWorld);
      batch.setMatrixAt(index,matrix);
      mesh.removeFromParent();
    });
    batch.computeBoundingSphere();
    g.add(batch);
  }
  const v=new T.Vector3(), normalMatrix=new T.Matrix3();
  for(const [material,meshes] of combine){
    if(meshes.length<4)continue;
    const positions=[], normals=[], indices=[];
    for(const mesh of meshes){
      const start=positions.length/3;
      const position=mesh.geometry.attributes.position;
      const normal=mesh.geometry.attributes.normal;
      normalMatrix.getNormalMatrix(mesh.matrixWorld);
      for(let i=0;i<position.count;i++){
        v.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
        positions.push(v.x,v.y,v.z);
        v.fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix);
        normals.push(v.x,v.y,v.z);
      }
      const index=mesh.geometry.index;
      for(let i=0;i<(index?index.count:position.count);i++)indices.push(start+(index?index.getX(i):i));
      mesh.removeFromParent();
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    geometry.setIndex(indices);
    g.add(new T.Mesh(geometry,material));
  }
}

function landscapeSilhouettes(scene) {
  const silhouettes=[0x506465,0x40565c,0x354e54];
  for(let tier=0;tier<3;tier++){
    const positions=[], indices=[], r=280+tier*51;
    for(let i=0;i<=120;i++){
      const t=(i/120)*Math.PI*2;
      const h=18+(10+6*tier)*(1+Math.sin(t*11+tier*2)*.5+Math.sin(t*19)*.31)+rand()*5;
      positions.push(Math.cos(t)*r,-2,Math.sin(t)*r,Math.cos(t)*r,h,Math.sin(t)*r);
      if(i<120){const a=2*i;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setIndex(indices);
    part(scene,g,new T.MeshBasicMaterial({color:silhouettes[tier],side:T.DoubleSide}),0,0,0);
  }
}

export function createWorld(scene) {
  seed=23118;
  const ground=makeTerrain(scene);
  landscapeSilhouettes(scene);
  const water=makeWater(scene);
  const g=new T.Group();
  g.userData.blocks=[];
  g.userData.solids=[];
  scene.add(g);
  const air=foliage(g);
  const decks=crossing.map(z=>bridge(g,z));
  building(g,-47,17,10,7,1,0,M.gold,'山河修理铺');
  building(g,-50,5,5,5,1,.2,M.cyan);
  building(g,-53,-58,8,7,2,-.12,M.gold,'枫桥夜渡');
  building(g,-95,-135,8,7,1,.2);
  building(g,-100,-146,5,5,1,1.5);
  building(g,-9,129,7,6,1,.15,M.gold,'汀洲');
  building(g,69,156,9,6,2,-.6,M.gold,'山河驿');
  building(g,122,-1,6,5,2,.2,M.cyan,'风语塔');
  building(g,39,-177,8,8,3,.2,M.gold,'望江楼');
  for(let i=0;i<7;i++){
    building(g,54+i*7,-108+Math.sin(i)*2,5.8,6,i%3===0?2:1,Math.PI*.05*i);
    if(i<5) building(g,53+i*8,-91+Math.cos(i)*3,5.8,5.5,1,Math.PI,M.cyan);
  }
  streetCable(g,57,-100,91,-101);
  streetCable(g,-52,10,-31,21);
  streetCable(g,65,148,53,134);
  streetCable(g,127,3,112,11);
  crossing.forEach(z=>{
    const cx=river(z), w=width(z);
    post(g,cx-w-5,terrain(cx-w-5,z-4),z-4);
    post(g,cx+w+5,terrain(cx+w+5,z+4),z+4,3,M.cyan);
  });
  for(let i=0;i<13;i++){
    const x=-39+Math.sin(i*.7)*1.8,z=23-i*.71;
    part(g,cube,M.stone,x,terrain(x,z)+.06,z,1.19,.12,.55).rotation.y=Math.sin(i)*.22;
  }
  for(const [x,z] of [[-39,21],[-43,26],[-50,24],[-48,-48],[-46,-55],[1,126]]){
    post(g,x,terrain(x,z),z,2.05);
  }
  const dockX=river(-43)-width(-43)+1;
  part(g,cube,M.wood,dockX-1.4,1.43,-43,6.1,.27,2.7);
  post(g,dockX,1.43,-43,1.66,M.cyan);
  for(let i=0;i<11;i++){
    const x=-45+Math.cos(i/11*2*Math.PI)*6.05,z=29+Math.sin(i/11*2*Math.PI)*4.5;
    part(g,pineGeometry,M.stone,x,water.pondY,z,.85,.36,.49).rotation.y=i*.91;
  }
  combineStaticMeshes(g);
  const spots=[];
  function spot(id, label,x,z,color=M.gold, lift=0, waterborne=false) {
    const y=waterborne?waterLevel:surface(x,z);
    const mark=part(g,new T.OctahedronGeometry(.14),color,x,y+.96+lift,z);
    spots.push({id,label,x,z,y,mark});
  }
  spot('gramophone','放一张唱片',-43,20);
  spot('journal','写便笺',-42,16,M.cyan);
  spot('fish','坐下看鱼',-41,28);
  spot('bell','拉绳撞钟',-47,-55);
  spot('dock','把灯借给渡口',dockX,-43,M.cyan,.6,true);
  spot('pines','坐听清泉',-86,-133);
  spot('market','接通长街灯线',65,-101,M.cyan);
  spot('ridge','启动风车',123,5,M.cyan);
  spot('lotus','放一盏水灯',river(121)-width(121)-1,121);
  spot('station','拨动驿站的时钟',64,154,M.cyan);
  spot('tower','登楼望江',38,-170);

  const relics = {};
  const lanternRing=new T.TorusGeometry(.25,.045,8,16);
  const fish=[];
  for(let i=0;i<5;i++){
    const m=new T.MeshStandardMaterial({color:[0xe29a56,0xe9c979,0xf2ddd0,0x935e4d,0xeab369][i],roughness:.62});
    const f=new T.Group();
    part(f,sphere,m,0,0,0,.38,.11,.17);
    part(f,cone,m,-.32,0,0,.13,.32,.11).rotation.z=-Math.PI/2;
    g.add(f);
    fish.push(f);
  }
  const waterPlants=new T.CylinderGeometry(1,1,.08,10);
  const pondLeaves=[];
  for(let i=0;i<12;i++){
    const a=rand()*Math.PI*2,r=.7+rand()*2.8;
    const x=-46+Math.cos(a)*r,z=28.5+Math.sin(a)*r;
    const pad=part(g,waterPlants,M.leaf2,x,water.pondY+.035,z,.32,1,.24);
    pondLeaves.push({pad,x,z});
  }
  const bench=new T.Group();
  bench.position.set(-43,terrain(-43,20)+.65,20);
  g.add(bench);
  part(bench,cube,M.wood,0,0,0,1.45,1.1,.72);
  part(bench,cylinder,M.ink,0,.57,0,.35,.06,.35);
  const disc=part(bench,cylinder,M.copper,0,.62,0,.275,.055,.275);
  const horn=part(bench,new T.CylinderGeometry(.34,.09,.52,16),M.copper,.33,.87,.13);
  horn.rotation.z=-.74;
  relics.disc=disc;
  const bell=new T.Group();
  bell.position.set(-47,terrain(-47,-55)+1.7,-55);
  g.add(bell);
  part(bell,new T.CylinderGeometry(.35,.54,.8,18),M.copper,0,0,0);
  part(bell,lanternRing,M.gold,0,-.32,0).rotation.x=Math.PI/2;
  relics.bell=bell;
  g.userData.solids.push({x:-43,z:20,r:.9},{x:123,z:5,r:.55});
  const rotor=new T.Group();
  rotor.position.set(123,terrain(123,5)+6.2,5);
  g.add(rotor);
  part(g,cylinder,M.ink,123,terrain(123,5)+2.8,5,.32,5.6,.32);
  part(rotor,cylinder,M.copper,0,0,0,.27,.48,.27).rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){
    const b=new T.Group();
    b.rotation.z=i*Math.PI/2;
    rotor.add(b);
    part(b,cube,M.tile,0,1.5,0,.47,2.8,.13);
    part(b,cube,M.cyan,.19,1.5,.10,.045,2.71,.035);
  }
  relics.rotor=rotor;
  const duskLights = [];
  for(let i=0;i<7;i++){
    const z=-90-i*3.6,x=64+i*2.8;
    duskLights.push(part(g,cube,M.cyan,x,terrain(x,z)+.16,z,2.25,.08,.16));
  }
  relics.market=duskLights;
  const riverLights = [];
  for(let i=0;i<12;i++){
    const z=99+i*3.4,x=river(z)-width(z)+3+Math.sin(i*7)*5;
    const lantern=new T.Group();
    g.add(lantern);
    part(lantern,cube,M.wood,0,0,0,.44,.13,.44);
    part(lantern,cube,M.gold,0,.18,0,.30,.32,.30);
    riverLights.push({lamp:lantern,z,x});
  }
  const birds=[];
  for(let i=0;i<8;i++){
    const bird=new T.Group();
    const left=part(bird,cone,M.ink,-.34,0,0,.14,.74,.08);
    left.rotation.z=Math.PI/2;
    const right=part(bird,cone,M.ink,.34,0,0,.14,.74,.08);
    right.rotation.z=-Math.PI/2;
    g.add(bird);
    birds.push(bird);
  }
  return { water, air, spots, fish, pondLeaves, birds, riverLights, relics, blocks:g.userData.blocks,
    solids:g.userData.solids, travelSurfaces:[ground,water.channel,...decks] };
}

export function mapPath(ctx, points, project) {
  ctx.beginPath();
  for(let i=0;i<points.length;i++){
    const [x,y]=project(...points[i]);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
}
