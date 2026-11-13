const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/table-alignment-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-table-alignment';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'table-alignment-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned alignment '+label,model:'fixture-table',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'table-alignment-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
  const sid=(await response.json()).id,page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  let stage='goto';const mark=x=>{stage=x;console.log(JSON.stringify({phase,label,stage}));};
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.sessionModule?.selectSession);
   for(let n=0;n<3;n++){const got=page.getByRole('button',{name:'Got it',exact:true});if(await got.isVisible())await got.click();}
   await page.evaluate(async id=>{await window.sessionModule.loadSessions();await window.sessionModule.selectSession(id);},sid);
   await page.waitForFunction(()=>window.chatModule?.handleChatSubmit);
   await page.locator('#mode-chat-btn').click();
   const replyPromise=page.waitForResponse(r=>/\/api\/chat(?:_stream|\/stream)?$/.test(r.url())&&r.request().method()==='POST');
   // Invoke the application's public submit controller, using its own input
   // accessor. The startup composer has a hidden preserved duplicate; native
   // typing on that layout is not part of this rendering check.
   const submitState=await page.evaluate(async()=>{const ui=(await import('/static/js/ui.js?v=20260916largetoolscroll1')).default;const slash=await import('/static/js/slashCommands.js');const input=ui.el('message');input.value='Show the owned fixture response.';const before={session:window.sessionModule.getCurrentSessionId(),model:window.sessionModule.getCurrentModel(),endpoint:window.sessionModule.getCurrentEndpointUrl(),setup:slash.getSetupMode(),input:input.value};await window.chatModule.handleChatSubmit({preventDefault(){}});return {before,after_input:input.value,tail:document.body.innerText.slice(-450)};});
   fs.writeFileSync(root+'/'+label+'-submit-state.json',JSON.stringify(submitState,null,2));
   const chatResponse=await replyPromise;assert.equal(chatResponse.status(),200);
   const requestBody=chatResponse.request().postData();assert(/name="mode"\r?\n\r?\nchat\r?\n/.test(requestBody));
   fs.writeFileSync(root+'/'+label+'-chat-request.json',JSON.stringify({url:chatResponse.url(),mode:'chat',content_type:chatResponse.request().headers()['content-type']},null,2));
   const body=page.locator('.msg-ai .body').filter({hasText:'End of owned response.'}).last();
   mark('body');await body.waitFor();mark('response-finished');await Promise.race([chatResponse.finished(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('chat response completion timeout')),15000))]);mark('message-final');await page.waitForFunction(()=>![...document.querySelectorAll('.msg-ai.streaming')].some(el=>el.textContent.includes('End of owned response.')));mark('fonts');await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]));mark('source');
   const sourceReply=await context.request.get(origin+'/static/js/markdown.js');
   assert((await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/markdown.js')));
   const inspect=async locator=>locator.evaluate(el=>({tables:[...el.querySelectorAll('table')].map(table=>({width:table.getBoundingClientRect().width,rows:[...table.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>{const range=document.createRange();range.selectNodeContents(cell);const text=range.getBoundingClientRect(),rect=cell.getBoundingClientRect();return {tag:cell.tagName,text:cell.textContent,align:getComputedStyle(cell).textAlign,left_gap:text.left-rect.left,right_gap:rect.right-text.right,center_delta:(text.left+text.right-rect.left-rect.right)/2};}))}))}));
   const validate=result=>{
    assert.equal(result.tables.length,1);const table=result.tables[0];assert.equal(table.rows.length,3);
    const expected=phase==='before'?['left','left','left']:['left','center','right'];
    for(const row of table.rows)assert.deepEqual(row.map(c=>c.align),expected);
    assert.deepEqual(table.rows[1].map(c=>c.text),['A','B','123']);
    if(phase==='after'){
     assert(Math.abs(table.rows[1][1].center_delta)<1.5);
     assert(table.rows[1][2].right_gap>=8&&table.rows[1][2].right_gap<10);
    }else assert(table.rows[1][2].right_gap>15);
   };
   const initial_render=await inspect(body);validate(initial_render);
   await body.scrollIntoViewIfNeeded();await page.waitForTimeout(350);
   await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'});
   await page.reload();await page.waitForFunction(()=>window.sessionModule?.selectSession);
   await page.evaluate(id=>window.sessionModule.selectSession(id),sid);
   const restored=page.locator('.msg-ai .body').filter({hasText:'End of owned response.'}).last();await restored.waitFor();
   const reload_render=await inspect(restored);validate(reload_render);
   const persisted=await restored.evaluate(el=>el.dataset.raw||'');assert(persisted.includes('| :--- | :---: | ---: |'));
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,submission:'public frontend controller; native typing not verified',initial_render,reload_render,persisted_alignment_markers:true,page_errors:errors});
   fs.writeFileSync(w+'/research/table-alignment-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({phase,viewport:label,alignments:initial_render.tables[0].rows.map(row=>row.map(c=>c.align)),reload_verified:true}));
  }catch(e){console.error({phase,label,stage},e);throw e;}finally{await context.close().catch(()=>{});}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
