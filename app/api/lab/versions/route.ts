import {getDb} from '../../../../db';
import {labVersions} from '../../../../db/schema';
import {desc,eq} from 'drizzle-orm';
import {freezeDraft,writeGuard,jsonBody} from '../../../lab-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('id');if(id){const r=await getDb().select().from(labVersions).where(eq(labVersions.id,id));return r[0]?Response.json({...r[0],draft:JSON.parse(r[0].data)},{headers:{'Cache-Control':'no-store'}}):Response.json({error:'找不到版本。'},{status:404})}return Response.json(await getDb().select({id:labVersions.id,title:labVersions.title,templateId:labVersions.templateId,baseline:labVersions.baseline,createdAt:labVersions.createdAt}).from(labVersions).orderBy(desc(labVersions.createdAt)).limit(200),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'无法读取提示词版本，请重试。'},{status:503})}}
export async function POST(req:Request){const guard=writeGuard(req);if(guard)return guard;try{return Response.json(await freezeDraft(await jsonBody(req)))}catch{return Response.json({error:'版本未保存，请检查文本长度和模型配置。'},{status:400})}}
