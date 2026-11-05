import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export function GET(){return Response.json({configured:Boolean(env.OPENAI_API_KEY),provider:'OpenAI Responses',endpoint:'https://api.openai.com/v1/responses',maxDailyRequests:20},{headers:{'Cache-Control':'no-store'}})}
