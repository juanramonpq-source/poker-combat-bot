// Isolated browser fixtures for tutorial state and input regression tests.
const {test}=require('node:test');
require('node:fs').mkdirSync('test-results/tutorial-audit-20260915',{recursive:true});
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const baseURL=process.env.POCOBOT_TEST_URL || 'http://localhost:8095';
async function withGame(engine,run){
  const browser=await engine.launch();
  try{
    const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);
    await page.waitForFunction(()=>window.__pocobotDev);
    await page.evaluate(()=>{
      __pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');
      window.prepareExercise=(lessonId,stepId)=>{
        resetTutorialSession();const lesson=academyGetLessonById(lessonId);lesson.prepare();
        tutorialSystem.enabled=true;tutorialSystem.mode='academy';tutorialSystem.lessonId=lessonId;tutorialSystem.script=lesson.script;
        tutorialBotState.greetingDone=true;tutorialSetStep(lesson.script.findIndex(s=>s.id===stepId));
        clearDefenseInteractionGuard();
      };
      window.gameFingerprint=()=>JSON.stringify({players:state.players,deck:state.deck,discard:state.discard,selected:state.selected,turn:state.turnCount,current:state.currentPlayer,pending:state.pendingDefense});
    });
    try{await run(page);assert.deepEqual(errors,[]);}catch(error){await page.screenshot({path:`test-results/tutorial-audit-20260915/failure-${engine.name()}.png`});throw error;}
  }finally{await browser.close();}
}
for(const engine of [chromium,webkit]){
  test(`${engine.name()} full step help is readable and does not change the exercise`,()=>withGame(engine,async page=>{
    await page.evaluate(()=>prepareExercise('academy-3','academy-fuel-attack'));
    const hud=page.frameLocator('#mobileSpriteBridgeFrame');
    for(const viewport of [{width:393,height:790},{width:768,height:1024},{width:844,height:390}]){
      await page.setViewportSize(viewport);
      await page.evaluate(w=>__pocobotDev.setViewportMode(w>800?'mobile-horizontal':'mobile-vertical'),viewport.width);
      const before=await page.evaluate(()=>gameFingerprint());
      if(await hud.locator('[data-menu-toggle]').isVisible()) await hud.locator('[data-menu-toggle]').tap();
      await hud.locator('.top-menu [data-reference="help"]').tap();
      assert.match(await hud.locator('[data-lesson-objective]').textContent(),/./);
      assert.match(await hud.locator('[data-lesson-body]').textContent(),/./);
      const geometry=await hud.locator('[data-reference-dialog]').evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('[data-reference-body]');return {fits:r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1,font:parseFloat(getComputedStyle(b).fontSize)};});
      assert.ok(geometry.fits);assert.ok(geometry.font>=16);
      await page.screenshot({path:`test-results/tutorial-audit-20260915/${engine.name()}-read-step-${viewport.width}.png`});
      await hud.locator('[data-reference-close]').tap();
      assert.equal(await page.evaluate(()=>gameFingerprint()),before);
    }
  }));
  test(`${engine.name()} scripted instructor does not wait for unavailable defense AI`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-3','academy-fuel-attack');state.currentPlayer=0;state.players[1].hand.push(devMakeCard('3','diamonds'));beginDefenseWindow(11);return {pending:state.pendingDefense,locked:state.transitionLock};});
    assert.deepEqual(result,{pending:null,locked:true});
  }));
  test(`${engine.name()} stale tutorial navigation cannot skip an exercise`,()=>withGame(engine,async page=>{
    assert.equal(await page.evaluate(()=>{prepareExercise('academy-3','academy-attack-open');handleMobileSpriteTutorialAction('step:academy-fuel-attack');return tutorialGetCurrentStep().id;}),'academy-attack-open');
  }));
  test(`${engine.name()} required pilot cannot be drafted into copilot`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-2','academy-pilot-choice');const id=TUTORIAL_CARD_IDS.p0Pilot,before=gameFingerprint();const zones=getMobileSpriteDraftLegalZones(id);const accepted=setMobileSpriteDraftPlacement(id,'copilot');return {zones,accepted,unchanged:before===gameFingerprint()};});
    assert.deepEqual(result,{zones:['pilot'],accepted:false,unchanged:true});
  }));
  test(`${engine.name()} partial assembly cannot consume required cards`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{resetTutorialSession();tutorialPreparePracticeScenario();tutorialSystem.enabled=true;tutorialSystem.script=TUTORIAL_SCRIPT;tutorialBotState.greetingDone=true;
      const p=state.players[0];p.core.pilot=removeById(p.hand,TUTORIAL_CARD_IDS.p0Pilot);tutorialGoToStep('attack-build');
      const before=gameFingerprint();setMobileSpriteDraftPlacement(TUTORIAL_CARD_IDS.p0AttackA,'attack');const accepted=commitMobileSpriteDraftPlacements();return {accepted,unchanged:before===gameFingerprint()};});
    assert.deepEqual(result,{accepted:false,unchanged:true});
  }));
  test(`${engine.name()} read and selection steps reject unrelated actions`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-6','academy-diamond-draw-select');const before=gameFingerprint();handleMobileSpriteAction('figures');return {unchanged:before===gameFingerprint(),enabled:getMobileSpriteActionStates(0).figures};});
    assert.deepEqual(result,{unchanged:true,enabled:false});
  }));
  test(`${engine.name()} mandatory defense cannot be skipped`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-4','academy-active-defense');const before=gameFingerprint();handleMobileSpriteAction('skip-defense');return {unchanged:before===gameFingerprint(),enabled:getMobileSpriteActionStates(0)['skip-defense']};});
    assert.deepEqual(result,{unchanged:true,enabled:false});
    const hud=page.frameLocator('#mobileSpriteBridgeFrame');
    await page.waitForFunction(()=>document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelector('[data-defense-popup] [data-defense-action="skip"]')?.disabled);
    assert.equal(await hud.locator('[data-defense-popup] [data-defense-action="skip"]').isDisabled(),true);
  }));
  test(`${engine.name()} repeating is blocked while an impact is resolving`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-3','academy-fuel-attack');state.transitionLock=true;const before=gameFingerprint();const offered=canRepeatCurrentTutorialStep();repeatCurrentTutorialStep();return {offered,locked:state.transitionLock,unchanged:before===gameFingerprint()};});
    assert.deepEqual(result,{offered:false,locked:true,unchanged:true});
  }));
  test(`${engine.name()} cancelling an attack returns to its opening instruction`,()=>withGame(engine,async page=>{
    const result=await page.evaluate(()=>{prepareExercise('academy-3','academy-attack-spades');state.attackMode=true;render();document.getElementById('cancelAttackBtn').click();return {step:tutorialGetCurrentStep().id,attack:state.attackMode,allowed:tutorialAllowsButton('attackModeBtn')};});
    assert.deepEqual(result,{step:'academy-attack-open',attack:false,allowed:true});
  }));
  test(`${engine.name()} late montage callback advances only once`,()=>withGame(engine,async page=>{
    await page.evaluate(()=>{resetTutorialSession();window.advanceCalls=0;advanceTurn=()=>window.advanceCalls++;triggerModifyFeedbackSequence=(_idx,callback)=>{window.lateModify=callback;};finishModifyTurn();});
    await page.waitForFunction(()=>window.advanceCalls===1,{},{timeout:5000});
    await page.evaluate(()=>window.lateModify());
    assert.equal(await page.evaluate(()=>window.advanceCalls),1);
  }));
  test(`${engine.name()} reset invalidates delayed attack callbacks`,()=>withGame(engine,async page=>{
    await page.evaluate(()=>{window.attackCallbacks=0;showAttackSpecialPopup=()=>false;runHeaderAttackSequence(0,false,()=>window.attackCallbacks++);resetTutorialSession();state.transitionLock=false;});
    await page.waitForTimeout(4500);
    assert.equal(await page.evaluate(()=>window.attackCallbacks),0);
  }));
}
