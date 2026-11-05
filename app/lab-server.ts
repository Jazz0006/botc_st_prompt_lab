import {getDb} from '../db';
import {labVersions,labRuns} from '../db/schema';
import {draftSchema,LabDraft} from './lab-model';
import {eq} from 'drizzle-orm';
export function writeGuard(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'请求来源无效。'},{status:403});if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'需要 JSON 数据。'},{status:415});return null}
export async function jsonBody(req:Request,max=1000000){if(Number(req.headers.get('content-length'))>max)throw Error('数据超过大小限制。');const s=await req.text();if(new TextEncoder().encode(s).length>max)throw Error('数据超过大小限制。');return JSON.parse(s)}
export async function freezeDraft(input:unknown){const draft=draftSchema.parse(input);const data=JSON.stringify(draft);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));const id='v_'+Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);const row={id,title:draft.title,templateId:draft.templateId,baseline:draft.baseline,data,createdAt:new Date().toISOString()};await getDb().insert(labVersions).values(row).onConflictDoNothing();return {id,draft,createdAt:row.createdAt}}
export async function getVersion(id:string):Promise<LabDraft|null>{const rows=await getDb().select().from(labVersions).where(eq(labVersions.id,id));return rows[0]?draftSchema.parse(JSON.parse(rows[0].data)):null}
export async function getRun(id:string){const rows=await getDb().select().from(labRuns).where(eq(labRuns.id,id));return rows[0]?{...rows[0],...JSON.parse(rows[0].data),evaluation:JSON.parse(rows[0].evaluation)}:null}
