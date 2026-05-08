#!/bin/sh
set -eu

apk add --no-cache git

rm -rf /app
git clone --depth=1 --filter=blob:none --sparse \
  https://github.com/juanramonpq-source/poker-combat-bot.git /app

cd /app
git sparse-checkout set --no-cone \
  '/server.js' \
  '/package.json' \
  '/package-lock.json' \
  '/*.html' \
  '/*.js' \
  '/*.css' \
  '/*.txt' \
  '/*.ico' \
  '/*.png' \
  '/*.svg' \
  '/site.webmanifest' \
  '/railway_bootstrap.sh' \
  '/assets/*.png' \
  '/assets/*.svg' \
  '/assets/*.ico' \
  '/assets/*.webmanifest' \
  '/assets/*.mp3' \
  '/assets/cards/**' \
  '/assets/sfx/**' \
  '/assets/videos/Ataque1.mp4' \
  '/assets/Historia/SistemaCorrupto.mp3' \
  '/assets/Historia/panel-control-malvado-animacion-completa.webp' \
  '/assets/Historia/tower-control-guard-mecha.png' \
  '/assets/Historia/tower-drone-base.png' \
  '/assets/Historia/tower-drone-clubs.png' \
  '/assets/Historia/tower-drone-hearts.png' \
  '/assets/Historia/tower-drone-spades.png' \
  '/assets/Historia/xavor-glitch-radio.svg' \
  '/assets/Historia/Brutos/cartel_pocobot_transparente.png' \
  '/assets/Historia/low/**' \
  '/assets/Historia/sfx/**'
git checkout

npm ci --omit=dev
exec npm start
