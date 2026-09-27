import type {Snapshot} from './model';
export function creationExtras(kind:string,d:Record<string,any>) {
 return {
  ...(['item','skill'].includes(kind)?{prerequisites:d.chain?(d.prerequisites||[]):[]}:{}),
  ...(['book','item','skill'].includes(kind)&&d.targeted?{obtain_target:d.obtain_target||'',obtain_target_kind:d.obtain_target_kind||''}:{}),
 };
}
export function targetProblem(kind:string,targetKind:string,id:string,data:Snapshot):string {
 if(!id)return '획득 대상을 선택해 주세요.';
 const place=data.places.find(p=>p.id===id&&p.creator===data.profile.id&&p.active);
 const entity=data.entities.find(e=>e.id===id&&e.creator===data.profile.id&&e.active);
 if(kind==='book')return targetKind==='place'&&place?.category==='library'?'':'책은 내가 만든 도서관에만 배치할 수 있습니다.';
 if(['item','skill'].includes(kind)){
  if(targetKind==='place'&&place&&['forest','road','dungeon'].includes(place.category))return '';
  if(targetKind==='entity'&&entity&&['monster','book','npc'].includes(entity.kind))return '';
 }
 return '아이템·기술은 내가 만든 몬스터·책·NPC 또는 숲·길·던전에만 지정할 수 있습니다.';
}
export function hasPrerequisites(d:Record<string,any>,data:Snapshot):boolean {
 return (d.prerequisites||[]).every((id:string)=>data.inventory.some(i=>i.student===data.profile.id&&i.entity===id)||data.learned_skills.some(s=>s.student===data.profile.id&&s.skill===id));
}
export function requirementsText(d:Record<string,any>,data:Snapshot):string {
 return (d.prerequisites||[]).map((id:string)=>data.entities.find(e=>e.id===id)?.name||'이전 창작물').join(', ');
}
