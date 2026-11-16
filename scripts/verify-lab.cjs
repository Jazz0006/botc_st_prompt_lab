const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {catalog,makeDraft,makeState,baselines,roles}=require('../app/lab-catalog.ts');
const {composePrompt,buildApiRequest,draftSchema,externalSchema}=require('../app/lab-model.ts');
assert.equal(catalog.length,480);assert.equal(new Set(catalog.map(p=>p.id)).size,480);
for(const p of catalog){const state=JSON.parse(makeState(p));assert.equal(state.seats.length,p.player_count,p.id);assert(!p.outsiders.includes('drunk'));const drunk=state.slots.find(s=>s.slot==='drunk');assert.equal(Boolean(drunk),p.drunk,p.id);if(p.drunk)assert.deepEqual(drunk.seats,state.seats.filter(s=>p.townsfolk.includes(s.role)).map(s=>s.seat));}
const d=makeDraft();assert(draftSchema.safeParse(d).success);const wire=buildApiRequest(d);assert.equal(wire.input,d.state);assert.equal(wire.store,false);assert(!('previous_response_id' in wire));
const prompt=composePrompt(d);for(const block of [d.instructions,d.state,d.task,d.output])assert(prompt.includes(block.trim()));assert(!prompt.includes('${HostOpeningStrategyMemoryV2'));
assert.equal(makeState(catalog[0]),makeState(catalog[0]));const stripped=draftSchema.parse({...d,apiKey:'sk-not-a-real-secret'});assert(!('apiKey' in stripped));assert(!JSON.stringify(buildApiRequest(stripped)).includes('sk-not-a-real-secret'));
const frozen=JSON.stringify(d);const changed={...d,state:'新局面',task:'新任务'};assert.notEqual(composePrompt(changed),prompt);assert.equal(JSON.parse(frozen).state,d.state);
assert.throws(()=>buildApiRequest({...d,output:'自然语言',config:{...d.config,strictJson:true}}));assert.equal(buildApiRequest({...d,config:{...d.config,strictJson:true}}).text.format.schema.type,'object');
assert(!draftSchema.safeParse({...d,config:{...d.config,dailyRequests:21}}).success);
assert(!externalSchema.safeParse({requestId:'12345678',versionId:'v_test',platform:'',model:'x',answer:'x',evaluation:{verdict:'保留',reason:'x'}}).success);
assert(baselines.opening.instructions.includes('为 Host 提供开局推荐'));assert(!baselines.opening.instructions.includes('恰好三项'));assert(baselines.experiment.instructions.includes('恰好三项'));assert.deepEqual(baselines.experiment.responseSchema.properties.plans.items.properties.plan,baselines.opening.responseSchema);assert.equal(baselines.experiment.responseSchema.properties.plans.minItems,3);
console.log('PASS: 480 distinct templates; player counts and Drunk semantics; complete portable prompt; frozen text independence; strict format validation; request caps; external answer validation; preserved APP baseline.');
const {defaultSeats,readOpeningSeats,swapSeats,tablePositions}=require('../app/lab-catalog.ts');
for(const p of catalog){
 const original=defaultSeats(p);original[0].experience='EXPERT';original[0].researchNote='moves with player';
 const before=JSON.stringify(original);const swapped=swapSeats(original,0,original.length-1);
 assert.equal(JSON.stringify(original),before);assert.equal(swapped.at(-1).experience,'EXPERT');assert.equal(swapped.at(-1).researchNote,'moves with player');
 assert.deepEqual(swapped.map(s=>s.seat),Array.from({length:p.player_count},(_,i)=>i+1));
 const state=JSON.parse(makeState(p,swapped));assert.deepEqual(readOpeningSeats(JSON.stringify(state),p),swapped);
 assert.notEqual(JSON.stringify(state.seats),JSON.stringify(JSON.parse(makeState(p,original)).seats));
 for(const info of state.firstNightInfo){assert.equal(info.role,state.seats[info.seat-1].role);assert(['ALWAYS','IF_DRUNK','NEVER'].includes(info.answer))}
 for(const seat of state.seats.filter(s=>s.role==='fortuneteller'))assert.equal(state.firstNightInfo.find(i=>i.seat===seat.seat).type,'AFTER_PLAYER_CHOICE');
 const all=new Set(state.seats.map(s=>s.seat)),inPlay=new Set(state.seats.map(s=>s.role));
 for(const slot of state.slots){for(const seat of slot.seats||[])assert(all.has(seat));for(const role of slot.roles||[])assert(!inPlay.has(role)&&roles[role])}
 assert.equal(state.slots.some(s=>s.slot==='demonBluffs'),p.player_count>=7);assert.equal(state.slots.some(s=>s.slot==='redHerring'),inPlay.has('fortuneteller'));
 assert.deepEqual(swapSeats(swapped,0,original.length-1),original);
}
for(let n=5;n<=15;n++){
 const {size,positions}=tablePositions(n);assert.equal(positions.length,n);assert.equal(new Set(positions.map(p=>p.row+','+p.col)).size,n);
 assert(positions.every(p=>p.row===1||p.col===size||p.row===size||p.col===1));
}
assert.equal(readOpeningSeats('任意手动文本',catalog[0]),null);
assert.throws(()=>makeState(catalog[0],[]));
console.log('PASS: 480 rearranged requests preserve player properties and rebuild seat references and candidates; swap is reversible; 5–15-player tables have unique perimeter seats; custom text is not silently parsed.');
const {openingDomain}=require('../app/lab-opening-domain.ts');
const fixture=require('./fixtures/host-opening-v3.json');
assert.equal(fixture.sourceSha,baselines.sourceSha);assert(fixture.cases.length>=7);
for(const c of fixture.cases){
 const seats=c.shown.map((role,i)=>({seat:i+1,role,experience:'BEGINNER'}));
 const domain=openingDomain(seats,c.hasDrunk,role=>roles[role].type);
 assert.deepEqual(seats,c.expected.seats);assert.deepEqual(domain.slots,c.expected.slots,c.shown.join(','));assert.deepEqual(domain.firstNightInfo,c.expected.firstNightInfo,c.shown.join(','));
}
console.log('PASS: opening candidates match '+fixture.cases.length+' requests exported from the APP at '+fixture.sourceSha.slice(0,8)+'.');
