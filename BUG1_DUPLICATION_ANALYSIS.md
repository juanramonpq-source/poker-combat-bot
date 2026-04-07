# 🐛 BUG #1 INVESTIGATION: Card Duplication During Exchange

**Status**: Analysis Complete, Ready for Debug Testing
**Bug**: When exchanging cards, the incoming card duplicates
**Severity**: Low-Medium - Cosmetic issue but allows unintended behavior
**Date**: 2026-04-07

---

## Problem Statement

When a player exchanges a card on the board with a card from their hand, the incoming card duplicates and becomes selectable twice for panel placement.

**Example Scenario**:
- Board: 5♣ in armor module
- Hand: 3♣ (among other cards)
- Action: Select both 5♣ (board) and 3♣ (hand), click "MODIFICAR"
- Expected: 5♣ discarded, 3♣ placed in armor (1 copy)
- Actual: 3♣ appears twice in armor, can be selected twice

---

## Code Flow Analysis

### Exchange Process (Lines 4512-4552)

**For Core Card Exchanges**:
```javascript
if(handCards.length===1 && coreBoardCards.length===1){
  const fromHand = handCards[0];
  const targetCore = coreBoardCards[0];

  // ... validation ...

  const removedCore = popCardFromZone(player, targetCore.zone, targetCore.id);  // Line 4530
  removeById(player.hand, fromHand.id);                                         // Line 4531
  pushCardToZone(player, targetCore.zone, fromHand);                            // Line 4532

  // Discard overflow if needed
  moduleDiscardCards.forEach(c => {
    const removed = popCardFromZone(player, c.zone, c.id);
    if(removed) state.discard.push(removed);
  });

  state.discard.push(removedCore);
}
```

**For Module Card Exchanges** (Lines 4555+):
```javascript
// Remove board cards
moduleDiscardCards.forEach(card => {
  const removed = popCardFromZone(player, card.zone, card.id);
  if(removed) state.discard.push(removed);
});

// Place hand cards
for(const card of handCards){
  removeById(player.hand, card.id);      // Remove from hand
  const result = placeCardOnBoard(player, card);  // Add to board
  if(result.ok){
    placementResults.push({ card, zone:result.zone });
  }
}
```

---

## Suspicious Code Sections

### Section 1: Card Object References
**Location**: Line 4531-4532 (Core exchanges)
```javascript
removeById(player.hand, fromHand.id);      // Remove from hand
pushCardToZone(player, targetCore.zone, fromHand);  // Add to zone
```

**Potential Issue**:
- The same `fromHand` object is being pushed to the zone
- Is the object being aliased in multiple places?
- Could the object be in both hand and zone simultaneously?

### Section 2: Card Removal in Module Exchanges
**Location**: Line 4575 (Module exchanges)
```javascript
removeById(player.hand, card.id);      // Remove from hand BEFORE pushing
const result = placeCardOnBoard(player, card);  // Should add to zone
```

**Check**: Is the card object actually being removed? Or is a reference persisting?

### Section 3: placeCardOnBoard Function
**Location**: Line 4573 (calls placeCardOnBoard)
```javascript
const result = placeCardOnBoard(player, card);
```

**Potential Issue**: Could this function be adding the card without fully removing it from the previous location?

---

## Hypotheses

### Hypothesis 1: Card Object Not Fully Removed (50% probability)
- `removeById()` removes the reference from array, but object still exists
- Card object appears in both hand and zone

**Test**:
```javascript
console.log('Before remove - hand:', player.hand.map(c => c.id));
removeById(player.hand, card.id);
console.log('After remove - hand:', player.hand.map(c => c.id));
console.log('After push - zone:', player[zone].map(c => c.id));
```

### Hypothesis 2: Object Reference Aliasing (30% probability)
- Card object is referenced in multiple arrays simultaneously
- When rendering, both references are visible

**Test**:
```javascript
const card1 = player.hand[index];
const card2 = player.armor[index];
console.log(card1 === card2);  // If true, same object referenced twice!
```

### Hypothesis 3: State Synchronization Issue (15% probability)
- In multiplayer mode, state sync causes duplication
- Guest/Host state mismatch creates duplicate in UI

**Test**:
- Test in offline mode first (single player)
- Then test in online mode
- See if duplication only happens online

### Hypothesis 4: Render/Display Bug (5% probability)
- Logic is correct, but rendering shows duplicate
- Could be in the `createCardEl()` or `renderCards()` functions

**Test**: Check what's actually in the player object vs what's rendered

---

## Investigation Plan

### Phase 1: Verify the Bug Exists
1. Open browser console
2. Create game in offline mode
3. Get 5♣ on board and 3♣ in hand
4. Select both and click MODIFICAR
5. Check if 3♣ appears twice in armor
6. Check player.armor array in console

### Phase 2: Add Debugging Logs
Insert logging in key functions:

**In modifyMecha()** (Line 4531):
```javascript
removeById(player.hand, fromHand.id);
console.log('[DEBUG-DUP] After removeById from hand:', player.hand.map(c => `${c.rank}${c.suit}(${c.id})`));

pushCardToZone(player, targetCore.zone, fromHand);
console.log('[DEBUG-DUP] After pushCardToZone:', player[targetCore.zone].map(c => `${c.rank}${c.suit}(${c.id})`));
```

**In removeById()** (Line 4310):
```javascript
function removeById(arr, id){
  console.log('[DEBUG-DUP] removeById called:', { arrayLength: arr.length, removingId: id });
  const idx = arr.findIndex(c => c.id===id);
  console.log('[DEBUG-DUP] Found at index:', idx);
  if(idx>=0) {
    const removed = arr.splice(idx,1)[0];
    console.log('[DEBUG-DUP] Removed:', removed.rank + removed.suit, 'Array length after:', arr.length);
    return removed;
  }
  console.log('[DEBUG-DUP] Card not found in array!');
  return null;
}
```

**In pushCardToZone()** (Line 4335):
```javascript
function pushCardToZone(player, zone, card){
  console.log('[DEBUG-DUP] pushCardToZone:', { zone, cardId: card.id, card: card.rank + card.suit });

  if(zone==='hand') {
    player.hand.push(card);
    console.log('[DEBUG-DUP] Pushed to hand. Hand length:', player.hand.length);
  }
  else if(zone==='fuel') {
    player.fuel.push(card);
    console.log('[DEBUG-DUP] Pushed to fuel. Fuel length:', player.fuel.length);
  }
  else if(MODULE_KEYS.includes(zone)) {
    player[zone].push(card);
    console.log('[DEBUG-DUP] Pushed to', zone, 'Length:', player[zone].length);
  }
  else{
    const slot = getCoreSlot(zone);
    if(slot){
      console.log('[DEBUG-DUP] Pushing to core slot:', slot);
      player.core[slot] = card;
    }
  }
}
```

### Phase 3: Trace Card Movement
1. Start exchange
2. Look at console logs
3. Follow the card through each step
4. Identify where it gets duplicated

### Phase 4: Check Card Uniqueness
Run in console after duplication:
```javascript
const player = state.players[state.currentPlayer];
const allCards = [
  ...player.hand,
  ...player.attack,
  ...player.defense,
  ...player.armor,
  ...player.fuel
];
const ids = allCards.map(c => c.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
console.log('Duplicate IDs:', duplicates);
```

---

## Expected Debug Output (Successful Exchange)

```
[DEBUG-DUP] After removeById from hand: [5♠(id1), 7♥(id2), 9♦(id3)]
[DEBUG-DUP] After pushCardToZone: [3♣(id4)]
```

## Expected Debug Output (If Duplicated)

```
[DEBUG-DUP] After removeById from hand: [5♠(id1), 7♥(id2), 9♦(id3)]  // 3♣ removed
[DEBUG-DUP] After pushCardToZone: [3♣(id4), 3♣(id4)]  // DUPLICATED!
```

---

## Potential Root Causes

### Root Cause A: removeById Not Working (Most Likely)
- Card not actually removed from hand
- Ghost reference persists

### Root Cause B: pushCardToZone Adding Twice
- Could be called twice accidentally
- Or array.push() being called on same object twice

### Root Cause C: Card Object Mutation
- Card object being modified after placement
- Multiple references pointing to same object

### Root Cause D: State Sync Issue (Multiplayer)
- Guest receives state with card in two places
- State merge creating duplicates

---

## Files to Review

- `modifyMecha()` (lines 4512-4619) - Main exchange logic
- `removeById()` (lines 4310-4314) - Card removal
- `pushCardToZone()` (lines 4335-4345) - Card placement
- `popCardFromZone()` (lines 4321-4334) - Zone removal
- `placeCardOnBoard()` (lines 4358-4376) - Board placement

---

## Next Steps

1. Add console logging as described
2. Reproduce bug with logging enabled
3. Analyze console output
4. Identify exact location of duplication
5. Implement fix

---

*Last Updated: 2026-04-07*
*Status: Ready for Debug Testing*
