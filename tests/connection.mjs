import { readFile } from 'node:fs/promises';
const env=Object.fromEntries((await readFile('.env.local','utf8')).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
const response=await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/mud_settings?select=id`,{headers:{apikey:env.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15000)});
const body=await response.json();
console.log(JSON.stringify({httpStatus:response.status,code:body.code||null,message:body.message||null}));
