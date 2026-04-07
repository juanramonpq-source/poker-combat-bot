# 🧪 BUG #3 Quick Test - Same-Suit Card Exchanges

**Date**: 2026-04-07
**What to do**: Quick offline test to identify the exact problem

---

## 🚀 Quick Test (5 minutes)

### Setup
1. Push code to GitHub from your local machine:
   ```bash
   cd poker-combat-bot
   git push origin main
   ```

2. Wait for Railway deployment (2-5 minutes)

3. Open game in offline mode:
   - Navigate to: `https://poker-combat-bot-production.up.railway.app/poker_combat_bot_ONLINE.html`
   - Click "Comenzar Juego" for offline/local game
   - Play normally to get cards

### Test Scenario: Simple Same-Suit Exchange

**Get to this state**:
- Any card in armor module (e.g., 5♣)
- Any card of SAME suit in hand (e.g., 3♣)

**Step-by-step**:
1. Open browser console (F12)
2. Make sure console is visible and empty (scroll to top)
3. Click on the armor card (5♣)
4. Click on the hand card (3♣)
5. **Write down these console messages** before clicking MODIFICAR:
   - Look for any red errors
   - Any warnings
6. Click "MODIFICAR" button
7. **Capture the console output** that appears

---

## 📝 What To Look For In Console

### Success Scenario (What SHOULD appear):
```
[DEBUG-MODIFY] === Starting modifyMecha ===
[DEBUG-MODIFY] Selected cards:
[DEBUG-MODIFY]   - Hand cards: ["3♣"]
[DEBUG-MODIFY]   - Board cards: ["5♣ from armor"]
[DEBUG-MODIFY] Discarding board cards...
[DEBUG-MODIFY]   Removing: 5♣ from armor
[DEBUG-MODIFY]   Before remove - armor: 1
[DEBUG-MODIFY]   After remove - armor: 0
[DEBUG-MODIFY] Placing hand cards...
[DEBUG-MODIFY]   Hand before remove: (some number)
[DEBUG-MODIFY]   Attempting placement...
[DEBUG-PLACE] placeCardOnBoard called for: 3♣
[DEBUG-AUTO] chooseAutomaticTarget for: 3♣
[DEBUG-TARGETS] allowedModuleTargets for: 3♣
[DEBUG-TARGETS]   Module targets: ["armor"]
[DEBUG-PLACE]   Validation passed, pushing card to armor
```

Expected result: **Card appears in armor module** ✅

### Failure Scenario (What happens if BROKEN):
Look for any `[DEBUG-PLACE] ERROR:` message with reason

Examples:
- `ERROR: Ese módulo no tiene hueco libre para 3♣`
- `ERROR: No hay hueco legal para 3♣`

---

## ⚠️ Three Possible Outcomes

### Outcome 1: Exchange Works Fine
- 5♣ removed from armor
- 3♣ added to armor
- **Status**: Bug might be fixed or scenario-dependent

### Outcome 2: Card Duplicates (Bug #1 + Bug #3)
- 5♣ removed from armor
- 3♣ appears TWICE in armor
- **Status**: This is the duplication bug, related problem

### Outcome 3: Placement Fails (Pure Bug #3)
- 5♣ removed from armor
- ERROR: Ese módulo no tiene hueco libre
- **Status**: Overflow validation is rejecting valid placement

---

## 📸 How To Capture Console Output

### Option A: Screenshot
- Take screenshot of entire console
- Share with me

### Option B: Copy-Paste
- Right-click in console
- Select "Save as"
- Save the logs as a file

### Option C: Direct Text
- Triple-click to select all console text
- Copy (Ctrl+C or Cmd+C)
- Paste in our conversation

---

## 🎯 Next Steps After Test

1. **Run the test** (takes ~2 minutes)
2. **Share the console output**
3. **Tell me which outcome happened**
   - Works fine?
   - Card duplicated?
   - Placement failed?
4. **I'll implement fix** based on results

---

## 💡 If Console Is Empty

If you don't see ANY debug messages:
- Refresh the page (Ctrl+R or Cmd+R)
- Make sure you're on the right domain
- Make sure Railway deployed the changes
- Check Railway dashboard for deployment status

---

## ⏱️ Time Estimate
- Setup: 5 minutes
- Test: 1 minute
- Capture output: 1 minute
- **Total**: ~7 minutes

---

*Ready when you are!*
