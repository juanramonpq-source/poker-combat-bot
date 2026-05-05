# Interior Bajo Torre 4B

Escena jugable autocontenida para PoCoBOT. Representa la planta baja interior de la Torre de Seguimiento 4B, justo despues de abrir la compuerta exterior.

## Contenido

- `index.html`: entrada HTML independiente.
- `game.js`: runtime canvas con movimiento, camara, colisiones, interacciones y controles.
- `style.css`: presentacion responsive y aviso de orientacion horizontal en movil.
- `assets/torre-4b-interior-baja-map.png`: fondo raster isometrico de la planta baja.
- `assets/mecha-clean-frames/`: frames del PoCoBOT pilotado para inclinacion/deslizamiento.

## Interacciones

- `entry-door`: examina la compuerta exterior abierta.
- `lock-console`: sincroniza la consola de bloqueo interior.
- `stairs-up`: punto narrativo para subir a la sala de control.

## Integracion sugerida

La escena emite `postMessage` con:

```text
type: "pocobot-story-tower-interior-action"
action: "entry-door" | "lock-console" | "stairs-up" | "return-map"
```

## Estado

Validar con:

```text
node --check game.js
```

No depende de librerias externas.
