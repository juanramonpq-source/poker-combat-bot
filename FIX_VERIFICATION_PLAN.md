# 🔧 Plan de Verificación - Fix de Sincronización Online

## 🐛 Problema Reportado
El juego se congela después del turno 1. Los turnos 1 de ambos jugadores funcionan, pero no llega nunca al turno 2 del jugador 1.

## ✅ Fix Aplicado (Líneas 6410-6421)
Se agregó un envío explícito de estado del Host al Guest después de procesar cada acción:

```javascript
_ol.socket.on('player_action', (action) => {
  if (_ol.role === 'host') {
    console.log('[ONLINE] Host received player_action:', action.type);
    olProcessGuestAction(action);
    console.log('[ONLINE] Host processed action, currentPlayer:', state.currentPlayer);
    // ✅ CRITICAL FIX: Send updated state back to guest after processing their action
    window.setTimeout(() => {
      console.log('[ONLINE] Host sending updated state to guest after processing action');
      olSendState();
    }, 100);
  }
});
```

## 🧪 Cómo Verificar el Fix

### Paso 1: Preparar los Navegadores
- Abre **dos navegadores** (Chrome en una ventana, Firefox en otra, o dos pestañas de incógnito)
- Asegúrate de que puedas ver la consola del navegador (F12 > Console)

### Paso 2: Crear una Partida Online
1. **Navegador 1 (Host)**:
   - Haz clic en "ONLINE"
   - Haz clic en "Crear Sala"
   - Anota el **código de 4 caracteres** que aparece
   - Espera al contrario

2. **Navegador 2 (Guest)**:
   - Haz clic en "ONLINE"
   - Haz clic en "Unirse a Sala"
   - Escribe el código de 4 caracteres
   - Haz clic en "Unirse"

### Paso 3: Jugar 5+ Turnos
Juega al menos 5 turnos alternados verificando:

**Turno 1 (Host)**
- ✅ Host puede hacer acciones
- ✅ Host ve botones activos
- 🔍 Console: Debería ver `[ONLINE] Host sending updated state to guest after processing action`

**Turno 1 (Guest)**
- ✅ Guest recibe actualización de estado
- ✅ Guest ve botones activos
- 🔍 Console: Debería ver `[ONLINE] Guest applying state, now currentPlayer: 1`

**Turno 2 (Host)** ← **CRÍTICO: Aquí se congelaba antes**
- ✅ Host puede hacer acciones NUEVAMENTE
- 🔍 Console: Log debería mostrar el cambio de turno

**Turnos 3, 4, 5...**
- ✅ El patrón debería continuar sin congelarse

### Paso 4: Mensajes Console Esperados

**Cuando el Host procesa la acción del Guest:**
```
[ONLINE] Host received player_action: passTurn
[ONLINE] olProcessGuestAction passTurn - selected cards: 2
[ONLINE] Host processed action, currentPlayer: 0
[ONLINE] afterRender on host: olQueueSendState called
[ONLINE] olQueueSendState: setting 60ms timer
[ONLINE] olQueueSendState: timer fired, calling olSendState
[ONLINE] Host sending state_update, currentPlayer: 0
[ONLINE] Host sending updated state to guest after processing action
```

**Cuando el Guest aplica el estado:**
```
[ONLINE] Guest applying state, currentPlayer: 0
[ONLINE] Guest applied state, now currentPlayer: 0
[ONLINE] afterRender on guest: setting up buttons
```

## 🎯 Criterios de Éxito

| Criterio | Antes del Fix | Después del Fix |
|----------|---------------|-----------------|
| Turno 1 del Host | ✅ Funciona | ✅ Funciona |
| Turno 1 del Guest | ✅ Funciona | ✅ Funciona |
| Turno 2 del Host | ❌ Se congela | ✅ Debería funcionar |
| Turno 3+ | ❌ No llega | ✅ Debería llegar |
| Estado sincronizado | ❌ Pierde sincronización | ✅ Sincronizado |

## 📋 Checklist de Testing

- [ ] **Test 1**: Crear sala y unirse correctamente
- [ ] **Test 2**: Jugar 5 turnos sin congelarse
- [ ] **Test 3**: Ver mensajes de sincronización en console
- [ ] **Test 4**: Verificar que `currentPlayer` cambia correctamente
- [ ] **Test 5**: Jugar 10+ turnos para probar estabilidad
- [ ] **Test 6**: Probar ataques y defensas (además de pasar turno)
- [ ] **Test 7**: Probar desconexión y reconexión del juego

## 🔍 Si el Problema Persiste

1. **Abre la consola** (F12) en ambos navegadores
2. **Busca errores rojos** - probablemente digan qué está fallando
3. **Copia los logs de error** - especialmente los que contienen `[ONLINE]`
4. **Verifica**:
   - ¿Se ve el mensaje "Host sending updated state"?
   - ¿Se ve "Guest applying state"?
   - ¿Los `currentPlayer` cambian correctamente?

## 📊 Mecanismo de Sincronización (Post-Fix)

```
Guest envía acción
       ↓
Host recibe 'player_action'
       ↓
Host procesa acción (passTurn, attack, etc.)
       ↓
Host llama render() → afterRender()
       ↓
afterRender() llama olQueueSendState() → envía en 60ms
       ↓
NUEVA: setTimeout de 100ms envía estado de backup
       ↓
Guest recibe 'state_update'
       ↓
Guest aplica estado y render()
       ↓
Guest ve su turno actualizado
```

---

**Versión del Fix:** v1.0
**Fecha:** Abril 6, 2026
**Archivo Modificado:** `poker_combat_bot_ONLINE.html` (líneas 6410-6421)
