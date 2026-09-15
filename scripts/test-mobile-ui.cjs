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
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(30000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(hudURL);
    await page.locator('[data-hand-cards] .card').first().waitFor();
    try {
      await run(page);
      assert.deepEqual(errors, [], 'No JavaScript errors');
    } catch(error) {
      await page.screenshot({path:`test-results/mobile-ui-20260915/failure-${engine.name()}.png`});
      throw error;
    }
  } finally {
    await browser.close();
  }
}

for (const engine of [chromium, webkit]) {
  test(`${engine.name()} schematic help offers actions and guides without playing`, async () => {
    await withPage(engine, {width:393,height:790}, async page => {
      await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);
      await page.waitForFunction(() => window.__pocobotDev);
      await page.evaluate(() => {
        __pocobotDev.boot(); __pocobotDev.setSoundEnabled(false); __pocobotDev.setViewportMode('mobile-vertical');
        state.transitionLock=false; state.tutorial=false; state.turnCount=3;
        state.players[0].hand=[devMakeCard('4','diamonds'),devMakeCard('J','spades'),devMakeCard('Q','hearts')]; render();
      });
      const hud=page.frameLocator('#mobileSpriteBridgeFrame');
      await hud.locator('[data-menu-toggle]').tap();
      await hud.locator('.top-menu [data-reference="help"]').tap();
      assert.equal(await hud.locator('#reference-title').textContent(),'¿Qué puedo hacer en esta jugada?');
      assert.equal(await hud.locator('[data-help-topics] details[open]').count(),0);
      assert.deepEqual(await hud.locator('[data-help-option]').evaluateAll(els=>els.map(e=>e.dataset.helpOption)),await page.evaluate(()=>{const options=getInGameHelpPayload(0).options;return [...options.filter(o=>o.available),...options.filter(o=>!o.available)].map(o=>o.id);}));
      await page.screenshot({path:`test-results/schematic-help-20260915/${engine.name()}-options.png`});
      const draw=hud.locator('[data-help-option="draw"]');
      await draw.locator('summary').tap();
      assert.equal(await draw.locator('ol li').count(),3);
      await page.waitForTimeout(200);
      await page.screenshot({path:`test-results/schematic-help-20260915/${engine.name()}-draw.png`});
      const before=await page.evaluate(()=>JSON.stringify({players:state.players,selected:state.selected,turn:state.turnCount,deck:state.deck,discard:state.discard}));
      await draw.locator('[data-help-guide]').tap();
      assert.equal(await hud.locator('[data-reference-dialog]').evaluate(e=>e.open),false);
      assert.match(await hud.locator('[data-drawer-subtitle]').textContent(),/♦/);
      assert.ok(await hud.locator('.help-next-target').count()>0);
      assert.equal(await page.evaluate(()=>JSON.stringify({players:state.players,selected:state.selected,turn:state.turnCount,deck:state.deck,discard:state.discard})),before);
      await hud.locator('[data-hand-cards] .card').first().tap();
      await page.waitForFunction(()=>document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelector('[data-action="draw"].help-next-target'));
      await page.evaluate(()=>{ state.selected=[]; state.turnCount++; state.players[0].flags.lastOwnAction='diamondDraw'; render(); });
      await page.waitForFunction(()=>!document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelector('.help-next-target'));
      assert.match(await page.evaluate(()=>getInGameHelpPayload(0).options.find(o=>o.id==='draw').reason),/anterior/);
      await page.evaluate(()=>{state.players[0].hand=[]; render();});
      assert.equal(await page.evaluate(()=>getInGameHelpPayload(0).options.find(o=>o.id==='pass').available),true);
      await page.evaluate(()=>{state.players[0].hand=[devMakeCard('4','diamonds')]; state.transitionLock=true; state.pendingDefense={attackerIndex:1,defenderIndex:0,totalAttack:12}; render();});
      assert.deepEqual(await page.evaluate(()=>getInGameHelpPayload(0).options.map(o=>o.id)),['defend','skip-defense','log']);
      await hud.locator('[data-menu-toggle]').tap(); await hud.locator('.top-menu [data-reference="help"]').tap();
      await hud.locator('[data-help-option="defend"] summary').tap();
      assert.match(await hud.locator('[data-help-option="defend"]').textContent(),/12/);
      await page.screenshot({path:`test-results/schematic-help-20260915/${engine.name()}-defense.png`});
      await hud.locator('[data-help-option="defend"] [data-help-guide]').tap();
      const defenseButton=hud.locator('[data-defense-popup].show [data-defense-action="confirm"]');
      assert.ok(await defenseButton.evaluate(el=>el.classList.contains('help-next-target')));
      await defenseButton.tap();
      await hud.locator('.hand-overview .card').first().tap();
      await page.waitForFunction(()=>document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelector('[data-defense-popup].show [data-defense-action="confirm"].help-next-target'));
      assert.equal(await defenseButton.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true);

    });
  });

  for(const viewport of [{width:393,height:790}, {width:375,height:667}, {width:768,height:1024}]) {
    test(`${engine.name()} portrait card columns at ${viewport.width}`, async () => {
      await withPage(engine, viewport, async page => {
        for(const count of [0,1,2,3,4]) {
          await page.evaluate(count => {
            const deck=createDeck(), player=state.players[0];
            player.core={pilot:count?deck.find(c=>c.rank==='J'&&c.suit==='spades'):null,copilot:count?deck.find(c=>c.rank==='Q'&&c.suit==='hearts'):null,booster:count?deck.find(c=>c.rank==='A'&&c.suit==='clubs'):null};
            for(const [zone,suit] of [['attack','spades'],['defense','hearts'],['armor','clubs']]) player[zone]=deck.filter(c=>c.suit===suit && Number(c.rank)>=2).slice(0,count);
            render(); shell.classList.add('board-open');
          },count);
          await page.waitForTimeout(250);
          const problems=await page.evaluate(() => {
            const problems=[];
            for(const box of document.querySelectorAll('.core-slot, .zone-attack, .zone-defense, .zone-armor')) {
              const title=box.querySelector('.zone-title'), cards=box.querySelector('.zone-cards');
              const t=title.getBoundingClientRect(), c=cards.getBoundingClientRect();
              if(c.left < t.right-1) problems.push('Cards must sit to the right of the label');
              if(!box.classList.contains('core-slot')) {
                const label=title.querySelector('span').getBoundingClientRect(), counter=title.querySelector('b');
                const capacity=counter.getBoundingClientRect(), panel=box.getBoundingClientRect();
                if(capacity.top < label.bottom) problems.push('Capacity must sit below module name');
                if(capacity.bottom > panel.bottom-2 || !counter.contains(document.elementFromPoint(capacity.left+capacity.width/2,capacity.top+capacity.height/2))) problems.push('Capacity is clipped or obscured');
                if(!/^\d+\/\d+$/.test(counter.textContent)) problems.push('Capacity format must be current/max');
              }
              for(const card of cards.querySelectorAll('.card')) {
                const r=card.getBoundingClientRect();
                const minimumHeight = cards.querySelectorAll('.card').length <= 2 ? Math.min(c.height-1,32) : 22;
                if(r.height < minimumHeight) problems.push('Installed card is too small');
                if(r.left<c.left-1 || r.right>c.right+1 || r.top<c.top-1 || r.bottom>c.bottom+1) problems.push('Card spills outside its allocated area');
                if(!card.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))) problems.push('Card is not touchable');
              }
            }
            return problems;
          });
          assert.deepEqual(problems,[],`Installed cards per module: ${count}`);
        }
        await page.screenshot({path:`test-results/mobile-card-columns-20260915/${engine.name()}-${viewport.width}.png`});
      });
    });
  }
  for (const viewport of [{width:393,height:790}, {width:375,height:667}, {width:768,height:1024}, {width:820,height:1180}]) {
    test(`${engine.name()} all portrait panels visible at ${viewport.width}`, async () => {
      await withPage(engine, viewport, async page => {
        for (const [hand, fuel] of [[4,1], [10,4], [18,9]]) {
          await page.evaluate(({hand,fuel}) => {
            const deck=createDeck();
            const player=state.players[0];
            player.core={pilot:deck.find(c=>c.rank==='J'&&c.suit==='spades'),copilot:deck.find(c=>c.rank==='Q'&&c.suit==='hearts'),booster:deck.find(c=>c.rank==='A'&&c.suit==='clubs')};
            for(const [zone,suit] of [['attack','spades'],['defense','hearts'],['armor','clubs']]) player[zone]=deck.filter(c=>c.suit===suit && Number(c.rank)>=2 && Number(c.rank)<=10).slice(0,3);
            state.players[0].hand = createDeck().slice(0,hand);
            state.players[0].fuel = createDeck().filter(isNumericDiamond).slice(0,fuel);
            state.log = ['El rival sustituye combustible y prepara su siguiente ataque. Consulta el registro completo para leer todos los movimientos.'];
            render(); shell.classList.add('board-open');
          }, {hand,fuel});
          await page.waitForTimeout(250);
          const issues = await page.evaluate(() => {
            const issues=[];
            const grid=document.querySelector('[data-zone-grid]');
            if(grid.scrollTop !== 0) issues.push('Modules require scrolling');
            for(const selector of ['.core-panel','.zone-attack','.zone-defense','.zone-armor','.zone-reg','.zone-fuel']) {
              const el=document.querySelector(selector), r=el.getBoundingClientRect();
              const title=el.querySelector('.zone-title').getBoundingClientRect();
              if(title.bottom > r.bottom - 2) issues.push(selector+' title clipped');
              for(const y of [r.top+3,r.bottom-3]) {
                if(!el.contains(document.elementFromPoint(r.left+r.width/2,y))) issues.push(selector+' obscured');
              }
              for(const card of el.querySelectorAll('.card')) {
                const c=card.getBoundingClientRect();
                if(c.height < 22 || !card.contains(document.elementFromPoint(c.left+c.width/2,c.top+c.height/2))) issues.push(selector+' installed card unusable');
              }
            }
            const tray=document.querySelector('.hand-tray').getBoundingClientRect();
            const action=document.querySelector('[data-action-toggle]').getBoundingClientRect();
            if(action.left < tray.left+tray.width/2 || action.top < tray.top+tray.height*.6) issues.push('Actions must be bottom right');
            if(innerWidth < 600 && tray.height > 225) issues.push('Hand grew beyond its original height');
            return issues;
          });
          assert.deepEqual(issues, [], `hand=${hand}, fuel=${fuel}`);
        }
        await page.screenshot({path:`test-results/mobile-panels-20260915/${engine.name()}-${viewport.width}.png`});
      });
    });
  }
  test(`${engine.name()} live help follows the game and preserves the turn`, async () => {
    await withPage(engine, { width: 820, height: 1180 }, async page => {
      await page.goto(`${baseURL}/poker_combat_bot_ONLINE.html`);
      await page.waitForFunction(() => !!window.__pocobotDev);
      await page.evaluate(() => {
        window.__pocobotDev.boot();
        window.__pocobotDev.setSoundEnabled(false);
        window.__pocobotDev.setViewportMode('mobile-vertical');
        state.tutorial = true;
        state.transitionLock = false;
        state.players[0].hand = createDeck().slice(0, 18);
        // Keep the unrelated one-time figure-burst hint out of this help-reading fixture.
        state.players[0].flags.figureBurstPromptShown = true;
        render();
      });
      const hud = page.frameLocator('#mobileSpriteBridgeFrame');
      await hud.locator('[data-hand-cards] .card').first().waitFor();
      const help = await page.evaluate(() => getInGameHelpPayload(0));
      assert.match(help.title, /Qué puedo hacer/);
      assert.match(help.options.find(option=>option.id==='attack').reason, /Te falta:/);
      assert.doesNotMatch(JSON.stringify(help), /\[object Object\]|undefined/);
      await hud.locator('[data-menu-toggle]').tap();
      await hud.locator('.top-menu [data-reference="help"]').tap();
      await hud.locator('[data-reference-dialog]').waitFor({ state: 'visible' });
      const before = await page.evaluate(() => JSON.stringify({ players:state.players, selected:state.selected, turn:state.turnCount, deck:state.deck, discard:state.discard }));
      await hud.locator('[data-help-blocked] > summary').tap();
      await hud.locator('[data-help-option="attack"] summary').tap();
      assert.equal(await hud.locator('[data-help-option="attack"]').evaluate(el => el.open), true, 'First tap opens a help topic immediately');
      await hud.locator('[data-reference-close]').tap();
      assert.equal(await page.evaluate(() => JSON.stringify({ players:state.players, selected:state.selected, turn:state.turnCount, deck:state.deck, discard:state.discard })), before);
      await page.evaluate(() => {
        state.players[0].attack.push(devMakeCard('10', 'spades'));
        state.attackMode = true;
        state.selected = [{...state.players[0].fuel[0], zone:'fuel'}, {...state.players[0].attack.at(-1), zone:'attack'}];
        render();
      });
      await page.waitForFunction(() => document.getElementById('mobileSpriteBridgeFrame').contentDocument.querySelector('[data-tutorial-text]').textContent.includes('Superas el límite en 2'));
      await page.evaluate(() => {
        state.attackMode = false;
        state.selected = [];
        state.pendingDefense = { attackerIndex:1, defenderIndex:0, totalAttack:12 };
        render();
      });
      assert.match(await page.evaluate(() => getInGameHelpPayload(0).text), /Ataque entrante: 12/);
      await page.evaluate(() => { state.pendingDefense = null; state.tutorial = false; render(); });
      await hud.locator('[data-menu-toggle]').tap();
      await hud.locator('.top-menu [data-reference="help"]').tap();
      assert.match(await hud.locator('[data-help-now]').textContent(), /opción/);
      fs.mkdirSync('test-results/mobile-help-20260915', { recursive: true });
      await page.screenshot({ path:`test-results/mobile-help-20260915/${engine.name()}-help-tablet.png` });
      await hud.locator('[data-reference-close]').tap();
      if (!await hud.locator('.phone-shell').evaluate(el => el.classList.contains('board-open'))) await hud.locator('[data-tab="mecha"]').tap();
      await page.waitForTimeout(250);
      await page.screenshot({ path:`test-results/mobile-help-20260915/${engine.name()}-tablet-portrait.png` });
      await page.setViewportSize({ width:393, height:790 });
      await page.waitForTimeout(300);
      await page.screenshot({ path:`test-results/mobile-help-20260915/${engine.name()}-phone-portrait.png` });
    });
  });
  for (const viewport of [{ width: 393, height: 790 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }]) {
    test(`${engine.name()} portrait help layout ${viewport.width}: hand controls, tablet and readable register`, async () => {
      await withPage(engine, viewport, async page => {
        await page.evaluate(() => {
          while (state.players[0].hand.length < 18) drawCard(state.players[0], false);
          state.log = Array.from({ length: 20 }, (_, i) => `Evento ${i + 1}: el rival sustituye combustible y prepara su siguiente ataque. Texto completo del movimiento.`);
          render();
          document.querySelector('[data-figures-hand]').hidden = false;
          shell.classList.add('board-open');
        });
        await page.waitForTimeout(250);
        const bounds = await page.evaluate(() => {
          const rect = s => document.querySelector(s).getBoundingClientRect();
          return {
            fullWidth: rect('.phone-shell').width >= innerWidth - 2,
            fullHeight: rect('.phone-shell').height >= innerHeight - 2,
            figuresAbove: rect('.floating-figures-button').bottom < rect('.floating-modify-button').top,
            clearCards: [...document.querySelectorAll('[data-hand-cards] .card')].every(c => {
              const r=c.getBoundingClientRect(), b=rect('.floating-modify-button');
              return r.top >= b.bottom || r.right <= b.left || r.left >= b.right || r.bottom <= b.top;
            }),
            actionsBottomRight: rect('[data-action-toggle]').left > rect('.hand-tray').left + rect('.hand-tray').width / 2
          };
        });
        assert.deepEqual(bounds, { fullWidth: true, fullHeight: true, figuresAbove: true, clearCards: true, actionsBottomRight: true });
        await page.locator('.zone-reg [data-reference="log"]').tap();
        await page.locator('[data-reference-dialog]').waitFor({ state: 'visible' });
        const body = page.locator('[data-reference-body]');
        assert.match(await body.textContent(), /Evento 20/);
        await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
        assert.equal(await body.evaluate(el => el.scrollHeight - el.scrollTop <= el.clientHeight + 2), true);
        await page.locator('[data-reference-close]').tap();
        assert.equal(await page.locator('.phone-shell').evaluate(el => el.classList.contains('board-open')), true);
      });
    });
  }
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
