# PoCoBOT Deployment Rule

- Railway deploys this project from `main`.
- Any change that must reach the live Railway app must be committed and pushed to `main`, not only to a `codex/...` branch.
- If work starts on a `codex/...` branch, finish by fast-forwarding or merging the validated commits into `main` and pushing `origin main`.
- Before saying "subido" for live changes, verify that `origin/main` contains the final commit.
- The only valid Railway project is `Poker Combat Bot` (`99bfc6cf-9404-4555-b967-148eabff6536`), environment `production` (`63dcc12b-1ea8-4d91-b2b7-591171a20c07`), service `poker-combat-bot` (`a751d925-2352-44fa-8661-7fd902d3649b`).
- Do not run `railway init`, create a new Railway project, import the GitHub repo again, or use a random Railway environment as a workaround. If Railway is queued or broken, inspect the existing project first.
- Use `npm run railway:guard` before any production Railway action. For the current image-based workaround, use `npm run deploy:railway` after pushing `main`.
- Keep `backups/`, `assets.zip`, `*.zip`, `node_modules/`, and local generated bundles out of Railway deploys. `.railwayignore` and `.dockerignore` must preserve these exclusions.

# Story Character Debug Rule

- Whenever a new story-mode character is added, also register it in the story character catalog exposed by `poker_combat_bot_ONLINE.html` through `window.__pocobotDev.getStoryCharacters()`.
- The normal secret developer panel (`MODO_DESARROLLADOR_POCObot.html`) must show every registered story character in `Player 2 historia` so Player 2 can be swapped for that character during debug combat emulation.
- Story combat enemies with a `combatSprite` in `STORY_TOWER_COMBAT_PROFILES` are included automatically by the catalog; non-combat narrative characters must be added to the same catalog when their story asset is introduced.
