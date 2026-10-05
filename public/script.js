'use strict';
const dialog=document.querySelector('#contact-dialog');
const form=document.querySelector('#contact-form');
const statusEl=document.querySelector('#form-status');
const sendButton=document.querySelector('#send-button');
let tokenPromise;
function setStatus(message,type=''){statusEl.textContent=message;statusEl.className=type;}
async function loadToken(){
 try{const response=await fetch('/api/contact',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(!data.csrf)throw new Error();document.querySelector('#csrf').value=data.csrf;return true;}
 catch{setStatus('The form is temporarily unavailable. Please use the email link below.','error');return false;}
}
function openContact(cv=false){
 setStatus('');
 if(cv){document.querySelector('#enquiry').value='CV request';document.querySelector('#message').value='Hi Sai, I’d like to receive your latest CV.';}
 dialog.showModal();tokenPromise=loadToken();
}
document.querySelectorAll('[data-contact]').forEach(button=>button.addEventListener('click',()=>openContact()));
document.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 let count=0;document.querySelectorAll('.project').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&!card.dataset.categories.split(' ').includes(button.dataset.filter);if(!card.hidden)count++;});
 document.querySelector('#filter-status').textContent=`${count} projects shown.`;
}));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 sendButton.disabled=true;sendButton.textContent='Sending…';setStatus('');
 try{
  if(!await tokenPromise)throw new Error('The form is temporarily unavailable. Please email me directly.');
  const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form))),credentials:'same-origin'});
  let data;try{data=await response.json();}catch{throw new Error('Your message could not be sent. Please email me directly.');}
  if(!response.ok||!data.ok)throw new Error(data.message||'Your message could not be sent. Please try again.');
  form.reset();setStatus('Thanks! Your message has been sent. I’ll get back to you soon.','success');tokenPromise=loadToken();
 }catch(error){setStatus(error.message,'error');}
 finally{sendButton.disabled=false;sendButton.textContent='Send message ↗';}
});

// Fit the name to the same content edges as the availability row.
const heroTitle=document.querySelector('.hero h1');
function fitHeroTitle(){
 const range=document.createRange();range.selectNodeContents(heroTitle);
 const current=parseFloat(getComputedStyle(heroTitle).fontSize);
 const width=range.getBoundingClientRect().width;
 if(width>0)heroTitle.style.fontSize=(current*heroTitle.clientWidth/width)+'px';
}
document.fonts.ready.then(fitHeroTitle);
let lastHeroWidth=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==lastHeroWidth){lastHeroWidth=width;fitHeroTitle();}}).observe(heroTitle.parentElement);
