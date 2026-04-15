const API = "http://localhost:3000/api";
const token = localStorage.getItem("token");
let db = { 
    estado_universidad: [], 
    area_vocacional: [], 
    universidad: [], 
    carrera: [],
    roles: [],
    administradores: []
};
let myChartAreas = null;
let myChartUnis = null;
let myChartDistribucion = null;
let currentUserRol = localStorage.getItem("rol");

if (!token) location.href = "loginAdmin.html";

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = "success") {
    const notification = document.getElementById("notification");
    notification.textContent = mensaje;
    notification.className = `notification ${tipo}`;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}

// Cargar datos iniciales
async function loadData() {
    const headers = { "Authorization": token };
    try {
        const [ests, areas, unis, carrs, roles, admins] = await Promise.all([
            fetch(`${API}/estado-universidad`).then(r => r.json()),
            fetch(`${API}/areas`).then(r => r.json()),
            fetch(`${API}/universidades`).then(r => r.json()),
            fetch(`${API}/carreras`).then(r => r.json()),
            fetch(`${API}/roles`, { headers }).then(r => r.json()),
            fetch(`${API}/administradores`, { headers }).then(r => r.json())
        ]);
        
        db = { 
            estado_universidad: ests, 
            area_vocacional: areas, 
            universidad: unis, 
            carrera: carrs,
            roles: roles,
            administradores: admins
        };
        
        // Llenar selects
        const uEstadoSelect = document.getElementById('u_estado');
        if (uEstadoSelect) {
            uEstadoSelect.innerHTML = '<option value="">Seleccionar estado...</option>' + 
                ests.map(e => `<option value="${e.id_estado}">${e.nombre}</option>`).join('');
        }
        
        const cAreaSelect = document.getElementById('c_area');
        if (cAreaSelect) {
            cAreaSelect.innerHTML = '<option value="">Seleccionar área...</option>' + 
                areas.map(a => `<option value="${a.id_area}">${a.nombre}</option>`).join('');
        }
        
        const cUniSelect = document.getElementById('c_uni');
        if (cUniSelect) {
            cUniSelect.innerHTML = '<option value="">Seleccionar universidad...</option>' + 
                unis.map(u => `<option value="${u.id_universidad}">${u.nombre}</option>`).join('');
        }
        
        const admRolSelect = document.getElementById('adm_rol');
        if (admRolSelect) {
            admRolSelect.innerHTML = roles.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
        }
        
    } catch (error) {
        console.error("Error loading data:", error);
        mostrarNotificacion("Error al cargar datos", "error");
    }
}

function mostrarSeccion(id) {
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(id);
    if (section) section.style.display = 'block';
    if(id === 'dashboard') initDashboard();
    if(id === 'universidades') renderUnis();
    if(id === 'carreras') renderCarreras();
    if(id === 'administradores') renderAdmins();
}

async function initDashboard() {
    try {
        const headers = { "Authorization": token };
        const resCount = await fetch(`${API}/admin/stats-counts`, { headers });
        const counts = await resCount.json();
        document.getElementById('dashUnis').textContent = counts.unis;
        document.getElementById('dashCarreras').textContent = counts.carreras;
        document.getElementById('dashTests').textContent = counts.tests;

        const resAreas = await fetch(`${API}/admin/stats-areas`, { headers });
        const dataAreas = await resAreas.json();

        const resUnis = await fetch(`${API}/admin/stats-universidades`, { headers });
        const dataUnis = await resUnis.json();

        // Gráfico de áreas (pastel)
        const ctxAreas = document.getElementById('chartAreas');
        if (ctxAreas) {
            const ctx = ctxAreas.getContext('2d');
            if (myChartAreas) myChartAreas.destroy();
            myChartAreas = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: dataAreas.map(a => a.nombre),
                    datasets: [{ 
                        data: dataAreas.map(a => a.total), 
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#f97316']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            labels: { color: '#e2e8f0' },
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} tests (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Gráfico de universidades (barras)
        const ctxUnis = document.getElementById('chartUnis');
        if (ctxUnis) {
            const ctx = ctxUnis.getContext('2d');
            if (myChartUnis) myChartUnis.destroy();
            myChartUnis = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dataUnis.map(u => u.nombre),
                    datasets: [{ 
                        label: 'Número de Carreras',
                        data: dataUnis.map(u => u.total_carreras),
                        backgroundColor: '#3b82f6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } }
                    },
                    scales: {
                        y: { 
                            ticks: { color: '#e2e8f0', stepSize: 1 },
                            grid: { color: '#334155' }
                        },
                        x: { 
                            ticks: { color: '#e2e8f0' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
        // Cargar estadísticas de encuestas
        await cargarEstadisticasEncuestas();
        
    } catch (error) {
        console.error("Error loading dashboard:", error);
        mostrarNotificacion("Error al cargar el dashboard", "error");
    }
}

function actualizarDashboard() {
    initDashboard();
    mostrarNotificacion("Dashboard actualizado", "success");
}

// Cargar estadísticas de encuestas
async function cargarEstadisticasEncuestas() {
    try {
        const headers = { "Authorization": token };
        
        const resDistribucion = await fetch(`${API}/admin/encuesta/distribucion-areas`, { headers });
        
        if (!resDistribucion.ok) {
            throw new Error("Error en la respuesta del servidor");
        }
        
        const distribucion = await resDistribucion.json();
        
        const totalTests = distribucion.reduce((sum, item) => sum + (item.total_tests || 0), 0);
        const totalTestsElem = document.getElementById('totalTests');
        if (totalTestsElem) totalTestsElem.textContent = totalTests;
        
        if (totalTests === 0) {
            const container = document.getElementById('ultimosTests');
            if (container) {
                container.innerHTML = '<p class="empty-message">📝 Aún no hay tests realizados. Cuando los usuarios completen el test vocacional, los resultados aparecerán aquí.</p>';
            }
            const ctxDistribucion = document.getElementById('chartDistribucionAreas');
            if (ctxDistribucion && window.myChartDistribucion) {
                window.myChartDistribucion.destroy();
            }
            return;
        }
        
        const resStats = await fetch(`${API}/admin/encuesta/stats`, { headers });
        const statsDiarios = await resStats.json() || [];
        
        const promedioDiario = statsDiarios.length > 0 
            ? (statsDiarios.reduce((sum, d) => sum + d.cantidad, 0) / statsDiarios.length).toFixed(1)
            : 0;
        const promedioElem = document.getElementById('promedioDiario');
        if (promedioElem) promedioElem.textContent = promedioDiario;
        
        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const testsSemana = statsDiarios
            .filter(d => new Date(d.fecha) >= inicioSemana)
            .reduce((sum, d) => sum + d.cantidad, 0);
        const testsSemanaElem = document.getElementById('testsSemana');
        if (testsSemanaElem) testsSemanaElem.textContent = testsSemana;
        
        const ctxDistribucion = document.getElementById('chartDistribucionAreas');
        if (ctxDistribucion) {
            const ctx = ctxDistribucion.getContext('2d');
            if (window.myChartDistribucion) window.myChartDistribucion.destroy();
            window.myChartDistribucion = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: distribucion.map(d => d.area),
                    datasets: [{
                        label: 'Número de Tests',
                        data: distribucion.map(d => d.total_tests || 0),
                        backgroundColor: 'rgba(124, 108, 207, 0.8)',
                        borderColor: '#7c6ccf',
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const porcentaje = distribucion[context.dataIndex]?.porcentaje || 0;
                                    return `${value} tests (${porcentaje}%)`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { ticks: { color: '#e2e8f0', stepSize: 1 }, grid: { color: '#334155' } },
                        x: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
                    }
                }
            });
        }
        
        const resUltimos = await fetch(`${API}/admin/encuesta/ultimas`, { headers });
        const ultimosTests = await resUltimos.json();
        
        const container = document.getElementById('ultimosTests');
        if (container) {
            if (!ultimosTests || ultimosTests.length === 0) {
                container.innerHTML = '<p class="empty-message">📊 Los resultados de tests aparecerán aquí cuando los usuarios realicen la encuesta</p>';
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr><th>Fecha</th><th>Área Recomendada</th><th>Universidad Sugerida</th></tr>
                        </thead>
                        <tbody>
                            ${ultimosTests.map(test => `
                                <tr><td>${test.fecha ? new Date(test.fecha).toLocaleString('es-CO') : 'Fecha no disponible'}</td>
                                <td><span class="badge-area">${test.area_resultado || 'N/A'}</span></td>
                                <td>${test.universidad_recomendada || 'Por definir'}</td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        }
        
    } catch (error) {
        console.error("Error cargando estadísticas de encuestas:", error);
        const container = document.getElementById('ultimosTests');
        if (container) {
            container.innerHTML = '<p class="empty-message">📊 Los tests vocacionales aparecerán aquí cuando los usuarios realicen la encuesta. Por ahora no hay datos.</p>';
        }
    }
}

// ==================== CRUD UNIVERSIDADES ====================
async function guardarUniversidad(e) {
    e.preventDefault();
    const id = document.getElementById('u_id').value;
    const data = {
        nombre: document.getElementById('u_nom').value,
        ciudad: document.getElementById('u_ciu').value,
        departamento: document.getElementById('u_dep').value,
        id_estado: document.getElementById('u_estado').value,
        sitio_web: document.getElementById('u_web').value,
        descripcion: document.getElementById('u_des').value
    };
    
    try {
        const url = id ? `${API}/admin/universidades/${id}` : `${API}/admin/universidades`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (res.ok) {
            mostrarNotificacion(result.mensaje, "success");
            ocultarFormularioUniversidad();
            await loadData();
            renderUnis();
        } else {
            mostrarNotificacion(result.mensaje || "Error al guardar", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error de conexión", "error");
    }
}

async function editarUniversidad(id) {
    const uni = db.universidad.find(u => u.id_universidad === id);
    if (uni) {
        document.getElementById('u_id').value = uni.id_universidad;
        document.getElementById('u_nom').value = uni.nombre;
        document.getElementById('u_ciu').value = uni.ciudad;
        document.getElementById('u_dep').value = uni.departamento;
        document.getElementById('u_estado').value = uni.id_estado;
        document.getElementById('u_web').value = uni.sitio_web || '';
        document.getElementById('u_des').value = uni.descripcion || '';
        mostrarFormularioUniversidad();
    }
}

async function eliminarUniversidad(id) {
    if (confirm("¿Estás seguro de eliminar esta universidad?")) {
        try {
            const res = await fetch(`${API}/admin/universidades/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            const result = await res.json();
            if (res.ok) {
                mostrarNotificacion(result.mensaje, "success");
                await loadData();
                renderUnis();
            } else {
                mostrarNotificacion(result.mensaje || "Error al eliminar", "error");
            }
        } catch (error) {
            mostrarNotificacion("Error de conexión", "error");
        }
    }
}

function renderUnis() {
    const container = document.getElementById('listaUnis');
    if (!container) return;
    
    if (db.universidad.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay universidades registradas</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>Ciudad</th><th>Departamento</th><th>Estado</th><th>Sitio Web</th><th>Acciones</th></tr></thead>
            <tbody>
                ${db.universidad.map(u => `
                    <tr>
                        <td>${escapeHtml(u.nombre)}</td>
                        <td>${escapeHtml(u.ciudad)}</td>
                        <td>${escapeHtml(u.departamento)}</td>
                        <td>${escapeHtml(u.estado_nombre)}</td>
                        <td>${u.sitio_web ? `<a href="${u.sitio_web}" target="_blank">Visitar</a>` : '-'}</td>
                        <td>
                            <button onclick="editarUniversidad(${u.id_universidad})" class="btn-edit"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarUniversidad(${u.id_universidad})" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    const uniCount = document.getElementById('uniCount');
    if (uniCount) uniCount.textContent = db.universidad.length;
}

function filtrarUniversidades() {
    const search = document.getElementById('searchUni').value.toLowerCase();
    const filtered = db.universidad.filter(u => u.nombre.toLowerCase().includes(search) || u.ciudad.toLowerCase().includes(search));
    
    const container = document.getElementById('listaUnis');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">No se encontraron universidades</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>Ciudad</th><th>Departamento</th><th>Estado</th><th>Sitio Web</th><th>Acciones</th></tr></thead>
            <tbody>
                ${filtered.map(u => `
                    <tr>
                        <td>${escapeHtml(u.nombre)}</td>
                        <td>${escapeHtml(u.ciudad)}</td>
                        <td>${escapeHtml(u.departamento)}</td>
                        <td>${escapeHtml(u.estado_nombre)}</td>
                        <td>${u.sitio_web ? `<a href="${u.sitio_web}" target="_blank">Visitar</a>` : '-'}</td>
                        <td>
                            <button onclick="editarUniversidad(${u.id_universidad})" class="btn-edit"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarUniversidad(${u.id_universidad})" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    const uniCount = document.getElementById('uniCount');
    if (uniCount) uniCount.textContent = filtered.length;
}

function mostrarFormularioUniversidad() {
    const form = document.getElementById('formUniversidad');
    if (form) form.style.display = 'block';
}

function ocultarFormularioUniversidad() {
    const form = document.getElementById('formUniversidad');
    if (form) form.style.display = 'none';
    document.getElementById('u_id').value = '';
    document.getElementById('u_nom').value = '';
    document.getElementById('u_ciu').value = '';
    document.getElementById('u_dep').value = '';
    document.getElementById('u_estado').value = '';
    document.getElementById('u_web').value = '';
    document.getElementById('u_des').value = '';
}

// ==================== CRUD CARRERAS ====================
async function guardarCarrera(e) {
    e.preventDefault();
    const id = document.getElementById('c_id').value;
    const data = {
        nombre: document.getElementById('c_nom').value,
        descripcion: document.getElementById('c_des').value,
        id_area: document.getElementById('c_area').value,
        id_universidad: document.getElementById('c_uni').value
    };
    
    try {
        const url = id ? `${API}/admin/carreras/${id}` : `${API}/admin/carreras`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (res.ok) {
            mostrarNotificacion(result.mensaje, "success");
            ocultarFormularioCarrera();
            await loadData();
            renderCarreras();
        } else {
            mostrarNotificacion(result.mensaje || "Error al guardar", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error de conexión", "error");
    }
}

async function editarCarrera(id) {
    const carrera = db.carrera.find(c => c.id_carrera === id);
    if (carrera) {
        document.getElementById('c_id').value = carrera.id_carrera;
        document.getElementById('c_nom').value = carrera.nombre;
        document.getElementById('c_des').value = carrera.descripcion || '';
        document.getElementById('c_area').value = carrera.id_area;
        document.getElementById('c_uni').value = carrera.id_universidad;
        mostrarFormularioCarrera();
    }
}

async function eliminarCarrera(id) {
    if (confirm("¿Estás seguro de eliminar esta carrera?")) {
        try {
            const res = await fetch(`${API}/admin/carreras/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            const result = await res.json();
            if (res.ok) {
                mostrarNotificacion(result.mensaje, "success");
                await loadData();
                renderCarreras();
            } else {
                mostrarNotificacion(result.mensaje || "Error al eliminar", "error");
            }
        } catch (error) {
            mostrarNotificacion("Error de conexión", "error");
        }
    }
}

function renderCarreras() {
    const container = document.getElementById('listaCarreras');
    if (!container) return;
    
    if (db.carrera.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay carreras registradas</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>Área</th><th>Universidad</th><th>Descripción</th><th>Acciones</th></tr></thead>
            <tbody>
                ${db.carrera.map(c => `
                    <tr>
                        <td>${escapeHtml(c.nombre)}</td>
                        <td>${escapeHtml(c.area_nombre)}</td>
                        <td>${escapeHtml(c.universidad_nombre)}</td>
                        <td>${escapeHtml(c.descripcion ? c.descripcion.substring(0, 100) : '-')}${c.descripcion && c.descripcion.length > 100 ? '...' : ''}</td>
                        <td>
                            <button onclick="editarCarrera(${c.id_carrera})" class="btn-edit"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarCarrera(${c.id_carrera})" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    const carreraCount = document.getElementById('carreraCount');
    if (carreraCount) carreraCount.textContent = db.carrera.length;
}

function filtrarCarreras() {
    const search = document.getElementById('searchCarrera').value.toLowerCase();
    const filtered = db.carrera.filter(c => c.nombre.toLowerCase().includes(search) || c.universidad_nombre.toLowerCase().includes(search));
    
    const container = document.getElementById('listaCarreras');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">No se encontraron carreras</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>Área</th><th>Universidad</th><th>Descripción</th><th>Acciones</th></tr></thead>
            <tbody>
                ${filtered.map(c => `
                    <tr>
                        <td>${escapeHtml(c.nombre)}</td>
                        <td>${escapeHtml(c.area_nombre)}</td>
                        <td>${escapeHtml(c.universidad_nombre)}</td>
                        <td>${escapeHtml(c.descripcion ? c.descripcion.substring(0, 100) : '-')}${c.descripcion && c.descripcion.length > 100 ? '...' : ''}</td>
                        <td>
                            <button onclick="editarCarrera(${c.id_carrera})" class="btn-edit"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarCarrera(${c.id_carrera})" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    const carreraCount = document.getElementById('carreraCount');
    if (carreraCount) carreraCount.textContent = filtered.length;
}

function mostrarFormularioCarrera() {
    const form = document.getElementById('formCarrera');
    if (form) form.style.display = 'block';
}

function ocultarFormularioCarrera() {
    const form = document.getElementById('formCarrera');
    if (form) form.style.display = 'none';
    document.getElementById('c_id').value = '';
    document.getElementById('c_nom').value = '';
    document.getElementById('c_des').value = '';
    document.getElementById('c_area').value = '';
    document.getElementById('c_uni').value = '';
}

// ==================== CRUD ADMINISTRADORES ====================
async function guardarAdministrador(e) {
    e.preventDefault();
    const id = document.getElementById('adm_id').value;
    const data = {
        nombre: document.getElementById('adm_nom').value,
        correo: document.getElementById('adm_correo').value,
        contrasena: document.getElementById('adm_pass').value,
        id_rol: document.getElementById('adm_rol').value,
        activo: document.getElementById('adm_activo').value
    };
    
    try {
        const url = id ? `${API}/admin/administradores/${id}` : `${API}/admin/administradores`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (res.ok) {
            mostrarNotificacion(result.mensaje, "success");
            ocultarFormularioAdmin();
            await loadData();
            renderAdmins();
        } else {
            mostrarNotificacion(result.mensaje || "Error al guardar", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error de conexión", "error");
    }
}

async function editarAdministrador(id) {
    const admin = db.administradores.find(a => a.id_administrador === id);
    if (admin) {
        document.getElementById('adm_id').value = admin.id_administrador;
        document.getElementById('adm_nom').value = admin.nombre;
        document.getElementById('adm_correo').value = admin.correo;
        document.getElementById('adm_pass').value = '';
        document.getElementById('adm_rol').value = admin.id_rol;
        document.getElementById('adm_activo').value = admin.activo;
        mostrarFormularioAdmin();
    }
}

async function eliminarAdministrador(id) {
    if (confirm("¿Estás seguro de eliminar este administrador?")) {
        try {
            const res = await fetch(`${API}/admin/administradores/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            const result = await res.json();
            if (res.ok) {
                mostrarNotificacion(result.mensaje, "success");
                await loadData();
                renderAdmins();
            } else {
                mostrarNotificacion(result.mensaje || "Error al eliminar", "error");
            }
        } catch (error) {
            mostrarNotificacion("Error de conexión", "error");
        }
    }
}

function renderAdmins() {
    const container = document.getElementById('listaAdmins');
    if (!container) return;
    
    if (db.administradores.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay administradores registrados</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${db.administradores.map(a => `
                    <tr>
                        <td>${escapeHtml(a.nombre)}</td>
                        <td>${escapeHtml(a.correo)}</td>
                        <td>${escapeHtml(a.rol_nombre)}</td>
                        <td><span class="status ${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <button onclick="editarAdministrador(${a.id_administrador})" class="btn-edit"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarAdministrador(${a.id_administrador})" class="btn-delete"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function mostrarFormularioAdmin() {
    const form = document.getElementById('formAdmin');
    if (form) form.style.display = 'block';
}

function ocultarFormularioAdmin() {
    const form = document.getElementById('formAdmin');
    if (form) form.style.display = 'none';
    document.getElementById('adm_id').value = '';
    document.getElementById('adm_nom').value = '';
    document.getElementById('adm_correo').value = '';
    document.getElementById('adm_pass').value = '';
    document.getElementById('adm_rol').value = '';
    document.getElementById('adm_activo').value = '1';
}

// ==================== BACKUP ====================
async function generarBackup() {
    const modalHTML = `
        <div id="backupModal" class="modal-backup">
            <div class="modal-backup-content">
                <i class="fas fa-spinner fa-spin loading-icon"></i>
                <h3>Generando Backup</h3>
                <p>Por favor espera, estamos preparando el respaldo de la base de datos...</p>
                <div class="backup-info">
                    <div class="backup-info-item">
                        <span>📊 Progreso:</span>
                        <span id="backupProgress">Conectando...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    try {
        document.getElementById('backupProgress').textContent = 'Obteniendo información de la base de datos...';
        
        const infoRes = await fetch(`${API}/admin/backup-info`, {
            headers: { 'Authorization': token }
        });
        const infoData = await infoRes.json();
        
        document.getElementById('backupProgress').innerHTML = `📋 Preparando ${Object.keys(infoData.tablas).length} tablas con ${infoData.total_registros} registros...`;
        
        const backupRes = await fetch(`${API}/admin/backup`, {
            headers: { 'Authorization': token }
        });
        
        if (!backupRes.ok) {
            throw new Error('Error al generar el backup');
        }
        
        const blob = await backupRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `unimatch_backup_${fecha}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        const modal = document.getElementById('backupModal');
        modal.innerHTML = `
            <div class="modal-backup-content">
                <i class="fas fa-check-circle success-icon"></i>
                <h3>✅ Backup Completado</h3>
                <p>El respaldo se ha generado exitosamente.</p>
                <div class="backup-info">
                    <div class="backup-info-item"><span>Fecha:</span><span>${new Date().toLocaleString('es-CO')}</span></div>
                    <div class="backup-info-item"><span>Tablas:</span><span>${Object.keys(infoData.tablas).length}</span></div>
                    <div class="backup-info-item"><span>Registros:</span><span>${infoData.total_registros}</span></div>
                    <div class="backup-info-item"><span>Tamaño:</span><span>${(blob.size / 1024).toFixed(2)} KB</span></div>
                </div>
                <button onclick="cerrarModalBackup()" class="btn-primary" style="margin-top: 1rem;"><i class="fas fa-check"></i> Cerrar</button>
            </div>
        `;
        
        mostrarNotificacion('Backup generado exitosamente', 'success');
        
        setTimeout(() => { cerrarModalBackup(); }, 5000);
        
    } catch (error) {
        console.error('Error generando backup:', error);
        const modal = document.getElementById('backupModal');
        modal.innerHTML = `
            <div class="modal-backup-content">
                <i class="fas fa-exclamation-circle error-icon"></i>
                <h3>❌ Error al generar Backup</h3>
                <p>${error.message || 'Hubo un problema al generar el respaldo'}</p>
                <button onclick="cerrarModalBackup()" class="btn-primary" style="margin-top: 1rem;"><i class="fas fa-times"></i> Cerrar</button>
            </div>
        `;
        mostrarNotificacion('Error al generar backup', 'error');
    }
}

function cerrarModalBackup() {
    const modal = document.getElementById('backupModal');
    if (modal) modal.remove();
}

function verificarPermisosBackup() {
    const rol = localStorage.getItem('rol');
    const btnBackup = document.getElementById('btnBackup');
    if (btnBackup && rol === '1') {
        btnBackup.style.display = 'inline-flex';
    }
}

// ==================== UTILIDADES ====================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cerrarSesion() {
    if (confirm("¿Estás seguro de cerrar sesión?")) {
        localStorage.clear();
        location.href = "loginAdmin.html";
    }
}
// ==================== RESTAURACIÓN DE BACKUP ====================

function mostrarModalRestaurar() {
    document.getElementById('restoreModal').style.display = 'flex';
}

function cerrarModalRestaurar() {
    document.getElementById('restoreModal').style.display = 'none';
    document.getElementById('backupFileInput').value = '';
}

function cerrarProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) modal.style.display = 'none';
}

async function restaurarBackup() {
    const fileInput = document.getElementById('backupFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarNotificacion('Por favor selecciona un archivo de backup', 'error');
        return;
    }
    
    if (!file.name.endsWith('.sql')) {
        mostrarNotificacion('El archivo debe tener extensión .sql', 'error');
        return;
    }
    
    // Confirmar con el usuario
    if (!confirm('⚠️ ¡ADVERTENCIA! Esta acción reemplazará todos los datos actuales. ¿Estás seguro de continuar?')) {
        return;
    }
    
    // Cerrar modal de selección y abrir modal de progreso
    cerrarModalRestaurar();
    
    const progressModal = document.getElementById('progressModal');
    const progressBar = document.getElementById('progressBar');
    const progressMessage = document.getElementById('progressMessage');
    
    progressModal.style.display = 'flex';
    progressBar.style.width = '30%';
    progressMessage.textContent = 'Subiendo archivo...';
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('backupFile', file);
    
    try {
        progressBar.style.width = '60%';
        progressMessage.textContent = 'Restaurando base de datos...';
        
        const response = await fetch(`${API}/admin/restaurar-backup`, {
            method: 'POST',
            headers: {
                'Authorization': token
            },
            body: formData
        });
        
        progressBar.style.width = '90%';
        progressMessage.textContent = 'Finalizando...';
        
        const result = await response.json();
        
        if (response.ok) {
            progressBar.style.width = '100%';
            progressMessage.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10b981; font-size: 2rem;"></i><br>
                ${result.mensaje}<br>
                📊 Tablas restauradas: ${result.tablas_restauradas.length}<br>
                📝 Consultas ejecutadas: ${result.total_consultas}
            `;
            
            mostrarNotificacion('Backup restaurado exitosamente', 'success');
            
            // Recargar datos del dashboard después de 2 segundos
            setTimeout(() => {
                cerrarProgressModal();
                loadData();
                initDashboard();
            }, 2000);
        } else {
            throw new Error(result.mensaje || 'Error al restaurar');
        }
    } catch (error) {
        console.error('Error restaurando backup:', error);
        progressMessage.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 2rem;"></i><br>
            ❌ Error al restaurar: ${error.message}
        `;
        mostrarNotificacion('Error al restaurar backup', 'error');
        
        setTimeout(() => {
            cerrarProgressModal();
        }, 3000);
    }
}

// Modificar la función verificarPermisosBackup para incluir el botón de restaurar
function verificarPermisosBackup() {
    const rol = localStorage.getItem('rol');
    const btnBackup = document.getElementById('btnBackup');
    const btnRestore = document.getElementById('btnRestore');
    
    if (rol === '1') {
        if (btnBackup) btnBackup.style.display = 'inline-flex';
        if (btnRestore) btnRestore.style.display = 'inline-flex';
    }
}

// ==================== INICIALIZACIÓN ====================
window.onload = async () => {
    await loadData();
    mostrarSeccion('dashboard');
    verificarPermisosBackup();
};
