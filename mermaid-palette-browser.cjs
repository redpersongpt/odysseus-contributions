const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/mermaid-palette-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-mermaid-palette';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height}});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'mermaid-palette-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const response=await context.request.post(origin+'/api/session',{form:{name:'Owned diagram '+label,model:'fixture-mermaid',endpoint_url:'http://127.0.0.1:17872/v1/chat/completions',endpoint_id:'mermaid-palette-fixture',skip_validation:'true'}});assert(response.ok(),await response.text());
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
   mark('body');await body.waitFor();mark('message-final');await page.waitForFunction(()=>![...document.querySelectorAll('.msg-ai.streaming')].some(el=>el.textContent.includes('End of owned response.')));mark('fonts');await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]));mark('source');
   const sourceReply=await context.request.get(origin+'/static/js/markdown.js');
   assert((await sourceReply.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/markdown.js')));
   await page.waitForFunction(()=>document.querySelectorAll('.msg-ai .body pre.mermaid svg').length===2);
   const inspect=()=>body.evaluate(el=>{
    const css=getComputedStyle(document.documentElement),svgs=[...el.querySelectorAll('pre.mermaid svg')];
    const flow=svgs.find(svg=>svg.querySelector('.node rect')),seq=svgs.find(svg=>svg.querySelector('rect.actor'));
    const node=flow?.querySelector('.node rect'),actor=seq?.querySelector('rect.actor'),label=flow?.querySelector('.nodeLabel');
    return {palette:{bg:css.getPropertyValue('--bg').trim(),panel:css.getPropertyValue('--panel').trim(),fg:css.getPropertyValue('--fg').trim(),accent:css.getPropertyValue('--red').trim()},svg_count:svgs.length,flow_nodes:flow?.querySelectorAll('.node').length||0,has_flow_labels:!!flow?.textContent.includes('Owned Start')&&!!flow?.textContent.includes('Owned Next'),has_sequence_message:!!seq?.textContent.includes('Owned hello'),fill:node?getComputedStyle(node).fill:null,stroke:node?getComputedStyle(node).stroke:null,text:label?getComputedStyle(label).color:null,font:label?getComputedStyle(label).fontFamily:null,actor_fill:actor?getComputedStyle(actor).fill:null};
   });
   const rgb=hex=>{let h=hex.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');return 'rgb('+[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')';};
   const validate=result=>{assert.equal(result.svg_count,2);assert.equal(result.flow_nodes,2);assert(result.has_flow_labels&&result.has_sequence_message);assert(result.fill&&result.actor_fill);if(phase==='after'){assert.equal(result.fill,rgb(result.palette.panel));assert.equal(result.stroke,rgb(result.palette.accent));assert.equal(result.text,rgb(result.palette.fg));assert.equal(result.actor_fill,rgb(result.palette.panel));assert(result.font.includes('Fira Code'));}else assert.notEqual(result.fill,rgb(result.palette.panel));};
   const waitPalette=async()=>{if(phase==='before'){await page.waitForTimeout(900);return;}await page.waitForFunction(()=>{const css=getComputedStyle(document.documentElement),rect=document.querySelector('.msg-ai .body pre.mermaid svg .node rect');if(!rect)return false;let h=css.getPropertyValue('--panel').trim().slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');const rgb='rgb('+[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')';return getComputedStyle(rect).fill===rgb;});};
   const closeMethods=[];const choose=async name=>{if(width<768&&await page.locator('#sidebar').evaluate(el=>el.classList.contains('hidden')))await page.locator('#hamburger-btn').click();await page.locator('#tool-theme-btn').click();await page.locator('#theme-modal .theme-swatch[data-theme="'+name+'"]').click();if(await page.locator('#close-theme-popup').isVisible()){await page.locator('#close-theme-popup').click();closeMethods.push('button');}else{await page.keyboard.press('Escape');closeMethods.push('Escape');}await page.waitForFunction(()=>document.querySelector('#theme-modal').classList.contains('hidden'));if(width<768&&!await page.locator('#sidebar').evaluate(el=>el.classList.contains('hidden'))){const r=await page.locator('#sidebar').boundingBox();await page.mouse.click(r.x>0?4:width-4,700);}await waitPalette();};
   await waitPalette();const initial=await inspect();validate(initial);
   await choose('light');const light=await inspect();validate(light);assert.equal(light.palette.bg,'#f3f5f7');
   for(let n=0;n<3;n++){const tip=page.getByRole('button',{name:'Got it',exact:true});if(await tip.isVisible()){const r=await tip.boundingBox();if(r)await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}}
   await body.scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'});
   await choose('midnight');const midnight=await inspect();validate(midnight);assert.equal(midnight.palette.bg,'#0d1117');
   await page.evaluate(()=>{for(const name of ['light','ocean','midnight'])window.themeModule.applyColors(window.themeModule.THEMES[name]);});
   await waitPalette();const rapid=await inspect();validate(rapid);assert.equal(rapid.palette.bg,'#0d1117');
   assert.equal(errors.length,0,JSON.stringify(errors));
   cases.push({viewport:label,chat_http:200,initial_submission:'public frontend controller; native typing not verified',theme_activation:'actual Theme / palette swatch buttons; rapid batch uses public applyColors',closeMethods,initial,light,midnight,rapid,page_errors:errors});
   fs.writeFileSync(w+'/research/mermaid-palette-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({phase,viewport:label,light_fill:light.fill,light_panel:light.palette.panel,midnight_fill:midnight.fill,rapid_latest:rapid.palette.bg}));
  }catch(e){console.error({phase,label,stage},e);throw e;}finally{await context.close().catch(()=>{});}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
