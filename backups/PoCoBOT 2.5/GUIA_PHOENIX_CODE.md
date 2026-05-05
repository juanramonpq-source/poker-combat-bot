# 🔥 EDITAR POSICIONES EN PHOENIX CODE

Phoenix Code es un IDE visual muy potente. Esta guía te muestra cómo usar el editor de posiciones desde Phoenix Code.

---

## 📋 REQUISITOS

- ✅ Phoenix Code instalado
- ✅ Carpeta `Poker Combat-bot` abierta en Phoenix Code
- ✅ Los archivos:
  - `pocobot_mapa_interactivo.html`
  - `EDITOR_VISUAL.js`

---

## 🚀 MÉTODO 1: Preview Integrado (Recomendado)

Phoenix Code tiene un preview integrado que es más rápido que Live Server.

### Paso 1: Abrir el archivo en Phoenix Code

```
1. Abre Phoenix Code
2. Abre la carpeta: Poker Combat-bot
3. En el panel izquierdo, busca: pocobot_mapa_interactivo.html
4. Haz clic derecho sobre él
```

### Paso 2: Usar Preview Panel

```
1. En la barra superior, busca: "Preview" o "Live Preview"
2. Haz clic en él
3. Verás el archivo abierto en un panel de vista previa
   (puede estar a la derecha o abajo, según la versión)
```

### Paso 3: Editar y Ver en Tiempo Real

```
1. Deja el preview visible
2. En la otra ventana, abre el archivo en edición
3. Presiona: E (para entrar en modo editor)
4. Arrastra los nodos
5. Los cambios se ven en tiempo real en el preview
```

---

## 🚀 MÉTODO 2: Servidor Local (Terminal Integrado)

Phoenix Code tiene terminal integrada. Puedes correr un servidor local desde allí.

### Paso 1: Abrir Terminal en Phoenix Code

```
1. En Phoenix Code, ve a: View → Terminal (o Ctrl+`)
2. Se abrirá una terminal integrada en la parte inferior
```

### Paso 2: Navegar a la carpeta del proyecto

```bash
cd Poker\ Combat-bot
# O si está en otra ruta:
cd /ruta/a/Poker\ Combat-bot
```

### Paso 3: Iniciar servidor HTTP

**Opción A: Con Python (Recomendado - sin instalaciones extra)**

```bash
# Python 3
python3 -m http.server 8000

# O Python 2 (más antiguo)
python -m SimpleHTTPServer 8000
```

**Opción B: Con Node.js (si lo tienes instalado)**

```bash
npx http-server -p 8000
```

### Paso 4: Abrir en el navegador

```
1. Abre tu navegador (Chrome, Safari, Firefox, etc.)
2. Ve a: http://localhost:8000
3. Haz clic en: pocobot_mapa_interactivo.html
```

### Paso 5: Editar desde Phoenix Code

```
1. Presiona: E (para modo editor)
2. Arrastra los nodos en el navegador
3. Vuelve a Phoenix Code y edita el código
4. Los cambios se sincronizarán automáticamente
```

---

## 🎯 MÉTODO 3: Editor Visual Integrado (Si Phoenix Code lo soporta)

Algunas versiones de Phoenix Code tienen editores visuales integrados.

### Verificar si tienes editor visual

```
1. En Phoenix Code, ve a: View → Extensions
2. Busca: "HTML Preview" o "Live Server"
3. Si lo ves, instálalo
4. Reinicia Phoenix Code
5. Luego sigue el MÉTODO 1
```

---

## 💾 GUARDAR CAMBIOS PERMANENTES

### Workflow Completo:

```
1. EDITAR EN EL NAVEGADOR:
   - Presiona E para modo editor
   - Arrastra los nodos
   - Haz clic "📋 COPIAR TODO"

2. VOLVER A PHOENIX CODE:
   - Usa Alt+Tab o Cmd+Tab para cambiar ventana
   - Verás pocobot_mapa_interactivo.html abierto

3. BUSCAR EL ARRAY:
   - Presiona Ctrl+F (o Cmd+F en Mac)
   - Busca: const nodes = [
   - Phoenix Code resaltará la línea

4. REEMPLAZAR:
   - Selecciona desde "const nodes = [" hasta "];"
   - Pega lo que copiaste del navegador
   - Phoenix Code marcará el archivo como "modificado" (punto rojo)

5. GUARDAR:
   - Presiona Ctrl+S (o Cmd+S en Mac)
   - O ve a File → Save

6. VER CAMBIOS:
   - Recarga el navegador (F5 o Cmd+R)
   - Los cambios aparecerán inmediatamente
```

---

## ⌨️ ATAJOS ÚTILES EN PHOENIX CODE

| Atajo | Función |
|-------|---------|
| `Ctrl+K Ctrl+O` | Abrir carpeta |
| `Ctrl+P` | Ir a archivo rápidamente |
| `Ctrl+F` | Buscar en el archivo |
| `Ctrl+H` | Buscar y reemplazar |
| `Ctrl+S` | Guardar |
| `Ctrl+` ` | Abrir/cerrar terminal |
| `Alt+B` o `Cmd+B` | Toogle sidebar |

---

## 🔄 SETUP RECOMENDADO

### Distribución de pantalla ideal:

```
┌─────────────────────────────────┬──────────────────────────┐
│                                 │                          │
│   PHOENIX CODE (Editor)         │   NAVEGADOR (Preview)    │
│                                 │                          │
│ - Archivo HTML abierto          │ - pocobot_mapa_interactivo
│ - Panel lateral con archivos    │ - Presiona E para editar │
│ - Terminal abajo                │ - Arrastra nodos         │
│                                 │ - Copia código           │
└─────────────────────────────────┴──────────────────────────┘
```

**Cómo lograrlo:**
1. Abre Phoenix Code a la izquierda
2. Abre navegador a la derecha
3. Ambos visibles simultáneamente
4. Edita en Phoenix Code mientras ves cambios en el navegador

---

## 🛠️ SOLUCIÓN DE PROBLEMAS EN PHOENIX CODE

### ❌ El preview no se carga

```
→ Verifica que el archivo está guardado (Ctrl+S)
→ Intenta cerrar y reabrirlo
→ Recarga el preview manualmente
→ Si persiste, usa MÉTODO 2 (servidor local)
```

### ❌ Los cambios no aparecen

```
→ Asegúrate de haber presionado Ctrl+S
→ Recarga el navegador (F5)
→ En Phoenix Code, verifica que no hay errores de sintaxis
→ Abre la consola (F12 en el navegador)
```

### ❌ La búsqueda "const nodes" no funciona

```
→ Usa Ctrl+H para "Buscar y Reemplazar"
→ Busca: const nodes = [
→ Asegúrate de coincidir exactamente
→ Phoenix Code mostrará cuántas coincidencias encontró
```

### ❌ El archivo es demasiado grande

```
→ Phoenix Code es muy rápido incluso con archivos grandes
→ Si se siente lento, cierra otros archivos
→ Ve a View → Command Palette → "Close All Editors Except"
```

---

## 📊 COMPARATIVA: Phoenix Code vs VS Code

| Característica | Phoenix Code | VS Code |
|---|---|---|
| **Preview integrado** | ✅ Sí | ❌ Necesita extensión |
| **Terminal integrado** | ✅ Sí | ✅ Sí |
| **Peso/Rapidez** | ⚡ Muy rápido | ✅ Rápido |
| **Interfaz visual** | 🎨 Moderna | 🎨 Clara |
| **Extensiones** | ✅ Algunas | ✅ Muchas |
| **Ideal para HTML** | ✅ Excelente | ✅ Bueno |

---

## 🎯 FLUJO RÁPIDO EN PHOENIX CODE

### En 5 pasos:

1. **Abrir proyecto:**
   ```
   Phoenix Code → Archivo → Abrir carpeta → Poker Combat-bot
   ```

2. **Ver preview:**
   ```
   Busca pocobot_mapa_interactivo.html → Click derecho → Preview
   ```

3. **Editar en navegador:**
   ```
   Presiona E → Arrastra nodos → Copia código
   ```

4. **Guardar en Phoenix Code:**
   ```
   Ctrl+F → Busca "const nodes = [" → Reemplaza → Ctrl+S
   ```

5. **Ver cambios:**
   ```
   Recarga navegador (F5) → ¡Listo!
   ```

---

## 💡 TIPS AVANZADOS

### Usar Search & Replace (Ctrl+H)

```
BUSCAR:    const nodes = \[.*?\];
REEMPLAZAR: const nodes = [...]

Phoenix Code soporta expresiones regulares si activas la opción
```

### Sincronizar múltiples archivos

```
1. Si editas HTML y JS, ambos se pueden editar simultáneamente
2. Phoenix Code muestra cambios sin guardar con un punto
3. Guarda ambos con Ctrl+Shift+S (Save All)
```

### Ver cambios sin recargar

```
Si actualizas solo el array "const nodes", 
algunos cambios se reflejan sin recargar la página
(depende del navegador y la cache)
```

---

## 📚 ARCHIVOS RELACIONADOS

Todos estos archivos están en tu carpeta `Poker Combat-bot`:

- **pocobot_mapa_interactivo.html** - Archivo principal (6.7 MB)
- **EDITOR_VISUAL.js** - Script del editor visual
- **GUIA_VISUAL.html** - Guía interactiva (ábrela en navegador)
- **GUIA_EDITAR_POSICIONES.md** - Guía completa
- **GUIA_PHOENIX_CODE.md** - Esta guía
- **INICIO_RAPIDO.txt** - Resumen rápido

---

## ✅ CHECKLIST FINAL

Antes de empezar:

- [ ] Phoenix Code está abierto
- [ ] Carpeta `Poker Combat-bot` está abierta en Phoenix Code
- [ ] Archivo `pocobot_mapa_interactivo.html` es visible
- [ ] Archivo `EDITOR_VISUAL.js` está en la carpeta
- [ ] Tienes un navegador abierto (Chrome, Safari, Firefox)
- [ ] Puedes ver el archivo HTML en el navegador

¡Listo para editar! 🚀

---

## ❓ ¿PREGUNTAS?

- **¿Puedo editar desde Phoenix Code directamente?**
  → Sí, pero debes copiar/pegar el código. El editor visual solo funciona en el navegador.

- **¿Se pierde mi trabajo si cierro Phoenix Code?**
  → No, siempre que hayas guardado (Ctrl+S). Los cambios están en el archivo.

- **¿Puedo ver los cambios en tiempo real?**
  → Sí, si usas el preview integrado. Si usas servidor local, recarga con F5.

- **¿Necesito instalar algo más?**
  → No, solo Phoenix Code y un navegador. El servidor HTTP viene con Python.

---

**¡Disfruta editando en Phoenix Code!** 🔥
