const express = require('express');
const router = express.Router();
const { Inyectora } = require('../models/database.js');
const { Op } = require("sequelize");
const apiKey = process.env.GEMINI_API_KEY;
const moment = require('moment');
const requireAuth = require('../middleware/auth.js');
const { HistorialChat, Tecnico, Tarea } = require("../models/database.js");

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/ingresar-reparacion', (req, res) => {
    res.render('ingresar_reparacion');
});

router.get("/chat-bot", requireAuth, (req, res) => {
    res.render("chat_bot");
});

router.get("/chat-historial", requireAuth, async (req, res) => {
    const tecnicoId = req.session.tecnicoId;
    const historial = await HistorialChat.findAll({
        where: { tecnico_id: tecnicoId },
        order: [["created_at", "DESC"]]
    });
    const historialLimpio = historial.map(item => {
        const plain = item.get({ plain: true });
        console.log("👉 created_at original:", plain.created_at); // <=== VERIFICACIÓN
        return {
            ...plain,
            // formato ya listo para mostrar
            created_at_formateado: plain.created_at
                ? moment(plain.created_at).format("DD/MM/YYYY HH:mm")
                : ""
        };
    });
    res.render("chat_historial", { historial: historialLimpio });
});

router.get("/tareas/crear", requireAuth, async (req, res) => {
    const tecnicos = await Tecnico.findAll();
    res.render("crear_tarea", { tecnicos });
});

router.get("/tareas", requireAuth, async (req, res) => {
    const tareas = await Tarea.findAll({
        order: [["created_at", "DESC"]],
        include: [{ model: Tecnico, as: "tecnico" }]
    });
    res.render("tareas_lista", { tareas });
});

router.get("/tareas/mi-panel", requireAuth, async (req, res) => {
    const tecnicoId = req.session.tecnicoId;
    const tareas = await Tarea.findAll({
        where: { tecnico_id: tecnicoId },
        order: [["created_at", "DESC"]]
    });
    res.render("panel_tecnico", { tareas });
});

router.get("/tareas/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const tarea = await Tarea.findByPk(id, {
            include: [
                { model: Tecnico, as: "tecnico" }
            ]
        });
        if (!tarea) {
            return res.status(404).send("Tarea no encontrada");
        }
        res.render("tarea_detalle", {
            tarea,
            tecnico: tarea.tecnico
        });
    } catch (error) {
        console.error("Error cargando tarea:", error);
        res.status(500).send("Error interno");
    }
});

router.post("/tareas/iniciar/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const tarea = await Tarea.findByPk(id);
    if (!tarea) return res.status(404).send("Tarea no encontrada");
    const ahora = new Date();
    await tarea.update({
        estado: "en_progreso",
        hora_inicio: ahora
    });
    // técnico queda como ocupado
    await Tecnico.update(
        { disponible: false },
        { where: { id: tarea.tecnico_id } }
    );
    res.redirect("/tareas/mi-panel");
});

router.post("/tareas/finalizar/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { detalle_finalizacion } = req.body;
    try {
        const tarea = await Tarea.findByPk(id);
        if (!tarea) {
            return res.status(404).send("Tarea no encontrada");
        }
        const hora_fin = new Date();
        const horas = (hora_fin - tarea.hora_inicio) / (1000 * 60 * 60);
        await tarea.update({
            estado: "completada",
            hora_fin,
            horas_totales: horas.toFixed(2),
            detalle_finalizacion
        });
        // Marcar técnico como disponible de nuevo
        if (tarea.tecnico_id) {
            await Tecnico.update(
                { disponible: true },
                { where: { id: tarea.tecnico_id } }
            );
        }
        res.redirect("/consultar/tareas/" + id);
    } catch (error) {
        console.error("Error finalizando tarea:", error);
        res.status(500).send("Error");
    }
});

router.post("/tareas/crear", requireAuth, async (req, res) => {
    const {
        titulo,
        descripcion,
        prioridad,
        especialidad_requerida,
        tecnico_id,
        fecha_limite
    } = req.body;
    try {
        await Tarea.create({
            titulo,
            descripcion,
            prioridad,
            especialidad_requerida,
            tecnico_id: tecnico_id || null,
            fecha_limite: fecha_limite || null,
            estado: tecnico_id ? "en_progreso" : "pendiente",
            hora_inicio: tecnico_id ? new Date() : null
        });
        if (tecnico_id) {
            await Tecnico.update(
                { disponible: false },
                { where: { id: tecnico_id } }
            );
        }
        res.redirect("/consultar");
    } catch (error) {
        console.error("Error al crear tarea:", error);
        res.status(500).send("Error al crear tarea");
    }
});

router.post("/chat-bot", requireAuth, async (req, res) => {
    const { mensaje } = req.body;
    const tecnicoId = req.session.tecnicoId;
    if (!mensaje || mensaje.trim() === "") {
        return res.json({ respuesta: "No escribiste ninguna consulta." });
    }
    let respuestaTexto = "";
    let respuestaParaGuardar = "";
    let origen = "";
    try {
        const consulta = await generarConsultaSistemaModelo(mensaje);
        if (consulta) {
            const resultados = await Inyectora.findAll(consulta);
            if (resultados.length > 0) {
                origen = "BD";
                // Convertimos los registros a objetos simples
                const datos = resultados.map(r => r.get({ plain: true }));
                // 🔹 Texto legible para enviar al frontend
                respuestaTexto = datos.map(d =>
                    `Máquina: ${d.marca} ${d.modelo}
                    Sistema: ${d.sistema}
                    Falla: ${d.falla}
                    Reparacion_realizada: ${d.reparacion_realizada}`
                ).join("\n\n---\n\n");
                // 🔹 Datos originales para guardar en JSONB
                respuestaParaGuardar = datos;
            }
        }
        if (!respuestaTexto) {
            origen = "IA";
            const respuestaIA = await consultarGemini(mensaje);
            respuestaTexto =
                respuestaIA?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "La IA no devolvió respuesta.";
            respuestaParaGuardar = respuestaTexto; 
        }
        await HistorialChat.create({
            tecnico_id: tecnicoId,
            mensaje_usuario: mensaje,
            respuesta_bot: respuestaParaGuardar,
            origen
        });
        return res.json({ respuesta: respuestaTexto, origen });
    } catch (error) {
        console.error("❌ Error en /chat-bot:", error);
        return res.json({ respuesta: "Error al procesar la consulta." });
    }
});

router.post('/ingresar-reparacion', async (req, res) => {
    const { marca, modelo, falla, sistema, reparacion_realizada, operario_nombre, operario_apellido, fecha } = req.body;
    try {
        const nuevaReparacion = await Inyectora.create({
            marca,
            modelo,
            falla,
            sistema,
            reparacion_realizada,
            operario_nombre,
            operario_apellido,
            fecha
        });
        console.log('Reparación registrada:', nuevaReparacion.id);
        res.redirect('/consultar');
    } catch (error) {
        console.error('Error al registrar reparación:', error);
        res.status(500).send('Error al registrar reparación');
    }
});

function detectarSistema(texto) {
    if (!texto) return null;
    const t = texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const sistemas = {
        hidraulico: ["hidraulico", "hidraulica", "aceite", "presion"],
        electrico: ["electrico", "electrica", "cable", "sensor", "plc"],
        mecanico: ["mecanico", "rotura", "pieza", "engrane"],
        refrigeracion: ["refrigeracion", "enfriamiento", "chiller"],
        calefaccion: ["calefaccion", "calor", "resistencia"],
        inyeccion: ["inyeccion", "inyecta", "plastico", "material"]
    };
    for (let sistema in sistemas) {
        if (sistemas[sistema].some(p => t.includes(p))) {
            return sistema;
        }
    }
    return null;
}

function detectarMarca(texto) {
    const t = texto.toLowerCase();
    const marcas = [
        "haitai",
        "haida",
        "arburg",
        "engel",
        "haitian",
        "sumitomo",
        "krauss",
        "demag",
        "nissei"
    ];
    for (let m of marcas) {
        if (t.includes(m)) return m;
    }
    return null;
}

function detectarModelo(texto) {
    const t = texto.toUpperCase();
    const match = t.match(/\b(\d{2,3})[\s\-]*([A-Z])\b/);
    if (!match) return null;
    const numero = match[1];
    const letra = match[2];
    return `${numero} ${letra}`;
}

async function generarConsultaSistemaModelo(texto) {
    const sistema = detectarSistema(texto);
    const modelo = detectarModelo(texto);
    const marca = detectarMarca(texto);
    console.log("🔍 Sistema detectado:", sistema);
    console.log("🔍 Modelo detectado:", modelo);
    console.log("🔍 Marca detectada:", marca);
    if (!sistema && !modelo && !marca) return null;
    const where = {};
    if (sistema) where.sistema = { [Op.iLike]: `%${sistema}%` };
    if (modelo) where.modelo = { [Op.iLike]: `%${modelo}%` };
    if (marca) where.marca = { [Op.iLike]: `%${marca}%` };
    return { where };
}

async function consultarGemini(pregunta) {
    try {
        const fetch = (await import('node-fetch')).default;
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: pregunta }] }]
            })
        });
        if (!response.ok) {
            console.error("ERROR en consultarGemini: response.ok false");
            throw new Error(`Error Gemini: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al consultar Gemini:', error);
        return { error: 'Error al consultar Gemini API' };
    }
}

router.post('/', async (req, res) => {
    const pregunta = req.body.pregunta_bot || req.body.pregunta;
    try {
        const geminiResponse = await consultarGemini(pregunta);
        const intencion = analizarIntencion(geminiResponse);
        if (intencion === 'generar_dashboard') {
            return generarDashboard(req, res);
        }
        const consultaSequelize = await generarConsultaSQL(pregunta);
        if (!consultaSequelize) {
            console.log('No se pudo generar consulta SQL');
            return res.render('resultados', { resultados: null });
        }
        const resultados = await Inyectora.findAll(consultaSequelize);
        const plain = resultados.map(r => r.get({ plain: true }));
        res.render('resultados', { resultados: plain });
    } catch (error) {
        console.error('Error al procesar consulta:', error);
        res.status(500).send('Error al procesar la consulta');
    }
});

router.post('/mostrar-reparaciones', async (req, res) => {
    try {
        const resultados = await Inyectora.findAll();
        res.render('resultados', { resultados: resultados.map(r => r.get({ plain: true })) });
    } catch (error) {
        console.error('Error obtener reparaciones:', error);
        res.status(500).send('Error al obtener reparaciones');
    }
});

function quiereJSON(req) {
    return req.xhr || req.headers.accept?.includes("application/json");
}

router.post("/consultar-bot", async (req, res) => {
    const pregunta = req.body.pregunta_bd || req.body.pregunta_ia;
    if (!pregunta) {
        return res.json({ respuesta: "No escribiste ninguna consulta." });
    }
    console.log("💬 Consulta mixta:", pregunta);
    // 1️⃣ Intentar detectar marca, modelo y sistema
    const consultaBD = await generarConsultaSistemaModelo(pregunta);
    if (consultaBD) {
        const resultados = await Inyectora.findAll(consultaBD);
        if (resultados.length > 0) {
            console.log("📌 Respuesta desde BD");
            return res.json({
                respuesta:
                    resultados
                        .map(r =>
                            `🛠 Marca: ${r.marca} | Modelo: ${r.modelo} | Sistema: ${r.sistema}\nFalla: ${r.falla}\nReparación: ${r.reparacion_realizada}`
                        )
                        .join("\n\n")
            });
        }
    }
    console.log("🤖 No hay datos en BD → respondiendo con IA");
    // 2️⃣ Pasamos a IA
    const respuestaIA = await consultarGemini(pregunta);
    const textoIA = respuestaIA?.candidates?.[0]?.content?.parts?.[0]?.text
        || "La IA no devolvió respuesta.";
    return res.json({ respuesta: textoIA });
});

function analizarIntencion(geminiResponse) {
    const texto = geminiResponse.candidates[0].content.parts[0].text.toLowerCase();
    return texto.includes('dashboard') ? 'generar_dashboard' : 'consultar_datos';
}

module.exports = router;




























