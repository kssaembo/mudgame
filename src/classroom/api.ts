import { createClient } from '@supabase/supabase-js';
import type { Snapshot } from './model';
const env = (import.meta as any).env;
export const supabase = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY) : null;
export async function rpc<T=any>(name:string,args:Record<string,unknown>={}) : Promise<T> {
 if(!supabase) throw new Error('Supabase 연결 정보가 필요합니다.');
 const {data,error}=await supabase.rpc(`mud_${name}`,args); if(error) throw error; return data as T;
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
export async function snapshot():Promise<Snapshot|null> {
 if(!supabase) return null;
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError || !user) return null;
 const {data:profile,error}=await supabase.from('mud_profiles').select('*').eq('id',user.id).maybeSingle();
 if(error) throw new Error('학급 데이터베이스 설정이 필요합니다. SETUP.md의 설치 단계를 확인해 주세요.');
 if(!profile) throw new Error('교사 계정 지정 또는 학생 가입 승인이 필요합니다.');
 if(profile.status!=='approved') throw new Error('승인 대기 또는 이용 중지 상태입니다. 선생님께 확인해 주세요.');
 const tables=['settings','questions','proposals','places','links','entities','ledger','inventory'];
 // Pagination removes the old 1,000-row inventory/world cap.
 const results=await Promise.all(tables.map(async t=>{
   const rows:any[]=[];
   for(let offset=0;;offset+=1000){
     let query=supabase!.from(`mud_${t}`).select('*').order(t==='links'?'source':'id');
     if(t==='links') query=query.order('direction');
     const {data,error}=await query.range(offset,offset+999);
     if(error) throw new Error(error.code==='PGRST205'?'새 기능 데이터베이스 업데이트가 필요합니다. 202609230003~005 SQL을 순서대로 적용해 주세요.':error.message);
     rows.push(...data);if(data.length<1000)break;
   }
   return rows;
 }));
 const all=Object.fromEntries(tables.map((t,i)=>[t,results[i]]));
 let students=[];
 if(profile.role==='teacher') {const result=await supabase.from('mud_profiles').select('*'); if(result.error) throw result.error; students=result.data;}
 return {...all,settings:all.settings[0],profile,students,battle:profile.role==='student'?await rpc('battle_view'):null} as Snapshot;
}
