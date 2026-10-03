const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const base = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';
const scenes = [
  ['market', 'mercado-reles-muertos-tutorial'],
  ['camp', 'campamento-placas-rojas-exploracion'],
  ['lake', 'campamento-placas-rojas-exploracion', '&story_camp_scene=lake']
];

for (const engine of [chromium, webkit]) {
  for (const [name, path, params = ''] of scenes) {
    test(`${engine.name()} ${name}: desktop camera covers the viewport on resize and at map edges`, async () => {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/assets/Historia/${path}/index.html?story_embed=1&story_audio=external${params}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof getCameraZoom === 'function');
        // Includes the reported display, wide monitors, and returning to a smaller window.
        for (const size of [
          { width: 1920, height: 1080 },
          { width: 2816, height: 1744 },
          { width: 3440, height: 1440 },
          { width: 1280, height: 1024 },
          { width: 960, height: 540 }
        ]) {
          await page.setViewportSize(size);
          await page.waitForFunction(size => viewport.width === size.width && viewport.height === size.height, size);
          const samples = await page.evaluate(() => {
            const original = { x: player.x, y: player.y, vx: player.vx, vy: player.vy };
            const points = [[world.width / 2, world.height / 2], [0, 0], [world.width, 0], [0, world.height], [world.width, world.height]];
            const samples = points.map(([x, y]) => {
              Object.assign(player, { x, y, vx: 0, vy: 0 });
              snapCameraToPlayer();
              const visible = getVisibleWorldSize();
              return { x: camera.x, y: camera.y, right: camera.x + visible.width, bottom: camera.y + visible.height,
                worldWidth: world.width, worldHeight: world.height,
                playerX: (player.x - camera.x) * getCameraZoom(), playerY: (player.y - camera.y) * getCameraZoom() };
            });
            Object.assign(player, original);
            snapCameraToPlayer();
            return samples;
          });
          for (const sample of samples) {
            assert.ok(sample.x >= -0.01 && sample.y >= -0.01 && sample.right <= sample.worldWidth + 0.01 && sample.bottom <= sample.worldHeight + 0.01,
              `Camera must not reveal empty space: ${JSON.stringify({ size, sample })}`);
          }
          assert.ok(Math.abs(samples[0].playerX - size.width / 2) < 0.01 && Math.abs(samples[0].playerY - size.height / 2) < 0.01,
            'Camera centers on the player away from map edges');
        }
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    });
  }
}
