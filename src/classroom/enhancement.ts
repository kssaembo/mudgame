import type {Entity,Profile} from './model';
export const enhancementRecipes=[
 {stones:1,creativity:0,chance:100},{stones:1,creativity:0,chance:95},{stones:2,creativity:0,chance:90},
 {stones:2,creativity:0,chance:80},{stones:3,creativity:5,chance:70},{stones:4,creativity:8,chance:60},
 {stones:5,creativity:12,chance:50},{stones:7,creativity:17,chance:40},{stones:9,creativity:23,chance:30},
];
export function enhancedData(base:Record<string,any>,level=0):Record<string,any>{
 const result={...base};const n=Math.min(9,Math.max(0,level));
 for(const key of ['attack','defense','hp','power']){const v=Number(base[key]||0);result[key]=v+(v>0?Math.floor(v*n*5/100):0);}
 return result;
}
export function manaCost(d:Record<string,any>){return Math.min(20,Math.max(4,Math.ceil(Math.max(0,Number(d.power||0))/3)+2));}
export function buyback(entity:Entity,students:Profile[]) {
 if(students.some(p=>p.id===entity.creator&&p.role==='student'))return Math.floor(entity.creation_cost*.8);
 const d=entity.data;return Math.min(20,((d.slot||'consumable')==='consumable'?1:2)+Math.floor((Math.max(0,Number(d.attack||0))*2+Math.max(0,Number(d.defense||0))*2+Math.max(0,Number(d.hp||0))/5+Math.max(0,Number(d.power||0)))/10));
}
