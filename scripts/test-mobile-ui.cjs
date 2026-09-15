// Requires Playwright and its Chromium/WebKit browsers; run against `npm start`.
// POCOBOT_TEST_URL=http://localhost:3000 node --test scripts/test-mobile-ui.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit } = require('playwright');
const baseURL = process.env.POCOBOT_TEST_URL || 'http://localhost:3000';
const hudURL = `${baseURL}/mobile-sprite-boceto/compacto-funcional.html`;

async function withPage(engine, viewport, run) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(hudURL);
    await page.locator('[data-hand-cards] .card').first().waitFor();
    await run(page);
    assert.deepEqual(errors, [], 'No JavaScript errors');
  } finally {
    await browser.close();
  }
}

for (const engine of [chromium, webkit]) {
  for (const viewport of [{ width: 393, height: 790 }, { width: 375, height: 667 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    test(`${engine.name()} fuel remains fully visible above the buttons at ${viewport.width}`, async () => {
      await withPage(engine, viewport, async page => {
        for (const count of [1, 4, 9]) {
          await page.evaluate(count => {
            state.players[0].fuel = createDeck().filter(isNumericDiamond).slice(0, count);
            while (state.players[0].hand.length < 18) drawCard(state.players[0], false);
            render();
            shell.classList.add('board-open');
          }, count);
          await page.waitForTimeout(250); // Measure after the drawer's 180ms opening transition.
          const issues = await page.evaluate(() => {
            const issues = [];
            const panel = document.querySelector('.zone-fuel');
            const footer = document.querySelector('.drawer-foot').getBoundingClientRect();
            for (const card of panel.querySelectorAll('.card')) {
              const r = card.getBoundingClientRect();
              if (r.bottom >= footer.top) issues.push('Fuel card extends behind footer');
              for (const x of [r.left + 4, r.right - 4]) for (const y of [r.top + 4, r.bottom - 4]) {
                if (!card.contains(document.elementFromPoint(x, y))) issues.push('Fuel card is clipped or covered');
              }
            }
            return issues;
          });
          assert.deepEqual(issues, [], `${count} fuel cards must be fully visible without scrolling`);
          const fuelBeforeScroll = await page.locator('.zone-fuel').boundingBox();
          await page.locator('[data-zone-grid]').evaluate(el => { el.scrollTop = el.scrollHeight; });
          const fuelAfterScroll = await page.locator('.zone-fuel').boundingBox();
          assert.deepEqual(fuelAfterScroll, fuelBeforeScroll, 'Scrolling modules must not move fuel');
        }
      });
    });
  }
  for (const viewport of [{ width: 393, height: 790 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
    test(`${engine.name()} portrait ${viewport.width}: full counters and footer with 18 cards and victory`, async () => {
      await withPage(engine, viewport, async page => {
        await page.evaluate(() => {
          while (state.players[0].hand.length < 18) drawCard(state.players[0], false);
          state.winner = state.players[0].name;
          render();
          shell.classList.add('board-open');
        });
        await page.locator('.board-drawer').waitFor({ state: 'visible' });
        await page.waitForTimeout(50); // Let the reduced-motion opening transition finish.
        const issues = await page.evaluate(() => {
          const problems = [];
          const drawer = document.querySelector('.board-drawer').getBoundingClientRect();
          const status = document.querySelector('.status-strip').getBoundingClientRect();
          const hand = document.querySelector('.hand-title-button').getBoundingClientRect();
          const footer = document.querySelector('.drawer-foot').getBoundingClientRect();
          if (drawer.top < status.bottom) problems.push('Drawer covers counters');
          if (footer.bottom > hand.top) problems.push('Hand overlaps footer');
          for (const el of document.querySelectorAll('.meter-pill, .drawer-foot button')) {
            const r = el.getBoundingClientRect();
            if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) problems.push('Control outside viewport');
            for (const x of [r.left + 3, r.right - 3]) for (const y of [r.top + 8, r.bottom - 8]) {
              if (!el.contains(document.elementFromPoint(x, y))) problems.push(`${el.textContent.trim()}: obscured`);
            }
          }
          return problems;
        });
        assert.deepEqual(issues, []);
      });
    });
  }

  for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }, { width: 1024, height: 768 }, { width: 1180, height: 820 }]) {
    test(`${engine.name()} landscape ${viewport.width}: touch controls stay in the HUD`, async () => {
      await withPage(engine, viewport, async page => {
        await page.locator('[data-hand-overview-toggle]').tap();
        assert.equal(page.url(), hudURL, 'Hand must not navigate to classic scroll');
        assert.equal(await page.locator('.phone-shell').evaluate(el => el.classList.contains('hand-overview-open')), true);
        // Programmatic and keyboard clicks have no pointer coordinates either.
        await page.locator('[data-hand-overview-toggle]').evaluate(el => el.click());
        assert.equal(page.url(), hudURL);
        assert.equal(await page.locator('.phone-shell').evaluate(el => el.classList.contains('hand-overview-open')), false);
        await page.waitForTimeout(450); // Expire the intentional duplicate touch-click guard.
        await page.locator('[data-tab="mecha"]').tap();
        assert.equal(page.url(), hudURL);
        assert.equal(await page.locator('.phone-shell').evaluate(el => el.classList.contains('board-open')), true);
        await page.locator('[data-board-close]').tap();
        await page.locator('[data-action-toggle]').tap();
        assert.equal(page.url(), hudURL);
        assert.equal(await page.locator('.phone-shell').evaluate(el => el.classList.contains('actions-open')), true);
      });
    });
  }

  test(`${engine.name()} integrated game: selection, Fuel x2, rotation and victory`, async () => {
    await withPage(engine, { width: 393, height: 790 }, async page => {
      await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);
      await page.waitForFunction(() => !!window.__pocobotDev);
      await page.evaluate(() => {
        window.__pocobotDev.boot();
        window.__pocobotDev.setSoundEnabled(false);
        window.__pocobotDev.setViewportMode('mobile-vertical');
        // Deterministic full-hand fixture in the real engine, delivered via its bridge.
        state.players[0].attack.push(devMakeCard('4', 'spades'));
        state.players[0].hand = createDeck().slice(0, 18);
        render();
      });
      const hud = page.frameLocator('#mobileSpriteBridgeFrame');
      await hud.locator('[data-hand-cards] .card').first().waitFor();
      for (const viewport of [{ width: 393, height: 790 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
        await page.setViewportSize(viewport);
        await hud.locator('[data-action-toggle]').tap();
        await hud.locator('[data-action="attack-mode"]').tap();
        await hud.locator('[data-zone="fuel"] .card').first().tap();
        await page.waitForFunction(() => state.selected.length === 1);
        await hud.locator('[data-selected-fuel-value]').filter({ hasText: '4×2=8' }).waitFor();
        await hud.locator('.drawer-foot [data-action="clear"]').tap();
        await page.waitForFunction(() => state.selected.length === 0);
        assert.equal(await page.evaluate(() => document.body.classList.contains('mobile-sprite-hud-active')), true);
        await hud.locator('[data-board-close]').tap();
        await hud.locator('[data-hand-overview-toggle]').tap();
        assert.equal(await hud.locator('.phone-shell').evaluate(el => el.classList.contains('hand-overview-open')), true);
        await hud.locator('[data-hand-overview-toggle]').tap();
        await page.evaluate(() => { state.attackMode = false; render(); });
      }
      await page.setViewportSize({ width: 393, height: 790 });
      await page.evaluate(() => {
        state.winner = state.players[0].name;
        state.phase = 'Final';
        triggerVictorySequence();
        render();
      });
      if (!await hud.locator('.phone-shell').evaluate(el => el.classList.contains('board-open'))) {
        await hud.locator('[data-tab="mecha"]').tap();
      }
      await page.waitForTimeout(250);
      const bounds = await hud.locator('.phone-shell').evaluate(el => {
        const rect = selector => el.querySelector(selector).getBoundingClientRect();
        return {
          countersVisible: rect('.status-strip').bottom <= rect('.board-drawer').top,
          footerVisible: rect('.drawer-foot').bottom < rect('.hand-title-button').top,
          handCount: el.querySelector('[data-hand-count]').textContent
        };
      });
      assert.deepEqual(bounds, { countersVisible: true, footerVisible: true, handCount: '18/18' });
      const caption = await page.locator('.mobile-pro-fx-caption').boundingBox();
      const footer = await hud.locator('.drawer-foot').boundingBox();
      assert.ok(caption.y + caption.height <= footer.y, 'Victory caption must not obscure the footer');
      const fuelPanel = await hud.locator('.zone-fuel').boundingBox();
      assert.ok(caption.y + caption.height <= fuelPanel.y, 'Victory caption must also clear the fuel panel');
      for (const [width, height, count] of [[375, 667, 9], [393, 790, 4]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(count => {
          state.players[0].fuel = Array.from({ length: count }, (_, index) => devMakeCard(String(index + 2), 'diamonds'));
          render();
        }, count);
        await page.waitForFunction(count => document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelectorAll('.zone-fuel .card').length === count, count);
        await page.waitForTimeout(250);
        const fuel = await hud.locator('.zone-fuel').boundingBox();
        const caption = await page.locator('.mobile-pro-fx-caption').boundingBox();
        const trophy = await page.locator('.mobile-pro-fx-trophy').boundingBox();
        assert.ok(caption.y + caption.height <= fuel.y, 'Victory text must clear wrapped fuel cards');
        assert.ok(trophy.y + trophy.height <= fuel.y, 'Trophy must clear wrapped fuel cards');
      }
      fs.mkdirSync('test-results/mobile-ui-20260915', { recursive: true });
      await page.screenshot({ path: `test-results/mobile-ui-20260915/${engine.name()}-victory-portrait.png` });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(250);
      await page.screenshot({ path: `test-results/mobile-ui-20260915/${engine.name()}-victory-landscape.png` });
    });
  });
}
