const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/email-disposition-'+phase,origin='http://127.0.0.1:17868';
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});const cases=[],evidence=w+'/research/evidence-email-disposition';fs.mkdirSync(evidence,{recursive:true});
 const fixture=JSON.parse(fs.readFileSync(root+'/fixtures.json')).find(f=>f.name==='Upper HTML');assert(fixture);
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  try{
   assert((await context.request.post(origin+'/api/auth/login',{data:{username:'email-unicode-smoke',password:fs.readFileSync(root+'/password','utf8')}})).ok());
   await page.goto(origin);await page.waitForFunction(()=>window.memoryModule?.openMemoryModal);
   for(let n=0;n<4;n++){const tip=page.getByRole('button',{name:'Got it',exact:true});if(await tip.isVisible())await tip.click();}
   await page.evaluate(async()=>{const m=await import('/static/js/emailLibrary.js');await m.openEmailLibrary();});
   const card=page.locator('#email-lib-modal .doclib-card[data-uid="'+fixture.uid+'"]');await card.waitFor();
   await card.getByText('Upper HTML',{exact:true}).click();await card.locator('.email-reader-body').waitFor();
   const body=await card.locator('.email-reader-body').innerText();assert(body.includes(phase==='before'?'Attachment content must stay separate':'Main body only'),body);
   if(phase==='after')assert(!body.includes('Attachment content must stay separate'),body);
   await page.screenshot({path:evidence+'/'+phase+'-'+width+'.png'});
   assert.deepEqual(errors,[]);cases.push({width,uid:fixture.uid,body,page_errors:errors,zoom:await page.evaluate(()=>({root:getComputedStyle(document.documentElement).zoom,visual:visualViewport.scale}))});
  }finally{await context.close()}
 }
 fs.writeFileSync(w+'/research/pr-100-browser-'+phase+'.json',JSON.stringify({phase,browser:browser.version(),cases},null,2));await browser.close();console.log(JSON.stringify({phase,cases:cases.length}));
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
