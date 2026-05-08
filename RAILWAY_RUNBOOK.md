# Railway Runbook PoCoBOT

This repo must deploy to one Railway project only.

## Source of Truth

- Project: `Poker Combat Bot`
- Project ID: `99bfc6cf-9404-4555-b967-148eabff6536`
- Environment: `production`
- Environment ID: `63dcc12b-1ea8-4d91-b2b7-591171a20c07`
- Service: `poker-combat-bot`
- Service ID: `a751d925-2352-44fa-8661-7fd902d3649b`
- Railway domain: `https://pocobot.up.railway.app/`
- Custom domain: `https://pocobot.online/`

## Safe Deploy Command

Use this flow for production changes:

```sh
git checkout main
git pull --ff-only origin main
git push origin main
npm run deploy:railway
```

`npm run deploy:railway` first runs `npm run railway:guard`. The guard fails if the local Railway link points to the wrong project, if `main` has not been pushed, if duplicate active Railway projects exist, or if backup archives would be included in deploys.

## Current Railway Mode

Railway is currently using the public base image `node:18-alpine`.

The service start command downloads and executes `railway_bootstrap.sh` from `main`. That script clones this repo with sparse checkout, installs production dependencies, and runs `npm start`.

This bypasses Railway build slots. It is a recovery workaround, not the ideal long-term deployment model.

## Do Not Do This

- Do not click Railway "New Project" to redeploy this repo.
- Do not import `juanramonpq-source/poker-combat-bot` again from the Railway dashboard.
- Do not run `railway init` in this repo.
- Do not run `railway up` from the full repo root while the repo contains heavy local assets or backups.
- Do not create a new service or environment to fix a queue. First inspect the existing project.

## If Railway Gets Stuck Again

1. Run `npm run railway:guard`.
2. Run `npx -y @railway/cli deployment list --service poker-combat-bot --environment production --limit 10 --json`.
3. Check logs with `npx -y @railway/cli logs --service poker-combat-bot --environment production --latest --lines 200 --json`.
4. Check app health with `curl -L https://pocobot.up.railway.app/`.
5. If the app is alive on the Railway domain but not `pocobot.online`, treat it as domain/DNS/TLS, not an app deploy problem.

## Heavy Files Policy

Production may serve `assets/Historia/**`, but local archives and backup folders must not be deployed:

- `backups/`
- `assets.zip`
- `*.zip`
- `node_modules/`

These are blocked in `.railwayignore`, `.dockerignore`, and `.gitignore`.

## Returning to Normal Railway Builds

Only return from image-based runtime bootstrap to normal GitHub/Railway builds after:

1. The Railway build queue is healthy.
2. `npm run railway:guard` passes.
3. A test deploy proves `.railwayignore` excludes local archives and backups.
4. The service still points to the single official project/service listed above.
