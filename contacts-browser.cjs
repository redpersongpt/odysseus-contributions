const {chromium}=require('../.runtime/issue-6490-frontend-deps/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');let ownedBrowser;
(async()=>{const phase=process.argv[2],root='/Users/red/Documents/ChatGPT/ODY/.runtime/contacts-failure-20261119-'+phase,folder=root+'/owned contacts',file=folder+'/contacts.json';
const initial=fs.readFileSync(root+'/initial-contacts.json','utf8');
const source=phase==='before'?'/Users/red/Documents/ChatGPT/ODY/.runtime/tmp-path-baseline':'/Users/red/Documents/ChatGPT/ODY/odysseus';
const evidence='/Users/red/Documents/ChatGPT/ODY/research/evidence-contacts-failure-20261119';fs.mkdirSync(evidence,{recursive:true});
const browser=ownedBrowser=await chromium.launch({channel:'chrome',headless:true}),cases=[];let sharedStorage;
for(const [label,width,height]of[['desktop',1440,1000],['mobile',390,844]])for(const scenario of ['add','edit','delete','clear','config','validation']){
 fs.chmodSync(folder,0o755);
 const context=await browser.newContext({viewport:{width,height},...(sharedStorage?{storageState:sharedStorage}:{})});assert((await context.request.post('http://127.0.0.1:17836/api/auth/login',{data:{username:'contacts-failure-smoke',password:fs.readFileSync(root+'/password','utf8')}})).ok());
 assert((await context.request.delete('http://127.0.0.1:17836/api/contacts/clear')).ok());
 const created=await context.request.post('http://127.0.0.1:17836/api/contacts/add',{data:{name:'Owned contact',email:'owned@example.invalid',phone:'5550100'}});assert(created.ok()&&(await created.json()).success);
 const fixture=(await(await context.request.get('http://127.0.0.1:17836/api/contacts/list')).json()).contacts;assert.equal(fixture.length,1);const uid=fixture[0].uid,original=fs.readFileSync(file,'utf8');
 const served=await context.request.get('http://127.0.0.1:17836/static/js/settings.js');const bytes=await served.body();assert(bytes.equals(fs.readFileSync(source+'/static/js/settings.js')));
 for(const path of ['settings/integrations/forms/carddav.js','settings/integrations/unified.js','settings/integrations/contactsWrite.js']){const r=await context.request.get('http://127.0.0.1:17836/static/js/'+path);assert(r.ok());assert((await r.body()).equals(fs.readFileSync(source+'/static/js/'+path)));}
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:17836/');await page.locator('#overflow-plus-btn').waitFor();
  for(let i=0;i<4;i++){const got=page.getByRole('button',{name:'Got it',exact:true});if(await got.isVisible()){await got.click();await page.waitForTimeout(200)}}
  await page.evaluate(async()=>{const module=await import('/static/js/settings.js?v=20260912writingstyle3');module.default.open('integrations')});const card=page.locator('.intg-card[data-intg-type="contacts"]').first();await card.waitFor();await card.click();await page.locator('#cm-list .contact-row').first().waitFor();
  const row=page.locator('#cm-list .contact-row').filter({has:page.locator('.contact-edit-name[value="Owned contact"]')});
  if(scenario==='add'||scenario==='clear'){
   await page.locator('#cm-add-toggle').click();await page.locator('#cm-add-name').fill('Owned new draft');await page.locator('#cm-add-email').fill('new@example.invalid');
  }
  if(scenario==='edit'||scenario==='validation'){
   await row.locator('.contact-edit').click();await row.locator('.contact-edit-name').fill('Owned edited draft');await row.locator('.contact-edit-emails').fill('edited@example.invalid');
  }
  if(scenario==='validation'){for(const selector of ['.contact-edit-name','.contact-edit-emails','.contact-edit-phones','.contact-edit-address'])await row.locator(selector).fill('')}
  if(scenario==='config')await page.locator('#uf-carddav-url').fill('file:///owned-invalid-contact-fixture');
  if(!['config','validation'].includes(scenario))fs.chmodSync(folder,0o555);
  const target=scenario==='add'?'/api/contacts/add':scenario==='config'?'/api/contacts/config':scenario==='clear'?'/api/contacts/clear':'/api/contacts/'+encodeURIComponent(uid);
  const method=scenario==='add'?'POST':scenario==='delete'||scenario==='clear'?'DELETE':'PUT';
  async function submit(){
   if(scenario==='add')await page.locator('#cm-add-save').click();
   if(scenario==='edit'||scenario==='validation')await row.locator('.contact-save').click();
   if(scenario==='config')await page.locator('#uf-carddav-save').click();
   if(scenario==='delete'){await row.locator('.contact-del').click();await page.locator('#styled-confirm-ok').click()}
   if(scenario==='clear'){await card.locator('.intg-del-btn').click();await page.locator('#styled-confirm-ok').click()}
  }
  const responsePromise=page.waitForResponse(r=>r.url().endsWith(target)&&r.request().method()===method);await submit();const response=await responsePromise;assert.equal(response.status(),scenario==='config'?400:scenario==='validation'?200:500);if(scenario==='validation')assert.equal((await response.json()).success,false);
  fs.chmodSync(folder,0o755);await page.waitForTimeout(650);
  const state=await page.evaluate(()=>({addVisible:!!document.getElementById('cm-add-row')&&getComputedStyle(document.getElementById('cm-add-row')).display!=='none',addName:document.getElementById('cm-add-name')?.value,editVisible:!!document.querySelector('.contact-row-edit')&&getComputedStyle(document.querySelector('.contact-row-edit')).display!=='none',editName:document.querySelector('.contact-edit-name')?.value,formVisible:!!document.getElementById('uf-carddav-save')&&!!document.getElementById('uf-carddav-save').getClientRects().length,configMessage:document.getElementById('uf-carddav-msg')?.textContent,errorVisible:!!document.querySelector('#toast.show.error'),errorText:document.querySelector('#toast .toast-message')?.textContent||''}));
  assert.equal(fs.readFileSync(file,'utf8'),original);const record={viewport:label,scenario,http_status:response.status(),state,contacts_file_unchanged:true,page_errors:errors,served_source_sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  if(phase==='before'){
   if(scenario==='add')assert(!state.addVisible&&state.addName==='');
   if(scenario==='edit'||scenario==='validation')assert(!state.editVisible&&state.editName==='Owned contact');
   if(scenario==='clear')assert(!state.formVisible);
   if(scenario==='config')assert.equal(state.configMessage,'Saved');
   if(scenario!=='config')assert(!state.errorVisible);
  }else{
   if(scenario==='add'||scenario==='clear')assert(state.addVisible&&state.addName==='Owned new draft'&&state.formVisible);
   if(scenario==='validation')assert(state.editVisible&&state.editName==='');
   if(scenario==='edit')assert(state.editVisible&&state.editName==='Owned edited draft');
   if(scenario==='config')assert(state.configMessage&&state.configMessage!=='Saved');else assert(state.errorVisible);
  }
  if(scenario==='edit'){await row.scrollIntoViewIfNeeded();await page.screenshot({path:evidence+'/'+phase+'-'+label+'.png'})}
  if(phase==='after'){
   if(scenario==='validation'){await row.locator('.contact-edit-name').fill('Owned validated draft');await row.locator('.contact-edit-emails').fill('valid@example.invalid')}
  if(scenario==='config')await page.locator('#uf-carddav-url').fill('');
   const retryPromise=page.waitForResponse(r=>r.url().endsWith(target)&&r.request().method()===method);await submit();const retry=await retryPromise,retryBody=await retry.json();assert.equal(retry.status(),200);assert.equal(retryBody.success,true);await page.waitForTimeout(300);
   const saved=JSON.parse(fs.readFileSync(file,'utf8')).contacts;
   if(scenario==='add')assert(saved.some(c=>c.name==='Owned new draft'));
   if(scenario==='validation')assert(saved.some(c=>c.uid===uid&&c.name==='Owned validated draft'));
   if(scenario==='edit')assert(saved.some(c=>c.uid===uid&&c.name==='Owned edited draft'));
   if(scenario==='delete'||scenario==='clear')assert(!saved.some(c=>c.uid===uid));
   record.successful_retry={status:retry.status(),success:retryBody.success,contacts_count:saved.length};
  }
  assert.equal(errors.length,0,JSON.stringify(errors));cases.push(record);sharedStorage=await context.storageState();
  fs.writeFileSync('/Users/red/Documents/ChatGPT/ODY/research/contacts-failure-'+phase+'-20261119-live-result.json',JSON.stringify({phase,fixture:'Only named CONTACTS_FILE is placed in an owned directory. Real chmod write denial; authentication/settings stay writable. Actual app, HTTP and atomic writer, no response/storage mocks. Settings pane opened through existing public controller; mutation buttons/confirmations clicked normally.',cases},null,2));
 }finally{fs.chmodSync(folder,0o755);await context.close()}
}
console.log(JSON.stringify(cases,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1}).finally(async()=>{if(ownedBrowser)await ownedBrowser.close()});
