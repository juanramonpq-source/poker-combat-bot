const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');

const base = process.env.POCOBOT_TEST_URL || 'http://localhost:8095';
const storyUrl = `${base}/MODO_HISTORIA_BOCETO.html`;

async function explorationFrame(page) {
  await page.waitForFunction(() => {
    const frame = document.querySelector('#storyExplorationFrame');
    return frame && frame.src.includes('/subestacion-ceniza/');
  });
  const frame = await page.locator('#storyExplorationFrame').elementHandle().then(element => element.contentFrame());
  await frame.waitForFunction(() => typeof currentScene !== 'undefined' && !!currentScene);
  return frame;
}

async function fixture(engine, run) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(storyUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      workspacePanel.classList.add('active');
      titleStage.classList.add('hidden');
      openStorySubestacionExploration('hub', { loadId: 'substation-integration-test' });
    });
    const frame = await explorationFrame(page);
    // Exercise chapter progression separately from sentry detection and pursuit.
    await frame.evaluate(() => { state.combatGraceUntil = performance.now() + 3600000; });
    await run(page, frame);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

async function openChargeDialogue(page, frame) {
  await frame.evaluate(() => {
    loadScene('reactor');
    player.x = 772;
    player.y = 250;
    handleChargeInteraction(currentInteractions.find(interaction => interaction.chargeId === 'alpha'));
  });
  await page.waitForFunction(() => activeSceneScriptKey === 'subestacion_charge_alpha' && !storyTransitionBusy);
}

async function finishDialogue(page) {
  for (let step = 0; step < 12; step++) {
    if (await page.evaluate(() => !activeSceneNodeId)) return;
    if (await page.locator('#storySceneNextBtn').isDisabled()) {
      await page.locator('#storySceneChoices .scene-choice').first().click();
    }
    await page.locator('#storySceneNextBtn').click();
  }
  assert.fail('Dialogue did not finish');
}

async function walkToInteraction(frame, targetId) {
  const result = await frame.evaluate(targetId => {
    // Follow a searched route through the actual movement/collision function. The
    // combat/pursuit tests cover sentries separately; this checks chapter geography.
    cancelAnimationFrame(animationHandle);
    const target = currentInteractions.find(interaction => interaction.id === targetId);
    const step = 12, cols = Math.ceil(world.width / step), rows = Math.ceil(world.height / step);
    const point = id => ({ x: id % cols * step + 6, y: Math.floor(id / cols) * step + 6 });
    const clear = p => p.x >= 36 && p.y >= 36 && p.x <= world.width - 36 && p.y <= world.height - 36 && !isBlockedAt(p.x, p.y);
    const start = Math.floor(player.y / step) * cols + Math.floor(player.x / step);
    const previous = new Map([[start, null]]), queue = [start];
    let goal = null;
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index], p = point(id);
      if (Math.hypot(p.x - target.x, p.y - target.y) < target.radius * 0.75 && hasLineOfSight(p.x, p.y, target.x, target.y)) { goal = id; break; }
      for (const next of [id - 1, id + 1, id - cols, id + cols]) {
        if (next < 0 || next >= cols * rows || Math.abs(next % cols - id % cols) > 1 || previous.has(next) || !clear(point(next))) continue;
        previous.set(next, id);
        queue.push(next);
      }
    }
    if (goal === null) throw new Error(`No walking route to ${targetId}`);
    const route = [];
    for (let id = goal; id !== null; id = previous.get(id)) route.push(point(id));
    route.reverse();
    for (const p of route) {
      let attempts = 0;
      while (Math.hypot(player.x - p.x, player.y - p.y) > 2 && attempts++ < 180) {
        input.pointerActive = true;
        input.pointerX = p.x - player.x;
        input.pointerY = p.y - player.y;
        // Slow only near each navigation waypoint to avoid overshooting a corner.
        player.maxSpeed = Math.min(248, Math.hypot(input.pointerX, input.pointerY) * 10);
        movePlayer(1 / 60);
      }
      if (attempts >= 180) throw new Error(`Movement blocked on route to ${targetId} at ${player.x},${player.y}`);
      player.vx = player.vy = 0;
    }
    player.maxSpeed = 248;
    clearPointerActive();
    updateNearestInteractable();
    updatePrompt();
    return activeInteractable?.id;
  }, targetId);
  assert.equal(result, targetId, 'Walking to the objective must expose the intended interaction');
  await frame.locator('#interact-prompt').click();
  await frame.evaluate(() => {
    if (input.interactQueued) { input.interactQueued = false; handleInteract(); }
  });
}

for (const engine of [chromium, webkit]) {
  test(`${engine.name()}: walk all three branches, place charges, and extract to the map`, async () => {
    await fixture(engine, async (page, frame) => {
      await page.evaluate(() => {
        for (const node of Object.values(storyDraftNodes).filter(node => node.order < 7)) markStoryNodeCompleted(node.id);
      });
      for (const [room, charge] of [['reactor', 'alpha'], ['cruce', 'beta'], ['fundicion', 'gamma']]) {
        await walkToInteraction(frame, `hub-door-${room}`);
        assert.equal(await frame.evaluate(() => state.currentSceneKey), room);
        await walkToInteraction(frame, `charge-${charge}`);
        await page.waitForFunction(charge => activeSceneScriptKey === `subestacion_charge_${charge}` && !storyTransitionBusy, charge);
        await finishDialogue(page);
        await frame.waitForFunction(() => !state.paused);
        await walkToInteraction(frame, `${room}-return`);
        assert.equal(await frame.evaluate(() => state.currentSceneKey), 'hub');
      }
      assert.equal(await frame.evaluate(() => countPlacedCharges()), 3);
      await walkToInteraction(frame, 'hub-master-link');
      await page.waitForFunction(() => activeSceneScriptKey === 'subestacion_aftermath' && !storyTransitionBusy);
      await finishDialogue(page);
      await page.waitForFunction(() => hasCompletedStoryNode('subestacion') && !storyMapFrameParked && storyMapHasReportedReady);
      assert.equal(await page.evaluate(() => currentStoryNodeId), 'puente');
    });
  });

  test(`${engine.name()}: fixed patrols keep moving through complete routes and return after pursuit`, async () => {
    await fixture(engine, async (page, frame) => {
      const failures = await frame.evaluate(() => {
        cancelAnimationFrame(animationHandle);
        const failures = [];
        for (const room of sceneApi.getSceneKeys()) {
          loadScene(room);
          for (const enemy of currentEnemies) {
            const visited = new Set();
            let stationary = 0;
            for (let tick = 0; tick < 12000; tick++) {
              const x = enemy.x, y = enemy.y;
              visited.add(enemy.pathIndex);
              updateEnemy(enemy, 1 / 60);
              stationary = Math.hypot(enemy.x - x, enemy.y - y) < 0.0001 ? stationary + 1 : 0;
              if (stationary > 120) {
                failures.push({ room, id: enemy.id, stuck: [enemy.x, enemy.y], pathIndex: enemy.pathIndex });
                break;
              }
            }
            if (visited.size < enemy.path.length) failures.push({ room, id: enemy.id, visited: visited.size, waypoints: enemy.path.length });
          }
        }
        loadScene('reactor');
        const enemy = currentEnemies[0];
        enemy.x = 658; enemy.y = 130;
        enemy.mode = 'return';
        enemy.returnPath = buildPatrolPath([{ x: enemy.x, y: enemy.y }, enemy.path[enemy.pathIndex]]);
        enemy.returnIndex = 0;
        for (let tick = 0; tick < 3000 && enemy.mode === 'return'; tick++) updateEnemy(enemy, 1 / 60);
        if (enemy.mode === 'return') failures.push({ room: 'reactor', returning: true, stuck: [enemy.x, enemy.y] });
        return failures;
      });
      assert.deepEqual(failures, [], 'Sentries must complete their fixed routes and return around physical scenery');
    });
  });

  test(`${engine.name()}: charge dialogue pauses patrols and resumes exploration`, async () => {
    await fixture(engine, async (page, frame) => {
      await openChargeDialogue(page, frame);
      const before = await frame.evaluate(() => ({
        player: [player.x, player.y],
        enemies: currentEnemies.map(enemy => [enemy.x, enemy.y])
      }));
      // Reading the radio conversation must not leave the unseen patrol simulation running.
      await page.waitForTimeout(450);
      const after = await frame.evaluate(() => ({
        player: [player.x, player.y],
        enemies: currentEnemies.map(enemy => [enemy.x, enemy.y])
      }));
      assert.deepEqual(after, before, 'Player and patrols must pause while the charge dialogue is open');
      await finishDialogue(page);
      await page.waitForFunction(() => document.querySelector('#storySceneStage').hidden);
      const previous = await frame.evaluate(() => currentEnemies.map(enemy => [enemy.x, enemy.y]));
      await page.waitForTimeout(300);
      assert.notDeepEqual(await frame.evaluate(() => currentEnemies.map(enemy => [enemy.x, enemy.y])), previous,
        'Patrols must resume after dialogue completion');
    });
  });

  test(`${engine.name()}: closing aftermath allows reopening the extraction dialogue`, async () => {
    await fixture(engine, async (page, frame) => {
      await frame.evaluate(() => {
        state.chargesPlaced = { alpha: true, beta: true, gamma: true };
        handleExtractInteraction();
      });
      await page.waitForFunction(() => activeSceneScriptKey === 'subestacion_aftermath' && !storyTransitionBusy);
      await page.locator('#storySceneCloseBtn').click();
      await page.waitForFunction(() => document.querySelector('#storySceneStage').hidden);
      await frame.waitForFunction(() => !state.paused);
      await frame.evaluate(() => handleExtractInteraction());
      await page.waitForFunction(() => activeSceneScriptKey === 'subestacion_aftermath', null, { timeout: 3000 });
      assert.equal(await page.evaluate(() => hasCompletedStoryNode('subestacion')), false,
        'Closing the dialogue is not chapter completion');
      await finishDialogue(page);
      await page.waitForFunction(() => hasCompletedStoryNode('subestacion'));
      await page.waitForFunction(() => document.querySelector('#storySceneStage').hidden);
      assert.equal(await page.evaluate(() => activeMissionNodeId), null,
        'Finishing the chapter must release its active mission');
      await page.waitForFunction(() => !storyMapFrameParked && storyMapHasReportedReady);
    });
  });

  for (const exit of ['parent-button', 'child-action']) {
    test(`${engine.name()}: ${exit} and page reload preserve planted charges`, async () => {
      await fixture(engine, async (page, frame) => {
        await frame.evaluate(() => {
          loadScene('cruce');
          state.chargesPlaced.beta = true;
          player.x = 770;
          player.y = 900;
          saveProgress();
        });
        if (exit === 'parent-button') await page.locator('#storyExplorationMapBtn').click();
        else await frame.evaluate(() => attemptReturnToMap());
        await page.waitForFunction(() => document.querySelector('#storyExplorationStage').hidden);
        assert.equal(await page.evaluate(() => activeMissionNodeId), null,
          'Returning to the map must clear the active chapter mission');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(350);
        await page.evaluate(() => openStorySubestacionExploration('hub'));
        const reopened = await explorationFrame(page);
        const restored = await reopened.evaluate(() => ({
          loadId: storyLoadId, scene: state.currentSceneKey, beta: state.chargesPlaced.beta
        }));
        assert.deepEqual(restored, { loadId: 'substation-integration-test', scene: 'cruce', beta: true },
          'An ordinary map exit must preserve the ongoing infiltration across reload');
      });
    });
  }

  test(`${engine.name()}: reload during charge dialogue resumes the same infiltration`, async () => {
    await fixture(engine, async (page, frame) => {
      await openChargeDialogue(page, frame);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => activeSceneScriptKey === 'subestacion_charge_alpha');
      await finishDialogue(page);
      await page.waitForFunction(() => document.querySelector('#storySceneStage').hidden);
      await page.waitForFunction(() => activeExplorationNodeId === 'subestacion');
      assert.equal(await page.evaluate(() => activeExplorationNodeId), 'subestacion',
        'Finishing a restored charge dialogue must reopen its exploration');
      const restored = await explorationFrame(page);
      assert.deepEqual(await restored.evaluate(() => ({
        loadId: storyLoadId, scene: state.currentSceneKey, alpha: state.chargesPlaced.alpha
      })), { loadId: 'substation-integration-test', scene: 'reactor', alpha: true });
    });
  });
}
