# Age of War-lite

Phaser browser game with lane combat, evolving ages, economy, units, and win/loss flow.

## Install

```bash
npm ci
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## GitHub Pages deployment

Use Node.js 24. Source lives on `main`; the public game is https://noelperland.github.io/age-of-war-lite/ . GitHub Pages serves built files from `gh-pages`.

```sh
npm ci
npm run build -- --base=/age-of-war-lite/
npm run preview -- --base=/age-of-war-lite/
```

Publish `dist/` contents to a separate `gh-pages` checkout, include `.nojekyll`, commit and push without force. Preserve source on `main`. Verify assets, real gameplay, touch/keyboard input, pause/restart and results at the public subfolder after deployment. Local tests do not verify the public release.

The old Liivo deployment is separate. Do not replace the hub's current Pages link with an unverified URL.

## Battle regression check

With the dev server running, run `npm run verify:battle`. Pass a deployed URL with
`npm run verify:battle -- https://noelperland.github.io/age-of-war-lite/`.
The check uses Chrome (`CHROME_PATH` overrides its executable), validates all 36
padded pose textures and six card labels, exercises combat and base cooldowns,
and checks fighter road alignment, desktop, phone, rotation, results, and restart.

The source art has three illustrated archetypes, reused by the six gameplay roles.
Animations combine the existing individual poses with procedural motion; no new
unit balance, costs, or save format changes are introduced.

Save regression: npm test verifies valid saves and blocked/full browser storage. Failed writes retain current-tab progress; reloading cannot recover changes browser could not persist.
