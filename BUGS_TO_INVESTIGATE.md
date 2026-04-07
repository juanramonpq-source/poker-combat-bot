# 🐛 KNOWN BUGS - INVESTIGATION GUIDE

**Status**: Pre-existing bugs in game logic (both offline and online modes)
**Priority**: Medium (non-critical, gameplay still works)
**Severity**: Low to Medium
**Affected Modes**: Both Offline and Online (inherited from base game logic)

---

## BUG #1: Card Duplication During Exchange

### Description
When exchanging one card for another (e.g., replacing 5♣ with 3♣), the incoming card duplicates and can be selected twice for panel placement.

**Reproduction Steps**:
1. Have a card on the board (e.g., 5♣ in a module)
2. Select a replacement card from hand (e.g., 3♣)
3. Click "MODIFICAR" to confirm exchange
4. The incoming card (3♣) appears twice
5. Both copies can be selected for panel placement

### Root Cause (Suspected)
The problem likely occurs in the card exchange logic in `modifyMecha()` (lines 4444-4485):

```javascript
// Potential issue areas:
const removedCore = popCardFromZone(player, targetCore.zone, targetCore.id);  // Line 4462
removeById(player.hand, fromHand.id);  // Line 4463
pushCardToZone(player, targetCore.zone, fromHand);  // Line 4464
```

Possible causes:
1. `removeById()` not properly removing the card from hand
2. The card object being referenced twice in state
3. `state.selected` containing duplicate references to the same card

### Investigation Steps
1. Add console logging to verify card removal:
   ```javascript
   console.log('Before removeById:', player.hand.map(c => c.id));
   removeById(player.hand, fromHand.id);
   console.log('After removeById:', player.hand.map(c => c.id));
   ```
2. Verify `state.selected` doesn't have duplicates
3. Check if card IDs are being generated uniquely

### Files to Review
- `modifyMecha()` (lines 4419-4530)
- `removeById()` (lines 4310-4314)
- `popCardFromZone()` (lines 4321-4334)
- `pushCardToZone()` (lines 4335-4345)

---

## BUG #2: Projectile-Only Attack Timing

### Description
The "projectile-only" attack should be locked until the first complete attack occurs. However, it can be used earlier, allowing players to send projectiles without completing the mecha first.

**Expected Behavior**:
1. First attack must be a complete attack (armor + core complete)
2. After first attack, "projectile-only" becomes available
3. Players can then use projectiles without full mecha

**Actual Behavior**:
- "Projectile-only" is available immediately
- Players can use projectiles before first attack
- No enforceement of the "first attack" rule

### Root Cause (Suspected)
The unlock condition for "projectile-only" is probably not being tracked or validated correctly.

Likely issue in `confirmAttack()` (lines 5111+):
```javascript
if(projectileOnly && !state.projectileUnlocked){
  return notifySelection('El ataque por proyectil se desbloquea cuando el primer mecha queda completamente operativo.');
}
```

This check exists, but `state.projectileUnlocked` might:
1. Not be initialized correctly
2. Be set to true too early
3. Be synchronized incorrectly in multiplayer

### Investigation Steps
1. Search for where `projectileUnlocked` is set:
   ```bash
   grep -n "projectileUnlocked.*=.*true" poker_combat_bot_ONLINE.html
   ```
2. Verify it's only set after first complete attack
3. Check if state is synchronized correctly in multiplayer

### Files to Review
- `confirmAttack()` (lines 5111+)
- Search for `projectileUnlocked` initialization
- `finishModifyTurn()` or attack resolution logic
- `refreshProjectileUnlock()` (line 4955 - appears to be empty!)

---

## BUG #3: Same-Suit Card Exchanges

### Description
Exchanges between cards of the same suit don't work:
- Spades for spades
- Clubs for clubs
- Hearts for hearts
- Diamonds for diamonds

**Expected Behavior**:
Players should be able to exchange cards of the same suit between hand and board.

**Actual Behavior**:
Nothing happens when attempting same-suit exchanges.

### Root Cause (Suspected)
The validation logic in `modifyMecha()` might be rejecting valid same-suit exchanges.

Likely issue in lines 4444-4485 or in validation functions like:
- `canCoreCardReplace()` (lines 4377-4381)
- `getOverflowAfterCoreReplacement()` (lines 4383-4396)

These functions might have logic like:
```javascript
if (targetCore.suit === incomingCard.suit) {
  return false; // WRONG - should allow same suit
}
```

Or the issue could be in module targeting logic that prevents same-suit placement.

### Investigation Steps
1. Check `canCoreCardReplace()` for suit restrictions:
   ```bash
   grep -A 10 "function canCoreCardReplace" poker_combat_bot_ONLINE.html
   ```
2. Check `allowedModuleTargets()` for suit filtering
3. Look for any "same suit" checks that might be rejecting valid placements
4. Test if the issue is in validation or in actual placement

### Files to Review
- `canCoreCardReplace()` (lines 4377-4381)
- `getOverflowAfterCoreReplacement()` (lines 4383-4396)
- `modifyMecha()` main logic (lines 4444-4530)
- `placeCardOnBoard()` (lines 4358+)
- Module targeting logic

---

## 🔍 INVESTIGATION PRIORITY

1. **Bug #3 (Same-Suit Exchanges)** - Most straightforward, likely validation issue
2. **Bug #1 (Card Duplication)** - Medium complexity, might be synchronization-related
3. **Bug #2 (Projectile Timing)** - Medium complexity, flag tracking issue

---

## 🛠️ TESTING APPROACH

### For Each Bug:
1. **Offline Mode Testing** (simpler to debug)
   - No multiplayer complications
   - Can focus purely on game logic
   - Check browser console for errors

2. **Online Mode Testing** (after offline fix)
   - Verify fix works in multiplayer
   - Check state synchronization
   - Confirm both players see consistent behavior

3. **Console Logging**
   - Add detailed logs at each step
   - Log `state.selected`, card movements, etc.
   - Check for data consistency

### Debug Checklist:
- [ ] Reproduce bug consistently
- [ ] Add console logs at suspicious points
- [ ] Verify data structures (arrays, objects) are correct
- [ ] Check for null/undefined references
- [ ] Verify ID uniqueness
- [ ] Test with both players (online)
- [ ] Test with 1-player (offline)

---

## 📝 NOTES

### Why These Bugs Appeared
These appear to be edge cases in the card manipulation logic that weren't caught during initial development. They manifest in specific scenarios:
- Bug #1: Only during specific card exchanges
- Bug #2: Specific game state scenario (using projectile before first attack)
- Bug #3: Specific card suit scenario (same-suit exchanges)

### Why They Don't Break Multiplayer
- The core synchronization logic works perfectly
- These bugs are in the base game logic, not in multiplayer communication
- Multiplayer correctly propagates whatever the buggy offline logic does

### Impact on Gameplay
- **Bug #1**: Minor - duplicated card might confuse players but game continues
- **Bug #2**: Minor - players can use projectiles "early" but game balance affected
- **Bug #3**: Moderate - players can't use certain valid exchanges, limits strategy

---

## 🚀 NEXT STEPS

1. Start with Bug #3 (simplest to debug)
2. Add console logging to `modifyMecha()` and related functions
3. Test each scenario independently
4. Once fixed offline, verify it works online
5. Move to Bug #1, then Bug #2

Each bug should take 30-60 minutes to investigate and fix once you identify the exact cause.

---

*Last Updated: 2026-04-07*
*Investigation Status: Pending*
