const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/raster-chat-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-raster-chat';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'raster-chat-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned raster '+label,model:'fixture-raster',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'raster-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
  const sid=(await response.json()).id,page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
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
   await body.waitFor();await page.waitForFunction(()=>!document.querySelector('.send-btn.stop-mode'));
   const sourceReply=await context.request.get(origin+'/static/js/markdown.js');
   const sourceMatches=(await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/markdown.js'));
   assert(sourceMatches,'served renderer differs from tested source');
   const expected=phase==='before'?0:1;
   assert.equal(await body.locator('img.chat-inline-image').count(),expected);
   assert.equal(await body.locator('img').count(),expected);
   assert.equal(await page.locator('.msg-ai img[src^="data:image/"]').count(),expected);
   if(expected)await body.locator('img.chat-inline-image').evaluate(img=>img.decode());
   const initial_render={image_count:await body.locator('img.chat-inline-image').count(),visible_alt_text:(await body.innerText()).includes('Owned raster fixture')};
   let image=null;
   if(expected){const img=body.locator('img.chat-inline-image');await img.scrollIntoViewIfNeeded();image=await img.evaluate(el=>({natural_width:el.naturalWidth,natural_height:el.naturalHeight,display_width:el.getBoundingClientRect().width,has_link_href:el.closest('a')?.hasAttribute('href')||false}));assert.equal(image.natural_width,512);assert.equal(image.has_link_href,false);assert(image.display_width<=width);}
   await body.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
   await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'});
   await page.reload();await page.waitForFunction(()=>window.sessionModule?.selectSession);
   await page.evaluate(id=>window.sessionModule.selectSession(id),sid);
   const restored=page.locator('.msg-ai .body').filter({hasText:'End of owned response.'}).last();await restored.waitFor();
   assert.equal(await restored.locator('img.chat-inline-image').count(),0);
   const persisted=await restored.evaluate(el=>el.dataset.raw||'');
   assert(persisted.includes('inline media omitted from persisted history'));assert(!persisted.includes('data:image/png;base64,'));
   const served=await context.request.get(origin+'/static/js/markdown.js');assert((await served.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/markdown.js')));
   const safety=await page.evaluate(async()=>{
    const m=await import('/static/js/markdown.js');
    const png='data:image/png;base64,AA==';
    const inputs={raster:`<a><img src="${png}" onerror="window.fixtureUnexpected=true"></a>`,svg:'<a><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="></a>',html:'<a><img src="data:text/html;base64,PGI+eDwvYj4="></a>',link:`<a href="${png}">raster link</a>`,srcset:`<a><img srcset="${png}"></a>`,script:'<a><script>window.fixtureUnexpected=true</script><img src="javascript:alert(1)"></a>'};
    const out={};for(const [k,v]of Object.entries(inputs)){const el=document.createElement('div');el.innerHTML=m.sanitizeAllowedHtml(v);out[k]={src:el.querySelector('img')?.getAttribute('src')||null,href:el.querySelector('a')?.getAttribute('href')||null,onerror:el.querySelector('[onerror]')!==null,srcset:el.querySelector('[srcset]')!==null,script:el.querySelector('script')!==null};}return out;
   });
   assert.equal(safety.raster.src,phase==='after'?'data:image/png;base64,AA==':null);
   for(const value of Object.values(safety)){assert.equal(value.href,null);assert.equal(value.onerror,false);assert.equal(value.srcset,false);assert.equal(value.script,false);}
   for(const k of ['svg','html','script'])assert.equal(safety[k].src,null);
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,submission:'public frontend controller; native typing not verified',initial_render,reload_image_count:0,persisted_inline_media_removed:true,image,safety,page_errors:errors});
   fs.writeFileSync(w+'/research/raster-chat-'+phase+'-live-result.json',JSON.stringify({phase,cases},null,2));
   console.log(JSON.stringify({phase,viewport:label,initial_render,reload_image_count:0,image}));
  }finally{await context.close();}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
