const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
function setup(env={SMTP_USERNAME:'owner@gmail.com',SMTP_PASSWORD:'test-secret'}){
 let sent=[],fail=false;
 const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync('api/contact.js','utf8'),{module:mod,require:n=>n==='node:crypto'?crypto:{createTransport:()=>({sendMail:async m=>{if(fail)throw Error();sent.push(m);},close(){}})},process:{env},Buffer,URL,console:{error(){}}});
 const call=async(method,body,headers={})=>{
  const r={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;return this;}};
  await mod.exports({method,body,headers:{host:'portfolio.vercel.app',origin:'https://portfolio.vercel.app','content-type':'application/json',...headers},socket:{remoteAddress:'127.0.0.1'}},r);return r;
 };
 return {call,sent,setFail:()=>fail=true};
}
async function session(s){const r=await s.call('GET');assert.equal(r.code,200);return {body:{csrf:r.body.csrf,name:'Visitor',email:'visitor@example.com',company:'',enquiry:'Freelance project',message:'Please contact me about a website.',website:''},headers:{cookie:r.headers['Set-Cookie'].split(';')[0]}};}
test('Gmail settings missing returns useful error',async()=>{assert.equal((await setup({}).call('GET')).code,503);});
test('valid submission uses fixed recipient and visitor reply-to',async()=>{const s=setup();const {body,headers}=await session(s);assert.equal((await s.call('POST',body,headers)).code,200);assert.equal(s.sent[0].to,'owner@gmail.com');assert.equal(s.sent[0].replyTo.address,body.email);});
test('reject cross-origin, bad token, honeypot, invalid email, short message and header injection',async()=>{const s=setup();const {body,headers}=await session(s);assert.equal((await s.call('POST',body,{...headers,origin:'https://other.example'})).code,403);for(const [patch,code] of [[{csrf:'fake'},403],[{website:'bot'},422],[{email:'bad'},422],[{message:'short'},422],[{name:'a\r\nb'},422]])assert.equal((await s.call('POST',{...body,...patch},headers)).code,code);assert.equal(s.sent.length,0);});
test('SMTP failure never returns success',async()=>{const s=setup();const {body,headers}=await session(s);s.setFail();assert.equal((await s.call('POST',body,headers)).code,502);});
test('sixth attempt is limited within an instance',async()=>{const s=setup();const {body,headers}=await session(s);for(let i=0;i<5;i++)assert.equal((await s.call('POST',body,headers)).code,200);assert.equal((await s.call('POST',body,headers)).code,429);});
test('unsupported method, content type and oversized request',async()=>{const s=setup();assert.equal((await s.call('DELETE')).code,405);assert.equal((await s.call('POST',{}, {'content-type':'text/plain'})).code,415);assert.equal((await s.call('POST',{}, {'content-length':'30000'})).code,413);});
