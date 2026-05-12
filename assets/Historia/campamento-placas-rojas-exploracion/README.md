# Campamento de las Placas Rojas Exploracion

Escena jugable autocontenida para PoCoBOT. Representa el Campamento de las
Placas Rojas como un mapa grande de exploracion isometrica.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones basicas y audio.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/campamento-placas-rojas-map.webp`: fondo WebP optimizado para juego.

## Sistemas incluidos

- Movimiento con `WASD`, flechas, raton o tactil.
- PoCoBOT integrado con el sistema visual compartido de exploracion.
- Camara con seguimiento suave sobre un mundo de `1536 x 1024`.
- Colisiones base alrededor de tiendas, torres, bordes y zona central.
- Musica de exploracion con `../Silencio de Acero.mp3`.
- Boton flotante para volver al mapa en modo independiente.
- Mensajes `postMessage` preparados para integracion con el modo historia.

## Integracion

La escena emite:

```text
type: "pocobot-story-camp-action"
action: "return-map"
```

Los puntos de interaccion narrativos se pueden anadir en `game.js` dentro de
`interactables` y exponerlos al editor con `applySceneInteractionPoints`.

## Validacion

```text
node --check game.js
```
