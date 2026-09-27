import type {Snapshot} from './model';
export function reviewCounts(data: Pick<Snapshot,'students'|'questions'|'proposals'>): Record<string,number> {
 return {students:data.students.filter(s=>s.status==='pending').length,
 questions:data.questions.filter(q=>q.status==='submitted').length,
 proposals:data.proposals.filter(p=>p.status==='pending').length};
}
