#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, copyFileSync, chmodSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'pocobot-clean-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const configuredCleanDir = process.env.POCOBOT_CLEAN_DIR || manifest.cleanDir;
const cleanRoot = path.isAbsolute(configuredCleanDir)
  ? configuredCleanDir
  : path.resolve(root, configuredCleanDir);
const dryRun = process.argv.includes('--dry-run');

const copied = new Set();
const missing = [];
let copiedBytes = 0;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe']
  }).trim();
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isIgnoredName(name) {
  return (manifest.ignoreNames || []).includes(name);
}

function hasIgnoredExtension(filePath) {
  return (manifest.ignoreExtensions || []).some((extension) => filePath.endsWith(extension));
}

function shouldIgnore(relPath) {
  const parts = relPath.split('/');
  return parts.some(isIgnoredName) || hasIgnoredExtension(relPath);
}

function ensureCleanRepo() {
  if (!existsSync(cleanRoot)) {
    mkdirSync(path.dirname(cleanRoot), { recursive: true });
    console.log(`Cloning clean release repo into ${cleanRoot}`);
    run('git', ['clone', '--branch', manifest.branch, manifest.remote, cleanRoot], { stdio: 'inherit' });
  }

  if (!existsSync(path.join(cleanRoot, '.git'))) {
    throw new Error(`Clean release directory is not a git repository: ${cleanRoot}`);
  }

  const origin = run('git', ['remote', 'get-url', 'origin'], { cwd: cleanRoot });
  if (origin !== manifest.remote) {
    throw new Error(`Clean release repo origin is ${origin}; expected ${manifest.remote}`);
  }

  run('git', ['fetch', 'origin', manifest.branch], { cwd: cleanRoot });
  run('git', ['checkout', manifest.branch], { cwd: cleanRoot });
}

function emptyCleanTree() {
  for (const entry of readdirSync(cleanRoot)) {
    if (entry === '.git') continue;
    const target = path.join(cleanRoot, entry);
    if (!dryRun) rmSync(target, { recursive: true, force: true });
  }
}

function copyFileRel(relPath) {
  const normalized = toPosix(relPath);
  if (shouldIgnore(normalized) || copied.has(normalized)) return;

  const source = path.join(root, normalized);
  const destination = path.join(cleanRoot, normalized);

  if (!existsSync(source)) {
    missing.push(normalized);
    return;
  }

  const stats = statSync(source);
  if (!stats.isFile()) return;

  copied.add(normalized);
  copiedBytes += stats.size;

  if (!dryRun) {
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    chmodSync(destination, stats.mode & 0o777);
  }
}

function walkDirectoryRel(relDir) {
  const normalizedDir = toPosix(relDir);
  if (shouldIgnore(normalizedDir)) return;

  const sourceDir = path.join(root, normalizedDir);
  if (!existsSync(sourceDir)) {
    missing.push(normalizedDir);
    return;
  }

  for (const entry of readdirSync(sourceDir)) {
    const rel = `${normalizedDir}/${entry}`;
    if (shouldIgnore(rel)) continue;

    const source = path.join(root, rel);
    const stats = statSync(source);
    if (stats.isDirectory()) {
      walkDirectoryRel(rel);
    } else if (stats.isFile()) {
      copyFileRel(rel);
    }
  }
}

function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

function allSourceFiles() {
  const results = [];
  function walk(absDir, relDir = '') {
    for (const entry of readdirSync(absDir)) {
      const rel = relDir ? `${relDir}/${entry}` : entry;
      if (shouldIgnore(rel)) continue;
      const abs = path.join(absDir, entry);
      const stats = statSync(abs);
      if (stats.isDirectory()) walk(abs, rel);
      else if (stats.isFile()) results.push(rel);
    }
  }
  walk(root);
  return results;
}

function copyPatterns(patterns) {
  const files = allSourceFiles();
  for (const pattern of patterns || []) {
    const regex = patternToRegex(pattern);
    for (const rel of files) {
      if (regex.test(rel)) copyFileRel(rel);
    }
  }
}

function stripUrl(url) {
  return url.split('#')[0].split('?')[0];
}

function isValidationIgnored(ref) {
  const cleanRef = stripUrl(ref);
  return (manifest.validationIgnoreReferences || []).includes(cleanRef);
}

function isExternal(url) {
  return /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(url);
}

function shouldCheckReference(url) {
  if (!url || isExternal(url)) return false;
  if (isValidationIgnored(url)) return false;
  if (url.startsWith('/socket.io/')) return false;
  if (url.includes('${') || url.includes('...') || url.includes('<') || url.includes('>') || url.includes(',')) return false;
  return /\.(?:html|js|css|webmanifest|png|jpe?g|webp|gif|svg|ico|mp3|wav|mp4|pdf)$/i.test(stripUrl(url));
}

function extractReferences(text) {
  const refs = new Set();
  const attrPattern = /\b(?:src|href|poster|content)\s*=\s*["']([^"']+)["']/gi;
  const cssUrlPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  const stringPattern = /["'`]([^"'`\s]+?\.(?:html|js|css|webmanifest|png|jpe?g|webp|gif|svg|ico|mp3|wav|mp4|pdf)(?:\?[^"'`]*)?)["'`]/gi;

  for (const pattern of [attrPattern, cssUrlPattern, stringPattern]) {
    let match;
    while ((match = pattern.exec(text))) {
      refs.add(match[1]);
    }
  }

  return refs;
}

function validateReferences() {
  const checkedExtensions = new Set(['.html', '.js', '.css', '.webmanifest']);
  const missingRefs = [];

  for (const rel of copied) {
    const ext = path.extname(rel).toLowerCase();
    if (!checkedExtensions.has(ext)) continue;

    const abs = path.join(cleanRoot, rel);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    const baseDir = path.dirname(rel);

    for (const ref of extractReferences(text)) {
      if (!shouldCheckReference(ref)) continue;
      const cleanRef = stripUrl(ref);
      const resolved = toPosix(path.normalize(
        cleanRef.startsWith('/')
          ? cleanRef.slice(1)
          : path.join(baseDir, cleanRef)
      ));
      if (resolved.startsWith('../')) continue;
      if (!existsSync(path.join(cleanRoot, resolved))) {
        missingRefs.push(`${rel} -> ${ref}`);
      }
    }
  }

  if (missingRefs.length) {
    throw new Error(`Clean release is missing referenced files:\n${missingRefs.slice(0, 80).map((item) => `- ${item}`).join('\n')}${missingRefs.length > 80 ? `\n...and ${missingRefs.length - 80} more` : ''}`);
  }
}

function writeSummary() {
  const lines = [
    '# PoCoBOT Clean Release',
    '',
    'This directory is generated from the working PoCoBOT folder.',
    '',
    '- Do not edit this folder by hand.',
    '- Use `npm run clean:sync` from the working folder to refresh it.',
    '- Use `npm run clean:push` from the working folder to commit and push this clean tree to GitHub.',
    '',
    `Generated file count: ${copied.size}`,
    `Generated payload size: ${(copiedBytes / 1024 / 1024).toFixed(1)} MB`,
    ''
  ];

  if (!dryRun) {
    const destination = path.join(cleanRoot, 'CLEAN_RELEASE.md');
    mkdirSync(path.dirname(destination), { recursive: true });
    require('fs').writeFileSync(destination, `${lines.join('\n')}\n`);
  }
}

function main() {
  ensureCleanRepo();
  emptyCleanTree();

  for (const file of manifest.files || []) copyFileRel(file);
  copyPatterns(manifest.filePatterns || []);
  for (const directory of manifest.directories || []) walkDirectoryRel(directory);

  if (missing.length) {
    throw new Error(`Clean release manifest references missing paths:\n${missing.map((item) => `- ${item}`).join('\n')}`);
  }

  writeSummary();
  validateReferences();

  console.log(`Clean release synchronized at ${cleanRoot}`);
  console.log(`Files copied: ${copied.size}`);
  console.log(`Payload size: ${(copiedBytes / 1024 / 1024).toFixed(1)} MB`);
}

main();
