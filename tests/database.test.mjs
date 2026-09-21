import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const T='10000000-0000-4000-8000-000000000001', S='10000000-0000-4000-8000-000000000002', U='10000000-0000-4000-8000-000000000003', P='10000000-0000-4000-8000-000000000004';
const start='00000000-0000-4000-8000-000000000001';
test('classroom SQL: permissions, approval, reservation and multi-turn combat',async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202609210001_classroom.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/202609210002_management.sql',import.meta.url),'utf8'));
 await db.query('insert into auth.users values ($1),($2),($3),($4)',[T,S,U,P]);
 await db.query(`insert into mud_profiles(id,nickname,role,status) values ($1,'교사','teacher','approved'),($2,'학생1','student','approved'),($3,'학생2','student','approved'),($4,'대기학생','student','pending')`,[T,S,U,P]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 async function call(name,args=[]){return (await db.query(`select mud_${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0].result;}
 await as(P);
 assert.equal((await db.query('select * from mud_places')).rows.length,0,'pending cannot read world');
 await assert.rejects(()=>call('submit_question',[null,'과학','ox','지구는 행성이다.','[]','O','태양 주위를 공전합니다.']),/승인된 학생/);
 await as(S);
 await assert.rejects(()=>db.query('update mud_profiles set balance=99999 where id=$1',[S]),/permission denied/);
 await assert.rejects(()=>call('manage_students',[[P],'approved']),/교사 권한/);
 const qs=[];
 for(let i=0;i<3;i++)qs.push(await call('submit_question',[null,'과학','short',`영어로 물을 뜻하는 단어 ${i}`,'[]','Water','물은 영어로 water입니다.']));
 await assert.rejects(()=>call('submit_question',[null,'과학','choice','잘못된 보기','["하나","둘"]','1','설명']),/보기 네 개/);
 await as(T);
 assert.equal(await call('review_questions',[qs,'approved','',[]]),3);
 assert.equal(await call('review_questions',[qs,'approved','',[]]),0,'approval is idempotent');
 await as(S);
 assert.equal((await db.query('select balance from mud_profiles where id=$1',[S])).rows[0].balance,30);
 assert.equal((await db.query('select * from mud_question_bank')).rows.length,0,'student cannot download answer bank');
 await assert.rejects(()=>db.query('select * from mud_battles'),/permission denied/);
 const mid=crypto.randomUUID();
 const map={count:2,category:'forest',anchor:start,direction:'동',description:'테스트 숲'};
 await call('submit_proposal',[mid,'map','테스트 숲',JSON.stringify(map)]);
 await call('submit_proposal',[mid,'map','테스트 숲',JSON.stringify(map)]);
 let wallet=(await db.query('select balance,reserved from mud_profiles where id=$1',[S])).rows[0];
 assert.deepEqual(wallet,{balance:30,reserved:20});
 await assert.rejects(()=>call('submit_proposal',[crypto.randomUUID(),'map','초과',JSON.stringify(map)]),/부족/);
 await as(U);await assert.rejects(()=>call('review_proposal',[mid,'cancelled','']),/자신의 신청/);
 await as(T);await call('review_proposal',[mid,'approved','']);await call('review_proposal',[mid,'approved','']);
 await as(S);wallet=(await db.query('select balance,reserved from mud_profiles where id=$1',[S])).rows[0];
 assert.deepEqual(wallet,{balance:10,reserved:0});
 assert.equal((await db.query('select * from mud_places')).rows.length,3);
 assert.equal((await db.query('select * from mud_links')).rows.length,4);
 const cancelled=crypto.randomUUID();await call('submit_proposal',[cancelled,'map','취소',JSON.stringify({...map,count:1,direction:'서'})]);await call('review_proposal',[cancelled,'cancelled','']);
 assert.equal((await db.query('select reserved from mud_profiles where id=$1',[S])).rows[0].reserved,0);
 // Revised approved question keeps old bank until reapproval, without another reward.
 await call('submit_question',[qs[0],'과학','short','수정한 물의 영어 이름','[]','water','다시 설명합니다.']);
 await as(T);assert.notEqual((await db.query('select body from mud_question_bank where id=$1',[qs[0]])).rows[0].body,'수정한 물의 영어 이름');
 await call('review_questions',[[qs[0]],'approved','',['H2O']]);
 const adjust=crypto.randomUUID();await call('adjust_balance',[S,500,'테스트 지급',adjust]);await call('adjust_balance',[S,500,'테스트 지급',adjust]);
 await as(S);assert.equal((await db.query('select balance from mud_profiles where id=$1',[S])).rows[0].balance,510);
 const loc=(await db.query("select target from mud_links where source=$1 and direction='동'",[start])).rows[0].target;
 const monster=crypto.randomUUID();await call('submit_proposal',[monster,'monster','검증 슬라임',JSON.stringify({hp:50,attack:15,defense:0,level:1,min_correct:3,place:loc,subject:'과학'})]);
 await as(T);await call('review_proposal',[monster,'approved','']);
 await as(U); // Student 2 has no questions; cannot know the bank through own submissions.
 await call('world_action',['동']);let b=await call('start_battle');
 assert.equal(b.hp,50);assert.equal(b.question.answer,undefined);assert.equal(b.question.explanation,undefined);
 const seen=new Set([b.question.id]);
 let result=await call('answer',[b.token,'wrong',null]);assert.equal(result.correct,false);assert.equal(result.taken,12);
 b=await call('battle_view');
 for(let turn=0;turn<3;turn++){
 if(turn<2)assert.equal(seen.has(b.question.id),false,'do not repeat until all questions were used');
 seen.add(b.question.id);const token=b.token;
 result=await call('answer',[token,'  WATER  ',null]);assert.equal(result.correct,true);
 assert.deepEqual(await call('answer',[token,'wrong',null]),result,'duplicate answer token must replay without damage/reward');
 if(turn<2){assert.equal(result.status,'active');b=await call('battle_view');}else assert.equal(result.status,'won');
 }
 assert.equal(seen.size,3,'rotate questions before repeating');assert.equal(await call('battle_view'),null);
 assert.equal((await db.query('select exp from mud_profiles where id=$1',[U])).rows[0].exp,10);
 await as(T);await call('manage_students',[[U],'suspended']);
 await as(U);await assert.rejects(()=>call('start_battle'),/승인된 학생/);assert.equal((await db.query('select * from mud_places')).rows.length,0);
 await as(T);await assert.rejects(()=>call('set_active',['place',[start],false]),/시작 광장/);
 await db.close();
});
