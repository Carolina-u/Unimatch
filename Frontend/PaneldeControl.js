const MODE = 'remote'; // Cambiar a 'local' si quieres usar localStorage
const API = "http://localhost:3000/api"; // Ajusta la URL si es necesario
const LS_KEY = 'Unimatch';
const token = localStorage.getItem("token");

if(!token){

alert("Debe iniciar sesión");

window.location.href = "loginAdmin.html";

}
function cerrarSesion(){

localStorage.removeItem("token");
localStorage.removeItem("adminRol");

window.location.href = "loginAdmin.html";

}
const initialSeed = {
  estado_universidad: [
    { id_estado: 1, nombre: 'Activada' },
    { id_estado: 2, nombre: 'Desactivada' },
  ],
  area_vocacional: [
    { id_area: 1, nombre: 'Ciencias e Ingeniería', descripcion: '' },
    { id_area: 2, nombre: 'Ciencias de la Salud', descripcion: '' },
    { id_area: 3, nombre: 'Ciencias Sociales', descripcion: '' },
    { id_area: 4, nombre: 'Artes y Humanidades', descripcion: '' }
  ],
  universidad: [],
  carrera: [],
  encuesta: [],
  pregunta: [],
  opcion: [],
  administrador: [],
  rol_administrador: [
    { id_rol: 1, nombre: 'SuperAdmin', descripcion: 'Acceso total' },
    { id_rol: 2, nombre: 'Editor', descripcion: 'Puede editar datos' },
  ]
};

// ---- Store ----
let db = null;

async function loadDB() {
  if (MODE === 'local') {
    const raw = localStorage.getItem(LS_KEY);
    db = raw ? JSON.parse(raw) : structuredClone(initialSeed);
    if (!raw) localStorage.setItem(LS_KEY, JSON.stringify(db));
    return;
  }
  
  // Para 'remote', inicializar db como objeto vacío y cargar datos
  db = structuredClone(initialSeed);
  await loadAllData();
}

async function loadAllData() {
  try {
    // Cargar datos básicos (estos son estáticos o pequeños)
    const [estados, areas, roles] = await Promise.all([
      fetch(`${API}/estados-universidad`).then(r => r.json()),
      fetch(`${API}/areas`).then(r => r.json()),
      fetch(`${API}/roles`).then(r => r.json())
    ]);
    
    db.estado_universidad = estados;
    db.area_vocacional = areas;
    db.rol_administrador = roles;
    
    // Cargar datos principales
    await Promise.all([
      loadUniversidades(),
      loadCarreras(),
      loadEncuestas(),
      loadPreguntas(),
      loadOpciones(),
      loadAdministradores()
    ]);
    
    renderKPIs();
  } catch (error) {
    console.error('Error cargando datos:', error);
  }
}

async function loadUniversidades() {
  const res = await fetch(`${API}/universidades`);
  db.universidad = await res.json();
}

async function loadCarreras() {
  const res = await fetch(`${API}/carreras`);
  db.carrera = await res.json();
}

async function loadEncuestas() {
  const res = await fetch(`${API}/encuestas`);
  db.encuesta = await res.json();
}

async function loadPreguntas() {
  const res = await fetch(`${API}/preguntas`);
  db.pregunta = await res.json();
}

async function loadOpciones() {
  const res = await fetch(`${API}/opciones`);
  const opciones = await res.json();
  
  // Transformar el formato de áreas múltiples al formato plano que espera la UI
  db.opcion = [];
  opciones.forEach(op => {
    if (op.areas && op.areas.length > 0) {
      op.areas.forEach(area => {
        db.opcion.push({
          id_opcion: op.id_opcion,
          texto: op.texto,
          id_pregunta: op.id_pregunta,
          id_area: area.id_area,
          puntaje: area.puntaje
        });
      });
    } else {
      db.opcion.push({
        id_opcion: op.id_opcion,
        texto: op.texto,
        id_pregunta: op.id_pregunta,
        id_area: null
      });
    }
  });
}

async function loadAdministradores() {
  const res = await fetch(`${API}/administradores`);
  db.administrador = await res.json();
}

function saveDB() {
  if (MODE === 'local') {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }
  // En modo remote, no se guarda directamente
}

function uid(list, keyName) {
  if (!list.length) return 1;
  return Math.max(...list.map(x => x[keyName])) + 1;
}

// ---- Render helpers ----
function mostrarSeccion(id) {
  for (const sec of document.querySelectorAll('main section')) {
    sec.style.display = (sec.id === id) ? 'block' : 'none';
  }
  
  if (id === 'universidades') {
    cargarEstadosSelect();
    renderUniversidades();
  } else if (id === 'carreras') {
    cargarAreasSelect();
    cargarUniversidadesSelectCarrera();
    renderCarreras();
  } else if (id === 'preguntas') {
    cargarEncuestasSelect();
    cargarAreasSelectOpciones();
    renderPreguntas();
  } else if (id === 'usuarios') {
    cargarRolesSelect();
    renderAdmins();
  } else if (id === 'inicio') {
    renderKPIs();
  }
}

async function renderKPIs() {
  const k1 = document.getElementById('kpiUniversidades');
  const k2 = document.getElementById('kpiCarreras');
  const k3 = document.getElementById('kpiPreguntas');
  
  if (MODE === 'local') {
    k1.textContent = db.universidad.length;
    k2.textContent = db.carrera.length;
    k3.textContent = db.pregunta.length;
  } else {
    try {
      const res = await fetch(`${API}/counts`);
      const counts = await res.json();
      k1.textContent = counts.universidades;
      k2.textContent = counts.carreras;
      k3.textContent = counts.preguntas;
    } catch (error) {
      console.error('Error cargando KPIs:', error);
    }
  }
}

// ====== UNIVERSIDADES ======
function cargarEstadosSelect() {
  const sel = document.getElementById('u_estado');
  sel.innerHTML = '';
  const opts = (MODE === 'local') ? db.estado_universidad : db.estado_universidad;
  for (const e of opts) {
    const o = document.createElement('option');
    o.value = e.id_estado;
    o.textContent = e.nombre;
    sel.appendChild(o);
  }
}

function limpiarFormUniversidad() {
  document.getElementById('u_id_universidad').value = '';
  document.getElementById('u_nombre').value = '';
  document.getElementById('u_sitio').value = '';
  document.getElementById('u_ciudad').value = '';
  document.getElementById('u_departamento').value = '';
  document.getElementById('u_descripcion').value = '';
}

async function guardarUniversidad(ev) {
  ev.preventDefault();
  const id = document.getElementById('u_id_universidad').value;
  const data = {
    nombre: document.getElementById('u_nombre').value,
    sitio_web: document.getElementById('u_sitio').value,
    ciudad: document.getElementById('u_ciudad').value,
    departamento: document.getElementById('u_departamento').value,
    descripcion: document.getElementById('u_descripcion').value,
    id_estado: parseInt(document.getElementById('u_estado').value)
  };
  
  try {
    if (id) {
      await fetch(`${API}/universidades/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } else {
      await fetch(`${API}/universidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    }
    
    limpiarFormUniversidad();
    await loadUniversidades();
    renderUniversidades();
    renderKPIs();
  } catch (error) {
    console.error("Error:", error);
    alert('Error al guardar la universidad');
  }
  return false;
}

function editarUniversidad(id) {
  const u = db.universidad.find(x => x.id_universidad === id);
  if (!u) return;
  document.getElementById('u_id_universidad').value = u.id_universidad;
  document.getElementById('u_nombre').value = u.nombre;
  document.getElementById('u_sitio').value = u.sitio_web || '';
  document.getElementById('u_ciudad').value = u.ciudad || '';
  document.getElementById('u_departamento').value = u.departamento || '';
  document.getElementById('u_descripcion').value = u.descripcion || '';
  document.getElementById('u_estado').value = u.id_estado;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarUniversidad(id) {
  if (!confirm('¿Eliminar esta universidad? Se eliminarán también sus carreras.')) return;
  
  try {
    await fetch(`${API}/universidades/${id}`, { method: "DELETE" });
    await loadUniversidades();
    await loadCarreras();
    renderUniversidades();
    renderCarreras();
    renderKPIs();
  } catch (error) {
    console.error("Error:", error);
    alert('Error al eliminar la universidad');
  }
}

function renderUniversidades() {
  const div = document.getElementById('listaUniversidades');
  const estadosMap = new Map(db.estado_universidad.map(e => [e.id_estado, e.nombre]));
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Nombre</th><th>Ubicación</th><th>Estado</th><th>Sitio</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  for (const u of db.universidad) {
    html += `
      <tr>
        <td>${u.id_universidad}</td>
        <td>${u.nombre}</td>
        <td><span class="pill">${u.ciudad || '-'}</span> <span class="muted">/ ${u.departamento || '-'}</span></td>
        <td>${estadosMap.get(u.id_estado) ?? '-'}</td>
        <td>${u.sitio_web ? `<a href="${u.sitio_web}" target="_blank">Web</a>` : '-'}</td>
        <td class="actions">
          <button class="secondary" onclick="editarUniversidad(${u.id_universidad})">Editar</button>
          <button class="danger" onclick="borrarUniversidad(${u.id_universidad})">Borrar</button>
        </td>
      </tr>
    `;
  }
  html += '</tbody></table>';
  div.innerHTML = html;
}

// ====== CARRERAS ======
function cargarAreasSelect() {
  const sel = document.getElementById('c_area');
  sel.innerHTML = '';
  for (const a of db.area_vocacional) {
    const o = document.createElement('option');
    o.value = a.id_area; o.textContent = a.nombre; sel.appendChild(o);
  }
}

function cargarUniversidadesSelectCarrera() {
  const sel = document.getElementById('c_universidad');
  sel.innerHTML = '';
  for (const u of db.universidad) {
    const o = document.createElement('option');
    o.value = u.id_universidad; o.textContent = u.nombre; sel.appendChild(o);
  }
}

function limpiarFormCarrera() {
  document.getElementById('c_id_carrera').value = '';
  document.getElementById('c_nombre').value = '';
  document.getElementById('c_descripcion').value = '';
}

async function guardarCarrera(ev) {
  ev.preventDefault();
  const id = document.getElementById('c_id_carrera').value;
  const data = {
    nombre: document.getElementById('c_nombre').value.trim(),
    descripcion: document.getElementById('c_descripcion').value.trim(),
    id_area: parseInt(document.getElementById('c_area').value),
    id_universidad: parseInt(document.getElementById('c_universidad').value)
  };
  
  if (MODE === 'local') {
    if (id) {
      const idx = db.carrera.findIndex(c => c.id_carrera === parseInt(id));
      if (idx >= 0) db.carrera[idx] = { id_carrera: parseInt(id), ...data };
    } else {
      data.id_carrera = uid(db.carrera, 'id_carrera');
      db.carrera.push(data);
    }
    saveDB();
    renderCarreras();
    renderKPIs();
    limpiarFormCarrera();
    if(!data.nombre || !data.id_area || !data.id_universidad){
  alert("Complete todos los campos");
  return;
}
  } else {
    try {
      if (id) {
        await fetch(`${API}/carreras/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(`${API}/carreras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
      
      await loadCarreras();
      renderCarreras();
      renderKPIs();
      limpiarFormCarrera();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al guardar la carrera');
    }
  }
  return false;
}

function editarCarrera(id) {
  const c = db.carrera.find(x => x.id_carrera === id);
  if (!c) return;
  document.getElementById('c_id_carrera').value = c.id_carrera;
  document.getElementById('c_nombre').value = c.nombre;
  document.getElementById('c_descripcion').value = c.descripcion || '';
  document.getElementById('c_area').value = c.id_area;
  document.getElementById('c_universidad').value = c.id_universidad;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarCarrera(id) {
  if (!confirm('¿Eliminar esta carrera?')) return;
  
  if (MODE === 'local') {
    db.carrera = db.carrera.filter(c => c.id_carrera !== id);
    saveDB();
    renderCarreras();
    renderKPIs();
  } else {
    try {
      await fetch(`${API}/carreras/${id}`, { method: "DELETE" });
      await loadCarreras();
      renderCarreras();
      renderKPIs();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al eliminar la carrera');
    }
  }
}

function renderCarreras() {
  const div = document.getElementById('listaCarreras');
  const unis = new Map(db.universidad.map(u => [u.id_universidad, u.nombre]));
  const areas = new Map(db.area_vocacional.map(a => [a.id_area, a.nombre]));
  
  let html = `
    <table>
      <thead>
        <tr><th>ID</th><th>Nombre</th><th>Área</th><th>Universidad</th><th>Acciones</th></tr>
      </thead><tbody>
  `;
  
  for (const c of db.carrera) {
    html += `
      <tr>
        <td>${c.id_carrera}</td>
        <td>${c.nombre}</td>
        <td>${areas.get(c.id_area) ?? '-'}</td>
        <td>${unis.get(c.id_universidad) ?? '-'}</td>
        <td class="actions">
          <button class="secondary" onclick="editarCarrera(${c.id_carrera})">Editar</button>
          <button class="danger" onclick="borrarCarrera(${c.id_carrera})">Borrar</button>
        </td>
      </tr>
    `;
  }
  html += '</tbody></table>';
  div.innerHTML = html;
}

// ====== ENCUESTAS / PREGUNTAS / OPCIONES ======
function cargarEncuestasSelect() {
  const sel = document.getElementById('p_encuesta');
  const selPreg = document.getElementById('o_pregunta');
  
  if (sel) {
    sel.innerHTML = '';
    for (const e of db.encuesta) {
      const o = document.createElement('option');
      o.value = e.id_encuesta;
      o.textContent = `${e.nombre} ${e.activa ? '✓' : '✗'}`;
      sel.appendChild(o);
    }
  }
  
  if (selPreg) {
    cargarPreguntasSelect();
  }
}

function cargarPreguntasSelect() {
  const sel = document.getElementById('o_pregunta');
  if (!sel) return;
  
  sel.innerHTML = '';
  for (const p of db.pregunta) {
    const enc = db.encuesta.find(e => e.id_encuesta === p.id_encuesta);
    const o = document.createElement('option');
    o.value = p.id_pregunta;
    o.textContent = `(${enc?.nombre ?? 'Encuesta'}) ${p.enunciado.substring(0, 30)}${p.enunciado.length > 30 ? '...' : ''}`;
    sel.appendChild(o);
  }
}

function cargarAreasSelectOpciones() {
  const sel = document.getElementById('o_area');
  if (!sel) return;
  
  sel.innerHTML = '<option value="">— Sin área —</option>';
  for (const a of db.area_vocacional) {
    const o = document.createElement('option');
    o.value = a.id_area;
    o.textContent = a.nombre;
    sel.appendChild(o);
  }
}

function limpiarFormEncuesta() {
  document.getElementById('e_id_encuesta').value = '';
  document.getElementById('e_nombre').value = '';
  document.getElementById('e_descripcion').value = '';
  document.getElementById('e_activa').value = '1';
}

async function guardarEncuesta(ev) {
  ev.preventDefault();
  const id = document.getElementById('e_id_encuesta').value;
  const data = {
    nombre: document.getElementById('e_nombre').value.trim(),
    descripcion: document.getElementById('e_descripcion').value.trim(),
    activa: parseInt(document.getElementById('e_activa').value)
  };
  
  if (MODE === 'local') {
    if (id) {
      const idx = db.encuesta.findIndex(e => e.id_encuesta === parseInt(id));
      if (idx >= 0) db.encuesta[idx] = { id_encuesta: parseInt(id), ...data };
    } else {
      data.id_encuesta = uid(db.encuesta, 'id_encuesta');
      db.encuesta.push(data);
    }
    saveDB();
    limpiarFormEncuesta();
    cargarEncuestasSelect();
    renderPreguntas();
  } else {
    try {
      if (id) {
        await fetch(`${API}/encuestas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(`${API}/encuestas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
      
      await loadEncuestas();
      limpiarFormEncuesta();
      cargarEncuestasSelect();
      renderPreguntas();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al guardar la encuesta');
    }
  }
  return false;
}

function limpiarFormPregunta() {
  document.getElementById('p_id_pregunta').value = '';
  document.getElementById('p_enunciado').value = '';
}

async function guardarPregunta(ev) {
  ev.preventDefault();
  const id = document.getElementById('p_id_pregunta').value;
  const data = {
    id_encuesta: parseInt(document.getElementById('p_encuesta').value),
    enunciado: document.getElementById('p_enunciado').value.trim()
  };
  
  if (MODE === 'local') {
    if (id) {
      const idx = db.pregunta.findIndex(p => p.id_pregunta === parseInt(id));
      if (idx >= 0) db.pregunta[idx] = { id_pregunta: parseInt(id), ...data };
    } else {
      data.id_pregunta = uid(db.pregunta, 'id_pregunta');
      db.pregunta.push(data);
    }
    saveDB();
    limpiarFormPregunta();
    cargarPreguntasSelect();
    renderPreguntas();
    renderKPIs();
  } else {
    try {
      if (id) {
        await fetch(`${API}/preguntas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(`${API}/preguntas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
      
      await loadPreguntas();
      await loadOpciones(); // Recargar opciones para mantener consistencia
      limpiarFormPregunta();
      cargarPreguntasSelect();
      renderPreguntas();
      renderKPIs();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al guardar la pregunta');
    }
  }
  return false;
}

function limpiarFormOpcion() {
  document.getElementById('o_id_opcion').value = '';
  document.getElementById('o_texto').value = '';
  document.getElementById('o_area').value = '';
}

async function guardarOpcion(ev) {
  ev.preventDefault();
  const id = document.getElementById('o_id_opcion').value;
  const areaVal = document.getElementById('o_area').value;
  
  // Preparar datos en el formato que espera la API
  const areas = areaVal ? [{ id_area: parseInt(areaVal), puntaje: 1 }] : [];
  
  const data = {
    id_pregunta: parseInt(document.getElementById('o_pregunta').value),
    texto: document.getElementById('o_texto').value.trim(),
    areas: areas
  };
  
  if (MODE === 'local') {
    // Versión local simplificada
    if (id) {
      const idx = db.opcion.findIndex(o => o.id_opcion === parseInt(id));
      if (idx >= 0) {
        db.opcion[idx] = { 
          id_opcion: parseInt(id), 
          ...data,
          id_area: areaVal ? parseInt(areaVal) : null 
        };
      }
    } else {
      const newId = uid(db.opcion, 'id_opcion');
      db.opcion.push({ 
        id_opcion: newId, 
        ...data,
        id_area: areaVal ? parseInt(areaVal) : null 
      });
    }
    saveDB();
    limpiarFormOpcion();
    renderPreguntas();
  } else {
    try {
      if (id) {
        await fetch(`${API}/opciones/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(`${API}/opciones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
      
      await loadOpciones();
      limpiarFormOpcion();
      renderPreguntas();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al guardar la opción');
    }
  }
  return false;
}

function editarPregunta(id) {
  const p = db.pregunta.find(x => x.id_pregunta === id);
  if (!p) return;
  document.getElementById('p_id_pregunta').value = p.id_pregunta;
  document.getElementById('p_encuesta').value = p.id_encuesta;
  document.getElementById('p_enunciado').value = p.enunciado;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarPregunta(id) {
  if (!confirm('¿Eliminar esta pregunta y sus opciones?')) return;
  
  if (MODE === 'local') {
    db.opcion = db.opcion.filter(o => o.id_pregunta !== id);
    db.pregunta = db.pregunta.filter(p => p.id_pregunta !== id);
    saveDB();
    renderPreguntas();
    renderKPIs();
  } else {
    try {
      await fetch(`${API}/preguntas/${id}`, { method: "DELETE" });
      await loadPreguntas();
      await loadOpciones();
      renderPreguntas();
      renderKPIs();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al eliminar la pregunta');
    }
  }
}

function editarOpcion(id) {
  const o = db.opcion.find(x => x.id_opcion === id);
  if (!o) return;
  document.getElementById('o_id_opcion').value = o.id_opcion;
  document.getElementById('o_pregunta').value = o.id_pregunta;
  document.getElementById('o_texto').value = o.texto;
  document.getElementById('o_area').value = o.id_area ?? '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarOpcion(id) {
  if (!confirm('¿Eliminar esta opción?')) return;
  
  if (MODE === 'local') {
    db.opcion = db.opcion.filter(o => o.id_opcion !== id);
    saveDB();
    renderPreguntas();
  } else {
    try {
      await fetch(`${API}/opciones/${id}`, { method: "DELETE" });
      await loadOpciones();
      renderPreguntas();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al eliminar la opción');
    }
  }
}

function renderPreguntas() {
  const div = document.getElementById('listaPreguntas');
  const encMap = new Map(db.encuesta.map(e => [e.id_encuesta, e]));
  const areaMap = new Map(db.area_vocacional.map(a => [a.id_area, a.nombre]));
  
  // Agrupar por encuesta
  const byEncuesta = {};
  for (const p of db.pregunta) {
    if (!byEncuesta[p.id_encuesta]) byEncuesta[p.id_encuesta] = [];
    byEncuesta[p.id_encuesta].push(p);
  }
  
  let html = '';
  
  if (Object.keys(byEncuesta).length === 0) {
    html = '<p class="muted">No hay preguntas registradas.</p>';
  } else {
    for (const [id_encuesta, preguntas] of Object.entries(byEncuesta)) {
      const enc = encMap.get(Number(id_encuesta));
      html += `
        <div style="margin-top:16px">
          <h3 style="margin:0 0 6px">${enc?.nombre ?? 'Encuesta'} ${enc?.activa ? '· <span class="pill">Activa</span>' : ''}</h3>
          <table>
            <thead><tr><th>ID</th><th>Pregunta</th><th>Opciones</th><th>Acciones</th></tr></thead>
            <tbody>
      `;
      
      for (const p of preguntas) {
        const opciones = db.opcion.filter(o => o.id_pregunta === p.id_pregunta);
        const opcionesUnicas = new Map();
        opciones.forEach(o => {
          if (!opcionesUnicas.has(o.id_opcion)) {
            opcionesUnicas.set(o.id_opcion, {
              id_opcion: o.id_opcion,
              texto: o.texto,
              areas: []
            });
          }
          if (o.id_area) {
            opcionesUnicas.get(o.id_opcion).areas.push(o.id_area);
          }
        });
        
        const chips = Array.from(opcionesUnicas.values()).map(o => {
          const areaText = o.areas.length > 0 ? 
            `title="Áreas: ${o.areas.map(a => areaMap.get(a) ?? '').join(', ')}"` : 
            'title="Sin área"';
          return `<span class="pill" ${areaText}>${o.texto}</span>`;
        }).join(' ');
        
        html += `
          <tr>
            <td>${p.id_pregunta}</td>
            <td>${p.enunciado}</td>
            <td>${chips || '<span class="muted">—</span>'}</td>
            <td class="actions">
              <button class="secondary" onclick="editarPregunta(${p.id_pregunta})">Editar</button>
              <button class="danger" onclick="borrarPregunta(${p.id_pregunta})">Borrar</button>
            </td>
          </tr>
        `;
        
        // Mostrar opciones como filas anidadas
        for (const o of Array.from(opcionesUnicas.values())) {
          const areaText = o.areas.map(a => `<span class="pill">${areaMap.get(a) ?? ''}</span>`).join(' ');
          html += `
            <tr class="opcion-row">
              <td class="muted">op#${o.id_opcion}</td>
              <td class="muted">↳ ${p.enunciado}</td>
              <td class="muted">${o.texto} ${areaText ? `· ${areaText}` : ''}</td>
              <td class="actions">
                <button class="secondary" onclick="editarOpcion(${o.id_opcion})">Editar</button>
                <button class="danger" onclick="borrarOpcion(${o.id_opcion})">Borrar</button>
              </td>
            </tr>
          `;
        }
      }
      html += `</tbody></table></div>`;
    }
  }
  
  div.innerHTML = html;
}

// ====== USUARIOS (ADMINISTRADORES) ======
function cargarRolesSelect() {
  const sel = document.getElementById('a_rol');
  if (!sel) return;
  
  sel.innerHTML = '';
  for (const r of db.rol_administrador) {
    const o = document.createElement('option');
    o.value = r.id_rol;
    o.textContent = r.nombre;
    sel.appendChild(o);
  }
}

function limpiarFormAdmin() {
  document.getElementById('a_id_administrador').value = '';
  document.getElementById('a_nombre').value = '';
  document.getElementById('a_correo').value = '';
  document.getElementById('a_contrasena').value = '';
  document.getElementById('a_activo').value = '1';
}

async function guardarAdmin(ev) {
  ev.preventDefault();
  const id = document.getElementById('a_id_administrador').value;
  const data = {
    nombre: document.getElementById('a_nombre').value.trim(),
    correo: document.getElementById('a_correo').value.trim(),
    id_rol: parseInt(document.getElementById('a_rol').value),
    activo: parseInt(document.getElementById('a_activo').value)
  };
  
  const contrasena = document.getElementById('a_contrasena').value;
  if (contrasena) {
    data.contrasena = contrasena;
  }
  
  if (MODE === 'local') {
    if (id) {
      const idx = db.administrador.findIndex(a => a.id_administrador === parseInt(id));
      if (idx >= 0) db.administrador[idx] = { id_administrador: parseInt(id), ...data };
    } else {
      data.id_administrador = uid(db.administrador, 'id_administrador');
      db.administrador.push(data);
    }
    saveDB();
    limpiarFormAdmin();
    renderAdmins();
  } else {
    try {
      if (id) {
        await fetch(`${API}/administradores/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(`${API}/administradores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
      
      await loadAdministradores();
      limpiarFormAdmin();
      renderAdmins();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al guardar el administrador');
    }
  }
  return false;
}

function editarAdmin(id) {
  const a = db.administrador.find(x => x.id_administrador === id);
  if (!a) return;
  document.getElementById('a_id_administrador').value = a.id_administrador;
  document.getElementById('a_nombre').value = a.nombre;
  document.getElementById('a_correo').value = a.correo;
  document.getElementById('a_contrasena').value = '';
  document.getElementById('a_rol').value = a.id_rol;
  document.getElementById('a_activo').value = a.activo;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarAdmin(id) {
  if (!confirm('¿Eliminar este usuario administrador?')) return;
  
  if (MODE === 'local') {
    db.administrador = db.administrador.filter(a => a.id_administrador !== id);
    saveDB();
    renderAdmins();
  } else {
    try {
      await fetch(`${API}/administradores/${id}`, { method: "DELETE" });
      await loadAdministradores();
      renderAdmins();
    } catch (error) {
      console.error("Error:", error);
      alert('Error al eliminar el administrador');
    }
  }
}

function renderAdmins() {
  const div = document.getElementById('listaUsuarios');
  const rolMap = new Map(db.rol_administrador.map(r => [r.id_rol, r.nombre]));
  
  let html = `
    <table>
      <thead><tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
  `;
  
  for (const a of db.administrador) {
    html += `
      <tr>
        <td>${a.id_administrador}</td>
        <td>${a.nombre}</td>
        <td>${a.correo}</td>
        <td>${rolMap.get(a.id_rol) ?? '-'}</td>
        <td>${a.activo ? '<span class="pill">Activo</span>' : '<span class="pill" style="background:#3a1f27">Inactivo</span>'}</td>
        <td class="actions">
          <button class="secondary" onclick="editarAdmin(${a.id_administrador})">Editar</button>
          <button class="danger" onclick="borrarAdmin(${a.id_administrador})">Borrar</button>
        </td>
      </tr>
    `;
  }
  html += '</tbody></table>';
  div.innerHTML = html;
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  loadDB().then(() => {
    mostrarSeccion('inicio');
  });
});