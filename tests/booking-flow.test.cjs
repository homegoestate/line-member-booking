const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
function page(fetcher){
 class Element{
  constructor(){this.listeners={};this.children=[];this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.classList={toggle(){}};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(){} removeAttribute(){} replaceChildren(){this.children=[];} appendChild(e){this.children.push(e);} scrollIntoView(){}
  async click(target=this){if(this.disabled)return;await this.listeners.click?.({target});}
  closest(){return this;}
 }
 const els=new Map();const get=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id)};
 const timers=new Map();let timerId=0;
 const window={HOMEGO_BOOKING_API:'https://nexus-line-bot.vercel.app/api/consult-availability',location:{href:''}};
 const context={window,document:{getElementById:get,querySelectorAll:()=>[],createElement:()=>new Element()},Intl,Date,URL,AbortController,Set,fetch:fetcher,
 setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)}};
 vm.runInNewContext(source,context);
 return {get,window,timers,async begin(){
  const service=new Element();service.dataset.service='買賣過戶';await get('serviceChoices').click(service);await get('next').click();
  const advisor=new Element();advisor.dataset.advisor='yi-cheng';await get('advisorChoices').click(advisor);await get('next').click();await tick();
 },async choose(){await get('availableTimes').children[0].click();await get('next').click();}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const slot={start:day+'T09:00:00+08:00',end:day+'T10:00:00+08:00'};
const payload=overrides=>({source:'google-calendar-freebusy',timezone:'Asia/Taipei',advisor:'yi-cheng',checkedAt:new Date().toISOString(),slots:[slot],...overrides});
const response=data=>({ok:true,json:async()=>data});
test('live candidates are rechecked before LINE; application never claims confirmation',async()=>{
 let calls=0;const p=page(async()=>{calls++;return response(payload())});await p.begin();
 assert.equal(p.get('realAvailability').hidden,false);await p.choose();await p.get('next').click();
 assert.equal(calls,2);const message=decodeURIComponent(p.window.location.href);
 assert.match(message,/line.me\/R\/oaMessage\/@604gpqef/);assert.match(message,/尚未保留時段、成立委任或完成預約/);
});
test('changed busy time or duration blocks sending and clears selection without another background query',async()=>{
 for(const slots of [[],[{...slot,end:day+'T11:00:00+08:00'}]]){
  let calls=0;const p=page(async()=>response(payload(++calls===1?{}:{slots})));
  await p.begin();await p.choose();await p.get('next').click();await tick();
  assert.equal(calls,2);assert.equal(p.window.location.href,'');assert.equal(p.get('realAvailability').hidden,true);
  assert.match(p.get('availabilityStatus').textContent,/已發生變更/);
 }
});
test('recheck network failure falls back and does not send LINE',async()=>{
 let calls=0;const p=page(async()=>{if(++calls===2)throw Error('offline');return response(payload())});
 await p.begin();await p.choose();await p.get('next').click();assert.equal(p.window.location.href,'');assert.match(p.get('availabilityStatus').textContent,/再次核對失敗/);
});
test('invalid and stale API responses never show candidate slots',async()=>{
 for(const data of [payload({checkedAt:'invalid'}),payload({checkedAt:new Date(Date.now()-240000).toISOString()}),payload({timezone:'UTC'}),payload({advisor:'ming-zong'}),payload({slots:[{...slot,end:'invalid'}]}),payload({slots:[{...slot,end:slot.start}]}),payload({slots:[slot,slot]})]){
  const p=page(async()=>response(data));await p.begin();assert.equal(p.get('realAvailability').hidden,true);assert.equal(p.get('manualEntry').hidden,false);
 }
});
test('503, timeout and empty availability use manual coordination',async()=>{
 for(const fn of [async()=>({ok:false}),async()=>{throw Error('AbortError')},async()=>response(payload({slots:[]}))]){
  const p=page(fn);await p.begin();assert.equal(p.get('realAvailability').hidden,true);assert.equal(p.window.location.href,'');
 }
});
test('back navigation cancels delayed recheck and prevents unintended LINE navigation',async()=>{
 let release,calls=0;const p=page(async()=>{if(++calls===2)return new Promise(r=>release=r);return response(payload())});
 await p.begin();await p.choose();const pending=p.get('next').click();await tick();await p.get('back').click();release(response(payload()));await pending;await tick();
 assert.equal(p.window.location.href,'');
});
test('double submit cannot launch concurrent rechecks',async()=>{
 let release,calls=0;const p=page(async()=>{if(++calls===2)return new Promise(r=>release=r);return response(payload())});
 await p.begin();await p.choose();const pending=p.get('next').click();await p.get('next').click();assert.equal(calls,2);release(response(payload()));await pending;
});
test('displayed slots expire and cannot be sent from review',async()=>{
 const p=page(async()=>response(payload()));await p.begin();await p.choose();
 const expiry=[...p.timers.values()].find(t=>t.ms>22000);assert.ok(expiry);expiry.fn();
 assert.equal(p.get('realAvailability').hidden,true);assert.match(p.get('availabilityStatus').textContent,/已逾時/);assert.equal(p.window.location.href,'');
});
test('manual date in past cannot continue; valid request is still pending confirmation',async()=>{
 const p=page(async()=>({ok:false}));await p.begin();p.get('preferredPeriod').value='上午';p.get('preferredDate').value='2000-01-01';p.get('preferredDate').listeners.change();
 assert.equal(p.get('next').disabled,true);p.get('preferredDate').value=day;p.get('preferredDate').listeners.change();await p.get('next').click();await p.get('next').click();assert.match(decodeURIComponent(p.window.location.href),/希望時段，尚未確認/);
});
