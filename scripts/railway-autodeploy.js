#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const EXPECTED = {
  projectId: '99bfc6cf-9404-4555-b967-148eabff6536',
  environmentId: '63dcc12b-1ea8-4d91-b2b7-591171a20c07',
  serviceId: 'a751d925-2352-44fa-8661-7fd902d3649b'
};

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
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).replace(token, '<redacted>').trim() : '';
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    throw new Error(['Railway GraphQL request failed.', stderr, stdout].filter(Boolean).join('\n'));
  }

  const payload = JSON.parse(output);
  if (payload.errors?.length) {
    throw new Error(`Railway GraphQL returned errors:\n${JSON.stringify(payload.errors, null, 2)}`);
  }
  return payload.data;
}

function getStatus() {
  return railwayGraphql(
    `query($projectId:String!,$environmentId:String!,$serviceId:String!){
      serviceInstanceAutoDeployStatus(projectId:$projectId, environmentId:$environmentId, serviceId:$serviceId){
        enabled
        canEnable
        reason
      }
    }`,
    EXPECTED
  ).serviceInstanceAutoDeployStatus;
}

function setStatus(enabled) {
  railwayGraphql(
    `mutation($input:ServiceInstanceAutoDeployUpdateInput!){
      serviceInstanceAutoDeployUpdate(input:$input) {
        enabled
      }
    }`,
    { input: { ...EXPECTED, enabled } }
  );
}

function main() {
  const action = (process.argv[2] || 'status').toLowerCase();

  if (!['status', 'on', 'off'].includes(action)) {
    throw new Error('Usage: node scripts/railway-autodeploy.js [status|on|off]');
  }

  if (action === 'on') setStatus(true);
  if (action === 'off') setStatus(false);

  const status = getStatus();
  console.log(`Railway autodeploy: ${status.enabled ? 'enabled' : 'disabled'}`);
  if (status.reason) console.log(`Reason: ${status.reason}`);
  console.log(`Can enable: ${status.canEnable}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
