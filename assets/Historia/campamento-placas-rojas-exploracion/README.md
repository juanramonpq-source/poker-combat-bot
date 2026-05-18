# Campamento de las Placas Rojas Exploracion

Escena jugable autocontenida para PoCoBOT. Representa el Campamento de las
Placas Rojas como un mapa grande de exploracion isometrica.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones basicas y audio.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/campamento-placas-rojas-map.webp`: fondo WebP optimizado para juego.
- `assets/characters/*.png`: Corvo, Nara, Damaso, Iria, Nix, piloto de
  resistencia y dron del lago para conversacion y presencia en mapa.

## Sistemas incluidos

- Movimiento con `WASD`, flechas, raton o tactil.
- PoCoBOT integrado con el sistema visual compartido de exploracion.
- Camara con seguimiento suave sobre un mundo de `1536 x 1024`.
- Colisiones base alrededor de tiendas, torres, bordes y zona central.
- Corvo Vanta sentado en vista cenital como NPC principal del campamento.
- PNJ visibles en el mapa al estilo del Mercado de Reles Muertos: Nara en
  enfermeria, Damaso en intendencia, Iria en valvula, Nix en terminal de
  cartas y la piloto de resistencia en la zona de calibracion.
- Cadena de encargos: confianza de Corvo, radio de Xavor, filtros, fusible,
  combate controlado, purga de mazo con Nix Corsario, PC del agua y paso norte
  al lago.
- Escena alternativa de Lago Norte con combate final contra dron contaminante.
- Musica de exploracion con `../Silencio de Acero.mp3`.
- Boton flotante para volver al mapa en modo independiente.
- Mensajes `postMessage` preparados para integracion con el modo historia.

## Integracion

La escena emite:

```text
type: "pocobot-story-camp-action"
action:
  "return-map" | "corvo" | "radio-xavor" | "medic" | "quartermaster" |
  "mechanic" | "deck-pirate" | "camp-trial" | "hack-pc" | "open-lake" |
  "lake-drone" | "return-camp"
```

Los puntos de interaccion narrativos se pueden anadir en `game.js` dentro de
`interactables` y exponerlos al editor con `applySceneInteractionPoints`.

El progreso local del boceto se guarda en:

```text
pocobot-story-camp-red-plates-progress-v1
```

## Validacion

```text
node --check game.js
```
