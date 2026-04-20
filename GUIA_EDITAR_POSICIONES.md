# 📍 GUÍA: Editar Posiciones de Nodos en PoCoBOT

## Paso 1: Configurar Visual Studio Code

### Opción A: Con Live Server (Recomendado)
1. Abre **Visual Studio Code**
2. Abre la carpeta `Poker Combat-bot`
3. Instala la extensión **"Live Server"** (búscala en Extensions)
4. Haz clic derecho en `pocobot_mapa_interactivo.html`
5. Selecciona **"Open with Live Server"**

El navegador se abrirá automáticamente en `http://localhost:5500/`

### Opción B: Con Python (si no quieres extensiones)
```bash
# En la terminal, en la carpeta del proyecto:
python3 -m http.server 8000

# Luego abre en el navegador:
# http://localhost:8000/pocobot_mapa_interactivo.html
```

---

## Paso 2: Usar el Modo Editor

Cuando abras la página, verás:
- **MODO JUEGO**: La interfaz normal del mapa
- **MODO EDITOR**: Actívalo presionando **`E`** (letra E)

### En Modo Editor:
1. **Arrastra cualquier nodo** con el ratón para reposicionarlo
2. **Las coordenadas se actualizan en tiempo real** en la esquina inferior izquierda
3. **Ves el código JSON actualizado** en un panel deslizable

---

## Paso 3: Guardar las Posiciones

### Método 1: Copiar y Reemplazar Automático
1. En Modo Editor, verás un botón **"📋 COPIAR CÓDIGO"**
2. Haz clic en él (el código se copia al portapapeles)
3. Abre `pocobot_mapa_interactivo.html` en un editor de texto
4. Busca la línea que empieza con: `const nodes = [`
5. Reemplaza TODO el array `nodes` con lo que copiaste
6. Guarda el archivo (Ctrl+S / Cmd+S)
7. El navegador se recargará automáticamente

### Método 2: Ver y Copiar Manual
1. En Modo Editor, busca el panel que dice **"📄 CÓDIGO ACTUALIZADO"**
2. Selecciona y copia el JSON que aparece
3. Pégalo en el archivo como se describe arriba

---

## Paso 4: Verificar Cambios

1. Presiona **`E`** nuevamente para volver al **MODO JUEGO**
2. Verifica que los nodos estén en las posiciones correctas
3. Si algo no se ve bien, vuelve a Modo Editor y ajusta

---

## Tips Útiles

### Atajos de Teclado
- **`E`** → Alterna entre Modo Juego y Modo Editor
- **`R`** → Resetea todas las posiciones a las originales (en Modo Editor)
- **`H`** → Muestra/oculta los puntos de referencia (Grid de ayuda)

### Grid de Ayuda
En Modo Editor, aparece una malla invisible que te ayuda a alinear nodos:
- Cada cuadrícula representa 10% del viewport
- Los nodos se "snapean" a la malla automáticamente

### Ruta de Progresión
Los nodos se conectan automáticamente con una línea SVG. No necesitas editar nada más, solo arrastra los nodos.

---

## Estructura de Coordenadas

Cada nodo tiene esta estructura:
```json
{
  "id": "hangar",
  "order": 1,
  "name": "HANGAR DE LA FOSA AZUL",
  "x": 16.31,      // ← Posición horizontal (0-100%)
  "y": 52.6,       // ← Posición vertical (0-100%)
  ...
}
```

- **x**: 0 = izquierda, 100 = derecha
- **y**: 0 = arriba, 100 = abajo

---

## Ejemplo de Workflow

1. Abre la página en navegador (Live Server)
2. Presiona `E` para entrar en Modo Editor
3. Arrastra el nodo "HANGAR DE LA FOSA AZUL" hacia la esquina inferior izquierda
4. El código se actualiza automáticamente abajo
5. Haz clic en "📋 COPIAR CÓDIGO"
6. Ve al editor de código y reemplaza el array `nodes`
7. Guarda (Ctrl+S)
8. Presiona `E` para volver al modo juego
9. Verifica que los cambios se ven bien

---

## Solución de Problemas

### La página no se recarga después de guardar
→ Recarga manualmente con **Ctrl+R** / **Cmd+R**

### Los nodos no se mueven
→ Asegúrate de estar en Modo Editor (presiona `E`)

### El código se ve mal en el navegador
→ Abre la consola (F12) y busca mensajes de error

### Quiero resetear todo a valores originales
→ En Modo Editor, presiona `R`

---

## Notas Finales

- ✅ El archivo de HTML tiene **2 modos integrados**: Juego y Editor
- ✅ Las posiciones se guardan en el **array JSON del código**
- ✅ No necesitas herramientas externas, todo está en el HTML
- ✅ Los cambios son **permanentes** cuando guardes el archivo

**¿Problemas?** Abre la consola del navegador (F12) para ver mensajes de error.
