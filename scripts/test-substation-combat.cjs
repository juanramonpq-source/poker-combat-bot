const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const base = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';

for (const engine of [chromium, webkit]) {
  for (const viewport of [{width:1920,height:1080},{width:2816,height:1744},{width:1280,height:800}]) {
    test(`${engine.name()}: all three sentry phases fit their combat area at ${viewport.width}x${viewport.height}`, async () => {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/poker_combat_bot_ONLINE.html?story_mission=subestacion_ceniza_patrol&story_standalone=1&story_ui=compact`, {waitUntil:'domcontentloaded'});
        await page.waitForFunction(() => typeof state !== 'undefined' && state.players?.length === 2 && document.body.classList.contains('desktop-compact-mode'));
        for (const phase of [1,2,3]) {
          await page.evaluate(phase => {
            const enemy = state.players[1];
            enemy.fuel = phase >= 2 ? [{id:'phase-fuel',rank:'5',suit:'diamonds'}] : [];
            enemy.core = phase === 3 ? {
              pilot:{id:'phase-pilot',rank:'J',suit:'hearts'},
              copilot:{id:'phase-copilot',rank:'Q',suit:'hearts'},
              booster:{id:'phase-booster',rank:'K',suit:'hearts'}
            } : {pilot:null,copilot:null,booster:null};
            renderRadarMecha();
            renderDesktopCompactHud();
          }, phase);
          await page.locator('#compactMechaImg-1').evaluate(image => image.decode());
          const result = await page.evaluate(() => {
            const image = document.querySelector('#compactMechaImg-1');
            const bounds = image.getBoundingClientRect();
            const area = document.querySelector('#compactMechaStage-1').getBoundingClientRect();
            const ring = image.parentElement.getBoundingClientRect();
            return {image:bounds.toJSON(),area:area.toJSON(),ring:ring.toJSON()};
          });
          const {image, area, ring} = result;
          assert.ok(image.left >= area.left - 2 && image.right <= area.right + 2, `Phase ${phase} spills horizontally: ${JSON.stringify(result)}`);
          assert.ok(image.top >= ring.top - 2 && image.bottom <= ring.bottom + 2, `Phase ${phase} is cropped vertically: ${JSON.stringify(result)}`);
          assert.ok(image.width > 80 && image.height > 100, 'Sentry remains clearly visible');
        }
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
}

test('all three combat sprites have real transparent backgrounds', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/poker_combat_bot_ONLINE.html?story_mission=subestacion_ceniza_patrol&story_standalone=1&story_ui=compact`);
    const alphas = await page.evaluate(async () => {
      const values = [];
      for (const src of Object.values(STORY_SUBESTACION_MECHA_IMAGES)) {
        const image = new Image(); image.src = src; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
        const ctx=canvas.getContext('2d'); ctx.drawImage(image,0,0);
        values.push(ctx.getImageData(0,0,1,1).data[3]);
      }
      return values;
    });
    assert.deepEqual(alphas,[0,0,0]);
  } finally { await browser.close(); }
});
