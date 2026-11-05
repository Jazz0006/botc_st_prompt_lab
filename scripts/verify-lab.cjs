const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {catalog,makeDraft,makeState,baselines}=require('../app/lab-catalog.ts');
const {composePrompt,buildApiRequest,draftSchema,externalSchema}=require('../app/lab-model.ts');
assert.equal(catalog.length,480);assert.equal(new Set(catalog.map(p=>p.id)).size,480);
for(const p of catalog){const state=JSON.parse(makeState(p));assert.equal(state.state.seats.length,p.player_count,p.id);assert(!p.outsiders.includes('drunk'));assert.equal(state.state.hasDrunk,p.drunk);if(p.drunk)for(const s of state.state.seats.filter(s=>p.townsfolk.includes(s.shownRoleId)))assert.equal(s.actualRoleId,'UNCOMMITTED_IF_DRUNK_SELECTED');}
const d=makeDraft();assert(draftSchema.safeParse(d).success);const wire=buildApiRequest(d);assert.equal(wire.input,d.state);assert.equal(wire.store,false);assert(!('previous_response_id' in wire));
const prompt=composePrompt(d);for(const block of [d.instructions,d.state,d.task,d.output])assert(prompt.includes(block.trim()));assert(!prompt.includes('${HostOpeningStrategyMemoryV2'));
assert.equal(makeState(catalog[0]),makeState(catalog[0]));const stripped=draftSchema.parse({...d,apiKey:'sk-not-a-real-secret'});assert(!('apiKey' in stripped));assert(!JSON.stringify(buildApiRequest(stripped)).includes('sk-not-a-real-secret'));
const frozen=JSON.stringify(d);const changed={...d,state:'新局面',task:'新任务'};assert.notEqual(composePrompt(changed),prompt);assert.equal(JSON.parse(frozen).state,d.state);
assert.throws(()=>buildApiRequest({...d,output:'自然语言',config:{...d.config,strictJson:true}}));assert.equal(buildApiRequest({...d,config:{...d.config,strictJson:true}}).text.format.schema.type,'object');
assert(!draftSchema.safeParse({...d,config:{...d.config,dailyRequests:21}}).success);
assert(!externalSchema.safeParse({requestId:'12345678',versionId:'v_test',platform:'',model:'x',answer:'x',evaluation:{verdict:'保留',reason:'x'}}).success);
assert(baselines.opening.instructions.includes('只输出一套'));assert(!baselines.experiment.instructions.includes('唯一最合适'));assert.equal(baselines.experiment.responseSchema.properties.plans.minItems,3);
console.log('PASS: 480 distinct templates; player counts and Drunk semantics; complete portable prompt; frozen text independence; strict format validation; request caps; external answer validation; preserved APP baseline.');
