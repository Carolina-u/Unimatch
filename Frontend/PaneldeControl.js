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
        document.getElementById('u_estado').innerHTML = '<option value="">Seleccionar estado...</option>' + 
            ests.map(e => `<option value="${e.id_estado}">${e.nombre}</option>`).join('');
        
        document.getElementById('c_area').innerHTML = '<option value="">Seleccionar área...</option>' + 
            areas.map(a => `<option value="${a.id_area}">${a.nombre}</option>`).join('');
        
        document.getElementById('c_uni').innerHTML = '<option value="">Seleccionar universidad...</option>' + 
            unis.map(u => `<option value="${u.id_universidad}">${u.nombre}</option>`).join('');
        
        document.getElementById('adm_rol').innerHTML = roles.map(r => `<option value="${r.id_rol}">${r.nombre}</option>`).join('');
        
    } catch (error) {
        console.error("Error loading data:", error);
        mostrarNotificacion("Error al cargar datos", "error");
    }
}

function mostrarSeccion(id) {
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
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

        // Gráfico de áreas
        const ctxAreas = document.getElementById('chartAreas').getContext('2d');
        if (myChartAreas) myChartAreas.destroy();
        myChartAreas = new Chart(ctxAreas, {
            type: 'pie',
            data: {
                labels: dataAreas.map(a => a.nombre),
                datasets: [{ 
                    data: dataAreas.map(a => a.total), 
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                }
            }
        });
        
        // Gráfico de universidades
        const ctxUnis = document.getElementById('chartUnis').getContext('2d');
        if (myChartUnis) myChartUnis.destroy();
        myChartUnis = new Chart(ctxUnis, {
            type: 'bar',
            data: {
                labels: dataUnis.map(u => u.nombre),
                datasets: [{ 
                    label: 'Número de Carreras',
                    data: dataUnis.map(u => u.total_carreras),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                },
                scales: {
                    y: { ticks: { color: '#e2e8f0' } },
                    x: { ticks: { color: '#e2e8f0' } }
                }
            }
        });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        mostrarNotificacion("Error al cargar el dashboard", "error");
    }
}

function actualizarDashboard() {
    initDashboard();
    mostrarNotificacion("Dashboard actualizado", "success");
}

// CRUD Universidades
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
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': token 
            },
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
    if (db.universidad.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay universidades registradas</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Departamento</th>
                    <th>Estado</th>
                    <th>Sitio Web</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${db.universidad.map(u => `
                    <tr>
                        <td>${escapeHtml(u.nombre)}</td>
                        <td>${escapeHtml(u.ciudad)}</td>
                        <td>${escapeHtml(u.departamento)}</td>
                        <td>${escapeHtml(u.estado_nombre)}</td>
                        <td>${u.sitio_web ? `<a href="${u.sitio_web}" target="_blank">Visitar</a>` : '-'}</td>
                        <td>
                            <button onclick="editarUniversidad(${u.id_universidad})" class="btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarUniversidad(${u.id_universidad})" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filtrarUniversidades() {
    const search = document.getElementById('searchUni').value.toLowerCase();
    const filtered = db.universidad.filter(u => 
        u.nombre.toLowerCase().includes(search) || 
        u.ciudad.toLowerCase().includes(search)
    );
    
    const container = document.getElementById('listaUnis');
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">No se encontraron universidades</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Ciudad</th>
                    <th>Departamento</th>
                    <th>Estado</th>
                    <th>Sitio Web</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(u => `
                    <tr>
                        <td>${escapeHtml(u.nombre)}</td>
                        <td>${escapeHtml(u.ciudad)}</td>
                        <td>${escapeHtml(u.departamento)}</td>
                        <td>${escapeHtml(u.estado_nombre)}</td>
                        <td>${u.sitio_web ? `<a href="${u.sitio_web}" target="_blank">Visitar</a>` : '-'}</td>
                        <td>
                            <button onclick="editarUniversidad(${u.id_universidad})" class="btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarUniversidad(${u.id_universidad})" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function mostrarFormularioUniversidad() {
    document.getElementById('formUniversidad').style.display = 'block';
}

function ocultarFormularioUniversidad() {
    document.getElementById('formUniversidad').style.display = 'none';
    document.getElementById('u_id').value = '';
    document.getElementById('u_nom').value = '';
    document.getElementById('u_ciu').value = '';
    document.getElementById('u_dep').value = '';
    document.getElementById('u_estado').value = '';
    document.getElementById('u_web').value = '';
    document.getElementById('u_des').value = '';
}

// CRUD Carreras
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
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': token 
            },
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
    if (db.carrera.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay carreras registradas</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Área</th>
                    <th>Universidad</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${db.carrera.map(c => `
                    <tr>
                        <td>${escapeHtml(c.nombre)}</td>
                        <td>${escapeHtml(c.area_nombre)}</td>
                        <td>${escapeHtml(c.universidad_nombre)}</td>
                        <td>${escapeHtml(c.descripcion ? c.descripcion.substring(0, 100) : '-')}${c.descripcion && c.descripcion.length > 100 ? '...' : ''}</td>
                        <td>
                            <button onclick="editarCarrera(${c.id_carrera})" class="btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarCarrera(${c.id_carrera})" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filtrarCarreras() {
    const search = document.getElementById('searchCarrera').value.toLowerCase();
    const filtered = db.carrera.filter(c => 
        c.nombre.toLowerCase().includes(search) || 
        c.universidad_nombre.toLowerCase().includes(search)
    );
    
    const container = document.getElementById('listaCarreras');
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-message">No se encontraron carreras</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Área</th>
                    <th>Universidad</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(c => `
                    <tr>
                        <td>${escapeHtml(c.nombre)}</td>
                        <td>${escapeHtml(c.area_nombre)}</td>
                        <td>${escapeHtml(c.universidad_nombre)}</td>
                        <td>${escapeHtml(c.descripcion ? c.descripcion.substring(0, 100) : '-')}${c.descripcion && c.descripcion.length > 100 ? '...' : ''}</td>
                        <td>
                            <button onclick="editarCarrera(${c.id_carrera})" class="btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarCarrera(${c.id_carrera})" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function mostrarFormularioCarrera() {
    document.getElementById('formCarrera').style.display = 'block';
}

function ocultarFormularioCarrera() {
    document.getElementById('formCarrera').style.display = 'none';
    document.getElementById('c_id').value = '';
    document.getElementById('c_nom').value = '';
    document.getElementById('c_des').value = '';
    document.getElementById('c_area').value = '';
    document.getElementById('c_uni').value = '';
}

// CRUD Administradores
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
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': token 
            },
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
    if (db.administradores.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay administradores registrados</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${db.administradores.map(a => `
                    <tr>
                        <td>${escapeHtml(a.nombre)}</td>
                        <td>${escapeHtml(a.correo)}</td>
                        <td>${escapeHtml(a.rol_nombre)}</td>
                        <td><span class="status ${a.activo ? 'active' : 'inactive'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <button onclick="editarAdministrador(${a.id_administrador})" class="btn-edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarAdministrador(${a.id_administrador})" class="btn-delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function mostrarFormularioAdmin() {
    document.getElementById('formAdmin').style.display = 'block';
}

function ocultarFormularioAdmin() {
    document.getElementById('formAdmin').style.display = 'none';
    document.getElementById('adm_id').value = '';
    document.getElementById('adm_nom').value = '';
    document.getElementById('adm_correo').value = '';
    document.getElementById('adm_pass').value = '';
    document.getElementById('adm_rol').value = '';
    document.getElementById('adm_activo').value = '1';
}

// Utilidades
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

// Inicialización
window.onload = async () => {
    await loadData();
    mostrarSeccion('dashboard');
};
