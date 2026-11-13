const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/rewrite-error-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-rewrite-error';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'rewrite-error-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned rewrite '+label,model:'fixture-rewrite',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'rewrite-error-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
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
   const sourceReply=await context.request.get(origin+'/static/js/chat.js');
   assert((await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/chat.js')));
   const holder=body.locator('..'),rawBefore=await holder.getAttribute('data-raw'),htmlBefore=await body.innerHTML();
   const metadataPosts=[];page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/update-last-meta'))metadataPosts.push(req.url());});
   const rewriteResponsePromise=page.waitForResponse(r=>r.url().endsWith('/api/rewrite')&&r.request().method()==='POST');
   rewriteResponsePromise.catch(()=>{});mark('more-actions');await holder.getByRole('button',{name:'More actions',exact:true}).click();
   mark('shorten');await page.getByRole('button',{name:/Rewrite shorter/}).click();
   mark('rewrite-response');const rewritten=await rewriteResponsePromise;assert.equal(rewritten.status(),200);await rewritten.finished();
   const errorFrame=await rewritten.text();assert(errorFrame.includes('event: error'));assert(errorFrame.includes('"status": 401'));assert(errorFrame.includes('"text":'));
   const toast=page.locator('#toast.error');await toast.filter({hasText:'Rewrite failed:'}).waitFor();
   await page.waitForFunction(()=>{const el=document.querySelector('#toast.error.show');if(!el)return false;const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;});
   await page.waitForTimeout(350);
   const toastText=await toast.locator('.toast-message').innerText();
   if(phase==='before')assert(toastText.includes('Rewrite failed: model returned no rewritten text'));
   else {assert(toastText.includes('rejected the API key'));assert(toastText.includes('Owned fixture credentials rejected.'));assert(!toastText.includes('model returned no rewritten text'));}
   assert.equal(await holder.getAttribute('data-raw'),rawBefore);assert.equal(await body.innerHTML(),htmlBefore);assert((await body.innerText()).includes('Owned original answer.'));
   assert.equal(metadataPosts.length,0);assert.equal(await body.locator('.spinner-whirlpool').count(),0);
   await body.scrollIntoViewIfNeeded();await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'});
   await page.reload();await page.waitForFunction(()=>window.sessionModule?.selectSession);
   await page.evaluate(id=>window.sessionModule.selectSession(id),sid);
   const restored=page.locator('.msg-ai .body').filter({hasText:'End of owned response.'}).last();await restored.waitFor();
   assert((await restored.innerText()).includes('Owned original answer.'));
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,rewrite_http:200,provider_http:401,sse:errorFrame,toast:toastText,initial_chat_submission:'public frontend controller; native typing not verified',rewrite_activation:'actual More actions / Rewrite shorter buttons',original_preserved:true,reload_original_preserved:true,metadata_posts_after_failure:metadataPosts.length,page_errors:errors});
   fs.writeFileSync(w+'/research/rewrite-error-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({phase,viewport:label,toast:toastText,reload_original_preserved:true}));
  }catch(e){console.error({phase,label,stage},e);throw e;}finally{await context.close().catch(()=>{});}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
