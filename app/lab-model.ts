import {z} from 'zod';
const text=z.string().max(100000);
export const aiConfigSchema=z.object({model:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/),maxOutputTokens:z.number().int().min(256).max(16000),timeoutSeconds:z.number().int().min(15).max(180),dailyRequests:z.number().int().min(1).max(20),strictJson:z.boolean()});
export const draftSchema=z.object({title:z.string().min(1).max(160),templateId:z.string().max(160),baseline:z.enum(['opening','experiment','continuation','custom']),sourceSha:z.string().max(80),instructions:text,state:text,task:text,output:text,config:aiConfigSchema});
export const evaluationSchema=z.object({verdict:z.enum(['未评价','保留','排除','待讨论']),reason:z.string().max(20000)});
export const externalSchema=z.object({requestId:z.string().min(8).max(120),versionId:z.string().min(1).max(100),platform:z.string().min(1).max(160),model:z.string().min(1).max(160),answer:z.string().min(1).max(250000),evaluation:evaluationSchema});
export type LabDraft=z.infer<typeof draftSchema>;
export type AIConfig=z.infer<typeof aiConfigSchema>;
export type Evaluation=z.infer<typeof evaluationSchema>;
export type VersionMeta={id:string;title:string;templateId:string;createdAt:string;baseline:string};
export type RunMeta={id:string;versionId:string;kind:string;platform:string;model:string;status:string;createdAt:string;evaluation:Evaluation};
export type LabRun=RunMeta&{answer:string;raw:string;error:string;responseId:string;elapsedMs:number|null;usage:Record<string,unknown>|null;formatNote:string};
export const defaultConfig:AIConfig={model:'gpt-6-luna',maxOutputTokens:6000,timeoutSeconds:120,dailyRequests:10,strictJson:false};
export function composePrompt(d:LabDraft){return `【固定说明】\n${d.instructions.trim()}\n\n【当前局面】\n${d.state.trim()}\n\n【本次任务】\n${d.task.trim()}\n\n【输出要求】\n${d.output.trim()}`}
export function buildApiRequest(d:LabDraft){const body:Record<string,unknown>={model:d.config.model,instructions:d.instructions.trim()+'\n\n【本次任务】\n'+d.task.trim()+'\n\n【输出要求】\n'+d.output.trim(),input:d.state,store:false,max_output_tokens:d.config.maxOutputTokens};if(d.config.strictJson){const schema=JSON.parse(d.output);if(schema.type!=='object'||!schema.properties)throw Error('严格 JSON 模式需要一个以 object 为根的 JSON Schema。');body.text={format:{type:'json_schema',name:'storyteller_lab',strict:true,schema}}}return body}
export function inspectAnswer(answer:string){try{const cleaned=answer.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const obj=JSON.parse(cleaned);if(!obj||typeof obj!=='object')return '有效 JSON；不是对象或数组。';const plans=Array.isArray(obj.plans)?obj.plans:null;return plans?`可解析 JSON · ${plans.length} 套候选 · 尚未经 APP 语义或规则验证`:'可解析 JSON · 尚未经 APP 语义或规则验证'}catch{return '文本回答 · 未进行 JSON 结构或规则验证'}}
