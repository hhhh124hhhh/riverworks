export function createSound() {
  let ctx, bus, landscape, water, wind, record, nextNote=0, enabled=false, volume=.55, track=0, index=0;
  const notes=[
    [196,293.66,329.63,392,440,587.33,493.88,293.66],
    [220,261.63,329.63,392,440,523.25,392,329.63],
    [174.61,261.63,349.23,392,523.25,440,349.23,261.63]
  ];

  function noise(type, hz, q, max) {
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    let last=0;
    for(let i=0;i<data.length;i++){
      last=last*.82+(Math.random()*2-1)*.18;
      data[i]=last;
    }
    const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    source.buffer=buffer;
    source.loop=true;
    filter.type=type;
    filter.frequency.value=hz;
    filter.Q.value=q;
    gain.gain.value=max;
    source.connect(filter).connect(gain).connect(landscape);
    source.start();
    return {gain,filter};
  }

  function init() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return false;
    ctx=new Audio();
    bus=ctx.createGain();
    bus.gain.value=0;
    bus.connect(ctx.destination);
    landscape=ctx.createGain();
    landscape.connect(bus);
    record=ctx.createGain();
    record.connect(bus);
    water=noise('lowpass',650,.6,.28);
    wind=noise('bandpass',360,.55,.23);
    return true;
  }

  async function toggle(value) {
    try{
      if(!ctx&&(!value||!init()))return false;
      if(value)await ctx.resume();
      enabled=value;
      bus.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.12);
      return enabled;
    }catch{
      enabled=false;
      return false;
    }
  }

  function setVolume(amount) {
    volume=amount;
    if(ctx)bus.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.1);
  }

  function tone(freq, length, amplitude, type='sine', when=0, target=bus, bend=1) {
    const osc=ctx.createOscillator(), env=ctx.createGain();
    const start=ctx.currentTime+when;
    osc.type=type;
    osc.frequency.setValueAtTime(freq,start);
    osc.frequency.exponentialRampToValueAtTime(freq*bend,start+length);
    env.gain.setValueAtTime(.0001,start);
    env.gain.exponentialRampToValueAtTime(amplitude,start+.02);
    env.gain.exponentialRampToValueAtTime(.0001,start+length);
    osc.connect(env).connect(target);
    osc.start(start);
    osc.stop(start+length+.015);
  }

  function play(name) {
    if(!enabled)return;
    if(name==='bell'){
      for(const [ratio,amp,len] of [[1,.19,5.4],[2.03,.08,3.8],[2.68,.037,3],[4.12,.024,2.7]]) {
        tone(221*ratio,len,amp);
        tone(221.8*ratio,len*.83,amp*.32,'sine',.23);
      }
    }else if(name==='fold'){
      tone(115,.42,.07,'triangle',0,bus,1.9);
      tone(216,.3,.035,'sine',.19,bus,.72);
      tone(424,.43,.046,'triangle',.48);
    }else if(name==='bird'){
      for(let i=0;i<5;i++)tone(875+i*110,.12,.026,'sine',i*.17,bus,1.34);
    }else{
      tone(411,.31,.038,'triangle');
      tone(618,.42,.031,'sine',.08);
    }
  }

  function update({bank, speed, boat, height, playing, recordNear, time, gust}) {
    if(!enabled)return;
    const now=ctx.currentTime;
    water.gain.gain.setTargetAtTime(.055+.32*Math.exp(-Math.abs(bank)*.075)+(boat?speed*.22:0),now,.3);
    wind.gain.gain.setTargetAtTime(.065+gust*.12+Math.min(height*.014,.22),now,.45);
    wind.filter.frequency.setTargetAtTime(255+gust*125+18*Math.sin(time*.81),now,.2);
    record.gain.setTargetAtTime(playing?.48+recordNear*.46:0,now,.17);
    if(playing&&now>=nextNote){
      const melody=notes[track];
      const n=melody[index%melody.length];
      tone(n,2,.105,'triangle',0,record);
      tone(n*2,1.1,.028,'sine',.06,record);
      if(index%4===0)tone(n*.5,3,.11,'sine',0,record);
      const beat=[.86,.62,1.32,.71,.78,.59,1.11,1.64];
      nextNote=now+beat[index%beat.length];
      index++;
    }
  }

  function setTrack(next) {
    track=next%notes.length;
    index=0;
  }
  return {toggle,setVolume,play,update,setTrack,get enabled(){return enabled;}};
}
