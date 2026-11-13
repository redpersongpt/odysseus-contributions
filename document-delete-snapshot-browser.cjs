const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const w='/Users/red/Documents/ChatGPT/ODY',phase=process.argv[2],root=w+'/.runtime/document-delete-snapshot-'+phase,origin='http://127.0.0.1:17871';
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const cases=[],evidence=w+'/research/evidence-document-delete-snapshot';fs.mkdirSync(evidence,{recursive:true});
 for(const [width,height] of [[1440,1000],[390,844]])for(const mutation of ['add','remove']){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),ids=[],requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  try{
   assert((await context.request.post(origin+'/api/auth/login',{data:{username:'calendar-form-layout-smoke',password:fs.readFileSync(root+'/password','utf8')}})).ok());
   for(const title of ['Confirmed first','Confirmed second','Keep outside confirmed batch']){
    const r=await context.request.post(origin+'/api/document',{data:{title,content:'Owned delete-snapshot fixture',language:'text'}});assert(r.ok(),await r.text());
    const data=await r.json();assert(data.id,JSON.stringify(data));ids.push(data.id);
   }
   await page.goto(origin);await page.locator('#overflow-plus-btn').waitFor();
   for(let n=0;n<4;n++){const got=page.getByRole('button',{name:'Got it',exact:true});if(await got.isVisible()){await got.click();await page.waitForTimeout(150)}}
   if(width<=768)await page.locator('#hamburger-btn').click();
   await page.locator('#tool-library-btn').click();
   const card=id=>page.locator('.doclib-card[data-doc-id="'+id+'"]');await card(ids[2]).waitFor();
   await page.locator('#doclib-select-btn').click();for(const id of ids.slice(0,2))await card(id).locator('.memory-select-cb').check();
   await page.locator('#doclib-bulk-delete').click();assert((await page.locator('#styled-confirm-msg').innerText()).includes('Delete 2 documents?'));
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:1500,downloadThroughput:-1,uploadThroughput:-1});
   page.on('request',r=>{if(r.method()==='DELETE'&&r.url().includes('/api/document/'))requests.push(r.url().split('/').at(-1));});
   const first=page.waitForRequest(r=>r.method()==='DELETE'&&r.url().endsWith('/api/document/'+ids[0]));
   await page.locator('#styled-confirm-ok').click();await first;
   if(mutation==='add')await card(ids[2]).locator('.memory-select-cb').check();
   else await card(ids[1]).locator('.memory-select-cb').uncheck();
   await page.waitForFunction(()=>document.getElementById('doclib-bulk-bar')?.classList.contains('hidden'),null,{timeout:30000});
   await page.waitForTimeout(1800);
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
   const statuses=[],active=[];for(const id of ids){const r=await context.request.get(origin+'/api/document/'+id);statuses.push(r.status());active.push((await r.json()).is_active);}
   assert.deepEqual(statuses,[200,200,200]);
   const expected=phase==='after'?[false,false,true]:mutation==='add'?[false,false,false]:[false,true,true];
   assert.deepEqual(active,expected,JSON.stringify({requests,ids,active}));
   assert.deepEqual(requests,phase==='after'?ids.slice(0,2):mutation==='add'?ids:ids.slice(0,1));
   assert.equal(errors.length,0,JSON.stringify(errors));
   if(mutation==='add')await page.screenshot({path:evidence+'/'+phase+'-'+width+'.png'});
   cases.push({width,mutation,confirmation:'Delete 2 documents?',ids,actual_delete_requests:requests,GET_statuses:statuses,is_active:active,page_errors:errors,zoom:await page.evaluate(()=>({root:getComputedStyle(document.documentElement).zoom,visual:visualViewport.scale}))});
   fs.writeFileSync(w+'/research/pr-099-browser-'+phase+'.json',JSON.stringify({phase,browser:browser.version(),network_latency_ms:1500,cases},null,2));
   console.log(JSON.stringify({phase,width,mutation,active,requests:requests.length}));
  }finally{for(const id of ids)await context.request.delete(origin+'/api/document/'+id);await context.close()}
 }
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
