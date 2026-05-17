const API = "http://localhost:3000/api";
let map;
let geoJsonLayer;
let universidades = [];
let carreras = [];
let currentLayer = null;

// Inicializar mapa
async function initMap() {
    // Límites exactos de Colombia
    const colombiaBounds = L.latLngBounds([-4.5, -79.0], [13.0, -66.5]);
    
    map = L.map('map', {
        center: [4.5709, -74.2973],
        zoom: 6,
        minZoom: 5,
        maxZoom: 9,
        maxBounds: colombiaBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: true
    });
    
    // Fondo gris claro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 5
    }).addTo(map);
    
    // Cargar datos
    await cargarUniversidades();
    await cargarCarreras();
    await cargarMapaColombia();
    llenarFiltros();
}

// Cargar universidades
async function cargarUniversidades() {
    try {
        const response = await fetch(`${API}/universidades`);
        universidades = await response.json();
        console.log(`✅ Cargadas ${universidades.length} universidades`);
        renderUniversidades();
    } catch (error) {
        console.error("Error cargando universidades:", error);
    }
}

// Cargar carreras
async function cargarCarreras() {
    try {
        const response = await fetch(`${API}/carreras`);
        carreras = await response.json();
        console.log(`✅ Cargadas ${carreras.length} carreras`);
        renderCarrerasDestacadas();
    } catch (error) {
        console.error("Error cargando carreras:", error);
    }
}

// Cargar mapa de Colombia desde archivo local (geoBoundaries)
async function cargarMapaColombia() {
    console.log("🔄 Cargando mapa de Colombia desde archivo local...");

    try {
        const response = await fetch('colombia.geojson');
        
        if (!response.ok) {
            throw new Error(`No se pudo cargar colombia.geojson`);
        }

        const geojsonData = await response.json();
        console.log("✅ GeoJSON cargado correctamente");

        // Agrupar universidades por departamento
        const universidadesPorDepto = {};
        universidades.forEach(u => {
            const depto = u.departamento;
            if (!universidadesPorDepto[depto]) {
                universidadesPorDepto[depto] = [];
            }
            universidadesPorDepto[depto].push(u);
        });

        if (geoJsonLayer) {
            map.removeLayer(geoJsonLayer);
        }

        function getDepartmentName(feature) {
            return feature.properties?.shapeName || 
                   feature.properties?.NOMBRE_DPT || 
                   feature.properties?.name || 
                   'Desconocido';
        }

        geoJsonLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                return {
                    color: '#2c3e50',
                    weight: 1.5,
                    fillColor: '#3498db',
                    fillOpacity: 0.5
                };
            },
            onEachFeature: function(feature, layer) {
                const nombreDepto = getDepartmentName(feature);
                const unis = universidadesPorDepto[nombreDepto] || [];
                const totalUnis = unis.length;
                console.log(`Departamento: ${nombreDepto}, Universidades: ${totalUnis}`);

                // Tooltip
                layer.bindTooltip(nombreDepto, { sticky: true, className: 'deptoTooltip' });

                // Estilos para hover
                const estiloOriginal = {
                    color: '#2c3e50',
                    weight: 1.5,
                    fillColor: '#3498db',
                    fillOpacity: 0.5
                };
                const estiloHover = {
                    color: '#c0392b',
                    weight: 2.5,
                    fillColor: '#e74c3c',
                    fillOpacity: 0.7
                };

                layer.on('mouseover', function() {
                    layer.setStyle(estiloHover);
                    layer.bringToFront();
                });
                layer.on('mouseout', function() {
                    layer.setStyle(estiloOriginal);
                });

                // Click para mostrar universidades en el lateral
                layer.on('click', () => {
                    if (totalUnis > 0) {
                        seleccionarDepartamento(nombreDepto);
                    } else {
                        alert(`No hay universidades registradas en ${nombreDepto}`);
                    }
                });
            }
        }).addTo(map);

        map.fitBounds(geoJsonLayer.getBounds());
        console.log("✅ Mapa de Colombia cargado correctamente");

    } catch (error) {
        console.error('Error cargando el mapa:', error);
        cargarMarcadoresFallback();
    }
}

// Función de respaldo (marcadores)
function cargarMarcadoresFallback() {
    console.log('⚠️ Usando marcadores de respaldo');
    
    const departamentosConUniversidades = {};
    universidades.forEach(u => {
        const depto = u.departamento;
        if (!departamentosConUniversidades[depto]) {
            departamentosConUniversidades[depto] = [];
        }
        departamentosConUniversidades[depto].push(u);
    });
    
    const coordenadas = {
        'Antioquia': [6.2442, -75.5812],
        'Bogotá': [4.7110, -74.0721],
        'Valle del Cauca': [3.4516, -76.5320],
        'Atlántico': [11.0066, -74.8090],
        'Bolívar': [10.3930, -75.4836],
        'Santander': [7.1193, -73.1227],
        'Cundinamarca': [4.5709, -74.2973],
        'Risaralda': [4.8135, -75.6957],
        'Quindío': [4.5400, -75.6726],
        'Caldas': [5.0718, -75.5184],
        'Norte de Santander': [7.8942, -72.5041],
        'Boyacá': [5.5347, -73.3618],
        'Tolima': [4.4389, -75.2328],
        'Huila': [2.9263, -75.2884],
        'Magdalena': [11.2372, -74.2014],
        'Córdoba': [8.7457, -75.8807],
        'Sucre': [9.3040, -75.3945],
        'Cesar': [10.4164, -73.2534],
        'La Guajira': [11.5230, -72.9287],
        'Meta': [4.1391, -73.6279],
        'Cauca': [2.4452, -76.6095],
        'Nariño': [1.2149, -77.2812],
        'Chocó': [5.6961, -76.6562],
        'Putumayo': [1.1427, -76.6087],
        'Amazonas': [-1.4429, -71.5721],
        'Guainía': [2.5829, -68.2025],
        'Guaviare': [2.5760, -72.6391],
        'Vaupés': [0.5641, -70.0245],
        'Vichada': [5.2240, -68.1318],
        'San Andrés': [12.5844, -81.7004],
        'Arauca': [7.0739, -70.7587],
        'Casanare': [5.4295, -71.7490]
    };
    
    Object.keys(coordenadas).forEach(depto => {
        const unis = departamentosConUniversidades[depto];
        if (unis && unis.length > 0) {
            const marker = L.marker(coordenadas[depto]).addTo(map);
            marker.bindPopup(`
                <div style="text-align: center;">
                    <strong>${depto}</strong><br>
                    🏛️ ${unis.length} universidades<br>
                    <button onclick="seleccionarDepartamento('${depto}')">Ver universidades</button>
                </div>
            `);
        }
    });
}

// ==================== FUNCIÓN PRINCIPAL PARA SELECCIONAR DEPARTAMENTO ====================
function seleccionarDepartamento(departamento) {
    console.log(`🖱️ Seleccionado departamento: ${departamento}`);
    
    // Actualizar el selector de filtro
    const deptoSelect = document.getElementById('filtro-departamento');
    if (deptoSelect) {
        deptoSelect.value = departamento;
        // Forzar el evento de cambio para actualizar los filtros
        if (typeof filtrarPorDepartamento === 'function') {
            filtrarPorDepartamento();
        }
    }
    
    // Mostrar universidades en el panel lateral
    mostrarUniversidadesDepto(departamento);
    
    // Centrar mapa en el departamento (opcional)
    if (geoJsonLayer) {
        let deptoLayer = null;
        geoJsonLayer.eachLayer(function(layer) {
            if (layer.feature) {
                const nombreFeature = getDepartmentName(layer.feature);
                if (nombreFeature === departamento) {
                    deptoLayer = layer;
                }
            }
        });
        if (deptoLayer) {
            map.fitBounds(deptoLayer.getBounds());
        }
    }
}

// Función auxiliar para obtener nombre del departamento desde el feature
function getDepartmentName(feature) {
    return feature.properties?.shapeName || 
           feature.properties?.NOMBRE_DPT || 
           feature.properties?.name || 
           'Desconocido';
}

// Mostrar universidades de un departamento en el panel lateral
function mostrarUniversidadesDepto(departamento) {
    const unis = universidades.filter(u => u.departamento === departamento);
    const container = document.getElementById('universidades-list');
    const title = document.getElementById('selected-department');
    
    if (!container || !title) return;
    
    if (unis.length === 0) {
        title.textContent = `${departamento} (0 universidades)`;
        container.innerHTML = '<p class="empty-message">No hay universidades registradas en este departamento</p>';
        return;
    }
    
    title.textContent = `${departamento} (${unis.length} universidades)`;
    
    container.innerHTML = unis.map(u => `
        <div class="universidad-item" onclick="verUniversidad(${u.id_universidad})">
            <h4>${escapeHtml(u.nombre)}</h4>
            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(u.ciudad)}</p>
            <p class="carreras-count">
                <i class="fas fa-book"></i> 
                ${carreras.filter(c => c.id_universidad === u.id_universidad).length} carreras
            </p>
        </div>
    `).join('');
}

// Renderizar universidades en grid
function renderUniversidades() {
    const container = document.getElementById('universidades-grid');
    if (!container) return;
    
    if (universidades.length === 0) {
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-exclamation-circle"></i><p>No hay universidades registradas</p></div>';
        return;
    }
    
    container.innerHTML = universidades.map(u => `
        <div class="universidad-card" onclick="verUniversidad(${u.id_universidad})" style="cursor: pointer;">
            <div class="universidad-card-header">
                <i class="fas fa-university"></i>
                <h3>${escapeHtml(u.nombre)}</h3>
            </div>
            <div class="universidad-card-body">
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(u.ciudad)}, ${escapeHtml(u.departamento)}</p>
                <p><i class="fas fa-info-circle"></i> ${escapeHtml(u.descripcion ? u.descripcion.substring(0, 100) : 'Sin descripción')}${u.descripcion && u.descripcion.length > 100 ? '...' : ''}</p>
            </div>
            <div class="universidad-card-footer">
                <button class="btn-ver-carreras" onclick="event.stopPropagation(); verUniversidad(${u.id_universidad})">
                    <i class="fas fa-book"></i> Ver carreras
                </button>
            </div>
        </div>
    `).join('');
}

// Renderizar carreras destacadas (primeras 6)
function renderCarrerasDestacadas() {
    const container = document.getElementById('carreras-grid');
    if (!container) return;
    
    const carrerasDestacadas = carreras.slice(0, 6);
    
    if (carrerasDestacadas.length === 0) {
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-exclamation-circle"></i><p>No hay carreras registradas</p></div>';
        return;
    }
    
    container.innerHTML = carrerasDestacadas.map(c => `
        <div class="carrera-card">
            <span class="area">${escapeHtml(c.area_nombre)}</span>
            <h4>${escapeHtml(c.nombre)}</h4>
            <p>${escapeHtml(c.descripcion ? c.descripcion.substring(0, 80) : 'Sin descripción')}${c.descripcion && c.descripcion.length > 80 ? '...' : ''}</p>
            <div class="universidad">
                <i class="fas fa-university"></i> ${escapeHtml(c.universidad_nombre)}
            </div>
        </div>
    `).join('');
}

// Ver universidad específica
function verUniversidad(idUniversidad) {
    window.location.href = `uniDetalle.html?id=${idUniversidad}`;
}

// Llenar filtros
function llenarFiltros() {
    const departamentos = [...new Set(universidades.map(u => u.departamento))].sort();
    const deptoSelect = document.getElementById('filtro-departamento');
    const ciudadSelect = document.getElementById('filtro-ciudad');
    
    if (deptoSelect) {
        deptoSelect.innerHTML = '<option value="">Todos los departamentos</option>' + 
            departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
    }
    
    if (ciudadSelect) {
        ciudadSelect.innerHTML = '<option value="">Todas las ciudades</option>';
        ciudadSelect.disabled = true;
    }
}

// Filtrar por departamento
function filtrarPorDepartamento() {
    const depto = document.getElementById('filtro-departamento').value;
    const ciudadSelect = document.getElementById('filtro-ciudad');
    
    if (depto && ciudadSelect) {
        const ciudades = [...new Set(universidades.filter(u => u.departamento === depto).map(u => u.ciudad))].sort();
        ciudadSelect.innerHTML = '<option value="">Todas las ciudades</option>' + 
            ciudades.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        ciudadSelect.disabled = false;
    } else if (ciudadSelect) {
        ciudadSelect.innerHTML = '<option value="">Todas las ciudades</option>';
        ciudadSelect.disabled = true;
    }
    
    filtrarUniversidades();
    
    // Mostrar universidades del departamento seleccionado en el mapa
    if (depto) {
        mostrarUniversidadesDepto(depto);
    }
}

// Filtrar por ciudad
function filtrarPorCiudad() {
    filtrarUniversidades();
}

// Filtrar por nombre
function filtrarPorNombre() {
    filtrarUniversidades();
}

// Filtrar universidades
// Filtrar universidades
function filtrarUniversidades() {
    const depto = document.getElementById('filtro-departamento').value;
    const ciudad = document.getElementById('filtro-ciudad').value;
    // ✅ Verificar que existe antes de usarlo
    const nombreInput = document.getElementById('filtro-nombre');
    const nombre = nombreInput ? nombreInput.value.toLowerCase() : '';
    
    let filtered = universidades;
    
    if (depto) {
        filtered = filtered.filter(u => u.departamento === depto);
    }
    
    if (ciudad) {
        filtered = filtered.filter(u => u.ciudad === ciudad);
    }
    
    if (nombre) {
        filtered = filtered.filter(u => u.nombre.toLowerCase().includes(nombre));
    }
    
    const container = document.getElementById('universidades-grid');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-search"></i><p>No se encontraron universidades</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(u => `
        <div class="universidad-card" onclick="verUniversidad(${u.id_universidad})" style="cursor: pointer;">
            <div class="universidad-card-header">
                <i class="fas fa-university"></i>
                <h3>${escapeHtml(u.nombre)}</h3>
            </div>
            <div class="universidad-card-body">
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(u.ciudad)}, ${escapeHtml(u.departamento)}</p>
                <p><i class="fas fa-globe"></i> <a href="${u.sitio_web || '#'}" target="_blank" onclick="event.stopPropagation()">${u.sitio_web || 'Sitio web no disponible'}</a></p>
            </div>
            <div class="universidad-card-footer">
                <button class="btn-ver-carreras" onclick="event.stopPropagation(); verUniversidad(${u.id_universidad})">
                    <i class="fas fa-book"></i> Ver carreras
                </button>
            </div>
        </div>
    `).join('');
}

// Búsqueda global
function buscarGlobal() {
    const busqueda = document.getElementById('heroSearch').value.toLowerCase();
    
    if (!busqueda) return;
    
    const unisEncontradas = universidades.filter(u => 
        u.nombre.toLowerCase().includes(busqueda) || 
        u.ciudad.toLowerCase().includes(busqueda) ||
        u.departamento.toLowerCase().includes(busqueda)
    );
    
    const carrerasEncontradas = carreras.filter(c => 
        c.nombre.toLowerCase().includes(busqueda) ||
        c.area_nombre.toLowerCase().includes(busqueda)
    );
    
    if (unisEncontradas.length > 0 || carrerasEncontradas.length > 0) {
        let mensaje = `🔍 Resultados para "${busqueda}":\n\n`;
        
        if (unisEncontradas.length > 0) {
            mensaje += `🏛️ Universidades (${unisEncontradas.length}):\n`;
            unisEncontradas.slice(0, 5).forEach(u => {
                mensaje += `   • ${u.nombre} - ${u.ciudad}, ${u.departamento}\n`;
            });
            if (unisEncontradas.length > 5) mensaje += `   ... y ${unisEncontradas.length - 5} más\n`;
            mensaje += '\n';
        }
        
        if (carrerasEncontradas.length > 0) {
            mensaje += `📚 Carreras (${carrerasEncontradas.length}):\n`;
            carrerasEncontradas.slice(0, 5).forEach(c => {
                mensaje += `   • ${c.nombre} (${c.area_nombre}) - ${c.universidad_nombre}\n`;
            });
            if (carrerasEncontradas.length > 5) mensaje += `   ... y ${carrerasEncontradas.length - 5} más\n`;
        }
        
        alert(mensaje);
    } else {
        alert(`No se encontraron resultados para "${busqueda}"`);
    }
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
