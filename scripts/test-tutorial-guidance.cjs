const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
fs.mkdirSync('test-results/tutorial-guidance',{recursive:true});
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
async function game(engine,run){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');
   window.exercise=(lessonId,stepId)=>{resetTutorialSession();const lesson=academyGetLessonById(lessonId);lesson.prepare();tutorialSystem.enabled=true;tutorialSystem.mode='academy';tutorialSystem.lessonId=lessonId;tutorialSystem.script=lesson.script;tutorialBotState.greetingDone=true;tutorialGoToStep(stepId);clearDefenseInteractionGuard();};
  });
  await run(page,page.frameLocator('#mobileSpriteBridgeFrame'));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
for(const engine of [chromium,webkit]){
 test(`${engine.name()} repeat restores defense and clears a staged build through touch`,()=>game(engine,async(page,hud)=>{
  await page.evaluate(()=>{exercise('academy-2','academy-pilot-choice');setMobileSpriteDraftPlacement(TUTORIAL_CARD_IDS.p0Pilot,'pilot');render();});
  const repeat=hud.locator('[data-tutorial-actions] button').filter({hasText:'Repetir este paso'});
  await repeat.tap();
  await page.waitForFunction(()=>mobileSpriteDraftPlacements.size===0);
  assert.equal(await page.evaluate(()=>tutorialGetCurrentStep().id),'academy-pilot-choice');
  assert.equal(await page.evaluate(()=>setMobileSpriteDraftPlacement(TUTORIAL_CARD_IDS.p0Pilot,'pilot')),true);
  await page.evaluate(()=>exercise('academy-4','academy-active-defense'));
  assert.equal(await page.evaluate(()=>canRepeatCurrentTutorialStep()),true,'Defense has a restorable checkpoint');
  await page.evaluate(()=>{state.selected=[tutorialBuildSelectableCard(0,'hand',TUTORIAL_CARD_IDS.p0DefendDiamond)];render();});
  // The full reading sheet also provides recovery when a combat panel hides TutoBOT.
  await hud.locator('[data-panel-help]').tap();
  await hud.locator('[data-reference-dialog] [data-tutorial-action="repeat-step"]').tap();
  await page.waitForFunction(()=>state.selected.length===0);
  assert.equal(await page.evaluate(()=>tutorialGetCurrentStep().id),'academy-active-defense');
  assert.equal(await page.evaluate(()=>state.pendingDefense.defenderIndex),0);
  assert.equal(await page.evaluate(()=>tutorialCanSelectCard(state.players[0].hand.find(c=>c.id===TUTORIAL_CARD_IDS.p0DefendDiamond))),true);
 }));
 test(`${engine.name()} TutoBOT text and reading control fit without clipping`,()=>game(engine,async(page,hud)=>{
  await page.evaluate(()=>{startTutorialMode();tutorialGoToStep('combat-phases');});
  await hud.locator('[data-tutorial-message] [data-reference="help"]').tap();
  assert.equal(await hud.locator('[data-reference-dialog]').evaluate(el=>el.open),true);
  assert.equal(await page.evaluate(()=>tutorialGetCurrentStep().id),'combat-phases','Reading must not advance the exercise');
  await hud.locator('[data-reference-close]').tap();
  for(const size of [{width:393,height:790},{width:375,height:667},{width:768,height:1024},{width:844,height:390}]){
   await page.setViewportSize(size);
   await page.waitForTimeout(200);
   const geometry=await hud.locator('[data-tutorial-message]').evaluate(el=>{
    const body=el.querySelector('[data-tutorial-text]'),read=el.querySelector('[data-reference="help"]'),actions=el.querySelector('[data-tutorial-actions]');
    const r=el.getBoundingClientRect(),t=body.getBoundingClientRect(),b=read.getBoundingClientRect(),a=actions.getBoundingClientRect();
    return {fits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,readable:body.scrollHeight<=body.clientHeight+1||['auto','scroll'].includes(getComputedStyle(body).overflowY),bodyHeight:t.height,font:parseFloat(getComputedStyle(body).fontSize),readWidth:b.width,belowText:b.top>=t.bottom-1&&a.top>=t.bottom-1};
   });
   assert.ok(geometry.fits,JSON.stringify(geometry));assert.ok(geometry.readable,JSON.stringify(geometry));assert.ok(geometry.bodyHeight>=40,JSON.stringify(geometry));assert.ok(geometry.font>=14);assert.ok(geometry.readWidth>=120);assert.ok(geometry.belowText);
   await page.screenshot({path:`test-results/tutorial-guidance/${engine.name()}-${size.width}.png`});
  }
 }));
 test(`${engine.name()} mobile tutorial highlights required hand cards and destination`,()=>game(engine,async(page,hud)=>{
  await page.evaluate(()=>exercise('academy-2','academy-pilot-choice'));
  const card=hud.locator('.hand-tray .cards .card[data-card-id="tut-p0-pilot"]');
  await card.waitFor();
  assert.equal(await card.evaluate(el=>el.classList.contains('tutorial-card-cue')),true);
  assert.equal(await hud.locator('.hand-tray .cards .card.tutorial-card-cue').count(),1);
  await hud.locator('[data-tab="mecha"]').tap();
  await page.waitForTimeout(250);
  assert.equal(await hud.locator('.phone-shell').evaluate(el=>el.classList.contains('board-open')),true);
  assert.equal(await hud.locator('[data-zone="pilot"]').evaluate(el=>el.classList.contains('tutorial-zone-cue')),true);
  assert.match(await hud.locator('[data-drawer-subtitle]').innerText(),/TutoBOT/i);
  assert.equal(await hud.locator('[data-zone="pilot"]').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'TutoBOT does not cover the drop target');
  await page.screenshot({path:`test-results/tutorial-guidance/${engine.name()}-pilot.png`});
 }));
}
