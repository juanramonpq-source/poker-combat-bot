/**
 * EDITOR VISUAL DE POSICIONES - PoCoBOT
 *
 * Este módulo agrega un modo editor visual al mapa interactivo.
 * Presiona 'E' para activar/desactivar el modo editor.
 *
 * Funcionalidades:
 * - Drag & drop de nodos
 * - Visualización de coordenadas en tiempo real
 * - Grid de ayuda
 * - Exportación de código actualizado
 */

class PoCoBOTNodeEditor {
    constructor(nodes, mapShell) {
        this.nodes = nodes;
        this.mapShell = mapShell;
        this.editorActive = false;
        this.draggingNode = null;
        this.gridVisible = false;
        this.gridSize = 10; // 10% del viewport

        this.initEditor();
    }

    initEditor() {
        // Crear estilos del editor
        this.createEditorStyles();

        // Crear UI del editor
        this.createEditorUI();

        // Agregar event listeners
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Drag & drop
        this.mapShell.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());
    }

    createEditorStyles() {
        const style = document.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            .editor-panel {
                display: none;
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 400px;
                max-height: 500px;
                background: rgba(8, 12, 17, 0.95);
                border: 2px solid #70dcff;
                border-radius: 12px;
                padding: 20px;
                z-index: 1000;
                font-family: 'Courier New', monospace;
                color: #ebf3f6;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }

            .editor-panel.active {
                display: block;
            }

            .editor-panel h3 {
                margin: 0 0 15px 0;
                color: #70dcff;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .editor-info {
                background: rgba(112, 220, 255, 0.1);
                border-left: 3px solid #70dcff;
                padding: 10px;
                margin-bottom: 15px;
                font-size: 12px;
                border-radius: 4px;
            }

            .editor-info strong {
                color: #8ef3ff;
            }

            .editor-code {
                background: rgba(0,0,0,0.3);
                border: 1px solid #70dcff;
                border-radius: 4px;
                padding: 12px;
                font-size: 10px;
                line-height: 1.4;
                max-height: 250px;
                overflow-y: auto;
                margin-bottom: 15px;
                word-break: break-all;
                color: #61da9b;
            }

            .editor-buttons {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .editor-btn {
                flex: 1;
                min-width: 100px;
                padding: 8px 12px;
                background: rgba(112, 220, 255, 0.1);
                border: 1px solid #70dcff;
                color: #70dcff;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                text-transform: uppercase;
                font-weight: bold;
                transition: all 0.3s ease;
            }

            .editor-btn:hover {
                background: rgba(112, 220, 255, 0.3);
                box-shadow: 0 0 10px rgba(112, 220, 255, 0.5);
            }

            .editor-btn.danger {
                border-color: #ff8c69;
                color: #ff8c69;
            }

            .editor-btn.danger:hover {
                background: rgba(255, 140, 105, 0.1);
                box-shadow: 0 0 10px rgba(255, 140, 105, 0.5);
            }

            .editor-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background:
                    repeating-linear-gradient(
                        0deg,
                        rgba(112, 220, 255, 0.03),
                        rgba(112, 220, 255, 0.03) 1px,
                        transparent 1px,
                        transparent 2px
                    ),
                    repeating-linear-gradient(
                        90deg,
                        rgba(112, 220, 255, 0.03),
                        rgba(112, 220, 255, 0.03) 1px,
                        transparent 1px,
                        transparent 2px
                    );
                background-size: 10vw 10vh;
                pointer-events: none;
                z-index: 999;
            }

            .editor-overlay.active {
                display: block;
            }

            .editor-tooltip {
                position: fixed;
                background: rgba(8, 12, 17, 0.95);
                border: 1px solid #70dcff;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 11px;
                color: #70dcff;
                font-family: 'Courier New', monospace;
                pointer-events: none;
                z-index: 1001;
                white-space: nowrap;
                display: none;
            }

            .editor-tooltip.visible {
                display: block;
            }

            .editor-marker {
                display: none;
                position: absolute;
                width: 4px;
                height: 4px;
                background: #70dcff;
                border: 1px solid #8ef3ff;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 998;
            }

            .editor-marker.active {
                display: block;
            }

            .node.editing {
                outline: 2px dashed #70dcff;
                outline-offset: 4px;
            }

            .editor-instructions {
                background: rgba(255, 170, 0, 0.1);
                border-left: 3px solid #ffaa00;
                padding: 10px;
                margin-bottom: 15px;
                font-size: 11px;
                border-radius: 4px;
                color: #ffaa00;
            }
        `;
        document.head.appendChild(style);
    }

    createEditorUI() {
        // Panel del editor
        const panel = document.createElement('div');
        panel.id = 'editor-panel';
        panel.className = 'editor-panel';
        panel.innerHTML = `
            <h3>⚙️ MODO EDITOR - POSICIONES</h3>

            <div class="editor-instructions">
                🖱️ Arrastra los nodos para reposicionarlos<br>
                📍 Las coordenadas se actualizan en tiempo real
            </div>

            <div class="editor-info">
                <strong>Nodo:</strong> <span id="editor-node-name">-</span><br>
                <strong>X:</strong> <span id="editor-node-x">-</span>%<br>
                <strong>Y:</strong> <span id="editor-node-y">-</span>%
            </div>

            <h3 style="margin-top: 15px; margin-bottom: 10px;">📄 Código Actualizado</h3>
            <div class="editor-code" id="editor-code-display">
                Posiciona un nodo para ver su código...
            </div>

            <div class="editor-buttons">
                <button class="editor-btn" onclick="pocobotEditor.copyAllCode()">
                    📋 COPIAR TODO
                </button>
                <button class="editor-btn danger" onclick="pocobotEditor.resetPositions()">
                    ↺ RESETEAR
                </button>
            </div>

            <p style="font-size: 10px; color: #9baab3; margin-top: 15px;">
                Presiona <strong>E</strong> para salir del editor<br>
                Presiona <strong>G</strong> para mostrar grid
            </p>
        `;
        document.body.appendChild(panel);

        // Overlay del grid
        const overlay = document.createElement('div');
        overlay.className = 'editor-overlay';
        document.body.appendChild(overlay);

        // Tooltip del editor
        const tooltip = document.createElement('div');
        tooltip.className = 'editor-tooltip';
        document.body.appendChild(tooltip);

        this.editorPanel = panel;
        this.editorOverlay = overlay;
        this.editorTooltip = tooltip;
    }

    handleKeyPress(e) {
        if (e.key.toLowerCase() === 'e') {
            e.preventDefault();
            this.toggleEditor();
        }
        if (e.key.toLowerCase() === 'g' && this.editorActive) {
            e.preventDefault();
            this.toggleGrid();
        }
        if (e.key.toLowerCase() === 'r' && this.editorActive) {
            e.preventDefault();
            this.resetPositions();
        }
    }

    toggleEditor() {
        this.editorActive = !this.editorActive;

        if (this.editorActive) {
            this.editorPanel.classList.add('active');
            this.mapShell.style.cursor = 'grab';
            console.log('✓ Modo Editor ACTIVADO. Arrastra los nodos para reposicionarlos.');
            console.log('Atajos: E=Salir | G=Grid | R=Resetear | Clic en nodo=Ver código');
        } else {
            this.editorPanel.classList.remove('active');
            this.editorOverlay.classList.remove('active');
            this.mapShell.style.cursor = 'default';
            this.draggingNode = null;
            console.log('✓ Modo Editor DESACTIVADO');
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        if (this.gridVisible) {
            this.editorOverlay.classList.add('active');
            console.log('✓ Grid visible');
        } else {
            this.editorOverlay.classList.remove('active');
            console.log('✓ Grid oculto');
        }
    }

    startDrag(e) {
        if (!this.editorActive) return;

        const button = e.target.closest('.node');
        if (!button) return;

        e.preventDefault();
        this.draggingNode = button;
        this.mapShell.style.cursor = 'grabbing';
    }

    handleDrag(e) {
        if (!this.draggingNode || !this.editorActive) return;

        const mapRect = this.mapShell.getBoundingClientRect();
        const x = ((e.clientX - mapRect.left) / mapRect.width) * 100;
        const y = ((e.clientY - mapRect.top) / mapRect.height) * 100;

        // Limitar a los bordes del mapa
        const boundedX = Math.max(2, Math.min(98, x));
        const boundedY = Math.max(2, Math.min(98, y));

        this.draggingNode.style.left = `${boundedX}%`;
        this.draggingNode.style.top = `${boundedY}%`;

        // Actualizar el nodo en la estructura
        const nodeId = this.draggingNode.dataset.id;
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.x = parseFloat(boundedX.toFixed(2));
            node.y = parseFloat(boundedY.toFixed(2));

            // Actualizar UI del editor
            this.updateEditorUI(node);
        }

        // Mostrar tooltip con coordenadas
        this.editorTooltip.textContent = `X: ${boundedX.toFixed(1)}% | Y: ${boundedY.toFixed(1)}%`;
        this.editorTooltip.style.left = `${e.clientX + 10}px`;
        this.editorTooltip.style.top = `${e.clientY + 10}px`;
        this.editorTooltip.classList.add('visible');
    }

    endDrag() {
        if (this.draggingNode) {
            this.mapShell.style.cursor = this.editorActive ? 'grab' : 'default';
            this.draggingNode.classList.remove('editing');
            this.draggingNode = null;
        }
        this.editorTooltip.classList.remove('visible');
    }

    updateEditorUI(node) {
        document.getElementById('editor-node-name').textContent = node.name;
        document.getElementById('editor-node-x').textContent = node.x.toFixed(2);
        document.getElementById('editor-node-y').textContent = node.y.toFixed(2);

        this.updateCodeDisplay();
    }

    updateCodeDisplay() {
        const codeDisplay = document.getElementById('editor-code-display');

        // Mostrar el array completo formateado
        const formattedCode = JSON.stringify(this.nodes, null, 2);

        // Crear un resumen más legible
        const summary = this.nodes.map(n =>
            `{ id: "${n.id}", x: ${n.x.toFixed(2)}, y: ${n.y.toFixed(2)} }`
        ).join(',\n');

        codeDisplay.innerHTML = `<pre>const nodes = [
${summary}
];</pre>`;
    }

    copyAllCode() {
        const code = `const nodes = ${JSON.stringify(this.nodes, null, 2)};`;

        navigator.clipboard.writeText(code).then(() => {
            console.log('✓ Código copiado al portapapeles');
            alert('✓ Código de nodos copiado al portapapeles\n\nReeemplaza la línea "const nodes = [...]" en pocobot_mapa_interactivo.html');
        }).catch(err => {
            console.error('Error al copiar:', err);
            alert('Error al copiar. Abre la consola para ver el código.');
            console.log(code);
        });
    }

    resetPositions() {
        if (confirm('¿Resetear todas las posiciones a los valores originales?')) {
            // Esto requiere tener los valores originales guardados
            // Por ahora, solo mostramos un mensaje
            console.log('Para resetear, copia este código y reemplázalo en el archivo:');
            console.log(JSON.stringify(this.nodes, null, 2));
            alert('Función de resetear: Los cambios se aplicarán cuando guardes el archivo HTML y recargues la página.');
        }
    }
}

// Inicializar el editor cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que los nodos estén disponibles en la ventana global
    if (typeof nodes !== 'undefined' && document.getElementById('mapShell')) {
        window.pocobotEditor = new PoCoBOTNodeEditor(nodes, document.getElementById('mapShell'));
        console.log('✅ Editor Visual cargado. Presiona E para activar.');
    }
});
