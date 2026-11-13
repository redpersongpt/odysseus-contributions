const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/calendar-form-layout-settled-'+phase,origin='http://127.0.0.1:17871';
const evidence=w+'/research/evidence-calendar-form-layout';fs.mkdirSync(evidence,{recursive:true});let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];const control=await browser.newContext();const login=await control.request.post(origin+'/api/auth/login',{data:{username:'calendar-form-layout-smoke',password:fs.readFileSync(root+'/password','utf8')}});assert(login.ok(),'auth setup HTTP '+login.status());const storageState=await control.storageState();await control.close();
 for(const [width,touch]of[[320,false],[390,false],[520,false],[768,false],[1440,false],[320,true],[390,true],[520,true]])for(const kind of ['create','update']){
  const context=await browser.newContext({viewport:{width,height:width>=768?1000:844},timezoneId:'Europe/Istanbul',locale:'en-US',isMobile:touch,hasTouch:touch,storageState});
  const calResponse=await context.request.get(origin+'/api/calendar/calendars');assert(calResponse.ok());const calendar=(await calResponse.json()).calendars[0].href;let uid=null;if(kind==='update'){const seed=await context.request.post(origin+'/api/calendar/events',{data:{summary:'Owned original '+width+' '+touch,dtstart:'2026-11-15T09:00:00+03:00',dtend:'2026-11-16T10:00:00+03:00',calendar_href:calendar}});assert(seed.ok(),await seed.text());uid=(await seed.json()).uid;}
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  try{
   await page.goto(origin);await page.waitForFunction(()=>window.memoryModule?.openMemoryModal);
   await page.evaluate(async target=>{const c=await import('/static/js/calendar.js');await c.openCalendarTo(target);},uid||'2026-11-15');
   if(uid)await page.locator('.cal-day-detail .cal-event-item[data-uid="'+uid+'"]').click();else await page.locator('#cal-add').click();await page.locator('#cal-f-sum').waitFor();await page.waitForTimeout(350);
   for(let n=0;n<3;n++){const tip=page.getByRole('button',{name:'Got it',exact:true});if(await tip.isVisible()){const r=await tip.boundingBox();if(r)await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}}
   await page.locator('#cal-f-sum').fill('Owned layout '+kind+' '+width+' '+touch);
   await page.locator('#cal-f-loc').fill('Owned office');await page.locator('#cal-f-desc').fill('Owned form layout check');
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
   const inspect=()=>page.evaluate(()=>{
    const body=document.querySelector('#cal-body'),form=document.querySelector('.cal-form-bespoke'),details=document.querySelector('#cal-form-details');
    const rect=el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom};};
    const rows=[...details.querySelectorAll('.cal-form-row')].filter(el=>getComputedStyle(el).display!=='none').map(el=>({rect:rect(el),client:el.clientWidth,scroll:el.scrollWidth,display:getComputedStyle(el).display,wrap:getComputedStyle(el).flexWrap}));
    const fields=['cal-f-date','cal-f-date-end','cal-f-start','cal-f-end','cal-f-loc','cal-f-rrule','cal-f-desc','cal-f-remind','cal-f-type','cal-f-del','cal-f-cancel','cal-f-save'].map(id=>document.getElementById(id)).filter(el=>el&&el.getClientRects().length&&getComputedStyle(el).display!=='none').map(el=>({id:el.id,rect:rect(el),min:getComputedStyle(el).minWidth,width:getComputedStyle(el).width,font:getComputedStyle(el).fontSize}));
    fields.push({id:'all-day-control',rect:rect(document.querySelector('.cal-allday-ctrl'))});
    const d=rect(details);return{body:rect(body),form:rect(form),details:d,rows,fields,overflow:fields.filter(x=>x.rect.left<d.left-1||x.rect.right>d.right+1).map(x=>x.id),details_scroll_left:details.scrollLeft,body_scroll_left:body.scrollLeft,body_scroll_width:body.scrollWidth,body_client_width:body.clientWidth,zoom:{root:getComputedStyle(document.documentElement).zoom,body:getComputedStyle(document.body).zoom,form:getComputedStyle(form).zoom,visual:visualViewport.scale},viewport:innerWidth};
   });
   const timed=await inspect();await page.locator('#cal-f-date-end').fill('2026-11-16');const focused=await inspect();
   await page.locator('.cal-allday-switch').click();assert(await page.locator('#cal-f-allday').isChecked());await page.waitForTimeout(350);const all_day=await inspect();
   if((width===390&&touch)||(width===1440&&!touch))await page.screenshot({path:evidence+'/'+phase+'-'+kind+'-'+width+'.png'});
   const served=await context.request.get(origin+'/static/css/16-calendar.css');assert((await served.body()).equals(fs.readFileSync((phase==='before'?w+'/.runtime/calendar-ics-baseline':w+'/odysseus')+'/static/css/16-calendar.css')));
   let saved=false;if(phase==='after'){for(const state of [timed,focused,all_day]){assert.deepEqual(state.overflow,[],JSON.stringify({width,touch,kind,overflow:state.overflow}));assert(state.rows.every(r=>r.scroll<=r.client+1),JSON.stringify({width,touch,kind,rows:state.rows}));assert.equal(state.details_scroll_left,0);assert.equal(state.body_scroll_left,0);}const method=uid?'PUT':'POST',path='/api/calendar/events'+(uid?'/'+uid:'');const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()===method);await page.locator('#cal-f-save').click();const response=await responsePromise;assert.equal(response.status(),200);const data=await response.json();uid=uid||data.uid;const check=await context.request.get(origin+'/api/calendar/events/'+uid);assert(check.ok());const event=(await check.json()).event;assert.equal(event.summary,'Owned layout '+kind+' '+width+' '+touch);assert.equal(event.location,'Owned office');assert(event.all_day);assert.equal(event.dtstart.slice(0,10),'2026-11-15');assert.equal(event.dtend.slice(0,10),'2026-11-16');saved=true;}
   assert.deepEqual(errors,[]);cases.push({width,touch,kind,timed,focused,all_day,saved,page_errors:errors});
   fs.writeFileSync(w+'/research/calendar-form-layout-'+phase+'-live-result.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));
   console.log(JSON.stringify({width,touch,kind,timed:timed.overflow,focused:focused.overflow,all_day:all_day.overflow,zoom:timed.zoom}));
  }finally{await context.close();}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
