import * as T from './vendor/three.module.js';
import { cube, cylinder, materials as M, part, river, sphere, surface, waterLevel, width } from './world.js';
import { makeResident } from './journey.js';
import { routeTo } from './navigation.js';
import { aftercareStage, aftercareStories, readAftercare } from './aftercare.js';

const $=id=>document.getElementById(id);
const z=112;
const bank=river(z)-width(z);
const shore={x:bank-3.8,z};
const island={x:bank+15,z,y:waterLevel+.78};
const pickup={x:island.x+.3,z:z+4};
const landing={x:bank+3.9,z:z+3};
const slip={x:bank-4.5,z:z-2.6};
const rack={x:-2,z:103};
const bench={x:-12,z:105};
const mast={x:3.7,z:99.1};
const guide={x:bank+7.6,z:z-4.5};
const bridgeStart=shore.x-.4;
const bridgeEnd=island.x-2.2;
const bridgeStartY=surface(bridgeStart,z)+.08;
const span=bridgeEnd-bridgeStart;
const hullSpan=3.25;
const course=[
  {x:-7.2,z:101.9,w:.48,d:7.8},
  {x:.3,z:106.3,w:.48,d:7.0}
];
const outcomes={boat:'亲自摆渡',bridge:'搭浮桥',radio:'派小车报信'};

export function readLastFerry(raw) {
  const value=raw&&typeof raw==='object'?raw:{};
  const point=(p,fallback)=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)?{x:p.x,z:p.z}:{...fallback};
  const status=['idle','active','done'].includes(value.status)?value.status:'idle';
  return {
    status, result:Object.hasOwn(outcomes,value.result)?value.result:null,
    guideRoute:Object.hasOwn(outcomes,value.guideRoute)?value.guideRoute:null,
    aftercare:status==='done'?readAftercare(value.aftercare):null,
    bridge:['packed','staged','loose','fixed'].includes(value.bridge)?value.bridge:'packed',
    trailer:point(value.trailer,rack),
    passenger:value.passenger===true,
    cargo:['island','board','floating','ashore'].includes(value.cargo)?value.cargo:'island',
    cargoPoint:point(value.cargoPoint,pickup), strapped:value.strapped===true,
    radio:['ready','car','called','returning'].includes(value.radio)?value.radio:'ready',
    car:point(value.car,bench)
  };
}

function basket(parent) {
  const model=new T.Group();
  parent.add(model);
  part(model,cube,M.wood,0,.12,0,.54,.25,.38);
  part(model,cube,M.plaster,0,.22,0,.51,.12,.36);
  const handle=part(model,new T.TorusGeometry(.19,.031,7,16,Math.PI),M.copper,0,.24,0,1,1,1);
  handle.rotation.y=Math.PI/2;
  return model;
}

function raft(parent,small=false) {
  const model=new T.Group();
  parent.add(model);
  const scale=small?.76:1;
  for(const side of [-1,1]){
    part(model,cylinder,M.wood,side*.43,.15,0,.19,1.84,.19).rotation.x=Math.PI/2;
    part(model,cube,M.copper,side*.43,.28,-.31,.15,.12,1.32);
  }
  part(model,cube,M.wood,0,.24,0,1.02,.15,1.65);
  part(model,cube,M.cyan,0,.37,.63,.40,.085,.14);
  model.scale.setScalar(scale);
  return model;
}

function distance(a,b) {return Math.hypot(a.x-b.x,a.z-b.z);}

export function lastFerryFloor(data,x,z,extension=1) {
  if(Math.abs(x-island.x)<2.5&&Math.abs(z-island.z)<1.99)return island.y;
  const deck=data.bridge==='loose'||data.bridge==='fixed';
  if(deck&&x>=bridgeStart&&x<=bridgeStart+span*extension&&Math.abs(z-island.z)<1.04){
    return T.MathUtils.lerp(bridgeStartY,island.y,(x-bridgeStart)/span);
  }
  return null;
}

export function createLastFerry(scene,state,{save,toast,showDialog,waypoint,tick,night,otherHaul,trackObjective}) {
  const data=state.lastFerry;
  const group=new T.Group();
  scene.add(group);
  const spots=[];
  let towing=false, remote=false, risk=0, escort=0, bridgeTravel=data.bridge==='loose'||data.bridge==='fixed'?1:0;
  let carPath=[], carHeading=0, heldMotion=0, lastSnag=-99;
  let sceneTime=0, teachingUntil=0;

  const plinth=part(group,cylinder,M.stone,island.x,waterLevel-.19,island.z,hullSpan,1.3,hullSpan*.89);
  plinth.rotation.y=.38;
  const islandDeck=part(group,cube,M.wood,island.x,island.y-.13,island.z,5.0,.26,4.0);
  const shelter=new T.Group();
  shelter.position.set(island.x-1.2,island.y,island.z-.9);
  group.add(shelter);
  for(const side of [-1,1]){
    part(shelter,cube,M.wood,side*.62,.72,-.26,.12,1.5,.13);
    part(shelter,cube,M.tile,side*.32,1.54,0,.74,.12,1.26).rotation.z=side*-.22;
  }
  part(shelter,cube,M.gold,0,1.37,.40,.16,.21,.13);
  const stranded=makeResident(group,['last-ferry-lotus','荷生','芦荡巡护员',island.x+.8,island.z,0x7a8d66]);
  stranded.marker.visible=false;
  const supplies=basket(group), trafficCart=basket(group);
  part(trafficCart,cube,M.copper,0,.069,0,.69,.09,.43);
  for(const side of [-1,1]){
    part(trafficCart,cylinder,M.ink,0,.11,side*.26,.13,.085,.13).rotation.x=Math.PI/2;
  }
  const trailer=raft(group);
  for(const side of [-1,1]){
    part(trailer,cylinder,M.ink,side*.57,.13,-.28,.18,.13,.18).rotation.z=Math.PI/2;
  }
  const towGeo=new T.BufferGeometry();
  towGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
  const tow=new T.Line(towGeo,new T.LineBasicMaterial({color:0xebbf7f}));
  tow.frustumCulled=false;
  group.add(tow);
  const rescueBoat=raft(group);
  part(rescueBoat,sphere,M.gold,0,.54,.69,.16,.18,.16);
  const foamMaterial=new T.MeshBasicMaterial({color:0xb4ded6,transparent:true,opacity:.42,depthWrite:false});
  const foam=Array.from({length:15},()=>part(group,cube,foamMaterial,0,0,0));
  const bridge=new T.Group();
  bridge.position.set(bridgeStart,0,z);
  group.add(bridge);
  const decks=[];
  for(let i=0;i<17;i++){
    const x=(i+.5)*span/17,y=T.MathUtils.lerp(bridgeStartY,island.y,x/span);
    const slat=part(bridge,cube,i%3===1?M.copper:M.wood,x,y-.076,0,span/17-.028,.152,2.14);
    slat.rotation.z=Math.atan2(island.y-bridgeStartY,span);
    decks.push(slat);
    if(i%4===0)part(bridge,cube,M.cyan,x,y+.065,-.92,.12,.055,.075);
  }
  const callBell=new T.Group();
  callBell.position.set(shore.x,surface(shore.x,z+3),z+3);
  group.add(callBell);
  part(callBell,cube,M.wood,-.35,.79,0,.14,1.58,.14);
  part(callBell,cube,M.copper,-.13,1.49,0,.56,.10,.11);
  part(callBell,new T.CylinderGeometry(.13,.24,.31,12),M.gold,.13,1.22,0);
  for(const [point,material] of [[slip,M.cyan],[shore,M.copper],[landing,M.gold],[guide,M.cyan]]){
    const y=(point===landing||point===guide)?waterLevel:surface(point.x,point.z);
    part(group,cylinder,M.wood,point.x,y+.37,point.z,.105,.78,.105);
    part(group,sphere,material,point.x,y+.79,point.z,.155,.16,.155);
  }

  const car=new T.Group();
  group.add(car);
  part(car,cube,M.copper,0,.23,0,.42,.20,.59);
  part(car,cube,M.cyan,0,.37,.02,.23,.15,.27);
  for(const side of [-1,1])for(const end of [-1,1]){
    part(car,cylinder,M.ink,side*.26,.15,end*.21,.145,.11,.145).rotation.z=Math.PI/2;
  }
  const serviceGround=[];
  part(group,cube,M.wood,bench.x-.9,surface(bench.x,bench.z)+.39,bench.z,1.2,.78,.61);
  const relay=part(group,cylinder,M.copper,mast.x,surface(mast.x,mast.z)+1.1,mast.z,.13,2.2,.13);
  part(group,new T.TorusGeometry(.29,.07,7,18),M.cyan,mast.x,relay.position.y+1.14,mast.z);
  for(const fence of course){
    for(const side of [-1,1]){
      const fz=fence.z+side*fence.d*.5;
      part(group,cube,M.wood,fence.x,surface(fence.x,fz)+.35,fz,.15,.70,.14);
    }
    part(group,cube,M.copper,fence.x,surface(fence.x,fence.z)+.36,fence.z,fence.w,.42,fence.d);
  }
  for(let i=0;i<12;i++){
    const x=-14+i*1.61,z=i<5?108.3:i<9?105.3:99.2;
    serviceGround.push(part(group,cube,M.cyan,x,surface(x,z)+.04,z,.22,.075,.22));
  }

  const basketAt={x:-41.3,z:23.9};
  const doorstep=basket(group);
  doorstep.position.set(basketAt.x,surface(basketAt.x,basketAt.z),basketAt.z);
  doorstep.rotation.y=.48;
  part(doorstep,cube,M.plaster,.07,.30,.02,.26,.025,.20).rotation.y=-.2;
  const basketClues={
    bridge:part(doorstep,cube,M.wood,-.13,.305,.02,.19,.035,.27),
    boat:part(doorstep,new T.TorusGeometry(.065,.017,6,12),M.copper,-.12,.31,.02),
    radio:part(doorstep,cube,M.tile,-.12,.31,.02,.16,.042,.21)
  };
  basketClues.boat.rotation.x=Math.PI/2;

  // These improvements belong to 荷生 and change even if the player never stops to help.
  const placeByRoute={
    bridge:{x:bridgeStart+1.45,z},
    boat:{x:shore.x-.65,z:z+5.3},
    radio:{...mast}
  };
  const additions={bridge:new T.Group(),boat:new T.Group(),radio:new T.Group()};
  for(const addition of Object.values(additions))group.add(addition);
  const boards=[];
  for(const [i,offset] of [0,.61,1.22,1.83,2.44,9.06,9.67].entries()){
    const x=placeByRoute.bridge.x+offset;
    const y=lastFerryFloor({bridge:'fixed'},x,z);
    const board=part(additions.bridge,cube,i%2?M.wood:M.copper,x,y+.034,z,.52,.055,1.16);
    boards.push(board);
  }
  const landingHeight=surface(placeByRoute.boat.x,placeByRoute.boat.z);
  additions.boat.position.set(placeByRoute.boat.x,landingHeight,placeByRoute.boat.z);
  part(additions.boat,cube,M.wood,0,.49,0,.16,.98,.19);
  const clasp=new T.TorusGeometry(.12,.036,7,18);
  const looseClasp=part(additions.boat,clasp,M.copper,.12,.70,.02);
  const secondClasp=part(additions.boat,clasp,M.copper,-.12,.79,.02);
  const awning=part(additions.radio,cube,M.tile,mast.x,relay.position.y+.94,mast.z,.95,.09,.73);
  const brace=part(additions.radio,cube,M.copper,mast.x+.33,relay.position.y+.80,mast.z,.10,.33,.11);

  const active=()=>data.status==='active';
  const hasBridge=()=>data.bridge==='loose'||data.bridge==='fixed';
  const ashore=()=>!data.passenger&&data.radio!=='returning';
  function add(id,label,point,y,available,act,reach=4.1,vehicle='player'){
    const mark=part(group,new T.OctahedronGeometry(.17),M.gold,point.x,y+1.06,point.z);
    const spot={id:'ferry-event-'+id,label,x:point.x,z:point.z,y,mark,available,act,reach,vehicle};
    spots.push(spot);
    return spot;
  }
  function pointTo(point,name){waypoint({x:point.x,z:point.z,name});}
  function changed(message){
    tick();save();toast(message);
  }
  function finish(result) {
    if(result!=='bridge'&&data.bridge==='loose')data.bridge='fixed';
    towing=false;remote=false;carPath=[];
    data.status='done';data.result=result;data.cargo='ashore';data.passenger=false;data.radio='ready';
    data.aftercare=readAftercare({rescuedAt:Date.now()});
    pointTo(shore,'汀洲渡口');
    changed('最后一班渡 · '+outcomes[result]+'。荷生和药篮都到了。');
  }

  function showAftercare(message,title='门口的药篮',speaker='荷生留下的话') {
    $('conversation-name').textContent=title;
    $('conversation-role').textContent=speaker;
    const text=$('conversation-text');
    const actions=$('conversation-actions');
    text.replaceChildren();actions.replaceChildren();
    const line=document.createElement('p');
    line.textContent=message;text.append(line);
    if(aftercareStage(data)==='notice'&&title==='门口的药篮'){
      const button=document.createElement('button');
      button.type='button';button.textContent='看看荷生做的东西';
      button.onclick=()=>{$('conversation-dialog').close();pointToAftercare();};
      actions.append(button);
    }
    showDialog('conversation-dialog');
  }
  function pointToAftercare() {
    trackObjective('he-sheng');
  }
  function objective(id='last-ferry') {
    const at=(p,name)=>({x:p.x,z:p.z,name});
    if(id==='he-sheng'){
      const story=aftercareStories[data.result];
      if(!story||aftercareStage(data)!=='notice')return null;
      return {id,title:'荷生留下的小事',hint:story.ask,point:at(placeByRoute[data.result],story.place)};
    }
    if(id!=='last-ferry'||!active())return null;
    const inferred=data.bridge!=='packed'?'bridge':data.radio!=='ready'?'radio':null;
    const route=data.passenger?'boat':towing?'bridge':remote||data.radio==='returning'?'radio':data.guideRoute??inferred;
    const title='最后一班渡'+(route?' · '+outcomes[route]:'');
    const lowBank=at(shore,'汀洲低岸');
    const goal=(hint,point)=>({id,title,hint,point});
    if(route==='boat'){
      if(data.cargo==='floating')return goal('药篮掉进江里了。划回去捞起来，再把荷生送上岸。',at(data.cargoPoint,'落水的药篮'));
      if(data.passenger)return goal(data.strapped?'把船划到西岸下客处，互动扶荷生下船。':'可以停船把药篮系紧。走岛南侧的缓水，去西岸下客。',at(landing,'西岸下客处'));
      return state.form==='boat'?goal('从汀洲南侧靠近，互动接荷生和药篮上船。',at(pickup,'汀洲接人处')):goal('在汀洲低岸变成小舟，再从岛南侧接人。',lowBank);
    }
    if(route==='bridge'){
      if(data.bridge==='loose')return goal('步行过浮桥，把汀洲那一头的桥桩固定住。',at(island,'汀洲桥桩'));
      if(data.bridge==='staged')return goal('变回步行形态，到岸桩旁系绳，把浮桥展开。',at(shore,'岸桩'));
      if(towing)return goal('把浮板拖进西岸滑槽。浮板靠近后，互动把它推进槽。',at(slip,'西岸滑槽'));
      return goal('变成履带，用绞盘挂上收拢的浮板。',at(data.trailer,'收拢的浮板'));
    }
    if(route==='radio'){
      if(data.radio==='returning')return goal('值夜船已经出发。可以在西岸等荷生和药篮靠岸。',at(landing,'西岸下客处'));
      if(data.radio==='called'){
        if(state.lamp==='dock')return goal('渡灯还挂在枫桥。把它取回来，点亮后再来引船。',{x:river(-43)-width(-43)-2,z:-43,name:'枫桥灯桩'});
        return state.form==='boat'?goal('点亮渡灯，到北侧青灯旁互动，引救援船入汊。',at(guide,'北侧青灯')):goal('在汀洲低岸变成小舟，带点亮的渡灯去引船。',lowBank);
      }
      if(data.radio==='car')return remote?goal('遥控小车绕过两道围挡，到报讯杆旁敲铃。',at(mast,'报讯杆')):goal('回维修台，重新接管报讯小车。',at(bench,'汀洲维修台'));
      if(state.echo==='ridge')return goal('回声芯留在风车塔。先去取回，再到维修台组装小车。',{x:123,z:5,name:'风车插座'});
      return goal('切到步行，在拆装中卸下回声芯，到维修台组装小车。',at(bench,'汀洲维修台'));
    }
    return goal('去汀洲接荷生和药篮。可以在夜渡面板选摆渡、浮桥或小车来指路。',at({x:shore.x,z:z+3},'夜渡求助铃'));
  }
  function chooseRoute(route) {
    data.guideRoute=route;
    trackObjective('last-ferry');
  }
  add('he-sheng-basket','看看门口的药篮',basketAt,doorstep.position.y,
    ()=>aftercareStage(data)!=='waiting'&&Boolean(aftercareStories[data.result]),()=>{
      const story=aftercareStories[data.result],stage=aftercareStage(data);
      showAftercare(stage==='later'?story.learned:stage==='independent'?story.independent:story.first);
    },2.2);
  for(const [result,point] of Object.entries(placeByRoute)){
    const story=aftercareStories[result];
    const height=result==='bridge'?lastFerryFloor({bridge:'fixed'},point.x,point.z):surface(point.x,point.z);
    add('he-sheng-work-'+result,story.action,point,height,
      ()=>data.result===result&&aftercareStage(data)==='notice',()=>{
        if(state.form!=='walker'){toast('变回步行形态，腾出手来示范。');return;}
        if(aftercareStage(data)!=='notice')return;
        data.aftercare.taughtAt=Date.now();
        teachingUntil=sceneTime+12;
        tick();save();
        showAftercare(story.thanks,'和荷生一起试一遍','旋龟汀洲');
      },2.6);
  }

  function describe() {
    $('ferry-event-state').textContent=data.status==='done'?'归渡 · '+outcomes[data.result]:active()?'荷生等在汀洲':'旋龟汀洲';
    const text=$('ferry-event-text'), actions=$('ferry-event-actions');
    text.replaceChildren();actions.replaceChildren();
    const line=value=>{const p=document.createElement('p');p.textContent=value;text.append(p);};
    const button=(label,click)=>{
      const item=document.createElement('button');item.type='button';item.textContent=label;item.onclick=click;actions.append(item);
    };
    if(data.status==='done'){
      line(data.result==='bridge'?'荷生给浮桥两头都系了红绳。他还会推着药篮走这条近路。':
        data.result==='radio'?'值夜的船工把小车留在了报讯杆边。荷生每次路过都会敲一下铃。':
        '荷生在渡口留了一篮药草，等下一班船带去驿站。');
      button('指向渡口',()=>{pointTo(shore,'汀洲渡口');$('ferry-event-dialog').close();});
      button('再试一次',()=>{
        if(footSurface(state.x,state.z)!==null){
          const p=document.createElement('p');
          p.textContent='先回到岸上，再重新开这一班渡。';
          text.append(p);
          return;
        }
        Object.assign(data,readLastFerry(null));
        bridgeTravel=0;escort=0;risk=0;teachingUntil=0;
        save();describe();
      });
    }else{
      line('江涨了，荷生和送给驿站的药篮还在汀洲。找个办法，把他们带到西岸。');
      line('可以变成小舟亲自去接。急水会晃动药篮，停船系紧它，或沿岛南侧水道平稳回来。');
      line('也可以用履带把浮板拖进西岸滑槽，再步行固定两端，留一条过江的近路。');
      line('还可以先卸下回声芯，在维修台装一辆小车。开到报讯杆敲铃，再举灯引救援船入汊。');
      if(active()&&state.echo==='ridge')line('回声芯还在风车塔。取回来便能用小车报讯。');
      if(active()&&towing)button('解开浮板牵引',()=>{towing=false;changed('浮板已留在原地。');describe();});
      if(active()&&!remote&&data.radio==='car')button('收回小车的轮组和回声芯',()=>{
        data.radio='ready';Object.assign(data.car,bench);changed('轮组和回声芯已收回。');describe();
      });
      button(active()?'指向汀洲渡口':'开始这班夜渡',()=>{
        if(otherHaul()){toast('先卸下原来的载物，再接这班渡。');return;}
        if(!active()){
          data.status='active';
          night();
          save();
        }
        trackObjective('last-ferry');
        $('ferry-event-dialog').close();
      });
      if(active()&&ashore()&&!towing&&!remote){
        for(const [route,name] of Object.entries(outcomes)){
          button(name+' · 指路',()=>{chooseRoute(route);$('ferry-event-dialog').close();});
        }
      }
    }
    showDialog('ferry-event-dialog');
  }

  add('bell','查看渡口的求助铃',{x:shore.x,z:z+3},surface(shore.x,z+3),()=>true,describe,3);
  add('pick-up','接荷生和药篮上船',pickup,waterLevel,()=>active()&&ashore()&&data.bridge!=='loose',()=>{
    if(state.form!=='boat'){toast('变成小舟，从汀洲南侧接他们。');return;}
    data.passenger=true;data.cargo='board';data.strapped=false;
    chooseRoute('boat');
    risk=0;pointTo(landing,'西岸下客处');
    changed('两位乘客都上了船。可以停船系紧药篮。');
  },3.2);
  add('unload','扶荷生下船',landing,waterLevel,()=>active()&&data.passenger,()=>{
    if(data.cargo!=='board'){toast('药篮还浮在水上，先把它捞回来。');return;}
    finish('boat');
  },3.2);
  const retrieval=add('recover','捞回药篮',data.cargoPoint,waterLevel,()=>active()&&data.cargo==='floating',()=>{
    data.cargo='board';data.strapped=false;risk=0;pointTo(landing,'西岸下客处');
    changed('药篮捞回来了。');
  },2.8);
  const hook=add('hook','挂上收拢的浮板',data.trailer,0,()=>active()&&ashore()&&data.bridge==='packed'&&!towing,()=>{
    if(state.form!=='rover'){toast('用履带的绞盘拖这块浮板。');return;}
    if(otherHaul()){toast('先卸掉现有的载物。');return;}
    towing=true;pointTo(slip,'西岸滑槽');
    chooseRoute('bridge');
    changed('浮板已接上。拖到滑槽边，让它进圈。');
  });
  add('stage','把浮板推进滑槽',slip,surface(slip.x,slip.z),()=>active()&&towing,()=>{
    if(distance(data.trailer,slip)>3.45){toast('让浮板再跟进一点，靠近滑槽。');return;}
    towing=false;data.bridge='staged';Object.assign(data.trailer,slip);pointTo(shore,'岸桩');
    changed('浮板进槽了。变成人形，去系岸桩。');
  },3);
  add('west-anchor','系上岸桩，展开浮桥',shore,bridgeStartY,()=>active()&&ashore()&&data.bridge==='staged',()=>{
    if(state.form!=='walker'){toast('需要下履带，用手固定岸桩。');return;}
    data.bridge='loose';pointTo(island,'汀洲桥桩');
    changed('浮桥向汀洲展开了。步行过去固定另一头。');
  },2.9);
  add('east-anchor','固定汀洲桥桩',island,island.y,()=>active()&&ashore()&&data.bridge==='loose'&&bridgeTravel>.95,()=>{
    if(state.form!=='walker'){toast('走上浮桥来固定桥桩。');return;}
    data.bridge='fixed';finish('bridge');
  },2.7);
  add('bench','组装报讯小车',bench,surface(bench.x,bench.z),()=>active()&&ashore()&&data.radio==='ready',()=>{
    if(state.echo!=='hand'){toast('先在拆装里卸下回声芯，放到维修台上。');return;}
    if(otherHaul()||towing){toast('先把牵引中的载物放下。');return;}
    if(state.form!=='walker'){toast('切到步行，拆一只轮组装到小车上。');return;}
    data.radio='car';Object.assign(data.car,bench);remote=true;
    chooseRoute('radio');
    changed('小车已经接管。绕过两道围挡，开到报讯杆。');
  },2.8);
  add('take-control','接管报讯小车',bench,surface(bench.x,bench.z),()=>active()&&data.radio==='car'&&!remote,()=>{
    remote=true;carPath=[];
    toast('开到报讯杆后敲铃。路上有两道围挡。');
  },3);
  add('alarm','敲响报讯铃',mast,surface(mast.x,mast.z),()=>active()&&remote,()=>{
    data.radio='called';remote=false;carPath=[];
    pointTo(guide,'举灯处');
    changed('值夜船听见了。变成小舟，到北侧青灯处给它引路。');
  },1.9,'car');
  add('guide','举灯引救援船入汊',guide,waterLevel,()=>active()&&ashore()&&data.radio==='called',()=>{
    if(state.form!=='boat'||state.lamp==='dock'||!state.lampOn){toast('靠近青灯，用带着点亮渡灯的小舟给救援船引路。');return;}
    data.radio='returning';escort=0;
    changed('值夜船看见了你的灯。它会把荷生和药篮接回来。');
  },3.1);

  function footSurface(x,z) {
    return lastFerryFloor(data,x,z,bridgeTravel);
  }
  function canPass(x,z,form) {
    const floor=footSurface(x,z);
    if(form==='walker'&&floor!==null)return true;
    if(form==='rover'&&floor!==null&&x>bank)return false;
    if(form==='boat'&&floor!==null)return false;
    return null;
  }
  function carClear(x,z) {
    return x>=-14.1&&x<=5&&z>=98.6&&z<=109.8&&!course.some(w=>Math.abs(x-w.x)<w.w+.28&&Math.abs(z-w.z)<w.d*.5+.17);
  }
  function selectCar(point) {
    carPath=routeTo({x:data.car.x,z:data.car.z},{x:point.x,z:point.z},carClear)||[];
    if(!carPath.length)toast('小车沿青色地标走。可以绕过围挡，也可以用方向键。');
  }
  function drive(dt,x,z) {
    let dx,dz;
    if(x||z){
      carPath=[];const speed=5.5*dt/Math.hypot(x,z);dx=x*speed;dz=z*speed;
    }else if(carPath.length){
      const end=carPath[0],d=distance(data.car,end),scale=d>5.5*dt?5.5*dt/d:1;
      dx=(end.x-data.car.x)*scale;dz=(end.z-data.car.z)*scale;
    }else return;
    if(carClear(data.car.x+dx,data.car.z+dz)){data.car.x+=dx;data.car.z+=dz;}
    else if(carClear(data.car.x+dx,data.car.z))data.car.x+=dx;
    else if(carClear(data.car.x,data.car.z+dz))data.car.z+=dz;
    else carPath=[];
    if(Math.abs(dx)+Math.abs(dz)>.001)carHeading=Math.atan2(dx,dz);
    if(carPath.length&&distance(data.car,carPath[0])<.001)carPath.shift();
  }
  function exitControl() {
    if(!remote)return false;
    remote=false;carPath=[];save();toast('视角已回到机器人。维修台可以重新接管。');
    return true;
  }
  function strap() {
    if(!active()||data.cargo!=='board')return;
    if(heldMotion>.24){toast('先停船，再把药篮系牢。');return;}
    data.strapped=true;risk=0;changed('药篮贴着船舷系好了。');
  }

  function update(dt,t,legal) {
    sceneTime=t;
    const followUp=aftercareStage(data);
    const hasFollowUp=followUp!=='waiting';
    const loose=followUp==='notice';
    const extended=followUp==='later'||followUp==='independent';
    doorstep.visible=hasFollowUp&&Boolean(aftercareStories[data.result]);
    for(const [route,clue] of Object.entries(basketClues))clue.visible=data.result===route;
    for(const [route,addition] of Object.entries(additions))addition.visible=hasFollowUp&&data.result===route;
    boards[0].rotation.z=loose?.18+.05*Math.sin(t*2):0;
    for(let i=5;i<boards.length;i++)boards[i].visible=extended;
    looseClasp.rotation.z=loose?.44+.12*Math.sin(t*2.4):0;
    secondClasp.visible=extended;
    awning.rotation.x=loose?.17+.018*Math.sin(t*2.7):.06;
    brace.visible=extended;
    foam.forEach((streak,i)=>{
      const phase=(t*(.22+i%3*.046)+i*.331)%1;
      streak.visible=active();
      streak.position.set(bank+3.7+i%5*2.14+.39*Math.sin(t*1.7+i),waterLevel+.028,z-4.8+phase*7);
      streak.scale.set(.037,.018,(.37+i%4*.24)*Math.sin(Math.PI*phase));
      streak.rotation.y=.17*Math.sin(i+t);
    });
    if(towing){
      const dx=state.x-data.trailer.x,dz=state.z-data.trailer.z,d=Math.hypot(dx,dz);
      if(d>2.55){
        const pull=Math.min((d-2.55)*.82,11*dt),x=data.trailer.x+dx/d*pull,z=data.trailer.z+dz/d*pull;
        if(legal(x,z,'rover'))Object.assign(data.trailer,{x,z});
        else if(legal(x,data.trailer.z,'rover'))data.trailer.x=x;
        else if(legal(data.trailer.x,z,'rover'))data.trailer.z=z;
        else if(t-lastSnag>3){lastSnag=t;toast('浮板卡住了。回头放松拖绳，再绕过石头。');}
        trailer.rotation.y=Math.atan2(dx,dz);
      }
      if(d>11){towing=false;changed('拖绳松开了。可以回去重新挂上。');}
    }
    if(hasBridge())bridgeTravel=Math.min(1,bridgeTravel+dt*.62);
    bridge.visible=hasBridge();
    bridge.scale.x=Math.max(.001,bridgeTravel);
    trailer.visible=data.bridge==='packed'||data.bridge==='staged';
    trailer.position.set(data.trailer.x,surface(data.trailer.x,data.trailer.z),data.trailer.z);
    hook.x=data.trailer.x;hook.z=data.trailer.z;hook.y=trailer.position.y;
    tow.visible=towing;
    if(towing){
      const pos=towGeo.attributes.position;
      pos.setXYZ(0,state.x,state.y+.44,state.z);pos.setXYZ(1,data.trailer.x,trailer.position.y+.33,data.trailer.z);pos.needsUpdate=true;
    }
    car.visible=active()&&data.radio!=='ready'||data.status==='done'&&data.result==='radio';
    car.position.set(data.car.x,surface(data.car.x,data.car.z),data.car.z);
    car.rotation.y=carHeading;
    serviceGround.forEach(p=>{p.visible=active()&&['ready','car'].includes(data.radio);});
    heldMotion+=(state.motion-heldMotion)*Math.min(1,dt*7);
    if(active()&&data.passenger&&data.cargo==='board'&&!data.strapped){
      const exposed=state.z<z+2.2&&state.z>z-5&&state.x>bank+3&&state.x<island.x-1;
      risk=Math.max(0,risk+dt*(exposed&&heldMotion>.57?heldMotion*.87:-.68));
      if(risk>.43){
        data.cargo='floating';data.cargoPoint={x:state.x,z:state.z+1};
        pointTo(data.cargoPoint,'落水的药篮');
        changed('急水把药篮晃下去了。回头捞起来，停船系牢。');
      }
    }
    rescueBoat.visible=active()&&data.radio==='returning';
    if(rescueBoat.visible){
      escort+=dt;
      const leg=Math.min(1,escort<6?escort/6:(escort-6)/7);
      const k=escort<6?leg:1-leg;
      rescueBoat.position.set(T.MathUtils.lerp(landing.x,pickup.x,k),waterLevel+.034*Math.sin(t*2.6),T.MathUtils.lerp(landing.z,pickup.z,k)+2.6*Math.sin(k*Math.PI));
      rescueBoat.rotation.y=escort<6?1.48:-1.54;
      if(escort>=13)finish('radio');
    }
    const teaching=data.status==='done'&&t<teachingUntil;
    const bridgeTraffic=data.status==='done'&&data.result==='bridge'&&t%34<15&&!teaching;
    state.ferryFootTraffic=bridgeTraffic||teaching;
    stranded.body.visible=active()||bridgeTraffic||teaching;
    stranded.head.rotation.z=Math.sin(t*1.5)*.065;
    trafficCart.visible=bridgeTraffic;
    if(teaching){
      const point=placeByRoute[data.result],x=point.x+.91,z=point.z-.51;
      stranded.body.position.set(x,footSurface(x,z)??surface(x,z),z);
      stranded.body.scale.setScalar(1);
      stranded.body.rotation.y=Math.atan2(state.x-x,state.z-z);
    }else if(bridgeTraffic){
      const phase=t%34/15;
      const k=phase<.5?phase*2:2-phase*2;
      const x=T.MathUtils.lerp(bridgeEnd-.35,bridgeStart+.6,k),y=footSurface(x,z)??surface(x,z);
      stranded.body.position.set(x,y,z+.17);
      stranded.body.rotation.y=phase<.5?-Math.PI/2:Math.PI/2;
      trafficCart.position.set(x+(phase<.5?-.57:.57),y,z+.17);
    }else if(data.passenger){
      stranded.body.position.set(state.x-Math.cos(state.heading)*.39-Math.sin(state.heading)*.44,state.y+.28,
        state.z+Math.sin(state.heading)*.39-Math.cos(state.heading)*.44);
      stranded.body.scale.setScalar(.59);stranded.body.rotation.y=state.heading;
    }else if(rescueBoat.visible&&escort>=6){
      stranded.body.position.copy(rescueBoat.position);stranded.body.position.y+=.27;
      stranded.body.rotation.y=rescueBoat.rotation.y;stranded.body.scale.setScalar(.62);
    }else{
      stranded.body.position.set(island.x+.8,island.y,island.z);
      stranded.body.scale.setScalar(1);
    }
    if(bridgeTraffic)stranded.body.scale.setScalar(1);
    supplies.visible=active()||data.status==='done'&&data.result==='boat';
    supplies.rotation.z=0;
    if(data.cargo==='floating'){
      supplies.position.set(data.cargoPoint.x,waterLevel+.04+.06*Math.sin(t*2.8),data.cargoPoint.z);
      Object.assign(retrieval,data.cargoPoint);
    }else if(data.cargo==='board'){
      const lean=data.strapped?0:risk;
      const offset=.47+lean*.68;
      supplies.position.set(state.x+Math.cos(state.heading)*offset+Math.sin(state.heading)*.36,state.y+.38,
        state.z-Math.sin(state.heading)*offset+Math.cos(state.heading)*.36);
      supplies.rotation.y=state.heading;
      supplies.rotation.z=-lean*.74;
    }else if(rescueBoat.visible&&escort>=6){
      supplies.position.copy(rescueBoat.position);
      supplies.position.x+=.27;
      supplies.position.y+=.34;
    }else if(data.cargo==='ashore'){
      supplies.position.set(shore.x-.8,bridgeStartY,z+1);
    }else supplies.position.set(island.x+1.45,island.y,island.z+.6);
    for(const spot of spots){
      spot.mark.visible=spot.available();
      spot.mark.position.set(spot.x,spot.y+.81+.13*Math.sin(t*2.6),spot.z);
      spot.mark.rotation.y=t;
    }
    $('ferry-tools').hidden=!state.started||(!remote&&!(active()&&data.passenger&&data.cargo==='board'&&!data.strapped));
    $('ferry-strap').hidden=remote;
    $('ferry-strap').textContent=risk>.24?'药篮在滑动，停船系绳':'系紧药篮';
    $('ferry-car-exit').hidden=!remote;
  }

  const onBoardDeck=[islandDeck,...decks];
  return {
    spots,describe,update,canPass,footSurface,selectCar,drive,exitControl,strap,pointToAftercare,objective,
    obstacles:[{x:island.x+.8,z:island.z,r:.58}],
    get travelSurfaces(){return hasBridge()?onBoardDeck:[islandDeck];},
    stopTow(){towing=false;},
    get controlsCar(){return remote;},
    get cameraPoint(){return remote?car.position:null;},
    get hasTow(){return towing;},
    get wheelOut(){return active()&&data.radio==='car';},
    get passenger(){return active()&&data.passenger;},
    get speedMultiplier(){return towing?.56:1;}
  };
}
