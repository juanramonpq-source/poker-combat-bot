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

function listDeployments(limit = 20) {
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

function serviceStatus() {
  const services = readJson('npx', ['-y', '@railway/cli', 'service', 'list', '--json']);
  const service = services.find((item) => item.id === EXPECTED.serviceId);
  if (!service) {
    throw new Error(`Railway service ${EXPECTED.serviceName} (${EXPECTED.serviceId}) was not found.`);
  }
  return service;
}

function assertCanonicalProject() {
  const status = readJson('npx', ['-y', '@railway/cli', 'status', '--json']);
  if (status.id !== EXPECTED.projectId) {
    throw new Error(`Linked Railway project is ${status.id}; expected ${EXPECTED.projectId}.`);
  }
}

function isBootstrapDeployment(deployment) {
  const command = deployment?.meta?.serviceManifest?.deploy?.startCommand || '';
  return deployment?.status === 'SUCCESS' && command.includes('railway_bootstrap.sh');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealthyDeployment(previousDeploymentId) {
  const deadline = Date.now() + 180000;
  let lastStatus = '';
  let lastHealthMessage = '';

  while (Date.now() < deadline) {
    const service = serviceStatus();
    const deployments = listDeployments(5);
    const latest = deployments[0];
    const health = `${service.status}:${service.deploymentId || 'none'}:${latest?.status || 'none'}`;

    if (health !== lastStatus) {
      console.log(`Railway status: service=${service.status}, deployment=${service.deploymentId || 'none'}, latest=${latest?.status || 'none'}`);
      lastStatus = health;
    }

    if (latest?.id !== previousDeploymentId && latest?.status === 'FAILED') {
      throw new Error(`Bootstrap refresh created a failed deployment: ${latest.id}`);
    }

    if (service.status === 'SUCCESS' && service.deploymentStopped === false && service.replicas?.running >= 1 && service.deploymentId !== previousDeploymentId) {
      try {
        run('curl', ['-fsSIL', '--max-time', '20', EXPECTED.healthUrl]);
        return service;
      } catch (error) {
        const message = 'Railway reports the deployment as running; waiting for HTTP health to become ready...';
        if (message !== lastHealthMessage) {
          console.log(message);
          lastHealthMessage = message;
        }
      }
    }

    await sleep(5000);
  }

  throw new Error('Timed out waiting for Railway bootstrap refresh to become healthy.');
}

async function main() {
  console.log('Refreshing Railway bootstrap deployment without using Railway build/upload...');
  assertCanonicalProject();

  const before = serviceStatus();
  const deployments = listDeployments(20);
  const source = deployments.find(isBootstrapDeployment);

  if (!source) {
    throw new Error('No successful bootstrap deployment found to refresh. Do not use `railway up`; inspect Railway manually.');
  }

  console.log(`Using bootstrap deployment ${source.id} as refresh source.`);

  railwayGraphql(
    `mutation($id:String!){ deploymentRollback(id:$id) }`,
    { id: source.id }
  );

  const after = await waitForHealthyDeployment(before.deploymentId);
  console.log(`Railway bootstrap refresh healthy: ${after.deploymentId}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
