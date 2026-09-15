const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
for(const engine of [chromium,webkit]) test(`${engine.name()} available actions first and missing requirements below`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');state.tutorial=true;state.transitionLock=false;state.players[0].hand=[devMakeCard('4','diamonds')];state.players[0].flags.figureBurstPromptShown=true;state.projectileUnlocked=false;render();});
  const hud=page.frameLocator('#mobileSpriteBridgeFrame');
  await hud.locator('[data-menu-toggle]').tap();await hud.locator('.top-menu [data-reference="help"]').tap();
  const blocked=hud.locator('[data-help-blocked]');
  assert.equal(await blocked.count(),1);
  assert.equal(await blocked.evaluate(el=>el.open),false);
  assert.match(await blocked.locator(':scope > summary').textContent(),/Qué NO puedo hacer TODAVÍA/);
  const expected=await page.evaluate(()=>getInGameHelpPayload(0).options.filter(o=>o.available).map(o=>o.id));
  assert.deepEqual(await hud.locator('[data-help-available] [data-help-option]').evaluateAll(els=>els.map(e=>e.dataset.helpOption)),expected);
  assert.match(await page.evaluate(()=>getInGameHelpPayload(0).title),/Qué puedo hacer/);
  assert.doesNotMatch(await page.evaluate(()=>getInGameHelpPayload(0).text),/Te falta:/);
  await page.screenshot({path:`test-results/help-availability-20260915/${engine.name()}-available-first.png`});
  await blocked.locator(':scope > summary').tap();
  const attack=blocked.locator('[data-help-option="attack"]');await attack.locator('summary').tap();
  assert.match(await attack.locator('.help-reason').textContent(),/palo del piloto/);
  assert.equal(await attack.locator('[data-help-guide]').isVisible(),false);
  await page.screenshot({path:`test-results/help-availability-20260915/${engine.name()}-requirements.png`});
  // An action becoming legal moves above without closing another open topic.
  await hud.locator('[data-help-option="draw"] summary').tap();
  await page.evaluate(()=>{state.players[0].attack.push(devMakeCard('10','spades'));render();});
  await hud.locator('[data-help-available] [data-help-option="attack"]').waitFor();
  assert.equal(await hud.locator('[data-help-option="draw"]').evaluate(e=>e.open),true);
  assert.deepEqual(await hud.locator('[data-help-available] [data-help-option]').evaluateAll(els=>els.map(e=>e.dataset.helpOption)),['build','attack','draw','pass','log']);
  await page.evaluate(()=>{state.players[0].hand=[];render();});
  await hud.locator('[data-help-blocked-topics] [data-help-option="draw"]').waitFor({state:'attached'});
  assert.equal(await hud.locator('[data-help-option="draw"]').evaluate(e=>e.open),false);
  for(const size of [{width:393,height:790},{width:768,height:1024},{width:844,height:390}]){
   await page.setViewportSize(size);
   await blocked.locator(':scope > summary').evaluate(el=>{if(!el.parentElement.open)el.click();});
   await page.screenshot({path:`test-results/help-availability-20260915/${engine.name()}-${size.width}.png`});
   assert.equal(await hud.locator('[data-reference-dialog]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;}),true);
  }
  await page.evaluate(()=>{state.transitionLock=true;render();});
  await page.waitForFunction(()=>document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelectorAll('[data-help-available] [data-help-option]').length===1);
  assert.deepEqual(await hud.locator('[data-help-available] [data-help-option]').evaluateAll(els=>els.map(e=>e.dataset.helpOption)),['log']);
  assert.match(await hud.locator('[data-help-option="pass"] .help-reason').textContent(),/turno|rival/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

for(const engine of [chromium,webkit]) test(`${engine.name()} panel question button opens help without obscuring cards`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});page.setDefaultTimeout(20000);
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');state.players[0].flags.figureBurstPromptShown=true;render();});
  const hud=page.frameLocator('#mobileSpriteBridgeFrame');
  for(const size of [{width:375,height:667},{width:393,height:790},{width:768,height:1024},{width:844,height:390},{width:1024,height:768}]){
   await page.setViewportSize(size);
   if(!await hud.locator('.phone-shell').evaluate(el=>el.classList.contains('board-open')))await hud.locator('[data-tab="mecha"]').tap();
   await page.waitForTimeout(250); // Let the panel's opening transform finish before measuring hit targets.
   const button=hud.locator('[data-panel-help]');assert.equal(await button.count(),1);
   assert.equal(await button.textContent(),'?');
   const bounds=await button.evaluate(el=>{const r=el.getBoundingClientRect();const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return {width:r.width,height:r.height,uncovered:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),collisions:[...document.querySelectorAll('.zone-grid,.fuel-dock,.drawer-foot,[data-board-close]')].filter(x=>overlap(r,x.getBoundingClientRect())).length};});
   assert.ok(bounds.width>=44&&bounds.height>=44);assert.ok(bounds.uncovered);assert.equal(bounds.collisions,0);
   await page.screenshot({path:`test-results/help-availability-20260915/${engine.name()}-question-${size.width}.png`});
   const before=await page.evaluate(()=>JSON.stringify({players:state.players,selected:state.selected,turn:state.turnCount}));
   await button.tap();await hud.locator('[data-help-blocked]').waitFor();
   assert.equal(await hud.locator('[data-reference-dialog]').evaluate(el=>el.open),true);
   await hud.locator('[data-reference-close]').tap();
   assert.equal(await page.evaluate(()=>JSON.stringify({players:state.players,selected:state.selected,turn:state.turnCount})),before);
  }
 }finally{await browser.close();}
});
for(const engine of [chromium,webkit]) test(`${engine.name()} attack help requires enough installed fuel`,async()=>{
 const browser=await engine.launch();try{
  const page=await browser.newPage();await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  const result=await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);state.transitionLock=false;const p=state.players[0];p.attack=['8','9','10'].map(rank=>devMakeCard(rank,'spades'));p.fuel=[devMakeCard('2','diamonds')];const before=getInGameHelpPayload(0).options.find(o=>o.id==='attack');p.fuel=[devMakeCard('4','diamonds')];const after=getInGameHelpPayload(0).options.find(o=>o.id==='attack');return {before,after};});
  assert.equal(result.before.available,false);assert.match(result.before.reason,/4.*8/);assert.equal(result.after.available,true);
 }finally{await browser.close();}
});

for(const engine of [chromium,webkit]) test(`${engine.name()} touch HUD does not select text`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true});
  await page.goto(`${base}/mobile-sprite-boceto/compacto-funcional.html`);
  const result=await page.evaluate(()=>{
    const selection=window.getSelection();
    const range=document.createRange();
    const heading=document.querySelector('[data-drawer-title]');
    range.selectNodeContents(heading);selection.removeAllRanges();selection.addRange(range);
    const selected=selection.toString();
    const event=new Event('selectstart',{bubbles:true,cancelable:true});
    heading.dispatchEvent(event);
    const style=getComputedStyle(document.body);
    return {selected,selectStartPrevented:event.defaultPrevented,body:style.userSelect || style.webkitUserSelect};
  });
  assert.equal(result.selected,'');assert.equal(result.selectStartPrevented,true);assert.equal(result.body,'none');
 }finally{await browser.close();}
});
