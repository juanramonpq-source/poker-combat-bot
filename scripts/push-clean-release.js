#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(__dirname, 'pocobot-clean-manifest.json'), 'utf8'));
const configuredCleanDir = process.env.POCOBOT_CLEAN_DIR || manifest.cleanDir;
const cleanRoot = path.isAbsolute(configuredCleanDir)
  ? configuredCleanDir
  : path.resolve(root, configuredCleanDir);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe']
  }).trim();
}

function runVisible(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit'
  });
}

function runPostPushChecks(cleanRoot) {
  let guardPassed = true;

  try {
    runVisible('npm', ['run', 'railway:guard'], cleanRoot);
  } catch (error) {
    guardPassed = false;
    console.warn('Initial Railway guard failed. Attempting bootstrap refresh before the final guard...');
  }

  runVisible('npm', ['run', 'railway:bootstrap-refresh'], cleanRoot);
  runVisible('npm', ['run', 'railway:guard'], cleanRoot);

  if (!guardPassed) {
    console.log('Final Railway guard passed after bootstrap refresh.');
  }
}

function main() {
  const messageFromArgs = process.argv.slice(2).join(' ').trim();
  const message = messageFromArgs || `Publish clean PoCoBOT release ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  runVisible('node', [path.join(__dirname, 'sync-clean-release.js')], root);

  runVisible('git', ['checkout', manifest.branch], cleanRoot);
  runVisible('git', ['add', '-A'], cleanRoot);

  const porcelain = run('git', ['status', '--short'], { cwd: cleanRoot });
  if (!porcelain) {
    console.log('Clean release has no changes to commit.');
    runPostPushChecks(cleanRoot);
    return;
  }

  runVisible('git', ['commit', '-m', message], cleanRoot);
  runVisible('git', ['push', 'origin', manifest.branch], cleanRoot);

  runPostPushChecks(cleanRoot);
}

main();
