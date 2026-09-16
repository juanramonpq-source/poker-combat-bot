// Exercises the real mobile bridge, keeping engine timers and lesson progression intact.
const {chromium,webkit}=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');
fs.mkdirSync('test-results/tutorial-audit-20260915',{recursive:true});
const engine=process.env.POCOBOT_BROWSER==='webkit'?webkit:chromium;
const baseURL=process.env.POCOBOT_TEST_URL || 'http://localhost:8095';
const routes=process.argv.slice(2);if(!routes.length)routes.push('guided',...Array.from({length:11},(_,i)=>`academy-${i+1}`));
(async()=>{
 const browser=await engine.launch();const page=await browser.newPage({viewport:{width:393,height:790},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const errors=[],records=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.setDefaultNavigationTimeout(30000);
 try{
 await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
 await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('mobile-vertical');});
 if(process.env.POCOBOT_REPEAT_STEPS==='1') await page.evaluate(()=>{window.repeatTutorialSteps=true;window.repeatedTutorialSteps=new Set();});
 for(const route of routes){
  await page.evaluate(route=>{if(route==='guided')startTutorialMode();else {if(!academyIsLessonUnlocked(route))throw Error('Lesson remains locked: '+route);startAcademyLesson(route);}},route);
  let lastStep='',lastProgress=Date.now(),routeReached=false;
  for(let tick=0;tick<1200;tick++){
   const r=await page.evaluate(()=>{
    const step=tutorialGetCurrentStep();if(!step)return {error:'No active step'};
    const info={step:step.id,turn:state.turnCount,player:state.currentPlayer,lock:state.transitionLock,busy:tutorialSystem.busy,selected:state.selected.map(c=>c.id),pending:state.pendingDefense,validation:tutorialSystem.validation,winner:state.winner};
    if(tutorialSystem.completed)return {...info,done:true};
    if(step.id==='academy-short-fight')return {...info,freeCombat:true};
    if(tutorialBotBlocksInput()){handleMobileSpriteTutorialAction('tutobot-continue');return {...info,did:'continue narration'};}
    if(tutorialSystem.busy || (state.transitionLock && !state.pendingDefense) || state.pendingDefense?.defenderIndex===1)return info;
    const repeatKey=`${tutorialSystem.lessonId || tutorialSystem.mode}:${step.id}`;
    if(window.repeatTutorialSteps && canRepeatCurrentTutorialStep() && !window.repeatedTutorialSteps.has(repeatKey)){
      window.repeatedTutorialSteps.add(repeatKey);
      const checkpoint=tutorialSystem.stepCheckpoint;
      handleMobileSpriteTutorialAction('repeat-step');
      // Rendering recalculates vitalMax; compare the restored gameplay state.
      const gameplayPlayers=players=>JSON.stringify(players,(key,value)=>key==='vitalMax'?undefined:value);
      if(tutorialGetCurrentStep().id!==step.id || gameplayPlayers(state.players)!==gameplayPlayers(checkpoint.state.players)) return {...info,error:'Repeat did not restore the exercise'};
      return {...info,did:'repeat step'};
    }
    const panels=(step.panelActions || []);
    if(panels.length){handleMobileSpriteTutorialAction('panel:0');return {...info,did:'read / answer'};}
    const expected=tutorialExpectedSelection(step.id) || [];
    const missing=expected.find(id=>!state.selected.some(c=>c.id===id));
    if(missing){handleMobileSpriteBridge('select',{cardId:missing});return {...info,did:'select '+missing};}
    const action=tutorialExpectedAction(step.id);
    const mapping={modify:'modify',attackMode:'attack-mode',confirmAttack:'confirm',confirmDefense:'defend',drawWithDiamond:'draw',quickFigureDraw:'figures',passTurn:'pass',projectileOnly:'projectile-only',toggleProjectile:'projectile'};
    if(mapping[action]){handleMobileSpriteBridge('action',{action:mapping[action]});return {...info,did:action};}
    if(step.id==='projectile-open'){
      handleMobileSpriteBridge('action',{action:state.attackMode?'projectile':'attack-mode'});return {...info,did:'open combo'};
    }
    return {...info,error:'No instructed action',expected,buttons:step.allowedButtons,objective:step.objective};
   });
   if(r.step!==lastStep){lastStep=r.step;lastProgress=Date.now();records.push({route,...r});console.log(route,r.step);}
   if(r.error)throw Error(JSON.stringify(r));
   if(r.done || r.freeCombat){routeReached=true;console.log('REACHED',route,r.done?'completed':'free combat');break;}
   if(Date.now()-lastProgress>25000){await page.screenshot({path:`test-results/tutorial-audit-20260915/stuck-${route}.png`});throw Error('STUCK '+JSON.stringify(r));}
   await page.waitForTimeout(350);
  }
  assert.ok(routeReached,`Route did not finish: ${route}`);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`test-results/tutorial-audit-20260915/walkthrough-${engine.name()}.json`,JSON.stringify(records,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
