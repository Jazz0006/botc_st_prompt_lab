import {getDb} from '../../../../db';
import {labRuns} from '../../../../db/schema';
import {eq} from 'drizzle-orm';
import {getVersion} from '../../../lab-server';
import {composePrompt} from '../../../lab-model';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('versionId');if(!id)return Response.json({error:'缺少版本。'},{status:400});const draft=await getVersion(id);if(!draft)return Response.json({error:'找不到版本。'},{status:404});const rows=await getDb().select().from(labRuns).where(eq(labRuns.versionId,id));return Response.json({format:'storyteller-lab-experiment-v1',exportedAt:new Date().toISOString(),versionId:id,draft,completePrompt:composePrompt(draft),runs:rows.map(r=>({...r,data:JSON.parse(r.data),evaluation:JSON.parse(r.evaluation)}))},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'导出未完成，请重试。'},{status:503})}}
