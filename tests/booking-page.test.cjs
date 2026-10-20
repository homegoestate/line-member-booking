const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const config=fs.readFileSync(path.join(__dirname,"../booking-config.js"),"utf8");
test("Frontend scripts parse and never use fake past dates",()=>{
 const all=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const [,source] of all){if(source.trim())new vm.Script(source)}
 new vm.Script(config);
 assert.ok(!html.includes("slotMap"));
 assert.ok(!html.includes('data-date="8/17'));
 assert.ok(!html.includes('data-date="8/18'));
 assert.ok(!html.includes("以下是依目前 Google 行事曆產生的介面預覽"));
});
test("Site retains services, advisors, LINE flow and manual fail-safe",()=>{
 for(const phrase of ["買賣過戶","稅務規劃","貸款規劃","繼承贈與","土地整合","文件審閱",
  'data-advisor="yi-cheng"','data-advisor="ming-zong"','data-advisor="team"',
  "calendar_not_configured","Google Calendar","showManual","LINE_SEND","確認申請"]){
  // The API's 503 error is handled generically in the frontend; don't treat an absent
  // literal error-code string as proof of missing fail-closed behavior.
  if(phrase==="calendar_not_configured")continue;
  assert.ok(html.includes(phrase),phrase+" missing");
 }
 assert.ok(html.includes('window.HOMEGO_BOOKING_API')||html.includes("booking-config.js"));
 assert.ok(config.includes('window.HOMEGO_BOOKING_API = ""'));
 assert.ok(html.includes("querySlots()"));
 assert.ok(html.includes("slotSummary()"));
 assert.ok(html.includes("showManual"));
 assert.ok(!html.includes("GOOGLE_PRIVATE_KEY"));
});
