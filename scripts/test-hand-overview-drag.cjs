const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
require('node:fs').mkdirSync('test-results/hand-overview-20260915',{recursive:true});

for(const engine of [chromium,webkit]) for(const viewport of [{width:393,height:790},{width:844,height:390},{width:768,height:1024}]) {
 test(`${engine.name()} full hand drag ${viewport.width}`,async()=>{
  const browser=await engine.launch();
  try {
   const page=await browser.newPage({viewport,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   page.setDefaultTimeout(20000);
   await page.goto(`${base}/poker_combat_bot_ONLINE.html`);
   await page.waitForFunction(()=>window.__pocobotDev);
   const id=await page.evaluate(()=>{
    __pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');
    state.transitionLock=false;state.players[0].flags.figureBurstPromptShown=true;
    state.players[0].hand=[devMakeCard('9','diamonds'),...['hearts','clubs','spades'].flatMap(suit=>['2','3','4','5','J','Q'].map(rank=>devMakeCard(rank,suit))).slice(0,17)];render();
    return state.players[0].hand[0].id;
   });
   const hud=page.frameLocator('#mobileSpriteBridgeFrame');
   await hud.locator('[data-hand-overview-toggle]').tap();
   await page.waitForTimeout(250);
   await page.screenshot({path:`test-results/hand-overview-20260915/${engine.name()}-${viewport.width}-overview.png`});
   const card=hud.locator(`.hand-overview [data-card-id="${id}"]`);
   const r=await card.boundingBox();const start={x:r.x+r.width/2,y:r.y+r.height/2};
   const session=engine===chromium?await page.context().newCDPSession(page):null;
   async function gesture(type,point){
    if(session)await session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{...point,id:1}]});
    else if(type==='touchStart'){await page.mouse.move(point.x,point.y);await page.mouse.down();}
    else if(type==='touchMove')await page.mouse.move(point.x,point.y,{steps:5});
    else await page.mouse.up();
   }
   await gesture('touchStart',start);await gesture('touchMove',{x:start.x,y:start.y-20});
   assert.equal(await hud.locator('.touch-drag-ghost').count(),1,'Dragging the full-hand card creates a ghost');
   assert.equal(await hud.locator('.phone-shell').evaluate(el=>el.classList.contains('hand-overview-open')),false,'Overview makes room for drop targets');
   await page.waitForTimeout(250);
   const fuel=await hud.locator('.drop-zone[data-zone="fuel"]').boundingBox();
   await gesture('touchMove',{x:fuel.x+fuel.width/2,y:fuel.y+fuel.height/2});
   await gesture('touchEnd');
   await page.waitForFunction(id=>mobileSpriteDraftPlacements.get(id)==='fuel',id);
   await hud.locator('[data-zone="fuel"] .is-draft-preview').waitFor();
   await page.screenshot({path:`test-results/hand-overview-20260915/${engine.name()}-${viewport.width}-drop.png`});
   assert.equal(await page.evaluate(id=>state.players[0].hand.some(c=>c.id===id),id),true,'Drop prepares a change without consuming the turn');
   await hud.locator('.drawer-foot [data-action="clear"]').tap();
   await page.waitForFunction(()=>mobileSpriteDraftPlacements.size===0);
   // Releasing away from a destination must not use an earlier hovered zone.
   await hud.locator('[data-hand-overview-toggle]').tap();await page.waitForTimeout(250);
   const r2=await card.boundingBox();const s2={x:r2.x+r2.width/2,y:r2.y+r2.height/2};
   await gesture('touchStart',s2);await gesture('touchMove',{x:s2.x,y:s2.y-20});await page.waitForTimeout(250);
   await gesture('touchMove',{x:fuel.x+fuel.width/2,y:fuel.y+fuel.height/2});
   await gesture('touchMove',{x:8,y:8});await gesture('touchEnd');
   assert.equal(await page.evaluate(()=>mobileSpriteDraftPlacements.size),0,'Dropping outside cancels');
   assert.equal(await hud.locator('.touch-drag-ghost').count(),0);
   if(session){
    await hud.locator('[data-hand-overview-toggle]').tap();await page.waitForTimeout(250);
    const r3=await card.boundingBox();const s3={x:r3.x+r3.width/2,y:r3.y+r3.height/2};
    await gesture('touchStart',s3);await gesture('touchMove',{x:s3.x,y:s3.y-20});await page.waitForTimeout(250);
    await gesture('touchMove',{x:fuel.x+fuel.width/2,y:fuel.y+fuel.height/2});await gesture('touchCancel');
    assert.equal(await page.evaluate(()=>mobileSpriteDraftPlacements.size),0,'Interrupted touch must not place the card');
   }
   // The same full-hand card can still be tapped and dragged after cancellation.
   await hud.locator('[data-hand-overview-toggle]').tap();await page.waitForTimeout(250);
   // Simulate a slow render: the compatibility click must not toggle the card twice.
   await page.evaluate(()=>{window.handTrace=[];const bridge=__pocobotSpriteMobileBridge,handle=bridge.handle;bridge.handle=(...args)=>{handTrace.push(args);const result=handle(...args);if(args[0]==='select'){const until=performance.now()+350;while(performance.now()<until){}}return result;};});
   await card.tap();
   assert.equal(await page.evaluate(id=>state.selected.some(c=>c.id===id),id),true,JSON.stringify(await page.evaluate(()=>({trace:handTrace,selected:state.selected}))));
   const r4=await card.boundingBox();const s4={x:r4.x+r4.width/2,y:r4.y+r4.height/2};
   await gesture('touchStart',s4);await gesture('touchMove',{x:s4.x,y:s4.y-20});await page.waitForTimeout(250);
   await gesture('touchMove',{x:fuel.x+fuel.width/2,y:fuel.y+fuel.height/2});await gesture('touchEnd');
   await page.waitForFunction(id=>mobileSpriteDraftPlacements.get(id)==='fuel',id);
   await hud.locator('[data-drawer-primary]').tap();
   await page.waitForFunction(id=>state.players[0].fuel.some(c=>c.id===id),id);
   assert.equal(await page.evaluate(id=>state.players[0].hand.some(c=>c.id===id),id),false);
  }finally{await browser.close();}
 });
}
