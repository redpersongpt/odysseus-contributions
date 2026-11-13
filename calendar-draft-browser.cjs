const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/calendar-draft-verified-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-calendar-draft';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]])for(const action of ['create','update']){
  const context=await browser.newContext({viewport:{width,height},timezoneId:'Europe/Istanbul',locale:'en-US'});
  const login=await context.request.post(origin+'/api/auth/login',{data:{username:'calendar-draft-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok());
  const cals=await context.request.get(origin+'/api/calendar/calendars');assert(cals.ok());const cal=(await cals.json()).calendars[0].href;
  let uid=null;const savedBefore={summary:'Original '+label,location:'Old office',description:'Saved body',dtstart:'2026-11-15',dtend:'2026-11-16',all_day:true,calendar_href:cal};
  if(action==='update'){const seed=await context.request.post(origin+'/api/calendar/events',{data:savedBefore});assert(seed.ok(),await seed.text());uid=(await seed.json()).uid;}
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  let stage='goto';const mark=x=>{stage=x;console.log(JSON.stringify({phase,label,action,stage}));};
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.memoryModule?.openMemoryModal);
   for(let n=0;n<3;n++){const tip=page.getByRole('button',{name:'Got it',exact:true});if(await tip.isVisible()){const r=await tip.boundingBox();if(r)await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}}
   mark('open calendar');await page.evaluate(async target=>{const c=await import('/static/js/calendar.js');await c.openCalendarTo(target);},uid||'2026-11-15');
   if(uid){await page.locator('.cal-day-detail .cal-event-item[data-uid="'+uid+'"]').click();}
   else await page.locator('#cal-add').click();
   await page.locator('#cal-f-sum').waitFor();await page.waitForTimeout(350);
   const draft={summary:'Unsaved '+action+' '+label,location:'New office '+label,description:'Owned draft '+action,dtstart:'',dtend:'2026-11-16',all_day:true};
   mark('fill');await page.locator('#cal-f-sum').fill(draft.summary);await page.locator('#cal-f-loc').fill(draft.location);await page.locator('#cal-f-desc').fill(draft.description);if(!await page.locator('#cal-f-allday').isChecked())await page.locator('.cal-allday-switch').click();assert(await page.locator('#cal-f-allday').isChecked());await page.locator('#cal-f-date-end').fill(draft.dtend);await page.locator('#cal-f-date').fill('');
   const method=action==='create'?'POST':'PUT',path='/api/calendar/events'+(uid?'/'+uid:'');
   const rejectedPromise=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()===method);
   mark('save');await page.locator('#cal-f-save').click();const rejected=await rejectedPromise;assert.equal(rejected.status(),500);const error=await rejected.json();assert.equal(error.detail,action==='create'?'Failed to create event':'Failed to update event');
   await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('Failed to save'));
   if(phase==='before')await page.locator('#cal-f-sum').waitFor({state:'detached'});
   const hasForm=await page.locator('#cal-body .cal-form').count();assert.equal(hasForm,phase==='before'?0:1);
   const visible=hasForm?await page.evaluate(()=>({summary:document.querySelector('#cal-f-sum').value,location:document.querySelector('#cal-f-loc').value,description:document.querySelector('#cal-f-desc').value,dtstart:document.querySelector('#cal-f-date').value,dtend:document.querySelector('#cal-f-date-end').value,all_day:document.querySelector('#cal-f-allday').checked})):null;
   if(visible)assert.deepEqual(visible,draft);
   const listed=await context.request.get(origin+'/api/calendar/events',{params:{start:'2026-11-01',end:'2026-12-01'}});assert(listed.ok());const listing=(await listed.json()).events;
   assert(!listing.some(e=>e.summary===draft.summary));
   let server=null;if(uid){const res=await context.request.get(origin+path);assert(res.ok());server=(await res.json()).event;assert.equal(server.summary,savedBefore.summary);assert.equal(server.location,savedBefore.location);assert.equal(server.description,savedBefore.description);}
   const served=await context.request.get(origin+'/static/js/calendar.js');assert((await served.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/js/calendar.js')));
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);await page.screenshot({path:evidence+'/'+phase+'-'+action+'-'+label+'.png'});
   let retry=null;
   if(phase==='after'){
    mark('retry');await page.locator('#cal-f-date').fill('2026-11-15');const successPromise=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()===method);await page.locator('#cal-f-save').click();const success=await successPromise;assert.equal(success.status(),200);const data=await success.json();uid=uid||data.uid;assert(uid);await page.locator('#cal-f-sum').waitFor({state:'detached'});
    const result=await context.request.get(origin+'/api/calendar/events/'+uid);assert(result.ok());retry=(await result.json()).event;assert.equal(retry.summary,draft.summary);assert.equal(retry.location,draft.location);assert.equal(retry.description,draft.description);assert.equal(retry.all_day,true);assert.equal(retry.dtstart.slice(0,10),'2026-11-15');assert.equal(retry.dtend.slice(0,10),'2026-11-16');const finalList=await context.request.get(origin+'/api/calendar/events',{params:{start:'2026-11-01',end:'2026-12-01'}});assert(finalList.ok());assert.equal((await finalList.json()).events.filter(e=>e.summary===draft.summary).length,1);
    await page.reload();await page.waitForFunction(()=>window.memoryModule?.openMemoryModal);await page.evaluate(async target=>{const c=await import('/static/js/calendar.js');await c.openCalendarTo(target);},uid);await page.locator('.cal-day-detail .cal-event-item[data-uid="'+uid+'"]').click();await page.locator('#cal-f-sum').waitFor();assert.equal(await page.locator('#cal-f-sum').inputValue(),draft.summary);assert.equal(await page.locator('#cal-f-loc').inputValue(),draft.location);await page.locator('#cal-f-cancel').click();await page.locator('#cal-f-sum').waitFor({state:'detached'});
   }
   assert.deepEqual(errors,[]);cases.push({viewport:label,action,rejected_http:500,error_detail:error.detail,form_retained:!!hasForm,draft_after_failure:visible,server_unchanged:!listing.some(e=>e.summary===draft.summary)&&(action==='create'||server?.summary===savedBefore.summary),retry_saved:!!retry,reload_verified:!!retry,page_errors:errors,trigger:'Native all-day date input cleared; actual backend empty-date parse returns 500; no response interception'});
   fs.writeFileSync(w+'/research/calendar-draft-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
  }catch(e){console.error({phase,label,action,stage},e);throw e;}finally{await context.close();}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
