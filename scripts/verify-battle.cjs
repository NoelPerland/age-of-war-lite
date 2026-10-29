const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:8971/');
  await page.waitForFunction(() => window.__AOW_GAME__?.scene.isActive('title'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__AOW_DEBUG__);
  const checks = await page.evaluate(() => {
    const s = window.__AOW_GAME__.scene.getScene('game');
    s.scene.pause();
    s.playerAge = 3; s.playerGold = 99999;
    ['scrapper', 'pulse-gunner', 'bulwark', 'arc-caster', 'raider', 'siege-engine'].forEach(id => s.onHudButtonPressed(id));
    const definitions = s.units.map(unit => unit.def);
    const frames = [];
    for (const side of ['player', 'enemy']) for (const def of definitions) for (const suffix of ['', '-walk', '-attack']) {
      const key = `${side}-${def.id}${suffix}`;
      const canvas = s.textures.get(key).getSourceImage();
      const data = canvas.getContext('2d').getImageData(0, 0, 128, 128).data;
      let opaque = 0, border = 0;
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3]) {
        opaque++;
        if (x === 0 || x === 127 || y === 0 || y === 127) border++;
      }
      frames.push({ key, opaque, border });
    }
    const labels = [...s.hudButtons.entries()].filter(([id]) => !['mute', 'age-up'].includes(id)).map(([id, b]) => ({ id, width: b.title.width, bounds: b.container.width, center: b.title.x }));
    s.units.forEach(unit => { s.tweens.killTweensOf(unit.sprite); unit.sprite.destroy(); unit.healthBar.destroy(); }); s.units = [];
    const melee = definitions.find(def => def.id === 'scrapper');
    s.spawnUnit(melee, 'player');
    const unit = s.units[0];
    s.tweens.killTweensOf(unit.sprite); unit.sprite.setAlpha(1); unit.sprite.x = s.enemyBase.x - 100; unit.attackCooldown = 10;
    const x = unit.sprite.x;
    s.updateUnits(0.1);
    const cooldownHolds = unit.sprite.x === x;
    unit.attackCooldown = 0;
    const hp = s.enemyBase.hp;
    s.updateUnits(0.1);
    const attack = { sameX: unit.sprite.x === x, damaged: s.enemyBase.hp < hp, pose: unit.sprite.texture.key, angle: unit.sprite.angle };
    const frame = unit.sprite.texture.key;
    s.updateUnits(0.4);
    const recovered = unit.sprite.texture.key !== frame;
    s.units.forEach(u => { u.sprite.destroy(); u.healthBar.destroy(); }); s.units = [];
    definitions.forEach((def, i) => {
      s.spawnUnit(def, 'player'); s.spawnUnit(def, 'enemy');
      const pair = s.units.slice(-2);
      pair.forEach(u => { s.tweens.killTweensOf(u.sprite); u.sprite.setAlpha(1).setScale(u.def.scale * 0.82); u.sprite.x = u.side === 'player' ? 400 + i * 10 : 710 + i * 10; });
    });
    s.playerBase.hp = 1280; s.enemyBase.hp = 1280; s.enemyGold = 0; s.enemyBase.aiThinkCooldown = -9999;
    s.refreshHud(); s.scene.resume();
    return { frames, labels, cooldownHolds, attack, recovered };
  });
  assert.equal(checks.frames.length, 36);
  for (const frame of checks.frames) { assert(frame.opaque > 1200, `${frame.key} empty`); assert.equal(frame.border, 0, `${frame.key} clipped`); }
  for (const label of checks.labels) { assert(label.width <= label.bounds - 12, `${label.id} text overflow`); assert.equal(label.center, 0); }
  assert(checks.cooldownHolds, 'Unit advanced while waiting to attack base');
  assert(checks.attack.sameX && checks.attack.damaged && checks.attack.pose.endsWith('-attack') && checks.attack.angle !== 0, 'Attack must animate without moving simulation position');
  assert(checks.recovered, 'Attack must recover to idle');
  await page.waitForTimeout(6000);
  assert((await page.evaluate(() => window.__AOW_DEBUG__.getState())).score > 0, 'Combat must defeat units');
  await page.screenshot({ path: '../../outputs/age-combat-repaired.png' });
  for (const [width, height] of [[1920, 1080], [390, 844], [360, 640], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const fit = await page.locator('canvas').boundingBox();
    assert(fit.x >= -1 && fit.y >= -1 && fit.x + fit.width <= width + 1 && fit.y + fit.height <= height + 1, `Canvas cropped at ${width}x${height}`);
  }
  await page.evaluate(() => window.__AOW_GAME__.scene.getScene('game').finishBattle('victory'));
  assert((await page.evaluate(() => window.__AOW_DEBUG__.getState())).overlayVisible, 'Results hidden');
  await page.keyboard.press('r');
  await page.waitForFunction(() => window.__AOW_DEBUG__ && !window.__AOW_DEBUG__.getState().gameEnded);
  assert.deepEqual(errors, []);
  console.log('PASS: 36 padded poses, six centered labels, base cooldown, attack/recovery, combat KOs, five viewport sizes, results and restart; no browser errors.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
