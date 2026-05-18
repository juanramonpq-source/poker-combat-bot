#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const svgDir = join(root, 'svg');
const pngDir = join(root, 'png');
const iconDir = join(root, 'icons');
const tmpDir = join(root, '.render-tmp');

for (const dir of [svgDir, pngDir, iconDir, tmpDir]) {
  mkdirSync(dir, { recursive: true });
}

const palette = {
  navy: '#071A33',
  midnight: '#04101F',
  white: '#FFFFFF',
  offWhite: '#F6FBFF',
  blue0: '#DDF8FF',
  blue1: '#42D6FF',
  blue2: '#1287FF',
  blue3: '#0756D9',
  blue4: '#032C7E',
  red: '#FF3030',
  redLight: '#FF7A52',
  green: '#20D466',
  greenLight: '#88FFAE',
  ice: '#26C8FF',
  iceLight: '#C6F8FF',
};

const petalFills = [
  palette.blue2,
  palette.blue3,
  palette.blue1,
  palette.blue4,
  palette.blue2,
  palette.blue3,
  palette.blue1,
  palette.blue4,
];

function triangleGem({ x, y, rotate, fill, light, label }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rotate})" aria-label="${label}">
      <polygon points="0,-34 33,25 -33,25" fill="${fill}" stroke="var(--outline)" stroke-width="8" stroke-linejoin="round"/>
      <polygon points="0,-21 13,11 -13,11" fill="${light}" opacity="0.72"/>
      <path d="M0 -30 L0 21 M-27 23 L0 -30 L27 23" fill="none" stroke="var(--gem-line)" stroke-width="3" stroke-linecap="round" opacity="0.42"/>
    </g>`;
}

function flowerMark() {
  const petals = petalFills.map((fill, index) => {
    const angle = index * 45;
    const highlight = index % 2 === 0 ? palette.blue0 : palette.blue1;
    return `
      <g transform="rotate(${angle})">
        <path d="M0,-256 C46,-224 72,-173 58,-128 C46,-88 18,-56 0,-34 C-18,-56 -46,-88 -58,-128 C-72,-173 -46,-224 0,-256Z" fill="${fill}" stroke="var(--outline)" stroke-width="10" stroke-linejoin="round"/>
        <path d="M0,-212 C24,-190 39,-153 31,-122 C24,-96 9,-74 0,-61 C-9,-74 -24,-96 -31,-122 C-39,-153 -24,-190 0,-212Z" fill="${highlight}" opacity="0.28"/>
        <path d="M0,-219 L0,-103" fill="none" stroke="var(--petal-line)" stroke-width="6" stroke-linecap="round" opacity="0.58"/>
        <circle cx="0" cy="-82" r="11" fill="var(--joint-fill)" stroke="var(--petal-line)" stroke-width="4"/>
      </g>`;
  }).join('');

  return `
    <g class="flower-mark">
      <defs>
        <mask id="center-cut">
          <rect x="-330" y="-330" width="660" height="660" fill="white"/>
          <circle cx="0" cy="0" r="58" fill="black"/>
        </mask>
      </defs>
      <g mask="url(#center-cut)">
        ${petals}
      </g>
      <circle cx="0" cy="0" r="114" fill="none" stroke="var(--petal-line)" stroke-width="7" opacity="0.7"/>
      <circle cx="0" cy="0" r="84" fill="none" stroke="var(--outline)" stroke-width="13"/>
      ${triangleGem({ x: 0, y: -126, rotate: 0, fill: palette.ice, light: palette.iceLight, label: 'blue ice triangular gem' })}
      ${triangleGem({ x: -106, y: 82, rotate: -132, fill: palette.red, light: palette.redLight, label: 'red fire triangular gem' })}
      ${triangleGem({ x: 106, y: 82, rotate: 132, fill: palette.green, light: palette.greenLight, label: 'green plant triangular gem' })}
      <circle cx="0" cy="0" r="49" fill="none" stroke="var(--petal-line)" stroke-width="10"/>
      <circle cx="0" cy="0" r="25" fill="none" stroke="var(--outline)" stroke-width="9"/>
      <path d="M-15,-4 C-7,-18 7,-18 15,-4 C6,6 -6,6 -15,-4Z" fill="var(--seed-glow)" opacity="0.9"/>
    </g>`;
}

function style({ dark = false } = {}) {
  return `
    <style>
      :root {
        --outline: ${dark ? '#BFEFFF' : palette.navy};
        --petal-line: ${dark ? '#E8FBFF' : '#A7ECFF'};
        --joint-fill: ${dark ? '#061B35' : palette.navy};
        --seed-glow: ${dark ? '#FFFFFF' : '#C9F7FF'};
        --gem-line: ${dark ? '#FFFFFF' : palette.midnight};
        --word: ${dark ? '#F4FBFF' : palette.navy};
        --games: ${dark ? palette.blue1 : palette.blue3};
        --decor: ${dark ? palette.ice : palette.blue2};
      }
      .brand {
        font-family: "Avenir Next", "Montserrat", "Inter", "Trebuchet MS", Arial, sans-serif;
        font-size: 132px;
        font-weight: 760;
        letter-spacing: 4px;
        fill: var(--word);
      }
      .games {
        font-family: "Avenir Next", "Montserrat", "Inter", "Trebuchet MS", Arial, sans-serif;
        font-size: 54px;
        font-weight: 650;
        letter-spacing: 18px;
        fill: var(--games);
      }
    </style>`;
}

function backgroundRect(background, width, height) {
  if (!background || background === 'transparent') return '';
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="${background}"/>`;
}

function logoSvg({ background = 'transparent', dark = false } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" role="img" aria-labelledby="title desc">
  <title id="title">Pentonúi Games logo</title>
  <desc id="desc">Eight-petal blue mechanical flower with separated red, green, and blue triangular gems above the Pentonúi Games wordmark.</desc>
  ${style({ dark })}
  ${backgroundRect(background, 1600, 1200)}
  <g transform="translate(800 390) scale(1.08)">
    ${flowerMark()}
  </g>
  <text x="800" y="840" text-anchor="middle" class="brand">Pentonúi</text>
  <g aria-hidden="true" stroke="var(--decor)" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.88">
    <path d="M488 895 H612"/>
    <path d="M988 895 H1112"/>
    <path d="M626 895 l15 -11 l15 11 l-15 11 Z" fill="var(--decor)" stroke="none"/>
    <path d="M959 895 l15 -11 l15 11 l-15 11 Z" fill="var(--decor)" stroke="none"/>
  </g>
  <text x="800" y="914" text-anchor="middle" class="games">Games</text>
</svg>
`;
}

function markSvg({ background = 'transparent', dark = false } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">
  <title id="title">Pentonúi Games mark</title>
  <desc id="desc">Abstract eight-petal blue mechanical flower with separated red, green, and blue triangular gems.</desc>
  ${style({ dark })}
  ${backgroundRect(background, 1024, 1024)}
  <g transform="translate(512 512) scale(1.58)">
    ${flowerMark()}
  </g>
</svg>
`;
}

const svgFiles = [
  ['pentonui-games-logo-transparent.svg', logoSvg()],
  ['pentonui-games-logo-white.svg', logoSvg({ background: palette.white })],
  ['pentonui-games-logo-black.svg', logoSvg({ background: '#050914', dark: true })],
  ['pentonui-games-mark-transparent.svg', markSvg()],
  ['pentonui-games-mark-white.svg', markSvg({ background: palette.white })],
  ['pentonui-games-mark-black.svg', markSvg({ background: '#050914', dark: true })],
  ['pentonui-games-favicon.svg', markSvg()],
];

for (const [name, svg] of svgFiles) {
  writeFileSync(join(svgDir, name), svg);
}

const manifest = {
  name: 'Pentonúi Games',
  short_name: 'Pentonúi',
  icons: [
    { src: 'icons/pentonui-games-icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/pentonui-games-icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/pentonui-games-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  theme_color: palette.blue3,
  background_color: palette.white,
  display: 'standalone',
};

writeFileSync(join(root, 'pentonui-games.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

const brand = {
  name: 'Pentonúi Games',
  concept: 'Abstract blue mechanical flower with three separated triangular elemental gems.',
  colors: {
    navy: palette.navy,
    royalBlue: palette.blue3,
    cyan: palette.blue1,
    iceBlue: palette.ice,
    fireRed: palette.red,
    plantGreen: palette.green,
    white: palette.white,
  },
  usage: {
    primarySvg: 'svg/pentonui-games-logo-transparent.svg',
    markSvg: 'svg/pentonui-games-mark-transparent.svg',
    faviconSvg: 'svg/pentonui-games-favicon.svg',
  },
};

writeFileSync(join(root, 'pentonui-games-brand.json'), `${JSON.stringify(brand, null, 2)}\n`);

function render(svgName, outputDir, outputName, width, height = width) {
  const svgPath = join(svgDir, svgName);
  const tmpPng = join(tmpDir, 'render.png');
  const outputPath = join(outputDir, outputName);

  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  rmSync(outputPath, { force: true });
  execFileSync('sips', ['-s', 'format', 'png', svgPath, '--out', tmpPng], { stdio: 'ignore' });
  execFileSync('sips', ['-z', String(height), String(width), tmpPng, '--out', outputPath], { stdio: 'ignore' });

  if (!existsSync(outputPath)) {
    throw new Error(`sips did not create ${outputPath}`);
  }
}

const logoSizes = [1600, 1200, 800];
for (const size of logoSizes) {
  render('pentonui-games-logo-transparent.svg', pngDir, `pentonui-games-logo-transparent-${size}.png`, size, Math.round(size * 0.75));
  render('pentonui-games-logo-white.svg', pngDir, `pentonui-games-logo-white-${size}.png`, size, Math.round(size * 0.75));
  render('pentonui-games-logo-black.svg', pngDir, `pentonui-games-logo-black-${size}.png`, size, Math.round(size * 0.75));
}

const markSizes = [1024, 512, 256, 192, 180, 128, 64, 48, 32, 16];
for (const size of markSizes) {
  render('pentonui-games-mark-transparent.svg', iconDir, `pentonui-games-icon-transparent-${size}.png`, size);
  render('pentonui-games-mark-white.svg', iconDir, `pentonui-games-icon-${size}.png`, size);
  render('pentonui-games-mark-black.svg', iconDir, `pentonui-games-icon-black-${size}.png`, size);
}

render('pentonui-games-mark-white.svg', iconDir, 'pentonui-games-icon-maskable-512.png', 512);
render('pentonui-games-favicon.svg', iconDir, 'favicon-32.png', 32);
render('pentonui-games-favicon.svg', iconDir, 'favicon-16.png', 16);

rmSync(tmpDir, { recursive: true, force: true });
console.log(`Pentonúi Games assets generated in ${root}`);
