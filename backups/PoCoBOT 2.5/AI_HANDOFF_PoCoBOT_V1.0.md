# AI Handoff · PoCoBOT V1.0

## Qué es este proyecto

PoCoBOT es un juego táctico de combate entre mechas construido alrededor de una baraja francesa estándar.

El proyecto incluye:

- juego principal web con modos `Local`, `1 jugador`, `Tutorial` y `Online`
- manual digital
- manual analógico secreto
- modo desarrollador oculto
- assets visuales, audio y cartas reales para escritorio/tablet

Fecha de esta foto de estado: `2026-04-14`

## Punto de entrada principal

El archivo central del proyecto es:

- `poker_combat_bot_ONLINE.html`

Ese archivo contiene prácticamente todo el runtime cliente:

- estructura HTML
- estilos
- lógica de juego
- tutorial
- IA de `1 jugador`
- HUD
- flujo compartido de combate
- integración del modo online del lado cliente

## Servidor

El servidor del modo online está en:

- `server.js`

Dependencias:

- `express`
- `socket.io`

Arranque local:

```bash
npm install
npm start
```

Después abrir:

- `http://localhost:3000/`

## Archivos de producción importantes

### Juego

- `poker_combat_bot_ONLINE.html`
- `server.js`
- `package.json`
- `site.webmanifest`

### Manuales y utilidades públicas

- `MANUAL_USUARIO.html`
- `MANUAL_USUARIO.pdf`
- `MANUAL_ANALOGICO_POCObot.html`
- `MANUAL_ANALOGICO_POCObot.pdf`
- `MANUAL_JUEGO_MESA_PoCoBOT.pdf`
- `MODO_DESARROLLADOR_POCObot.html`

### Iconos y PWA

- `favicon.ico`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `icon_16x16.png`
- `icon_32x32.png`
- `icon_64x64.png`
- `icon_128x128.png`
- `icon_256x256.png`
- `icon_512x512.png`

### Assets usados en producción

- `assets/audio_01.mp3`
- `assets/audio_02.mp3`
- `assets/image_01.png` a `assets/image_29.png`
- `assets/pocobot_title.png`
- `assets/pocobot_title_blue.png`
- `assets/sfx/`
- `assets/cards/hayeah-full/`
- `assets/cards/THIRD_PARTY_CARDS.md`
- `assets/sfx/THIRD_PARTY_AUDIO.md`

## Carpetas o material que no deben confundirse con producción

Ignorar salvo que se quiera investigar o recuperar material:

- `landing/`
- `functional-polish-build/`
- `commercial-online-base-build/`
- `commercial-retro-build/`
- `online-commercial-remake/`
- `online-commercial-remake-candy/`
- `icon-refresh/`
- `official-icon-pack/`
- `release-package/`
- `backups/`
- documentos históricos de bugs o validaciones

## Reglas y comportamientos que ahora mismo hay que preservar

### Reglas de cartas

- Las cartas numéricas `2-10` van a módulos o fuel según palo.
- `J/Q/K` son tripulación:
  - `Piloto`
  - `Copiloto`
- Los ases `A` son siempre `Potenciadores`.
- Un `As` no es figura.
- Un `As` no es carta numérica.

### Restricciones críticas de ases

- Los ases nunca pueden entrar en módulos.
- Los ases nunca pueden usarse como proyectil.
- Los ases nunca cuentan como diamante numérico para robar o defender.
- Todos los ases solo van al slot de `Booster`.

### Efecto especial del As de diamantes

- `A♦` no amplía ningún módulo.
- `A♦` permite usar `♣ armadura` del panel como combustible.
- En un ataque no se puede mezclar:
  - combustible normal `♦`
  - armadura quemada `♣` por efecto de `A♦`

### Proyectiles

- Un proyectil consume exactamente `1` carta numérica de `♠`.
- El daño del proyectil es el valor de esa carta.
- Los ases no pueden ser proyectiles.

## Flujo de defensa activa que no conviene romper

Este fue uno de los puntos más delicados del proyecto.

Estado correcto actual:

- ya no hay popup modal bloqueante
- el aviso flotante es solo visual
- las acciones reales de defensa viven dentro del panel `Mano` del defensor
- aparecen botones inline:
  - `Seleccionar diamantes`
  - `Confirmar defensa`
  - `No defender`
- los `♦` válidos se resaltan
- después de resolver defensa o no defensa:
  - la cámara sube a los radares
  - se ve la secuencia de ataque
  - luego vuelve al jugador que toca

No reintroducir a ciegas:

- popups modales para defensa activa
- botones flotantes interactivos sobre el área central de juego

En Chrome eso provocó temblores, reflows y bloqueos de interacción.

## HUD y lectura visual actual

- El radar superior no es solo decorativo.
- Debajo de cada radar aparecen marcadores compactos de:
  - `♥ Defensa`
  - `♣ Armadura`
- Cuando un mecha recibe daño:
  - el radar impactado se ilumina
  - aparece explosión visual en el radar
  - las cápsulas de defensa/armadura reaccionan

## Cartas visuales

- En `desktop/tablet` se usan cartas reales vectoriales.
- En `smartphone` se mantiene la versión compacta simplificada.
- Hubo varios intentos previos; la solución estable usa el set actual de `assets/cards/hayeah-full/`.

## Modo desarrollador oculto

Existe una página oculta:

- `MODO_DESARROLLADOR_POCObot.html`

Acceso:

- desde `MANUAL_ANALOGICO_POCObot.html`
- pulsando `5` veces el nodo/botón oculto definido allí

Utilidad:

- probar VFX
- probar SFX
- probar mechas/imágenes
- cargar presets de reglas
- cargar presets de tutorial
- cargar estados simulados de online

La intención fue que llamase al runtime real del juego y no a duplicados falsos.

## Manual analógico secreto

Archivo:

- `MANUAL_ANALOGICO_POCObot.html`

Ideas clave:

- se presenta como archivo secreto encontrado por el jugador
- enlaza al PDF del modo de mesa
- da acceso al modo desarrollador oculto

PDF de referencia actual:

- `MANUAL_JUEGO_MESA_PoCoBOT.pdf`

## Instalación como web app

En la portada del juego aparece un mensaje recomendando instalar el juego como web app.

Comportamiento correcto actual:

- si el juego se ejecuta como app instalada, ese aviso se oculta

Detección usada:

- `display-mode: standalone`
- `navigator.standalone`

## Estado del tutorial

El tutorial quedó reajustado para que:

- explique palos, piloto, copiloto y booster
- respete la regla de que los ases son solo potenciadores
- use un proyectil final coherente con las reglas actuales

## Estado del modo 1 jugador

Se corrigieron bloqueos de la CPU y problemas de fin de turno.

Puntos ya resueltos:

- la CPU ya ejecuta turnos
- las acciones del humano no se encadenan mal tras ciertas acciones
- las defensas y cierres de turno están bastante más saneados

## Estado del modo online

Hay correcciones hechas y ya validadas en varios puntos, pero es una zona que siempre conviene revisar con cuidado antes de cambios grandes.

Especial cuidado con:

- host/guest
- defensa activa
- sincronización de estado
- lobby y vuelta al menú

## Dónde tocar si hay que retomar el proyecto

### Si el problema es de reglas o flujo

Tocar primero:

- `poker_combat_bot_ONLINE.html`

### Si el problema es del online servidor

Tocar:

- `server.js`

### Si el problema es de copy o documentación

Tocar:

- `MANUAL_USUARIO.html`
- `MANUAL_ANALOGICO_POCObot.html`
- `MANUAL_JUEGO_MESA_PoCoBOT.pdf` o su fuente editable cuando toque

### Si el problema es visual de mechas o assets

Revisar:

- `assets/`

## Comprobaciones rápidas recomendadas tras cualquier cambio

1. `Local`:
   - lanzar ataque
   - entrar en defensa activa
   - elegir diamante
   - confirmar defensa
   - probar `No defender`
2. `1 jugador`:
   - verificar turno de CPU
   - verificar cierre de turno tras acciones distintas de modificar
3. `Tutorial`:
   - completar hasta el final
4. `Online`:
   - crear sala
   - unir invitado
   - verificar ocultación de mano y defensa activa
5. `Smartphone`:
   - revisar portada y cartas compactas

## Convenciones útiles para continuar

- Hacer backup local antes de cambios delicados en `poker_combat_bot_ONLINE.html`
- No mezclar a ciegas builds experimentales con producción
- Probar en Chrome real cuando un bug sea de hover, scroll o capas flotantes
- Si una solución visual bloquea la interacción, simplificar antes que insistir

## Resumen corto para otra IA

Si solo puedes leer una cosa, quédate con esto:

- El corazón del proyecto es `poker_combat_bot_ONLINE.html`.
- Los ases solo son potenciadores.
- `A♦` permite usar armadura como combustible, pero no amplía slots.
- La defensa activa ya no usa popup modal: usa guía visual + controles inline en la mano del defensor.
- Desktop/tablet usa cartas reales; smartphone usa cartas compactas.
- El modo desarrollador existe y cuelga del runtime real.
- `landing/` no forma parte del juego principal.

