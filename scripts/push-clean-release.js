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

function runPostPushChecks(cleanRoot, pushedCommitHash = '') {
  runVisible('npm', ['run', 'railway:guard'], cleanRoot);

  if (!pushedCommitHash) return;

  let fallbackTriggered = false;
  try {
    runVisible('node', [path.join(__dirname, 'railway-await-github-deploy.js'), pushedCommitHash], cleanRoot);
  } catch (error) {
    fallbackTriggered = true;
    console.warn('Railway GitHub autodeploy failed or stalled. Attempting bootstrap refresh...');
    runVisible('npm', ['run', 'railway:bootstrap-refresh'], cleanRoot);
  }

  runVisible('npm', ['run', 'railway:guard'], cleanRoot);

  if (fallbackTriggered) {
    console.log('Final Railway guard passed after bootstrap refresh fallback.');
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
  const pushedCommitHash = run('git', ['rev-parse', 'HEAD'], { cwd: cleanRoot });
  runVisible('git', ['push', 'origin', manifest.branch], cleanRoot);

  runPostPushChecks(cleanRoot, pushedCommitHash);
}

main();
