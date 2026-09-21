export type Profile = { id: string; nickname: string; role: 'teacher'|'student'; status: string; balance: number; reserved: number; hp: number; max_hp: number; attack: number; defense: number; level: number; exp: number; location: string };
export type Question = { id: string; author: string; subject: string; kind: 'ox'|'short'|'choice'; body: string; options: string[]; answer: string; explanation: string; accepted: string[]; status: string; feedback: string; rewarded: boolean; created_at: string };
export type Settings = { id: boolean; subjects: string[]; question_reward: number; daily_reward_cap: number; room_cost: number; stat_cost: number; stat_cap: number; monster_base: number; effect_base: number; registration_open: boolean; creation_open: boolean; paused: boolean };
export type Place = { id: string; creator: string|null; name: string; description: string; category: string; active: boolean; protected: boolean; x: number; y: number };
export type Entity = { id: string; creator: string; kind: string; name: string; data: Record<string, any>; active: boolean; place: string|null };
export type Proposal = { id: string; author: string; kind: string; name: string; data: Record<string, any>; cost: number; status: string; feedback: string };
export type Ledger = { id: string; student: string; amount: number; reserved_delta: number; reason: string; created_at: string };
export type Link = { source: string; direction: string; target: string };
export type Battle = { id: string; monster: string; hp: number; correct_count: number; token: string; repeated: boolean; question: Pick<Question,'id'|'kind'|'body'|'options'|'subject'> };
export type Snapshot = { profile: Profile; students: Profile[]; settings: Settings; questions: Question[]; proposals: Proposal[]; places: Place[]; links: Link[]; entities: Entity[]; ledger: Ledger[]; battle: Battle|null };
export const START = '00000000-0000-4000-8000-000000000001';
export const categories: Record<string,string> = {square:'광장',village:'마을',house:'주택',road:'길·다리',forest:'숲·황야',dungeon:'던전',boss:'보스방',healing:'치유소',library:'도서관'};
export const labels: Record<string,string> = {ox:'OX',short:'단답형',choice:'객관식',pending:'승인 대기',submitted:'검토 대기',approved:'승인',revision:'수정 요청',rejected:'반려',draft:'작성 중',suspended:'이용 중지',cancelled:'취소',map:'맵',monster:'몬스터',item:'아이템',skill:'기술',heal:'회복',guard:'방어',strike:'강타'};
export const defaults: Settings = {id:true,subjects:['국어','수학','사회','과학','실과'],question_reward:10,daily_reward_cap:100,room_cost:10,stat_cost:10,stat_cap:100,monster_base:10,effect_base:10,registration_open:true,creation_open:true,paused:false};
export function validateQuestion(q: Pick<Question,'subject'|'kind'|'body'|'options'|'answer'|'explanation'>) {
 if (!q.subject || q.body.trim().length<3 || !q.answer.trim() || !q.explanation.trim()) return '과목, 문제, 정답, 해설을 모두 입력해 주세요. 문제는 3자 이상입니다.';
 if (q.kind==='choice' && (q.options.length!==4 || q.options.some(x=>!x.trim()) || !['1','2','3','4'].includes(q.answer))) return '보기 네 개와 정답 하나를 선택해 주세요.';
 if (q.kind==='ox' && !['O','X'].includes(q.answer)) return 'O 또는 X를 선택해 주세요.';
 return '';
}
export function estimate(kind: string, d: Record<string,any>, s: Settings) {
 if(kind==='map') return Number(d.count)*s.room_cost;
 if(kind==='monster') return s.monster_base+Math.ceil(Number(d.hp)/10)+Number(d.attack)+Number(d.defense)+Number(d.level)*2;
 return s.effect_base+Number(d.power)*2;
}
export function previewSnapshot(role:'teacher'|'student'): Snapshot {
 const student: Profile={id:'preview-student',nickname:'별빛탐험가',role:'student',status:'approved',balance:60,reserved:20,hp:85,max_hp:100,attack:20,defense:3,level:2,exp:35,location:START};
 const teacher: Profile={...student,id:'preview-teacher',nickname:'선생님',role:'teacher'};
 return {profile:role==='teacher'?teacher:student,students:[student,{...student,id:'pending',nickname:'구름고래',status:'pending'}],settings:defaults,
 questions:[{id:'preview-q',author:student.id,subject:'과학',kind:'ox',body:'물은 온도에 따라 고체, 액체, 기체로 변할 수 있다.',options:[],answer:'O',explanation:'얼음, 물, 수증기는 물의 서로 다른 상태입니다.',accepted:[],status:'submitted',feedback:'',rewarded:false,created_at:new Date().toISOString()}],
 proposals:[{id:'preview-p',author:student.id,kind:'map',name:'빛나는 숲',data:{count:2,category:'forest',anchor:START,direction:'동',description:'작은 반딧불이 길을 안내합니다.'},cost:20,status:'pending',feedback:''}],
 places:[{id:START,name:'배움의 광장',description:'친구들과 함께 만드는 우리 반의 세계.',category:'square',creator:null,active:true,protected:true,x:0,y:0},{id:'forest',name:'질문의 숲',description:'나무마다 새로운 질문이 열립니다.',category:'forest',creator:student.id,active:true,protected:false,x:1,y:0}],
 links:[{source:START,direction:'동',target:'forest'},{source:'forest',direction:'서',target:START}],entities:[{id:'preview-m',creator:student.id,kind:'monster',name:'물음표 슬라임',data:{hp:70,attack:10,defense:2,level:1,min_correct:3},active:true,place:'forest'}],ledger:[],battle:null};
}
