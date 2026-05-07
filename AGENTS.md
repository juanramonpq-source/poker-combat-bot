# PoCoBOT Deployment Rule

- Railway deploys this project from `main`.
- Any change that must reach the live Railway app must be committed and pushed to `main`, not only to a `codex/...` branch.
- If work starts on a `codex/...` branch, finish by fast-forwarding or merging the validated commits into `main` and pushing `origin main`.
- Before saying "subido" for live changes, verify that `origin/main` contains the final commit.

# Story Character Debug Rule

- Whenever a new story-mode character is added, also register it in the story character catalog exposed by `poker_combat_bot_ONLINE.html` through `window.__pocobotDev.getStoryCharacters()`.
- The normal secret developer panel (`MODO_DESARROLLADOR_POCObot.html`) must show every registered story character in `Player 2 historia` so Player 2 can be swapped for that character during debug combat emulation.
- Story combat enemies with a `combatSprite` in `STORY_TOWER_COMBAT_PROFILES` are included automatically by the catalog; non-combat narrative characters must be added to the same catalog when their story asset is introduced.
