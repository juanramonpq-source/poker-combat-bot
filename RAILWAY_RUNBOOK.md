# Railway Runbook PoCoBOT

This repo must deploy to one Railway project only.

## Source of Truth

- Project: `Poker Combat Bot`
- Project ID: `99bfc6cf-9404-4555-b967-148eabff6536`
- Environment: `production`
- Environment ID: `63dcc12b-1ea8-4d91-b2b7-591171a20c07`
- Service: `poker-combat-bot`
- Service ID: `a751d925-2352-44fa-8661-7fd902d3649b`
- GitHub repo: `juanramonpq-source/poker-combat-bot`
- GitHub branch: `main`
- Deployment trigger: `a3a8b836-2525-44e6-b868-50540b18f869`
- Railway domain: `https://pocobot.up.railway.app/`
- Custom domain: `https://pocobot.online/`
- Custom domain traffic target: `3u23ystj.up.railway.app`

## Safe Deploy Flow

This working folder is intentionally allowed to be messy. Production pushes should come from the generated clean release folder, not from this dirty tree.

Use this flow for production changes that must reach Railway:

```sh
git checkout main
git pull --ff-only origin main
# make the change in the working folder
npm run clean:push
npm run railway:guard
```

`npm run clean:push` syncs a whitelist of runtime files into `../codex/PoCoBOT Limpio`, commits from that clean repository, pushes `origin main`, and then runs the Railway guard. Use `npm run clean:sync` to regenerate the clean folder without pushing.

Railway autodeploy is enabled for `main`, so a normal pushed commit from the clean release repo is the first deployment path. `npm run clean:push` now waits up to 15 minutes for that GitHub deployment to become the active healthy runtime and only falls back to `npm run railway:bootstrap-refresh` if the deploy fails or stays stuck past that timeout. That fallback does not use Railway builds or `railway up`; it restarts the known-good bootstrap runtime so it pulls the latest `main` from GitHub even when Railway is rejecting new builds because the workspace has hit its concurrent-build limit.

Run `npm run railway:guard` after pushing to verify that local `HEAD` matches `origin/main`, that the Railway link points to the official project, that there is exactly one active Railway project, that GitHub autodeploy is enabled, that the custom domain is healthy, and that backup archives are excluded from deploys.

While Railway is rejecting builds with the concurrent-build limit, keep normal GitHub autodeploy disabled:

```sh
npm run railway:autodeploy:off
```

During this bootstrap recovery period, `npm run clean:push` still publishes live changes by pushing `main`. If GitHub autodeploy fails or stalls, the command automatically refreshes the bootstrap deployment as a fallback. Re-enable normal Railway builds only after the queue is healthy:

```sh
npm run railway:autodeploy:on
POCOBOT_REQUIRE_RAILWAY_AUTODEPLOY=1 npm run railway:guard
```

Use `npm run railway:redeploy` only when a pushed commit did not trigger Railway or when you intentionally need a manual redeploy of the current GitHub source.

## Current Railway Mode

Railway is currently connected to GitHub:

- Source repo: `juanramonpq-source/poker-combat-bot`
- Branch: `main`
- Autodeploy: enabled
- Deployment trigger: exactly one trigger for `production` / `poker-combat-bot`

The running app may still be served by the last successful emergency deployment that used the public base image `node:18-alpine`. The service itself now points back to GitHub, so the next successful GitHub/Railway deploy will replace that runtime.

The service start command still downloads and executes `railway_bootstrap.sh` from `main`. That script clones this repo with sparse checkout, installs production dependencies, and runs `npm start`. This keeps the recovery path compatible while we finish stabilizing the normal Railway build queue.

## Do Not Do This

- Do not click Railway "New Project" to redeploy this repo.
- Do not import `juanramonpq-source/poker-combat-bot` again from the Railway dashboard.
- Do not run `railway init` in this repo.
- Do not run `railway up` from the full repo root while the repo contains heavy local assets or backups.
- Do not run `railway up` as a recovery shortcut. This repo is too large for direct CLI upload and can create accidental temporary Railway projects.
- Do not create a new service or environment to fix a queue. First inspect the existing project.
- Do not push this working folder directly when the user wants a production release. Use `npm run clean:push`.

## If Railway Gets Stuck Again

1. Run `npm run railway:guard`.
2. Run `npx -y @railway/cli deployment list --service poker-combat-bot --environment production --limit 10 --json`.
3. Check logs with `npx -y @railway/cli logs --service poker-combat-bot --environment production --latest --lines 200 --json`.
4. Check app health with `curl -L https://pocobot.up.railway.app/`.
5. If the newest deploy failed with "number of concurrent builds", do not create a new project and do not run `railway up`. Run `npm run railway:bootstrap-refresh` from the clean release folder to restart the known-good bootstrap deployment.
6. If the app is alive on the Railway domain but not `pocobot.online`, treat it as domain/DNS/TLS, not an app deploy problem. The live HTTPS response on `pocobot.online` is the source of truth, even if Railway's internal DNS metadata briefly lags.

## Heavy Files Policy

Production may serve `assets/Historia/**`, but local archives and backup folders must not be deployed:

- `backups/`
- `assets.zip`
- `*.zip`
- `node_modules/`

These are blocked in `.railwayignore`, `.dockerignore`, and `.gitignore`.

## Returning to Normal Railway Builds

Only return from the bootstrap start command to plain `npm start` after:

1. The Railway build queue is healthy.
2. `npm run railway:guard` passes.
3. A test deploy proves `.railwayignore` excludes local archives and backups.
4. The service still points to the single official project/service listed above.
