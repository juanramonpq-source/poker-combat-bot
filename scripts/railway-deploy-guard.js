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
  serviceName: 'poker-combat-bot',
  repo: 'juanramonpq-source/poker-combat-bot',
  deploymentTriggerId: '9a088756-03f2-4cb4-8827-0a2650b55082',
  customDomain: 'pocobot.online'
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

function readRailwayAccessToken() {
  const configPath = path.join(process.env.HOME || '', '.railway', 'config.json');
  if (!existsSync(configPath)) {
    throw new Error('Railway CLI config was not found. Run `railway login` before checking autodeploy.');
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const token = config.user?.accessToken || config.user?.token;
  if (!token) {
    throw new Error('Railway CLI config does not contain an access token. Run `railway login` before checking autodeploy.');
  }

  return token;
}

function railwayGraphql(query, variables) {
  const token = readRailwayAccessToken();
  let output;
  try {
    output = execFileSync('curl', [
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
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    throw new Error(['Railway GraphQL request failed.', stderr, stdout].filter(Boolean).join('\n'));
  }

  const payload = JSON.parse(output);
  if (payload.errors?.length) {
    throw new Error(`Railway GraphQL returned errors:\n${JSON.stringify(payload.errors, null, 2)}`);
  }

  return payload.data;
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
warn(serviceStatus.status === 'SUCCESS', `Latest Railway deployment is "${serviceStatus.status}". The active deployment may still be healthy, but inspect the failed/latest deploy before forcing another.`);

if (serviceInstance) {
  assert(serviceInstance.source?.repo === EXPECTED.repo, `Production service instance source repo is "${serviceInstance.source?.repo || ''}"; expected "${EXPECTED.repo}".`);
  assert(!serviceInstance.source?.image, `Production service instance still points to image "${serviceInstance.source?.image || ''}". Autodeploy needs the GitHub repo source.`);
  const activeDeployment = (serviceInstance.activeDeployments || []).find((deployment) => !deployment.deploymentStopped) || serviceInstance.activeDeployments?.[0];
  assert(activeDeployment?.status === 'SUCCESS', `Railway active deployment status is "${activeDeployment?.status || 'missing'}"; expected "SUCCESS".`);
  const startCommand = serviceInstance.startCommand || '';
  warn(startCommand === 'npm start' || startCommand.includes('railway_bootstrap.sh'), `Unexpected Railway start command: "${startCommand}".`);
}

const autoDeployStatus = railwayGraphql(
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

assert(autoDeployStatus.enabled === true, `Railway autodeploy is disabled. Reason: ${autoDeployStatus.reason || 'unknown'}.`);
assert(autoDeployStatus.canEnable === true, `Railway autodeploy cannot be enabled. Reason: ${autoDeployStatus.reason || 'unknown'}.`);

const deploymentTriggers = railwayGraphql(
  `query($projectId:String!,$environmentId:String!,$serviceId:String!){
    deploymentTriggers(projectId:$projectId, environmentId:$environmentId, serviceId:$serviceId, first:20){
      edges {
        node {
          id
          provider
          repository
          branch
          checkSuites
          projectId
          environmentId
          serviceId
        }
      }
    }
  }`,
  {
    projectId: EXPECTED.projectId,
    environmentId: EXPECTED.environmentId,
    serviceId: EXPECTED.serviceId
  }
).deploymentTriggers.edges.map((edge) => edge.node);

assert(deploymentTriggers.length === 1, `Expected exactly one Railway deployment trigger; found ${deploymentTriggers.length}.`);
if (deploymentTriggers.length === 1) {
  const trigger = deploymentTriggers[0];
  assert(trigger.id === EXPECTED.deploymentTriggerId, `Railway deployment trigger is "${trigger.id}"; expected "${EXPECTED.deploymentTriggerId}".`);
  assert(trigger.provider === 'github', `Railway deployment trigger provider is "${trigger.provider}"; expected "github".`);
  assert(trigger.repository === EXPECTED.repo, `Railway deployment trigger repo is "${trigger.repository}"; expected "${EXPECTED.repo}".`);
  assert(trigger.branch === 'main', `Railway deployment trigger branch is "${trigger.branch}"; expected "main".`);
  assert(trigger.projectId === EXPECTED.projectId, `Railway deployment trigger project is "${trigger.projectId}"; expected "${EXPECTED.projectId}".`);
  assert(trigger.environmentId === EXPECTED.environmentId, `Railway deployment trigger environment is "${trigger.environmentId}"; expected "${EXPECTED.environmentId}".`);
  assert(trigger.serviceId === EXPECTED.serviceId, `Railway deployment trigger service is "${trigger.serviceId}"; expected "${EXPECTED.serviceId}".`);
}

const domainData = railwayGraphql(
  `query($projectId:String!){
    project(id:$projectId){
      environments {
        edges {
          node {
            id
            serviceInstances {
              edges {
                node {
                  serviceId
                  domains {
                    customDomains {
                      domain
                      syncStatus
                      status {
                        verified
                        certificateStatus
                        certificateStatusDetailed
                        dnsRecords {
                          recordType
                          fqdn
                          requiredValue
                          currentValue
                          status
                          purpose
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`,
  { projectId: EXPECTED.projectId }
);

const productionEnvironment = domainData.project.environments.edges.map((edge) => edge.node).find((environment) => environment.id === EXPECTED.environmentId);
const domainServiceInstance = productionEnvironment?.serviceInstances.edges.map((edge) => edge.node).find((instance) => instance.serviceId === EXPECTED.serviceId);
const customDomain = domainServiceInstance?.domains.customDomains.find((domain) => domain.domain === EXPECTED.customDomain);
warn(Boolean(customDomain), `Custom domain "${EXPECTED.customDomain}" is not registered on the Railway service.`);
if (customDomain) {
  warn(customDomain.syncStatus === 'ACTIVE', `Custom domain "${EXPECTED.customDomain}" sync status is "${customDomain.syncStatus}".`);
  warn(customDomain.status?.verified === true, `Custom domain "${EXPECTED.customDomain}" is not verified.`);
  warn(
    customDomain.status?.certificateStatus === 'CERTIFICATE_STATUS_TYPE_VALID',
    `Custom domain "${EXPECTED.customDomain}" certificate status is "${customDomain.status?.certificateStatus || 'unknown'}".`
  );

  const staleDnsRecords = (customDomain.status?.dnsRecords || []).filter((record) => record.status !== 'DNS_RECORD_STATUS_VALID');
  warn(
    staleDnsRecords.length === 0,
    `Custom domain "${EXPECTED.customDomain}" DNS requires update:\n${staleDnsRecords.map((record) => `  - ${record.fqdn} ${record.recordType.replace('DNS_RECORD_TYPE_', '')} should point to ${record.requiredValue}; current value: ${record.currentValue || '(empty)'}`).join('\n')}`
  );
}

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
