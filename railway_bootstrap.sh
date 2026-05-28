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
  '/*.webmanifest' \
  '/railway_bootstrap.sh' \
  '/assets/*.png' \
  '/assets/*.svg' \
  '/assets/*.ico' \
  '/assets/*.webp' \
  '/assets/*.webmanifest' \
  '/assets/*.mp3' \
  '/assets/cards/**' \
  '/assets/sfx/**' \
  '/assets/pentonui-games/**' \
  '/assets/videos/Ataque1.mp4' \
  '/assets/Historia/**' \
  '/mobile-sprite-boceto/**'
git checkout

npm ci --omit=dev
exec npm start
