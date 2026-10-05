'use strict';
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
// Best-effort per-instance limiter. Instances do not share memory.
const attempts = new Map();
const enquiries = new Set(['Job opportunity','Freelance project','Creative collaboration','CV request','Other']);
const unavailable = 'The form is temporarily unavailable. Please email me directly.';
const emailOK = value => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const equal = (a,b) => typeof a==='string' && typeof b==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const reply = (code,message,extra={}) => res.status(code).json({ok:code===200,...(message?{message}:{}),...extra});
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(405,'Method not allowed.');}
  const user=(process.env.SMTP_USERNAME||'').trim();
  const pass=(process.env.SMTP_PASSWORD||'').replace(/\s/g,'');
  const recipient=(process.env.CONTACT_TO||user).trim();
  if(!emailOK(user)||!emailOK(recipient)||!pass)return reply(503,unavailable);
  const secret=process.env.CSRF_SECRET||pass;
  const sign=value=>crypto.createHmac('sha256',secret).update(value).digest('hex');
  if(req.method==='GET'){
    const raw=`${Date.now()}.${crypto.randomBytes(24).toString('hex')}`;
    const token=`${raw}.${sign(raw)}`;
    res.setHeader('Set-Cookie',`portfolio_csrf=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=7200`);
    return reply(200,null,{csrf:token});
  }
  if(Number(req.headers['content-length']||0)>20000)return reply(413,'Your message is too long.');
  if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reply(415,'Please submit using the contact form.');
  try {
    const origin = new URL(req.headers.origin);
    if(origin.protocol!=='https:' || origin.host!==req.headers.host)return reply(403,'Please submit from this website.');
  }catch{return reply(403,'Please submit from this website.');}
  let body=req.body;
  try{if(typeof body==='string')body=JSON.parse(body);}catch{return reply(400,'Invalid form data.');}
  if(!body || typeof body!=='object' || Array.isArray(body))return reply(400,'Invalid form data.');
  if(Buffer.byteLength(JSON.stringify(body))>20000)return reply(413,'Your message is too long.');
  const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('portfolio_csrf='))?.slice(15);
  const token=body.csrf;
  const parts=typeof token==='string'?token.split('.'):[];
  const timestamp=Number(parts[0]);
  if(parts.length!==3 || !equal(token,cookie) || !equal(parts[2],sign(parts.slice(0,2).join('.'))) || !Number.isFinite(timestamp) || Date.now()-timestamp>7200000 || timestamp>Date.now())return reply(403,'Please close and reopen the form, then try again.');
  const limits={name:400,email:254,company:600,enquiry:100,message:15000,website:500};
  for(const [key,max] of Object.entries(limits))if(typeof body[key]!=='string'||body[key].length>max)return reply(422,'Please check your form entries.');
  const {name,email,company,enquiry,message,website}=Object.fromEntries(Object.keys(limits).map(k=>[k,body[k].trim()]));
  if(website)return reply(422,'Your message could not be accepted. Please email me directly.');
  if(!name || !emailOK(email) || message.length<10 || /[\r\n\x00]/.test(name+email+company) || !enquiries.has(enquiry))return reply(422,'Please enter your name, a valid email and a message of at least 10 characters.');
  const now=Date.now();
  for(const [key,value] of attempts)if(value.reset<=now)attempts.delete(key);
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const key=sign(ip);let state=attempts.get(key)||{count:0,reset:now+3600000};
  if(state.count>=5){res.setHeader('Retry-After',String(Math.ceil((state.reset-now)/1000)));return reply(429,'Too many attempts. Please try later or email me directly.');}
  if(attempts.size>=2048&&!attempts.has(key))return reply(429,'Please try again later or email me directly.');
  state.count++;attempts.set(key,state);
  const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
  try{
    await transport.sendMail({from:{name:'Sai Balaji Portfolio',address:user},to:recipient,replyTo:{name,address:email},subject:`Portfolio enquiry: ${enquiry}`,text:`Name: ${name}\nEmail: ${email}\nCompany: ${company}\nEnquiry: ${enquiry}\n\n${message}`});
    return reply(200);
  }catch{
    console.error('Portfolio SMTP delivery failed. Check environment settings and Gmail access.');
    return reply(502,'Your message could not be sent. Please try again or email me directly.');
  }finally{transport.close();}
};
