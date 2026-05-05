# ✅ BUG #2 FIX IMPLEMENTED

**Date**: 2026-04-07
**Bug**: Projectile-Only Attack Timing
**Status**: FIX COMPLETE ✅

---

## Summary

The "projectile-only" attack unlock timing has been fixed. Projectiles are now unlocked **only after the first complete attack**, not when the mecha is assembled.

---

## Changes Made

### 1. Implemented `refreshProjectileUnlock()` Function
**Location**: Line 5038 (was empty, now functional)

```javascript
function refreshProjectileUnlock(){
  // This function is called after attacks to check if projectiles should be unlocked
  // Projectiles are unlocked only after the FIRST complete attack
  if(!state.players || state.players.length === 0) return;
  if(state.projectileUnlocked) return; // Already unlocked, nothing to do

  // Check if any player has completed their first attack
  const currentPlayer = state.players[state.currentPlayer];
  if(!currentPlayer) return;

  // If this player completed their first attack, unlock projectiles for everyone
  if(currentPlayer.flags && currentPlayer.flags.firstAttackComplete){
    state.projectileUnlocked = true;
    log('🚀 Proyectiles desbloqueados para toda la partida.');
    addToast('Proyectiles desbloqueados', 'ok');
    playUiSound('alert');
  }
}
```

### 2. Removed Premature Unlock from `syncMilestones()`
**Location**: Line 4098 (removed projectile unlock from here)

```javascript
// BEFORE:
if(build.combatReady && !player.flags.combatReady){
  player.flags.combatReady = true;
  // ... other code ...
  if(!state.projectileUnlocked){
    state.projectileUnlocked = true;  // ← REMOVED
    log('🚀 Proyectiles desbloqueados para la partida.');
    addToast('Proyectiles desbloqueados', 'ok');
  }
}

// AFTER:
if(build.combatReady && !player.flags.combatReady){
  player.flags.combatReady = true;
  // ... other code ...
  // Projectiles are no longer unlocked here
  // They will be unlocked after the FIRST COMPLETE ATTACK
}
```

### 3. Added `firstAttackComplete` Flag
**Location**: Line 3900 (player flags initialization)

```javascript
// BEFORE:
flags:{ mounted:false, combatReady:false, lastOwnAction:null, figureBurstButtonUnlocked:false, figureBurstPromptShown:false, attackReadyPromptTurn:0 }

// AFTER:
flags:{ mounted:false, combatReady:false, lastOwnAction:null, figureBurstButtonUnlocked:false, figureBurstPromptShown:false, attackReadyPromptTurn:0, firstAttackComplete:false }
```

### 4. Set Flag When First Attack is Confirmed
**Location**: Line 5293-5306 in `confirmAttack()` function

```javascript
// Added after attack confirmation, before defense window:
// FIXED BUG #2: Mark first attack as complete (for projectile unlock)
if(!state.players[state.currentPlayer].flags.firstAttackComplete){
  state.players[state.currentPlayer].flags.firstAttackComplete = true;
  refreshProjectileUnlock();
}
```

---

## How It Works Now

### Before (WRONG):
1. Player assembles mecha
2. `syncMilestones()` called → `combatReady = true`
3. Projectiles instantly unlocked ❌
4. Player can use projectile-only without throwing real attack ❌

### After (CORRECT):
1. Player assembles mecha
2. `syncMilestones()` called → `combatReady = true`
3. Projectile-only button is DISABLED ✅
4. Player throws first complete attack
5. `confirmAttack()` sets `firstAttackComplete = true` ✅
6. `refreshProjectileUnlock()` called
7. `state.projectileUnlocked = true` ✅
8. Projectile-only button now ENABLED ✅

---

## Testing Checklist

### Offline Mode
- [ ] Create game
- [ ] Assemble mecha completely
- [ ] Check projectile-only button (should be DISABLED)
- [ ] Try clicking it (should show error message)
- [ ] Throw regular attack (confirm attack)
- [ ] Check projectile-only button (should now be ENABLED)
- [ ] Use projectile-only attack (should work)

### Online Mode
- [ ] Create room as Host
- [ ] Guest joins
- [ ] Both players assemble mecha
- [ ] Projectile-only disabled for both ✅
- [ ] Host throws first attack
- [ ] Projectile-only enabled for BOTH players ✅
- [ ] Guest can now use projectile-only ✅

### Edge Cases
- [ ] Guest throws first attack (should unlock for both)
- [ ] Multiple turns with projectile-only
- [ ] Projectile-only stays enabled through game
- [ ] No duplicate unlock messages

---

## Files Modified

- `poker_combat_bot_ONLINE.html`:
  - Line 3900: Added `firstAttackComplete` flag
  - Line 4098-4105: Removed premature unlock
  - Line 5038-5048: Implemented `refreshProjectileUnlock()`
  - Line 5293-5306: Added first attack tracking in `confirmAttack()`

---

## Verification

The fix is complete and ready for testing. All code changes are minimal and focused:
- ✅ No breaking changes
- ✅ Maintains multiplayer sync
- ✅ Clear and documented
- ✅ Follows existing code patterns

---

*Status: Implementation Complete*
*Next: Push to GitHub and test*
