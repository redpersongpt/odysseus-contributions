const {chromium}=require('/Users/red/Documents/ChatGPT/ODY/odysseus/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/email-spam-results-'+phase;
const origin='http://127.0.0.1:17871',fixture=root+'/data/fixture_email_messages.json';
const evidence=w+'/research/evidence-email-spam-results';fs.mkdirSync(evidence,{recursive:true});
const initial=JSON.parse(fs.readFileSync(root+'/initial-messages.json','utf8'));
const cases=[];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const authContext=await browser.newContext();
  const auth=await authContext.request.post(origin+'/api/auth/login',{data:{username:'email-move-results',password:fs.readFileSync(root+'/password','utf8')}});assert(auth.ok(),await auth.text());
  const storageState=await authContext.storageState();await authContext.close();
  for(const width of [1440,390])for(const flow of ['reader-spam']){
   const folder=flow==='card-sent'?'Sent':'INBOX',payload=structuredClone(initial);payload.messages[0].folder=folder;
   fs.writeFileSync(fixture,JSON.stringify(payload));
   const context=await browser.newContext({viewport:{width,height:width===390?844:1000},storageState,locale:'en-US',timezoneId:'Europe/Istanbul'});
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
   try {
    await p.goto(origin);await p.waitForFunction(()=>window.memoryModule?.openMemoryModal);
    await p.evaluate(async()=>{const m=await import('/static/js/emailLibrary.js');await m.openEmailLibrary();});
    if(folder==='Sent'){
     await p.locator('#email-lib-modal .email-folder-btn').click();
     await p.locator('#email-lib-modal button.email-folder-item:visible').filter({hasText:/^\s*Sent\s*$/}).click();
    }
    const card=p.locator('#email-lib-modal .doclib-card[data-uid="9701"]');await card.waitFor();
    for(let n=0;n<3;n++){const tip=p.getByRole('button',{name:'Got it',exact:true});if(await tip.isVisible()){const b=await tip.boundingBox();if(b)await p.mouse.click(b.x+b.width/2,b.y+b.height/2);}}
    if(flow.startsWith('reader')){await card.getByText('Email mutation verification',{exact:true}).click();await card.locator('[data-act="more"]').waitFor();}
    const action=flow==='reader-spam'?'Move to Spam':flow==='reader-archive'?'Move to Archive':'Archive';
    const openMenu=async()=>{
     if(flow.startsWith('reader'))await card.locator('[data-act="more"]').click();
     else await card.getByRole('button',{name:'Actions',exact:true}).click();
    };
    await openMenu();
    // Provider fixture state changes after the real UI loads: the old UID is absent.
    const absent=structuredClone(payload);absent.messages[0].uid='stale-other';fs.writeFileSync(fixture,JSON.stringify(absent));
    const pattern=flow==='reader-spam'?'/api/email/move/9701?':'/api/email/archive/9701?';
    const responseWait=p.waitForResponse(r=>r.url().includes(pattern)&&r.request().method()==='POST');
    await p.locator('.email-card-dropdown .dropdown-item-compact').filter({hasText:new RegExp('^'+action+'$')}).click();
    const rejected=await responseWait,body=await rejected.json();assert.equal(rejected.status(),200);assert.equal(body.success,false);
    await p.waitForTimeout(600);
    const kept=await card.count()===1&&await card.evaluate(el=>!el.classList.contains('email-card-removing')&&Number(getComputedStyle(el).opacity)>.5);
    const cachedUids=await p.evaluate(async()=>{const {state}=await import('/static/js/emailLibrary/state.js');return state._libEmails.map(e=>String(e.uid));});
    const message=flow==='reader-spam'?'Failed to move email to Spam':'Failed to archive email';
    const errorVisible=await p.getByText(message,{exact:true}).isVisible();
    assert.equal(kept,phase==='after',JSON.stringify({flow,width,kept}));
    assert.equal(cachedUids.includes('9701'),phase==='after');
    assert.equal(errorVisible,phase==='after',JSON.stringify({flow,width,errorVisible}));
    if(flow==='reader-spam')await p.screenshot({path:evidence+'/'+phase+'-'+flow+'-'+width+'.png'});
    const record={width,flow,folder,rejected_status:rejected.status(),rejected_body:body,kept_original:kept,cached_uids:cachedUids,visible_error:errorVisible,page_errors:errors};
    if(phase==='after'){
     fs.writeFileSync(fixture,JSON.stringify(payload));
     await openMenu();
     const wait=p.waitForResponse(r=>r.url().includes(pattern)&&r.request().method()==='POST');
     await p.locator('.email-card-dropdown .dropdown-item-compact').filter({hasText:new RegExp('^'+action+'$')}).click();
     const success=await wait;assert.equal(success.status(),200);assert.equal((await success.json()).success,true);
     await p.waitForFunction(async()=>{const {state}=await import('/static/js/emailLibrary/state.js');return !state._libEmails.some(e=>String(e.uid)==='9701');});
     assert(await card.count()===0||await card.evaluate(el=>el.classList.contains('email-card-removing')));
     const stored=JSON.parse(fs.readFileSync(fixture,'utf8')).messages[0];
     assert.equal(stored.folder,flow==='reader-spam'?'Junk':'Archive');
     record.retry_status=success.status();record.retry_removed=true;record.persisted_folder=stored.folder;
    }
    assert.deepEqual(errors,[]);cases.push(record);
   }finally{await context.close();}
  }
  fs.writeFileSync(w+'/research/pr-097-spam-native-'+phase+'.json',JSON.stringify({phase,browser:browser.version(),built_in_email_fixture:true,no_response_or_route_replacement:true,cases},null,2)+'\n');
  console.log(JSON.stringify({phase,browser:browser.version(),cases:cases.length,retained:cases.filter(c=>c.kept_original).length,errors_visible:cases.filter(c=>c.visible_error).length,retries:cases.filter(c=>c.retry_removed).length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
