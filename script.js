// ==========================================
// SICVE - PLATAFORMA DE CAPACITACIÓN Y EVALUACIÓN
// ARCHIVO UNIFICADO app.js COMPLETO
// ==========================================

// --- 1. ESTADO GLOBAL Y PERSISTENCIA ---
let rolActual = localStorage.getItem('sicve_rol') || 'cliente'; // 'cliente' o 'admin'
let areaSeleccionada = 'compras';
let temporizadorInterval = null;
let tiempoRestante = 900; // 15 minutos

// Bases de datos simuladas en localStorage
let evaluacionesEnviadas = JSON.parse(localStorage.getItem('sicve_respuestas')) || [];
let preguntasBD = JSON.parse(localStorage.getItem('sicve_preguntas')) || {
    compras: [],
    cliente: [],
    almacen: [],
    operaciones: [],
    facturacion: [],
    finanzas: []
};

function guardarBD() {
    localStorage.setItem('sicve_preguntas', JSON.stringify(preguntasBD));
    localStorage.setItem('sicve_respuestas', JSON.stringify(evaluacionesEnviadas));
}


// --- 2. SISTEMA DE AUTENTICACIÓN Y ROLES ---

document.addEventListener('DOMContentLoaded', () => {
    inicializarTema();
    inicializarRol();
    actualizarProgresoTarjetas();
});

function inicializarRol() {
    const selectRol = document.getElementById('selectRol');
    if (selectRol) {
        selectRol.value = rolActual;
    }
    actualizarInterfazRol();
}

function manejarCambioRol(nuevoRol) {
    const selectRol = document.getElementById('selectRol');
    if (nuevoRol === 'admin') {
        const usuario = prompt("Ingrese el usuario administrador:");
        const password = prompt("Ingrese la contraseña de administrador:");

        if (usuario === 'admin' && password === 'admin123') {
            rolActual = 'admin';
            localStorage.setItem('sicve_rol', 'admin');
            alert('¡Acceso concedido como Administrador!');
            actualizarInterfazRol();
        } else {
            alert('Usuario o contraseña incorrectos. Acceso denegado.');
            if (selectRol) selectRol.value = 'cliente';
            cambiarRol('cliente');
        }
    } else {
        cambiarRol('cliente');
    }
}

function cambiarRol(rol) {
    rolActual = rol;
    localStorage.setItem('sicve_rol', rol);
    actualizarInterfazRol();
}

function actualizarInterfazRol() {
    const elementosAdmin = document.querySelectorAll('.solo-admin');
    elementosAdmin.forEach(el => {
        el.style.display = (rolActual === 'admin') ? 'block' : 'none';
    });
}


// --- 3. GESTIÓN DE TEMA (CLARO / OSCURO) ---
function inicializarTema() {
    const temaGuardado = localStorage.getItem('sicve_tema') || 'claro';
    if (temaGuardado === 'oscuro') {
        document.body.classList.add('dark-mode');
    }
}

function alternarTema() {
    document.body.classList.toggle('dark-mode');
    const esOscuro = document.body.classList.contains('dark-mode');
    localStorage.setItem('sicve_tema', esOscuro ? 'oscuro' : 'claro');
}


// --- 4. EXPORTACIÓN A EXCEL (CSV) ---
function exportarExcelResultados() {
    const envios = evaluacionesEnviadas.filter(e => e.area === areaSeleccionada);
    if (envios.length === 0) {
        alert("No hay datos para exportar en esta área.");
        return;
    }

    let csv = "ID,Nombre,Area,Lugar,Fecha,Aciertos,Total,Calificacion,Estatus\n";
    envios.forEach(e => {
        const estatus = parseFloat(e.calificacion) >= 6.0 ? "ACREDITADO" : "REPROBADO";
        csv += `"${e.id}","${e.nombre}","${e.area}","${e.lugar}","${e.fecha}","${e.aciertos}","${e.total}","${e.calificacion}","${estatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Resultados_${areaSeleccionada}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- 5. GENERACIÓN DE DIPLOMAS Y CONSTANCIAS EN PDF ---

function generarDiplomasMasivosAcreditados() {
    const acreditados = evaluacionesEnviadas.filter(e => e.area === areaSeleccionada && parseFloat(e.calificacion) >= 6.0);

    if (acreditados.length === 0) {
        alert("No hay alumnos acreditados registrados en esta área para generar diplomas.");
        return;
    }

    acreditados.forEach((e) => {
        generarCertificadoPDF(e.nombre, e.area, e.calificacion, e.fecha, true);
    });
}

function generarCertificadoPDF(nombreAlumno, area, calificacion, fecha, aprobo) {
    if (!window.jspdf) {
        alert('Error: La librería jsPDF no está cargada correctamente.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    const colorMarco = aprobo ? [40, 167, 69] : [220, 53, 69]; // Verde o Rojo
    const tituloEstado = aprobo ? "CONSTANCIA DE ACREDITACIÓN" : "CONSTANCIA DE NO ACREDITACIÓN";

    // Marco Doble Formal
    doc.setLineWidth(3);
    doc.setDrawColor(...colorMarco);
    doc.rect(10, 10, 277, 190);

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...colorMarco);
    doc.text("POTENZA MOBILE", 148.5, 42, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("PLATAFORMA DE CAPACITACIÓN SICVE", 148.5, 50, { align: "center" });

    doc.setFontSize(20);
    doc.setTextColor(...colorMarco);
    doc.text(tituloEstado, 148.5, 70, { align: "center" });

    // Cuerpo del Diploma / Constancia
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.text("Hace constar que:", 148.5, 86, { align: "center" });

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(nombreAlumno.toUpperCase(), 148.5, 104, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const leyTexto = aprobo
        ? "Ha presentado y APROBADO satisfactoriamente la evaluación del área de:"
        : "Ha presentado la evaluación del área de:";
    doc.text(leyTexto, 148.5, 122, { align: "center" });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(230, 0, 0);
    doc.text(area.toUpperCase(), 148.5, 134, { align: "center" });

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Calificación Obtenida: ${calificacion} / 10.0`, 148.5, 147, { align: "center" });

    if (!aprobo) {
        doc.setFontSize(11);
        doc.setTextColor(220, 53, 69);
        doc.text("Estatus: REPROBADO - Se requiere reforzar conocimientos y presentar un nuevo intento.", 148.5, 157, { align: "center" });
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de Emisión: ${fecha}`, 148.5, 168, { align: "center" });

    // Firmas de Validación
    doc.setDrawColor(150);
    doc.line(60, 182, 120, 182);
    doc.text("Firma Instructor", 90, 188, { align: "center" });

    doc.line(177, 182, 237, 182);
    doc.text("Firma Alumno", 207, 188, { align: "center" });

    const tipoDoc = aprobo ? "Diploma" : "Constancia";
    doc.save(`${tipoDoc}_${nombreAlumno.replace(/\s+/g, '_')}_${area}.pdf`);
}


// --- 6. PROGRESO EN TARJETAS ---
function actualizarProgresoTarjetas() {
    const areas = ['cliente', 'compras', 'almacen', 'operaciones', 'facturacion', 'finanzas'];

    areas.forEach(area => {
        const enviosArea = evaluacionesEnviadas.filter(e => e.area === area);
        const card = document.querySelector(`[onclick*="mostrarArea('${area}')"]`) || document.querySelector(`[onclick*="area('${area}')"]`);

        if (card) {
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
                const ultimaCal = parseFloat(enviosArea[enviosArea.length - 1].calificacion);
                const porcentaje = (ultimaCal / 10) * 100;
                if (bar) bar.style.width = `${porcentaje}%`;
                if (txt) txt.textContent = `Último intento: ${ultimaCal}/10`;
            } else {
                if (bar) bar.style.width = `0%`;
                if (txt) txt.textContent = `Sin realizar`;
            }
        }
    });
}
