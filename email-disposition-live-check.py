"""Full app, real stdio email MCP and independent GreenMail IMAP transport."""
import asyncio, hashlib, imaplib, json, os, socket, subprocess, sys, time
from email import message_from_bytes, policy
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
import httpx, psutil
w=Path('/Users/red/Documents/ChatGPT/ODY');phase=sys.argv[1];assert phase in {'before','after'}
root=w/'.runtime'/('email-disposition-'+phase);root.mkdir(exist_ok=False);(root/'data').mkdir();(root/'tmp').mkdir()
source=w/('.runtime/calendar-ics-baseline' if phase=='before' else 'odysseus')
java=w/'.runtime/greenmail-validation/jdk-17.0.21+9-jre/Contents/Home/bin/java';jar=w/'.runtime/greenmail-validation/greenmail-standalone-2.1.15.jar'
assert hashlib.sha256(jar.read_bytes()).hexdigest()=='91d58798698cac357f015365240383b936ced2f2a1a9f7db37d9e3e1a31391b1'
for port in [17868,17869]:
    with socket.socket() as s:assert s.connect_ex(('127.0.0.1',port))!=0
logs=[(root/(name+'.log')).open('w') for name in ['greenmail','application']]
mailserver=subprocess.Popen([str(java),'-Dgreenmail.imap.hostname=127.0.0.1','-Dgreenmail.imap.port=17869','-Dgreenmail.users=fixture:fixture','-jar',str(jar)],stdout=logs[0],stderr=subprocess.STDOUT)
app=None;result={'phase':phase,'source':str(source),'HTTP':[],'MCP':[]}
fixtures=[]
for name,kind,disposition in [('Upper plain','plain','ATTACHMENT'),('Upper HTML','html','ATTACHMENT'),('Inline filename','plain','inline'),('Lower control','plain','attachment')]:
    msg=MIMEMultipart('mixed');msg['From']='Owned Sender <sender@example.invalid>';msg['To']='fixture@localhost';msg['Subject']=name;msg['Date']='Fri, 13 Nov 2026 08:00:00 +0000'
    candidate='Attachment content must stay separate' if disposition.lower()=='attachment' else 'Inline body must stay visible'
    if kind=='html':candidate='<p>'+candidate+'</p>'
    part=MIMEText(candidate,kind,'utf-8');part.add_header('Content-Disposition',disposition,filename='attachment.txt' if disposition=='inline' else 'receipt.'+('html' if kind=='html' else 'txt'));msg.attach(part)
    msg.attach(MIMEText('<p>Main body only</p>','html','utf-8'))
    fixtures.append({'name':name,'kind':kind,'disposition':disposition,'bytes':msg.as_bytes(policy=policy.SMTP)})

def stop(p):
    if p is None:return None
    children=psutil.Process(p.pid).children(recursive=True) if p.poll() is None else []
    p.terminate()
    try:p.wait(timeout=20)
    except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
    for c in children:
        try:c.terminate()
        except psutil.NoSuchProcess:pass
    _,alive=psutil.wait_procs(children,timeout=5)
    for c in alive:c.kill()
    _,left=psutil.wait_procs(alive,timeout=5)
    return {'exit':p.returncode,'children_left':[c.pid for c in left]}
try:
    for _ in range(100):
        assert mailserver.poll() is None
        try:
            with imaplib.IMAP4('127.0.0.1',17869,timeout=2) as m:m.login('fixture','fixture');break
        except (OSError,imaplib.IMAP4.error):time.sleep(.2)
    else:raise AssertionError('GreenMail readiness')
    with imaplib.IMAP4('127.0.0.1',17869,timeout=5) as m:
        m.login('fixture','fixture')
        for f in fixtures:assert m.append('INBOX',None,None,f['bytes'])[0]=='OK'
        m.select('INBOX',readonly=True);uids=m.uid('SEARCH',None,'ALL')[1][0].decode().split();assert len(uids)==4
        for f,uid in zip(fixtures,uids):
            f['uid']=uid;raw=m.uid('FETCH',uid,'(BODY.PEEK[])')[1][0][1];parsed=message_from_bytes(raw);part=list(parsed.walk())[1]
            assert str(part['Content-Disposition']).startswith(f['disposition'])
        result['independent_IMAP_headers']=[{'name':f['name'],'uid':f['uid'],'disposition':f['disposition']} for f in fixtures]
    env=dict(os.environ,EMAIL_UNICODE_ROOT=str(root),EMAIL_UNICODE_SOURCE=str(source),ODYSSEUS_DATA_DIR=str(root/'data'),DATABASE_URL=f'sqlite:///{root}/data/app.db',TMPDIR=str(root/'tmp'),AUTH_ENABLED='true',ODYSSEUS_TOOL_INDEX_PREWARM='0',APP_PORT='17868',ODYSSEUS_INTERNAL_BASE='http://127.0.0.1:17868')
    app=subprocess.Popen([sys.executable,str(w/'research/email-unicode-smoke-app.py')],cwd=source,env=env,stdout=logs[1],stderr=subprocess.STDOUT)
    with httpx.Client(base_url='http://127.0.0.1:17868',timeout=90,trust_env=False) as client:
        for _ in range(150):
            assert app.poll() is None
            try:
                if client.get('/api/health',timeout=2).status_code==200:break
            except httpx.ConnectError:pass
            time.sleep(.2)
        else:raise AssertionError('App readiness')
        assert client.post('/api/auth/login',json={'username':'email-unicode-smoke','password':(root/'password').read_text()}).status_code==200
        for f in fixtures:
            response=client.get('/api/email/read/'+f['uid'],params={'folder':'INBOX','account_id':'owned-unicode-mail','full':True});assert response.status_code==200,response.text
            d=response.json();assert 'body' in d,d
            # API uses two independently selected plain/HTML representations.
            expected=('Inline body must stay visible' if f['disposition']=='inline' else 'Main body only')
            if phase=='before':expected={'Upper plain':'Attachment content must stay separate','Upper HTML':'Attachment content must stay separate','Inline filename':'Main body only','Lower control':'Main body only'}[f['name']]
            assert expected in d['body'],d
            if phase=='after':assert 'Attachment content must stay separate' not in d['body'] and 'Attachment content must stay separate' not in (d.get('body_html') or ''),d
            attachments=d.get('attachments',[])
            expected_count=(0 if f['disposition']=='inline' else 1) if phase=='after' else (1 if f['name'] in ['Inline filename','Lower control'] else 0)
            assert len(attachments)==expected_count,(f['name'],d)
            downloads=[]
            for att in attachments:
                download=client.get('/api/email/attachment/'+f['uid']+'/'+str(att['index']),params={'folder':'INBOX','account_id':'owned-unicode-mail'})
                downloads.append({'index':att['index'],'status':download.status_code,'body':download.text});assert download.status_code==200
            result['HTTP'].append({'name':f['name'],'uid':f['uid'],'status':200,'body':d['body'],'body_html':d.get('body_html'),'attachments':attachments,'downloads':downloads})
        from mcp import ClientSession,StdioServerParameters
        from mcp.client.stdio import stdio_client
        async def tools():
            params=StdioServerParameters(command=sys.executable,args=[str(source/'mcp_servers/email_server.py')],env=env)
            async with stdio_client(params) as (read,write):
                async with ClientSession(read,write) as session:
                    await session.initialize()
                    for f in fixtures:
                        reply=await session.call_tool('read_email',arguments={'uid':f['uid'],'folder':'INBOX','account':'owned-unicode-mail','_odysseus_owner':'email-unicode-smoke'})
                        text='\n'.join(x.text for x in reply.content if x.type=='text');assert not reply.isError,text
                        if phase=='after':assert 'Inline body must stay visible' in text if f['disposition']=='inline' else 'Main body only' in text
                        result['MCP'].append({'name':f['name'],'output':text})
        asyncio.run(tools())
    (root/'fixtures.json').write_text(json.dumps([{'name':f['name'],'uid':f['uid']} for f in fixtures]))
    subprocess.run(['node',str(w/'research/email-disposition-browser.cjs'),phase],cwd=source,env=env,check=True,timeout=120)
finally:
    result['app_shutdown']=stop(app);result['mail_shutdown']=stop(mailserver)
    for log in logs:log.close()
    result['ports_closed']={}
    for port in [17868,17869]:
        with socket.socket() as s:result['ports_closed'][str(port)]=s.connect_ex(('127.0.0.1',port))!=0
    (w/'research'/f'pr-100-native-{phase}.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'phase':phase,'HTTP':len(result['HTTP']),'MCP':len(result['MCP']),'cleanup':result['ports_closed']}))
