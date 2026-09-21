import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, estimate, validateQuestion } from '../src/classroom/model.ts';
test('exactly four choices and type-specific answers',()=>{
 const q={subject:'과학',kind:'choice' as const,body:'물의 상태는?',options:['고체','액체','기체','모두'],answer:'4',explanation:'모두 가능합니다.'};
 assert.equal(validateQuestion(q),'');
 assert.notEqual(validateQuestion({...q,options:['고체','액체','기체']}),'');
 assert.notEqual(validateQuestion({...q,answer:'5'}),'');
 assert.notEqual(validateQuestion({...q,options:['고체','액체','','모두']}),'');
 assert.equal(validateQuestion({...q,kind:'short',options:[],answer:'물'}),'');
 assert.equal(validateQuestion({...q,kind:'ox',options:[],answer:'O'}),'');
 assert.notEqual(validateQuestion({...q,kind:'ox',options:[],answer:'맞음'}),'');
});
test('construction cost scales with size and power',()=>{
 assert.equal(estimate('map',{count:2},defaults),20);
 assert.equal(estimate('monster',{hp:50,attack:10,defense:2,level:1},defaults),29);
 assert.equal(estimate('skill',{power:5},defaults),20);
});
