const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/sidebar-swipe-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-sidebar-swipe';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['mobile-touch',390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'sidebar-swipe-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned gesture '+label,model:'fixture-swipe',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'sidebar-swipe-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
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
   mark('body');await body.waitFor();mark('message-final');await page.waitForFunction(()=>![...document.querySelectorAll('.msg-ai.streaming')].some(el=>el.textContent.includes('End of owned response.')));const exported=await context.request.get(origin+'/api/session/'+sid+'/export?fmt=json');assert(exported.ok());const history=await exported.json();assert(history.messages.some(m=>m.role==='assistant'&&m.content===fs.readFileSync(root+'/answer.txt','utf8')));await page.reload();await page.waitForFunction(()=>window.sessionModule?.selectSession);await page.evaluate(id=>window.sessionModule.selectSession(id),sid);await body.waitFor();mark('fonts');await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]));mark('source');
   const sourceReply=await context.request.get(origin+'/static/js/sidebar-layout.js');
   assert((await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/sidebar-layout.js')));
   await page.waitForFunction(()=>window.__odySwipeWired&&typeof window._odyOpenSidebar==='function');
   const sidebar=page.locator('#sidebar'),paragraph=body.locator('p').first();
   const cdp=await context.newCDPSession(page);
   await page.evaluate(()=>{window.__fixtureTouches=[];for(const type of ['touchstart','touchmove'])document.addEventListener(type,e=>window.__fixtureTouches.push({type,trusted:e.isTrusted,prevented:e.defaultPrevented,selected:window.getSelection()?.toString()||'',x:e.touches[0]?.clientX}),{passive:true});});
   const hidden=()=>sidebar.evaluate(el=>el.classList.contains('hidden'));
   const closeDrawer=async()=>{if(await hidden())return;const rect=await sidebar.boundingBox();await page.touchscreen.tap(rect.x>0?4:width-4,600);await page.waitForFunction(()=>document.querySelector('#sidebar').classList.contains('hidden'));};
   const clearSelection=async()=>{await closeDrawer();const box=await paragraph.boundingBox();await page.mouse.click(box.x+5,box.y+8);assert(await page.evaluate(()=>window.getSelection().isCollapsed));};
   const drag=async(x,dx)=>{const box=await paragraph.boundingBox(),y=box.y+8;await page.evaluate(()=>{window.__fixtureTouches=[];});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y,id:0}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);return page.evaluate(()=>({open:!document.querySelector('#sidebar').classList.contains('hidden'),side:document.querySelector('#sidebar').classList.contains('right-side')?'right':'left',events:window.__fixtureTouches,selected_after:window.getSelection()?.toString()||''}));};
   const checkEvents=result=>{assert(result.events.some(e=>e.type==='touchmove'));assert(result.events.every(e=>e.trusted));};
   await clearSelection();const middle=await drag(195,90);checkEvents(middle);assert.equal(middle.open,phase==='before');assert.equal(middle.events.some(e=>e.prevented),phase==='before');
   await page.screenshot({path:evidence+'/'+phase+'-mobile-middle-drag.png'});
   await closeDrawer();
   const box=await paragraph.boundingBox();await page.mouse.move(box.x+3,box.y+8);await page.mouse.down();await page.mouse.move(box.x+155,box.y+8,{steps:12});await page.mouse.up();
   const selectionBefore=await page.evaluate(()=>window.getSelection().toString());assert(selectionBefore.length>5,'native mouse selection was not established');
   const selected=await drag(10,90);checkEvents(selected);assert.equal(selected.open,phase==='before');assert.equal(selected.events.some(e=>e.prevented),phase==='before');
   await page.screenshot({path:evidence+'/'+phase+'-mobile-selection-drag.png'});
   await clearSelection();const left=await drag(10,90);checkEvents(left);assert.equal(left.open,true);assert.equal(left.side,'left');
   await clearSelection();const right=await drag(380,-90);checkEvents(right);assert.equal(right.open,true);assert.equal(right.side,'right');
   await closeDrawer();
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,initial_submission:'public frontend controller; native typing not verified',touch_input:'Chrome DevTools Protocol trusted touch events; emulated mobile',selection_setup:'actual browser mouse drag; native phone long-press not verified',middle_drag:middle,selection_before:selectionBefore,selection_drag:selected,left_edge_control:left,right_edge_control:right,page_errors:errors});
   fs.writeFileSync(w+'/research/sidebar-swipe-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({phase,middle_open:middle.open,selection_open:selected.open,left_edge:left.open,right_edge:right.open,selection_before:selectionBefore}));
  }catch(e){console.error({phase,label,stage},e);throw e;}finally{await context.close().catch(()=>{});}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
