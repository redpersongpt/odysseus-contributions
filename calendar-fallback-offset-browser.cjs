const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('/Users/red/Documents/ChatGPT/ODY/odysseus/node_modules/playwright');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/calendar-fallback-offset-'+phase,origin='http://127.0.0.1:17871';
const output=w+'/research/evidence-calendar-fallback-offset';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),cases=[];
 try{
  const control=await browser.newContext();const auth=await control.request.post(origin+'/api/auth/login',{data:{username:'calendar-form-layout-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(auth.ok());
  const storageState=await control.storageState();await control.close();
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:1000},storageState,timezoneId:'Asia/Tokyo',locale:'en-US'});
   const created=await context.request.post(origin+'/api/calendar/events',{data:{summary:'Fallback timezone display',dtstart:'Sat, 05 Jan 2030 14:00:00 +0900',dtend:'Sat, 05 Jan 2030 15:00:00 +0900'}});assert(created.ok(),await created.text());
   const uid=(await created.json()).uid;
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
   try{
    await page.goto(origin);await page.waitForFunction(()=>window.memoryModule?.openMemoryModal);
    await page.evaluate(async target=>{const c=await import('/static/js/calendar.js');await c.openCalendarTo(target);},uid);
    const event=page.locator('#cal-body .cal-event-item[data-uid="'+uid+'"]');await event.waitFor();
    const time=await event.locator('.cal-event-time').innerText();const expected=phase==='after'?'14:00 – 15:00':'05:00 – 06:00';assert.equal(time,expected);
    const environment=await page.evaluate(()=>({zone:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date('2030-01-05T05:00:00Z').getTimezoneOffset(),scale:visualViewport.scale,rootZoom:getComputedStyle(document.documentElement).zoom}));
    assert.equal(environment.zone,'Asia/Tokyo');assert.equal(environment.offset,-540);assert.equal(environment.scale,1);
    await page.screenshot({path:output+'/'+phase+'-'+width+'.png'});
    assert.deepEqual(errors,[]);cases.push({width,time,expected,environment,errors});
    const deleted=await context.request.delete(origin+'/api/calendar/events/'+uid);assert(deleted.ok());
   }finally{await context.close();}
  }
  fs.writeFileSync(w+'/research/pr-098-browser-'+phase+'.json',JSON.stringify({phase,browser:browser.version(),cases},null,2)+'\n');console.log(JSON.stringify({phase,browser:browser.version(),UI_cases:cases.length,times:cases.map(x=>x.time)}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
