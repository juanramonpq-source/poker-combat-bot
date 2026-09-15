const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const base=process.env.POCOBOT_TEST_URL||'http://localhost:3000';

for(const engine of [chromium,webkit]) test(`${engine.name()} online room code can be selected and copied`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true});
  page.setDefaultTimeout(20000);
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedRoomCode=text;}}}));
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>__pocobotDev.loadOnlinePreset('lobby-host'));
  const code=page.locator('#olRoomCodeSpan');
  assert.equal(await code.textContent(),'POCO');
  assert.equal(await code.evaluate(el=>getComputedStyle(el).userSelect||getComputedStyle(el).webkitUserSelect),'text');
  const copy=page.locator('#olCopyRoomCodeBtn');
  assert.equal(await copy.count(),1);
  await copy.tap();
  await page.waitForFunction(()=>window.__copiedRoomCode==='POCO');
  assert.match(await copy.textContent(),/Copiado/);
  assert.match(await page.locator('#olStatus').textContent(),/copiado/i);
 }finally{await browser.close();}
});
