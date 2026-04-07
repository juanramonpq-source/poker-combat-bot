# 🧪 BUG #3 Testing Guide - Same-Suit Card Exchanges

**Status**: Ready for Debug Testing
**Date**: 2026-04-07
**What's New**: Console logging has been added to the game code to help identify where same-suit exchanges fail

---

## 📋 Prerequisites

1. **Local Git Repository**: You should have the poker-combat-bot folder with Git configured
2. **Browser Console Access**: Knowledge of opening browser console (F12 or Cmd+Option+I on Mac)
3. **Two Browsers or Tabs Ready** (for online testing)

---

## 🚀 Setup: Push Changes to Production

Since the network proxy blocks `git push` from the terminal, do this from your local machine:

### Step 1: Pull Latest Changes

```bash
cd /path/to/poker-combat-bot
git pull origin main
```

### Step 2: Push to GitHub

```bash
git push origin main
```

**Railway** will auto-deploy in 2-5 minutes. You'll see the deployment progress in Railway dashboard.

---

## 🧪 Test Scenario #1: Simple Same-Suit Exchange (Clubs)

### Setup
1. Open browser console (F12)
2. Navigate to: `https://poker-combat-bot-production.up.railway.app/poker_combat_bot_ONLINE.html`
3. Create a new game
4. Play until you have:
   - **Board**: A club card (any rank) in the armor module
   - **Hand**: Another club card (any rank)

**Example**: Armor has 5♣, hand has 3♣

### Test Steps
1. **Select both cards**:
   - Click on 5♣ (on the board)
   - Click on 3♣ (in hand)
2. **Click "MODIFICAR" button**
3. **Check browser console** for the following debug output:

```
[DEBUG-MODIFY] === Starting modifyMecha ===
[DEBUG-MODIFY] Selected cards:
[DEBUG-MODIFY]   - Hand cards: ["3♣"]
[DEBUG-MODIFY]   - Board cards: ["5♣ from armor"]
[DEBUG-MODIFY]   - Total operations: 2 (limit: 3)
[DEBUG-MODIFY] Discarding board cards...
[DEBUG-MODIFY]   Removing: 5♣ from armor
[DEBUG-MODIFY]   Before remove - armor: 1
[DEBUG-MODIFY]   After remove - armor: 0
[DEBUG-MODIFY] Placing hand cards...
[DEBUG-MODIFY]   Removing from hand: 3♣
[DEBUG-MODIFY]   Hand before remove: 5
[DEBUG-MODIFY]   Hand after remove: 4
[DEBUG-MODIFY]   Attempting placement...
[DEBUG-PLACE] placeCardOnBoard called for: 3♣
[DEBUG-AUTO] chooseAutomaticTarget for: 3♣
[DEBUG-TARGETS] allowedModuleTargets for: 3♣
[DEBUG-TARGETS]   Suit ♣ maps to module: armor
[DEBUG-TARGETS]   Current counts: {attack: 0, defense: 0, armor: 0}
[DEBUG-TARGETS]   Counts after simulating placement: {attack: 0, defense: 0, armor: 1}
[DEBUG-TARGETS]   Overflow result: {totalOverflow: 0, overflow: {}}
```

### What to Look For

**Success Indicators**:
- ✅ Overflow = 0 (no overflow detected)
- ✅ Card is placed in armor
- ✅ No error messages

**Failure Indicators**:
- ❌ `Overflow result: {totalOverflow: 1}` (overflow detected when shouldn't be)
- ❌ Error message: "Ese módulo no tiene hueco libre"
- ❌ Final log says "ERROR:" with reason

---

## 🧪 Test Scenario #2: Same-Suit Exchange (Spades - Attack)

### Setup
1. Have spade card on board in attack module
2. Have another spade in hand

**Example**: Attack has 7♠, hand has 2♠

### Test Steps
1. Select both 7♠ (board) and 2♠ (hand)
2. Click "MODIFICAR"
3. Check console output

### Expected Result
- Should succeed
- Should show: "Counts after simulating placement: {attack: 1, ...}"
- Should show: "totalOverflow: 0"

---

## 🧪 Test Scenario #3: Same-Suit Exchange (Hearts - Defense)

### Setup
1. Have heart card on board in defense module
2. Have another heart in hand

**Example**: Defense has 6♥, hand has 9♥

### Test Steps
1. Select both cards
2. Click "MODIFICAR"
3. Check console output

### Expected Result
- Should succeed like Test #1 and #2

---

## 🧪 Test Scenario #4: Different-Suit Exchange (Control Test)

### Setup
1. Have club on board (armor module): 5♣
2. Have spade in hand: 7♠
3. This SHOULD also work (cards go to their respective modules)

### Test Steps
1. Select 5♣ (armor) and 7♠ (hand)
2. Click "MODIFICAR"
3. Expected: Both work fine

---

## 📊 Console Log Interpretation Guide

### Looking for Overflow Issues

**Key Section**:
```
[DEBUG-TARGETS]   Current counts: {attack: X, defense: Y, armor: Z}
[DEBUG-TARGETS]   Counts after simulating placement: {attack: X, defense: Y, armor: Z+1}
[DEBUG-TARGETS]   Overflow result: {totalOverflow: ???, overflow: {...}}
```

**Analysis**:
- If counts look correct and totalOverflow = 0 → placement should succeed
- If totalOverflow > 0 → this is where it's failing

### Looking for Limit Issues

**Key Section**:
```
[DEBUG-FLEX]   Limits: {attack: {max: 2, ...}, defense: {max: 2, ...}, armor: {max: 2, ...}}
```

**Check**:
- Are limits what you expect? (Usually 2 for each)
- Could a pilot/booster be changing limits?

### Tracing a Failed Placement

If placement fails, look for:
1. **Where placeCardOnBoard returns error**:
   - Line with `[DEBUG-PLACE] ERROR:`
2. **What the error reason is**
3. **Work backwards to find why**:
   - Was the module invalid?
   - Was there overflow?

---

## 🔍 Debugging Questions to Answer

Use the console output to answer:

1. **Are cards being removed correctly?**
   - Check: Before/after counts for board card removal
   - Example: "Before remove - armor: 1" → "After remove - armor: 0"

2. **Is the hand card count correct?**
   - Check: Hand card removal logs
   - Example: "Hand before remove: 5" → "Hand after remove: 4"

3. **Are module limits what's expected?**
   - Check: Limits in `[DEBUG-FLEX]` output
   - Default should be: max: 2 for each module

4. **Is overflow being calculated correctly?**
   - Check: Current counts vs counts after simulating placement
   - If armor had 0, adding 1 should result in 1 (no overflow)

5. **At what point does placement fail?**
   - Check: Where the first ERROR appears
   - Could be in chooseAutomaticTarget or allowedModuleTargets

---

## 📋 Testing Checklist

- [ ] Pushed changes from local machine to GitHub
- [ ] Railway has deployed (check dashboard)
- [ ] Opened browser console
- [ ] Navigated to live server URL
- [ ] Created game and got cards in position
- [ ] Tested Scenario #1 (clubs)
- [ ] Tested Scenario #2 (spades)
- [ ] Tested Scenario #3 (hearts)
- [ ] Tested Scenario #4 (different suits)
- [ ] Collected console output from failed case
- [ ] Identified where exchange is failing

---

## 📝 After Testing

Once you've run these tests and identified where the issue is:

1. **Share the console output** for a failed case
2. **Note which scenario fails** (clubs, spades, hearts, or all)
3. **Provide the error logs** showing exact failure point
4. **I'll implement the fix** based on the debugging results

---

## 🎯 Expected Outcomes

### If All Tests Pass
- Same-suit exchanges already work! Bug was false positive.
- Move on to testing Bugs #1 and #2

### If Tests Fail on Same-Suit Only
- Confirms the bug exists
- Console logs will show exact issue
- Could be:
  - Overflow validation too strict
  - Card count calculation wrong
  - Module limits affected by pilot/booster

### If Tests Fail on All Exchanges
- Broader issue than same-suit only
- Likely something in general placement logic

---

## 🚨 Troubleshooting

**Issue**: Console shows no DEBUG logs
- **Solution**: Make sure you're on the updated version (check cache, do full refresh Cmd+Shift+R)

**Issue**: Can't see console output
- **Solution**: Make sure console is open before clicking MODIFICAR (open with F12 first)

**Issue**: Changes not deployed on server
- **Solution**: Check Railway dashboard for deployment status (may still be in progress)

**Issue**: Can't push to GitHub
- **Solution**: Make sure you have git configured on local machine with SSH keys or use HTTPS with token

---

## 📞 Next Steps

Once testing is complete:
1. Save console output
2. Share results
3. I'll implement fix based on findings
4. Move on to Bug #1 (Card Duplication)

---

*Last Updated: 2026-04-07*
*Ready for Testing*
