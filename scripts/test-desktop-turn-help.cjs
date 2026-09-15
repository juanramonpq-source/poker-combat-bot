const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const base=process.env.POCOBOT_TEST_URL||'http://localhost:8095';
for(const engine of [chromium,webkit]) test(`${engine.name()} desktop turn help guides without playing`,async()=>{
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/poker_combat_bot_ONLINE.html`);await page.waitForFunction(()=>window.__pocobotDev);
  await page.evaluate(()=>{__pocobotDev.boot();__pocobotDev.setSoundEnabled(false);__pocobotDev.setViewportMode('expanded');state.tutorial=false;state.transitionLock=false;state.players[0].flags.figureBurstPromptShown=true;state.players[0].hand=[devMakeCard('J','spades'),devMakeCard('Q','hearts'),devMakeCard('4','diamonds')];render();});
  const snapshot=()=>page.evaluate(()=>JSON.stringify({players:state.players,turn:state.turnCount,selected:state.selected}));
  const before=await snapshot();
  await page.locator('#desktopTurnHelpBtn').click();
  const dialog=page.locator('#desktopTurnHelpDialog');
  assert.match(await dialog.locator('h2').innerText(),/Qué puedo hacer en este turno/);
  assert.equal(await dialog.locator('[data-topic="blocked"]').evaluate(el=>el.open),false);
  const expected=await page.evaluate(()=>getDesktopTurnHelpPayload().options.filter(o=>o.available).map(o=>o.id));
  assert.deepEqual(await dialog.locator('[data-pc-help-available] > details').evaluateAll(els=>els.map(e=>e.dataset.topic)),expected);
  assert.equal(await dialog.locator('[data-topic="log"]').count(),0);
  await dialog.locator('[data-topic="figures"] summary').click();
  await dialog.locator('[data-pc-help-guide="figures"]').click();
  assert.equal(await dialog.evaluate(el=>el.open),false);
  assert.equal(await page.locator('[data-quick-figure="0"]').evaluate(el=>el.classList.contains('desktop-help-target')),true);
  assert.equal(await snapshot(),before);
  // Current selections update the next step while the disclosure stays open.
  await page.locator('#desktopTurnHelpBtn').click();
  await dialog.locator('[data-topic="draw"] summary').click();
  await page.evaluate(()=>{state.selected=[{...state.players[0].hand[2],zone:'hand',playerIdx:0}];render();});
  assert.equal(await dialog.locator('[data-topic="draw"]').evaluate(el=>el.open),true);
  await dialog.locator('[data-pc-help-guide="draw"]').click();
  assert.equal(await page.locator('#actionDrawDiamondBtn').evaluate(el=>el.classList.contains('desktop-help-target')),true);
  // Defense uses the defender's hand and does not execute the response.
  await page.evaluate(()=>{state.selected=[];state.pendingDefense={defenderIndex:0,attackerIndex:1,totalAttack:8};render();});
  await page.locator('#desktopTurnHelpBtn').click();
  assert.deepEqual(await dialog.locator('[data-pc-help-available] > details').evaluateAll(els=>els.map(e=>e.dataset.topic)),['defend','skip-defense']);
  await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(el=>el.open),false);
  // PC fires a selected projectile directly, rather than entering the mobile picker.
  await page.evaluate(()=>{state.pendingDefense=null;state.projectileUnlocked=true;state.players[0].attack=['8','9','10'].map(rank=>devMakeCard(rank,'spades'));state.selected=[];render();});
  await page.locator('#desktopTurnHelpBtn').click();
  await dialog.locator('[data-topic="projectile"] summary').click();
  await dialog.locator('[data-pc-help-guide="projectile"]').click();
  assert.equal(await page.locator('#module-box-attack-0').evaluate(el=>el.classList.contains('desktop-help-target')),true);
  await page.evaluate(()=>{state.selected=[{...state.players[0].attack[0],zone:'attack',playerIdx:0}];render();});
  await page.locator('#desktopTurnHelpBtn').click();
  await dialog.locator('[data-pc-help-guide="projectile"]').click();
  assert.equal(await page.locator('#projectileOnlyBtn').evaluate(el=>el.classList.contains('desktop-help-target')),true);
  await page.locator('#desktopTurnHelpBtn').click();
  await page.evaluate(()=>{state.transitionLock=true;render();});
  assert.equal(await dialog.locator('[data-pc-help-available] > details').count(),0);
  await dialog.locator('[data-topic="blocked"] > summary').click();
  assert.match(await dialog.locator('[data-topic="attack"]').textContent(),/Espera a que termine/);
  await page.keyboard.press('Escape');
  // Compact desktop has its own visible entry point and real button targets.
  await page.evaluate(()=>{state.transitionLock=false;state.pendingDefense=null;state.selected=[];devHudModeOverride='auto';desktopHudMode='compact';mobileSpriteHudEnabled=false;render();});
  await page.locator('[data-desktop-turn-help]').click();
  await dialog.locator('[data-topic="figures"] summary').click();
  await dialog.locator('[data-pc-help-guide="figures"]').click();
  assert.equal(await page.locator('#compactFigureBurstBtn').evaluate(el=>el.classList.contains('desktop-help-target')),true);
  await page.locator('[data-desktop-turn-help]').click();
  await page.screenshot({path:`test-results/${engine.name()}-desktop-turn-help.png`});
  assert.equal(await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
