
/**
 * POTENZA MOBILE - SICVE
 * Conectado a MySQL
 */

// ============================================
// ESTADO GLOBAL Y CONFIGURACIÓN
// ============================================
const USUARIO_ADMIN = "admin";
const CLAVE_ADMIN = "admin123";

let rolActual = localStorage.getItem('sicve_rol') || 'cliente';
let areaSeleccionada = 'compras';
let temporizadorInterval = null;
let tiempoRestante = 900;
let modoEvaluacion = 'examen';

// ============================================
// BASE DE DATOS (MySQL a través de PHP)
// ============================================
const API_URL = "http://localhost/CUESTIONARIOS/api";

let preguntasBD = {
    compras: [],
    cliente: [],
    almacen: [],
    operaciones: [],
    facturacion: [],
    finanzas: []
};

let evaluacionesEnviadas = [];

// Material de capacitación
let materialCapacitacionBD = {
    compras: [
        { titulo: "Manual de Cotización de Refacciones", desc: "Aprende los estándares para cotizaciones rápidas con proveedores autorizados en el sistema SICVE." },
        { titulo: "Gestión de Órdenes de Compra (OC)", desc: "Flujos de trabajo para emisión, validación de costos y seguimiento de entregas." }
    ],
    cliente: [
        { titulo: "Protocolo de Recepción de Vehículos", desc: "Pasos detallados para registro en pre-valoración, toma de fotos de inventario e ingreso a patio." }
    ],
    almacen: [
        { titulo: "Control de Inventario", desc: "Procesos de entrada, salida y conteo cíclico de refacciones." }
    ],
    operaciones: [
        { titulo: "Flujos Operativos", desc: "Procedimientos estándar de taller y seguimiento de unidades." }
    ],
    facturacion: [
        { titulo: "Emisión de Facturas", desc: "Generación y validación de facturas en el sistema." }
    ],
    finanzas: [
        { titulo: "Control Financiero", desc: "Registro de costos, pagos y conciliaciones." }
    ]
};

// Cargar preguntas desde MySQL
async function cargarPreguntas() {
    try {
        // Agregamos un timestamp para evitar caché del navegador
        const res = await fetch(`${API_URL}/preguntas.php?t=${Date.now()}`);
        const data = await res.json();
        if (data && typeof data === "object" && !data.error) {
            // Sobrescribimos completamente las preguntas
            preguntasBD = {
                compras: data.compras || [],
                cliente: data.cliente || [],
                almacen: data.almacen || [],
                operaciones: data.operaciones || [],
                facturacion: data.facturacion || [],
                finanzas: data.finanzas || []
            };
            console.log("Preguntas cargadas:", preguntasBD);
        }
    } catch (error) {
        console.error("Error cargando preguntas:", error);
    }
}

// Guardar preguntas de un área en MySQL
async function guardarBD() {
    try {
        const area = areaSeleccionada;
        const preguntas = preguntasBD[area] || [];

        const res = await fetch(`${API_URL}/preguntas.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accion: "guardar_todas",
                area: area,
                preguntas: preguntas
            })
        });
        const data = await res.json();
        if (!data.success) {
            console.error("Error al guardar:", data);
        }
    } catch (error) {
        console.error("Error guardando preguntas:", error);
        alert("Error al guardar las preguntas en la base de datos");
    }
}

// Cargar evaluaciones desde MySQL
async function cargarEvaluaciones(area = null) {
    try {
        let url = `${API_URL}/evaluaciones.php`;
        if (area) url += `?area=${area}`;

        const res = await fetch(url);
        const data = await res.json();
        evaluacionesEnviadas = Array.isArray(data) ? data : [];
        return evaluacionesEnviadas;
    } catch (error) {
        console.error("Error cargando evaluaciones:", error);
        evaluacionesEnviadas = [];
        return [];
    }
}

// ============================================
// TEMA (CLARO / OSCURO)
// ============================================
function inicializarTema() {
    const temaGuardado = localStorage.getItem('sicve_theme') || 'dark';
    if (temaGuardado === 'light') {
        document.body.classList.add('light-mode');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = '☀️';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('sicve_theme', isLight ? 'light' : 'dark');
}

// ============================================
// ROLES Y ACCESO ADMINISTRADOR
// ============================================
function manejarCambioRol(nuevoRol) {
    if (nuevoRol === 'admin') {
        abrirModalAdmin();
        document.getElementById('selectRol').value = rolActual;
    } else {
        cambiarRol('cliente');
    }
}

function abrirModalAdmin() {
    const modal = document.getElementById('modalAdmin');
    const errorMsg = document.getElementById('errorLoginMsg');
    const userInput = document.getElementById('adminUser');
    const passInput = document.getElementById('adminPass');

    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';

    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => userInput?.focus(), 80);
    }
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modalAdmin');
    if (modal) modal.style.display = 'none';
    const select = document.getElementById('selectRol');
    if (select) select.value = rolActual;
}

function verificarCredencialesAdmin() {
    const usuario = (document.getElementById('adminUser')?.value || '').trim();
    const password = document.getElementById('adminPass')?.value || '';
    const errorMsg = document.getElementById('errorLoginMsg');

    if (usuario === USUARIO_ADMIN && password === CLAVE_ADMIN) {
        cambiarRol('admin');
        cerrarModalAdmin();
        mostrarToast('✅ Acceso concedido como Administrador');
    } else {
        if (errorMsg) {
            errorMsg.textContent = 'Usuario o contraseña incorrectos.';
            errorMsg.style.display = 'block';
        }
        const passInput = document.getElementById('adminPass');
        if (passInput) {
            passInput.value = '';
            passInput.focus();
        }
    }
}

function cambiarRol(nuevoRol) {
    rolActual = nuevoRol;
    localStorage.setItem('sicve_rol', nuevoRol);

    const select = document.getElementById('selectRol');
    if (select) select.value = nuevoRol;

    const badge = document.getElementById('roleBadge');
    if (badge) {
        badge.textContent = nuevoRol === 'admin' ? 'ADMIN' : 'EMPLEADO';
        badge.className = `role-badge ${nuevoRol}`;
    }

    const panel = document.getElementById('panel');
    if (panel && panel.style.display !== 'none') {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const match = activeTab.getAttribute('onclick')?.match(/'([^']+)'/);
            const modulo = match ? match[1] : 'capacitacion';
            cargarModulo(modulo);
        }
    }
}

function mostrarToast(mensaje) {
    const existente = document.querySelector('.sicve-toast');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.className = 'sicve-toast';
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 13px 26px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        z-index: 3000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.35);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modalAdmin');
    if (!modal || modal.style.display !== 'flex') return;
    if (e.key === 'Enter') {
        e.preventDefault();
        verificarCredencialesAdmin();
    }
    if (e.key === 'Escape') {
        cerrarModalAdmin();
    }
});

// ============================================
// NAVEGACIÓN
// ============================================
function mostrarArea(area) {
    areaSeleccionada = area;
    document.getElementById('vistaAreas').style.display = 'none';
    const panel = document.getElementById('panel');
    const tituloArea = document.getElementById('tituloArea');
    const descripcionArea = document.getElementById('descripcionArea');

    panel.style.display = 'block';

    const nombresAreas = {
        cliente: "Atención al Cliente",
        compras: "Compras",
        almacen: "Almacén",
        operaciones: "Operaciones",
        facturacion: "Facturación",
        finanzas: "Finanzas"
    };

    if (tituloArea) tituloArea.textContent = nombresAreas[area] || area.toUpperCase();
    if (descripcionArea) {
        descripcionArea.textContent = `Sección de capacitación y gestión para los procesos de ${nombresAreas[area] || area}.`;
    }

    const primeraTab = document.querySelectorAll('.tab-btn')[0];
    if (primeraTab) seleccionarTab(primeraTab, 'material');
}

function volverInicio() {
    clearInterval(temporizadorInterval);
    document.getElementById('panel').style.display = 'none';
    document.getElementById('vistaAreas').style.display = 'block';
    actualizarProgresoTarjetas();
}

function seleccionarTab(btnElement, modulo) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    cargarModulo(modulo);
}

// ============================================
// MÓDULO: MATERIAL DIDÁCTICO
// ============================================
function renderMaterialDidactico(container) {
    const materiales = materialCapacitacionBD[areaSeleccionada] || [
        { titulo: "Material Didáctico General", desc: "Recursos de apoyo y material complementario para el área." }
    ];

    let html = `
        <div style="text-align: left;">
            <h2>📖 Material Didáctico (${areaSeleccionada.toUpperCase()})</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Consulta el material de apoyo y recursos didácticos del área.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;

    materiales.forEach(mat => {
        html += `
            <div style="background: var(--bg-input); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                <h3 style="color: var(--primary-red); margin-bottom: 8px;">📄 ${mat.titulo}</h3>
                <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 15px;">${mat.desc}</p>
                <button onclick="alert('Descargando material didáctico...')" class="btn-submit" style="padding: 8px 16px; font-size: 13px;">📥 Descargar</button>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}
function cargarModulo(modulo) {
    const contenidoModulo = document.getElementById('contenidoModulo');
    if (!contenidoModulo) return;

    clearInterval(temporizadorInterval);

    if (modulo === 'material') {
        renderMaterialDidactico(contenidoModulo);
    } else if (modulo === 'capacitacion') {
        renderCapacitacion(contenidoModulo);
    } else if (modulo === 'simulador') {
        renderSimulador(contenidoModulo);
    } else if (modulo === 'evaluacion') {
        if (rolActual === 'cliente') {
            renderEvaluacionCliente(contenidoModulo);
        } else {
            renderPanelAdminEvaluacion(contenidoModulo);
        }
    } else if (modulo === 'resultados') {
        renderResultados(contenidoModulo);
    }
}

// ============================================
// MÓDULO: CAPACITACIÓN
// ============================================
function renderCapacitacion(container) {
    const materiales = materialCapacitacionBD[areaSeleccionada] || [
        { titulo: "Manual General del Área", desc: "Documentación estándar para procesos operativos e inducción en sistema SICVE." }
    ];

    let html = `
        <div style="text-align: left;">
            <h2>📚 Material de Capacitación (${areaSeleccionada.toUpperCase()})</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Consulta las guías y documentos clave antes de presentar tu evaluación.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">`;

    materiales.forEach(mat => {
        html += `
            <div style="background: var(--bg-input); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                <h3 style="color: var(--primary-red); margin-bottom: 8px;">📖 ${mat.titulo}</h3>
                <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 15px;">${mat.desc}</p>
                <button onclick="alert('Descargando PDF de capacitación...')" class="btn-submit" style="padding: 8px 16px; font-size: 13px;">📥 Descargar Guía</button>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

// ============================================
// MÓDULO: SIMULADOR
// ============================================
function renderSimulador(container) {
    const preguntas = preguntasBD[areaSeleccionada] || [];

    if (preguntas.length === 0) {
        container.innerHTML = `<p style="padding:20px;">No hay preguntas de práctica disponibles para esta área. El administrador debe agregarlas.</p>`;
        return;
    }

    let html = `
        <div style="text-align: left;">
            <h2>🎮 Simulador Interactivo (${areaSeleccionada.toUpperCase()})</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Practica sin límite de tiempo y comprueba tus respuestas al momento. (${preguntas.length} preguntas)</p>
            <div style="display: flex; flex-direction: column; gap: 20px;">`;

    preguntas.forEach((q, index) => {
        html += `
            <div style="background: var(--bg-input); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                <label style="font-weight: 600; display: block; margin-bottom: 12px;">${index + 1}. ${q.pregunta}</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">`;

        (q.opciones || []).forEach((opcion, i) => {
            html += `
                <label class="opcion-respuesta">
                    <input type="radio" name="sim_${q.id}" value="${i}" onchange="validarSimulador(${q.id}, ${i}, ${q.correcta})" style="accent-color: var(--primary-red);">
                    <span>${opcion}</span>
                </label>`;
        });

        html += `
                </div>
                <div id="sim_feedback_${q.id}" style="margin-top:12px; font-weight:bold; font-size:14px; display:none;"></div>
            </div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function validarSimulador(preguntaId, seleccion, correcta) {
    const feedback = document.getElementById(`sim_feedback_${preguntaId}`);
    if (!feedback) return;

    feedback.style.display = 'block';

    if (seleccion === correcta) {
        feedback.style.color = '#28a745';
        feedback.innerHTML = '✔ ¡Correcto! Excelente elección.';
    } else {
        feedback.style.color = '#dc3545';
        feedback.innerHTML = '✖ Incorrecto. Revisa el material de capacitación.';
    }
}

// ============================================
// MÓDULO: EVALUACIÓN (EMPLEADO)
// ============================================
function setModoEvaluacion(modo) {
    modoEvaluacion = modo;
    cargarModulo('evaluacion');
}

function iniciarCronometro() {
    clearInterval(temporizadorInterval);
    tiempoRestante = 900;
    const timerElement = document.getElementById('timerDisplay');

    temporizadorInterval = setInterval(() => {
        if (modoEvaluacion === 'practica') {
            clearInterval(temporizadorInterval);
            if (timerElement) timerElement.style.display = 'none';
            return;
        }

        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;

        if (timerElement) {
            timerElement.textContent = `⏱️ Tiempo: ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        }

        if (tiempoRestante <= 0) {
            clearInterval(temporizadorInterval);
            alert('⌛ El tiempo ha finalizado. Tu examen se enviará automáticamente.');
            const form = document.getElementById('formCuestionario');
            if (form) form.requestSubmit();
            return;
        }

        tiempoRestante--;
    }, 1000);
}

function renderEvaluacionCliente(container) {
    const preguntas = preguntasBD[areaSeleccionada] || [];

    if (preguntas.length === 0) {
        container.innerHTML = `<p style="padding:20px;">No hay preguntas configuradas para el área de ${areaSeleccionada}. El administrador debe agregarlas.</p>`;
        return;
    }

    let html = `
        <div class="evaluacion-form">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h2>📝 EVALUACIÓN DE ${areaSeleccionada.toUpperCase()} (${preguntas.length} preguntas)</h2>
                <div class="timer-badge" id="timerDisplay">⏱️ Tiempo: 15:00</div>
            </div>

            <div class="form-group-inline" style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                <label style="flex:1; min-width: 200px;"><strong>Nombre:</strong>
                    <input type="text" id="nombreAlumno" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: inherit;" required>
                </label>
                <label style="flex:1; min-width: 150px;"><strong>Lugar:</strong>
                    <input type="text" id="lugar" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: inherit;" required>
                </label>
                <label style="flex:1; min-width: 150px;"><strong>Fecha:</strong>
                    <input type="date" id="fecha" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-input); color: inherit;" required>
                </label>
            </div>

            <form id="formCuestionario" onsubmit="guardarEvaluacion(event)">
                <div style="display: flex; flex-direction: column; gap: 20px; text-align: left;">`;

    preguntas.forEach((q) => {
        html += `
            <div style="background: var(--bg-input); padding: 18px; border-radius: 8px; border: 1px solid var(--border-color);">
                <label style="font-weight: 600; display: block; margin-bottom: 12px;">${q.pregunta}</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">`;

        (q.opciones || []).forEach((opcion, i) => {
            html += `
                <label class="opcion-respuesta">
                    <input type="radio" name="p_${q.id}" value="${i}" required style="accent-color: var(--primary-red);">
                    <span>${opcion}</span>
                </label>`;
        });

        html += `</div></div>`;
    });

    html += `
                </div>
                <button type="submit" class="btn-submit" style="margin-top: 25px; padding: 14px 30px; font-size: 16px;">Enviar Evaluación</button>
            </form>
        </div>`;

    container.innerHTML = html;

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    iniciarCronometro();
}

async function guardarEvaluacion(e) {
    e.preventDefault();
    clearInterval(temporizadorInterval);

    const nombre = document.getElementById('nombreAlumno').value.trim();
    const lugar = document.getElementById('lugar').value.trim();
    const fecha = document.getElementById('fecha').value;
    const preguntas = preguntasBD[areaSeleccionada] || [];

    if (!nombre || !lugar || !fecha) {
        alert("Por favor completa todos los campos.");
        return;
    }

    let aciertos = 0;
    const respuestasAlumno = {};

    preguntas.forEach(q => {
        const seleccion = document.querySelector(`input[name="p_${q.id}"]:checked`);
        const valorSeleccionado = seleccion ? parseInt(seleccion.value) : null;
        respuestasAlumno[q.id] = valorSeleccionado;
        if (valorSeleccionado === q.correcta) aciertos++;
    });

    const calificacion = preguntas.length > 0
        ? ((aciertos / preguntas.length) * 10).toFixed(1)
        : "0.0";

    try {
        const res = await fetch(`${API_URL}/evaluaciones.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                area: areaSeleccionada,
                nombre: nombre,
                lugar: lugar,
                fecha: fecha,
                respuestas: respuestasAlumno,
                aciertos: aciertos,
                total: preguntas.length,
                calificacion: parseFloat(calificacion)
            })
        });

        const data = await res.json();

        if (data.success) {
            alert(`¡Evaluación enviada con éxito!\nAlumno: ${nombre}\nCalificación: ${calificacion} / 10`);
            const tabs = document.querySelectorAll('.tab-btn');
            if (tabs[3]) seleccionarTab(tabs[3], 'resultados');
        } else {
            alert("Error al guardar la evaluación: " + (data.error || "Error desconocido"));
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al guardar la evaluación");
    }
}

// ============================================
// PANEL ADMIN - GESTIÓN DE PREGUNTAS
// ============================================
function renderPanelAdminEvaluacion(container) {
    const preguntas = preguntasBD[areaSeleccionada] || [];

    let html = `
        <div class="admin-panel" style="text-align: left;">
            <h2>⚙️ Administrar Reactivos (${areaSeleccionada.toUpperCase()}) - ${preguntas.length} preguntas</h2>
            <p style="margin-bottom: 20px; color: var(--text-muted);">Modifica las preguntas y respuestas del examen.</p>
            <div id="listaPreguntasAdmin">`;

    if (preguntas.length === 0) {
        html += `<p style="padding:15px; background:var(--bg-input); border-radius:8px;">No hay preguntas todavía. Agrega la primera.</p>`;
    }

    preguntas.forEach((q, index) => {
        html += `
            <div style="background: var(--bg-input); padding:18px; border-radius:8px; margin-bottom:15px; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <label><strong>Pregunta ${index + 1}:</strong></label>
                    <button onclick="eliminarPregunta(${q.id})" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Eliminar</button>
                </div>
                <input type="text" id="edit_p_${q.id}" value="${(q.pregunta || '').replace(/"/g, '&quot;')}" style="width:100%; margin-bottom:12px; padding:10px; background: var(--bg-card); border:1px solid var(--border-color); color:inherit; border-radius:6px; font-size:15px;">
                
                <label style="font-size: 14px;"><strong>Opciones:</strong></label>
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">`;

        (q.opciones || []).forEach((opcion, i) => {
            const isChecked = q.correcta === i ? 'checked' : '';
            html += `
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="radio" name="correcta_${q.id}" value="${i}" ${isChecked} style="accent-color: #28a745;">
                    <input type="text" id="edit_op_${q.id}_${i}" value="${(opcion || '').replace(/"/g, '&quot;')}" style="flex:1; padding:8px; background: var(--bg-card); border:1px solid var(--border-color); color:inherit; border-radius:6px;">
                </div>`;
        });

        html += `</div></div>`;
    });

    html += `
            </div>
            <div style="display:flex; gap:12px; margin-top:20px; flex-wrap:wrap;">
                <button onclick="guardarCambiosAdmin()" style="padding:12px 24px; background:#28a745; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:15px;">💾 Guardar Cambios</button>
                <button onclick="agregarNuevaPregunta()" style="padding:12px 24px; background:#007bff; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:15px;">+ Agregar Pregunta</button>
            </div>
        </div>`;

    container.innerHTML = html;
}

async function guardarCambiosAdmin() {
    const preguntas = preguntasBD[areaSeleccionada] || [];

    preguntas.forEach(q => {
        const pInput = document.getElementById(`edit_p_${q.id}`);
        if (pInput) q.pregunta = pInput.value;

        (q.opciones || []).forEach((_, i) => {
            const opInput = document.getElementById(`edit_op_${q.id}_${i}`);
            if (opInput) q.opciones[i] = opInput.value;
        });

        const seleccionada = document.querySelector(`input[name="correcta_${q.id}"]:checked`);
        if (seleccionada) q.correcta = parseInt(seleccionada.value);
    });

    await guardarBD();
    mostrarToast('💾 Cambios guardados correctamente');
}

async function agregarNuevaPregunta() {
    if (!preguntasBD[areaSeleccionada]) {
        preguntasBD[areaSeleccionada] = [];
    }

    preguntasBD[areaSeleccionada].push({
        id: 0,
        pregunta: "Nueva pregunta...",
        opciones: ["Opción A", "Opción B", "Opción C"],
        correcta: 0
    });

    await guardarBD();
    await cargarPreguntas();
    renderPanelAdminEvaluacion(document.getElementById('contenidoModulo'));
}

async function eliminarPregunta(id) {
    if (!confirm('¿Seguro que deseas eliminar esta pregunta?')) return;

    preguntasBD[areaSeleccionada] = (preguntasBD[areaSeleccionada] || []).filter(q => q.id !== id);
    await guardarBD();
    renderPanelAdminEvaluacion(document.getElementById('contenidoModulo'));
}

// ============================================
// RESULTADOS
// ============================================
async function renderResultados(container) {
    container.innerHTML = `<p style="padding:20px;">Cargando resultados...</p>`;

    await cargarEvaluaciones(areaSeleccionada);
    const envios = evaluacionesEnviadas;

    let html = `
        <div style="text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:15px; margin-bottom:25px;">
                <div>
                    <h2>📊 Resultados de Exámenes (${areaSeleccionada.toUpperCase()})</h2>
                    <p style="color: var(--text-muted); margin-top: 4px;">Consulta las calificaciones e historial de evaluaciones realizadas.</p>
                </div>`;

    if (rolActual === 'admin') {
        html += `
                <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                    <button onclick="exportarExcelResultados()" style="background:#28a745; color:white; border:none; padding:10px 18px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">
                        📊 Exportar Resultados a Excel
                    </button>
                    <button onclick="generarDiplomasMasivosAcreditados()" style="background:#17a2b8; color:white; border:none; padding:10px 18px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">
                        📜 Diplomas de Acreditados (PDF)
                    </button>
                </div>`;
    }

    html += `</div>`;

    if (envios.length === 0) {
        html += `<p style="padding:20px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-color);">No hay evaluaciones registradas en esta área.</p></div>`;
        container.innerHTML = html;
        return;
    }

    envios.forEach((e) => {
        const nombre = e.nombre_alumno || e.nombre || "Sin nombre";
        const aprobo = parseFloat(e.calificacion) >= 6.0;
        const estadoColor = aprobo ? '#28a745' : '#dc3545';

        html += `
        <div style="background: var(--bg-input); border:1px solid var(--border-color); border-radius:8px; padding:20px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <strong style="font-size:18px;">Alumno: ${nombre}</strong><br>
                    <span style="font-size:14px; color:var(--text-muted);">Fecha: ${e.fecha || '-'} | Lugar: ${e.lugar || '-'}</span>
                </div>
                <span style="background:${estadoColor}; color:white; padding:6px 14px; border-radius:12px; font-weight:bold; font-size:14px;">
                    ${aprobo ? 'ACREDITADO' : 'REPROBADO'}: ${e.calificacion} / 10 (${e.aciertos}/${e.total})
                </span>
            </div>
            <div style="margin-top:14px;">
                <button onclick="generarCertificadoPDF('${nombre.replace(/'/g, "\\'")}', '${e.area}', '${e.calificacion}', '${e.fecha || ''}', ${aprobo})"
                    style="background: var(--primary-red, #e50914); color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px;">
                    📜 Generar ${aprobo ? 'Diploma' : 'Constancia'} PDF
                </button>
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ============================================
// CERTIFICADOS PDF
// ============================================
function generarCertificadoPDF(nombreAlumno, area, calificacion, fecha, aprobo) {
    if (!window.jspdf) {
        alert('Error: La librería jsPDF no está cargada correctamente.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const colorPrimario = aprobo ? [16, 124, 65] : [192, 41, 43];
    const colorAcento = aprobo ? [212, 160, 23] : [120, 120, 120];
    const colorTextoOscuro = [30, 35, 45];
    const colorTextoMuted = [100, 110, 120];

    doc.setFillColor(252, 252, 254);
    doc.rect(0, 0, 297, 210, 'F');

    doc.setLineWidth(2.5);
    doc.setDrawColor(...colorPrimario);
    doc.rect(10, 10, 277, 190);

    doc.setLineWidth(0.6);
    doc.setDrawColor(...colorAcento);
    doc.rect(13.5, 13.5, 270, 183);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...colorPrimario);
    doc.text("POTENZA MOBILE", 148.5, 34, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colorTextoMuted);
    doc.text("SISTEMA INTEGRAL DE CAPACITACIÓN Y EVALUACIÓN (SICVE)", 148.5, 41, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...colorTextoOscuro);
    const tituloDoc = aprobo ? "DIPLOMA DE ACREDITACIÓN" : "CONSTANCIA DE EVALUACIÓN";
    doc.text(tituloDoc, 148.5, 59, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(...colorTextoMuted);
    doc.text("El presente documento se otorga con reconocimiento oficial a:", 148.5, 72, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...colorPrimario);
    doc.text(nombreAlumno.toUpperCase(), 148.5, 87, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...colorTextoOscuro);
    const textoCuerpo = aprobo
        ? "Por haber concluido y aprobado satisfactoriamente los módulos del área de:"
        : "Por haber presentado la evaluación correspondiente al área de:";
    doc.text(textoCuerpo, 148.5, 103, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(230, 0, 0);
    doc.text(area.toUpperCase(), 148.5, 114, { align: "center" });

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(88, 122, 121, 16, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...colorPrimario);
    doc.text(`CALIFICACIÓN: ${calificacion} / 10.0   •   ESTATUS: ${aprobo ? 'APROBADO' : 'REPROBADO'}`, 148.5, 132, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colorTextoMuted);
    doc.text(`Fecha de Emisión: ${fecha}`, 148.5, 155, { align: "center" });

    doc.setDrawColor(180, 185, 190);
    doc.line(75, 178, 125, 178);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colorTextoOscuro);
    doc.text("ING. EVALUADOR SICVE", 100, 183, { align: "center" });

    doc.line(172, 178, 222, 178);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(nombreAlumno.toUpperCase(), 197, 183, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colorTextoMuted);
    doc.text("Firma del Participante", 197, 187, { align: "center" });

    const nombreArchivo = `${aprobo ? 'Diploma' : 'Constancia'}_${nombreAlumno.replace(/\s+/g, '_')}_${area}.pdf`;
    doc.save(nombreArchivo);
}

function generarDiplomasMasivosAcreditados() {
    const acreditados = evaluacionesEnviadas.filter(e => parseFloat(e.calificacion) >= 6.0);

    if (acreditados.length === 0) {
        alert("No hay alumnos acreditados en esta área para generar diplomas.");
        return;
    }

    acreditados.forEach((e) => {
        const nombre = e.nombre_alumno || e.nombre || "Sin nombre";
        generarCertificadoPDF(nombre, e.area, e.calificacion, e.fecha || '', true);
    });

    mostrarToast(`📜 Se generaron ${acreditados.length} diploma(s)`);
}

function exportarExcelResultados() {
    if (evaluacionesEnviadas.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    let csv = "ID,Nombre,Area,Lugar,Fecha,Aciertos,Total,Calificacion,Estatus\n";

    evaluacionesEnviadas.forEach(e => {
        const nombre = e.nombre_alumno || e.nombre || "";
        const estatus = parseFloat(e.calificacion) >= 6.0 ? "ACREDITADO" : "REPROBADO";
        csv += `"${e.id}","${nombre}","${e.area}","${e.lugar || ''}","${e.fecha || ''}","${e.aciertos}","${e.total}","${e.calificacion}","${estatus}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Resultados_${areaSeleccionada}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarToast('📊 Archivo Excel generado');
}

// ============================================
// PROGRESO EN LAS TARJETAS
// ============================================
async function actualizarProgresoTarjetas() {
    await cargarEvaluaciones();

    const areas = ['cliente', 'compras', 'almacen', 'operaciones', 'facturacion', 'finanzas'];

    areas.forEach(area => {
        const enviosArea = evaluacionesEnviadas.filter(e => e.area === area);
        const card = document.querySelector(`[onclick="mostrarArea('${area}')"]`);

        if (!card) return;

        let container = card.querySelector('.progress-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'progress-container';
            container.innerHTML = `<div class="progress-bar" id="bar-${area}"></div>`;
            card.appendChild(container);

            const txt = document.createElement('span');
            txt.className = 'progress-text';
            txt.id = `txt-${area}`;
            card.appendChild(txt);
        }

        const bar = document.getElementById(`bar-${area}`);
        const txt = document.getElementById(`txt-${area}`);

        if (enviosArea.length > 0) {
            const ultimaCal = parseFloat(enviosArea[0].calificacion);
            const porcentaje = (ultimaCal / 10) * 100;
            if (bar) bar.style.width = `${porcentaje}%`;
            if (txt) txt.textContent = `Último intento: ${ultimaCal}/10`;
        } else {
            if (bar) bar.style.width = `0%`;
            if (txt) txt.textContent = `Sin realizar`;
        }
    });
}

// ============================================
// CARRUSEL DE VIDEOS
// ============================================
let videoActual = 0;
const totalVideos = 3;

function cambiarVideo(direccion) {
    const slides = document.querySelectorAll('.video-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    if (!slides.length) return;

    slides[videoActual].classList.remove('active');
    if (dots[videoActual]) dots[videoActual].classList.remove('active');

    videoActual = (videoActual + direccion + totalVideos) % totalVideos;

    slides[videoActual].classList.add('active');
    if (dots[videoActual]) dots[videoActual].classList.add('active');
}

function irAVideo(indice) {
    const slides = document.querySelectorAll('.video-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    if (!slides.length || indice < 0 || indice >= totalVideos) return;

    slides[videoActual].classList.remove('active');
    if (dots[videoActual]) dots[videoActual].classList.remove('active');

    videoActual = indice;
    slides[videoActual].classList.add('active');
    if (dots[videoActual]) dots[videoActual].classList.add('active');
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    inicializarTema();
    cambiarRol(rolActual);
    await cargarPreguntas();
    await actualizarProgresoTarjetas();
    console.log("Sistema iniciado. Preguntas cargadas:", preguntasBD);
});
