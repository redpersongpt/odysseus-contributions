const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/ordered-start-verified-runtime-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-ordered-start';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'ordered-start-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned lists '+label,model:'fixture-lists',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'ordered-start-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
  const sid=(await response.json()).id,page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.sessionModule?.selectSession);
   for(let n=0;n<3;n++){const got=page.getByRole('button',{name:'Got it',exact:true});if(await got.isVisible()){const r=await got.boundingBox();if(r)await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}}
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
   await body.waitFor();await page.waitForFunction(()=>![...document.querySelectorAll('.msg-ai.streaming')].some(el=>el.textContent.includes('End of owned response.')));await page.evaluate(()=>document.fonts.ready);
   const sourceReply=await context.request.get(origin+'/static/js/markdown.js');
   const sourceMatches=(await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/ordered-start-before':w+'/odysseus')+'/static/js/markdown.js'));
   assert(sourceMatches,'served renderer differs from tested source');
   for(const css of ['01-agent-chat.css','03-agent-chat.css']){const reply=await context.request.get(origin+'/static/css/'+css);assert((await reply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/ordered-start-before':w+'/odysseus')+'/static/css/'+css)));}
   const inspect=async locator=>locator.evaluate(el=>{
    const roots=[...el.querySelectorAll('ol')].filter(x=>!x.parentElement.closest('li')); 
    const pending=[...el.querySelectorAll('li.task-item')].find(x=>x.querySelector(':scope > .task-text')?.textContent==='Pending child');
    const completed=[...el.querySelectorAll('li.task-item')].find(x=>x.querySelector(':scope > .task-text')?.textContent==='Completed parent');
    const rect=x=>x?.getBoundingClientRect();
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    const marker_room=roots.map(ol=>{const li=ol.querySelector(':scope > li'),css=getComputedStyle(li,'::marker');ctx.font=css.fontWeight+" "+css.fontSize+" "+css.fontFamily;return {available:rect(li).left-rect(el).left,required:ctx.measureText(ol.start+'. ').width,font:ctx.font};});
    return {marker_room,ordered_starts:[...el.querySelectorAll('ol')].map(x=>x.start),ordered_styles:roots.map(x=>({tag:x.tagName,list_style:getComputedStyle(x).listStyleType,children:[...x.children].map(c=>({style:getComputedStyle(c).listStyleType,marker:getComputedStyle(c,'::marker').content,display:getComputedStyle(c).display}))})),nested_ul:el.querySelectorAll('li > ul').length,nested_ol:el.querySelectorAll('li > ol').length,root_ol_count:roots.length,ordered_siblings:roots.map(x=>x.querySelectorAll(':scope > li').length),tasks:el.querySelectorAll('li.task-item').length,done:el.querySelectorAll('li.task-done').length,list_in_paragraph:el.querySelectorAll('p ul,p ol').length,pending:pending?{done:pending.classList.contains('task-done'),decoration:getComputedStyle(pending.querySelector(':scope > .task-text')).textDecorationLine,checkbox_fill:getComputedStyle(pending.querySelector(':scope > .task-check')).backgroundColor,child_top:rect(pending).top,parent_bottom:rect(completed.querySelector(':scope > .task-text')).bottom,child_left:rect(pending).left,parent_left:rect(completed).left}:null,html:el.innerHTML};
   });
   const validate=result=>{
    assert.deepEqual(result.ordered_starts,phase==='before'?[1,1,1]:[23,17,26]);assert.equal(result.nested_ul,3);
    assert.equal(result.nested_ol,1);
    assert.equal(result.root_ol_count,2);
    assert.deepEqual(result.ordered_siblings,[3,2]);
    assert.equal(result.tasks,4);assert.equal(result.done,2);
    assert.equal(result.list_in_paragraph,0);
    if(phase==='after'){
     assert(result.marker_room.every(x=>x.available>=x.required),JSON.stringify(result.marker_room));
     assert.equal(result.pending.done,false);assert.equal(result.pending.decoration,'none');assert.equal(result.pending.checkbox_fill,'rgba(0, 0, 0, 0)');
     assert(result.pending.child_top>=result.pending.parent_bottom);assert(result.pending.child_left>result.pending.parent_left+8);
    }
   };
   const initial_render=await inspect(body);fs.writeFileSync(root+'/'+label+'-observed.json',JSON.stringify(initial_render,null,2));validate(initial_render);
   await body.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
   await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'});
   await page.reload();await page.waitForFunction(()=>window.sessionModule?.selectSession);
   await page.evaluate(id=>window.sessionModule.selectSession(id),sid);
   const restored=page.locator('.msg-ai .body').filter({hasText:'End of owned response.'}).last();await restored.waitFor();
   const reload_render=await inspect(restored);validate(reload_render);
   const persisted=await restored.evaluate(el=>el.dataset.raw||'');assert(persisted.includes('- [ ] Parent task'));assert(persisted.includes('   17. Sub'));
   const served=await context.request.get(origin+'/static/js/markdown.js');assert((await served.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/ordered-start-before':w+'/odysseus')+'/static/js/markdown.js')));
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,submission:'public frontend controller; native typing not verified',initial_render,reload_render,persisted_lists:true,page_errors:errors});
   fs.writeFileSync(w+'/research/ordered-start-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({phase,viewport:label,nested_ul:initial_render.nested_ul,nested_ol:initial_render.nested_ol,tasks:initial_render.tasks,reload_verified:true}));
  }finally{await context.close();}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
