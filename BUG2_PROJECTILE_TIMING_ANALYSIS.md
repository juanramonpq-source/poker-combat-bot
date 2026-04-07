# 🚀 BUG #2 INVESTIGATION: Projectile-Only Attack Timing

**Status**: Root Cause Found, Ready for Fix
**Bug**: "Projectile-only" attacks unlocked at wrong time
**Severity**: Low-Medium - Gameplay balance affected
**Date**: 2026-04-07

---

## Problem Statement

The "projectile-only" attack should be locked until the first complete attack occurs. However, it appears to be available at the moment when the mecha becomes "combat ready" instead of after the first actual attack.

**Expected Behavior**:
1. First attack must be a complete attack (requires fully assembled mecha)
2. After first attack completes, "projectile-only" is permanently unlocked
3. Subsequent turns, projectile-only is available without needing full assembly

**Actual Behavior**:
- "Projectile-only" is available as soon as mecha is complete
- Players can use projectile-only even if they haven't thrown their first real attack yet
- Should require first real attack to be thrown

---

## Root Cause Analysis

### Finding 1: Empty Function Detected ❌

**Location**: Line 5038-5040
```javascript
function refreshProjectileUnlock(){
  return;  // ← EMPTY! No logic here
}
```

This function is supposed to manage projectile unlock timing but does nothing!

### Finding 2: Unlock Condition in syncMilestones()

**Location**: Lines 4091-4102
```javascript
if(build.combatReady && !player.flags.combatReady){
  player.flags.combatReady = true;
  log(`⚙️ ${player.name} tiene el sistema de ataque operativo.`);

  if(!state.projectileUnlocked){
    state.projectileUnlocked = true;  // ← UNLOCKED HERE!
    log('🚀 Proyectiles desbloqueados para la partida.');
    addToast('Proyectiles desbloqueados', 'ok');
  }
}
```

**Problem**: `projectileUnlocked` is set to true when `combatReady` becomes true (mecha is complete), NOT when first attack is executed.

### Finding 3: What is "combatReady"?

**Location**: Line 4017
```javascript
const combatReady = playerCanAttack(player);
```

**Function**: `playerCanAttack()` (lines 5028-5037)
```javascript
function playerCanAttack(player){
  if(!player || !player.core) return false;
  if(!player.core.pilot) return false;
  if(!['J','Q','K'].includes(player.core.pilot.rank)) return false;
  if(player.core.pilot.suit==='diamonds') return false;
  const stats = playerStatsList(player);
  if(stats.length < 6) return false;
  if(player.defense.length < 1 || player.attack.length < 1 || player.armor.length < 1) return false;
  return countSuit(stats, player.core.pilot.suit) >= 3;  // ← This checks pilot suit requirement
}
```

**Analysis**: This function returns true when the mecha is fully assembled with proper card counts. It checks:
- Has pilot (figure card)
- Pilot is not diamonds
- Has 6+ total stats
- Has attack, defense, armor cards
- Pilot suit module has 3+ cards

---

## The Bug Explained

### Current Flow (WRONG)

1. **Turn 1**: Player assembles mecha
2. **Trigger**: `playerCanAttack()` returns true
3. **Event**: `syncMilestones()` called → `projectileUnlocked = true`
4. **Result**: Projectile-only becomes available IMMEDIATELY
5. **Problem**: First attack could be projectile-only, not a real attack!

### Intended Flow (CORRECT)

1. **Turn 1**: Player assembles mecha
2. **First Attack**: Player throws complete attack (armor + core cards)
3. **Trigger**: Attack resolves successfully
4. **Event**: Mark first attack as complete
5. **Result**: `projectileUnlocked = true` set HERE
6. **Future Turns**: Projectile-only becomes available

---

## Key Code Sections

### Section 1: Where Projectile Unlock Should Happen

**Location**: `confirmAttack()` (around line 5111+)
```javascript
function confirmAttack(){
  // ... validation ...

  if(projectileOnly && !state.projectileUnlocked){
    return notifySelection('El ataque por proyectil se desbloquea cuando el primer mecha queda completamente operativo.');
  }

  // ... execute attack ...
}
```

**Problem**: The check exists but condition is wrong (checking `!state.projectileUnlocked` when it's already true)

### Section 2: Where Attack Completes

**Location**: `finishAttack()` or similar attack resolution
```javascript
// After attack resolves successfully
// Should set: state.projectileUnlocked = true
```

**Problem**: This might not exist or might be in wrong place

### Section 3: Where Flag Should Be Tracked

Need to find where first complete attack is tracked. Should add:
```javascript
if(!player.flags.firstAttackComplete){
  player.flags.firstAttackComplete = true;
  state.projectileUnlocked = true;
}
```

---

## Investigation Plan

### Phase 1: Verify Bug Exists
1. Start a game in offline mode
2. Assemble mecha completely (pilot, all modules)
3. Check if "projectile-only" button becomes enabled
4. Expected: Should NOT be enabled yet (no attack thrown)
5. Actual: Probably IS enabled

### Phase 2: Find First Attack Logic
Search for where attacks are confirmed/completed:
```bash
grep -n "confirmAttack\|finishAttack\|executeAttack\|resolveAttack" poker_combat_bot_ONLINE.html
```

### Phase 3: Find Attack History Tracking
Look for where first attack completion should be tracked:
```bash
grep -n "firstAttack\|lastOwnAction\|attackHistory" poker_combat_bot_ONLINE.html
```

### Phase 4: Add Debugging Logs

**In confirmAttack()** around line 5111:
```javascript
console.log('[DEBUG-PROJECTILE] confirmAttack called');
console.log('[DEBUG-PROJECTILE]   projectileOnly:', projectileOnly);
console.log('[DEBUG-PROJECTILE]   state.projectileUnlocked:', state.projectileUnlocked);
console.log('[DEBUG-PROJECTILE]   player.flags.firstAttackComplete:', player.flags.firstAttackComplete);

if(projectileOnly && !state.projectileUnlocked){
  console.log('[DEBUG-PROJECTILE]   ERROR: Projectile-only not unlocked yet!');
  return notifySelection('El ataque por proyectil se desbloquea cuando se completa el primer ataque.');
}
```

**In syncMilestones()** around line 4098:
```javascript
if(!state.projectileUnlocked){
  console.log('[DEBUG-PROJECTILE] [WRONG PLACE] Unlocking projectiles at combat ready');
  console.log('[DEBUG-PROJECTILE]   Player:', player.name);
  console.log('[DEBUG-PROJECTILE]   This should happen AFTER first attack, not at assembly!');
  state.projectileUnlocked = true;
}
```

---

## The Fix Strategy

### Option 1: Track First Attack Completion (RECOMMENDED)

Add flag to track when first attack is actually thrown:

```javascript
// In player.flags initialization
player.flags.firstAttackComplete = false;

// In attack resolution (after attack succeeds)
if(!player.flags.firstAttackComplete){
  player.flags.firstAttackComplete = true;
  state.projectileUnlocked = true;
  log('🚀 Proyectiles desbloqueados después del primer ataque!');
}

// In confirmAttack validation
if(projectileOnly && !player.flags.firstAttackComplete){
  return notifySelection('Proyectil disponible solo después del primer ataque completo.');
}
```

### Option 2: Change Unlock Trigger

Remove projectile unlock from `syncMilestones()` and add it only to attack resolution:

```javascript
// In syncMilestones - REMOVE this:
if(!state.projectileUnlocked){
  state.projectileUnlocked = true;  // ← DELETE
}

// In attack resolution - ADD this:
if(!player.flags.firstAttackComplete){
  player.flags.firstAttackComplete = true;
  state.projectileUnlocked = true;
}
```

### Option 3: Fix the Empty Function

Implement `refreshProjectileUnlock()` properly:

```javascript
function refreshProjectileUnlock(){
  if(!state.players || state.players.length === 0) return;
  const player = state.players[state.currentPlayer];
  if(!player) return;

  // Check if this player threw their first attack
  if(player.flags.firstAttackComplete && !state.projectileUnlocked){
    state.projectileUnlocked = true;
    log('🚀 Proyectiles desbloqueados!');
  }
}
```

---

## Expected Behavior After Fix

### Before First Attack
- ✅ Player can assemble mecha (all modules)
- ✅ Attack button enabled (can throw regular attack)
- ❌ Projectile-only button DISABLED
- ❌ Error message if trying projectile-only

### After First Attack
- ✅ Projectile-only button now ENABLED
- ✅ Can use projectile-only on future turns
- ✅ Flag persists for rest of game

---

## Testing Checklist

- [ ] Assemble mecha in offline mode
- [ ] Check projectile-only button (should be DISABLED)
- [ ] Try clicking projectile-only button (should show error)
- [ ] Throw a complete attack (attack button)
- [ ] Check projectile-only button (should now be ENABLED)
- [ ] Use projectile-only attack (should work)
- [ ] Test in multiplayer (both players)

---

## Files to Review/Modify

- `syncMilestones()` (line 4078) - Remove projectile unlock from here
- `confirmAttack()` (line 5111+) - Add check for first attack
- `refreshProjectileUnlock()` (line 5038) - Implement this function
- Player flags initialization - Ensure `firstAttackComplete` exists
- Attack resolution logic - Add projectile unlock here

---

## Notes

### Why This Bug Appeared
The unlock logic was added to `syncMilestones()` (checking `combatReady`) but should have been added to attack completion logic instead.

### Why It's Not Breaking
The game still works because players can throw regular attacks. The bug just gives early access to projectile-only when it should be restricted.

### Multiplayer Sync
The state.projectileUnlocked is global (not per-player), so once ONE player's first attack completes, BOTH players get projectile-only access. This might be intentional or might need per-player tracking.

---

*Last Updated: 2026-04-07*
*Status: Root Cause Identified, Ready for Implementation*
