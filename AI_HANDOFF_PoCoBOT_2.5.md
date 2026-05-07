# AI Handoff · PoCoBOT 2.5

Fecha de esta foto de estado: 2026-05-04
Proyecto original: `/Users/juanramonperezquintanar/Documents/Claude/Projects/Poker Combat-bot`
Backup completo creado: `/Users/juanramonperezquintanar/Documents/Claude/Projects/PoCoBOT 2.5`

Este documento está pensado para que cualquier IA pueda entender el proyecto, continuar el desarrollo sin romper lo ya conseguido y saber dónde tocar según el tipo de cambio.

## Resumen rápido para otra IA

PoCoBOT es un juego web táctico de combate entre mechas usando una baraja francesa como motor de reglas. El proyecto ya no es solo el combate: ahora incluye modo historia, lore, mapa interactivo, capítulos con escenas, diálogos, exploración, música, responsive móvil/tablet/PC y prototipos jugables integrados.

Si solo puedes leer una cosa, lee esto:

- El juego principal vive en `poker_combat_bot_ONLINE.html`.
- El modo historia actual vive sobre todo en `MODO_HISTORIA_BOCETO.html`.
- La biblia narrativa vive en `pocobot_lore_biblia.html`.
- El servidor online vive en `server.js`.
- Los prototipos explorables de historia viven en `assets/Historia/*-tutorial/` y escenas de Torre 4B.
- No hagas commits masivos con basura: el repo tiene muchos archivos no seguidos, backups y prototipos.
- Antes de tocar flujo de combate, tutorial, defensa activa o modo historia, haz backup local del archivo afectado.

## Filosofía del proyecto

PoCoBOT mezcla tres capas:

1. Juego táctico de cartas y módulos.
2. Fantasía visual de mechas con interfaz arcade/retro futurista.
3. Modo historia postapocalíptico: `Camino de PoCoBOT`, Ruta Ceniza, Argós, DUAL, Mara, Vera, Xavor, Cleo y futuros personajes.

La prioridad actual no es solo que funcione: debe sentirse como un juego con identidad. Las decisiones visuales deben ser inmersivas, no genéricas. El modo historia se está construyendo capítulo a capítulo usando el primer capítulo como plantilla.

## Cómo ejecutar el proyecto

Servidor local online:

```bash
npm install
npm start
```

Luego abrir:

```text
http://localhost:3000/
```

También se puede abrir directamente `poker_combat_bot_ONLINE.html` o `MODO_HISTORIA_BOCETO.html` como archivo local para pruebas rápidas, pero el servidor ayuda a evitar problemas con rutas y online.

Dependencias principales:

- Node 18.x
- Express
- Socket.IO

## Archivos principales

### Juego principal

- `poker_combat_bot_ONLINE.html`

Contiene casi todo el runtime cliente del combate:

- HTML del juego.
- CSS de interfaz expandida, compacta, móvil vertical y móvil horizontal.
- Lógica de reglas.
- Tutorial estándar y tutorial guiado/carnet PoCoBOT.
- IA de 1 jugador.
- Flujo local y online.
- Drag and drop de cartas.
- Defensa activa.
- VFX de mechas, diales, victoria y serpentinas.

### Servidor online

- `server.js`

Sirve estáticos y gestiona salas online con Socket.IO:

- `create_room`
- `join_room`
- `state_update`
- `player_action`
- `opponent_disconnected`

El host es la fuente de estado. El invitado manda acciones.

### Modo historia

- `MODO_HISTORIA_BOCETO.html`

Es el centro actual del modo aventura. Incluye:

- Portada del modo historia.
- Música de introducción.
- Rayos/fondo épico.
- Transición de humo/fade.
- Mapa completo en PC/tablet horizontal.
- Ruta alternativa en móvil vertical.
- Nodos de historia.
- Diálogos con personajes.
- Escenas con fondos, personajes y caja de diálogo inferior.
- Inventario/monedas/recompensas.
- Integración con combates embebidos.
- Integración con prototipos explorables mediante `iframe` y `postMessage`.

### Lore

- `pocobot_lore_biblia.html`

Biblia visual del mundo. Estado actual importante:

- Argós es gobierno, credo y ciudad fortificada.
- DUAL está definido como una arquitectura descentralizada previa a Argós.
- La moneda antigua DUAL / Dual-coin existe como reliquia económica y símbolo de libertad distribuida.
- Cleo Seaside es cameo, hijo de Rose y Frank Seaside, puente entre Factor DUAL y PoCoBOT.
- Xavor Glitch está integrado como técnico de frontera ligado a Torre 4B.
- La Torre de Seguimiento 4B forma parte de la Ruta Ceniza.

### Mapa interactivo histórico/legado

- `pocobot_mapa_interactivo.html`
- `assets/mapa_modo_historia.html`

Pueden contener pruebas o versiones previas. Antes de usarlos como fuente de verdad, compara con `MODO_HISTORIA_BOCETO.html`.

### Prototipos explorables de historia

- `assets/Historia/mercado-reles-muertos-tutorial/`
- `assets/Historia/torre-seguimiento-4b-tutorial/`
- `assets/Historia/torre-seguimiento-4b-interior-baja/`
- `assets/Historia/torre-seguimiento-4b-sala-control/`

Son módulos autocontenidos con `index.html`, `game.js`, `style.css` y assets propios. Emiten mensajes hacia el modo historia con `postMessage`.

## Estado actual del modo historia

### Estructura narrativa actual

El modo historia se está construyendo como Ruta Ceniza por estaciones. La plantilla deseada es:

1. Mapa inmersivo.
2. Selección de nodo disponible.
3. Transición de humo/fade.
4. Fondo del escenario a pantalla completa.
5. Presentación del personaje o situación.
6. Diálogo con opciones reales.
7. Prueba jugable o combate.
8. Resultado con diálogo distinto si se gana o pierde.
9. Vuelta al mapa, nodo marcado como completado y desbloqueo de la siguiente capa.

### Capítulo 1: Hangar de la Fosa Azul

Personaje principal: Mara Óxido.

Estado esperado:

- Fondo del hangar a pantalla completa.
- Presentación de Mara antes del diálogo.
- Poses de Mara visibles por encima del cuadro de diálogo.
- Diálogo con confianza, picardía y lore.
- Prueba de ensamblar un PoCoBOT hasta que pueda atacar.
- Combate especial contra Mara sin música normal de combate: debe continuar la música del modo aventura.
- Al ganar o perder, Mara responde de forma distinta.
- Al completar estación, el punto del mapa queda verde.

Regla narrativa de ayuda del capítulo:

- Para definir un mecha PoCoBOT se necesitan 6 cartas en módulos Ataque, Defensa y Armadura, y al menos 1 piloto.

### Patio de Pruebas del Taller

También vinculado a Mara.

Estado esperado:

- Enseña ataque, combustible y proyectil.
- Permite completar ofensiva con ataque normal, proyectil o combinación si el combustible no cubre todo.
- En esta prueba Mara puede forzar seguros del chasis para practicar aunque el mecha no cumpla estrictamente reglas fuera del Patio.
- Puede entregar una moneda antigua como puente hacia Vera y el Mercado.

### Mercado de Relés Muertos

Personaje principal: Vera Hex.

Estado esperado:

- Mercado explorable o escena de mercado con Vera.
- Sistema de tienda/scroll.
- Uso de monedas antiguas.
- Deck ampliado.
- Combate especial contra Viajero.
- Vera interpreta monedas/reliquias no solo como dinero, sino como memoria útil de un mundo roto.

Prototipo relacionado:

- `assets/Historia/mercado-reles-muertos-tutorial/`

Mensajes relevantes del prototipo:

- `pocobot-story-market-tutorial-action`
- `talk-vera`
- `sparring`
- `return-map`

### Torre de Seguimiento 4B

Personaje principal: Xavor Glitch.

Estado esperado:

- Nodo 4 de la Ruta Ceniza.
- Xavor llega con furgoneta.
- Exploración con PoCoBOT.
- Drones/vigilancia remanente.
- Ordenador azul y hackeo.
- Puerta/compuerta hacia Torre 4B.
- Restauración de transmisiones.
- Lore técnico: Argós sigue escuchando en restos de infraestructura.
- Recompensas: cartas/monedas según flujo.

Prototipos relacionados:

- `assets/Historia/torre-seguimiento-4b-tutorial/`
- `assets/Historia/torre-seguimiento-4b-interior-baja/`
- `assets/Historia/torre-seguimiento-4b-sala-control/`

Mensajes relevantes:

- `pocobot-story-tower-tutorial-action`
- `pocobot-story-tower-interior-action`
- `pocobot-story-tower-control-action`

## Lore actual que hay que respetar

### Argós

Argós no es solo una IA enemiga. Evoluciona en tres formas:

- Gobierno global.
- Credo de excelencia.
- Ciudad fortificada bajo cúpula.

Su peligro no es solo militar, sino moral: promete paz, sostenibilidad y orden a cambio de filtrar, corregir e integrar la humanidad.

### DUAL

DUAL es anterior a Argós. La versión actual del lore lo define como:

- Doble Unidad de Algoritmo Lógico.
- Red de protocolos descentralizados.
- Sistema sin trono ni dueño absoluto.
- Nacido para proteger seguridad, intercambio y acceso.
- No era Argós ni nació como tiranía.
- El peligro vino cuando gobiernos, corporaciones y herederos técnicos intentaron capturar, regular o poseer su libertad.

Argós no debe presentarse como continuación noble de DUAL, sino como perversión histórica: donde DUAL intentó impedir que alguien poseyera el sistema completo, Argós reconstruyó un centro absoluto.

### Moneda antigua DUAL / Dual-coin

La moneda DUAL es:

- Reliquia económica del mundo anterior a Argós.
- Cara visible de una tecnología mayor.
- Intercambio seguro y anónimo sobre red distribuida.
- Símbolo de prosperidad sin centro.
- Objeto narrativo para Vera, Xavor y Cleo.

No debe describirse como origen directo del control, sino como promesa de libertad técnica que otros intentaron comprar, regular y cerrar.

### Cleo Seaside

Cleo Seaside es cameo y puente con Factor DUAL.

Datos clave:

- Hijo de Rose y Frank Seaside.
- Anomalía viviente del tiempo.
- Testigo de la era DUAL.
- Guardián de memoria.
- No enseña a combatir; enseña a recordar.
- Conserva una moneda DUAL como reliquia.
- Su frase asociada: “Argós no nació cuando levantó su cúpula. Nació el día en que el mundo confundió control con salvación.”

### Mara Óxido

Mara es la mentora mecánica del primer capítulo.

Tono:

- Confianza previa con el protagonista.
- Picardía.
- Dureza afectuosa.
- Cero solemnidad innecesaria.
- Enseña ensamblaje, disciplina y criterio.

Frase asociada:

- “Si no sabes ensamblarlo, tampoco sabrás salvarlo.”

### Vera Hex

Vera es chatarrera, comerciante, intermediaria y lectora de ruinas.

Tono:

- Pícara.
- Práctica.
- No regala nada.
- Ve valor donde otros solo ven chatarra.

Frase asociada:

- “La chatarra no miente: o aguanta, o te mata.”

### Xavor Glitch

Xavor es técnico de frontera, restaurador y lector de sistemas muertos.

Tono:

- Afable.
- Irónico.
- Prudente.
- Tecnológico pero humano.
- Su coletilla “eso dicen todas” es parte del personaje.

Función:

- Acceso.
- Interferencia.
- Hackeo.
- Lectura de restos de Argós.
- Torre 4B.

## Reglas críticas del combate

Estas reglas no deben romperse al tocar tutorial, IA o interfaces.

### Cartas y módulos

- Cartas numéricas `2-10`: módulos o fuel según palo.
- `J/Q/K`: figuras/tripulación, piloto y copiloto.
- `A`: potenciadores.
- Un As no es figura.
- Un As no es carta numérica.

### Ases

- Los ases nunca entran en módulos normales.
- Los ases nunca son proyectiles.
- Los ases nunca cuentan como diamante numérico para robar o defender.
- Los ases solo van al slot de Booster/Potenciador.

### As de diamantes

- El `A♦` no amplía módulos.
- Permite usar armadura `♣` del panel como combustible.
- No se puede mezclar combustible normal `♦` y armadura quemada `♣` en el mismo ataque.

### Proyectiles

- Un proyectil consume exactamente una carta numérica de `♠`.
- El daño del proyectil es el valor de esa carta.
- Los ases no pueden ser proyectiles.
- En tutorial final, el proyectil debe ser opción o necesidad táctica según combustible, no obligación artificial si hay fuel suficiente.

### Cambio de piloto y exceso de palo

Si al cambiar piloto se produce exceso de cartas de un palo que ya no corresponde, el juego debe descartar automáticamente la carta de menor valor de ese palo. Debe ser transparente para el jugador y no bloquear tutorial/fase.

### Modificar sin jugada válida

Bug corregido/clave a preservar: si el jugador selecciona una carta del panel y pulsa `Modificar` sin una acción válida, esa carta no debe desaparecer ni gastarse el turno. `Modificar` solo debe resolver cambios legales.

## Defensa activa

Zona delicada. No reintroducir modales bloqueantes sin revisar.

Estado deseado:

- La defensa activa avisa visualmente.
- El jugador puede usar diamantes numéricos válidos.
- El aviso debe ser visible y no cortarse en móvil horizontal.
- En la interfaz compacta/móvil horizontal debe cerrarse cualquier panel desplegado al resolver ataques para que el jugador vea qué ha pasado.
- En CPU, si usa defensa activa, debe utilizar la carta más alta de diamantes que tenga en mano.

Evitar:

- Popups que bloqueen interacción.
- Capas que tapen el panel y no permitan entender el ataque.
- Avisos cortados por contenedores con overflow.

## Interfaces actuales del combate

### Interfaz expandida clásica

Objetivo:

- Más visual.
- Mechas más grandes que en V1.0.
- Drag and drop integrado como en compacta.
- Diales/mechas con ligero movimiento de flotación.

### Interfaz compacta PC

Objetivo:

- Mucha información en pantalla.
- Botones accesibles.
- `Modificar` visible y naranja.
- Consola de acciones con scroll si se expande durante ataque.
- Ganador con cartel grande y copa solo en el ganador.
- Serpentinas al ganar.
- Salud vital visible de forma elegante.

### Móvil vertical

Objetivo:

- Jugable en scroll vertical.
- Portada de historia usa imagen específica móvil sin mosaico/repetición.
- En modo historia, mapa adaptado a ruta vertical cuando el mapa completo no cabe bien.
- Evitar botones heredados que tapen puntos del mapa.

### Móvil horizontal panorámico

Objetivo:

- Modo compacto de PC adaptado a móvil horizontal.
- Botón para volver a modo vertical.
- No debe volver automáticamente al modo vertical al girar si el jugador activó horizontal manualmente.
- Panel de stats del jugador debe estar visible al 100%.
- Mechas deben verse atractivos, sin cuadros cortados.
- Paneles desplegables para acciones/rival, excepto stats esenciales.
- Salud vital de mechas debe ocultarse por defecto y mostrarse solo al pulsar sobre un mecha; al pulsar de nuevo debe desaparecer.
- Al robar con diamantes, debe cerrarse el desplegable y volver al panel central.
- Serpentinas al ganar.

## Tutorial estándar / Carnet PoCoBOT

El tutorial ha sido muy sensible a regresiones. Si se toca, probarlo completo desde el paso 1.

Puntos importantes:

- `Nueva Partida` durante tutorial debe reiniciar el tutorial, no abrir partida random de 1 jugador.
- Paso de abrir ataque debe incluir ayuda clara para subir al panel principal y volver abajo a elegir combustible/cartas.
- Defensa activa móvil vertical debe ser legible, no deformar botones.
- Paso de robar con diamantes debe forzar cartas necesarias para que el tutorial no dependa de azar.
- Paso de descartar figuras extra debe garantizar dos figuras en mano para robar 4 cartas.
- Paso de descarte debe pedir cartas que realmente están en mano.
- Antes del ataque final se practica sustituir carta/piloto y se descarta automáticamente la carta menor si sobra palo.
- Tras el ataque final de tutorial, la partida debe terminar con victoria y no abrir defensa activa del instructor.

## Assets importantes

### Historia

- `assets/Historia/Brutos/`: imágenes grandes o brutas.
- `assets/Historia/low/`: imágenes compactas/livianas para carga inicial y móvil.
- `assets/Historia/sfx/`: efectos de historia.
- `assets/Historia/*.mp3`: música del modo historia.

Imágenes low clave:

- `assets/Historia/low/titulo_smartphone_compacto_1080.webp`
- `assets/Historia/low/titulo1_fondo_ultraligero_1080.webp`
- `assets/Historia/low/titulo1_fondo_compacto.webp`
- `assets/Historia/low/mapaok_compacto.webp`
- `assets/Historia/low/mapaok_ultraligero_1080.webp`
- `assets/Historia/low/mapa_reducido_1080_ultraligero.webp`
- `assets/Historia/low/hangar_fosa_azul_compacto_1600.webp`
- `assets/Historia/low/hangar_fosa_azul_ultraligero_1080.webp`
- `assets/Historia/low/mara_oxido_compacto_1080.webp`
- `assets/Historia/low/mercado_reles_muertos_web_1600.webp`
- `assets/Historia/low/torre_4b_compacta.webp`
- `assets/Historia/low/Cleo.jpg`

Música clave:

- `assets/Historia/CenizaMetalica.mp3`: canción de introducción del modo historia.
- `assets/Historia/cancionMundo.mp3`: música del mapa tras completar la primera estación.
- `assets/Historia/MercadodeChatarra.mp3`: mercado.

### Cartas

- `assets/cards/hayeah-full/`

Set de cartas reales usado para escritorio/tablet y render de cartas. No cambiar a la ligera.

### SFX

- `assets/sfx/`
- `assets/Historia/sfx/`

Usar sonidos al pulsar/marcar botones en modo aventura cuando encaje.

## Estado Git y limpieza

Rama actual habitual: `main`.

Últimos commits vistos antes de este documento:

- `034aab4 Ajusta scroll de tienda Vera en ventana`
- `2cd5999 Anade scroll manual a tienda de Vera`
- `0337746 Corrige scroll y controles de exploracion historia`
- `0d50bde Corrige scroll y combates standalone historia`
- `08331b8 Corrige Torre 4B y lore DUAL`
- `970ad64 Integra Torre 4B en modo historia`

Estado de trabajo visto el 2026-05-04 antes de crear este handoff:

- Modificados:
  - `MODO_HISTORIA_BOCETO.html`
  - `assets/Historia/torre-seguimiento-4b-tutorial/game.js`
- No seguidos relevantes/posiblemente útiles:
  - `assets/Historia/low/Cleo.jpg`
  - `assets/Historia/low/mapa_reducido_1080_ultraligero.webp`
  - `assets/Historia/Brutos/Vera1.png` a `Vera4.png`
  - `assets/videos/A_video.MP4` a `D_video.MP4`
- No seguidos que NO deben subirse sin revisar:
  - `assets.zip`
  - `backups/` masivo
  - `desktop-compact-prototype/`
  - `desktop-compact-prototype-pocobot-skin/`
  - `pocobot_lore_bibliaOLD.html`

Regla de oro del usuario: no subir basura. Si se hace push, stagear solo archivos intencionales.

## Cómo validar cambios

### Comprobaciones rápidas de sintaxis

Para prototipos JS:

```bash
node --check assets/Historia/mercado-reles-muertos-tutorial/game.js
node --check assets/Historia/torre-seguimiento-4b-tutorial/game.js
node --check assets/Historia/torre-seguimiento-4b-interior-baja/game.js
node --check assets/Historia/torre-seguimiento-4b-sala-control/game.js
```

Para HTML/lore, al menos comprobar enlaces/imagenes con script Node si se editan referencias.

### Pruebas manuales mínimas del juego

1. Abrir `poker_combat_bot_ONLINE.html`.
2. Probar Local.
3. Probar 1 jugador contra CPU fácil.
4. Probar defensa activa.
5. Probar `Modificar` con selección inválida: no debe borrar cartas ni gastar turno.
6. Probar tutorial completo desde paso 1.
7. Probar interfaz compacta PC.
8. Probar móvil vertical.
9. Probar móvil horizontal panorámico.
10. Probar victoria: cartel centrado/visible, copa solo ganador, serpentinas.

### Pruebas manuales mínimas del modo historia

1. Abrir `MODO_HISTORIA_BOCETO.html`.
2. Portada: música, rayos y transición.
3. PC/tablet horizontal: mapa no debe cortar arriba y puntos deben encajar.
4. Móvil vertical: ruta/mapa debe ser usable sin botones tapando puntos.
5. Hangar: Mara visible, diálogo no tapa poses, combate embebido mantiene música aventura.
6. Patio: ataque/proyectil funciona.
7. Mercado: Vera, tienda, scroll, monedas, Viajero.
8. Torre 4B: Xavor, exploración, drones, compuerta, mensajes y vuelta al mapa.

## Convenciones al editar

- Mantener cambios pequeños y probables.
- No mezclar refactor grande con retoques visuales urgentes.
- Evitar tocar varios sistemas a la vez si no es necesario.
- Si algo funcionaba y se rompe, buscar la última zona editada antes de reescribir.
- Crear backups antes de editar `poker_combat_bot_ONLINE.html` o `MODO_HISTORIA_BOCETO.html`.
- No borrar prototipos ni backups sin permiso.
- No hacer `git reset --hard`.
- No hacer `git checkout -- archivo` si hay cambios de usuario.

## Rutas de continuidad sugeridas

### Para seguir el modo historia

Usar el patrón del Hangar y Patio como plantilla:

- Presentación inmersiva.
- Personaje con imagen completa.
- Diálogo con opciones que cambian el tono y la información.
- Prueba jugable o combate con reglas específicas.
- Resultado narrativo.
- Recompensa/estado persistente.
- Vuelta al mapa.

El siguiente gran bloque lógico es consolidar Mercado y Torre 4B como capítulos completos, y después avanzar hacia Campamento de Placas Rojas, Foso de Viento Negro y Subestación de Ceniza.

### Para seguir el combate

Priorizar estabilidad sobre espectáculo:

- Tutorial completo sin bloqueos.
- IA CPU sin turnos colgados.
- Defensa activa visible y resuelta.
- Compacta y móvil horizontal jugables.
- Drag/drop consistente.

### Para seguir el lore

No revelar todo demasiado pronto. El orden ideal de revelación:

1. Mara enseña ensamblaje y supervivencia técnica.
2. Vera enseña valor de la chatarra, monedas y economía de ruina.
3. Xavor enseña que Argós sigue vivo en sistemas residuales.
4. Cleo revela el nexo profundo DUAL-Argós más adelante, como memoria larga.

## Frases guía de tono

- Mara: “Si no sabes ensamblarlo, tampoco sabrás salvarlo.”
- Vera: “La chatarra no miente: o aguanta, o te mata.”
- Xavor: “…Eso dicen todas.”
- Cleo: “Argós no nació cuando levantó su cúpula. Nació el día en que el mundo confundió control con salvación.”
- Custodio: “Lo humano no merecía la herencia. Solo el orden.”

## Nota final para la IA que continúe

Este proyecto tiene mucha historia viva en conversaciones y ajustes sucesivos. No trates los archivos como una maqueta limpia: son una obra en evolución. Antes de cambiar algo, entiende qué experiencia del jugador protege ese código. El usuario trabaja iterando sensaciones visuales y jugables; conviene implementar, probar y explicar con claridad qué cambió.
