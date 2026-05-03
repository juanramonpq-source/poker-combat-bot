# Mercado de Reles Muertos Tutorial

Prototipo jugable autocontenido para integrar en PoCoBOT como tutorial de movimiento y puente hacia el modo historia.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones, interacciones y controles.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/mercado-reles-rendered-map.png`: escenario raster renderizado del mercado.
- `assets/vera-hex-rendered.png`: personaje de Vera Hex como punto de tienda/interaccion.
- `assets/pocobot-sparring-topdown.png`: PoCoBOT de entrenamiento.
- `assets/market-crowd-ambience-unstuntedsfx.mp3`: muchedumbre real de mercado para la exploracion.
- `assets/mecha-clean-frames/`: frames del PoCoBOT pilotado para inclinacion/deslizamiento.

## Sistemas incluidos

- Movimiento con `WASD`, ratón o táctil.
- Seleccion e interaccion con `E` o `Enter`.
- Movimiento con raton o tactil manteniendo pulsado y arrastrando sobre el canvas.
- Toque corto para interactuar en movil cuando el jugador esta cerca de Vera o del sparring.
- Boton flotante de vuelta al mapa cuando se juega como experiencia independiente; en modo embebido lo aporta el contenedor del modo historia.
- Colisiones contra puestos, escenario y personajes, dejando la plaza transitable.
- Aviso de orientacion horizontal cuando el movil esta en vertical.
- Ambiente de muchedumbre solo durante la exploracion jugable. Al hablar con Vera, abrir tienda, combatir o volver al mapa se apaga.
- Punto de interaccion de Vera Hex conectado por `postMessage` con el modo historia.
- Punto de interaccion del PoCoBOT de entrenamiento conectado por `postMessage` con el combate tutorial.

## Rutas de integracion sugeridas

- Vera Hex: emite `pocobot-story-market-tutorial-action` con `action: "talk-vera"`.
- PoCoBOT de entrenamiento: emite `pocobot-story-market-tutorial-action` con `action: "sparring"`.
- Boton de mapa: emite `pocobot-story-market-tutorial-action` con `action: "return-map"`.
- Movimiento: extraer `update`, `canMoveTo`, pointer controls y `collisionZones` si se quiere portar al runtime principal.
- Escenario: reutilizar `assets/mercado-reles-rendered-map.png` como fondo de la escena de mercado.

## Estado

Validado con:

```text
node --check game.js
```

El prototipo no depende de librerias externas.

## Audio externo

- `assets/market-crowd-ambience-unstuntedsfx.mp3`
- Fuente: UnstuntedSFX, "Market Ambience Sound Effect"
- URL: https://unstuntedsfx.net/sounds/market-ambience/
- Licencia consultada: https://unstuntedsfx.net/license
- Resumen de licencia indicado por la fuente: royalty-free, uso comercial permitido, sin atribucion obligatoria. No redistribuir como SFX independiente.
