// Run against npm start with Playwright installed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const base = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';

for (const engine of [chromium, webkit]) {
  test(`${engine.name()} attack selections preserve the actions menu in normal play and tutorials`, async () => {
    const browser = await engine.launch();
    try {
      for (const guided of [false, true]) {
        for (const viewport of [{ width: 393, height: 790 }, { width: 844, height: 390 }]) {
          const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true });
          await page.goto(`${base}/poker_combat_bot_ONLINE.html`);
          await page.waitForFunction(() => window.__pocobotDev);
          await page.evaluate(guided => {
            __pocobotDev.boot();
            __pocobotDev.setSoundEnabled(false);
            __pocobotDev.setViewportMode('mobile-vertical');
            __pocobotDev.loadTutorialPreset('first-attack');
            if (!guided) { tutorialSystem.enabled = false; state.tutorial = false; }
            render();
          }, guided);
          const hud = page.frameLocator('#mobileSpriteBridgeFrame');
          await hud.locator('[data-action-toggle]').tap();
          for (const zone of guided ? ['fuel', 'attack', 'attack'] : ['fuel', 'attack']) {
            await hud.locator(`[data-zone="${zone}"] .card:not(:disabled):not(.is-selected)`).first().tap();
            assert.equal(await hud.locator('[data-action-toggle]').getAttribute('aria-expanded'), 'true');
            assert.equal(await hud.locator('.phone-shell').evaluate(el => el.classList.contains('actions-open')), true);
          }
          assert.ok(await page.evaluate(() => state.selected.length) >= 2);
          await hud.locator('[data-action="confirm"]').waitFor({ state: 'visible' });
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
}
