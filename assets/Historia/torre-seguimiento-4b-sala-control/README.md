# Sala de Control Torre 4B

Escena jugable autocontenida para PoCoBOT. Representa la segunda planta de la Torre de Seguimiento 4B, con el panel principal de radar y pantallas de Argos.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones, interacciones y controles.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/torre-4b-sala-control-map.png`: fondo raster isometrico de la sala de control.
- `assets/mecha-clean-frames/`: frames del PoCoBOT pilotado para inclinacion/deslizamiento.

## Interacciones

- `stairs-down`: regreso narrativo hacia la planta baja.
- `main-control`: activa el panel principal del radar 4B.
- `observation-window`: examina el ventanal de observacion de la torre.

## Integracion sugerida

La escena emite `postMessage` con:

```text
type: "pocobot-story-tower-control-action"
action: "stairs-down" | "main-control" | "observation-window" | "return-map"
```

## Estado

Validar con:

```text
node --check game.js
```

No depende de librerias externas.
