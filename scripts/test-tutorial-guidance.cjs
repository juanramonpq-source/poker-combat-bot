const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
fs.mkdirSync('test-results/tutorial-guidance',{recursive:true});
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
async function game(engine,run,slowFrames=false){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  if(slowFrames)await page.route('**/tutorial-robot-talk-*.png*',async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
  page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');
   window.exercise=(lessonId,stepId)=>{resetTutorialSession();const lesson=academyGetLessonById(lessonId);lesson.prepare();tutorialSystem.enabled=true;tutorialSystem.mode='academy';tutorialSystem.lessonId=lessonId;tutorialSystem.script=lesson.script;tutorialBotState.greetingDone=true;tutorialGoToStep(stepId);clearDefenseInteractionGuard();};
  });
  await run(page,page.frameLocator('#mobileSpriteBridgeFrame'));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
for(const engine of [chromium,webkit]){
 test(`${engine.name()} TutoBOT hides when dragging begins and stays hidden until release`,()=>game(engine,async(page,hud)=>{
  await page.evaluate(()=>{startTutorialMode();tutorialGoToStep('intro-attack-stat');});
  await page.waitForTimeout(6000);
  const result=await hud.locator('[data-hand-cards] .card').first().evaluate(async card=>{
   const r=card.getBoundingClientRect();
   const send=(type,x,y)=>card.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:7,pointerType:'touch',clientX:x,clientY:y}));
   send('pointerdown',r.x+15,r.y+15);
   send('pointermove',r.x+15,r.y-10);
   const box=document.querySelector('[data-tutorial-message]');
   const hidden=!box.classList.contains('show');
   await new Promise(resolve=>setTimeout(resolve,2600));
   const stillHidden=!box.classList.contains('show');
   send('pointercancel',r.x+15,r.y-10);
   return {hidden,stillHidden};
  });
  assert.deepEqual(result,{hidden:true,stillHidden:true});
 }));
 test(`${engine.name()} compact animated TutoBOT offers Ampliar without repeat controls`,()=>game(engine,async(page,hud)=>{
  await page.evaluate(()=>{startTutorialMode();tutorialGoToStep('intro-attack-stat');});
  const box=hud.locator('[data-tutorial-message]');
  await box.locator('[data-reference="help"]').waitFor();
  assert.equal(await box.locator('[data-reference="help"]').innerText(),'Ampliar');
  assert.equal(await hud.getByRole('button',{name:'Repetir este paso',exact:true}).count(),0);
  const layout=await box.evaluate(el=>{
   const avatar=el.querySelector('.tutorial-bot-avatar'),img=avatar.querySelector('img'),body=el.querySelector('[data-tutorial-text]');
   return {imageWidth:img.getBoundingClientRect().width,headerHeight:avatar.getBoundingClientRect().height,bodyGap:body.getBoundingClientRect().top-avatar.getBoundingClientRect().bottom};
  });
  assert.ok(layout.imageWidth>=72,JSON.stringify(layout));
  assert.ok(layout.headerHeight<=72,JSON.stringify(layout));
  assert.ok(layout.bodyGap<=12,JSON.stringify(layout));
  await page.waitForFunction(()=>document.getElementById('mobileSpriteBridgeFrame').contentWindow.eval('tutorialBotReadyTalkFrames.size')>=3);
  const frames=await box.locator('img').evaluate(async img=>{
   const seen=new Set();
   for(let i=0;i<12;i++){if(img.complete&&img.naturalWidth)seen.add(img.currentSrc);await new Promise(r=>setTimeout(r,110));}
   return seen.size;
  });
  assert.ok(frames>=3,'The visible robot cycles through loaded talking frames');
  await box.locator('[data-reference="help"]').tap();
  assert.equal(await hud.locator('[data-reference-dialog]').evaluate(el=>el.open),true);
  assert.equal(await hud.getByRole('button',{name:'Repetir este paso',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>tutorialGetCurrentStep().id),'intro-attack-stat');
  await hud.locator('[data-reference-close]').tap();
  await page.screenshot({path:`test-results/tutorial-guidance/${engine.name()}-compact-tutobot.png`});
  await page.evaluate(()=>exercise('academy-2','academy-pilot-choice'));
  assert.equal(await page.evaluate(()=>getResolvedTutorialPanelActions(tutorialGetCurrentStep()).some(a=>a.id==='repeat-step')),false);
 },true));
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
