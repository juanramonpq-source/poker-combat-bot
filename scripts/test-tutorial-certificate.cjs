// Reviewer fixture: verify real winner evaluation, retry, and certificate gating.
// NODE_PATH=<Playwright modules> node scripts/test-tutorial-certificate.cjs
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const engine = process.env.POCOBOT_BROWSER === 'webkit' ? webkit : chromium;
const baseURL = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';

(async () => {
  const browser = await engine.launch();
  try {
    for (const candidate of ['Cadete prueba', 'Instructor']) {
      const page = await browser.newPage();
      await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);
      await page.waitForFunction(() => !!window.__pocobotDev);
      const result = await page.evaluate(candidate => {
        __pocobotDev.boot();
        __pocobotDev.setSoundEnabled(false);
        for (const lesson of ACADEMY_LESSONS.slice(0, 10)) {
          academySystem.profile.completed[lesson.id] = true;
        }
        document.getElementById('academyCadetName').value = candidate;
        const answerChecks = () => {
          for (let i = 0; i < 3; i++) handleMobileSpriteTutorialAction('panel:0');
          clearSinglePlayerAiTimer();
        };
        const settleOutcome = loser => {
          state.players[loser].defense = [];
          state.players[1 - loser].defense = [devMakeCard('3', 'hearts')];
          state.transitionLock = false;
          state.pendingDefense = null;
          checkWinner();
          updateTutorialPhase();
          return {
            names: state.players.map(player => player.name),
            winner: state.winner,
            completed: academyIsLessonCompleted('academy-11'),
            license: academyHasPilotLicense(),
            step: tutorialGetCurrentStep().id
          };
        };
        startAcademyLesson('academy-11');
        answerChecks();
        const loss = settleOutcome(0);
        requestNewGame();
        const retry = { step: tutorialGetCurrentStep().id, winner: state.winner };
        answerChecks();
        const victory = settleOutcome(1);
        return { loss, retry, victory };
      }, candidate);
      console.log(candidate, JSON.stringify(result));
      assert.equal(result.loss.completed, false, 'Losing must not complete phase 11');
      assert.equal(result.loss.license, false, 'Losing must not grant a license');
      assert.equal(result.retry.step, 'academy-final-build-check');
      assert.equal(result.retry.winner, null, 'Retry clears the prior outcome');
      assert.equal(result.victory.completed, true, 'Winning completes phase 11');
      assert.equal(result.victory.license, true, 'Winning after phases 1–10 grants the license');
      await page.reload();
      await page.waitForFunction(()=>!!window.__pocobotDev);
      assert.equal(await page.evaluate(()=>academyHasPilotLicense()),true,'License survives reopening the game');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
