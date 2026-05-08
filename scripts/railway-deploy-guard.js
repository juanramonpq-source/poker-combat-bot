#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const EXPECTED = {
  projectId: '99bfc6cf-9404-4555-b967-148eabff6536',
  projectName: 'Poker Combat Bot',
  environmentId: '63dcc12b-1ea8-4d91-b2b7-591171a20c07',
  environmentName: 'production',
  serviceId: 'a751d925-2352-44fa-8661-7fd902d3649b',
  serviceName: 'poker-combat-bot'
};

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    throw new Error([`Command failed: ${command} ${args.join(' ')}`, stderr, stdout].filter(Boolean).join('\n'));
  }
}

function readJson(command, args) {
  const output = run(command, args);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Could not parse JSON from: ${command} ${args.join(' ')}\n${output}`);
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function getProductionService(status) {
  const environments = status.environments?.edges || [];
  const production = environments.map((edge) => edge.node).find((environment) => environment.id === EXPECTED.environmentId);
  const serviceInstances = production?.serviceInstances?.edges?.map((edge) => edge.node) || [];
  return {
    production,
    serviceInstances,
    serviceInstance: serviceInstances.find((instance) => instance.serviceId === EXPECTED.serviceId)
  };
}

console.log('Checking Railway deployment guardrails...');

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
assert(branch === 'main', `Current git branch is "${branch}". Live deploys must be made from main.`);

const head = run('git', ['rev-parse', 'HEAD']);
const originMain = run('git', ['ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
assert(head === originMain, `HEAD (${head}) is not equal to origin/main (${originMain}). Push main before deploying.`);

const trackedLargeLocalFiles = run('git', ['ls-files', 'assets.zip', 'backups', '*.zip']);
assert(!trackedLargeLocalFiles, `Tracked local backup/archive files would bloat deploys:\n${trackedLargeLocalFiles}`);

const railwayIgnorePath = path.join(root, '.railwayignore');
assert(existsSync(railwayIgnorePath), '.railwayignore is missing.');
if (existsSync(railwayIgnorePath)) {
  const railwayIgnore = readFileSync(railwayIgnorePath, 'utf8');
  for (const pattern of ['backups/', '*.zip', 'assets.zip', 'node_modules/']) {
    assert(railwayIgnore.includes(pattern), `.railwayignore must include "${pattern}".`);
  }
}

const dockerIgnorePath = path.join(root, '.dockerignore');
warn(existsSync(dockerIgnorePath), '.dockerignore is missing. Add it before returning to Docker/Railway builds.');
if (existsSync(dockerIgnorePath)) {
  const dockerIgnore = readFileSync(dockerIgnorePath, 'utf8');
  for (const pattern of ['backups/', '*.zip', 'assets.zip', 'node_modules/']) {
    assert(dockerIgnore.includes(pattern), `.dockerignore must include "${pattern}".`);
  }
}

const bootstrapPath = path.join(root, 'railway_bootstrap.sh');
assert(existsSync(bootstrapPath), 'railway_bootstrap.sh is missing.');
if (existsSync(bootstrapPath)) {
  const bootstrap = readFileSync(bootstrapPath, 'utf8');
  assert(bootstrap.includes("'/assets/Historia/**'"), 'railway_bootstrap.sh must include the full story assets path.');
  assert(bootstrap.includes('npm ci --omit=dev'), 'railway_bootstrap.sh must install production dependencies only.');
  assert(bootstrap.includes('exec npm start'), 'railway_bootstrap.sh must end by starting PoCoBOT.');
}

const railwayStatus = readJson('npx', ['-y', '@railway/cli', 'status', '--json']);
assert(railwayStatus.id === EXPECTED.projectId, `Linked Railway project is ${railwayStatus.id}; expected ${EXPECTED.projectId}.`);
assert(railwayStatus.name === EXPECTED.projectName, `Linked Railway project name is "${railwayStatus.name}"; expected "${EXPECTED.projectName}".`);

const { production, serviceInstances, serviceInstance } = getProductionService(railwayStatus);
assert(Boolean(production), 'Railway production environment was not found in status output.');
if (production) {
  assert(production.name === EXPECTED.environmentName, `Railway environment name is "${production.name}"; expected "${EXPECTED.environmentName}".`);
  assert(serviceInstances.length === 1, `Production should have exactly one service instance; found ${serviceInstances.length}.`);
  assert(Boolean(serviceInstance), `Service ${EXPECTED.serviceName} (${EXPECTED.serviceId}) was not found in production.`);
}

const services = railwayStatus.services?.edges?.map((edge) => edge.node) || [];
assert(services.length === 1, `Project should contain exactly one service; found ${services.length}.`);
const service = services.find((item) => item.id === EXPECTED.serviceId);
assert(Boolean(service), `Project service ${EXPECTED.serviceName} (${EXPECTED.serviceId}) was not found.`);
if (service) {
  assert(service.name === EXPECTED.serviceName, `Railway service name is "${service.name}"; expected "${EXPECTED.serviceName}".`);
}

const serviceStatus = readJson('npx', ['-y', '@railway/cli', 'service', 'status', '--service', EXPECTED.serviceName, '--environment', EXPECTED.environmentName, '--json']);
assert(serviceStatus.id === EXPECTED.serviceId, `Railway service status returned ${serviceStatus.id}; expected ${EXPECTED.serviceId}.`);

let projects = [];
try {
  projects = readJson('npx', ['-y', '@railway/cli', 'list', '--json']);
} catch (error) {
  warnings.push(`Could not list Railway projects: ${error.message}`);
}

if (Array.isArray(projects) && projects.length) {
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const unexpectedProjects = activeProjects.filter((project) => project.id !== EXPECTED.projectId);
  assert(unexpectedProjects.length === 0, `Unexpected active Railway projects found:\n${unexpectedProjects.map((project) => `- ${project.name} (${project.id})`).join('\n')}`);
}

if (warnings.length) {
  console.log('\nWarnings:');
  for (const message of warnings) console.log(`- ${message}`);
}

if (failures.length) {
  console.error('\nRailway deploy guard failed:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('\nRailway deploy guard passed.');
console.log(`Project: ${EXPECTED.projectName} (${EXPECTED.projectId})`);
console.log(`Environment: ${EXPECTED.environmentName} (${EXPECTED.environmentId})`);
console.log(`Service: ${EXPECTED.serviceName} (${EXPECTED.serviceId})`);
