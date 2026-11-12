const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],viewport=process.argv[3],root=w+'/.runtime/cookbook-queue-'+phase+'-'+viewport,origin='http://127.0.0.1:17891';let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:viewport==='desktop'?{width:1440,height:1000}:{width:390,height:844}}),errors=[],downloads=[];
 assert((await context.request.post(origin+'/api/auth/login',{data:{username:'cookbook-queue-smoke',password:fs.readFileSync(root+'/password','utf8')}})).ok());
 const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url().endsWith('/api/model/download')&&r.request().method()==='POST'){downloads.push({status:r.status(),request:r.request().postDataJSON(),reply:await r.json()});}});
 await page.goto(origin);await page.waitForFunction(()=>window.cookbookModule?.open);
 for(let i=0;i<3;i++){const button=page.getByRole('button',{name:'Got it',exact:true});if(await button.isVisible())await button.click();}
 await page.evaluate(()=>window.cookbookModule.open({tab:'Running'}));await page.locator('#cookbook-modal').waitFor({state:'visible'});
 // Use the application's existing public download controller with owned fixture
 // catalog metadata; no task/result/renderer is replaced or directly seeded.
 const launch=async name=>page.evaluate(async n=>{const d=await import('/static/js/cookbookDownload.js');await d._runModelDownload(document.querySelector('#cookbook-modal'),{name:'owned/'+n,is_gguf:true,gguf_sources:[{repo:'owned/'+n,file:'owned-Q4_K_M.gguf'}]},'llamacpp','');const r=await import('/static/js/cookbookRunning.js');return r._loadTasks();},name);
 const first=await launch('first');fs.writeFileSync(root+'/first-tasks.json',JSON.stringify(first,null,2));assert.equal(first.length,1,JSON.stringify(downloads));assert(/^cookbook-/.test(first[0].sessionId));
 await page.waitForFunction(()=>document.querySelector('.cookbook-task'));
 for(let i=0;i<100&&!fs.existsSync(root+'/first-get-started');i++)await page.waitForTimeout(100);
 assert(fs.existsSync(root+'/first-get-started'),'real hf CLI did not start the owned file GET');
 const second=await launch('second');assert.equal(second.length,2);const queued=second.find(t=>t.payload?.repo_id==='owned/second');assert(queued.sessionId.startsWith('queue-'));assert.equal(queued.status,'queued');
 // Wait for the actual background status round trip to include the persisted
 // placeholder. The server really reports it stopped: it has no tmux session.
 let statusSnapshot=null;
 for(let i=0;i<65;i++){
  const response=await context.request.get(origin+'/api/cookbook/tasks/status');assert(response.ok());const snapshot=await response.json();
  if(snapshot.tasks?.some(t=>t.session_id===queued.sessionId)){statusSnapshot=snapshot;break;}
  await page.waitForTimeout(200);
 }
 assert(statusSnapshot,'server did not see persisted queue task');
 const live=()=>page.evaluate(async()=>{const r=await import('/static/js/cookbookRunning.js');return r._loadTasks();});
 if(phase==='before'){for(let i=0;i<160;i++){if((await live()).find(t=>t.sessionId===queued.sessionId)?.status==='crashed')break;await page.waitForTimeout(250);}}
 else await page.waitForTimeout(13000);
 const observed=await live(),pending=observed.find(t=>t.payload?.repo_id==='owned/second');assert.equal(pending.status,phase==='before'?'crashed':'queued');assert.equal(downloads.length,1,'queued item started while host busy');
 const sourcePath=(phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/cookbookRunning.js';const served=await context.request.get(origin+'/static/js/cookbookRunning.js');assert((await served.body()).equals(fs.readFileSync(sourcePath)));
 const card=page.locator('.cookbook-task').filter({hasText:'second'}).last();await card.scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.screenshot({path:w+'/research/evidence-cookbook-queue/'+phase+'-'+viewport+'.png'});
 fs.writeFileSync(root+'/release-first','');
 let transitioned=null;
 if(phase==='after'){
  // Explicit Start now verifies the real placeholder -> tmux ID handoff.
  // Automatic queue pumping (#4515) remains a separate known failure.
  const start=card.locator('.cookbook-task-start-now');await start.click();
  for(let i=0;i<100;i++){if((await live()).some(t=>t.payload?.repo_id==='owned/second'&&t.sessionId.startsWith('cookbook-')))break;await page.waitForTimeout(100);}
  transitioned=(await live()).find(t=>t.payload?.repo_id==='owned/second');assert.equal(downloads.length,2);
 }
 fs.writeFileSync(root+'/browser-result.json',JSON.stringify({phase,viewport,submission:'public download controller with owned catalog metadata; native catalog Download click not verified',first_session:first[0].sessionId,placeholder:queued.sessionId,observed_pending_status:pending.status,backend_placeholder:statusSnapshot.tasks.find(t=>t.session_id===queued.sessionId),downloads,transitioned,transition_method:phase==='after'?'explicit Start now click; automatic queue pumping not fixed':null,page_errors:errors},null,2));
 assert.equal(errors.length,0,JSON.stringify(errors));await browser.close();console.log(JSON.stringify({phase,viewport,queued_status:pending.status,posts:downloads.length,transitioned:transitioned?.sessionId}));
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
