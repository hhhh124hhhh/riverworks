import * as T from './vendor/three.module.js';
import { atShore, createWorld, crossing, distanceToBank, isWet, mapPath, onBridge, paths, river, sites, size, surface, terrain, waterLevel, width } from './world.js';
import { drawRobot, makeRobot } from './robot.js';
import { createSound } from './audio.js';
import { routeTo } from './navigation.js';
import { createLiving } from './living.js';
import { createJourney, readJourney } from './journey.js';
import { createLastFerry, lastFerryFloor, readLastFerry } from './last-ferry.js';
import { createTraffic } from './traffic.js';
import { createExpedition } from './expedition.js';
import { createAtmosphere } from './atmosphere.js';
import { createScenery } from './scenery.js';
import { createCombat } from './combat.js';

const $=id=>document.getElementById(id);
const clamp=T.MathUtils.clamp;
const ease=T.MathUtils.smoothstep;
const tau=Math.PI*2;
const home=sites[0];
const key='riverworks-save-v1';
const labels={walker:'步行',rover:'履带',boat:'小舟',sky:'云翼'};
const speeds={walker:7.6,rover:17.6,boat:13.2,sky:19.5};
const poems={
  bell:['张继 · 枫桥夜泊','月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。','bell'],
  pines:['王维 · 山居秋暝','空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。','pines'],
  lotus:['李清照 · 如梦令','兴尽晚回舟，误入藕花深处。\n争渡，争渡，惊起一滩鸥鹭。','lotus'],
  tower:['孟浩然 · 宿建德江','移舟泊烟渚，日暮客愁新。\n野旷天低树，江清月近人。','jiande']
};
const records=['见山','雨后','河边的下午','山河诗图'];
const recordings=new Audio();
const recordAudio=new Audio();
recordAudio.loop=true;
let customRecord=null;
let recordObjectUrl=null;
const times=[{value:.055,name:'黎明'},{value:.30,name:'白昼'},{value:.59,name:'落灯'},{value:.78,name:'夜泊'}];
const namesByBearing=['北','东北','东','东南','南','西南','西','西北'];
const cameraOffset=new T.Vector3(), headingTarget=new T.Vector3(), target=new T.Vector3();
const dayFog=new T.Color(0xa3b6aa), nightFog=new T.Color(0x183743), duskFog=new T.Color(0x7c8e84), underwaterFog=new T.Color(0x073f49), skyPearl=new T.Color(0xd8d5b8);
const skyDay=new T.Color(0x899f9e), skyNight=new T.Color(0x0c2234);
const lightDay=new T.Color(0xffead1), lightNight=new T.Color(0x9bbedc);

function readSave() {
  try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}
}
const saved=readSave();
const remembered=new Set(Array.isArray(saved.visited)?saved.visited:[]);
const rememberedMoments=new Set(Array.isArray(saved.moments)?saved.moments:[]);
const savedPosition = Number.isFinite(saved.x)&&Number.isFinite(saved.z);
const start= savedPosition ? {
  x:clamp(saved.x,-size.x+1,size.x-1),
  z:clamp(saved.z,-size.z+1,size.z-1)
} : home;
const legacy=Object.keys(saved).length>0;
const unlocked={
  rover:typeof saved.parts?.rover==='boolean'?saved.parts.rover:legacy,
  boat:typeof saved.parts?.boat==='boolean'?saved.parts.boat:legacy,
  sky:saved.parts?.sky===true,
  dive:saved.parts?.dive===true
};
const lastFerry=readLastFerry(saved.lastFerry);
const specialFloor=lastFerryFloor(lastFerry,start.x,start.z);
const afloatAtStart=unlocked.boat&&specialFloor===null&&isWet(start.x,start.z)&&(saved.form==='boat'||!onBridge(start.x,start.z));
const form=afloatAtStart?'boat':saved.form==='sky'&&unlocked.sky?'sky':saved.form==='rover'&&unlocked.rover?'rover':'walker';
const state={
  x:start.x,z:start.z,y:form==='boat'?waterLevel:form==='sky'?surface(start.x,start.z)+12:(specialFloor??surface(start.x,start.z)),heading:1.87,
  form, parts:unlocked, dive:false, expedition:saved.expedition&&typeof saved.expedition==='object'?saved.expedition:{found:[]},
  fold:[form,form,1], stride:0, motion:0, rest:null, look:0,
  clock:Number.isFinite(saved.clock)?((saved.clock%1)+1)%1:.62,
  lamp:['arm','hand','dock'].includes(saved.lamp)?saved.lamp:'arm',lampOn:saved.lampOn!==false,
  echo:['body','hand','ridge'].includes(saved.echo)?saved.echo:'body',
  note:typeof saved.note==='string'?saved.note.slice(0,800):'', waypoint:null,
  trackedObjective:typeof saved.trackedObjective==='string'?saved.trackedObjective:null,
  combat:{essence:Number.isFinite(saved.combat?.essence)?saved.combat.essence:0},
  guideObjective:saved.guideObjective===true,
  journey:readJourney(saved.journey),
  lastFerry,
  playing:false, record:0, bellAt:-99, birdsAt:-99, waterLightAt:-99, market:Boolean(saved.market),
  started:false, freeze:!!saved.freeze, volume:Number.isFinite(saved.volume)?clamp(saved.volume,0,1):.55,
  scale:[.75,1,1.4].includes(saved.scale)?saved.scale:1
};

function save() {
  try{
    const {x,z,form,clock,lamp,lampOn,echo,note,freeze,volume,scale,market,journey,lastFerry,trackedObjective,guideObjective,parts,expedition,combat}=state;
    localStorage.setItem(key,JSON.stringify({x,z,form,clock,lamp,lampOn,echo,note,freeze,volume,scale,market,journey,lastFerry,trackedObjective,guideObjective,parts,expedition,combat,visited:[...remembered],moments:[...rememberedMoments]}));
  }catch{}
}

const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-hidden','true');
$('stage').append(renderer.domElement);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,610);
const scene=new T.Scene();
const horizon=new T.Color(0x576e70);
scene.fog=new T.Fog(horizon,55,246);
const world=createWorld(scene);
const living=createLiving(scene);
world.water.uniforms.reflections.value=living.reflections;
const robot=makeRobot(scene);
const sound=createSound();
sound.setVolume(state.volume);
const journey=createJourney(scene,state,{
  save,toast,showDialog,waypoint:(point,manual=false)=>setWaypoint(point,manual),tick:()=>sound.play('tick'),legal,trackObjective,announce,
  pointToAftercare:()=>ferry.pointToAftercare(),
  poem:id=>{
    if(id==='lotus'){
      state.birdsAt=t;
      state.waterLightAt=t;
      sound.play('bird');
    }
    showPoem(id);
  }
});
const ferry=createLastFerry(scene,state,{
  save,toast,showDialog,waypoint:point=>setWaypoint(point,false),tick:()=>sound.play('tick'),trackObjective,
  night:()=>setTime(times[3]),otherHaul:()=>journey.hasLoad
});
const traffic=createTraffic(scene,state);
const expedition=createExpedition(scene,state,{save,toast,announce,updateForms,showDialog});
const atmosphere=createAtmosphere(scene,state);
const scenery=createScenery(scene,state);
const combat=createCombat(scene,state,{toast,save,onDefeat:name=>{goHome();toast('机芯暂时失去动力，已返回工坊。'+name+'仍在原处。');}});
world.solids.push({x:65,z:155,r:2.4},{x:-112,z:-145,r:1.5},{x:-83,z:-146,r:1.3},{x:-111,z:-120,r:1.3},{x:-12,z:139,r:5.2});
const interactionSpots=[...world.spots,...journey.spots,...ferry.spots,...expedition.spots];
const ambient=new T.HemisphereLight(0xcbd9d0,0x534840,2.06);
const sun=new T.DirectionalLight(0xffe1a4,2.4);
sun.position.set(-35,48,12);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:145});
sun.shadow.bias=-.0004;
scene.add(ambient,sun,sun.target);
scene.traverse(object=>{if(object.isMesh&&!object.material?.transparent){object.castShadow=true;object.receiveShadow=true;}});
for(const [x,z,color,intensity] of [[-42,20,0xffac5b,24],[-46,-51,0xffb777,28],[-38,-43,0x56e3ed,19],[64,-102,0x65e3de,23]]){
  const glow=new T.PointLight(color,intensity,12,2);
  glow.position.set(x,surface(x,z)+2.6,z);
  scene.add(glow);
}
const groundShade=new T.Mesh(new T.PlaneGeometry(3.2,2.5),new T.ShaderMaterial({
  transparent:true,depthWrite:false,
  vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 p;void main(){float e=length((p-.5)*2.);gl_FragColor=vec4(.045,.073,.069,.50*(1.-smoothstep(.12,.94,e)));}'
}));
groundShade.rotation.x=-Math.PI/2;
scene.add(groundShade);

const skyUniforms={high:{value:new T.Color()},low:{value:horizon},night:{value:.5},clock:{value:0}};
const sky=new T.Mesh(new T.SphereGeometry(480,36,18),new T.ShaderMaterial({
  side:T.BackSide,depthWrite:false,uniforms:skyUniforms,
  vertexShader:`
    varying vec3 ray;
    void main() {ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `,
  fragmentShader:`
    varying vec3 ray;
    uniform vec3 low;
    uniform vec3 high;
    uniform float night;
    uniform float clock;
    float hash(vec2 p) {return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main() {
      vec3 d=normalize(ray);
      vec3 col=mix(low,high,pow(max(d.y,0.0),.42));
      vec2 cloud=vec2(atan(d.z,d.x)*2.7,d.y*24.0);
      cloud.x-=clock*.072;
      float billow=sin(cloud.x*1.8+sin(cloud.y*.63))
        +.58*sin(cloud.x*3.1+cloud.y*.85)+.28*sin(cloud.x*7.1-cloud.y*1.4);
      float veil=smoothstep(-.18,.98,billow)*smoothstep(.05,.18,d.y)*(1.0-smoothstep(.22,.49,d.y));
      col=mix(col,col+mix(vec3(.18,.17,.12),vec3(.052,.064,.067),night),veil*.7);
      vec3 direction=normalize(vec3(-.66,.31,-.60));
      float moon=max(0.0,dot(d,direction));
      col+=vec3(.41,.40,.27)*pow(moon,26.0)*(.35+night*.5);
      col+=vec3(.70,.63,.47)*smoothstep(.99948,.99964,moon);
      vec2 uv=vec2(atan(d.z,d.x),d.y)*250.0;
      vec2 u=fract(uv)-.5;
      float star=step(.996,hash(floor(uv)))*(1.0-smoothstep(.015,.14,length(u)));
      col+=star*night*smoothstep(.06,.3,d.y)*vec3(.55,.62,.66);
      gl_FragColor=vec4(col,1.0);
      #include <colorspace_fragment>
    }
  `
}));
scene.add(sky);

const dock=world.spots.find(s=>s.id==='dock');
const ridge=world.spots.find(s=>s.id==='ridge');
const input=new Set();
const mapCtx=$('map').getContext('2d');
const mapX=410,mapZ=285;
const project=(x,z)=>[mapX+x*1.42,mapZ+z];
let azimuth=1.08,elevation=.31,zoom=12.2,cameraYaw=1.08,cameraPitch=.31,cameraDistance=10,cameraClearance=1,lastUpdraft=-99,lastCurrent=-99;
let cameraMode=0,cameraDrag=null,near=null,currentPoem=null,t=0,toastUntil=0,lastSave=0,lastTime=0,regionId=null;
let filmShot=null;
if(new URLSearchParams(location.search).has('film'))window.__shanheFilm=shot=>{
  filmShot=shot;
  Object.assign(state,{x:shot.x,y:shot.y,z:shot.z,heading:shot.heading??state.heading,form:shot.form??'sky',dive:shot.dive??false,fold:[shot.form??'sky',shot.form??'sky',1],motion:1});
};
let route=[];
const ray=new T.Raycaster();
const pointer=new T.Vector2();
const destination=new T.Mesh(
  new T.RingGeometry(.44,.56,36).rotateX(-Math.PI/2),
  new T.MeshBasicMaterial({color:0xfce0a5,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide})
);
destination.visible=false;
scene.add(destination);

function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)*state.scale);
  renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
resize();

function toast(text) {
  $('toast').textContent=text;
  $('toast').classList.add('visible');
  toastUntil=t+3.7;
}
let announcementTimer=null;
function announce(title,detail,kicker='路线恢复') {
  $('route-banner').querySelector('small').textContent=kicker;
  $('route-banner-title').textContent=title;
  $('route-banner-detail').textContent=detail;
  $('route-banner').hidden=false;
  clearTimeout(announcementTimer);
  announcementTimer=setTimeout(()=>$('route-banner').hidden=true,4600);
}
function updateForms() {
  document.querySelectorAll('[data-form]').forEach(button=>{
    const selected=button.dataset.form===state.form;
    button.classList.toggle('selected',selected);
    button.classList.toggle('locked',button.dataset.form!=='walker'&&!state.parts[button.dataset.form]);
    button.setAttribute('aria-pressed',selected);
  });
}
function fold(next) {
  if(!state.started||state.form===next||state.fold[2]<1)return;
  if(next!=='walker'&&!state.parts[next]){
    const clues={rover:'先在工坊附近找到当康的山地轮。',boat:'文鳐古渡附近似乎留着文鳐的浮舟骨。',sky:'云翼的共鸣来自应龙山脊。'};
    toast(clues[next]??'还没有找到对应的机芯。');return;
  }
  if(ferry.controlsCar){toast('先把视角切回机器人。');return;}
  if(ferry.passenger){toast('先把乘客和药篮送上西岸。');return;}
  if(ferry.hasTow){toast('先把浮板推进滑槽，或在夜渡面板解开牵引。');return;}
  if(next==='rover'&&ferry.wheelOut){toast('一只轮组在报讯小车上。敲响报讯铃后即可换回履带。');return;}
  if(journey.hasLoad){toast('先把拖着的载物安置好，再变形。也可以在委托重置载物。');return;}
  let {x,z}=state;
  if(ferry.footSurface(x,z)!==null&&(next==='rover'||next==='boat')){
    toast('先沿浮桥回岸边，再更换形态。');
    return;
  }
  const side=Math.sign(x-river(z))||1;
  if(next==='boat'){
    if(!atShore(x,z)||onBridge(x,z)){
      toast('到低岸边下水。石桥两侧都有下水的地方。');
      return;
    }
    x=river(z)+side*(width(z)-5.4);
  }else if(state.form==='boat'){
    if(!atShore(x,z)){
      toast('先靠近岸边，再展开双腿。');
      return;
    }
    if(crossing.some(b=>Math.abs(b-z)<3.3))z+=4.4;
    x=river(z)+side*(width(z)+3.4);
  }
  state.foldFrom={x:state.x,y:state.y,z:state.z};
  state.x=x;
  state.z=z;
  cancelRoute();
  state.rest=null;
  state.fold=[state.form,next,0];
  if(next!=='boat')state.dive=false;
  state.form=next;
  if(next==='sky')state.y=Math.max(state.y,surface(state.x,state.z)+5);
  state.motion=0;
  sound.play('fold');
  updateForms();
  if(next==='boat'&&state.lamp==='arm')toast('肩灯扣到船头，沿河向任意一边划。');
  save();
}
function showDialog(id) {
  if(!state.started)return;
  input.clear();
  cancelRoute();
  if(id==='map-dialog')drawMap();
  if(id==='bench-dialog')renderModules();
  if(id==='journal-dialog')$('note').value=state.note;
  if(!$(id).open)$(id).showModal();
}
function paused() {return Boolean(document.querySelector('dialog[open]'));}
function renderModules() {
  const list=$('modules');
  list.replaceChildren();
  const lampPos={arm:state.form==='boat'?'已安装在船头':'已安装在肩部',hand:'握在手里',dock:'留在文鳐古渡'};
  const echoPos={body:'已安装在背部',hand:'握在手里',ridge:'留在应龙山脊'};
  function row(name,desc,label,action,disabled=false) {
    const item=document.createElement('div'), copy=document.createElement('div'), title=document.createElement('strong'), note=document.createElement('small'), button=document.createElement('button');
    item.className='module-row';
    title.textContent=name;note.textContent=desc;button.textContent=label;button.disabled=disabled;
    button.addEventListener('click',action);
    copy.append(title,note);item.append(copy,button);list.append(item);
  }
  row('琥珀渡灯',lampPos[state.lamp],state.lamp==='arm'?'卸下来':state.lamp==='hand'?'扣回机身':'在渡口取回',()=>{
    state.lamp=state.lamp==='arm'?'hand':'arm';sound.play('tick');save();renderModules();
  },state.lamp==='dock');
  row('灯芯',state.lampOn?'暖光已点亮':'灯已熄灭',state.lampOn?'熄灯':'点灯',()=>{
    state.lampOn=!state.lampOn;save();renderModules();
  });
  row('回声芯',ferry.wheelOut?'正在给报讯小车供电':echoPos[state.echo],
    ferry.wheelOut?'小车在用':state.echo==='body'?'卸下来':state.echo==='hand'?'扣回机身':'在山脊取回',()=>{
    state.echo=state.echo==='body'?'hand':'body';sound.play('tick');save();renderModules();
  },state.echo==='ridge'||ferry.wheelOut);
}

function setTime(next) {
  state.clock=next.value;
  updateClock();
  sound.play('tick');
  save();
}
function getTime() {
  const h=state.clock;
  return h<.16?times[0]:h<.53?times[1]:h<.68?times[2]:times[3];
}
function advanceTime() {
  const i=times.indexOf(getTime());
  setTime(times[(i+1)%times.length]);
}
function showPoem(id) {
  stopReading();
  currentPoem=poems[id];
  $('poem-title').textContent=currentPoem[0];
  $('poem-lines').textContent=currentPoem[1];
  $('poem').hidden=false;
}
function stopReading() {
  recordings.pause();
  $('read-poem').textContent='听诗';
  $('poem').hidden=true;
}
function syncRecord() {
  if(!state.playing||!sound.enabled||state.record<3){
    recordAudio.pause();
    return;
  }
  const src=state.record===3?new URL('./audio/shanhe-theme.mp3',location.href).href:recordObjectUrl;
  if(src&&recordAudio.src!==src)recordAudio.src=src;
  recordAudio.volume=state.volume*.71;
  recordAudio.play().catch(()=>toast('这张唱片无法播放。'));
}
function swapRecord() {
  state.record=(state.record+1)%(records.length+Number(Boolean(customRecord)));
  sound.setTrack(state.record);
  syncRecord();
  toast('换了一张唱片 · '+(records[state.record]??customRecord));
}
function interact() {
  if(!near||paused()||state.fold[2]<1)return;
  const id=near.id;
  rememberedMoments.add(id);
  if(near.act){
    cancelRoute();
    near.act();
    return;
  }
  switch(id){
    case 'gramophone':
      state.playing=!state.playing;
      if(state.playing&&!sound.enabled)changeSound(true);
      syncRecord();
      toast(state.playing?'唱片正在播放 · '+(records[state.record]??customRecord):'唱针已抬起。');
      break;
    case 'record':swapRecord();break;
    case 'journal':showDialog('journal-dialog');break;
    case 'fish':
      state.rest=state.rest==='fish'?null:'fish';
      if(state.rest)toast('坐一会儿。移动可以起身。');
      break;
    case 'bell':
      state.bellAt=t;
      sound.play('bell');
      showPoem(id);
      break;
    case 'dock':
      if(state.lamp==='dock'){
        state.lamp='hand';
        toast('灯还暖着。按 Q 可以扣回机身。');
      }else if(state.lamp==='hand'){
        state.lamp='dock';
        state.lampOn=true;
        toast('你把灯借给了渡口。随时可以取回。');
      }else{
        toast('先按 Q 拆下渡灯，再挂到灯桩。');
      }
      sound.play('tick');
      break;
    case 'pines':
      state.rest=state.rest==='pines'?null:'pines';
      showPoem(id);
      break;
    case 'ridge':
      if(ferry.wheelOut){toast('回声芯正在给报讯小车供电。');break;}
      if(state.echo==='ridge'){
        state.echo='hand';
        toast('回声芯已取回。风车慢了下来。');
      }else if(state.echo==='hand'){
        state.echo='ridge';
        toast('回声芯接通了风车。转动的叶片把灯光送向了山脊。');
        journey.powered();
      }else{
        toast('按 Q 卸下回声芯，再把它插到风车上。');
      }
      sound.play('tick');
      break;
    case 'market':
      state.market=!state.market;
      sound.play('tick');
      toast(state.market?'灯线一道一道亮了起来。':'长街的灯线歇下了。');
      break;
    case 'lotus':
      state.birdsAt=t;
      state.waterLightAt=t;
      sound.play('bird');
      showPoem(id);
      break;
    case 'station':advanceTime();break;
    case 'tower':
      state.rest=state.rest==='tower'?null:'tower';
      showPoem(id);
      break;
  }
  save();
}

function updateClock() {
  const name=getTime().name;
  if($('time-label').textContent!==name)$('time-label').textContent=name;
  const id=regionId;
  const weather=id==='pines'?'雨后':id==='ridge'?'起风':state.clock>.68?'薄雾':'江风';
  if($('weather-label').textContent!==weather)$('weather-label').textContent=weather;
}
function cameraUpdate(dt) {
  if(state.started&&filmShot){
    camera.position.set(filmShot.cx,filmShot.cy,filmShot.cz);
    camera.lookAt(filmShot.tx,filmShot.ty,filmShot.tz);
    if(camera.fov!==filmShot.fov){camera.fov=filmShot.fov??48;camera.updateProjectionMatrix();}
  }else if(!state.started){
    const h=surface(-40,25);
    const wide=camera.aspect>1.18;
    camera.position.set(-67+Math.sin(t*.08)*.45,h+7.0,51);
    camera.lookAt(wide?-31:-40,h+5.4,wide?19:25);
  }else{
    const factor=1-Math.exp(-dt*8);
    const desiredFov=state.dive?45:state.form==='sky'?54:state.form==='rover'?50:48;
    if(Math.abs(camera.fov-desiredFov)>.01){camera.fov+=(desiredFov-camera.fov)*factor;camera.updateProjectionMatrix();}
    cameraYaw+=Math.atan2(Math.sin(azimuth-cameraYaw),Math.cos(azimuth-cameraYaw))*factor;
    const beneathBridge=state.form==='boat'&&onBridge(state.x,state.z);
    cameraPitch+=((state.dive||beneathBridge?.12:elevation)-cameraPitch)*factor;
    const pilot=ferry.cameraPoint;
    const desired=pilot?6.6:state.dive?6.2:beneathBridge?4.4:state.rest==='tower'?12:state.form==='sky'?(cameraMode===0?zoom*1.18:cameraMode===1?5.2:23):cameraMode===0?zoom:cameraMode===1?3.1:19;
    cameraDistance+=(desired-cameraDistance)*factor;
    const lift=state.rest==='tower'?11:state.rest==='fish'||state.rest==='pines'?1.1:state.dive?.45:beneathBridge?.65:state.form==='sky'?.8:state.form==='boat'?1.14:1.67;
    if(pilot)target.set(pilot.x,pilot.y+.5,pilot.z);
    else target.set(state.renderX??state.x,(state.renderY??state.y)+lift,state.renderZ??state.z);
    let clear=1;
    for(let step=1;step<=20;step++){
      const amount=step/20;
      const x=target.x+Math.sin(cameraYaw)*Math.cos(cameraPitch)*cameraDistance*amount;
      const y=target.y+Math.sin(cameraPitch)*cameraDistance*amount;
      const z=target.z+Math.cos(cameraYaw)*Math.cos(cameraPitch)*cameraDistance*amount;
      const blocked=world.blocks.some(b=>{
        const dx=x-b.x,dz=z-b.z;
        return y<terrain(b.x,b.z)+b.h+.45
          &&Math.abs(dx*Math.cos(b.angle)-dz*Math.sin(b.angle))<b.w*.5+.4
          &&Math.abs(dx*Math.sin(b.angle)+dz*Math.cos(b.angle))<b.d*.5+.4;
      });
      if(blocked){clear=Math.max(.12,(step-1)/20);break;}
    }
    cameraClearance+=(clear-cameraClearance)*(clear<cameraClearance?1:1-Math.exp(-dt*4));
    cameraOffset.set(
      Math.sin(cameraYaw)*Math.cos(cameraPitch)*cameraDistance*cameraClearance,
      Math.sin(cameraPitch)*cameraDistance*cameraClearance,
      Math.cos(cameraYaw)*Math.cos(cameraPitch)*cameraDistance*cameraClearance
    );
    camera.position.copy(target).add(cameraOffset);
    camera.position.y=Math.max(camera.position.y,terrain(camera.position.x,camera.position.z)+.55,state.dive?-Infinity:waterLevel+.32);
    if(state.form!=='boat'&&onBridge(camera.position.x,camera.position.z))camera.position.y=Math.max(camera.position.y,5.5);
    camera.lookAt(target);
  }
  sky.position.copy(camera.position);
}

function circlesBlocked(x,z,circles,clearance) {
  return circles.some(circle=>{
    const distance=Math.hypot(x-circle.x,z-circle.z);
    if(distance>=circle.r+clearance)return false;
    return distance<Math.hypot(state.x-circle.x,state.z-circle.z);
  });
}
function legal(x,z,form) {
  if(Math.abs(x)>size.x||Math.abs(z)>size.z)return false;
  if(form==='sky')return true;
  const ferryAccess=ferry.canPass(x,z,form);
  if(ferryAccess!==null)return ferryAccess;
  if(!journey.canPass(x,z,form))return false;
  if(form==='boat')return isWet(x,z);
  if(onBridge(x,z))return true;
  if(isWet(x,z))return false;
  if(world.blocks.some(b=>{
    const dx=x-b.x,dz=z-b.z;
    if(Math.abs(dx)>b.w||Math.abs(dz)>b.d)return false;
    return Math.abs(dx*Math.cos(b.angle)-dz*Math.sin(b.angle))<b.w*.5+.22
      &&Math.abs(dx*Math.sin(b.angle)+dz*Math.cos(b.angle))<b.d*.5+.22;
  }))return false;
  if(form==='rover'&&z<-119&&z>-147&&x<-78&&x>-99)return false;
  const clearance=form==='rover'?.52:.30;
  if(circlesBlocked(x,z,world.solids,clearance))return false;
  if(circlesBlocked(x,z,journey.obstacles,clearance))return false;
  if(circlesBlocked(x,z,ferry.obstacles,clearance))return false;
  if(circlesBlocked(x,z,expedition.obstacles,clearance))return false;
  return true;
}
function cancelRoute() {
  route=[];
  destination.visible=false;
}
function selectDestination(e) {
  if(paused()||state.fold[2]<1)return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
  ray.setFromCamera(pointer,camera);
  const [hit]=ray.intersectObjects([...world.travelSurfaces,...ferry.travelSurfaces],false);
  if(near?.mark){
    const [marker]=ray.intersectObject(near.mark,false);
    if(marker&&(!hit||marker.distance<hit.distance)){cancelRoute();interact();return;}
  }
  if(!hit)return;
  if(ferry.controlsCar){ferry.selectCar(hit.point);return;}
  const {x,z}=hit.point;
  const form=state.form;
  cancelRoute();
  const planned=routeTo({x:state.x,z:state.z},{x,z},(px,pz)=>legal(px,pz,form));
  if(!planned){
    if(form==='boat')toast('点水面前进，靠岸后可切换到步行。');
    else if(isWet(x,z)&&!onBridge(x,z))toast('可以点桥面过江，也可以走到低岸变成小舟。');
    else toast('这里走不到，试试点旁边的路。');
    return;
  }
  route=planned;
  destination.position.set(x,form==='boat'?waterLevel+.065:(ferry.footSurface(x,z)??surface(x,z))+.14,z);
  destination.visible=true;
}

function move(dt) {
  if(state.form!=='sky'&&state.form!=='boat'&&state.parts.sky&&atmosphere.updraftAt(state.x,state.z)){
    fold('sky');
    toast('气旋接住了你，云翼自动展开。');
  }
  if(state.form==='boat'&&state.dive&&input.has('Space'))state.dive=false;
  if(state.fold[2]<1)state.fold[2]=clamp(state.fold[2]+dt/.99,0,1);
  const forward=(input.has('KeyW')||input.has('ArrowUp')?1:0)-(input.has('KeyS')||input.has('ArrowDown')?1:0);
  const side=(input.has('KeyD')||input.has('ArrowRight')?1:0)-(input.has('KeyA')||input.has('ArrowLeft')?1:0);
  if(ferry.controlsCar){
    state.motion=0;
    if(state.started&&!paused()){
      ferry.drive(dt,-Math.sin(azimuth)*forward+Math.cos(azimuth)*side,-Math.cos(azimuth)*forward-Math.sin(azimuth)*side);
    }
    return;
  }
  const manual=Boolean(forward||side);
  const active=(manual||route.length)&&state.started&&!paused()&&state.fold[2]===1;
  let moved=0;
  if(active){
    state.rest=null;
    const heading=azimuth+Math.PI;
    let x=state.x,z=state.z, vx,vz;
    const current=expedition.speedMultiplier;
    const step=speeds[state.form]*journey.speedMultiplier*ferry.speedMultiplier*current*dt;
    if(current>1&&t-lastCurrent>8){lastCurrent=t;toast('夔牛的雷声推动了小舟。涟漪范围内航行更快。');}
    if(manual){
      cancelRoute();
      const scale=step/Math.hypot(forward,side);
      vx=(Math.sin(heading)*forward+Math.cos(azimuth)*side)*scale;
      vz=(Math.cos(heading)*forward-Math.sin(azimuth)*side)*scale;
    }else{
      const dx=route[0].x-x,dz=route[0].z-z;
      const distance=Math.hypot(dx,dz);
      const scale=distance>step?step/distance:1;
      vx=dx*scale;
      vz=dz*scale;
    }
    if(legal(x+vx,z+vz,state.form)){
      state.x+=vx;state.z+=vz;
    }else if(manual&&legal(x+vx,z,state.form)){
      state.x+=vx;
    }else if(manual&&legal(x,z+vz,state.form)){
      state.z+=vz;
    }else if(!manual){
      cancelRoute();
    }
    moved=Math.hypot(state.x-x,state.z-z);
    if(!manual&&route.length&&Math.hypot(route[0].x-state.x,route[0].z-state.z)<.00001){
      route.shift();
      if(!route.length){cancelRoute();save();}
    }
    if(manual&&moved<.001&&t-lastTime>2){
      lastTime=t;
      if(state.form==='boat')toast('靠岸了。切换到步行就可以上岸。');
      else if(isWet(x+vx,z+vz))toast('前面是水。在低岸可以变成小舟。');
      else if(state.form==='rover'&&x<-78&&z<-119)toast('松谷的石阶较窄，切换到步行进入。');
    }
    if(moved>.001){
      const desired=Math.atan2(state.x-x,state.z-z);
      state.heading+=Math.atan2(Math.sin(desired-state.heading),Math.cos(desired-state.heading))*(1-Math.exp(-dt*11));
    }
  }
  const moving=clamp(moved/(dt*speeds[state.form]),0,1);
  state.motion+=(moving-state.motion)*(1-Math.exp(-dt*12));
  state.stride+=moved*(state.form==='walker'?2.05:.95);
  if(state.form==='sky'){
    const lift=(input.has('Space')?1:0)-(input.has('KeyC')?1:0);
    const rising=atmosphere.updraftAt(state.x,state.z);
    state.y=clamp(state.y+(lift*10.5+(rising?7.5:0))*dt,surface(state.x,state.z)+2.4,86);
    if(rising&&t-lastUpdraft>8){lastUpdraft=t;toast('瀑布下的回流托起了云翼。保持在气柱里就能持续升高。');}
  }else{
    const ground=state.form==='boat'?(state.dive?Math.max(terrain(state.x,state.z)+1.15,waterLevel-5.0):waterLevel):(ferry.footSurface(state.x,state.z)??surface(state.x,state.z));
    state.y+=(ground-state.y)*(1-Math.exp(-dt*(state.dive?3.5:9)));
  }
}

function updatePlace() {
  let spot=null, closest=Infinity;
  const controlled=ferry.cameraPoint??state;
  for(const s of interactionSpots){
    if((s.vehicle==='car')!==ferry.controlsCar)continue;
    if(s.available&&!s.available())continue;
    const d=Math.hypot(s.x-controlled.x,s.z-controlled.z);
    if(d<closest&&d<(s.reach??4.7)){closest=d;spot=s;}
  }
  if(spot?.id==='gramophone'&&input.has('ShiftLeft'))spot={...spot,id:'record',label:'换一张唱片'};
  near=spot;
  $('prompt').hidden=!near||!state.started;
  $('record-swap').hidden=near?.id!=='gramophone';
  if(near){
    let label=near.label;
    if(near.id==='dock'&&state.lamp==='dock')label='取回渡灯';
    if(near.id==='ridge'&&state.echo==='ridge')label='取回回声芯';
    if(near.id==='gramophone'&&state.playing)label='抬起唱针';
    if(near.id==='fish'&&state.rest==='fish')label='起身';
    if($('use').lastElementChild.textContent!==label)$('use').lastElementChild.textContent=label;
  }
  let region=null,dist=48;
  for(const s of sites){
    const d=Math.hypot(s.x-state.x,s.z-state.z);
    if(d<dist){dist=d;region=s;}
  }
  if((region?.id||null)!==regionId||!$('region').textContent){
    regionId=region?.id||null;
    $('region').textContent=region?.name||(state.form==='boat'?'江心水道':'河谷山路');
    updateClock();
  }
  if(region&&dist<18&&state.started&&!remembered.has(region.id)){
    remembered.add(region.id);
    if(region.id!=='home')toast('走到了 · '+region.name);
    save();
  }
  if(state.waypoint){
    const s=state.waypoint,dx=s.x-controlled.x,dz=s.z-controlled.z;
    const degrees=(Math.atan2(dx,-dz)+tau)/tau;
    $('bearing').textContent=namesByBearing[Math.round(degrees*8)%8]+' · '+s.name;
    $('distance').textContent=Math.hypot(dx,dz)<7?'已到附近':Math.round(Math.hypot(dx,dz))+' 米';
  }
}

function updateWorld(dt) {
  if(state.started&&!state.freeze&&!paused())state.clock=(state.clock+dt/840)%1;
  const h=state.started?state.clock:.635;
  const daylight=ease(h,.018,.24)*(1-ease(h,.49,.77));
  const dark=1-daylight;
  const dusk=Math.max(0,1-Math.abs(h-.604)*11);
  const gust=.50+.27*Math.sin(t*.46)+.17*Math.sin(t*.94+.9);
  horizon.copy(nightFog).lerp(dayFog,daylight).lerp(duskFog,dusk*.69);
  const submerged=state.started&&state.form==='boat'&&state.dive;
  if(submerged)horizon.lerp(underwaterFog,.82);
  else if(state.form==='sky')horizon.lerp(skyPearl,ease(state.y,12,42)*daylight*.42);
  scene.fog.color.copy(horizon);
  document.body.classList.toggle('underwater',submerged);
  renderer.toneMappingExposure=submerged?.72:1.15;
  skyUniforms.high.value.copy(skyNight).lerp(skyDay,daylight);
  skyUniforms.night.value=dark;
  skyUniforms.clock.value=t;
  ambient.intensity=.93+daylight*1.65+dusk*.22;
  sun.intensity=(.66+daylight*2.15+dusk*.48)*(1+.043*Math.sin(t*.35)+.023*Math.sin(t*.81));
  sun.color.copy(lightNight).lerp(lightDay,daylight+dusk*.12);
  world.water.uniforms.clock.value=t;
  world.water.uniforms.dark.value=dark;
  world.water.uniforms.gust.value=gust;
  world.water.uniforms.moon.value.set(-.52,.34,-.78).normalize();
  world.water.uniforms.lamp.value.copy(robot.lamp.position);
  world.water.uniforms.shines.value=(state.started?state.lampOn:true)?1:0;
  world.air.clock.value=t;
  world.air.gust.value=gust;
  living.update(t,daylight,gust);
  world.spots.forEach(({mark,y,id})=>{
    mark.position.y=y+.91+Math.sin(t*2.2+id.length)*.15;
    mark.rotation.y=t*.83+id.length;
    mark.scale.setScalar(near?.id===id?1.28:.85);
  });
  for(let i=0;i<world.fish.length;i++){
    const fish=world.fish[i], ripple=world.water.uniforms.rings.value[i];
    const phase=t*(.3+i*.07)+i*1.6,r=1+i*.49;
    const stroke=.072*Math.sin(t*2.4+i);
    const x=-45+Math.cos(phase+stroke)*r,z=29+Math.sin(phase+stroke)*r*.81;
    const cycle=Math.floor((t+i*.71)/(2.1+i*.26));
    fish.position.set(x,world.water.pondY+.045+Math.sin(phase*2)*.027,z);
    fish.rotation.y=-Math.PI/2-phase+stroke;
    fish.children[1].rotation.y=Math.sin(t*5.6+i)*.43;
    if(fish.userData.strokeCycle!==cycle){
      fish.userData.strokeCycle=cycle;
      ripple.set(x,z,0,.82);
    }else{
      ripple.z+=dt;
    }
  }
  world.pondLeaves.forEach(({pad,x,z},i)=>{
    const wave=t*1.6+i*.71;
    pad.position.set(x+.16*Math.cos(wave*.72),world.water.pondY+.04+.025*Math.sin(wave),z+.18*Math.sin(wave*.66));
    pad.rotation.set(.09*Math.sin(wave),i*.63+t*.16,.09*Math.cos(wave));
  });
  for(let i=0;i<world.birds.length;i++){
    const f=world.birds[i], d=t-state.birdsAt, phase=t*.28+i*.43;
    const fly=d<12?d*.85:0;
    f.position.set(river(123)-14+Math.sin(phase)*10+fly*1.3,3.1+i*.16+(d<12?Math.sin(d*.24)*4:0),123+Math.cos(phase)*13-fly);
    f.rotation.y=phase+1.4;
    f.children[0].rotation.x=Math.sin(t*8+i)*.45;
    f.children[1].rotation.x=-f.children[0].rotation.x;
  }
  for(let i=0;i<world.riverLights.length;i++){
    const {lamp,z,x}=world.riverLights[i];
    const age=t-state.waterLightAt;
    lamp.visible=age<38&&age>=i*.3;
    lamp.position.set(x+Math.sin(t+i)*.28,waterLevel+.035+Math.sin(t*2+i)*.025,z+age*.35);
  }
  const age=t-state.bellAt;
  world.relics.bell.rotation.z=age<8?Math.sin(age*4.9)*.32*Math.exp(-age*.52):0;
  world.relics.rotor.rotation.z-=dt*(state.echo==='ridge'?1.48:.12);
  if(state.playing)world.relics.disc.rotation.y+=dt*1.9;
  world.relics.market.forEach((m,i)=>{m.visible=Boolean(state.market)&&(Math.sin(t*1.1-i*.25)>.04||i%2===0);});
  updateClock();
  sound.update({
    bank:regionId==='pines'?Math.hypot(state.x+82,Math.max(0,Math.abs(state.z+133)-18)):distanceToBank(state.x,state.z),
    speed:state.motion,boat:state.form==='boat',gust,
    height:state.y,playing:state.playing&&state.record<3,recordNear:1/(1+Math.hypot(state.x-home.x,state.z-home.z)*.026),time:t
  });
}

function drawMap() {
  const ctx=mapCtx;
  ctx.fillStyle='#1e3634';ctx.fillRect(0,0,820,575);
  ctx.save();
  for(let z=-230;z<=230;z+=5){
    for(let x=-202;x<=202;x+=5){
      const a=terrain(x,z);
      if(a<waterLevel)continue;
      ctx.fillStyle=a<3?'#526b56':a<6?'#48604e':a<10?'#3b574a':'#304b43';
      const [px,py]=project(x,z);
      ctx.fillRect(px,py,7.2,5.1);
    }
  }
  const banks=[[],[]];
  for(let z=-232;z<=232;z+=3){
    banks[0].push([river(z)-width(z),z]);banks[1].push([river(z)+width(z),z]);
  }
  mapPath(ctx,banks[0].concat(banks[1].reverse()),project);
  ctx.closePath();ctx.fillStyle='#254e56';ctx.fill();
  ctx.lineWidth=.9;ctx.strokeStyle='#65908e';ctx.stroke();
  ctx.strokeStyle='#a29d7d';ctx.lineWidth=1.8;ctx.setLineDash([4,4]);
  paths.forEach(path=>{mapPath(ctx,path,project);ctx.stroke();});
  ctx.setLineDash([]);
  crossing.forEach(z=>{
    const w=width(z)+6;mapPath(ctx,[[river(z)-w,z],[river(z)+w,z]],project);
    ctx.strokeStyle='#c4a679';ctx.lineWidth=2.5;ctx.stroke();
  });
  const repairedRoutes=[
    ['market',[[59.5,-98.3],[65,-104],[74,-104.2],[81,-103.5],[86,-99.5]]],
    ['ferry',[[river(-43)-9,-43],[river(-39)-13,-39],[river(-34)-12,-34],[river(-29)+1,-29],[river(-26)+10,-26]]]
  ];
  repairedRoutes.forEach(([id,points])=>{
    if(state.journey.tasks[id]!=='done')return;
    mapPath(ctx,points,project);ctx.strokeStyle='#72e0ce';ctx.lineWidth=3;ctx.stroke();
  });
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px Microsoft YaHei, sans-serif';
  const guided=state.waypoint?sites.reduce((nearest,site)=>!nearest||Math.hypot(state.waypoint.x-site.x,state.waypoint.z-site.z)<Math.hypot(state.waypoint.x-nearest.x,state.waypoint.z-nearest.z)?site:nearest,null):null;
  sites.forEach(p=>{
    const [x,y]=project(p.x,p.z);
    const selected=guided===p;
    ctx.fillStyle=selected?'#f3e3ab':remembered.has(p.id)?'#e4bb80':'#9bb8aa';
    ctx.beginPath();ctx.arc(x,y,selected?5:3.4,0,tau);ctx.fill();
    ctx.fillStyle=selected?'#fff0c0':'#d5d9c1';
    const dx=p.x<0?-1:1;
    ctx.textAlign=dx<0?'right':'left';
    ctx.fillText(p.name,x+dx*8,y-7);
  });
  expedition.mapPoints.forEach(point=>{
    const [x,y]=project(point.x,point.z);
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#7ce2d2';ctx.fillRect(-3,-3,6,6);ctx.restore();
  });
  const [x,y]=project(state.x,state.z);
  ctx.fillStyle='#6be0d5';ctx.beginPath();ctx.arc(x,y,5,0,tau);ctx.fill();
  ctx.strokeStyle='#abcbb5';ctx.beginPath();ctx.arc(x,y,8.5,0,tau);ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#c3c8a9';ctx.font='14px serif';
  ctx.fillText('↑ 北',42,57);
  ctx.fillText('青点为当前位置 · 青方块为异闻',42,526);
  ctx.fillText('山海 · 四百八十米',630,526);
  ctx.restore();
  const list=$('map-sites');
  list.replaceChildren(...sites.map(s=>{
    const b=document.createElement('button');
    b.textContent=s.name;
    b.title=s.detail;
    b.setAttribute('aria-pressed',String(guided===s));
    b.onclick=()=>setWaypoint(s);
    return b;
  }));
}
function displayWaypoint(s) {
  state.waypoint=s;$('compass').hidden=!s;
}
function setWaypoint(s,manual=true) {
  if(manual&&state.guideObjective){
    state.guideObjective=false;
    save();
  }
  displayWaypoint(s);
  if(s){
    $('map-dialog').close();
    toast('向 '+s.name+' 出发');
  }
}

let displayedObjective=null, nextObjectiveRefresh=0;

function refreshObjective() {
  if(!state.started)return;
  const tracked=state.trackedObjective;
  const expeditionStart=expedition.objective();
  displayedObjective=(tracked&&(journey.objective(tracked)??ferry.objective(tracked)))
    ??expeditionStart??ferry.objective()??journey.nextObjective();
  $('objective').hidden=!displayedObjective;
  if(!displayedObjective){
    if(state.guideObjective)displayWaypoint(null);
    return;
  }
  const {title,hint,point}=displayedObjective;
  if($('objective-title').textContent!==title)$('objective-title').textContent=title;
  if($('objective-hint').textContent!==hint)$('objective-hint').textContent=hint;
  if(state.guideObjective)displayWaypoint(point);
  const haul=journey.haul;
  $('haul-status').hidden=!haul;
  if(haul){
    $('haul-label').textContent=haul.name+' · 运输中';
    $('haul-state').textContent=haul.tension>.78?'拖绳将绷紧':haul.tension>.58?'注意转弯':'牵引稳定';
    $('haul-distance').textContent=Math.round(haul.remaining)+' 米';
    $('haul-progress').style.width=Math.round(haul.progress*100)+'%';
  }
}

function trackObjective(id) {
  state.trackedObjective=id;
  state.guideObjective=true;
  refreshObjective();
  save();
}
async function changeSound(value) {
  const enabled=await sound.toggle(value);
  $('sound').setAttribute('aria-pressed',enabled);
  $('sound').textContent=enabled?'声音开启':'开启声音';
  syncRecord();
}
function changeView() {
  cameraMode=(cameraMode+1)%3;
  if(cameraMode===2)elevation=.53;
  else elevation=cameraMode===1?.19:.31;
  toast(['跟随视角','近身视角','远望视角'][cameraMode]);
}
function immerse() {
  const hidden=document.body.classList.toggle('immersive');
  $('immersion').textContent=hidden?'显示界面':'隐藏界面';
  if(hidden){
    $('settings-dialog').close();
    toast('按 H 或 Esc 恢复界面。');
  }
}
function goHome() {
  if(ferry.passenger){$('settings-dialog').close();toast('先把荷生和药篮送到西岸。');return;}
  cancelRoute();
  ferry.exitControl();
  ferry.stopTow();
  journey.stopHaul();
  Object.assign(state,{x:home.x,z:home.z,y:surface(home.x,home.z),form:'walker',dive:false,fold:['walker','walker',1],rest:null});
  azimuth=1.08;elevation=.31;cameraMode=0;
  setWaypoint(null);
  $('settings-dialog').close();
  updateForms();
  save();
  toast('回到工坊。');
}

function enter(audible) {
  if(state.started)return;
  if(audible)changeSound(true);
  state.started=true;
  $('intro').hidden=true;
  ['hud','clock','playbar','touch'].forEach(id=>$(id).hidden=false);
  updateForms();
  if(!saved.expedition?.introduced){
    state.expedition={found:Array.isArray(state.expedition?.found)?state.expedition.found:[],introduced:true};
    state.trackedObjective='expedition';
    state.guideObjective=true;
    if(legacy)announce('山海异闻 · 新篇章','工坊上空出现了浮岛，近岸水下也有巨影。原来的能力保留，新的世界层已经打开。','世界变化');
    save();
  }
  refreshObjective();
  if(lastFerry.status==='done'&&!saved.lastFerry?.aftercare)save();
  if(!Object.values(state.parts).some(Boolean))toast('现在只有步行形态。山河里散落着四枚机芯，按 B 查看线索，找到什么就能装什么。');
  else if(!state.journey.started)toast('山海异闻会持续指路。工坊和夜渡是可选委托，想帮助居民时再去看看。');
}

function bind() {
  $('start').onclick=()=>enter(true);
  $('start-muted').onclick=()=>enter(false);
  $('new-journey').onclick=()=>$('new-journey-dialog').showModal();
  $('keep-journey').onclick=()=>$('new-journey-dialog').close();
  $('confirm-new-journey').onclick=()=>{
    localStorage.removeItem(key);
    location.reload();
  };
  $('sound').onclick=()=>changeSound(!sound.enabled);
  $('map-open').onclick=()=>showDialog('map-dialog');
  $('journey-open').onclick=journey.openBook;
  $('expedition-open').onclick=expedition.render;
  $('ferry-event-open').onclick=()=>{$('journey-dialog').close();ferry.describe();};
  $('ferry-strap').onclick=ferry.strap;
  $('ferry-car-exit').onclick=ferry.exitControl;
  $('settings-open').onclick=()=>showDialog('settings-dialog');
  $('attack').onclick=()=>combat.attack();
  $('bench-open').onclick=()=>showDialog('bench-dialog');
  $('advance-time').onclick=advanceTime;
  $('use').onclick=interact;
  $('record-swap').onclick=swapRecord;
  $('view').onclick=changeView;
  $('clear-waypoint').onclick=()=>setWaypoint(null);
  $('objective-pin').onclick=()=>{if(displayedObjective)trackObjective(displayedObjective.id);};
  $('close-poem').onclick=stopReading;
  $('read-poem').onclick=()=>{
    if(!currentPoem)return;
    if(!recordings.paused){
      recordings.pause();$('read-poem').textContent='听诗';return;
    }
    recordings.src='./audio/'+currentPoem[2]+'.mp3';
    recordings.volume=state.volume;
    recordings.play().then(()=>{$('read-poem').textContent='停止朗诵';}).catch(()=>toast('这段朗诵无法播放。'));
  };
  recordings.onended=()=>{$('read-poem').textContent='听诗';};
  $('save-note').onclick=()=>{
    state.note=$('note').value;
    save();$('journal-dialog').close();toast('便笺收进了工坊的抽屉。');
  };
  $('volume').value=Math.round(state.volume*100);
  $('volume').oninput=e=>{state.volume=Number(e.target.value)/100;sound.setVolume(state.volume);recordAudio.volume=state.volume*.71;recordings.volume=state.volume;save();};
  $('record-import').onclick=()=>$('record-file').click();
  $('record-file').onchange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    if(recordObjectUrl)URL.revokeObjectURL(recordObjectUrl);
    recordObjectUrl=URL.createObjectURL(file);
    customRecord=file.name.replace(/\.[^.]+$/,'');
    state.record=records.length;
    syncRecord();
    toast('唱片已放进留声机。');
  };
  $('render-scale').value=state.scale;
  $('render-scale').onchange=e=>{state.scale=Number(e.target.value);resize();save();};
  $('freeze-time').checked=state.freeze;
  $('freeze-time').onchange=e=>{state.freeze=e.target.checked;save();};
  $('immersion').onclick=immerse;
  $('immersion-exit').onclick=immerse;
  $('return-home').onclick=goHome;
  $('fullscreen').onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();
    }catch{toast('当前浏览器无法切换全屏。');}
  };
  $('map').addEventListener('click',e=>{
    const r=$('map').getBoundingClientRect(),x=(e.clientX-r.left)*820/r.width,y=(e.clientY-r.top)*575/r.height;
    const site=sites.find(s=>{const [a,b]=project(s.x,s.z);return Math.hypot(a-x,b-y)<17;});
    if(site)setWaypoint(site);
  });
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>fold(b.dataset.form));
  document.querySelectorAll('[data-key]').forEach(b=>{
    b.onpointerdown=e=>{
      if(e.button!==0)return;
      e.preventDefault();
      cancelRoute();
      b.setPointerCapture(e.pointerId);
      input.add(b.dataset.key);
      b.classList.add('held');
    };
    const release=()=>{input.delete(b.dataset.key);b.classList.remove('held');};
    b.onlostpointercapture=release;
    b.onpointercancel=release;
  });
  const actions={Digit1:()=>fold('walker'),Digit2:()=>fold('rover'),Digit3:()=>fold('boat'),Digit4:()=>fold('sky'),KeyE:interact,KeyF:()=>combat.attack(),KeyQ:()=>showDialog('bench-dialog'),KeyM:()=>showDialog('map-dialog'),KeyB:expedition.render,KeyV:changeView,KeyH:immerse,KeyC:()=>{
    if(state.form!=='boat')return;
    if(!state.parts.dive){toast('小舟还承受不住水压。汀洲也许藏着旋龟的渊甲。');return;}
    state.dive=!state.dive;toast(state.dive?'渊甲合拢，正在下潜。空格可以上浮。':'正在浮回水面。');
  },Escape:()=>document.body.classList.contains('immersive')?immerse():showDialog('settings-dialog')};
  actions.KeyJ=journey.openBook;
  actions.Escape=()=>{
    if(!ferry.exitControl()){
      if(document.body.classList.contains('immersive'))immerse();
      else showDialog('settings-dialog');
    }
  };
  addEventListener('keydown',e=>{
    if(!state.started||paused()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code.startsWith('Arrow')||e.code==='Space'||actions[e.code])e.preventDefault();
    input.add(e.code);
    if(!e.repeat&&actions[e.code])actions[e.code]();
  });
  addEventListener('keyup',e=>input.delete(e.code));
  addEventListener('blur',()=>{
    input.clear();
    cancelRoute();
    document.querySelectorAll('#touch .held').forEach(b=>b.classList.remove('held'));
  });
  addEventListener('pagehide',()=>{if(state.started)save();});
  const view=renderer.domElement;
  view.addEventListener('pointerdown',e=>{
    if(!state.started||cameraDrag||e.button!==0)return;
    cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};
    view.setPointerCapture(e.pointerId);
  });
  view.addEventListener('pointermove',e=>{
    if(cameraDrag?.id!==e.pointerId)return;
    if(!cameraDrag.dragged&&Math.hypot(e.clientX-cameraDrag.x,e.clientY-cameraDrag.y)<(e.pointerType==='touch'?9:5))return;
    cameraDrag.dragged=true;
    azimuth-=(e.clientX-cameraDrag.x)*.0073;
    elevation=clamp(elevation+(e.clientY-cameraDrag.y)*.005,.07,1.14);
    cameraDrag.x=e.clientX;
    cameraDrag.y=e.clientY;
  });
  view.addEventListener('pointerup',e=>{
    if(cameraDrag?.id!==e.pointerId)return;
    const threshold=e.pointerType==='touch'?9:5;
    if(!cameraDrag.dragged&&Math.hypot(e.clientX-cameraDrag.x,e.clientY-cameraDrag.y)<threshold)selectDestination(e);
    cameraDrag=null;
  });
  view.addEventListener('lostpointercapture',e=>{if(cameraDrag?.id===e.pointerId)cameraDrag=null;});
  view.addEventListener('wheel',e=>{
    if(!state.started)return;
    e.preventDefault();zoom=clamp(zoom+Math.sign(e.deltaY)*.85,4.2,20);
  },{passive:false});
}

const introState={...state,x:-40,z:25,y:surface(-40,25),heading:1.10,rest:null,form:'walker',fold:['walker','walker',1],lamp:'arm',echo:'body',lampOn:true};
function draw(dt) {
  t+=dt;
  move(dt);
  ferry.update(dt,t,legal);
  journey.update(dt,t);
  traffic.update(dt,t);
  expedition.update(dt,t);
  atmosphere.update(dt,t);
  scenery.update(dt,t);
  combat.update(dt,t,state.started&&!paused());
  if(t>=nextObjectiveRefresh){refreshObjective();nextObjectiveRefresh=t+.2;}
  updatePlace();
  updateWorld(dt);
  if(t>toastUntil)$('toast').classList.remove('visible');
  if(state.started&&t-lastSave>10){lastSave=t;save();}
  cameraUpdate(dt);
  const viewState=state.started?state:introState;
  drawRobot(robot,viewState,dt,t,waterLevel,dock,ridge,(x,z)=>ferry.footSurface(x,z)??surface(x,z));
  robot.echo.visible=!state.started||!ferry.wheelOut;
  robot.wheels.forEach((wheel,i)=>{wheel.visible=!state.started||!ferry.wheelOut||i>=4;});
  if(destination.visible)destination.scale.setScalar(1+Math.sin(t*5)*.10);
  const afloat=viewState.form==='boat';
  const floor=ferry.footSurface(viewState.x,viewState.z)??surface(viewState.x,viewState.z);
  groundShade.position.set(viewState.x,afloat?waterLevel+.025:floor+.085,viewState.z);
  groundShade.scale.set(afloat?1.22:1,afloat?1.25:1,1);
  groundShade.rotation.z=viewState.heading;
  sun.target.position.set(viewState.x,viewState.y,viewState.z);
  sun.position.set(viewState.x-35,viewState.y+48,viewState.z+12);
  renderer.render(scene,camera);
}
bind();
draw(1/30);
$('start').textContent=legacy?'继续旅程':'进入旅程';
$('new-journey').hidden=!legacy;
$('start').disabled=false;
$('start-muted').disabled=false;
let last=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=clamp((now-last)/1000,.001,.12);
  last=now;
  draw(dt);
});
