# Torre de Seguimiento 4B Tutorial

Prototipo jugable autocontenido para integrar en PoCoBOT como zona de exploracion isometrica y puente hacia la prueba tactica de proyectil.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones, interacciones y controles.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/torre-seguimiento-4b-rendered-map.png`: escenario raster isometrico de la torre 4B.
- `assets/mecha-clean-frames/`: frames del PoCoBOT pilotado para inclinacion/deslizamiento.
- `assets/sfx/motor_looping_cc0.mp3`: motor de apoyo para la llegada de la furboneta.
- `assets/sfx/drag_racing_sfx_cc0.mp3`: motor/frenada para la entrada con derrape de la furboneta.

## Sistemas incluidos

- Movimiento con `WASD` y flechas.
- Movimiento con raton o tactil manteniendo pulsado y arrastrando sobre el canvas.
- Toque corto para interactuar en movil cuando el jugador esta cerca de un punto activo.
- Boton flotante de vuelta al mapa cuando se juega como experiencia independiente; en modo embebido lo aporta el contenedor del modo historia.
- Colisiones contra bordes de plataforma, torre, antenas, consolas, crates, emisor y pasarela.
- Aviso de orientacion horizontal cuando el movil esta en vertical.
- Punto de interaccion de la consola radar conectado por `postMessage` con el modo historia.
- Punto de interaccion del emisor 4B para marcar el objetivo de proyectil.
- Punto de interaccion de la pasarela este para indicar el bloqueo narrativo.
- Modo depuracion opcional con `?debug=1` para revisar las zonas de colision.

## Rutas de integracion sugeridas

- Consola radar: emite `pocobot-story-tower-tutorial-action` con `action: "radar-console"`.
- Emisor 4B: emite `pocobot-story-tower-tutorial-action` con `action: "target-emitter"`.
- Pasarela este: emite `pocobot-story-tower-tutorial-action` con `action: "east-bridge"`.
- Boton de mapa: emite `pocobot-story-tower-tutorial-action` con `action: "return-map"`.
- Movimiento: extraer `update`, `canMoveTo`, pointer controls y `collisionZones` si se quiere portar al runtime principal.
- Escenario: reutilizar `assets/torre-seguimiento-4b-rendered-map.png` como fondo de la escena de la torre.

## Base de lore utilizada

- Nodo 4 de la Ruta Ceniza: `Torre de Seguimiento 4B`.
- Mision: lanzar al menos un proyectil para completar el nodo.
- Aprendizaje: activacion de proyectiles y timing ofensivo.
- Tension: infraestructura vieja de Argos, radar vertical, vigilancia remanente y tecnologia que todavia filtra el paso.

## Estado

Validado con:

```text
node --check game.js
```

El prototipo no depende de librerias externas.

## Audio externo

- `motor_looping_cc0.mp3`: Motor Sound Effect, OpenGameArt, licencia CC0.
- `drag_racing_sfx_cc0.mp3`: Drag Racing SFX, OpenGameArt, licencia CC0.
