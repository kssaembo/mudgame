import { createClient } from '@supabase/supabase-js';
import type { Snapshot } from './model';
const env = (import.meta as any).env;
export const supabase = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY) : null;
export async function rpc<T=any>(name:string,args:Record<string,unknown>={}) : Promise<T> {
 if(!supabase) throw new Error('Supabase 연결 정보가 필요합니다.');
 const {data,error}=await supabase.rpc(`mud_${name}`,args); if(error) {if(error.code==='PGRST202')throw new Error('데이터베이스 업데이트가 필요합니다. 202610020013_usability.sql까지 적용해 주세요.');throw error;} return data as T;
}
export async function studentAccess(action:string,nickname:string,pin:string,studentId?:string) {
 if(!supabase) throw new Error('Supabase 연결 정보가 필요합니다.');
 const {data,error}=await supabase.functions.invoke('student-access',{body:{action,nickname,pin,studentId}});
 if(error) {
   let message='로그인 서버에 연결하지 못했습니다. 함수 배포와 접속 주소 설정을 확인해 주세요.';
   try {message=(await (error as any).context.json()).error || message;} catch {}
   throw new Error(message);
 }
 if(data.error) throw new Error(data.error);
 if(data.session) {const result=await supabase.auth.setSession(data.session); if(result.error) throw result.error;}
 return data;
}
export async function snapshot(screen='home'):Promise<Snapshot|null> {
 if(!supabase) return null;
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError || !user) return null;
 const {data:profile,error}=await supabase.from('mud_profiles').select('*').eq('id',user.id).maybeSingle();
 if(error) throw new Error('학급 데이터베이스 설정이 필요합니다. SETUP.md의 설치 단계를 확인해 주세요.');
 if(!profile) throw new Error('교사 계정 지정 또는 학생 가입 승인이 필요합니다.');
 if(profile.status!=='approved') throw new Error('승인 대기 또는 이용 중지 상태입니다. 선생님께 확인해 주세요.');
 const teacher=profile.role==='teacher';
 if(!teacher)Object.assign(profile,await rpc('vitals'));
 const battle=teacher?null:await rpc('battle_view');
 let nearby:string[]=[profile.location],localShops:string[]=[];
 if(!teacher&&screen!=='proposals'){
 const location=await supabase.from('mud_places').select('x,y,village_id').eq('id',profile.location).maybeSingle();if(location.error)throw location.error;
 if(location.data?.village_id)nearby.push(location.data.village_id);
 else if(location.data){const {x,y}=location.data;const r=await supabase.from('mud_places').select('id').eq('active',true).is('village_id',null).or(`and(x.eq.${x+1},y.eq.${y}),and(x.eq.${x-1},y.eq.${y}),and(x.eq.${x},y.eq.${y+1}),and(x.eq.${x},y.eq.${y-1})`);if(r.error)throw r.error;nearby.push(...r.data.map(p=>p.id));}
 }
 if(!teacher&&screen==='shops'){const r=await supabase.from('mud_shops').select('id').eq('place',profile.location).eq('active',true);if(r.error)throw r.error;localShops=r.data.map(x=>x.id);}
 const names=['settings','questions','proposals','places','links','entities','ledger','inventory','learned_skills','shops','shop_products','acquisitions','blacksmiths'];
 const tables=teacher?['settings',...(({home:['questions','proposals','places','links'],students:[],questions:['questions'],proposals:['proposals','places','entities'],world:['places','links','entities','shops','shop_products','blacksmiths'],settings:[]} as Record<string,string[]>)[screen]||[])]:['settings','places','links','inventory','learned_skills','shops','blacksmiths',...(screen==='questions'?['questions']:screen==='proposals'?['proposals']:screen==='wallet'?['ledger']:screen==='shops'?['shop_products','acquisitions']:[])];
 // Pagination removes the old 1,000-row inventory/world cap.
 const results=await Promise.all(tables.map(async t=>{
   const rows:any[]=[];
   for(let offset=0;;offset+=1000){
     let query=supabase!.from(`mud_${t}`).select('*').order(t==='links'?'source':t==='ledger'?'created_at':'id',{ascending:t!=='ledger'});
     if(teacher&&screen==='home'&&t==='questions')query=query.eq('status','submitted');
     if(teacher&&screen==='home'&&t==='proposals')query=query.eq('status','pending');
     if(!teacher){
       if(['questions','proposals'].includes(t))query=query.eq('author',profile.id);
       if(['inventory','learned_skills','ledger','acquisitions'].includes(t))query=query.eq('student',profile.id);
       if(['shops','blacksmiths'].includes(t))query=query.eq('place',profile.location).eq('active',true);
       if(t==='links'&&screen!=='proposals')query=query.eq('source',profile.location);
       if(t==='shop_products')query=query.in('shop',localShops);
       if(t==='places'&&screen!=='proposals')query=query.or(`id.in.(${nearby.join(',')}),village_id.eq.${profile.location}`);
     }
     if(t==='links') query=query.order('direction');
     const {data,error}=await query.range(offset,t==='ledger'?49:offset+999);
     if(error) throw new Error(error.code==='PGRST205'?'새 기능 데이터베이스 업데이트가 필요합니다. 202610020013_usability.sql까지 순서대로 적용해 주세요.':error.message);
     rows.push(...data);if(t==='ledger'||data.length<1000)break;
   }
   return rows;
 }));
 const all=Object.fromEntries(names.map(t=>[t,results[tables.indexOf(t)]||[]]));
 if(!teacher){
 const ids=[...new Set([...all.inventory.map(i=>i.entity),...all.learned_skills.map(k=>k.skill),...all.shop_products.map(p=>p.entity),...(battle?[battle.monster]:[])])];
 // Only templates referenced by owned items/skills, the current encounter, or the opened shop.
 for(let n=0;n<ids.length;n+=100){const r=await supabase.from('mud_entities').select('*').in('id',ids.slice(n,n+100));if(r.error)throw r.error;all.entities.push(...r.data);}
 if(screen==='proposals')for(let n=0;;n+=1000){const r=await supabase.from('mud_entities').select('*').eq('creator',profile.id).order('id').range(n,n+999);if(r.error)throw r.error;all.entities.push(...r.data);if(r.data.length<1000)break;}
 all.entities=[...new Map(all.entities.map(e=>[e.id,e])).values()];
 }
 let students=[];
 if(teacher) {const result=await supabase.from('mud_profiles').select('*'); if(result.error) throw result.error; students=result.data;}
 return {...all,settings:all.settings[0],profile,students,battle,review_counts:teacher?await rpc('review_counts'):undefined} as Snapshot;
}
