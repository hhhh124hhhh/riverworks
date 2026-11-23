import * as T from './vendor/three.module.js';
import { cube, cylinder, materials as M, part, river, sphere, surface, terrain, waterLevel } from './world.js';

const $=id=>document.getElementById(id);
const parts={
  rover:{name:'当康·山地轮',x:-33,z:28,clue:'工坊东侧有沉重的蹄声。',ability:'履带已解锁 · 按 2 翻山、运输'},
  boat:{name:'文鳐·浮舟骨',x:-44,z:-45,clue:'枫桥边传来鱼翼拍水声。',ability:'小舟已解锁 · 在低岸按 3 下水'},
  sky:{name:'应龙·云翼',x:116,z:12,clue:'风车北侧的断崖上，有云翼共鸣。',ability:'飞行已解锁 · 按 4 起飞，空格升高，C 降低；瀑布下有上升气流'},
  dive:{name:'旋龟·渊甲',x:-10,z:132,clue:'汀洲南岸藏着一枚不怕水的龟甲。',ability:'潜水已解锁 · 小舟形态按 C 下潜，空格上浮'}
};
const wonders={
  deer:{name:'鹿蜀鸣丘',hint:'松谷深处，有一株会回应脚步的古树。',x:-100,z:-128,form:'walker',text:'鹿蜀的纹路与电路重合。你走过的地方，枝头依次亮起。'},
  fox:{name:'青丘九尾',hint:'松谷最低处，九条尾巴在雾里轮流指路。',x:-108,z:-140,form:'walker',text:'九尾没有逃走。它把其中一条尾巴借给你，指向从未走过的小路。'},
  baize:{name:'白泽万象',hint:'长街屋檐之间，有一只眼睛看得见所有零件。',x:75,z:-92,form:'walker',text:'白泽不言鬼神，只说出每件器物损坏的原因。你忽然看懂了长街的每一根线。'},
  tiangou:{name:'天狗望楼',hint:'夜泊时回到天狗望楼，抬头看月被遮住的地方。',x:39,z:-169,form:'walker',night:true,text:'天狗并没有吞月。它只是替山河挡住太亮的光，让夜行的人看得见路。'},
  kui:{name:'夔牛雷泽',hint:'变成小舟经过中央石桥，听水面下的一声独足雷。',x:river(44),z:44,y:waterLevel,form:'boat',text:'夔牛一足立于雷泽。它每一次踏水，四座石桥便依次回应。'},
  zouwu:{name:'驺吾山道',hint:'用履带沿山道疾行，寻找那道不肯踩碎青草的身影。',x:100,z:-8,form:'rover',text:'驺吾日行千里，却不伤生草。它与你并肩跑了一段，最后把山路让给了你。'},
  abyss:{name:'归墟水眼',hint:'带着渊甲潜到汀洲河底，寻找没有倒影的光。',x:river(123),z:123,y:waterLevel-1.6,form:'dive',text:'河底沉着一座旧观星台。它不看天，只记录每一条河流的来处。'},
  fish:{name:'鳛鳛鱼渊',hint:'潜入中央石桥下，寻找像喜鹊一样成群鸣叫的鱼。',x:river(44),z:44,y:waterLevel-1.6,form:'dive',text:'鳛鳛鱼群从桥墩间穿过。水面上的雷鸣，到了这里只是一串细小气泡。'},
  candle:{name:'烛阴沉目',hint:'潜到最北面的桥下，那里有一只闭着也很亮的眼睛。',x:river(-151),z:-151,y:waterLevel-1.6,form:'dive',text:'烛阴睁目为昼，闭目为夜。河底这只眼睛，还记得山谷尚未蓄水时的太阳。'},
  kun:{name:'北冥鲲影',hint:'扶桑驿站外的深水下，有一道比船更慢的巨影。',x:river(155),z:155,y:waterLevel-1.6,form:'dive',reach:8.0,text:'鲲从你身边经过，没有转身。你花了很久，才看清那不是一座移动的岛。'},
  bird:{name:'青鸟传书',hint:'从工坊起飞，寻找屋檐下那封永远送不到的书信。',x:-40,z:25,y:terrain(-40,25)+12,form:'sky',text:'青鸟送来的不是信，是一小段远方的风。你展开云翼，它就认出了收件人。'},
  cloud:{name:'帝江云阙',hint:'展开云翼，飞到风车上方没有山的地方。',x:123,z:6,y:terrain(123,6)+24,form:'sky',text:'云阙没有门窗。帝江留下的歌舞，化成了环绕它的风。'},
  fusang:{name:'扶桑十日',hint:'从扶桑驿站升空，寻找枝头尚未落下的太阳。',x:65,z:155,y:terrain(65,155)+31,form:'sky',text:'扶桑枝头只剩一枚太阳，另外九个位置挂着居民修补过的灯笼。'},
  jianmu:{name:'建木天阶',hint:'长街上空有一棵树，枝干像通往另一张地图的阶梯。',x:64,z:-100,y:terrain(64,-100)+33,form:'sky',text:'建木的根不在土里，而在长街每户人家的屋顶。灯亮得越多，它便长得越高。'},
  qiongqi:{name:'穷奇风穴',hint:'飞临松谷上空，寻找会在逆风里发出笑声的悬崖。',x:-91,z:-132,y:terrain(-91,-132)+27,form:'sky',text:'穷奇守着一口空棺，里面只有风。它问你飞得这么高，究竟是想离开，还是想看清楚。'}
};
const formNames={walker:'步行',rover:'履带',boat:'小舟',dive:'潜水',sky:'飞行'};

export function createExpedition(scene,state,{save,toast,announce,updateForms,showDialog}) {
  const spots=[],animations=[];
  const found=new Set(Array.isArray(state.expedition?.found)?state.expedition.found:[]);
  const group=new T.Group();scene.add(group);
  const glow=new T.MeshStandardMaterial({color:0x8fe6d7,emissive:0x2bcab8,emissiveIntensity:1.5,roughness:.45});
  const red=new T.MeshStandardMaterial({color:0x9b493c,roughness:.76});
  const jade=new T.MeshStandardMaterial({color:0xc8d7c7,emissive:0x446c61,emissiveIntensity:.28,roughness:.72});
  const ivory=new T.MeshStandardMaterial({color:0xe8dfc2,roughness:.64});
  const cloudMaterial=new T.MeshBasicMaterial({color:0xe9e5ce,transparent:true,opacity:.16,depthWrite:false});
  const beamMaterial=new T.MeshBasicMaterial({color:0x63e8dd,transparent:true,opacity:.075,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});

  function root(data,offset=0) {
    const g=new T.Group();
    g.position.set(data.x,(data.y??surface(data.x,data.z))+offset,data.z);
    group.add(g);return g;
  }
  function island(data,radius=5) {
    const g=root(data,-1.3);
    part(g,new T.CylinderGeometry(radius,radius*.32,2.6,9),jade,0,0,0);
    const ring=part(g,new T.TorusGeometry(radius+1,.09,8,64),M.gold,0,1.55,0);ring.rotation.x=Math.PI/2;
    for(let i=0;i<20;i++){
      const a=i*Math.PI*2/20;
      const rune=part(g,cube,i%5===0?M.gold:ivory,Math.sin(a)*(radius+1),1.55,Math.cos(a)*(radius+1),.10,.08,.40);
      rune.rotation.y=a;
    }
    for(let i=0;i<7;i++){
      const a=i*2.4,r=radius*(.65+(i%3)*.38);
      part(g,sphere,cloudMaterial,Math.sin(a)*r,-.15+(i%2)*.8,Math.cos(a)*r,2.5+(i%3),.42,1.7+(i%2));
    }
    animations.push((dt,t)=>{g.rotation.y+=dt*.035;g.position.y=data.y-1.3+Math.sin(t*.43+data.x)*.38;});
    return g;
  }
  function groundSeal(data) {
    const g=root(data,.045);
    const ring=part(g,new T.TorusGeometry(2.25,.045,6,48),M.copper,0,0,0);ring.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const mark=part(g,cube,i%3===0?red:M.gold,Math.sin(a)*2.25,.035,Math.cos(a)*2.25,.12,.055,.43);mark.rotation.y=a;
    }
    for(const side of [-1,1]){
      part(g,cylinder,M.wood,side*2.6,.85,-.4,.09,1.7,.09);
      part(g,sphere,M.gold,side*2.6,1.76,-.4,.13,.15,.13);
      part(g,cube,red,side*2.6,1.15,-.35,.44,.70,.035).rotation.z=side*.12;
    }
  }
  function makeBird(parent,x,y,z,scale=1) {
    const bird=new T.Group();parent.add(bird);bird.position.set(x,y,z);bird.scale.setScalar(scale);
    part(bird,sphere,red,0,0,0,.36,.28,.62);
    const left=part(bird,cube,M.copper,-.58,.08,0,.95,.07,.46),right=part(bird,cube,M.copper,.58,.08,0,.95,.07,.46);
    part(bird,sphere,M.gold,0,.08,.55,.22,.22,.25);
    animations.push((dt,t)=>{left.rotation.z=Math.sin(t*5.2)*.36;right.rotation.z=-left.rotation.z;bird.position.y=y+Math.sin(t*1.3+x)*.22;});
    return bird;
  }

  const cloud=island(wonders.cloud,5.8);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    part(cloud,cylinder,ivory,Math.sin(a)*3.5,3.3,Math.cos(a)*3.5,.15,3.4,.15);
    part(cloud,sphere,M.gold,Math.sin(a)*3.5,5.1,Math.cos(a)*3.5,.21,.24,.21);
  }

  const abyss=root(wonders.abyss);
  for(let i=0;i<3;i++){
    const ring=part(abyss,new T.TorusGeometry(1.7+i*.58,.07,8,48),i===1?M.gold:glow,0,0,0);
    ring.rotation.set(Math.PI/2,i*.55,i*.4);
  }
  part(abyss,cube,M.stone,0,-.75,0,6.4,.32,5.4);
  animations.push((dt)=>{abyss.rotation.y+=dt*.16;});

  const sacredTree=root(wonders.deer);
  part(sacredTree,cylinder,M.wood,0,2.2,0,.46,4.4,.46);
  const crowns=[];
  for(let i=0;i<7;i++){
    const a=i*2.4;
    crowns.push(part(sacredTree,sphere,glow,Math.sin(a)*1.4,4+(i%3)*.45,Math.cos(a)*1.4,.22,.18,.22));
  }

  const fox=root(wonders.fox);
  part(fox,sphere,M.plaster,0,.72,0,.68,.61,1.05);
  part(fox,sphere,M.plaster,0,1.17,.82,.48,.46,.52);
  for(const side of [-1,1])part(fox,new T.ConeGeometry(.18,.55,5),red,side*.28,1.63,.80);
  const tails=[];
  for(let i=0;i<9;i++){
    const a=(i-4)*.20;
    const curve=new T.QuadraticBezierCurve3(new T.Vector3(0,.74,-.73),new T.Vector3(Math.sin(a)*3.3,1.3+Math.cos(a),-2.3),new T.Vector3(Math.sin(a)*3.7,1.1,-3.5));
    const tail=part(fox,new T.TubeGeometry(curve,8,.14,6),i%2?M.plaster:M.gold,0,0,0);tails.push(tail);
  }
  animations.push((dt,t)=>tails.forEach((tail,i)=>{tail.rotation.y=Math.sin(t*1.2+i*.4)*.055;}));
  const homeFox=fox.clone();homeFox.position.set(-31,surface(-31,29),29);homeFox.scale.setScalar(.72);homeFox.rotation.y=-.7;group.add(homeFox);
  animations.push((dt,t)=>{
    const distance=Math.hypot(state.x-homeFox.position.x,state.z-homeFox.position.z);
    const facing=distance<13?Math.atan2(state.x-homeFox.position.x,state.z-homeFox.position.z):-.7+Math.sin(t*.35)*.12;
    homeFox.rotation.y+=Math.atan2(Math.sin(facing-homeFox.rotation.y),Math.cos(facing-homeFox.rotation.y))*Math.min(1,dt*2.4);
  });

  const baize=root(wonders.baize,2.4);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7;
    const eye=part(baize,new T.TorusGeometry(.38,.07,7,20),i===0?M.gold:glow,Math.sin(a)*1.65,Math.cos(a)*1.65,0);
    part(eye,sphere,M.ink,0,0,0,.12,.12,.09);
  }
  animations.push((dt,t)=>{baize.rotation.y+=dt*.22;baize.position.y=surface(75,-92)+2.4+Math.sin(t)*.24;});

  const tiangou=root(wonders.tiangou,3.1);
  part(tiangou,new T.TorusGeometry(1.4,.16,9,48),M.gold,0,0,0);
  part(tiangou,sphere,M.ink,.38,.15,.12,1.23,1.23,.30);
  part(tiangou,new T.ConeGeometry(.34,.95,6),M.slate,-1.2,1.2,0).rotation.z=-.4;
  animations.push((dt,t)=>{tiangou.rotation.y=Math.sin(t*.25)*.32;});

  const kui=root(wonders.kui,.25);
  part(kui,sphere,M.slate,0,.72,0,1.35,.93,1.8);
  part(kui,sphere,M.slate,0,1.02,1.40,.88,.76,.84);
  for(const side of [-1,1])part(kui,new T.ConeGeometry(.18,1.05,7),M.gold,side*.55,1.70,1.35).rotation.z=side*-.5;
  part(kui,cylinder,M.copper,0,.24,-.3,.35,.48,.35);
  animations.push((dt,t)=>{kui.position.y=waterLevel+.18+Math.sin(t*1.7)*.16;kui.rotation.z=Math.sin(t*.8)*.035;});
  const thunderRings=[];
  for(let i=0;i<3;i++){
    const material=new T.MeshBasicMaterial({color:0x8fe6d7,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});
    const ring=part(group,new T.RingGeometry(1.1,1.18,48),material,wonders.kui.x,waterLevel+.07,wonders.kui.z);ring.rotation.x=-Math.PI/2;thunderRings.push(ring);
  }
  animations.push((dt,t)=>thunderRings.forEach((ring,i)=>{
    const near=Math.hypot(state.x-wonders.kui.x,state.z-wonders.kui.z)<16;
    const phase=(t*.32+i/3)%1,scale=1+phase*6;
    ring.scale.setScalar(scale);ring.material.opacity=(near||found.has('kui')?(1-phase)*.22:0);
  }));

  const zouwu=root(wonders.zouwu);
  part(zouwu,sphere,M.plaster,0,.84,0,.75,.65,1.4);
  part(zouwu,sphere,M.gold,0,1.25,1.15,.52,.48,.57);
  const zouwuTail=part(zouwu,new T.TorusGeometry(1.5,.13,7,28,Math.PI*1.45),red,0,1.15,-1.1);
  animations.push((dt,t)=>{zouwuTail.rotation.z=Math.sin(t*1.6)*.16;});

  const fish=root(wonders.fish);
  for(let i=0;i<16;i++){
    const a=i*2.39,r=1.2+(i%5)*.47;
    const f=part(fish,sphere,i%3?glow:M.gold,Math.sin(a)*r,Math.cos(a*.7)*.65,Math.cos(a)*r,.18,.10,.39);
    f.rotation.y=a;
  }
  animations.push((dt,t)=>{fish.rotation.y+=dt*.38;fish.position.y=wonders.fish.y+Math.sin(t*.7)*.18;});

  const candle=root(wonders.candle);
  const eye=part(candle,new T.TorusGeometry(1.8,.17,9,48),M.gold,0,0,0);
  part(eye,sphere,glow,0,0,0,.48,1.32,.20);
  for(const side of [-1,1])part(candle,cylinder,M.copper,side*2.3,-.2,0,.15,3.5,.15);
  animations.push((dt,t)=>{eye.scale.y=.5+.5*Math.abs(Math.sin(t*.32));});

  const kun=root(wonders.kun);
  part(kun,sphere,M.slate,0,0,0,2.0,1.12,5.5);
  part(kun,sphere,glow,0,.35,4.5,.30,.16,.16);
  for(const side of [-1,1])part(kun,cube,M.slate,side*2.5,-.2,.4,3.3,.14,1.6).rotation.z=side*.22;
  const kunTail=part(kun,cube,M.slate,0,0,-5.2,4.0,.24,1.6);
  animations.push((dt,t)=>{kun.rotation.y=Math.sin(t*.15)*.08;kunTail.rotation.y=Math.sin(t*.9)*.22;});
  const shadowMaterial=new T.MeshBasicMaterial({color:0x071b24,transparent:true,opacity:.38,depthWrite:false});
  const homeShadow=new T.Group();homeShadow.position.set(river(25),waterLevel+.045,25);group.add(homeShadow);
  part(homeShadow,sphere,shadowMaterial,0,0,0,2.2,.025,5.4);
  for(const side of [-1,1])part(homeShadow,cube,shadowMaterial,side*2.4,0,.2,3.1,.025,1.3).rotation.y=side*.26;
  part(homeShadow,cube,shadowMaterial,0,0,-5.0,3.5,.025,1.4);
  animations.push((dt,t)=>{homeShadow.position.x=river(25)+Math.sin(t*.18)*4;homeShadow.position.z=25+Math.cos(t*.18)*6;homeShadow.rotation.y=Math.sin(t*.18)*.35;});

  const birdHome=island(wonders.bird,3.4);
  part(birdHome,new T.TorusGeometry(1.5,.30,7,22),M.wood,0,1.7,0).rotation.x=Math.PI/2;
  makeBird(birdHome,0,2.8,0,1.25);makeBird(birdHome,2.2,2.2,-.5,.8);makeBird(birdHome,-2.0,2.4,.4,.75);

  const fusang=island(wonders.fusang,4.5);
  part(fusang,cylinder,M.wood,0,3.1,0,.34,5.4,.34);
  for(let i=0;i<9;i++){
    const a=i*2.4,r=1.2+(i%3)*.75;
    part(fusang,cylinder,M.copper,Math.sin(a)*r*.5,4.0+i*.19,Math.cos(a)*r*.5,.11,2.3,.11).rotation.z=Math.sin(a)*.7;
    part(fusang,sphere,i===0?M.gold:glow,Math.sin(a)*r,5.0+i*.19,Math.cos(a)*r,.42,.42,.42);
  }

  const jianmu=island(wonders.jianmu,4.8);
  part(jianmu,cylinder,M.wood,0,5.2,0,.50,10.4,.50);
  for(let i=0;i<9;i++){
    const a=i*.82;
    const step=part(jianmu,cube,i%2?M.copper:M.wood,Math.sin(a)*2.2,1.8+i*.91,Math.cos(a)*2.2,2.6,.16,.72);step.rotation.y=a;
  }

  const qiongqi=island(wonders.qiongqi,4.6);
  part(qiongqi,sphere,red,0,2.1,0,1.2,.75,1.75);
  part(qiongqi,sphere,M.ink,0,2.5,1.4,.65,.56,.68);
  for(const side of [-1,1])part(qiongqi,cube,M.copper,side*1.45,2.5,-.1,2.1,.12,1.15).rotation.z=side*.30;
  makeBird(qiongqi,0,5.3,-1.5,.7);

  function underwaterAtmosphere(data) {
    const g=root(data);
    for(let i=0;i<3;i++){
      const shaft=part(g,new T.ConeGeometry(1.1+i*.3,6,16,1,true),beamMaterial,(i-1)*1.8,1.8,-1.4+i*.8);
      shaft.rotation.z=(i-1)*.12;
    }
    const bubbles=[];
    for(let i=0;i<10;i++){
      const bubble=part(g,new T.TorusGeometry(.07+(i%3)*.025,.014,5,12),glow,Math.sin(i*2.4)*3.2,-1+(i%5)*.55,Math.cos(i*2.4)*2.8);
      bubbles.push(bubble);
    }
    animations.push((dt,t)=>bubbles.forEach((bubble,i)=>{bubble.position.y=-1+(t*.32+i*.37)%3.2;bubble.scale.setScalar(.7+.3*Math.sin(t+i));}));
  }
  ['deer','fox','baize','tiangou','zouwu'].forEach(id=>groundSeal(wonders[id]));
  ['abyss','fish','candle','kun'].forEach(id=>underwaterAtmosphere(wonders[id]));

  function addSpot(id,name,data,kind) {
    const y=data.y??surface(data.x,data.z);
    const mark=part(group,new T.OctahedronGeometry(kind==='part'?.32:.22),kind==='part'?M.gold:glow,data.x,y+1.05,data.z);
    const available=()=>kind==='part'?!state.parts[id]:!found.has(id)&&(!data.night||state.clock>.68)&&(
      ['walker','rover'].includes(data.form)&&state.form===data.form||
      data.form==='boat'&&state.form==='boat'&&!state.dive||
      data.form==='sky'&&state.form==='sky'&&Math.abs(state.y-y)<7||
      data.form==='dive'&&state.form==='boat'&&state.dive&&Math.abs(state.y-y)<4
    );
    spots.push({id:'expedition-'+id,label:kind==='part'?'取得'+name:'聆听'+name,x:data.x,z:data.z,y,reach:data.reach??4.7,mark,available,act:()=>{
      if(kind==='part'){
        state.parts[id]=true;updateForms();save();
        announce(name+' · 已装入机身',data.ability,'机芯寻回');
        toast('你可以继续找其他零件，不必按固定顺序。');
      }else{
        found.add(id);state.expedition={found:[...found],introduced:true};save();
        announce(name,data.text,'山海异闻 · '+formNames[data.form]);
      }
    }});
  }
  Object.entries(parts).forEach(([id,data])=>addSpot(id,data.name,data,'part'));
  Object.entries(wonders).forEach(([id,data])=>addSpot(id,data.name,data,'wonder'));

  function objective() {
    const atRidge=Math.hypot(state.x-parts.sky.x,state.z-parts.sky.z)<38;
    if(atRidge&&(!found.has('cloud')||!found.has('zouwu'))){
      if(!state.parts.sky)return {id:'expedition',title:'应龙山脊 ① 拾取云翼机芯',hint:'跟着金色菱形标记走到机芯旁，按 E 装入机身。',point:{x:parts.sky.x,z:parts.sky.z,name:'云翼机芯'}};
      if(!found.has('cloud'))return {id:'expedition',title:'应龙山脊 ② 飞上帝江云阙',hint:state.form==='sky'?'按住空格持续升高，飞进上方浮岛的标记范围后按 E。':'按 4 展开云翼，再按住空格升高；靠近头顶浮岛后按 E。',point:{x:wonders.cloud.x,z:wonders.cloud.z,name:'帝江云阙'}};
      return {id:'expedition',title:'应龙山脊 ③ 与驺吾同行',hint:'按 2 切换履带，沿山道靠近驺吾，出现提示后按 E。',point:{x:wonders.zouwu.x,z:wonders.zouwu.z,name:'驺吾山道'}};
    }
    if(!found.size){
      if(!Object.values(state.parts).some(Boolean))return {id:'expedition',title:'寻找失落的山海机芯',hint:parts.rover.clue+' 按 B 查看全部线索。',point:{x:parts.rover.x,z:parts.rover.z,name:parts.rover.name}};
      if(state.parts.sky)return {id:'expedition',title:'山海异闻 · 看见世界的另一层',hint:'工坊上空出现了青鸟浮岛。按 4 展开云翼，升高后靠近聆听。',point:{x:wonders.bird.x,z:wonders.bird.z,name:wonders.bird.name}};
      return {id:'expedition',title:'寻找应龙·云翼',hint:'去应龙山脊寻找云翼机芯。飞行以后，工坊上空也有新的去处。',point:{x:parts.sky.x,z:parts.sky.z,name:parts.sky.name}};
    }
    const accessible={walker:true,rover:state.parts.rover,boat:state.parts.boat,dive:state.parts.dive&&state.parts.boat,sky:state.parts.sky};
    const candidates=Object.entries(wonders).filter(([id,data])=>!found.has(id)&&accessible[data.form]);
    if(candidates.length){
      candidates.sort((a,b)=>Math.hypot(state.x-a[1].x,state.z-a[1].z)-Math.hypot(state.x-b[1].x,state.z-b[1].z));
      const [id,data]=candidates[0];
      return {id:'expedition',title:'山海异闻 · '+data.name,hint:data.hint+' · '+formNames[data.form]+(data.night?' · 夜晚':''),point:{x:data.x,z:data.z,name:data.name}};
    }
    const missing=Object.entries(parts).filter(([id])=>!state.parts[id]);
    if(missing.length){
      missing.sort((a,b)=>Math.hypot(state.x-a[1].x,state.z-a[1].z)-Math.hypot(state.x-b[1].x,state.z-b[1].z));
      const [id,data]=missing[0];
      return {id:'expedition',title:'寻找'+data.name,hint:data.clue+' 新机芯会打开目前无法到达的异闻。',point:{x:data.x,z:data.z,name:data.name}};
    }
    return null;
  }

  function render() {
    const list=$('expedition-list');list.replaceChildren();
    for(const [id,data] of Object.entries(parts)){
      const row=document.createElement('div'),copy=document.createElement('div'),name=document.createElement('strong'),hint=document.createElement('small'),status=document.createElement('span');
      row.className='module-row';name.textContent=state.parts[id]?data.name:'未识别的机芯';hint.textContent=state.parts[id]?data.ability:data.clue;status.textContent=state.parts[id]?'已解锁':'未发现';copy.append(name,hint);row.append(copy,status);list.append(row);
    }
    for(const [id,data] of Object.entries(wonders)){
      const row=document.createElement('div'),copy=document.createElement('div'),name=document.createElement('strong'),hint=document.createElement('small'),status=document.createElement('span');
      row.className='module-row';name.textContent=found.has(id)?data.name:'未见的异闻';hint.textContent=(found.has(id)?data.text:data.hint)+' · '+formNames[data.form]+(data.night?' · 夜晚':'');status.textContent=found.has(id)?'已记录':'待探索';copy.append(name,hint);row.append(copy,status);list.append(row);
    }
    $('expedition-summary').textContent='机芯 '+Object.keys(parts).filter(id=>state.parts[id]).length+' / 4 · 异闻 '+found.size+' / '+Object.keys(wonders).length;
    showDialog('expedition-dialog');
  }

  function update(dt,t) {
    animations.forEach(animation=>animation(dt,t));
    crowns.forEach((crown,i)=>{crown.scale.setScalar(found.has('deer')?.8+Math.sin(t*2+i)*.18:.65);});
    for(const spot of spots){
      spot.mark.visible=spot.available();
      spot.mark.rotation.y=t*.8;
      spot.mark.position.y=spot.y+1.05+Math.sin(t*1.8+spot.x)*.16;
    }
  }

  return {spots,render,update,objective,
    obstacles:[wonders.deer,wonders.fox,wonders.baize,wonders.tiangou,wonders.zouwu,wonders.kui,wonders.kun,{x:-31,z:29}].map(point=>({x:point.x,z:point.z,r:point===wonders.kun?5.2:point===wonders.kui?1.65:.82})),
    get speedMultiplier(){return state.form==='boat'&&!state.dive&&Math.hypot(state.x-wonders.kui.x,state.z-wonders.kui.z)<14?1.42:1;},
    get mapPoints(){return [...found].map(id=>wonders[id]).filter(Boolean);}
  };
}
