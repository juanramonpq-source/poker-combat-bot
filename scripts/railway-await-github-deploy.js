#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const EXPECTED = {
  projectId: '99bfc6cf-9404-4555-b967-148eabff6536',
  environmentName: 'production',
  environmentId: '63dcc12b-1ea8-4d91-b2b7-591171a20c07',
  serviceName: 'poker-combat-bot',
  serviceId: 'a751d925-2352-44fa-8661-7fd902d3649b',
  healthUrl: 'https://pocobot.up.railway.app/'
};

const root = path.resolve(__dirname, '..');
const commitHash = (process.argv[2] || '').trim();
const timeoutMs = Number(process.env.POCOBOT_RAILWAY_AUTODEPLOY_TIMEOUT_MS || 900000);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe']
  }).trim();
}

function readJson(command, args) {
  const output = run(command, args);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Could not parse JSON from ${command} ${args.join(' ')}:\n${output}`);
  }
}

function readRailwayAccessToken() {
  const configPath = path.join(process.env.HOME || '', '.railway', 'config.json');
  if (!existsSync(configPath)) {
    throw new Error('Railway CLI config was not found. Run `railway login` first.');
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const token = config.user?.accessToken || config.user?.token;
  if (!token) {
    throw new Error('Railway CLI config does not contain an access token. Run `railway login` first.');
  }

  return token;
}

function railwayGraphql(query, variables) {
  const token = readRailwayAccessToken();
  const output = execFileSync('curl', [
    '-fsS',
    'https://backboard.railway.com/graphql/v2',
    '-H',
    'Content-Type: application/json',
    '-H',
    `Authorization: Bearer ${token}`,
    '--data-binary',
    JSON.stringify({ query, variables })
  ], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();

  const payload = JSON.parse(output);
  if (payload.errors?.length) {
    throw new Error(`Railway GraphQL returned errors:\n${JSON.stringify(payload.errors, null, 2)}`);
  }

  return payload.data;
}

function serviceStatus() {
  const services = readJson('npx', ['-y', '@railway/cli', 'service', 'list', '--json']);
  const service = services.find((item) => item.id === EXPECTED.serviceId);
  if (!service) {
    throw new Error(`Railway service ${EXPECTED.serviceName} (${EXPECTED.serviceId}) was not found.`);
  }
  return service;
}

function listDeployments(limit = 10) {
  return readJson('npx', [
    '-y',
    '@railway/cli',
    'deployment',
    'list',
    '--service',
    EXPECTED.serviceName,
    '--environment',
    EXPECTED.environmentName,
    '--limit',
    String(limit),
    '--json'
  ]);
}

function assertCanonicalProject() {
  const status = readJson('npx', ['-y', '@railway/cli', 'status', '--json']);
  if (status.id !== EXPECTED.projectId) {
    throw new Error(`Linked Railway project is ${status.id}; expected ${EXPECTED.projectId}.`);
  }
}

function autodeployStatus() {
  return railwayGraphql(
    `query($projectId:String!,$environmentId:String!,$serviceId:String!){
      serviceInstanceAutoDeployStatus(projectId:$projectId, environmentId:$environmentId, serviceId:$serviceId){
        enabled
        canEnable
        reason
      }
    }`,
    {
      projectId: EXPECTED.projectId,
      environmentId: EXPECTED.environmentId,
      serviceId: EXPECTED.serviceId
    }
  ).serviceInstanceAutoDeployStatus;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deploymentLabel(deployment) {
  if (!deployment) return 'none';
  return `${deployment.status}:${deployment.id}`;
}

async function main() {
  if (!commitHash) {
    throw new Error('Usage: node scripts/railway-await-github-deploy.js <commit-hash>');
  }

  assertCanonicalProject();

  const autodeploy = autodeployStatus();
  if (!autodeploy.enabled) {
    throw new Error(`Railway autodeploy is disabled. Reason: ${autodeploy.reason || 'unknown'}`);
  }

  const shortHash = commitHash.slice(0, 7);
  const timeoutMinutes = Math.max(1, Math.round(timeoutMs / 60000));
  console.log(`Waiting up to ${timeoutMinutes} minutes for Railway GitHub autodeploy to activate commit ${shortHash}...`);

  const deadline = Date.now() + timeoutMs;
  let seenTarget = false;
  let lastSummary = '';
  let lastHealthMessage = '';

  while (Date.now() < deadline) {
    const service = serviceStatus();
    const deployments = listDeployments(10);
    const latest = deployments[0];
    const target = deployments.find((deployment) => (
      deployment?.meta?.reason === 'deploy'
      && deployment?.meta?.commitHash === commitHash
    ));

    const summary = target
      ? `target=${deploymentLabel(target)} active=${service.deploymentId || 'none'} service=${service.status}`
      : `target=missing active=${service.deploymentId || 'none'} latest=${deploymentLabel(latest)}`;

    if (summary !== lastSummary) {
      console.log(`Railway autodeploy status: ${summary}`);
      lastSummary = summary;
    }

    if (target) {
      seenTarget = true;

      if (target.status === 'FAILED') {
        throw new Error(`GitHub autodeploy failed for commit ${shortHash}: ${target.id}`);
      }

      if (target.status === 'REMOVED' && service.deploymentId !== target.id) {
        throw new Error(`GitHub autodeploy ${target.id} for commit ${shortHash} was replaced before it became the active runtime.`);
      }

      if (
        service.status === 'SUCCESS'
        && service.deploymentStopped === false
        && service.replicas?.running >= 1
        && service.deploymentId === target.id
      ) {
        try {
          run('curl', ['-fsSIL', '--max-time', '20', EXPECTED.healthUrl]);
          console.log(`Railway GitHub autodeploy healthy: ${target.id}`);
          return;
        } catch (error) {
          const message = 'Railway GitHub deployment is active; waiting for HTTP health to become ready...';
          if (message !== lastHealthMessage) {
            console.log(message);
            lastHealthMessage = message;
          }
        }
      }
    }

    await sleep(5000);
  }

  if (seenTarget) {
    throw new Error(`Timed out after ${timeoutMinutes} minutes waiting for Railway GitHub autodeploy to make commit ${shortHash} healthy.`);
  }

  throw new Error(`Timed out after ${timeoutMinutes} minutes waiting for Railway to create a GitHub deployment for commit ${shortHash}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
