# Age of War-lite

Phaser browser game with lane combat, evolving ages, economy, units, and win/loss flow.

## Install

```bash
npm install
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

## Liivo Deployment

Build command: `npm run build`

Static output: `dist`

After deployment, add the Liivo URL to Noel's Game Hub under `age-of-war-lite`.

## Battle regression check

With the dev server running, run `npm run verify:battle`. Pass a deployed URL with
`npm run verify:battle -- https://noelperland.github.io/age-of-war-lite/`.
The check uses Chrome (`CHROME_PATH` overrides its executable), validates all 36
padded pose textures and six card labels, exercises combat and base cooldowns,
and checks desktop, phone, rotation, results, and restart.

The source art has three illustrated archetypes, reused by the six gameplay roles.
Animations combine the existing individual poses with procedural motion; no new
unit balance, costs, or save format changes are introduced.
