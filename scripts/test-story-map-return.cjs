const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const base = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';

for (const engine of [chromium, webkit]) {
  test(`${engine.name()}: standalone mission results return to a usable map without reloading`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/MODO_HISTORIA_BOCETO.html`, { waitUntil: 'domcontentloaded' });
      for (const result of [
        { mission: 'hangar_race', nodeId: 'hangar', success: true },
        { mission: 'patio_duel', nodeId: 'patio', success: false },
        { mission: 'patio_duel', nodeId: 'patio', success: true }
      ]) {
        // The combat page stores this result before navigating back to the story shell.
        await page.evaluate(result => {
          localStorage.setItem('pocobot_story_pending_mission_result_v1', JSON.stringify(result));
          sessionStorage.setItem('pocobot_story_workspace_active', '1');
        }, result);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('#storySceneStage.active'));
        await page.waitForFunction(() => !storyTransitionBusy);
        // Read through the real outcome conversation using its normal button.
        if (result.success) {
          const lines = await page.evaluate(() => storySceneScripts[getActiveSceneScriptKey()].lines.length);
          for (let line = 0; line < lines; line++) await page.locator('#storySceneNextBtn').click();
        } else {
          // A defeat's final button retries combat; use its map exit instead.
          await page.locator('#storySceneCloseBtn').click();
        }
        await page.waitForFunction(() => document.querySelector('#storySceneStage').hidden);
        assert.equal(await page.evaluate(() => document.querySelector('#storyMapFrame').getAttribute('src') !== 'about:blank'), true,
          'Returning from the outcome must reactivate the interactive map');
        await page.waitForFunction(() => document.querySelector('#storyMapLoader').classList.contains('is-hidden'));
        const map = page.frameLocator('#storyMapFrame');
        await map.locator('.node').first().waitFor();
        assert.equal(await page.evaluate(id => hasCompletedStoryNode(id), result.nodeId), result.success);
      }
      assert.deepEqual(await page.evaluate(() => getCompletedStoryNodeIds()), ['hangar', 'patio']);
      // The newly unlocked destination must really open, and its map return must also work.
      const destination = page.frameLocator('#storyMapFrame').locator('[data-id="mercado"]');
      // The current destination pulses continuously; click its visible center without waiting for animation stability.
      assert.equal(await destination.evaluate(button => {
        const rect = button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), true);
      const bounds = await destination.boundingBox();
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.waitForFunction(() => activeSceneNodeId === 'mercado' || activeExplorationNodeId === 'mercado');
      await page.evaluate(() => {
        closeStoryScene();
        closeStoryMarketExploration({ immediate: true });
      });
      await page.waitForFunction(() => !storyMapFrameParked && storyMapHasReportedReady);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
