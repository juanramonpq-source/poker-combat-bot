# 🛠️ INTEGRAR EDITOR VISUAL AL MAPA

El editor visual permite editar las posiciones de los nodos directamente arrastrándolos en la pantalla.

## Opción A: Integración Rápida (Recomendado)

### Paso 1: Abrir el archivo HTML
```bash
# En Visual Studio Code:
# Abre: Poker Combat-bot/pocobot_mapa_interactivo.html
```

### Paso 2: Agregar una línea antes del cierre `</body>`

Busca la línea `</body>` (al final del archivo, línea ~825) y agrega:

```html
  <script src="EDITOR_VISUAL.js"></script>
</body>
```

**Así debe quedar:**
```html
    // ... resto del código ...

  <script src="EDITOR_VISUAL.js"></script>
</body>
</html>
```

### Paso 3: Guardar y recargar

1. Guarda el archivo (`Ctrl+S` / `Cmd+S`)
2. Recarga la página en el navegador (`F5` / `Cmd+R`)
3. Verás un mensaje en la consola: **"✅ Editor Visual cargado. Presiona E para activar."**

---

## Opción B: Integración Inline (Si prefieres todo en un archivo)

Si quieres que todo esté en un solo archivo HTML sin referencias externas:

1. Abre `EDITOR_VISUAL.js`
2. Copia TODO su contenido
3. En `pocobot_mapa_interactivo.html`, antes de `</body>`, agrega:

```html
  <script>
    // PEGA AQUÍ TODO EL CONTENIDO DE EDITOR_VISUAL.js
    // (desde "class PoCoBOTNodeEditor" hasta el final)
  </script>
</body>
</html>
```

---

## ✅ Verificar que funciona

Después de integrar:

1. Abre el navegador y ve a tu página
2. **Presiona `E`** en el teclado
3. Deberías ver un panel en la esquina inferior derecha
4. Intenta **arrastar un nodo** - debería moverse suavemente
5. Las coordenadas aparecerán en el panel

---

## 🎮 Usar el Editor

### Controles Principales

| Tecla | Acción |
|-------|--------|
| **`E`** | Activar/Desactivar Modo Editor |
| **`G`** | Mostrar/Ocultar Grid de ayuda (en modo editor) |
| **`R`** | Resetear posiciones (en modo editor) |

### En Modo Editor

1. **Arrastra cualquier nodo** con el ratón
2. El panel mostrará las coordenadas actuales (X%, Y%)
3. Las coordenadas se actualizan en tiempo real
4. El código JSON se actualiza automáticamente

### Exportar Posiciones

1. En el panel del editor, haz clic en **"📋 COPIAR TODO"**
2. Se copiaráel código al portapapeles
3. Abre `pocobot_mapa_interactivo.html` en tu editor de texto
4. **Busca:** `const nodes = [...]` (línea ~629)
5. **Reemplaza:** TODO el array con lo que copiaste
6. **Guarda:** el archivo
7. **Recarga:** la página en el navegador

---

## 📝 Ejemplo de Flujo Completo

### Escenario: Quiero mover el primer nodo a otra posición

**Paso 1:** Abrir en Visual Studio
```
Abre: Poker Combat-bot/pocobot_mapa_interactivo.html
Con Live Server: Click derecho → "Open with Live Server"
```

**Paso 2:** Entrar en Modo Editor
```
Presiona: E
```

**Paso 3:** Editar la posición
```
Arrastra el nodo "HANGAR DE LA FOSA AZUL" a donde quieras
Verás que X e Y cambian en el panel derecho
```

**Paso 4:** Exportar el código
```
Haz clic en: "📋 COPIAR TODO"
El código se copia automáticamente
```

**Paso 5:** Guardar cambios
```
1. Ve al editor (VS Code)
2. Busca la línea: const nodes = [
3. Reemplaza TODO el array con lo que copiaste
4. Guarda el archivo (Ctrl+S)
5. Recarga la página (F5)
```

**Paso 6:** Verificar cambios
```
Presiona E para salir del editor
Los cambios deben verse en la posición del nodo
```

---

## 🐛 Solución de Problemas

### "No veo el panel del editor"
- Asegúrate de haber agregado `<script src="EDITOR_VISUAL.js"></script>` antes de `</body>`
- Verifica que `EDITOR_VISUAL.js` esté en la misma carpeta que el HTML
- Abre la consola (F12) y busca mensajes de error

### "El editor no responde al presionar E"
- Verifica que la página está completamente cargada
- Recarga con F5
- Abre la consola y verifica si hay errores

### "No puedo copiar el código"
- Haz clic en el botón "📋 COPIAR TODO"
- Si sale error, abre la consola (F12)
- El código también aparecerá impreso en la consola

### "Los cambios no se guardan"
- El editor SOLO actualiza la pantalla
- Debes **reemplazar manualmente** el array `const nodes = [...]` en el archivo
- Luego guardar con Ctrl+S
- Finalmente recargar la página

---

## 📚 Archivos Relacionados

- ✅ `pocobot_mapa_interactivo.html` - Archivo principal (6.7 MB)
- ✅ `EDITOR_VISUAL.js` - Script del editor (este archivo)
- ✅ `GUIA_EDITAR_POSICIONES.md` - Guía de uso
- ✅ `INTEGRAR_EDITOR.md` - Esta guía

---

## 💡 Tips Avanzados

### Usar Grid para alineación
- Presiona `G` en Modo Editor para ver una malla de 10% de ancho
- Los nodos se alinean automáticamente a la malla
- Útil para crear layouts estructurados

### Copiar código solo de un nodo
- En el panel, haz clic en el nodo que quieres
- El panel mostrará sus coordenadas actuales
- Copia manualmente desde la consola

### Ver todos los cambios
- En Modo Editor, el código JSON se actualiza automáticamente
- Puedes scrollear en el panel para ver todo el array
- Cada nodo se muestra como: `{ id, x, y }`

---

## ¿Necesitas más help?

Si algo no funciona:
1. Abre la consola (F12 → Consola)
2. Verifica los mensajes de error
3. Revisa que los archivos están en la misma carpeta
4. Intenta recargar la página (Ctrl+R)

¡Happy editing! 🚀
