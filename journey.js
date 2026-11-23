import * as T from './vendor/three.module.js';
import { aftercareStage, aftercareStories } from './aftercare.js';
import { cube, cylinder, materials as M, part, river, sites, sphere, surface, waterLevel, width } from './world.js';

const $=id=>document.getElementById(id);
const amber=M.gold, cyan=M.cyan;
const jobs={
  ferry:{ name:'把航标拖回水门', hint:'用小舟接上浮标，先沿岸绕过水门前的浅滩，再拖到对岸的青圈内。' },
  pines:{ name:'疏通三道水闸', hint:'步行进松谷。先给中闸泄压，再开上闸进水，最后开下闸放水。' },
  market:{ name:'送小满和铜线盘去东街', hint:'用履带挂上拖车，小满会随车。沿街边绕开货垛，到东街线座卸货。' },
  ridge:{ name:'给山脊的风车供电', hint:'送完长街的线盘后，卸下背上的回声芯，插到风车上。' },
  lotus:{ name:'解开汀洲的两根网绳', hint:'先疏通松谷的水闸。带手里的渡灯划船，找到芦荡里两个系绳点。' },
  station:{ name:'把修理回执送上通信线', hint:'带齐渡口、松谷、长街、山脊和汀洲的回执，到扶桑驿站发报。' },
  tower:{ name:'把归航灯调到工坊', hint:'驿站发报后去望楼。让三面镜依次对准水门、风车、工坊。' }
};
const routeResults={
  ferry:['枫桥航道重新通航','航标已经归位，第一艘夜船正在通过水门。'],
  pines:['松谷水脉重新流动','三道水闸依次落下，水流正穿过松谷。'],
  market:['长街到东街，通车了','小满到了东街，第一辆修线车已经出发。'],
  ridge:['应龙山脊重新供电','长街送来的铜线和你的回声芯，让叶片重新转动。'],
  lotus:['芦荡让出了一条水路','网绳已经解开，水鸟可以穿过芦苇。'],
  station:['五张回执抵达江北','修好的不再只是五个地点，而是一条完整的回路。'],
  tower:['归航灯指向工坊','沿河的灯光接上了，阿檐在等你回家。']
};
const fieldJobs=['ferry','pines','market','ridge','lotus'];
const people=[
  ['home','阿檐','工坊管事',-37.7,23.2,0xb97652],
  ['ferry','岑叔','渡口艄公',-48,-48.7,0x4a7e7b],
  ['pines','木栖','松谷护林人',-91,-131,0x70815a],
  ['market','小满','水巷修线员',62.5,-101,0x905e8e],
  ['ridge','望山','风车维护员',126,6.8,0x567e9e],
  ['lotus','荷生','芦荡巡护员',-6.8,120.9,0x7a8d66],
  ['station','戚姨','驿站报务员',63.5,157.1,0xa16c59],
  ['tower','砚青','望楼守夜人',34.8,-171.5,0x746d9a]
];
const waterJob = {
  id:'ferry',form:'boat', start:[river(-43)-9,-43], end:[river(-26)+10,-26],
  object:'浮标', destination:'固定航标', needed:'要用小舟接上浮标。'
};
const landJob = {
  id:'market',form:'rover', start:[59.5,-98.3], end:[86,-99.5],
  object:'载着铜线的拖车', destination:'卸下铜线盘', needed:'换成履带形态才能用绞盘挂住拖车。'
};
const sluiceOrder=['middle','upper','lower'];
const sluices=[['upper','上闸',-84,-141],['middle','中闸',-84,-135],['lower','下闸',-83,-129]];
const moorings=[[120,'头一道网绳'],[128,'第二道网绳']]
  .map(([z,name])=>[river(z)-width(z)+5.4,z,name]);
const lensLabels=['水门','风车','工坊'];
const lensAnswer=[0,1,2];

export function readJourney(raw) {
  const saved=raw&&typeof raw==='object'?raw:{};
  const tasks={};
  for(const id of Object.keys(jobs)){
    const status=saved.tasks?.[id];
    tasks[id]=status==='active'||status==='done'?status:'new';
  }
  const loads={};
  for(const spec of [waterJob,landJob]){
    const load=saved.loads?.[spec.id];
    loads[spec.id]=Number.isFinite(load?.x)&&Number.isFinite(load?.z)?
      {x:load.x,z:load.z}:{x:spec.start[0],z:spec.start[1]};
  }
  return {
    tasks,loads,started:saved.started===true,returned:saved.returned===true,
    sluice:Number.isInteger(saved.sluice)?T.MathUtils.clamp(saved.sluice,0,3):0,
    ropes:Number.isInteger(saved.ropes)?saved.ropes&3:0,
    lenses:lensAnswer.map((_,i)=>[0,1,2].includes(saved.lenses?.[i])?saved.lenses[i]:[1,0,1][i])
  };
}

export function makeResident(scene,data) {
  const [id,name,role,x,z,color]=data;
  const body=new T.Group(), posture=new T.Group(), head=new T.Group();
  const coat=new T.MeshStandardMaterial({color,roughness:.82});
  const skin=new T.MeshStandardMaterial({color:0xc6a284,roughness:.86});
  const cap=id==='ferry'||id==='pines'?M.wood:M.ink;
  const y=surface(x,z);
  body.position.set(x,y,z);body.rotation.y=1;
  scene.add(body);body.add(posture);posture.add(head);
  part(posture,new T.CapsuleGeometry(.43,.68,3,10),coat,0,.89,0,1,1,.77);
  part(posture,cube,M.copper,0,.72,.11,.75,.13,.48);
  part(posture,cube,amber,0,.75,.37,.14,.145,.049);
  part(posture,cylinder,M.tile,-.20,.35,0,.16,.58,.17);
  part(posture,cylinder,M.tile,.20,.35,0,.16,.58,.17);
  for(const side of [-1,1]){
    part(posture,cube,cap,side*.2,.09,.08,.35,.16,.51);
    part(posture,new T.CapsuleGeometry(.12,.34,3,7),coat,side*.43,.93,.02,1,1,1).rotation.z=side*.21;
    part(head,sphere,M.ink,side*.12,-.005,.278,.036,.041,.025);
  }
  head.position.set(0,1.63,0);
  part(head,sphere,skin,0,0,0,.284,.318,.285);
  part(head,cylinder,cap,0,.21,0,.34,.16,.32);
  part(head,new T.ConeGeometry(.44,.35,12),cap,0,.36,0);
  const marker=part(body,new T.OctahedronGeometry(.20),M.cyan,0,2.45,0);
  return {id,name,role,x,z,y,body,head,marker};
}

function marker(scene,x,y,z,color=amber) {
  return part(scene,new T.OctahedronGeometry(.16),color,x,y+.98,z);
}

function makeLoad(scene,spec,data) {
  const raft=spec.form==='boat';
  const mesh=new T.Group();
  scene.add(mesh);
  if(raft){
    part(mesh,cylinder,M.red,0,.18,0,.51,.31,.51);
    part(mesh,cylinder,M.copper,0,.53,0,.17,.56,.17);
    part(mesh,sphere,amber,0,.83,0,.18,.18,.18);
  }else{
    part(mesh,cube,M.wood,0,.40,0,1.43,.20,1.0);
    for(const sign of [-1,1]){
      const wheel=part(mesh,cylinder,M.ink,sign*.69,.24,0,.28,.15,.28);
      wheel.rotation.z=Math.PI/2;
      const spool=part(mesh,cylinder,M.copper,0,.86,sign*.32,.46,.10,.46);
      spool.rotation.x=Math.PI/2;
    }
    part(mesh,cylinder,amber,0,.86,0,.32,.60,.32).rotation.x=Math.PI/2;
  }
  const [x,z]=spec.end;
  const y=raft?waterLevel:surface(x,z);
  const receiver=new T.Group();
  receiver.position.set(x,y+.13,z);
  scene.add(receiver);
  part(receiver,new T.RingGeometry(2.35,2.48,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x75d8cd,side:T.DoubleSide}),0,.03,0);
  for(const sign of [-1,1]){
    part(receiver,cylinder,M.copper,sign*2.5,.30,0,.095,.58,.095);
    part(receiver,sphere,cyan,sign*2.5,.62,0,.103,.103,.103);
  }
  const obstacle={x:(x+spec.start[0])/2,z:(z+spec.start[1])/2,radius:raft?3.55:1.85};
  if(raft){
    const shoal=part(scene,cylinder,M.stone,obstacle.x,waterLevel-.04,obstacle.z,3.05,.13,2.65);
    shoal.rotation.y=.33;
    for(const [dx,dz,h] of [[.8,.5,.36],[-.8,-.28,.48],[1.3,-1.1,.24],[-1.5,.95,.16]]){
      part(scene,new T.IcosahedronGeometry(1,0),M.stone,obstacle.x+dx,waterLevel,obstacle.z+dz,1.05,h,.94);
    }
  }else{
    for(const side of [-1,1]){
      const cx=obstacle.x+side*.86,cz=obstacle.z;
      part(scene,cube,M.wood,cx,surface(cx,cz)+.42,cz,1.45,.84,1.45);
      part(scene,cube,M.copper,cx,surface(cx,cz)+.53,cz,.12,.56,1.49);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3));
  const rope=new T.Line(geometry,new T.LineBasicMaterial({color:0xdbaf78}));
  rope.frustumCulled=false;
  scene.add(rope);
  return {spec,data,mesh,receiver,rope,y,raft,obstacle,lastSnag:-99};
}

function makeBeacon(scene) {
  const x=39,z=-177;
  const platform=new T.Group();
  platform.position.set(x,surface(x,z)+10.82,z);
  scene.add(platform);
  part(platform,cylinder,M.copper,0,0,0,.40,.34,.40);
  const lens=part(platform,sphere,amber,0,.33,0,.28,.26,.28);
  const beam=new T.Mesh(new T.ConeGeometry(4,72,22,1,true),new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    vertexShader:`
      varying float progress;
      void main(){progress=.5-position.y/72.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      varying float progress;
      void main(){gl_FragColor=vec4(1.0,.72,.38,(1.0-smoothstep(0.0,1.0,progress))*.068);}
    `
  }));
  beam.position.set(0,.33,36);
  beam.rotation.x=-Math.PI/2;
  platform.add(beam);
  return {platform,lens,beam,direction:Math.atan2(sites[0].x-x,sites[0].z-z)};
}

export function createJourney(scene, state, {save,toast,showDialog,waypoint,tick,legal,poem,pointToAftercare,trackObjective,announce}) {
  const book=state.journey;
  const residents=people.map(person=>makeResident(scene,person));
  const objects=[];
  const spots=[];
  const beacon=makeBeacon(scene);
  let towing=null;

  function done(id) {return book.tasks[id]==='done';}
  function active(id) {return book.tasks[id]==='active';}
  function begin(id) {book.tasks[id]='active';trackObjective(id);}
  function finish(id) {
    book.tasks[id]='done';
    tick();
    announce(...routeResults[id]);
    save();
  }
  function spot(id,label,x,z,y,available,act,color=amber) {
    const mark=marker(scene,x,y,z,color);
    const target={id,label,x,z,y,mark,available,act};
    spots.push(target);
    return target;
  }
  const loads=[waterJob,landJob].map(spec=>{
    const load=makeLoad(scene,spec,book.loads[spec.id]);
    const {data}=load;
    const attach=spot(spec.id+'-attach','接上'+spec.object,data.x,data.z,0,()=>active(spec.id)&&towing!==load,()=>{
      if(state.form!==spec.form){toast(spec.needed);return;}
      if(towing){toast('先卸下已经挂着的载物。');return;}
      towing=load;
      tick();
      trackObjective(spec.id);
      toast(spec.id==='market'?'小满坐上了拖车。绕开货垛，把他们送到东街青圈。':'牵引绳已接上。把'+spec.object+'拖进青色卸货圈。');
    });
    const receive=spot(spec.id+'-receive',spec.destination,spec.end[0],spec.end[1],load.y,()=>active(spec.id)&&towing===load,()=>{
      if(Math.hypot(data.x-spec.end[0],data.z-spec.end[1])>3.2){
        toast('载物还在圈外。再往前牵一点，让它整个进来。');
        return;
      }
      Object.assign(data,{x:spec.end[0],z:spec.end[1]});
      towing=null;
      if(spec.id==='market')state.market=true;
      finish(spec.id);
    },cyan);
    load.attach=attach;
    load.receive=receive;
    return load;
  });
  function stopHaul() {towing=null;}

  sluices.forEach(([id,name,x,z])=>{
    const y=surface(x,z);
    const base=part(scene,cube,M.stone,x,y+.18,z,.91,.36,.96);
    const handle=part(scene,cube,amber,x,y+.55,z,.65,.067,.12);
    objects.push({kind:'sluice',id,base,handle});
    spot('sluice-'+id,'扳动'+name,x,z,y,()=>active('pines'),()=>{
      if(state.form!=='walker'){toast('石阶旁的闸柄需要用步行形态握住。');return;}
      if(sluiceOrder[book.sluice]!==id){
        book.sluice=0;
        toast('水压又顶回来了。看木栖给的开闸顺序。');
      }else{
        book.sluice++;
        tick();
        if(book.sluice===3){finish('pines');return;}
        toast('水位降了一截 · '+book.sluice+'/3');
      }
      save();
    });
  });
  moorings.forEach(([x,z,name],index)=>{
    const buoy=part(scene,sphere,M.red,x,waterLevel+.20,z,.23,.22,.23);
    objects.push({kind:'buoy',buoy,index});
    spot('moor-'+index,'松开'+name,x,z,waterLevel,()=>active('lotus')&&!(book.ropes&(1<<index)),()=>{
      if(state.form!=='boat'){toast('从水路划过来，才能够到网绳。');return;}
      if(state.lamp!=='hand'||!state.lampOn){toast('按拆装，把点亮的渡灯拿在手里照绳结。');return;}
      book.ropes|=1<<index;
      tick();
      if(book.ropes===3){finish('lotus');poem('lotus');}
      else toast('水面松开一道。还有一根绳。');
      save();
    });
  });

  residents.forEach(person=>{
    const target={id:'resident-'+person.id,label:'和'+person.name+'说话',x:person.x,z:person.z,y:person.y,mark:person.marker,
      available:()=>!(person.id==='market'&&towing?.spec.id==='market')&&(person.id!=='lotus'||state.lastFerry?.status!=='active'&&!state.ferryFootTraffic),act:()=>talk(person)};
    person.spot=target;
    spots.push(target);
  });

  function powered() {
    if(active('ridge')&&done('market')&&state.echo==='ridge')finish('ridge');
  }

  function objective(id) {
    const person=residents.find(s=>s.id===id);
    if(!person)return null;
    const atPerson={x:person.x,z:person.z,name:person.name};
    if(id==='home'){
      if(book.returned||book.started&&!done('tower'))return null;
      return {id,title:done('tower')?'回工坊交差':'问问阿檐有什么事',
        hint:done('tower')?'把沿途修理的记录交给阿檐。':'如果愿意帮助沿途居民，可以去工坊门口和阿檐说话。',point:atPerson};
    }
    if(done(id))return null;
    let hint='去找'+person.name+'说话。'+jobs[id].hint;
    let point=atPerson;
    const load=loads.find(item=>item.spec.id===id);
    const marked=target=>({x:target.x,z:target.z,name:target.label});
    const lowBank=(x,z,name)=>{
      const middle=river(z), side=Math.sign(x-middle)||-1;
      return {x:middle+side*(width(z)+3.9),z,name};
    };
    if(id==='ridge'&&!done('market')){
      hint='先把长街的铜线盘运到东街，再去找望山。';point=objective('market').point;
    }else if(id==='lotus'&&!done('pines')){
      hint='先疏通松谷的三道水闸，再到汀洲找荷生。';point=objective('pines').point;
    }else if(id==='tower'&&!done('station')){
      hint='先让戚姨在扶桑驿站发报，再去望楼。';point=objective('station').point;
    }else if(id==='station'){
      const remaining=fieldJobs.find(job=>!done(job));
      hint=remaining?'还差 '+fieldJobs.filter(job=>!done(job)).length+' 张回执。下一处可做「'+jobs[remaining].name+'」。':'回执齐了。去扶桑驿站找戚姨发报。';
      if(remaining)point=objective(remaining).point;
    }else if(active(id)&&load){
      if(towing===load){
        point=marked(load.receive);
        hint=id==='ferry'?'绕开浅滩，把浮标拖进对岸青圈，再固定航标。':'沿街边绕过货垛，把拖车带进东街青圈，再卸货。';
      }else{
        point=marked(load.attach);
        hint=id==='ferry'?'在低岸变成小舟，到浮标旁互动接上牵引绳。':'变成履带，到铜线拖车旁互动挂上绞盘。';
        if(id==='ferry'&&state.form!=='boat')point=lowBank(point.x,point.z,'浮标附近的低岸');
      }
    }else if(active(id)&&id==='pines'){
      const next=sluices.find(([key])=>key===sluiceOrder[book.sluice]);
      if(next){
        const [,name,x,z]=next;
        point={x,z,name};
        hint='步行扳动'+name+'。开闸顺序是中闸、上闸、下闸（'+book.sluice+'/3）。';
      }
    }else if(active(id)&&id==='lotus'){
      point=marked(spots.find(s=>s.id==='moor-'+((book.ropes&1)?1:0)));
      if(state.form!=='boat')point=lowBank(point.x,point.z,'汀洲低岸');
      hint='变成小舟。用拆装把点亮的渡灯拿在手里，去解'+((book.ropes&1)?'第二道网绳。':'头一道网绳。');
      if(state.lamp==='dock'){
        point={x:river(-43)-width(-43)-2,z:-43,name:'枫桥灯桩'};
        hint='渡灯还挂在枫桥。先把它取回，再到汀洲解绳。';
      }
    }else if(active(id)&&id==='ridge'){
      point={x:123,z:5,name:'风车插座'};
      hint='用拆装卸下背上的回声芯，再走到风车下把它插进去。';
      if(state.lastFerry?.status==='active'&&state.lastFerry.radio==='car'){
        point={x:-12,z:105,name:'汀洲维修台'};
        hint='回声芯正在报讯小车上。在夜渡面板收回，再去风车下给它供电。';
      }
    }else if(id==='tower'){
      hint='和砚青说话。左镜对水门，中镜对风车，右镜对工坊，最后推合灯闸。';
    }
    return {id,title:jobs[id].name,hint,point};
  }

  function nextObjective() {
    if(done('tower'))return objective('home');
    if(!book.started)return objective('home');
    const ongoing=Object.keys(jobs).find(active);
    if(ongoing)return objective(ongoing);
    const next=fieldJobs.find(id=>!done(id));
    return objective(next??(done('station')?'tower':'station'));
  }

  function line(text) {
    const p=document.createElement('p');
    p.textContent=text;
    $('conversation-text').append(p);
  }
  function action(text,click) {
    const button=document.createElement('button');
    button.type='button';
    button.textContent=text;
    button.onclick=click;
    $('conversation-actions').append(button);
  }
  function talk(person) {
    const {id,name,role}=person;
    $('conversation-name').textContent=name;
    $('conversation-role').textContent=role;
    $('conversation-text').replaceChildren();
    $('conversation-actions').replaceChildren();
    if(id==='lotus'&&state.lastFerry?.status==='done'){
      const stage=aftercareStage(state.lastFerry),story=aftercareStories[state.lastFerry.result];
      const memory={
        boat:'那晚你操船的样子我还记得。药草到了驿站，药篮也收好了。',
        bridge:'你架的浮桥还在，我推篮车过去就能走近路。',
        radio:'那个小家伙敲响铃之后，我在芦苇里看到了你的灯。'
      }[state.lastFerry.result];
      if(story&&stage==='notice'){
        line(story.ask);
        action('去看看',()=>{$('conversation-dialog').close();pointToAftercare();});
      }else if(story&&stage==='together')line('刚才那一遍我记住了。明早出门时，我想自己再做一回。');
      else if(story&&stage==='later')line(story.learned);
      else if(story&&stage==='independent')line(story.independent);
      else if(memory)line(memory);
    }
    if(id==='home'){
      if(done('tower')&&!book.returned){
        line('从我这里看见你的归航灯了。船、车、两条腿，都把你带回了这一扇窗。坐下喝杯茶吧。');
        action('把修理记录留在工坊',()=>{
          book.returned=true;
          save();
          tick();
          toast('工坊回路 · 归家的灯');
          talk(person);
        });
      }else if(book.returned){
        line('茶还温着。沿河的人都知道，这间工坊晚上会留一盏灯。');
      }else{
        line(book.started?'修得怎样了？委托里可以看各处的进展，改天再修也来得及。':'昨夜江涨，渡口的灯和山上的线都断了。你愿意出去看看吗？有人在等一双肯停下来的手。');
        if(!book.started)action('接下工坊的沿途委托',()=>{
          book.started=true;save();tick();talk(person);
          toast('委托已打开。可从渡口、松谷或长街开始。');
        });
      }
      action('打开委托',()=>{$('conversation-dialog').close();openBook();});
    }else if(done(id)){
      line({
        ferry:'航标回位了，夜船能分清这道水门。过江的时候，看看灯落在哪边。',
        pines:'听，最下边的石槽也有水了。芦荡下一轮才蓄得起来。',
        market:'我们到了。看，第一辆修线车已经能从长街开到东街；线盘的回执我也发给风车塔了。',
        ridge:'风车又转了。回声芯放在这里就能继续供电，想拿回去也行。',
        lotus:'水鸟终于有一条能飞出去的缝。先别忙着走，看看它们怎么起飞。',
        station:'回执送到了江北。砚青会在望楼等你。',
        tower:'归航灯已经指向工坊。沿着灯光回去吧，阿檐在等你。'
      }[id]);
      if(id==='tower')action('在地图上指向工坊',()=>{waypoint(sites[0]);$('conversation-dialog').close();});
    }else{
      line({
        ferry:'昨夜涨水，航标漂到西侧。拖回东侧系绳架时，记得绕开露出石头的浅滩。浮标比你吃水深，卡住就往回收一点。',
        pines:'一场雨把三道闸都顶紧了。先给中闸泄压，再开上闸进水，最后开下闸放水。我在这儿听水声。',
        market:'铜线盘太重，挂到履带的拖钩上吧，我坐拖车跟你一起去。拖车身子宽，沿街边绕过货垛，到了东街才卸。',
        ridge:'线盘接好以后，还缺一个能把风变成电的回声芯。把你背上的芯卸下来，我接在塔底。',
        lotus:'涨水把旧网挂在芦苇间了。两根绳都要松开。拿着点亮的渡灯，低下去才看得清绳结。',
        station:'五处修理的回执齐了，我才能给江北发信。望楼的归航灯，最后要靠你亲手对准。',
        tower:'把一面镜子指向水门，一面指向风车，最后一面指回你来时的工坊。按左、中、右排。'
      }[id]);
      if(id==='ridge'&&!done('market'))line('东街还没把铜线盘送到线座。先去找小满。');
      else if(id==='lotus'&&!done('pines'))line('先去松谷把水重新放下来，不然水巷太浅，船进不去。');
      else if(id==='station'){
        const count=fieldJobs.filter(done).length;
        line('修理回执已收到 '+count+' / '+fieldJobs.length+' 张。');
        if(count===fieldJobs.length)action('发报给天狗望楼',()=>{finish('station');talk(person);});
      }else if(id==='tower'&&!done('station'))line('先让扶桑驿站把修理回执传上来。');
      else if(id==='tower'){
        if(!active(id))begin(id);
        const slots=['左镜','中镜','右镜'];
        book.lenses.forEach((setting,i)=>action(slots[i]+' · '+lensLabels[setting],()=>{
          book.lenses[i]=(setting+1)%lensLabels.length;save();tick();talk(person);
        }));
        action('推合灯闸',()=>{
          if(book.lenses.every((setting,i)=>setting===lensAnswer[i])){finish(id);poem('tower');talk(person);}
          else{
            talk(person);
            line('光散在江上了。按左、中、右检查三面镜的方向。');
          }
        });
      }else if(!active(id)){
        action('接下委托',()=>{
          book.started=true;
          begin(id);
          powered();
          talk(person);
        });
      }else{
        line(jobs[id].hint);
        if(id==='pines')line('目前打开了 '+book.sluice+' / 3 道。');
        if(id==='lotus')line(book.ropes?'还有一根绳没有解开。':'两根绳都还扎着。');
        action('指向当前目标',()=>{trackObjective(id);$('conversation-dialog').close();});
      }
    }
    showDialog('conversation-dialog');
  }

  function openBook() {
    const list=$('journey-jobs');
    list.replaceChildren();
    for(const [id,job] of Object.entries(jobs)){
      const row=document.createElement('div'), label=document.createElement('strong'), detail=document.createElement('small'), button=document.createElement('button');
      const info=document.createElement('div');
      row.className='module-row';
      label.textContent=(done(id)?'已完成 · ':active(id)?'进行中 · ':'')+job.name;
      const next=objective(id);
      detail.textContent=done(id)?routeResults[id][1]:next?.hint??job.hint;
      info.append(label,detail);
      button.textContent=next?'指路':'回访';
      button.onclick=()=>{
        if(next)trackObjective(id);
        else{
          const person=residents.find(s=>s.id===id);
          waypoint({x:person.x,z:person.z,name:person.name},true);
        }
        $('journey-dialog').close();
      };
      row.append(info,button);
      list.append(row);
    }
    $('journey-resets').replaceChildren();
    loads.filter(load=>active(load.spec.id)).forEach(load=>{
      const button=document.createElement('button');
      button.textContent='重置'+load.spec.object+'的位置';
      button.onclick=()=>{
        if(towing===load)stopHaul();
        Object.assign(load.data,{x:load.spec.start[0],z:load.spec.start[1]});
        Object.assign(load.attach,load.data);
        save();toast('载物已回到起点。');
      };
      $('journey-resets').append(button);
    });
    $('journey-summary').textContent=book.returned?'阿檐把最后一页收进了工坊。':'工坊支线 · '+Object.keys(jobs).filter(done).length+' / '+Object.keys(jobs).length;
    showDialog('journey-dialog');
  }

  function update(dt,t) {
    const lit=done('tower');
    beacon.beam.visible=lit;
    beacon.lens.material=lit?amber:M.slate;
    beacon.platform.rotation.y=beacon.direction+.03*Math.sin(t*.8);
    residents.forEach((person,i)=>{
      const {id,body,head,marker,x,z,spot}=person;
      let px=x,pz=z,py=surface(x,z),riding=false;
      const marketLoad=loads.find(load=>load.spec.id==='market');
      if(id==='market'&&towing===marketLoad){
        px=marketLoad.data.x; pz=marketLoad.data.z; py=surface(px,pz)+.47; riding=true;
        body.rotation.y=marketLoad.mesh.rotation.y;
      }else if(id==='market'&&done('market')){
        px=84.4;pz=-97.5;py=surface(px,pz);
      }
      body.position.set(px,py,pz);
      body.scale.setScalar(riding?.72:1);
      body.visible=id!=='lotus'||state.lastFerry?.status!=='active'&&!state.ferryFootTraffic;
      const a=Math.atan2(state.x-px,state.z-pz);
      if(!riding&&Math.hypot(state.x-px,state.z-pz)<9)body.rotation.y+=Math.atan2(Math.sin(a-body.rotation.y),Math.cos(a-body.rotation.y))*Math.min(1,dt*3.9);
      marker.visible=!riding;
      marker.position.y=2.47+Math.sin(t*1.9+i)*.16;
      marker.rotation.y=t*.8;
      head.rotation.z=Math.sin(t*1.35+i)*.072;
      Object.assign(spot,{x:px,z:pz,y:py});
    });
    for(const item of objects){
      if(item.kind==='sluice'){
        const raised=sluiceOrder.indexOf(item.id)<book.sluice;
        item.handle.rotation.y+=(raised?Math.PI/2-item.handle.rotation.y:-item.handle.rotation.y)*Math.min(1,dt*6);
        item.handle.material=raised?cyan:amber;
      }else{
        item.buoy.visible=!(book.ropes&(1<<item.index));
        item.buoy.position.y=waterLevel+.23+.085*Math.sin(t*2.1+item.index);
      }
    }
    for(const load of loads){
      const {spec,data,mesh,receiver,rope,raft,attach,obstacle}=load;
      const pulling=towing===load;
      if(pulling){
        const dx=state.x-data.x,dz=state.z-data.z;
        const distance=Math.hypot(dx,dz);
        if(distance>2.8){
          const pace=Math.min((distance-2.8)*.75,(raft?8.6:10.5)*dt);
          const x=data.x+dx/distance*pace,z=data.z+dz/distance*pace;
          const clear=(px,pz)=>legal(px,pz,spec.form)&&Math.hypot(px-obstacle.x,pz-obstacle.z)>obstacle.radius;
          if(clear(x,z)){data.x=x;data.z=z;}
          else if(clear(x,data.z))data.x=x;
          else if(clear(data.x,z))data.z=z;
          else if(t-load.lastSnag>2.4){
            load.lastSnag=t;
            toast(raft?'浮标搁住了。回头松一点绳，再从深水绕过浅滩。':'拖车卡住了。倒一点，让拖车跟着你沿街边绕开。');
          }
          mesh.rotation.y=Math.atan2(dx,dz);
        }
        if(distance>10.5){
          stopHaul();save();
          toast('拖绳太紧，挂钩松开了。回去重新接上，或在委托里重置载物。');
        }
      }
      const y=raft?waterLevel+.07*Math.sin(t*2.15):surface(data.x,data.z);
      mesh.position.set(data.x,y,data.z);
      mesh.rotation.z=raft?.10*Math.sin(t*1.7):0;
      receiver.visible=active(spec.id);
      attach.x=data.x;attach.z=data.z;attach.y=y;
      rope.visible=towing===load;
      if(rope.visible){
        const pos=rope.geometry.attributes.position;
        pos.setXYZ(0,state.x,state.y+.39,state.z);
        pos.setXYZ(1,(state.x+data.x)/2,(state.y+y)/2+.31,(state.z+data.z)/2);
        pos.setXYZ(2,data.x,y+.43,data.z);
        pos.needsUpdate=true;
      }
    }
    for(const target of spots){
      if(target.id.startsWith('resident-'))continue;
      target.mark.visible=target.available();
      target.mark.position.set(target.x,target.y+.96+.11*Math.sin(t*2.2),target.z);
      target.mark.rotation.y=t;
    }
  }

  function canPass(x,z,form) {
    return loads.every(({raft,obstacle})=>{
      if(raft!==(form==='boat'))return true;
      const next=Math.hypot(x-obstacle.x,z-obstacle.z);
      const limit=obstacle.radius*.58;
      if(next>limit)return true;
      // Older saves can start inside a newly placed obstacle.
      return Math.hypot(state.x-obstacle.x,state.z-obstacle.z)<next;
    });
  }

  return {
    spots,update,openBook,powered,stopHaul,canPass,objective,nextObjective,
    obstacles:residents.map(({body})=>({get x(){return body.position.x;},get z(){return body.position.z;},r:.58})),
    get hasLoad(){return Boolean(towing);},
    get haul(){
      if(!towing)return null;
      const {spec,data}=towing;
      const start=Math.hypot(spec.end[0]-spec.start[0],spec.end[1]-spec.start[1]);
      const remaining=Math.hypot(spec.end[0]-data.x,spec.end[1]-data.z);
      return {
        name:spec.id==='market'?'小满与铜线盘':spec.object,
        remaining,
        progress:T.MathUtils.clamp(1-remaining/start,0,1),
        tension:T.MathUtils.clamp(Math.hypot(state.x-data.x,state.z-data.z)/10.5,0,1)
      };
    },
    get speedMultiplier(){return towing?.spec.form==='boat'?.63:towing?.spec.form==='rover'?.57:1;}
  };
}
