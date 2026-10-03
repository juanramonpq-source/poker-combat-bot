# Capítulo 7 · Subestación de Ceniza

## Protocolo jugable

Desde el hub se accede a tres ramales: relé oeste (reactor), banco de capacitores (cruce) y transformador central (fundición). Cada ramal contiene una carga. Se pueden visitar en cualquier orden; la baliza de Mr. Wind solo permite la extracción cuando están colocadas las tres.

Los centinelas recorren rutas fijas de ida y vuelta, calculadas alrededor de la maquinaria. Solo persiguen si el jugador entra en su cono visual y no hay un obstáculo entre ambos. Al perder la visión regresan a su ruta; el combate comienza al alcanzarlo. Las conversaciones pausan la exploración. Las cargas y la posición se conservan al volver al mapa o recargar; empezar una partida nueva las borra.

Movimiento: WASD, flechas o control táctil. Interacción: E, espacio o botón de interacción.

## Recursos

`argos-sentry-walk-transparent.png` sustituye la hoja con damero incrustado. Editada con ImageGen el 3 de octubre de 2026, modo edición y `transparent_background: true`, tomando como referencia `hoja_de_sprites_de_mech_industrial_web_1600.webp`.

Instrucción de edición: retirar exclusivamente el fondo de damero, conservar los ocho robots en una cuadrícula de cuatro columnas y dos filas, sus poses, diseño y encuadre, y producir transparencia alfa real. El juego obtiene las dimensiones de cada fotograma a partir de la imagen.

## Verificación

- `scripts/test-substation-runtime.cjs`: transparencia, acceso a objetivos, colisiones, campo visual, persecución, retorno a patrulla y pantallas de alta frecuencia.
- `scripts/test-substation-story-integration.cjs`: recorrido físico por los tres ramales, diálogos, pausa, guardado, recarga y extracción, en Chromium y WebKit.
- `scripts/test-story-map-return.cjs`: regreso al mapa tras completar fases.

Las pruebas usan `http://localhost:8095` por defecto; `POCOBOT_TEST_URL` permite comprobar la versión publicada. Requieren Playwright y sus navegadores instalados. No sustituyen una prueba en un dispositivo físico.
