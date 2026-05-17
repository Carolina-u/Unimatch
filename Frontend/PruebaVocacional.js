const API = "http://localhost:3000/api";
let preguntas = [];
let respuestasUsuario = []; // Ahora cada pregunta tendrá un ARRAY de opciones seleccionadas
let preguntaActual = 0;
let idEncuesta = 1;

// Cargar preguntas al iniciar
async function cargarPreguntas() {
    try {
        const response = await fetch(`${API}/encuesta/${idEncuesta}`);
        
        if (!response.ok) {
            throw new Error("Error al cargar preguntas");
        }
        
        preguntas = await response.json();
        
        if (preguntas.length === 0) {
            throw new Error("No hay preguntas disponibles");
        }
        
        // Inicializar respuestas como arrays vacíos
        respuestasUsuario = new Array(preguntas.length).fill().map(() => []);
        mostrarPregunta(0);
        
    } catch (error) {
        console.error("Error cargando preguntas:", error);
        const container = document.getElementById('questionsContainer');
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar las preguntas. Por favor, intenta más tarde.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function mostrarPregunta(index) {
    const container = document.getElementById('questionsContainer');
    const pregunta = preguntas[index];
    
    if (!pregunta) return;
    
    const progress = ((index + 1) / preguntas.length) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
    
    let opcionesHTML = '';
    if (pregunta.opciones && pregunta.opciones.length > 0) {
        const seleccionadas = respuestasUsuario[index] || [];
        
        pregunta.opciones.forEach(opcion => {
            const isChecked = seleccionadas.includes(opcion.id_opcion);
            opcionesHTML += `
                <div class="opcion-card" onclick="toggleOpcion(${index}, ${opcion.id_opcion})">
                    <div class="checkbox-custom ${isChecked ? 'checked' : ''}">
                        ${isChecked ? '<i class="fas fa-check-square"></i>' : '<i class="far fa-square"></i>'}
                    </div>
                    <div class="opcion-texto">${escapeHtml(opcion.texto)}</div>
                </div>
            `;
        });
    }
    
    container.innerHTML = `
        <div class="question-card">
            <div class="question-number">Pregunta ${index + 1} de ${preguntas.length}</div>
            <div class="question-text">${escapeHtml(pregunta.texto)}</div>
            <div class="opciones-container">
                ${opcionesHTML}
            </div>
            <div class="selected-info" style="margin-top: 1rem; font-size: 0.8rem; color: #a855f7;">
                <i class="fas fa-info-circle"></i> Puedes seleccionar varias opciones
            </div>
        </div>
    `;
    
    // Actualizar botones de navegación
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (prevBtn) prevBtn.disabled = index === 0;
    
    if (index === preguntas.length - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'flex';
    } else {
        if (nextBtn) nextBtn.style.display = 'flex';
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

// Función para seleccionar/deseleccionar opción (checkbox)
function toggleOpcion(preguntaIndex, opcionId) {
    if (!respuestasUsuario[preguntaIndex]) {
        respuestasUsuario[preguntaIndex] = [];
    }
    
    const index = respuestasUsuario[preguntaIndex].indexOf(opcionId);
    
    if (index === -1) {
        // Agregar opción
        respuestasUsuario[preguntaIndex].push(opcionId);
    } else {
        // Quitar opción
        respuestasUsuario[preguntaIndex].splice(index, 1);
    }
    
    // Re-renderizar la pregunta actual para mostrar los cambios visuales
    mostrarPregunta(preguntaActual);
}

function nextQuestion() {
    if (preguntaActual < preguntas.length - 1) {
        // Verificar que haya al menos una opción seleccionada
        if (!respuestasUsuario[preguntaActual] || respuestasUsuario[preguntaActual].length === 0) {
            mostrarNotificacion("Por favor selecciona al menos una opción antes de continuar", "error");
            return;
        }
        preguntaActual++;
        mostrarPregunta(preguntaActual);
    }
}

function prevQuestion() {
    if (preguntaActual > 0) {
        preguntaActual--;
        mostrarPregunta(preguntaActual);
    }
}

async function submitEncuesta() {
    // Verificar que todas las preguntas tengan al menos una respuesta
    for (let i = 0; i < respuestasUsuario.length; i++) {
        if (!respuestasUsuario[i] || respuestasUsuario[i].length === 0) {
            mostrarNotificacion(`Por favor completa todas las preguntas antes de enviar (falta pregunta ${i + 1})`, "error");
            return;
        }
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    submitBtn.disabled = true;
    
    try {
        // Calcular puntajes acumulando todas las opciones seleccionadas
        const puntajes = await calcularPuntajesMultiples();
        
        // Determinar área principal (la de mayor puntaje)
        const areaPrincipal = Object.keys(puntajes).reduce((a, b) => 
            puntajes[a] > puntajes[b] ? a : b, Object.keys(puntajes)[0]
        );
        
        // Preparar respuestas (ahora cada pregunta puede tener múltiples opciones)
        const respuestas = respuestasUsuario.map((respuestasArray, index) => ({
            id_pregunta: preguntas[index].id_pregunta,
            opciones_seleccionadas: respuestasArray // Array de IDs
        }));
        
        const response = await fetch(`${API}/encuesta/resultado-multiple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                respuestas: respuestas,
                area_principal: parseInt(areaPrincipal),
                puntajes_completos: puntajes
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarResultados(data, puntajes);
        } else {
            mostrarNotificacion(data.mensaje || "Error al guardar el resultado", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al procesar el test", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Calcular puntajes sumando todas las opciones seleccionadas
async function calcularPuntajesMultiples() {
    const puntajesPorArea = {};
    
    for (let i = 0; i < respuestasUsuario.length; i++) {
        const opcionesIds = respuestasUsuario[i];
        
        if (opcionesIds && opcionesIds.length > 0) {
            for (const opcionId of opcionesIds) {
                try {
                    const response = await fetch(`${API}/opcion-puntajes/${opcionId}`);
                    const puntajesOpcion = await response.json();
                    
                    puntajesOpcion.forEach(p => {
                        if (!puntajesPorArea[p.id_area]) {
                            puntajesPorArea[p.id_area] = 0;
                        }
                        puntajesPorArea[p.id_area] += p.puntaje;
                    });
                } catch (error) {
                    console.error(`Error obteniendo puntajes para opción ${opcionId}:`, error);
                }
            }
        }
    }
    
    return puntajesPorArea;
}

function mostrarResultados(data, puntajes) {
    const modal = document.getElementById('resultadosModal');
    const container = document.getElementById('resultadosContainer');
    
    let areaNombre = "Área no identificada";
    if (dbAreas && dbAreas.length > 0) {
        const area = dbAreas.find(a => a.id_area === data.area_recomendada);
        if (area) areaNombre = area.nombre;
    }
    
    let universidadesHTML = '';
    if (data.universidades_recomendadas && data.universidades_recomendadas.length > 0) {
        universidadesHTML = `
            <h3 style="color: #e9d5ff; margin: 1rem 0;">Universidades recomendadas:</h3>
            <div class="universidades-list">
                ${data.universidades_recomendadas.map(u => `
                    <div class="universidad-card">
                        <h4><i class="fas fa-university"></i> ${escapeHtml(u.nombre)}</h4>
                        <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(u.ciudad)}, ${escapeHtml(u.departamento)}</p>
                        <p><i class="fas fa-book"></i> ${u.total_carreras} carreras disponibles</p>
                        ${u.sitio_web ? `<p><i class="fas fa-globe"></i> <a href="${u.sitio_web}" target="_blank" style="color: #c084fc;">Visitar sitio web</a></p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        universidadesHTML = '<p style="color: #c4b5fd;">No hay universidades recomendadas para esta área aún.</p>';
    }
    
    let puntajesHTML = '<div style="margin: 1rem 0; text-align: left;"><h3 style="color: #e9d5ff;">Tus puntajes por área:</h3>';
    const areasOrdenadas = Object.entries(puntajes).sort((a, b) => b[1] - a[1]);
    
    for (const [areaId, puntaje] of areasOrdenadas) {
        let areaNombreLocal = `Área ${areaId}`;
        if (dbAreas && dbAreas.length > 0) {
            const area = dbAreas.find(a => a.id_area === parseInt(areaId));
            if (area) areaNombreLocal = area.nombre;
        }
        const porcentaje = (puntaje / Object.values(puntajes).reduce((a, b) => a + b, 0) * 100).toFixed(1);
        puntajesHTML += `
            <div style="margin: 0.5rem 0;">
                <div style="display: flex; justify-content: space-between; color: #c4b5fd;">
                    <span>${escapeHtml(areaNombreLocal)}</span>
                    <span>${puntaje} pts (${porcentaje}%)</span>
                </div>
                <div style="background: #0f0a1a; border-radius: 10px; height: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #7c6ccf, #a855f7); width: ${porcentaje}%; height: 100%;"></div>
                </div>
            </div>
        `;
    }
    puntajesHTML += '</div>';
    
    container.innerHTML = `
        <div class="area-resultado">
            <h3><i class="fas fa-star"></i> ${escapeHtml(areaNombre)}</h3>
            <p>Esta es tu área vocacional principal según tus respuestas.</p>
        </div>
        ${puntajesHTML}
        ${universidadesHTML}
        <button onclick="guardarYReiniciar()" class="btn-success" style="margin-top: 1rem; width: 100%;">
            <i class="fas fa-redo-alt"></i> Realizar otro test
        </button>
    `;
    
    modal.style.display = 'flex';
}

function guardarYReiniciar() {
    cerrarResultados();
    respuestasUsuario = new Array(preguntas.length).fill().map(() => []);
    preguntaActual = 0;
    mostrarPregunta(0);
}

function cerrarResultados() {
    const modal = document.getElementById('resultadosModal');
    modal.style.display = 'none';
}

function mostrarNotificacion(mensaje, tipo = "info") {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.textContent = mensaje;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'error' ? '#d16767' : '#3bbf8b'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let dbAreas = [];

async function cargarAreas() {
    try {
        const response = await fetch(`${API}/areas`);
        dbAreas = await response.json();
    } catch (error) {
        console.error("Error cargando áreas:", error);
    }
}

async function init() {
    await cargarAreas();
    await cargarPreguntas();
}

init();
