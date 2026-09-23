import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

test('expanded world: migrations, ownership, bonuses, inventory, books and combat',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
 const T=crypto.randomUUID(),S=crypto.randomUUID(),U=crypto.randomUUID();
 await db.query('insert into auth.users values ($1),($2),($3)',[T,S,U]);
 await db.query(`insert into mud_profiles(id,nickname,role,status,balance) values ($1,'교사','teacher','approved',0),($2,'학생','student','approved',10000),($3,'다른학생','student','approved',10000)`,[T,S,U]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 async function root(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
 async function call(name,args=[]){return (await db.query(`select mud_${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0].result;}
 const START='00000000-0000-4000-8000-000000000001';
 assert.equal((await db.query('select count(*)::int n from mud_places')).rows[0].n,21);
 assert.equal((await db.query('select count(*)::int n from mud_question_bank')).rows[0].n,16);
 assert.equal((await db.query("select count(*)::int n from mud_places where category='boss'")).rows[0].n,0);
 await as(S);assert.equal((await db.query('select * from mud_question_bank')).rows.length,0);
 await assert.rejects(()=>db.query('select * from mud_visits'),/permission denied/);
 await assert.rejects(()=>call('review_questions',[[],'approved','',[],10]),/교사/);
 assert.equal(await call('quote',['item',JSON.stringify({attack:5,defense:2,hp:10,power:3,effect:'heal'})]),32);
 const q=await call('submit_question',[null,'과학','short','물의 영어 이름','[]','Water','water입니다.']);
 await as(T);await call('review_questions',[[q],'approved','',[],7]);await call('review_questions',[[q],'approved','',[],7]);
 assert.equal((await db.query('select balance from mud_profiles where id=$1',[S])).rows[0].balance,10017);
 const npc=crypto.randomUUID(),book=crypto.randomUUID(),town=crypto.randomUUID(),building=crypto.randomUUID();
 await as(S);
 await call('submit_proposal',[npc,'npc','나의 안내자',JSON.stringify({description:'안녕!\n도서관에 가 보렴.'})]);
 await call('submit_proposal',[book,'book','학생의 책',JSON.stringify({description:'책 내용 첫 줄\n둘째 줄'})]);
 await as(T);await call('review_proposal',[npc,'approved','',4]);await call('review_proposal',[npc,'approved','',4]);await call('review_proposal',[book,'approved','',0]);
 assert.equal((await db.query("select count(*)::int n from mud_ledger where event_key=$1",['creation-bonus:'+npc])).rows[0].n,1);
 await as(S);
 await call('submit_proposal',[town,'map','나의 마을',JSON.stringify({count:1,category:'village',anchor:'50000000-0000-4000-8000-000000000013',direction:'동'})]);
 await as(T);await call('review_proposal',[town,'approved','',0]);
 const village=(await db.query("select id from mud_places where creator=$1 and category='village'",[S])).rows[0].id;
 await as(U);await assert.rejects(()=>call('submit_proposal',[crypto.randomUUID(),'map','남의 도서관',JSON.stringify({count:1,category:'library',village_id:village})]),/내가 만든/);
 await as(S);await call('submit_proposal',[building,'map','우리 도서관',JSON.stringify({count:1,category:'library',village_id:village})]);
 await assert.rejects(()=>call('submit_proposal',[crypto.randomUUID(),'map','두 번째 건축물',JSON.stringify({count:1,category:'house',village_id:village})]),/이미 건축물/);
 await as(T);await call('review_proposal',[building,'approved','',0]);
 await root('update mud_profiles set location=$1 where id=$2',[village,S]);
 await root('insert into mud_visits(student,place,npc) values ($1,$2,$3)',[S,village,npc]);
 await as(S);assert.match((await call('explore',['대화',crypto.randomUUID()])).text,/나의 안내자.*안녕/s);
 await call('explore',['입장',crypto.randomUUID()]);
 await root('update mud_visits set book=$1 where student=$2',[book,S]);
 await root('update mud_settings set book_reward_chance=100,encounter_chance=0,loot_chance=100');
 await as(S);const readID=crypto.randomUUID();const first=await call('explore',['읽기',readID]);assert.match(first.text,/책 내용 첫 줄/);
 assert.deepEqual(await call('explore',['읽기',readID]),first);
 await call('explore',['읽기',crypto.randomUUID()]);
 assert.equal((await db.query("select sum(amount)::int n from mud_ledger where student=$1 and event_key like 'adventure:book:%'",[S])).rows[0].n,1);
 await call('explore',['나가기',crypto.randomUUID()]);
 await root('update mud_profiles set location=$1 where id=$2',['50000000-0000-4000-8000-000000000003',S]);
 await root('update mud_visits set place=$1,npc=$2 where student=$3',['50000000-0000-4000-8000-000000000003',npc,S]);
 await as(S);await assert.rejects(()=>call('explore',['대화',crypto.randomUUID()]),/NPC|만날|대화/);
 // Owning a template is not owning a usable inventory instance. Loot is awarded once.
 const mon=crypto.randomUUID();
 await root('update mud_question_bank set subject=$1 where id=$2',['검증과목',q]);
 await root("insert into mud_entities(id,kind,name,data,place) values ($1,'monster','테스트 몬스터',$2,$3)",[mon,JSON.stringify({hp:10,attack:1,defense:0,level:10,min_correct:2,effect:'none',power:0,subject:'검증과목'}),'50000000-0000-4000-8000-000000000001']);
 await root('update mud_profiles set location=$1,attack=1000,exp=90 where id=$2',['50000000-0000-4000-8000-000000000001',S]);
 await as(S);let b=await call('start_battle');
 const template='60000000-0000-4000-8000-000000000011';
 await assert.rejects(()=>call('answer',[b.token,'O',template]),/보유|아이템|기술/);
 const wrong=await call('answer',[b.token,'Waterfall',null]);assert.equal(wrong.correct,false);assert.equal(wrong.damage,0);b=await call('battle_view');
 let result;
 for(let i=0;i<2;i++){
  const answer=(await root('select answer from mud_question_bank where id=$1',[b.question.id])).rows[0].answer;
  await as(S);result=await call('answer',[b.token,'\t '+answer.toUpperCase()+' \n',null]);
  assert.deepEqual(await call('answer',[b.token,answer,null]),result);
  if(i===0){assert.notEqual(result.status,'won');b=await call('battle_view');}
 }
 assert.equal(result.status,'won');assert.ok(result.loot);assert.ok(result.levels>=1);
 assert.equal((await call('bag')).length,1);
 await assert.rejects(()=>db.query('update mud_inventory set equipped=true'),/permission denied/);
 await as(U);assert.equal((await db.query('select * from mud_inventory')).rows.length,0);
 await root(`insert into mud_inventory(student,entity,name,data,slot,source_key) select $1,id,name,data,'weapon','test-equipment' from mud_entities where id='60000000-0000-4000-8000-000000000014'`,[S]);
 await as(S);const gear=(await call('bag')).find(i=>i.source_key==='test-equipment');await call('equipment',[gear.id,true]);
 assert.equal((await call('bag')).find(i=>i.id===gear.id).equipped,true);
 await root(`insert into mud_inventory(student,entity,name,data,slot,source_key) select $1,id,name,data,'consumable','many-'||n from mud_entities cross join generate_series(1,1001) n where id='60000000-0000-4000-8000-000000000011'`,[S]);
 await as(S);assert.equal((await call('bag')).length,1003,'inventory has no arbitrary item cap');
 await root('update mud_profiles set hp=1 where id=$1',[S]);await as(S);
 const potion=(await call('bag')).find(i=>i.source_key==='many-1');const useID=crypto.randomUUID();const used=await call('use_item',[potion.id,useID]);assert.equal(await call('use_item',[potion.id,useID]),used);assert.equal((await call('bag')).length,1002);
 // Disconnected seed regions are connectable without overwriting the destination.
 const connection=crypto.randomUUID();await call('submit_proposal',[connection,'map','이어진 길',JSON.stringify({count:3,category:'road',anchor:'50000000-0000-4000-8000-000000000003',direction:'동'})]);
 await as(T);await call('review_proposal',[connection,'approved','',0]);
 assert.equal((await db.query("select count(*)::int n from mud_links where target='50000000-0000-4000-8000-000000000014' and direction='동'")).rows[0].n,1);
 assert.equal((await db.query("select name from mud_places where id='50000000-0000-4000-8000-000000000014'")).rows[0].name,'잊힌 마을');
 await root('update mud_settings set adventure_daily_cap=1');
 await root('update mud_visits set place=$1,chest=true where student=$2',['50000000-0000-4000-8000-000000000001',S]);
 await as(S);const chest=await call('explore',['열기',crypto.randomUUID()]);assert.equal(chest.creativity,0,'daily exploration cap also applies to chests');
 await assert.rejects(()=>call('explore',['열기',crypto.randomUUID()]),/보물상자/);
 console.log('All five migrations and classroom expansion checks passed.');
});
