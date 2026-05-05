# 🔍 BUG #3 INVESTIGATION: Same-Suit Card Exchanges - Detailed Analysis

**Status**: Investigation in Progress
**Bug**: Same-suit card exchanges don't work (e.g., 5♣ for 3♣, 5♠ for 2♠)
**Severity**: Moderate - Limits player strategy
**Date**: 2026-04-07

---

## Problem Statement

When a player tries to exchange a card on the board with another card of the same suit from their hand (e.g., replacing 5♣ in armor with 3♣ from hand), the exchange fails silently. Nothing happens - no error, no success.

**Example Scenario**:
- Board State: 5♣ is in the armor module
- Hand: Player has 3♣ (among other cards)
- Action: Select both 5♣ (board) and 3♣ (hand), click "MODIFICAR"
- Expected: 5♣ discarded, 3♣ placed in armor
- Actual: Nothing happens, button does nothing

---

## Code Flow Analysis

### 1. Selection Phase (No validation preventing same-suit selection)

**Function**: `toggleSelect()` (lines 4269-4305)
- ✅ No validation prevents selecting cards of the same suit
- ✅ Cards can be selected from different zones (hand + board)
- ✅ Multiple card selections are allowed

**Conclusion**: Selection phase is NOT the problem

### 2. Button Enablement (Appears to validate correctly)

**Function**: `canModifySelection()` (lines 5911-5920)
```javascript
const handCards = state.selected.filter(s => s.zone==='hand');
const boardCards = state.selected.filter(s => s.zone!=='hand');
const operations = handCards.length + boardCards.length;
return operations>0 && operations<=opsLimit;
```

- ✅ No suit-based validation
- ✅ Only checks operation count (≤3 on turn 1, ≤2 after)

**Conclusion**: Button enablement logic is NOT the problem

### 3. Modification Logic (Complex, potential issue here)

**Function**: `modifyMecha()` (lines 4422-4530)

#### Case 1: Core Exchange (lines 4444-4485)
**Condition**: `handCards.length===1 && coreBoardCards.length===1`
- Handles only exchanges of core pieces (pilot, copilot, booster)
- NOT triggered for module exchanges

#### Case 2: General Placement (lines 4487-4530)
**Flow**:
```
1. Remove all board cards from player state (lines 4488-4493)
   → 5♣ removed from armor
   → armor.length decreases by 1

2. For each hand card, try placement (lines 4497-4514):
   a. Remove from hand (line 4498)
   b. Call placeCardOnBoard(player, card)
      - Validates card can go in module
      - Adds to module if validation passes
```

**Key Question**: What happens during validation in step 2b?

### 4. Placement Validation (Most Likely Issue Location)

**Function**: `placeCardOnBoard()` (lines 4358-4376)

When called during `modifyMecha()`:
```javascript
function placeCardOnBoard(player, card, preferredZone=null){
  let zone = preferredZone;
  if(!zone) zone = chooseAutomaticTarget(player, card);  // LINE 4360
  if(!zone){
    return { ok:false, reason:`No hay hueco legal para ${cardText(card)}.` };
  }
  // ...
  if(MODULE_KEYS.includes(zone) || zone==='fuel'){
    const moduleTargets = allowedModuleTargets(card, player);  // LINE 4370
    if(!moduleTargets.includes(zone)) {
      return { ok:false, reason:`Ese módulo no tiene hueco libre para ${cardText(card)}.` };  // LINE 4371
    }
  }
  pushCardToZone(player, zone, card);  // LINE 4373
  return { ok:true, zone };
}
```

**Potential Issues**:

1. **`chooseAutomaticTarget()` returns null** (line 4360)
   - Function: lines 4347-4357
   - Gets module targets from `allowedModuleTargets(card, player)`
   - Returns null if no valid targets found
   - If returns null → error at line 4365

2. **`allowedModuleTargets()` returns empty array** (line 4354)
   - Function: lines 4223-4233
   - Checks: is card a figure? (returns [] if yes)
   - Checks: card suit in SUIT_TO_MODULE? (returns [] if no)
   - **Simulates adding card**: increments module count
   - **Checks overflow**: calls `findBestFlexAssignment()`
   - Returns [] if overflow detected, [module] if no overflow

### 5. Overflow Calculation (Probable Root Cause)

**Function**: `allowedModuleTargets()` (lines 4223-4233)
```javascript
const module = SUIT_TO_MODULE[card.suit];  // 'armor' for ♣
const counts = getModuleCountsSnapshot(player);
counts[module] += 1;  // Simulates adding 1 card
const best = findBestFlexAssignment(player, counts);
if(best.totalOverflow === 0) return [module];  // ONLY if no overflow
return [];  // Overflow detected!
```

**The Problem May Be**:

When checking if 3♣ can be placed in armor:
- Current counts: `{ armor: X, ... }`
- After simulated addition: `{ armor: X+1, ... }`
- Module limits: `{ armor: 2, ... }` (default, can be higher with pilot/booster)
- If X+1 > 2, overflow detected → returns []

**But wait**, X should be 1 (after removing 5♣), so X+1 = 2, which should NOT overflow!

Unless... **the card isn't actually being removed before the simulation?**

---

## Hypotheses

### Hypothesis 1: Card Not Actually Removed Before Check
**Location**: Line 4498 in `modifyMecha()`
```javascript
removeById(player.hand, card.id);  // Is this actually working?
placeCardOnBoard(player, card);
```
**Test**: Check if `removeById()` is properly removing the card

### Hypothesis 2: Module Count Incorrect After Board Card Removal
**Location**: Lines 4488-4493 in `modifyMecha()`
```javascript
moduleDiscardCards.forEach(c => {
  const removed = popCardFromZone(player, c.zone, c.id);  // Is this working?
  if(removed) state.discard.push(removed);
});
```
**Test**: Check if `popCardFromZone()` is properly removing cards

### Hypothesis 3: Player Object State Corruption
**Possibility**: Player object is being mutated incorrectly, causing counts to be wrong

**Test**: Add logging to trace module counts at each step

### Hypothesis 4: Different Module Limit Than Expected
**Location**: `getFixedModuleLimits()` (lines 4107-4139)
**Possibility**: Armor limit is lower than expected due to pilot/booster configuration

**Test**: Check what the actual limits are during the test

### Hypothesis 5: Validation Check Issue
**Location**: Line 4370-4371
**Possibility**: `allowedModuleTargets()` is being called twice and returning different results

**Test**: Add logging to see what `allowedModuleTargets()` returns

---

## Investigation Plan

### Step 1: Add Console Logging
Insert logging statements to trace the exact values at each step:

```javascript
function modifyMecha(){
  // ... existing code ...
  const moduleDiscardCards = boardCards.filter(c => MODULE_KEYS.includes(c.zone) || c.zone==='fuel');

  console.log('[DEBUG] Before discard:', player[currentModule].length);  // e.g., armor: 1

  // Discard phase
  moduleDiscardCards.forEach(c => {
    const removed = popCardFromZone(player, c.zone, c.id);
    if(removed) state.discard.push(removed);
    console.log('[DEBUG] After removing', c.rank+c.suit, ':', player[c.zone].length);
  });

  // Placement phase
  for(const card of handCards){
    removeById(player.hand, card.id);
    console.log('[DEBUG] Trying to place:', card.rank+card.suit, 'into', currentModule);
    console.log('[DEBUG] Module count before placement:', player[currentModule].length);

    const result = placeCardOnBoard(player, card);
    console.log('[DEBUG] Placement result:', result);

    if(!result.ok) {
      console.log('[DEBUG] FAILED - Reason:', result.reason);
      // ... error handling ...
    }
  }
}
```

### Step 2: Test Scenarios

**Scenario A** (Simple same-suit exchange):
- Armor: [5♣]
- Hand: [3♣, other cards]
- Select: 5♣ + 3♣, click MODIFICAR
- Expected: 5♣ discarded, 3♣ placed
- Check logs for failure point

**Scenario B** (Module not full):
- Armor: [5♣, 6♣]  (2 cards, at max)
- Hand: [3♣]
- Select: any card from armor + 3♣, click MODIFICAR
- Expected: Success
- Check if it works when swapping with multiple cards

**Scenario C** (Different suits):
- Armor: [5♣]
- Attack: [7♠]
- Hand: [3♥]
- Select: 5♣ + 3♥, click MODIFICAR
- Expected: 5♣ discarded, 3♥ placed in armor
- Check if different-suit exchanges work

### Step 3: Check Helper Functions

- Test `removeById()` function directly
- Test `popCardFromZone()` function directly
- Test `getModuleCountsSnapshot()` function directly
- Test `allowedModuleTargets()` function directly with test data

### Step 4: Monitor Limits

Add logging to `getFixedModuleLimits()` to confirm:
- Default limits
- Limits affected by pilot/booster

---

## Suspected Root Causes (in order of likelihood)

1. **Overflow validation logic is too strict** (60% probability)
   - Maybe checking against wrong module
   - Maybe not accounting for current card count correctly
   - Maybe copilot/booster affecting limits unexpectedly

2. **Card removal not working properly** (20% probability)
   - `removeById()` not removing from correct array
   - `popCardFromZone()` not removing correctly
   - Card reference issue

3. **Validation called with wrong player state** (15% probability)
   - Maybe player object not updated in time
   - Maybe mutation issue

4. **UI issue preventing selection** (5% probability)
   - Cards can't be selected from board for same-suit exchanges
   - But this seems unlikely based on code review

---

## Next Actions

1. **Enable debug mode**: Add comprehensive console logging
2. **Test locally**: Reproduce the bug with logging
3. **Identify exact failure point**: Use logs to pinpoint where validation fails
4. **Fix root cause**: Once identified, implement fix
5. **Verify online**: Test fix works in multiplayer mode

---

## Code Files to Review

- `modifyMecha()` (lines 4422-4530) - Main logic
- `placeCardOnBoard()` (lines 4358-4376) - Validation
- `allowedModuleTargets()` (lines 4223-4233) - Overflow check
- `findBestFlexAssignment()` (lines 4171-4199) - Flex assignment
- `removeById()` (lines 4310-4314) - Card removal
- `popCardFromZone()` (lines 4321-4334) - Zone removal
- `getFixedModuleLimits()` (lines 4107-4139) - Limit definition

---

*Last Updated: 2026-04-07*
*Status: Awaiting debug testing*
