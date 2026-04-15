const API = "http://localhost:3000/api";
let map;
let geoJsonLayer;
let universidades = [];
let carreras = [];
let departamentosMap = new Map();

// iniciar mapa
async function initMap() {
    // mapa centrado en Colombia con restricciones
    const colombiaBounds = L.latLngBounds([-4.5, -82.0], [13.0, -66.5]);
    
    map = L.map('map', {
        center: [4.5709, -74.2973],
        zoom: 6,
        minZoom: 5,
        maxZoom: 11,
        maxBounds: colombiaBounds,
        maxBoundsViscosity: 1.0
    });
    
    // capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // datos de universidades
    await cargarUniversidades();
    await cargarCarreras();
    
    //mostrar el mapa de Colombia (geojson)
    llenarFiltros();
}

//  universidades desde el backend
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

// cargar carreras
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

// Ccrgar mapa de Colombia (GeoJSON)
async function cargarMapaColombia() {
    // Agrupar universidades por departamento
    const universidadesPorDepto = {};
    universidades.forEach(u => {
        const depto = u.departamento;
        if (!universidadesPorDepto[depto]) {
            universidadesPorDepto[depto] = [];
        }
        universidadesPorDepto[depto].push(u);
        departamentosMap.set(depto, universidadesPorDepto[depto]);
    });
    
    //marcadores para cada departamento
    const coordenadasDepartamentos = {
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
    
    //marcadores para departamentos con universidades
    Object.keys(coordenadasDepartamentos).forEach(depto => {
        const unis = universidadesPorDepto[depto];
        if (unis && unis.length > 0) {
            const coords = coordenadasDepartamentos[depto];
            const marker = L.marker(coords).addTo(map);
            
            marker.bindPopup(`
                <div style="max-width: 300px;">
                    <h3 style="color: #667eea;">${depto}</h3>
                    <p><strong>${unis.length}</strong> universidades disponibles</p>
                    <button onclick="mostrarUniversidadesDepto('${depto}')" 
                        style="background: #667eea; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                        Ver universidades
                    </button>
                </div>
            `);
            
            marker.on('click', () => {
                mostrarUniversidadesDepto(depto);
            });
        }
    });
}

// mostrar  universidades de un departamento
function mostrarUniversidadesDepto(departamento) {
    const unis = universidades.filter(u => u.departamento === departamento);
    const container = document.getElementById('universidades-list');
    const title = document.getElementById('selected-department');
    
    title.textContent = `${departamento} (${unis.length} universidades)`;
    
    if (unis.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay universidades en este departamento</p>';
        return;
    }
    
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
    
    document.getElementById('map-info').scrollIntoView({ behavior: 'smooth' });
}

//universidades en crud
function renderUniversidades() {
    const container = document.getElementById('universidades-grid');
    
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
                <p><i class="fas fa-globe"></i> <a href="${u.sitio_web || '#'}" target="_blank" onclick="event.stopPropagation()">${u.sitio_web || 'Sitio web no disponible'}</a></p>
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

//carreras destacadas (primeras 6)
function renderCarrerasDestacadas() {
    const container = document.getElementById('carreras-grid');
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

// ver universidad específica (redirige a página de detalle)
function verUniversidad(idUniversidad) {
    window.location.href = `uniDetalle.html?id=${idUniversidad}`;
}

// llenar filtros de departamento y ciudad
function llenarFiltros() {
    const departamentos = [...new Set(universidades.map(u => u.departamento))].sort();
    const deptoSelect = document.getElementById('filtro-departamento');
    const ciudadSelect = document.getElementById('filtro-ciudad');
    
    deptoSelect.innerHTML = '<option value="">Todos los departamentos</option>' + 
        departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

// filtrar por departamento
function filtrarPorDepartamento() {
    const depto = document.getElementById('filtro-departamento').value;
    const ciudadSelect = document.getElementById('filtro-ciudad');
    
    if (depto) {
        const ciudades = [...new Set(universidades.filter(u => u.departamento === depto).map(u => u.ciudad))].sort();
        ciudadSelect.innerHTML = '<option value="">Todas las ciudades</option>' + 
            ciudades.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        ciudadSelect.disabled = false;
    } else {
        ciudadSelect.innerHTML = '<option value="">Todas las ciudades</option>';
        ciudadSelect.disabled = true;
    }
    
    filtrarUniversidades();
}

// filtrar por ciudad
function filtrarPorCiudad() {
    filtrarUniversidades();
}

// filtrar por nombre
function filtrarPorNombre() {
    filtrarUniversidades();
}

// filtrar universidades según todos depa, ciudad, nombre
function filtrarUniversidades() {
    const depto = document.getElementById('filtro-departamento').value;
    const ciudad = document.getElementById('filtro-ciudad').value;
    const nombre = document.getElementById('filtro-nombre').value.toLowerCase();
    
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
                    <i class="fas fa-book"></i> Ver carreras (${carreras.filter(c => c.id_universidad === u.id_universidad).length})
                </button>
            </div>
        </div>
    `).join('');
}

//bussqueda global
function buscarGlobal() {
    const busqueda = document.getElementById('heroSearch').value.toLowerCase();
    
    if (!busqueda) return;
    
    // Buscar en universidades
    const unisEncontradas = universidades.filter(u => 
        u.nombre.toLowerCase().includes(busqueda) || 
        u.ciudad.toLowerCase().includes(busqueda) ||
        u.departamento.toLowerCase().includes(busqueda)
    );
    
    //buscar en carreras
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

// toggle menu responsive
function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

// funcion escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// inicializar todo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
