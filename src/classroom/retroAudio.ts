export type RetroSfx='command'|'move'|'error'|'correct'|'wrong'|'encounter'|'hit'|'hurt'|'victory'|'reward'|'level'|'heal'|'page'|'talk';
export type MusicTrack='village'|'explore'|'battle';

let context:AudioContext|null=null;
let music:HTMLAudioElement|null=null;
let musicTrack:MusicTrack|null=null;
let musicVariant=0;
let musicEnabled=false;

const musicFiles:Record<MusicTrack,readonly string[]>={
 village:['/audio/village-1.mp3','/audio/village-2.mp3'],
 explore:['/audio/explore-1.mp3','/audio/explore-2.mp3'],
 battle:['/audio/battle-1.mp3','/audio/battle-2.mp3']
};

const patterns:Record<RetroSfx,Array<[number,number,OscillatorType,number]>>={
 command:[[520,.035,'square',.035]],move:[[220,.045,'square',.035],[330,.055,'square',.03]],
 error:[[150,.1,'sawtooth',.045],[105,.14,'square',.035]],correct:[[523,.07,'square',.04],[659,.07,'square',.04],[784,.12,'square',.04]],
 wrong:[[247,.1,'square',.04],[165,.16,'square',.04]],encounter:[[110,.11,'sawtooth',.045],[147,.11,'square',.04],[196,.16,'square',.04]],
 hit:[[180,.035,'square',.05],[90,.07,'sawtooth',.04]],hurt:[[130,.08,'sawtooth',.045],[82,.13,'square',.035]],
 victory:[[392,.09,'square',.04],[523,.09,'square',.04],[659,.09,'square',.04],[784,.22,'square',.045]],
 reward:[[659,.055,'square',.035],[880,.055,'square',.035],[1047,.12,'square',.035]],level:[[392,.08,'square',.04],[523,.08,'square',.04],[659,.08,'square',.04],[784,.08,'square',.04],[1047,.22,'square',.045]],
 heal:[[330,.1,'sine',.04],[440,.1,'square',.03],[659,.17,'sine',.035]],page:[[310,.025,'square',.025],[270,.025,'square',.02],[350,.04,'square',.02]],
 talk:[[440,.025,'square',.025],[494,.035,'square',.02]]
};

function audioContext(){
 if(typeof window==='undefined')return null;
 context??=new AudioContext();
 if(context.state==='suspended')void context.resume();
 return context;
}

export function playRetroSfx(name:RetroSfx,enabled=true){
 if(!enabled)return;
 const ctx=audioContext();if(!ctx)return;
 let at=ctx.currentTime+.005;
 for(const [frequency,duration,type,volume] of patterns[name]){
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain).connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration+.01);at+=duration*.72;
 }
}

export function sfxForText(text:string):RetroSfx|null{
 if(/^PS C:/.test(text))return 'command';
 if(/\[LEVEL UP\]/.test(text))return 'level';
 if(/\[승리\]/.test(text))return 'victory';
 if(/\[정답\]/.test(text))return 'correct';
 if(/\[오류\]/.test(text))return 'error';
 if(/\[(오답|구조)\]/.test(text))return 'wrong';
 if(/\[(전투|조우)\]|몬스터.*(등장|나타|발견)/.test(text))return 'encounter';
 if(/\[(회복|마력)\]|체력.*회복/.test(text))return 'heal';
 if(/\[(전리품|보물상자|보상|발견|기술 습득)\]|창조력 \+/.test(text))return 'reward';
 if(/\[책\]|책을/.test(text))return 'page';
 if(/NPC|: 「|\[대화\]/.test(text))return 'talk';
 return null;
}

function startMusic(track:MusicTrack,exclude=0){
 const files=musicFiles[track];
 const choices=files.map((_,index)=>index+1).filter(index=>index!==exclude);
 musicVariant=choices[Math.floor(Math.random()*choices.length)]||1;
 music?.pause();music=new Audio(files[musicVariant-1]);music.loop=false;music.volume=.2;music.preload='auto';musicTrack=track;
 music.addEventListener('ended',()=>{if(musicEnabled&&musicTrack===track)startMusic(track,musicVariant);},{once:true});
 void music.play().catch(()=>{});
}

export function setBackgroundMusic(enabled:boolean,track:MusicTrack){
 if(typeof window==='undefined')return;
 musicEnabled=enabled;
 if(!enabled){music?.pause();return;}
 if(music&&musicTrack===track){void music.play().catch(()=>{});return;}
 startMusic(track);
}

export function stopBackgroundMusic(){musicEnabled=false;music?.pause();}
